import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QUESTIONS, MAX_PLAYERS } from '../worker/history-live.mjs';
import { QUESTION_BANK, CORE_HISTORY_FACTS, QUESTION_BANK_SIZE } from '../data/history-live-question-bank.mjs';

test('history live supports a full classroom', () => {
  assert.equal(MAX_PLAYERS, 26);
});

test('history question bank has at least one thousand playable questions', () => {
  assert.ok(Array.isArray(QUESTION_BANK));
  assert.ok(QUESTION_BANK_SIZE >= 1000, 'question bank should contain at least 1000 questions');
  assert.equal(QUESTION_BANK_SIZE, QUESTION_BANK.length);
  assert.ok(CORE_HISTORY_FACTS.length >= 100, 'question bank should be based on a broad set of core facts');
  for (const [index, q] of QUESTION_BANK.entries()) {
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

test('worker uses shared bank, supports 40 questions, and has ranking checkpoints', () => {
  const worker = fs.readFileSync(new URL('../worker/history-live.mjs', import.meta.url), 'utf8');
  assert.match(worker, /QUESTION_BANK/);
  assert.match(worker, /clampInt\(body\.questionCount,5,40,15\)/);
  assert.match(worker, /normalizeCheckpoints/);
  assert.match(worker, /status='checkpoint'/);
  assert.match(worker, /\/api\/history-live\/continue/);
  assert.doesNotMatch(worker, /\/api\/history-live\/solo/);
  assert.doesNotMatch(worker, /createSoloRoom/);
});

test('solo practice runs locally while live mode keeps server play', () => {
  const html = fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html', import.meta.url), 'utf8');
  assert.match(html, /혼자 연습 · 바로 시작/);
  assert.match(html, /import\('\.\.\/\.\.\/data\/history-live-question-bank\.mjs'\)/);
  assert.match(html, /pickHistoryQuestions/);
  assert.match(html, /function submitSoloAnswer/);
  assert.match(html, /function soloNext/);
  assert.doesNotMatch(html, /api\('\/solo'/);
  assert.match(html, /<option>40<\/option>/);
  assert.match(html, /checkpointMode/);
  assert.match(html, /hostContinue/);
  assert.match(html, /현재 .*등|현재 \+'등'/);
});
