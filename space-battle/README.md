# 🚀 Space Battle Arena Pro

> Survive waves of enemies in the void of space.

![Estado](https://img.shields.io/badge/Estado-Estable-green)
![Visuales](https://img.shields.io/badge/Visuales-Neón%20Cyberpunk-00ffff)

---

## 🎮 Cómo jugar

| Acción | Control |
|--------|---------|
| Mover nave | Mouse |
| Disparar | Automático |
| Pausar | ESC |

---

## 🎯 Mecánicas

- **5 tipos de enemigos**: Soldados, rápidos, disparadores diagonales, tanques y boss
- **Sistema de oleadas**: Progresión de dificultad con boss cada cierta cantidad de oleadas
- **Power-ups**: Escudo, triple disparo, láser
- **Efectos visuales**: Partículas, glow, parallax de estrellas

---

## 🏗️ Estructura

```
js/
├── main.js         # Punto de entrada
├── game.js        # Motor principal y game loop
├── player.js      # Nave del jugador
├── enemy.js       # Clases de enemigos
├── projectile.js  # Disparos y láseres
├── collision.js   # Detección de colisiones
├── levelManager.js # Sistema de oleadas
├── aiController.js # IA de enemigos
├── inputHandler.js # Manejo de entrada
├── uiManager.js   # HUD y menús
├── audioManager.js # Audio sintetizado
└── scoreManager.js # Puntuación y highscores
```

---

## 🔧 Tecnologías

- Canvas API (renderizado 2D)
- Web Audio API (sonido sintetizado)
- Delta time (física consistente)
- State machine (estados del juego)
