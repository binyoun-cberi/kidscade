'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const Colonial=require(path.join(root,'colonial-daily-v2.js'));
delete global.window;
const born=(birthYear,seed=2244,gender='여자')=>{
 const l=new Sim.Life(seed,{birthYear,countryName:'대한민국',birthSetup:{gender}});
 return l;
};
const at=(l,year)=>{l.age=year-l.birthYear;l.year=year;return l;};
test('twenty distinct colonial household scenes are dated, bounded, and offer three meaningful actions',()=>{
 assert.equal(Colonial.EVENTS.length,20);
 const ids=new Set();
 for(const e of Colonial.EVENTS){
  assert.ok(!ids.has(e.id),'duplicate '+e.id);ids.add(e.id);
  assert.ok(e.start>=1910&&e.end<=1945&&e.start<=e.end,'date '+e.id);
  assert.ok(Number.isInteger(e.age)&&e.age>=7,'age '+e.id);
  assert.ok(e.maxAge===undefined||e.maxAge>=e.age);
  assert.equal(e.options.length,3);
  for(const option of e.options)assert.ok(option.label&&option.result&&Object.keys(option.effect).length);
 }
 for(const id of ['landRegistry','riceExpansion','tenantPetition','students1929','languageSociety1942','laborNotices','draftNotice1944','liberationDay'])assert.ok(ids.has(id),id);
});
test('specific historical dates are offered even when the player age is not 1 modulo 4',()=>{
 for(const [year,bornYear,id] of [[1919,1900,'manse'],[1929,1910,'students1929'],[1945,1921,'liberationDay']]){
  const l=at(born(bornYear),year),s=Colonial.ensure(l);
  assert.notEqual(l.age%4,1);
  Colonial.yearly(l,s);
  assert.equal(s.active?.eventId,id,year);
  assert.equal(l.pending,'colonialDaily:'+s.active.id);
  const snapshot=l.snapshot(),copy=Sim.Life.restore(JSON.parse(JSON.stringify(snapshot)));
  assert.equal(copy.pending,l.pending);
  assert.equal(Colonial.ensure(copy).active?.eventId,id);
  const choice=copy.getChoice();assert.equal(choice.options.length,3);
  assert.equal(copy.choose(0),true);
  assert.ok(copy.log.some(x=>x.kind==='colonialDaily-choice'&&x.causeId));
  assert.equal(copy.pending,null);
 }
});
test('conscription notices are restricted by historical age and gender',()=>{
 const policy=Colonial.EVENTS.find(e=>e.id==='draftNotice1944');
 assert.equal(Colonial.eligible(at(born(1920,1,'남자'),1944),policy),true);
 assert.equal(Colonial.eligible(at(born(1920,2,'여자'),1944),policy),false);
 assert.equal(Colonial.eligible(at(born(1930,3,'남자'),1944),policy),false);
 assert.equal(Colonial.eligible(at(born(1890,4,'남자'),1944),policy),false);
});
test('never imply that historical events made every person a participant',()=>{
 for(const e of Colonial.EVENTS){
  if(['manse','students1929','liberationDay'].includes(e.id))
   assert.doesNotMatch(e.desc,/당신은.*참여했다|당신은.*독립운동가/);
 }
});
test('pre-1946 child milestone describes learning without assuming school enrolment',()=>{
 const l=born(1910,778);l.age=6;l.year=1916;
 const before=l.log.length;l.tick();
 const note=l.log.slice(before).find(x=>x.kind==='milestone');
 assert.ok(note);
 assert.match(note.text,/일곱 살/);
 assert.doesNotMatch(note.text,/학교와 친구들/);
});
test('colonial return to ordinary years does not spill beyond 1945 and historic sources are retained',()=>{
 const l=at(born(1920,907),1946);
 const s=Colonial.ensure(l);
 Colonial.yearly(l,s);
 assert.equal(s.queue.length,0);assert.equal(s.active,null);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/colonial-daily-v2\.js\?v=\d+/);
});
