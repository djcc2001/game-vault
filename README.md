# 🎮 Game Vault

<a name="badges">

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/es/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web-blue?style=flat-square)](https://github.com)

</a>

> Una colección de juegos arcade clásicos reinventados con HTML5, CSS3 y JavaScript vanilla.


---

## 🎯 Juegos incluidos

| # | Juego | Géneros | Estado |
|:-:|-------|---------|:------:|
| 1 | [Space Battle Arena Pro](#space-battle-arena-pro) | Shoot 'em up, Supervivencia | ✅ |
| 2 | [Tank Battle Arena](#tank-battle-arena) | Acción, Estrategia, Local Multiplayer | ✅ |
| 3 | [Tetris Ultimate Pro](#tetris-ultimate-pro) | Puzzle, Clásico, vs CPU | ✅ |
| 4 | [5 en Raya](#5-en-raya) | Estrategia, Puzzle, vs IA | ✅ |
| 5 | [Stickman Fight Legends Pro](#stickman-fight-legends-pro) | Fighting, Acción, Local Multiplayer | ✅ |

---

## 🚀 Quick Start

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/game-vault.git
cd game-vault/juegos

# Abrir en navegador
open index.html

# O usar un servidor local
npx serve .
# Luego visitar http://localhost:3000
```

> **Nota:** No requiere Node.js, npm ni ninguna dependencia. Funciona abriendo el archivo HTML directamente.

---

## 🎮 Detalle de Juegos

---

### 1. Space Battle Arena Pro

<a name="space-battle">

![Estado](https://img.shields.io/badge/Estado-Estable-brightgreen)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%2B%20Canvas%20%2B%20WebAudio-ff6b35)

</a>

Sobrevive oleadas de enemigos en el espacio. 5 tipos de enemigos, power-ups y música sintetizada.

**Controles:**
- **Mouse** — Mover nave
- **Click** — Disparar (automático)
- **ESC** — Pausar

**Features:**
- 5 tipos de enemigos (soldado, rápido, disparo diagonal, tanque, boss)
- Sistema de oleadas con boss cada N oleadas
- Power-ups: escudo, triple disparo, láser
- Efectos de partículas y glow
- Parallax starfield

**Estructura:**
```
space-battle/js/
├── main.js         # Entry point
├── game.js         # Game engine
├── player.js       # Player ship
├── enemy.js        # Enemy types
├── projectile.js   # Projectiles
├── collision.js    # Collision detection
├── levelManager.js # Wave system
├── aiController.js # Enemy AI
├── inputHandler.js # Input handling
├── uiManager.js    # HUD & menus
├── audioManager.js # Synth audio
└── scoreManager.js # Scoring
```

---

### 2. Tank Battle Arena

<a name="tank-battle">

![Estado](https://img.shields.io/badge/Estado-Estable-brightgreen)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%2B%20Canvas%20%2B%20WebAudio-ff6b35)

</a>

Estrategia y fuego. 3 mapas tácticos, IA adaptativa y balas con trail.

**Controles:**

| Acción | Jugador 1 | Jugador 2 |
|--------|:---------:|:---------:|
| Mover | W A S D | ↑ ← ↓ → |
| Disparar | F | K |
| Pausar | ESC | ESC |

**Features:**
- 3 mapas con obstáculos
- 3 modos: vs CPU, vs Jugador, Supervivencia
- 3 dificultades (Fácil, Normal, Difícil)
- Balas con trail y efectos de glow
- IA con estados (caza, evade, patrulla)
- Estadísticas persistentes

**Estructura:**
```
tank-battle/js/
├── main.js             # Entry point
├── game.js            # Game engine
├── tank.js            # Tank class
├── bullet.js          # Bullets + trail
├── map.js             # 3 tactical maps
├── collision.js       # AABB/circle collision
├── physics.js         # Movement & bounce
├── aiController.js    # CPU AI
├── difficultyManager.js # Difficulty presets
├── inputHandler.js    # Keyboard input
├── stateMachine.js    # Menu flow
├── uiManager.js       # Canvas UI
└── audioManager.js    # 8-bit audio
```

---

### 3. Tetris Ultimate Pro

<a name="tetris-ultimate-pro">

![Estado](https://img.shields.io/badge/Estado-Estable-brightgreen)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%2B%20Canvas%20%2B%20WebAudio-ff6b35)

</a>

El clásico llevado al límite. SRS, bag-7, hold, ghost piece y modo versus.

**Controles:**

| Acción | Jugador 1 | Jugador 2 |
|--------|:---------:|:---------:|
| Mover | ← → | A D |
| Rotar | ↑ | W |
| Caída suave | ↓ | S |
| Caída instant | Espacio | Q |
| Hold | Shift | E |

**Features:**
- SRS (Super Rotation System) con wall kicks
- Bag-7 randomizer
- DAS (Delayed Auto-Shift)
- Hold piece y ghost piece
- Modo versus con envío de basura
- IA para modo CPU
- Top 10 rankings en localStorage

**Puntuación:**

| Líneas | Puntos |
|:------:|:------:|
| 1 | 100 × nivel |
| 2 | 300 × nivel |
| 3 | 500 × nivel |
| 4 (Tetris) | 800 × nivel |

**Estructura:**
```
tetris-ultimate-pro/js/
├── main.js         # Entry point
├── game.js         # Game engine
├── board.js        # Board + collision
├── piece.js        # Tetrominos + SRS
├── aiController.js # CPU AI
├── inputHandler.js # DAS input
├── levelManager.js # Speed per level
├── scoreManager.js # Scoring system
├── uiManager.js    # HUD + menus
└── audioManager.js # 8-bit audio
```

---

### 4. 5 en Raya

<a name="5-en-raya">

![Estado](https://img.shields.io/badge/Estado-Estable-brightgreen)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%2B%20Canvas%20%2B%20WebAudio-ff6b35)

</a>

El clásico de estrategia con IA desafiante basada en Minimax con podado alpha-beta.

**Controles:**
- **Click/Touch** — Colocar ficha

**Features:**
- Tablero 15×15
- 2 jugadores o vs IA
- Algoritmo Minimax con podado alpha-beta
- Profundidad adaptativa por dificultad
- Animaciones suaves de caída
- Detección de victoria en tiempo real

**Algoritmo de IA:**
```javascript
// Minimax con alpha-beta pruning
function minimax(board, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || gameOver(board))
        return evaluate(board);
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let move of getMoves(board)) {
            eval = minimax(apply(board, move), depth-1, alpha, beta, false);
            maxEval = max(maxEval, eval);
            alpha = max(alpha, eval);
            if (beta <= alpha) break; // Pruning
        }
        return maxEval;
    }
    // ... similar for minimizing
}
```

**Estructura:**
```
5-en-raya/js/
├── main.js    # Entry point
├── game.js   # Game engine
├── board.js  # Board logic
├── ai.js     # Minimax + alpha-beta
├── ui.js     # Canvas rendering
├── sounds.js # Synth sounds
└── storage.js # Stats
```

---

### 5. Stickman Fight Legends Pro

<a name="stickman-fight-legends-pro">

![Estado](https://img.shields.io/badge/Estado-Estable-brightgreen)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%2B%20Canvas%20%2B%20WebAudio-ff6b35)

</a>

Pelea 2D entre stickmen. 5 personajes únicos, 4 arenas y IA con 3 dificultades.

**Controles:**

| Acción | Jugador 1 | Jugador 2 |
|--------|:---------:|:---------:|
| Mover | A / D | ← / → |
| Saltar | W (×2 = doble salto) | ↑ |
| Defender | S | ↓ |
| Puño | G | 7 |
| Patada | H | 8 |
| Especial | J | 9 |
| Pausar | ESC | ESC |

**Personajes:**

| Personaje | Color | Poder | Velocidad | Defensa | Agilidad |
|-----------|:-----:|:-----:|:---------:|:-------:|:--------:|
| Shadow | 🟣 Púrpura | 7 | 8 | 6 | 9 |
| Blaze | 🟠 Naranja | 9 | 5 | 8 | 7 |
| Thunder | 🔵 Cyan | 7 | 7 | 7 | 7 |
| Phantom | 🟢 Verde | 6 | 9 | 5 | 10 |
| Titan | 🔴 Rojo | 10 | 3 | 10 | 4 |

**Features:**
- 5 personajes con specials únicos (proyectiles)
- 4 arenas procedurales (lava, neón, templo, espacio)
- Doble salto在空中
- Partidas best-of-3
- Defensa que reduce 60% del daño
- Sistema de energía (se llena al recibir daño)
- IA con 3 niveles de dificultad
- Efectos de partículas y screen shake

**Arenas:**

| Arena | Descripción visual |
|-------|-------------------|
| Lava | Volcanes, lava burbujeante, cielo rojo oscuro |
| Neón | Grid cyberpunk, letreros brillantes, estética retrofuturista |
| Templo | Pilares de piedra, arco estructural, ambiente selvático |
| Espacio | Estrellas titilantes, planeta con anillo, plataforma metálica |

**Estructura:**
```
stickman-fight/js/
├── main.js         # Entry point
├── game.js         # Engine + arenas
├── fighter.js      # Fighter class + chars
├── stateMachine.js # Fighter states
├── physics.js      # Gravity, knockback
├── collision.js    # Hitboxes
├── projectile.js   # Special projectiles
├── particles.js    # Particle system
├── aiController.js # 3-difficulty AI
├── inputHandler.js # P1 + P2 input
├── uiManager.js    # Menus + HUD
└── audioManager.js # Synth audio
```

---

## 🛠️ Tecnologías

| Tecnología | Descripción |
|------------|-------------|
| ![HTML5](https://img.shields.io/badge/HTML5-000?style=flat-square&logo=html5) | Estructura semántica |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3) | Estilos y animaciones |
| ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript) | Lógica del juego |
| Canvas API | Renderizado 2D |
| Web Audio API | Síntesis de sonido procedural |
| localStorage | Persistencia de estadísticas y rankings |

---

## 🔧 Arquitectura

Cada juego sigue una arquitectura modular:

```
┌─────────────────────────────────────────┐
│              Entry Point                 │
│              (main.js)                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  Game   │  │   UI    │  │  Audio  │ │
│  │ Engine  │  │ Manager │  │ Manager │ │
│  └────┬────┘  └────┬────┘  └────┬────┘ │
│       │            │            │        │
│  ┌────┴────────────┴────────────┴────┐  │
│  │         Input Handler              │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Entity  │  │Physics/ │  │ State/  │ │
│  │ Classes │  │Collision│  │ AI      │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Principios:**
- **Sin dependencias** — 100% vanilla JS
- **State machines** — Control de flujo claro
- **Delta time** — Física consistente
- **IIFE/Clases ES6** — Encapsulación
- **JSDoc** — Documentación de funciones

---

## 📂 Estructura del Proyecto

```
juegos/
│
├── index.html          # 🎯 Hub principal (este archivo)
├── README.md           # Este archivo
│
├── space-battle/       # Shoot 'em up
│   ├── index.html
│   ├── css/
│   ├── js/             # 12 módulos
│   └── README.md
│
├── tank-battle/        # Acción táctica
│   ├── index.html
│   ├── css/
│   ├── js/             # 13 módulos
│   └── README.md
│
├── tetris-ultimate-pro/ # Puzzle clásico
│   ├── index.html
│   ├── css/
│   ├── js/             # 10 módulos
│   └── README.md
│
├── 5-en-raya/          # Estrategia
│   ├── index.html
│   ├── css/
│   ├── js/             # 7 módulos
│   └── README.md
│
└── stickman-fight/    # Fighting
    ├── index.html
    ├── css/
    ├── js/             # 12 módulos
    ├── assets/
    └── README.md
```

---

## 🎵 Audio

Todos los juegos usan **síntesis de audio por Web Audio API**. Sin archivos MP3/WAV externos.

**Tipos de sonidos generados:**
- Osciladores (sine, square, sawtooth, triangle)
- Ruido blanco para efectos percusivos
- Filtros y envelopes ADSR
- Efectos de reverb simulados

**Ventajas:**
- ⚡ Sin latencia de carga
- 📦 Sin archivos externos
- 🎛️ 100% controlable programáticamente
- 🔊 Funciona en todos los navegadores modernos

---

## 💾 Persistencia

Datos guardados en `localStorage`:

| Juego | Key | Datos |
|-------|-----|-------|
| Space Battle | `sbs_highscores` | Top 5 scores |
| Tank Battle | `tank_best_survival` | Mejor tiempo |
| Tank Battle | `tank_stats` | Victorias |
| Tetris | `tetris_highscores` | Top 10 |
| 5 en Raya | `gomoku_stats` | Victorias |
| Stickman Fight | `sflp_stats` | Victorias |

---

## 🤝 Contributing

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nuevo-juego`)
3. Commit tus cambios (`git commit -m 'Add nuevo juego'`)
4. Push a la rama (`git push origin feature/nuevo-juego`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

<p align="center">
  <strong>Hecho con ❤️ y JavaScript vanilla</strong>
</p>
