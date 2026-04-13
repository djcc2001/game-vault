# 🧱 Tetris Ultimate Pro

> El clásico llevado al límite. Bloques, velocidad y concentración pura.

![Estado](https://img.shields.io/badge/Estado-Estable-green)
![Visuales](https://img.shields.io/badge/Visuales-Retro%20Neón-ff00ff)

---

## 🎮 Controles

| Acción | Jugador 1 | Jugador 2 |
|--------|-----------|-----------|
| Mover izquierda | ← | A |
| Mover derecha | → | D |
| Rotar | ↑ | W |
| Caída suave | ↓ | S |
| Caída instant | Espacio | Q |
| Hold piece | Shift | E |

---

## 🎯 Mecánicas

- **SRS (Super Rotation System)**: Wall kicks completos
- **Bag-7 randomizer**: Distribución justa de piezas
- **DAS (Delayed Auto-Shift)**: Movimiento lateral fluido
- **Hold piece**: Guarda una pieza para después
- **Ghost piece**: Preview de donde caerá la pieza
- **Combos**: Bonificación por líneas consecutivas
- **Modo versus**: Envía basura al opponent

---

## 🏗️ Estructura

```
js/
├── main.js         # Punto de entrada
├── game.js        # Motor del juego
├── board.js       # Tablero, colisiones, limpieza
├── piece.js       # Tetrominos, bag, SRS kicks
├── aiController.js # IA para modo CPU
├── inputHandler.js # Entrada con DAS
├── levelManager.js # Velocidad por nivel
├── scoreManager.js # Puntos y combos
├── uiManager.js   # HUD y menús
└── audioManager.js # Sonido 8-bit
```

---

## 🏆 Rankings

Top 10 guardado en localStorage con nombre del jugador.

### Sistema de puntuación

| Líneas | Puntos |
|--------|--------|
| 1 | 100 × nivel |
| 2 | 300 × nivel |
| 3 | 500 × nivel |
| 4 (Tetris) | 800 × nivel |
