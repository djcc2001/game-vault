# Stickman Fight Legends Pro

> Pelea sin cuartel entre stickmen. Combos, dash, contragolpes y mucha adrenalina.

![Estado](https://img.shields.io/badge/Estado-Estable-green)
![Visuales](https://img.shields.io/badge/Visuales-Acción%20%F0%9F%8E%AE--ff8800)

---

## Controles

| Acción | Jugador 1 | Jugador 2 |
|--------|-----------|-----------|
| Mover | A / D | ← / → |
| Saltar (x2 = doble salto) | W | ↑ |
| Defender | S | ↓ |
| Dash / Esquivar | Q | / |
| Puño | G | 7 |
| Patada | H | 8 |
| Especial | J | 9 |
| Pausar | ESC | ESC |

**Nota**: En modo PvC, el CPU selecciona un personaje aleatorio diferente al del jugador.

---

## Personajes

| Personaje | Color | Estilo | Especial |
|-----------|-------|--------|----------|
| **Shadow** | Purpura | Veloz y evasivo | Corte de Energia |
| **Blaze** | Naranja | Alta potencia | Bola de Fuego |
| **Thunder** | Cyan | Equilibrado | Rayo Electrico |
| **Phantom** | Verde azulado | Ultra rapido | Bola de Energia |
| **Titan** | Rojo | Lento pero demoledor | Onda Expansiva |

### Stats por personaje

- **Poder**: Danio base
- **Velocidad**: Velocidad de movimiento
- **Defensa**: Reduccion de danio
- **Agilidad**: Velocidad de ataque

---

## Arenas

| Arena | Descripcion |
|-------|-------------|
| **Lava** | Volcanes, lava burbujeante, cielo rojo oscuro |
| **Neon** | Grid cyberpunk, letreros brillantes, fondo oscuro |
| **Templo** | Pilares, arco estructural, ambiente selvatico |
| **Espacio** | Estrellas titilantes, planeta con anillo, plataforma metalica |

---

## Mecanicas de combate

### Ataques
| Ataque | Velocidad | Danio | Knockback |
|--------|-----------|-------|-----------|
| Puño | Rapido | Medio | Bajo |
| Patada | Lenta | Alto | Alto |
| Especial | Lenta | Muy alto | Variable + Proyectil |

### Sistema de combate
- **Doble salto**: Presiona saltar otra vez en el aire
- **Dash / Esquivar**: Movimiento rapido hacia adelante para evitar ataques
- **Defensa**: Reduce dano 60%, no puedes atacar mientras defiendes
- **Contragolpe**: Despues de bloquear exitosamente, tienes una ventana para contraatacar
- **Combos**: Encadena ataques cuando golpeas al oponente
- **Energia**: Se llena al recibir dano, usada para ataques especiales
- **Partidas best-of-3**: Primero en 2 rondas gana

### Detalles de las mecanicas

**Combos**: Cada vez que conectas un ataque, sumas al contador de combo. Si no golpeas durante 3 segundos, el combo se reinicia. Combos mas altos generan efectos visuales especiales (mas particulas, colores mas intensos).

**Dash**: Permite esquivar ataques rapidamente. Tiene un pequeno enfriamiento. Usa Q (Jugador 1) o / (Jugador 2).

**Contragolpe**: Cuando bloqueas un ataque enemigo, aparece una ventana de contragolpe. Si atacas en ese momento, el dano aumenta significativamente.

**Particulas**: Efectos visuales dinamicos para cada tipo de ataque. Los combos generan rafagas de particulas mas intensas. Los contragolpes tienen efectos especiales.

---

## Dificultades de IA

| Nivel | Comportamiento |
|-------|----------------|
| Facil | IA lenta, errores, no usa dash, doble salto ocasional |
| Normal | Equilibrada, usa dash y doble salto, defiende regularmente |
| Dificil | Agresiva, usa dash para esquivar, doble salto para posicionamiento, defiende bien, encadena combos |

### Comportamiento del CPU

El CPU en dificultad Dificil:
- Usa dash frecuentemente para esquivar ataques
- Ejecuta doble salto para posicionamiento tactico
- Defiende agresivamente cuando ve ataques incoming
- Encadena ataques cuando el oponente esta en desventaja
- Usa especiales cuando tiene energia completa
- Se repliega cuando tiene poca vida

---

## Estructura

```
js/
├── main.js         # Punto de entrada, estado de la app
├── game.js         # Motor, arenas, game loop, HUD
├── fighter.js      # Clase luchador + personajes + combos
├── stateMachine.js # Estados de fighter (ataque, dash, defensa)
├── physics.js      # Gravedad, friccion, knockback
├── collision.js    # Hitboxes y colisiones
├── projectile.js   # Proyectiles de especiales
├── particles.js    # Sistema de particulas
├── aiController.js # IA con 3 dificultades
├── inputHandler.js # Entrada P1 y P2
├── uiManager.js    # Menus, seleccion, HUD
└── audioManager.js # Audio sintetizado con efectos
```

---

## Estadisticas guardadas

Se guardan en localStorage:
- Victorias Jugador 1
- Victorias Jugador 2
- Victorias CPU

---

## Modos de juego

- **PvP**: Dos jugadores locales en el mismo teclado
- **PvC**: Un jugador contra la CPU (selecciona dificultad)

---

## Pantallas

1. **Menu principal**: Seleccionar modo de juego
2. **Seleccion de modo**: PvP o PvC con dificultad
3. **Seleccion de personaje**: Elegir luchador (en PvC, CPU es aleatorio)
4. **Seleccion de arena**: Elegir escenario
5. **Combate**: Pantalla de juego con HUD
6. **Pausa**: Menu de pausa
7. **Fin de partida**: Resultado y opciones de revancha
