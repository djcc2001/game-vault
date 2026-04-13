# 🎖️ Tank Battle Arena

> Estrategia y fuego. Comanda tu tanque y destruye a tus rivales.

![Estado](https://img.shields.io/badge/Estado-Estable-green)
![Visuales](https://img.shields.io/badge/Visuales-Militar%20Táctico-ffcc00)

---

## 🎮 Controles

| Acción | Jugador 1 | Jugador 2 |
|--------|-----------|-----------|
| Mover | W A S D | Flechas |
| Disparar | F | K |
| Pausar | ESC | ESC |

---

## 🎯 Mecánicas

- **3 modos de juego**: vs CPU, vs Jugador, Supervivencia
- **3 mapas tácticos** con obstáculos
- **Tanques que rebotan** en las paredes
- **Balas con trail** y efectos de glow
- **IA adaptativa**: Caza, evade y patrulla
- **Estadísticas persistentes** en localStorage

---

## ⚔️ Dificultades

| Nivel | Comportamiento |
|-------|----------------|
| Fácil | IA lenta, errores frecuentes |
| Normal | IA equilibrada |
| Difícil | IA agresiva y precisa |

---

## 🏗️ Estructura

```
js/
├── main.js             # Punto de entrada
├── game.js            # Motor del juego
├── tank.js           # Clase tanque
├── bullet.js         # Balas con trail
├── map.js            # 3 mapas tácticos
├── collision.js       # Colisiones AABB/círculo
├── physics.js        # Física y rebotes
├── aiController.js   # IA del CPU
├── difficultyManager.js # Ajustes de dificultad
├── inputHandler.js   # Entrada de teclado
├── stateMachine.js   # Flujo de menús
├── uiManager.js      # UI canvas
└── audioManager.js   # Sonido 8-bit
```

---

## 🏆 Estadísticas guardadas

- Mejor tiempo de supervivencia
- Victorias J1 / J2 / CPU
