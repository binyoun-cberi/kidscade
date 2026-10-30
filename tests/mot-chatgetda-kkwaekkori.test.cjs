const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname,'..');
const dir = path.join(root,'games','tod_mot_chatgetda_kkwaekkori');
const html = fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css = fs.readFileSync(path.join(dir,'style.css'),'utf8');
const code = fs.readFileSync(path.join(dir,'game.js'),'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
const simPromise = import(pathToFileURL(path.join(dir,'sim.mjs')).href);

test('game is registered for preschool and lower-primary ages',()=>{
  const game=catalog.games.find(game=>game.id==='tod_mot_chatgetda_kkwaekkori');
  assert.ok(game);
  assert.equal(game.title,'못 찾겠다 꾀꼬리');
  assert.equal(game.age,'toddler');
  assert.deepEqual(game.ages,['toddler','low']);
  assert.equal(game.subject,'thinking');
  assert.ok(fs.existsSync(path.join(root,game.href.split('?')[0])));
  assert.ok(fs.existsSync(path.join(root,game.cover)));
});
test('game loads local Three.js and has touch controls, audio clues, and hints',()=>{
  assert.match(html,/three-r160\/three\.module\.js/);
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data-game-id="tod_mot_chatgetda_kkwaekkori"/);
  for(const id of ['town','targetPreview','rotateLeft','rotateRight','seeThrough','hintBtn','zoomIn','zoomOut','finish','start','challengeStart','challengeHud','challengeTimer','compactMission']) assert.match(html,new RegExp(`id="${id}"`));
  for(const control of ['pointerdown','pointermove','pointerup','pointercancel','wheel','speechSynthesis','localStorage','GLTFLoader','SkeletonUtils']) assert.ok(code.includes(control),control);
  assert.match(css,/touch-action:none/);
});
test('all stages have different city sizes and targets',async()=>{
  const { STAGES,makeTown } = await simPromise;
  assert.deepEqual(Object.keys(STAGES),['small','medium','large']);
  assert.deepEqual(Object.values(STAGES).map(s=>s.residents),[18,45,84]);
  assert.deepEqual(Object.values(STAGES).map(s=>s.targets),[1,3,5]);
  for(const stage of Object.keys(STAGES)) {
    const town=makeTown(stage,55);
    assert.equal(town.people.length,STAGES[stage].residents);
    assert.equal(town.blocks.length,STAGES[stage].cols*STAGES[stage].rows);
    assert.equal(new Set(town.order).size,town.config.targets);
  }
});
test('one day is seeded and every sought resident has unambiguous appearance',async()=>{
  const {STAGES,makeTown,personIsDiscoverable,getClue}=await simPromise;
  for(const stage of Object.keys(STAGES))for(let seed=1;seed<=75;seed++) {
    const a=makeTown(stage,seed),b=makeTown(stage,seed);
    assert.deepEqual(a.order,b.order);
    assert.deepEqual(a.people.map(p=>[p.modelVariant,p.activity,p.propVariant]),b.people.map(p=>[p.modelVariant,p.activity,p.propVariant]));
    for(const id of a.order){
      assert.ok(personIsDiscoverable(a,id));
      assert.ok(getClue(a.people.find(p=>p.id===id)).subtitle.length>5);
    }
  }
});
test('residents use connected sidewalks and cross only at the marked links',async()=>{
  const {makeTown,movePeople,WALK,BLOCK_PITCH}=await simPromise;
  for(const size of ['small','medium','large']){
    const town=makeTown(size,884);
    for(let tick=0;tick<1200;tick++){
      movePeople(town,.1);
      for(const p of town.people){
        const {x,z}=p.position;
        assert.ok(Number.isFinite(x)&&Number.isFinite(z));
        assert.ok(Math.abs(x)<town.config.cols*BLOCK_PITCH/2);
        assert.ok(Math.abs(z)<town.config.rows*BLOCK_PITCH/2);
        if(p.state!=='walking')continue;
        // Every motion segment remains axis-aligned on the shared path graph.
        const next=town.paths.nodes.get(p.route[0]);
        assert.ok(Math.abs(x-next.x)<1e-6||Math.abs(z-next.z)<1e-6);
      }
    }
    assert.ok(town.people.some(p=>p.trips>0),'residents must actually arrive in another block');
    assert.ok(town.paths.slots.length>town.people.length,'leave room to reserve a destination');
    assert.ok(WALK.clearance>.8);
  }
});
test('only known repository GLB paths are referenced',()=>{
  for(const part of ['kenney-city-kit-suburban/building-type-', 'kenney-nature-kit/tree-default.glb', 'character-', 'kenney-car-kit/sedan.glb']) assert.ok(code.includes(part),part);
  assert.doesNotMatch(code,/https?:\/\//);
});


test('activity clues stay unique and the district types are present in every stage',async()=>{
  const {makeTown,STAGES,personIsDiscoverable}=await simPromise;
  for(const stage of Object.keys(STAGES))for(let seed=1;seed<=100;seed++){
    const town=makeTown(stage,seed);
    assert.equal(new Set(town.blocks.map(b=>b.kind)).size,6);
    assert.equal(new Set(town.people.map(p=>`${p.modelVariant}:${p.activity}:${p.propVariant}`)).size,town.people.length);
    for(const id of town.order)assert.ok(personIsDiscoverable(town,id));
  }
});

test('all nine scenes exist and reserved clues stay unchanged while neighbors change activities',async()=>{
  const {makeTown,movePeople,signature,personIsDiscoverable}=await simPromise;
  for(const size of ['small','medium','large'])for(const difficulty of ['easy','normal','hard'])for(let seed=1;seed<=12;seed++){
    const town=makeTown(size,seed,difficulty);
    assert.equal(new Set(town.people.map(p=>p.activity)).size,9);
    const targets=town.order.map(id=>town.people.find(p=>p.id===id));
    const before=targets.map(signature),background=town.people.filter(p=>!p.reserved).map(p=>[p.id,p.activity]);
    for(let tick=0;tick<650;tick++)movePeople(town,.1);
    assert.deepEqual(targets.map(signature),before);
    for(const p of targets)assert.ok(personIsDiscoverable(town,p.id));
    assert.ok(background.some(([id,activity])=>town.people.find(p=>p.id===id).activity!==activity));
  }
});

test('eligibility filtering never makes an unavailable character the answer',async()=>{
  const {makeTown,selectTargets}=await simPromise;
  const town=makeTown('large',77,'hard',false);
  const eligible=town.people.filter(p=>p.modelVariant<3).map(p=>p.id);
  selectTargets(town,eligible);
  assert.ok(town.order.length>0);
  assert.ok(town.order.every(id=>eligible.includes(id)));
  const empty=makeTown('small',22,'easy',false);selectTargets(empty,[]);assert.deepEqual(empty.order,[]);
});

test('hard clues include a visible prop and near-matches differ in a meaningful attribute',async()=>{
  const {makeTown,getClue}=await simPromise;
  for(let seed=1;seed<=100;seed++){
    const town=makeTown('large',seed,'hard');
    for(const id of town.order){const target=town.people.find(p=>p.id===id);assert.ok(getClue(target,'hard').title.includes(getClue(target).prop));}
    const foils=town.people.filter(p=>p.foilFor);
    assert.ok(foils.length>0);
    for(const foil of foils){const target=town.people.find(p=>p.id===foil.foilFor);assert.equal(foil.modelVariant,target.modelVariant);assert.equal(foil.activity,target.activity);assert.notEqual(foil.propVariant,target.propVariant);}
  }
});

test('Critter-inspired challenge ramps its crowd and clamps movement difficulty',async()=>{
  const {getChallengeSettings,CHALLENGE,makeTown}=await simPromise;
  assert.deepEqual([1,2,3,14,99].map(i=>getChallengeSettings(i).residents),[11,14,17,50,51]);
  assert.deepEqual([1,2,3,14,99].map(i=>getChallengeSettings(i).distractors),[10,13,16,49,50]);
  assert.equal(getChallengeSettings(1).speed,1);
  assert.ok(getChallengeSettings(11).speed>getChallengeSettings(10).speed);
  assert.equal(getChallengeSettings(9999).speed,2.3);
  assert.equal(CHALLENGE.seconds,20);
  assert.equal(CHALLENGE.wrongPenalty,2);
  for(let level=1;level<=25;level++){
    const config=getChallengeSettings(level);
    const a=makeTown(config.stageName,292+level,'easy',true,config);
    assert.equal(a.people.length,config.residents);
    assert.equal(a.order.length,1);
    assert.ok(a.people.every(p=>Number.isFinite(p.phase)&&p.challengeSpeed>=1));
    assert.ok(a.people.every(p=>p.slot<3),'each district accommodates no more than 3 residents');
  }
});

test('moving neighbors use a separate unobstructed lane and never teleport',async()=>{
  const {makeTown,getRoutePosition,movePeople}=await simPromise;
  for(const size of ['small','medium','large']){
    const town=makeTown(size,812);
    let previous=new Map(town.people.map(p=>[p.id,getRoutePosition(p,town.config)]));
    let moving=0;
    for(let i=0;i<800;i++){
      movePeople(town,.1);
      for(const p of town.people){
        const at=getRoutePosition(p,town.config),before=previous.get(p.id);
        const dist=Math.hypot(at.x-before.x,at.z-before.z);
        assert.ok(dist<.6,`teleportation: ${size}/${p.id} moved ${dist}`);
        if(dist>.004)moving++;
        previous.set(p.id,at);
      }
    }
    assert.ok(moving>100,'the town should not look like a collection of statues');
    for(const block of town.blocks){
      const occupants=town.people.filter(p=>p.block.id===block.id);
      for(let i=0;i<occupants.length;i++)for(let j=i+1;j<occupants.length;j++){
        const a=getRoutePosition(occupants[i],town.config),b=getRoutePosition(occupants[j],town.config);
        assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>.45,'characters should not occupy the same standing position');
      }
    }
  }
});

test('3D picking, honest prop fallbacks and rotated-camera ground dragging are present',()=>{
  assert.match(code,/intersectObjects\(citizens\.children,true\)/);
  assert.match(code,/intersectPlane\(new THREE\.Plane/);
  assert.match(code,/seeThrough=false;[\s\S]*?'seeThrough'\)\.setAttribute\('aria-pressed','false'\)/);
  assert.match(code,/smallFallback\(url\)/);
  assert.match(code,/removeOccluder\(fallback\)/);
  assert.match(code,/challengeLevel\+1/);
  assert.match(code,/finishChallenge\(/);
  assert.match(html,/20초 연속 찾기 도전/);
  assert.match(code,/sim\.mjs\?v=6/);
  assert.match(code,/pinchCenter/);
  assert.match(code,/zoom\(zoomTouchDist\/distance,center\.x,center\.y\)/);
});


test('shared paths keep residents apart and let every small-town neighbor travel',async()=>{
  const {makeTown,movePeople,WALK,signature,getClue,getPose}=await simPromise;
  for(const seed of [1,812,2026]){
    const town=makeTown('small',seed,'hard');
    const target=town.people.find(p=>p.id===town.order[0]),look=signature(target);
    let walkingTarget=false;
    for(let tick=0;tick<6000;tick++){
      movePeople(town,.1);
      for(let i=0;i<town.people.length;i++)for(let j=i+1;j<town.people.length;j++){
        const a=town.people[i].position,b=town.people[j].position;
        assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=WALK.clearance-1e-6,'residents overlap');
      }
      assert.equal(signature(target),look,'movement must not invalidate the identifying features');
      if(target.state==='walking'){
        walkingTarget=true;assert.equal(getPose(target),'walk');
        assert.ok(getClue(target).place.includes(target.destination.block.name));
        assert.ok(getClue(target).title.includes('걸어가는'));
      }
      assert.ok(town.people.every(p=>p.waiting<5),'an occupied junction must not trap a resident');
    }
    assert.ok(walkingTarget,'the answer must travel too');
    assert.ok(town.people.every(p=>p.trips>0),'no resident remains confined to their original block');
    assert.equal(new Set(town.paths.occupied.values()).size,town.people.length);
  }
});

test('activity bays and connected paths stay outside the rear building envelope',async()=>{
  const {makeTown,getBlockCenter,WALK}=await simPromise;
  const town=makeTown('small',3);
  for(const slot of town.paths.slots){
    const n=town.paths.nodes.get(slot.id),c=getBlockCenter(slot.block,town.config);
    assert.ok(n.z-c.z>-.0+2.65/2-1.2+.6);
  }
  for(const n of town.paths.nodes.values())for(const id of n.next){
    const next=town.paths.nodes.get(id);
    assert.ok(n.x===next.x||n.z===next.z);
  }
  assert.ok(WALK.edge-Math.max(...WALK.bayX)>WALK.clearance);
});


test('legacy saved days reconstruct the same target IDs and order',async()=>{
  const {makeTown}=await simPromise;
  const before={small:['person-11'],medium:['person-14','person-13','person-30'],large:['person-18','person-17','person-36','person-47','person-59']};
  for(const size of Object.keys(before))assert.deepEqual(makeTown(size,812,'hard').order,before[size]);
});

test('sought face and prop stay unique when a walking pose hides the old activity',async()=>{
  const {makeTown}=await simPromise;
  for(const size of ['small','medium','large'])for(const difficulty of ['easy','normal','hard'])for(let seed=1;seed<=60;seed++){
    const town=makeTown(size,seed,difficulty);
    for(const id of town.order){
      const p=town.people.find(p=>p.id===id);
      assert.equal(town.people.filter(q=>q.modelVariant===p.modelVariant&&q.propVariant===p.propVariant).length,1);
    }
  }
});

test('delivery browser observation allows the initial errand pause and tracks real rendered movement',async()=>{
  const {makeTown,movePeople}=await simPromise;
  const {findWalkingDelivery}=require('./helpers/kkwaekkori-motion.cjs');
  const town=makeTown('small',42);
  const snapshot=()=>({time:town.time,residents:town.people.filter(p=>p.routine==='deliver').map(p=>({id:p.id,state:p.state,rendered:[p.position.x,p.position.z],simulated:[p.position.x,p.position.z]}))});
  const before=snapshot();
  for(let i=0;i<5;i++)movePeople(town,.1);
  assert.equal(findWalkingDelivery(before,snapshot()),null,'an initial activity pause is valid');
  let after;
  for(let i=0;i<300;i++){movePeople(town,.1);after=snapshot();if(findWalkingDelivery(before,after))break;}
  assert.ok(findWalkingDelivery(before,after),'delivery must eventually start naturally');
  const frozen=structuredClone(after);
  for(const p of frozen.residents)p.rendered=before.residents.find(q=>q.id===p.id).rendered;
  assert.equal(findWalkingDelivery(before,frozen),null,'a frozen 3D holder must fail even if the simulation moves');
  const changedIds=structuredClone(after);changedIds.residents.forEach(p=>p.id+='-other');
  assert.equal(findWalkingDelivery(before,changedIds),null,'switching residents must not fake movement');
  assert.equal(findWalkingDelivery(before,{...after,time:before.time}),null,'no advancing frames means no verified walk');
  const misplaced=structuredClone(after);misplaced.residents.forEach(p=>p.rendered=[999,999]);
  assert.equal(findWalkingDelivery(before,misplaced),null,'rendered movement must agree with the simulation');
});

test('delivery residents depart early across 100 seeded towns without changing saved looks',async()=>{
  const {makeTown,movePeople}=await simPromise;
  const {findWalkingDelivery}=require('./helpers/kkwaekkori-motion.cjs');
  for(let seed=1;seed<=100;seed++){
    const town=makeTown('small',seed),before={time:town.time,residents:town.people.filter(p=>p.routine==='deliver').map(p=>({id:p.id,rendered:[p.position.x,p.position.z]}))};
    assert.ok(town.people.filter(p=>p.routine==='deliver').every(p=>p.routineAt>=.8&&p.routineAt<1.8));
    assert.ok(town.people.filter(p=>p.routine!=='deliver').every(p=>p.routineAt>=3&&p.routineAt<12));
    const looks=town.people.map(p=>[p.id,p.modelVariant,p.propVariant]);
    let moved=null;
    for(let tick=0;tick<40&&!moved;tick++){
      movePeople(town,.1);
      moved=findWalkingDelivery(before,{time:town.time,residents:town.people.filter(p=>p.routine==='deliver').map(p=>({id:p.id,state:p.state,rendered:[p.position.x,p.position.z],simulated:[p.position.x,p.position.z]}))});
    }
    assert.ok(moved,'delivery should be visible near the start: seed '+seed);
    assert.deepEqual(town.people.map(p=>[p.id,p.modelVariant,p.propVariant]),looks);
  }
});
