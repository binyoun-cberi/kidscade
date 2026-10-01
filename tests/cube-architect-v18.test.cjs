'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const worldJs=read('games/cube3d/cube-architect-world.js');
const landmarkJs=read('games/cube3d/cube-architect-landmarks.js');
const poiJs=read('games/cube3d/cube-architect-poi.js');
const html=read('games/cube3d/index.html');
const css=read('games/cube3d/cube-architect.css');
const sandbox={};
new Function('window',landmarkJs)(sandbox);
new Function('window',worldJs)(sandbox);
new Function('window',poiJs)(sandbox);
const plans=sandbox.CubeArchitectLandmarks();
const world=sandbox.CubeArchitectWorld;
const poiApi=sandbox.CubeArchitectPOI;
const pois=poiApi.POIS;
const key=p=>p.p.join(',');

test('v20 loads scaled intact landmark POIs and the dungeon runtime',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(poiJs));
  assert.match(html,/cube-architect-poi\.js\?v=20261001-21/);
  assert.match(html,/cube-architect\.js\?v=20261001-21/);
  assert.ok(html.indexOf('cube-architect-landmarks.js')<html.indexOf('cube-architect-poi.js'));
  assert.ok(html.indexOf('cube-architect-poi.js')<html.indexOf('cube-architect.js'));
  assert.match(html,/id="dungeonHud"/);
  assert.match(css,/#dungeonHud/);
  assert.match(js,/function initDungeon/);
  assert.match(js,/function dungeonInteract/);
  assert.match(js,/function openDungeonBlueprint/);
});

test('all six hard blueprints appear intact and recognisable in the survival world',()=>{
  assert.equal(pois.length,plans.length);
  assert.equal(pois.length,6);
  const missions=new Set();
  for(const poi of pois){
    assert.ok(!missions.has(poi.missionIndex));
    missions.add(poi.missionIndex);
    assert.equal(world.region(...poi.center),poi.biome,poi.name);
    assert.equal(poi.sourceName,plans[poi.missionIndex].name);
    assert.ok(poi.compact.blocks.length>=250,poi.name);
    assert.equal(poi.compact.blocks.length,poi.compact.fullShell.length,poi.name);
    assert.deepEqual(new Set(poi.compact.blocks.map(key)),new Set(poi.compact.fullShell.map(key)),poi.name);
    assert.ok(Math.max(...poi.compact.size)<=30,poi.name);
    assert.ok(Math.max(...poi.compact.size)>=22,poi.name);
    assert.ok(poi.dungeon?.title,poi.name);
    assert.ok(poi.dungeon?.theme,poi.name);
    assert.ok(poi.tech.id);
    assert.ok(Object.keys(poi.tech.reward||{}).length>=1);
    assert.equal(poiApi.isLandmarkClearZone(...poi.center),true,poi.name);
  }
  assert.doesNotMatch(poiJs,/타지마할 폐허|히메지성 터|앙코르와트 유적/);
});

test('overworld landmark generation always uses the complete shell and clears vegetation nearby',()=>{
  assert.match(js,/setLandmarkPoiBlocks\(poi,true,chunk\)/);
  assert.doesNotMatch(js,/setLandmarkPoiBlocks\(poi,restoredLandmarks\.has\(poi\.id\),chunk\)/);
  assert.match(js,/isLandmarkClearZone\?\.\(x,z,2\)/);
  assert.match(poiJs,/blocks:shell,fullShell:shell/);
  const taj=pois.find(p=>p.id==='taj');
  assert.ok(taj);
  assert.equal(taj.name,'타지마할');
  assert.equal(world.region(...taj.center),'desert');
  assert.ok(taj.compact.blocks.some(v=>v.type==='snowBrick'));
  assert.deepEqual(taj.tech.recipes,['glassPane','windowFrame']);
  assert.equal(taj.tech.reward.glass,4);
});

test('landmarks lead into a three-stage dungeon and then the existing blueprint room',()=>{
  assert.match(js,/대칭의 홀/);
  assert.match(js,/빛의 회랑/);
  assert.match(js,/최심부 설계실/);
  assert.match(js,/const DUNGEON_SPECS=/);
  assert.match(js,/taj:\{/);
  assert.match(js,/himeji:\{/);
  assert.match(js,/angkor:\{/);
  assert.match(js,/const order=spec\.order/);
  assert.match(js,/dungeonSession\.stage=1/);
  assert.match(js,/dungeonSession\.stage=2/);
  assert.match(js,/restorationSession=\{poiId:poi\.id,missionIndex:poi\.missionIndex,completed:false,fromDungeon:true\}/);
  assert.match(js,/seedRestorationChallenge/);
  assert.match(js,/restorationScore>=85/);
  assert.match(js,/설계 해독 완료/);
});

test('dungeon clear unlocks construction tech while retaining save compatibility',()=>{
  assert.ok(world.GOALS.length>=11);
  const final=world.GOALS[world.GOALS.length-1];
  assert.match(final.title,/랜드마크 던전/);
  const stats={restored:[]};
  assert.equal(world.goalProgress(final,stats),0);
  stats.restored.push('taj');
  assert.equal(world.goalProgress(final,stats),1);
  assert.match(js,/unlockedTech\.add\(poi\.tech\.id\)/);
  assert.match(js,/trackSurvival\('restore',id\)/);
  assert.match(js,/던전 클리어/);
  assert.match(js,/version:8/);
  assert.match(js,/restoredLandmarks/);
  assert.match(js,/protectedPoi/);
});
