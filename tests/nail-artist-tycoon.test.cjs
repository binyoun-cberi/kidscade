'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'games/job_nail_artist/네일 아티스트 타이쿤.html'), 'utf8');

test('nail artist tycoon has a real shop progression loop', () => {
  assert.match(html, /const UPGRADE_DEFS = \{/);
  for (const key of ['table','supplies','decor','cabinet']) assert.match(html, new RegExp(key + ':\\{'));
  assert.match(html, /function buyUpgrade\(key\)/);
  assert.match(html, /function renderUpgradeGrid\(\)/);
  assert.match(html, /shopLevel\(\)/);
});

test('nail artist tycoon scores partial work and lets the player submit', () => {
  assert.match(html, /function evaluateNails\(\)/);
  assert.match(html, /function submitCustomer\(isTimeout = false, autoPerfect = false\)/);
  assert.match(html, /현재 완성도/);
  assert.match(html, /완성했어요/);
  assert.match(html, /threshold:/);
});

test('nail artist tycoon has varied customers and gradual difficulty', () => {
  assert.match(html, /const CUSTOMER_TYPES = \[/);
  for (const name of ['첫 방문 손님','유행 민감 손님','단골 손님','꼼꼼한 손님']) assert.ok(html.includes(name), name);
  assert.match(html, /day <= 2 \? 1/);
  assert.match(html, /reputation >= 4\.5/);
});

test('nail artist tycoon reset is namespaced and shift completion is reported', () => {
  assert.doesNotMatch(html, /localStorage\.clear\(\)/);
  assert.match(html, /localStorage\.removeItem\('nailTycoonSave'\)/);
  assert.match(html, /KidscadeGame\?\.result\?\.\(\{/);
  assert.match(html, /scope:'shift'/);
  assert.match(html, /if \(!dayClosed\)/);
});

test('nail artist tycoon touch and reviews avoid old interaction bugs', () => {
  assert.match(html, /addEventListener\('pointerdown'/);
  assert.doesNotMatch(html, /addEventListener\('touchstart'/);
  assert.match(html, /function resolveReview\(id\)/);
  assert.match(html, /r\.read = true/);
  assert.match(html, /resolved:false/);
});
