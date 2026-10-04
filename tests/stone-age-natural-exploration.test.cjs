'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const gameDir = path.join(ROOT, 'games/high_human_history_cards');

function read(name){ return fs.readFileSync(path.join(gameDir, name), 'utf8'); }

test('Stone Age v11 uses direct natural-region exploration instead of a global expedition button', () => {
  const html = read('index.html');
  const js = read('game.js');
  assert.doesNotThrow(() => new Function(js));
  assert.match(html, /id="workforceStatus"/);
  assert.doesNotMatch(html, /id="exploreBtn"/);
  assert.doesNotMatch(js, /state\.expedition|tickExpedition|function explore\(\)/);
  assert.match(js, /const EXPLORE_DEFS/);
  for (const type of ['forestEdge','grassland','river','rockyHill','denseForest','wetland','valley','caveEntrance']) {
    assert.ok(js.includes(type), type);
  }
});

test('natural exploration locks a worker, tracks depth and can reveal resources, animals, clues and new places', () => {
  const js = read('game.js');
  assert.match(js, /oneShot:true,countExplore:true,exploreNode:true/);
  assert.match(js, /worker\.exploring=true/);
  assert.match(js, /node\.exploreLevel=Math\.min/);
  assert.match(js, /animalTrail/);
  assert.match(js, /footprints/);
  assert.match(js, /smokeTrace/);
  assert.match(js, /wildMillet/);
  assert.match(js, /wildBroomcorn/);
  assert.match(js, /wildGoat/);
  assert.match(js, /wildBoar/);
});

test('natural land can be converted into managed production sites', () => {
  const js = read('game.js');
  assert.match(js, /벌목장 개척/);
  assert.match(js, /들판 개간/);
  assert.match(js, /채석장 개척/);
  assert.match(js, /loggingCamp/);
  assert.match(js, /quarry/);
  assert.match(js, /간돌도끼\+숲→벌목장/);
});

test('catalog and game shell are cache-bumped to v11', () => {
  const html = read('index.html');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
  const entry = data.games.find(g => g.id === 'high_human_history_cards');
  assert.ok(entry);
  assert.match(html, /style\.css\?v=11/);
  assert.match(html, /game\.js\?v=11/);
  assert.ok(entry.href.endsWith('?v=11'));
});
