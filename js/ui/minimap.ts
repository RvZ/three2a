/**
 * A small top-down minimap rendered to a 2D canvas.
 *
 * Draws building footprints, the player and vehicles as coloured dots. Purely
 * presentational: it reads live positions from the game each frame and never
 * mutates game state.
 */

interface MinimapBuilding {
  _collisionBox?: { min: { x: number; z: number }; max: { x: number; z: number } };
}

interface MinimapEntity {
  position: { x: number; z: number };
  rotation?: { y: number };
}

interface MinimapGame {
  world: { buildings: MinimapBuilding[]; gridSize: number };
  vehicles: MinimapEntity[];
  player: MinimapEntity & { isInVehicle?: boolean };
}

export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly size: number;
  private buildingsDrawn = false;
  private readonly buildingLayer: HTMLCanvasElement;

  constructor(size = 160) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    Object.assign(this.canvas.style, {
      position: 'absolute',
      right: '12px',
      bottom: '12px',
      width: `${size}px`,
      height: `${size}px`,
      border: '2px solid rgba(255,255,255,0.6)',
      borderRadius: '6px',
      background: 'rgba(20,26,40,0.75)',
      zIndex: '1500',
      pointerEvents: 'none',
    });
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;

    // Static building footprints are baked once into an offscreen layer.
    this.buildingLayer = document.createElement('canvas');
    this.buildingLayer.width = size;
    this.buildingLayer.height = size;

    document.body.appendChild(this.canvas);
  }

  /** World XZ -> minimap pixel, given the world spans [-half, half]. */
  private project(x: number, z: number, half: number): [number, number] {
    const px = ((x + half) / (2 * half)) * this.size;
    const py = ((z + half) / (2 * half)) * this.size;
    return [px, py];
  }

  private bakeBuildings(game: MinimapGame, half: number): void {
    const bctx = this.buildingLayer.getContext('2d');
    if (!bctx) return;
    bctx.clearRect(0, 0, this.size, this.size);
    bctx.fillStyle = 'rgba(150,170,200,0.85)';
    for (const b of game.world.buildings) {
      const box = b._collisionBox;
      if (!box) continue;
      const [x0, y0] = this.project(box.min.x, box.min.z, half);
      const [x1, y1] = this.project(box.max.x, box.max.z, half);
      bctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    }
    this.buildingsDrawn = true;
  }

  private dot(x: number, y: number, color: string, r: number): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /** Redraw the minimap from the current game state. */
  render(game: MinimapGame): void {
    const half = game.world.gridSize / 2;

    // Bake the static building layer once (buildings don't move).
    if (!this.buildingsDrawn && game.world.buildings.length > 0) {
      this.bakeBuildings(game, half);
    }

    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.drawImage(this.buildingLayer, 0, 0);

    // Vehicles.
    for (const v of game.vehicles) {
      const [x, y] = this.project(v.position.x, v.position.z, half);
      this.dot(x, y, '#ffd24a', 2.5);
    }

    // Player (green; brighter when driving).
    const [px, py] = this.project(game.player.position.x, game.player.position.z, half);
    this.dot(px, py, game.player.isInVehicle ? '#39ff88' : '#39d0ff', 3.5);
  }

  dispose(): void {
    this.canvas.remove();
  }
}
