/**
 * levelManager.js
 * Defines the 5-level progression and enemy wave generation.
 */
const LevelManager = (() => {
  const MAX_LEVELS = 5;

  /**
   * Configuration for each level.
   * waves: array of wave configs. Each wave = array of enemy spawn configs.
   */
  const LEVEL_CONFIGS = [
    // Level 1 – Introduction
    {
      level: 1,
      title: 'SECTOR ALFA',
      bgColor: '#020510',
      nebulaColor: '#001a44',
      enemyTypes: ['basic'],
      wavesCount: 3,
      enemiesPerWave: 5,
      minScore: 0,
      isBossLevel: false,
    },
    // Level 2 – Faster enemies
    {
      level: 2,
      title: 'NEBULOSA ROJA',
      bgColor: '#100208',
      nebulaColor: '#3a0010',
      enemyTypes: ['basic', 'fast'],
      wavesCount: 5,
      enemiesPerWave: 7,
      minScore: 800,
      isBossLevel: false,
    },
    // Level 3 – Heavy + diagonal
    {
      level: 3,
      title: 'CAMPO DE ASTEROIDES',
      bgColor: '#050a00',
      nebulaColor: '#0a2000',
      enemyTypes: ['basic', 'fast', 'heavy', 'diagonal'],
      wavesCount: 7,
      enemiesPerWave: 8,
      minScore: 2000,
      isBossLevel: false,
    },
    // Level 4 – Dense waves
    {
      level: 4,
      title: 'FRONTERA OSCURA',
      bgColor: '#08000f',
      nebulaColor: '#1a0030',
      enemyTypes: ['fast', 'heavy', 'diagonal'],
      wavesCount: 9,
      enemiesPerWave: 10,
      minScore: 4000,
      isBossLevel: false,
    },
    // Level 5 – Boss
    {
      level: 5,
      title: 'NÚCLEO IMPERIAL',
      bgColor: '#0a0005',
      nebulaColor: '#2a0020',
      enemyTypes: ['basic', 'fast', 'heavy'],
      wavesCount: 7,
      enemiesPerWave: 10,
      minScore: 7000,
      isBossLevel: true,
    },
  ];

  let _currentLevel   = 1;
  let _currentWave    = 0;
  let _waveSpawned    = false;
  let _config         = LEVEL_CONFIGS[0];

  function reset() {
    _currentLevel  = 1;
    _currentWave   = 0;
    _waveSpawned   = false;
    _config        = LEVEL_CONFIGS[0];
  }

  function getCurrentConfig() { return _config; }
  function getCurrentLevel()  { return _currentLevel; }
  function getCurrentWave()   { return _currentWave; }
  function isMaxLevel()       { return _currentLevel > MAX_LEVELS; }
  function isBossLevel()      { return _config.isBossLevel; }
  function getTotalWaves()    { return _config.wavesCount; }
  function getMinScore()      { return _config.minScore; }
  function checkScoreRequirement(score) { return score >= _config.minScore; }

  function repeatLevel() {
    _currentWave = 0;
    _waveSpawned = false;
    _config = LEVEL_CONFIGS[_currentLevel - 1];
  }

  /**
   * Advance to next wave. Returns true if we moved to next level.
   * @returns {{ nextLevel:boolean, bossWave:boolean }}
   */
  function advanceWave() {
    _currentWave++;
    _waveSpawned = false;

    const bossWave = _config.isBossLevel && _currentWave === _config.wavesCount;

    if (_currentWave > _config.wavesCount) {
      // Advance level
      _currentLevel++;
      if (_currentLevel > MAX_LEVELS) return { nextLevel: true, bossWave: false };
      _config      = LEVEL_CONFIGS[_currentLevel - 1];
      _currentWave = 1;
      return { nextLevel: true, bossWave };
    }
    return { nextLevel: false, bossWave };
  }

  /**
   * Generate the enemy spawn list for the current wave.
   * @param {number} canvasW
   * @returns {Enemy[]}
   */
  function spawnWave(canvasW) {
    if (_waveSpawned) return [];
    _waveSpawned = true;

    const cfg   = _config;
    const count = cfg.enemiesPerWave;
    const types = cfg.enemyTypes;
    const level = _currentLevel;
    const cols  = Math.min(count, 8);
    const spacing = canvasW / (cols + 1);

    const enemies = [];
    for (let i = 0; i < count; i++) {
      const col      = i % cols;
      const row      = Math.floor(i / cols);
      const typeIdx  = Math.floor(Math.random() * types.length);
      const type     = types[typeIdx];
      const x        = spacing * (col + 1);
      const y        = -60 - row * 70;

      enemies.push(new Enemy({ x, y, type, level }));
    }
    return enemies;
  }

  /**
   * Generate boss entity for level 5.
   * @param {number} canvasW
   * @returns {Boss}
   */
  function spawnBoss(canvasW) {
    return new Boss({ x: canvasW / 2, y: -100, level: _currentLevel });
  }

  function startLevel(level) {
    _currentLevel = Math.min(Math.max(1, level), MAX_LEVELS);
    _currentWave  = 0;
    _waveSpawned  = false;
    _config       = LEVEL_CONFIGS[_currentLevel - 1];
  }

  return {
    reset, getCurrentConfig, getCurrentLevel, getCurrentWave, isMaxLevel,
    isBossLevel, getTotalWaves, advanceWave, spawnWave, spawnBoss, startLevel,
    getMinScore, checkScoreRequirement, repeatLevel,
    MAX_LEVELS,
  };
})();
