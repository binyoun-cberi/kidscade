'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=W2;
const J=require(path.join(root,'joseon-v1.js'));global.window.OneLifeJoseon=J;
const V2=require(path.join(root,'joseon-v2.js'));global.window.OneLifeJoseon2=V2;
const V3=require(path.join(root,'joseon-v3.js'));global.window.OneLifeJoseon3=V3;
const V4=require(path.join(root,'joseon-v4.js'));global.window.OneLifeJoseon4=V4;
const V5=require(path.join(root,'joseon-v5.js'));delete global.window;
function born(year,seed){const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});if(J.isJoseon(l)){J.ensure(l);V2.ensure(l);V3.ensure(l);V4.ensure(l);V5.ensure(l);}return l;}
function progress(l,target,policy=0){
 let g=0;while(l.alive&&l.year<target){assert.ok(++g<300,'stalled '+l.year+' '+l.pending);
  if(l.pending){const p=l.getChoice();if(p)assert.equal(l.choose(policy%p.options.length),true,'choice '+l.pending);
   else if(l.getReflection())assert.equal(l.reflect(''),true);
   else assert.fail('unresolved '+l.pending);
  }else assert.equal(l.tick(),true);}
 return l;
}
function prepareOldChoice(l,age,kind,id='test'){
 l.age=age;l.year=l.birthYear+age;
 J.ensure(l).active={id,kind,year:l.year};l.pending='joseon:'+id;
 return l.getChoice();
}
function putInSocialClass(l,origin){
 const s=V5.ensure(l);s.origin=origin;s.originLabel=V5.ORIGINS[origin].label;
 s.trade=V5.ORIGINS[origin].trade;s.legal=origin==='사노비'||origin==='공노비'?'천인':'양인';s.freed=false;
 return s;
}
test('era weights change the birth mix but represent invented design, not a historical census',()=>{
 const mix=year=>{const x={양반:0,중인:0,상민:0,천민:0};
  for(let n=1;n<=2400;n++){const l=born(year,year*417+n);x[J.ensure(l).birthStatus]++;}
  return x;};
 const early=mix(1450),late=mix(1800),after1886=mix(1890),after1894=mix(1897);
 assert.ok(early.양반<late.양반,'late-design yangban share did not rise');
 assert.ok(early.천민>late.천민,'late-design bonded origins did not fall');
 assert.equal(after1886.천민,0,'1886 abolition of slave inheritance must affect children');
 assert.equal(after1894.천민,0);
 assert.equal(Object.values(early).reduce((a,b)=>a+b),2400);
});
test('slavery is not the same as marginalized but legally free baekjeong',()=>{
 const l=born(1700,17);putInSocialClass(l,'백정');
 assert.equal(V5.summary(l).legal,'양인');
 const e=born(1700,17);putInSocialClass(e,'사노비');
 assert.equal(V5.summary(e).legal,'천인');
});
test('bonded workers cannot bypass vocational, marriage, exam, household and elder restrictions',()=>{
 for(const [age,kind,forbidden] of [[15,'vocation',['farm','trade','workTrade']],[19,'marriage',['marry','independent']],[24,'examination',['exam','technical','trade']],[35,'household',['land','market','wagework']],[58,'elder',['retire','continue']]]){
  const l=born(1700,13);putInSocialClass(l,'사노비');
  const prompt=prepareOldChoice(l,age,kind,'test-'+kind);
  assert.ok(prompt&&prompt.options.length>=3);
  assert.ok(!prompt.options.some(x=>forbidden.includes(x.action)),kind);
 }
});
test('regional and household scene choices cannot bypass bonded-person restrictions',()=>{
 const l=born(1700,14);putInSocialClass(l,'공노비');
 let v=V2.ensure(l);v.active={kind:'regional',id:'test-regional',year:l.year};
 l.pending='joseon2:test-regional';
 assert.ok(l.getChoice().options.every(x=>!['commerce','homeland','openTrade'].includes(x.action)));
 l.pending=null;v.active=null;
 const s=V3.ensure(l);s.active={kind:'livelihood',id:'livelihood-1700',year:l.year};
 l.pending='joseon3:livelihood-1700';
 assert.ok(l.getChoice().options.every(x=>!['route','field'].includes(x.action)));
});
test('distinct working households have actual occupations and trade choices',()=>{
 const origins=['어부 가계','주막 가계','도공 가계','역관 가계','상인 가계','수군 가계','사찰 주변 가계'];
 for(const origin of origins){
  const l=born(1700,17);putInSocialClass(l,origin);
  const p=prepareOldChoice(l,15,'vocation','role-'+origin);
  assert.ok(p.options.some(x=>['workTrade','templeJoin'].includes(x.action)),origin);
  const first=p.options.findIndex(x=>['workTrade','templeJoin'].includes(x.action));
  assert.equal(l.choose(first),true,origin);
  if(origin==='사찰 주변 가계')assert.equal(V5.summary(l).role,'승려');
  else assert.ok(V5.summary(l).role!=='',origin);
 }
});
test('royal family is rare, and only a separate eligible succession can make a king',()=>{
 let royal=0;
 for(let seed=1;seed<=18000;seed++)if(V5.originFor({seed},{birthStatus:'양반',region:'한양'})==='왕실 종친')royal++;
 assert.ok(royal>=5&&royal<=110,'royal descent should be possible but rare');
 let candidate=0;for(let seed=1;seed<2000;seed++)if(V5.dice(seed,1908)<.018){candidate=seed;break;}
 assert.ok(candidate>0);
 const l=born(1650,candidate),s=putInSocialClass(l,'왕실 종친');
 l.gender='남자';l.age=26;l.year=1676;l.pending=null;J.ensure(l).active=null;
 V5.prepare(l,s);
 const q=l.getChoice();
 assert.ok(q&&q.options.some(x=>x.action==='throne'));
 assert.equal(s.role,'','royal descent alone is not the kingship');
 assert.equal(l.choose(q.options.findIndex(x=>x.action==='throne')),true);
 assert.equal(V5.summary(l).role,'왕');
});
test('local events include tribute, corvee, military service, corruption and coastal/border news',()=>{
 const counts={};
 for(const year of [1400,1530,1700,1800]){
  for(let seed=1;seed<=85;seed++){
   const l=progress(born(year,year*83+seed),year+62,seed%3);
   for(const d of V5.ensure(l).decisions)counts[d.type]=(counts[d.type]||0)+1;
  }
 }
 for(const type of ['living','military','tribute','labor','corruption','raid'])
  assert.ok(counts[type]>0,type+' absent from simulated lives');
});
test('post-reform people are legally free although ancestry and unfair treatment remain visible',()=>{
 const l=born(1897,21),s=V5.ensure(l);
 assert.equal(s.legal,'법적 신분 구별 폐지');
 const f=born(1870,25);putInSocialClass(f,'사노비');f.age=24;f.year=1894;
 V5.prepare(f,V5.ensure(f));
 assert.equal(V5.summary(f).legal,'법적 신분 구별 폐지');
 assert.ok(V5.ensure(f).freed);
});
test('long lives and save files preserve full social identity and pending choices',()=>{
 let count=0,events=0;
 for(const year of [1392,1500,1590,1670,1800,1870,1890,1897,1900,1919]){
  for(let seed=1;seed<=45;seed++){
   const l=progress(born(year,year*17+seed*137),year+95,seed%3);
   const saved=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.equal(saved.pending,l.pending);
   if(J.isJoseon(l)){
    assert.deepEqual(V5.summary(saved),V5.summary(l));
    events+=V5.ensure(l).decisions.length;
    assert.ok(V5.ensure(l).queue.length<=7);
   }else assert.equal(V5.summary(l),null);
   count++;
  }
 }
 assert.equal(count,450);assert.ok(events>=400);
});
test('player-facing story and scripts include the expanded social layer',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-v4.js')<html.indexOf('joseon-v5.js'));
 assert.ok(html.indexOf('joseon-v5.js')<html.indexOf('game.js'));
 assert.match(game,/Joseon5\.summary/);
 assert.match(game,/joseon5-choice/);
 assert.match(game,/originLabel/);
});
