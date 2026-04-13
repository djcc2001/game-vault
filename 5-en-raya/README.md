# ⭕ 5 en Raya

> El clásico de estrategia. Consigue cinco en línea antes que tu rival.

![Estado](https://img.shields.io/badge/Estado-Estable-green)
![Visuales](https://img.shields.io/badge/Visuales-Minimalista-00ff00)

---

## 🎮 Cómo jugar

| Acción | Control |
|--------|---------|
| Colocar ficha | Click / Touch |

---

## 🎯 Mecánicas

- **Tablero 15x15**
- **2 jugadores** o **vs IA**
- **Minimax con podado alpha-beta**: IA desafiante
- **Profundidad adaptativa**: Más difícil cuando más fichas haya
- **Animaciones suaves** de caída
- **Detección en tiempo real** de victoria

---

## 🏗️ Estructura

```
js/
├── main.js    # Punto de entrada
├── game.js   # Motor del juego
├── board.js  # Tablero y lógica de victoria
├── ai.js     # Minimax + alpha-beta pruning
├── ui.js     # Renderizado canvas
├── sounds.js # Audio sintetizado
└── storage.js # Estadísticas
```

---

## 🤖 Algoritmo de IA

```javascript
// Minimax con alpha-beta pruning
function minimax(board, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || gameOver(board)) {
        return evaluate(board);
    }
    // ...ramificación y poda
}
```

La IA evalúa:
- Líneas propias en progreso
- Bloqueo de líneas del oponente
- Centrado del tablero (estrategia)
