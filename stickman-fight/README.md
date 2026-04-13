# 🥊 Stickman Fight Legends Pro

> Pelea sin cuartel entre stickmen. Combos, golpes y mucha adrenalina.

![Estado](https://img.shields.io/badge/Estado-Estable-green)
![Visuales](https://img.shields.io/badge/Visuales-Acción%20%F0%9F%8E%AE--ff8800)

---

## 🎮 Controles

| Acción | Jugador 1 | Jugador 2 |
|--------|-----------|-----------|
| Mover | A / D | ← / → |
| Saltar (×2 = doble salto) | W | ↑ |
| Defender | S | ↓ |
| Puño | G | 7 |
| Patada | H | 8 |
| Especial | J | 9 |
| Pausar | ESC | ESC |

---

## 👤 Personajes

| Personaje | Color | Estilo | Especial |
|-----------|-------|--------|----------|
| **Shadow** | Púrpura | Veloz y evasivo | Corte de Energía |
| **Blaze** | Naranja | Alta potencia | Bola de Fuego |
| **Thunder** | Cyan | Equilibrado | Rayo Eléctrico |
| **Phantom** | Verde azulado | Ultra rápido | Bola de Energía |
| **Titan** | Rojo | Lento pero demoledor | Onda Expansiva |

### Stats por personaje

- **Poder**: Daño base
- **Velocidad**: Velocidad de movimiento
- **Defensa**: Reducción de daño
- **Agilidad**: Velocidad de ataque

---

## 🏟️ Arenas

| Arena | Descripción |
|-------|-------------|
| **Lava** | Volcanes, lava burbujeante, cielo rojo oscuro |
| **Neón** | Grid cyberpunk, letreros brillantes, fondo oscuro |
| **Templo** | Pilares, arco estructural, ambiente selvático |
| **Espacio** | Estrellas titilantes, planeta con anillo, plataforma metálica |

---

## 🎯 Mecánicas de combate

### Ataques
| Ataque | Velocidad | Daño | Knockback |
|--------|-----------|------|----------|
| Puño | Rápido | Medio | Bajo |
| Patada | Lenta | Alto | Alto |
| Especial | Lenta | Muy alto | Variable + Proyectil |

### Sistema
- **Doble salto**: Presiona saltar otra vez en el aire
- **Defensa**: Reduce daño 60%, no puedes atacar
- **Energía**: Se llena al recibir daño, usada para especiales
- **Partidas best-of-3**: Primero en 2 rondas gana

---

## 🏗️ Estructura

```
js/
├── main.js         # Punto de entrada
├── game.js         # Motor, arenas, game loop
├── fighter.js      # Clase luchador + personajes
├── stateMachine.js # Estados de fighter
├── physics.js      # Gravedad, fricción, knockback
├── collision.js    # Hitboxes y colisiones
├── projectile.js   # Proyectiles de especiales
├── particles.js    # Sistema de partículas
├── aiController.js # IA con 3 dificultades
├── inputHandler.js # Entrada P1 y P2
├── uiManager.js    # Menús, selección, HUD
└── audioManager.js # Audio sintetizado
```

---

## ⚔️ Dificultades de IA

| Nivel | Comportamiento |
|-------|----------------|
| Fácil | IA lenta, errores, no usa doble salto |
| Normal | Equilibrada, doble salto ocasional |
| Difícil | Agresiva, defiende bien, usa doble salto para cruzar |

---

## 📊 Estadísticas guardadas

- Victorias Jugador 1
- Victorias Jugador 2
- Victorias CPU
