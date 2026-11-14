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
const lifePromise = import(pathToFileURL(path.join(dir,'life.mjs')).href);

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
  assert.match(code,/sim\.mjs\?v=13/);
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
        const first=town.people[i],second=town.people[j];
        // A passenger inside a moving bus is not on the pedestrian footway.
        // Boarding/alighting people remain subject to the clearance test.
        if(first.state==='riding'||second.state==='riding')continue;
        const a=first.position,b=second.position;
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
    const onboard=town.people.filter(p=>p.state==='riding').length;
    assert.equal(new Set(town.paths.occupied.values()).size,town.people.length-onboard,
      'onboard residents release their bay; everyone on foot retains a reservation');
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

test('town walkers have visible travel in two minutes without losing the arcade speed ramp',async()=>{
  const {makeTown,movePeople,getWalkingSpeed}=await simPromise;
  const pedestrian={id:'person-0',challengeSpeed:1};
  const normalSpeed=getWalkingSpeed(pedestrian);
  assert.ok(normalSpeed>1.2&&normalSpeed<1.5);
  pedestrian.challengeSpeed=2.3;
  assert.ok(getWalkingSpeed(pedestrian)>normalSpeed*2.2);
  for(const [stage,required] of [['small',17],['medium',40],['large',78]]){
    for(const seed of [42,812,1441]){
      const town=makeTown(stage,seed,'normal'),departed=new Set();
      for(let tick=0;tick<600;tick++){
        movePeople(town,.2);
        for(const p of town.people){
          if(p.state==='walking'||p.trips>0||p.transit)departed.add(p.id);
          assert.ok(p.waiting<5,'no pedestrian should freeze in a crossing');
        }
      }
      assert.ok(departed.size>=required,`${stage}/${seed}: only ${departed.size} residents travelled by foot or shuttle`);
    }
  }
});

test('neighbors reciprocally greet without changing targets, paths, or arcade pacing',async()=>{
  const {makeTown,movePeople,getPose,signature,WALK,getChallengeSettings}=await simPromise;
  for(const [stage,minMoved,maxPairs] of [['small',17,2],['medium',40,3],['large',78,5]]){
    for(const seed of [42,812,1441]){
      const town=makeTown(stage,seed,'normal');
      const targets=town.order.map(id=>[id,signature(town.people.find(p=>p.id===id))]);
      const moved=new Set();
      for(let tick=0;tick<600;tick++){
        movePeople(town,.2);
        const greeting=town.people.filter(p=>p.socialWith);
        assert.equal(greeting.length%2,0,'every greeting has a partner');
        assert.ok(greeting.length<=maxPairs*2,'keep simultaneous speech bubbles sparse');
        for(const p of greeting){
          const friend=town.people.find(q=>q.id===p.socialWith);
          assert.ok(friend&&friend.socialWith===p.id,'greetings must be reciprocal');
          assert.equal(p.state,'acting');
          assert.equal(p.reserved,false,'targets and near-matches must stay observable');
          assert.equal(friend.block.id,p.block.id);
          assert.equal(getPose(p),'interact-right');
          assert.ok(Math.hypot(p.position.x-friend.position.x,p.position.z-friend.position.z)<=1.5);
        }
        for(const p of town.people){
          if(p.state==='walking'||p.trips>0||p.transit)moved.add(p.id);
          assert.ok(p.waiting<5,'greetings must not block the crossing');
        }
      }
      assert.ok(town.greetingCount>0,stage+' should show a real neighbor interaction');
      assert.ok(moved.size>=minMoved,stage+' residents should travel by foot or shuttle');
      for(const [id,look] of targets)assert.equal(signature(town.people.find(p=>p.id===id)),look);
      for(const person of town.people)if(person.socialWith)assert.equal(person.reserved,false);
    }
  }
  for(const level of [1,12,30]){
    const config=getChallengeSettings(level);
    const town=makeTown(config.stageName,500+level,'easy',true,config);
    for(let tick=0;tick<200;tick++)movePeople(town,.1);
    assert.equal(town.greetingCount,0,'timed challenges should keep their original pacing');
    assert.ok(town.people.every(p=>!p.socialWith));
  }
});

test('speech bubbles render outside the citizen picking layer',()=>{
  assert.match(code,/greetingMarkers = new Map\(\)/);
  assert.match(code,/marker\.add\(bubble\)/);
  assert.match(code,/speech\.quaternion\.copy\(camera\.quaternion\)/);
  assert.match(code,/p\.socialWith\?town\.people\.find/);
});

test('every on-screen sidewalk and crosswalk is an actual navigation edge',async()=>{
  const {makeTown,getStreetPlan,BLOCK_PITCH,WALK}=await simPromise;
  for(const stage of ['small','medium','large'])for(const seed of [1,42,812]){
    const town=makeTown(stage,seed,'normal');
    const plan=getStreetPlan(town);
    const {cols,rows}=town.config;
    assert.equal(plan.roads.length,cols+rows-2);
    const expected=2*((cols-1)*rows+(rows-1)*cols);
    assert.equal(plan.crossings.length,expected,'each road gap needs two real pedestrian crossings');
    const routeEdges=new Set();
    for(const [id,node] of town.paths.nodes)for(const next of node.next)
      routeEdges.add([id,next].sort().join('|'));
    const renderedEdges=new Set([...plan.walks,...plan.crossings].map(s=>[s.from,s.to].sort().join('|')));
    // A platform has two real navigation links: its dedicated yellow access
    // strip (rendered separately), and the merge into the existing sidewalk.
    // Neither is a second painted zebra or a duplicated footway instance.
    const stationAccess=new Set();
    for(const station of town.transit?.stations||[]){
      const platform=town.paths.nodes.get(station.platformId);
      const curb=town.paths.nodes.get(station.gateId);
      assert.ok(platform&&curb,'real bus platform and sidewalk gate must be routable');
      assert.ok(Math.hypot(platform.x-curb.x,platform.z-curb.z)>=.9);
      for(const node of [platform,curb])for(const next of node.next){
        assert.ok(town.paths.nodes.has(next),'station access must lead to a real sidewalk');
        stationAccess.add([node.id,next].sort().join('|'));
      }
    }
    assert.equal(stationAccess.size,(town.transit?.stations.length||0)*2);
    assert.equal(renderedEdges.size+stationAccess.size,routeEdges.size,
      'public pavement plus dedicated bus access must cover every navigation edge');
    for(const edge of routeEdges)assert.ok(renderedEdges.has(edge)||stationAccess.has(edge),edge);
    assert.match(code,/cube\(1\.15,\.024,\.55/, 'station access must also be drawn');
    for(const cross of plan.crossings){
      const a=town.paths.nodes.get(cross.from),b=town.paths.nodes.get(cross.to);
      assert.ok(a&&b);
      assert.ok(Math.abs(cross.length-(BLOCK_PITCH-WALK.edge*2))<1e-7);
      assert.ok(cross.axis==='x'?a.z===b.z:a.x===b.x);
      assert.notEqual(cross.from.split(':')[0],cross.to.split(':')[0]);
    }
  }
});
test('storefront and shelter envelopes leave walking clearance at the rear sidewalk',async()=>{
  const {CITY_GEOMETRY,WALK}=await simPromise;
  assert.ok(WALK.edge-(Math.abs(CITY_GEOMETRY.buildingZ)+CITY_GEOMETRY.buildingFootprint/2)>=.5);
  assert.ok(WALK.edge-(Math.abs(CITY_GEOMETRY.shelterZ)+CITY_GEOMETRY.shelterFootprint/2)>=.5);
  assert.ok(CITY_GEOMETRY.walkWidth>=WALK.clearance);
  assert.ok(CITY_GEOMETRY.crossingWidth>=WALK.clearance);
});
test('linked town uses instanced streets outside citizen hit-testing',()=>{
  for(const part of ['getStreetPlan(town)','city-linked-sidewalks','city-crossing-ramps','city-crossing-stripes','city-greenbelt-crowns','drawConnectedFootways(plan)','new THREE.InstancedMesh'])assert.ok(code.includes(part),part);
  assert.match(code,/ray\.intersectObjects\(citizens\.children,true\)/);
});

test('bakery errands carry one bread item across a real block boundary before finishing',async()=>{
  const {makeTown,movePeople,getVisualActivity,signature,personIsDiscoverable,WALK}=await simPromise;
  for(const stage of ['small','medium','large'])for(const seed of [42,812,1441]){
    const town=makeTown(stage,seed,'normal');
    const original=town.order.map(id=>[id,signature(town.people.find(p=>p.id===id))]);
    const initialLooks=new Map(town.people.map(p=>[p.id,p.propVariant]));
    let minDistance=Infinity,carryObserved=false,mealObserved=false;
    for(let tick=0;tick<1200;tick++){
      movePeople(town,.2);
      for(const p of town.people){
        if(p.errand){
          assert.equal(p.reserved,false,'a sought resident or lookalike must not shop');
          assert.equal(p.found,false);
          assert.equal(p.errand.bread,initialLooks.get(p.id),'bread must survive the entire route');
          if(p.errand.phase==='carrying'){
            assert.equal(getVisualActivity(p),'deliver');
            carryObserved=true;
          }
          if(p.errand.phase==='eating'){
            assert.equal(p.block.kind,'park');
            assert.equal(getVisualActivity(p),'eat');
            mealObserved=true;
          }
          if(p.errand.phase==='delivering')assert.equal(p.block.kind,'home');
        }
        assert.ok(p.waiting<5,'errands must not cause pedestrian standstills');
      }
      // Collision checks also cover the shopping exit and destination arrival.
      if(tick%5===0)for(let i=0;i<town.people.length;i++)for(let j=i+1;j<town.people.length;j++){
        const a=town.people[i],b=town.people[j];
        // Riders are inside the bus, not on the pedestrian sidewalk.
        if(a.state==='riding'||b.state==='riding')continue;
        minDistance=Math.min(minDistance,Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z));
      }
    }
    assert.ok(town.commerce.visits>0,'store visits must occur');
    assert.ok(town.commerce.purchases>0,'a real purchase must occur');
    assert.ok(carryObserved,'a purchased item must be carried to the destination');
    assert.ok(town.commerce.completed>0,'at least one purchase must become a fulfilled errand');
    assert.equal(town.commerce.meals+town.commerce.deliveries,town.commerce.completed);
    assert.ok(minDistance>=WALK.clearance-1e-6,'no crossing or storefront overlap');
    for(const record of town.commerce.recent){
      assert.notEqual(record.from,record.to,'shopper must go to a different block');
      assert.ok(['park','home'].includes(record.kind),'only a park or home is a final destination');
      assert.equal(record.bread,initialLooks.get(record.person),'same purchased bread gets delivered');
    }
    for(const [id,look] of original){
      assert.equal(signature(town.people.find(p=>p.id===id)),look);
      assert.ok(personIsDiscoverable(town,id));
    }
    // Some seeds take longer to finish the first park trip, so the test only
    // requires the eating pose when a shopper naturally reaches a park.
    if(mealObserved)assert.ok(town.commerce.visits>=town.commerce.meals);
  }
});
test('quick arcade challenges do not start store errands',async()=>{
  const {getChallengeSettings,makeTown,movePeople}=await simPromise;
  for(const level of [1,12,30]){
    const config=getChallengeSettings(level),town=makeTown(config.stageName,211+level,'hard',true,config);
    for(let tick=0;tick<300;tick++)movePeople(town,.1);
    assert.deepEqual({visits:town.commerce.visits,purchases:town.commerce.purchases,completed:town.commerce.completed},
      {visits:0,purchases:0,completed:0});
    assert.ok(town.people.every(p=>p.errand===null));
  }
});
test('shopper visual actions and bags reuse original bread models',()=>{
  assert.match(code,/getVisualActivity\(person\)/);
  assert.match(code,/bakery-shopping-bag/);
  assert.match(code,/BREADS\[person\.propVariant\]/);
  assert.match(code,/mesh\.activity=visualActivity/);
});

test('the shuttle actually boards residents at curbside stops and drops them in another block',async()=>{
  const {makeTown,movePeople,signature,personIsDiscoverable,WALK,BLOCK_PITCH}=await simPromise;
  for(const stage of ['small','medium','large'])for(const seed of [42,812,1441]){
    const town=makeTown(stage,seed,'hard');
    const saved=town.order.map(id=>[id,signature(town.people.find(p=>p.id===id))]);
    const service=town.transit;
    assert.ok(service&&service.stations.length>=2,'at least two actual pickup/dropoff places');
    assert.ok(service.stations.some(s=>s.block.kind==='stop'));
    if(stage==='small')assert.ok(service.stations.some(s=>s.block.kind==='school'),
      'school street is the second stop in the two-row town');
    const original=new Map(town.people.map(p=>[p.id,{...p.position}]));
    let boarding=false,riding=false,alighting=false,minDistance=Infinity,changedBus=false;
    const initial={...service.bus.position};
    for(let tick=0;tick<2000;tick++){
      movePeople(town,.2);
      const bus=service.bus,at=bus.position;
      assert.ok(Number.isFinite(at.x)&&Number.isFinite(at.z));
      assert.ok(Number.isFinite(bus.heading));
      // A bus always remains on a real vertical or horizontal road strip.
      const xRoad=Array.from({length:town.config.cols-1},(_,i)=>
        (i+.5-(town.config.cols-1)/2)*BLOCK_PITCH);
      const zRoad=Array.from({length:town.config.rows-1},(_,i)=>
        (i+.5-(town.config.rows-1)/2)*BLOCK_PITCH);
      assert.ok(xRoad.some(x=>Math.abs(at.x-x)<1e-5)||
        zRoad.some(z=>Math.abs(at.z-z)<1e-5),'bus must never cut through a building block');
      if(Math.hypot(at.x-initial.x,at.z-initial.z)>2)changedBus=true;
      for(const p of town.people){
        if(p.transit){
          assert.equal(p.reserved,false,'the target or deliberate lookalike cannot board');
          assert.equal(p.found,false);
          assert.equal(p.errand,null,'never steal a resident carrying paid bread');
          boarding ||=p.state==='boarding';
          riding ||=p.state==='riding';
          alighting ||=p.state==='alighting';
          if(p.state==='riding')assert.equal(bus.rider,p.id);
          if(p.state==='alighting')assert.equal(town.paths.occupied.get(p.slotId),p.id);
        }
        const prev=original.get(p.id);
        assert.ok(Math.hypot(p.position.x-prev.x,p.position.z-prev.z)<.65,
          'boarding, riding and disembarking may not teleport');
        original.set(p.id,{...p.position});
        assert.ok(p.waiting<5);
      }
      if(tick%5===0)for(let i=0;i<town.people.length;i++)for(let j=i+1;j<town.people.length;j++){
        const p=town.people[i],q=town.people[j];
        if(p.state==='riding'||q.state==='riding')continue;
        minDistance=Math.min(minDistance,Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z));
      }
    }
    assert.ok(changedBus,'bus must travel a real cross-block road route');
    assert.ok(boarding&&riding&&alighting,'boarding, journey and disembark are three visible states');
    assert.ok(service.boarded>0&&service.alighted>0&&service.arrivals>0);
    assert.ok(service.boarded>=service.alighted,'cannot drop off more people than boarded');
    assert.ok(minDistance>=WALK.clearance-1e-6,'transferring people must respect walking clearance');
    for(const trip of service.recent)assert.notEqual(trip.from,trip.to,'the passenger must change districts');
    for(const [id,look] of saved){
      assert.equal(signature(town.people.find(p=>p.id===id)),look);
      assert.ok(personIsDiscoverable(town,id));
    }
  }
});
test('arcade challenges retain their original bus-free pace and still contain a target',async()=>{
  const {getChallengeSettings,makeTown,movePeople}=await simPromise;
  for(const level of [1,12,30]){
    const settings=getChallengeSettings(level);
    const town=makeTown(settings.stageName,1000+level,'easy',true,settings);
    for(let tick=0;tick<200;tick++)movePeople(town,.1);
    assert.equal(town.transit,null);
    assert.ok(town.people.every(p=>p.transit===null));
    assert.equal(town.order.length,1);
  }
});
test('three-dimensional shuttle is placed by the simulation and excludes onboard residents from picking',()=>{
  for(const snippet of ['routeBus:true','real-bus-platform','bus-door-ready',
    "mesh.holder.visible=p.state!=='riding'", "person.state==='riding'"])assert.ok(code.includes(snippet),snippet);
  assert.match(code,/const bus=town\.transit\.bus/);
});

test('traffic signals use the exact town-road intersections and alternate right of way',async()=>{
  const {makeTown,getStreetPlan,BLOCK_PITCH}=await simPromise;
  const {trafficPhase,trafficLightAllows,TRAFFIC_RULES}=await import(
    pathToFileURL(path.join(dir,'traffic.mjs')).href);
  for(const [stage,count] of [['small',1],['medium',2],['large',3]]){
    const town=makeTown(stage,42,'normal');
    const traffic=town.traffic,roads=getStreetPlan(town).roads;
    assert.ok(traffic);
    assert.equal(traffic.cars.length,count);
    assert.equal(traffic.junctions.length,(town.config.cols-1)*(town.config.rows-1));
    assert.equal(traffic.crossings.length,getStreetPlan(town).crossings.length);
    for(const car of traffic.cars){
      assert.ok(roads.some(r=>r.axis==='x'&&Math.abs(car.position.z-r.z)<1e-8),
        'actual cars travel inside real horizontal roads');
    }
    const joint=traffic.junctions[0];
    const before={x:joint.x-3,z:joint.z},enter={x:joint.x-2.7,z:joint.z};
    town.time=0;assert.equal(trafficPhase(town),'horizontal');
    assert.ok(trafficLightAllows(town,before,enter,'horizontal'));
    town.time=7.5;assert.equal(trafficPhase(town),'all-red');
    assert.equal(trafficLightAllows(town,before,enter,'horizontal'),false);
    town.time=10;assert.equal(trafficPhase(town),'vertical');
    assert.equal(trafficLightAllows(town,before,enter,'horizontal'),false);
    assert.ok(trafficLightAllows(town,before,enter,'vertical'));
    assert.ok(TRAFFIC_RULES.stopLine>2.5,'signals stop BEFORE pedestrian zebras');
    town.time=0;
    for(const joint of traffic.junctions){
      const xs=Array.from({length:town.config.cols-1},(_,i)=>
        (i+.5-(town.config.cols-1)/2)*BLOCK_PITCH);
      assert.ok(xs.some(x=>Math.abs(x-joint.x)<1e-8));
    }
  }
});
test('traffic cars yield at real zebras and never block walkers or overlap the shuttle',async()=>{
  const {makeTown,movePeople,WALK,signature}=await simPromise;
  const {trafficPhase}=await import(pathToFileURL(path.join(dir,'traffic.mjs')).href);
  for(const stage of ['small','medium','large'])for(const seed of [42,812]){
    const town=makeTown(stage,seed,'normal'),phases=new Set();
    const looks=town.order.map(id=>[id,signature(town.people.find(p=>p.id===id))]);
    let carMovement=0,minCarPed=Infinity,minBusCar=Infinity,maxWaiting=0;
    let before=new Map(town.traffic.cars.map(c=>[c.id,{...c.position}]));
    for(let tick=0;tick<400;tick++){
      movePeople(town,.2);phases.add(trafficPhase(town));
      for(const car of town.traffic.cars){
        const old=before.get(car.id);
        const jump=Math.hypot(car.position.x-old.x,car.position.z-old.z);
        // Respawn happens only after leaving the far outside greenbelt.
        if(jump>1.0)assert.ok(Math.abs(old.x)>town.config.cols*7/2+2,
          'car may not jump between inhabited blocks');
        else carMovement+=jump;
        before.set(car.id,{...car.position});
        minBusCar=Math.min(minBusCar,Math.hypot(
          car.position.x-town.transit.bus.position.x,
          car.position.z-town.transit.bus.position.z));
        for(const p of town.people){
          if(p.state!=='walking')continue;
          minCarPed=Math.min(minCarPed,Math.hypot(
            p.position.x-car.position.x,p.position.z-car.position.z));
        }
      }
      for(const p of town.people)maxWaiting=Math.max(maxWaiting,p.waiting);
    }
    assert.ok(carMovement>25,'ordinary cars must really travel, not spin in place');
    assert.ok(phases.has('horizontal')&&phases.has('vertical')&&phases.has('all-red'));
    assert.ok(minCarPed>=WALK.clearance-1e-6,'cars must clear real walking residents');
    assert.ok(minBusCar>=1.7,'ordinary cars must clear the actual bus body');
    assert.ok(maxWaiting<5,'road controls must not deadlock residents');
    assert.ok(town.traffic.lightStops>0,'red lights must stop real cars');
    assert.ok(town.traffic.vehicleYields>0,'real pedestrians must receive priority');
    for(const [id,look] of looks)assert.equal(
      signature(town.people.find(p=>p.id===id)),look,'traffic must not change target clues');
  }
});
test('signalized road props remain outside target-raycasting and challenges keep old cars',async()=>{
  const {makeTown,getChallengeSettings,movePeople}=await simPromise;
  for(const token of ['city-live-traffic-light','trafficHeads',
    'roadCar.position.x','car.simCar','trafficPhase(town)'])
    assert.ok(code.includes(token),token);
  assert.match(code,/ray\.intersectObjects\(citizens\.children,true\)/);
  const challenge=getChallengeSettings(12);
  const town=makeTown(challenge.stageName,142,'hard',true,challenge);
  for(let i=0;i<200;i++)movePeople(town,.1);
  assert.equal(town.traffic,null);
  assert.equal(town.transit,null);
  assert.ok(town.people.every(p=>p.transit===null));
});

test('shuttle body extent—not just its center—clears actual walking citizens at junction turns',async()=>{
  const {makeTown,movePeople,WALK,signature}=await simPromise;
  const {busBodyGap,SHUTTLE,reservedShuttleDropBay}=await import(
    pathToFileURL(path.join(dir,'transit.mjs')).href);
  assert.equal(busBodyGap({position:{x:0,z:0},heading:0},{x:0,z:1.1}),
    -SHUTTLE.personRadius,'geometry uses real visible bus nose');
  for(const stage of ['small','medium','large'])for(const seed of [42]){
    const town=makeTown(stage,seed,'normal');
    const looks=town.order.map(id=>[id,signature(town.people.find(p=>p.id===id))]);
    let worst=Infinity,largestWait=0;
    for(let tick=0;tick<360;tick++){
      movePeople(town,.2);
      const bus=town.transit.bus;
      if(bus.rider){
        const berth=reservedShuttleDropBay(town);
        assert.ok(berth&&town.paths.nodes.has(berth));
      }
      for(const p of town.people){
        largestWait=Math.max(largestWait,p.waiting);
        if(p.state==='walking')worst=Math.min(worst,busBodyGap(bus,p.position));
      }
    }
    assert.ok(worst>=-.001,stage+'/'+seed+' bus body clips a walker at '+worst);
    assert.ok(largestWait<5,'bus must not imprison crossing pedestrians');
    for(const [id,look] of looks)assert.equal(
      signature(town.people.find(p=>p.id===id)),look);
  }
});
test('on a bus arrival, a non-target may clear its occupied curb on the real walkway',async()=>{
  const {makeTown,movePeople}=await simPromise;
  const town=makeTown('small',42,'normal');
  const before=town.paths.slots.find(s=>s.block.id===town.transit.stations[1].block.id&&
    s.index===town.transit.stations[1].dock);
  const occupant=town.people.find(p=>p.slotId===before.id);
  assert.ok(occupant&&!occupant.reserved,'fixed regression seed has an ordinary occupant');
  const initial=occupant.position;
  for(let t=0;t<300;t++)movePeople(town,.2);
  assert.ok(town.transit.alighted>0,'a real dropoff must eventually complete');
  assert.ok(occupant.trips>0||occupant.state==='walking','curb occupant departed by foot');
  assert.ok(Number.isFinite(initial.x)&&Number.isFinite(initial.z));
  assert.equal(town.people.filter(p=>p.transit?.phase==='riding').length<=1,true);
});
test('tablet render path respects saved clues and reduces large-world framebuffer work',()=>{
  for(const token of ['tabletGraphicsBudget()','applyGraphicsBudget()',
    'previewFrameAt','1000/24','group.userData.vehicle','shape.x>shape.z*1.08'])
    assert.ok(code.includes(token),'tablet/vehicle renderer hook: '+token);
  assert.match(code,/sim\.mjs\?v=13/);
  assert.match(html,/game\.js\?v=13/);
});

test('living districts schedule distinct 3D stories without consuming puzzle randomness',async()=>{
  const {makeTown,movePeople,signature,personIsDiscoverable}=await simPromise;
  const {LIFE_CUES,LIFE_LIMIT}=await lifePromise;
  assert.equal(Object.keys(LIFE_CUES).length,6);
  assert.equal(Object.values(LIFE_CUES).flat().length,12);
  for(const stage of ['small','medium','large'])for(const seed of [42,812]){
    const town=makeTown(stage,seed,'normal');
    const repeat=makeTown(stage,seed,'normal');
    assert.equal(town.life.scenes.length,LIFE_LIMIT[stage]);
    assert.deepEqual(town.life.scenes,repeat.life.scenes);
    assert.equal(new Set(town.life.scenes.map(s=>s.kind)).size,6);
    assert.equal(town.life.episodes,0);
    const clues=town.order.map(id=>[id,signature(town.people.find(p=>p.id===id))]);
    const initial=town.people.map(p=>[p.id,p.modelVariant,p.propVariant,p.position.x,p.position.z]);
    assert.deepEqual(initial,repeat.people.map(p=>[p.id,p.modelVariant,p.propVariant,p.position.x,p.position.z]));
    for(let tick=0;tick<250;tick++)movePeople(town,.16); // 40 simulated seconds
    assert.ok(town.life.episodes>=12,stage+' should have multiple neighborhood happenings');
    assert.equal(Object.keys(town.life.counts).length,12,
      'all 12 cues must appear, including birds, shops, school, and gardening');
    for(const story of town.life.scenes){
      assert.ok(Number.isFinite(story.phase)&&story.phase>=0&&story.phase<=1);
      assert.ok(LIFE_CUES[story.kind].includes(story.cue));
      assert.ok(story.episodes>=2);
    }
    for(const [id,clue] of clues){
      const p=town.people.find(p=>p.id===id);
      assert.equal(signature(p),clue);
      assert.ok(personIsDiscoverable(town,id));
      assert.ok(p.socialKind==null,'clue people do not participate in ambient handoffs');
    }
  }
});
test('background neighbor chat, wave and handoff are reciprocal and non-selectable',async()=>{
  const {makeTown,movePeople,signature}=await simPromise;
  const counts={chat:0,wave:0,handoff:0};
  for(const stage of ['small','medium'])for(const seed of [42,812]){
    const town=makeTown(stage,seed,'easy');
    const before=town.order.map(id=>[id,signature(town.people.find(p=>p.id===id))]);
    for(let i=0;i<400;i++){
      movePeople(town,.2);
      for(const p of town.people)if(p.socialWith){
        const q=town.people.find(q=>q.id===p.socialWith);
        assert.ok(q&&q.socialWith===p.id&&q.socialKind===p.socialKind,
          'an ambient interaction must have a real matching partner');
        assert.ok(!p.reserved&&!q.reserved&&!p.errand&&!q.errand,
          'important clue figures and active deliveries are not retasked');
        assert.ok(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)<=1.5);
      }
    }
    for(const key of Object.keys(counts))counts[key]+=town.socialScenes[key];
    for(const [id,clue] of before)assert.equal(signature(town.people.find(p=>p.id===id)),clue);
  }
  for(const key of Object.keys(counts))assert.ok(counts[key]>0,key+' scene must occur');
});
test('living props are scenery only and challenge mode retains the existing puzzle',async()=>{
  const {makeTown,getChallengeSettings,movePeople}=await simPromise;
  const source=require('node:fs').readFileSync(path.join(dir,'life.mjs'),'utf8');
  for(const token of ['makeLivingNeighborhood();','updateLivingNeighborhood();',
    'city-living-','city-neighbor-handoff','scenery.add(group)','marker.add(token)',
    'swayingTrees','livingScenes.length=0','handoffMarkers.clear()']){
    assert.ok(code.includes(token),token);
  }
  assert.match(code,/ray\.intersectObjects\(citizens\.children,true\)/);
  assert.doesNotMatch(source,/fetch\(|WebSocket|localStorage|Math\.random\(/);
  for(const level of [1,12,30]){
    const c=getChallengeSettings(level);
    const town=makeTown(c.stageName,42,'hard',true,c);
    for(let i=0;i<25;i++)movePeople(town,.2);
    assert.equal(town.life,null);
    assert.deepEqual(town.socialScenes,{chat:0,wave:0,handoff:0});
  }
  assert.match(code,/sim\.mjs\?v=14/);
  assert.match(html,/game\.js\?v=14/);
});
