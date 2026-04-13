/**
 * physics.js
 * Módulo de física: movimiento, rotación y aplicación de velocidades.
 * Funciones puras que reciben y devuelven valores; no modifican estado global.
 */

const Physics = (() => {

  // Constantes físicas del juego
  const TANK_SPEED       = 80;    // píxeles/segundo
  const TANK_ROT_SPEED   = 1.8;   // radianes/segundo
  const BULLET_SPEED     = 320;   // píxeles/segundo

  /**
   * Mueve una entidad en la dirección de su ángulo
   * @param {Object} entity - { x, y, angle }
   * @param {number} direction - 1 adelante, -1 atrás
   * @param {number} speed - velocidad px/s
   * @param {number} dt - deltaTime en segundos
   * @returns {{ x, y }}
   */
  function moveForward(entity, direction, speed, dt) {
    return {
      x: entity.x + Math.cos(entity.angle) * direction * speed * dt,
      y: entity.y + Math.sin(entity.angle) * direction * speed * dt
    };
  }

  /**
   * Rota una entidad
   * @param {Object} entity - { angle }
   * @param {number} direction - 1 derecha, -1 izquierda
   * @param {number} rotSpeed - velocidad de rotación rad/s
   * @param {number} dt
   * @returns {number} nuevo ángulo
   */
  function rotate(entity, direction, rotSpeed, dt) {
    return entity.angle + direction * rotSpeed * dt;
  }

  /**
   * Actualiza posición de una bala (movimiento lineal constante)
   * @param {Object} bullet - { x, y, angle, speed }
   * @param {number} dt
   * @returns {{ x, y }}
   */
  function moveBullet(bullet, dt) {
    return {
      x: bullet.x + Math.cos(bullet.angle) * bullet.speed * dt,
      y: bullet.y + Math.sin(bullet.angle) * bullet.speed * dt
    };
  }

  /**
   * Calcula el rebote de una bala contra una pared horizontal
   * Invierte la componente Y del vector de velocidad
   * @param {number} angle - ángulo actual de la bala
   * @returns {number} nuevo ángulo tras rebote horizontal
   */
  function bounceHorizontal(angle) {
    // Reflejar respecto al eje X
    return -angle;
  }

  /**
   * Calcula el rebote de una bala contra una pared vertical
   * Invierte la componente X del vector de velocidad
   * @param {number} angle
   * @returns {number} nuevo ángulo tras rebote vertical
   */
  function bounceVertical(angle) {
    // Reflejar respecto al eje Y
    return Math.PI - angle;
  }

  /**
   * Normaliza un ángulo al rango [-PI, PI]
   * @param {number} angle
   * @returns {number}
   */
  function normalizeAngle(angle) {
    while (angle > Math.PI)  angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  /**
   * Calcula la distancia entre dos puntos
   * @param {number} x1 @param {number} y1
   * @param {number} x2 @param {number} y2
   * @returns {number}
   */
  function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calcula el ángulo entre dos puntos
   * @param {number} fromX @param {number} fromY
   * @param {number} toX   @param {number} toY
   * @returns {number} ángulo en radianes
   */
  function angleTo(fromX, fromY, toX, toY) {
    return Math.atan2(toY - fromY, toX - fromX);
  }

  /**
   * Interpolación lineal
   * @param {number} a @param {number} b @param {number} t [0,1]
   * @returns {number}
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  return {
    TANK_SPEED,
    TANK_ROT_SPEED,
    BULLET_SPEED,
    moveForward,
    rotate,
    moveBullet,
    bounceHorizontal,
    bounceVertical,
    normalizeAngle,
    distance,
    angleTo,
    lerp
  };
})();
