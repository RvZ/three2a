import { Vehicle } from '../entities/vehicle.js';

interface Nav {
  vehicle: Vehicle;
  axis: 'x' | 'z'; // which world axis the car moves along
  laneIndex: number; // index of the road line the car is currently ON
  dir: 1 | -1; // travel direction along `axis`
  t: number; // moving coordinate (world units)
}

interface TrafficGame {
  scene: object;
  world: { citySize: number; totalBlockSize: number | null; blockSize: number; roadWidth: number };
  collisionManager: { registerVehicle: (v: Vehicle) => void };
}

const TYPES = ['sedan', 'sports', 'truck', 'van'];
const TURN_CHANCE = 0.35;

/**
 * Simple arcade traffic. Cars drive along the road grid's centerlines and turn
 * at intersections. Roads are one-way (direction alternates by grid index) so
 * traffic never meets head-on, and every car on a given road shares one speed,
 * so same-lane cars keep their spacing instead of rear-ending.
 */
export class TrafficManager {
  private readonly game: TrafficGame;
  private readonly cars: Nav[] = [];
  private lines: number[] = [];
  readonly speed = 8;

  constructor(game: TrafficGame) {
    this.game = game;
  }

  /** Road-line direction: alternate one-way flow by grid index. */
  private static dirForRoad(index: number): 1 | -1 {
    return index % 2 === 0 ? 1 : -1;
  }

  /** Spawn `count` traffic cars on random roads. */
  init(count = 10): void {
    const world = this.game.world;
    const total = world.totalBlockSize ?? world.blockSize + world.roadWidth;
    const half = (world.citySize * total) / 2;
    // Road centerlines at every grid index (matches CityGenerator's roads).
    this.lines = [];
    for (let k = 0; k <= world.citySize; k++) this.lines.push(k * total - half);

    for (let i = 0; i < count; i++) {
      const axis: 'x' | 'z' = Math.random() < 0.5 ? 'x' : 'z';
      const laneIndex = Math.floor(Math.random() * this.lines.length);
      const dir = TrafficManager.dirForRoad(laneIndex);
      const t = (Math.random() * 2 - 1) * half;

      const vehicle = new Vehicle(TYPES[Math.floor(Math.random() * TYPES.length)]);
      vehicle.init(this.game.scene, 0, 0, 0);
      // Tag so the collision manager can treat NPC traffic leniently.
      vehicle.isTraffic = true;

      const nav: Nav = { vehicle, axis, laneIndex, dir, t };
      this.place(nav);
      this.cars.push(nav);
      this.game.collisionManager.registerVehicle(vehicle);
    }
  }

  /** Write a car's world position/orientation from its nav state. */
  private place(nav: Nav): void {
    const laneLine = this.lines[nav.laneIndex];
    const v = nav.vehicle;
    const pos = v.position;
    if (nav.axis === 'x') {
      pos.x = nav.t;
      pos.z = laneLine;
      v.rotation.y = nav.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      v.direction.set(nav.dir, 0, 0);
    } else {
      pos.x = laneLine;
      pos.z = nav.t;
      v.rotation.y = nav.dir > 0 ? 0 : Math.PI;
      v.direction.set(0, 0, nav.dir);
    }
    if (v.mesh) {
      v.mesh.position.copy(pos);
      v.mesh.rotation.y = v.rotation.y;
    }
  }

  update(delta: number): void {
    const last = this.lines.length - 1;

    for (const nav of this.cars) {
      const v = nav.vehicle;
      if (v.isWrecked) {
        v.speed = 0;
        continue; // wrecked cars stop navigating
      }

      v.previousPosition = v.position.clone();
      v.speed = this.speed; // so night lights / collision "moving" checks see it

      const prevT = nav.t;
      nav.t += nav.dir * this.speed * delta;

      // Find the first road line crossed this step (grid spacing >> step, so at
      // most one).
      let crossed = -1;
      for (let m = 0; m < this.lines.length; m++) {
        const L = this.lines[m];
        if ((nav.dir > 0 && prevT < L && nav.t >= L) || (nav.dir < 0 && prevT > L && nav.t <= L)) {
          crossed = m;
          break;
        }
      }

      if (crossed >= 0) {
        const atEdge = (nav.dir > 0 && crossed === last) || (nav.dir < 0 && crossed === 0);
        if (atEdge || Math.random() < TURN_CHANCE) {
          // Turn onto the crossing road: the current lane line becomes the new
          // moving coordinate, the crossing line becomes the new lane.
          const oldLaneLine = this.lines[nav.laneIndex];
          nav.axis = nav.axis === 'x' ? 'z' : 'x';
          nav.laneIndex = crossed;
          nav.dir = TrafficManager.dirForRoad(crossed);
          nav.t = oldLaneLine;
        }
      }

      this.place(nav);
    }
  }
}
