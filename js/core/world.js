import * as THREE from 'three';
import { Building } from '../entities/building.js';
import { Vehicle } from '../entities/vehicle.js';
import { Person } from '../entities/person.js';
import { CityGenerator } from '../generators/cityGenerator.js';
import { TextureGenerator } from '../generators/textureGenerator.js';

export class World {
    constructor() {
        this.gridSize = 100;
        this.gridDivisions = 20;
        this.buildings = [];
        this.roads = [];
        this.sidewalks = [];
        this.pedestrians = [];
        
        // City parameters
        this.citySize = 5; // Number of blocks in each direction
        this.blockSize = 20; // Size of a city block
        this.roadWidth = 6; // Width of roads
        this.sidewalkWidth = 1.5; // Width of sidewalks
        this.totalBlockSize = null; // Will be calculated in createCity
        
        // City generator
        this.cityGenerator = new CityGenerator(this);
    }
    
    init(scene, game = null) {
        // Store game reference globally for building registration
        if (game) {
            window.game = game;
        }
        
        // Create ground
        this.createGround(scene);
        
        // Create grid (hidden by default, useful for debugging)
        this.createGrid(scene);
        
        // Create city with roads, sidewalks and buildings
        this.createCity(scene);
    }
    
    createGround(scene) {
        const groundGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
        const groundTexture = TextureGenerator.createGroundTexture();
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: groundTexture,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
    }
    
    createGrid(scene) {
        const gridHelper = new THREE.GridHelper(this.gridSize, this.gridDivisions, 0xffffff, 0x888888);
        gridHelper.position.y = 0.01; // Slightly above ground to avoid z-fighting
        scene.add(gridHelper);
    }
    
    createCity(scene) {
        // Calculate total block size (block + road)
        const totalBlockSize = this.blockSize + this.roadWidth;
        this.totalBlockSize = totalBlockSize;
        
        // Use the city generator to create the city
        this.cityGenerator.createCity(scene, this.totalBlockSize, this.roadWidth, this.sidewalkWidth, this.citySize);
        
        // Get references to created elements
        this.roads = this.cityGenerator.roads;
        this.sidewalks = this.cityGenerator.sidewalks;
        this.buildings = this.cityGenerator.buildings;
        this.pedestrians = this.cityGenerator.pedestrians;
    }
    
    update(delta) {
        // Update all pedestrians
        for (const pedestrian of this.pedestrians) {
            pedestrian.update(delta);
        }
    }
    
    /**
     * Get a random sidewalk position for spawning
     * @returns {Object} Position object with x and z coordinates
     */
    getRandomSidewalkPosition() {
        // If sidewalks array is empty, return a default position
        if (this.sidewalks.length === 0) {
            return { x: 0, z: 0 };
        }
        
        // Get a random sidewalk
        const randomSidewalk = this.sidewalks[Math.floor(Math.random() * this.sidewalks.length)];
        
        // If the sidewalk doesn't have a position, return a default position
        if (!randomSidewalk || !randomSidewalk.position) {
            return { x: 0, z: 0 };
        }
        
        // Get the position of the sidewalk
        const position = {
            x: randomSidewalk.position.x,
            z: randomSidewalk.position.z
        };
        
        // Add a small random offset to avoid spawning exactly at the edge
        const offsetX = (Math.random() - 0.5) * (this.sidewalkWidth * 0.8);
        const offsetZ = (Math.random() - 0.5) * (this.sidewalkWidth * 0.8);
        
        position.x += offsetX;
        position.z += offsetZ;
        
        return position;
    }
    
    /**
     * Get a specific sidewalk position near coordinates
     * @param {number} x - X coordinate to find sidewalk near
     * @param {number} z - Z coordinate to find sidewalk near
     * @returns {Object} Position object with x and z coordinates
     */
    getNearestSidewalkPosition(x, z) {
        // If sidewalks array is empty, return the input position
        if (this.sidewalks.length === 0) {
            return { x, z };
        }
        
        // Find the nearest sidewalk
        let nearestSidewalk = null;
        let nearestDistance = Infinity;
        
        for (const sidewalk of this.sidewalks) {
            if (!sidewalk || !sidewalk.position) continue;
            
            const distance = Math.sqrt(
                Math.pow(sidewalk.position.x - x, 2) + 
                Math.pow(sidewalk.position.z - z, 2)
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestSidewalk = sidewalk;
            }
        }
        
        // If no sidewalk found, return the input position
        if (!nearestSidewalk || !nearestSidewalk.position) {
            return { x, z };
        }
        
        // Get the position of the nearest sidewalk
        return {
            x: nearestSidewalk.position.x,
            z: nearestSidewalk.position.z
        };
    }
    
    /**
     * Check if a position is on a sidewalk
     * @param {number} x - X coordinate to check
     * @param {number} z - Z coordinate to check
     * @returns {boolean} True if the position is on a sidewalk
     */
    isOnSidewalk(x, z) {
        // Calculate total block size if not already calculated
        if (!this.totalBlockSize) {
            this.totalBlockSize = this.blockSize + this.roadWidth;
        }
        
        // Get block coordinates
        const blockX = Math.floor((x + this.citySize * this.totalBlockSize / 2) / this.totalBlockSize);
        const blockZ = Math.floor((z + this.citySize * this.totalBlockSize / 2) / this.totalBlockSize);
        
        // Check if within city bounds
        if (blockX < 0 || blockX >= this.citySize || blockZ < 0 || blockZ >= this.citySize) {
            return false;
        }
        
        // Calculate position within block
        const localX = x - (blockX * this.totalBlockSize - this.citySize * this.totalBlockSize / 2 + this.roadWidth / 2);
        const localZ = z - (blockZ * this.totalBlockSize - this.citySize * this.totalBlockSize / 2 + this.roadWidth / 2);
        
        // Check if on horizontal sidewalk
        const onHorizontalSidewalk = 
            (localZ > -this.roadWidth/2 - this.sidewalkWidth && localZ < -this.roadWidth/2) ||
            (localZ > this.blockSize - this.roadWidth/2 && localZ < this.blockSize - this.roadWidth/2 + this.sidewalkWidth);
            
        // Check if on vertical sidewalk
        const onVerticalSidewalk = 
            (localX > -this.roadWidth/2 - this.sidewalkWidth && localX < -this.roadWidth/2) ||
            (localX > this.blockSize - this.roadWidth/2 && localX < this.blockSize - this.roadWidth/2 + this.sidewalkWidth);
            
        return onHorizontalSidewalk || onVerticalSidewalk;
    }
} 