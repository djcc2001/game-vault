/**
 * inputHandler.js
 * Maneja toda la entrada de teclado del juego.
 * Registra estado de teclas presionadas para Jugador 1 y Jugador 2.
 * No depende de ningún otro módulo.
 */

const InputHandler = (() => {
  // Estado de teclas: true = presionada, false = soltada
  const keys = {};

  // Teclas de menú (flank navigation)
  let menuListeners = [];

  /**
   * Inicializa listeners globales de teclado
   */
  function init() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }

  function onKeyDown(e) {
    // Prevenir scroll con flechas y espacio
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
    keys[e.code] = true;

    // Notificar listeners de menú
    menuListeners.forEach(fn => fn(e.code, 'down'));
  }

  function onKeyUp(e) {
    keys[e.code] = false;
    menuListeners.forEach(fn => fn(e.code, 'up'));
  }

  /**
   * Registra un callback para eventos de tecla (usado en menús)
   * @param {Function} fn - (code, type) => void
   * @returns {Function} función para desregistrar
   */
  function addMenuListener(fn) {
    menuListeners.push(fn);
    return () => {
      menuListeners = menuListeners.filter(l => l !== fn);
    };
  }

  /**
   * Elimina todos los listeners de menú activos
   */
  function clearMenuListeners() {
    menuListeners = [];
  }

  // ─── Estado Jugador 1 ───────────────────────────────────────
  // W S A D F
  const P1 = {
    get forward()  { return !!keys['KeyW']; },
    get backward() { return !!keys['KeyS']; },
    get left()     { return !!keys['KeyA']; },
    get right()    { return !!keys['KeyD']; },
    get shoot()    { return !!keys['KeyF']; }
  };

  // ─── Estado Jugador 2 ───────────────────────────────────────
  // ArrowUp ArrowDown ArrowLeft ArrowRight K
  const P2 = {
    get forward()  { return !!keys['ArrowUp']; },
    get backward() { return !!keys['ArrowDown']; },
    get left()     { return !!keys['ArrowLeft']; },
    get right()    { return !!keys['ArrowRight']; },
    get shoot()    { return !!keys['KeyK']; }
  };

  // ─── Teclas globales ────────────────────────────────────────
  const Global = {
    get pause()    { return !!keys['Escape'] || !!keys['KeyP']; },
    get enter()    { return !!keys['Enter']; },
    get space()    { return !!keys['Space']; }
  };

  /**
   * Verifica si una tecla específica está presionada
   * @param {string} code - KeyboardEvent.code
   */
  function isDown(code) {
    return !!keys[code];
  }

  /**
   * Limpia estado de todas las teclas
   */
  function clearAll() {
    Object.keys(keys).forEach(k => { keys[k] = false; });
  }

  /**
   * Convierte código de tecla a carácter para entrada de texto
   * @param {string} code
   * @returns {string|null}
   */
  function getChar(code) {
    const keyMap = {
      'KeyA': 'A', 'KeyB': 'B', 'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E',
      'KeyF': 'F', 'KeyG': 'G', 'KeyH': 'H', 'KeyI': 'I', 'KeyJ': 'J',
      'KeyK': 'K', 'KeyL': 'L', 'KeyM': 'M', 'KeyN': 'N', 'KeyO': 'O',
      'KeyP': 'P', 'KeyQ': 'Q', 'KeyR': 'R', 'KeyS': 'S', 'KeyT': 'T',
      'KeyU': 'U', 'KeyV': 'V', 'KeyW': 'W', 'KeyX': 'X', 'KeyY': 'Y',
      'KeyZ': 'Z',
      'Digit0': '0', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3',
      'Digit4': '4', 'Digit5': '5', 'Digit6': '6', 'Digit7': '7',
      'Digit8': '8', 'Digit9': '9',
      'Space': ' ', 'Minus': '-', 'Equal': '=', 'BracketLeft': '[',
      'BracketRight': ']', 'Semicolon': ';', 'Quote': "'", 'Backquote': '`',
      'Comma': ',', 'Period': '.', 'Slash': '/', 'Backslash': '\\',
      'Numpad0': '0', 'Numpad1': '1', 'Numpad2': '2', 'Numpad3': '3',
      'Numpad4': '4', 'Numpad5': '5', 'Numpad6': '6', 'Numpad7': '7',
      'Numpad8': '8', 'Numpad9': '9'
    };
    return keyMap[code] || null;
  }

  return {
    init,
    addMenuListener,
    clearMenuListeners,
    clearAll,
    isDown,
    getChar,
    P1,
    P2,
    Global
  };
})();
