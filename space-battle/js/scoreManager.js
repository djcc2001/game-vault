/**
 * scoreManager.js
 * Manages in-game score tracking and Top-10 persistence via localStorage.
 */
const ScoreManager = (() => {
  const STORAGE_KEY = 'sba_scores_v1';
  const MAX_ENTRIES = 10;

  /** @type {{ name:string, score:number, level:number, mode:string, date:string }[]} */
  let _scores = [];

  /** Load scores from localStorage */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _scores = raw ? JSON.parse(raw) : [];
    } catch(e) { _scores = []; }
  }

  /** Persist to localStorage */
  function _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_scores)); }
    catch(e) { /* storage full – silently ignore */ }
  }

  /**
   * Add a new score entry, keep sorted top-10.
   * @param {string} name
   * @param {number} score
   * @param {number} level
   * @param {string} mode
   * @returns {number} rank (1-based), or -1 if not in top-10
   */
  function addEntry(name, score, level, mode) {
    load();
    const entry = { name: name.trim().toUpperCase() || 'ANON', score, level, mode, date: new Date().toLocaleDateString('es-PE') };
    _scores.push(entry);
    _scores.sort((a, b) => b.score - a.score);
    _scores = _scores.slice(0, MAX_ENTRIES);
    _save();
    const rank = _scores.findIndex(e => e === entry) + 1;
    return rank;
  }

  /** Returns a copy of the sorted top-10 list */
  function getTopScores() {
    load();
    return [..._scores];
  }

  /** Whether given score qualifies for top-10 */
  function qualifies(score) {
    load();
    return _scores.length < MAX_ENTRIES || score > (_scores[_scores.length - 1]?.score ?? 0);
  }

  return { load, addEntry, getTopScores, qualifies };
})();
