'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const root=path.join(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(p,key)=>{const m=require(path.join(root,p));if(key)global.window[key]=m;return m;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');
load('joseon-v2.js','OneLifeJoseon2');load('joseon-v3.js','OneLifeJoseon3');
load('joseon-v4.js','OneLifeJoseon4');const V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');
load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
const T=load('travel-v22.js','OneLifeTravel22');delete global.window;
const born=(y,seed=780)=>new Sim.Life(seed,{birthYear:y,countryName:'대한민국'});
const at=(l,year,region='함경도')=>{l.age=year-l.birthYear;l.year=year;l.pending=null;J.ensure(l).region=region;return l;};
function force(l,id,index=0){
 const e=V14.EPISODES.find(x=>x.id===id);assert.ok(e,id);
 const s=V14.ensure(l);s.active={id:l.year+'-'+id,eventId:id,year:l.year};l.pending='joseon14:'+s.active.id;
 assert.equal(l.getChoice()?.options?.length,3);assert.equal(l.choose(index),true);return s;
}
test('four culturally specific captive episodes have safe three-way choices',()=>{
 const ids=['japanWorkshop','japanFamilyTies','manchuLanguage','manchuRansomNames'];
 for(const id of ids){const e=V14.EPISODES.find(q=>q.id===id);assert.ok(e,id);assert.equal(e.options.length,3);
  for(const o of e.options)assert.ok(o.label&&o.note&&o.after,id);}
 assert.equal(new Set(V14.EPISODES.map(e=>e.id)).size,V14.EPISODES.length);
});
test('a Japan captive can learn work and keep local ties without being assigned an arbitrary trade',()=>{
 const l=at(born(1573),1597,'경상도');assert.equal(V14.capture(l),true);
 const s=V14.ensure(l);s.captivity.work='도공의 가마 일';
 s.active={id:'1597-japanWorkshop',eventId:'japanWorkshop',year:1597};l.pending='joseon14:'+s.active.id;
 assert.match(l.getChoice().description,/가마와 흙/);
 assert.equal(l.choose(0),true);
 assert.ok(s.overseas.workplace>0);
 force(l,'japanFamilyTies',1);
 assert.ok(s.overseas.homeNews>0);
 assert.equal(s.captivity.status,'held');
 const saved=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(V14.summary(saved).overseas,V14.summary(l).overseas);
 assert.equal(V14.summary(saved).captivity.status,'held');
});
test('non-potter Japanese captive does not automatically work at a kiln',()=>{
 const l=at(born(1572),1597,'경상도');V14.capture(l);
 const s=V14.ensure(l);s.captivity.work='농삿일';
 s.active={id:'1597-japanWorkshop',eventId:'japanWorkshop',year:1597};l.pending='joseon14:'+s.active.id;
 assert.doesNotMatch(l.getChoice().description,/가마와 흙/);
 assert.equal(l.choose(1),true);
 assert.ok(s.overseas.localTies>0&&s.overseas.language>0);
});
test('Later Jin/Qing language and repatriation stories preserve non-guaranteed homecoming',()=>{
 const l=at(born(1603),1637,'경기도');assert.equal(V14.capture(l),true);
 assert.equal(V14.summary(l).captivity.realm,'qing');
 const s=force(l,'manchuLanguage',0);assert.ok(s.overseas.language>0);
 force(l,'manchuRansomNames',0);assert.ok(s.overseas.homeNews>0);
 assert.equal(s.captivity.status,'held','asking a name is not an automatic ransom');
 const old=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(V14.summary(old).captivity.status,'held');
 assert.equal(V14.summary(old).overseas.language,s.overseas.language);
});
test('Jurchen border exchange is region/date/trade gated and returns after a choice',()=>{
 const l=at(born(1470,781),1500,'함경도');V5.ensure(l).origin='역관 가계';
 assert.equal(T.eligible(l,'jurchen'),true);
 assert.equal(T.eligible(l,'qingMarket'),false);
 assert.equal(T.offer(l,'jurchen'),true);
 assert.match(l.getChoice().title,/변경/);
 assert.equal(l.choose(0),true);
 assert.equal(T.summary(l).residence.route,'jurchen');
 assert.equal(l.pending,'travel22:border-1500');
 assert.equal(l.getChoice().options.length,3);
 const before=J.ensure(l).capital;
 assert.equal(l.choose(1),true);
 assert.equal(l.tick(),true);
 assert.equal(J.ensure(l).capital,before,'no domestic harvest in border trip');
 assert.equal(T.summary(l).residence.abroad,false);
 assert.deepEqual(T.summary(l).movements.map(m=>m.action),['출발','귀환']);
});
test('Qing book-gate exchange in late 17th century is NOT a prisoner journey',()=>{
 const l=at(born(1640,782),1670,'평안도');V5.ensure(l).origin='역관 가계';
 assert.equal(T.eligible(l,'qingMarket'),true);
 assert.equal(T.offer(l,'qingMarket'),true);
 assert.equal(l.choose(0),true);
 const abroad=T.summary(l);
 assert.equal(abroad.residence.region,'청의 요동');
 assert.equal(abroad.residence.reason,'책문 사행·교역 동행');
 assert.notEqual(l.joseon14?.captivity?.status,'held');
 const saved=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(saved.pending,l.pending);
 assert.equal(saved.getChoice().options.length,3);
 assert.equal(saved.choose(0),true);
 assert.equal(saved.tick(),true);
 assert.equal(T.summary(saved).residence.abroad,false);
 assert.equal(T.eligible(at(born(1640,783),1701,'평안도'),'qingMarket'),false);
});
test('historical coastal/border routes do not open for unrelated provinces or statuses',()=>{
 const l=at(born(1470,789),1500,'전라도');V5.ensure(l).origin='역관 가계';
 assert.equal(T.eligible(l,'jurchen'),false);
 at(l,1500,'함경도');V5.ensure(l).origin='사노비';V5.ensure(l).freed=false;
 assert.equal(T.eligible(l,'jurchen'),false);
 const c=at(born(1640,790),1670,'함경도');V5.ensure(c).origin='역관 가계';
 assert.equal(T.eligible(c,'qingMarket'),false);
});
test('existing Ming and Hawaiian routes remain available on the same engine',()=>{
 const m=at(born(1420),1450,'평안도');J.ensure(m).literacy=4;V5.ensure(m).origin='역관 가계';
 assert.equal(T.eligible(m,'ming'),true);
 const h=at(born(1880),1903,'경기도');
 assert.equal(T.eligible(h,'hawaii'),true);
});
test('all new story and residence scripts remain wired after cache update',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/joseon-v14-captivity-generations\.js\?v=7/);
 assert.match(html,/travel-v22\.js\?v=\d+/);
 assert.match(html,/game\.js\?v=\d+/);
 const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(game.includes('journey.captivityTies'));
});
