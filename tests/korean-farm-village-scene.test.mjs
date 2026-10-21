import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {FIELD_DEFS,makeFarmState} from '../games/korean-farm/world.mjs';
import {VILLAGE_LANDMARKS,VILLAGE_COLLIDERS,intersectsVillageCollision,plotLandscapeOverlap}
  from '../games/korean-farm/rendering/village-layout.mjs';
import {PASSER_PATHS,moveNPC,createWaypointWalker,chorePose} from '../games/korean-farm/rendering/npc-motion.mjs';
import {FESTIVAL_GUESTS,FESTIVAL_THEMES,festivalSceneState}
  from '../games/korean-farm/rendering/festival-ambience.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILES=['rendering/village-scene.js','rendering/village-layout.mjs','game.js'];
const sceneFile=fs.readFileSync(path.join(ROOT,'games/korean-farm/rendering/village-scene.js'),'utf8');
const gameFile=fs.readFileSync(path.join(ROOT,'games/korean-farm/game.js'),'utf8');
const peopleFile=fs.readFileSync(path.join(ROOT,'games/korean-farm/rendering/village-people.js'),'utf8');

test('Solnaeri has distinctive Korean village areas, not a duplicate suburban model',()=>{
  const landmarks=VILLAGE_LANDMARKS.map(x=>x.id);
  assert.equal(new Set(landmarks).size,landmarks.length);
  for(const name of ['house','shed','yard','market','cart','pyeongsang','ditch'])
    assert.ok(landmarks.includes(name),name);
  for(const content of ['onggi-jar','red-pepper-drying-rack','wooden-pyeongsang',
    'grain-shed','country-path-pebbles','irrigation-ditch-and-reeds','farm-road-market-corner'])
    assert.match(sceneFile,new RegExp(content));
  assert.match(sceneFile,/gableRoof/);
  assert.match(sceneFile,/0x4b86a5/); // blue tin roof
  assert.match(sceneFile,/buildSolnaeriVillage/);
  assert.match(gameFile,/villageScene=buildSolnaeriVillage\(scene\)/);
  assert.doesNotMatch(gameFile,/placeModel\('farmhouse'/);
  assert.doesNotMatch(gameFile,/placeModel\('barn'/);
});
test('all landmarks stay within the 48×48 farm and clear existing field geometry',()=>{
  for(const place of VILLAGE_LANDMARKS){
    assert.ok(Number.isFinite(place.x)&&Number.isFinite(place.z));
    assert.ok(place.w>0&&place.d>0);
    assert.ok(Math.abs(place.x)+place.w/2<24.1,place.id+' out of x');
    assert.ok(Math.abs(place.z)+place.d/2<24.1,place.id+' out of z');
    for(const field of FIELD_DEFS)
      assert.equal(plotLandscapeOverlap(field,place),false,place.id+' overlaps '+field.id);
  }
});
test('village colliders match significant 3D props and leave starting farm actions open',()=>{
  const spawn=makeFarmState().player;
  assert.equal(intersectsVillageCollision(spawn),false);
  for(const field of FIELD_DEFS){
    assert.equal(intersectsVillageCollision({x:field.x,z:field.z}),false,field.id);
  }
  assert.equal(intersectsVillageCollision({x:10.1,z:-13}),true,'house should be solid');
  assert.equal(intersectsVillageCollision({x:18,z:-12}),true,'shed should be solid');
  assert.equal(intersectsVillageCollision({x:8.5,z:14}),true,'market should be solid');
  assert.equal(intersectsVillageCollision({x:14.55,z:-10.65}),true,'platform should be solid');
  assert.equal(intersectsVillageCollision({x:0,z:9}),false,'farm lane must be open');
  assert.equal(intersectsVillageCollision({x:-6.6,z:2.2}),false,'rice field approach must be open');
  assert.ok(VILLAGE_COLLIDERS.length>=5);
});
test('village rendering reuses efficient instancing, color materials and cleanup',()=>{
  assert.match(sceneFile,/InstancedMesh/);
  assert.match(sceneFile,/colorSpace=THREE\.SRGBColorSpace/);
  assert.match(sceneFile,/matCache/);
  assert.match(sceneFile,/dispose\(\)/);
  assert.match(gameFile,/villageScene\?\.dispose\(\)/);
  for(const p of FILES)execFileSync(process.execPath,['--check',
    path.join(ROOT,'games/korean-farm',p)],{stdio:'pipe'});
});
test('four seasonal festivals activate a five-person crowd and unique market colors',()=>{
  assert.equal(FESTIVAL_GUESTS.length,5);
  assert.deepEqual(Object.keys(FESTIVAL_THEMES),['봄','여름','가을','겨울']);
  const unique=new Set(Object.values(FESTIVAL_THEMES).map(t=>t.colors.join('-')));
  assert.equal(unique.size,4,'each season should look different');
  for(const season of Object.keys(FESTIVAL_THEMES)){
    const upcoming=festivalSceneState({season,open:false});
    const active=festivalSceneState({season,open:true,completed:false});
    const finished=festivalSceneState({season,open:true,completed:true});
    assert.equal(upcoming.visitors,0);
    assert.equal(active.visitors,5);
    assert.equal(active.completed,false);
    assert.equal(finished.completed,true);
  }
  const placements=new Set();
  for(const guest of FESTIVAL_GUESTS){
    assert.ok(guest.x>=-6&&guest.x<=4&&guest.z>=15&&guest.z<=20,guest.name);
    assert.ok(Math.hypot(guest.x+1.1,guest.z-14.3)>2.3,guest.name+' blocks coordinator');
    assert.equal(intersectsVillageCollision(guest),false,guest.name+' overlaps a solid building');
    assert.ok(!placements.has(guest.x+':'+guest.z),guest.name+' duplicated');
    placements.add(guest.x+':'+guest.z);
  }
  assert.match(peopleFile,/solnaeri-festival-visitors/);
  assert.match(peopleFile,/solnaeri-festival-harvest/);
  assert.match(peopleFile,/solnaeri-festival-cheers/);
  assert.match(peopleFile,/confettiGeometry\.dispose\(\)/);
  assert.match(gameFile,/villagePeople\?\.celebrate\(\)/);
  execFileSync(process.execPath,['--check',path.join(ROOT,'games/korean-farm/rendering/village-people.js')]);
});

test('NPCs reach actual destinations and stop stepping while doing chores',()=>{
  const origin={x:0,z:0},target={x:4,z:0};
  let at=origin,distance=0,steps=0;
  for(let n=0;n<35;n++){const next=moveNPC(at,target,.2,.8);distance+=next.distance;at=next;steps++}
  assert.ok(distance>4-.05);
  assert.equal(at.x,4);
  assert.equal(moveNPC(at,target,.2,.8).moving,false);
  assert.equal(chorePose('sweep',0).left!==chorePose('rest',0).left,true);
  assert.equal(PASSER_PATHS.length,2);
  for(const route of PASSER_PATHS){
    for(const p of route)assert.equal(intersectsVillageCollision(p),false,'passer cannot enter a building');
    const walker=createWaypointWalker(route,1.2);
    let moved=0,paused=0;
    for(let i=0;i<600;i++){
      const before=walker.state.distance;
      const snapshot=walker.update(.1);
      moved+=snapshot.distance-before;
      if(!snapshot.walking)paused++;
      assert.equal(intersectsVillageCollision(snapshot),false,'passer waypoint segment intersects a building');
    }
    assert.ok(moved>6,'passes through multiple waypoints rather than rocking in place');
    assert.ok(paused>10,'briefly rests at route stops');
  }
  assert.match(peopleFile,/npcLocations/);
  assert.match(peopleFile,/animateResident/);
  assert.match(gameFile,/station\.target\.position\.x=peoplePos\[role\]\.x/);
});
