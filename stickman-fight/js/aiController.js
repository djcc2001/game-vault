/**
 * aiController.js — Stickman Fight Legends Pro
 *
 * Reactive AI with 3 difficulty levels.
 * HARD: Uses dash, double jump, defends aggressively, combos.
 */

const DIFF = {
  easy: {
    thinkInterval:   0.35,
    aggressionBase:  0.40,
    aggressionRand:  0.15,
    defendVsAtk:     0.30,
    defendVsProj:    0.50,
    specialRange:    250,
    retreatThresh:   0.25,
    retreatChance:   0.40,
    jumpChanceAppr:  0.008,
    jumpChanceRetr:  0.012,
    doubleJumpChance:0.005,
    dashChance:      0.008,
    attackMissChance:0.40,
    kickChance:      0.25,
    reactDelay:      0.25,
    attackBurst:     0.05,
  },
  normal: {
    thinkInterval:   0.15,
    aggressionBase:  0.55,
    aggressionRand:  0.20,
    defendVsAtk:     0.50,
    defendVsProj:    0.65,
    specialRange:    400,
    retreatThresh:   0.35,
    retreatChance:   0.40,
    jumpChanceAppr:  0.015,
    jumpChanceRetr:  0.020,
    doubleJumpChance:0.010,
    dashChance:      0.015,
    attackMissChance:0.12,
    kickChance:      0.40,
    reactDelay:      0.10,
    attackBurst:     0.12,
  },
  hard: {
    thinkInterval:   0.06,
    aggressionBase:  0.85,
    aggressionRand:  0.15,
    defendVsAtk:     0.80,
    defendVsProj:    0.90,
    specialRange:    550,
    retreatThresh:   0.20,
    retreatChance:   0.25,
    jumpChanceAppr:  0.025,
    jumpChanceRetr:  0.030,
    doubleJumpChance:0.020,
    dashChance:      0.025,
    attackMissChance:0.03,
    kickChance:      0.50,
    reactDelay:      0.03,
    attackBurst:     0.20,
  },
};

class AIController {
  constructor(self, opponent, difficulty = 'normal') {
    this.self     = self;
    this.opponent = opponent;
    this.cfg      = DIFF[difficulty] || DIFF.normal;
    this.difficulty = difficulty;

    this.thinkTimer     = 0;
    this.jumpCooldown   = 0;
    this.retreatTimer   = 0;
    this.reactDelay     = 0;
    this.doubleJumpUsed = false;
    this.actionCooldown = 0;

    this.intent = 'approach';
    this.aggressionBias = this.cfg.aggressionBase + Math.random() * this.cfg.aggressionRand;
  }

  update(dt, pm) {
    const self = this.self;
    const opp  = this.opponent;
    const cfg  = this.cfg;

    const actions = {
      left: false, right: false,
      jump: false, defend: false,
      attack: false, kick: false, special: false, dash: false,
    };

    if (self.sm.is('ko', 'hit')) return actions;

    this.thinkTimer   -= dt;
    this.jumpCooldown  = Math.max(0, this.jumpCooldown - dt);
    this.reactDelay    = Math.max(0, this.reactDelay - dt);
    this.actionCooldown = Math.max(0, this.actionCooldown - dt);

    if (self.grounded) this.doubleJumpUsed = false;

    const dx          = opp.pos.x - self.pos.x;
    const dist        = Math.abs(dx);
    const facingOpp   = (dx > 0) === self.facingRight;
    const attackRange = self.stats.reach + 50;
    const dangerRange = attackRange * 1.4;
    const projDanger  = this._incomingProjectileDanger(pm);
    const oppAttacking= opp.sm.is('attack', 'kick', 'special');
    const lowHP       = self.hp < self.maxHp * cfg.retreatThresh;
    const energyFull  = self.energy >= self.maxEnergy && self.specialCooldown === 0;
    const oppLowHP    = opp.hp < opp.maxHp * 0.35;

    if (this.thinkTimer <= 0) {
      this.thinkTimer = cfg.thinkInterval + Math.random() * cfg.thinkInterval * 0.3;
      this._decideIntent(dist, attackRange, dangerRange, oppAttacking,
                         lowHP, energyFull, projDanger, oppLowHP);
    }

    if (this.actionCooldown > 0) return actions;

    if (projDanger && self.grounded && Math.random() < cfg.defendVsProj * 1.5) {
      actions.defend = true;
      this.reactDelay = cfg.reactDelay;
      this.actionCooldown = 0.1;
      return actions;
    }

    if (oppAttacking && dist < dangerRange && self.grounded && Math.random() < cfg.defendVsAtk * 1.5) {
      actions.defend = true;
      this.reactDelay = cfg.reactDelay;
      this.actionCooldown = 0.08;
      return actions;
    }

    if (energyFull && dist < cfg.specialRange && Math.random() < 0.7) {
      actions.special = true;
      this.actionCooldown = 0.15;
      return actions;
    }

    if (!self.grounded && !this.doubleJumpUsed && self.jumpsLeft > 0) {
      if (Math.random() < cfg.doubleJumpChance * 3) {
        actions.jump = true;
        this.doubleJumpUsed = true;
        this.actionCooldown = 0.05;
        return actions;
      }
    }

    if (self.grounded && self.dashCooldown <= 0 && Math.random() < cfg.dashChance * 2) {
      if (dist < attackRange * 1.2) {
        actions.dash = true;
        this.actionCooldown = 0.1;
        return actions;
      }
    }

    switch (this.intent) {
      case 'approach':
        if (dist > attackRange * 0.8) {
          if (dx > 0) actions.right = true;
          else        actions.left  = true;
        }
        if (dist <= attackRange && facingOpp && Math.random() > cfg.attackMissChance) {
          if (Math.random() < cfg.kickChance) actions.kick = true;
          else                                actions.attack = true;
          this.actionCooldown = 0.12;
        }
        if (this.jumpCooldown <= 0 && Math.random() < cfg.jumpChanceAppr) {
          actions.jump = true;
          this.jumpCooldown = 0.8 + Math.random() * 1.0;
          this.actionCooldown = 0.05;
        }
        break;

      case 'attack':
        if (dist > attackRange * 0.7) {
          if (dx > 0) actions.right = true;
          else        actions.left  = true;
        }
        
        if (dist <= attackRange && facingOpp && Math.random() > cfg.attackMissChance) {
          if (Math.random() < cfg.kickChance) actions.kick = true;
          else                                actions.attack = true;
          this.actionCooldown = 0.10;
        }
        
        if (oppLowHP && dist <= attackRange * 1.2) {
          if (Math.random() < cfg.attackBurst) {
            if (Math.random() < cfg.kickChance) actions.kick = true;
            else                                actions.attack = true;
            this.actionCooldown = 0.08;
          }
        }
        
        if (dist < attackRange * 0.5 && Math.random() < 0.3) {
          actions.dash = true;
          this.actionCooldown = 0.12;
        }
        break;

      case 'retreat':
        if (dx > 0) actions.left  = true;
        else        actions.right = true;
        if (this.jumpCooldown <= 0 && Math.random() < cfg.jumpChanceRetr) {
          actions.jump = true;
          this.jumpCooldown = 0.6 + Math.random() * 1.0;
          this.actionCooldown = 0.05;
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

    if (energyFull && dist < cfg.specialRange) {
      this.intent = 'special';
      return;
    }

    if (lowHP && Math.random() < cfg.retreatChance) {
      this.intent = 'retreat';
      this.retreatTimer = 0.4 + Math.random() * 0.4;
      return;
    }

    if (oppAttacking && dist < dangerRange * 0.8 && Math.random() < cfg.defendVsAtk) {
      this.intent = 'defend';
      this.retreatTimer = 0.15 + Math.random() * 0.15;
      return;
    }

    if (dist <= dangerRange * 1.2) {
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
      if (Math.abs(dx) < 300 && Math.abs(p.y - (self.pos.y - 50)) < 100) return true;
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
    if (actions.dash)    f.dash();
    if (actions.defend)  f.startDefend();
    else                 f.stopDefend();
  }
}
