'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const clone=x=>JSON.parse(JSON.stringify(x));let lives=0,restores=0,choiceCount=0;const actions={};
for(const birth of [1860,1870,1880,1890,1900,1910,1920,1930])for(const gender of ['남자','여자'])for(let seed=1;seed<=12;seed++){
 let l=new c.OneLifeSim.Life(seed*137+birth,{birthYear:birth,countryName:'대한민국',birthSetup:{gender}});c.OneLifeWorld9.ensure(l);let guard=0;
 while(l.alive&&guard++<1100){
  if(l.pending){const p=l.getChoice();if(p){
   if(String(l.pending).startsWith('joseon341:')){const data=clone(l.snapshot()),id=l.pending,expected=clone(p);l=c.OneLifeSim.Life.restore(data);assert.equal(l.pending,id);assert.deepEqual(clone(l.getChoice()),expected);assert.deepEqual(clone(l.collaboration341),data.collaboration341);restores++;choiceCount++;}
   const i=(seed+guard)%p.options.length;
   if(String(l.pending).startsWith('joseon341:')){const a=p.options[i].action;actions[a]=(actions[a]||0)+1;}
   assert.equal(l.choose(i),true);
  }else if(l.getReflection())assert.equal(l.reflect(),true);else throw Error('orphan '+l.pending);
  }else assert.equal(l.tick(),true);
 }
 assert.ok(guard<1100,'stalled '+birth+' '+gender+' '+seed);assert.equal(l.log.at(-1).kind,'death');lives++;
}
console.log(JSON.stringify({lives,restores,choiceCount,actions}));
