'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const E=require(path.join(root,'games','high_fraction_smith','fraction-engine.js'));
const P=require(path.join(root,'games','high_fraction_smith','puzzle-generator.js'));
const O=require(path.join(root,'games','high_fraction_smith','order-generator.js'));
const F=require(path.join(root,'games','high_fraction_smith','forge-minigame.js'));
const S=require(path.join(root,'games','high_fraction_smith','progress-store.js'));

test('Fraction Smith keeps decimal arithmetic exact',()=>{
  assert.deepEqual(E.parse('0.75'),{n:3,d:4});
  assert.deepEqual(E.add('1/2','1/4'),{n:3,d:4});
  assert.equal(E.eq('3/4','0.75'),true);
  assert.deepEqual(E.div('1','4'),{n:1,d:4});
  assert.equal(E.toDecimal('1/8'),'0.125');
});

test('Fraction Smith generated orders are solvable and have a shortest-strike record',()=>{
  for(const mode of ['practice','rush','master']){
    for(let i=0;i<12;i++){
      const q=P.create(mode);
      assert.ok(q.materials.length>=4);
      assert.ok(q.bestStrikes>=1&&q.bestStrikes<=4);
      assert.equal(P.shortestStrikes(q.materials.map(x=>x.value),q.target,4),q.bestStrikes);
    }
  }
});

test('Master orders really require three operations even with extra materials',()=>{
  for(let i=0;i<100;i++){
    const q=P.create('master');
    assert.equal(q.bestStrikes,3);
    assert.equal(q.recipe.length,3);
    assert.equal(P.shortRouteExists(q.materials.map(m=>m.value),q.target),false);
  }
  const worst=P.create('master',()=>0);
  assert.equal(worst.bestStrikes,3);
  assert.equal(P.shortRouteExists(worst.materials.map(m=>m.value),worst.target),false);
  assert.ok(E.nice(worst.target,{maxAbs:8,maxDen:40}));
  assert.equal(worst.materials.length,7);
});

test('Commission descriptions tie the math goal to an item and a customer',()=>{
  for(let i=0;i<4;i++){
    const order=O.create(i);
    assert.ok(order.customer.name);
    assert.ok(order.item.material);
    assert.ok(order.item.request);
    assert.ok(order.item.icon);
  }
  assert.equal(O.create(0).item.id,'sword');
  assert.equal(O.create(1).item.id,'axe');
  assert.equal(O.create(2).item.id,'shield');
});

test('New commissions and customers unlock at their intended milestones',()=>{
  assert.equal(O.ITEMS.length,8);
  assert.equal(O.CUSTOMERS.length,8);
  assert.equal(O.unlockedItems(0).length,3);
  assert.equal(O.unlockedItems(2).length,4);
  assert.equal(O.unlockedItems(4).length,5);
  assert.equal(O.unlockedItems(12).length,8);
  assert.equal(O.create(2,'practice',2).item.id,'spear');
  assert.equal(O.create(4,'practice',4).item.id,'helmet');
  assert.equal(O.create(12,'practice',12).item.id,'crown');
  assert.equal(O.create(0,'master',3).item.id,'shield');
  assert.equal(O.create(1,'master',3).item.id,'spear');
  assert.ok(O.ITEMS.every(item=>O.CUSTOMERS[item.customer]?.name));
});

test('Crafting needs four bellows pumps, three hammer strikes and a quench',()=>{
  const session=F.create();
  for(let i=0;i<4;i++)F.act(session);
  assert.equal(session.stage,'hammer');
  for(let i=0;i<3;i++)F.act(session,.75);
  assert.equal(session.stage,'quench');
  F.act(session);
  assert.equal(session.done,true);
  assert.equal(session.quality,100);
  F.act(session);
  assert.equal(session.quality,100);
  const novice=F.create();
  for(let i=0;i<4;i++)F.act(novice);
  for(let i=0;i<3;i++)F.act(novice,0);
  F.act(novice);
  assert.ok(novice.quality<100&&novice.quality>=60);
});

test('Furnace upgrades reduce the pumps, while hammer upgrades widen the accuracy window',()=>{
  const levelOne=F.create({furnaceLevel:1,hammerLevel:1});
  for(let i=0;i<2;i++)F.act(levelOne);
  assert.equal(levelOne.stage,'heat');
  F.act(levelOne);
  assert.equal(levelOne.stage,'hammer');
  const basic=F.create(),improved=F.create({hammerLevel:2,furnaceLevel:2});
  assert.equal(improved.requiredPumps,2);
  for(let i=0;i<4;i++)F.act(basic);
  for(let i=0;i<2;i++)F.act(improved);
  for(let i=0;i<3;i++){F.act(basic,.5);F.act(improved,.5)}
  F.act(basic);F.act(improved);
  assert.ok(improved.quality>basic.quality);
  assert.equal(F.create({furnaceLevel:99,hammerLevel:99}).requiredPumps,2);
  assert.equal(F.create({furnaceLevel:-1,hammerLevel:-1}).requiredPumps,4);
});

test('Progress persistence is resilient when storage is unavailable',()=>{
  const initial=S.load();
  assert.equal(initial.gold,0);
  const after=S.reward(initial,'sword',65);
  assert.equal(after.gold,65);
  assert.equal(after.crafted,1);
  assert.equal(after.collection.sword,1);
});

test('Progress migrates existing saves and purchases cannot overspend or exceed max level',()=>{
  const prior=globalThis.localStorage;
  const saved=new Map();
  globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
  try{
    saved.set(S.KEY,JSON.stringify({gold:500,crafted:5,collection:{sword:2,axe:1}}));
    const migrated=S.load();
    assert.equal(migrated.upgrades.furnace,0);
    assert.equal(migrated.collection.sword,2);
    assert.equal(migrated.collection.helmet,0);
    const first=S.purchase(migrated,'furnace');
    assert.equal(first.ok,true);assert.equal(first.cost,80);
    assert.equal(first.progress.gold,420);
    assert.equal(S.load().upgrades.furnace,1);
    const second=S.purchase(first.progress,'furnace');
    assert.equal(second.ok,true);
    assert.equal(second.progress.gold,240);
    const max=S.purchase(second.progress,'furnace');
    assert.equal(max.ok,false);assert.equal(max.reason,'max');
    assert.equal(max.progress.gold,240);
    const costly=S.purchase(second.progress,'counter');
    assert.equal(costly.ok,true);
    const insufficient=S.purchase(costly.progress,'counter');
    assert.equal(insufficient.ok,false);assert.equal(insufficient.reason,'gold');
    assert.equal(S.upgradeCost(costly.progress,'counter'),250);
    assert.equal(S.purchase(costly.progress,'nonexistent').ok,false);
  }finally{if(prior===undefined)delete globalThis.localStorage;else globalThis.localStorage=prior}
});

test('Fraction Smith uses Kidscade avatar, audio and particle assets',()=>{
  const dir=path.join(root,'games','high_fraction_smith');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
  const avatar=fs.readFileSync(path.join(dir,'fraction-smith-avatar.js'),'utf8');
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(avatar));
  assert.match(html,/fraction-smith-avatar\.js/);
  assert.match(avatar,/kidscade-avatar-studio-preview/);
  assert.match(avatar,/renderPreviewFrame/);
  assert.match(js,/impact-heavy-01\.mp3/);
  assert.match(js,/kenney-particle-pack\/spark-0/);
  assert.match(html,/id="craftModal"/);
  assert.match(html,/id="shopModal"/);
  assert.match(html,/id="restartBtn"/);
  assert.match(js,/function restartOrder/);
  assert.match(js,/function beginCraft/);
  assert.match(html,/forge-minigame\.js/);
});

test('Fraction Smith is registered in the game catalog',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(x=>x.id==='high_fraction_smith');
  assert.ok(game);
  assert.equal(game.subject,'math');
  assert.equal(game.genre,'puzzle');
  assert.ok(game.input.includes('touch'));
});

test('Fraction Smith forge scene has immersive workshop layers and strike lighting',()=>{
  const dir=path.join(root,'games','high_fraction_smith');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
  const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
  assert.match(html,/class="furnace"/);
  assert.match(html,/class="anvil-stump"/);
  assert.match(html,/class="wall-rack"/);
  assert.match(css,/\.forge-wall/);
  assert.match(css,/body\[data-heat="5"\] \.furnace-mouth/);
  assert.match(js,/classList\.add\('forge-hit'\)/);
});
