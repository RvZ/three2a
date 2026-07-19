/**
 * Uniform spatial hash grid over the XZ plane.
 *
 * Buckets entities into fixed-size cells so collision queries only test nearby
 * entities instead of every pair. Replaces the O(n^2) vehicle/pedestrian loops
 * and the per-building linear broad-phase scan in the collision manager.
 *
 * Static content (buildings) is inserted once; dynamic content is cleared and
 * re-inserted each frame via {@link rebuild}.
 */

export interface SpatialItem {
  /** World X coordinate. */
  x: number;
  /** World Z coordinate. */
  z: number;
}

export class SpatialHash<T extends SpatialItem> {
  private readonly cells = new Map<string, T[]>();
  readonly cellSize: number;

  constructor(cellSize = 10) {
    this.cellSize = cellSize;
  }

  private key(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  /** Remove all items. */
  clear(): void {
    this.cells.clear();
  }

  /** Insert an item at its (x, z). */
  insert(item: T): void {
    const k = this.key(item.x, item.z);
    let bucket = this.cells.get(k);
    if (!bucket) {
      bucket = [];
      this.cells.set(k, bucket);
    }
    bucket.push(item);
  }

  /**
   * Insert a large/static item into every cell its axis-aligned footprint
   * overlaps. Use this for buildings so a small-radius point query still finds
   * a building whose centre is several cells away.
   */
  insertAABB(item: T, minX: number, minZ: number, maxX: number, maxZ: number): void {
    const minCx = Math.floor(minX / this.cellSize);
    const maxCx = Math.floor(maxX / this.cellSize);
    const minCz = Math.floor(minZ / this.cellSize);
    const maxCz = Math.floor(maxZ / this.cellSize);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const k = `${cx},${cz}`;
        let bucket = this.cells.get(k);
        if (!bucket) {
          bucket = [];
          this.cells.set(k, bucket);
        }
        bucket.push(item);
      }
    }
  }

  /** Clear and insert every item in one pass. */
  rebuild(items: Iterable<T>): void {
    this.clear();
    for (const item of items) this.insert(item);
  }

  /**
   * Like {@link query} but de-duplicates results — needed when items were added
   * via {@link insertAABB} and therefore live in multiple cells.
   */
  queryUnique(x: number, z: number, radius = 0): T[] {
    return [...new Set(this.query(x, z, radius))];
  }

  /**
   * All items whose cell overlaps a `radius` disc around (x, z). May include
   * items slightly outside the radius (cell granularity) — callers do the exact
   * narrow-phase test. Never misses an item within the radius.
   */
  query(x: number, z: number, radius = 0): T[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCz = Math.floor((z - radius) / this.cellSize);
    const maxCz = Math.floor((z + radius) / this.cellSize);

    const results: T[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.cells.get(`${cx},${cz}`);
        if (bucket) results.push(...bucket);
      }
    }
    return results;
  }

  /** Invoke `fn` for every unique unordered pair sharing or neighbouring a cell. */
  forEachNearbyPair(fn: (a: T, b: T) => void): void {
    // Build a de-duplicated candidate set per occupied cell + its 8 neighbours.
    const seen = new Set<string>();
    for (const [cellKey, bucket] of this.cells) {
      const [cxStr, czStr] = cellKey.split(',');
      const cx = Number(cxStr);
      const cz = Number(czStr);
      const neighbours: T[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nb = this.cells.get(`${cx + dx},${cz + dz}`);
          if (nb) neighbours.push(...nb);
        }
      }
      for (let i = 0; i < bucket.length; i++) {
        for (let j = 0; j < neighbours.length; j++) {
          const a = bucket[i];
          const b = neighbours[j];
          if (a === b) continue;
          // Order-independent de-dup so each pair fires once.
          const pairKey = orderedPairKey(a, b);
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);
          fn(a, b);
        }
      }
    }
  }
}

let _idCounter = 0;
const _ids = new WeakMap<object, number>();
function idOf(obj: object): number {
  let id = _ids.get(obj);
  if (id === undefined) {
    id = ++_idCounter;
    _ids.set(obj, id);
  }
  return id;
}

function orderedPairKey(a: object, b: object): string {
  const ia = idOf(a);
  const ib = idOf(b);
  return ia < ib ? `${ia}:${ib}` : `${ib}:${ia}`;
}
