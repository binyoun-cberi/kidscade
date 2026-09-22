import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QUESTIONS, MAX_PLAYERS } from '../worker/history-live.mjs';
import { QUESTION_BANK, CORE_HISTORY_FACTS, QUESTION_BANK_SIZE, ERA_ORDER, pickHistoryQuestions, chronologicalQuestionIndexes } from '../data/history-live-question-bank.mjs';

test('history live supports a full classroom', () => {
  assert.equal(MAX_PLAYERS, 26);
});

test('history question bank has at least one thousand playable questions', () => {
  assert.ok(Array.isArray(QUESTION_BANK));
  assert.ok(QUESTION_BANK_SIZE >= 1000, 'question bank should contain at least 1000 questions');
  assert.equal(QUESTION_BANK_SIZE, QUESTION_BANK.length);
  assert.ok(CORE_HISTORY_FACTS.length >= 1000, 'source fact pool itself must contain at least 1000 independent history facts');
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


test('chronological mode spans the full timeline without repeating a core fact', () => {
  const picked = pickHistoryQuestions(40, () => 0.42, 'chronological');
  assert.equal(picked.length, 40);
  assert.equal(new Set(picked.map(q => q.sourceFact)).size, 40);
  const eraPositions = picked.map(q => ERA_ORDER.indexOf(q.era));
  for (let i = 1; i < eraPositions.length; i += 1) {
    assert.ok(eraPositions[i] >= eraPositions[i - 1], 'eras must never go backwards');
  }
  assert.equal(picked[0].era, '선사');
  assert.equal(picked.at(-1).era, '6·25 전쟁');
  const indexes = chronologicalQuestionIndexes(40);
  assert.equal(indexes.length, 40);
  assert.equal(new Set(indexes.map(i => QUESTION_BANK[i].sourceFact)).size, 40);
});

test('mobile quiz controls are touch friendly and both play modes expose chronology choice', () => {
  const html = fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html', import.meta.url), 'utf8');
  assert.match(html, /touch-action:manipulation/);
  assert.match(html, /@media\(hover:none\) and \(pointer:coarse\)/);
  assert.match(html, /id="orderMode"/);
  assert.match(html, /id="soloOrderMode"/);
  assert.match(html, /value="chronological"/);
  assert.match(html, /pickHistoryQuestions\(count,Math\.random,orderMode\)/);
});

test('live server records chronology mode in the room plan', () => {
  const worker = fs.readFileSync(new URL('../worker/history-live.mjs', import.meta.url), 'utf8');
  assert.match(worker, /chronologicalQuestionIndexes/);
  assert.match(worker, /orderMode=body\.orderMode==='chronological'/);
  assert.match(worker, /plan=\{questions:order,checkpoints,orderMode\}/);
});


test('direct timeline facts stay playable and have unique answer choices', () => {
  const direct = CORE_HISTORY_FACTS.filter(f => f.direct);
  assert.ok(direct.length >= 800, 'timeline expansion should add hundreds of independent date/order facts');
  for (const [index, fact] of direct.entries()) {
    assert.equal(typeof fact.q, 'string', 'direct fact '+index+' needs a question');
    assert.ok(Array.isArray(fact.o), 'direct fact '+index+' needs options');
    assert.equal(fact.o.length, 4);
    assert.equal(new Set(fact.o).size, 4);
    assert.ok(Number.isInteger(fact.a) && fact.a >= 0 && fact.a < 4);
    assert.equal(typeof fact.e, 'string');
  }
});
