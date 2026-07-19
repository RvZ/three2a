# GTA 2 Style Game

A top-down GTA-inspired game built with JavaScript and Three.js. This project features a procedurally generated city with buildings, roads, vehicles, and pedestrians.

## Features

- Procedurally generated city with buildings, roads, and sidewalks
- Drivable vehicles with realistic physics
- Character movement with collision detection
- Mobile controls support with virtual joystick
- Procedurally generated sound effects
- Day/night cycle with dynamic lighting

## Play Online

You can play the game directly in your browser: [Play Now](#) (Add your hosted URL when available)

## Controls

### Desktop:

- **WASD** or **Arrow Keys**: Move character/vehicle
- **Space**: Enter/exit vehicle
- **H**: Honk horn (when in vehicle)
- **M**: Mute/unmute sound
- **B**: Toggle collision debug mode
- **Mouse Wheel**: Zoom in/out

### Mobile:

- **Left Joystick**: Move character/vehicle
- **Action Button**: Enter/exit vehicle
- **Horn Button**: Honk horn (when in vehicle)

## Architecture

The game is built with a clean architecture that separates concerns:

- **Core**: Main game loop, world, and camera management
- **Entities**: Buildings, vehicles, and characters
- **Generators**: Procedural generation of city, textures, and sounds
- **Managers**: Input, collision, sound, and mobile controls
- **UI**: Heads-up display and user interface elements

## Development

### Prerequisites

- Node.js 20+ and npm
- Modern web browser with WebGL support

### Running Locally

1. Clone this repository

```
git clone https://github.com/yourusername/gta2-style-game.git
cd gta2-style-game
```

2. Install dependencies and start the Vite dev server

```
npm install
npm run dev
```

3. Open the URL Vite prints (defaults to `http://localhost:5173`). The dev
   server has hot-module reload. `three` is bundled from `node_modules` — no
   CDN required.

### Building

```
npm run build     # typechecks, then produces an optimized bundle in dist/
npm run preview   # serves the production build locally
```

### Testing, types & linting

```
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests
npm run lint         # ESLint (flat config)
npm run format       # Prettier (write); format:check to verify
npm run e2e          # headless boot smoke test (needs a running preview server)
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Three.js for 3D rendering
- nipple.js for mobile joystick controls
