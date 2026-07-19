/**
 * Utility functions for the game.
 */
import * as THREE from 'three';
import type { Rng } from './rng';

/**
 * The active random-number source. Defaults to Math.random for backwards
 * compatibility; call {@link setRng} once at startup to make MathUtils/ColorUtils
 * deterministic from a seed (see js/utils/rng.ts).
 */
let rngSource: () => number = Math.random;

/** Install a seeded RNG so all utility randomness becomes reproducible. */
export function setRng(rng: Rng | (() => number)): void {
  rngSource = typeof rng === 'function' ? rng : () => rng.next();
}

/**
 * A drop-in replacement for `Math.random()` that draws from the installed RNG
 * source. Generation code imports this so an entire city can be reproduced from
 * a seed. Reads the current source on every call, so {@link setRng} takes effect
 * even for modules imported earlier.
 */
export const rand = (): number => rngSource();

// Math utilities
export const MathUtils = {
  /** Clamp a value between min and max. */
  clamp: (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max),

  /** Linear interpolation between two values (t in 0..1). */
  lerp: (a: number, b: number, t: number): number => a + (b - a) * t,

  /** Convert degrees to radians. */
  degToRad: (degrees: number): number => (degrees * Math.PI) / 180,

  /** Convert radians to degrees. */
  radToDeg: (radians: number): number => (radians * 180) / Math.PI,

  /** Random float in [min, max). Uses the installed RNG source. */
  random: (min: number, max: number): number => rngSource() * (max - min) + min,

  /** Random integer in [min, max] inclusive. Uses the installed RNG source. */
  randomInt: (min: number, max: number): number => Math.floor(rngSource() * (max - min + 1)) + min,
};

// Color utilities
export const ColorUtils = {
  /** A random 24-bit color as a hex number. */
  randomColor: (): number => Math.floor(rngSource() * 0xffffff),

  /** Darken a hex color by a fraction (0..1). */
  darken: (color: number, percent: number): number => {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    const factor = 1 - percent;
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);
    return (newR << 16) | (newG << 8) | newB;
  },

  /** Lighten a hex color by a fraction (0..1). */
  lighten: (color: number, percent: number): number => {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    const newR = Math.min(255, Math.floor(r + (255 - r) * percent));
    const newG = Math.min(255, Math.floor(g + (255 - g) * percent));
    const newB = Math.min(255, Math.floor(b + (255 - b) * percent));
    return (newR << 16) | (newG << 8) | newB;
  },
};

// Time utilities
export const TimeUtils = {
  /** Format milliseconds as mm:ss. */
  formatTime: (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  /** Resolve after `ms` milliseconds. */
  delay: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
};

type StyleMap = Partial<Record<string, string>>;
interface ElementAttributes {
  style?: StyleMap;
  [key: string]: string | StyleMap | undefined;
}

// DOM utilities
export const DOMUtils = {
  /** Create a DOM element with attributes, optional inline styles and text. */
  createElement: <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes: ElementAttributes = {},
    text = '',
  ): HTMLElementTagNameMap[K] => {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'style' && value && typeof value === 'object') {
        Object.entries(value).forEach(([styleKey, styleValue]) => {
          if (styleValue != null) {
            element.style.setProperty(
              styleKey.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
              String(styleValue),
            );
          }
        });
      } else if (typeof value === 'string') {
        element.setAttribute(key, value);
      }
    });

    if (text) {
      element.textContent = text;
    }

    return element;
  },
};

// Reused scratch objects so per-frame orientation math allocates nothing.
const _rotationMatrix = new THREE.Matrix4();

/**
 * Point `direction` along the entity's forward axis rotated about Y.
 *
 * Entities differ only in which way is "forward" in model space (the player
 * mesh faces -Z, vehicles face +Z), so callers pass `forwardZ`. This replaces
 * the identical rotation math that used to be copy-pasted into each entity.
 */
export function orientDirection(
  direction: THREE.Vector3,
  rotationY: number,
  forwardZ: 1 | -1,
): THREE.Vector3 {
  direction.set(0, 0, forwardZ);
  _rotationMatrix.makeRotationY(rotationY);
  direction.applyMatrix4(_rotationMatrix);
  direction.normalize();
  return direction;
}

// Three.js object utilities
export const ObjectUtils = {
  /**
   * Recursively dispose of an Object3D's geometries, materials and textures and
   * detach it from its parent. Prevents GPU memory leaks when entities are
   * removed from the scene.
   */
  dispose: (object: THREE.Object3D | null | undefined): void => {
    if (!object) return;

    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
        mesh.geometry.dispose();
      }

      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          const record = material as unknown as Record<string, unknown>;
          for (const key in record) {
            const value = record[key] as { isTexture?: boolean; dispose?: () => void };
            if (value && value.isTexture && typeof value.dispose === 'function') {
              value.dispose();
            }
          }
          if (typeof material.dispose === 'function') {
            material.dispose();
          }
        }
      }
    });

    if (object.parent) {
      object.parent.remove(object);
    }
  },
};

type LogLevel = 'log' | 'warn' | 'error';

// Debug utilities
export const DebugUtils = {
  /** Whether verbose debug logging is enabled. */
  enabled: false,

  /** Log a timestamped message. Suppressed unless {@link enabled} (except warn/error). */
  log: (message: string, level: LogLevel = 'log'): void => {
    if (!DebugUtils.enabled && level === 'log') return;
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${message}`;
    if (level === 'warn') console.warn(formatted);
    else if (level === 'error') console.error(formatted);
    // eslint-disable-next-line no-console -- DebugUtils is the sanctioned log sink
    else console.log(formatted);
  },
};
