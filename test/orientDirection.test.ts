import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { orientDirection } from '../js/utils/utils';

describe('orientDirection', () => {
  it('points player forward (-Z) at zero rotation', () => {
    const d = orientDirection(new THREE.Vector3(), 0, -1);
    expect(d.x).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(-1);
  });

  it('points vehicle forward (+Z) at zero rotation', () => {
    const d = orientDirection(new THREE.Vector3(), 0, 1);
    expect(d.z).toBeCloseTo(1);
  });

  it('rotating 90° about Y maps -Z forward to -X', () => {
    const d = orientDirection(new THREE.Vector3(), Math.PI / 2, -1);
    expect(d.x).toBeCloseTo(-1);
    expect(d.z).toBeCloseTo(0);
  });

  it('always returns a unit vector', () => {
    for (const angle of [0.3, 1.1, 2.7, -0.9]) {
      const d = orientDirection(new THREE.Vector3(), angle, 1);
      expect(d.length()).toBeCloseTo(1);
    }
  });
});
