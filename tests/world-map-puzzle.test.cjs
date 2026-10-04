const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('W-puzzle is registered as a solo social puzzle',()=>{
  const catalog=JSON.parse(read('data/games.json'));
  const game=catalog.games.find(item=>item.id==='world_map_puzzle');
  assert.ok(game);
  assert.equal(game.subject,'social');
  assert.equal(game.genre,'puzzle');
  assert.deepEqual(game.players,['solo']);
  assert.match(game.href,/^games\/world_map_puzzle\/index\.html\?v=\d+$/);
});

test('W-puzzle bundles a clean local Natural Earth dataset',()=>{
  const geo=JSON.parse(read('games/world_map_puzzle/data/world-countries-110m.geojson'));
  assert.equal(geo.type,'FeatureCollection');
  assert.equal(geo.features.length,172);
  assert.match(String(geo.source),/Natural Earth/i);
  const ids=geo.features.map(feature=>feature.properties.iso3);
  assert.equal(new Set(ids).size,ids.length);
  for(const excluded of ['CYN','SOL','KOS']) assert.equal(ids.includes(excluded),false);
  for(const feature of geo.features){
    assert.ok(feature.properties.nameKo);
    assert.ok(feature.properties.iso2);
    assert.ok(feature.properties.continent);
  }
});

test('W-puzzle exposes regional modes and reports stage clears to Kidscade',()=>{
  const html=read('games/world_map_puzzle/index.html');
  for(const mode of ['world_continents','world_countries','east_asia','southeast_asia','south_asia','west_central_asia','europe','africa','north_america','south_america','oceania']){
    assert.match(html,new RegExp(mode));
  }
  assert.match(html,/KidscadeGame\.result/);
  assert.match(html,/scope:"stage"/);
  assert.match(html,/world-countries-110m\.geojson/);
});
