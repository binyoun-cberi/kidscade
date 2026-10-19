'use strict';
// Reproducible exploratory audit. Decision randomness is independent of life RNG.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const count=Number(process.argv[2]||512),runSeed=Number(process.argv[3]||20261019),out=process.argv[4]||'/tmp/random-lives-v342.json';
assert.ok(Number.isInteger(count)&&count>0&&count<=5000);
const H=c.OneLifeHousehold342,J=c.OneLifeJoseon,L=c.OneLifeSim.Life,copy=x=>JSON.parse(JSON.stringify(x));
let state=runSeed>>>0;function rnd(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}const pick=a=>a[Math.floor(rnd()*a.length)];
const origins=['',...c.OneLifeIdentity20.SOCIAL_CHOICES],families=c.OneLifeIdentity20.FAMILIES;
const report={runSeed,count,completed:0,restores:0,choices:0,actions:0,errors:[],actionKinds:{},eras:{},deaths:[],samples:[],lives:[]};
for(let n=0;n<count;n++){
 const year=1392+Math.floor(rnd()*635),seed=Math.floor(rnd()*0xffffffff),gender=pick(['여자','남자']),origin=pick(origins),familyLevel=pick(families),decisionStart=state;
 let l=new L(seed,{birthYear:year,countryName:'대한민국',birthSetup:{gender,origin,familyLevel}});c.OneLifeWorld8.ensure(l);let guard=0,acted=-1,trace=[],lastState;
 function record(kind,fn){if(fn()){report.actions++;report.actionKinds[kind]=(report.actionKinds[kind]||0)+1;trace.push({year:l.year,age:l.age,kind});return true;}return false;}
 function verify(){
  assert.equal(l.year,l.birthYear+l.age,'year-age mismatch');for(const [k,v] of Object.entries(l.stats))assert.ok(Number.isFinite(v)&&v>=0&&v<=100,'bad stat '+k+' '+v);
  if(l.joseon14?.captivity?.status==='held')assert.ok(!l.pending||String(l.pending).startsWith('joseon14:'),'domestic choice while captive: '+l.pending);
  const s=l.household342;if(s){assert.ok(Number.isFinite(s.pocket)&&s.pocket>=0,'negative pocket');for(const v of Object.values(s.fatigue))assert.ok(Number.isFinite(v)&&v>=0&&v<=100,'bad fatigue');assert.equal(new Set(s.stock.map(x=>x.id)).size,s.stock.length,'duplicate stock');}
 }
 try{
  while(l.alive&&guard++<1500){
   if(l.pending){const q=l.getChoice();if(q){const i=Math.floor(rnd()*q.options.length);trace.push({year:l.year,age:l.age,pending:l.pending,title:q.title,choice:q.options[i].label||q.options[i].text});assert.equal(l.choose(i),true,'rejected choice');report.choices++;}else if(l.getReflection())assert.equal(l.reflect(),true);else throw Error('orphan '+l.pending);}
   else{
    if(H.enabled(l)&&acted!==l.year){acted=l.year;const s=H.ensure(l);
     if(l.age>=6&&l.age<18)record('child',()=>H.action(l,pick(['errand','gather','sweet','trinket','save','steal'])));
     if(H.inCrisis(l)&&rnd()<.4){const p=pick(H.members(l).filter(p=>p.id==='self'||p.role==='child'));record('crisis',()=>H.action(l,'crisis',p.id));}
     else if(H.canManage(l)){
      const item=pick(s.stock.filter(x=>!x.raw));if(item)record('market',()=>H.action(l,pick(['sell','keep']),item.id));
      if(rnd()<.5)record('social',()=>H.action(l,pick(['kin','donate','ritual','strict'])));
      if(rnd()<.2)record('crop',()=>H.action(l,pick(['cotton','ginseng']))); // intentionally invalid key must be harmless
      if(rnd()<.3)record('plant',()=>H.action(l,'crop',pick(['cotton','ginseng'])));
      const adults=H.members(l).filter(p=>p.id!=='self'&&l.year-p.birthYear>=18);if(adults.length&&rnd()<.1)record('manager',()=>H.action(l,'manager',pick(adults).id));
      if(rnd()<.08)record('dispatch',()=>H.action(l,'dispatch'));
      if(!H.away(l))for(const p of H.members(l)){
       const plan=s.plans[p.id];if(plan?.task==='craft'&&plan.remaining>0&&rnd()<.15)record('pause',()=>H.action(l,'pause',p.id));
       if(rnd()<.12)record('practice',()=>H.action(l,'practice',p.id));
       const task=pick(H.workOptions(l,p)),recipe=pick(Object.keys(H.recipes));record('assign-'+task,()=>H.assign(l,p.id,task,recipe,rnd()<.2));
      }
      const contract=pick(s.contracts.filter(x=>x.status==='bound'&&x.id!=='self'));if(contract&&rnd()<.25)record('redeem',()=>H.action(l,'redeem',contract.id));
     }else if(H.away(l)&&rnd()<.5)record('letter',()=>H.action(l,'letter',pick(['care','study','wage'])));
    }
    if(!l.pending)assert.equal(l.tick(),true,'tick failed');
   }
   verify();
   if(l.alive&&rnd()<.12){lastState=copy(l.snapshot());const prompt=copy(l.getChoice()),pending=l.pending,h=copy(l.household342||null);l=L.restore(lastState);assert.ok(l,'restore null');assert.equal(l.pending,pending,'restore changed pending');assert.deepEqual(copy(l.getChoice()),prompt,'restore changed prompt');assert.deepEqual(copy(l.household342||null),h,'restore changed household');report.restores++;verify();}
  }
  assert.ok(guard<1500,'stalled');assert.equal(l.log.at(-1).kind,'death','missing death');report.completed++;report.deaths.push(l.age);
 }catch(e){report.errors.push({index:n,year,seed,gender,origin,familyLevel,decisionStart,age:l?.age,pending:l?.pending,message:e.message,stack:e.stack,trace:trace.slice(-30),snapshot:l?.snapshot?.()});}
 const era=year<1600?'1392–1599':year<1800?'1600–1799':year<1900?'1800–1899':'1900–2026';report.eras[era]=(report.eras[era]||0)+1;
 report.lives.push({index:n,year,seed,gender,origin:l.birthSetup.origin,familyLevel:l.familyLevel,died:l.age,completed:!l.alive,choices:trace.filter(t=>t.choice).length,household:l.household342?.history||[],log:l.log});
 if(n<10||n%64===0)report.samples.push({index:n,year,gender,origin:l.birthSetup.origin,age:l.age,trace:trace.slice(-8),log:l.log.slice(-12)});
 if((n+1)%64===0)console.log(JSON.stringify({progress:n+1,errors:report.errors.length,restores:report.restores}));
}
fs.writeFileSync(out,JSON.stringify(report));console.log(JSON.stringify({completed:report.completed,total:count,errors:report.errors.map(e=>({index:e.index,year:e.year,age:e.age,message:e.message})),restores:report.restores,choices:report.choices,actions:report.actions,actionKinds:report.actionKinds,eras:report.eras,output:out}));if(report.errors.length)process.exitCode=1;
