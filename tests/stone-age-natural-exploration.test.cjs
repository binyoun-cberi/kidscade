'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const gameDir = path.join(ROOT, 'games/high_human_history_cards');

function read(name){ return fs.readFileSync(path.join(gameDir, name), 'utf8'); }

test('Stone Age v14 uses direct natural-region exploration instead of a global expedition button', () => {
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

test('catalog and game shell are cache-bumped to v14', () => {
  const html = read('index.html');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
  const entry = data.games.find(g => g.id === 'high_human_history_cards');
  assert.ok(entry);
  assert.match(html, /style\.css\?v=14/);
  assert.match(html, /game\.js\?v=14/);
  assert.ok(entry.href.endsWith('?v=14'));
});

test('v12 living nature depletes, recovers and changes exploration pressure', () => {
  const js = read('game.js');
  const css = read('style.css');
  assert.match(js, /const NATURE_ECO/);
  assert.match(js, /function useNature/);
  assert.match(js, /function tickNatureRecovery/);
  assert.match(js, /adjustedExploreEntries/);
  assert.match(js, /ecoUse:2/);
  assert.match(js, /ecoUse:1/);
  assert.match(js, /exploreWear=NATURE_ECO\[node\.type\].*!NATURE_ECO\[node\.type\]\.renewable\?1:0/);
  assert.match(css, /\.natureBadge/);
  assert.match(css, /\.nature-depleted/);
});

test('v12 restores wolves, auto-stacks loose output and separates work from exploration counts', () => {
  const js = read('game.js');
  assert.match(js, /\['wolf',8\]/);
  assert.match(js, /function nearbyStack/);
  assert.match(js, /AUTO_STACK_KINDS/);
  assert.match(js, /\|\|SAME\[type\]\)return null/);
  assert.match(js, /!c\.exploring&&\(c\.busy\|\|c\.assignmentNodeId\)/);
});

test('v12 managed production is deliberately stronger than wild extraction', () => {
  const js = read('game.js');
  assert.match(js, /loggingCamp:40/);
  assert.match(js, /quarry:40/);
  assert.match(js, /loggingCamp:\{ms:7000[^\n]+\['wood',3\]/);
  assert.match(js, /quarry:\{ms:7600[^\n]+\['stone',4\]/);
});

test('v14 Bronze and Iron Age progression is reachable from mining through settlement', () => {
  const js = read('game.js');
  for (const token of ['copperVein','tinVein','ironVein','stonePick','miner','copperIngot','tinIngot','bronzeIngot','bronzeCenter','bloomery','ironBloom','ironIngot','ironTown']) {
    assert.ok(js.includes(token), token);
  }
  assert.match(js, /\['chopper','wood',1,1,\[\['stonePick',1\]\]/);
  assert.match(js, /\['copperOre','highKiln',1,0,\[\['copperIngot',1\]\]/);
  assert.match(js, /\['tinOre','highKiln',1,0,\[\['tinIngot',1\]\]/);
  assert.match(js, /\['copperIngot','tinIngot',1,1,\[\['bronzeIngot',1\]\]/);
  assert.match(js, /\['ironOre','charcoal',1,1,\[\['ironCharge',1\]\]/);
  assert.match(js, /\['ironCharge','bloomery',1,0,\[\['ironBloom',1\]\]/);
  assert.match(js, /\['ironBloom','bronzeHammer',1,0,\[\['ironIngot',1\]\]/);
  assert.match(js, /\['bronzeCenter','ironIngot',1,1,\[\['ironTown',1\]\]/);
});

test('v14 metal specialists create real productivity progression', () => {
  const js = read('game.js');
  assert.match(js, /bronzeLumberjack/);
  assert.match(js, /bronzeMiner/);
  assert.match(js, /ironLumberjack/);
  assert.match(js, /ironMiner/);
  assert.match(js, /ironFarmer/);
  assert.match(js, /ironHunter/);
  assert.match(js, /tier===2\?6:tier===1\?4:3/);
  assert.match(js, /tier===2\?3:tier===1\?2:1/);
  assert.match(js, /ecoUse:cost/);
});

test('v14 age HUD, goals and milestones extend through the Iron Age', () => {
  const js = read('game.js');
  assert.match(js, /function ageRank\(/);
  assert.match(js, /청동기 생활/);
  assert.match(js, /철기 생활/);
  assert.match(js, /청동기 중심 취락 완성/);
  assert.match(js, /철기 마을을 완성했어요/);
  assert.match(js, /철기 시대 정착 완성/);
  assert.match(js, /철기 마을을 완성한다/);
});

test('v14 tin has both exploration and trade paths and dolmen does not consume the Bronze center', () => {
  const js = read('game.js');
  assert.match(js, /\['tinVein',7\]/);
  assert.match(js, /node\.type==='rockyHill'&&level>=2.*copperVein/);
  assert.match(js, /node\.type==='rockyHill'&&level>=3.*ridge/);
  assert.match(js, /node\.type==='ridge'&&level>=2.*tinVein/);
  assert.match(js, /node\.type==='ridge'&&level>=3.*caveEntrance/);
  assert.match(js, /node\.type==='caveEntrance'&&level>=2.*deepCave/);
  assert.match(js, /node\.type==='deepCave'&&level>=2.*ironVein/);
  assert.doesNotMatch(js, /if\(level>=def\.max\).*common/);
  assert.match(js, /주석 교역/);
  assert.match(js, /\['bronzeCenter','stone',0,2,\[\['dolmen',1\]\]/);
});

test('full campaign balance avoids late settlement and charcoal grind', () => {
  const js = read('game.js');
  assert.match(js, /village:\{need:2,out:'largeVillage'/);
  assert.match(js, /reedBed:14,clayBank:14/);
  assert.match(js, /\['wood','highKiln',2,0,\[\['charcoal',3\]\]/);
  assert.match(js, /bronzeLumberjack.*bronzeMiner.*bronzeHunter/);
  assert.match(js, /ironLumberjack.*ironMiner.*ironFarmer.*ironHunter/);
  assert.match(js, /const reached=Math\.max\(rank,order\[state\.ageReached\]\?\?0\)/);
});

test('late age milestones accept equipped metal specialists after their tools are consumed', () => {
  const js = read('game.js');
  assert.match(js, /state\.bronzeMilestoneShown.*bronzeLumberjack.*bronzeMiner.*bronzeHunter/s);
  assert.match(js, /state\.ironMilestoneShown.*ironLumberjack.*ironMiner.*ironFarmer.*ironHunter/s);
});

test('all recipe inputs and outputs reference defined cards', () => {
  const js = read('game.js');
  const cBlock = js.match(/const C=\{([\s\S]*?)\n\};\n\nconst state=/);
  const rBlock = js.match(/const R=\[([\s\S]*?)\]\.map\(x=>/);
  const sameBlock = js.match(/const SAME=\{([\s\S]*?)\n\};/);
  assert.ok(cBlock && rBlock && sameBlock);
  const cards = new Set([...cBlock[1].matchAll(/^\s*([A-Za-z_]\w*):\{name:/gm)].map(m => m[1]));
  const refs = [];
  for (const m of rBlock[1].matchAll(/\['([^']+)','([^']+)',\d+,\d+,\[\['([^']+)',\d+\]\]/g)) refs.push(m[1], m[2], m[3]);
  for (const m of sameBlock[1].matchAll(/^\s*(\w+):\{need:\d+,out:'([^']+)'/gm)) refs.push(m[1], m[2]);
  assert.deepEqual([...new Set(refs.filter(x => !cards.has(x)))], []);
});
