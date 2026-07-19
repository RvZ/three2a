import { describe, it, expect } from 'vitest';
import { MathUtils, ColorUtils, TimeUtils, setRng } from '../js/utils/utils';
import { Rng } from '../js/utils/rng';

describe('MathUtils', () => {
  it('clamp bounds a value', () => {
    expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
    expect(MathUtils.clamp(50, 0, 10)).toBe(10);
  });

  it('lerp interpolates linearly', () => {
    expect(MathUtils.lerp(0, 10, 0)).toBe(0);
    expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
    expect(MathUtils.lerp(0, 10, 1)).toBe(10);
  });

  it('degToRad and radToDeg round-trip', () => {
    expect(MathUtils.degToRad(180)).toBeCloseTo(Math.PI);
    expect(MathUtils.radToDeg(Math.PI)).toBeCloseTo(180);
  });

  it('random uses the installed seeded RNG deterministically', () => {
    setRng(new Rng('math'));
    const a = MathUtils.random(0, 100);
    setRng(new Rng('math'));
    const b = MathUtils.random(0, 100);
    expect(a).toBe(b);
    // restore default source for other tests
    setRng(Math.random);
  });
});

describe('ColorUtils', () => {
  it('darken reduces channel values', () => {
    expect(ColorUtils.darken(0xffffff, 0.5)).toBe(0x7f7f7f);
    expect(ColorUtils.darken(0xffffff, 1)).toBe(0x000000);
  });

  it('lighten increases channel values', () => {
    expect(ColorUtils.lighten(0x000000, 1)).toBe(0xffffff);
    expect(ColorUtils.lighten(0x000000, 0)).toBe(0x000000);
  });
});

describe('TimeUtils', () => {
  it('formats milliseconds as mm:ss', () => {
    expect(TimeUtils.formatTime(0)).toBe('00:00');
    expect(TimeUtils.formatTime(65_000)).toBe('01:05');
    expect(TimeUtils.formatTime(600_000)).toBe('10:00');
  });
});
