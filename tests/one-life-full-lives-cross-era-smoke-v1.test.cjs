'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'../games/high_one_life');
const c={console};c.window=c;vm.createContext(c);
for(const src of fs.readFileSync(base+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g)){
 const f=src[1];if(['game.js','goryeo-view-v343.js'].includes(f))continue;
 vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),c,{filename:f});
}
const L=c.OneLifeSim.Life,Id=c.OneLifeIdentity20;
const scenarios=[
 [1200,'농민 가구'],[1270,'노비 가구'],[1350,'관료 가문'],
 [1490,'양반'],[1600,'상민'],[1720,'사노비'],[1740,'왕실 종친'],
 [1810,'백정'],[1880,'공노비'],[1919,''],[1950,''],[2026,'']
];
test('72 complete lives across Goryeo, Joseon and modern era have no stranded choices or broken chronology',()=>{
 let lives=0,choices=0,restores=0,centuries=new Set(),seenFemale=0;
 for(let i=0;i<scenarios.length;i++){
  const [birthYear,origin]=scenarios[i];
  if(origin)assert.ok(Id.validOrigin(birthYear,origin),birthYear+' '+origin);
  for(const gender of ['남자','여자'])for(const variant of [0,1,2]){
   const seed=(20261023+Math.imul(i+1,7919)+variant*313+(gender==='여자'?977:0))>>>0;
   let l=new L(seed,{birthYear,birthSetup:{origin,gender}});
   assert.equal(l.birthYear,birthYear);assert.equal(l.gender,gender);
   if(gender==='여자')seenFemale++;
   let count=0;
   while(l.alive&&count++<400){
    if(count%17===0){
     const saved=JSON.parse(JSON.stringify(l.snapshot()));
     const before=l.getChoice(),restored=L.restore(saved);
     assert.ok(restored,'restoration failed for '+birthYear+' age '+l.age);
     assert.equal(restored.age,l.age);
     assert.equal(restored.year,l.year);
     assert.equal(restored.gender,l.gender);
     assert.equal(restored.pending,l.pending);
     assert.deepEqual(JSON.parse(JSON.stringify(restored.getChoice())),JSON.parse(JSON.stringify(before)));
     l=restored;restores++;
    }
    if(l.pending){
     if(l.getReflection()){
      assert.equal(l.reflect(''),true,'reflection stuck '+birthYear+' '+l.age);
     }else{
      const q=l.getChoice();
      assert.ok(q&&Array.isArray(q.options)&&q.options.length>0,
        'orphan choice '+birthYear+' '+l.age+' '+String(l.pending));
      const selected=(seed+Math.imul(l.age+1,17)+count)%q.options.length;
      let accepted=l.choose(selected);
      if(!accepted)for(let index=0;index<q.options.length;index++){
       if(index!==selected&&l.choose(index)){accepted=true;break;}
      }
      assert.equal(accepted,true,'no valid choice '+birthYear+' '+l.age+' '+String(l.pending));
      choices++;
     }
    }else{
     assert.equal(l.tick(),true,'year refused '+birthYear+' age '+l.age);
    }
    assert.equal(l.year,l.birthYear+l.age,'year drift '+birthYear+' age '+l.age);
    assert.ok(l.age<=108);
    assert.ok(Object.values(l.stats).every(x=>Number.isFinite(x)&&x>=0&&x<=100));
   }
   assert.equal(l.alive,false,'life never completed '+birthYear+' '+origin+' '+gender+' '+variant);
   assert.ok(count<400,'life stuck '+birthYear+' '+origin);
   assert.equal(l.pending,null,'the dead must have no pending decisions');
   assert.ok(l.log.some(e=>e.kind==='death'),'a completed life needs its death event');
   if(origin&&birthYear<1894)assert.equal(l.birthSetup.origin,origin,'a chosen birthplace must remain chosen');
   lives++;centuries.add(Math.floor(birthYear/100));
  }
 }
 assert.equal(lives,72);assert.equal(seenFemale,36);assert.equal(centuries.size>=6,true);
 assert.ok(choices>100,'simulation needs meaningful choices');
 assert.ok(restores>100,'save/restore coverage should reach multiple stages');
 console.log(JSON.stringify({lifeAudit:{lives,choices,restores,centuries:[...centuries].sort()}}));
});
