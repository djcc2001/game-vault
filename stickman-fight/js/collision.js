/**
 * collision.js
 * Stickman Fight Legends Pro
 *
 * AABB collision detection between fighters, attack hitboxes, and projectiles.
 */

const Collision = (() => {

  /**
   * Simple AABB overlap test.
   * @param {Object} a  { x, y, w, h }  — center-based
   * @param {Object} b
   */
  function overlaps(a, b) {
    return (
      Math.abs(a.x - b.x) < (a.w + b.w) * 0.5 &&
      Math.abs(a.y - b.y) < (a.h + b.h) * 0.5
    );
  }

  /**
   * Get the body AABB of a fighter (for push-separation).
   * @param {Fighter} f
   */
  function fighterBox(f) {
    return { x: f.pos.x, y: f.pos.y - f.height * 0.5, w: f.width, h: f.height };
  }

  /**
   * Get the melee hitbox of a fighter.
   * Returns null when not in an attacking state.
   * Kick has a lower hitbox (leg height) and slightly longer reach.
   * @param {Fighter} f
   */
  function attackBox(f) {
    const isPunch = f.sm.is('attack');
    const isKick  = f.sm.is('kick');
    if (!isPunch && !isKick) return null;

    // Active hit window: 0.15 – 0.65 of animation
    if (f.attackFrame < 0.15 || f.attackFrame > 0.65) return null;

    const dir   = f.facingRight ? 1 : -1;
    const reach = (f.stats.reach || 70) * (isKick ? 1.2 : 1.0);

    // Punch: upper-body height | Kick: lower-body height
    const boxY = isKick
      ? f.pos.y - f.height * 0.45   // kicks land lower
      : f.pos.y - f.height * 0.75;  // punches land higher
    const boxH = f.height * (isKick ? 0.45 : 0.6);

    return {
      x: f.pos.x + dir * (f.width * 0.5 + reach * 0.5),
      y: boxY,
      w: reach,
      h: boxH,
    };
  }

  /**
   * Get projectile AABB.
   * @param {Projectile} p
   */
  function projectileBox(p) {
    return { x: p.x, y: p.y, w: p.radius * 2, h: p.radius * 2 };
  }

  /**
   * Separate two overlapping fighters laterally.
   * Only pushes when both fighters are in contact at ground level —
   * so a jumping fighter can freely pass over or behind the opponent.
   *
   * Key insight: fighters are separated only when their LOWER THIRDS
   * overlap vertically. A fighter in the air (feet high up) can freely
   * cross behind the opponent.
   */
  function separateFighters(f1, f2) {
    const dx = f2.pos.x - f1.pos.x;
    const overlapX = (f1.width + f2.width) * 0.5 - Math.abs(dx);
    if (overlapX <= 0) return; // no horizontal overlap at all

    // Only check the bottom 35% of each fighter's height for vertical contact.
    // pos.y is the foot (bottom). Lower third = foot to foot + height*0.35 upward.
    const groundZoneH = f1.height * 0.35; // ~35px — just the legs/feet area
    const f1FootY = f1.pos.y;
    const f2FootY = f2.pos.y;

    // If either fighter's feet are more than groundZoneH above the other's feet,
    // one has clearly jumped over the other — let them pass.
    if (Math.abs(f1FootY - f2FootY) > groundZoneH) return;

    // Both at similar ground level → push apart
    const push = overlapX * 0.5 + 1;
    if (dx >= 0) { f1.pos.x -= push; f2.pos.x += push; }
    else         { f1.pos.x += push; f2.pos.x -= push; }
  }

  /**
   * Check if a fighter's attack hits the opponent.
   * Returns true + applies damage if hit is confirmed.
   *
   * @param {Fighter}  attacker
   * @param {Fighter}  defender
   * @param {ParticleSystem} particles
   * @returns {boolean} wasHit
   */
  function checkMeleeHit(attacker, defender, particles) {
    const aBox = attackBox(attacker);
    if (!aBox) return false;

    const dBox = fighterBox(defender);
    if (!overlaps(aBox, dBox)) return false;

    if (attacker.hitConnectedThisSwing) return false;
    attacker.hitConnectedThisSwing = true;

    const isKick = attacker.sm.is('kick');
    // Kicks deal 30% more damage but are slightly slower
    let dmg = attacker.stats.power * (isKick ? 13 : 10) + Math.random() * 5;

    if (defender.sm.is('defend')) {
      dmg *= 0.4;
      AudioManager.play('shield');
      particles.shieldBurst(defender.pos.x, defender.pos.y - 60, defender.stats.color);
      defender.applyHit(dmg, attacker, false);
      return true;
    }

    AudioManager.play(isKick ? 'heavyHit' : 'hit');
    defender.applyHit(dmg, attacker, true, isKick); // kicks = heavy knockback

    const hitX = (attacker.pos.x + defender.pos.x) * 0.5;
    const hitY  = isKick ? defender.pos.y - 40 : defender.pos.y - 70; // kick hits lower
    particles.hitSpark(hitX, hitY, attacker.stats.color);

    return true;
  }

  /**
   * Check if any projectile hits either fighter.
   *
   * @param {ProjectileManager} pm
   * @param {Fighter[]} fighters
   * @param {ParticleSystem} particles
   */
  function checkProjectileHits(pm, fighters, particles) {
    for (let pi = pm.list.length - 1; pi >= 0; pi--) {
      const proj = pm.list[pi];
      if (proj.dead) continue;

      for (const fighter of fighters) {
        // Don't hit own owner
        if (proj.ownerId === fighter.id) continue;

        const pBox = projectileBox(proj);
        const fBox = fighterBox(fighter);

        if (!overlaps(pBox, fBox)) continue;

        // Hit!
        proj.dead = true;

        let dmg = proj.damage;
        const isDefending = fighter.sm.is('defend');
        if (isDefending) {
          dmg *= 0.4;
          particles.shieldBurst(fighter.pos.x, fighter.pos.y - 60, fighter.stats.color);
          AudioManager.play('shield');
        } else {
          particles.hitSpark(proj.x, proj.y, proj.color);
          particles.specialBurst(proj.x, proj.y, proj.colors);
          AudioManager.play('projectileHit');
        }

        fighter.applyHit(dmg, null, !isDefending && proj.knockback, true);
        break; // one fighter per projectile
      }
    }
  }

  // ── PUBLIC API ────────────────────────────────────────────────
  return {
    overlaps,
    fighterBox,
    attackBox,
    projectileBox,
    separateFighters,
    checkMeleeHit,
    checkProjectileHits,
  };
})();
