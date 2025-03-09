import { DebugUtils } from '../utils/utils.js';

export class InputManager {
    constructor(game) {
        this.game = game;
        
        // Key states
        this.keys = {};
        
        // Movement flags
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // Action flags
        this.actionPressed = false;
        this.hornPressed = false;
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        
        // Initialize event listeners
        this.setupEventListeners();
        
        DebugUtils.log('Input Manager initialized', 'log');
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
        
        // Mouse events
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        document.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        document.addEventListener('mouseup', (event) => this.handleMouseUp(event));
        
        // Prevent context menu on right-click
        document.addEventListener('contextmenu', (event) => event.preventDefault());
    }
    
    handleKeyDown(event) {
        // Store key state
        this.keys[event.key.toLowerCase()] = true;
        
        // Update movement flags
        this.updateMovementFlags();
        
        // Handle special keys
        switch (event.key.toLowerCase()) {
            case ' ':
                this.actionPressed = true;
                break;
            case 'h':
                this.hornPressed = true;
                break;
            case 'm':
                // Toggle mute (handled directly)
                if (this.game && this.game.soundManager) {
                    const isMuted = this.game.soundManager.toggleMute();
                    if (this.game.hud) {
                        this.game.hud.showMessage(isMuted ? 'Sound muted 🔇' : 'Sound unmuted 🔊', 2000);
                    }
                }
                break;
            // Add more special keys as needed
        }
    }
    
    handleKeyUp(event) {
        // Store key state
        this.keys[event.key.toLowerCase()] = false;
        
        // Update movement flags
        this.updateMovementFlags();
        
        // Handle special keys
        switch (event.key.toLowerCase()) {
            case ' ':
                this.actionPressed = false;
                break;
            case 'h':
                this.hornPressed = false;
                break;
            // Add more special keys as needed
        }
    }
    
    updateMovementFlags() {
        // Update movement flags based on key states
        this.moveForward = this.isKeyPressed('w') || this.isKeyPressed('arrowup');
        this.moveBackward = this.isKeyPressed('s') || this.isKeyPressed('arrowdown');
        this.moveLeft = this.isKeyPressed('a') || this.isKeyPressed('arrowleft');
        this.moveRight = this.isKeyPressed('d') || this.isKeyPressed('arrowright');
    }
    
    handleMouseMove(event) {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }
    
    handleMouseDown(event) {
        this.mouseDown = true;
    }
    
    handleMouseUp(event) {
        this.mouseDown = false;
    }
    
    isKeyPressed(key) {
        return this.keys[key.toLowerCase()] === true;
    }
    
    // Get movement direction as a normalized vector
    getMovementDirection() {
        const direction = { x: 0, z: 0 };
        
        if (this.moveForward) direction.z -= 1;
        if (this.moveBackward) direction.z += 1;
        if (this.moveLeft) direction.x -= 1;
        if (this.moveRight) direction.x += 1;
        
        // Normalize if moving diagonally
        const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        if (length > 0) {
            direction.x /= length;
            direction.z /= length;
        }
        
        return direction;
    }
    
    // Check if any movement key is pressed
    isMoving() {
        return this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    }
    
    // Reset all input states
    reset() {
        this.keys = {};
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.actionPressed = false;
        this.hornPressed = false;
        this.mouseDown = false;
    }
} 