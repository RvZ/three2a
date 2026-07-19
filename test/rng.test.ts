import { describe, it, expect } from 'vitest';
import { Rng } from '../js/utils/rng';

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng('city-42');
    const b = new Rng('city-42');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    const a = new Rng('seed-a');
    const b = new Rng('seed-b');
    expect(a.next()).not.toBe(b.next());
  });

  it('next() stays in [0, 1)', () => {
    const rng = new Rng('range');
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() is inclusive of both bounds and stays within range', () => {
    const rng = new Rng('ints');
    let sawMin = false;
    let sawMax = false;
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
      if (v === 1) sawMin = true;
      if (v === 6) sawMax = true;
    }
    expect(sawMin && sawMax).toBe(true);
  });

  it('pick() returns an element of the array', () => {
    const rng = new Rng('pick');
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('accepts numeric seeds', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    expect(a.next()).toBe(b.next());
  });
});
