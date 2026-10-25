/* Research Lab Water Sort: deterministic rules, provably reversible levels, and bounded search.
 * Adapted from the rule/level-verification design of vp125/water-sort (MIT, © 2026 vp125).
 * See THIRD_PARTY_NOTICES.md. All arrays are bottom-to-top colour IDs.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LabWaterSortCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LEVEL_COUNT = 100;
  const CAPACITY = 4;
  const MARKERS = ['●', '◆', '▲', '■', '★', '✚', '✿', '⬟', '☀', '☾', '♣', '♥'];
  const clone = tubes => tubes.map(tube => tube.slice());
  const stateKey = tubes => tubes.map(t => t.join(',')).join('|');
  const canonicalKey = tubes => tubes.map(t => t.join(',')).sort().join('|');
  function runLength(tube) {
    if (!tube || !tube.length) return 0;
    let count = 1;
    for (let i = tube.length - 2; i >= 0 && tube[i] === tube[tube.length - 1]; i--) count++;
    return count;
  }
  function canPour(tubes, from, to, capacity = CAPACITY) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to ||
        from < 0 || to < 0 || from >= tubes.length || to >= tubes.length) return false;
    const src = tubes[from], dst = tubes[to];
    return src.length > 0 && dst.length < capacity &&
      (!dst.length || dst[dst.length - 1] === src[src.length - 1]);
  }
  function pour(tubes, from, to, capacity = CAPACITY) {
    if (!canPour(tubes, from, to, capacity)) return 0;
    const src = tubes[from], dst = tubes[to];
    const count = Math.min(runLength(src), capacity - dst.length);
    const color = src[src.length - 1];
    for (let n = 0; n < count; n++) { src.pop(); dst.push(color); }
    return count;
  }
  function solved(tubes, capacity = CAPACITY) {
    return tubes.every(t => !t.length || (t.length === capacity && runLength(t) === capacity));
  }
  function config(level) {
    const n = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(Number(level) || 1)));
    const colors = n <= 10 ? 3 + Math.floor((n - 1) / 5)
      : n <= 50 ? 4 + Math.floor((n - 11) / 8)
      : n <= 75 ? 8 + Math.floor((n - 51) / 12)
      : 9 + Math.floor((n - 76) / 8);
    const empty = n >= 30 && n % 10 === 0 ? 1 : 2;
    return { colors, empty, capacity: CAPACITY, level: n };
  }
  function seededRandom(seed) {
    let x = seed >>> 0 || 1;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }
  const choice = (rng, size) => Math.floor(rng() * size);

  // Remove loops in the known valid solution without changing the final board.
  // This makes built-in hints useful rather than replaying needless shuffles.
  function shortenSolution(initial, moves, capacity = CAPACITY) {
    const board = clone(initial), route = [], states = [stateKey(board)];
    const seen = new Map([[states[0], 0]]);
    for (const move of moves) {
      if (!pour(board, move[0], move[1], capacity)) throw new Error('Invalid witness move');
      const key = stateKey(board);
      if (seen.has(key)) {
        const previous = seen.get(key);
        while (route.length > previous) {
          route.pop();
          seen.delete(states.pop());
        }
      } else {
        route.push(move);
        states.push(key);
        seen.set(key, route.length);
      }
    }
    if (!solved(board, capacity)) throw new Error('Witness does not reach a solved board');
    return route;
  }

  // Every scramble operation is the *exact inverse* of a legal whole-run pour.
  // The reversed list is therefore a constructive solution, not a solver guess.
  function generate(level) {
    const cfg = config(level);
    let last = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const rng = seededRandom((cfg.level * 1000003 + 17 + attempt * 7919) >>> 0);
      const tubes = Array.from({ length: cfg.colors }, (_, c) => Array(cfg.capacity).fill(c));
      for (let n = 0; n < cfg.empty; n++) tubes.push([]);
      const inverse = [];
      const target = 35 + cfg.colors * 14 + Math.floor(cfg.level * 0.7);
      let failures = 0;
      while (inverse.length < target && failures < 2500) {
        // from receives a run, to gives one away; the recorded forward move is from -> to.
        const from = choice(rng, tubes.length), to = choice(rng, tubes.length);
        if (from === to || !tubes[to].length) { failures++; continue; }
        const src = tubes[from], dst = tubes[to], color = dst[dst.length - 1];
        if (src.length && src[src.length - 1] === color) { failures++; continue; }
        const run = runLength(dst), k = 1 + choice(rng, run);
        if (src.length + k > cfg.capacity || (k === run && k !== dst.length)) {
          failures++; continue;
        }
        // Exact reverse: destination after removal is empty or ends in this colour.
        for (let n = 0; n < k; n++) { dst.pop(); src.push(color); }
        inverse.push([from, to]);
        failures = 0;
      }
      const mixed = tubes.filter(t => t.length > 1 && runLength(t) !== t.length).length;
      last = { tubes, solution: shortenSolution(tubes, inverse.slice().reverse(), cfg.capacity), config: cfg };
      if (mixed >= Math.min(2, cfg.colors) && !solved(tubes, cfg.capacity)) return last;
    }
    if (last && !solved(last.tubes, cfg.capacity)) return last;
    throw new Error('Could not construct a non-trivial level: ' + cfg.level);
  }

  function legalMoves(tubes, capacity = CAPACITY) {
    const merged = [], open = [];
    let firstEmpty = -1;
    for (let i = 0; i < tubes.length; i++) if (!tubes[i].length) { firstEmpty = i; break; }
    for (let from = 0; from < tubes.length; from++) {
      const src = tubes[from];
      if (!src.length) continue;
      for (let to = 0; to < tubes.length; to++) {
        if (!canPour(tubes, from, to, capacity)) continue;
        const dst = tubes[to];
        if (!dst.length) {
          // Empty tubes are symmetric; relocating an already-uniform tube gains nothing.
          if (to !== firstEmpty || runLength(src) === src.length) continue;
          open.push([from, to]);
        } else {
          merged.push([from, to]);
        }
      }
    }
    return merged.concat(open);
  }

  // Iterative depth-first search, advanced in bounded chunks to keep touch UI responsive.
  // A null result is "not found within budget", never an invented hint.
  function createSearch(initial, capacity = CAPACITY, maxNodes = 40000) {
    const start = clone(initial);
    const nodes = [{ tubes: start, parent: -1, move: null }];
    const stack = [0], seen = new Set([canonicalKey(start)]);
    const job = { done: false, solution: null, examined: 0, budget: maxNodes };
    job.step = function (slice = 300) {
      if (job.done) return job;
      let expanded = 0;
      while (stack.length && expanded < slice && job.examined < maxNodes) {
        const index = stack.pop(), node = nodes[index];
        if (solved(node.tubes, capacity)) {
          const path = []; let cursor = index;
          while (nodes[cursor].parent !== -1) {
            path.push(nodes[cursor].move); cursor = nodes[cursor].parent;
          }
          job.solution = path.reverse(); job.done = true; return job;
        }
        job.examined++; expanded++;
        const moves = legalMoves(node.tubes, capacity);
        for (let n = moves.length - 1; n >= 0; n--) {
          const next = clone(node.tubes), move = moves[n];
          pour(next, move[0], move[1], capacity);
          const key = canonicalKey(next);
          if (seen.has(key)) continue;
          seen.add(key);
          nodes.push({ tubes: next, parent: index, move });
          stack.push(nodes.length - 1);
        }
      }
      if (!stack.length || job.examined >= maxNodes) job.done = true;
      return job;
    };
    return job;
  }
  function recordedHints(board, solution, capacity = CAPACITY) {
    const result = new Map(), state = clone(board);
    for (const move of solution) {
      if (!canPour(state, move[0], move[1], capacity)) throw new Error('Invalid recorded solution');
      result.set(stateKey(state), move);
      pour(state, move[0], move[1], capacity);
    }
    if (!solved(state, capacity)) throw new Error('Recorded solution does not win');
    return result;
  }
  return { LEVEL_COUNT, CAPACITY, MARKERS, clone, stateKey, canonicalKey, runLength,
    canPour, pour, solved, config, generate, legalMoves, createSearch, recordedHints };
});
