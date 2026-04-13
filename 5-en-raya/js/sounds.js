/**
 * sounds.js — Sonidos sintéticos clásicos generados con Web Audio API
 * + reproducción de audio MP3 para background
 */
const Sounds = (() => {
  let _ctx = null;  // AudioContext
  let _enabled = true;
  let _bgOsc = null;
  let _bgGain = null;
  let _bgAudio = null;
  let _bgAudioElement = null;

  // ── INICIALIZACIÓN ───────────────────────────────────
  const _getCtx = () => {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') {
      _ctx.resume();
    }
    return _ctx;
  };

  // ── UTILIDAD: Tono simple ─────────────────────────────
  const _playTone = (freq, duration, type = 'square', volume = 0.08) => {
    if (!_enabled) return;
    try {
      const ctx = _getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* silenciar errores */ }
  };

  // ── UTILIDAD: Tono con deslizamiento ──────────────────
  const _playSweep = (freqStart, freqEnd, duration, type = 'sine', volume = 0.06) => {
    if (!_enabled) return;
    try {
      const ctx = _getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // ── UTILIDAD: Ruido corto ─────────────────────────────
  const _playNoise = (duration, volume = 0.04) => {
    if (!_enabled) return;
    try {
      const ctx = _getCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * volume;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      // Filtro paso bajo para sonido más suave
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(ctx.currentTime);
    } catch (e) {}
  };

  // ═══════════════════════════════════════════════════════
  // SONIDOS PÚBLICOS
  // ═══════════════════════════════════════════════════════

  // Click en botón del menú - más satisfactorio
  const click = () => {
    _playTone(1200, 0.04, 'sine', 0.08);
    setTimeout(() => _playTone(800, 0.03, 'sine', 0.04), 30);
  };

  // Hover en botón - sonido sutil
  const hover = () => {
    if (!_enabled) return;
    _playTone(600, 0.05, 'sine', 0.03);
  };

  // Selección de modo
  const select = () => {
    _playTone(500, 0.1, 'sine', 0.08);
    setTimeout(() => _playTone(800, 0.1, 'sine', 0.06), 80);
  };

  // Colocar ficha (piedra sobre madera) - más satisfactorio
  const placeStone = () => {
    _playNoise(0.035, 0.12);
    _playTone(280, 0.08, 'sine', 0.15);
    setTimeout(() => _playTone(180, 0.06, 'sine', 0.08), 30);
  };

  // Ficha de IA (ligeramente diferente)
  const aiPlaceStone = () => {
    _playNoise(0.025, 0.1);
    _playTone(260, 0.1, 'sine', 0.12);
    setTimeout(() => _playTone(160, 0.08, 'sine', 0.06), 40);
  };

  // Victoria - más épica
  const victory = () => {
    const notes = [523, 659, 784, 1047, 1318, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => _playTone(freq, 0.4, 'sine', 0.12), i * 120);
    });
    setTimeout(() => {
      _playNoise(0.3, 0.15);
    }, 600);
  };

  // Empate
  const draw = () => {
    _playTone(400, 0.2, 'sine', 0.06);
    setTimeout(() => _playTone(350, 0.3, 'sine', 0.06), 150);
  };

  // Derrota
  const defeat = () => {
    _playSweep(400, 200, 0.4, 'sine', 0.07);
    setTimeout(() => _playSweep(300, 150, 0.5, 'sine', 0.06), 200);
  };

  // Inicio de partida
  const startGame = () => {
    const notes = [440, 554, 659]; // A4, C#5, E5
    notes.forEach((freq, i) => {
      setTimeout(() => _playTone(freq, 0.15, 'square', 0.05), i * 80);
    });
  };

  // Error (click inválido)
  const error = () => {
    _playTone(150, 0.15, 'sawtooth', 0.04);
  };

  // Background con archivo MP3
  const startBackground = () => {
    if (!_enabled) return;
    
    if (_bgAudioElement) {
      _bgAudioElement.play().catch(() => {});
      return;
    }

    try {
      _bgAudioElement = new Audio('assets/audio/background.mp3');
      _bgAudioElement.loop = true;
      _bgAudioElement.volume = 0.02;
      _bgAudioElement.play().catch(() => {});
    } catch (e) {}
  };

  const stopBackground = () => {
    if (_bgAudioElement) {
      _bgAudioElement.pause();
      _bgAudioElement.currentTime = 0;
      _bgAudioElement = null;
    }
    if (_bgOsc) {
      try { _bgOsc.stop(); } catch (e) {}
      _bgOsc = null;
    }
  };

  const setEnabled = (val) => {
    _enabled = val;
    if (!val) stopBackground();
    else startBackground();
  };

  return Object.freeze({
    click, hover, select, placeStone, aiPlaceStone,
    victory, draw, defeat, startGame, error,
    startBackground, stopBackground, setEnabled,
  });
})();
