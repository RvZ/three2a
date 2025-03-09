import * as THREE from 'three';
import { Building } from '../entities/building.js';
import { Vehicle } from '../entities/vehicle.js';
import { Person } from '../entities/person.js';
import { TextureGenerator } from './textureGenerator.js';

export class CityGenerator {
    constructor(world) {
        this.world = world;
        this.buildings = [];
        this.roads = [];
        this.sidewalks = [];
        this.pedestrians = [];
    }
    
    /**
     * Create a complete city with roads, buildings, and other elements
     */
    createCity(scene, totalBlockSize, roadWidth, sidewalkWidth, citySize) {
        // Create road network
        this.createRoadNetwork(scene, totalBlockSize, roadWidth, sidewalkWidth, citySize);
        
        // Add road markings
        this.addRoadMarkings(scene, totalBlockSize, roadWidth, citySize);
        
        // Create buildings in each block
        for (let x = 0; x < citySize; x++) {
            for (let z = 0; z < citySize; z++) {
                // Calculate block center position
                const blockX = x * totalBlockSize - (citySize * totalBlockSize) / 2 + totalBlockSize / 2;
                const blockZ = z * totalBlockSize - (citySize * totalBlockSize) / 2 + totalBlockSize / 2;
                
                // Calculate buildable area size (block size minus sidewalks)
                const buildableSize = this.world.blockSize - sidewalkWidth * 2;
                
                // Create buildings in this block
                this.createBuildingsInBlock(scene, blockX, blockZ, buildableSize);
            }
        }
        
        // Create boundary walls
        this.createBoundaryWalls(scene, totalBlockSize, citySize, roadWidth);
        
        // Add parked cars
        this.addParkedCars(scene, totalBlockSize, roadWidth, sidewalkWidth, citySize);
        
        // Add pedestrians
        this.addPedestrians(scene, totalBlockSize, roadWidth, sidewalkWidth, citySize);
    }
    
    /**
     * Create the road network with roads and sidewalks
     */
    createRoadNetwork(scene, totalBlockSize, roadWidth, sidewalkWidth, citySize) {
        // Create road and sidewalk textures using the TextureGenerator
        const roadTexture = TextureGenerator.createRoadTexture();
        const sidewalkTexture = TextureGenerator.createSidewalkTexture();
        
        // Road material
        const roadMaterial = new THREE.MeshStandardMaterial({
            map: roadTexture,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Sidewalk material
        const sidewalkMaterial = new THREE.MeshStandardMaterial({
            map: sidewalkTexture,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create horizontal roads (along X axis)
        for (let z = 0; z < citySize + 1; z++) {
            const roadZ = (z * totalBlockSize) - (citySize * totalBlockSize / 2);
            
            // Main road
            const roadGeometry = new THREE.PlaneGeometry(citySize * totalBlockSize + roadWidth, roadWidth);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.02, roadZ); // Slightly above ground
            road.receiveShadow = true;
            scene.add(road);
            this.roads.push(road);
            
            // Sidewalks on both sides of the road
            if (z < citySize) { // No sidewalk at the very edge of the city
                // North sidewalk
                const northSidewalkGeometry = new THREE.PlaneGeometry(citySize * totalBlockSize + roadWidth, sidewalkWidth);
                const northSidewalk = new THREE.Mesh(northSidewalkGeometry, sidewalkMaterial);
                northSidewalk.rotation.x = -Math.PI / 2;
                northSidewalk.position.set(0, 0.05, roadZ - (roadWidth / 2) - (sidewalkWidth / 2)); // Slightly above road
                northSidewalk.receiveShadow = true;
                scene.add(northSidewalk);
                this.sidewalks.push(northSidewalk);
            }
            
            if (z > 0) { // No sidewalk at the very edge of the city
                // South sidewalk
                const southSidewalkGeometry = new THREE.PlaneGeometry(citySize * totalBlockSize + roadWidth, sidewalkWidth);
                const southSidewalk = new THREE.Mesh(southSidewalkGeometry, sidewalkMaterial);
                southSidewalk.rotation.x = -Math.PI / 2;
                southSidewalk.position.set(0, 0.05, roadZ + (roadWidth / 2) + (sidewalkWidth / 2)); // Slightly above road
                southSidewalk.receiveShadow = true;
                scene.add(southSidewalk);
                this.sidewalks.push(southSidewalk);
            }
        }
        
        // Create vertical roads (along Z axis)
        for (let x = 0; x < citySize + 1; x++) {
            const roadX = (x * totalBlockSize) - (citySize * totalBlockSize / 2);
            
            // Main road
            const roadGeometry = new THREE.PlaneGeometry(roadWidth, citySize * totalBlockSize + roadWidth);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(roadX, 0.02, 0); // Slightly above ground
            road.receiveShadow = true;
            scene.add(road);
            this.roads.push(road);
            
            // Sidewalks on both sides of the road
            if (x < citySize) { // No sidewalk at the very edge of the city
                // East sidewalk
                const eastSidewalkGeometry = new THREE.PlaneGeometry(sidewalkWidth, citySize * totalBlockSize + roadWidth);
                const eastSidewalk = new THREE.Mesh(eastSidewalkGeometry, sidewalkMaterial);
                eastSidewalk.rotation.x = -Math.PI / 2;
                eastSidewalk.position.set(roadX - (roadWidth / 2) - (sidewalkWidth / 2), 0.05, 0); // Slightly above road
                eastSidewalk.receiveShadow = true;
                scene.add(eastSidewalk);
                this.sidewalks.push(eastSidewalk);
            }
            
            if (x > 0) { // No sidewalk at the very edge of the city
                // West sidewalk
                const westSidewalkGeometry = new THREE.PlaneGeometry(sidewalkWidth, citySize * totalBlockSize + roadWidth);
                const westSidewalk = new THREE.Mesh(westSidewalkGeometry, sidewalkMaterial);
                westSidewalk.rotation.x = -Math.PI / 2;
                westSidewalk.position.set(roadX + (roadWidth / 2) + (sidewalkWidth / 2), 0.05, 0); // Slightly above road
                westSidewalk.receiveShadow = true;
                scene.add(westSidewalk);
                this.sidewalks.push(westSidewalk);
            }
        }
    }
    
    /**
     * Add road markings to the roads
     */
    addRoadMarkings(scene, totalBlockSize, roadWidth, citySize) {
        // Create white line material
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // Add center lines to horizontal roads
        for (let z = 0; z < citySize + 1; z++) {
            const roadZ = (z * totalBlockSize) - (citySize * totalBlockSize / 2);
            
            // Dashed center line
            for (let x = -citySize * totalBlockSize / 2; x < citySize * totalBlockSize / 2; x += 3) {
                const lineGeometry = new THREE.PlaneGeometry(1.5, 0.2);
                const line = new THREE.Mesh(lineGeometry, lineMaterial);
                line.rotation.x = -Math.PI / 2;
                line.position.set(x, 0.03, roadZ); // Slightly above road
                scene.add(line);
            }
        }
        
        // Add center lines to vertical roads
        for (let x = 0; x < citySize + 1; x++) {
            const roadX = (x * totalBlockSize) - (citySize * totalBlockSize / 2);
            
            // Dashed center line
            for (let z = -citySize * totalBlockSize / 2; z < citySize * totalBlockSize / 2; z += 3) {
                const lineGeometry = new THREE.PlaneGeometry(0.2, 1.5);
                const line = new THREE.Mesh(lineGeometry, lineMaterial);
                line.rotation.x = -Math.PI / 2;
                line.position.set(roadX, 0.03, z); // Slightly above road
                scene.add(line);
            }
        }
    }
    
    /**
     * Create buildings in a city block
     */
    createBuildingsInBlock(scene, blockX, blockZ, buildableSize) {
        // Determine number of buildings in this block (1-4)
        const buildingCount = Math.floor(Math.random() * 4) + 1;
        
        // Divide the block into sections
        const sections = [];
        
        if (buildingCount === 1) {
            // One large building taking up the whole block
            sections.push({
                x: blockX,
                z: blockZ,
                width: buildableSize,
                depth: buildableSize
            });
        } else if (buildingCount === 2) {
            // Two buildings side by side
            const splitDirection = Math.random() > 0.5 ? 'horizontal' : 'vertical';
            
            if (splitDirection === 'horizontal') {
                sections.push({
                    x: blockX - buildableSize / 4,
                    z: blockZ,
                    width: buildableSize / 2,
                    depth: buildableSize
                });
                sections.push({
                    x: blockX + buildableSize / 4,
                    z: blockZ,
                    width: buildableSize / 2,
                    depth: buildableSize
                });
            } else {
                sections.push({
                    x: blockX,
                    z: blockZ - buildableSize / 4,
                    width: buildableSize,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX,
                    z: blockZ + buildableSize / 4,
                    width: buildableSize,
                    depth: buildableSize / 2
                });
            }
        } else if (buildingCount === 4) {
            // Four buildings in a grid
            sections.push({
                x: blockX - buildableSize / 4,
                z: blockZ - buildableSize / 4,
                width: buildableSize / 2,
                depth: buildableSize / 2
            });
            sections.push({
                x: blockX + buildableSize / 4,
                z: blockZ - buildableSize / 4,
                width: buildableSize / 2,
                depth: buildableSize / 2
            });
            sections.push({
                x: blockX - buildableSize / 4,
                z: blockZ + buildableSize / 4,
                width: buildableSize / 2,
                depth: buildableSize / 2
            });
            sections.push({
                x: blockX + buildableSize / 4,
                z: blockZ + buildableSize / 4,
                width: buildableSize / 2,
                depth: buildableSize / 2
            });
        } else {
            // Three buildings in an L shape
            const orientation = Math.floor(Math.random() * 4);
            
            if (orientation === 0) {
                // L shape in top-left
                sections.push({
                    x: blockX - buildableSize / 4,
                    z: blockZ - buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX - buildableSize / 4,
                    z: blockZ + buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX + buildableSize / 4,
                    z: blockZ - buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
            } else if (orientation === 1) {
                // L shape in top-right
                sections.push({
                    x: blockX + buildableSize / 4,
                    z: blockZ - buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX + buildableSize / 4,
                    z: blockZ + buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX - buildableSize / 4,
                    z: blockZ - buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
            } else if (orientation === 2) {
                // L shape in bottom-left
                sections.push({
                    x: blockX - buildableSize / 4,
                    z: blockZ + buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX - buildableSize / 4,
                    z: blockZ - buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX + buildableSize / 4,
                    z: blockZ + buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
            } else {
                // L shape in bottom-right
                sections.push({
                    x: blockX + buildableSize / 4,
                    z: blockZ + buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX + buildableSize / 4,
                    z: blockZ - buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
                sections.push({
                    x: blockX - buildableSize / 4,
                    z: blockZ + buildableSize / 4,
                    width: buildableSize / 2,
                    depth: buildableSize / 2
                });
            }
        }
        
        // Create buildings in each section
        for (const section of sections) {
            // Random building height (3-8 stories)
            const height = Math.floor(Math.random() * 6) + 3;
            
            // Create building
            const building = new Building(section.width, height, section.depth);
            building.init(scene, section.x, section.z);
            
            // Add to buildings array
            this.buildings.push(building);
            
            // Register with collision system if available
            if (window.game && window.game.collisionManager) {
                window.game.collisionManager.registerBuilding(building);
            }
        }
    }
    
    /**
     * Create boundary walls around the city
     */
    createBoundaryWalls(scene, totalBlockSize, citySize, roadWidth) {
        // Calculate the outer boundary of the city
        const cityHalfSize = (citySize * totalBlockSize) / 2 + roadWidth / 2;
        const wallHeight = 30; // Tall walls to prevent seeing beyond
        const wallThickness = 5;
        const wallSegmentLength = 20;
        
        // Create a wall material using the TextureGenerator
        const wallTexture = TextureGenerator.createBoundaryTexture();
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: wallTexture,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create walls on all four sides - properly positioned at the edges
        // North wall (positive Z)
        this.createBoundaryWallSide(scene, 0, 0, cityHalfSize, cityHalfSize * 2, wallHeight, wallThickness, 'x', wallMaterial, wallSegmentLength);
        
        // South wall (negative Z)
        this.createBoundaryWallSide(scene, 0, 0, -cityHalfSize, cityHalfSize * 2, wallHeight, wallThickness, 'x', wallMaterial, wallSegmentLength);
        
        // East wall (positive X)
        this.createBoundaryWallSide(scene, cityHalfSize, 0, 0, cityHalfSize * 2, wallHeight, wallThickness, 'z', wallMaterial, wallSegmentLength);
        
        // West wall (negative X)
        this.createBoundaryWallSide(scene, -cityHalfSize, 0, 0, cityHalfSize * 2, wallHeight, wallThickness, 'z', wallMaterial, wallSegmentLength);
    }
    
    /**
     * Create a boundary wall on one side of the city
     */
    createBoundaryWallSide(scene, x, y, z, length, height, thickness, direction, material, segmentLength) {
        // Calculate number of segments
        const segments = Math.ceil(length / segmentLength);
        const actualSegmentLength = length / segments;
        
        // Create wall segments
        for (let i = 0; i < segments; i++) {
            // Calculate segment position
            let segX = x;
            let segZ = z;
            
            if (direction === 'x') {
                segX = x - length / 2 + actualSegmentLength / 2 + i * actualSegmentLength;
            } else {
                segZ = z - length / 2 + actualSegmentLength / 2 + i * actualSegmentLength;
            }
            
            // Create wall geometry
            const wallGeometry = direction === 'x' 
                ? new THREE.BoxGeometry(actualSegmentLength, height, thickness)
                : new THREE.BoxGeometry(thickness, height, actualSegmentLength);
            
            // Create wall mesh
            const wall = new THREE.Mesh(wallGeometry, material);
            wall.position.set(segX, y + height / 2, segZ);
            wall.castShadow = true;
            wall.receiveShadow = true;
            scene.add(wall);
        }
    }
    
    /**
     * Add parked cars along the roads
     */
    addParkedCars(scene, totalBlockSize, roadWidth, sidewalkWidth, citySize) {
        // Number of parked cars to add
        const carCount = citySize * 4;
        
        for (let i = 0; i < carCount; i++) {
            // Choose a random car type
            const carTypes = ['sedan', 'sports', 'truck', 'van'];
            const carType = carTypes[Math.floor(Math.random() * carTypes.length)];
            
            // Create vehicle
            const vehicle = new Vehicle(carType);
            
            // Get a random position along a sidewalk
            const position = this.getRandomParkingPosition(totalBlockSize, roadWidth, sidewalkWidth, citySize);
            
            // Initialize vehicle
            vehicle.init(scene, position.x, 0, position.z);
            
            // Rotate to face the road
            vehicle.mesh.rotation.y = position.rotation;
            
            // Register with collision system if available
            if (window.game && window.game.collisionManager) {
                window.game.collisionManager.registerVehicle(vehicle);
            }
        }
    }
    
    /**
     * Get a random position for parking a car
     */
    getRandomParkingPosition(totalBlockSize, roadWidth, sidewalkWidth, citySize) {
        // Decide if car should be parked along a horizontal or vertical road
        const isHorizontal = Math.random() > 0.5;
        
        let x, z, rotation;
        
        if (isHorizontal) {
            // Park along horizontal road
            // Choose a random street
            const streetIndex = Math.floor(Math.random() * (citySize + 1));
            z = (streetIndex * totalBlockSize) - (citySize * totalBlockSize / 2);
            
            // Offset to parking spot (north or south of the road)
            const isSouth = Math.random() > 0.5;
            z += (isSouth ? 1 : -1) * (roadWidth / 2 + sidewalkWidth / 2);
            
            // Random position along road
            x = (Math.random() * 2 - 1) * (citySize * totalBlockSize / 2);
            
            // Rotate to face the road
            rotation = isSouth ? Math.PI : 0;
        } else {
            // Park along vertical road
            // Choose a random street
            const streetIndex = Math.floor(Math.random() * (citySize + 1));
            x = (streetIndex * totalBlockSize) - (citySize * totalBlockSize / 2);
            
            // Offset to parking spot (east or west of the road)
            const isWest = Math.random() > 0.5;
            x += (isWest ? 1 : -1) * (roadWidth / 2 + sidewalkWidth / 2);
            
            // Random position along road
            z = (Math.random() * 2 - 1) * (citySize * totalBlockSize / 2);
            
            // Rotate to face the road
            rotation = isWest ? Math.PI * 1.5 : Math.PI * 0.5;
        }
        
        return { x, z, rotation };
    }
    
    /**
     * Add pedestrians to the city
     */
    addPedestrians(scene, totalBlockSize, roadWidth, sidewalkWidth, citySize) {
        // Number of pedestrians to add
        const pedestrianCount = citySize * 3;
        
        for (let i = 0; i < pedestrianCount; i++) {
            // Create person
            const person = new Person();
            
            // Get a random position on a sidewalk
            const position = this.getRandomSidewalkPosition(totalBlockSize, roadWidth, sidewalkWidth, citySize);
            
            // Initialize person
            person.init(scene, position.x, position.z);
            
            // Add to pedestrians array
            this.pedestrians.push(person);
            
            // Register with collision system if available
            if (window.game && window.game.collisionManager) {
                window.game.collisionManager.registerPedestrian(person);
            }
        }
    }
    
    /**
     * Get a random position on a sidewalk
     */
    getRandomSidewalkPosition(totalBlockSize, roadWidth, sidewalkWidth, citySize) {
        // Decide if pedestrian should be on a horizontal or vertical sidewalk
        const isHorizontal = Math.random() > 0.5;
        
        let x, z;
        
        if (isHorizontal) {
            // Place on horizontal sidewalk (along X axis)
            // Choose a random street
            const streetIndex = Math.floor(Math.random() * (citySize + 1));
            z = (streetIndex * totalBlockSize) - (citySize * totalBlockSize / 2);
            
            // Offset to sidewalk (north or south of the road)
            z += (Math.random() > 0.5 ? 1 : -1) * (roadWidth / 2 + sidewalkWidth / 2);
            
            // Random position along sidewalk
            x = (Math.random() * 2 - 1) * (citySize * totalBlockSize / 2);
        } else {
            // Place on vertical sidewalk (along Z axis)
            // Choose a random street
            const streetIndex = Math.floor(Math.random() * (citySize + 1));
            x = (streetIndex * totalBlockSize) - (citySize * totalBlockSize / 2);
            
            // Offset to sidewalk (east or west of the road)
            x += (Math.random() > 0.5 ? 1 : -1) * (roadWidth / 2 + sidewalkWidth / 2);
            
            // Random position along sidewalk
            z = (Math.random() * 2 - 1) * (citySize * totalBlockSize / 2);
        }
        
        return { x, z };
    }
} 