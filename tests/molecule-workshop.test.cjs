const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../games/molecule_workshop/core.js');

const root = path.resolve(__dirname, '..');

test('formula puzzles match by atom counts, regardless of tile order', () => {
  assert.equal(Core.findRecipe(['H', 'O', 'H']).id, 'water');
  assert.equal(Core.findRecipe(['O', 'H', 'H']).id, 'water');
  assert.equal(Core.findRecipe(['C', 'O', 'O']).id, 'carbon-dioxide');
  assert.equal(Core.findRecipe(['Na', 'Cl']).id, 'sodium-chloride');
});

test('unknown or oversized combinations never produce a discovery', () => {
  assert.equal(Core.findRecipe(['H', 'O']), null);
  assert.equal(Core.findRecipe(['H', 'H', 'H']), null);
  assert.equal(Core.findRecipe(Array(9).fill('H')), null);
  assert.equal(Core.findRecipe(['Xx']), null);
});

test('display formula hides a coefficient of one and preserves counts', () => {
  assert.equal(Core.formulaFromCounts({ C: 1, O: 2 }), 'CO2');
  assert.equal(Core.formulaFromCounts({ H: 2, O: 1 }), 'H2O');
  assert.equal(Core.formulaFromCounts({ O: 1, H: 2 }), 'H2O');
  assert.equal(Core.formulaFromCounts({ O: 3, C: 1, H: 1, Na: 1 }), 'NaHCO3');
  assert.deepEqual({ ...Core.countTiles(['H', 'O', 'H']) }, { H: 2, O: 1 });
});

test('hints show both missing and excess atoms for the selected goal', () => {
  assert.deepEqual(Core.hintForComposition({ H: 2, O: 1 }, ['H']), {
    missing: [{ symbol: 'H', count: 1 }, { symbol: 'O', count: 1 }], excess: []
  });
  assert.deepEqual(Core.hintForComposition({ H: 2, O: 1 }, ['H', 'H', 'O', 'O']), {
    missing: [], excess: [{ symbol: 'O', count: 1 }]
  });
  assert.deepEqual(Core.hintForComposition({ H: 2, O: 1 }, ['H', 'H', 'C']), {
    missing: [{ symbol: 'O', count: 1 }], excess: [{ symbol: 'C', count: 1 }]
  });
});

test('saved progress is validated against the curated discovery set', () => {
  assert.deepEqual(Core.normalizeSave({ discovered: ['water', 'bad'], completed: ['water', 'bad'], bestScore: 42.9 }), {
    discovered: ['water'], completed: ['water'], bestScore: 42, discoveries: 0
  });
});

test('game entry, SDK hook and catalog cover are wired to the new game', () => {
  const html = fs.readFileSync(path.join(root, 'games/molecule_workshop/index.html'), 'utf8');
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/games.json'), 'utf8'));
  const game = catalog.games.find(item => item.id === 'molecule_workshop');
  assert.ok(game, 'catalog entry exists');
  assert.equal(game.href, 'games/molecule_workshop/index.html');
  assert.match(html, /data-game-id="molecule_workshop"/);
  assert.ok(fs.existsSync(path.join(root, game.cover)));
});
