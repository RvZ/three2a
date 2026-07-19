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

- Modern web browser with WebGL support
- Local web server for development

### Running Locally

1. Clone this repository
```
git clone https://github.com/yourusername/gta2-style-game.git
```

2. Start a local web server in the project directory
```
# Using Python 3
python -m http.server

# Using Node.js
npx serve
```

3. Open your browser and navigate to `http://localhost:8000` (or the port your server is using)

### Testing & linting

```
npm test      # syntax-checks every module (no dependencies required)
npm run lint  # runs ESLint (requires: npm install)
npm run format
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Three.js for 3D rendering
- nipple.js for mobile joystick controls 