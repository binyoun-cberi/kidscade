'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const H=c.OneLifeHousehold342,J=c.OneLifeJoseon,copy=x=>JSON.parse(JSON.stringify(x));let lives=0,restores=0,actions=0;const kinds={};
for(const year of [1450,1580,1650,1740,1800,1840,1880,1905])for(const gender of ['여자','남자'])for(let seed=1;seed<=12;seed++){
 let l=new c.OneLifeSim.Life(year+seed*177,{birthYear:year,countryName:'대한민국',birthSetup:{gender}});c.OneLifeWorld8.ensure(l);let guard=0,acted=-1;
 while(l.alive&&guard++<1200){
  if(l.pending){const q=l.getChoice();if(q)assert.equal(l.choose((guard+seed)%q.options.length),true);else if(l.getReflection())l.reflect();else throw Error('orphan '+l.pending);}
  else{
   if(H.enabled(l)&&acted!==l.year){acted=l.year;const s=H.ensure(l);
    function perform(k,arg){if(H.action(l,k,arg)){actions++;kinds[k]=(kinds[k]||0)+1;}}
    if(l.age>=6&&l.age<18)perform(['errand','sweet','gather','steal','trinket','save'][seed%6]);
    if(H.inCrisis(l)&&seed%4===0)perform('crisis','self');
    else if(H.canManage(l)){
     if(s.stock.some(x=>!x.raw))perform(seed%2?'sell':'keep',s.stock.find(x=>!x.raw).id);
     perform(['kin','donate','strict','ritual'][seed%4]);
     if(seed%3===0)perform('crop',seed%2?'cotton':'ginseng');
     for(const p of H.members(l)){
      const options=H.workOptions(l,p),t=options[(seed+l.age+p.id.length)%options.length];
      if(H.assign(l,p.id,t,'straw',seed%3===0)){actions++;kinds[t]=(kinds[t]||0)+1;}
     }
    }else if(H.away(l))perform('letter','care');
    const state=copy(H.ensure(l)),pending=l.pending,choice=copy(l.getChoice());l=c.OneLifeSim.Life.restore(copy(l.snapshot()));assert.ok(l);assert.deepEqual(copy(H.ensure(l)),state);assert.equal(l.pending,pending);assert.deepEqual(copy(l.getChoice()),choice);restores++;
   }
   if(!l.pending)assert.equal(l.tick(),true);
  }
 }
 assert.ok(guard<1200,'stalled '+year+' '+gender+' '+seed);assert.ok(l.log.at(-1).kind==='death');lives++;
}
console.log(JSON.stringify({lives,actions,restores,kinds}));
