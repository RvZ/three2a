/**
 * Mobile Control Manager using nipple.js for virtual joystick controls
 */

export class MobileControlManager {
  constructor(game) {
    this.game = game;
    this.nippleManager = null;
    this.leftJoystick = null;
    this.rightJoystick = null;
    this.actionButton = null;

    // Movement state
    this.moveVector = { x: 0, y: 0 };
    this.isMoving = false;

    // Action state
    this.isActionPressed = false;

    // Device detection
    this.isMobile = this.detectMobile();

    // Only initialize on mobile devices
    if (this.isMobile) {
      this.loadNippleJS()
        .then(() => {
          this.init();
        })
        .catch((error) => {
          console.error('Failed to load nipple.js:', error);
        });
    }
  }

  /**
   * Detect if the device is mobile
   * @returns {boolean} True if the device is mobile
   */
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  /**
   * Load nipple.js dynamically
   * @returns {Promise} Promise that resolves when nipple.js is loaded
   */
  loadNippleJS() {
    return new Promise((resolve, reject) => {
      // Check if nipple.js is already loaded
      if (window.nipplejs) {
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/nipplejs/0.10.1/nipplejs.min.js';
      script.async = true;

      // Set up event handlers
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load nipple.js'));

      // Add script to document
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize mobile controls
   */
  init() {
    // Create container for controls
    this.createControlContainer();

    // Create joysticks
    this.createJoysticks();

    // Create action button
    this.createActionButton();

    console.log('Mobile controls initialized');
  }

  /**
   * Create container for mobile controls
   */
  createControlContainer() {
    // Create container for controls
    this.controlContainer = document.createElement('div');
    this.controlContainer.style.position = 'absolute';
    this.controlContainer.style.bottom = '0';
    this.controlContainer.style.left = '0';
    this.controlContainer.style.width = '100%';
    this.controlContainer.style.height = '30%';
    this.controlContainer.style.zIndex = '1000';
    this.controlContainer.style.pointerEvents = 'none'; // Allow click-through by default

    // Create left zone for movement joystick
    this.leftZone = document.createElement('div');
    this.leftZone.style.position = 'absolute';
    this.leftZone.style.bottom = '10px';
    this.leftZone.style.left = '10px';
    this.leftZone.style.width = '120px';
    this.leftZone.style.height = '120px';
    this.leftZone.style.pointerEvents = 'auto'; // Enable pointer events for this zone

    // Create right zone for action button
    this.rightZone = document.createElement('div');
    this.rightZone.style.position = 'absolute';
    this.rightZone.style.bottom = '10px';
    this.rightZone.style.right = '10px';
    this.rightZone.style.width = '120px';
    this.rightZone.style.height = '120px';
    this.rightZone.style.pointerEvents = 'auto'; // Enable pointer events for this zone

    // Add zones to container
    this.controlContainer.appendChild(this.leftZone);
    this.controlContainer.appendChild(this.rightZone);

    // Add container to document
    document.body.appendChild(this.controlContainer);
  }

  /**
   * Create virtual joysticks
   */
  createJoysticks() {
    // Create left joystick for movement
    this.leftJoystick = nipplejs.create({
      zone: this.leftZone,
      mode: 'static',
      position: { left: '60px', bottom: '60px' },
      color: 'rgba(255, 255, 255, 0.5)',
      size: 100,
    });

    // Set up event handlers for left joystick
    this.leftJoystick.on('move', (event, data) => {
      // Calculate normalized vector (0-1)
      const distance = Math.min(data.distance / 50, 1); // Max distance is 50px
      const angle = data.angle.radian;

      // Calculate x and y components
      this.moveVector.x = Math.cos(angle) * distance;
      this.moveVector.y = Math.sin(angle) * distance;

      // Update movement flags in input manager
      if (this.game && this.game.inputManager) {
        // Forward/backward based on y component (inverted)
        this.game.inputManager.moveForward = this.moveVector.y < -0.3;
        this.game.inputManager.moveBackward = this.moveVector.y > 0.3;

        // Left/right based on x component
        this.game.inputManager.moveLeft = this.moveVector.x < -0.3;
        this.game.inputManager.moveRight = this.moveVector.x > 0.3;
      }

      this.isMoving = true;
    });

    // Reset movement when joystick is released
    this.leftJoystick.on('end', () => {
      this.moveVector.x = 0;
      this.moveVector.y = 0;

      // Reset movement flags in input manager
      if (this.game && this.game.inputManager) {
        this.game.inputManager.moveForward = false;
        this.game.inputManager.moveBackward = false;
        this.game.inputManager.moveLeft = false;
        this.game.inputManager.moveRight = false;
      }

      this.isMoving = false;
    });
  }

  /**
   * Create action button
   */
  createActionButton() {
    // Create action button
    this.actionButton = document.createElement('div');
    this.actionButton.style.position = 'absolute';
    this.actionButton.style.bottom = '40px';
    this.actionButton.style.right = '40px';
    this.actionButton.style.width = '80px';
    this.actionButton.style.height = '80px';
    this.actionButton.style.borderRadius = '50%';
    this.actionButton.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    this.actionButton.style.display = 'flex';
    this.actionButton.style.justifyContent = 'center';
    this.actionButton.style.alignItems = 'center';
    this.actionButton.style.color = 'white';
    this.actionButton.style.fontSize = '16px';
    this.actionButton.style.fontWeight = 'bold';
    this.actionButton.style.userSelect = 'none';
    this.actionButton.style.pointerEvents = 'auto';
    this.actionButton.textContent = 'ACTION';

    // Add action button to right zone
    this.rightZone.appendChild(this.actionButton);

    // Set up event handlers for action button
    this.actionButton.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this.isActionPressed = true;

      // Trigger action in input manager
      if (this.game && this.game.inputManager) {
        this.game.inputManager.actionPressed = true;
      }

      // Visual feedback
      this.actionButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    });

    this.actionButton.addEventListener('touchend', (event) => {
      event.preventDefault();
      this.isActionPressed = false;

      // Reset visual feedback
      this.actionButton.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    });
  }

  /**
   * Add a horn button
   */
  addHornButton() {
    // Create horn button
    this.hornButton = document.createElement('div');
    this.hornButton.style.position = 'absolute';
    this.hornButton.style.bottom = '130px';
    this.hornButton.style.right = '40px';
    this.hornButton.style.width = '60px';
    this.hornButton.style.height = '60px';
    this.hornButton.style.borderRadius = '50%';
    this.hornButton.style.backgroundColor = 'rgba(0, 0, 255, 0.5)';
    this.hornButton.style.display = 'flex';
    this.hornButton.style.justifyContent = 'center';
    this.hornButton.style.alignItems = 'center';
    this.hornButton.style.color = 'white';
    this.hornButton.style.fontSize = '14px';
    this.hornButton.style.fontWeight = 'bold';
    this.hornButton.style.userSelect = 'none';
    this.hornButton.style.pointerEvents = 'auto';
    this.hornButton.textContent = 'HORN';

    // Add horn button to right zone
    this.rightZone.appendChild(this.hornButton);

    // Set up event handlers for horn button
    this.hornButton.addEventListener('touchstart', (event) => {
      event.preventDefault();

      // Trigger horn in input manager
      if (this.game && this.game.inputManager) {
        this.game.inputManager.hornPressed = true;
      }

      // Visual feedback
      this.hornButton.style.backgroundColor = 'rgba(0, 0, 255, 0.8)';
    });

    this.hornButton.addEventListener('touchend', (event) => {
      event.preventDefault();

      // Reset horn in input manager
      if (this.game && this.game.inputManager) {
        this.game.inputManager.hornPressed = false;
      }

      // Reset visual feedback
      this.hornButton.style.backgroundColor = 'rgba(0, 0, 255, 0.5)';
    });
  }

  /**
   * Show mobile controls
   */
  show() {
    if (this.controlContainer) {
      this.controlContainer.style.display = 'block';
    }
  }

  /**
   * Hide mobile controls
   */
  hide() {
    if (this.controlContainer) {
      this.controlContainer.style.display = 'none';
    }
  }

  /**
   * Update mobile controls
   */
  update() {
    // Add horn button if player is in vehicle
    if (this.game && this.game.player && this.game.player.isInVehicle) {
      if (!this.hornButton) {
        this.addHornButton();
      }
    } else {
      // Remove horn button if player is not in vehicle
      if (this.hornButton && this.hornButton.parentNode) {
        this.hornButton.parentNode.removeChild(this.hornButton);
        this.hornButton = null;
      }
    }
  }

  /**
   * Clean up mobile controls
   */
  cleanup() {
    // Remove joysticks
    if (this.leftJoystick) {
      this.leftJoystick.destroy();
    }

    // Remove control container
    if (this.controlContainer && this.controlContainer.parentNode) {
      this.controlContainer.parentNode.removeChild(this.controlContainer);
    }
  }
}
