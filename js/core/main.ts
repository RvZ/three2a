import { Game } from './game.js';

// Initialize the game.
const game = new Game();
game.init();

// Expose a debug handle for the console and headless e2e tests.
(window as unknown as { __game: Game }).__game = game;

// Main animation loop.
function animate(): void {
  requestAnimationFrame(animate);
  game.update();
  game.render();
}

animate();
