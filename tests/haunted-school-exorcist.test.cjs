'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('games/high_haunted_school_exorcist/index.html');
const js=read('games/high_haunted_school_exorcist/game.js');
const games=JSON.parse(read('data/games.json')).games;

test('3D school gameplay is a parseable local Three.js module',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:js,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/src="\.\/game\.js\?v=6"/);
  assert.match(js,/new THREE\.WebGLRenderer/);
  assert.match(js,/new THREE\.PerspectiveCamera/);
  assert.match(js,/GLTFLoader/);
  assert.match(js,/cloneSkeleton/);
  assert.doesNotMatch(js,/\/chibi\/|ChibiCharacters|allinonepr/i);
});

test('game html exposes every direct DOM control requested by the module',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  const required=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
  assert.ok(required.length>=20,'expected complete HUD and mobile controls');
  for(const id of required)assert.ok(ids.has(id),'missing HTML id: '+id);
  for(const id of ['game','joystick','knob','action','flash','intro','end','health','gazeValue','gazeLabel','progress','minimap','navigation','navArrow','lesson','lessonTitle','reticle'])assert.ok(ids.has(id),id);
});

test('the demo contains two mechanically distinct ghosts and a complete return-to-office ending',()=>{
  assert.match(js,/fixPositions=\[/);
  assert.match(js,/fixes===3/);
  assert.match(js,/maiden\.charge/);
  assert.match(js,/gazingAtGhost\(\)/);
  assert.match(js,/maidenPhase='approach'/);
  assert.match(js,/function beginMaidenPractice\(/);
  assert.match(js,/function beginMaidenHunt\(/);
  assert.match(js,/item\.type==='trick'/);
  assert.match(js,/item\.type==='maiden'/);
  assert.match(js,/item\.type==='report'/);
  assert.match(js,/finish\(true\)/);
  assert.match(js,/finish\(false\)/);
  assert.match(js,/window\.KidscadeGame\?\.result/);
});

test('movement and target visibility are implemented for desktop and touch controls',()=>{
  assert.match(js,/function canWalk/);
  assert.match(js,/function onFloor/);
  assert.match(js,/function collides/);
  assert.match(js,/pointerdown/);
  assert.match(js,/pointermove/);
  assert.match(js,/pointercancel/);
  assert.match(js,/keys\.has\('w'\)/);
  assert.match(js,/keys\.has\('arrowup'\)/);
  assert.match(js,/torch\.intensity=/);
  assert.match(js,/Math\.max\(0,maiden\.charge-dt\*\.11\)/);
  assert.match(js,/if\(distance<1\.18&&invulnerable<=0&&clearGhostSight/);
});

test('required shared school assets exist and the character skin is repaired',()=>{
  const files=[
    'assets/game/npcs/glTF/Casual_Male.gltf',
    'assets/game/3d/interiors/kenney-furniture-kit/desk.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/chair-desk.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/bookcase-open.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/table.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/computer-screen.glb',
    'assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost.glb'
  ];
  for(const file of files)assert.ok(fs.existsSync(path.join(root,file)),'missing shared 3D asset '+file);
  assert.match(js,/function repairCharacterSkin/);
  assert.match(js,/repairCharacterSkin\(model\)/);
});

test('new game is uniquely registered without altering the original night guard',()=>{
  assert.equal(games.filter(x=>x.id==='high_haunted_school_exorcist').length,1);
  const created=games.find(x=>x.id==='high_haunted_school_exorcist');
  assert.match(created.href,/games\/high_haunted_school_exorcist\/index\.html/);
  assert.deepEqual(created.players,['solo']);
  assert.ok(created.input.includes('touch')&&created.input.includes('keyboard'));
  assert.ok(games.some(x=>x.id==='high_folklore_night_guard'));
});

test('beginner route trail finds paths around walls instead of pointing through them',()=>{
  const start=js.indexOf('function routePlan('),end=js.indexOf('function navigationTarget()',start);
  assert.ok(start>=0&&end>start);
  const canWalk=(x,z)=>x>=-1&&x<=5&&z>=-3&&z<=3&&!(x>=1&&x<=2&&z>-.75&&z<.75);
  const plan=new Function('canWalk',js.slice(start,end)+'return routePlan;')(canWalk);
  const path=plan({x:0,z:0},{x:3,z:0},.7);
  assert.ok(path.length>=8,'path should go around the blocked wall');
  assert.ok(path.every(p=>canWalk(p.x,p.z)),'every guide step should be on navigable floor');
  assert.ok(path.some(p=>Math.abs(p.z)>=1),'path detours around obstacle');
});

test('gaze cannot detect a ghost through a solid classroom wall',()=>{
  const start=js.indexOf('function segmentHitsRect('),end=js.indexOf('function gazingAtGhost()',start);
  assert.ok(start>=0&&end>start);
  const walls=[{x:5.4,z:-3,hx:2.3,hz:.145}];
  const functions=vm.runInNewContext(js.slice(start,end)+'({clearGhostSight,segmentHitsRect})',{walls});
  assert.equal(functions.clearGhostSight(4,-1.5,12,-10),false,'wall must block sight');
  assert.equal(functions.clearGhostSight(10,-4,12,-10),true,'unobstructed sight works');
});

test('first maiden encounter is a safe rehearsal and teaches before the chase',()=>{
  assert.match(js,/if\(maidenPhase==='approach'\)/);
  assert.match(js,/beginMaidenPractice\(\)/);
  assert.match(js,/if\(maidenPhase==='practice'\)/);
  assert.match(js,/if\(maiden\.charge>=1\.8\)beginMaidenHunt\(\)/);
  assert.match(js,/maidenPhase='hunt';maiden\.charge=0;ghostWaiting=6/);
  assert.match(js,/ghostWaiting=10/);
  assert.match(js,/lastMistake='처녀귀신/);
  assert.match(js,/생명이 모두 소진됐어요/);
});

test('beginner experience includes wayfinding, actionable hints, and camera obstruction repair',()=>{
  assert.match(js,/function updateNavigation\(dt,force=false\)/);
  assert.match(js,/function setGuidePath\(path\)/);
  assert.match(js,/routePlan\(player,target,1\.15\)/);
  assert.match(js,/첫 조사까지 노란 길 안내/);
  assert.match(js,/showLesson\('첫 임무/);
  assert.match(js,/showLesson\('첫 만남/);
  assert.match(js,/showLesson\('관찰 성공/);
  assert.match(js,/camera\.position\.lerp\(safe/);
  assert.match(js,/ui\.reticle\.classList\.toggle\('locked'/);
  assert.match(html,/id="navRange"/);
  assert.match(html,/id="lessonText"/);
});

test('first encounter remains harmless until the player learns the stare mechanic',()=>{
  const start=js.indexOf('function segmentHitsRect('),end=js.indexOf('function updatePlayer(dt){',start);
  assert.ok(start>=0&&end>start);
  const simulation=new Function('aim',`
    const walls=[],furniture=[];
    const player={x:-10.5,z:-14.8};
    const maiden={x:25.5,z:-16.8,speed:1.2,charge:0,attacks:0,root:{visible:false,position:{set(){}},rotation:{y:0}}};
    const forward={x:0,z:0,set(x,y,z){this.x=x;this.z=z}};
    let stage=2,hp=3,elapsed=0,invulnerable=0,ghostWaiting=0,ghostNav=null,gazeLocked=false,maidenPhase='approach',viewYaw=0;
    const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    const canWalk=()=>true,routePlan=(a,b)=>[{x:a.x,z:a.z},{x:b.x,z:b.z}];
    function showLesson(){}function showToast(){}function sfx(){}function updateNavigation(){}
    function finish(){throw Error('unexpected beginner failure');}
    function setStage(next){stage=next;}
    ${js.slice(start,end)}
    function tick(seconds){
      for(let i=0;i<seconds*20&&stage===2;i++){elapsed+=.05;invulnerable=Math.max(0,invulnerable-.05);updateGhost(.05);}
    }
    tick(80);
    const safeBeforeEncounter=maidenPhase==='approach'&&hp===3&&maiden.root.visible===false;
    player.x=25.5;player.z=-13.8;
    viewYaw=aim?0:Math.PI;
    tick(2.1);
    const protectedPractice=aim?maidenPhase==='hunt'&&hp===3:maidenPhase==='practice'&&hp===3;
    tick(15);
    return {safeBeforeEncounter,protectedPractice,hp,stage,maidenPhase};
  `);
  const guided=simulation(true),unaware=simulation(false);
  assert.equal(guided.safeBeforeEncounter,true);
  assert.equal(guided.protectedPractice,true);
  assert.equal(guided.stage,3,'guided player should complete the gaze encounter');
  assert.equal(guided.hp,3);
  assert.equal(unaware.safeBeforeEncounter,true);
  assert.equal(unaware.protectedPractice,true);
  assert.equal(unaware.stage,2,'a player who has not practiced should not enter the lethal phase');
  assert.equal(unaware.hp,3);
});

test('walls and baseboards have no coplanar overlapping outer faces',()=>{
  const start=js.indexOf('const WALL_HEIGHT='),end=js.indexOf('function wallSplit(',start);
  assert.ok(start>=0&&end>start,'wall builder declarations exist');
  const boxes=[],walls=[],materials={wall:{name:'wall'},skirt:{name:'skirt'}};
  const cube=(scene,x,y,z,w,h,d,material)=>{boxes.push({x,y,z,w,h,d,material});};
  const wallFn=new Function('cube','scene','materials','walls',js.slice(start,end)+';return wall;')(cube,{},materials,walls);
  wallFn(3,2,5,.29);
  assert.equal(boxes.length,2,'wall consists of top and separate baseboard');
  const upper=boxes.find(x=>x.material===materials.wall),base=boxes.find(x=>x.material===materials.skirt);
  assert.ok(upper&&base);
  assert.ok(Math.abs(upper.y-upper.h/2-(base.y+base.h/2))<1e-10,'walls share only a zero-area boundary');
  assert.ok(upper.y-upper.h/2>=base.y+base.h/2-1e-10);
  assert.equal(walls.length,1,'collision wall remains unchanged');
});

test('player body faces the actual movement direction on W A S D and turned camera',()=>{
  const start=js.indexOf('function updatePlayer(dt){'),end=js.indexOf('function updateCamera(dt){',start);
  assert.ok(start>=0&&end>start);
  for(const [keysInput,yaw,wantX,wantZ] of [
    [['w'],0,0,-1],
    [['s'],0,0,1],
    [['a'],0,-1,0],
    [['d'],0,1,0],
    [['w'],Math.PI/2,-1,0],
    [['w'],Math.PI,0,1],
    [['w','d'],0,Math.SQRT1_2,-Math.SQRT1_2],
  ]){
    const keys=new Set(keysInput),joy={x:0,y:0};
    const root={position:{set(){}},rotation:{y:Math.PI}};
    const player={x:0,z:0,yaw:Math.PI,root,animation:null};
    const update=new Function('keys','joy','player','viewYaw','canWalk','invulnerable','elapsed',
      js.slice(start,end)+';return updatePlayer;')(keys,joy,player,yaw,()=>true,0,0);
    update(1);
    const moveX=player.x/Math.hypot(player.x,player.z),moveZ=player.z/Math.hypot(player.x,player.z);
    assert.ok(Math.abs(moveX-wantX)<.001,'expected movement X '+keysInput+' yaw '+yaw);
    assert.ok(Math.abs(moveZ-wantZ)<.001,'expected movement Z '+keysInput+' yaw '+yaw);
    // The shared Casual_Male.gltf has its visual forward in LOCAL +Z, like teacher simulator.
    const faceX=Math.sin(root.rotation.y),faceZ=Math.cos(root.rotation.y);
    assert.ok(Math.abs(faceX-moveX)<.001,'body faces walk X '+keysInput+' yaw '+yaw);
    assert.ok(Math.abs(faceZ-moveZ)<.001,'body faces walk Z '+keysInput+' yaw '+yaw);
  }
  assert.match(js,/player\.yaw=Math\.PI\/2;player\.root\.rotation\.y=player\.yaw/,'retry direction resets too');
});


test('ㄷ-shaped campus keeps west guard office connected to all fifteen rooms',()=>{
  assert.match(js,/const SCHOOL=\{/);
  assert.match(js,/NORTH_ROOMS=\[/);
  assert.match(js,/SOUTH_ROOMS=\[/);
  assert.match(js,/SPINE_ROOMS=\[/);
  const layout=js.match(/const SCHOOL=(\{[\s\S]*?\});/);
  assert.ok(layout,'school coordinates');
  const school=new Function(layout[0]+'return SCHOOL;')();
  const walls=[],furniture=[],labels=[];
  const scene={add(){}},THREE={
    MeshStandardMaterial:class{},MeshBasicMaterial:class{},DoubleSide:1,
    Mesh:class{constructor(){this.position={set(){}}}},IcosahedronGeometry:class{},Color:class{}
  };
  const cube=()=>({material:{emissive:{}},userData:{}});
  const wall=(x,z,w,d)=>walls.push({x,z,hx:w/2,hz:d/2});
  const ground=()=>{};
  const addLabel=(...args)=>labels.push(args);
  const createMark=()=>({scale:{setScalar(){}},userData:{}});
  const placeFurniture=(file,x,z,height,rot,box)=>{
    if(box)furniture.push({x,z,hx:box[0]/2,hz:box[1]/2});
    return {position:{y:0}};
  };
  const mat=()=>({});
  const materials={wall:{},skirt:{}};
  const north=['6-1 교실','6-2 교실','음악실','미술실','과학실'];
  const south=['5-1 교실','5-2 교실','컴퓨터실','방송실','가사실'];
  const spine=['자료실','보건실','관리실','전기실','교무실'];
  const layoutFunctions=js.slice(js.indexOf('function windowWall('),js.indexOf('createRoom();'));
  const create=new Function('SCHOOL','walls','scene','THREE','cube','wall','ground','addLabel','createMark',
     'placeFurniture','mat','materials','NORTH_ROOMS','SOUTH_ROOMS','SPINE_ROOMS',
     layoutFunctions+'return createRoom;')(
     school,walls,scene,THREE,cube,wall,ground,addLabel,createMark,
     placeFurniture,mat,materials,north,south,spine);
  create();
  assert.equal(north.length+south.length+spine.length,15);
  assert.deepEqual(labels.map(l=>l[0]).sort(),[...north,...south,...spine].sort());
  const physics=js.slice(js.indexOf('function collides('),js.indexOf('function navigationTarget()'));
  const navigation=new Function('walls','furniture',physics+'return {canWalk,routePlan};')(walls,furniture);
  assert.equal(navigation.canWalk(school.guard.x,school.guard.z),true,'guard starts in the office');
  assert.equal(navigation.canWalk(8,0),false,'the central courtyard must not be walkable');
  for(const target of [
    ...school.roomCenters.map(x=>({x,z:-13.2})),
    ...school.roomCenters.map(x=>({x,z:13.2})),
    ...[-16,-8,0,8,16].map(z=>({x:-24.2,z})),
    {x:-12.7,z:-12.85},{x:-8.3,z:-14.2},{x:-11.3,z:-18.1},
    {x:school.science.x,z:-13.1}
  ]){
    const path=navigation.routePlan(school.guard,target,1.05);
    assert.ok(path.length>0,'guard can reach '+JSON.stringify(target));
    assert.ok(path.every(p=>navigation.canWalk(p.x,p.z)),'path never crosses a wall or furniture');
    assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).z-target.z)<1.05,'close enough to target');
  }
  // Unlike static A*, moving NPCs must not cut classroom door corners.
  const wolfSrc=js.slice(js.indexOf('function moveWolfToward(target,dt){'),js.indexOf('function updateNewEncounters(dt){'));
  const maidenSrc=js.slice(js.indexOf('function advanceGhostToward(target,dt){'),js.indexOf('function beginMaidenPractice(){'));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  for(const frameStep of [.0167,.0333,.045]){
    const encounter={wolf:{x:-1.5,z:16.8,speed:2.25,nav:null,root:{rotation:{y:0}}}};
    const chaseWolf=new Function('encounter','routePlan','dist','canWalk',wolfSrc+'return moveWolfToward;')(
      encounter,navigation.routePlan,dist,navigation.canWalk);
    let wolfDone=false;
    for(let i=0;i<Math.ceil(26/frameStep);i++){
      chaseWolf({x:-10.5,z:14},frameStep);
      const w=encounter.wolf;
      assert.ok(navigation.canWalk(w.x,w.z),'wolf never clips through classroom walls');
      if(dist(w,{x:-10.5,z:14})<1.8){wolfDone=true;break;}
    }
    assert.ok(wolfDone,'wolf must reach the trap inside 26 seconds at frame dt '+frameStep);
    const maiden={x:25.5,z:-16.8,speed:1.2,root:{rotation:{y:0}}};
    const chaseMaiden=new Function('maiden','ghostNav','routePlan','dist','canWalk',maidenSrc+'return advanceGhostToward;')(
      maiden,null,navigation.routePlan,dist,navigation.canWalk);
    let maidenDone=false;
    for(let i=0;i<Math.ceil(33/frameStep);i++){
      chaseMaiden({x:7.5,z:-14},frameStep);
      assert.ok(navigation.canWalk(maiden.x,maiden.z),'maiden never clips through classroom walls');
      if(dist(maiden,{x:7.5,z:-14})<1.8){maidenDone=true;break;}
    }
    assert.ok(maidenDone,'maiden must reach music room without door-corner stall at '+frameStep);
  }
  // Closed reaper doors must block physical passage but reopen for the seal.
  const doorState={doorClosed:false};
  const realDoors=new Function('walls','furniture','encounter',physics+'return {canWalk,routePlan};')(
    walls,furniture,doorState);
  const doorFrom={x:-19.2,z:8},doorInside={x:-24.2,z:8};
  assert.ok(realDoors.routePlan(doorFrom,doorInside,1).length>0,'open door is passable');
  doorState.doorClosed=true;
  assert.equal(realDoors.routePlan(doorFrom,doorInside,1).length,0,'closed door blocks the room');
  doorState.doorClosed=false;
  assert.ok(realDoors.routePlan(doorFrom,doorInside,1).length>0,'reopened door restores route');
});

test('the navigation trail is visible only until the first tutorial anomaly is fixed',()=>{
  const start=js.indexOf('function updateNavigation(dt,force=false){');
  const end=js.indexOf('function showLesson(',start);
  assert.ok(start>=0&&end>start);
  const ui={navigation:{classList:{hidden:false,toggle(name,hidden){this.hidden=hidden}}},
    navArrow:{style:{}},navTitle:{textContent:''},navRange:{textContent:''}};
  const player={x:0,z:0};
  const guide={mesh:null,points:[],key:'',clock:0,fromX:0,fromZ:0,goalX:0,goalZ:0};
  const fakeTarget={key:'fix0',name:'first object',x:5,z:0};
  let fixes=0,stage=1,started=true,viewYaw=0;
  const state=new Function('ui','player','guidance','navigationTarget','routePlan','setGuidePath','viewYaw',
    'startedRef',js.slice(start,end)+'return updateNavigation;');
  const run=new Function('ui','player','guidance','navigationTarget','routePlan','viewYaw',
    'let fixes=0,stage=1,started=true;'+
    'const setGuidePath=(points)=>{guidance.points=points;guidance.mesh=points.length?{}:null;};'+
    js.slice(start,end)+
    'updateNavigation(0,true);const first={hidden:ui.navigation.classList.hidden,trail:guidance.points.length};'+
    'fixes=1;updateNavigation(0,true);const second={hidden:ui.navigation.classList.hidden,trail:guidance.points.length};'+
    'stage=4;updateNavigation(0,true);return {first,second,lastHidden:ui.navigation.classList.hidden};'
  );
  const result=run(ui,player,guide,()=>fakeTarget,()=>[{x:0,z:0},{x:5,z:0}],0);
  assert.equal(result.first.hidden,false);
  assert.equal(result.first.trail,2);
  assert.equal(result.second.hidden,true);
  assert.equal(result.second.trail,0);
  assert.equal(result.lastHidden,true);
});


test('six anomalies use different rituals without an ever-present navigation trail',()=>{
  assert.match(js,/const stageNames=\[/);
  assert.match(js,/stage===12&&dist\(player,SCHOOL\.guard\)/);
  assert.match(js,/encounter\.cold>=3\)setStage\(5\)/);
  assert.match(js,/encounter\.eggCharge>=4/);
  assert.match(js,/encounter\.bellCount>=3&&encounter\.bellWindow>0/);
  assert.match(js,/encounter\.wolf\.ready&&dist\(player,wolfTrap\)/);
  assert.match(js,/stage===1&&fixes===0/);
  assert.match(js,/Animals\/glTF\/Wolf\.gltf/);
  assert.match(js,/npcs\/glTF\/Casual_Female\.gltf/);
  assert.match(js,/ultimate-monsters-bundle\/ghost-skull\.glb/);
  for(const ghost of ['도깨비','처녀귀신','유키온나','달걀귀신','저승사자','늑대인간']){
    assert.ok(html.includes(ghost),ghost+' should have clear directions');
  }
});

function simulateExtraAnomaly(mode){
  const start=js.indexOf('function takeAnomalyHit('),end=js.indexOf('function updatePlayer(dt){',start);
  assert.ok(start>=0&&end>start);
  const definitions=[
    "let stage=mode==='eggAway'||mode==='eggStare'?6:mode==='bell'?8:mode==='wolf'?11:4;",
    "let started=true,ended=false,paused=false,hp=3,invulnerable=0,elapsed=0,viewYaw=mode==='eggAway'?Math.PI:0,lastMistake='';",
    "const player={x:mode.startsWith('egg')?7.5:mode==='bell'?-20.35:mode==='wolf'?-7.5:25.5,z:mode.startsWith('egg')?-14:mode==='bell'?8:mode==='wolf'?8.55:15.5,yaw:0};",
    "const eggLocation={x:7.5,z:-17.35},bellDoor={x:-20.35,z:8},wolfTrap={x:-10.5,z:14};",
    "const encounter={frost:0,eggCharge:0,eggFear:0,cold:0,bellCount:0,bellClock:1,bellWindow:0,wolf:{x:-1.5,z:16.8,speed:2.25,root:{position:{set(){}},rotation:{y:0}},nav:null,grace:7,lureTime:26,ready:false,active:true}};",
    "const yuki={root:{position:{y:0},rotation:{y:0}}};",
    "const ui={reticle:{classList:{toggle(){}},style:{}}},SCHOOL={guard:{x:-24.2,z:0}};",
    "const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clearGhostSight=()=>true,canWalk=()=>true,routePlan=(a,b)=>[{x:a.x,z:a.z},{x:b.x,z:b.z}];",
    "const alerts=[];function sfx(){}function showLesson(){}function showToast(t){alerts.push(t)}function finish(ok){ended=true;}",
    "function setStage(n){stage=n;}"
  ];
  const execution=[
    "const budget=mode==='wolf'?300:mode==='bell'?120:mode==='eggAway'||mode==='eggStare'?100:760;",
    "for(let i=0;i<budget;i++){elapsed+=.05;invulnerable=Math.max(0,invulnerable-.05);updateNewEncounters(.05);if((stage!==6&&mode.startsWith('egg'))||(mode==='wolf'&&encounter.wolf.ready)||(mode==='yuki'&&hp<3))break;}",
    "return {stage,hp,eggCharge:encounter.eggCharge,bellCount:encounter.bellCount,bellWindow:encounter.bellWindow,wolfReady:encounter.wolf.ready,wolfTime:encounter.wolf.lureTime,alerts};"
  ];
  return new Function('mode',[...definitions,js.slice(start,end),...execution].join('\n'))(mode);
}

test('egg rewards looking away and punishes looking at its featureless face',()=>{
  const away=simulateExtraAnomaly('eggAway'),stare=simulateExtraAnomaly('eggStare');
  assert.equal(away.stage,7);
  assert.equal(away.hp,3);
  assert.equal(stare.stage,6);
  assert.equal(stare.hp,2);
});

test('Yuki-onna freezes stationary players unless they restore the heaters',()=>{
  const result=simulateExtraAnomaly('yuki');
  assert.equal(result.hp,2);
  assert.equal(result.stage,4);
});

test('reaper provides three audible bells and a timely door-closing window',()=>{
  const result=simulateExtraAnomaly('bell');
  assert.equal(result.bellCount,3);
  assert.ok(result.bellWindow>0);
  assert.ok(result.alerts.some(x=>x.includes('세 번째 종')));
});

test('wolf chases the decoy sound into the sealable trap before the timer ends',()=>{
  const result=simulateExtraAnomaly('wolf');
  assert.equal(result.stage,11);
  assert.equal(result.wolfReady,true);
  assert.ok(result.wolfTime>0);
});


test('narrow mobile widths avoid map overlap and keep game controls visible',()=>{
  assert.match(html,/#missionPanel\{left:7px;top:73px;width:min\(285px,57vw,calc\(100vw - 160px\)\)/);
  assert.match(html,/#lesson\{bottom:135px/);
  assert.match(html,/#gaze\{bottom:129px/);
  for(const vw of [280,320,360,375,430]){
    const missionRight=7+Math.min(285,vw*.57,vw-160);
    const mapLeft=vw-7-128-10-2;
    assert.ok(missionRight<=mapLeft-3,'mission and minimap overlap on '+vw+'px');
  }
});

test('a timed closed reaper door reopens before the required inner seal',()=>{
  assert.match(js,/encounter\.doorRelease=1\.6/);
  assert.match(js,/if\(stage===9&&encounter\.doorClosed\)/);
  assert.match(js,/encounter\.doorVisual\.rotation\.y=-1\.30/);
  assert.match(js,/encounter\.doorClosed=false/);
});
