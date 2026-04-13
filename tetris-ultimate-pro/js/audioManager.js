/* ===== AUDIO MANAGER — MP3 background + procedural FX ===== */
const AudioManager = (() => {
  let ctx = null;
  let muted = false;
  let currentLevel = 1;
  let bgMusic = null;
  let menuMusic = null;

  function init() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function playNote(freq, type, duration, vol = 0.1, delay = 0) {
    init(); resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  /* SFX procedurales */
  const SOUNDS = {
    rotate: () => playNote(440, 'square', 0.08, 0.12),
    move: () => playNote(280, 'square', 0.04, 0.08),
    drop: () => playNote(150, 'sawtooth', 0.15, 0.15),
    line_clear: () => [330, 440, 550].forEach((f, i) => playNote(f, 'square', 0.1, 0.1, i * 0.05)),
    combo: () => [523, 659, 784, 1047].forEach((f, i) => playNote(f, 'square', 0.15, 0.12, i * 0.08)),
    level_up: () => [392, 523, 659, 784].forEach((f, i) => playNote(f, 'triangle', 0.2, 0.15, i * 0.1)),
    game_over: () => [440, 349, 330, 294, 262, 220].forEach((f, i) => playNote(f, 'sawtooth', 0.2, 0.15, i * 0.18))
  };

  function play(name) {
    if (muted) return;
    const fn = SOUNDS[name];
    if (fn) fn();
  }

  function playClick() {
    if (muted) return;
    init(); resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  function playHover() {
    if (muted) return;
    init(); resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  function setLevel(lvl) {
    currentLevel = lvl;
    if (bgMusic && !muted) {
      const speed = 0.7 + (lvl - 1) * 0.03;
      bgMusic.playbackRate = Math.min(speed, 1.3);
    }
  }

  function startBg() {
    if (muted) return;
    init(); resume();
    if (!bgMusic) {
      bgMusic = new Audio('assets/audio/background.mp3');
      bgMusic.preload = 'auto';
      bgMusic.loop = true;
    }
    bgMusic.currentTime = 0;
    bgMusic.playbackRate = 0.7;
    bgMusic.volume = 0.05;
    bgMusic.play().catch(() => {});
  }

  function stopBg() {
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
  }

  function pauseBg() {
    if (bgMusic) bgMusic.pause();
  }

  function resumeBg() {
    if (muted) return;
    init(); resume();
    if (bgMusic) bgMusic.play().catch(() => {});
  }

  const MENU_NOTES = [261.63, 311.13, 392, 523.25, 392, 311.13];
  const MENU_INTERVAL = 800;
  
  function startMenuBg() {
    if (muted) return;
    init(); resume();
    if (menuMusic) clearInterval(menuMusic);
    let idx = 0;
    const playPad = () => {
      const freq = MENU_NOTES[idx % MENU_NOTES.length];
      playNote(freq, 'sine', 0.6, 0.06, 0);
      playNote(freq * 1.5, 'triangle', 0.6, 0.03, 0);
      idx++;
    };
    menuMusic = setInterval(playPad, MENU_INTERVAL);
    playPad();
  }

  function stopMenuBg() {
    if (menuMusic) {
      clearInterval(menuMusic);
      menuMusic = null;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      pauseBg();
      stopMenuBg();
    } else {
      resumeBg();
      startMenuBg();
    }
    return muted;
  }

  function isMuted() { return muted; }

  return {
    play,
    playClick,
    playHover,
    setLevel,
    startBg,
    stopBg,
    pauseBg,
    resumeBg,
    startMenuBg,
    stopMenuBg,
    toggleMute,
    isMuted
  };
})();