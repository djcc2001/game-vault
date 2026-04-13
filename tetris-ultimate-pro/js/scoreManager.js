/* ===== SCORE MANAGER ===== */
const ScoreManager = (() => {
  const STORAGE_KEY = 'tetris_ultimate_scores';
  const RECORD_KEY  = 'tetris_ultimate_records';

  const LINE_POINTS = [0, 100, 300, 500, 800];

  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { single:[], versus:[], cpu:[] }; }
    catch { return { single:[], versus:[], cpu:[] }; }
  }
  function _save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  function _loadRecords() {
    try { return JSON.parse(localStorage.getItem(RECORD_KEY)) || {}; }
    catch { return {}; }
  }
  function _saveRecords(data) { localStorage.setItem(RECORD_KEY, JSON.stringify(data)); }

  // Calculate score for line clears
  function calcScore(lines, level, combo) {
    const base = LINE_POINTS[lines] || 0;
    const comboBonus = combo > 1 ? 50 * combo * level : 0;
    return base * level + comboBonus;
  }

  // Save a score entry
  function saveScore(mode, name, score, level, lines) {
    const data = _load();
    const modeKey = mode || 'single';
    if (!data[modeKey]) data[modeKey] = [];
    data[modeKey].push({
      name: (name || 'PLAYER').toUpperCase().substring(0, 12),
      score, level, lines,
      date: new Date().toLocaleDateString('es-PE')
    });
    data[modeKey].sort((a, b) => b.score - a.score);
    data[modeKey] = data[modeKey].slice(0, 10);
    _save(data);

    // Update record
    const records = _loadRecords();
    if (!records[modeKey] || score > records[modeKey]) {
      records[modeKey] = score;
      _saveRecords(records);
    }
  }

  function getScores(mode) {
    const data = _load();
    return (data[mode] || []);
  }

  function getRecord(mode) {
    const records = _loadRecords();
    return records[mode] || 0;
  }

  function isHighScore(mode, score) {
    const list = getScores(mode);
    if (list.length < 10) return true;
    return score > list[list.length - 1].score;
  }

  return { calcScore, saveScore, getScores, getRecord, isHighScore };
})();
