'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const BASE=path.join(ROOT,'games/dalgona-trace');
const E=require(path.join(BASE,'trace.js'));
const HTML=fs.readFileSync(path.join(BASE,'index.html'),'utf8');
const UI=fs.readFileSync(path.join(BASE,'game.js'),'utf8');

function simulate(stage,interval=18){
  const trace=E.buildTrace(stage);
  let state=E.begin(trace,E.createState(trace),trace.path[0],1000).state;
  for(let i=1;i<trace.path.length;i++){
    state=E.move(trace,state,trace.path[i],1000+i*interval);
    if(state.failed||state.complete)break;
  }
  return {trace,state};
}

test('six real closed shapes have finite, non-degenerate contiguous outlines',()=>{
  assert.deepEqual(E.SHAPES.map(x=>x.id),['circle','triangle','star','heart','flower','umbrella']);
  for(let stage=1;stage<=24;stage++){
    const t=E.buildTrace(stage);
    assert.ok(t.path.length>180, t.shape+' too short');
    assert.ok(t.total>500,t.shape+' too small');
    const first=t.path[0],end=t.path.at(-1);
    assert.ok(Math.hypot(first.x-end.x,first.y-end.y)<.00001,t.shape+' not closed');
    for(let i=1;i<t.path.length;i++){
      const prev=t.path[i-1],p=t.path[i],dist=Math.hypot(p.x-prev.x,p.y-prev.y);
      assert.ok(dist>0&&dist<3.1,stage+' discontinuity at '+i+': '+dist);
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    }
  }
});

test('controlled continuous tracing clears all six outlines and later cycles',()=>{
  for(let stage=1;stage<=18;stage++){
    const {trace,state}=simulate(stage);
    assert.equal(state.failed,false,trace.shape+' should not fail');
    assert.equal(state.complete,true,trace.shape+' should clear');
    assert.ok(E.grade(trace,state).score>=85);
  }
});

test('crossing the speed ceiling breaks a perfectly followed line',()=>{
  const {state}=simulate(1,1);
  assert.equal(state.failed,true);
  assert.match(state.reason,/금이 가서/);
  assert.ok(state.progress<760);
});

test('consistently too slow fails even while tracing on the outline',()=>{
  const {state}=simulate(1,400);
  assert.equal(state.failed,true);
  assert.match(state.reason,/천천히/);
});

test('wiggling on the same spot cannot avoid hardening',()=>{
  const t=E.buildTrace(1);
  let s=E.begin(t,E.createState(t),t.path[0],1000).state;
  for(let i=1;i<130&&!s.failed;i++)s=E.move(t,s,t.path[i%2],1000+i*100);
  assert.equal(s.failed,true);
  assert.ok(s.progress<10);
});

test('off-outline movements break the cookie without moving progress to a distant segment',()=>{
  const t=E.buildTrace(3);
  let s=E.begin(t,E.createState(t),t.path[0],1000).state;
  const distant=t.path[Math.floor(t.path.length*.65)];
  s=E.move(t,s,distant,1060);
  assert.ok(s.progress<20,'must not skip to a remote part of the silhouette');
  assert.ok(s.crack>0);
  for(let i=2;i<8&&!s.failed;i++)s=E.move(t,s,{x:12+i*5,y:14},1000+i*60);
  assert.ok(s.failed,'repeated deviation should break the cookie');
});

test('release has a crack cost, regrab starts near the traced tip and time never resets',()=>{
  const t=E.buildTrace(2);
  let s=E.begin(t,E.createState(t),t.path[0],1000).state;
  for(let i=1;i<18;i++)s=E.move(t,s,t.path[i],1000+i*19);
  s=E.release(t,s,1340);
  assert.equal(s.active,false);
  assert.equal(s.releases,1);
  assert.ok(s.crack>=7);
  const invalid=E.begin(t,s,t.path[90],1400);
  assert.equal(invalid.accepted,false);
  const tip=E.sampleAt(t,s.progress);
  const valid=E.begin(t,s,tip,1400);
  assert.equal(valid.accepted,true);
  assert.equal(valid.state.startedAt,1000);
  assert.equal(E.tick(t,valid.state,1000+t.timeLimitMs).failed,true);
});

test('layout and shared game SDK bind actual pointer handlers and HUD',()=>{
  assert.match(HTML,/data-game-id="dalgona_trace"/);
  assert.match(HTML,/\.\/trace\.js\?v=1/);
  assert.match(HTML,/\.\/game\.js\?v=1/);
  assert.match(HTML,/coin-gold\.png/);
  assert.match(UI,/addEventListener\('pointerdown',pointerDown\)/);
  assert.match(UI,/addEventListener\('pointermove',pointerMove\)/);
  assert.match(UI,/addEventListener\('pointercancel',pointerUp\)/);
  assert.match(UI,/engine\.move\(/);
  assert.match(UI,/engine\.tick\(/);
  assert.match(UI,/KidscadeGame/);
  assert.doesNotThrow(()=>new Function(UI));
  for(const p of ['assets/game/2d/platformer-art/base/items/coin-gold.png',
    'assets/audio/ui/kenney_interface/tick_001.ogg',
    'assets/audio/ui/kenney_interface/error_002.ogg',
    'assets/audio/ui/kenney_interface/confirmation_003.ogg']) {
    assert.ok(fs.existsSync(path.join(ROOT,p)),p);
  }
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data/games.json'),'utf8'));
  const game=catalog.games.find(x=>x.id==='dalgona_trace');
  assert.equal(game.href,'games/dalgona-trace/index.html');
  assert.equal(game.genre,'puzzle');
});
