import * as THREE from 'three';
import { Person } from './person.js';
import { DebugUtils } from '../utils/utils';

export class Player {
  constructor() {
    this.person = null;
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Euler(0, 0, 0);
    this.speed = 10;
    this.rotationSpeed = 5;
    this.isInVehicle = false;
    this.currentVehicle = null;
    this.previousPosition = null;

    // Movement flags
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    // Direction vector (normalized)
    this.direction = new THREE.Vector3(0, 0, -1); // Forward is -Z for player (matches WASD controls)

    // Vehicle interaction
    this.interactionRadius = 5; // Increased from 3 to 5 for easier vehicle entry

    // Collision radius (pedestrian-sized)
    this.collisionRadius = 0.5;

    // Player stats
    this.health = 100;
    this.maxHealth = 100;
    this.isDead = false;

    // Reference to game for sound effects
    this.game = null;
  }

  init(scene, x, z, game = null) {
    // Store reference to game
    this.game = game;

    // Create player with custom appearance
    this.person = new Person({
      hairColor: 0x3b2403, // Dark brown hair
      skinColor: 0xffcd94, // Light medium skin
      shirtColor: 0x0000ff, // Blue shirt
      pantsColor: 0x000080, // Navy pants
      shoesColor: 0x000000, // Black shoes
      isPlayer: true, // Mark as player for indicator
    });

    this.person.init(scene, x, z);
    this.position = this.person.mesh.position;
    this.rotation = this.person.mesh.rotation;

    // Initialize direction vector
    this.updateDirection();
  }

  update(delta) {
    if (this.isInVehicle) {
      // When in vehicle, player position follows vehicle
      if (this.currentVehicle) {
        // Update vehicle with player input
        this.updateVehicle(delta);

        // Update player position to match vehicle
        this.position.copy(this.currentVehicle.position);
        this.person.mesh.position.copy(this.currentVehicle.position);
        this.person.mesh.rotation.y = this.currentVehicle.rotation.y;
        this.person.mesh.visible = false; // Hide player mesh when in vehicle
      }
      return;
    }

    // Store previous position for collision resolution
    this.previousPosition = this.position.clone();

    // Show player mesh when not in vehicle
    this.person.mesh.visible = true;

    // Handle rotation (can happen even when not moving)
    if (this.moveLeft) {
      // Turn left (counter-clockwise)
      this.rotation.y += this.rotationSpeed * delta;
      this.updateDirection();
    }
    if (this.moveRight) {
      // Turn right (clockwise)
      this.rotation.y -= this.rotationSpeed * delta;
      this.updateDirection();
    }

    // Update mesh rotation
    this.person.mesh.rotation.y = this.rotation.y;

    // Calculate forward/backward movement
    let moveSpeed = 0;
    let isMoving = false;

    if (this.moveForward) {
      moveSpeed = this.speed;
      isMoving = true;
    } else if (this.moveBackward) {
      moveSpeed = -this.speed / 2; // Slower when moving backward
      isMoving = true;
    }

    // Apply movement based on direction and speed
    if (isMoving) {
      const movement = this.direction.clone().multiplyScalar(moveSpeed * delta);
      this.position.add(movement);

      // Update mesh position
      this.person.mesh.position.copy(this.position);
    }

    // Create a movement vector for animations
    const animDirection = new THREE.Vector3(0, 0, 0);
    if (isMoving) {
      if (moveSpeed > 0)
        animDirection.z = -1; // Forward
      else if (moveSpeed < 0) animDirection.z = 1; // Backward
    }

    // Update person animations
    this.person.update(delta, animDirection);
  }

  // Update the direction vector based on current rotation
  updateDirection() {
    // Reset direction to forward (-Z for player)
    this.direction.set(0, 0, -1);

    // Create a rotation matrix from the current rotation
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationY(this.rotation.y);

    // Apply rotation to direction vector
    this.direction.applyMatrix4(rotationMatrix);

    // Ensure it's normalized
    this.direction.normalize();
  }

  updateVehicle(delta) {
    if (!this.currentVehicle) return;

    // The vehicle handles its own movement logic; building/vehicle collisions
    // are resolved centrally by the CollisionManager.
    this.currentVehicle.update(delta, {
      moveForward: this.moveForward,
      moveBackward: this.moveBackward,
      moveLeft: this.moveLeft,
      moveRight: this.moveRight,
    });
  }

  toggleVehicle(vehicles) {
    if (this.isInVehicle) {
      this.exitVehicle();
    } else {
      // Find nearest vehicle within interaction radius
      const nearestVehicle = this.findNearestVehicle(vehicles);
      if (nearestVehicle) {
        this.enterVehicle(nearestVehicle);
      } else {
        DebugUtils.log(`No vehicle within interaction radius ${this.interactionRadius}`);
      }
    }
  }

  findNearestVehicle(vehicles) {
    if (!vehicles || vehicles.length === 0) {
      return null;
    }

    let nearestVehicle = null;
    let nearestDistance = this.interactionRadius;

    for (const vehicle of vehicles) {
      const distance = this.position.distanceTo(vehicle.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestVehicle = vehicle;
      }
    }

    return nearestVehicle;
  }

  enterVehicle(vehicle) {
    if (!vehicle) return;

    this.isInVehicle = true;
    this.currentVehicle = vehicle;
    vehicle.setDriver(this);
    DebugUtils.log(`Entered ${vehicle.type} vehicle`);
  }

  exitVehicle() {
    if (!this.currentVehicle) return;

    const vehicle = this.currentVehicle;

    // Get the vehicle's direction and a perpendicular (right) vector
    const vehicleDirection = vehicle.direction.clone();
    const rightVector = new THREE.Vector3()
      .crossVectors(vehicleDirection, new THREE.Vector3(0, 1, 0))
      .normalize();

    // Candidate exit offsets around the vehicle: right, left, front, back.
    // Pick the first one that isn't inside a building so we never drop the
    // player into a wall.
    const candidates = [
      rightVector.clone().multiplyScalar(2),
      rightVector.clone().multiplyScalar(-2),
      vehicleDirection.clone().multiplyScalar(3),
      vehicleDirection.clone().multiplyScalar(-3),
    ];

    const base = new THREE.Vector3(vehicle.position.x, 0, vehicle.position.z);
    let chosenOffset = candidates[0];

    for (const offset of candidates) {
      offset.y = 0;
      this.position.copy(base).add(offset);
      this.person.mesh.position.copy(this.position);
      if (!this.checkCollision()) {
        chosenOffset = offset;
        break;
      }
    }

    // Commit the chosen exit position
    this.position.copy(base).add(chosenOffset);
    this.person.mesh.position.copy(this.position);

    // Face the player toward the vehicle
    this.rotation.y = Math.atan2(-chosenOffset.x, -chosenOffset.z);
    this.person.mesh.rotation.y = this.rotation.y;

    // Update direction vector after rotation change
    this.updateDirection();

    vehicle.removeDriver();
    this.isInVehicle = false;
    this.currentVehicle = null;
    this.person.mesh.visible = true;
    DebugUtils.log('Exited vehicle');
  }

  // Handle collision by implementing sliding along walls instead of just stopping
  handleCollision() {
    if (!this.previousPosition) return;

    // Calculate movement vector
    const movement = new THREE.Vector3();
    movement.subVectors(this.position, this.previousPosition);

    // If no movement, nothing to do
    if (movement.lengthSq() < 0.0001) return;

    // Try to slide along walls by preserving movement in non-colliding directions

    // First, save current position
    const currentPosition = this.position.clone();

    // Try X-axis movement only
    this.position.copy(this.previousPosition);
    this.position.x = currentPosition.x;

    // If X-only movement is valid (no collision), keep it
    if (!this.checkCollision()) {
      this.person.mesh.position.copy(this.position);
      return;
    }

    // Otherwise, revert X and try Z-axis movement only
    this.position.copy(this.previousPosition);
    this.position.z = currentPosition.z;

    // If Z-only movement is valid (no collision), keep it
    if (!this.checkCollision()) {
      this.person.mesh.position.copy(this.position);
      return;
    }

    // If both X and Z movements cause collisions, revert to previous position completely
    this.position.copy(this.previousPosition);
    this.person.mesh.position.copy(this.previousPosition);

    // Add a small push-back to prevent getting stuck
    const pushDirection = movement.clone().normalize().multiplyScalar(-0.1);
    this.position.add(pushDirection);
    this.person.mesh.position.copy(this.position);
  }

  // Helper method to check for collisions at the current position.
  // Asks the collision manager whether this position overlaps any building.
  checkCollision() {
    if (this.game && this.game.collisionManager) {
      return this.game.collisionManager.collidesWithBuildings(this);
    }
    return false;
  }

  // Get player position for camera following
  getPosition() {
    return this.position;
  }

  takeDamage(amount, game) {
    this.health = Math.max(0, this.health - amount);

    // Play damage sound
    if (game && game.soundManager) {
      game.soundManager.playCrash();
    }

    // Check if player died
    if (this.health <= 0 && !this.isDead) {
      this.isDead = true;

      // Update HUD if available
      if (game && game.hud) {
        game.hud.decreaseLives();

        // Check if game over
        if (game.hud.lives <= 0) {
          game.hud.showMessage('GAME OVER! 💀', 5000);
          // Could add game over logic here
        } else {
          // Respawn player
          this.respawn(game);
        }
      }
    }
  }

  respawn(game) {
    // Reset health
    this.health = this.maxHealth;
    this.isDead = false;

    // Exit vehicle if in one
    if (this.isInVehicle) {
      this.exitVehicle();
    }

    // Get a sidewalk position for respawn
    let spawnPosition = { x: 0, z: 0 };

    if (game && game.world) {
      spawnPosition = game.world.getRandomSidewalkPosition();
    }

    // Reset position to sidewalk spawn point
    this.position.set(spawnPosition.x, 0, spawnPosition.z);
    this.person.mesh.position.copy(this.position);

    // Reset rotation and direction
    this.rotation.set(0, 0, 0);
    this.person.mesh.rotation.copy(this.rotation);
    this.updateDirection();

    // Show respawn message
    if (game && game.hud) {
      game.hud.showMessage('Respawned! 🔄', 2000);
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health;
  }
}
