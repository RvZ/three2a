import { DebugUtils } from '../utils/utils';

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

    // Action flags (edge-triggered: set once per physical key press)
    this.actionPressed = false;
    this.hornPressed = false;
    this.debugTogglePressed = false;

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
    const key = event.key.toLowerCase();

    // Detect the up->down transition so held keys (which auto-repeat
    // keydown events) don't fire one-shot actions on every repeat.
    const wasDown = this.keys[key] === true;
    this.keys[key] = true;

    // Update movement flags
    this.updateMovementFlags();

    // Held keys auto-repeat; only react to the initial press for one-shots
    if (wasDown) return;

    // Handle special keys
    switch (key) {
      case ' ':
        this.actionPressed = true;
        break;
      case 'h':
        this.hornPressed = true;
        break;
      case 'b':
        this.debugTogglePressed = true;
        break;
      case 'm':
        // Toggle sound (handled directly)
        if (this.game && this.game.soundManager) {
          const soundEnabled = this.game.soundManager.toggleSound();
          if (this.game.hud) {
            this.game.hud.showMessage(soundEnabled ? 'Sound unmuted 🔊' : 'Sound muted 🔇', 2000);
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

  // Reset all input states
  reset() {
    this.keys = {};
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.actionPressed = false;
    this.hornPressed = false;
    this.debugTogglePressed = false;
    this.mouseDown = false;
  }
}
