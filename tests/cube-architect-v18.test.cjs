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
const sandbox={};
new Function('window',landmarkJs)(sandbox);
new Function('window',worldJs)(sandbox);
new Function('window',poiJs)(sandbox);
const plans=sandbox.CubeArchitectLandmarks();
const world=sandbox.CubeArchitectWorld;
const pois=sandbox.CubeArchitectPOI.POIS;
const key=(x,y,z)=>x+','+y+','+z;
const hash2=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v)};
const keep=(role,x,y,z)=>{
  const rate=role==='base'?.93:role==='body'?.72:
    (role==='tower'||role==='arch')?.56:
    (role==='roof'||role==='dome'||role==='spire')?.42:.24;
  const gx=Math.floor(x/4),gy=Math.floor(y/3),gz=Math.floor(z/4);
  return hash2(gx*17+gy*5,gz*19-gy*3)<rate;
};
const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
test('v18 loads the shared POI module before the game runtime',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(poiJs));
  assert.match(html,/cube-architect-poi\.js\?v=20260930-18/);
  assert.match(html,/cube-architect\.js\?v=20260930-18/);
  assert.ok(html.indexOf('cube-architect-landmarks.js')<html.indexOf('cube-architect-poi.js'));
  assert.ok(html.indexOf('cube-architect-poi.js')<html.indexOf('cube-architect.js'));
  assert.match(js,/const poiRules=window\.CubeArchitectPOI/);
  assert.match(js,/generateLandmarkPoiChunk/);
});
test('six survival ruins come from the six hard blueprint plans',()=>{
  assert.equal(pois.length,plans.length);
  assert.equal(pois.length,6);
  const missions=new Set();
  for(const poi of pois){
    assert.ok(!missions.has(poi.missionIndex));
    missions.add(poi.missionIndex);
    assert.equal(world.region(...poi.center),poi.biome,poi.name);
    assert.equal(poi.sourceName,plans[poi.missionIndex].name);
    assert.ok(poi.compact.blocks.length>=300,poi.name);
    assert.ok(Math.max(...poi.compact.size)<=19,poi.name);
    assert.ok(poi.tech.id);
    assert.ok(poi.tech.label);
    assert.ok(Object.keys(poi.tech.reward||{}).length>=1);
  }
});
test('world POIs look ruined and restoration challenges also start below pass score',()=>{
  for(const poi of pois){
    const worldCoverage=Math.round(poi.compact.blocks.length/poi.compact.fullShell.length*100);
    assert.ok(worldCoverage>=55,poi.name+' world ruin should remain recognisable');
    assert.ok(worldCoverage<=82,poi.name+' world ruin should have obvious missing structure');
    const plan=plans[poi.missionIndex],all=new Set(plan.blocks.map(p=>key(...p)));
    const outer=plan.blocks.filter(([x,y,z])=>dirs.some(([a,b,c])=>!all.has(key(x+a,y+b,z+c))));
    const kept=new Set(plan.blocks.filter(p=>keep(plan.roles?.[key(...p)]||'body',...p)).map(p=>key(...p)));
    const challengeCoverage=Math.round(outer.filter(p=>kept.has(key(...p))).length/outer.length*100);
    assert.ok(challengeCoverage>=50,poi.name+' restoration seed should be recognisable');
    assert.ok(challengeCoverage<85,poi.name+' restoration seed must not auto-pass');
  }
  assert.match(js,/restorationScore>=85/);
  assert.match(js,/seedRestorationChallenge/);
});
test('Taj Mahal survival POI maps to its desert chunks and unlocks glass construction',()=>{
  const taj=pois.find(p=>p.id==='taj');
  assert.ok(taj);
  assert.equal(taj.sourceName,'랜드마크 · 타지마할');
  assert.equal(world.region(...taj.center),'desert');
  assert.deepEqual(taj.tech.recipes,['glassPane','windowFrame']);
  assert.equal(taj.tech.reward.glass,4);
  const [ox,oz]=taj.origin,[w,,d]=taj.compact.size;
  const minCX=Math.floor(ox/16),maxCX=Math.floor((ox+w-1)/16);
  const minCZ=Math.floor(oz/16),maxCZ=Math.floor((oz+d-1)/16);
  let chunkHits=0;
  for(let cx=minCX;cx<=maxCX;cx++)for(let cz=minCZ;cz<=maxCZ;cz++){
    const ids=sandbox.CubeArchitectPOI.poisForChunk(cx,cz,16).map(p=>p.id);
    assert.ok(ids.includes('taj'),'taj should load in intersecting chunk '+cx+','+cz);
    chunkHits++;
  }
  assert.ok(chunkHits>=2);
  assert.match(js,/setLandmarkPoiBlocks\(poi,restoredLandmarks\.has\(poi\.id\),chunk\)/);
  assert.match(js,/completeLandmarkPoi\(session\.poiId\)/);
});
test('landmark restoration unlocks real building technology and finishes the campaign',()=>{
  assert.ok(world.GOALS.length>=11);
  const final=world.GOALS[world.GOALS.length-1];
  const stats={restored:[]};
  assert.equal(world.goalProgress(final,stats),0);
  stats.restored.push('taj');
  assert.equal(world.goalProgress(final,stats),1);
  assert.match(js,/unlockedTech\.add\(poi\.tech\.id\)/);
  assert.match(js,/recipeUnlocked\(r\.id\)/);
  assert.match(js,/survivalCuboidMax/);
  assert.match(js,/protectedPoi/);
  assert.match(js,/discoveredLandmarks/);
  assert.match(js,/restoredLandmarks/);
  assert.match(js,/version:6/);
});
