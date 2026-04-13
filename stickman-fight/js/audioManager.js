/**
 * audioManager.js
 * Stickman Fight Legends Pro
 *
 * All audio is SYNTHETIC — uses Web Audio API only.
 * No mp3 / external files.
 */

const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  let musicNodes = []; // active music oscillators
  let musicPlaying = false;
  let bgMusicAudio = null; // For .mp3 game music

  /** Lazy-init AudioContext on first user interaction */
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }

  /** Resume if suspended (browser autoplay policy) */
  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ─── HELPERS ─────────────────────────────────────────────────
  function osc(type, freq, startTime, duration, gainPeak = 0.4, dest = masterGain) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    o.connect(g); g.connect(dest);
    o.start(startTime); o.stop(startTime + duration + 0.05);
    return { osc: o, gain: g };
  }

  function noise(duration, gainPeak = 0.3, dest = masterGain) {
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainPeak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(g); g.connect(dest);
    src.start(t); src.stop(t + duration + 0.05);
  }

  // ─── SOUND EFFECTS ───────────────────────────────────────────
  const sounds = {

    /** Quick punchy hit */
    hit() {
      const t = ctx.currentTime;
      osc('square', 180, t, 0.12, 0.5);
      osc('sawtooth', 90, t + 0.01, 0.10, 0.3);
      noise(0.08, 0.25);
    },

    /** Stronger hit */
    heavyHit() {
      const t = ctx.currentTime;
      osc('square', 100, t, 0.2, 0.7);
      osc('sawtooth', 55, t + 0.02, 0.18, 0.4);
      noise(0.15, 0.4);
    },

    /** Block / defense */
    shield() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(600, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.3);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(masterGain);
      o.start(t); o.stop(t + 0.35);
    },

    /** Special power release */
    special() {
      const t = ctx.currentTime;
      osc('sawtooth', 220, t, 0.05, 0.6);
      osc('sine', 440, t + 0.05, 0.4, 0.5);
      osc('triangle', 880, t + 0.1, 0.35, 0.3);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(800, t + 0.1);
      o.frequency.exponentialRampToValueAtTime(100, t + 0.5);
      g.gain.setValueAtTime(0.4, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g); g.connect(masterGain);
      o.start(t + 0.1); o.stop(t + 0.6);
    },

    /** Projectile impact */
    projectileHit() {
      const t = ctx.currentTime;
      noise(0.18, 0.5);
      osc('square', 200, t, 0.18, 0.4);
      osc('sine', 120, t + 0.05, 0.15, 0.35);
    },

    /** Jump whoosh */
    jump() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(500, t + 0.15);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(masterGain);
      o.start(t); o.stop(t + 0.2);
    },

    /** Landing thud */
    land() {
      const t = ctx.currentTime;
      osc('sine', 80, t, 0.1, 0.4);
      noise(0.06, 0.15);
    },

    /** KO fanfare */
    ko() {
      const t = ctx.currentTime;
      // Big boom
      noise(0.3, 0.8);
      osc('sawtooth', 50, t, 0.4, 0.9);
      // descending pitches
      [440, 330, 220, 110].forEach((f, i) => {
        osc('square', f, t + 0.3 + i * 0.1, 0.15, 0.4);
      });
    },

    /** Round start beep */
    roundStart() {
      const t = ctx.currentTime;
      [600, 600, 900].forEach((f, i) => {
        osc('square', f, t + i * 0.2, 0.12, 0.35);
      });
    },

    /** Countdown tick */
    tick() {
      const t = ctx.currentTime;
      osc('sine', 880, t, 0.06, 0.2);
    },

    /** Energy recharge ping */
    energyFull() {
      const t = ctx.currentTime;
      osc('sine', 660, t, 0.08, 0.2);
      osc('sine', 990, t + 0.08, 0.1, 0.2);
    },
  };

  // ─── ARCADE MUSIC LOOP ────────────────────────────────────────
  /**
   * Simple pentatonic arp loop using OscillatorNodes + Scheduler.
   * Not a file — pure oscillators.
   */
  const MELODY = [261.6, 329.6, 392, 523.2, 392, 329.6, 261.6, 196];
  const BASS   = [65.4, 65.4, 98, 98, 73.4, 73.4, 87.3, 87.3];
  const BPM    = 140;
  const BEAT   = 60 / BPM;
  let scheduleAhead = 0.1;
  let nextNoteTime = 0;
  let noteIdx = 0;
  let musicTimerId = null;

  function scheduleMusicNote() {
    while (nextNoteTime < ctx.currentTime + scheduleAhead) {
      const t = nextNoteTime;

      // melody
      const mo = ctx.createOscillator();
      const mg = ctx.createGain();
      mo.type = 'square';
      mo.frequency.value = MELODY[noteIdx % MELODY.length];
      mg.gain.setValueAtTime(0.08, t);
      mg.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.8);
      mo.connect(mg); mg.connect(masterGain);
      mo.start(t); mo.stop(t + BEAT);

      // bass every 2 notes
      if (noteIdx % 2 === 0) {
        const bo = ctx.createOscillator();
        const bg = ctx.createGain();
        bo.type = 'triangle';
        bo.frequency.value = BASS[Math.floor(noteIdx / 2) % BASS.length];
        bg.gain.setValueAtTime(0.12, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 1.6);
        bo.connect(bg); bg.connect(masterGain);
        bo.start(t); bo.stop(t + BEAT * 2);
      }

      // hi-hat
      {
        const hbuf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
        const hd = hbuf.getChannelData(0);
        for (let i = 0; i < hd.length; i++) hd[i] = Math.random() * 2 - 1;
        const hs = ctx.createBufferSource();
        hs.buffer = hbuf;
        const hg = ctx.createGain();
        hg.gain.setValueAtTime(0.04, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        hs.connect(hg); hg.connect(masterGain);
        hs.start(t);
      }

      nextNoteTime += BEAT;
      noteIdx++;
    }
  }

  function startMusic() {
    if (musicPlaying) return;
    init(); resume();
    musicPlaying = true;
    nextNoteTime = ctx.currentTime;
    noteIdx = 0;
    musicTimerId = setInterval(scheduleMusicNote, 25);
  }

  function stopMusic() {
    if (!musicPlaying) return;
    musicPlaying = false;
    clearInterval(musicTimerId);
  }

  // ─── MP3 BACKGROUND MUSIC FOR GAME ───────────────────────────────
  function startGameMusic() {
    if (bgMusicAudio) return;
    
    bgMusicAudio = new Audio('assets/music/background.mp3');
    bgMusicAudio.loop = true;
    bgMusicAudio.volume = 0.10;
    bgMusicAudio.playbackRate = 0.85;
    
    init(); resume();
    
    var playPromise = bgMusicAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('>>> MP3 playing!');
      }).catch(error => {
        console.log('>>> MP3 play error:', error);
      });
    }
  }

  function stopGameMusic() {
    if (bgMusicAudio) {
      bgMusicAudio.pause();
      bgMusicAudio = null;
    }
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  return {
    init,
    resume,
    startMusic,
    stopMusic,
    startGameMusic,
    stopGameMusic,
    isMenuMusicPlaying: () => musicPlaying,
    play(name) {
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (sounds[name]) sounds[name]();
    },
    setVolume(v) {
      if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
    },
  };
})();
