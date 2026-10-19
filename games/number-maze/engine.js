/* 수의 미궁: 결정적 퍼즐 생성·검증 엔진 (브라우저 및 Node.js 공용) */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NumberMazeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GRADE_CONFIG = Object.freeze({
    1: { label: '1학년', max: 10, result: 30 },
    2: { label: '2학년', max: 35, result: 160 },
    3: { label: '3학년', max: 24, result: 240 }
  });

  function hashSeed(value) {
    let h = 2166136261;
    for (const char of String(value)) {
      h ^= char.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function randomGenerator(seed) {
    let x = hashSeed(seed) || 1;
    return function () {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  function shuffled(items, random) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // 곱셈·나눗셈이 먼저이며, 나눗셈은 그 항 안에서 정확히 나누어떨어진다.
  function evaluate(numbers, operators) {
    if (!numbers.length || operators.length !== numbers.length - 1) return null;
    let sum = 0;
    let current = numbers[0];
    let sign = 1;
    for (let i = 0; i < operators.length; i++) {
      const value = numbers[i + 1];
      switch (operators[i]) {
        case '×': current *= value; break;
        case '÷':
          if (value === 0 || current % value !== 0) return null;
          current /= value;
          break;
        case '+': sum += sign * current; current = value; sign = 1; break;
        case '−': sum += sign * current; current = value; sign = -1; break;
        default: return null;
      }
    }
    return sum + sign * current;
  }

  function getOptions(grade, tier) {
    if (grade === 1) return ['+', '−'];
    if (grade === 2) return tier >= 2 ? ['+', '−', '×'] : ['+', '−'];
    return ['+', '−', '×', '÷'];
  }

  function dimensions(grade, tier, mixed = false) {
    if (grade === 1) return tier >= 3 || mixed ? 3 : 2;
    if (grade === 3 && tier >= 4) return 4;
    return 3;
  }

  function hiddenCount(grade, tier, size) {
    if (size === 2) return Math.min(4, 2 + Math.floor(tier / 2));
    if (size === 4) return 7 + (tier >= 5 ? 1 : 0);
    if (grade === 1) return 3 + Math.max(0, tier - 3);
    if (grade === 2) return 2 + tier;
    return 3 + tier;
  }

  function makeLines(numbers, size, operatorsByRow, operatorsByCol) {
    const lines = [];
    for (let row = 0; row < size; row++) {
      const cells = Array.from({ length: size }, (_, col) => row * size + col);
      lines.push({ cells, ops: operatorsByRow[row], target: evaluate(cells.map(i => numbers[i]), operatorsByRow[row]), axis: 'row', index: row });
    }
    for (let col = 0; col < size; col++) {
      const cells = Array.from({ length: size }, (_, row) => row * size + col);
      lines.push({ cells, ops: operatorsByCol[col], target: evaluate(cells.map(i => numbers[i]), operatorsByCol[col]), axis: 'column', index: col });
    }
    return lines;
  }

  // 혼합계산은 여러 기호가 실제 한 수식에 함께 등장해야 한다.
  // 2·3학년은 뒤에 오는 곱셈·나눗셈을 먼저 처리하는 문제도 포함한다.
  function mixFeatures(lines) {
    return {
      addSub: lines.some(line => line.ops.includes('+') && line.ops.includes('−')),
      mixed: lines.some(line => new Set(line.ops).size >= 2),
      priority: lines.some(line => line.ops.some((op, i) => i > 0 && (op === '×' || op === '÷') && (line.ops[i - 1] === '+' || line.ops[i - 1] === '−'))),
      division: lines.some(line => line.ops.includes('÷')),
      divisionMixed: lines.some(line => line.ops.includes('÷') && new Set(line.ops).size >= 2)
    };
  }

  function meetsMixGoal(grade, tier, mixed, lines) {
    const goal = mixFeatures(lines);
    if (grade === 1) return (!mixed && tier < 3) || goal.addSub;
    if (grade === 2) {
      if (tier === 1) return !mixed || goal.addSub;
      return (!mixed && tier < 3) || goal.priority;
    }
    if (!goal.mixed) return false;
    if (mixed && tier >= 3) return goal.priority && goal.divisionMixed;
    if (!mixed && tier >= 5) return goal.priority && goal.division;
    return (!mixed && tier < 3) || goal.priority;
  }

  function countSolutions(puzzle, maxSolutions = 2, partial = null) {
    const values = puzzle.givens.slice();
    const remaining = new Map();
    for (const number of puzzle.bank) remaining.set(number, (remaining.get(number) || 0) + 1);
    if (partial) {
      for (let i = 0; i < values.length; i++) {
        if (partial[i] == null) continue;
        if (values[i] != null && values[i] !== partial[i]) return 0;
        if (values[i] != null) continue;
        const count = remaining.get(partial[i]) || 0;
        if (!count) return 0;
        remaining.set(partial[i], count - 1);
        values[i] = partial[i];
      }
    }
    const unknown = values.map((x, i) => x == null ? i : -1).filter(i => i >= 0);
    const related = values.map((_, index) => puzzle.lines.filter(line => line.cells.includes(index)));
    // 빈 칸 수가 적은 수식부터 확정해 가능한 수를 일찍 걸러낸다.
    unknown.sort((a, b) => {
      const score = index => related[index].reduce((total, line) => total + line.cells.filter(i => values[i] != null).length, 0);
      return score(b) - score(a);
    });
    let solutions = 0;
    function visit(depth) {
      if (solutions >= maxSolutions) return;
      if (depth >= unknown.length) {
        solutions++;
        return;
      }
      const index = unknown[depth];
      for (const [number, quantity] of remaining) {
        if (!quantity) continue;
        values[index] = number;
        let valid = true;
        for (const line of related[index]) {
          if (line.cells.every(i => values[i] != null) && evaluate(line.cells.map(i => values[i]), line.ops) !== line.target) {
            valid = false;
            break;
          }
        }
        if (valid) {
          remaining.set(number, quantity - 1);
          visit(depth + 1);
          remaining.set(number, quantity);
        }
        values[index] = null;
        if (solutions >= maxSolutions) return;
      }
    }
    // 사용자가 놓은 수가 이미 완성된 행·열과 충돌하는 경우도 걸러낸다.
    if (puzzle.lines.some(line => line.cells.every(i => values[i] != null) && evaluate(line.cells.map(i => values[i]), line.ops) !== line.target)) return 0;
    visit(0);
    return solutions;
  }

  function createFallback(grade, tier, seed, mixed) {
    const numbers = [2, 7, 3, 8];
    const lines = makeLines(numbers, 2, [['+'], ['+']], [['+'], ['+']]);
    const givens = [2, 7, 3, null];
    return { grade, tier, seed, mixed, size: 2, solution: numbers, givens, bank: [8], lines, fallback: true };
  }

  function buildPuzzle(options = {}) {
    const grade = Math.min(3, Math.max(1, Number(options.grade) || 1));
    const tier = Math.min(5, Math.max(1, Number(options.tier) || 1));
    const seed = String(options.seed ?? `${grade}-${tier}-first`);
    const mixed = options.mixed === true;
    const random = randomGenerator(seed + ':' + grade + ':' + tier + ':' + mixed);
    const config = GRADE_CONFIG[grade];
    const size = dimensions(grade, tier, mixed);
    const pool = Array.from({ length: config.max }, (_, i) => i + 1);
    const allowed = getOptions(grade, tier);
    const intendedHidden = hiddenCount(grade, tier, size);
    for (let attempt = 0; attempt < 500; attempt++) {
      const solution = shuffled(pool, random).slice(0, size * size);
      const horizontal = [];
      const vertical = [];
      let valid = true;
      for (let lineIndex = 0; lineIndex < size * 2; lineIndex++) {
        const nums = Array.from({ length: size }, (_, i) => lineIndex < size ? solution[lineIndex * size + i] : solution[i * size + (lineIndex - size)]);
        let selected = null;
        for (let trial = 0; trial < 80; trial++) {
          const ops = Array.from({ length: size - 1 }, () => allowed[Math.floor(random() * allowed.length)]);
          const result = evaluate(nums, ops);
          if (result !== null && result > 0 && result <= config.result) { selected = ops; break; }
        }
        if (!selected) { valid = false; break; }
        (lineIndex < size ? horizontal : vertical).push(selected);
      }
      if (!valid) continue;
      const lines = makeLines(solution, size, horizontal, vertical);
      if (!meetsMixGoal(grade, tier, mixed, lines)) continue;
      const blankCount = Math.max(2, intendedHidden - Math.floor(attempt / 44));
      const blankIndexes = shuffled(Array.from({ length: size * size }, (_, i) => i), random).slice(0, blankCount);
      const givens = solution.map((number, index) => blankIndexes.includes(index) ? null : number);
      const bank = shuffled(blankIndexes.map(i => solution[i]), random);
      const puzzle = { grade, tier, seed, mixed, size, solution, givens, bank, lines };
      if (countSolutions(puzzle, 2) === 1) return puzzle;
    }
    return createFallback(grade, tier, seed, mixed);
  }

  function checkBoard(puzzle, placements) {
    if (!Array.isArray(placements) || placements.length !== puzzle.solution.length) return { complete: false, correct: false, lines: [] };
    const values = puzzle.givens.map((given, i) => given == null ? placements[i] : given);
    const complete = values.every(x => Number.isInteger(x));
    const lineStates = puzzle.lines.map(line => {
      const lineValues = line.cells.map(i => values[i]);
      return lineValues.every(Number.isInteger) ? evaluate(lineValues, line.ops) === line.target : null;
    });
    const remaining = puzzle.bank.slice().sort((a, b) => a - b);
    const used = puzzle.givens.flatMap((x, i) => x == null && Number.isInteger(values[i]) ? [values[i]] : []).sort((a, b) => a - b);
    return { complete, correct: complete && used.join(',') === remaining.join(',') && lineStates.every(Boolean), lines: lineStates };
  }

  return { GRADE_CONFIG, evaluate, buildPuzzle, countSolutions, checkBoard, mixFeatures, hashSeed, randomGenerator };
});
