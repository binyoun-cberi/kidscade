'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'games', 'math_rune_forest');
const page = fs.readFileSync(path.join(folder, '넘버 시그널 (룬의 숲).html'), 'utf8');
const art = fs.readFileSync(path.join(folder, 'rune-forest-art.js'), 'utf8');

test('Rune Forest loads the art bridge before game logic', () => {
  const tag = '<script src="rune-forest-art.js"></script>';
  assert.ok(page.includes(tag), 'art bridge must be loaded');
  assert.ok(page.indexOf(tag) < page.indexOf('const ART='), 'load order');
  assert.match(page, /ART\?\.enemy\?\./);
  assert.match(page, /ART\?\.hero\?\./);
  assert.match(page, /ART\.rune\(/);
  assert.match(page, /ART\?\.gem\?\./);
  assert.match(page, /ART\.flora\(/);
});

test('Every Rune Forest sprite is present in the existing Kenney CC0 pack', () => {
  const names = [...art.matchAll(/^\s+\w+: '([^']+\.png)',?$/gm)].map(m => m[1]);
  assert.ok(names.length >= 18, 'expected a full sprite set');
  assert.equal(new Set(names).size, names.length, 'no repeated sprite paths');
  for (const asset of names) {
    assert.ok(!asset.includes('..'), 'sprite must not escape source pack');
    assert.ok(fs.existsSync(path.join(root, 'assets/game/2d/platformer-art', asset)), asset);
  }
});

test('Math mechanics and touch controls remain intact', () => {
  for (const token of ['function strike(e)', 'function spawn(forced)', 'function enterPhase()',
    'function swapWeapon()', 'function level()', 'function end(win)', 'c.onpointerdown',
    '75초마다 페이즈 전환', 'PRIMES=[2,3,5,7]']) {
    assert.ok(page.includes(token), token);
  }
});

test('Both browser scripts parse without syntax errors', () => {
  new vm.Script(art, { filename: 'rune-forest-art.js' });
  const inline = page.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline, 'inline game script');
  new vm.Script(inline, { filename: 'rune-forest-game.js' });
});
