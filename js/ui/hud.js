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
    // Respect users who prefer reduced motion (disables the message fade).
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create HUD container using DOMUtils
    this.container = DOMUtils.createElement('div', {
      role: 'region',
      'aria-label': 'Game heads-up display',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        padding: '12px',
        boxSizing: 'border-box',
        fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif",
        fontSize: '20px',
        fontWeight: '600',
        color: '#f4f7ff',
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
        alignItems: 'flex-start',
        width: '100%',
      },
    });

    // Shared style for the translucent stat panels.
    const panelStyle = {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      padding: '8px 14px',
      background: 'rgba(15, 20, 32, 0.55)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
    };

    // Create left section (lives, wanted level)
    const leftSection = DOMUtils.createElement('div', { style: { ...panelStyle } });

    // Lives display
    this.livesElement = DOMUtils.createElement('div', { role: 'status' });
    this.updateLives();
    leftSection.appendChild(this.livesElement);

    // Wanted level display
    this.wantedElement = DOMUtils.createElement('div', { role: 'status' });
    this.updateWantedLevel();
    leftSection.appendChild(this.wantedElement);

    // Create right section (money, score)
    const rightSection = DOMUtils.createElement('div', { style: { ...panelStyle } });

    // Money display
    this.moneyElement = DOMUtils.createElement('div', { role: 'status' });
    this.updateMoney();
    rightSection.appendChild(this.moneyElement);

    // Score display
    this.scoreElement = DOMUtils.createElement('div', { role: 'status' });
    this.updateScore();
    rightSection.appendChild(this.scoreElement);

    // Add sections to top bar
    topBar.appendChild(leftSection);
    topBar.appendChild(rightSection);

    // Add top bar to container
    this.container.appendChild(topBar);

    // Create message area (for notifications). It's an ARIA live region so
    // screen readers announce transient messages politely.
    this.messageElement = DOMUtils.createElement('div', {
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
      style: {
        alignSelf: 'center',
        textAlign: 'center',
        fontSize: '26px',
        marginTop: '12px',
        padding: '8px 18px',
        maxWidth: '80%',
        background: 'rgba(15, 20, 32, 0.6)',
        borderRadius: '12px',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
        opacity: '0',
        transition: this.reducedMotion ? 'none' : 'opacity 0.3s ease-in-out',
      },
    });
    this.container.appendChild(this.messageElement);

    // Add container to document
    document.body.appendChild(this.container);

    // Full-screen pause overlay (hidden until paused).
    this.pauseOverlay = DOMUtils.createElement(
      'div',
      {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Game paused',
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
  }

  /** Build (once) and show the start menu with the controls list. */
  showStartMenu() {
    if (!this.startOverlay) {
      this.startOverlay = DOMUtils.createElement(
        'div',
        {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': 'Start menu',
          style: {
            position: 'absolute',
            inset: '0',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
            background: 'rgba(8, 12, 24, 0.92)',
            color: '#f4f7ff',
            fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif",
            textAlign: 'center',
            zIndex: '2200',
            pointerEvents: 'none',
          },
        },
        '',
      );
      const title = DOMUtils.createElement(
        'div',
        { style: { fontSize: '58px', fontWeight: 'bold', letterSpacing: '2px' } },
        'GTA 2 STYLE',
      );
      const controls = DOMUtils.createElement('div', {
        style: {
          fontSize: '18px',
          lineHeight: '1.8',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '16px 24px',
          borderRadius: '12px',
        },
      });
      controls.innerHTML =
        '<b>Controls</b><br>' +
        'WASD / Arrows — move &nbsp;·&nbsp; Space — enter/exit vehicle<br>' +
        'F / Click — shoot &nbsp;·&nbsp; H — horn &nbsp;·&nbsp; M — mute<br>' +
        'P / Esc — pause &nbsp;·&nbsp; Mouse wheel — zoom &nbsp;·&nbsp; B — debug';
      const hint = DOMUtils.createElement(
        'div',
        { style: { fontSize: '22px', fontWeight: 'bold' } },
        'Press Enter or click to play',
      );
      this.startOverlay.appendChild(title);
      this.startOverlay.appendChild(controls);
      this.startOverlay.appendChild(hint);
      document.body.appendChild(this.startOverlay);
    }
    this.startOverlay.style.display = 'flex';
  }

  /** Hide the start menu. */
  hideStartMenu() {
    if (this.startOverlay) this.startOverlay.style.display = 'none';
  }

  /** Show or hide the pause overlay. */
  setPaused(paused) {
    if (this.pauseOverlay) {
      this.pauseOverlay.style.display = paused ? 'flex' : 'none';
    }
  }

  /**
   * Show the game-over overlay with the final score.
   * @param {number} finalScore - Score to display
   */
  showGameOver(finalScore = 0) {
    if (!this.gameOverOverlay) {
      this.gameOverOverlay = DOMUtils.createElement('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Game over',
        style: {
          position: 'absolute',
          inset: '0',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '14px',
          background: 'rgba(0, 0, 0, 0.72)',
          color: 'white',
          fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif",
          textAlign: 'center',
          zIndex: '2100',
          pointerEvents: 'none',
        },
      });
      const title = DOMUtils.createElement(
        'div',
        { style: { fontSize: '64px', fontWeight: 'bold', textShadow: '2px 2px 6px black' } },
        'GAME OVER 💀',
      );
      this.gameOverScoreEl = DOMUtils.createElement('div', { style: { fontSize: '28px' } }, '');
      const hint = DOMUtils.createElement(
        'div',
        { style: { fontSize: '20px', opacity: '0.85' } },
        'Press R to play again',
      );
      this.gameOverOverlay.appendChild(title);
      this.gameOverOverlay.appendChild(this.gameOverScoreEl);
      this.gameOverOverlay.appendChild(hint);
      document.body.appendChild(this.gameOverOverlay);
    }
    this.gameOverScoreEl.textContent = `Final score: ${finalScore}`;
    this.gameOverOverlay.style.display = 'flex';
  }

  updateLives() {
    this.livesElement.innerHTML = '❤️'.repeat(this.lives);
    // aria-label overrides the emoji so screen readers say "Lives: 3".
    this.livesElement.setAttribute('aria-label', `Lives: ${this.lives}`);
  }

  updateWantedLevel() {
    if (this.wantedLevel === 0) {
      this.wantedElement.innerHTML = '';
      this.wantedElement.setAttribute('aria-label', 'Wanted level: none');
    } else {
      this.wantedElement.innerHTML = '🚔'.repeat(this.wantedLevel);
      this.wantedElement.setAttribute('aria-label', `Wanted level: ${this.wantedLevel} of 5`);
    }
  }

  updateMoney() {
    this.moneyElement.innerHTML = `💰 $${this.money}`;
    this.moneyElement.setAttribute('aria-label', `Money: ${this.money} dollars`);
  }

  updateScore() {
    this.scoreElement.innerHTML = `🏆 ${this.score}`;
    this.scoreElement.setAttribute('aria-label', `Score: ${this.score}`);
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
