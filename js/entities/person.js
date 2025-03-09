import * as THREE from 'three';

export class Person {
    constructor(options = {}) {
        // Default options
        this.options = {
            hairColor: options.hairColor || this.getRandomHairColor(),
            skinColor: options.skinColor || this.getRandomSkinColor(),
            shirtColor: options.shirtColor || this.getRandomClothingColor(),
            pantsColor: options.pantsColor || this.getRandomClothingColor(),
            shoesColor: options.shoesColor || 0x000000, // Default black shoes
            isPlayer: options.isPlayer || false
        };
        
        this.mesh = null;
        this.walkingSpeed = 0.5 + Math.random() * 1.5; // Random walking speed for pedestrians
        this.walkingDirection = new THREE.Vector3(0, 0, 0);
        this.targetPosition = null;
        this.isWalking = false;
        
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
        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: this.options.skinColor });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 1.7, 0);
        this.mesh.add(head);
        
        // Hair
        const hairGeometry = new THREE.SphereGeometry(0.26, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const hairMaterial = new THREE.MeshStandardMaterial({ color: this.options.hairColor });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 1.7, 0);
        hair.rotation.x = Math.PI;
        this.mesh.add(hair);
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilGeometry = new THREE.SphereGeometry(0.025, 8, 8);
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.1, 1.7, 0.2);
        this.mesh.add(leftEye);
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0.1, 1.7, 0.24);
        this.mesh.add(leftPupil);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.1, 1.7, 0.2);
        this.mesh.add(rightEye);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(-0.1, 1.7, 0.24);
        this.mesh.add(rightPupil);
    }
    
    createTorso() {
        // Torso (shirt)
        const torsoGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.3);
        const torsoMaterial = new THREE.MeshStandardMaterial({ color: this.options.shirtColor });
        this.torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
        this.torso.position.set(0, 1.3, 0);
        this.mesh.add(this.torso);
    }
    
    createArms() {
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const armMaterial = new THREE.MeshStandardMaterial({ color: this.options.shirtColor });
        
        // Left arm
        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(0.375, 1.3, 0);
        this.mesh.add(this.leftArm);
        
        // Right arm
        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(-0.375, 1.3, 0);
        this.mesh.add(this.rightArm);
        
        // Hands
        const handGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const handMaterial = new THREE.MeshStandardMaterial({ color: this.options.skinColor });
        
        // Left hand
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(0.375, 1, 0);
        this.mesh.add(leftHand);
        
        // Right hand
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(-0.375, 1, 0);
        this.mesh.add(rightHand);
    }
    
    createLegs() {
        // Legs (pants)
        const legGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const legMaterial = new THREE.MeshStandardMaterial({ color: this.options.pantsColor });
        
        // Left leg
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(0.15, 0.65, 0);
        this.mesh.add(this.leftLeg);
        
        // Right leg
        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(-0.15, 0.65, 0);
        this.mesh.add(this.rightLeg);
        
        // Shoes
        const shoeGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
        const shoeMaterial = new THREE.MeshStandardMaterial({ color: this.options.shoesColor });
        
        // Left shoe
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(0.15, 0.25, 0.05);
        this.mesh.add(leftShoe);
        
        // Right shoe
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(-0.15, 0.25, 0.05);
        this.mesh.add(rightShoe);
    }
    
    addPlayerIndicator() {
        // Add a small arrow above the player's head to indicate it's the player
        const arrowGeometry = new THREE.ConeGeometry(0.1, 0.2, 4);
        const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(0, 2.1, 0);
        this.mesh.add(arrow);
    }
    
    update(delta, direction) {
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
            if (Math.random() < 0.01) { // 1% chance per frame to start walking
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
                this.isWalking = Math.random() > 0.3; // 70% chance to keep walking
            }
        }
    }
    
    findNewTarget() {
        // Find a new random position to walk to
        const range = 20;
        const x = this.mesh.position.x + (Math.random() * range * 2 - range);
        const z = this.mesh.position.z + (Math.random() * range * 2 - range);
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
    
    getRandomHairColor() {
        const hairColors = [
            0x000000, // Black
            0x3b2403, // Dark brown
            0x654321, // Brown
            0xA52A2A, // Auburn
            0xDEB887, // Sandy blonde
            0xFFD700, // Blonde
            0xA9A9A9, // Gray
            0xE6E6FA  // Light gray/white
        ];
        return hairColors[Math.floor(Math.random() * hairColors.length)];
    }
    
    getRandomSkinColor() {
        const skinColors = [
            0xffe0bd, // Light
            0xffcd94, // Light medium
            0xeac086, // Medium
            0xd8a76c, // Medium dark
            0xc68642, // Dark
            0x8d5524  // Very dark
        ];
        return skinColors[Math.floor(Math.random() * skinColors.length)];
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
            0x808080  // Gray
        ];
        return clothingColors[Math.floor(Math.random() * clothingColors.length)];
    }
} 