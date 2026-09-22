import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QUESTIONS, MAX_PLAYERS } from '../worker/history-live.mjs';

test('history live supports a full classroom', () => {
  assert.equal(MAX_PLAYERS, 26);
});

test('history live question bank is classroom-ready', () => {
  assert.ok(Array.isArray(QUESTIONS));
  assert.ok(QUESTIONS.length >= 40);
  for (const [index, q] of QUESTIONS.entries()) {
    assert.equal(typeof q.q, 'string', 'question '+index+' needs text');
    assert.equal(typeof q.era, 'string', 'question '+index+' needs an era');
    assert.ok(Array.isArray(q.o), 'question '+index+' needs options');
    assert.equal(q.o.length, 4, 'question '+index+' must have four options');
    assert.equal(new Set(q.o).size, 4, 'question '+index+' options must be unique');
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, 'question '+index+' needs a valid answer index');
    assert.equal(typeof q.e, 'string', 'question '+index+' needs an explanation');
    assert.ok(q.e.length >= 10, 'question '+index+' explanation is too short');
  }
});


test('history live exposes solo practice without removing classroom play', () => {
  const worker = fs.readFileSync(new URL('../worker/history-live.mjs', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html', import.meta.url), 'utf8');
  assert.match(worker, /\/api\/history-live\/solo/);
  assert.match(worker, /createSoloRoom/);
  assert.match(html, /혼자 연습/);
  assert.match(html, /startSolo\(\)/);
  assert.match(html, /role:'solo'/);
  assert.match(html, /hostToken/);
});
