'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const clone=x=>JSON.parse(JSON.stringify(x));let lives=0,restores=0,historyChoices=0;const topics={};
for(const year of [1400,1485,1580,1650,1740,1880])for(const gender of ['남자','여자'])for(let seed=1;seed<=12;seed++){
 let l=new c.OneLifeSim.Life(seed*137+year,{birthYear:year,countryName:'대한민국',birthSetup:{gender}});c.OneLifeWorld8.ensure(l);let guard=0;
 while(l.alive&&guard++<1100){
  if(l.pending){const prompt=l.getChoice();
   if(prompt){
    if(typeof l.pending==='string'&&l.pending.startsWith('joseon338:')){
     const before=clone(l.historyLife338),loan=clone(l.joseon2?.famineLoans||[]),q=clone(prompt),id=l.pending;
     l=c.OneLifeSim.Life.restore(clone(l.snapshot()));assert.ok(l);assert.equal(l.pending,id);assert.deepEqual(clone(l.getChoice()),q);
     assert.deepEqual(clone(l.historyLife338),before);assert.deepEqual(clone(l.joseon2.famineLoans),loan);restores++;historyChoices++;
     topics[l.historyLife338.active.key]=(topics[l.historyLife338.active.key]||0)+1;
    }
    assert.equal(l.choose((seed+guard)%prompt.options.length),true);
   }else if(l.getReflection())assert.equal(l.reflect(),true);else throw Error('orphan '+l.pending);
  }else assert.equal(l.tick(),true);
 }
 assert.ok(guard<1100,'stalled '+year+' '+seed);assert.equal(l.log.at(-1).kind,'death');lives++;
}
console.log(JSON.stringify({lives,restores,historyChoices,topics}));
