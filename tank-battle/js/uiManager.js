/**
 * uiManager.js
 * Todo el renderizado de UI: menús, HUD, overlays.
 * Dibuja exclusivamente en canvas (sin DOM en cada frame).
 */

const UIManager = (() => {

  let canvas = null;
  let ctx    = null;
  let tick_  = 0;   // contador de frames para animaciones

  // ─── Paleta neón ─────────────────────────────────────────────
  const C = {
    green:  '#00ff41', cyan:   '#00eeff', yellow: '#ffe600',
    orange: '#ff6600', red:    '#ff1744', blue:   '#2979ff',
    pink:   '#ff4081', white:  '#ffffff', dark:   '#050a0e',
    panel:  '#0a1520'
  };

  function init(c) { canvas = c; ctx = c.getContext('2d'); }
  function tick()  { tick_++; }

  // ═══════════════════════════════════════════════════════════════
  //  PRIMITIVAS
  // ═══════════════════════════════════════════════════════════════

  function px(n) { return Math.round(n); }

  function drawText(text, x, y, size, color, align='center', glow=true) {
    ctx.save();
    ctx.font         = `${size}px 'Press Start 2P', monospace`;
    ctx.textAlign    = align;
    ctx.textBaseline = 'middle';
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 14; }
    ctx.fillStyle = color;
    ctx.fillText(text, px(x), px(y));
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawButton(text, x, y, w, h, selected, color=C.green) {
    ctx.save();
    const pulse = selected ? (Math.sin(tick_ * 0.09) * 0.25 + 0.75) : 0.45;

    if (selected) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
    ctx.strokeStyle = selected ? color : color + '55';
    ctx.lineWidth   = selected ? 2 : 1;
    ctx.strokeRect(px(x - w/2), px(y - h/2), w, h);

    ctx.fillStyle = color + (selected ? '1e' : '0a');
    ctx.fillRect(px(x - w/2), px(y - h/2), w, h);

    // Esquinas pixel
    if (selected) {
      ctx.fillStyle = color;
      const cs = 4;
      [[x-w/2,y-h/2],[x+w/2-cs,y-h/2],[x-w/2,y+h/2-cs],[x+w/2-cs,y+h/2-cs]]
        .forEach(([bx,by]) => ctx.fillRect(px(bx), px(by), cs, cs));
    }

    ctx.shadowBlur = 0;
    drawText(
      selected ? `> ${text} <` : `  ${text}  `,
      x, y, 10, selected ? color : color + 'aa', 'center', false
    );
    ctx.restore();
  }

  function drawBackground(bg='#050a0e', grid='rgba(0,255,65,0.04)') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = grid;
    for (let x = 0; x < canvas.width; x += 32)
      for (let y = 0; y < canvas.height; y += 32)
        ctx.fillRect(x, y, 1, 1);
  }

  function drawSeparator(cx, y, w, color) {
    ctx.save();
    ctx.strokeStyle  = color + '55';
    ctx.lineWidth    = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px(cx - w/2), px(y));
    ctx.lineTo(px(cx + w/2), px(y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawDecorTank(x, y, angle, color) {
    ctx.save();
    ctx.translate(px(x), px(y));
    ctx.rotate(angle);
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color;
    ctx.fillRect(-16,-14,32,5); ctx.fillRect(-16,9,32,5);  // orugas
    ctx.fillRect(-12,-9,24,18);                              // cuerpo
    ctx.fillRect(-5,-5,10,10);                               // torreta
    ctx.fillRect(5,-2,14,4);                                 // cañón
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  MENÚ PRINCIPAL
  // ═══════════════════════════════════════════════════════════════

  function drawMainMenu(selectedIndex, items) {
    const cw = canvas.width, ch = canvas.height;
    const cx = cw/2, cy = ch/2;
    drawBackground();

    // Tanques decorativos animados
    const a = tick_ * 0.014;
    drawDecorTank(80,  80,           a,         C.green);
    drawDecorTank(cw-80, 80,        -a,         C.cyan);
    drawDecorTank(80,  ch-80,        a+Math.PI, C.yellow);
    drawDecorTank(cw-80, ch-80,     -a+Math.PI, C.pink);

    // Líneas horizontales decorativas
    const la = (Math.sin(tick_*0.03)*0.3+0.7).toFixed(2);
    ctx.save();
    ctx.strokeStyle = `rgba(0,255,65,${la})`;
    ctx.lineWidth = 1;
    [cy-138, cy+168].forEach(y => {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke();
    });
    ctx.restore();

    // Título
    const tp = Math.sin(tick_*0.05) * 2;
    ctx.save();
    ctx.shadowColor = C.yellow; ctx.shadowBlur = 28 + tp*4;
    drawText('TANK BATTLE', cx, cy-106, 22, C.yellow, 'center', false);
    ctx.shadowColor = C.orange; ctx.shadowBlur = 22;
    drawText('ARENA', cx, cy-72, 30, C.orange, 'center', false);
    ctx.shadowBlur = 0;
    ctx.restore();
    drawText('RETRO  EDITION', cx, cy-42, 9, C.cyan);
    drawSeparator(cx, cy-20, 340, C.green);

    // Botones
    items.forEach((item, i) => {
      drawButton(item.label, cx, cy+8 + i*42, 310, 34, i===selectedIndex, item.color||C.green);
    });

    drawText('(C) 2025  TANK BATTLE STUDIO', cx, ch-12, 6, C.green+'44');
  }

  // ═══════════════════════════════════════════════════════════════
  //  SELECCIÓN DE MODO
  // ═══════════════════════════════════════════════════════════════

  function drawModeSelect(selectedIndex) {
    drawBackground('#050810','rgba(0,238,255,0.04)');
    const cx = canvas.width/2, cy = canvas.height/2;
    drawText('MODO DE JUEGO', cx, cy-148, 13, C.cyan);
    drawSeparator(cx, cy-126, 400, C.cyan);

    const modes = [
      { label:'VS CPU',         desc:'1 jugador vs inteligencia artificial', color:C.green  },
      { label:'VS JUGADOR',     desc:'2 jugadores en el mismo teclado',      color:C.cyan   },
      { label:'SUPERVIVENCIA',  desc:'Oleadas infinitas de tanques enemigos', color:C.pink  }
    ];
    modes.forEach((m,i) => {
      const by = cy - 50 + i*80;
      drawButton(m.label, cx, by, 350, 44, i===selectedIndex, m.color);
      if (i===selectedIndex)
        drawText(m.desc, cx, by+30, 7, m.color+'cc');
    });

    drawText('[W/S] NAVEGAR   [F] SELECCIONAR   [ESC] VOLVER', cx, canvas.height-22, 6, C.green+'77');
  }

  // ═══════════════════════════════════════════════════════════════
  //  SELECCIÓN DE DIFICULTAD
  // ═══════════════════════════════════════════════════════════════

  function drawDifficultySelect(selectedIndex) {
    drawBackground('#080510','rgba(255,64,129,0.04)');
    const cx = canvas.width/2, cy = canvas.height/2;
    drawText('DIFICULTAD', cx, cy-148, 13, C.pink);
    drawSeparator(cx, cy-126, 400, C.pink);

    const diffs = [
      { label:'FACIL',   desc:'IA lenta, pocos enemigos, ideal para aprender', color:C.green  },
      { label:'MEDIO',   desc:'Balance entre desafio y accesibilidad',           color:C.yellow },
      { label:'DIFICIL', desc:'IA rapida y precisa, reflejos de acero',          color:C.red    }
    ];
    diffs.forEach((d,i) => {
      const by = cy - 50 + i*80;
      drawButton(d.label, cx, by, 350, 44, i===selectedIndex, d.color);
      if (i===selectedIndex) drawText(d.desc, cx, by+30, 7, d.color+'cc');

      // Estrellas de dificultad
      for (let s=0; s<3; s++) {
        ctx.save();
        ctx.fillStyle = s<=i ? d.color : d.color+'33';
        if (s<=i) { ctx.shadowColor=d.color; ctx.shadowBlur=6; }
        ctx.fillRect(px(cx-195+s*16), px(by-6), 12, 12);
        ctx.shadowBlur=0;
        ctx.restore();
      }
    });

    drawText('[W/S] NAVEGAR   [F] SELECCIONAR   [ESC] VOLVER', cx, canvas.height-22, 6, C.green+'77');
  }

  // ═══════════════════════════════════════════════════════════════
  //  SELECCIÓN DE MAPA
  // ═══════════════════════════════════════════════════════════════

  function drawMapSelect(selectedIndex) {
    drawBackground('#060610','rgba(41,121,255,0.04)');
    const cw = canvas.width, ch = canvas.height;
    const cx = cw/2, cy = ch/2;
    drawText('SELECCION DE MAPA', cx, cy-158, 12, C.blue);
    drawSeparator(cx, cy-136, 450, C.blue);

    const maps  = MapManager.getMapDefinitions();
    const descs = [
      'Laberinto con pasillos estrechos',
      'Arena abierta con obstaculos centrales',
      'Mapa simetrico para duelos equilibrados'
    ];
    const colors = [C.green, C.cyan, C.pink];

    maps.forEach((m,i) => {
      const by    = cy - 60 + i * 80;
      const color = colors[i];
      const isSel = i === selectedIndex;

      drawButton(m.name, cx - 80, by, 220, 44, isSel, color);

      // Vista previa miniatura
      const pvx = cx+80, pvy = by-28, pvw=190, pvh=60;
      ctx.save();
      ctx.fillStyle = '#050a0e';
      ctx.fillRect(pvx,pvy,pvw,pvh);
      ctx.strokeStyle = isSel ? color : color+'44';
      ctx.shadowColor = color;
      ctx.shadowBlur  = isSel ? 8 : 0;
      ctx.lineWidth   = 1;
      ctx.strokeRect(pvx,pvy,pvw,pvh);
      ctx.shadowBlur  = 0;

      // Obstáculos escalados
      ctx.fillStyle = color + (isSel ? 'bb' : '55');
      m.obstacles.forEach(o => {
        ctx.fillRect(
          px(pvx + o.nx*pvw), px(pvy + o.ny*pvh),
          Math.max(2, px(o.nw*pvw)), Math.max(2, px(o.nh*pvh))
        );
      });

      // Spawn points
      const spColors = [C.green, C.red, C.cyan, C.yellow];
      m.spawns.forEach((s,si) => {
        ctx.fillStyle = spColors[si%4];
        ctx.fillRect(px(pvx+s.x*pvw-2), px(pvy+s.y*pvh-2), 4, 4);
      });
      ctx.restore();

      if (isSel) drawText(descs[i]||'', cx+80+pvw/2, pvy+pvh+12, 6, color+'bb', 'center', false);
    });

    drawText('[W/S] NAVEGAR   [F] JUGAR   [ESC] VOLVER', cx, ch-22, 6, C.green+'77');
  }

  // ═══════════════════════════════════════════════════════════════
  //  INSTRUCCIONES
  // ═══════════════════════════════════════════════════════════════

  function drawInstructions() {
    drawBackground();
    const cw = canvas.width, ch = canvas.height;
    const cx = cw/2;
    drawText('INSTRUCCIONES', cx, 55, 13, C.yellow);
    drawSeparator(cx, 76, 500, C.yellow);

    const lx = cw*0.27, rx = cw*0.73;

    // Panel J1
    ctx.save();
    ctx.strokeStyle = C.green+'44'; ctx.lineWidth=1;
    ctx.strokeRect(lx-145, 92, 290, 210);
    ctx.restore();
    drawText('JUGADOR 1', lx, 108, 9, C.green);
    const p1c = [['W','Avanzar'],['S','Retroceder'],['A','Girar izq'],['D','Girar der'],['F','DISPARAR']];
    p1c.forEach(([k,a],i) => {
      const y = 138 + i*28;
      ctx.save();
      ctx.font="8px 'Press Start 2P',monospace"; ctx.textBaseline='middle';
      ctx.fillStyle=C.yellow; ctx.textAlign='left'; ctx.fillText(`[${k}]`,lx-125,y);
      ctx.fillStyle=C.green+'cc'; ctx.fillText(a,lx-72,y);
      ctx.restore();
    });

    // Panel J2
    ctx.save();
    ctx.strokeStyle = C.cyan+'44'; ctx.lineWidth=1;
    ctx.strokeRect(rx-145, 92, 290, 210);
    ctx.restore();
    drawText('JUGADOR 2', rx, 108, 9, C.cyan);
    const p2c = [['↑','Avanzar'],['↓','Retroceder'],['←','Girar izq'],['→','Girar der'],['K','DISPARAR']];
    p2c.forEach(([k,a],i) => {
      const y = 138 + i*28;
      ctx.save();
      ctx.font="8px 'Press Start 2P',monospace"; ctx.textBaseline='middle';
      ctx.fillStyle=C.yellow; ctx.textAlign='left'; ctx.fillText(`[${k}]`,rx-125,y);
      ctx.fillStyle=C.cyan+'cc'; ctx.fillText(a,rx-72,y);
      ctx.restore();
    });

    // Reglas
    drawText('REGLAS', cx, 328, 9, C.pink);
    const rules = [
      '* Max 3 balas activas por tanque',
      '* Las balas rebotan 1 vez en las paredes',
      '* Un impacto destruye el tanque',
      '* [ESC / P]  Pausar durante la partida'
    ];
    rules.forEach((r,i) => {
      ctx.save();
      ctx.font="7px 'Press Start 2P',monospace";
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=C.green+'cc';
      ctx.fillText(r, cx, 356+i*22);
      ctx.restore();
    });

    drawText('[F / ESC]  VOLVER AL MENU', cx, ch-22, 7, C.green+'77');
  }

  // ═══════════════════════════════════════════════════════════════
  //  ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════

  function drawStats(stats) {
    drawBackground('#050810','rgba(0,238,255,0.04)');
    const cx = canvas.width/2, ch = canvas.height;
    drawText('ESTADISTICAS', cx, 55, 13, C.cyan);
    drawSeparator(cx, 76, 400, C.cyan);

    ctx.save();
    ctx.strokeStyle = C.cyan+'33'; ctx.lineWidth=1;
    ctx.strokeRect(cx-230, 100, 460, 280);
    ctx.restore();

    const rows = [
      { label:'VICTORIAS  JUGADOR 1', val: stats.winsPlayer1,                       color:C.green  },
      { label:'VICTORIAS  JUGADOR 2', val: stats.winsPlayer2,                       color:C.cyan   },
      { label:'VICTORIAS  CPU',       val: stats.winsCPU,                            color:C.red    },
      { label:'RECORD  SUPERVIVENCIA',val: formatTime(stats.highestSurvivalTime),   color:C.yellow }
    ];
    rows.forEach((r,i) => {
      const y = 148 + i*58;
      ctx.save();
      ctx.font="7px 'Press Start 2P',monospace"; ctx.textBaseline='middle';
      ctx.textAlign='left';  ctx.fillStyle=r.color+'99'; ctx.fillText(r.label, cx-210, y);
      ctx.textAlign='right'; ctx.shadowColor=r.color; ctx.shadowBlur=10;
      ctx.fillStyle=r.color; ctx.font="16px 'Press Start 2P',monospace";
      ctx.fillText(String(r.val), cx+210, y);
      ctx.shadowBlur=0;
      ctx.restore();
      if (i<rows.length-1) drawSeparator(cx, y+28, 440, C.cyan);
    });

    drawText('[F / ESC]  VOLVER AL MENU', cx, ch-22, 7, C.green+'77');
  }

  // ═══════════════════════════════════════════════════════════════
  //  CRÉDITOS
  // ═══════════════════════════════════════════════════════════════

  function drawCredits() {
    drawBackground('#080508','rgba(255,230,0,0.03)');
    const cx = canvas.width/2, ch = canvas.height;
    drawText('CREDITOS', cx, 55, 13, C.yellow);
    drawSeparator(cx, 76, 360, C.yellow);

    const creds = [
      ['PROGRAMACION',    'TANK BATTLE STUDIO'],
      ['GRAFICOS',        'CANVAS 2D API  •  PIXEL ART'],
      ['AUDIO',           'WEB AUDIO API  •  SINTETICO'],
      ['FUENTE PIXEL',    'PRESS START 2P  (GOOGLE FONTS)'],
      ['MOTOR',           'JAVASCRIPT  VANILLA  ES6+']
    ];
    creds.forEach(([role,name],i) => {
      const y = 136 + i*60;
      ctx.save();
      ctx.font="7px 'Press Start 2P',monospace"; ctx.textAlign='center';
      ctx.textBaseline='middle'; ctx.fillStyle=C.green+'88';
      ctx.fillText(role, cx, y);
      ctx.shadowColor=C.yellow; ctx.shadowBlur=8;
      ctx.fillStyle=C.yellow; ctx.font="10px 'Press Start 2P',monospace";
      ctx.fillText(name, cx, y+20);
      ctx.shadowBlur=0;
      ctx.restore();
    });

    drawText('— HECHO CON AMOR Y JAVASCRIPT —', cx, ch-42, 7, C.cyan+'88');
    drawText('[F / ESC]  VOLVER AL MENU', cx, ch-22, 7, C.green+'77');
  }

  // ═══════════════════════════════════════════════════════════════
  //  HUD (durante el juego)
  // ═══════════════════════════════════════════════════════════════

  function drawHUD({ mode, p1, p2, cpus, survivalTime, wave, mapName, waveCountdown }) {
    const cw = canvas.width, ch = canvas.height;

    // ── Panel superior ──────────────────────────────────────────
    ctx.fillStyle = 'rgba(5,10,14,0.88)';
    ctx.fillRect(0, 0, cw, 40);
    ctx.save(); ctx.strokeStyle=C.green+'55'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,40); ctx.lineTo(cw,40); ctx.stroke();
    ctx.restore();

    if (mode === 'survival') {
      // Tiempo
      ctx.save();
      ctx.font="7px 'Press Start 2P',monospace"; ctx.textBaseline='middle';
      ctx.textAlign='left'; ctx.fillStyle=C.yellow+'aa'; ctx.fillText('TIME', 10, 20);
      ctx.restore();
      drawText(formatTime(survivalTime), 72, 20, 9, C.yellow);

      // Oleada (centro)
      drawText(`OLEADA  ${wave}`, cw/2, 20, 10, C.pink);

      // Countdown siguiente oleada
      if (waveCountdown > 0) {
        const txt = `PROX: ${Math.ceil(waveCountdown)}s`;
        drawText(txt, cw/2, 33, 6, C.pink+'aa');
      }

      // CPU vivos
      const alive = cpus ? cpus.filter(c=>c.alive).length : 0;
      ctx.save();
      ctx.font="8px 'Press Start 2P',monospace"; ctx.textBaseline='middle';
      ctx.textAlign='right'; ctx.fillStyle=C.red; ctx.fillText(`CPU:${alive}`, cw-10, 20);
      ctx.restore();

    } else if (mode === 'vs_player') {
      drawText('J1', 22, 20, 8, C.green);
      _tankIcon(52,  20, C.green, p1 && p1.alive);
      drawText('VS', cw/2, 20, 10, C.yellow);
      _tankIcon(cw-52, 20, C.cyan, p2 && p2.alive);
      drawText('J2', cw-22, 20, 8, C.cyan);

    } else {
      drawText('P1', 22, 20, 8, C.green);
      _tankIcon(52,  20, C.green, p1 && p1.alive);
      drawText('VS', cw/2, 20, 10, C.yellow);
      _tankIcon(cw-52, 20, C.red, cpus && cpus[0] && cpus[0].alive);
      drawText('CPU', cw-22, 20, 8, C.red);
    }

    // ── Panel inferior ──────────────────────────────────────────
    ctx.fillStyle = 'rgba(5,10,14,0.72)';
    ctx.fillRect(0, ch-22, cw, 22);
    ctx.save(); ctx.strokeStyle=C.green+'33'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,ch-22); ctx.lineTo(cw,ch-22); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font="6px 'Press Start 2P',monospace"; ctx.textBaseline='middle';
    ctx.textAlign='left';  ctx.fillStyle=C.green+'55'; ctx.fillText(mapName||'', 8, ch-11);
    ctx.textAlign='center';ctx.fillStyle=C.green+'44'; ctx.fillText('[ESC] PAUSA', cw/2, ch-11);
    const dp = DifficultyManager.getPresets(), dl = DifficultyManager.getLevel();
    if (dp[dl]) {
      ctx.textAlign='right'; ctx.fillStyle=dp[dl].color+'77';
      ctx.fillText(dp[dl].label, cw-8, ch-11);
    }
    ctx.restore();
  }

  function _tankIcon(x, y, color, alive) {
    ctx.save();
    ctx.translate(px(x), px(y));
    ctx.globalAlpha  = alive ? 1.0 : 0.2;
    ctx.fillStyle    = color;
    ctx.shadowColor  = color;
    ctx.shadowBlur   = alive ? 6 : 0;
    ctx.fillRect(-10,-8,20,16);
    ctx.fillStyle    = color+'aa';
    ctx.fillRect(-10,-10,20,4); ctx.fillRect(-10,6,20,4);  // orugas
    ctx.fillStyle    = color;
    ctx.fillRect(8,-2,8,4);                                 // cañón
    ctx.shadowBlur   = 0;
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAUSA
  // ═══════════════════════════════════════════════════════════════

  function drawPause(selectedIndex) {
    const cx = canvas.width/2, cy = canvas.height/2;

    // Oscurecer fondo
    ctx.fillStyle = 'rgba(5,10,14,0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Marco
    ctx.save();
    ctx.strokeStyle=C.yellow; ctx.shadowColor=C.yellow; ctx.shadowBlur=22; ctx.lineWidth=2;
    ctx.strokeRect(cx-195, cy-115, 390, 240);
    ctx.shadowBlur=0;
    ctx.restore();

    drawText('— PAUSA —', cx, cy-78, 16, C.yellow);
    drawSeparator(cx, cy-52, 340, C.yellow);

    const opts = ['CONTINUAR', 'MENU PRINCIPAL'];
    opts.forEach((label,i) => {
      drawButton(label, cx, cy-16+i*58, 290, 40, i===selectedIndex, i===0?C.green:C.red);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  GAME OVER
  // ═══════════════════════════════════════════════════════════════

  function drawGameOver(winnerText, winnerColor, selectedIndex) {
    const cx = canvas.width/2, cy = canvas.height/2;
    ctx.fillStyle = 'rgba(5,10,14,0.88)';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    const pulse = Math.sin(tick_*0.07)*6;
    ctx.save();
    ctx.shadowColor=winnerColor; ctx.shadowBlur=34+pulse;
    drawText('GAME OVER', cx, cy-120, 20, winnerColor, 'center', false);
    ctx.shadowBlur=0;
    ctx.restore();

    drawSeparator(cx, cy-88, 420, winnerColor);
    drawText(winnerText, cx, cy-60, 11, C.white);
    drawSeparator(cx, cy-36, 420, winnerColor);

    ctx.save();
    ctx.strokeStyle=winnerColor+'55'; ctx.lineWidth=1;
    ctx.strokeRect(cx-210, cy-90, 420, 200);
    ctx.restore();

    const opts = ['JUGAR DE NUEVO', 'MENU PRINCIPAL'];
    opts.forEach((label,i) => {
      drawButton(label, cx, cy+30+i*54, 310, 40, i===selectedIndex, i===0?C.green:C.red);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  COUNTDOWN
  // ═══════════════════════════════════════════════════════════════

  function drawCountdown(value, color=C.yellow) {
    const cx = canvas.width/2, cy = canvas.height/2;
    const scale = 1 + Math.sin(tick_*0.2)*0.04;
    ctx.save();
    ctx.translate(px(cx), px(cy));
    ctx.scale(scale, scale);
    ctx.shadowColor=color; ctx.shadowBlur=50;
    ctx.font="80px 'Press Start 2P',monospace";
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=color;
    ctx.fillText(String(value), 0, 0);
    ctx.shadowBlur=0;
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  EFECTOS
  // ═══════════════════════════════════════════════════════════════

  function drawScreenFlash(alpha) {
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1,alpha)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function formatTime(seconds) {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds/60);
    const s = Math.floor(seconds%60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // ─── API pública ─────────────────────────────────────────────
  return {
    init, tick,
    drawBackground,
    drawMainMenu, drawModeSelect, drawDifficultySelect, drawMapSelect,
    drawInstructions, drawStats, drawCredits,
    drawHUD, drawPause, drawGameOver, drawCountdown, drawScreenFlash,
    formatTime
  };

})();
