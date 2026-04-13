/**
 * inputHandler.js
 * Manages keyboard and gamepad input for all players.
 */
const InputHandler = (() => {
  /** @type {Set<string>} */
  const _keys = new Set();
  /** @type {Set<string>} */
  const _justPressed = new Set();
  /** @type {Set<string>} */
  const _justReleased = new Set();

  // --- Event Listeners ---
  window.addEventListener('keydown', (e) => {
    const k = e.code;
    if (!_keys.has(k)) _justPressed.add(k);
    _keys.add(k);
    // Prevent scrolling for game keys
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlRight','Enter'].includes(k)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.code;
    _keys.delete(k);
    _justReleased.add(k);
  });

  /** Call once per frame AFTER all input checks */
  function flush() {
    _justPressed.clear();
    _justReleased.clear();
  }

  /** Is key currently held? */
  function isHeld(code) { return _keys.has(code); }
  /** Was key pressed this frame? */
  function wasPressed(code) { return _justPressed.has(code); }
  /** Was key released this frame? */
  function wasReleased(code) { return _justReleased.has(code); }

  /**
   * Returns normalised input axes and action states for a given player slot.
   * @param {1|2} slot
   * @returns {{ dx:number, dy:number, fire:boolean, special:boolean }}
   */
  function getPlayerInput(slot) {
    if (slot === 1) {
      return {
        dx: (isHeld('KeyD') ? 1 : 0) - (isHeld('KeyA') ? 1 : 0),
        dy: (isHeld('KeyS') ? 1 : 0) - (isHeld('KeyW') ? 1 : 0),
        fire:    isHeld('Space'),
        special: wasPressed('KeyQ'),
      };
    }
    if (slot === 2) {
      return {
        dx: (isHeld('ArrowRight') ? 1 : 0) - (isHeld('ArrowLeft') ? 1 : 0),
        dy: (isHeld('ArrowDown')  ? 1 : 0) - (isHeld('ArrowUp')   ? 1 : 0),
        fire:    isHeld('ControlRight'),
        special: wasPressed('ShiftRight'),
      };
    }
    return { dx: 0, dy: 0, fire: false, special: false };
  }

  return { flush, isHeld, wasPressed, wasReleased, getPlayerInput };
})();
