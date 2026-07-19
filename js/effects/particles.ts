import * as THREE from 'three';

/**
 * A tiny pooled particle system rendered as a single additive THREE.Points.
 *
 * One fixed-size ring buffer backs every effect (crash sparks, vehicle
 * exhaust): spawning overwrites the oldest slot, so there is no per-frame
 * allocation and the draw cost is one Points object regardless of activity.
 */
const MAX = 600;
const GROUND_Y = 0.05;

export class ParticleSystem {
  readonly points: THREE.Points;

  private readonly positions = new Float32Array(MAX * 3);
  private readonly colors = new Float32Array(MAX * 3);
  private readonly baseColors = new Float32Array(MAX * 3);
  private readonly velocities = new Float32Array(MAX * 3);
  private readonly life = new Float32Array(MAX);
  private readonly maxLife = new Float32Array(MAX);
  private readonly gravity = new Float32Array(MAX);
  private cursor = 0;

  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.6,
      map: ParticleSystem.createDotTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    // Particles roam the whole city; don't let frustum culling drop the cloud.
    this.points.frustumCulled = false;
  }

  /** Soft round sprite so points render as glows rather than squares. */
  private static createDotTexture(): THREE.Texture {
    const s = 64;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);
    }
    return new THREE.CanvasTexture(canvas);
  }

  private spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    r: number,
    g: number,
    b: number,
    gravity: number,
  ): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    const i3 = i * 3;
    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;
    this.velocities[i3] = vx;
    this.velocities[i3 + 1] = vy;
    this.velocities[i3 + 2] = vz;
    this.baseColors[i3] = r;
    this.baseColors[i3 + 1] = g;
    this.baseColors[i3 + 2] = b;
    this.colors[i3] = r;
    this.colors[i3 + 1] = g;
    this.colors[i3 + 2] = b;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.gravity[i] = gravity;
  }

  /** Burst of warm sparks flying outward and falling (used on crashes). */
  emitSparks(x: number, y: number, z: number, intensity = 0.6): void {
    const count = Math.round(12 + intensity * 26);
    for (let k = 0; k < count; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6 * intensity;
      this.spawn(
        x,
        y,
        z,
        Math.cos(angle) * speed,
        2 + Math.random() * 4,
        Math.sin(angle) * speed,
        0.3 + Math.random() * 0.35,
        1.0,
        0.6 + Math.random() * 0.4,
        0.15,
        14, // strong gravity so sparks arc and fall
      );
    }
  }

  /** A single soft exhaust puff drifting up and backwards behind a vehicle. */
  emitExhaust(x: number, y: number, z: number, backX: number, backZ: number): void {
    const shade = 0.22 + Math.random() * 0.13;
    this.spawn(
      x + (Math.random() - 0.5) * 0.2,
      y,
      z + (Math.random() - 0.5) * 0.2,
      backX + (Math.random() - 0.5) * 0.4,
      0.5 + Math.random() * 0.4,
      backZ + (Math.random() - 0.5) * 0.4,
      0.5 + Math.random() * 0.3,
      shade,
      shade,
      shade,
      0, // smoke: no gravity, just rises and fades
    );
  }

  /** Advance all live particles and fade them out over their lifetime. */
  update(delta: number): void {
    let changed = false;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      changed = true;
      const i3 = i * 3;

      this.life[i] -= delta;
      if (this.life[i] <= 0) {
        // Additive black contributes nothing, so a dead particle is invisible.
        this.colors[i3] = this.colors[i3 + 1] = this.colors[i3 + 2] = 0;
        continue;
      }

      this.velocities[i3 + 1] -= this.gravity[i] * delta;
      this.positions[i3] += this.velocities[i3] * delta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;

      if (this.positions[i3 + 1] < GROUND_Y) {
        this.positions[i3 + 1] = GROUND_Y;
        this.velocities[i3 + 1] *= -0.3; // small bounce
      }

      const fade = this.life[i] / this.maxLife[i];
      this.colors[i3] = this.baseColors[i3] * fade;
      this.colors[i3 + 1] = this.baseColors[i3 + 1] * fade;
      this.colors[i3 + 2] = this.baseColors[i3 + 2] * fade;
    }

    if (changed) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.map?.dispose();
    this.material.dispose();
    this.points.parent?.remove(this.points);
  }
}
