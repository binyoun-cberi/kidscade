(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.DiceSurvivalEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FACES = Object.freeze([4, 6, 8, 12, 20]);
  const SOLO_STAGES = Object.freeze([
    { threshold: 0, faces: 6 }, { threshold: 3, faces: 8 },
    { threshold: 6, faces: 12 }, { threshold: 10, faces: 20 }
  ]);

  // Use rejection sampling so every face is equally probable. No weighting,
  // streak protection, rubber-banding, or dependence on the chosen numbers.
  function fairRoll(faces, rng) {
    if (!FACES.includes(faces)) throw new RangeError('Unsupported die');
    const source = rng || (typeof crypto !== 'undefined' ? crypto : null);
    if (!source || typeof source.getRandomValues !== 'function') {
      return Math.floor(Math.random() * faces) + 1;
    }
    const range = 0x100000000;
    const limit = Math.floor(range / faces) * faces;
    const value = new Uint32Array(1);
    do { source.getRandomValues(value); } while (value[0] >= limit);
    return (value[0] % faces) + 1;
  }

  function validPick(values, faces) {
    return Array.isArray(values) &&
      values.length > 0 && values.length < faces &&
      new Set(values).size === values.length &&
      values.every(n => Number.isInteger(n) && n >= 1 && n <= faces);
  }

  function survivalChance(count, faces) {
    if (!Number.isInteger(count) || count < 0 || !FACES.includes(faces)) return NaN;
    return count / faces;
  }

  function riskScore(count, faces) {
    return Math.round(100 * faces / count);
  }

  function dieForSolo(streak) {
    if (!Number.isInteger(streak) || streak < 0) throw new RangeError('Invalid streak');
    return [...SOLO_STAGES].reverse().find(stage => streak >= stage.threshold).faces;
  }

  function dieForDuel(round) {
    if (!Number.isInteger(round) || round < 1) throw new RangeError('Invalid round');
    return [6, 8, 12, 20][Math.min(3, Math.floor((round - 1) / 3))];
  }

  function newPlayer(name) {
    return { name: String(name || '도전자').slice(0, 14), streak: 0,
      best: 0, survived: 0, failed: 0, points: 0 };
  }

  function resolveRoll(player, selected, faces, result) {
    if (!validPick(selected, faces)) throw new RangeError('Choose 1 to N-1 distinct numbers');
    if (!Number.isInteger(result) || result < 1 || result > faces) throw new RangeError('Invalid result');
    const alive = selected.includes(result);
    const streak = alive ? player.streak + 1 : 0;
    return {
      ...player, streak,
      best: Math.max(player.best, streak),
      survived: player.survived + (alive ? 1 : 0),
      failed: player.failed + (alive ? 0 : 1),
      points: player.points + (alive ? riskScore(selected.length, faces) : 0),
      alive
    };
  }

  function roundStats(results, faces) {
    const valid = results.filter(v => Number.isInteger(v) && v >= 1 && v <= faces);
    const count = valid.length;
    const total = valid.reduce((sum, v) => sum + v, 0);
    const histogram = Array.from({ length: faces }, (_, i) => valid.filter(v => v === i + 1).length);
    return { count, average: count ? total / count : null, expectedAverage: (faces + 1) / 2,
      histogram };
  }

  function rankPlayers(players) {
    return players.map((player, i) => ({ ...player, index: i }))
      .sort((a, b) => b.points - a.points || b.best - a.best || b.survived - a.survived || a.index - b.index);
  }

  return Object.freeze({ FACES, SOLO_STAGES, fairRoll, validPick, survivalChance,
    riskScore, dieForSolo, dieForDuel, newPlayer, resolveRoll, roundStats, rankPlayers });
});
