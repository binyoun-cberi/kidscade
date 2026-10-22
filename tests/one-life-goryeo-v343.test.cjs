'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(!['game.js','goryeo-view-v343.js'].includes(m[1]))vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const L=c.OneLifeSim.Life,G=c.OneLifeGoryeo343,copy=x=>JSON.parse(JSON.stringify(x));
function make(year=1350,seed=173,origin='농민 가구'){const l=new L(seed,{birthYear:year,countryName:'대한민국',birthSetup:{gender:'여자',origin}});G.ensure(l);return l;}
function at(year,region='경상 내륙'){const l=make(year-20);l.year=year-1;l.age=19;l.goryeo343.region=region;l.stats.health=100;l.tick();return l;}
test('late Goryeo birth boundaries and origins stay distinct from Joseon',()=>{
 for(const year of [1200,1230,1270,1350,1391])for(const origin of c.OneLifeIdentity20.GORYEO_ORIGINS){const l=make(year,173,origin);assert.equal(l.birthYear,year);assert.equal(G.ensure(l).origin,origin);assert.equal(c.OneLifeJoseon.isJoseon(l),false);assert.match(c.OneLifeHistory.place(l),/고려/);}
 assert.equal(new L(1,{birthYear:1199}).birthYear,2026);assert.equal(G.is(make(1392)),false);
});
test('pending war, vocation, marriage, cotton and household choices survive restore exactly once',()=>{
 for(const [year,region]of [[1231,'개경 일대'],[1270,'서남 해안'],[1274,'강화'],[1366,'경상 내륙'],[1377,'충청 내륙'],[1392,'경상 내륙']]){
  const l=at(year,region),before=copy(l.snapshot()),q=copy(l.getChoice());assert.ok(q,year);const r=L.restore(before);assert.equal(r.pending,l.pending,year);assert.deepEqual(copy(r.getChoice()),q);assert.deepEqual(copy(r.goryeo343),copy(l.goryeo343));assert.equal(r.rng,l.rng);assert.equal(r.choose(0),true);assert.equal(r.choose(0),false);
 }
 for(const age of [6,14,20,24]){const l=make();l.age=age-1;l.year=l.birthYear+l.age;l.tick();const r=L.restore(copy(l.snapshot()));assert.deepEqual(copy(r.getChoice()),copy(l.getChoice()));}
});
test('cotton needs local access, a paid trial and time; no instant nationwide cotton',()=>{
 const l=make(1344);l.year=1367;l.age=23;l.goryeo343.region='경상 내륙';l.goryeo343.seen=['child','vocation','marriage'];l.tick();assert.ok(l.getChoice().options.some(o=>o.effect==='cotton'));l.choose(3);assert.equal(G.cottonAvailable(l),false);assert.equal(G.action(l,'crop','','목화'),false);
 while(l.year<1371&&l.alive){if(l.pending)l.choose(0);else l.tick();}assert.equal(G.cottonAvailable(l),true);assert.equal(G.action(l,'crop','','목화'),true);
 const r=L.restore(copy(l.snapshot()));assert.equal(r.goryeo343.crop,'목화');assert.equal(G.cottonAvailable(r),true);
 r.goryeo343.region='서북 내륙';assert.equal(G.cottonAvailable(r),false);
});
test('children, bound labor, absences and actual production constrain household assignments',()=>{
 const l=make();l.age=20;l.year+=20;const g=G.ensure(l);assert.equal(G.action(l,'plan','mother','삼베 짜기'),true);const cloth=g.cloth;l.tick();assert.ok(g.cloth>cloth);
 const b=make(1350,173,'노비 가구');b.age=20;b.year+=20;assert.equal(G.action(b,'plan','mother','배움'),false);
 const away=at(1274,'강화');away.choose(0);assert.equal(away.goryeo343.away,3);assert.equal(G.action(away,'crop','','곡식'),false);const restored=L.restore(copy(away.snapshot()));assert.equal(restored.goryeo343.away,3);
});
test('forged stored effects never become executable pending options',()=>{
 const l=at(1366),s=copy(l.snapshot());s.goryeo343.choice.options[0].delta.grain=99999;const r=L.restore(s);assert.deepEqual(copy(r.getChoice()),copy(l.getChoice()));s.pending='goryeo343:made-up';assert.equal(L.restore(s).pending,null);
});
test('384 random full lives preserve chronology, pending choices, families and RNG over restores',()=>{
 let rng=20261019,choices=0,restores=0,transitions=0;
 const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 for(let i=0;i<384;i++){
  const year=1200+i%192;let l=make(year,Math.floor(rand()*0xffffffff),c.OneLifeIdentity20.GORYEO_ORIGINS[i%7]),guard=0;
  while(l.alive&&guard++<400){
   if(rand()<.18){const s=copy(l.snapshot()),r=L.restore(s);assert.ok(r);assert.deepEqual(copy(r.goryeo343),copy(l.goryeo343),'state '+year+' '+l.age);assert.equal(r.rng,l.rng);assert.deepEqual(copy(r.getChoice()),copy(l.getChoice()));l=r;restores++;}
   if(l.pending){const q=l.getChoice();assert.ok(q,l.pending);assert.equal(l.choose(Math.floor(rand()*q.options.length)),true);choices++;}
   else {if(l.age>=14&&rand()<.2)G.action(l,'plan','mother',G.plans[Math.floor(rand()*G.plans.length)]);l.tick();}
   assert.equal(l.year,l.birthYear+l.age);for(const v of Object.values(l.stats))assert.ok(Number.isFinite(v)&&v>=0&&v<=100);assert.ok(l.goryeo343.grain>=0);
  }
  assert.equal(l.alive,false,'did not finish '+year);assert.ok(guard<400);if(l.year>=1392)transitions++;
  assert.equal(l.log.some(e=>e.year<1392&&/스마트폰|주식|연금|대학교|조선|양반|한양/.test(e.text)),false,'era leakage '+year);
 }
 assert.ok(choices>4000);assert.ok(restores>4000);assert.ok(transitions>20);console.log(JSON.stringify({lives:384,choices,restores,transitions}));
});

test('cloth becomes garments or cotton quilts and can be sold only when actually in stock',()=>{
 const l=make(1350);l.year=1375;l.age=25;const g=G.ensure(l);g.cotton=true;g.region='경상 내륙';g.cloth=8;g.people.forEach(p=>p.plan='휴식');
 assert.equal(G.action(l,'plan','mother','옷 짓기'),true);l.tick();assert.equal(g.clothes,1);assert.equal(g.cloth,6);while(l.pending)l.choose(0);
 assert.equal(G.action(l,'sell','clothes'),true);assert.equal(G.action(l,'sell','clothes'),false);
 assert.equal(G.action(l,'plan','mother','솜이불 만들기'),true);l.tick();assert.equal(g.quilts,1);assert.equal(g.cloth,4);while(l.pending)l.choose(0);
 const r=L.restore(copy(l.snapshot()));assert.equal(r.goryeo343.quilts,1);assert.equal(G.action(r,'sell','quilts'),true);
});


test('birth roulette visits all seven Goryeo regions instead of cycling at one index',()=>{
 const ui=c.OneLifeUIFlow;assert.ok(ui,'UI helper should load before game.js');
 const count=G.regions.length;assert.equal(count,7);
 const indices=Array.from({length:count},(_,i)=>ui.rouletteIndex(i+1,count));
 assert.equal(new Set(indices).size,count,'each region should appear during the first seven frames');
 for(const n of [2,3,4,5,6,7,8,10,12,14,15]){
  const indexes=Array.from({length:n},(_,i)=>ui.rouletteIndex(i,n));
  assert.equal(new Set(indexes).size,n,'must cycle through '+n+' regions');
  assert.ok(indexes.every(v=>Number.isInteger(v)&&v>=0&&v<n));
 }
 assert.equal(ui.rouletteIndex(1,0),0);
 assert.equal(ui.rouletteIndex(NaN,7),0);
});

test('choice identity remains stable on redraw and changes for the next event',()=>{
 const ui=c.OneLifeUIFlow;
 const life={birthYear:1350,year:1370,age:20,pending:'one-life:market'};
 const first={title:'가판대를 정리할까?',options:[{label:'판매'}]};
 const next={title:'가판대를 정리할까?',options:[{label:'판매'}]};
 assert.equal(ui.decisionKey(life,first,0),ui.decisionKey(life,next,0));
 assert.notEqual(ui.decisionKey(life,first,0),
   ui.decisionKey({...life,year:1371,age:21},first,0));
 assert.notEqual(ui.decisionKey(life,first,0),
   ui.decisionKey({...life,pending:'one-life:inventory'},first,0));
 assert.equal(ui.decisionKey(life,null,null),null);
 assert.ok(ui.decisionKey({...life,pending:'reflection:20'},null,20));
});

test('birth UI supports reduced motion and prevents repeated decision scrolling',()=>{
 const html=fs.readFileSync(dir+'/index.html','utf8');
 const game=fs.readFileSync(dir+'/game.js','utf8');
 assert.match(html,/<script src="\.\/ui-flow\.js\?v=1"><\/script>/);
 assert.ok(html.indexOf('ui-flow.js?v=1')<html.indexOf('game.js?v=73'));
 assert.match(game,/UIFlow\.rouletteIndex\(loops,sample\.length\)/);
 assert.doesNotMatch(game,/loops\*7\)%sample\.length/);
 assert.match(game,/prefers-reduced-motion: reduce/);
 assert.match(game,/if\(isNewDecision\)\$\('decision'\)\.scrollIntoView/);
 assert.match(game,/lastDecisionKey=decisionKey/);
});


test('game avoids invented aftermath lines when a choice has no measurable change',()=>{
 const code=fs.readFileSync(dir+'/game.js','utf8');
 assert.doesNotMatch(code,/그날의 일은 마음 한편에 남았다/);
 assert.doesNotMatch(code,/당장은 눈에 띄는 변화가 없었다/);
 assert.match(code,/if\(effectText\)life\.logEvent\(effectText,'decision-effect'\)/);
 // Choice systems must still retain their own genuine decision narration.
 const life=make(1350,17);
 for(let n=0;n<70&&life.alive;n++){
   if(life.pending){
     const q=life.getChoice();
     if(q){const before=life.log.length;assert.equal(life.choose(0),true);
       assert.ok(life.log.slice(before).some(e=>e.text),'choice narration must remain');}
     else if(life.getReflection())life.reflect();
     else throw Error('orphan pending choice');
   }else life.tick();
 }
});


test('ending associates an effect only with its actual choice, not another choice at the same age',()=>{
 const ui=c.OneLifeUIFlow,first={age:20,kind:'decision',text:'첫 선택'},second={age:20,kind:'decision',text:'두 번째 선택'};
 const effect={age:20,kind:'decision-effect',text:'살림 +3'};
 const log=[first,{age:20,kind:'event',text:'이후 다른 사건이 있었다'},second,effect];
 assert.equal(ui.decisionAftermath(log,first),null);
 assert.equal(ui.decisionAftermath(log,second),effect);
 assert.equal(ui.decisionAftermath(log,{...second}),null,'detached choice must not steal an effect');
 const linked={age:21,kind:'decision',causeId:'real-2'};
 const later={age:24,kind:'decision-effect',causeId:'real-2',text:'증빙된 후속'};
 assert.equal(ui.decisionAftermath([linked,later],linked),later);
 const game=fs.readFileSync(dir+'/game.js','utf8');
 assert.match(game,/UIFlow\.decisionAftermath\(life\.log,e\)/);
 assert.doesNotMatch(game,/그때는 무엇이 달라질지 몰랐다/);
});

test('offline prose review catches vague generic AI-style phrases without editing narrative',()=>{
 const style=require('../games/high_one_life/text-style-audit.cjs');
 const findings=style.analyze('그날의 일은 마음 한편에 남았다.\n이웃이 가져간 곡식은 세 되였다.','fixture');
 assert.equal(findings.length,1);
 assert.equal(findings[0].line,1);
 assert.equal(findings[0].file,'fixture');
 const game=fs.readFileSync(dir+'/game.js','utf8');
 for(const phrase of ['그날의 일은 마음 한편에 남았다','그때는 무엇이 달라질지 몰랐다',
    '세월이 지나며 이야기들이 남습니다','식구들과 고을의 하루를 보냈다']){
   assert.ok(!game.includes(phrase),'generic sentence must not reappear: '+phrase);
 }
 const inventory=style.scan();assert.ok(Array.isArray(inventory));
 assert.ok(inventory.every(item=>!item.file.includes('..')),'inventory paths stay local');
});
