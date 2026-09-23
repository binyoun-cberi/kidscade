import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('merged Korean dictionaries are complete and initial-sharded', () => {
  const manifest = JSON.parse(read('data/wordchain/manifest.json'));
  assert.equal(manifest.version, 4);
  assert.equal(manifest.format, 'initial-sharded-newline-text');
  assert.equal(manifest.total, 195217);
  assert.equal(Object.keys(manifest.groups || {}).length, 19);
  assert.ok((manifest.sources || []).some(source => /한국어기초사전/.test(source.name || '')));
  assert.ok((manifest.sources || []).some(source => /표준국어대사전/.test(source.name || '')));

  const words = [];
  for (const info of Object.values(manifest.groups || {})) {
    assert.ok(info.file);
    assert.equal(info.keys?.length, 1);
    const rows = read('data/wordchain/' + info.file).split(/\r?\n/).filter(Boolean);
    assert.equal(rows.length, info.count);
    words.push(...rows);
  }

  assert.equal(words.length, manifest.total);
  assert.equal(new Set(words).size, manifest.total);
  assert.ok(words.includes('사과'));
  assert.ok(words.includes('자동차'));
  assert.ok(words.includes('학교'));
  assert.ok(words.every(word => /^[가-힣]{2,24}$/.test(word)));
});

test('word-chain dictionary includes attribution and child-safe exclusions', () => {
  const attribution = read('data/wordchain/ATTRIBUTION.txt');
  const blocked = new Set(read('data/wordchain/blocked-words.txt').split(/\r?\n/).filter(Boolean));
  assert.match(attribution, /한국어기초사전/);
  assert.match(attribution, /표준국어대사전/);
  assert.match(attribution, /195,217/);
  assert.match(attribution, /CC BY-SA 2.0 KR/);
  assert.ok(blocked.size >= 20);
});

test('static dictionary client lazy-loads grouped files and contains no API dependency', () => {
  const client = read('wordchain-static-db.js');
  assert.match(client, /loadGroup/);
  assert.match(client, /loadBucketByKey/);
  assert.match(client, /keyToGroup/);
  assert.match(client, /blocked-words\.txt/);
  assert.match(client, /async candidates/);
  assert.match(client, /async sample/);
  assert.doesNotMatch(client, /\/api\/wordchain/);
  assert.doesNotThrow(() => new Function(client));
});

test('word-chain arena uses the merged offline Korean dictionaries', () => {
  const catalog = JSON.parse(read('data/games.json'));
  const game = catalog.games.find(item => item.id === 'low_wordchain_arena');
  assert.ok(game);
  assert.equal(game.age, 'low');
  assert.match(game.href, /games\/low_wordchain_arena\/index\.html/);

  const html = read('games/low_wordchain_arena/index.html');
  assert.match(html, /wordchain-static-db\.js\?v=2/);
  assert.match(html, /KidscadeWordDB\.has/);
  assert.match(html, /KidscadeWordDB\.candidates/);
  assert.match(html, /195,217/);
  assert.match(html, /12초/);
  assert.match(html, /낱말봇 대결/);
  assert.match(html, /1:1 온라인/);
  assert.match(html, /다대다 온라인/);
  assert.match(html, /🌱 초급/);
  assert.match(html, /⚔️ 중급/);
  assert.match(html, /👑 고급/);
  assert.match(html, /turnMs:20000,lives:5/);
  assert.match(html, /turnMs:15000,lives:4/);
  assert.match(html, /turnMs:12000,lives:3/);
  assert.match(html, /missChance:\.20/);
  assert.match(html, /missChance:\.07/);
  assert.match(html, /showBeginnerHint/);
  assert.match(html, /oneShotChance:\.15/);
  assert.match(html, /if\(difficultyKey==='advanced'\)/);
  assert.match(html, /multiplayer\.html\?v=9&mode=duel/);
  assert.match(html, /multiplayer\.html\?v=9&mode=multi/);
  assert.doesNotMatch(html, /\/api\/wordchain/);

  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1])
    .filter(Boolean);
  assert.ok(scripts.length >= 1);
  for (const script of scripts) assert.doesNotThrow(() => new Function(script));
});

test('normal builds do not overwrite the imported dictionary', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.doesNotMatch(pkg.scripts.build, /wordchain:build/);
  assert.doesNotMatch(pkg.scripts['build:cloudflare'], /wordchain:build/);
});

test('main Worker has no dynamic dictionary API route and uses the realtime room router', () => {
  const main = read('worker/main.mjs');
  assert.doesNotMatch(main, /handleWordchainRequest/);
  assert.match(main, /routeWordchainRoom/);
  assert.match(main, /WORDCHAIN_PREFIX/);
});


test('word-chain arena sound hooks use valid shared audio keys', () => {
  const solo = read('games/low_wordchain_arena/index.html');
  const multi = read('games/low_wordchain_arena/multiplayer.html');
  const audio = read('audio-manager.js');
  const catalog = JSON.parse(read('assets/audio/audio-catalog.json'));
  assert.deepEqual(catalog.sounds['music.korea_welcome'], ['music/korea/welcome-to-korea-01.mp3']);
  assert.match(solo, /music\.korea_welcome/);
  assert.match(multi, /music\.korea_welcome/);
  assert.match(solo, /playTurnCue/);
  assert.match(solo, /playTimerWarning/);
  assert.match(solo, /🔊 소리/);
  assert.match(multi, /playTurnCue/);
  assert.match(multi, /playTimerWarning/);
  assert.match(multi, /🔊 소리/);
  for (const html of [solo, multi]) {
    assert.match(html, /audio-manager\.js/);
    assert.match(html, /combat\.hurt_grunt/);
    assert.doesNotMatch(html, /combat\.hurt_voice/);
    assert.match(html, /success\.victory_fanfare/);
    assert.match(html, /failure\.fail_sting/);
  }
  for (const key of ['collect.coin_drop','collect.coin_pickup','success.cheer_yay','success.victory_fanfare','failure.fail_sting','failure.disappointed_voice','combat.impact_heavy','combat.hurt_grunt','shop.register_open']) {
    assert.ok(audio.includes(key), 'missing audio key: '+key);
  }
});
