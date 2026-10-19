const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../games/number-maze/engine.js');

test('연산 우선순위와 나눗셈의 정수 결과를 지킨다', () => {
  assert.equal(Engine.evaluate([4, 3, 2], ['+', '×']), 10);
  assert.equal(Engine.evaluate([12, 3, 2], ['÷', '+']), 6);
  assert.equal(Engine.evaluate([11, 5, 2], ['−', '×']), 1);
  assert.equal(Engine.evaluate([5, 2], ['÷']), null);
});

test('초등 1~3학년의 문제는 모두 유일해와 올바른 수식만 제공한다', () => {
  for (let grade = 1; grade <= 3; grade++) {
    for (let tier = 1; tier <= 5; tier++) {
      for (let seed = 0; seed < 25; seed++) {
        const puzzle = Engine.buildPuzzle({ grade, tier, seed: `test-${seed}` });
        assert.equal(puzzle.grade, grade);
        assert.equal(Engine.countSolutions(puzzle, 2), 1, `해답 중복: ${grade}/${tier}/${seed}`);
        const placements = puzzle.solution.map((x, i) => puzzle.givens[i] == null ? x : null);
        assert.equal(Engine.checkBoard(puzzle, placements).correct, true);
        assert.equal(puzzle.bank.length, puzzle.givens.filter(x => x == null).length);
        for (const line of puzzle.lines) {
          assert.equal(Engine.evaluate(line.cells.map(i => puzzle.solution[i]), line.ops), line.target);
          if (grade === 1) assert.ok(line.ops.every(op => ['+', '−'].includes(op)));
          if (grade === 2) assert.ok(!line.ops.includes('÷'));
        }
        const wrong = placements.slice();
        const a = puzzle.givens.findIndex(x => x == null);
        const b = puzzle.givens.findIndex((x, i) => i > a && x == null);
        if (b !== -1) {
          [wrong[a], wrong[b]] = [wrong[b], wrong[a]];
          assert.equal(Engine.checkBoard(puzzle, wrong).correct, false);
        }
      }
    }
  }
});

test('같은 씨앗은 같은 퍼즐을 만들고 다른 씨앗은 대체로 다른 퍼즐을 만든다', () => {
  const first = Engine.buildPuzzle({ grade: 3, tier: 3, seed: '2026-10-19' });
  assert.deepEqual(first, Engine.buildPuzzle({ grade: 3, tier: 3, seed: '2026-10-19' }));
  assert.notDeepEqual(first.solution, Engine.buildPuzzle({ grade: 3, tier: 3, seed: '2026-10-20' }).solution);
});

test('혼합계산 1~3학년 × 5단계는 실제 혼합 수식과 유일해를 보장한다', () => {
  for (let grade = 1; grade <= 3; grade++) {
    for (let tier = 1; tier <= 5; tier++) {
      for (let seed = 0; seed < 50; seed++) {
        const puzzle = Engine.buildPuzzle({ grade, tier, seed: `mix-${seed}`, mixed: true });
        const flags = Engine.mixFeatures(puzzle.lines);
        assert.equal(puzzle.mixed, true);
        assert.equal(puzzle.fallback, undefined, `폴백: ${grade}/${tier}/${seed}`);
        assert.equal(Engine.countSolutions(puzzle, 2), 1, `중복해: ${grade}/${tier}/${seed}`);
        assert.equal(flags.mixed, true);
        if (grade === 1 || grade === 2 && tier === 1) assert.equal(flags.addSub, true);
        if (grade === 2 && tier >= 2 || grade === 3) assert.equal(flags.priority, true);
        if (grade === 3 && tier >= 3) assert.equal(flags.divisionMixed, true);
        for (const line of puzzle.lines) assert.equal(Engine.evaluate(line.cells.map(i => puzzle.solution[i]), line.ops), line.target);
      }
    }
  }
});

test('일반 모험 후반에는 학년별 혼합계산이 포함된다', () => {
  for (let grade = 1; grade <= 3; grade++) {
    const puzzle = Engine.buildPuzzle({ grade, tier: 5, seed: 'mixed-in-adventure' });
    const features = Engine.mixFeatures(puzzle.lines);
    if (grade === 1) assert.equal(features.addSub, true);
    if (grade >= 2) assert.equal(features.priority, true);
    if (grade === 3) assert.equal(features.division, true);
    assert.equal(Engine.countSolutions(puzzle, 2), 1);
  }
});
