import * as THREE from 'three';
import { DebugUtils } from '../utils/utils';
import { SpatialHash } from './spatialHash';

export class CollisionManager {
  constructor(game) {
    this.game = game;

    // Collision groups
    this.vehicles = [];
    this.pedestrians = [];
    this.buildings = [];
    this.obstacles = [];

    // Broad-phase spatial index for the (static) buildings. Each building is
    // inserted into every grid cell its footprint covers, so an entity only
    // tests the handful of buildings sharing its cell instead of all of them.
    this.buildingHash = new SpatialHash(12);

    // Collision settings
    this.vehicleCollisionRadius = 2.0;
    this.pedestrianCollisionRadius = 0.5;
    this.buildingMargin = 0.2;

    // Debug mode
    this.debugMode = false;
    this.debugHelpers = [];

    DebugUtils.log('Collision Manager initialized', 'log');
  }

  /**
   * Register a vehicle with the collision system
   * @param {Object} vehicle - The vehicle to register
   */
  registerVehicle(vehicle) {
    if (!this.vehicles.includes(vehicle)) {
      this.vehicles.push(vehicle);

      if (this.debugMode) {
        this.addDebugHelper(
          vehicle,
          vehicle.collisionRadius || this.vehicleCollisionRadius,
          0xff0000,
        );
      }
    }
  }

  /**
   * Register a pedestrian with the collision system
   * @param {Object} pedestrian - The pedestrian to register
   */
  registerPedestrian(pedestrian) {
    if (!this.pedestrians.includes(pedestrian)) {
      this.pedestrians.push(pedestrian);

      if (this.debugMode) {
        this.addDebugHelper(
          pedestrian,
          pedestrian.collisionRadius || this.pedestrianCollisionRadius,
          0x00ff00,
        );
      }
    }
  }

  /**
   * Register a building with the collision system
   * @param {Object} building - The building to register
   */
  registerBuilding(building) {
    if (!this.buildings.includes(building)) {
      // Buildings are static, so compute their bounding box once and cache
      // it (plus a broad-phase circle) instead of recomputing every frame.
      if (building.mesh) {
        const box = new THREE.Box3().setFromObject(building.mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        building._collisionBox = box;
        building._collisionCenter = center;
        // Half the XZ diagonal — a circle that fully contains the footprint
        building._broadRadius = Math.sqrt(size.x * size.x + size.z * size.z) / 2;

        // Index it in the spatial hash by its XZ footprint (centre carried so
        // the hash's SpatialItem shape is satisfied).
        building.x = center.x;
        building.z = center.z;
        this.buildingHash.insertAABB(building, box.min.x, box.min.z, box.max.x, box.max.z);
      }

      this.buildings.push(building);
    }
  }

  /**
   * Register an obstacle with the collision system
   * @param {Object} obstacle - The obstacle to register
   */
  registerObstacle(obstacle) {
    if (!this.obstacles.includes(obstacle)) {
      this.obstacles.push(obstacle);
    }
  }

  /**
   * Unregister an entity from the collision system
   * @param {Object} entity - The entity to unregister
   */
  unregisterEntity(entity) {
    this.vehicles = this.vehicles.filter((v) => v !== entity);
    this.pedestrians = this.pedestrians.filter((p) => p !== entity);
    this.buildings = this.buildings.filter((b) => b !== entity);
    this.obstacles = this.obstacles.filter((o) => o !== entity);

    // Remove debug helper if exists
    if (this.debugMode) {
      this.removeDebugHelper(entity);
    }
  }

  /**
   * Update the collision system
   */
  update() {
    this.checkVehicleCollisions();
    this.checkVehiclePedestrianCollisions();
    this.checkVehicleBuildingCollisions();
    this.checkPedestrianBuildingCollisions();
  }

  /**
   * Check for collisions between vehicles
   */
  checkVehicleCollisions() {
    // Only collisions involving the car the player is driving matter. NPC
    // traffic and parked cars pass through each other, which keeps arcade
    // traffic flowing instead of causing pile-ups on the narrow roads.
    const playerCar = this.game.player && this.game.player.currentVehicle;
    if (!playerCar) return;

    for (let i = 0; i < this.vehicles.length; i++) {
      const vehicle1 = this.vehicles[i];

      // Skip if vehicle has no position
      if (!vehicle1.position) continue;

      for (let j = i + 1; j < this.vehicles.length; j++) {
        const vehicle2 = this.vehicles[j];

        // Skip if vehicle has no position
        if (!vehicle2.position) continue;

        // At least one car must be the player's.
        if (vehicle1 !== playerCar && vehicle2 !== playerCar) continue;

        // Calculate distance between vehicles
        const distance = vehicle1.position.distanceTo(vehicle2.position);

        // Sum of each vehicle's own radius (trucks/vans are larger)
        const minDistance =
          (vehicle1.collisionRadius || this.vehicleCollisionRadius) +
          (vehicle2.collisionRadius || this.vehicleCollisionRadius);

        // Check if collision occurred
        if (distance < minDistance) {
          // Handle collision
          this.handleVehicleCollision(vehicle1, vehicle2);
        }
      }
    }
  }

  /**
   * Check for collisions between vehicles and pedestrians
   */
  checkVehiclePedestrianCollisions() {
    for (const vehicle of this.vehicles) {
      // Skip if vehicle has no position
      if (!vehicle.position) continue;

      for (const pedestrian of this.pedestrians) {
        // Skip if pedestrian has no position
        if (!pedestrian.position) continue;

        // Calculate distance between vehicle and pedestrian
        const distance = vehicle.position.distanceTo(pedestrian.position);

        const minDistance =
          (vehicle.collisionRadius || this.vehicleCollisionRadius) +
          (pedestrian.collisionRadius || this.pedestrianCollisionRadius);

        // Check if collision occurred
        if (distance < minDistance) {
          // Handle collision
          this.handleVehiclePedestrianCollision(vehicle, pedestrian);
        }
      }
    }
  }

  /**
   * Check for collisions between vehicles and buildings
   */
  checkVehicleBuildingCollisions() {
    for (const vehicle of this.vehicles) {
      // Skip if vehicle has no position
      if (!vehicle.position) continue;

      if (this.collidesWithBuildings(vehicle)) {
        // Capture impact speed before handleCollision zeroes it.
        const impact = Math.abs(vehicle.speed || 0);
        const wasMoving = impact > 0.5;

        if (typeof vehicle.handleCollision === 'function') {
          vehicle.handleCollision();
        }

        if (wasMoving) {
          this.emitCrash(vehicle.position.x, vehicle.position.z, 0.4);
          this.damageVehicle(vehicle, impact * 2);
        }
      }
    }
  }

  /**
   * Check for collisions between pedestrians and buildings
   */
  checkPedestrianBuildingCollisions() {
    for (const pedestrian of this.pedestrians) {
      // Skip if pedestrian has no position
      if (!pedestrian.position) continue;

      if (this.collidesWithBuildings(pedestrian)) {
        // Each entity resolves its own collision: the player slides along
        // walls, NPCs revert and pick a new target.
        if (typeof pedestrian.handleCollision === 'function') {
          pedestrian.handleCollision();
        } else if (pedestrian.previousPosition) {
          pedestrian.position.copy(pedestrian.previousPosition);
          if (pedestrian.mesh) pedestrian.mesh.position.copy(pedestrian.position);
        }
      }
    }
  }

  /**
   * Test whether an entity currently overlaps any building or obstacle.
   * Uses a cheap broad-phase circle test before the precise box test.
   * @param {Object} entity - Entity with a `position` and `collisionRadius`
   * @returns {boolean} True if overlapping a building/obstacle
   */
  collidesWithBuildings(entity) {
    if (!entity || !entity.position) return false;

    const radius = entity.collisionRadius || this.pedestrianCollisionRadius;

    // Broad-phase: only buildings sharing the entity's grid cell(s).
    const candidates = this.buildingHash.queryUnique(entity.position.x, entity.position.z, radius);
    for (const building of candidates) {
      if (!building._collisionBox) continue;

      // Narrow-phase: precise box test
      if (this.isCollidingWithBuilding(entity, building)) return true;
    }

    for (const obstacle of this.obstacles) {
      if (!obstacle.mesh) continue;
      if (this.isCollidingWithObstacle(entity, obstacle)) return true;
    }

    return false;
  }

  /**
   * Check if an entity is colliding with a building
   * @param {Object} entity - The entity to check
   * @param {Object} building - The building to check against
   * @returns {boolean} True if colliding, false otherwise
   */
  isCollidingWithBuilding(entity, building) {
    // Use the cached bounding box computed at registration time
    const buildingBox = building._collisionBox;
    if (!buildingBox || !entity.position) {
      return false;
    }

    // Use the entity's own collision radius (falls back by group)
    const entityRadius =
      entity.collisionRadius ||
      (this.vehicles.includes(entity)
        ? this.vehicleCollisionRadius
        : this.pedestrianCollisionRadius);

    const entityBox = new THREE.Box3();
    entityBox.min.set(
      entity.position.x - entityRadius,
      entity.position.y - entityRadius,
      entity.position.z - entityRadius,
    );
    entityBox.max.set(
      entity.position.x + entityRadius,
      entity.position.y + entityRadius,
      entity.position.z + entityRadius,
    );

    // Check for intersection
    return entityBox.intersectsBox(buildingBox);
  }

  /**
   * Check if an entity is colliding with an obstacle
   * @param {Object} entity - The entity to check
   * @param {Object} obstacle - The obstacle to check against
   * @returns {boolean} True if colliding, false otherwise
   */
  isCollidingWithObstacle(entity, obstacle) {
    // Simple distance check for now
    const distance = entity.position.distanceTo(obstacle.position);
    const entityRadius =
      entity.collisionRadius ||
      (this.vehicles.includes(entity)
        ? this.vehicleCollisionRadius
        : this.pedestrianCollisionRadius);

    return distance < entityRadius + obstacle.radius;
  }

  /**
   * Handle a collision between two vehicles
   * @param {Object} vehicle1 - The first vehicle
   * @param {Object} vehicle2 - The second vehicle
   */
  handleVehicleCollision(vehicle1, vehicle2) {
    // Calculate collision response
    const direction = new THREE.Vector3()
      .subVectors(vehicle1.position, vehicle2.position)
      .normalize();

    // Push far enough apart to clear detection: use the SAME per-vehicle radius
    // sum the detector uses, otherwise large vehicles settle inside detection
    // range and re-collide every frame forever.
    const minDistance =
      (vehicle1.collisionRadius || this.vehicleCollisionRadius) +
      (vehicle2.collisionRadius || this.vehicleCollisionRadius);
    const pushDistance = minDistance - vehicle1.position.distanceTo(vehicle2.position);

    // Only push if they're actually overlapping
    if (pushDistance > 0) {
      // Push vehicle1 away from vehicle2
      vehicle1.position.add(direction.clone().multiplyScalar(pushDistance * 0.5));

      // Push vehicle2 away from vehicle1
      vehicle2.position.add(direction.clone().multiplyScalar(-pushDistance * 0.5));

      // Update mesh positions
      if (vehicle1.mesh) vehicle1.mesh.position.copy(vehicle1.position);
      if (vehicle2.mesh) vehicle2.mesh.position.copy(vehicle2.position);

      // Reduce speed of both vehicles
      if (vehicle1.speed) vehicle1.speed *= 0.5;
      if (vehicle2.speed) vehicle2.speed *= 0.5;

      // Only a "crash" if at least one vehicle was moving — otherwise this is
      // just spawn overlap being resolved and shouldn't spark or make noise.
      const closing = Math.abs(vehicle1.speed || 0) + Math.abs(vehicle2.speed || 0);
      if (closing > 0.5) {
        const mx = (vehicle1.position.x + vehicle2.position.x) / 2;
        const mz = (vehicle1.position.z + vehicle2.position.z) / 2;
        this.emitCrash(mx, mz, 0.5);
        // Both cars share the impact energy.
        this.damageVehicle(vehicle1, closing * 1.5);
        this.damageVehicle(vehicle2, closing * 1.5);
      }
    }
  }

  /**
   * Handle a collision between a vehicle and a pedestrian
   * @param {Object} vehicle - The vehicle
   * @param {Object} pedestrian - The pedestrian
   */
  handleVehiclePedestrianCollision(vehicle, pedestrian) {
    // Check if pedestrian is the player
    const isPlayer = pedestrian === this.game.player;

    // Calculate collision response
    const direction = new THREE.Vector3()
      .subVectors(pedestrian.position, vehicle.position)
      .normalize();

    // Push pedestrian away from vehicle
    const pushDistance = 1.0;
    pedestrian.position.add(direction.clone().multiplyScalar(pushDistance));

    // Update mesh position
    if (pedestrian.mesh) pedestrian.mesh.position.copy(pedestrian.position);

    const speed = Math.abs(vehicle.speed || 0);
    const isMoving = speed > 0.5;

    // Apply damage to pedestrian
    if (isPlayer) {
      // Player takes damage based on vehicle speed
      const damage = speed * 5;
      if (damage > 0) pedestrian.takeDamage(damage, this.game);
    } else if (isMoving && pedestrian.takeDamage && !pedestrian.isDead) {
      // A moving vehicle kills an NPC pedestrian
      const killed = pedestrian.takeDamage(100);
      if (killed) {
        this.killPedestrian(pedestrian);
        // Only award points when the player's own car does the running-over,
        // not when NPC traffic hits a jaywalker.
        const isPlayerCar = this.game.player && this.game.player.currentVehicle === vehicle;
        if (isPlayerCar && this.game.hud) {
          this.game.hud.addScore(50);
        }
      }
    }

    // Sparks/sound/shake only for meaningful impacts.
    if (isMoving) {
      this.emitCrash(pedestrian.position.x, pedestrian.position.z, 0.7);
    }
  }

  /**
   * Announce a crash on the event bus (Game reacts with sound, screen shake and
   * spark particles). Falls back to nothing if there's no game/bus wired up.
   * @param {number} x - Impact X
   * @param {number} z - Impact Z
   * @param {number} intensity - 0..1 crash strength
   */
  emitCrash(x, z, intensity) {
    if (this.game && this.game.events) {
      this.game.events.emit('crash', { x, z, intensity });
    }
  }

  /**
   * Apply crash damage to a vehicle and announce a wreck on the bus.
   * @param {Object} vehicle - The vehicle to damage
   * @param {number} amount - Damage points
   */
  damageVehicle(vehicle, amount) {
    if (!vehicle || typeof vehicle.takeDamage !== 'function' || vehicle.isWrecked) return;
    const wrecked = vehicle.takeDamage(amount);
    if (wrecked && this.game && this.game.events) {
      const wasPlayer = !!(this.game.player && this.game.player.currentVehicle === vehicle);
      this.game.events.emit('vehicleWrecked', {
        x: vehicle.position.x,
        z: vehicle.position.z,
        wasPlayer,
      });
    }
  }

  /**
   * Remove a dead NPC pedestrian from the world and free its resources.
   * @param {Object} pedestrian - The pedestrian to remove
   */
  killPedestrian(pedestrian) {
    // Stop tracking it for collisions
    this.unregisterEntity(pedestrian);

    // Remove it from the world's update list so it stops animating/moving
    if (this.game && this.game.world && Array.isArray(this.game.world.pedestrians)) {
      this.game.world.pedestrians = this.game.world.pedestrians.filter((p) => p !== pedestrian);
    }

    // Free GPU resources / remove mesh from scene
    if (typeof pedestrian.dispose === 'function') {
      pedestrian.dispose();
    } else if (pedestrian.mesh && pedestrian.mesh.parent) {
      pedestrian.mesh.parent.remove(pedestrian.mesh);
    }
  }

  /**
   * Add a debug helper for an entity
   * @param {Object} entity - The entity to add a helper for
   * @param {number} radius - The radius of the helper
   * @param {number} color - The color of the helper
   */
  addDebugHelper(entity, radius, color) {
    if (!this.game || !this.game.scene) return;

    // Create a sphere to visualize the collision radius
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    const helper = new THREE.Mesh(geometry, material);
    helper.position.copy(entity.position);

    // Store reference to entity
    helper.userData.entity = entity;

    // Add to scene
    this.game.scene.add(helper);

    // Add to debug helpers
    this.debugHelpers.push(helper);
  }

  /**
   * Remove a debug helper for an entity
   * @param {Object} entity - The entity to remove the helper for
   */
  removeDebugHelper(entity) {
    if (!this.game || !this.game.scene) return;

    // Find helper for entity
    const helper = this.debugHelpers.find((h) => h.userData.entity === entity);

    if (helper) {
      // Remove from scene
      this.game.scene.remove(helper);

      // Remove from debug helpers
      this.debugHelpers = this.debugHelpers.filter((h) => h !== helper);
    }
  }

  /**
   * Update debug helpers
   */
  updateDebugHelpers() {
    if (!this.debugMode) return;

    // Update position of all debug helpers
    for (const helper of this.debugHelpers) {
      const entity = helper.userData.entity;

      if (entity && entity.position) {
        helper.position.copy(entity.position);
      }
    }
  }

  /**
   * Toggle debug mode
   * @returns {boolean} New debug mode state
   */
  toggleDebugMode() {
    this.debugMode = !this.debugMode;

    if (this.debugMode) {
      // Add debug helpers for all entities
      for (const vehicle of this.vehicles) {
        this.addDebugHelper(
          vehicle,
          vehicle.collisionRadius || this.vehicleCollisionRadius,
          0xff0000,
        );
      }

      for (const pedestrian of this.pedestrians) {
        this.addDebugHelper(
          pedestrian,
          pedestrian.collisionRadius || this.pedestrianCollisionRadius,
          0x00ff00,
        );
      }
    } else {
      // Remove all debug helpers
      for (const helper of this.debugHelpers) {
        if (this.game && this.game.scene) {
          this.game.scene.remove(helper);
        }
      }

      this.debugHelpers = [];
    }

    return this.debugMode;
  }
}
