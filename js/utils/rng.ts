/**
 * Small, fast, seedable pseudo-random number generator.
 *
 * Uses xmur3 to hash a string seed into a 32-bit state and mulberry32 to
 * produce the stream. Deterministic: the same seed always yields the same
 * sequence, which makes procedural city generation reproducible (shareable
 * seeds) and lets tests assert exact output.
 */

/** Hash a string into a 32-bit seed (xmur3). */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32 PRNG: fast 32-bit generator with a full 2^32 period. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  readonly seed: string;
  private readonly gen: () => number;

  constructor(seed: string | number = 'three2a') {
    this.seed = String(seed);
    const seedFn = xmur3(this.seed);
    this.gen = mulberry32(seedFn());
  }

  /** Next float in [0, 1). */
  next(): number {
    return this.gen();
  }

  /** Random float in [min, max). */
  range(min: number, max: number): number {
    return this.gen() * (max - min) + min;
  }

  /** Random integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.gen() * (max - min + 1)) + min;
  }

  /** True with probability `p` (0..1). */
  chance(p: number): boolean {
    return this.gen() < p;
  }

  /** Pick a random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.gen() * items.length)];
  }
}
