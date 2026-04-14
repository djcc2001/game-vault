/**
 * collision.js - TUNED EDITION
 * Stickman Fight Legends Pro
 *
 * Enhanced with combo damage scaling, counter detection, and improved hitboxes.
 */

const Collision = (() => {

  function overlaps(a, b) {
    return (
      Math.abs(a.x - b.x) < (a.w + b.w) * 0.5 &&
      Math.abs(a.y - b.y) < (a.h + b.h) * 0.5
    );
  }

  function fighterBox(f) {
    return { x: f.pos.x, y: f.pos.y - f.height * 0.5, w: f.width, h: f.height };
  }

  function attackBox(f, stageW = 1920) {
    const isPunch = f.sm.is('attack');
    const isKick  = f.sm.is('kick');
    if (!isPunch && !isKick) return null;

    if (f.attackFrame < 0.10 || f.attackFrame > 0.72) return null;

    const dir   = f.facingRight ? 1 : -1;
    const baseReach = (f.stats.reach || 70) * (isKick ? 1.3 : 1.0);

    const boxY = isKick
      ? f.pos.y - f.height * 0.45
      : f.pos.y - f.height * 0.75;
    const boxH = f.height * (isKick ? 0.45 : 0.6);

    const comboBonus = 1 + (f.comboCount * 0.03);
    const reachBoost = Math.min(comboBonus, 1.4);
    
    const edgeBonus = (f.pos.x < 100 || f.pos.x > stageW - 100) ? 1.15 : 1.0;
    const reach = baseReach * reachBoost * edgeBonus;

    return {
      x: f.pos.x + dir * (f.width * 0.5 + reach * 0.5),
      y: boxY,
      w: reach,
      h: boxH,
    };
  }

  function projectileBox(p) {
    return { x: p.x, y: p.y, w: p.radius * 2, h: p.radius * 2 };
  }

  function separateFighters(f1, f2, stageW = 1920) {
    const dx = f2.pos.x - f1.pos.x;
    const overlapX = (f1.width + f2.width) * 0.5 - Math.abs(dx);
    if (overlapX <= 0) return;

    const groundZoneH = f1.height * 0.35;
    const f1FootY = f1.pos.y;
    const f2FootY = f2.pos.y;

    if (Math.abs(f1FootY - f2FootY) > groundZoneH) return;

    if (f1.isDashing || f2.isDashing) return;

    const edgeMargin = 80;
    const nearLeftEdge = f1.pos.x < edgeMargin || f2.pos.x < edgeMargin;
    const nearRightEdge = f1.pos.x > stageW - edgeMargin || f2.pos.x > stageW - edgeMargin;
    
    let push = overlapX * 0.5 + 1;
    if (nearLeftEdge || nearRightEdge) {
      push *= 0.25;
    }
    
    if (dx >= 0) { f1.pos.x -= push; f2.pos.x += push; }
    else         { f1.pos.x += push; f2.pos.x -= push; }
  }

  function checkMeleeHit(attacker, defender, particles, stageW = 1920) {
    const aBox = attackBox(attacker, stageW);
    if (!aBox) return false;

    const dBox = fighterBox(defender);
    if (!overlaps(aBox, dBox)) return false;

    if (attacker.hitConnectedThisSwing) return false;
    attacker.hitConnectedThisSwing = true;
    attacker.comboHitThisSwing = true;
    attacker._addComboHit();

    const isKick = attacker.sm.is('kick');
    let baseDmg = isKick ? 8 : 5;
    
    const comboScaling = 1 + (attacker.comboCount * 0.08);
    const comboDmg = Math.min(baseDmg * comboScaling, baseDmg * 1.8);
    
    let dmg = attacker.stats.power * comboDmg + Math.random() * 3;

    const airBonus = !attacker.grounded && attacker.airComboCount > 0;
    if (airBonus) {
      dmg *= 1.15;
      const hitX = (attacker.pos.x + defender.pos.x) * 0.5;
      const hitY  = isKick ? defender.pos.y - 30 : defender.pos.y - 60;
      particles.airHit(hitX, hitY, attacker.stats.color);
    }

    if (defender.sm.is('defend')) {
      dmg *= 0.35;
      AudioManager.play('shield');
      particles.shieldBurst(defender.pos.x, defender.pos.y - 60, defender.stats.color);
      
      defender.counterWindow = defender.COUNTER_WINDOW;
      
      defender.applyHit(dmg, attacker, false);
      return true;
    }

    if (defender.sm.is('dash')) {
      return false;
    }

    const heavy = isKick || (attacker.comboCount >= 3);
    
    if (heavy) {
      particles.bigHitSpark(
        (attacker.pos.x + defender.pos.x) * 0.5,
        isKick ? defender.pos.y - 40 : defender.pos.y - 70,
        attacker.stats.color
      );
    } else {
      particles.hitSpark(
        (attacker.pos.x + defender.pos.x) * 0.5,
        isKick ? defender.pos.y - 40 : defender.pos.y - 70,
        attacker.stats.color
      );
    }

    AudioManager.play(isKick ? 'heavyHit' : 'hit');
    defender.applyHit(dmg, attacker, true, heavy);

    if (attacker.comboCount >= 5) {
      particles.comboEffect(
        defender.pos.x,
        defender.pos.y - 80,
        attacker.stats.color
      );
    }

    return true;
  }

  function checkProjectileHits(pm, fighters, particles) {
    for (let pi = pm.list.length - 1; pi >= 0; pi--) {
      const proj = pm.list[pi];
      if (proj.dead) continue;

      for (const fighter of fighters) {
        if (proj.ownerId === fighter.id) continue;

        const pBox = projectileBox(proj);
        const fBox = fighterBox(fighter);

        if (!overlaps(pBox, fBox)) continue;

        proj.dead = true;

        let dmg = proj.damage;
        const isDefending = fighter.sm.is('defend');
        if (isDefending) {
          dmg *= 0.3;
          particles.shieldBurst(fighter.pos.x, fighter.pos.y - 60, fighter.stats.color);
          fighter.counterWindow = fighter.COUNTER_WINDOW;
          AudioManager.play('shield');
        } else {
          particles.hitSpark(proj.x, proj.y, proj.color);
          particles.specialBurst(proj.x, proj.y, proj.colors);
          AudioManager.play('projectileHit');
          
          const shooter = fighters.find(f => f.id === proj.ownerId);
          if (shooter) shooter._addComboHit();
        }

        fighter.applyHit(dmg, null, !isDefending && proj.knockback, true);
        break;
      }
    }
  }

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
