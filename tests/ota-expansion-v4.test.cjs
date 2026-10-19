'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../games/high_ota_typographic_horror');
const EX=require('../games/high_ota_typographic_horror/expansion.js');
const AN=require('../games/high_ota_typographic_horror/anomalies.js');
const L=require('../games/high_ota_typographic_horror/literacy.js');
const C3=require('../games/high_ota_typographic_horror/chapter3.js');
const R=require('../games/high_ota_typographic_horror/rules.js');

test('weekly speedrun shares one KST-Monday course and changes the following week',()=>{
  const sunday=Date.parse('2026-10-18T14:59:00Z'); // 23:59 KST
  const monday=Date.parse('2026-10-18T15:01:00Z'); // 00:01 KST
  assert.equal(EX.weeklyCourse(sunday).week,'2026-10-12');
  assert.equal(EX.weeklyCourse(monday).week,'2026-10-19');
  assert.notEqual(EX.weeklyCourse(sunday).seed,EX.weeklyCourse(monday).seed);
  assert.deepEqual(EX.weeklyCourse(monday),EX.weeklyCourse(monday+86400000));
});
test('core spelling choices and reachable positions truly vary, but are replayable',()=>{
  const locations=new Set(),answers=new Set(),questionSets=new Set();
  for(let seed=1;seed<=120;seed++){
    const s=L.create(seed),s2=L.create(seed);
    assert.deepEqual(s.items,s2.items);
    const pos=s.items.map(i=>i.x+','+i.z).join('|');locations.add(pos);
    assert.equal(new Set(s.items.map(i=>i.x+','+i.z)).size,5);
    const q=L.question(s.items[0]),choices=L.shuffledChoices(q,seed,'core-0');
    assert.deepEqual(choices,L.shuffledChoices(q,seed,'core-0'));
    assert.deepEqual(choices.slice().sort(),q.choices.slice().sort());
    answers.add(choices.indexOf(q.correct));
    questionSets.add(s.items.map(i=>i.bankIndex).join(','));
  }
  assert.ok(locations.size>35,'different runs need many route combinations');
  assert.deepEqual([...answers].sort(),[0,1,2,3]);
  assert.ok(questionSets.size>80);
});
test('sentence rooms rotate required routes, authored stories, floor plans and tile order',()=>{
  const required=new Set(),pairs=new Set(),layouts=new Set();
  for(let seed=1;seed<=100;seed++){
    const run=EX.create(seed),again=EX.create(seed);
    assert.deepEqual(run,again);
    required.add(run.required);pairs.add(run.rooms.west+'/'+run.rooms.east);
    layouts.add(run.layouts.west+'/'+run.layouts.east);
    assert.notEqual(run.rooms.west,run.rooms.east);
    for(const side of run.order){
      const q=EX.sentence(run,side),tiles=EX.tiles(run,side);
      assert.equal(q.parts.length,5);
      assert.equal(tiles.length,5);
      assert.deepEqual(tiles.map(t=>t.value).sort(),q.parts.slice().sort());
    }
  }
  assert.deepEqual([...required].sort(),['east','west']);
  assert.ok(pairs.size>25);
  assert.ok(layouts.size>=7,'each room should actually change its internal route');
});
test('sentence correction opens a real inner door, but final gate requires the fragment',()=>{
  const run=EX.create(72),s=R.initialState();s.stage='explore';s.expansion=run;
  s.literacy={coreDone:5};
  const c=C3.ensure(s);c.records.office=true;c.records.archive=true;
  const side=run.required,spot=EX.WINGS[side];
  assert.equal(C3.canMove(s,spot.x,-55.75),true,'the back hall is reachable after the record');
  assert.equal(EX.passable(s,spot.x,-55.75),true);
  assert.equal(EX.interaction(run,{x:spot.x,z:spot.z}).type,'sentence',
    'crossing the rear door must allow sentence assembly');
  if(run.layouts[side]!=='open'){
    assert.equal(C3.canMove(s,spot.x,-62.1),false,'the internal detour is a solid wall');
    assert.equal(EX.passable(s,spot.x,-62.1),false);
    const bypass=spot.x+(run.layouts[side]==='left'?-4.5:4.5);
    assert.equal(C3.canMove(s,bypass,-62.1),true,'the side passage remains traversable');
  }else assert.equal(C3.canMove(s,spot.x,-62.1),true);
  assert.equal(C3.canMove(s,spot.x,-67.18),false,'the sentence door is solid before repair');
  assert.equal(C3.repairFinal(s,'기억',C3.FINAL_GATE),false);
  assert.equal(C3.interaction(s,C3.FINAL_GATE).type,'sentenceNeeded');
  const pieces=EX.sentence(run,side).parts;
  for(let i=pieces.length-1;i>=0;i--)assert.equal(EX.append(run,side,i),true);
  assert.equal(EX.submit(run,side).ok,false);
  assert.equal(run.attempts,1);
  EX.clear(run,side);
  for(let i=0;i<pieces.length;i++)assert.equal(EX.append(run,side,i),true);
  assert.equal(EX.submit(run,side).ok,true);
  assert.equal(C3.canMove(s,spot.x,-67.18),true);
  assert.equal(EX.interaction(run,{x:spot.x,z:-69}).type,'fragment');
  assert.equal(EX.collect(run,side),true);
  assert.equal(EX.complete(run),true);
  assert.equal(C3.interaction(s,C3.FINAL_GATE).type,'final');
  assert.equal(C3.repairFinal(s,'기억',C3.FINAL_GATE),true);
});
test('sentence fragments persist in the checkpoint and optional annex offers a bonus',()=>{
  const a=EX.create(210);
  for(const side of a.order){
    for(let i=0;i<5;i++)EX.append(a,side,i);
    assert.equal(EX.submit(a,side).ok,true);
    assert.equal(EX.collect(a,side),true);
  }
  assert.equal(a.bonus,true);
  const b=EX.create(15);
  assert.equal(EX.restore(b,EX.checkpoint(a)),true);
  assert.deepEqual(b.rooms,a.rooms);assert.deepEqual(b.fragments,a.fragments);
  assert.equal(b.bonus,true);
});
test('every generated detour has a traversable route to the puzzle and fragment',()=>{
  function reachable(state,x,goalZ){
    const queue=[[0,0]],seen=new Set(['0,0']);
    for(let cursor=0;cursor<queue.length;cursor++){
      const [dx,dz]=queue[cursor],px=x+dx*.5,pz=-58+dz*.5;
      if(Math.abs(dx)<=1&&Math.abs(pz-goalZ)<=.3)return true;
      for(const [ax,az] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const a=dx+ax,b=dz+az,key=a+','+b;
        if(seen.has(key)||Math.abs(a)>11||b>0||b< -24)continue;
        if(!C3.canMove(state,x+a*.5,-58+b*.5))continue;
        seen.add(key);queue.push([a,b]);
      }
    }
    return false;
  }
  for(let seed=1;seed<=45;seed++){
    const s=R.initialState();s.stage='explore';s.expansion=EX.create(seed);
    const c=C3.ensure(s);c.officeFixed=true;c.records.office=true;c.records.archive=true;
    for(const side of ['west','east']){
      const x=EX.WINGS[side].x;
      assert.ok(reachable(s,x,-65),seed+': '+side+' puzzle must be reachable');
      s.expansion.solved[side]=true;
      assert.ok(reachable(s,x,-69),seed+': '+side+' fragment must be reachable');
    }
  }
});
test('Eraser warns before erasing, and light wards off its close-range pressure',()=>{
  const p={...AN.HOME.eraser,yaw:0,pitch:0};
  const env={stage:'explore',hidden:false,lightOn:false,passable:()=>true};
  const a=AN.create(2);assert.equal(AN.begin(a,'eraser'),true);
  for(let i=0;i<25;i++)assert.equal(AN.step(a,.1,p,env).caught,false);
  let hit=false;
  for(let i=0;i<100;i++)if(AN.step(a,.1,p,env).caught){hit=true;break;}
  assert.equal(hit,true,'standing next to the eraser is not safe');
  const b=AN.create(2);AN.begin(b,'eraser');
  for(let i=0;i<100;i++)assert.equal(AN.step(b,.1,p,{...env,lightOn:true}).caught,false);
});
test('Misreader punishes prolonged staring, but looking away reduces focus',()=>{
  const a=AN.create(1);AN.begin(a,'misreader');
  const env={stage:'explore',hidden:false,passable:()=>true};
  const p={x:1.4,z:-48.8,yaw:0,pitch:0};
  for(let i=0;i<31;i++)AN.step(a,.1,p,env);
  let caught=false;
  for(let i=0;i<100;i++)if(AN.step(a,.1,p,env).caught){caught=true;break;}
  assert.equal(caught,true);
  p.yaw=Math.PI;
  for(let i=0;i<30;i++)AN.step(a,.1,p,env);
  assert.ok(a.misreader.focus<100,'looking away calms the meter');
});
test('new UI has modes, sentence controls, threat warnings and local-only assets',()=>{
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
  for(const name of ['expansion.js','anomalies.js','sentencePanel','sentenceTiles','modeSelect','runClock','voidPulse'])
    assert.ok(html.includes(name),name);
  for(const marker of ['EX.interaction(expansion,player)','AN.step(anomalies,dt,player','EX.submit(expansion,side)',
    'L.shuffledChoices(q,literacy.seed,item.uid)','kidscade-ota-speedrun-'])assert.ok(js.includes(marker),marker);
  assert.doesNotMatch(html,/https?:\/\/cdn\./);
});
