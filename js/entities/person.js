import * as THREE from 'three';
import { ObjectUtils, rand } from '../utils/utils';

export class Person {
  constructor(options = {}) {
    // Default options
    this.options = {
      hairColor: options.hairColor || this.getRandomHairColor(),
      skinColor: options.skinColor || this.getRandomSkinColor(),
      shirtColor: options.shirtColor || this.getRandomClothingColor(),
      pantsColor: options.pantsColor || this.getRandomClothingColor(),
      shoesColor: options.shoesColor || 0x000000, // Default black shoes
      isPlayer: options.isPlayer || false,
    };

    this.mesh = null;
    // Live position reference; assigned to mesh.position in init() so the
    // collision system (which reads entity.position) can see NPCs.
    this.position = null;
    this.walkingSpeed = 0.5 + rand() * 1.5; // Random walking speed for pedestrians
    this.walkingDirection = new THREE.Vector3(0, 0, 0);
    this.targetPosition = null;
    this.isWalking = false;

    // Collision + health
    this.collisionRadius = 0.5;
    this.health = 100;
    this.isDead = false;

    // Animation properties
    this.animationTime = 0;
    this.walkingAnimationSpeed = 10;

    // Body parts
    this.head = null;
    this.torso = null;
    this.leftArm = null;
    this.rightArm = null;
    this.leftLeg = null;
    this.rightLeg = null;

    // For collision detection
    this.previousPosition = null;
  }

  init(scene, x = 0, z = 0) {
    // Create the person group
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);

    // Expose the mesh position as this.position so collision code can read it
    this.position = this.mesh.position;

    // Create body parts
    this.createHead();
    this.createTorso();
    this.createArms();
    this.createLegs();

    // Add shadow
    this.mesh.castShadow = true;
    this.mesh.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    // If this is the player, add a small indicator
    if (this.options.isPlayer) {
      this.addPlayerIndicator();
    }

    scene.add(this.mesh);
  }

  createHead() {
    const skinMat = new THREE.MeshStandardMaterial({ color: this.options.skinColor, roughness: 0.75 });

    // Neck.
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.14, 10), skinMat);
    neck.position.set(0, 1.72, 0);
    this.mesh.add(neck);

    // Head.
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), skinMat);
    head.position.set(0, 1.94, 0);
    this.head = head;
    this.mesh.add(head);

    // Hair cap (upper hemisphere).
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.255, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
      new THREE.MeshStandardMaterial({ color: this.options.hairColor, roughness: 0.9 }),
    );
    hair.position.set(0, 1.95, 0);
    this.mesh.add(hair);

    // Eyes.
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });
    const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    for (const sx of [0.09, -0.09]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(sx, 1.96, 0.21);
      this.mesh.add(eye);
    }
  }

  createTorso() {
    const torsoMat = new THREE.MeshStandardMaterial({ color: this.options.shirtColor, roughness: 0.85 });
    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 5, 14), torsoMat);
    this.torso.position.set(0, 1.32, 0);
    this.torso.scale.set(1, 1, 0.7); // flatten front-to-back
    this.mesh.add(this.torso);
  }

  createArms() {
    const sleeveMat = new THREE.MeshStandardMaterial({ color: this.options.shirtColor, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: this.options.skinColor, roughness: 0.75 });
    const armGeo = new THREE.CapsuleGeometry(0.085, 0.42, 4, 10);
    const handGeo = new THREE.SphereGeometry(0.09, 10, 8);

    // Each arm hangs from a shoulder pivot so the walk swing rotates from the
    // shoulder, not the arm's midpoint.
    const makeArm = (sx) => {
      const pivot = new THREE.Group();
      pivot.position.set(sx, 1.58, 0);
      const arm = new THREE.Mesh(armGeo, sleeveMat);
      arm.position.set(0, -0.3, 0);
      pivot.add(arm);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.set(0, -0.6, 0);
      pivot.add(hand);
      this.mesh.add(pivot);
      return pivot;
    };
    this.leftArm = makeArm(0.32);
    this.rightArm = makeArm(-0.32);
  }

  createLegs() {
    const legMat = new THREE.MeshStandardMaterial({ color: this.options.pantsColor, roughness: 0.85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: this.options.shoesColor, roughness: 0.6 });
    const legGeo = new THREE.CapsuleGeometry(0.12, 0.5, 4, 12);
    const shoeGeo = new THREE.BoxGeometry(0.2, 0.13, 0.34);

    // Legs hang from hip pivots (see makeArm rationale).
    const makeLeg = (sx) => {
      const pivot = new THREE.Group();
      pivot.position.set(sx, 0.9, 0);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(0, -0.38, 0);
      pivot.add(leg);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(0, -0.74, 0.07);
      pivot.add(shoe);
      this.mesh.add(pivot);
      return pivot;
    };
    this.leftLeg = makeLeg(0.15);
    this.rightLeg = makeLeg(-0.15);
  }

  addPlayerIndicator() {
    // Add a small arrow above the player's head to indicate it's the player
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.2, 4);
    const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.set(0, 2.35, 0);
    this.mesh.add(arrow);
  }

  update(delta, direction) {
    // Dead NPCs no longer move or animate
    if (this.isDead) return;

    // For player-controlled person, use the provided direction
    if (this.options.isPlayer) {
      // If direction is provided, animate walking
      if (direction && direction.length() > 0) {
        this.animateWalking(delta, true);
      } else {
        // Reset pose when not moving
        this.resetPose();
      }
    }
    // For NPCs, handle their own movement
    else if (this.isWalking) {
      this.updatePedestrianMovement(delta);
    } else {
      // Randomly decide to start walking again
      if (rand() < 0.01) {
        // 1% chance per frame to start walking
        this.isWalking = true;
        this.findNewTarget();
      } else {
        // Reset pose when not moving
        this.resetPose();
      }
    }
  }

  animateWalking(delta, isMoving) {
    // Only animate if actually moving
    if (!isMoving) {
      this.resetPose();
      return;
    }

    // Update animation time
    this.animationTime += delta * this.walkingAnimationSpeed;

    // Animate legs
    const legSwing = Math.sin(this.animationTime) * 0.8;
    this.leftLeg.rotation.x = legSwing;
    this.rightLeg.rotation.x = -legSwing;

    // Animate arms (opposite to legs)
    const armSwing = Math.sin(this.animationTime) * 0.8;
    this.leftArm.rotation.x = -armSwing;
    this.rightArm.rotation.x = armSwing;
  }

  resetPose() {
    // Reset all limbs to default position
    if (this.leftLeg) this.leftLeg.rotation.x = 0;
    if (this.rightLeg) this.rightLeg.rotation.x = 0;
    if (this.leftArm) this.leftArm.rotation.x = 0;
    if (this.rightArm) this.rightArm.rotation.x = 0;
  }

  updatePedestrianMovement(delta) {
    // If no target, find a new one
    if (!this.targetPosition) {
      this.findNewTarget();
    }

    // Store previous position for collision resolution
    this.previousPosition = this.mesh.position.clone();

    // Move towards target
    if (this.targetPosition) {
      const direction = new THREE.Vector3();
      direction.subVectors(this.targetPosition, this.mesh.position).normalize();

      // Update position
      this.mesh.position.x += direction.x * this.walkingSpeed * delta;
      this.mesh.position.z += direction.z * this.walkingSpeed * delta;

      // Update rotation to face movement direction
      const targetRotation = Math.atan2(direction.x, -direction.z);
      this.mesh.rotation.y = targetRotation;

      // Animate walking
      this.animateWalking(delta, true);

      // Check if we've reached the target
      const distanceToTarget = this.mesh.position.distanceTo(this.targetPosition);
      if (distanceToTarget < 0.5) {
        this.targetPosition = null;
        this.isWalking = rand() > 0.3; // 70% chance to keep walking
      }
    }
  }

  findNewTarget() {
    // Find a new random position to walk to
    const range = 20;
    const x = this.mesh.position.x + (rand() * range * 2 - range);
    const z = this.mesh.position.z + (rand() * range * 2 - range);
    this.targetPosition = new THREE.Vector3(x, 0, z);
    this.isWalking = true;
  }

  // Handle collision by reverting to previous position
  handleCollision() {
    if (this.previousPosition) {
      this.mesh.position.copy(this.previousPosition);

      // Find a new target in a different direction
      this.findNewTarget();
    }
  }

  /**
   * Apply damage to this pedestrian. Returns true if the hit was fatal.
   * @param {number} amount - Damage amount
   * @returns {boolean} True if the pedestrian died from this damage
   */
  takeDamage(amount) {
    if (this.isDead) return false;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      return true;
    }
    return false;
  }

  /**
   * Remove this pedestrian's mesh from the scene and free its resources.
   */
  dispose() {
    this.isDead = true;
    ObjectUtils.dispose(this.mesh);
  }

  getRandomHairColor() {
    const hairColors = [
      0x000000, // Black
      0x3b2403, // Dark brown
      0x654321, // Brown
      0xa52a2a, // Auburn
      0xdeb887, // Sandy blonde
      0xffd700, // Blonde
      0xa9a9a9, // Gray
      0xe6e6fa, // Light gray/white
    ];
    return hairColors[Math.floor(rand() * hairColors.length)];
  }

  getRandomSkinColor() {
    const skinColors = [
      0xffe0bd, // Light
      0xffcd94, // Light medium
      0xeac086, // Medium
      0xd8a76c, // Medium dark
      0xc68642, // Dark
      0x8d5524, // Very dark
    ];
    return skinColors[Math.floor(rand() * skinColors.length)];
  }

  getRandomClothingColor() {
    const clothingColors = [
      0xff0000, // Red
      0x0000ff, // Blue
      0x00ff00, // Green
      0xffff00, // Yellow
      0xff00ff, // Magenta
      0x00ffff, // Cyan
      0xffa500, // Orange
      0x800080, // Purple
      0x008080, // Teal
      0x000000, // Black
      0xffffff, // White
      0x808080, // Gray
    ];
    return clothingColors[Math.floor(rand() * clothingColors.length)];
  }
}
