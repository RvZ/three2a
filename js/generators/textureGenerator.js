import * as THREE from 'three';

/**
 * Utility class for generating textures used in the game
 */
export class TextureGenerator {
    /**
     * Create a texture for roads
     * @returns {THREE.Texture} Road texture
     */
    static createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Fill with dark gray asphalt color
        context.fillStyle = '#333333';
        context.fillRect(0, 0, 512, 512);
        
        // Add some noise for texture
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const gray = 30 + Math.random() * 20; // Random gray value
            context.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
            context.fillRect(x, y, 2, 2);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5);
        
        return texture;
    }
    
    /**
     * Create a texture for sidewalks
     * @returns {THREE.Texture} Sidewalk texture
     */
    static createSidewalkTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Fill with light gray concrete color
        context.fillStyle = '#aaaaaa';
        context.fillRect(0, 0, 256, 256);
        
        // Add grid pattern for sidewalk tiles
        context.strokeStyle = '#999999';
        context.lineWidth = 2;
        
        // Horizontal lines
        for (let y = 0; y < 256; y += 64) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(256, y);
            context.stroke();
        }
        
        // Vertical lines
        for (let x = 0; x < 256; x += 64) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, 256);
            context.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }
    
    /**
     * Create a texture for building walls
     * @param {string} color - Base color for the building
     * @returns {THREE.Texture} Building wall texture
     */
    static createBuildingTexture(color = '#cccccc') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Fill with base color
        context.fillStyle = color;
        context.fillRect(0, 0, 512, 512);
        
        // Add windows
        context.fillStyle = '#87CEEB'; // Sky blue for windows
        
        // Window pattern
        const windowSize = 30;
        const windowSpacing = 20;
        const windowsPerRow = Math.floor(512 / (windowSize + windowSpacing));
        
        for (let row = 0; row < windowsPerRow; row++) {
            for (let col = 0; col < windowsPerRow; col++) {
                const x = col * (windowSize + windowSpacing) + windowSpacing;
                const y = row * (windowSize + windowSpacing) + windowSpacing;
                
                // Random window state (some windows might be darker)
                if (Math.random() > 0.2) {
                    context.fillRect(x, y, windowSize, windowSize);
                } else {
                    context.fillStyle = '#3a6a8a'; // Darker blue for some windows
                    context.fillRect(x, y, windowSize, windowSize);
                    context.fillStyle = '#87CEEB'; // Reset to normal window color
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    /**
     * Create a texture for boundary walls
     * @returns {THREE.Texture} Boundary wall texture
     */
    static createBoundaryTexture() {
        // Create a canvas texture for the wall
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Fill with dark color
        context.fillStyle = '#222222';
        context.fillRect(0, 0, 512, 512);
        
        // Add windows pattern
        for (let y = 50; y < 512; y += 30) {
            for (let x = 20; x < 512; x += 40) {
                // Random window state (lit or unlit)
                const isLit = Math.random() > 0.7;
                context.fillStyle = isLit ? '#ffcc77' : '#444444';
                context.fillRect(x, y, 15, 20);
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        return texture;
    }
    
    /**
     * Create a texture for ground
     * @returns {THREE.Texture} Ground texture
     */
    static createGroundTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext('2d');
        
        // Fill with base grass color
        context.fillStyle = '#1a3300';
        context.fillRect(0, 0, 1024, 1024);
        
        // Add grass texture
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = Math.random() * 3 + 1;
            
            // Random grass shade
            const shade = Math.floor(Math.random() * 30);
            context.fillStyle = `rgb(${20 + shade}, ${50 + shade}, ${0 + shade})`;
            context.fillRect(x, y, size, size);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        
        return texture;
    }
} 