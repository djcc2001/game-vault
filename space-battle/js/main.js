/**
 * main.js
 * Application entry point. Initialises all managers and boots the game.
 */
(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {
    // Initialise subsystems
    ScoreManager.load();
    UIManager.init();

    // Boot the game engine
    const canvas = document.getElementById('gameCanvas');
    const game   = new Game(canvas);

    // Expose singleton for UIManager event handlers
    window._gameInstance = game;

    // Show main menu
    UIManager.showScreen('screen-main-menu');
    AudioManager.playMenuBGM();

    // Unlock AudioContext on first interaction
    document.addEventListener('pointerdown', () => AudioManager.resume(), { once: true });
    document.addEventListener('keydown',     () => AudioManager.resume(), { once: true });
  });
})();
