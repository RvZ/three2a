import * as THREE from 'three';

/**
 * Pooled bullets fired by the player. Each is a small emissive sphere (so the
 * bloom pass turns it into a glowing tracer). Bullets travel in a straight line
 * and hit NPC pedestrians and vehicles (never the player or the car they're
 * driving); hits are reported back through the game so scoring / wanted level /
 * damage stay in one place.
 */
const POOL = 48;
const SPEED = 70;
const LIFE = 1.1;
const PED_HIT2 = 0.7 * 0.7;

interface ProjectileGame {
  scene: THREE.Scene;
  particles?: { emitSparks: (x: number, y: number, z: number, i?: number) => void };
  collisionManager: {
    pedestrians: Array<{ position?: THREE.Vector3; isDead?: boolean }>;
    vehicles: Array<{ position?: THREE.Vector3; collisionRadius?: number; isWrecked?: boolean }>;
    killPedestrian: (p: unknown) => void;
    damageVehicle: (v: unknown, amount: number) => void;
  };
  player: { currentVehicle?: unknown };
}

/** The player object doubles as a pedestrian; compare loosely. */
function isSame(a: unknown, b: unknown): boolean {
  return a === b;
}

interface Bullet {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  active: boolean;
}

export class ProjectileManager {
  private readonly game: ProjectileGame;
  private readonly pool: Bullet[] = [];
  private readonly geometry: THREE.SphereGeometry;
  private readonly material: THREE.MeshStandardMaterial;

  /** Hit callbacks, wired by the game to centralise scoring/damage/wanted. */
  onBulletHitPedestrian?: (p: unknown) => void;
  onBulletHitVehicle?: (v: unknown) => void;

  constructor(game: ProjectileGame) {
    this.game = game;
    this.geometry = new THREE.SphereGeometry(0.16, 6, 6);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffff66,
      emissive: 0xffff33,
      emissiveIntensity: 3,
    });

    for (let i = 0; i < POOL; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.visible = false;
      this.game.scene.add(mesh);
      this.pool.push({ mesh, vel: new THREE.Vector3(), life: 0, active: false });
    }
  }

  /** Fire a bullet from `origin` in (normalised) direction `dir`. */
  fire(origin: THREE.Vector3, dir: THREE.Vector3): void {
    const b = this.pool.find((p) => !p.active);
    if (!b) return; // pool exhausted; drop the shot

    b.mesh.position.set(origin.x, 1, origin.z);
    b.vel.set(dir.x, 0, dir.z).normalize().multiplyScalar(SPEED);
    b.life = LIFE;
    b.active = true;
    b.mesh.visible = true;

    // Muzzle flash.
    this.game.particles?.emitSparks(origin.x, 1, origin.z, 0.25);
  }

  private deactivate(b: Bullet): void {
    b.active = false;
    b.mesh.visible = false;
  }

  update(delta: number): void {
    const cm = this.game.collisionManager;
    const playerCar = this.game.player.currentVehicle;

    for (const b of this.pool) {
      if (!b.active) continue;

      b.life -= delta;
      if (b.life <= 0) {
        this.deactivate(b);
        continue;
      }

      b.mesh.position.addScaledVector(b.vel, delta);
      const bx = b.mesh.position.x;
      const bz = b.mesh.position.z;

      // Pedestrians (skip the player).
      let hit = false;
      for (const ped of cm.pedestrians) {
        if (!ped.position || ped.isDead) continue;
        if (isSame(ped, this.game.player)) continue;
        const dx = bx - ped.position.x;
        const dz = bz - ped.position.z;
        if (dx * dx + dz * dz < PED_HIT2) {
          this.game.particles?.emitSparks(bx, 1, bz, 0.4);
          this.onBulletHitPedestrian?.(ped);
          hit = true;
          break;
        }
      }
      if (hit) {
        this.deactivate(b);
        continue;
      }

      // Vehicles (skip the car the player is driving).
      for (const v of cm.vehicles) {
        if (!v.position || v.isWrecked || v === playerCar) continue;
        const r = v.collisionRadius ?? 2;
        const dx = bx - v.position.x;
        const dz = bz - v.position.z;
        if (dx * dx + dz * dz < r * r) {
          this.game.particles?.emitSparks(bx, 1, bz, 0.4);
          this.onBulletHitVehicle?.(v);
          hit = true;
          break;
        }
      }
      if (hit) this.deactivate(b);
    }
  }

  dispose(): void {
    for (const b of this.pool) b.mesh.parent?.remove(b.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
