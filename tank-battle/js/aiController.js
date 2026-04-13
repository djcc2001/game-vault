/**
 * aiController.js
 * Controlador de IA para tanques CPU.
 * Estados: 'hunt' | 'evade' | 'patrol' | 'reposition'
 * Todos los timers usan dt real. Sin setTimeout. Sin valores fijos de 0.016.
 */

class AIController {
  constructor(tank, params) {
    this.tank   = tank;
    this.params = params;

    this.state         = 'patrol';
    this.decisionTimer = 0;
    this.stateTimer    = 0;
    this.shootTimer    = params.shootDelay || 1;

    this.patrolAngle   = Math.random() * Math.PI * 2;
    this.patrolTimer   = 0;

    this.stuckCheckTimer = 0;
    this.lastX           = tank.x;
    this.lastY           = tank.y;
    this.stuckCount      = 0;

    this.reposAngle    = 0;
    this.reposTimer    = 0;

    this.input = { forward:false, backward:false, left:false, right:false, shoot:false };
  }

  update(target, incomingBullets, obstacles, canvasW, canvasH, dt) {
    if (!this.tank.alive) { this._clearInput(); return this.input; }

    this._clearInput();

    this.decisionTimer   -= dt;
    this.shootTimer      -= dt;
    this.stateTimer      += dt;
    this.stuckCheckTimer += dt;

    if (this.stuckCheckTimer >= 0.8) {
      this._checkStuck();
      this.stuckCheckTimer = 0;
    }

    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.params.reactionTime;
      this._decide(target, incomingBullets);
    }

    this._execute(target, incomingBullets, dt);
    return this.input;
  }

  _decide(target, incomingBullets) {
    if (this._hasThreat(incomingBullets)) { this._setState('evade'); return; }
    if (this.stuckCount >= 2) {
      this._setState('reposition');
      this.reposAngle = this.tank.angle + Math.PI * (0.6 + Math.random() * 0.8);
      this.reposTimer = 0.5 + Math.random() * 0.5;
      this.stuckCount = 0;
      return;
    }
    if (!target || !target.alive) { this._setState('patrol'); return; }
    this._setState('hunt');
  }

  _setState(s) {
    if (this.state !== s) { this.state = s; this.stateTimer = 0; }
  }

  _execute(target, incomingBullets, dt) {
    switch (this.state) {
      case 'hunt':       this._doHunt(target);            break;
      case 'evade':      this._doEvade(incomingBullets);  break;
      case 'patrol':     this._doPatrol(dt);              break;
      case 'reposition': this._doReposition(dt);          break;
    }
  }

  _doHunt(target) {
    if (!target || !target.alive) { this._setState('patrol'); return; }
    const dist        = Physics.distance(this.tank.x, this.tank.y, target.x, target.y);
    const perfect     = Physics.angleTo(this.tank.x, this.tank.y, target.x, target.y);
    const maxErr      = (1 - this.params.accuracy) * Math.PI * 0.4;
    const aimAngle    = perfect + (Math.random()*2-1) * maxErr;

    this._steerToward(aimAngle, 0.18);

    if (dist > 220)      this.input.forward  = true;
    else if (dist < 90)  this.input.backward = true;
    else if (Math.random() < 0.25) this.input.forward = true;

    const diff      = Math.abs(Physics.normalizeAngle(aimAngle - this.tank.angle));
    const threshold = 0.20 + (1 - this.params.accuracy) * 0.25;
    if (diff < threshold && this.shootTimer <= 0) {
      this.input.shoot = true;
      this.shootTimer  = this.params.shootDelay;
    }
  }

  _doEvade(bullets) {
    const threat = this._getClosestThreat(bullets);
    if (!threat) { this._setState('hunt'); return; }
    const flee   = Physics.angleTo(threat.x, threat.y, this.tank.x, this.tank.y);
    const side   = Math.sin(this.stateTimer * 5) >= 0 ? 1 : -1;
    this._steerToward(flee + side * (Math.PI / 2), 0.1);
    this.input.forward = true;
    if (!this._hasThreat(bullets)) this._setState('hunt');
  }

  _doPatrol(dt) {
    this.patrolTimer -= dt;
    if (this.patrolTimer <= 0) {
      this.patrolAngle = Math.random() * Math.PI * 2;
      this.patrolTimer = 1.2 + Math.random() * 1.8;
    }
    this._steerToward(this.patrolAngle, 0.2);
    this.input.forward = true;
  }

  _doReposition(dt) {
    this.reposTimer -= dt;
    if (this.reposTimer <= 0) { this._setState('patrol'); return; }
    this._steerToward(this.reposAngle, 0.1);
    this.input.forward = true;
  }

  _steerToward(angle, threshold) {
    const diff = Physics.normalizeAngle(angle - this.tank.angle);
    if (Math.abs(diff) > threshold) {
      if (diff > 0) this.input.right = true;
      else          this.input.left  = true;
    }
  }

  _hasThreat(bullets) { return !!this._getClosestThreat(bullets); }

  _getClosestThreat(bullets) {
    if (!bullets || !bullets.length) return null;
    const radius = this.params.evadeRadius || 90;
    let closest = null, closestDist = Infinity;
    for (const b of bullets) {
      if (!b.alive) continue;
      const dist = Physics.distance(this.tank.x, this.tank.y, b.x, b.y);
      if (dist > radius) continue;
      const toUs = Physics.angleTo(b.x, b.y, this.tank.x, this.tank.y);
      const diff = Math.abs(Physics.normalizeAngle(b.angle - toUs));
      if (diff < Math.PI / 2.5 && dist < closestDist) {
        closest = b; closestDist = dist;
      }
    }
    return closest;
  }

  _checkStuck() {
    const moved = Physics.distance(this.tank.x, this.tank.y, this.lastX, this.lastY);
    if (moved < 8) this.stuckCount++;
    else           this.stuckCount = Math.max(0, this.stuckCount - 1);
    this.lastX = this.tank.x;
    this.lastY = this.tank.y;
  }

  _clearInput() {
    this.input.forward = this.input.backward =
    this.input.left    = this.input.right    =
    this.input.shoot   = false;
  }

  setParams(params) {
    this.params     = params;
    this.shootTimer = Math.min(this.shootTimer, params.shootDelay);
  }
}
