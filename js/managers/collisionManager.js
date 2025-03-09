import * as THREE from 'three';
import { DebugUtils } from '../utils/utils.js';

export class CollisionManager {
    constructor(game) {
        this.game = game;
        
        // Collision groups
        this.vehicles = [];
        this.pedestrians = [];
        this.buildings = [];
        this.obstacles = [];
        
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
                this.addDebugHelper(vehicle, this.vehicleCollisionRadius, 0xff0000);
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
                this.addDebugHelper(pedestrian, this.pedestrianCollisionRadius, 0x00ff00);
            }
        }
    }
    
    /**
     * Register a building with the collision system
     * @param {Object} building - The building to register
     */
    registerBuilding(building) {
        if (!this.buildings.includes(building)) {
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
        this.vehicles = this.vehicles.filter(v => v !== entity);
        this.pedestrians = this.pedestrians.filter(p => p !== entity);
        this.buildings = this.buildings.filter(b => b !== entity);
        this.obstacles = this.obstacles.filter(o => o !== entity);
        
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
        for (let i = 0; i < this.vehicles.length; i++) {
            const vehicle1 = this.vehicles[i];
            
            // Skip if vehicle has no position
            if (!vehicle1.position) continue;
            
            for (let j = i + 1; j < this.vehicles.length; j++) {
                const vehicle2 = this.vehicles[j];
                
                // Skip if vehicle has no position
                if (!vehicle2.position) continue;
                
                // Calculate distance between vehicles
                const distance = vehicle1.position.distanceTo(vehicle2.position);
                
                // Check if collision occurred
                if (distance < this.vehicleCollisionRadius * 2) {
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
                
                // Check if collision occurred
                if (distance < this.vehicleCollisionRadius + this.pedestrianCollisionRadius) {
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
            
            for (const building of this.buildings) {
                // Skip if building has no mesh
                if (!building.mesh) continue;
                
                // Check if vehicle is colliding with building
                if (this.isCollidingWithBuilding(vehicle, building)) {
                    // Handle collision
                    this.handleVehicleBuildingCollision(vehicle, building);
                }
            }
            
            // Also check obstacles
            for (const obstacle of this.obstacles) {
                // Skip if obstacle has no mesh
                if (!obstacle.mesh) continue;
                
                // Check if vehicle is colliding with obstacle
                if (this.isCollidingWithObstacle(vehicle, obstacle)) {
                    // Handle collision
                    this.handleVehicleObstacleCollision(vehicle, obstacle);
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
            
            for (const building of this.buildings) {
                // Skip if building has no mesh
                if (!building.mesh) continue;
                
                // Check if pedestrian is colliding with building
                if (this.isCollidingWithBuilding(pedestrian, building)) {
                    // Handle collision
                    this.handlePedestrianBuildingCollision(pedestrian, building);
                }
            }
            
            // Also check obstacles
            for (const obstacle of this.obstacles) {
                // Skip if obstacle has no mesh
                if (!obstacle.mesh) continue;
                
                // Check if pedestrian is colliding with obstacle
                if (this.isCollidingWithObstacle(pedestrian, obstacle)) {
                    // Handle collision
                    this.handlePedestrianObstacleCollision(pedestrian, obstacle);
                }
            }
        }
    }
    
    /**
     * Check if an entity is colliding with a building
     * @param {Object} entity - The entity to check
     * @param {Object} building - The building to check against
     * @returns {boolean} True if colliding, false otherwise
     */
    isCollidingWithBuilding(entity, building) {
        // Simple box collision check
        if (!building.mesh || !building.mesh.geometry || !building.mesh.position) {
            return false;
        }
        
        // Get building dimensions
        const buildingBox = new THREE.Box3().setFromObject(building.mesh);
        
        // Create a slightly smaller box for the entity
        const entityRadius = entity === this.game.player ? 
            this.pedestrianCollisionRadius : this.vehicleCollisionRadius;
            
        const entityBox = new THREE.Box3();
        entityBox.min.set(
            entity.position.x - entityRadius,
            entity.position.y - entityRadius,
            entity.position.z - entityRadius
        );
        entityBox.max.set(
            entity.position.x + entityRadius,
            entity.position.y + entityRadius,
            entity.position.z + entityRadius
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
        const entityRadius = entity === this.game.player ? 
            this.pedestrianCollisionRadius : this.vehicleCollisionRadius;
        
        return distance < entityRadius + obstacle.radius;
    }
    
    /**
     * Handle a collision between two vehicles
     * @param {Object} vehicle1 - The first vehicle
     * @param {Object} vehicle2 - The second vehicle
     */
    handleVehicleCollision(vehicle1, vehicle2) {
        // Calculate collision response
        const direction = new THREE.Vector3().subVectors(
            vehicle1.position,
            vehicle2.position
        ).normalize();
        
        // Move vehicles apart
        const pushDistance = this.vehicleCollisionRadius * 2 - 
            vehicle1.position.distanceTo(vehicle2.position);
        
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
            
            // Play crash sound if game exists
            if (this.game && this.game.soundManager) {
                this.game.soundManager.playCrash();
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
        const direction = new THREE.Vector3().subVectors(
            pedestrian.position,
            vehicle.position
        ).normalize();
        
        // Push pedestrian away from vehicle
        const pushDistance = 1.0;
        pedestrian.position.add(direction.clone().multiplyScalar(pushDistance));
        
        // Update mesh position
        if (pedestrian.mesh) pedestrian.mesh.position.copy(pedestrian.position);
        
        // Apply damage to pedestrian
        if (isPlayer) {
            // Player takes damage based on vehicle speed
            const damage = Math.abs(vehicle.speed) * 5;
            pedestrian.takeDamage(damage, this.game);
        } else if (pedestrian.takeDamage) {
            // NPC pedestrian takes damage
            pedestrian.takeDamage(100); // Instant kill for NPCs
        }
        
        // Play crash sound if game exists
        if (this.game && this.game.soundManager) {
            this.game.soundManager.playCrash();
        }
    }
    
    /**
     * Handle a collision between a vehicle and a building
     * @param {Object} vehicle - The vehicle
     * @param {Object} building - The building
     */
    handleVehicleBuildingCollision(vehicle, building) {
        // Move vehicle back to previous position
        if (vehicle.previousPosition) {
            vehicle.position.copy(vehicle.previousPosition);
            
            // Update mesh position
            if (vehicle.mesh) vehicle.mesh.position.copy(vehicle.position);
        }
        
        // Stop the vehicle
        if (vehicle.speed !== undefined) {
            vehicle.speed = 0;
        }
        
        // Play crash sound if game exists
        if (this.game && this.game.soundManager) {
            this.game.soundManager.playCrash();
        }
    }
    
    /**
     * Handle a collision between a vehicle and an obstacle
     * @param {Object} vehicle - The vehicle
     * @param {Object} obstacle - The obstacle
     */
    handleVehicleObstacleCollision(vehicle, obstacle) {
        // Similar to building collision
        this.handleVehicleBuildingCollision(vehicle, obstacle);
    }
    
    /**
     * Handle a collision between a pedestrian and a building
     * @param {Object} pedestrian - The pedestrian
     * @param {Object} building - The building
     */
    handlePedestrianBuildingCollision(pedestrian, building) {
        // Move pedestrian back to previous position
        if (pedestrian.previousPosition) {
            pedestrian.position.copy(pedestrian.previousPosition);
            
            // Update mesh position
            if (pedestrian.mesh) pedestrian.mesh.position.copy(pedestrian.position);
        }
    }
    
    /**
     * Handle a collision between a pedestrian and an obstacle
     * @param {Object} pedestrian - The pedestrian
     * @param {Object} obstacle - The obstacle
     */
    handlePedestrianObstacleCollision(pedestrian, obstacle) {
        // Similar to building collision
        this.handlePedestrianBuildingCollision(pedestrian, obstacle);
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
            opacity: 0.5
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
        const helper = this.debugHelpers.find(h => h.userData.entity === entity);
        
        if (helper) {
            // Remove from scene
            this.game.scene.remove(helper);
            
            // Remove from debug helpers
            this.debugHelpers = this.debugHelpers.filter(h => h !== helper);
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
                this.addDebugHelper(vehicle, this.vehicleCollisionRadius, 0xff0000);
            }
            
            for (const pedestrian of this.pedestrians) {
                this.addDebugHelper(pedestrian, this.pedestrianCollisionRadius, 0x00ff00);
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