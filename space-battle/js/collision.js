/**
 * collision.js
 * AABB collision detection helpers.
 */
const Collision = (() => {
  /**
   * Check if two AABB rectangles overlap.
   * @param {{ x:number, y:number, w:number, h:number }} a
   * @param {{ x:number, y:number, w:number, h:number }} b
   * @returns {boolean}
   */
  function aabbOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  }

  /**
   * Process all collisions for a frame.
   * @param {Player[]}    players
   * @param {Enemy[]}     enemies
   * @param {Boss|null}   boss
   * @param {Projectile[]} projectiles
   * @param {Function}    onEnemyKilled  (enemy, scoringPlayer)
   * @param {Function}    onBossKilled
   */
  function process(players, enemies, boss, projectiles, onEnemyKilled, onBossKilled) {
    const activePlayers = players.filter(p => p && p.active);
    const activeEnemies = enemies.filter(e => e.active);

    projectiles.forEach(proj => {
      if (!proj.active) return;

      // Player bullets vs enemies
      if (proj.owner === 'player1' || proj.owner === 'player2') {
        const shooter = activePlayers.find(p => p.slot === (proj.owner === 'player1' ? 1 : 2));

        // vs enemies
        activeEnemies.forEach(enemy => {
          if (!enemy.active || !proj.active) return;
          if (aabbOverlap(proj.aabb, enemy.aabb)) {
            proj.active = false;
            enemy.takeDamage(proj.damage);
            if (!enemy.active && shooter) {
              onEnemyKilled(enemy, shooter);
            }
          }
        });

        // vs boss
        if (boss && boss.active && proj.active) {
          if (aabbOverlap(proj.aabb, boss.aabb)) {
            proj.active = false;
            boss.takeDamage(proj.damage);
            if (!boss.active) onBossKilled(boss, shooter);
          }
        }
      }

      // Enemy/boss bullets vs players
      if ((proj.owner === 'enemy' || proj.owner === 'boss') && proj.active) {
        activePlayers.forEach(player => {
          if (!player.active || !proj.active) return;
          if (aabbOverlap(proj.aabb, player.aabb)) {
            proj.active = false;
            player.takeDamage(proj.damage);
          }
        });
      }
    });

    // Enemy bodies vs players
    activeEnemies.forEach(enemy => {
      activePlayers.forEach(player => {
        if (!player.active) return;
        if (aabbOverlap(enemy.aabb, player.aabb)) {
          player.takeDamage(20);
          enemy.takeDamage(999); // destroy on contact
          if (!enemy.active) onEnemyKilled(enemy, null);
        }
      });
    });

    // Boss body vs players
    if (boss && boss.active) {
      activePlayers.forEach(player => {
        if (!player.active) return;
        if (aabbOverlap(boss.aabb, player.aabb)) {
          player.takeDamage(30);
        }
      });
    }
  }

  return { aabbOverlap, process };
})();
