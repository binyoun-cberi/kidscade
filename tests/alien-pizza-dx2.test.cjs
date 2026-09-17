const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'games/alien_pizza/외계인 피자 가게.html'), 'utf8');

function inlineScript(source) {
  const matches = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(matches.length, 'expected an inline game script');
  return matches.at(-1)[1];
}

test('Alien Pizza DX2 keeps tactile fraction-cooking flow', () => {
  for (const marker of [
    '외계인 피자 가게 DX 2.0',
    '피자 커터',
    '토핑 칠하기',
    '동치분수 보너스',
    '레이저 오븐',
    '끌어서 칠하기',
    'data-pizza=',
    'function setSlices(',
    'function equivalenceBonus(',
    'function startBake('
  ]) assert.ok(html.includes(marker), `missing marker: ${marker}`);
});

test('Alien Pizza DX2 preserves the legacy save namespace', () => {
  assert.ok(html.includes("const SAVE_KEY='alienPizzaDXSave'"));
});

test('Alien Pizza DX2 inline JavaScript parses', () => {
  assert.doesNotThrow(() => new Function(inlineScript(html)));
});

test('pizza cutting supports the intended fraction denominators', () => {
  assert.ok(html.includes('const DENOMS=[2,3,4,6,8,10,12]'));
});
