import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getKstWeekKey,
  hashClientId,
  isValidClientId,
  isValidGameId
} from '../worker/index.mjs';

test('KST week keys roll over on Monday in Korea', () => {
  assert.equal(getKstWeekKey(new Date('2026-09-13T14:59:00Z')), '2026-09-07');
  assert.equal(getKstWeekKey(new Date('2026-09-13T15:01:00Z')), '2026-09-14');
  assert.equal(getKstWeekKey(new Date('2026-09-19T15:00:00Z')), '2026-09-14');
  assert.equal(getKstWeekKey(new Date('2026-09-20T15:00:00Z')), '2026-09-21');
});

test('anonymous client IDs accept UUIDs only', () => {
  assert.equal(isValidClientId('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isValidClientId('student-name'), false);
  assert.equal(isValidClientId(''), false);
});

test('game IDs stay inside the catalog-safe namespace', () => {
  assert.equal(isValidGameId('high_classroom_war_3d'), true);
  assert.equal(isValidGameId('spelling-frog'), true);
  assert.equal(isValidGameId('../secret'), false);
  assert.equal(isValidGameId('게임'), false);
});

test('client IDs are irreversibly represented by a stable SHA-256 hash', async () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const first = await hashClientId(id);
  const second = await hashClientId(id);
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, id);
});
