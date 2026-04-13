/**
 * audioManager.js
 * Manages all game audio using Web Audio API with procedural synthesis.
 * Falls back gracefully when Audio files are absent.
 */
const AudioManager = (() => {
  let _ctx = null;
  let _masterGain = null;
  let _bgmNode = null;
  let _enabled = true;
  let _audioElement = null;

  function _getCtx() {
    if (!_ctx) {
      try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();
        _masterGain = _ctx.createGain();
        _masterGain.gain.value = 0.4;
        _masterGain.connect(_ctx.destination);
      } catch(e) { _enabled = false; }
    }
    return _ctx;
  }

  /** Resume context on user gesture */
  function resume() {
    const c = _getCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  /** Play a synthesised laser sound */
  function playLaser(pitch = 880) {
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.3, ctx.currentTime + 0.12);
    env.gain.setValueAtTime(0.25, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(env); env.connect(_masterGain);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  }

  /** Play a synthesised explosion */
  function playExplosion(size = 1) {
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;
    const bufSize = ctx.sampleRate * 0.4;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400 + size * 300;
    const env = ctx.createGain();
    env.gain.setValueAtTime(size * 0.5, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    src.connect(filter); filter.connect(env); env.connect(_masterGain);
    src.start(); src.stop(ctx.currentTime + 0.45);
  }

  /** Play a level-up jingle */
  function playLevelUp() {
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.3, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(env); env.connect(_masterGain);
      osc.start(t); osc.stop(t + 0.25);
    });
  }

  /** Looping background music (mp3 file) */
  function playBGM(isBoss = false, level = 1) {
    stopBGM();
    if (!_enabled) return;
    
    if (!_audioElement) {
      _audioElement = new Audio('assets/audio/background.mp3');
      _audioElement.loop = true;
    }
    _audioElement.volume = isBoss ? 0.12 : 0.05;
    _audioElement.playbackRate = 0.7 + (level - 1) * 0.1;
    _audioElement.play().catch(() => {});
    _bgmNode = { stop: () => { if (_audioElement) { _audioElement.pause(); _audioElement.currentTime = 0; } } };
  }

  /** Calm menu background music */
  function playMenuBGM() {
    stopBGM();
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;

    const baseNotes = [261, 293, 329, 392, 329, 293];
    const bpm = 60;
    const step = 60 / bpm;
    const volume = 0.08;
    let _active = true;
    let _beatIdx = 0;
    let _nextTime = ctx.currentTime;

    function scheduleBeats() {
      if (!_active) return;
      while (_nextTime < ctx.currentTime + 0.4) {
        const freq = baseNotes[_beatIdx % baseNotes.length];
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(volume, _nextTime);
        env.gain.exponentialRampToValueAtTime(0.001, _nextTime + step * 0.9);
        osc.connect(env); env.connect(_masterGain);
        osc.start(_nextTime); osc.stop(_nextTime + step);
        _nextTime += step;
        _beatIdx++;
      }
      if (_active) setTimeout(scheduleBeats, 150);
    }
    scheduleBeats();
    _bgmNode = { stop: () => { _active = false; } };
  }

  function stopBGM() {
    if (_bgmNode) { _bgmNode.stop(); _bgmNode = null; }
  }

  function playGameOver() {
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;
    const notes = [330, 294, 262, 196];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.25;
      env.gain.setValueAtTime(0.3, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(env); env.connect(_masterGain);
      osc.start(t); osc.stop(t + 0.45);
    });
  }

  function playVictory() {
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;
    const melody = [523,659,784,880,1047,880,784,659,523];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.14;
      env.gain.setValueAtTime(0.3, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(env); env.connect(_masterGain);
      osc.start(t); osc.stop(t + 0.25);
    });
  }

  /** Short blip for menu hover */
  function playMenuHover() {
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.05);
    env.gain.setValueAtTime(0.08, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(env); env.connect(_masterGain);
    osc.start(); osc.stop(ctx.currentTime + 0.07);
  }

  /** Confirm/beep for menu selection */
  function playMenuSelect() {
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.06);
    env.gain.setValueAtTime(0.15, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(env); env.connect(_masterGain);
    osc.start(); osc.stop(ctx.currentTime + 0.13);
  }

  /** Sound for opening menus (pause, etc) */
  function playMenuOpen() {
    if (!_enabled) return;
    const ctx = _getCtx(); if (!ctx) return;
    const notes = [330, 440];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.08;
      env.gain.setValueAtTime(0.2, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(env); env.connect(_masterGain);
      osc.start(t); osc.stop(t + 0.16);
    });
  }

  function setVolume(v) {
    if (_masterGain) _masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  return { resume, playLaser, playExplosion, playLevelUp, playBGM, playMenuBGM, stopBGM, playGameOver, playVictory, playMenuHover, playMenuSelect, playMenuOpen, setVolume };
})();
