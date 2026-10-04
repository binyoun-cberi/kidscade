'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, '세계 국기 마스터.html'), 'utf8');
const catalog = fs.readFileSync(path.join(ROOT, 'achievement-catalog.js'), 'utf8');

test('world flag master uses bounded adaptive sessions', () => {
  assert.match(html, /const SESSION_DEFAULT=15/);
  assert.match(html, /function sessionLength\(\)/);
  assert.match(html, /scope:'session',status:'completed'/);
  assert.match(html, /status:'abandoned'/);
  assert.match(html, /Math\.min\(50,Math\.max\(0,\(state\.combo-1\)\*10\)\)/);
});

test('world flag master has continent mastery and difficulty progression', () => {
  assert.match(html, /const CONTINENTS=\{/);
  for (const token of ['asia','europe','northAmerica','southAmerica','africa','oceania']) assert.ok(html.includes(token), token);
  assert.match(html, /const DIFFS=\{/);
  assert.match(html, /function masteryProgress\(/);
  assert.match(html, /continent_mastered/);
});

test('world flag master uses local flags and smart distractors', () => {
  assert.match(html, /assets\/game\/2d\/flags\//);
  assert.doesNotMatch(html, /flagcdn\.com/);
  assert.match(html, /const SIMILAR_GROUPS=\[/);
  assert.match(html, /function smartDistractors\(/);
});

test('world flag master has partial capital scoring and spaced review', () => {
  assert.match(html, /parts\*60/);
  assert.match(html, /절반 성공!/);
  assert.match(html, /due:state\.answered\+3/);
  assert.match(html, /오답 복습/);
});

test('world flag master preserves legacy score and enables planned achievements', () => {
  assert.match(html, /flagQuizLegacyHighScore/);
  assert.match(html, /flagMasterV2/);
  assert.match(catalog, /world_flag_master:\s*\{/);
  assert.match(catalog, /continentMastered/);
  assert.match(catalog, /field:'perfect'/);
});
