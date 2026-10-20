import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import statsWorker from '../worker/index.mjs';
import {
  getKstWeekKey,
  hashClientId,
  isValidClientId,
  isValidGameId
} from '../worker/index.mjs';

let DatabaseSync;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch (_) {}

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

test('play event IDs are transactionally deduplicated while older clients remain compatible', { skip: !DatabaseSync }, async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const migrations = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');
    db.exec(readFileSync(resolve(migrations, '0001_server_stats.sql'), 'utf8'));
    db.exec(readFileSync(resolve(migrations, '0017_play_event_dedupe.sql'), 'utf8'));

    const makeStatement = (sql, args = []) => ({
      bind: (...next) => makeStatement(sql, next),
      run: async () => {
        const meta = db.prepare(sql).run(...args);
        return { meta:{ changes:Number(meta.changes) } };
      },
      first: async () => db.prepare(sql).get(...args) || null,
      all: async () => ({ results:db.prepare(sql).all(...args) })
    });
    const env = {
      DB: {
        prepare: sql => makeStatement(sql),
        async batch(statements) {
          db.exec('BEGIN');
          try {
            const results = [];
            for (const statement of statements) results.push(await statement.run());
            db.exec('COMMIT');
            return results;
          } catch (error) {
            db.exec('ROLLBACK');
            throw error;
          }
        }
      },
      ASSETS: { fetch: async () => Response.json({ games:[{ id:'demo' }] }) }
    };
    const submit = async payload => {
      const request = new Request('https://kidscade.example/api/stats/play', {
        method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(payload)
      });
      const response = await statsWorker.fetch(request, env);
      return { status:response.status, body:await response.json() };
    };
    const firstId = '550e8400-e29b-41d4-a716-446655440000';
    const secondId = '550e8400-e29b-41d4-a716-446655440001';
    const first = await submit({ gameId:'demo', seconds:31, eventId:firstId });
    const duplicated = await submit({ gameId:'demo', seconds:31, eventId:firstId });
    const second = await submit({ gameId:'demo', seconds:33, eventId:secondId });
    const legacy = await submit({ gameId:'demo', seconds:30 });
    assert.deepEqual([first.status, duplicated.status, second.status, legacy.status], [200,200,200,200]);
    assert.equal(first.body.counted, true);
    assert.equal(duplicated.body.counted, false);
    assert.equal(duplicated.body.game.totalPlays, 1);
    assert.equal(second.body.game.totalPlays, 2);
    assert.equal(legacy.body.game.totalPlays, 3);
    assert.equal((await submit({ gameId:'demo', seconds:31, eventId:'invalid' })).status, 400);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM game_play_events').get().count, 2);
  } finally {
    db.close();
  }
});
