/**
 * map.js
 * Define los 3 mapas del juego + renderizado de cada uno.
 * Los obstáculos se definen en coordenadas normalizadas [0-1]
 * y se escalan al tamaño del canvas en loadMap().
 *
 * Nota: los spawn points están alejados de los bordes y obstáculos
 * para evitar que los tanques aparezcan solapados.
 */

const MapManager = (() => {

  // ═══════════════════════════════════════════════════════════════
  //  DEFINICIONES (coordenadas normalizadas)
  // ═══════════════════════════════════════════════════════════════

  const MAPS = [

    // ── 0: Laberinto Clásico ──────────────────────────────────
    {
      id:       'maze',
      name:     'LABERINTO  CLASICO',
      bgColor:  '#050a0e',
      gridColor:'rgba(0,255,65,0.04)',
      wallColor:'#00ff41',
      wallGlow: '#00ff41',
      spawns: [
        { x:0.11, y:0.13, angle: Math.PI*0.25   },
        { x:0.89, y:0.87, angle:-Math.PI*0.75   },
        { x:0.89, y:0.13, angle: Math.PI*0.75   },
        { x:0.11, y:0.87, angle:-Math.PI*0.25   }
      ],
      obstacles: [
        // Paredes horizontales internas
        { nx:0.22, ny:0.22, nw:0.28, nh:0.04 },
        { nx:0.50, ny:0.22, nw:0.28, nh:0.04 },
        { nx:0.22, ny:0.74, nw:0.28, nh:0.04 },
        { nx:0.50, ny:0.74, nw:0.28, nh:0.04 },
        // Paredes verticales internas
        { nx:0.22, ny:0.22, nw:0.04, nh:0.24 },
        { nx:0.74, ny:0.22, nw:0.04, nh:0.24 },
        { nx:0.22, ny:0.54, nw:0.04, nh:0.24 },
        { nx:0.74, ny:0.54, nw:0.04, nh:0.24 },
        // Bloque central
        { nx:0.42, ny:0.42, nw:0.16, nh:0.16 },
        // Bloques interiores
        { nx:0.32, ny:0.32, nw:0.07, nh:0.07 },
        { nx:0.61, ny:0.32, nw:0.07, nh:0.07 },
        { nx:0.32, ny:0.61, nw:0.07, nh:0.07 },
        { nx:0.61, ny:0.61, nw:0.07, nh:0.07 }
      ]
    },

    // ── 1: Arena Abierta ──────────────────────────────────────
    {
      id:       'arena',
      name:     'ARENA  ABIERTA',
      bgColor:  '#050810',
      gridColor:'rgba(0,238,255,0.04)',
      wallColor:'#00eeff',
      wallGlow: '#00eeff',
      spawns: [
        { x:0.09, y:0.50, angle: 0           },
        { x:0.91, y:0.50, angle: Math.PI     },
        { x:0.50, y:0.09, angle: Math.PI*0.5 },
        { x:0.50, y:0.91, angle:-Math.PI*0.5 }
      ],
      obstacles: [
        // Cruz central
        { nx:0.45, ny:0.30, nw:0.10, nh:0.40 },
        { nx:0.30, ny:0.45, nw:0.40, nh:0.10 },
        // Esquinas
        { nx:0.17, ny:0.17, nw:0.10, nh:0.10 },
        { nx:0.73, ny:0.17, nw:0.10, nh:0.10 },
        { nx:0.17, ny:0.73, nw:0.10, nh:0.10 },
        { nx:0.73, ny:0.73, nw:0.10, nh:0.10 },
        // Laterales
        { nx:0.17, ny:0.43, nw:0.08, nh:0.14 },
        { nx:0.75, ny:0.43, nw:0.08, nh:0.14 },
        { nx:0.43, ny:0.17, nw:0.14, nh:0.08 },
        { nx:0.43, ny:0.75, nw:0.14, nh:0.08 }
      ]
    },

    // ── 2: Simétrico Competitivo ──────────────────────────────
    {
      id:       'symmetric',
      name:     'ARENA  SIMETRICA',
      bgColor:  '#0a0510',
      gridColor:'rgba(255,64,129,0.04)',
      wallColor:'#ff4081',
      wallGlow: '#ff4081',
      spawns: [
        { x:0.09, y:0.50, angle: 0           },
        { x:0.91, y:0.50, angle: Math.PI     },
        { x:0.50, y:0.10, angle: Math.PI*0.5 },
        { x:0.50, y:0.90, angle:-Math.PI*0.5 }
      ],
      obstacles: [
        // Centro vertical
        { nx:0.47, ny:0.35, nw:0.06, nh:0.30 },
        // Paredes izquierda (espejo derecha)
        { nx:0.22, ny:0.20, nw:0.04, nh:0.20 },
        { nx:0.22, ny:0.60, nw:0.04, nh:0.20 },
        { nx:0.74, ny:0.20, nw:0.04, nh:0.20 },
        { nx:0.74, ny:0.60, nw:0.04, nh:0.20 },
        // Bloques superior/inferior simétricos
        { nx:0.35, ny:0.18, nw:0.12, nh:0.06 },
        { nx:0.53, ny:0.18, nw:0.12, nh:0.06 },
        { nx:0.35, ny:0.76, nw:0.12, nh:0.06 },
        { nx:0.53, ny:0.76, nw:0.12, nh:0.06 },
        // Laterales medios
        { nx:0.29, ny:0.43, nw:0.08, nh:0.14 },
        { nx:0.63, ny:0.43, nw:0.08, nh:0.14 }
      ]
    }
  ];

  // ─── Estado runtime ──────────────────────────────────────────
  let currentMap = null;
  let canvasW    = 0;
  let canvasH    = 0;

  // ═══════════════════════════════════════════════════════════════
  //  API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Carga y escala un mapa al tamaño del canvas.
   * @param {number} index - 0, 1 ó 2
   * @param {number} w     - ancho del canvas
   * @param {number} h     - alto del canvas
   * @returns {Object}     mapa cargado con obstáculos en píxeles
   */
  function loadMap(index, w, h) {
    canvasW = w;
    canvasH = h;
    const def = MAPS[index % MAPS.length];

    const obstacles = def.obstacles.map(o => ({
      x: o.nx * w,
      y: o.ny * h,
      w: o.nw * w,
      h: o.nh * h
    }));

    const spawns = def.spawns.map(s => ({
      x:     s.x * w,
      y:     s.y * h,
      angle: s.angle
    }));

    currentMap = {
      id:        def.id,
      name:      def.name,
      bgColor:   def.bgColor,
      gridColor: def.gridColor,
      wallColor: def.wallColor,
      wallGlow:  def.wallGlow,
      obstacles,
      spawns
    };

    return currentMap;
  }

  /**
   * Dibuja el mapa completo: fondo, grid, borde, obstáculos.
   * @param {CanvasRenderingContext2D} ctx
   */
  function draw(ctx) {
    if (!currentMap) return;
    _drawBackground(ctx);
    _drawBorder(ctx);
    _drawObstacles(ctx);
  }

  function getCurrentMap()      { return currentMap; }
  function getMapDefinitions()  { return MAPS; }
  function getMapCount()        { return MAPS.length; }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS DE RENDER
  // ═══════════════════════════════════════════════════════════════

  function _drawBackground(ctx) {
    // Fondo sólido
    ctx.fillStyle = currentMap.bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid de puntos retro
    ctx.fillStyle = currentMap.gridColor;
    for (let x = 0; x < canvasW; x += 32)
      for (let y = 0; y < canvasH; y += 32)
        ctx.fillRect(x, y, 1, 1);
  }

  function _drawBorder(ctx) {
    const t = 4; // grosor del borde
    ctx.save();
    ctx.fillStyle   = currentMap.wallColor;
    ctx.shadowColor = currentMap.wallGlow;
    ctx.shadowBlur  = 14;
    ctx.fillRect(0,          0,           canvasW, t);         // top
    ctx.fillRect(0,          canvasH - t, canvasW, t);         // bottom
    ctx.fillRect(0,          0,           t,       canvasH);   // left
    ctx.fillRect(canvasW-t,  0,           t,       canvasH);   // right
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function _drawObstacles(ctx) {
    currentMap.obstacles.forEach(obs => {
      const x = Math.round(obs.x), y = Math.round(obs.y);
      const w = Math.round(obs.w), h = Math.round(obs.h);

      ctx.save();

      // Relleno oscuro
      ctx.fillStyle = '#060e18';
      ctx.fillRect(x, y, w, h);

      // Borde neón con glow
      ctx.strokeStyle = currentMap.wallColor;
      ctx.shadowColor = currentMap.wallGlow;
      ctx.shadowBlur  = 8;
      ctx.lineWidth   = 2;
      ctx.strokeRect(x+1, y+1, w-2, h-2);
      ctx.shadowBlur  = 0;

      // Esquinas de pixel art
      ctx.fillStyle = currentMap.wallColor;
      const cs = 4;
      ctx.fillRect(x,     y,     cs, cs);  // TL
      ctx.fillRect(x+w-cs,y,     cs, cs);  // TR
      ctx.fillRect(x,     y+h-cs,cs, cs);  // BL
      ctx.fillRect(x+w-cs,y+h-cs,cs, cs);  // BR

      // Líneas internas decorativas (solo si el bloque es suficientemente grande)
      if (w > 24 && h > 16) {
        ctx.strokeStyle = currentMap.wallColor + '33';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x+8, y+8); ctx.lineTo(x+w-8, y+8);
        ctx.stroke();
        if (h > 24) {
          ctx.beginPath();
          ctx.moveTo(x+8, y+h-8); ctx.lineTo(x+w-8, y+h-8);
          ctx.stroke();
        }
      }

      ctx.restore();
    });
  }

  return { loadMap, draw, getCurrentMap, getMapDefinitions, getMapCount };

})();
