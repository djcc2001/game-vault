/* ===== LEVEL MANAGER ===== */
const LevelManager = (() => {
  const MAX_LEVEL = 15;
  // Drop interval in ms per level (piece falls faster at higher levels)
  const SPEEDS = [800, 750, 700, 650, 600, 560, 520, 480, 440, 400, 370, 340, 310, 280, 250];

  function getSpeed(level) {
    const idx = Math.min(level - 1, MAX_LEVEL - 1);
    return SPEEDS[idx];
  }

  function calcLevel(lines) {
    return Math.min(Math.floor(lines / 10) + 1, MAX_LEVEL);
  }

  function getMaxLevel() { return MAX_LEVEL; }

  return { getSpeed, calcLevel, getMaxLevel };
})();
