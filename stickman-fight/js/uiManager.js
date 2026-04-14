/**
 * uiManager.js
 * Stickman Fight Legends Pro
 *
 * Manages DOM screen transitions, character select UI,
 * arena select UI, stats display, and HUD updates.
 */

const UIManager = (() => {

  // ── SCREEN MANAGEMENT ────────────────────────────────────────
  let currentScreen = 'main-menu';

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.add('active');
    currentScreen = id;
  }

  // ── ARENA PREVIEWS (drawn with CSS gradients as data URIs) ───
  const ARENAS = [
    {
      key: 'lava',
      name: 'Arena Lava',
      bg: 'linear-gradient(180deg, #1a0000 0%, #3d0000 40%, #7b1a00 70%, #b84500 100%)',
      accent: '#ff6b35',
    },
    {
      key: 'neon',
      name: 'Arena Neón',
      bg: 'linear-gradient(180deg, #0a001a 0%, #150033 40%, #1a0044 70%, #0d0022 100%)',
      accent: '#f72585',
    },
    {
      key: 'temple',
      name: 'Arena Templo',
      bg: 'linear-gradient(180deg, #001a0a 0%, #002a0a 40%, #003a15 70%, #004a1a 100%)',
      accent: '#52b788',
    },
    {
      key: 'space',
      name: 'Arena Espacial',
      bg: 'linear-gradient(180deg, #000010 0%, #00001a 40%, #000028 70%, #000010 100%)',
      accent: '#4cc9f0',
    },
  ];

  function buildArenaGrid(selectedKey, onSelect) {
    const grid = document.getElementById('arena-grid');
    grid.innerHTML = '';
    ARENAS.forEach(arena => {
      const btn = document.createElement('div');
      btn.className = 'arena-btn' + (arena.key === selectedKey ? ' selected' : '');
      btn.dataset.key = arena.key;
      btn.innerHTML = `
        <canvas class="arena-mini-canvas" width="300" height="90"></canvas>
        <span class="arena-label" style="color:${arena.accent}">${arena.name}</span>
      `;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.arena-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onSelect(arena.key);
      });
      grid.appendChild(btn);

      // Draw mini preview on the canvas
      const miniCanvas = btn.querySelector('.arena-mini-canvas');
      _drawArenaPreview(miniCanvas, arena.key);
    });
  }

  function _drawArenaPreview(canvas, arenaKey) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const gY = H * 0.72;

    // Reuse same drawing logic as game but scaled to mini canvas
    switch (arenaKey) {
      case 'lava':   _miniLava(ctx, W, H, gY);   break;
      case 'neon':   _miniNeon(ctx, W, H, gY);   break;
      case 'temple': _miniTemple(ctx, W, H, gY); break;
      case 'space':  _miniSpace(ctx, W, H, gY);  break;
    }
  }

  function _miniLava(ctx, W, H, gY) {
    const sky = ctx.createLinearGradient(0,0,0,gY);
    sky.addColorStop(0,'#1a0000'); sky.addColorStop(1,'#5a1000');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,gY);
    // rocks
    ctx.fillStyle = '#2a0500';
    [[0.15,0.55],[0.5,0.4],[0.82,0.5]].forEach(([rx,ry]) => {
      ctx.beginPath(); ctx.ellipse(W*rx,H*ry,W*0.07,H*0.18,0,0,Math.PI*2); ctx.fill();
    });
    // lava
    const lava = ctx.createLinearGradient(0,gY,0,H);
    lava.addColorStop(0,'#ff4500'); lava.addColorStop(1,'#440000');
    ctx.fillStyle = lava; ctx.fillRect(0,gY,W,H-gY);
    ctx.strokeStyle = '#ff4500'; ctx.lineWidth = 2;
    ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0,gY); ctx.lineTo(W,gY); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function _miniNeon(ctx, W, H, gY) {
    ctx.fillStyle = '#050010'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = 'rgba(247,37,133,0.2)'; ctx.lineWidth = 1;
    const vp = {x:W*0.5, y:gY*0.5};
    for (let i=0;i<=8;i++) {
      ctx.beginPath(); ctx.moveTo(vp.x,vp.y); ctx.lineTo(W*(i/8),gY); ctx.stroke();
    }
    ctx.fillStyle = '#10003a'; ctx.fillRect(0,gY,W,H-gY);
    ctx.strokeStyle = '#f72585'; ctx.lineWidth = 2;
    ctx.shadowColor = '#f72585'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0,gY); ctx.lineTo(W,gY); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f72585'; ctx.font = `bold ${W*0.08}px Impact`;
    ctx.textAlign = 'center'; ctx.globalAlpha = 0.5;
    ctx.fillText('FIGHT', W*0.5, gY*0.5);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  function _miniTemple(ctx, W, H, gY) {
    const sky = ctx.createLinearGradient(0,0,0,gY);
    sky.addColorStop(0,'#030f0a'); sky.addColorStop(1,'#0a3d25');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,gY);
    ctx.fillStyle = '#0a2a18';
    [[0.1],[0.3],[0.7],[0.9]].forEach(([rx]) => {
      ctx.fillRect(W*rx-6, gY*0.25, 12, gY*0.75);
    });
    ctx.strokeStyle = '#0d3d22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(W*0.5, gY*0.35, W*0.22, Math.PI, 0); ctx.stroke();
    const floor = ctx.createLinearGradient(0,gY,0,H);
    floor.addColorStop(0,'#1a3325'); floor.addColorStop(1,'#0a1a10');
    ctx.fillStyle = floor; ctx.fillRect(0,gY,W,H-gY);
    ctx.strokeStyle = '#52b788'; ctx.lineWidth = 2;
    ctx.shadowColor = '#52b788'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0,gY); ctx.lineTo(W,gY); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function _miniSpace(ctx, W, H, gY) {
    ctx.fillStyle = '#00000a'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff';
    for (let i=0;i<40;i++) {
      ctx.globalAlpha = Math.random()*0.8+0.2;
      ctx.beginPath(); ctx.arc(Math.random()*W, Math.random()*gY, Math.random()*1.2+0.2,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#7209b7'; ctx.shadowBlur = 12;
    const pg = ctx.createRadialGradient(W*0.82,H*0.18,2,W*0.82,H*0.18,W*0.1);
    pg.addColorStop(0,'#7209b7'); pg.addColorStop(1,'#0d0020');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(W*0.82,H*0.18,W*0.09,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0a2a'; ctx.fillRect(0,gY,W,H-gY);
    ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = 2;
    ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0,gY); ctx.lineTo(W,gY); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── CHARACTER SELECT ─────────────────────────────────────────

  // Preview canvases — one per player
  const previewCanvases = {};
  const previewRAFs     = {};

  function buildCharSelect(selectedKeys, onSelect) {
    [1, 2].forEach(pNum => {
      const list = document.querySelector(`.char-list[data-player="${pNum}"]`);
      list.innerHTML = '';
      CHARACTER_KEYS.forEach(key => {
        const char = CHARACTERS[key];
        const btn  = document.createElement('div');
        btn.className = 'char-btn' + (selectedKeys[pNum] === key ? ' selected' : '');
        btn.dataset.key = key;
        btn.innerHTML = `
          <span class="char-dot" style="background:${char.color};color:${char.color}"></span>
          ${char.name}
        `;
        btn.addEventListener('click', () => {
          list.querySelectorAll('.char-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          onSelect(pNum, key);
          updateCharInfo(pNum, key);
          _startCharPreview(pNum, key);
        });
        list.appendChild(btn);
      });
      updateCharInfo(pNum, selectedKeys[pNum]);
      _startCharPreview(pNum, selectedKeys[pNum]);
    });
  }

  function updateCharInfo(pNum, key) {
    const char = CHARACTERS[key];
    const info = document.getElementById(`p${pNum}-info`);
    const statLabels = ['Poder', 'Vel.', 'Def.', 'Agil.'];
    const colors = ['#e63946', '#4cc9f0', '#52b788', '#f4a261'];
    info.innerHTML = `
      <canvas class="char-preview-canvas" id="char-prev-${pNum}" width="160" height="180"></canvas>
      <p class="char-desc" style="color:${char.color}">${char.description}</p>
      ${char.stats.map((v, i) => `
        <div class="stat-row">
          <span>${statLabels[i]}</span>
          <div class="stat-bar-wrap">
            <div class="stat-bar-fill" style="width:${v*10}%;background:${colors[i]}"></div>
          </div>
        </div>
      `).join('')}
    `;
    // re-attach canvas ref and restart preview
    previewCanvases[pNum] = document.getElementById(`char-prev-${pNum}`);
    _startCharPreview(pNum, key);
  }

  function _startCharPreview(pNum, charKey) {
    if (previewRAFs[pNum]) cancelAnimationFrame(previewRAFs[pNum]);
    const canvas = document.getElementById(`char-prev-${pNum}`);
    if (!canvas) return;
    previewCanvases[pNum] = canvas;

    // Create a dummy fighter for preview rendering
    const dummy = new Fighter('prev', charKey, 80, 160, true);
    dummy.sm.force('idle');
    let angle = 0;

    function renderPreview(ts) {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Dark bg with subtle glow
      ctx.fillStyle = 'rgba(10,10,20,0.95)';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.shadowColor = dummy.stats.color;
      ctx.shadowBlur  = 40;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = dummy.stats.color;
      ctx.beginPath(); ctx.arc(80, 120, 60, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Idle bob animation
      angle += 0.03;
      const bob = Math.sin(angle) * 4;
      dummy.pos.x = 80;
      dummy.pos.y = 155 + bob;
      dummy.animAngle = angle;
      // Alternate between idle and a pose
      if (Math.floor(angle / Math.PI) % 4 === 2) {
        dummy.sm.force('attack');
        dummy.attackFrame = 0.5;
      } else {
        dummy.sm.force('idle');
        dummy.attackFrame = 0;
      }
      dummy.impactFlash = 0;
      dummy.shieldAlpha = 0;
      dummy.jumpSquish  = 1;
      dummy.facingRight  = true;

      dummy.draw(ctx);

      // Name label
      ctx.save();
      ctx.font = `bold 13px 'Bebas Neue', Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = dummy.stats.color;
      ctx.shadowColor = dummy.stats.color; ctx.shadowBlur = 10;
      ctx.fillText(dummy.stats.name.toUpperCase(), 80, 18);
      ctx.restore();

      previewRAFs[pNum] = requestAnimationFrame(renderPreview);
    }
    previewRAFs[pNum] = requestAnimationFrame(renderPreview);
  }

  function stopAllPreviews() {
    Object.values(previewRAFs).forEach(id => cancelAnimationFrame(id));
  }

  // ── HUD UPDATES ──────────────────────────────────────────────
  let lastP1Combo = 0;
  let lastP2Combo = 0;

  function updateHUD(p1, p2, round, timer, mode, p1Rounds, p2Rounds) {
    // Names
    document.getElementById('hud-p1-name').textContent = p1.stats.name;
    document.getElementById('hud-p1-name').style.color = p1.stats.color;
    document.getElementById('hud-p2-name').textContent = mode === 'pvc' ? 'CPU' : p2.stats.name;
    document.getElementById('hud-p2-name').style.color = p2.stats.color;

    // HP bars
    const p1HpPct = Math.max(0, (p1.hp / p1.maxHp) * 100);
    const p2HpPct = Math.max(0, (p2.hp / p2.maxHp) * 100);
    document.getElementById('hud-p1-hp').style.width = p1HpPct + '%';
    document.getElementById('hud-p2-hp').style.width = p2HpPct + '%';

    const p1HpEl = document.getElementById('hud-p1-hp');
    const p2HpEl = document.getElementById('hud-p2-hp');
    p1HpEl.style.background = p1HpPct < 25 ? '#e63946' : `linear-gradient(90deg,${p1.stats.color},#f4a261)`;
    p2HpEl.style.background = p2HpPct < 25 ? '#e63946' : `linear-gradient(90deg,${p2.stats.color},#f4a261)`;

    // Energy bars
    document.getElementById('hud-p1-energy').style.width = ((p1.energy / p1.maxEnergy) * 100) + '%';
    document.getElementById('hud-p2-energy').style.width = ((p2.energy / p2.maxEnergy) * 100) + '%';

    // Round win dots
    const makeWinDots = (wins, color) =>
      [0,1].map(i => `<span class="win-dot ${i < wins ? 'filled' : ''}" style="${i < wins ? `background:${color};box-shadow:0 0 6px ${color}` : ''}"></span>`).join('');
    const p1DotsEl = document.getElementById('hud-p1-wins');
    const p2DotsEl = document.getElementById('hud-p2-wins');
    if (p1DotsEl) p1DotsEl.innerHTML = makeWinDots(p1Rounds || 0, p1.stats.color);
    if (p2DotsEl) p2DotsEl.innerHTML = makeWinDots(p2Rounds || 0, p2.stats.color);

    // Round + Timer
    document.getElementById('hud-round').textContent = `ROUND ${round}`;
    const timerEl = document.getElementById('hud-timer');
    timerEl.textContent = Math.ceil(timer);
    timerEl.classList.toggle('urgent', timer <= 10);

    // Combo counters
    _updateComboDisplay('hud-combo-p1', p1.comboCount, p1.stats.color, p1.isInCombo);
    _updateComboDisplay('hud-combo-p2', p2.comboCount, p2.stats.color, p2.isInCombo);
  }

  function _updateComboDisplay(elId, count, color, active) {
    let el = document.getElementById(elId);
    if (!el) {
      el = document.createElement('div');
      el.id = elId;
      el.className = 'combo-counter';
      document.getElementById('hud-overlay').appendChild(el);
    }

    if (count >= 2 && active) {
      el.innerHTML = `<span class="combo-count" style="color:${color};text-shadow:0 0 20px ${color}">${count}</span><span class="combo-label">HITS!</span>`;
      el.classList.add('active');
      el.classList.toggle('mega', count >= 5);
    } else {
      el.classList.remove('active', 'mega');
    }
  }

  // ── ROUND ANNOUNCE ───────────────────────────────────────────
  function showRoundAnnounce(text, duration = 1.5) {
    return new Promise(resolve => {
      const el = document.getElementById('round-announce');
      const isPerfect = text === 'PERFECT!';
      const color = isPerfect ? '#ffd60a' : text === 'K.O!' ? '#e63946' : '#ffffff';
      el.innerHTML = `<span class="round-announce-text" style="color:${color};text-shadow:0 0 40px ${color},0 0 80px ${color}">${text}</span>`;
      el.classList.remove('hidden');
      setTimeout(() => {
        el.classList.add('hidden');
        el.innerHTML = '';
        resolve();
      }, duration * 1000);
    });
  }

  function showKO() {
    const el = document.getElementById('ko-announce');
    el.innerHTML = `<span class="ko-text">KO!</span>`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2000);
  }

  // ── ROUND OVER SCREEN ────────────────────────────────────────
  function showRoundOver(winnerName, p1Rounds, p2Rounds) {
    document.getElementById('round-winner-text').textContent = `${winnerName} gana el Round!`;
    document.getElementById('round-scores').textContent = `${p1Rounds} – ${p2Rounds}`;
    showScreen('round-over');
  }

  // ── MATCH OVER SCREEN ────────────────────────────────────────
  function showMatchOver(winnerName, p1Rounds, p2Rounds) {
    document.getElementById('match-winner-text').textContent = `¡${winnerName} es el Campeón!`;
    document.getElementById('final-scores').textContent = `${p1Rounds} – ${p2Rounds}`;
    showScreen('match-over');
  }

  // ── STATS SCREEN ─────────────────────────────────────────────
  function renderStats(stats) {
    const el = document.getElementById('stats-display');
    el.innerHTML = `
      <div class="stat-entry">
        <span class="stat-label" style="color:var(--c-p1)">Victorias J1</span>
        <span class="stat-value">${stats.winsPlayer1 || 0}</span>
      </div>
      <div class="stat-entry">
        <span class="stat-label" style="color:var(--c-p2)">Victorias J2</span>
        <span class="stat-value">${stats.winsPlayer2 || 0}</span>
      </div>
      <div class="stat-entry">
        <span class="stat-label" style="color:#aaa">Victorias CPU</span>
        <span class="stat-value">${stats.winsCPU || 0}</span>
      </div>
    `;
  }

  // ── SCREEN SHAKE ─────────────────────────────────────────────
  function screenShake() {
    const canvas = document.getElementById('game-canvas');
    canvas.classList.remove('screen-shake');
    void canvas.offsetWidth; // force reflow
    canvas.classList.add('screen-shake');
    canvas.addEventListener('animationend', () => canvas.classList.remove('screen-shake'), { once: true });
  }

  // ── PUBLIC API ────────────────────────────────────────────────
  return {
    showScreen,
    buildArenaGrid,
    buildCharSelect,
    updateCharInfo,
    updateHUD,
    showRoundAnnounce,
    showKO,
    showRoundOver,
    showMatchOver,
    renderStats,
    screenShake,
    stopAllPreviews,
    ARENAS,
  };
})();
