'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'games', 'high_pass_mafia');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));

test('Pass Mafia supports a 24-player classroom ceiling', () => {
  assert.match(js, /const MAX_PLAYERS = 24/);
  assert.match(js, /const CLASS_MODE_MIN = 17/);
  assert.match(js, /if \(count <= 16\) return 4/);
  assert.match(js, /if \(count <= 21\) return 5/);
  assert.match(js, /return 6/);
});

test('Pass Mafia automatically enables classroom mode from 17 players', () => {
  assert.match(js, /classMode: setup\.playerCount >= CLASS_MODE_MIN/);
  assert.match(js, /function isClassMode\(\)/);
  assert.match(html, /4~16명은 클래식 모드, 17~24명은/);
  assert.match(js, /setup\.mafia = recommendedMafia\(next\)/);
});

test('Pass Mafia classroom day uses two public candidates and one secret final pass', () => {
  assert.match(js, /function beginClassCandidateSelect\(\)/);
  assert.match(js, /classCandidates\.length !== 2/);
  assert.match(js, /function beginClassVote\(\)/);
  assert.match(js, /const excluded = new Set\(state\.classCandidates \|\| \[\]\)/);
  assert.match(js, /filter\(p => !excluded\.has\(p\.id\)\)/);
  assert.match(js, /data-class-vote="none"/);
  assert.match(js, /if \(a > b && a > none\) executedId = candidates\[0\]\.id/);
  assert.match(js, /if \(b > a && b > none\) executedId = candidates\[1\]\.id/);
});

test('Pass Mafia classroom mode keeps night privacy while shortening handoffs', () => {
  assert.match(js, /state\.nightOrder = alivePlayers\(\)/);
  assert.match(js, /학급 빠른 밤/);
  assert.match(js, /확인 · 다음 사람/);
  assert.match(js, /역할과 행동 여부는 다른 사람에게 보이지 않습니다/);
});

test('Pass Mafia accepts pasted classroom rosters and has classroom layout styles', () => {
  assert.match(html, /id="bulkNames"/);
  assert.match(html, /id="applyBulkNames"/);
  assert.match(js, /split\(\/\[\\n,;\]\+\//);
  assert.match(css, /\.class-final-grid/);
  assert.match(css, /\.class-candidate-grid/);
});

test('Pass Mafia catalog advertises classroom-sized local multiplayer', () => {
  const entry = catalog.games.find(game => game.id === 'high_pass_mafia');
  assert.ok(entry);
  assert.match(entry.description, /4~24인/);
  assert.ok(entry.players.includes('localMulti'));
  assert.ok(entry.classroom);
});
