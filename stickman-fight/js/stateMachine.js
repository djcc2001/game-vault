/**
 * stateMachine.js — Stickman Fight Legends Pro
 * Generic FSM used by each Fighter.
 */

class StateMachine {
  constructor(initialState, transitions) {
    this.current     = initialState;
    this.previous    = null;
    this.transitions = transitions;
    this.listeners   = {};
  }

  getState() { return this.current; }
  is(...states) { return states.includes(this.current); }

  transition(nextState) {
    const allowed = this.transitions[this.current];
    if (!allowed || !allowed.includes(nextState)) return false;
    this.previous = this.current;
    this.current  = nextState;
    if (this.listeners[nextState]) this.listeners[nextState](this.previous);
    if (this.listeners['*'])       this.listeners['*'](nextState, this.previous);
    return true;
  }

  force(state) {
    this.previous = this.current;
    this.current  = state;
    if (this.listeners[state]) this.listeners[state](this.previous);
    if (this.listeners['*'])   this.listeners['*'](state, this.previous);
  }

  on(state, cb) { this.listeners[state] = cb; }
}

// ── FIGHTER STATE TRANSITION TABLE ────────────────────────────
// jump→jump allows double jump (guarded by jumpsLeft counter in Fighter)
// fall→jump allows double jump from fall state too
const FIGHTER_TRANSITIONS = {
  idle:    ['run', 'jump', 'attack', 'kick', 'defend', 'special', 'hit', 'ko'],
  run:     ['idle', 'jump', 'attack', 'kick', 'defend', 'special', 'hit', 'ko'],
  jump:    ['jump', 'fall', 'attack', 'kick', 'special', 'hit', 'ko', 'idle'],
  fall:    ['jump', 'idle', 'hit', 'ko'],
  attack:  ['idle', 'hit', 'ko'],
  kick:    ['idle', 'hit', 'ko'],
  defend:  ['idle', 'hit', 'ko'],
  special: ['idle', 'hit', 'ko'],
  hit:     ['idle', 'ko'],
  ko:      [], // terminal — reset via force()
};

function createFighterSM() {
  return new StateMachine('idle', FIGHTER_TRANSITIONS);
}
