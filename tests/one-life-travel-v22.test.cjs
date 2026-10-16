'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,key)=>{const m=require(path.join(root,file));if(key)global.window[key]=m;return m;};
load('world-v2.js','OneLifeWorld2');
load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');
load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');
load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');
const History=load('history.js','OneLifeHistory');
const Colonial=load('colonial-daily-v2.js','OneLifeColonialDaily');
const Travel=load('travel-v22.js','OneLifeTravel22');
delete global.window;
const born=(year,seed=115,{gender='남자',origin='상민'}={})=>
 new Sim.Life(seed,{birthYear:year,countryName:'대한민국',birthSetup:{gender,origin}});
const at=(l,year)=>{l.year=year;l.age=year-l.birthYear;return l;};
test('Ming missions require an adult connected to learning or official service and valid years',()=>{
 const young=born(1445);at(young,1450);J.ensure(young).literacy=3;
 assert.equal(Travel.eligible(young,'ming'),false);
 const env=at(born(1419,111,{origin:'중인'}),1450);J.ensure(env).literacy=3;
 assert.equal(Travel.eligible(env,'ming'),true);
 assert.equal(Travel.eligible(env,'hawaii'),false);
 assert.equal(Travel.eligible(at(env,1600),'ming'),false);
 assert.equal(Travel.eligible(at(env,1450),'ming'),true);
});
test('Ming envoy spends time abroad without running home-village year, then returns',()=>{
 const l=at(born(1420,111,{origin:'중인'}),1450);
 const j=J.ensure(l);j.literacy=4;V5.ensure(l);
 assert.equal(Travel.offer(l,'ming'),true);
 assert.equal(l.getChoice().options.length,3);
 assert.equal(l.choose(0),true);
 let s=Travel.summary(l);
 assert.equal(s.residence.region,'명나라');assert.equal(s.residence.reason,'사행·수행');
 assert.equal(l.country[0],'대한민국','birth country must never become the host country');
 const capital=j.capital,birthplace=s.birthplace;
 assert.equal(l.tick(),true); // year 1451: overseas
 assert.equal(l.year,1451);assert.equal(j.capital,capital,'Joseon domestic economy must be bypassed');
 assert.equal(l.pending,'travel22:year-1451');
 const data=JSON.parse(JSON.stringify(l.snapshot()));
 const copy=Sim.Life.restore(data);
 assert.ok(copy);
 assert.equal(copy.pending,'travel22:year-1451');
 assert.equal(copy.getChoice().options.length,3);
 assert.equal(copy.choose(1),true);
 assert.equal(copy.tick(),true); // 1452: mission ends
 const end=Travel.summary(copy);
 assert.equal(end.residence.abroad,false);
 assert.equal(end.birthplace,birthplace);
 assert.ok(end.movements.some(x=>x.action==='출발'));
 assert.ok(end.movements.some(x=>x.action==='귀환'));
});
test('Hawaii migration is 1903–1905 and recorded as contracted work, not deportation',()=>{
 const l=at(born(1879,506),1903);assert.ok(Travel.eligible(l,'hawaii'));
 assert.equal(Travel.offer(l,'hawaii'),true);
 const prompt=l.getChoice();
 assert.match(prompt.title,/하와이/);
 assert.ok(l.choose(0));
 assert.equal(Travel.summary(l).residence.reason,'모집 노동 이주');
 assert.equal(Travel.summary(l).residence.since,1903);
 const old=JSON.parse(JSON.stringify(l.snapshot()));
 const copy=Sim.Life.restore(old);
 assert.equal(copy.travel22.residence.abroad,true);
 assert.equal(Travel.eligible(copy,'ming'),false);
 assert.equal(Travel.eligible(at(born(1879,507),1906),'hawaii'),false);
});
test('Hawaii years do not run local Joseon taxation or colony activity; family letters persist',()=>{
 const l=at(born(1879,143),1903);J.ensure(l);V5.ensure(l);
 assert.equal(Travel.offer(l,'hawaii'),true);assert.equal(l.choose(0),true);
 const before=l.joseon?.capital;
 assert.equal(l.tick(),true);assert.equal(l.year,1904);
 assert.equal(l.joseon.capital,before);
 assert.equal(l.pending,'travel22:year-1904');
 assert.equal(l.choose(2),true); // no instant return on first year
 assert.equal(Travel.summary(l).residence.abroad,true);
 assert.equal(Travel.summary(l).letters,1);
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(Travel.summary(copy).letters,1);
 at(copy,1919);const homeNews=copy.log.filter(x=>x.kind==='history').length;
 assert.equal(History.contextualize(copy),false,'the 3.1 movement is not a compulsory personal local event abroad');
 assert.equal(copy.log.filter(x=>x.kind==='history').length,homeNews);
 assert.equal(Travel.summary(copy).residence.region,'하와이');
});
test('captive lives are observed through same travel panel without overwriting existing v14 plot',()=>{
 const l=at(born(1570),1593);const s=Travel.ensure(l);
 l.joseon14={captivity:{realm:'japan',from:1592,status:'held'}};
 const view=Travel.summary(l);
 assert.equal(view.residence.abroad,true);
 assert.equal(view.residence.reason,'전쟁 중 피랍·포로');
 assert.equal(s.residence.abroad,false,'captivity is still owned by the war module');
 l.joseon14.captivity.status='returned';
 assert.equal(Travel.summary(l).residence.abroad,false);
});
test('declined trip stays home, invalid foreign route and fabricated saved location are rejected',()=>{
 const l=at(born(1879),1903);
 assert.equal(Travel.offer(l,'ming'),false);
 assert.equal(Travel.offer(l,'hawaii'),true);
 assert.equal(l.choose(1),true);
 assert.equal(Travel.summary(l).residence.abroad,false);
 let snap=l.snapshot();
 snap.travel22.residence={abroad:true,route:'fantasy',since:1903};
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(snap)));
 assert.equal(Travel.summary(restored).residence.abroad,false);
 assert.equal(restored.pending,null);
});
test('overseas widget and script order are present in page',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 for(const id of ['travel22Panel','travel22Status','travel22Place','travel22Reason','travel22Memory','travel22Moves','travel22Source'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.indexOf('travel-v22.js')<html.indexOf('game.js'));
 assert.ok(game.includes('Travel22?.summary(life)'));
});
