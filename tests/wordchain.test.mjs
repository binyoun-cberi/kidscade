import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeKoreanWord, isPlayableWord, allowedInitials, validateChainInput } from '../worker/wordchain.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('word-chain normalization keeps Korean syllables and removes separators', () => {
  assert.equal(normalizeKoreanWord(' 자-동 차 '), '자동차');
  assert.equal(isPlayableWord('자동차'), true);
  assert.equal(isPlayableWord('A차'), false);
  assert.equal(isPlayableWord('차'), false);
});

test('word-chain dueum rules expose direct and transformed initials', () => {
  assert.deepEqual(allowedInitials('력'), ['력', '역']);
  assert.deepEqual(allowedInitials('류'), ['류', '유']);
  assert.deepEqual(allowedInitials('락'), ['락', '낙']);
  assert.deepEqual(allowedInitials('녀'), ['녀', '여']);
  assert.deepEqual(allowedInitials('과'), ['과']);
  assert.deepEqual(allowedInitials('력', false), ['력']);
});

test('word-chain validates connection and duplicate use before DB lookup', () => {
  assert.equal(validateChainInput({ word: '과자', previousWord: '사과', usedWords: [] }).ok, true);
  assert.equal(validateChainInput({ word: '자동차', previousWord: '사과', usedWords: [] }).error, 'wrong_initial');
  assert.equal(validateChainInput({ word: '과자', previousWord: '사과', usedWords: ['과자'] }).error, 'already_used');
  assert.equal(validateChainInput({ word: '역사', previousWord: '능력', usedWords: [] }).ok, true);
});

test('word-chain D1 migration defines indexed reusable dictionary fields', () => {
  const sql = fs.readFileSync(path.join(root, 'migrations', '0007_wordchain_dictionary.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS wordchain_words/);
  assert.match(sql, /first_syllable TEXT NOT NULL/);
  assert.match(sql, /last_syllable TEXT NOT NULL/);
  assert.match(sql, /is_safe INTEGER NOT NULL/);
  assert.match(sql, /is_technical INTEGER NOT NULL/);
  assert.match(sql, /idx_wordchain_words_first/);
  const seeded = (sql.match(/'kidscade_seed'/g) || []).length;
  assert.ok(seeded >= 300, 'starter dictionary should contain at least 300 safe nouns');
});

test('word-chain arena is registered and has server/local fallback', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
  const game = catalog.games.find(item => item.id === 'low_wordchain_arena');
  assert.ok(game);
  assert.equal(game.age, 'low');
  assert.match(game.href, /games\/low_wordchain_arena\/index\.html/);

  const html = fs.readFileSync(path.join(root, 'games', 'low_wordchain_arena', 'index.html'), 'utf8');
  assert.match(html, /\/api\/wordchain\/health/);
  assert.match(html, /\/api\/wordchain\/validate/);
  assert.match(html, /\/api\/wordchain\/candidates/);
  assert.match(html, /LOCAL_WORDS/);
  assert.match(html, /12초/);

  const marker = '<script>\n(() => {';
  const start = html.indexOf(marker);
  const end = html.lastIndexOf('\n</script>');
  assert.ok(start >= 0 && end > start);
  const script = html.slice(start + '<script>\n'.length, end);
  assert.doesNotThrow(() => new Function(script));
});

test('main worker routes the word-chain API', () => {
  const main = fs.readFileSync(path.join(root, 'worker', 'main.mjs'), 'utf8');
  assert.match(main, /handleWordchainRequest/);
  assert.match(main, /wordchainResponse/);
});
