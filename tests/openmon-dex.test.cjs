'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..','games','openmon-dex');
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(base,'monsters.js'),'utf8'),ctx,{filename:'monsters.js'});
const {species,atlas,types,lore}=ctx.window.OPENMON_DEX;
const byId=new Map(species.map(s=>[s.id,s]));
test('all six sprite atlases are indexed without holes/duplicates',()=>{
  assert.equal(species.length,118);
  assert.equal(new Set(species.map(s=>s.id)).size,118);
  assert.equal(new Set(species.map(s=>s.name)).size,118);
  assert.deepEqual(Array.from(atlas,entry=>[entry.id,species.filter(s=>s.atlas===entry.id).length]),
    [['set1',18],['set2',18],['set4',12],['set5',36],['wolf',15],['shibu',19]]);
});
test('sprite coordinates are exact 64x64 crop squares within atlas bounds',()=>{
  for(const s of species){
    const a=atlas.find(a=>a.id===s.atlas);
    assert.ok(a,'unknown atlas: '+s.atlas);
    assert.equal(s.x,s.col*64);
    assert.equal(s.y,s.row*64);
    assert.equal(s.width,64);assert.equal(s.height,64);
    assert.ok(s.x>=0&&s.y>=0&&s.x+64<=a.width&&s.y+64<=a.height,s.id);
  }
});
test('each species has a valid scientific origin, typed battle category and habitat',()=>{
  for(const s of species){
    assert.ok(types[s.type],s.id);
    assert.ok(lore[s.topic],s.id);
    assert.ok(s.fact.length>=10,s.id);
    assert.ok(s.habitat.length>=2,s.id);
  }
  assert.equal(byId.get('set1_r01_c01').name,'멘델콩');
  assert.equal(byId.get('set1_r01_c01').topic,'mendel');
  assert.equal(byId.get('set5_r03_c02').topic,'pythagoras');
});
test('only confirmed evolution relations are linked at dex authoring stage',()=>{
  for(const s of species){
    if(!s.evolutionFrom){assert.equal(s.verifiedEvolution,false);continue;}
    assert.ok(byId.has(s.evolutionFrom),s.id);
    assert.equal(s.verifiedEvolution,true);
  }
  assert.equal(species.filter(s=>s.atlas==='shibu'&&s.evolutionFrom==='shibu_r00_c00').length,18);
  for(const row of [2,3,4]) {
    const prefix='set1_r'+String(row).padStart(2,'0')+'_c';
    assert.equal(byId.get(prefix+'03').evolutionFrom,prefix+'02');
    assert.equal(byId.get(prefix+'04').evolutionFrom,prefix+'03');
  }
  assert.equal(species.filter(s=>s.atlas==='wolf'&&s.verifiedEvolution).length,0);
});
test('the curator UI supports search, filtering, editing and data export/import',()=>{
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 for(const id of ['spriteList','search','typeFilter','atlasFilter','nameField','topicField','typeField','rarityField','stageField','habitatField','memoField','exportBtn','importBtn','resetBtn'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/src="monsters\.js"/);
 assert.match(html,/localStorage\.setItem/);
 assert.match(html,/sourceCount:db\.species\.length/);
 assert.match(html,/importClean\(data\)/);
 const inline=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(inline,'inline dex controller');
 assert.doesNotThrow(()=>new Function(inline[1]));
});
