import { describe, it, expect } from 'vitest';
import { SpatialHash, type SpatialItem } from '../js/managers/spatialHash';

interface Pt extends SpatialItem {
  id: number;
}

function pt(id: number, x: number, z: number): Pt {
  return { id, x, z };
}

describe('SpatialHash', () => {
  it('query returns items within the radius', () => {
    const grid = new SpatialHash<Pt>(10);
    const a = pt(1, 0, 0);
    const b = pt(2, 5, 5);
    const far = pt(3, 100, 100);
    grid.rebuild([a, b, far]);
    const near = grid.query(0, 0, 8);
    expect(near).toContain(a);
    expect(near).toContain(b);
    expect(near).not.toContain(far);
  });

  it('query never misses an item within the radius (vs brute force)', () => {
    const grid = new SpatialHash<Pt>(7);
    const items: Pt[] = [];
    // deterministic pseudo-spread
    let s = 12345;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = 0; i < 500; i++) {
      items.push(pt(i, rnd() * 200 - 100, rnd() * 200 - 100));
    }
    grid.rebuild(items);

    const qx = 10;
    const qz = -20;
    const r = 15;
    const brute = items.filter((p) => Math.hypot(p.x - qx, p.z - qz) <= r);
    const found = new Set(grid.query(qx, qz, r));
    for (const p of brute) {
      expect(found.has(p)).toBe(true);
    }
  });

  it('forEachNearbyPair fires each close pair exactly once', () => {
    const grid = new SpatialHash<Pt>(10);
    const a = pt(1, 1, 1);
    const b = pt(2, 2, 2);
    const c = pt(3, 3, 3);
    grid.rebuild([a, b, c]);
    const pairs: string[] = [];
    grid.forEachNearbyPair((x, y) => {
      pairs.push([x.id, y.id].sort((m, n) => m - n).join('-'));
    });
    const unique = new Set(pairs);
    expect(unique.size).toBe(pairs.length); // no duplicates
    expect(unique).toContain('1-2');
    expect(unique).toContain('1-3');
    expect(unique).toContain('2-3');
  });

  it('does not pair items in far-apart cells', () => {
    const grid = new SpatialHash<Pt>(5);
    grid.rebuild([pt(1, 0, 0), pt(2, 100, 100)]);
    let count = 0;
    grid.forEachNearbyPair(() => count++);
    expect(count).toBe(0);
  });

  it('insertAABB finds a large item from a small point query several cells away', () => {
    const grid = new SpatialHash<Pt>(5);
    const building = pt(1, 0, 0);
    // Footprint spans roughly cells (-2..2) on each axis.
    grid.insertAABB(building, -12, -12, 12, 12);
    // A small-radius query near a corner still finds it, without duplicates.
    const found = grid.queryUnique(10, 10, 1);
    expect(found).toEqual([building]);
    // And a query well outside the footprint does not.
    expect(grid.queryUnique(100, 100, 1)).toEqual([]);
  });

  it('clear empties the grid', () => {
    const grid = new SpatialHash<Pt>(10);
    grid.rebuild([pt(1, 0, 0)]);
    grid.clear();
    expect(grid.query(0, 0, 50)).toEqual([]);
  });
});
