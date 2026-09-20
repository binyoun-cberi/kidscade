import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Tadak typing shares the 195k dictionary and exposes adaptive word lessons', () => {
  const html = read('games/kor_typing_tadak/타닥타닥 한글 타자연습.html');
  assert.match(html, /wordchain-static-db\.js\?v=3/);
  assert.match(html, /사전 쉬움/);
  assert.match(html, /사전 보통/);
  assert.match(html, /사전 도전/);
  assert.match(html, /약점 집중/);
  assert.match(html, /KidscadeWordDB\.sample/);
  assert.match(html, /WEAKNESS_KEY='tadak_weak_jamo_v1'/);
  assert.match(html, /recordWeakChar\(target\[i\],val\[i\]\)/);
  assert.match(html, /recordWeakChar\(target\[i\],value\[i\]\)/);
  assert.match(html, /dictionaryRainWords/);
  assert.match(html, /RAIN_SENTENCES/);
});

test('Tadak inline game script still parses after adaptive dictionary integration', () => {
  const html = read('games/kor_typing_tadak/타닥타닥 한글 타자연습.html');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1])
    .filter(Boolean);
  assert.ok(scripts.length >= 1);
  for (const script of scripts) assert.doesNotThrow(() => new Function(script));
});

test('Tadak catalog link is cache-bumped for the dictionary release', () => {
  const catalog = JSON.parse(read('data/games.json'));
  const game = catalog.games.find(item => item.id === 'kor_typing_tadak');
  assert.ok(game);
  assert.match(game.href, /타닥타닥 한글 타자연습\.html\?v=2/);
  assert.match(game.description, /19만 사전 낱말/);
});
