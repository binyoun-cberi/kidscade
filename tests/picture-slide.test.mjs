import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canMove, initialBoard, isComplete, levels } from '../games/picture-slide/levels.js';

test('all 20 picture puzzles have distinct artwork and a legal route to completion', () => {
  assert.equal(levels.length, 20);
  assert.equal(new Set(levels.map(({ image }) => image)).size, levels.length);
  for (const level of levels) {
    const { title, image, size, fixed, shuffle } = level;
    const art = readFileSync(new URL(`../games/picture-slide/${image}`, import.meta.url));
    assert.equal(art.toString('ascii', 8, 12), 'WEBP', title);
    const last = size ** 2 - 1;
    let blank = last;
    for (const position of shuffle) {
      assert.equal(canMove(level, position, blank), true, title);
      blank = position;
    }
    const board = initialBoard(level);
    assert.equal(board[blank], last, title);
    assert.equal(isComplete(board), false, title);
    for (let position = 0; position < fixed; position += 1) {
      assert.equal(board[position], position, title);
    }
    for (const position of [last, ...shuffle.slice(0, -1)].reverse()) {
      assert.equal(canMove(level, position, blank), true, title);
      [board[blank], board[position]] = [board[position], board[blank]];
      blank = position;
    }
    assert.equal(isComplete(board), true, title);
  }
});
