/**
 * collision.js
 * Módulo de detección de colisiones.
 * Implementa:
 *  - AABB rect vs rect (tanque vs obstáculos)
 *  - Círculo vs rect (bala vs obstáculos)
 *  - Círculo vs rect (bala vs tanque)
 *  - Rect vs límites del canvas
 */

const Collision = (() => {

  /**
   * Test AABB: rectángulo A vs rectángulo B
   * Todos los params en coordenadas mundo
   * @param {number} ax @param {number} ay - centro A
   * @param {number} aw @param {number} ah - semi-dimensiones A
   * @param {number} bx @param {number} by - top-left B
   * @param {number} bw @param {number} bh - dimensiones B
   * @returns {boolean}
   */
  function rectVsRect(ax, ay, aw, ah, bx, by, bw, bh) {
    const aLeft   = ax - aw / 2;
    const aRight  = ax + aw / 2;
    const aTop    = ay - ah / 2;
    const aBottom = ay + ah / 2;

    return aLeft < bx + bw &&
           aRight > bx &&
           aTop < by + bh &&
           aBottom > by;
  }

  /**
   * Test círculo vs rectángulo (AABB, rect en top-left coords)
   * @param {number} cx @param {number} cy - centro círculo
   * @param {number} r  - radio círculo
   * @param {number} rx @param {number} ry - top-left rect
   * @param {number} rw @param {number} rh - dimensiones rect
   * @returns {boolean}
   */
  function circleVsRect(cx, cy, r, rx, ry, rw, rh) {
    // Punto más cercano del rect al centro del círculo
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));

    const dx = cx - nearestX;
    const dy = cy - nearestY;

    return (dx * dx + dy * dy) < (r * r);
  }

  /**
   * Determina si el rebote de una bala en un rect es horizontal o vertical
   * @param {number} cx @param {number} cy @param {number} r
   * @param {number} rx @param {number} ry @param {number} rw @param {number} rh
   * @returns {'horizontal'|'vertical'|'corner'}
   */
  function getBounceDirection(cx, cy, r, rx, ry, rw, rh) {
    // Punto más cercano en el rect
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));

    const dx = Math.abs(cx - nearestX);
    const dy = Math.abs(cy - nearestY);

    // Si viene por arriba o abajo → rebote horizontal (invierte Y)
    if (dx < dy) return 'horizontal';
    if (dy < dx) return 'vertical';
    return 'corner';
  }

  /**
   * Comprueba si un tanque (rect centrado, rotado) colisiona con obstáculos
   * Usa AABB simplificado (hitbox circular o cuadrada sin rotación para colisiones)
   * @param {number} tx @param {number} ty - posición tanque
   * @param {number} tw @param {number} th - dimensiones tanque
   * @param {Array}  obstacles - array de { x, y, w, h } (top-left coords)
   * @returns {boolean}
   */
  function tankVsObstacles(tx, ty, tw, th, obstacles) {
    for (const obs of obstacles) {
      if (rectVsRect(tx, ty, tw, th, obs.x, obs.y, obs.w, obs.h)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Empuja al tanque fuera de obstáculos (separación mínima)
   * @param {number} tx @param {number} ty
   * @param {number} tw @param {number} th
   * @param {number} prevX @param {number} prevY - posición anterior válida
   * @param {Array}  obstacles
   * @returns {{ x, y }}
   */
  function resolveTankObstacle(tx, ty, tw, th, prevX, prevY, obstacles) {
    // Intentar resolver eje X primero
    if (!tankVsObstacles(prevX, ty, tw, th, obstacles)) {
      return { x: prevX, y: ty };
    }
    // Luego eje Y
    if (!tankVsObstacles(tx, prevY, tw, th, obstacles)) {
      return { x: tx, y: prevY };
    }
    // Volver a posición previa
    return { x: prevX, y: prevY };
  }

  /**
   * Comprueba colisión de bala con lista de obstáculos
   * @param {number} cx @param {number} cy @param {number} r
   * @param {Array}  obstacles
   * @returns {{ hit: boolean, obstacle: Object|null, direction: string|null }}
   */
  function bulletVsObstacles(cx, cy, r, obstacles) {
    for (const obs of obstacles) {
      if (circleVsRect(cx, cy, r, obs.x, obs.y, obs.w, obs.h)) {
        const dir = getBounceDirection(cx, cy, r, obs.x, obs.y, obs.w, obs.h);
        return { hit: true, obstacle: obs, direction: dir };
      }
    }
    return { hit: false, obstacle: null, direction: null };
  }

  /**
   * Comprueba colisión de bala con tanque
   * Usa hitbox circular del tanque para simplicidad
   * @param {number} bx @param {number} by @param {number} br
   * @param {number} tx @param {number} ty @param {number} tr - radio tanque
   * @returns {boolean}
   */
  function bulletVsTank(bx, by, br, tx, ty, tr) {
    const dx = bx - tx;
    const dy = by - ty;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (br + tr);
  }

  /**
   * Comprueba si un rect está dentro de los límites del canvas
   * @param {number} x @param {number} y - centro
   * @param {number} w @param {number} h - dimensiones
   * @param {number} canvasW @param {number} canvasH
   * @returns {boolean}
   */
  function isRectInBounds(x, y, w, h, canvasW, canvasH) {
    return (x - w / 2) >= 0 &&
           (x + w / 2) <= canvasW &&
           (y - h / 2) >= 0 &&
           (y + h / 2) <= canvasH;
  }

  /**
   * Comprueba si un círculo colisiona con los bordes del canvas
   * @returns {{ hit: boolean, side: string|null }}
   */
  function circleVsBounds(cx, cy, r, canvasW, canvasH) {
    if (cy - r <= 0 || cy + r >= canvasH) {
      return { hit: true, side: 'horizontal' };
    }
    if (cx - r <= 0 || cx + r >= canvasW) {
      return { hit: true, side: 'vertical' };
    }
    return { hit: false, side: null };
  }

  return {
    rectVsRect,
    circleVsRect,
    getBounceDirection,
    tankVsObstacles,
    resolveTankObstacle,
    bulletVsObstacles,
    bulletVsTank,
    isRectInBounds,
    circleVsBounds
  };
})();
