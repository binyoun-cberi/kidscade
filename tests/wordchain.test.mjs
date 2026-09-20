import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keys = ['g','gg','n','d','dd','r','m','b','bb','s','ss','ng','j','jj','ch','k','t','p','h'];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function bucketKey(word) {
  const first = [...word][0];
  const code = first.codePointAt(0) - 0xac00;
  return keys[Math.floor(code / 588)];
}

test('API-free static dictionary source and buckets stay consistent', () => {
  const sourceWords = read('data/wordchain/source-words.txt').split(/\r?\n/).filter(Boolean);
  const manifest = JSON.parse(read('data/wordchain/manifest.json'));
  assert.ok(sourceWords.length >= 300);
  assert.equal(new Set(sourceWords).size, sourceWords.length);
  assert.equal(manifest.total, sourceWords.length);
  assert.equal(Object.keys(manifest.buckets).length, 19);

  const all = [];
  for (const key of keys) {
    const info = manifest.buckets[key];
    assert.ok(info, `missing manifest bucket ${key}`);
    const words = read(`data/wordchain/${info.file}`).split(/\r?\n/).filter(Boolean);
    assert.equal(words.length, info.count);
    for (const word of words) {
      assert.equal(bucketKey(word), key, `${word} should be in ${key}`);
      all.push(word);
    }
  }

  assert.equal(all.length, manifest.total);
  assert.equal(new Set(all).size, manifest.total);
  assert.deepEqual([...all].sort((a,b) => a.localeCompare(b, 'ko')), [...sourceWords].sort((a,b) => a.localeCompare(b, 'ko')));
});

test('static dictionary client lazy-loads buckets and contains no word-chain API dependency', () => {
  const client = read('wordchain-static-db.js');
  assert.match(client, /loadBucketByKey/);
  assert.match(client, /bucketKeyForSyllable/);
  assert.match(client, /async candidates/);
  assert.match(client, /new URL\('data\/wordchain\/'/);
  assert.doesNotMatch(client, /\/api\/wordchain/);
  assert.doesNotThrow(() => new Function(client));
});

test('word-chain arena uses only the bundled static dictionary', () => {
  const catalog = JSON.parse(read('data/games.json'));
  const game = catalog.games.find(item => item.id === 'low_wordchain_arena');
  assert.ok(game);
  assert.equal(game.age, 'low');
  assert.match(game.href, /games\/low_wordchain_arena\/index\.html/);

  const html = read('games/low_wordchain_arena/index.html');
  assert.match(html, /wordchain-static-db\.js/);
  assert.match(html, /KidscadeWordDB\.has/);
  assert.match(html, /KidscadeWordDB\.candidates/);
  assert.match(html, /12초/);
  assert.doesNotMatch(html, /\/api\/wordchain/);
  assert.doesNotMatch(html, /LOCAL_WORDS/);

  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1])
    .filter(Boolean);
  assert.ok(scripts.length >= 1);
  for (const script of scripts) assert.doesNotThrow(() => new Function(script));
});

test('word-chain static builder supports reusable source files', () => {
  const builder = read('scripts/build-wordchain-static.cjs');
  assert.match(builder, /source-words\.txt/);
  assert.match(builder, /manifest\.json/);
  assert.match(builder, /bucket-/);
  assert.match(builder, /\.jsonl/);
  assert.match(builder, /\.tsv/);
  assert.doesNotMatch(builder, /generatedAt/);
  assert.doesNotThrow(() => new Function('require', 'process', 'console', builder.replace(/^#!.*\n/, '')));
});

test('normal builds regenerate the word-chain static database first', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['wordchain:build'], 'node scripts/build-wordchain-static.cjs');
  assert.match(pkg.scripts.build, /^npm run wordchain:build && /);
  assert.match(pkg.scripts['build:cloudflare'], /^npm run wordchain:build && /);
});

test('main Worker has no dictionary API route', () => {
  const main = read('worker/main.mjs');
  assert.doesNotMatch(main, /handleWordchainRequest/);
  assert.doesNotMatch(main, /WORDCHAIN_PREFIX/);
  assert.equal(fs.existsSync(path.join(root, 'worker', 'wordchain.mjs')), false);
  assert.equal(fs.existsSync(path.join(root, 'worker', 'wordchain-schema.mjs')), false);
  assert.equal(fs.existsSync(path.join(root, 'migrations', '0007_wordchain_dictionary.sql')), false);
});
