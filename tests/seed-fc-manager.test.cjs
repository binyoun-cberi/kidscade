const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'games', 'high_seed_fc_manager');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const dataSource = fs.readFileSync(path.join(DIR, 'data.js'), 'utf8');
const simSource = fs.readFileSync(path.join(DIR, 'sim.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(DIR, 'game.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));
const game = catalog.games.find(item => item.id === 'high_seed_fc_manager');

function loadDataAndSim() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(dataSource, context);
  vm.runInContext(simSource, context);
  return context.window;
}

test('Seed FC Manager is registered as a high-grade social management game', () => {
  assert.ok(game);
  assert.equal(game.age, 'high');
  assert.equal(game.subject, 'social');
  assert.equal(game.genre, 'management');
  assert.match(game.href, /games\/high_seed_fc_manager\/index\.html/);
});

test('all eight Korean league clubs use 18 historical figures with no fictional academy fillers', () => {
  const { SeedFCData } = loadDataAndSim();
  assert.equal(SeedFCData.clubs.length, 8);
  for (const club of SeedFCData.clubs) {
    assert.equal(club.players.length, 18, club.name);
    assert.ok(club.players.every(player => player.historical === true), club.name);
    assert.equal(new Set(club.players.map(player => player.name)).size, 18, club.name);
    assert.ok(club.players.every(player => !/새싹|가상 선수/.test(player.name)), club.name);
  }
});

test('world transfer pool contains Newton and only historical figures', () => {
  const { SeedFCData } = loadDataAndSim();
  assert.ok(SeedFCData.world.some(player => player.name === '아이작 뉴턴'));
  assert.ok(SeedFCData.world.every(player => player.historical === true));
});

test('external game scripts compile and the HTML loads sim before game runtime', () => {
  assert.doesNotThrow(() => new Function(dataSource));
  assert.doesNotThrow(() => new Function(simSource));
  assert.doesNotThrow(() => new Function(gameSource));
  assert.match(html, /data\.js[\s\S]*sim\.js[\s\S]*game\.js[\s\S]*kidscade-game-sdk\.js/);
  assert.match(gameSource, /kidscade_game_v1:high_seed_fc_manager:save/);
});

test('match engine can complete a full 90 minute simulation', () => {
  const { SeedFCData, SeedFCSim } = loadDataAndSim();
  const home = SeedFCData.clubs[0];
  const away = SeedFCData.clubs[1];
  const homeLineup = home.players.slice(0, 11).map(player => player.id);
  const awayLineup = away.players.slice(0, 11).map(player => player.id);
  const match = SeedFCSim.create({
    homeClub: home,
    awayClub: away,
    homeRoster: JSON.parse(JSON.stringify(home.players)),
    awayRoster: JSON.parse(JSON.stringify(away.players)),
    homeLineup,
    awayLineup,
    homeFormation: '4-3-3',
    awayFormation: '4-3-3',
    homeTactics: JSON.parse(JSON.stringify(home.tactics)),
    awayTactics: JSON.parse(JSON.stringify(away.tactics)),
    formations: SeedFCData.formations
  });
  let guard = 0;
  while (!match.finished && guard++ < 10000) match.update(0.1, 4);
  assert.equal(match.finished, true);
  assert.equal(match.minute, 90);
  assert.equal(Number.isInteger(match.score[0]), true);
  assert.equal(Number.isInteger(match.score[1]), true);
});


test('match presentation has visual movement trails and shared soccer assets', () => {
  assert.match(simSource, /trail:\[\]/);
  assert.match(simSource, /lastTouchId/);
  assert.match(simSource, /effects:\[\]/);
  assert.match(gameSource, /ball_soccer1\.png/);
  assert.match(gameSource, /projectile-whoosh-01\.mp3/);
  assert.match(gameSource, /cheer-yay-01\.mp3/);
  assert.match(gameSource, /a\.trail/);
  assert.match(gameSource, /match\.ball\.trail/);
  assert.match(gameSource, /match\.effects/);
});


test('replay export records frames heatmaps and player stats', () => {
  const { SeedFCData, SeedFCSim } = loadDataAndSim();
  const home = SeedFCData.clubs[0];
  const away = SeedFCData.clubs[1];
  const match = SeedFCSim.create({
    homeClub: home,
    awayClub: away,
    homeRoster: JSON.parse(JSON.stringify(home.players)),
    awayRoster: JSON.parse(JSON.stringify(away.players)),
    homeLineup: home.players.slice(0, 11).map(player => player.id),
    awayLineup: away.players.slice(0, 11).map(player => player.id),
    homeFormation: '4-3-3',
    awayFormation: '4-3-3',
    homeTactics: JSON.parse(JSON.stringify(home.tactics)),
    awayTactics: JSON.parse(JSON.stringify(away.tactics)),
    formations: SeedFCData.formations
  });
  let guard = 0;
  while (!match.finished && guard++ < 10000) match.update(0.1, 4);
  const replay = match.exportReplay();
  assert.ok(replay.frames.length >= 100 && replay.frames.length <= 180);
  assert.equal(replay.players.length, 22);
  assert.equal(replay.heat[replay.players[0].id].length, 60);
  assert.equal(typeof replay.stats[replay.players[0].id].distance, 'number');
  assert.ok(JSON.stringify(replay).length < 180000);
});

test('manager exposes replay analysis and a two-tier promotion relegation system', () => {
  assert.match(html, /data-view="analysis"/);
  assert.match(html, /id="replayLayer"/);
  assert.match(gameSource, /function analysis\(\)/);
  assert.match(gameSource, /function advanceSeason\(\)/);
  assert.match(gameSource, /divisionIds/);
  assert.match(gameSource, /promoted/);
  assert.match(gameSource, /relegated/);
  assert.match(gameSource, /schedule\(ids,2\)/);
  assert.match(gameSource, /state\.replays\.slice\(0,6\)/);
  assert.match(gameSource, /히트맵/);
});
