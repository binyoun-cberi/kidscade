'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const L=c.OneLifeSim.Life,C=c.OneLifeCollaboration341,D=c.OneLifeDiaspora340,T=c.OneLifeTravel22,copy=x=>JSON.parse(JSON.stringify(x));
function life(year=1939,gender='남자',seed=42){const l=new L(seed,{birthYear:year-30,countryName:'대한민국',birthSetup:{gender}});c.OneLifeWorld9.ensure(l);l.year=year;l.age=30;l.alive=true;l.pending=null;l.money.netWorth=1500;l.stats.health=85;return l;}
function offer(l,key){assert.equal(C.open(l,'offer',key),true);assert.ok(l.getChoice());}
function step(l,type,key,index){assert.equal(C.open(l,type,key),true);assert.equal(l.choose(index),true);}
test('collaboration routes are dated, grounded in capacity, and unavailable abroad or in an independence organization',()=>{
 const l=life(1909);l.world.educationYears=4;assert.equal(C.eligible(l,'clerk'),false);l.year=1910;l.age++;assert.equal(C.eligible(l,'clerk'),true);assert.equal(C.eligible(l,'police'),false);l.world.educationYears=0;l.year=1919;l.age+=9;assert.equal(C.eligible(l,'clerk'),false);assert.equal(C.eligible(l,'police'),true);assert.equal(C.eligible(l,'supplier'),false);
 l.year=1938;l.age+=19;l.career='가게 운영';assert.equal(C.eligible(l,'supplier'),true);
 const independence=life(1935,'여자');assert.equal(D.open(independence,'orgInvite','domestic'),true);independence.choose(0);assert.equal(C.eligible(independence,'police'),false);
 const abroad=life(1939);assert.equal(D.depart(abroad,'china'),true);assert.equal(C.eligible(abroad,'police'),false);assert.equal(T.ensure(abroad).residence.abroad,true);
});
test('joining an occupation is distinct from harming a neighbor; refusal and withdrawal retain records',()=>{
 const l=life();offer(l,'police');l.choose(0);let s=C.ensure(l);assert.equal(s.role.status,'active');assert.equal(s.acts.length,0);assert.equal(D.orgEligible(l,'domestic'),false);
 step(l,'practice','police',0);assert.equal(s.role.status,'ceased');assert.equal(s.role.harm,0);assert.equal(s.acts.length,0);
 l.year=1945;l.age+=6;step(l,'reckoning','police',2);assert.equal(s.liberation,true);assert.equal(s.inquiry,'none');assert.equal(l.log.some(e=>/처벌받았다/.test(e.text)),false);
 const declined=life(1938);offer(declined,'police');declined.choose(1);assert.equal(C.ensure(declined).role,null);assert.equal(C.ensure(declined).acts.length,0);
});
test('documented harmful acts change material benefit and family ties without inventing family or victims',()=>{
 const l=life(1938,'여자');l.career='가게 운영';offer(l,'supplier');l.choose(0);const cash=l.money.netWorth;step(l,'practice','supplier',1);assert.equal(C.ensure(l).acts.length,1);assert.equal(l.money.netWorth,cash+100);
 const family=l.world9.people.find(p=>p.role==='어머니');family.alive=true;family.birthYear=1885;const relation=family.relation;l.year=1945;l.age+=7;step(l,'reckoning','supplier',0);
 assert.equal(C.ensure(l).role.status,'ended');assert.equal(C.ensure(l).restitution,200);assert.equal(l.money.netWorth,cash-100);assert.equal(family.relation,relation-2);assert.ok(C.ensure(l).history.some(h=>h.source===C.SOURCE.law));
});
test('legal inquiry is no earlier than 1948, not automatic conviction and not triggered for merely holding a job',()=>{
 const l=life(1942);offer(l,'police');l.choose(0);step(l,'practice','police',1);l.year=1943;l.age++;step(l,'practice','police',1);
 l.year=1945;l.age+=2;step(l,'reckoning','police',1);assert.equal(C.ensure(l).acts.length,2);
 C.year(l,true);assert.equal(C.ensure(l).active,null);l.year=1947;l.age+=2;C.year(l);assert.equal(C.ensure(l).active,null);
 l.year=1948;l.age++;assert.equal(C.open(l,'inquiry','police'),true);let restored=L.restore(copy(l.snapshot()));assert.deepEqual(copy(restored.getChoice()),copy(l.getChoice()));restored.choose(0);assert.equal(C.ensure(restored).inquiry,'testified');assert.equal(restored.log.some(e=>/유죄|감옥에 갇/.test(e.text)),false);
 restored.year=1949;restored.age++;C.year(restored);assert.equal(C.ensure(restored).inquiryFollowed,true);assert.ok(restored.log.some(e=>e.kind==='joseon341-followup'&&e.causeId==='joseon341:1948-inquiry'));const length=restored.log.length;C.year(restored,true);assert.equal(restored.log.length,length);
 const harmless=life(1943);harmless.world.educationYears=4;offer(harmless,'clerk');harmless.choose(0);harmless.year=1945;harmless.age+=2;step(harmless,'reckoning','clerk',2);harmless.year=1948;harmless.age+=3;C.year(harmless);assert.equal(C.ensure(harmless).active,null);
});
test('invalid choices are atomic; pending inquiry and acts survive JSON restore; forged path is rejected',()=>{
 let l=life(1939);offer(l,'police');let before=copy(l.snapshot());assert.equal(l.choose(4),false);assert.deepEqual(copy(l.snapshot()),before);l=L.restore(copy(l.snapshot()));assert.equal(l.getChoice().title,C.PATH.police.name+' 제안');l.choose(0);step(l,'practice','police',1);
 const saved=copy(l.snapshot());const restored=L.restore(saved);assert.deepEqual(copy(C.ensure(restored)),copy(C.ensure(l)));assert.equal(restored.log.at(-1).causeId,l.log.at(-1).causeId);
 saved.collaboration341.role.started=1900;const bad=L.restore(saved);assert.equal(C.ensure(bad).role,null);assert.equal(C.ensure(bad).active,null);
});
