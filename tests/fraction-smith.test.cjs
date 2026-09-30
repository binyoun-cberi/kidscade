'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const E=require(path.join(root,'games','high_fraction_smith','fraction-engine.js'));
const P=require(path.join(root,'games','high_fraction_smith','puzzle-generator.js'));

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
