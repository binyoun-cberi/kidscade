import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRoomCode, isValidRoomCode, clampHeight, resolveWinner } from '../worker/multiplayer.mjs';
import { ensureMultiplayerSchema, MULTIPLAYER_SCHEMA_STATEMENTS } from '../worker/multiplayer-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('room codes normalize safely and reject ambiguous/invalid codes', () => {
  assert.equal(normalizeRoomCode(' ab-cd 23 '), 'ABCD23');
  assert.equal(isValidRoomCode('ABC234'), true);
  assert.equal(isValidRoomCode('ABC210'), false);
  assert.equal(isValidRoomCode('SHORT'), false);
});

test('height reports are integer bounded', () => {
  assert.equal(clampHeight(-12), 0);
  assert.equal(clampHeight(42.9), 42);
  assert.equal(clampHeight(99999), 2000);
  assert.equal(clampHeight('bad'), 0);
});

test('winner uses current height only and allows a draw', () => {
  assert.equal(resolveWinner([
    { student_id: 'a', current_value: 81, best_value: 120 },
    { student_id: 'b', current_value: 88, best_value: 90 }
  ]), 'b');
  assert.equal(resolveWinner([
    { student_id: 'a', current_value: 88, best_value: 120 },
    { student_id: 'b', current_value: 88, best_value: 90 }
  ]), null);
});

test('Patience Tower duel client keeps the three-minute current-height rule and deterministic map transform', () => {
  const html = fs.readFileSync(path.join(root, 'games/patience-tower-duel/index.html'), 'utf8');
  assert.match(html, /3분 뒤/);
  assert.match(html, /최고 기록이 아니라 타이머가 0이 된 순간의 현재 높이/);
  assert.match(html, /generateUntil\(-30000\)/);
  assert.match(html, /patience_tower_duel/);
  assert.match(html, /Math\.random=/);
  assert.match(html, /KeyP.*KeyR/s);

  const marker = '\n<script>\n(() => {';
  const start = html.indexOf(marker);
  const end = html.indexOf('\n</script>\n</body>', start);
  assert.ok(start >= 0 && end > start, 'duel inline script should be discoverable');
  const script = html.slice(start + '\n<script>\n'.length, end);
  assert.doesNotThrow(() => new Function(script));
});

test('single-player build integration exposes the duel entry', () => {
  const injector = fs.readFileSync(path.join(root, 'scripts/inject-game-integrations.cjs'), 'utf8');
  const entry = fs.readFileSync(path.join(root, 'patience-tower-duel-entry.js'), 'utf8');
  assert.match(injector, /인내의 탑\.html/);
  assert.match(injector, /patience-tower-duel-entry\.js/);
  assert.match(entry, /1:1 · 3분 높이 대전/);
  assert.match(entry, /\/games\/patience-tower-duel\//);
  assert.equal(fs.existsSync(path.join(root, '인내의 탑 대전.html')), false, 'new mode should not add another root HTML file');
});

test('multiplayer database bootstrap uses prepared batch only when the D1 tables are missing', async () => {
  let batchCalls = 0;
  const prepared = [];
  const env = {
    DB: {
      prepare(sql) {
        if (/sqlite_master/.test(sql)) {
          return {
            async all() {
              return { results: [] };
            }
          };
        }
        const statement = { sql };
        prepared.push(statement);
        return statement;
      },
      async batch(statements) {
        batchCalls += 1;
        assert.equal(statements.length, MULTIPLAYER_SCHEMA_STATEMENTS.length);
        assert.deepEqual(statements, prepared);
      }
    }
  };
  await ensureMultiplayerSchema(env);
  await ensureMultiplayerSchema(env);
  assert.equal(batchCalls, 1);
  assert.match(prepared[0].sql, /CREATE TABLE IF NOT EXISTS multiplayer_rooms/);
  assert.match(prepared[3].sql, /CREATE TABLE IF NOT EXISTS multiplayer_room_players/);
});

test('multiplayer database bootstrap does not rewrite an already prepared database', async () => {
  let batchCalls = 0;
  const env = {
    DB: {
      prepare(sql) {
        assert.match(sql, /sqlite_master/);
        return {
          async all() {
            return { results: [
              { name: 'multiplayer_rooms' },
              { name: 'multiplayer_room_players' }
            ] };
          }
        };
      },
      async batch() {
        batchCalls += 1;
      }
    }
  };
  await ensureMultiplayerSchema(env);
  assert.equal(batchCalls, 0);
});

test('Cloudflare deploy script applies D1 migrations before deploying the Worker', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['db:migrate:remote'], 'wrangler d1 migrations apply kidscade-stats --remote');
  assert.match(pkg.scripts['deploy:cloudflare'], /db:migrate:remote/);
  assert.ok(pkg.scripts['deploy:cloudflare'].indexOf('db:migrate:remote') < pkg.scripts['deploy:cloudflare'].indexOf('wrangler deploy'));
});

test('main Worker performs multiplayer schema preflight and exposes a health endpoint', () => {
  const main = fs.readFileSync(path.join(root, 'worker/main.mjs'), 'utf8');
  assert.match(main, /ensureMultiplayerSchema/);
  assert.match(main, /\/api\/multiplayer\/health/);
  assert.match(main, /multiplayer_database_not_ready/);
});
