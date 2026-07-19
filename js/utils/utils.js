/**
 * Utility functions for the game
 */

// Math utilities
export const MathUtils = {
    /**
     * Clamp a value between min and max
     * @param {number} value - The value to clamp
     * @param {number} min - The minimum value
     * @param {number} max - The maximum value
     * @returns {number} The clamped value
     */
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    
    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} The interpolated value
     */
    lerp: (a, b, t) => a + (b - a) * t,
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    degToRad: (degrees) => degrees * Math.PI / 180,
    
    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    radToDeg: (radians) => radians * 180 / Math.PI,
    
    /**
     * Get a random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number between min and max
     */
    random: (min, max) => Math.random() * (max - min) + min,
    
    /**
     * Get a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer between min and max
     */
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
};

// Color utilities
export const ColorUtils = {
    /**
     * Get a random color
     * @returns {number} Random color as a hex number
     */
    randomColor: () => Math.random() * 0xffffff,
    
    /**
     * Darken a color by a percentage
     * @param {number} color - Color as a hex number
     * @param {number} percent - Percentage to darken (0-1)
     * @returns {number} Darkened color
     */
    darken: (color, percent) => {
        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;
        
        const factor = 1 - percent;
        
        const newR = Math.floor(r * factor);
        const newG = Math.floor(g * factor);
        const newB = Math.floor(b * factor);
        
        return (newR << 16) | (newG << 8) | newB;
    },
    
    /**
     * Lighten a color by a percentage
     * @param {number} color - Color as a hex number
     * @param {number} percent - Percentage to lighten (0-1)
     * @returns {number} Lightened color
     */
    lighten: (color, percent) => {
        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;
        
        const factor = percent;
        
        const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
        const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
        const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
        
        return (newR << 16) | (newG << 8) | newB;
    }
};

// Time utilities
export const TimeUtils = {
    /**
     * Format milliseconds as a time string (mm:ss)
     * @param {number} ms - Time in milliseconds
     * @returns {string} Formatted time string
     */
    formatTime: (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },
    
    /**
     * Delay execution for a specified time
     * @param {number} ms - Time to delay in milliseconds
     * @returns {Promise} Promise that resolves after the delay
     */
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// DOM utilities
export const DOMUtils = {
    /**
     * Create a DOM element with attributes
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string} [text] - Text content
     * @returns {HTMLElement} The created element
     */
    createElement: (tag, attributes = {}, text = '') => {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.entries(value).forEach(([styleKey, styleValue]) => {
                    element.style[styleKey] = styleValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Set text content
        if (text) {
            element.textContent = text;
        }
        
        return element;
    }
};

// Three.js object utilities
export const ObjectUtils = {
    /**
     * Recursively dispose of an Object3D's geometries, materials and textures
     * and detach it from its parent. Prevents GPU memory leaks when entities
     * are removed from the scene.
     * @param {THREE.Object3D} object - The object to dispose
     */
    dispose: (object) => {
        if (!object) return;

        object.traverse((child) => {
            if (child.geometry && typeof child.geometry.dispose === 'function') {
                child.geometry.dispose();
            }

            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                for (const material of materials) {
                    // Dispose any texture maps referenced by the material
                    for (const key in material) {
                        const value = material[key];
                        if (value && value.isTexture && typeof value.dispose === 'function') {
                            value.dispose();
                        }
                    }
                    if (typeof material.dispose === 'function') {
                        material.dispose();
                    }
                }
            }
        });

        if (object.parent) {
            object.parent.remove(object);
        }
    }
};

// Debug utilities
export const DebugUtils = {
    /**
     * Log a message with a timestamp
     * @param {string} message - Message to log
     * @param {string} [level='log'] - Log level (log, warn, error)
     */
    log: (message, level = 'log') => {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${message}`;
        
        switch (level) {
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'error':
                console.error(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }
}; 