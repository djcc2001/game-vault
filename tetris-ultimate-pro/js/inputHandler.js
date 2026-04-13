/* ===== INPUT HANDLER ===== */
const InputHandler = (() => {
  const keys = {};
  const handlers = {};

  document.addEventListener('keydown', e => {
    if (!keys[e.code]) {
      keys[e.code] = true;
      if (handlers[e.code]) handlers[e.code](e);
    }
    e.preventDefault && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code) && e.preventDefault();
  });

  document.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  function on(code, cb) { handlers[code] = cb; }
  function off(code)     { delete handlers[code]; }
  function isDown(code)  { return !!keys[code]; }
  function clear()       { Object.keys(handlers).forEach(k => delete handlers[k]); Object.keys(keys).forEach(k => delete keys[k]); }

  return { on, off, isDown, clear };
})();

// DAS (Delayed Auto-Shift) — tap = move once immediately, hold = repeat after delay
class DASHandler {
  constructor(dasDelay = 150, dasRepeat = 50) {
    this.dasDelay  = dasDelay;  // ms before auto-repeat kicks in
    this.dasRepeat = dasRepeat; // ms between repeat moves
    this.timer   = {};
    this.repeat  = {};
    this.fired   = {}; // did we fire the first immediate move?
  }

  update(dt, p1Callback, p2Callback) {
    // p1Callback = flechas (jugador de flechas / jugador único)
    // p2Callback = WASD   (segundo jugador en versus)
    this._check('ArrowLeft',  dt, () => p1Callback('left'));
    this._check('ArrowRight', dt, () => p1Callback('right'));
    this._check('ArrowDown',  dt, () => p1Callback('softDrop'));
    this._check('KeyA',       dt, () => p2Callback && p2Callback('left'));
    this._check('KeyD',       dt, () => p2Callback && p2Callback('right'));
    this._check('KeyS',       dt, () => p2Callback && p2Callback('softDrop'));
  }

  _check(code, dt, cb) {
    if (!InputHandler.isDown(code)) {
      // Key released — reset all state
      this.timer[code]  = 0;
      this.repeat[code] = false;
      this.fired[code]  = false;
      return;
    }

    // First frame the key is down: fire immediately (single tap feel)
    if (!this.fired[code]) {
      this.fired[code]  = true;
      this.timer[code]  = 0;
      this.repeat[code] = false;
      cb();
      return;
    }

    // After first fire: wait dasDelay before entering auto-repeat
    if (!this.repeat[code]) {
      this.timer[code] += dt;
      if (this.timer[code] >= this.dasDelay) {
        this.repeat[code] = true;
        this.timer[code]  = 0;
        cb();
      }
    } else {
      // Auto-repeat at dasRepeat interval
      this.timer[code] += dt;
      if (this.timer[code] >= this.dasRepeat) {
        this.timer[code] = 0;
        cb();
      }
    }
  }

  reset() {
    this.timer  = {};
    this.repeat = {};
    this.fired  = {};
  }
}
