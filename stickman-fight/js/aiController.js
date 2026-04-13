/**
 * aiController.js — Stickman Fight Legends Pro
 *
 * Reactive AI with 3 difficulty levels:
 *
 * EASY   — slow reactions, low aggression, rare defense, never double-jumps,
 *           makes mistakes (misses attacks), doesn't use special well.
 *
 * NORMAL — moderate reaction, balanced aggression, defends sometimes,
 *           occasional double jump, uses special when full.
 *
 * HARD   — fast reactions, high aggression, defends often, uses double jump
 *           aggressively to cross over player, uses special optimally,
 *           presses advantage when player is low HP.
 */

// Difficulty presets
const DIFF = {
  easy: {
    thinkInterval:   0.30,   // slow decisions
    aggressionBase:  0.30,   // low aggression
    aggressionRand:  0.15,
    defendVsAtk:     0.12,   // rarely blocks
    defendVsProj:    0.25,
    specialRange:    200,    // only uses special when very close
    retreatThresh:   0.15,   // retreats early
    retreatChance:   0.35,
    jumpChanceAppr:  0.004,  // rarely jumps
    jumpChanceRetr:  0.006,
    doubleJumpChance:0,      // never double jumps
    attackMissChance:0.45,   // misses 45% of attack opportunities
    kickChance:      0.2,    // mostly punches
    reactDelay:      0.25,   // slow reaction
  },
  normal: {
    thinkInterval:   0.13,
    aggressionBase:  0.50,
    aggressionRand:  0.25,
    defendVsAtk:     0.35,
    defendVsProj:    0.65,
    specialRange:    400,
    retreatThresh:   0.30,
    retreatChance:   0.55,
    jumpChanceAppr:  0.009,
    jumpChanceRetr:  0.015,
    doubleJumpChance:0.003,  // uses double jump occasionally
    attackMissChance:0.15,
    kickChance:      0.45,
    reactDelay:      0.10,
  },
  hard: {
    thinkInterval:   0.06,   // very fast decisions
    aggressionBase:  0.78,
    aggressionRand:  0.20,
    defendVsAtk:     0.70,   // blocks most attacks
    defendVsProj:    0.90,
    specialRange:    500,
    retreatThresh:   0.30,
    retreatChance:   0.45,   // less retreat — more aggressive
    jumpChanceAppr:  0.012,
    jumpChanceRetr:  0.020,
    doubleJumpChance:0.010,  // uses double jump to cross over player
    attackMissChance:0.03,
    kickChance:      0.50,
    reactDelay:      0.03,
  },
};

class AIController {
  /**
   * @param {Fighter} self
   * @param {Fighter} opponent
   * @param {string}  difficulty  'easy' | 'normal' | 'hard'
   */
  constructor(self, opponent, difficulty = 'normal') {
    this.self     = self;
    this.opponent = opponent;
    this.cfg      = DIFF[difficulty] || DIFF.normal;
    this.difficulty = difficulty;

    this.thinkTimer     = 0;
    this.jumpCooldown   = 0;
    this.retreatTimer   = 0;
    this.reactDelay     = 0;
    this.doubleJumpUsed = false; // track within a single air session

    this.intent = 'approach';
    // Randomise aggression within preset range
    this.aggressionBias = this.cfg.aggressionBase + Math.random() * this.cfg.aggressionRand;
  }

  /**
   * Called every frame. Returns action object.
   */
  update(dt, pm) {
    const self = this.self;
    const opp  = this.opponent;
    const cfg  = this.cfg;

    const actions = {
      left: false, right: false,
      jump: false, defend: false,
      attack: false, kick: false, special: false,
    };

    if (self.sm.is('ko', 'hit')) return actions;

    // Cooldowns
    this.thinkTimer   -= dt;
    this.jumpCooldown  = Math.max(0, this.jumpCooldown - dt);
    this.reactDelay    = Math.max(0, this.reactDelay - dt);

    // Reset double-jump tracker when grounded
    if (self.grounded) this.doubleJumpUsed = false;

    // Perception
    const dx          = opp.pos.x - self.pos.x;
    const dist        = Math.abs(dx);
    const facingOpp   = (dx > 0) === self.facingRight;
    const attackRange = self.stats.reach + 40;
    const dangerRange = attackRange * 1.5;
    const projDanger  = this._incomingProjectileDanger(pm);
    const oppAttacking= opp.sm.is('attack', 'kick', 'special');
    const lowHP       = self.hp < self.maxHp * cfg.retreatThresh;
    const energyFull  = self.energy >= self.maxEnergy && self.specialCooldown === 0;
    const oppLowHP    = opp.hp < opp.maxHp * 0.3; // press advantage on hard

    // ── DECIDE INTENT ──────────────────────────────────────────
    if (this.thinkTimer <= 0) {
      this.thinkTimer = cfg.thinkInterval + Math.random() * cfg.thinkInterval * 0.4;
      this._decideIntent(dist, attackRange, dangerRange, oppAttacking,
                         lowHP, energyFull, projDanger, oppLowHP);
    }

    // ── DEFEND vs projectile ───────────────────────────────────
    if (projDanger && self.grounded && this.reactDelay <= 0) {
      if (Math.random() < cfg.defendVsProj) {
        actions.defend = true;
        return actions;
      }
    }

    // ── DEFEND vs incoming melee ───────────────────────────────
    if (oppAttacking && dist < dangerRange && self.grounded && this.reactDelay <= 0) {
      if (Math.random() < cfg.defendVsAtk) {
        actions.defend = true;
        return actions;
      }
    }

    // ── SPECIAL ───────────────────────────────────────────────
    if (this.intent === 'special') {
      actions.special = true;
      return actions;
    }

    // ── DOUBLE JUMP (hard/normal only) ─────────────────────────
    // Use double jump to leap over the opponent when very close and airborne
    if (!self.grounded && !this.doubleJumpUsed && self.jumpsLeft > 0) {
      if (Math.random() < cfg.doubleJumpChance && dist < attackRange * 1.3) {
        actions.jump = true;
        this.doubleJumpUsed = true;
        return actions;
      }
    }

    // ── EXECUTE INTENT ────────────────────────────────────────
    switch (this.intent) {

      case 'approach':
        if (dx > 0) actions.right = true;
        else        actions.left  = true;
        if (this.jumpCooldown <= 0 && Math.random() < cfg.jumpChanceAppr) {
          actions.jump = true;
          this.jumpCooldown = 1.5 + Math.random() * 2;
        }
        break;

      case 'attack':
        // Close the gap
        if (dist > attackRange * 0.85) {
          if (dx > 0) actions.right = true;
          else        actions.left  = true;
        }
        // Strike — easy AI misses more
        if (dist <= attackRange && facingOpp && Math.random() > cfg.attackMissChance) {
          if (Math.random() < cfg.kickChance) actions.kick   = true;
          else                                actions.attack = true;
        }
        // Hard: press harder when opponent is low HP
        if (this.difficulty === 'hard' && oppLowHP && dist <= dangerRange) {
          if (Math.random() < 0.3) {
            if (Math.random() < 0.5) actions.attack = true;
            else                     actions.kick   = true;
          }
        }
        break;

      case 'retreat':
        if (dx > 0) actions.left  = true;
        else        actions.right = true;
        if (this.jumpCooldown <= 0 && Math.random() < cfg.jumpChanceRetr) {
          actions.jump = true;
          this.jumpCooldown = 1.0 + Math.random() * 1.5;
        }
        break;

      case 'defend':
        actions.defend = true;
        this.retreatTimer -= dt;
        if (this.retreatTimer <= 0) this.intent = 'approach';
        break;
    }

    return actions;
  }

  _decideIntent(dist, attackRange, dangerRange, oppAttacking,
                lowHP, energyFull, projDanger, oppLowHP) {
    const cfg = this.cfg;

    // Special
    if (energyFull && dist < cfg.specialRange) {
      this.intent = 'special';
      return;
    }

    // Retreat when low HP
    if (lowHP && Math.random() < cfg.retreatChance) {
      this.intent = 'retreat';
      this.retreatTimer = 0.7 + Math.random() * 0.6;
      return;
    }

    // Hard: never retreat when opponent is also low
    if (this.difficulty === 'hard' && oppLowHP) {
      this.intent = 'attack';
      return;
    }

    // Defend vs incoming
    if (oppAttacking && dist < dangerRange && Math.random() < cfg.defendVsAtk * 0.8) {
      this.intent = 'defend';
      this.retreatTimer = 0.3 + Math.random() * 0.3;
      return;
    }

    // Attack
    if (dist <= dangerRange && Math.random() < this.aggressionBias) {
      this.intent = 'attack';
      return;
    }

    this.intent = 'approach';
  }

  _incomingProjectileDanger(pm) {
    const self = this.self;
    for (const p of pm.list) {
      if (p.ownerId === self.id) continue;
      const dx = self.pos.x - p.x;
      if ((dx > 0) === (p.vx > 0)) continue;
      if (Math.abs(dx) < 260 && Math.abs(p.y - (self.pos.y - 50)) < 90) return true;
    }
    return false;
  }

  applyActions(actions, dt, projectileManager) {
    const f = this.self;
    if (actions.left)    f.walkLeft(dt);
    if (actions.right)   f.walkRight(dt);
    if (actions.jump)    f.jump();
    if (actions.attack)  f.attack();
    if (actions.kick)    f.kick();
    if (actions.special) f.useSpecial(projectileManager);
    if (actions.defend)  f.startDefend();
    else                 f.stopDefend();
  }
}
