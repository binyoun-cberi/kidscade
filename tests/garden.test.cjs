const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../garden.js');

test('legacy ownership and furniture migrate once, including collected fish', () => {
  const legacy={unlockedPets:['fish','dog','cat','unknown'],fishTank:{fish:['guppy','betta']},hamsterRoom:{wheels:2,toys:3},rooms:{cat:{towers:1}}};
  const before=JSON.stringify(legacy),s=g.normalize(null,legacy);
  assert.ok(s.owned.includes('dog')&&s.owned.includes('cat')&&s.owned.includes('betta'));
  assert.ok(!s.owned.includes('unknown'));
  assert.equal(s.stock.wheel,2);assert.equal(s.stock.ball,3);
  s.stock.wheel=0;
  assert.deepEqual(g.normalize(s,legacy),s);
  assert.equal(JSON.stringify(legacy),before);
});
test('30-second boundary, category goals, and repeat sessions do not duplicate animals', () => {
  const s=g.normalize(null),payload={game:'math-a',category:'math',date:'2026-09-11'};
  assert.deepEqual(g.recordSession(s,{...payload,seconds:29}),[]);
  assert.equal(s.games.length,0);
  g.recordSession(s,{...payload,seconds:150});
  assert.ok(!s.owned.includes('dog'));
  assert.deepEqual(g.recordSession(s,{...payload,seconds:30}),['dog']);
  g.recordSession(s,{...payload,seconds:180});
  assert.equal(s.owned.filter(x=>x==='dog').length,1);
  assert.equal(s.games.length,1);assert.equal(s.days.length,1);
  assert.equal(s.seconds.korean,0);
});
test('exploration goals require different games and different calendar days', () => {
  const s=g.normalize(null);
  for(let i=0;i<5;i++)g.recordSession(s,{game:'g'+i,category:'music',seconds:30,date:`2026-09-${11+i}`});
  assert.ok(s.owned.includes('cat'));assert.ok(s.owned.includes('sugarGlider'));
  assert.ok(!s.owned.includes('betta'));assert.ok(!s.owned.includes('platy'));
});
test('placement blocks overlap, off-board furniture and closed-off paths', () => {
  const s=g.normalize(null);
  assert.equal(g.canPlace(s.placed,'ball',2,1),false);
  assert.equal(g.canPlace(s.placed,'bed',11,7),false);
  assert.equal(g.canPlace(s.placed,'bed',-1,0),false);
  assert.equal(g.canPlace(s.placed,'bed',8,6,'bed'),true);
  const wall=Array.from({length:7},(_,y)=>({id:String(y),kind:'water',x:5,y}));
  assert.equal(g.reachablePlacement(wall,'water',5,7),false);
  assert.equal(g.reachablePlacement(s.placed,'ball',1,4),true);
});
test('paths detour around facilities and never cross their footprint', () => {
  const items=[{id:'a',kind:'bed',x:2,y:2}],p=g.route(items,{x:1.5,y:2.5},{x:5.5,y:2.5});
  assert.ok(p.length>4);
  assert.ok(p.every(c=>!(c.x>=2&&c.x<4&&c.y>=2&&c.y<3)));
  assert.deepEqual(g.route(items,{x:1,y:2},{x:2,y:2}),[]);
});
test('invalid saved placements and counts are repaired without changing valid ownership', () => {
  const s=g.normalize({version:1,owned:['cat'],placed:[{id:'bad',kind:'water',x:NaN,y:2}],seconds:{math:-5},stock:{ball:Infinity}});
  assert.deepEqual(s.owned,['cat']);assert.equal(s.seconds.math,0);assert.equal(s.stock.ball,0);
  assert.ok(s.placed.some(p=>p.kind==='pond'));
});
