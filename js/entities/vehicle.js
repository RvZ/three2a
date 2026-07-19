import * as THREE from 'three';
import { ObjectUtils } from '../utils/utils';

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

    return colors[Math.floor(Math.random() * colors.length)];
  }

  init(scene, x = 0, y = 0, z = 0) {
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
    // Create vehicle body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.position.set(x, 0.5, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Add roof
    const roofGeometry = new THREE.BoxGeometry(1.8, 0.8, 2);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: this.getDarkerColor(this.color) });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 0.9, -0.5);
    this.mesh.add(roof);

    // Add windows
    this.addWindows();

    // Add wheels
    this.addWheel(0.8, 0, 1.2);
    this.addWheel(-0.8, 0, 1.2);
    this.addWheel(0.8, 0, -1.2);
    this.addWheel(-0.8, 0, -1.2);

    // Add lights
    this.addLights();

    scene.add(this.mesh);
  }

  createSportsCar(scene, x, z) {
    // Create vehicle body (lower and wider than sedan)
    const bodyGeometry = new THREE.BoxGeometry(2.2, 0.8, 4.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.position.set(x, 0.4, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Add roof (lower profile)
    const roofGeometry = new THREE.BoxGeometry(2, 0.6, 1.8);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: this.getDarkerColor(this.color) });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 0.7, -0.5);
    this.mesh.add(roof);

    // Add spoiler
    const spoilerGeometry = new THREE.BoxGeometry(1.8, 0.2, 0.5);
    const spoilerMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
    spoiler.position.set(0, 0.7, -2);
    this.mesh.add(spoiler);

    // Add spoiler supports
    const supportGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

    const leftSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    leftSupport.position.set(0.7, 0.5, -2);
    this.mesh.add(leftSupport);

    const rightSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    rightSupport.position.set(-0.7, 0.5, -2);
    this.mesh.add(rightSupport);

    // Add windows
    this.addWindows();

    // Add wheels (larger than sedan)
    this.addWheel(0.9, 0, 1.3, 0.5);
    this.addWheel(-0.9, 0, 1.3, 0.5);
    this.addWheel(0.9, 0, -1.3, 0.5);
    this.addWheel(-0.9, 0, -1.3, 0.5);

    // Add lights
    this.addLights();

    // Set higher max speed for sports cars
    this.maxSpeed = 30;
    this.acceleration = 20;
    this.collisionRadius = 2.1;

    scene.add(this.mesh);
  }

  createTruck(scene, x, z) {
    // Create cab
    const cabGeometry = new THREE.BoxGeometry(2.2, 1.8, 2);
    const cabMaterial = new THREE.MeshStandardMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(cabGeometry, cabMaterial);
    this.mesh.position.set(x, 0.9, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Create cargo area
    const cargoGeometry = new THREE.BoxGeometry(2.2, 1.5, 3);
    const cargoMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const cargo = new THREE.Mesh(cargoGeometry, cargoMaterial);
    cargo.position.set(0, 0, -2.5);
    this.mesh.add(cargo);

    // Add windows
    this.addWindows();

    // Add wheels (larger than sedan)
    this.addWheel(1, 0, 0.7, 0.6);
    this.addWheel(-1, 0, 0.7, 0.6);
    this.addWheel(1, 0, -2, 0.6);
    this.addWheel(-1, 0, -2, 0.6);
    this.addWheel(1, 0, -3.5, 0.6);
    this.addWheel(-1, 0, -3.5, 0.6);

    // Add lights
    this.addLights();

    // Set lower max speed for trucks
    this.maxSpeed = 15;
    this.acceleration = 10;
    this.collisionRadius = 2.7;

    scene.add(this.mesh);
  }

  createVan(scene, x, z) {
    // Create vehicle body (taller than sedan)
    const bodyGeometry = new THREE.BoxGeometry(2.2, 2, 4.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.position.set(x, 1, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Add windows
    this.addWindows();

    // Add wheels
    this.addWheel(0.9, 0, 1.5, 0.5);
    this.addWheel(-0.9, 0, 1.5, 0.5);
    this.addWheel(0.9, 0, -1.5, 0.5);
    this.addWheel(-0.9, 0, -1.5, 0.5);

    // Add lights
    this.addLights();

    this.collisionRadius = 2.4;

    scene.add(this.mesh);
  }

  addWindows() {
    // Add windshield and windows
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
    });

    // Different window configurations based on vehicle type
    if (this.type === 'sedan' || this.type === 'sports') {
      // Windshield
      const windshieldGeometry = new THREE.PlaneGeometry(1.6, 0.8);
      const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
      windshield.position.set(0, 1, 0.8);
      windshield.rotation.x = Math.PI / 2 - 0.2;
      this.mesh.add(windshield);

      // Rear window
      const rearWindowGeometry = new THREE.PlaneGeometry(1.6, 0.7);
      const rearWindow = new THREE.Mesh(rearWindowGeometry, windowMaterial);
      rearWindow.position.set(0, 1, -1.8);
      rearWindow.rotation.x = -Math.PI / 2 + 0.2;
      this.mesh.add(rearWindow);
    } else if (this.type === 'truck') {
      // Truck windshield
      const windshieldGeometry = new THREE.PlaneGeometry(1.8, 1);
      const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
      windshield.position.set(0, 1.3, 1);
      windshield.rotation.x = Math.PI / 2 - 0.1;
      this.mesh.add(windshield);
    } else if (this.type === 'van') {
      // Van windshield
      const windshieldGeometry = new THREE.PlaneGeometry(1.8, 1);
      const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
      windshield.position.set(0, 1.5, 2.2);
      windshield.rotation.x = Math.PI / 2 - 0.1;
      this.mesh.add(windshield);

      // Van side windows
      const sideWindowGeometry = new THREE.PlaneGeometry(3, 0.8);

      const leftWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
      leftWindow.position.set(1.11, 1.5, 0);
      leftWindow.rotation.y = Math.PI / 2;
      this.mesh.add(leftWindow);

      const rightWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
      rightWindow.position.set(-1.11, 1.5, 0);
      rightWindow.rotation.y = -Math.PI / 2;
      this.mesh.add(rightWindow);
    }
  }

  addLights() {
    // Add headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5,
    });

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.scale.set(1, 0.5, 0.5);
    rightHeadlight.position.set(0.7, 0.5, 2);
    this.mesh.add(rightHeadlight);

    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.scale.set(1, 0.5, 0.5);
    leftHeadlight.position.set(-0.7, 0.5, 2);
    this.mesh.add(leftHeadlight);

    // Add taillights
    const taillightGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });

    const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    rightTaillight.scale.set(1, 0.5, 0.5);

    const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    leftTaillight.scale.set(1, 0.5, 0.5);

    // Position taillights based on vehicle type
    if (this.type === 'truck') {
      rightTaillight.position.set(0.7, 0.5, -4);
      leftTaillight.position.set(-0.7, 0.5, -4);
    } else {
      rightTaillight.position.set(0.7, 0.5, -2);
      leftTaillight.position.set(-0.7, 0.5, -2);
    }

    this.mesh.add(rightTaillight);
    this.mesh.add(leftTaillight);
  }

  addWheel(x, y, z, radius = 0.4) {
    const wheelGeometry = new THREE.CylinderGeometry(radius, radius, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(x, y, z);
    wheel.rotation.z = Math.PI / 2;
    this.mesh.add(wheel);

    // Add hubcap
    const hubcapGeometry = new THREE.CircleGeometry(radius * 0.6, 8);
    const hubcapMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const hubcap = new THREE.Mesh(hubcapGeometry, hubcapMaterial);

    // Position hubcap on the outside of the wheel
    if (x > 0) {
      hubcap.position.set(0.15, 0, 0);
      hubcap.rotation.y = Math.PI / 2;
    } else {
      hubcap.position.set(-0.15, 0, 0);
      hubcap.rotation.y = -Math.PI / 2;
    }

    wheel.add(hubcap);
  }

  getDarkerColor(color) {
    const c = new THREE.Color(color);
    c.multiplyScalar(0.7); // Make it 30% darker
    return c;
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
    // Reset direction to forward (Z+)
    this.direction.set(0, 0, 1);

    // Create a rotation matrix from the current rotation
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationY(this.rotation.y);

    // Apply rotation to direction vector
    this.direction.applyMatrix4(rotationMatrix);

    // Ensure it's normalized
    this.direction.normalize();
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
