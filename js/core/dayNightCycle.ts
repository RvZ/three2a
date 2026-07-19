import * as THREE from 'three';

interface Palette {
  sky: number;
  sun: number;
  sunIntensity: number;
  ambientIntensity: number;
  fog: number;
}

const DAY: Palette = {
  sky: 0x87ceeb,
  sun: 0xfff2e0,
  sunIntensity: 1.15,
  ambientIntensity: 0.65,
  fog: 0x9fc4e0,
};

const NIGHT: Palette = {
  sky: 0x0a0e26,
  sun: 0x33406b,
  sunIntensity: 0.15,
  ambientIntensity: 0.3, // a touch of moonlight so the city stays playable
  fog: 0x0a0e26,
};

const DUSK_TINT = new THREE.Color(0xff7733);

export interface DayNightOptions {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight | THREE.AmbientLight;
  /** Radius of the world, used to place the sun far enough out. */
  worldRadius?: number;
  /** Real seconds for one full day/night cycle. */
  dayLength?: number;
  /** Starting time of day, 0..1 (0 = midnight, 0.5 = noon). */
  startTime?: number;
}

/**
 * Animates a full day/night cycle: sun arc + colour/intensity, ambient level,
 * sky background and fog colour. Delivers the day/night cycle the README always
 * advertised (the original lighting was static).
 */
export class DayNightCycle {
  private readonly scene: THREE.Scene;
  private readonly sun: THREE.DirectionalLight;
  private readonly ambient: THREE.HemisphereLight | THREE.AmbientLight;
  private readonly worldRadius: number;
  private readonly dayLength: number;

  /** Normalised time of day, 0..1. */
  time: number;

  private readonly skyColor = new THREE.Color();
  private readonly sunColor = new THREE.Color();
  private readonly fogColor = new THREE.Color();

  constructor(opts: DayNightOptions) {
    this.scene = opts.scene;
    this.sun = opts.sun;
    this.ambient = opts.ambient;
    this.worldRadius = opts.worldRadius ?? 120;
    this.dayLength = opts.dayLength ?? 120;
    this.time = opts.startTime ?? 0.3; // a little after sunrise

    if (!this.scene.fog) {
      this.scene.fog = new THREE.Fog(DAY.fog, this.worldRadius * 0.9, this.worldRadius * 2.2);
    }
    this.apply();
  }

  /** 0 at night, 1 at midday — how "up" the sun is. */
  get daylight(): number {
    // Sun elevation peaks at time=0.5 (noon), is below horizon around 0/1.
    return Math.max(0, Math.sin((this.time - 0.25) * Math.PI * 2));
  }

  /** True while it is dark enough for headlights / lit windows. */
  get isNight(): boolean {
    return this.daylight < 0.15;
  }

  update(delta: number): void {
    this.time = (this.time + delta / this.dayLength) % 1;
    this.apply();
  }

  private apply(): void {
    const t = this.daylight; // 0..1

    // Colour/intensity blend between night and day.
    this.skyColor.set(NIGHT.sky).lerp(new THREE.Color(DAY.sky), t);
    this.sunColor.set(NIGHT.sun).lerp(new THREE.Color(DAY.sun), t);
    this.fogColor.set(NIGHT.fog).lerp(new THREE.Color(DAY.fog), t);

    // Warm dusk/dawn tint when the sun is low but present.
    const lowSun = t > 0 && t < 0.35 ? 1 - t / 0.35 : 0;
    this.sunColor.lerp(DUSK_TINT, lowSun * 0.5);
    this.skyColor.lerp(DUSK_TINT, lowSun * 0.2);

    // Sun arc across the sky (east -> overhead -> west).
    const angle = (this.time - 0.25) * Math.PI * 2;
    const r = this.worldRadius;
    this.sun.position.set(Math.cos(angle) * r, Math.max(5, Math.sin(angle) * r), r * 0.35);
    this.sun.color.copy(this.sunColor);
    this.sun.intensity = THREE.MathUtils.lerp(NIGHT.sunIntensity, DAY.sunIntensity, t);
    this.sun.visible = this.sun.intensity > 0.02;

    this.ambient.intensity = THREE.MathUtils.lerp(NIGHT.ambientIntensity, DAY.ambientIntensity, t);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.skyColor);
    } else {
      this.scene.background = this.skyColor.clone();
    }
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.fogColor);
    }
  }
}
