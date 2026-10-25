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
test('residents stay on visible sidewalk routes during life simulation',async()=>{
  const {STAGES,makeTown,getBlockCenter,getRoutePosition,movePeople}=await simPromise;
  for(const stage of Object.keys(STAGES)) {
    const town=makeTown(stage,884);
    for(let tick=0;tick<800;tick++)movePeople(town,.1);
    for(const person of town.people){
      const at=getRoutePosition(person,town.config),center=getBlockCenter(person.block,town.config);
      assert.ok(Number.isFinite(at.x)&&Number.isFinite(at.z));
      assert.ok(Math.abs(at.x-center.x)<=2.25 && Math.abs(at.z-center.z)<=2.75);
      assert.ok(person.elapsed>=0);
    }
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
  assert.deepEqual([1,2,3,14,99].map(i=>getChallengeSettings(i).residents),[10,13,16,49,50]);
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
  assert.match(code,/smallFallback\(url\)/);
  assert.match(code,/removeOccluder\(fallback\)/);
  assert.match(code,/challengeLevel\+1/);
  assert.match(code,/finishChallenge\(/);
  assert.match(html,/20초 연속 찾기 도전/);
  assert.match(code,/sim\.mjs\?v=4/);
  assert.match(code,/pinchCenter/);
  assert.match(code,/zoom\(zoomTouchDist\/distance,center\.x,center\.y\)/);
});
