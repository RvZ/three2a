import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ObjectUtils, rand, orientDirection } from '../utils/utils';

export class Vehicle {
  constructor(type = 'sedan') {
    this.mesh = null;
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Euler(0, 0, 0);
    this.speed = 0;
    this.maxSpeed = 20;
    this.acceleration = 15;
    this.deceleration = 10;
    this.turnSpeed = 2.5;
    this.driver = null;
    this.hasDriver = false;
    this.type = type; // sedan, sports, truck, van
    this.color = this.getRandomColor();
    this.previousPosition = null;

    // Collision radius, refined per body type in the create* methods
    this.collisionRadius = 2.0;

    // Shared head/tail light materials, brightened at night (set in addLights).
    this.headlightMaterial = null;
    this.taillightMaterial = null;

    // Damage model.
    this.maxHealth = 100;
    this.health = 100;
    this.isWrecked = false;

    // Set for AI-driven traffic cars (see TrafficManager).
    this.isTraffic = false;

    // Direction vector (normalized)
    this.direction = new THREE.Vector3(0, 0, 1); // Forward is +Z (where headlights point)
  }

  getRandomColor() {
    // Common car colors
    const colors = [
      0xff0000, // red
      0x0000ff, // blue
      0x00ff00, // green
      0xffff00, // yellow
      0xffffff, // white
      0x000000, // black
      0x888888, // gray
      0xffa500, // orange
      0x800080, // purple
      0x008080, // teal
      0x964b00, // brown
    ];

    return colors[Math.floor(rand() * colors.length)];
  }

  init(scene, x = 0, _y = 0, z = 0) {
    // Create vehicle based on type
    switch (this.type) {
      case 'sports':
        this.createSportsCar(scene, x, z);
        break;
      case 'truck':
        this.createTruck(scene, x, z);
        break;
      case 'van':
        this.createVan(scene, x, z);
        break;
      case 'sedan':
      default:
        this.createSedan(scene, x, z);
        break;
    }

    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;
  }

  createSedan(scene, x, z) {
    this.makeMaterials();
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);

    // Lower body, glass greenhouse, roof cap, chrome bumpers, side sills.
    this.part(this.rbox(2.0, 0.7, 4.2, 0.28), this.bodyMaterial, 0, 0.55, 0);
    this.part(this.rbox(1.7, 0.62, 2.1, 0.22), this.glassMaterial, 0, 1.05, -0.2);
    this.part(this.rbox(1.55, 0.16, 1.5, 0.14), this.bodyMaterial, 0, 1.34, -0.35);
    this.part(this.rbox(1.95, 0.26, 0.3, 0.1), this.chromeMaterial, 0, 0.42, 2.0);
    this.part(this.rbox(1.95, 0.26, 0.3, 0.1), this.chromeMaterial, 0, 0.42, -2.0);
    this.part(this.rbox(2.04, 0.16, 3.4, 0.07), this.trimMaterial, 0, 0.3, 0);

    this.addWheel(0.92, 1.25, 0.42);
    this.addWheel(-0.92, 1.25, 0.42);
    this.addWheel(0.92, -1.25, 0.42);
    this.addWheel(-0.92, -1.25, 0.42);
    this.addLights(2.05, -2.05, 0.55);
    this.collisionRadius = 2.0;

    scene.add(this.mesh);
  }

  createSportsCar(scene, x, z) {
    this.makeMaterials();
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);

    // Low, wide body with a rear wing.
    this.part(this.rbox(2.1, 0.55, 4.4, 0.3), this.bodyMaterial, 0, 0.45, 0);
    this.part(this.rbox(1.75, 0.48, 1.9, 0.2), this.glassMaterial, 0, 0.85, -0.1);
    this.part(this.rbox(1.6, 0.13, 1.2, 0.1), this.bodyMaterial, 0, 1.05, -0.25);
    this.part(this.rbox(1.7, 0.1, 0.5, 0.05), this.trimMaterial, 0, 0.72, -2.0);
    this.part(this.rbox(0.12, 0.3, 0.12, 0.04), this.trimMaterial, 0.7, 0.57, -1.95);
    this.part(this.rbox(0.12, 0.3, 0.12, 0.04), this.trimMaterial, -0.7, 0.57, -1.95);
    this.part(this.rbox(2.0, 0.2, 0.28, 0.08), this.chromeMaterial, 0, 0.34, 2.1);
    this.part(this.rbox(2.0, 0.2, 0.28, 0.08), this.chromeMaterial, 0, 0.34, -2.1);

    this.addWheel(0.96, 1.35, 0.5);
    this.addWheel(-0.96, 1.35, 0.5);
    this.addWheel(0.96, -1.35, 0.5);
    this.addWheel(-0.96, -1.35, 0.5);
    this.addLights(2.15, -2.15, 0.45);

    this.maxSpeed = 30;
    this.acceleration = 20;
    this.collisionRadius = 2.1;

    scene.add(this.mesh);
  }

  createTruck(scene, x, z) {
    this.makeMaterials();
    this.cargoMaterial = new THREE.MeshStandardMaterial({
      color: 0x9aa0aa,
      metalness: 0.35,
      roughness: 0.55,
      envMapIntensity: 1,
    });
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);

    // Cab up front, boxy cargo behind, big wheels.
    this.part(this.rbox(2.2, 1.5, 1.9, 0.22), this.bodyMaterial, 0, 1.05, 1.85);
    this.part(this.rbox(1.95, 0.8, 0.25, 0.08), this.glassMaterial, 0, 1.5, 2.72);
    this.part(this.rbox(2.3, 1.8, 3.4, 0.12), this.cargoMaterial, 0, 1.15, -1.1);
    this.part(this.rbox(2.1, 0.3, 0.3, 0.08), this.chromeMaterial, 0, 0.45, 2.9);

    this.addWheel(1.0, 1.7, 0.55);
    this.addWheel(-1.0, 1.7, 0.55);
    this.addWheel(1.0, -1.0, 0.55);
    this.addWheel(-1.0, -1.0, 0.55);
    this.addWheel(1.0, -2.5, 0.55);
    this.addWheel(-1.0, -2.5, 0.55);
    this.addLights(2.85, -2.85, 0.7);

    this.maxSpeed = 15;
    this.acceleration = 10;
    this.collisionRadius = 2.7;

    scene.add(this.mesh);
  }

  createVan(scene, x, z) {
    this.makeMaterials();
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);

    // Tall body, raked windshield, side glass band.
    this.part(this.rbox(2.1, 1.7, 4.4, 0.32), this.bodyMaterial, 0, 1.05, -0.15);
    this.part(this.rbox(1.95, 0.85, 0.28, 0.1), this.glassMaterial, 0, 1.55, 2.02);
    this.part(this.rbox(2.16, 0.6, 2.4, 0.06), this.glassMaterial, 0, 1.55, 0.6);
    this.part(this.rbox(2.05, 0.28, 0.3, 0.08), this.chromeMaterial, 0, 0.45, 2.2);
    this.part(this.rbox(2.05, 0.28, 0.3, 0.08), this.chromeMaterial, 0, 0.45, -2.2);

    this.addWheel(0.96, 1.5, 0.5);
    this.addWheel(-0.96, 1.5, 0.5);
    this.addWheel(0.96, -1.5, 0.5);
    this.addWheel(-0.96, -1.5, 0.5);
    this.addLights(2.25, -2.25, 0.6);

    this.collisionRadius = 2.4;

    scene.add(this.mesh);
  }

  /** Create the shared PBR materials for this vehicle's body. */
  makeMaterials() {
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.6,
      roughness: 0.35,
      envMapIntensity: 1.2,
    });
    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x171d29,
      metalness: 0.25,
      roughness: 0.07,
      envMapIntensity: 1.6,
    });
    this.chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7dadf,
      metalness: 1.0,
      roughness: 0.28,
      envMapIntensity: 1.5,
    });
    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x111114,
      metalness: 0.7,
      roughness: 0.45,
    });
    this.tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d0d0f,
      metalness: 0.0,
      roughness: 0.85,
    });
    this.hubMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9ccd2,
      metalness: 0.95,
      roughness: 0.3,
      envMapIntensity: 1.5,
    });
  }

  /** A rounded box geometry (nicer silhouette than a hard-edged BoxGeometry). */
  rbox(w, h, d, r = 0.12) {
    return new RoundedBoxGeometry(w, h, d, 4, r);
  }

  /** Add a shadow-casting mesh to the vehicle group at a local position. */
  part(geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.mesh.add(mesh);
    return mesh;
  }

  /**
   * Add head/tail light bars. Positions are passed in so each body type places
   * them on its own front/rear faces.
   */
  addLights(frontZ, backZ, y = 0.5) {
    this.headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5,
    });
    this.taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3322,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });

    const hl = new THREE.BoxGeometry(0.38, 0.2, 0.12);
    this.part(hl, this.headlightMaterial, 0.62, y, frontZ);
    this.part(hl, this.headlightMaterial, -0.62, y, frontZ);

    const tl = new THREE.BoxGeometry(0.44, 0.18, 0.1);
    this.part(tl, this.taillightMaterial, 0.62, y, backZ);
    this.part(tl, this.taillightMaterial, -0.62, y, backZ);
  }

  /** Add a tyre + hubcap pair centred at (x, z), sitting on the ground. */
  addWheel(x, z, r = 0.42) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, 20), this.tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, r, z);
    tire.castShadow = true;
    this.mesh.add(tire);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.36, 12),
      this.hubMaterial,
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, r, z);
    this.mesh.add(hub);
  }

  update(delta, inputManager) {
    // Store previous position for collision resolution
    this.previousPosition = this.position.clone();

    if (!this.hasDriver || !inputManager) {
      // Apply deceleration when no driver or no input
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.deceleration * delta);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + this.deceleration * delta);
      }
    } else {
      // Handle turning (can happen even when not moving)
      if (inputManager.moveLeft) {
        // Only apply turning effect when moving or when stationary with a small rotation
        if (this.speed !== 0) {
          // Determine turn direction based on forward/backward
          const turnFactor = this.speed > 0 ? 1 : -1;
          this.rotation.y += this.turnSpeed * delta * turnFactor;
        } else {
          // Allow some rotation even when stationary (slower)
          this.rotation.y += this.turnSpeed * 0.3 * delta;
        }
        // Update direction vector
        this.updateDirection();
      }
      if (inputManager.moveRight) {
        // Only apply turning effect when moving or when stationary with a small rotation
        if (this.speed !== 0) {
          // Determine turn direction based on forward/backward
          const turnFactor = this.speed > 0 ? 1 : -1;
          this.rotation.y -= this.turnSpeed * delta * turnFactor;
        } else {
          // Allow some rotation even when stationary (slower)
          this.rotation.y -= this.turnSpeed * 0.3 * delta;
        }
        // Update direction vector
        this.updateDirection();
      }

      // Handle acceleration/deceleration
      if (inputManager.moveForward) {
        // Accelerate forward
        this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * delta);
      } else if (inputManager.moveBackward) {
        // Reverse
        this.speed = Math.max(-this.maxSpeed / 2, this.speed - this.acceleration * delta);
      } else {
        // Natural deceleration when no input
        if (this.speed > 0) {
          this.speed = Math.max(0, this.speed - this.deceleration * delta);
        } else if (this.speed < 0) {
          this.speed = Math.min(0, this.speed + this.deceleration * delta);
        }
      }
    }

    // Apply movement based on speed and direction
    if (this.speed !== 0) {
      // Calculate movement vector
      const movement = this.direction.clone().multiplyScalar(this.speed * delta);

      // Update position
      this.position.add(movement);
    }

    // Update mesh position and rotation
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.rotation.y;
    }
  }

  // Update the direction vector based on current rotation
  updateDirection() {
    // Vehicles face +Z in model space.
    orientDirection(this.direction, this.rotation.y, 1);
  }

  // Handle collision by stopping and moving back slightly
  handleCollision() {
    // Stop the vehicle
    this.speed = 0;

    // Move back to previous position if available
    if (this.previousPosition) {
      this.position.copy(this.previousPosition);
      if (this.mesh) {
        this.mesh.position.copy(this.previousPosition);
      }
    }
  }

  /**
   * Brighten the head/tail lights as night falls.
   * @param {number} n - 0 (full day) .. 1 (full night)
   */
  setNightLevel(n) {
    if (this.isWrecked) return; // wrecked cars stay dark
    const t = Math.max(0, Math.min(1, n));
    if (this.headlightMaterial) this.headlightMaterial.emissiveIntensity = 0.4 + t * 1.8;
    if (this.taillightMaterial) this.taillightMaterial.emissiveIntensity = 0.35 + t * 1.25;
  }

  /**
   * Apply crash damage. Returns true if this hit wrecked the vehicle.
   * @param {number} amount - Damage points
   * @returns {boolean} True if the vehicle just became wrecked
   */
  takeDamage(amount) {
    if (this.isWrecked) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.wreck();
      return true;
    }
    return false;
  }

  /** Turn the vehicle into an undrivable, charred wreck. */
  wreck() {
    if (this.isWrecked) return;
    this.isWrecked = true;
    this.speed = 0;
    this.maxSpeed = 0;
    this.acceleration = 0;

    // Char the paint (and cargo, if any) and kill the lights.
    if (this.bodyMaterial && this.bodyMaterial.color) this.bodyMaterial.color.multiplyScalar(0.3);
    if (this.cargoMaterial && this.cargoMaterial.color) this.cargoMaterial.color.multiplyScalar(0.3);
    if (this.headlightMaterial) this.headlightMaterial.emissiveIntensity = 0;
    if (this.taillightMaterial) this.taillightMaterial.emissiveIntensity = 0;
  }

  setDriver(player) {
    this.driver = player;
    this.hasDriver = true;

    // Initialize direction vector when a driver enters
    this.updateDirection();
  }

  removeDriver() {
    this.driver = null;
    this.hasDriver = false;
  }

  /**
   * Remove this vehicle's mesh from the scene and free its resources.
   */
  dispose() {
    ObjectUtils.dispose(this.mesh);
  }
}
