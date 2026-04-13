/**
 * stateMachine.js
 * Máquina de estados del juego.
 * Estados: menu | modeSelect | difficultySelect | mapSelect |
 *          instructions | stats | credits | countdown | playing | paused | gameOver
 *
 * Separa estrictamente la lógica de estados del render y del gameplay.
 */

const StateMachine = (() => {

  // Estado actual
  let state = 'menu';
  let prevState = null;

  // Callbacks registrados por estado
  const handlers = {};

  // Datos de transición
  let transitionAlpha = 0;
  let transitionDir   = 0; // 1 = fade out, -1 = fade in
  let transitionTarget = null;
  let transitionCallback = null;

  // ─── Menú principal ──────────────────────────────────────────
  let menuSelectedIndex = 0;
  const MENU_ITEMS = [
    { label: 'JUGAR',          state: 'modeSelect',       color: '#00ff41' },
    { label: 'INSTRUCCIONES',  state: 'instructions',     color: '#00eeff' },
    { label: 'ESTADISTICAS',   state: 'stats',            color: '#ffe600' },
    { label: 'CREDITOS',       state: 'credits',          color: '#ff4081' }
  ];

  // ─── Selección de modo ───────────────────────────────────────
  let modeSelectedIndex = 0;
  const MODES = ['vs_cpu', 'vs_player', 'survival'];

  // ─── Selección de dificultad ─────────────────────────────────
  let diffSelectedIndex = 1; // medio por defecto
  const DIFF_LEVELS = ['easy', 'medium', 'hard'];

  // ─── Selección de mapa ───────────────────────────────────────
  let mapSelectedIndex = 0;

  // ─── Pausa ───────────────────────────────────────────────────
  let pauseSelectedIndex = 0;

  // ─── Game Over ───────────────────────────────────────────────
  let gameOverSelectedIndex = 0;
  let gameOverData = { winnerText: '', winnerColor: '#ffffff' };

  // ─── Opciones elegidas ───────────────────────────────────────
  let selectedMode = 'vs_cpu';
  let selectedMap  = 0;
  let player1Name = 'JUGADOR 1';
  let player2Name = 'JUGADOR 2';

  /**
   * Registra un handler para un estado específico
   * @param {string} stateName
   * @param {Object} obj - { enter?, exit?, update?, render? }
   */
  function register(stateName, obj) {
    handlers[stateName] = obj;
  }

  /**
   * Transición a un nuevo estado
   * @param {string} newState
   * @param {Object} data - datos opcionales para pasar al nuevo estado
   */
  function transition(newState, data = {}) {
    prevState = state;

    // Llamar exit del estado actual
    if (handlers[state] && handlers[state].exit) {
      handlers[state].exit();
    }

    state = newState;

    // Llamar enter del nuevo estado
    if (handlers[state] && handlers[state].enter) {
      handlers[state].enter(data);
    }
  }

  /**
   * Actualiza el estado actual (llamado cada frame)
   * @param {number} dt
   */
  function update(dt) {
    if (handlers[state] && handlers[state].update) {
      handlers[state].update(dt);
    }
  }

  /**
   * Renderiza el estado actual (llamado cada frame)
   * @param {CanvasRenderingContext2D} ctx
   */
  function render(ctx) {
    if (handlers[state] && handlers[state].render) {
      handlers[state].render(ctx);
    }
  }

  /**
   * Obtiene el estado actual
   */
  function getState() { return state; }
  function getPrevState() { return prevState; }

  /**
   * Getters / Setters para datos de menú
   */
  function getMenuSelectedIndex()    { return menuSelectedIndex; }
  function getModeSelectedIndex()    { return modeSelectedIndex; }
  function getDiffSelectedIndex()    { return diffSelectedIndex; }
  function getMapSelectedIndex()     { return mapSelectedIndex; }
  function getPauseSelectedIndex()   { return pauseSelectedIndex; }
  function getGameOverSelectedIndex(){ return gameOverSelectedIndex; }
  function getMenuItems()            { return MENU_ITEMS; }
  function getSelectedMode()         { return selectedMode; }
  function getSelectedMap()          { return selectedMap; }
  function getPlayer1Name()          { return player1Name; }
  function getPlayer2Name()          { return player2Name; }
  function getGameOverData()         { return gameOverData; }

  function setMenuSelected(i)     { menuSelectedIndex    = i; }
  function setModeSelected(i)     { modeSelectedIndex    = i; selectedMode = MODES[i]; }
  function setDiffSelected(i)     { diffSelectedIndex    = i; DifficultyManager.set(DIFF_LEVELS[i]); }
  function setMapSelected(i)      { mapSelectedIndex     = i; selectedMap = i; }
  function setPlayer1Name(n)      { player1Name = n; }
  function setPlayer2Name(n)      { player2Name = n; }
  function setPauseSelected(i)    { pauseSelectedIndex   = i; }
  function setGameOverSelected(i) { gameOverSelectedIndex = i; }
  function setGameOverData(data)  { gameOverData = data; }

  function getMenuLength()    { return MENU_ITEMS.length; }
  function getModeLength()    { return MODES.length; }
  function getDiffLength()    { return DIFF_LEVELS.length; }
  function getMapLength()     { return MapManager.getMapCount(); }
  function getPauseLength()   { return 2; }
  function getGameOverLength(){ return 2; }

  return {
    register,
    transition,
    update,
    render,
    getState,
    getPrevState,
    getMenuSelectedIndex, getModeSelectedIndex, getDiffSelectedIndex,
    getMapSelectedIndex, getPauseSelectedIndex, getGameOverSelectedIndex,
    setMenuSelected, setModeSelected, setDiffSelected,
    setMapSelected, setPauseSelected, setGameOverSelected,
    setGameOverData,
    getMenuItems, getSelectedMode, getSelectedMap, getGameOverData,
    getMenuLength, getModeLength, getDiffLength,
    getMapLength, getPauseLength, getGameOverLength
  };
})();
