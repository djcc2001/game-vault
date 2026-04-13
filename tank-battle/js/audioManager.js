/**
 * audioManager.js
 * Gestiona todos los sonidos del juego usando Web Audio API.
 * Genera audio sintético estilo 8-bit con osciladores.
 */

const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  let musicOscillators = [];
  let musicPlaying = false;
  let enabled = true;
  let bgMusic = null;
  let menuMusicTimer = null;

  const NOTES = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61,
    G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
    G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25
  };

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.35, ctx.currentTime);
      masterGain.connect(ctx.destination);
    } catch (e) {
      enabled = false;
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function playTone(freq, type = 'square', vol = 0.3, attack = 0.01,
                    decay = 0.1, sustain = 0.5, release = 0.1, duration = 0.3) {
    if (!enabled || !ctx) return;
    resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(vol, now + attack);
    gainNode.gain.linearRampToValueAtTime(vol * sustain, now + attack + decay);
    gainNode.gain.setValueAtTime(vol * sustain, now + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  function playShoot() {
    if (!enabled || !ctx) return;
    resume();
    playTone(880, 'square', 0.25, 0.001, 0.05, 0.1, 0.05, 0.12);
    playTone(440, 'square', 0.15, 0.001, 0.08, 0.1, 0.05, 0.15);
  }

  function playExplosion() {
    if (!enabled) return;
    resume();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = ctx.createGain();
    const now = ctx.currentTime;
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.4);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  function playEngineStart() {
    if (!enabled || !ctx) return () => {};
    resume();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    osc.start();
    return function stop() {
      try {
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.15);
      } catch (e) {}
    };
  }

  function playMenuClick() {
    if (!enabled || !ctx) return;
    resume();
    playTone(660, 'square', 0.15, 0.001, 0.02, 0.8, 0.05, 0.08);
    playTone(880, 'square', 0.1, 0.001, 0.02, 0.8, 0.05, 0.06);
  }

  function playMenuSelect() {
    if (!enabled || !ctx) return;
    resume();
    const notes = [523, 659, 784];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 'square', 0.2, 0.001, 0.05, 0.5, 0.05, 0.1), i * 60);
    });
  }

  function playBounce() {
    if (!enabled || !ctx) return;
    resume();
    playTone(220, 'triangle', 0.15, 0.001, 0.05, 0.3, 0.05, 0.1);
  }

  function playVictory() {
    if (!enabled) return;
    resume();
    if (!ctx) return;
    const melody = [523, 659, 784, 1047, 1319];
    melody.forEach((f, i) => {
      setTimeout(() => playTone(f, 'square', 0.3, 0.01, 0.05, 0.6, 0.1, 0.25), i * 120);
    });
  }

  function playDefeat() {
    if (!enabled) return;
    resume();
    if (!ctx) return;
    const melody = [400, 350, 300, 250];
    melody.forEach((f, i) => {
      setTimeout(() => playTone(f, 'triangle', 0.3, 0.01, 0.05, 0.5, 0.1, 0.3), i * 150);
    });
  }

  function startMenuMusic() {
    if (!enabled || musicPlaying) return;
    resume();
    musicPlaying = true;

    if (bgMusic) { bgMusic.pause(); bgMusic = null; }
    if (menuMusicTimer) { clearTimeout(menuMusicTimer); menuMusicTimer = null; }

    const bpm = 90;
    const beat = 60 / bpm;
    const melody = ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'E4'];
    let step = 0;
    const noteFreqs = {
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
      'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
      'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25
    };

    function playNextNote() {
      if (!musicPlaying || !ctx) return;
      const freq = noteFreqs[melody[step % melody.length]];
      if (freq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
        gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + beat * 0.5);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + beat * 0.9);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + beat);
      }
      step++;
      menuMusicTimer = setTimeout(() => playNextNote(), beat * 1000);
    }

    playNextNote();
  }

  function stopMenuMusic() {
    musicPlaying = false;
    if (menuMusicTimer) { clearTimeout(menuMusicTimer); menuMusicTimer = null; }
    if (bgMusic) { bgMusic.pause(); bgMusic = null; }
  }

  function startMusic() {
    if (!enabled || musicPlaying) return;
    resume();
    musicPlaying = true;
    if (bgMusic) { bgMusic.pause(); bgMusic = null; }
    bgMusic = new Audio('assets/music/background.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.075;
    bgMusic.play().catch(err => { musicPlaying = false; });
  }

  function stopMusic() {
    musicPlaying = false;
    musicOscillators.forEach(id => clearInterval(id));
    musicOscillators = [];
    if (bgMusic) { bgMusic.pause(); bgMusic = null; }
  }

  function toggle() {
    enabled = !enabled;
    if (masterGain) {
      masterGain.gain.setValueAtTime(enabled ? 0.35 : 0, ctx.currentTime);
    }
    return enabled;
  }

  function isEnabled() { return enabled; }

  return {
    init, resume, playShoot, playExplosion, playEngineStart,
    playMenuClick, playMenuSelect, playBounce, playVictory, playDefeat,
    startMusic, stopMusic, startMenuMusic, stopMenuMusic, toggle, isEnabled
  };
})();
