import { DOMUtils } from '../utils/utils';

export class HUD {
  constructor(game) {
    this.game = game;
    this.container = null;

    // Game stats
    this.lives = 3;
    this.wantedLevel = 0;
    this.money = 1000;
    this.score = 0;

    // HUD elements
    this.livesElement = null;
    this.wantedElement = null;
    this.moneyElement = null;
    this.scoreElement = null;
    this.messageElement = null;
  }

  init() {
    // Create HUD container using DOMUtils
    this.container = DOMUtils.createElement('div', {
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        padding: '10px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: 'white',
        textShadow: '2px 2px 2px black',
        pointerEvents: 'none',
        zIndex: '1000',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      },
    });

    // Create top bar
    const topBar = DOMUtils.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
      },
    });

    // Create left section (lives, wanted level)
    const leftSection = DOMUtils.createElement('div', {
      style: {
        display: 'flex',
        gap: '20px',
      },
    });

    // Lives display
    this.livesElement = DOMUtils.createElement('div');
    this.updateLives();
    leftSection.appendChild(this.livesElement);

    // Wanted level display
    this.wantedElement = DOMUtils.createElement('div');
    this.updateWantedLevel();
    leftSection.appendChild(this.wantedElement);

    // Create right section (money, score)
    const rightSection = DOMUtils.createElement('div', {
      style: {
        display: 'flex',
        gap: '20px',
      },
    });

    // Money display
    this.moneyElement = DOMUtils.createElement('div');
    this.updateMoney();
    rightSection.appendChild(this.moneyElement);

    // Score display
    this.scoreElement = DOMUtils.createElement('div');
    this.updateScore();
    rightSection.appendChild(this.scoreElement);

    // Add sections to top bar
    topBar.appendChild(leftSection);
    topBar.appendChild(rightSection);

    // Add top bar to container
    this.container.appendChild(topBar);

    // Create message area (for notifications)
    this.messageElement = DOMUtils.createElement('div', {
      style: {
        textAlign: 'center',
        fontSize: '28px',
        marginTop: '20px',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out',
      },
    });
    this.container.appendChild(this.messageElement);

    // Add container to document
    document.body.appendChild(this.container);

    // Full-screen pause overlay (hidden until paused).
    this.pauseOverlay = DOMUtils.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          inset: '0',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.55)',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '48px',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px black',
          zIndex: '2000',
          pointerEvents: 'none',
        },
      },
      '',
    );
    const pausedTitle = DOMUtils.createElement('div', {}, '⏸ PAUSED');
    const pausedHint = DOMUtils.createElement(
      'div',
      { style: { fontSize: '20px', fontWeight: 'normal', opacity: '0.85' } },
      'Press P or Esc to resume',
    );
    this.pauseOverlay.appendChild(pausedTitle);
    this.pauseOverlay.appendChild(pausedHint);
    document.body.appendChild(this.pauseOverlay);

    // Show welcome message
    this.showMessage(
      'Welcome to GTA 2 Style Game! 🎮 Use WASD to move, SPACE to enter/exit vehicles, P to pause',
    );
  }

  /** Show or hide the pause overlay. */
  setPaused(paused) {
    if (this.pauseOverlay) {
      this.pauseOverlay.style.display = paused ? 'flex' : 'none';
    }
  }

  updateLives() {
    this.livesElement.innerHTML = '❤️'.repeat(this.lives);
  }

  updateWantedLevel() {
    if (this.wantedLevel === 0) {
      this.wantedElement.innerHTML = '';
    } else {
      this.wantedElement.innerHTML = '🚔'.repeat(this.wantedLevel);
    }
  }

  updateMoney() {
    this.moneyElement.innerHTML = `💰 $${this.money}`;
  }

  updateScore() {
    this.scoreElement.innerHTML = `🏆 ${this.score}`;
  }

  showMessage(message, duration = 3000) {
    this.messageElement.textContent = message;
    this.messageElement.style.opacity = '1';

    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    // Hide message after duration
    this.messageTimeout = setTimeout(() => {
      this.messageElement.style.opacity = '0';
    }, duration);
  }

  setLives(lives) {
    this.lives = lives;
    this.updateLives();
  }

  decreaseLives() {
    this.lives = Math.max(0, this.lives - 1);
    this.updateLives();

    if (this.lives === 0) {
      this.showMessage('Game Over! 💀', 5000);
    } else {
      this.showMessage('Lost a life! ❌', 2000);
    }

    return this.lives;
  }

  increaseLives() {
    this.lives++;
    this.updateLives();
    this.showMessage('Extra life! ✨', 2000);
    return this.lives;
  }

  setWantedLevel(level) {
    this.wantedLevel = Math.max(0, Math.min(5, level)); // Clamp between 0-5
    this.updateWantedLevel();

    if (level > 0) {
      this.showMessage(`Wanted Level: ${level} 🚨`, 2000);
    } else {
      this.showMessage('Wanted Level cleared! 😎', 2000);
    }
  }

  increaseWantedLevel() {
    if (this.wantedLevel < 5) {
      this.wantedLevel++;
      this.updateWantedLevel();
      this.showMessage(`Wanted Level increased to ${this.wantedLevel} 🚨`, 2000);
    }
    return this.wantedLevel;
  }

  decreaseWantedLevel() {
    if (this.wantedLevel > 0) {
      this.wantedLevel--;
      this.updateWantedLevel();

      if (this.wantedLevel === 0) {
        this.showMessage('Wanted Level cleared! 😎', 2000);
      } else {
        this.showMessage(`Wanted Level decreased to ${this.wantedLevel} 🚔`, 2000);
      }
    }
    return this.wantedLevel;
  }

  addMoney(amount) {
    this.money += amount;
    this.updateMoney();
    this.showMessage(`+$${amount} 💵`, 2000);
    return this.money;
  }

  removeMoney(amount) {
    this.money = Math.max(0, this.money - amount);
    this.updateMoney();
    this.showMessage(`-$${amount} 💸`, 2000);
    return this.money;
  }

  addScore(points) {
    this.score += points;
    this.updateScore();
    this.showMessage(`+${points} points! 🎯`, 2000);
    return this.score;
  }

  showVehicleMessage(vehicleType) {
    let emoji = '🚗';
    switch (vehicleType) {
      case 'sports':
        emoji = '🏎️';
        break;
      case 'truck':
        emoji = '🚚';
        break;
      case 'van':
        emoji = '🚐';
        break;
    }

    this.showMessage(`Entered ${vehicleType} ${emoji}`, 2000);
  }

  showExitVehicleMessage() {
    this.showMessage('Exited vehicle 🚶', 2000);
  }
}
