import * as THREE from 'three';
import { World } from './world.js';
import { Rng } from '../utils/rng';
import { setRng, DebugUtils } from '../utils/utils';
import { EventBus } from './eventBus';
import { DayNightCycle } from './dayNightCycle';
import { Player } from '../entities/player.js';
import { Vehicle } from '../entities/vehicle.js';
import { HUD } from '../ui/hud.js';
import { SoundManager } from '../managers/soundManager.js';
import { InputManager } from '../managers/inputManager.js';
import { CollisionManager } from '../managers/collisionManager.js';
import { MobileControlManager } from '../managers/mobileControlManager.js';

export class Game {
  /** How much of the world the orthographic camera shows at zoom 1. */
  static BASE_VIEW_SIZE = 30;

  /** Largest simulation step (seconds) applied in a single frame. */
  static MAX_DELTA = 0.1;

  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.world = null;
    this.player = null;
    this.clock = new THREE.Clock();
    this.isGameRunning = false;

    // Camera settings for top-down view
    this.cameraHeight = 40;
    this.cameraZoom = 1.0;

    // Game entities
    this.vehicles = [];

    // Game managers
    this.hud = null;
    this.soundManager = new SoundManager();
    this.inputManager = null;
    this.collisionManager = null;
    this.mobileControls = null;

    // Engine sound reference
    this.engineSound = null;

    // Footstep timer
    this.footstepTimer = 0;
    this.footstepInterval = 0.3; // Time between footsteps in seconds

    // Event bus decouples systems (collision -> HUD/sound) without back-refs.
    this.events = new EventBus();

    // Bound event listeners kept so they can be removed in dispose().
    this._onResize = () => this.onWindowResize();
    this._onWheel = (event) => this.onWheel(event);

    // Seed for procedural generation. `?seed=<value>` in the URL makes a city
    // reproducible/shareable; otherwise a random seed is chosen.
    const params = new URLSearchParams(window.location.search);
    this.seed = params.get('seed') || String(Math.floor(Math.random() * 1e9));
  }

  init() {
    // Make all procedural generation deterministic from the seed.
    setRng(new Rng(this.seed));
    DebugUtils.log(`World seed: ${this.seed}`);

    // Wire event-driven HUD/audio reactions before anything can emit.
    this.registerEventHandlers();

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Create camera - using orthographic camera for true top-down view
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = Game.BASE_VIEW_SIZE; // Controls how much of the world is visible
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      1,
      1000,
    );

    // Looking straight down makes the default up-vector (0,1,0) parallel to
    // the view direction (a degenerate case for lookAt). Point "up" toward
    // world -Z so the orientation is well-defined and stable.
    this.camera.up.set(0, 0, -1);

    // Position camera directly above looking down
    this.camera.position.set(0, this.cameraHeight, 0);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Cap the device pixel ratio at 2: renders crisply on HiDPI / mobile
    // without paying for 3x+ pixels on high-density phones.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Filmic tone mapping + sRGB output gives richer, less washed-out lighting.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    document.body.appendChild(this.renderer.domElement);

    // Initialize sound manager first
    this.soundManager.init();

    // Initialize input manager
    this.inputManager = new InputManager(this);

    // Initialize mobile controls
    this.mobileControls = new MobileControlManager(this);

    // Initialize collision manager
    this.collisionManager = new CollisionManager(this);

    // Add lighting
    this.setupLighting();

    // Initialize world
    this.world = new World();
    this.world.init(this.scene, this);

    // Get a sidewalk position for player spawn
    const spawnPosition = this.world.getRandomSidewalkPosition();

    // Initialize player on sidewalk
    this.player = new Player();
    this.player.init(this.scene, spawnPosition.x, spawnPosition.z, this);

    // Register player with collision system
    this.collisionManager.registerPedestrian(this.player);

    // Add player vehicles on roads
    this.addPlayerVehicles();

    // Initialize HUD
    this.hud = new HUD(this);
    this.hud.init();

    // Handle window resize and mouse-wheel zoom (bound refs so dispose() can
    // detach them).
    window.addEventListener('resize', this._onResize);
    window.addEventListener('wheel', this._onWheel, { passive: true });

    // Start the game
    this.isGameRunning = true;

    DebugUtils.log(
      `Spawned player on sidewalk=${this.world.isOnSidewalk(
        this.player.position.x,
        this.player.position.z,
      )} with ${this.vehicles.length} vehicles`,
    );
  }

  /**
   * Subscribe HUD and audio reactions to gameplay events. Systems emit on the
   * bus instead of calling the HUD / sound manager directly.
   */
  registerEventHandlers() {
    this.events.on('enterVehicle', ({ vehicleType }) => {
      this.hud.showVehicleMessage(vehicleType);
      this.soundManager.playVehicleStart();
      this.engineSound = this.soundManager.playEngineSound(800);
    });

    this.events.on('exitVehicle', () => {
      this.hud.showExitVehicleMessage();
      if (this.engineSound) {
        this.engineSound.stop();
        this.engineSound = null;
      }
    });

    this.events.on('entityKilled', ({ points }) => {
      if (points) this.hud.addScore(points);
    });
  }

  addPlayerVehicles() {
    // Add different types of vehicles on roads near the player
    const vehicleTypes = ['sedan', 'sports', 'truck', 'van'];

    // Get player position (or use default if not available yet)
    const playerPos = this.player ? this.player.position : new THREE.Vector3(0, 0, 0);

    // Place vehicles along the road nearest the player so they spawn on
    // asphalt, spaced apart, rather than at fixed offsets that could overlap
    // each other or sit inside buildings.
    const roadPositions = this.world.getRoadSpawnPositions(
      playerPos.x,
      playerPos.z,
      vehicleTypes.length,
    );

    // Clear existing vehicles
    this.vehicles = [];

    for (let i = 0; i < vehicleTypes.length; i++) {
      const vehicle = new Vehicle(vehicleTypes[i]);

      // Get road position
      const pos = roadPositions[i];

      // Initialize vehicle
      vehicle.init(this.scene, pos.x, 0, pos.z);

      // Add to vehicles array
      this.vehicles.push(vehicle);

      // Register vehicle with collision system
      this.collisionManager.registerVehicle(vehicle);
    }

    DebugUtils.log(`Added ${this.vehicles.length} player vehicles`);
  }

  setupLighting() {
    // Hemisphere light: soft sky/ground fill that reads well under filmic tone
    // mapping (replaces the flat single AmbientLight).
    const hemiLight = new THREE.HemisphereLight(0xbfd8ff, 0x554433, 0.65);
    hemiLight.position.set(0, 100, 0);
    this.scene.add(hemiLight);
    this.hemiLight = hemiLight;

    // Directional light (sun) — position/colour/intensity are driven by the
    // day/night cycle.
    const directionalLight = new THREE.DirectionalLight(0xfff2e0, 1.15);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;

    // Shadow quality.
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.bias = -0.0004;

    // Cover the whole visible area.
    const shadowSize = 100;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;

    this.scene.add(directionalLight);
    this.sunLight = directionalLight;

    // Animate sky/sun/ambient/fog over a day/night cycle.
    this.dayNight = new DayNightCycle({
      scene: this.scene,
      sun: directionalLight,
      ambient: hemiLight,
      worldRadius: 120,
      dayLength: 120,
    });
  }

  onWheel(event) {
    if (!this.isGameRunning) return;
    const zoomSpeed = 0.1;
    const zoomDelta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;
    this.cameraZoom = Math.max(0.5, Math.min(2.0, this.cameraZoom + zoomDelta));
    this.updateCameraProjection();
  }

  onWindowResize() {
    this.updateCameraProjection();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Recompute the orthographic frustum from the current aspect ratio and zoom.
   * Single source of truth for both resize and wheel-zoom.
   */
  updateCameraProjection() {
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = Game.BASE_VIEW_SIZE / this.cameraZoom;
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();
  }

  /** Tear down listeners and event handlers (for restart / hot-reload). */
  dispose() {
    this.isGameRunning = false;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('wheel', this._onWheel);
    this.events.clear();
    if (this.engineSound) {
      this.engineSound.stop();
      this.engineSound = null;
    }
  }

  /**
   * Enter or exit the nearest vehicle and update collision registration. HUD
   * and audio reactions are handled by the event handlers, keeping this method
   * focused on state transitions.
   */
  toggleVehicle() {
    const wasInVehicle = this.player.isInVehicle;
    this.player.toggleVehicle(this.vehicles);

    if (!wasInVehicle && this.player.isInVehicle) {
      this.collisionManager.unregisterEntity(this.player);
      this.events.emit('enterVehicle', { vehicleType: this.player.currentVehicle.type });
    } else if (wasInVehicle && !this.player.isInVehicle) {
      this.collisionManager.registerPedestrian(this.player);
      this.events.emit('exitVehicle', {});
    }
  }

  update() {
    if (!this.isGameRunning) return;

    // Clamp delta so a background-tab stall (getDelta can return several
    // seconds) can't teleport entities through walls on the next frame.
    const delta = Math.min(this.clock.getDelta(), Game.MAX_DELTA);

    // Update player movement flags from input manager
    this.player.moveForward = this.inputManager.moveForward;
    this.player.moveBackward = this.inputManager.moveBackward;
    this.player.moveLeft = this.inputManager.moveLeft;
    this.player.moveRight = this.inputManager.moveRight;

    // Check for action button (space) press
    if (this.inputManager.actionPressed) {
      // Reset the flag immediately to prevent multiple toggles
      this.inputManager.actionPressed = false;
      this.toggleVehicle();
    }

    // Check for horn button press
    if (this.inputManager.hornPressed && this.player.isInVehicle) {
      this.soundManager.playHorn();
      // Don't reset the flag here to allow continuous honking
    }

    // Check for debug mode toggle (edge-triggered in the input manager)
    if (this.inputManager.debugTogglePressed) {
      this.inputManager.debugTogglePressed = false;
      const debugEnabled = this.collisionManager.toggleDebugMode();
      this.world.setGridVisible(debugEnabled);
      this.hud.showMessage(`Collision Debug Mode: ${debugEnabled ? 'ON' : 'OFF'}`, 2000);
    }

    // Update player
    this.player.update(delta);

    // Update mobile controls
    if (this.mobileControls) {
      this.mobileControls.update();
    }

    // Check if player is moving and play footstep sounds
    const isMoving = this.player.moveForward || this.player.moveBackward;
    if (!this.player.isInVehicle && isMoving) {
      // Update footstep timer
      this.footstepTimer += delta;

      // Play footstep sound at regular intervals
      if (this.footstepTimer >= this.footstepInterval) {
        this.soundManager.playFootstep();
        this.footstepTimer = 0;
      }
    } else {
      // Reset footstep timer when not moving
      this.footstepTimer = 0;
    }

    // Update engine sound if in vehicle
    if (this.player.isInVehicle && this.engineSound) {
      // Calculate RPM based on speed
      const vehicle = this.player.currentVehicle;
      const speedFactor = Math.abs(vehicle.speed) / vehicle.maxSpeed;
      const rpm = 800 + speedFactor * 1200; // RPM range: 800-2000

      // Update engine sound
      this.engineSound.updateRPM(rpm);
    }

    // Update world (pedestrians, etc.)
    this.world.update(delta);

    // Advance the day/night cycle (sun, sky, fog, ambient).
    if (this.dayNight) {
      this.dayNight.update(delta);
    }

    // Update collision system
    this.collisionManager.update();
    this.collisionManager.updateDebugHelpers();

    // Update camera to follow player
    this.updateCamera();
  }

  updateCamera() {
    // Get player position
    const playerPosition = this.player.getPosition();

    // Set camera position directly above player
    this.camera.position.x = playerPosition.x;
    this.camera.position.z = playerPosition.z;

    // Keep the camera looking at the player
    this.camera.lookAt(playerPosition);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
