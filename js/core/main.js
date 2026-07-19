import { Game } from './game.js';

// Initialize the game
const game = new Game();
game.init();

// Start the game loop
function animate() {
  requestAnimationFrame(animate);
  game.update();
  game.render();
}

animate();
