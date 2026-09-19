const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'한붓쓱.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('One Stroke uses asset-driven delivery landmarks',()=>{
  for(const token of [
    'function buildCityLandmarks',
    'function drawCityLandmarks',
    'function drawParcelBadge',
    "schoolBus:'assets/game/2d/vehicles/pixel/cars/bus-school.png'",
    "coneDown:'assets/game/2d/racing/kenney-racing-pack/objects/cone_down.png'",
    "scooter:'assets/game/2d/vehicles/pixel/cars/scooter.png'"
  ]) assert.ok(html.includes(token), 'missing '+token);
});

test('One Stroke keeps city assets committed in the repository',()=>{
  for(const rel of [
    'assets/game/2d/vehicles/pixel/cars/bus-school.png',
    'assets/game/2d/vehicles/pixel/cars/scooter.png',
    'assets/game/2d/racing/kenney-racing-pack/objects/cone_down.png',
    'assets/game/2d/racing/kenney-racing-pack/objects/cone_straight.png',
    'assets/game/2d/racing/kenney-racing-pack/objects/tree_large.png',
    'assets/game/2d/racing/kenney-racing-pack/objects/tent_blue.png'
  ]) assert.ok(fs.existsSync(path.join(root,rel)), 'missing '+rel);
});

test('One Stroke delivery city UI keeps route gameplay intact',()=>{
  assert.match(html,/function completionTrail/);
  assert.match(html,/function startDelivery/);
  assert.match(html,/function drawDelivery/);
  assert.match(html,/택배 허브에서 출발해 모든 배달 도로를 한 번씩 지나 보세요/);
  assert.match(html,/currentNode\(\)!==null&&!state\.delivery/);
});

test('One Stroke catalog points to city rework',()=>{
  const game=catalog.games.find(g=>g.id==='low_one_stroke');
  assert.ok(game);
  assert.equal(game.href,'한붓쓱.html?v=3');
});
