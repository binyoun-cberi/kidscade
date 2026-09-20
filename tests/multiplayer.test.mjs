import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRoomCode, isValidRoomCode, clampHeight, sanitizePose, resolveWinner } from '../worker/multiplayer.mjs';
import { ensureMultiplayerSchema, MULTIPLAYER_SCHEMA_STATEMENTS } from '../worker/multiplayer-schema.mjs';
import { allowedWordchainInitials, normalizeWordchainRoomCode } from '../worker/wordchain-match.mjs';

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

test('duel pose is bounded before it is shared with the opponent', () => {
  assert.deepEqual(sanitizePose({x:920,y:-1234.5,vx:5000,vy:-3000,face:-2,skin:'pink',onGround:true}), {
    x:900,y:-1234.5,vx:1200,vy:-1600,face:-1,skin:'pink',onGround:true
  });
  assert.equal(sanitizePose({skin:'unknown'}).skin,'blue');
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
  assert.match(html, /setInterval\(syncTick,400\)/);
  assert.match(html, /readCurrentPose/);
  assert.match(html, /pose,finished/);
  assert.match(html, /setOpponentPose/);

  const marker = '\n<script>\n(() => {';
  const start = html.indexOf(marker);
  const end = html.indexOf('\n</script>\n</body>', start);
  assert.ok(start >= 0 && end > start, 'duel inline script should be discoverable');
  const script = html.slice(start + '\n<script>\n'.length, end);
  assert.doesNotThrow(() => new Function(script));
});

test('single-player build integration exposes the duel entry and the 2D asset rework', () => {
  const injector = fs.readFileSync(path.join(root, 'scripts/inject-game-integrations.cjs'), 'utf8');
  const entry = fs.readFileSync(path.join(root, 'patience-tower-duel-entry.js'), 'utf8');
  const rework = fs.readFileSync(path.join(root, 'patience-tower-rework.js'), 'utf8');
  assert.match(injector, /인내의 탑\.html/);
  assert.match(injector, /patience-tower-rework\.js/);
  assert.match(injector, /patience-tower-duel-entry\.js/);
  assert.ok(injector.indexOf('patience-tower-rework.js') < injector.indexOf('patience-tower-duel-entry.js'));
  assert.match(injector, /인내의 탑\.html\?v=6/);
  assert.match(entry, /1:1 · 3분 높이 대전/);
  assert.match(entry, /\/games\/patience-tower-duel\//);
  assert.match(rework, /\/assets\/game\/2d\/platformer-art/);
  assert.match(rework, /extended\/aliens\/alien-/);
  assert.match(rework, /extended\/enemies\/frog\.png/);
  assert.match(rework, /extended\/enemies\/bee\.png/);
  assert.match(rework, /extended\/enemies\/ghost-normal\.png/);
  assert.match(rework, /extended\/enemies\/spinner\.png/);
  assert.match(rework, /patienceTowerBestM/);
  assert.match(rework, /__patienceDuelEmbedded/);
  assert.match(rework, /setOpponentPose/);
  assert.match(rework, /getDuelPose/);
  assert.match(rework, /drawDuelOpponent/);
  assert.match(rework, /verticalGrace=state\.easy\?12:8/);
  assert.match(rework, /horizontalGrace=state\.easy\?7:4/);
  assert.match(rework, /hit\(me,q,pw,ph,24,13\)/);
  assert.match(rework, /launch:-590/);
  assert.match(rework, /gravity:1580/);
  assert.match(rework, /maxFall:1120/);
  assert.match(rework, /spring:-760/);
  assert.match(rework, /launch:-605/);
  assert.match(rework, /gravity:1480/);
  assert.match(rework, /groundAccel:3950/);
  assert.match(rework, /airAccel:2450/);
  assert.match(rework, /maxSpeed:326/);
  assert.match(rework, /maxSpeed:345/);
  assert.match(rework, /groundFriction:\.80/);
  assert.match(rework, /iceFriction:\.985/);
  assert.match(rework, /airFriction:\.992/);
  assert.match(rework, /hero\.trail\.length>14/);
  assert.ok(fs.existsSync(path.join(root,'migrations','0006_multiplayer_player_pose.sql')));
  assert.match(fs.readFileSync(path.join(root,'migrations','0006_multiplayer_player_pose.sql'),'utf8'), /ADD COLUMN state_json TEXT/);
  assert.doesNotThrow(() => new Function(rework));
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
  assert.ok(prepared.some(statement => /CREATE TABLE IF NOT EXISTS wordchain_match_state/.test(statement.sql)));
  assert.ok(prepared.some(statement => /CREATE TABLE IF NOT EXISTS wordchain_used_words/.test(statement.sql)));
  assert.ok(prepared.some(statement => /CREATE TABLE IF NOT EXISTS wordchain_actions/.test(statement.sql)));
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
              { name: 'multiplayer_room_players' },
              { name: 'wordchain_match_state' },
              { name: 'wordchain_used_words' },
              { name: 'wordchain_actions' }
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


test('word-chain multiplayer supports safe room codes and Korean dueum rules', () => {
  assert.equal(normalizeWordchainRoomCode(' ab-cd 23 '), 'ABCD23');
  assert.deepEqual(allowedWordchainInitials('력'), ['력', '역']);
  assert.deepEqual(allowedWordchainInitials('류'), ['류', '유']);
  assert.deepEqual(allowedWordchainInitials('락'), ['락', '낙']);
  assert.deepEqual(allowedWordchainInitials('녀'), ['녀', '여']);
});

test('word-chain multiplayer server is authoritative and supports 2 to 8 player rooms', () => {
  const server = fs.readFileSync(path.join(root, 'worker', 'wordchain-match.mjs'), 'utf8');
  assert.match(server, /const TURN_MS = 12000/);
  assert.match(server, /Math\.max\(2, Math\.min\(8/);
  assert.match(server, /game_id = \?/);
  assert.match(server, /wordchain_used_words/);
  assert.match(server, /wordchain_actions/);
  assert.match(server, /hasContinuation/);
  assert.match(server, /kind: 'one-shot'/);
  assert.match(server, /\/api\/multiplayer\/wordchain\/submit/);
  assert.match(server, /requireStudent/);
});

test('word-chain online client exposes 1v1, 3-8 player rooms, ready/start and server turns', () => {
  const html = fs.readFileSync(path.join(root, 'games', 'low_wordchain_arena', 'multiplayer.html'), 'utf8');
  assert.match(html, /1:1 방 만들기/);
  assert.match(html, /다대다 방 만들기/);
  assert.match(html, /value="8"/);
  assert.match(html, /\/api\/multiplayer\/wordchain\//);
  assert.match(html, /readyBtn/);
  assert.match(html, /startBtn/);
  assert.match(html, /turnDeadline/);
  assert.match(html, /3목숨/);
  assert.match(html, /12초/);
  assert.match(html, /audio-manager\.js/);
  assert.match(html, /soundBtn/);
  assert.match(html, /reactSfx/);
  assert.match(html, /timer\.urgent/);
  assert.match(html, /center\.myturn/);
  assert.match(html, /success\.victory_fanfare/);
  assert.match(html, /failure\.fail_sting/);
  assert.match(html, /combat\.impact_heavy/);
  assert.match(html, /requestedMode/);
  assert.match(html, /mode=duel|requestedMode==='duel'/);
  assert.match(html, /requestedMode==='multi'/);

  const marker = '<script>\n(() => {';
  const start = html.indexOf(marker);
  const end = html.lastIndexOf('\n</script>');
  assert.ok(start >= 0 && end > start);
  assert.doesNotThrow(() => new Function(html.slice(start + '<script>\n'.length, end)));

  const solo = fs.readFileSync(path.join(root, 'games', 'low_wordchain_arena', 'index.html'), 'utf8');
  assert.match(solo, /multiplayer\.html/);
  assert.match(solo, /1:1 온라인/);
  assert.match(solo, /다대다 온라인/);
});

test('word-chain multiplayer migration is shipped for remote D1 deploys', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations', '0007_wordchain_multiplayer.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS wordchain_match_state/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS wordchain_used_words/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS wordchain_actions/);
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
