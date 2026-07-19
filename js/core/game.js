import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { World } from './world.js';
import { Rng } from '../utils/rng';
import { setRng, DebugUtils } from '../utils/utils';
import { EventBus } from './eventBus';
import { DayNightCycle } from './dayNightCycle';
import { ParticleSystem } from '../effects/particles';
import { ProjectileManager } from '../effects/projectiles';
import { Minimap } from '../ui/minimap';
import { Player } from '../entities/player.js';
import { Vehicle } from '../entities/vehicle.js';
import { HUD } from '../ui/hud.js';
import { SoundManager } from '../managers/soundManager.js';
import { InputManager } from '../managers/inputManager.js';
import { CollisionManager } from '../managers/collisionManager.js';
import { MobileControlManager } from '../managers/mobileControlManager.js';
import { TrafficManager } from '../managers/trafficManager';
import { PoliceManager } from '../managers/policeManager';

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

    // Exhaust-puff timer (emits behind a moving vehicle).
    this.exhaustTimer = 0;
    // Damage-smoke timer (emits from badly damaged / wrecked vehicles).
    this.smokeTimer = 0;

    // Camera screen-shake amount (decays each frame).
    this.shakeAmount = 0;

    // Last night level applied to vehicle lights (-1 = not yet applied).
    this._appliedNight = -1;

    // Paused state (freezes simulation; rendering continues).
    this.paused = false;

    // Game-over state (freezes sim; waits for a restart).
    this.gameOver = false;

    // Start-menu gate: the sim is frozen until the player dismisses the menu
    // (which also satisfies the browser's audio user-gesture requirement).
    this.awaitingStart = true;

    // Seconds until the wanted level ticks down (reset on each new crime).
    this.wantedCooldown = 0;
    // Fire-rate limiter (seconds).
    this.fireCooldown = 0;

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

    // Post-processing: a bloom pass makes bright emissive surfaces (night
    // windows, headlights, crash sparks, the sun) glow. A high threshold keeps
    // ordinary daytime surfaces out of the bloom, and OutputPass applies tone
    // mapping + sRGB after the (linear/HDR) bloom so colours aren't
    // double-mapped.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8, // strength
      0.4, // radius
      1.0, // luminance threshold (only HDR-bright emissive blooms)
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(window.innerWidth, window.innerHeight);

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

    // Populate the streets with AI traffic.
    this.traffic = new TrafficManager(this);
    this.traffic.init(10);

    // Police respond to the player's wanted level.
    this.police = new PoliceManager(this);

    // Initialize HUD
    this.hud = new HUD(this);
    this.hud.init();

    // Show the start menu; the sim stays frozen until the player begins.
    this.hud.showStartMenu();

    // Minimap overlay (bottom-right).
    this.minimap = new Minimap(160);

    // Particle effects (vehicle exhaust, crash sparks).
    this.particles = new ParticleSystem();
    this.scene.add(this.particles.points);

    // Player weapon projectiles. Hits route back here so scoring, wanted level
    // and damage stay centralised.
    this.projectiles = new ProjectileManager(this);
    this.projectiles.onBulletHitPedestrian = (ped) => {
      this.collisionManager.killPedestrian(ped);
      this.hud.addScore(25);
      this.raiseWanted();
    };
    this.projectiles.onBulletHitVehicle = (vehicle) => {
      this.collisionManager.damageVehicle(vehicle, 34);
      this.raiseWanted();
    };
    this.fireCooldown = 0;

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

    // A crash: play the sound, shake the camera, and throw sparks at the impact.
    this.events.on('crash', ({ x, z, intensity }) => {
      this.soundManager.playCrash();
      this.shakeCamera(0.3 + intensity * 0.6);
      if (this.particles) this.particles.emitSparks(x, 0.5, z, intensity);
    });

    // A vehicle was wrecked: big spark burst + heavy shake, and if it was the
    // player's car, eject and injure them.
    this.events.on('vehicleWrecked', ({ x, z, wasPlayer }) => {
      this.soundManager.playCrash();
      this.shakeCamera(1.0);
      if (this.particles) this.particles.emitSparks(x, 0.6, z, 1.3);

      if (wasPlayer) {
        if (this.player.isInVehicle) {
          this.player.exitVehicle();
          this.collisionManager.registerPedestrian(this.player);
          this.events.emit('exitVehicle', {});
        }
        this.player.takeDamage(25, this);
        this.hud.showMessage('Your vehicle was wrecked! 💥', 2500);
      }
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
    if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
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
    if (this.minimap) {
      this.minimap.dispose();
      this.minimap = null;
    }
    if (this.particles) {
      this.particles.dispose();
      this.particles = null;
    }
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    if (this.projectiles) {
      this.projectiles.dispose();
      this.projectiles = null;
    }
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

  /** Pause or resume the simulation. Rendering keeps running so the last frame
   * stays visible under the pause overlay. */
  setPaused(paused) {
    this.paused = paused;
    if (this.hud) this.hud.setPaused(paused);
    // Silence the engine while paused.
    if (paused && this.engineSound) {
      this.engineSound.stop();
      this.engineSound = null;
    } else if (!paused && this.player && this.player.isInVehicle && this.soundManager) {
      this.engineSound = this.soundManager.playEngineSound(800);
    }
  }

  /**
   * Fire the player's weapon from the player (or their vehicle) forward.
   * Firing in the street is itself a minor crime.
   */
  fireWeapon() {
    if (!this.projectiles || this.player.isDead) return;

    let origin;
    let dir;
    if (this.player.isInVehicle && this.player.currentVehicle) {
      const v = this.player.currentVehicle;
      dir = v.direction.clone();
      origin = v.position.clone().add(dir.clone().multiplyScalar(2.6));
    } else {
      dir = this.player.direction.clone();
      origin = this.player.position.clone().add(dir.clone().multiplyScalar(0.8));
    }
    this.projectiles.fire(origin, dir);
    this.soundManager.playCrash(0.3); // stand-in gunshot pop
  }

  /** Commit a crime: bump the wanted level and reset its decay timer. */
  raiseWanted() {
    if (!this.hud) return;
    this.hud.increaseWantedLevel();
    this.wantedCooldown = 12; // seconds of heat before it starts cooling
  }

  /** End the game: freeze the sim, silence the engine, show the overlay. */
  triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    if (this.engineSound) {
      this.engineSound.stop();
      this.engineSound = null;
    }
    if (this.hud) this.hud.showGameOver(this.hud.score);
    this.events.emit('playerDied', {});
  }

  /**
   * Restart the game. A full in-place teardown/rebuild of the scene, DOM and
   * managers is error-prone, so we reload the page for a guaranteed-clean
   * state. `?seed=` in the URL is preserved by the reload.
   */
  restart() {
    window.location.reload();
  }

  /** Dismiss the start menu and begin play (also unlocks audio). */
  startGame() {
    if (!this.awaitingStart) return;
    this.awaitingStart = false;
    this.inputManager.firePressed = false; // don't fire from the dismissing click
    this.hud.hideStartMenu();
    this.soundManager.resumeAudioContext();
    this.hud.showMessage('Go! 🚗', 1800);
  }

  update() {
    if (!this.isGameRunning) return;

    // Waiting on the start menu: freeze the sim until the player begins.
    if (this.awaitingStart) {
      if (this.inputManager.startPressed) {
        this.inputManager.startPressed = false;
        this.startGame();
      }
      this.clock.getDelta(); // drain so the first real frame has a small delta
      return;
    }

    // Game over: freeze the sim and wait for a restart.
    if (this.gameOver) {
      if (this.inputManager.restartPressed) {
        this.inputManager.restartPressed = false;
        this.restart();
        return;
      }
      this.clock.getDelta(); // drain so delta doesn't pile up
      return;
    }

    // Edge-triggered pause toggle (P / Escape).
    if (this.inputManager.pauseTogglePressed) {
      this.inputManager.pauseTogglePressed = false;
      this.setPaused(!this.paused);
    }
    // While paused, freeze the sim but keep consuming delta so it doesn't pile
    // up. render() still runs from the main loop.
    if (this.paused) {
      this.clock.getDelta();
      return;
    }

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

    // Fire weapon (F / click). Rate-limited so a held key/mouse doesn't spray
    // the whole pool in one frame.
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    if (this.inputManager.firePressed) {
      this.inputManager.firePressed = false;
      if (this.fireCooldown === 0) {
        this.fireWeapon();
        this.fireCooldown = 0.18;
      }
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

    // Drive AI traffic along the road grid.
    if (this.traffic) {
      this.traffic.update(delta);
    }

    // Advance bullets and cool down the wanted level.
    if (this.projectiles) {
      this.projectiles.update(delta);
    }
    if (this.hud && this.hud.wantedLevel > 0) {
      this.wantedCooldown -= delta;
      if (this.wantedCooldown <= 0) {
        this.hud.decreaseWantedLevel();
        this.wantedCooldown = 7; // one star at a time
      }
    }

    // Police chase / bust logic responds to the wanted level.
    if (this.police) {
      this.police.update(delta);
    }

    // Advance the day/night cycle (sun, sky, fog, ambient) and light up
    // building windows as it gets dark.
    if (this.dayNight) {
      this.dayNight.update(delta);
      // Fade windows in as the sun drops: full glow once daylight is gone.
      const nightLevel = Math.max(0, Math.min(1, (0.35 - this.dayNight.daylight) / 0.35));
      this.world.applyNightLevel(nightLevel);

      // Brighten every vehicle's head/tail lights at night (only when the level
      // meaningfully changes, to avoid touching every material each frame).
      if (Math.abs(nightLevel - this._appliedNight) >= 0.01) {
        this._appliedNight = nightLevel;
        for (const vehicle of this.collisionManager.vehicles) {
          if (vehicle.setNightLevel) vehicle.setNightLevel(nightLevel);
        }
      }
    }

    // Emit exhaust behind the player's vehicle while it's moving, then advance
    // all particles.
    if (this.particles) {
      if (this.player.isInVehicle && this.player.currentVehicle) {
        const v = this.player.currentVehicle;
        if (Math.abs(v.speed) > 2) {
          this.exhaustTimer += delta;
          if (this.exhaustTimer >= 0.05) {
            this.exhaustTimer = 0;
            const dir = v.direction; // forward
            // Tailpipe sits behind the car; puff drifts further back.
            const px = v.position.x - dir.x * 2.2;
            const pz = v.position.z - dir.z * 2.2;
            this.particles.emitExhaust(px, 0.4, pz, -dir.x * 1.2, -dir.z * 1.2);
          }
        }
      }
      // Damaged and wrecked vehicles trail smoke.
      this.smokeTimer += delta;
      if (this.smokeTimer >= 0.12) {
        this.smokeTimer = 0;
        for (const v of this.collisionManager.vehicles) {
          if (v.isWrecked || v.health < v.maxHealth * 0.4) {
            this.particles.emitExhaust(v.position.x, 0.8, v.position.z, 0, 0);
          }
        }
      }

      this.particles.update(delta);
    }

    // Update collision system
    this.collisionManager.update();
    this.collisionManager.updateDebugHelpers();

    // Update camera to follow player
    this.updateCamera(delta);

    // Refresh the minimap.
    if (this.minimap) {
      this.minimap.render(this);
    }
  }

  /** Kick off a brief camera shake (e.g. on a crash). */
  shakeCamera(intensity = 0.6) {
    this.shakeAmount = Math.min(2, (this.shakeAmount || 0) + intensity);
  }

  updateCamera(delta = 0) {
    // Get player position
    const playerPosition = this.player.getPosition();

    // Decaying screen shake offsets the camera on the XZ plane.
    let ox = 0;
    let oz = 0;
    if (this.shakeAmount > 0.001) {
      ox = (Math.random() - 0.5) * this.shakeAmount;
      oz = (Math.random() - 0.5) * this.shakeAmount;
      // Exponential-ish decay, framerate independent.
      this.shakeAmount *= Math.max(0, 1 - delta * 5);
    } else {
      this.shakeAmount = 0;
    }

    this.camera.position.x = playerPosition.x + ox;
    this.camera.position.z = playerPosition.z + oz;

    // Keep the camera looking at the player.
    this.camera.lookAt(playerPosition);
  }

  render() {
    // Bloom-enabled path; falls back to a direct render if the composer is gone.
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
