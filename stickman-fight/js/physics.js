/**
 * physics.js
 * Stickman Fight Legends Pro
 *
 * Constants and utility functions for physics simulation.
 * All values assume a logical canvas height (GROUND_Y defined in game.js).
 */

const Physics = (() => {
  // ── CONSTANTS ────────────────────────────────────────────────
  const GRAVITY        = 2200;  // px/s² — downward acceleration
  const JUMP_VELOCITY  = -750;  // px/s — initial upward velocity
  const GROUND_FRICTION = 0.78; // velocity multiplier per frame (horizontal damping)
  const MAX_FALL_SPEED = 1400;  // terminal velocity px/s
  const KNOCKBACK_H    = 480;   // horizontal knockback px/s on normal hit
  const KNOCKBACK_V    = -280;  // vertical knockback px/s on normal hit
  const HEAVY_KB_H     = 680;
  const HEAVY_KB_V     = -380;
  const WALK_SPEED     = 280;   // px/s
  const RUN_SPEED      = 340;   // px/s (unused distinction right now)

  /**
   * Apply gravity to a velocity object.
   * @param {{ x: number, y: number }} vel
   * @param {number} dt  deltaTime in seconds
   */
  function applyGravity(vel, dt) {
    vel.y += GRAVITY * dt;
    if (vel.y > MAX_FALL_SPEED) vel.y = MAX_FALL_SPEED;
  }

  /**
   * Apply horizontal friction when on ground.
   * @param {{ x: number, y: number }} vel
   * @param {boolean} isGrounded
   */
  function applyFriction(vel, isGrounded) {
    if (isGrounded) {
      vel.x *= GROUND_FRICTION;
      if (Math.abs(vel.x) < 2) vel.x = 0;
    }
  }

  /**
   * Integrate position.
   * @param {{ x: number, y: number }} pos
   * @param {{ x: number, y: number }} vel
   * @param {number} dt
   */
  function integrate(pos, vel, dt) {
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
  }

  /**
   * Clamp fighter inside arena horizontal bounds.
   * @param {{ x: number }} pos
   * @param {number} halfW   half-width of the fighter hitbox
   * @param {number} stageW  full width of the stage
   */
  function clampToStage(pos, halfW, stageW) {
    if (pos.x - halfW < 0)       pos.x = halfW;
    if (pos.x + halfW > stageW)  pos.x = stageW - halfW;
  }

  /**
   * Resolve ground collision.
   * Returns true if the fighter was grounded this frame.
   * @param {{ x: number, y: number }} pos
   * @param {{ x: number, y: number }} vel
   * @param {number} groundY   y-coordinate of the floor
   */
  function resolveGround(pos, vel, groundY) {
    if (pos.y >= groundY) {
      pos.y = groundY;
      vel.y = 0;
      return true;
    }
    return false;
  }

  /**
   * Compute knockback velocity given direction and magnitude.
   * @param {number} dirX   +1 right, -1 left (away from attacker)
   * @param {boolean} heavy
   */
  function knockback(dirX, heavy = false) {
    return {
      x: (heavy ? HEAVY_KB_H : KNOCKBACK_H) * dirX,
      y: heavy ? HEAVY_KB_V : KNOCKBACK_V,
    };
  }

  // ── PUBLIC API ────────────────────────────────────────────────
  return {
    GRAVITY, JUMP_VELOCITY, WALK_SPEED, RUN_SPEED,
    KNOCKBACK_H, KNOCKBACK_V,
    applyGravity, applyFriction, integrate,
    clampToStage, resolveGround, knockback,
  };
})();
