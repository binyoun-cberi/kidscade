'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const L=c.OneLifeSim.Life,J=c.OneLifeJoseon,H=c.OneLifeHousehold342,copy=x=>JSON.parse(JSON.stringify(x));
function life(year){const l=new L(173,{birthYear:year-30,countryName:'대한민국',birthSetup:{gender:'여자',origin:'상민'}});c.OneLifeWorld8.ensure(l);l.year=year;l.age=30;l.pending=null;l.alive=true;J.ensure(l);c.OneLifeJoseon19.ensure(l);return l;}
for(const [num,year,key] of [[14,1600,'homeWork'],[18,1800,'landExtra'],[19,1800,null]])test('v'+num+' restores its validated open choice and applies it exactly once',()=>{
 const api=c['OneLifeJoseon'+num],l=life(year),s=api.ensure(l),events=api.EVENTS||api.EPISODES,event=key?events.find(e=>e.id===key):events[0];assert.ok(event);
 s.active={id:event.id,eventId:event.id,year};l.pending='joseon'+num+':'+event.id;const prompt=copy(l.getChoice());assert.ok(prompt);
 const d=copy(l.snapshot()),r=L.restore(d);assert.equal(r.pending,l.pending);assert.deepEqual(copy(r.getChoice()),prompt);assert.equal(r.choose(0),true);assert.notEqual(r.pending,l.pending);
 const invalid=copy(d);invalid['joseon'+num].active.eventId='unknown-event';const rejected=L.restore(invalid);assert.notEqual(rejected.pending,l.pending);
});
test('post-1900 restore retains the entire household record including empty crop state',()=>{
 let l=life(1890);J.ensure(l).capital=40;H.action(l,'kin');l.year=1900;l.age=l.year-l.birthYear;H.settle(l);const state=copy(H.ensure(l));l=L.restore(copy(l.snapshot()));assert.deepEqual(copy(H.ensure(l)),state);assert.equal(H.action(l,'crop','cotton'),false);
});

test('war-choice capture enters actual foreign captivity even for an elderly protagonist',()=>{
 const l=new L(2847922975,{birthYear:1525,countryName:'대한민국',birthSetup:{gender:'남자'}});c.OneLifeWorld8.ensure(l);l.year=1597;l.age=72;l.alive=true;l.pending=null;J.ensure(l).region='경상도';const j=J.ensure(l);j.active={kind:'war',id:'1597-war',title:'정유재란'};l.pending='joseon:1597-war';assert.equal(l.choose(0),true);
 assert.equal(c.OneLifeJoseon14.ensure(l).captivity?.status,'held');assert.equal(c.OneLifeTravel22.summary(l).residence.abroad,true);assert.equal(H.canManage(l),false);assert.ok(!l.pending||String(l.pending).startsWith('joseon14:'));assert.equal(j.followups.some(f=>/고향으로 돌아올 길을 찾았다/.test(f.text)),false);
 const restored=L.restore(copy(l.snapshot()));assert.equal(restored.joseon14.captivity.status,'held');assert.equal(H.assign(restored,'self','farm'),false);
});
