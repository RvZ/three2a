import * as THREE from 'three';
import { Person } from '../entities/person.js';

/**
 * Spawns police that hunt the player while they have a wanted level. Cop count
 * scales with the wanted stars; they steer toward the player each frame (reusing
 * Person's own move-to-target logic at a higher speed) and "bust" the player —
 * dealing damage — on contact. When the heat cools to zero, the cops leave.
 *
 * Cops are ordinary pedestrians to the collision system, so the player can run
 * them over or shoot them (which, GTA-style, just makes things worse).
 */
const MAX_COPS = 8;
const CHASE_SPEED = 5;
const SPAWN_DIST = 26;
const BUST_RANGE = 1.7;
const BUST_INTERVAL = 0.5;
const BUST_DAMAGE = 7;

interface PoliceGame {
  scene: object;
  hud?: { wantedLevel: number };
  player: {
    position: { x: number; z: number };
    isDead?: boolean;
    takeDamage: (amount: number, game?: unknown) => void;
  };
  collisionManager: {
    registerPedestrian: (p: Person) => void;
    unregisterEntity: (e: Person) => void;
  };
}

export class PoliceManager {
  private readonly game: PoliceGame;
  private cops: Person[] = [];
  private bustAccum = 0;

  constructor(game: PoliceGame) {
    this.game = game;
  }

  private spawnCop(): void {
    const p = this.game.player.position;
    const angle = Math.random() * Math.PI * 2;
    const x = p.x + Math.cos(angle) * SPAWN_DIST;
    const z = p.z + Math.sin(angle) * SPAWN_DIST;

    const cop = new Person({
      shirtColor: 0x1b3fb0,
      pantsColor: 0x0a1633,
      hairColor: 0x111111,
      shoesColor: 0x000000,
    });
    cop.init(this.game.scene, x, z);
    cop.walkingSpeed = CHASE_SPEED;
    cop.isWalking = true;

    this.game.collisionManager.registerPedestrian(cop);
    this.cops.push(cop);
  }

  private despawn(cop: Person): void {
    this.game.collisionManager.unregisterEntity(cop);
    cop.dispose();
  }

  update(delta: number): void {
    const wanted = this.game.hud ? this.game.hud.wantedLevel : 0;

    // Drop cops that were killed (run over / shot).
    this.cops = this.cops.filter((c) => !c.isDead);

    // Target head-count scales with the wanted level; adjust one per frame.
    const desired = wanted === 0 ? 0 : Math.min(MAX_COPS, wanted * 2);
    if (this.cops.length < desired) {
      this.spawnCop();
    } else if (this.cops.length > desired) {
      const cop = this.cops.pop();
      if (cop) this.despawn(cop);
    }

    const player = this.game.player;
    let busting = false;

    for (const cop of this.cops) {
      const cp = cop.position;
      if (!cp) continue;

      // Chase: retarget the player every frame and let Person walk toward it.
      cop.targetPosition = new THREE.Vector3(player.position.x, 0, player.position.z);
      cop.isWalking = true;
      cop.update(delta);

      const dx = cp.x - player.position.x;
      const dz = cp.z - player.position.z;
      if (dx * dx + dz * dz < BUST_RANGE * BUST_RANGE) busting = true;
    }

    // A cornered player takes damage while cops are on them.
    if (busting && !player.isDead) {
      this.bustAccum += delta;
      if (this.bustAccum >= BUST_INTERVAL) {
        this.bustAccum -= BUST_INTERVAL;
        player.takeDamage(BUST_DAMAGE, this.game);
      }
    } else {
      this.bustAccum = 0;
    }
  }

  /** Remove all cops (e.g. on teardown). */
  reset(): void {
    for (const cop of this.cops) this.despawn(cop);
    this.cops = [];
  }
}
