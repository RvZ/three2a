import * as THREE from 'three';

export class Building {
    constructor(width = 5, height = 10, depth = 5) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.mesh = null;
        this.type = this.determineType();
    }
    
    determineType() {
        // Determine building type based on height
        if (this.height > 20) {
            return 'skyscraper';
        } else if (this.height > 10) {
            return 'office';
        } else if (this.height > 5) {
            return 'apartment';
        } else {
            return 'house';
        }
    }
    
    init(scene, x = 0, z = 0) {
        // Create building based on type
        switch (this.type) {
            case 'skyscraper':
                this.createSkyscraper(scene, x, z);
                break;
            case 'office':
                this.createOfficeBuilding(scene, x, z);
                break;
            case 'apartment':
                this.createApartmentBuilding(scene, x, z);
                break;
            case 'house':
                this.createHouse(scene, x, z);
                break;
            default:
                this.createBasicBuilding(scene, x, z);
        }
    }
    
    createSkyscraper(scene, x, z) {
        // Create a skyscraper with a more complex shape
        const baseWidth = this.width;
        const baseDepth = this.depth;
        
        // Base of the skyscraper (wider)
        const baseGeometry = new THREE.BoxGeometry(baseWidth, Math.min(5, this.height * 0.2), baseDepth);
        const baseMaterial = this.createBuildingMaterial(0.6, 0.2, 0.4); // Darker for base
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(x, Math.min(5, this.height * 0.2) / 2, z);
        base.castShadow = true;
        base.receiveShadow = true;
        scene.add(base);
        
        // Main tower (narrower)
        const towerWidth = baseWidth * 0.8;
        const towerDepth = baseDepth * 0.8;
        const towerHeight = this.height - Math.min(5, this.height * 0.2);
        
        const towerGeometry = new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth);
        const towerMaterial = this.createBuildingMaterial(0.6, 0.1, 0.7); // Lighter for tower
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.set(x, Math.min(5, this.height * 0.2) + towerHeight / 2, z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        scene.add(tower);
        
        // Add antenna or spire to top
        if (Math.random() > 0.5) {
            const antennaGeometry = new THREE.CylinderGeometry(0, 0.2, 2, 4);
            const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.set(x, Math.min(5, this.height * 0.2) + towerHeight + 1, z);
            antenna.castShadow = true;
            scene.add(antenna);
        }
        
        this.mesh = tower; // Set main mesh for reference
    }
    
    createOfficeBuilding(scene, x, z) {
        // Create a standard office building with windows
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = this.createBuildingMaterial(0.6, 0.1, 0.6);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, this.height / 2, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        
        // Add roof structures (AC units, etc.)
        this.addRoofDetails(scene, x, z);
    }
    
    createApartmentBuilding(scene, x, z) {
        // Create an apartment building with balconies
        const mainGeometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const mainMaterial = this.createBuildingMaterial(0.1, 0.2, 0.5);
        this.mesh = new THREE.Mesh(mainGeometry, mainMaterial);
        this.mesh.position.set(x, this.height / 2, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        
        // Add balconies
        this.addBalconies(scene, x, z);
    }
    
    createHouse(scene, x, z) {
        // Create a house with a pitched roof
        // Main structure
        const baseGeometry = new THREE.BoxGeometry(this.width, this.height * 0.7, this.depth);
        const baseMaterial = this.createBuildingMaterial(0.05, 0.3, 0.5);
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(x, this.height * 0.7 / 2, z);
        base.castShadow = true;
        base.receiveShadow = true;
        scene.add(base);
        
        // Roof
        const roofHeight = this.height * 0.3;
        const roofGeometry = new THREE.ConeGeometry(
            Math.max(this.width, this.depth) * 0.7, 
            roofHeight, 
            4
        );
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(0.05, 0.5, 0.3),
            roughness: 0.8,
            metalness: 0.1
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(x, this.height * 0.7 + roofHeight / 2, z);
        roof.rotation.y = Math.PI / 4; // Rotate to align with base
        roof.castShadow = true;
        scene.add(roof);
        
        this.mesh = base; // Set main mesh for reference
    }
    
    createBasicBuilding(scene, x, z) {
        // Fallback to basic building
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = this.createBuildingMaterial();
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, this.height / 2, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
    }
    
    addRoofDetails(scene, x, z) {
        // Add AC units, water tanks, etc. to roof
        const roofY = this.height;
        
        // AC unit
        const acGeometry = new THREE.BoxGeometry(this.width * 0.3, 0.5, this.depth * 0.3);
        const acMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const ac = new THREE.Mesh(acGeometry, acMaterial);
        ac.position.set(
            x + (Math.random() - 0.5) * (this.width * 0.5),
            roofY + 0.25,
            z + (Math.random() - 0.5) * (this.depth * 0.5)
        );
        ac.castShadow = true;
        scene.add(ac);
        
        // Water tank (for some buildings)
        if (Math.random() > 0.5) {
            const tankGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
            const tankMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
            const tank = new THREE.Mesh(tankGeometry, tankMaterial);
            tank.position.set(
                x + (Math.random() - 0.5) * (this.width * 0.5),
                roofY + 0.5,
                z + (Math.random() - 0.5) * (this.depth * 0.5)
            );
            tank.castShadow = true;
            scene.add(tank);
        }
    }
    
    addBalconies(scene, x, z) {
        // Add balconies to apartment buildings
        const balconyDepth = 0.5;
        const balconyWidth = this.width * 0.3;
        const balconyHeight = 0.2;
        
        // Number of floors
        const floors = Math.floor(this.height / 2);
        
        for (let floor = 1; floor < floors; floor++) {
            // Add balconies on random sides
            const side = Math.floor(Math.random() * 4);
            
            const balconyGeometry = new THREE.BoxGeometry(
                side % 2 === 0 ? balconyWidth : balconyDepth,
                balconyHeight,
                side % 2 === 0 ? balconyDepth : balconyWidth
            );
            
            const balconyMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            const balcony = new THREE.Mesh(balconyGeometry, balconyMaterial);
            
            // Position based on side
            let balconyX = x;
            let balconyZ = z;
            
            switch (side) {
                case 0: // Front
                    balconyZ = z + this.depth / 2 + balconyDepth / 2;
                    break;
                case 1: // Right
                    balconyX = x + this.width / 2 + balconyDepth / 2;
                    break;
                case 2: // Back
                    balconyZ = z - this.depth / 2 - balconyDepth / 2;
                    break;
                case 3: // Left
                    balconyX = x - this.width / 2 - balconyDepth / 2;
                    break;
            }
            
            balcony.position.set(balconyX, floor * 2, balconyZ);
            balcony.castShadow = true;
            balcony.receiveShadow = true;
            scene.add(balcony);
        }
    }
    
    createBuildingMaterial(hueBase = 0.05, satBase = 0.2, lightBase = 0.5) {
        // Generate random building color based on provided base values
        const hue = hueBase + Math.random() * 0.1;
        const saturation = satBase + Math.random() * 0.2;
        const lightness = lightBase + Math.random() * 0.2;
        
        const color = new THREE.Color().setHSL(hue, saturation, lightness);
        
        // Create materials for each face of the building
        const materials = [];
        
        for (let i = 0; i < 6; i++) {
            // Side faces (0, 1, 2, 3) get windows, top and bottom (4, 5) don't
            if (i < 4) {
                // Create window texture
                const texture = this.createWindowTexture();
                
                materials.push(new THREE.MeshStandardMaterial({
                    color: color,
                    map: texture,
                    roughness: 0.7,
                    metalness: 0.2
                }));
            } else {
                // Top and bottom faces
                materials.push(new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.7,
                    metalness: 0.2
                }));
            }
        }
        
        return materials;
    }
    
    createWindowTexture() {
        // Create a canvas for the window texture
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, size, size);
        
        // Determine window style based on building type
        let windowSize, windowSpacing;
        
        switch (this.type) {
            case 'skyscraper':
                windowSize = 8;
                windowSpacing = 12;
                break;
            case 'office':
                windowSize = 10;
                windowSpacing = 14;
                break;
            case 'apartment':
                windowSize = 12;
                windowSpacing = 18;
                break;
            case 'house':
                windowSize = 16;
                windowSpacing = 32;
                break;
            default:
                windowSize = 10;
                windowSpacing = 16;
        }
        
        const windowRows = Math.floor(size / windowSpacing);
        const windowCols = Math.floor(size / windowSpacing);
        
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                // Random window color (some lit, some dark)
                const isLit = Math.random() > 0.6;
                
                // Different window colors based on building type
                let windowColor;
                
                if (isLit) {
                    switch (this.type) {
                        case 'skyscraper':
                            // Cool blue/white for skyscrapers
                            windowColor = `rgba(200, 220, 255, ${Math.random() * 0.3 + 0.7})`;
                            break;
                        case 'office':
                            // Fluorescent white/yellow for offices
                            windowColor = `rgba(255, 255, ${Math.floor(Math.random() * 50) + 200}, ${Math.random() * 0.3 + 0.7})`;
                            break;
                        case 'apartment':
                            // Warm yellow/orange for apartments
                            windowColor = `rgba(255, ${Math.floor(Math.random() * 50) + 200}, 150, ${Math.random() * 0.4 + 0.6})`;
                            break;
                        case 'house':
                            // Very warm yellow for houses
                            windowColor = `rgba(255, 240, 180, ${Math.random() * 0.5 + 0.5})`;
                            break;
                        default:
                            windowColor = `rgba(255, 255, ${Math.floor(Math.random() * 100) + 155}, ${Math.random() * 0.5 + 0.5})`;
                    }
                } else {
                    // Dark windows with slight variation by type
                    switch (this.type) {
                        case 'skyscraper':
                            windowColor = 'rgba(20, 30, 50, 0.9)';
                            break;
                        case 'office':
                            windowColor = 'rgba(30, 30, 40, 0.8)';
                            break;
                        default:
                            windowColor = 'rgba(40, 40, 50, 0.8)';
                    }
                }
                
                ctx.fillStyle = windowColor;
                
                // Draw window
                ctx.fillRect(
                    col * windowSpacing + (windowSpacing - windowSize) / 2,
                    row * windowSpacing + (windowSpacing - windowSize) / 2,
                    windowSize,
                    windowSize
                );
            }
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        // Adjust texture repeat based on building type
        switch (this.type) {
            case 'skyscraper':
                texture.repeat.set(this.width / 4, this.height / 15);
                break;
            case 'office':
                texture.repeat.set(this.width / 5, this.height / 10);
                break;
            case 'apartment':
                texture.repeat.set(this.width / 6, this.height / 8);
                break;
            case 'house':
                texture.repeat.set(this.width / 3, this.height / 3);
                break;
            default:
                texture.repeat.set(this.width / 5, this.height / 10);
        }
        
        return texture;
    }
} 