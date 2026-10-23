'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
function household(grain,health=90,origin='농민 가구'){
 const l=new c.OneLifeSim.Life(173,{birthYear:1344,countryName:'대한민국',birthSetup:{gender:'여자',origin}}),g=c.OneLifeGoryeo343.ensure(l);
 l.year=1367;l.age=23;g.grain=grain;g.region='경상 내륙';g.seen=['child','vocation','marriage'];l.stats.health=health;if(grain===0){g.land=0;g.refuge=true;for(const p of g.people)p.plan='휴식';}l.tick();
 assert.match(l.pending,/household-/);return l;
}
test('household questions reflect scarcity, fatigue and bondage without spending on redraw',()=>{
 const poor=household(0),tired=household(100,35),bound=household(100,90,'노비 가구');
 assert.match(poor.getChoice().title,/곡식/);assert.match(tired.getChoice().title,/지친 몸/);assert.match(bound.getChoice().title,/맡은 일/);
 for(const l of [poor,tired,bound]){
  const before=JSON.stringify(l.snapshot()),q=l.getChoice();assert.ok(q.options.every(o=>o.note));assert.match(q.description,/남은 곡식은/);
  assert.equal(JSON.stringify(l.snapshot()),before);
  const restored=c.OneLifeSim.Life.restore(JSON.parse(before));assert.equal(JSON.stringify(restored.getChoice()),JSON.stringify(q));
 }
});
test('the stated grain cost and rest effect match the actual household results',()=>{
 const l=household(100),before=l.goryeo343.grain;l.choose(0);assert.equal(l.goryeo343.grain,before-3);
 const rest=household(100,35),grain=rest.goryeo343.grain,health=rest.stats.health;
 // Cotton trial replaces rest here, so remove its region requirement for this save.
 rest.goryeo343.region='충청 내륙';
 const saved=rest.snapshot();const r=c.OneLifeSim.Life.restore(saved),q=r.getChoice();
 assert.equal(q.options[3].effect,'rest');r.choose(3);assert.equal(r.goryeo343.grain,grain);assert.equal(r.stats.health,health+4);
});
