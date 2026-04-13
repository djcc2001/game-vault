/**
 * storage.js — Persistencia JSON en localStorage
 * Módulo de almacenamiento sin variables globales
 */
const Storage = (() => {
  const KEYS = {
    RANKING: '5enraya_ranking',
    HISTORY: '5enraya_history',
  };

  const _read = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const _write = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  };

  // ── RANKING ──────────────────────────────────────────
  const getRanking = () => _read(KEYS.RANKING) || [];

  const addResult = ({ winner, loser, mode, moves, duration }) => {
    const ranking = getRanking();
    const ts = Date.now();

    // Buscar o crear entrada del ganador
    let entry = ranking.find(e => e.name === winner);
    if (!entry) {
      entry = { name: winner, wins: 0, losses: 0, games: 0, totalMoves: 0 };
      ranking.push(entry);
    }
    entry.wins++;
    entry.games++;
    entry.totalMoves += moves;
    entry.lastWin = ts;

    // Buscar o crear entrada del perdedor (si no es CPU)
    if (loser && loser !== 'CPU') {
      let loserEntry = ranking.find(e => e.name === loser);
      if (!loserEntry) {
        loserEntry = { name: loser, wins: 0, losses: 0, games: 0, totalMoves: 0 };
        ranking.push(loserEntry);
      }
      loserEntry.losses++;
      loserEntry.games++;
    }

    // Guardar historial
    const history = _read(KEYS.HISTORY) || [];
    history.unshift({ winner, loser, mode, moves, duration, ts });
    if (history.length > 100) history.pop();
    _write(KEYS.HISTORY, history);

    // Ordenar ranking por victorias
    ranking.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    _write(KEYS.RANKING, ranking);
    return ranking;
  };

  const clearRanking = () => {
    _write(KEYS.RANKING, []);
    _write(KEYS.HISTORY, []);
  };

  const getHistory = () => _read(KEYS.HISTORY) || [];

  return Object.freeze({ getRanking, addResult, clearRanking, getHistory });
})();
