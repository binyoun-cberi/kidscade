'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};const W2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=W2;
const P=require(path.join(root,'joseon-history-policy.js'));global.window.OneLifeJoseonPolicy=P;
const J=require(path.join(root,'joseon-v1.js'));global.window.OneLifeJoseon=J;
const V2=require(path.join(root,'joseon-v2.js'));global.window.OneLifeJoseon2=V2;
const V3=require(path.join(root,'joseon-v3.js'));global.window.OneLifeJoseon3=V3;
const V4=require(path.join(root,'joseon-v4.js'));global.window.OneLifeJoseon4=V4;
const V5=require(path.join(root,'joseon-v5.js'));global.window.OneLifeJoseon5=V5;
const V6=require(path.join(root,'joseon-v6.js'));delete global.window;
const born=(year,seed)=>{const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});J.ensure(l);V2.ensure(l);V3.ensure(l);V4.ensure(l);V5.ensure(l);V6.ensure(l);return l;};
function free(l,age=25){l.year=l.birthYear+age;l.age=age;l.alive=true;l.pending=null;const s=V5.ensure(l);s.origin='자작 농가';s.freed=false;s.monastic=false;s.role='';return l;}
function play(l,to,style=0){let n=0;while(l.alive&&l.year<to){a.ok(++n<300,'stalled '+l.pending);if(l.pending){const q=l.getChoice();if(q)a.equal(l.choose(style%q.options.length),true);else if(l.getReflection())a.equal(l.reflect(),true);else a.fail('unknown '+l.pending);}else a.equal(l.tick(),true);}return l;}
test('six main jobs each have 12 unique scenes and 3 playable choices',()=>{
 a.equal(Object.keys(V6.CARES).length,6);let count=0;
 for(const [code,events] of Object.entries(V6.EPISODES)){a.equal(events.length,12,code);a.equal(new Set(events.map(e=>e[0])).size,12);
  for(const e of events){a.ok(e[1].length>10);a.equal(e[2].length,3);a.ok(e[2].every(x=>V6.STANCES[x[1]]));count++;}}
 a.equal(count,72);
});
test('teacher entry with inadequate schooling begins with apprenticeship',()=>{
 const l=free(born(1690,125),24),j=J.ensure(l);j.birthStatus='양반';j.status='양반';j.studyYears=0;l.stats.knowledge=5;l.gender='남자';
 V5.ensure(l).origin='문반 양반';j.active={kind:'examination',id:'exam1690',year:l.year};l.pending='joseon:exam1690';
 const q=l.getChoice(),i=q.options.findIndex(o=>o.action==='teach');a.ok(i>=0);a.ok(l.choose(i));
 a.equal(V6.summary(l).primary.code,'teacher');a.equal(V6.summary(l).primary.trained,false);
 for(let i=0;i<3;i++){l.year++;l.age++;l.pending=null;V6.yearEnd(l,V6.ensure(l));}
 a.equal(V6.summary(l).primary.trained,true);a.match(V6.summary(l).primary.name,/훈장/);
});
test('individual work roles enter their actual profession',()=>{
 for(const [origin,job,code] of [['어부 가계','어부','fisher'],['주막 가계','주모','inn'],
 ['대장장이 가계','대장장이','smith'],['보부상 가계','보부상','merchant'],['의관 가계','의술을 배우는 사람','healer']]){
  const l=free(born(1700,117)),s=V5.ensure(l);s.origin=origin;s.role=job;J.ensure(l).occupation=job;
  V6.discover(l);a.equal(V6.summary(l).primary.code,code,origin);
 }
});
test('social restrictions also govern professional careers',()=>{
 for(const origin of ['사노비','공노비','왕실 종친']){
  const l=free(born(1700,23));V5.ensure(l).origin=origin;V5.ensure(l).freed=false;
  a.equal(V6.adopt(l,'teacher'),false,origin);
 }
 const l=free(born(1700,29));V5.ensure(l).monastic=true;a.equal(V6.adopt(l,'healer'),false);
});
test('goods shortage changes a promise of service into an achievable action',()=>{
 const l=free(born(1700,91)),s=V6.ensure(l);a.ok(V6.adopt(l,'inn'));const w=s.career;
 l.year=w.started+2;l.age=27;V6.careerEvent(l,s,w);a.ok(l.pending?.startsWith('joseon6:'));
 w.resources.ingredients=0;const q=l.getChoice();a.match(q.options[0].label,/재료/);
 const old=J.ensure(l).capital;a.ok(l.choose(0));a.equal(w.resources.ingredients,0);a.ok(J.ensure(l).capital<=old+1);
});
test('a career decision remains linked to its exact followup after saving',()=>{
 const l=free(born(1650,17),30),s=V6.ensure(l);a.ok(V6.adopt(l,'smith'));const w=s.career;
 l.year=w.started+2;l.age=32;V6.careerEvent(l,s,w);a.ok(l.pending?.startsWith('joseon6:'));
 a.ok(l.choose(2));const chosen=l.log.findLast(e=>e.kind==='joseon6-choice');a.ok(chosen?.causeId);
 const saved=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));a.ok(saved);a.deepEqual(V6.summary(saved),V6.summary(l));
 a.ok(saved.log.some(e=>e.causeId===chosen.causeId));
 l.year+=3;l.age+=3;l.pending=null;V6.yearEnd(l,s);
 a.ok(l.log.some(e=>e.kind==='joseon6-followup'&&e.causeId===chosen.causeId));
});
test('all twelve teacher events actually become gameplay choices',()=>{
 const l=free(born(1600,88),25);l.gender='남자';const s=V6.ensure(l);a.ok(V6.adopt(l,'teacher'));const w=s.career;
 for(let i=0;i<12;i++){
  l.year=w.started+2+4*i;l.age=l.year-l.birthYear;l.pending=null;s.active=null;s.pending=[];
  V6.careerEvent(l,s,w);const q=l.getChoice();a.equal(q.title,V6.EPISODES.teacher[i][0]);
  a.equal(q.options.length,3);a.ok(l.choose(i%3));
 }
 a.equal(l.log.filter(x=>x.kind==='joseon6-choice').length,12);
});
test('in midlife a player may keep work, retrain or maintain a second occupation',()=>{
 const l=free(born(1700,18),25);a.ok(V6.adopt(l,'smith'));
 l.year=1737;l.age=37;l.pending=null;J.ensure(l).capital=-70;V6.yearEnd(l,V6.ensure(l));const q=l.getChoice();
 a.ok(q.options.some(x=>x.action.startsWith('side:')));
 a.ok(q.options.some(x=>x.action.startsWith('enter:')));
 a.ok(q.options.some(x=>x.action==='continue'));
 a.ok(l.choose(q.options.findIndex(x=>x.action.startsWith('side:'))));
 a.ok(V6.summary(l).secondary);a.equal(V6.summary(l).primary.code,'smith');
});
test('800 historical and modern lives complete with stable career saves',()=>{
 const types=new Set();let later=0,side=0;
 for(const y of [1392,1520,1640,1700,1750,1820,1890,1919])for(let seed=1;seed<=100;seed++){
  const l=play(born(y,y*31+seed*73),y+94,seed%3);
  const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot()))); 
  a.equal(copy.pending,l.pending);
  if(J.isJoseon(l)){const s=V6.summary(l);if(s.primary)types.add(s.primary.code);
   if(s.secondary)side++;later+=l.log.filter(x=>x.kind==='joseon6-followup').length;
   a.deepEqual(V6.summary(copy),s);}
 }
 a.equal(types.size,6);a.ok(later>500);a.ok(side>0);
});
test('page and story surface profession scene, legacy and delayed consequences',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 a.ok(html.indexOf('joseon-v5.js')<html.indexOf('joseon-v6.js'));a.ok(html.indexOf('joseon-v6.js')<html.indexOf('game.js'));
 a.match(game,/Joseon6\?\.summary/);a.match(game,/joseon6-choice/);a.match(game,/joseon6-followup/);
});

test('promoting a side trade to main work clears duplicate side occupation',()=>{
 const l=free(born(1700,151),25),s=V6.ensure(l);
 a.ok(V6.adopt(l,'smith'));
 a.ok(V6.adopt(l,'inn',{secondary:true}));
 a.equal(s.secondary.code,'inn');
 l.year=1732;l.age=32;
 a.ok(V6.adopt(l,'inn'));
 a.equal(V6.summary(l).primary.code,'inn');
 a.equal(V6.summary(l).secondary,null);
});

// A failed work decision must remain a failure after save/restore and its delayed memory.
test('failed work survives restore without a later success story',()=>{
 let l=free(born(1600,42),25);l.gender='남자';a.ok(V6.adopt(l,'merchant'));
 const s=V6.ensure(l);s.career.resources.goods=2;
 s.active={id:'1625-merchant-work',type:'career',code:'merchant',eventIndex:0,year:1625,title:'먼 장터의 거래',description:'물건을 팔러 간다.',choices:[0,1,2].map(()=>({label:'먼 장터로 간다',action:'risk'}))};l.pending='joseon6:1625-merchant-work';
 // Select a deterministic failed risk using the real choice path.
 let found=false;
 for(let seed=1;seed<100&&!found;seed++){
  const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));copy.seed=seed;
  a.ok(V6.choose(copy,0));if(V6.ensure(copy).followups.at(-1).failed){l=copy;found=true;}
 }
 a.ok(found);l=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 const f=V6.ensure(l).followups.at(-1);a.equal(f.failed,true);
 l.year=f.year;l.age=l.year-l.birthYear;l.pending=null;V6.yearEnd(l,V6.ensure(l));
 a.ok(l.log.some(e=>e.kind==='joseon6-followup'&&/되찾지는 못했다/.test(e.text)));
});
