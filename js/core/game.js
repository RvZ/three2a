import * as THREE from 'three';
import { World } from './world.js';
import { Player } from '../entities/player.js';
import { Vehicle } from '../entities/vehicle.js';
import { HUD } from '../ui/hud.js';
import { SoundManager } from '../managers/soundManager.js';
import { InputManager } from '../managers/inputManager.js';
import { CollisionManager } from '../managers/collisionManager.js';
import { MobileControlManager } from '../managers/mobileControlManager.js';

export class Game {
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
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Create camera - using orthographic camera for true top-down view
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 30; // Controls how much of the world is visible
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Setup zoom controls
    this.setupZoomControls();

    // Start the game
    this.isGameRunning = true;

    // Debug: Log player and vehicle positions
    console.log('Player position:', this.player.position);
    console.log(
      'On sidewalk:',
      this.world.isOnSidewalk(this.player.position.x, this.player.position.z),
    );
    console.log('Player vehicles:', this.vehicles.length);
    for (let i = 0; i < this.vehicles.length; i++) {
      console.log(`Vehicle ${i} (${this.vehicles[i].type}) position:`, this.vehicles[i].position);
    }
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

      console.log(`Created ${vehicleTypes[i]} at position:`, pos);
    }

    console.log(`Added ${this.vehicles.length} vehicles for the player`);
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;

    // Adjust shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;

    // Increase shadow camera size to cover more area
    const shadowSize = 100;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;

    this.scene.add(directionalLight);
  }

  setupZoomControls() {
    // Add mouse wheel zoom functionality
    window.addEventListener('wheel', (event) => {
      if (!this.isGameRunning) return;

      // Adjust zoom level based on wheel direction
      const zoomSpeed = 0.1;
      const zoomDelta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;

      // Update camera zoom
      this.cameraZoom = Math.max(0.5, Math.min(2.0, this.cameraZoom + zoomDelta));

      // Apply zoom to orthographic camera
      const aspect = window.innerWidth / window.innerHeight;
      const viewSize = 30 / this.cameraZoom;
      this.camera.left = -viewSize * aspect;
      this.camera.right = viewSize * aspect;
      this.camera.top = viewSize;
      this.camera.bottom = -viewSize;
      this.camera.updateProjectionMatrix();
    });
  }

  onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 30 / this.cameraZoom;

    // Update orthographic camera aspect ratio
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update() {
    if (!this.isGameRunning) return;

    const delta = this.clock.getDelta();

    // Update player movement flags from input manager
    this.player.moveForward = this.inputManager.moveForward;
    this.player.moveBackward = this.inputManager.moveBackward;
    this.player.moveLeft = this.inputManager.moveLeft;
    this.player.moveRight = this.inputManager.moveRight;

    // Check for action button (space) press
    if (this.inputManager.actionPressed) {
      // Reset the flag immediately to prevent multiple toggles
      this.inputManager.actionPressed = false;

      // Store previous vehicle state to check if it changed
      const wasInVehicle = this.player.isInVehicle;
      const previousVehicle = this.player.currentVehicle;

      // Toggle vehicle
      this.player.toggleVehicle(this.vehicles);

      // Update HUD and play sounds based on vehicle state change
      if (!wasInVehicle && this.player.isInVehicle) {
        // Player entered a vehicle
        this.hud.showVehicleMessage(this.player.currentVehicle.type);
        this.soundManager.playVehicleStart();

        // Start engine sound
        this.engineSound = this.soundManager.playEngineSound(800);

        // Update collision system - remove player from pedestrians
        this.collisionManager.unregisterEntity(this.player);
      } else if (wasInVehicle && !this.player.isInVehicle) {
        // Player exited a vehicle
        this.hud.showExitVehicleMessage();

        // Stop engine sound
        if (this.engineSound) {
          this.engineSound.stop();
          this.engineSound = null;
        }

        // Update collision system - add player back to pedestrians
        this.collisionManager.registerPedestrian(this.player);
      }
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
