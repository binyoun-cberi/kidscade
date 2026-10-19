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

test('Progress persistence is resilient when storage is unavailable',()=>{
  const initial=S.load();
  assert.equal(initial.gold,0);
  const after=S.reward(initial,'sword',65);
  assert.equal(after.gold,65);
  assert.equal(after.crafted,1);
  assert.equal(after.collection.sword,1);
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
