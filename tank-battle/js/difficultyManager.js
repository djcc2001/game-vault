/**
 * difficultyManager.js
 * Gestiona los parámetros de dificultad del juego.
 * Afecta: precisión IA, tiempo de reacción, velocidad de disparo, cantidad enemigos.
 */

const DifficultyManager = (() => {

  // Presets de dificultad
  const PRESETS = {
    easy: {
      label: 'FACIL',
      color: '#00ff41',
      // IA parámetros
      accuracy:      0.45,   // 0-1, qué tan preciso apunta la IA
      reactionTime:  0.6,    // segundos entre decisiones
      shootDelay:    1.2,    // cooldown de disparo IA
      evadeRadius:   60,     // radio para detectar balas amenazantes
      // Supervivencia
      waveEnemies:   1,      // enemigos por oleada
      waveDelay:     8,      // segundos entre oleadas
      // Tanques CPU
      cpuShootCooldown: 0.9, // sobreescribe cooldown del tanque CPU
      // Velocidad CPU (multiplicador)
      speedMultiplier: 0.75
    },
    medium: {
      label: 'MEDIO',
      color: '#ffe600',
      accuracy:      0.70,
      reactionTime:  0.35,
      shootDelay:    0.75,
      evadeRadius:   90,
      waveEnemies:   2,
      waveDelay:     6,
      cpuShootCooldown: 0.65,
      speedMultiplier: 1.0
    },
    hard: {
      label: 'DIFICIL',
      color: '#ff1744',
      accuracy:      0.92,
      reactionTime:  0.12,
      shootDelay:    0.45,
      evadeRadius:   130,
      waveEnemies:   3,
      waveDelay:     4,
      cpuShootCooldown: 0.4,
      speedMultiplier: 1.2
    }
  };

  let current = 'medium';

  /**
   * Establece la dificultad actual
   * @param {'easy'|'medium'|'hard'} level
   */
  function set(level) {
    if (PRESETS[level]) current = level;
  }

  /**
   * Obtiene los parámetros de dificultad actuales
   * @returns {Object}
   */
  function getParams() {
    return { ...PRESETS[current], level: current };
  }

  /**
   * Obtiene el nivel actual como string
   * @returns {string}
   */
  function getLevel() { return current; }

  /**
   * Obtiene todos los presets (para UI)
   * @returns {Object}
   */
  function getPresets() { return PRESETS; }

  /**
   * Cicla al siguiente nivel de dificultad
   * @returns {string} nuevo nivel
   */
  function next() {
    const levels = Object.keys(PRESETS);
    const idx = levels.indexOf(current);
    current = levels[(idx + 1) % levels.length];
    return current;
  }

  return { set, getParams, getLevel, getPresets, next };
})();
