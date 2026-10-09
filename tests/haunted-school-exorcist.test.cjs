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
  assert.match(html,/src="\.\/game\.js\?v=13"/);
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
  assert.match(js,/노란 선을 따라 이동/);
  assert.match(js,/showLesson\('첫 임무/);
  assert.match(js,/showLesson\('첫 만남/);
  assert.match(js,/showLesson\('관찰 성공/);
  assert.match(js,/camera\.position\.set\(player\.x,FIRST_PERSON_EYE_HEIGHT,player\.z\)/);
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
    let stage=2,hp=3,elapsed=0,invulnerable=0,ghostWaiting=0,ghostNav=null,gazeLocked=false,maidenPhase='approach',viewYaw=0,viewPitch=0;
    const FIRST_PERSON_EYE_HEIGHT=1.62;
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

test('WASD movement never changes where the first-person character faces',()=>{
  const start=js.indexOf('function updatePlayer(dt){'),end=js.indexOf('function updateCamera(dt){',start);
  assert.ok(start>=0&&end>start);
  for(const [ks,yaw,x,z] of [
    [['w'],0,0,-1],[['s'],0,0,1],[['a'],0,-1,0],[['d'],0,1,0],
    [['w'],Math.PI/2,-1,0],[['w'],Math.PI,0,1],
    [['w','d'],0,Math.SQRT1_2,-Math.SQRT1_2]
  ]){
    const keys=new Set(ks),joy={x:0,y:0};
    const player={x:0,z:0,yaw:0,root:{position:{set(){}},rotation:{y:0}},animation:null};
    const update=new Function('keys','joy','player','viewYaw','canWalk','invulnerable','elapsed',
      js.slice(start,end)+'return updatePlayer;')(keys,joy,player,yaw,()=>true,0,0);
    update(1);
    const len=Math.hypot(player.x,player.z);
    assert.ok(Math.abs(player.x/len-x)<.001,'move X '+ks);
    assert.ok(Math.abs(player.z/len-z)<.001,'move Z '+ks);
    assert.ok(Math.abs(Math.sin(player.root.rotation.y)+Math.sin(yaw))<.001,'face X '+ks);
    assert.ok(Math.abs(Math.cos(player.root.rotation.y)+Math.cos(yaw))<.001,'face Z '+ks);
  }
  assert.match(js,/player\.root\.visible=false/);
  assert.match(js,/player\.yaw=viewYaw\+Math\.PI/);
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
    'let fixes=0,stage=1,started=true,guideAssistance=false;'+
    'const setGuidePath=(points)=>{guidance.points=points;guidance.mesh=points.length?{}:null;};'+
    js.slice(start,end)+
    'updateNavigation(0,true);const first={hidden:ui.navigation.classList.hidden,trail:guidance.points.length};'+
    'fixes=1;updateNavigation(0,true);const second={hidden:ui.navigation.classList.hidden,trail:guidance.points.length};'+
    'stage=4;updateNavigation(0,true);const lastHidden=ui.navigation.classList.hidden;'+
    'guideAssistance=true;updateNavigation(0,true);return {first,second,lastHidden,optional:{hidden:ui.navigation.classList.hidden,trail:guidance.points.length}};'
  );
  const result=run(ui,player,guide,()=>fakeTarget,()=>[{x:0,z:0},{x:5,z:0}],0);
  assert.equal(result.first.hidden,false);
  assert.equal(result.first.trail,2);
  assert.equal(result.second.hidden,true);
  assert.equal(result.second.trail,0);
  assert.equal(result.lastHidden,true);
  assert.equal(result.optional.hidden,false,'H key restores guidance for later missions');
  assert.equal(result.optional.trail,2);
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
    "const FIRST_PERSON_EYE_HEIGHT=1.62;let viewPitch=0;",
    "let stage=mode==='eggAway'||mode==='eggStare'?6:mode==='bell'?8:mode==='wolf'?11:4;",
    "let started=true,ended=false,paused=false,hp=3,invulnerable=0,elapsed=0,viewYaw=mode==='eggAway'?Math.PI:0,lastMistake='';",
    "const player={x:mode.startsWith('egg')?7.5:mode==='bell'?-20.35:mode==='wolf'?-7.5:25.5,z:mode.startsWith('egg')?-14:mode==='bell'?8:mode==='wolf'?8.55:15.5,yaw:0};",
    "const eggLocation={x:7.5,z:-17.35},bellDoor={x:-20.35,z:8},wolfTrap={x:-10.5,z:14};",
    "const encounter={frost:0,eggCharge:0,eggFear:0,cold:0,bellCount:0,bellClock:1,bellWindow:0,wolf:{x:-1.5,z:16.8,speed:2.25,root:{position:{set(){}},rotation:{y:0}},nav:null,grace:7,lureTime:26,ready:false,active:true}};",
    "const yuki={root:{position:{y:0},rotation:{y:0,z:0}}},egg={root:{position:{y:0},rotation:{y:0,z:0},scale:{set(){}}}},reaper={root:{rotation:{y:0,z:0}}};",
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
  return new Function('mode',[...definitions,js.slice(js.indexOf('function playerLookDirection(){'),js.indexOf('function gazingAtGhost(){')),js.slice(start,end),...execution].join('\n'))(mode);
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


test('real Kenney furniture proportions are applied to collision footprint before models load',()=>{
  const begin=js.indexOf('const KIT_SIZE_RATIOS=');
  const end=js.indexOf('function normalize(root,height){',begin);
  assert.ok(begin>0&&end>begin);
  const furniture=[],THREE={Group:class{constructor(){this.position={set(){}};this.rotation={y:0}}}};
  const loadTemplate=()=>({then(){return{catch(){}}}});
  const place=new Function('THREE','scene','furniture','materials','cube','loadTemplate','FURN',
    js.slice(begin,end)+'return placeFurniture;')(
      THREE,{add(){}},furniture,{desk:{}},()=>{},loadTemplate,'');
  place('desk.glb',0,0,.78,0,[1.13,.66]);
  place('table.glb',3,0,.78,0,[1.13,.66]);
  place('bookcase-open.glb',8,0,1.75,Math.PI/2,[.55,.58]);
  place('chair-desk.glb',12,0,.77,0);
  assert.equal(furniture.length,4);
  assert.ok(furniture[0].hx>.70&&furniture[0].hz>.52,'desk blocks visible tabletop');
  assert.ok(furniture[1].hx>.95&&furniture[1].hz>.50,'large table blocks visible tabletop');
  assert.ok(furniture[2].hz>.38,'rotated bookcase footprint swaps width and depth');
  assert.ok(furniture[3].hx>.40,'office chair is no longer pass-through');
  assert.match(js,/const fixPositions=\[\[-12\.7,-12\.85\],\[-8\.2,-12\.55\]/);
  assert.match(js,/\[24\.0,11\.8,'난방 배관'\]/);
});


test('first-person camera sits precisely at the character eye and respects pitch',()=>{
  const start=js.indexOf('function updateCamera(dt){'),end=js.indexOf('function updateProps(dt){',start);
  const src=js.slice(js.indexOf('function playerLookDirection(){'),js.indexOf('function gazingAtGhost(){'))+
    js.slice(start,end);
  assert.ok(start>=0&&end>start);
  const player={x:2,z:-4},view={yaw:0,pitch:0};
  const camera={position:{set(x,y,z){this.x=x;this.y=y;this.z=z;}},lookAt(x,y,z){this.aim={x,y,z};}};
  const torch={position:{set(){}},intensity:0},torchTarget={position:{set(){}}};
  const code=src.replaceAll('viewYaw','view.yaw').replaceAll('viewPitch','view.pitch');
  const update=new Function('player','view','camera','torch','torchTarget','flashOn','power',
    'FIRST_PERSON_EYE_HEIGHT',code+'return updateCamera;')(
    player,view,camera,torch,torchTarget,true,100,1.62);
  for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI,.72])
    for(const pitch of [-.65,0,.65]){
      view.yaw=yaw;view.pitch=pitch;player.x+=.3;player.z-=.2;update(.0167);
      assert.equal(camera.position.x,player.x);
      assert.equal(camera.position.y,1.62);
      assert.equal(camera.position.z,player.z);
      const dx=(camera.aim.x-camera.position.x)/6,
        dy=(camera.aim.y-camera.position.y)/6,
        dz=(camera.aim.z-camera.position.z)/6;
      assert.ok(Math.abs(dx+Math.sin(yaw)*Math.cos(pitch))<1e-10);
      assert.ok(Math.abs(dy-Math.sin(pitch))<1e-10);
      assert.ok(Math.abs(dz+Math.cos(yaw)*Math.cos(pitch))<1e-10);
    }
});

test('camera stays eye-locked while moving, and the avatar turns when the view turns',()=>{
  const begin=js.indexOf('function updatePlayer(dt){'),cam=js.indexOf('function updateCamera(dt){',begin),
    end=js.indexOf('function updateProps(dt){',cam);
  const look=js.slice(js.indexOf('function playerLookDirection(){'),js.indexOf('function gazingAtGhost(){'));
  const keys=new Set(),joy={x:0,y:0},player={x:0,z:0,root:{position:{set(){}},rotation:{y:0}},animation:null};
  const view={yaw:-Math.PI/2,pitch:0};
  const camera={position:{set(x,y,z){this.x=x;this.y=y;this.z=z;}},lookAt(x,y,z){this.aim={x,y,z};}};
  const torch={position:{set(){}},intensity:0},torchTarget={position:{set(){}}};
  const source=(js.slice(begin,cam)+look+js.slice(cam,end)).replaceAll('viewYaw','view.yaw').replaceAll('viewPitch','view.pitch');
  const impl=new Function('keys','joy','player','view','canWalk','invulnerable','elapsed','camera',
    'torch','torchTarget','flashOn','power','FIRST_PERSON_EYE_HEIGHT',source+
    'return {updatePlayer,updateCamera};')(keys,joy,player,view,()=>true,0,0,camera,
    torch,torchTarget,true,100,1.62);
  for(const command of ['w','a','s','d','w+d','idle']){
    keys.clear();for(const k of command.split('+'))if(k!=='idle')keys.add(k);
    for(let k=0;k<50;k++){
      impl.updatePlayer(.0167);impl.updateCamera(.0167);
      assert.equal(camera.position.x,player.x);
      assert.equal(camera.position.z,player.z);
      assert.ok(Math.abs(Math.sin(player.root.rotation.y-(view.yaw+Math.PI)))<1e-10);
    }
  }
  view.yaw+=.4;view.pitch=.3;impl.updatePlayer(.0167);impl.updateCamera(.0167);
  assert.ok(Math.abs(Math.sin(player.root.rotation.y-(view.yaw+Math.PI)))<1e-10);
  assert.ok(camera.aim.y>1.62);
});

test('first-person has no chase rig, and looking changes the torch direction',()=>{
  assert.match(js,/const FIRST_PERSON_EYE_HEIGHT=1\.62/);
  assert.match(js,/camera\.position\.set\(player\.x,FIRST_PERSON_EYE_HEIGHT,player\.z\)/);
  assert.match(js,/torchTarget\.position\.set\(/);
  assert.match(js,/viewPitch=Math\.max\(-\.72,Math\.min\(\.72/);
  assert.doesNotMatch(js,/CAMERA_FOLLOW|cameraFollowState|cameraFollowTarget/);
});



test('eyes detect the maiden only when the actual first-person view looks at her',()=>{
  const start=js.indexOf('function segmentHitsRect('),end=js.indexOf('function advanceGhostToward(',start);
  assert.ok(start>=0&&end>start);
  const player={x:0,z:0},maiden={x:0,z:-5};
  const walls=[],view={yaw:0,pitch:0};
  const source=js.slice(start,end).replaceAll('viewYaw','view.yaw').replaceAll('viewPitch','view.pitch');
  const gaze=new Function('player','maiden','walls','view','FIRST_PERSON_EYE_HEIGHT',
    source+'return gazingAtGhost;')(player,maiden,walls,view,1.62);
  assert.equal(gaze(),true,'ghost straight ahead and at eye level should be seen');
  view.yaw=Math.PI/2;
  assert.equal(gaze(),false,'turning head sideways breaks eye contact');
  view.yaw=Math.PI;
  assert.equal(gaze(),false,'turning around breaks eye contact');
  view.yaw=0;view.pitch=.72;
  assert.equal(gaze(),false,'looking at ceiling is not looking at the ghost');
  view.pitch=0;
  walls.push({x:0,z:-2.5,hx:2,hz:.2});
  assert.equal(gaze(),false,'school wall interrupts first-person sight');
});

test('first-person control instructions agree with the fixed eye camera',()=>{
  assert.match(html,/1인칭 시점/);
  assert.match(html,/카메라는 캐릭터의 눈과 같습니다/);
  assert.match(html,/화면을 돌려 진짜로 등을 돌린 채 4초/);
  assert.match(js,/ui\.reticle\.classList\.toggle\('hidden',!started\|\|ended\|\|!!hidingLocker\)/);
});


test('five user-supplied Sketchfab horror GLBs are wired into their proper encounters',()=>{
  const mapping={
    maiden:'ghost_girl_animated.glb',
    yuki:'ghost_woman_a-pose.glb',
    egg:'black_horror_alien_humanoid.glb',
    reaper:'hooded_figure_with_scythe.glb',
    wolf:'werewolf.glb'
  };
  assert.match(js,/const HORROR_MODELS=Object\.freeze\(\{/);
  assert.match(js,/function loadHorrorAsset\(kind\)/);
  assert.match(js,/function installHorrorAsset\(kind,gltf,url\)/);
  const start=js.indexOf('const HORROR_MODELS=Object.freeze(');
  const end=js.indexOf('const AUDIO=',start);
  const MONSTER='../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost.glb';
  const specs=new Function('MONSTER',js.slice(start,end)+'return HORROR_MODELS;')(MONSTER);
  assert.deepEqual(Object.keys(specs).sort(),Object.keys(mapping).sort());
  for(const [kind,file] of Object.entries(mapping)){
    const expected='../../assets/more%20assets/'+file;
    assert.equal(specs[kind].url,expected,kind+' must use the uploaded file');
    const full=path.join(root,'assets','more assets',file);
    assert.ok(fs.existsSync(full),'missing uploaded GLB '+file);
    const stat=fs.statSync(full);
    assert.ok(stat.size>128,'GLB is unexpectedly empty '+file);
    const header=Buffer.alloc(12),fd=fs.openSync(full,'r');
    try{assert.equal(fs.readSync(fd,header,0,12,0),12);}finally{fs.closeSync(fd);}
    assert.equal(header.toString('ascii',0,4),'glTF','GLB header signature '+file);
    assert.equal(header.readUInt32LE(4),2,'GLB version 2 '+file);
    assert.equal(header.readUInt32LE(8),stat.size,'GLB header length '+file);
  }
  assert.ok(specs.maiden.backup&&specs.yuki.backup&&specs.reaper.backup&&specs.wolf.backup,
    'existing proven game assets stay as network fallbacks');
  assert.match(js,/horrorLoadState\.has\(kind\)/,'stage transitions should not redownload models');
  assert.match(js,/for\(const url of \[spec\.url,spec\.backup\]\.filter\(Boolean\)\)/);
  assert.match(js,/maiden\.root\.remove\(ghostModel\)/,'the old maiden body is replaced');
  assert.match(js,/ghostModel=visual;maiden\.root\.add\(visual\)/,
    'the maiden point light is preserved with a new animated model');
  assert.match(js,/actor\.root\.clear\(\);actor\.root\.add\(visual\)/,
    'the other four primitive/old bodies should be replaced, not layered');
  assert.match(js,/chosen\.tracks\.filter\(track=>!\/\(\?:hips\|root\|armature\)\\?\.position/);
  assert.doesNotMatch(js,/dressGhost\(/,'no eager model loading at startup');
});

test('horror models are only loaded for the encounters that need them',()=>{
  const start=js.indexOf('function presentEncounterModels(){');
  const end=js.indexOf('presentEncounterModels();',start);
  assert.ok(start>=0&&end>start);
  const hits=[],stageTracker={stage:1};
  const root=()=>({visible:false});
  const yuki={root:root()},egg={root:root()},reaper={root:root()};
  const encounter={wolf:{root:root()},heatNodes:[],doorClosed:false};
  const m=()=>({visible:false});
  const coldCircle=m(),eggCircle=m(),reaperCircle=m(),wolfSpeaker=m(),wolfCircle=m();
  const doorHinge={rotation:{y:0}};
  const exec=new Function('yuki','egg','reaper','encounter','coldCircle',
    'eggCircle','reaperCircle','wolfSpeaker','wolfCircle','doorHinge',
    'loadHorrorAsset','stageTracker',
    'let stage=1;'+js.slice(start,end)+
    'return function(i){stage=i;presentEncounterModels();};')(
      yuki,egg,reaper,encounter,coldCircle,eggCircle,reaperCircle,wolfSpeaker,
      wolfCircle,doorHinge,kind=>hits.push(kind),stageTracker);
  exec(1);assert.deepEqual(hits,[],'initial game should not load all five high-detail GLBs');
  for(const [stage,kind] of [[2,'maiden'],[4,'yuki'],[6,'egg'],[8,'reaper'],[10,'wolf']]){
    exec(stage);
    assert.equal(hits.at(-1),kind,'stage '+stage+' should initiate '+kind);
  }
  assert.equal(hits.length,5);
});

test('creature model credits are published for all five CC-BY sources',()=>{
  const md=read('CREDITS.md'),page=read('credits.html');
  for(const author of ['butteroil','Shaban Hafizsalim','FLUXIUM3D','SkellyCooks','milakpro']){
    assert.ok(md.includes(author),'markdown credit '+author);
    assert.ok(page.includes(author),'public page credit '+author);
  }
  assert.ok(md.includes('CC BY')&&page.includes('CC BY'));
});


test('new school hallway and locker GLBs are actually present and referenced',()=>{
  const names=['school_hallway.glb','low_poly_old_locker.glb'];
  for(const name of names){
    const filename=path.join(root,'assets','more assets',name);
    assert.ok(fs.existsSync(filename),'missing uploaded scene asset '+name);
    const file=fs.openSync(filename,'r'),header=Buffer.alloc(12);
    try{assert.equal(fs.readSync(file,header,0,12,0),12);}finally{fs.closeSync(file);}
    assert.equal(header.toString('ascii',0,4),'glTF',name+' must be a binary glTF');
    assert.equal(header.readUInt32LE(4),2,'GLB v2 expected');
    assert.equal(header.readUInt32LE(8),fs.statSync(filename).size,'GLB length mismatch');
  }
  assert.match(js,/const SCHOOL_HALLWAY='\.\.\/\.\.\/assets\/more%20assets\/school_hallway\.glb'/);
  assert.match(js,/const OLD_LOCKER='\.\.\/\.\.\/assets\/more%20assets\/low_poly_old_locker\.glb'/);
  assert.match(js,/loadTemplate\(SCHOOL_HALLWAY\)/);
  assert.match(js,/loadTemplate\(OLD_LOCKER\)/);
  assert.match(js,/fitSceneryToBox\(template\.clone\(true\)/,'both meshes must be normalized');
  assert.match(js,/catch\(err=>console\.warn\('복도 에셋/,'missing GLB must retain procedural school scenery');
});

test('all four lockers have walkable interaction fronts away from room entrances',()=>{
  const first=js.indexOf('const LOCKER_SPOTS='),last=js.indexOf('const lockers=[]',first);
  assert.ok(first>0&&last>first);
  const spots=new Function(js.slice(first,last)+'return LOCKER_SPOTS;')();
  assert.equal(spots.length,4);
  const unique=new Set();
  for(const spot of spots){
    assert.ok(spot.x>-14&&spot.x<29,'lockers stay within the wing corridors');
    assert.ok(Math.abs(spot.z)>7.4&&Math.abs(spot.z)<8.0,'lockers hug the courtyard wall');
    assert.equal(spot.front,Math.sign(spot.z),'locker door should face towards the walking lane');
    const frontZ=spot.z+spot.front*.97;
    assert.ok(Math.abs(frontZ)>8.35&&Math.abs(frontZ)<9.1,'enter interaction stays in the hall');
    assert.ok(![-10.5,-1.5,7.5,16.5,25.5].some(door=>Math.abs(spot.x-door)<1.7),
      'do not block doors at room centers');
    unique.add(spot.x+','+spot.z);
  }
  assert.equal(unique.size,4);
  assert.match(js,/furniture\.push\(obstacle\)/,'lockers have collision shapes');
  assert.match(js,/const obstacle=\{x:spot\.x,z:spot\.z,hx:\.49,hz:\.27\}/);
  assert.match(html,/id="lockerView"/);
  assert.match(html,/id="lockerWarning"/);
  assert.match(html,/\.controls\{z-index:5\}/,'mobile exit button is above peeking mask');
});

test('locker hiding pauses movement and exposes a deterministic leave action',()=>{
  const begin=js.indexOf('function nearestLocker(){'),end=js.indexOf('function showToast(',begin);
  const state=js.slice(js.indexOf('let hidingLocker=null,'),js.indexOf('const encounter=',js.indexOf('let hidingLocker=null,')));
  assert.ok(begin>0&&end>begin&&state.includes('lockerDanger'));
  const locker={id:0,x:21.5,z:-7.67,yaw:0,interact:{x:21.5,z:-8.64}};
  const player={x:21.5,z:-8.64},maiden={x:25,z:-15},keys=new Set(['w']);
  const css=new Set(),view={classList:{add(k){css.add(k)},remove(k){css.delete(k)}}};
  const bodySet=new Set(),document={body:{classList:{add(x){bodySet.add(x)},remove(x){bodySet.delete(x)}}}};
  const ui={lockerView:view,lockerWarning:{textContent:''},knob:{style:{transform:''}}};
  const joy={x:0,y:0},encounter={wolf:{x:-1,z:15,grace:0}};
  let flashOn=true,viewYaw=0,viewPitch=0,stage=2;
  const template=new Function('lockers','player','maiden','keys','document','ui','joy','encounter',
    'showToast','dist','takeAnomalyHit','started','paused','ended',
    state+'let flashOn=true,viewYaw=0,viewPitch=0,stage=2,maidenPhase="hunt",power=100;'+js.slice(begin,end)+
    'return {nearestLocker,enterLocker,leaveLocker,updateLockerHiding,'+
    'get:()=>({hidingLocker,lockerTime,lockerDanger,flashOn,viewYaw,viewPitch}),'+
    'setStage:n=>{stage=n;},setMaiden:(x,z)=>{maiden.x=x;maiden.z=z;}};')(
      [locker],player,maiden,keys,document,ui,joy,encounter,()=>{},
      (a,b)=>Math.hypot(a.x-b.x,a.z-b.z),()=>{},true,false,false);
  assert.equal(template.nearestLocker().id,0);
  assert.equal(template.enterLocker(0),true);
  assert.equal(template.get().flashOn,false,'flashlight turns off while hiding');
  assert.equal(template.get().hidingLocker.id,0);
  assert.ok(css.has('hidden')===false,'peeking slot must appear');
  assert.ok(bodySet.has('in-locker'));
  assert.equal(keys.size,0,'movement key latch must clear on hide');
  template.updateLockerHiding(2);
  assert.equal(template.get().hidingLocker.id,0,'faraway ghost cannot automatically reveal player');
  assert.equal(template.leaveLocker(),true);
  assert.equal(template.get().flashOn,true,'flashlight restores on exit');
  assert.ok(css.has('hidden')&& !bodySet.has('in-locker'));
  assert.equal(template.leaveLocker(),false,'double exit is harmless');
  // A stationary pursuer checking the same locker for 3.2s can expose the player.
  assert.equal(template.enterLocker(0),true);
  template.setMaiden(locker.interact.x+.25,locker.interact.z);
  for(let i=0;i<70&&template.get().hidingLocker;i++)template.updateLockerHiding(.05);
  assert.equal(template.get().hidingLocker,null,'a long nearby search reveals the hidden player');
  assert.match(js,/if\(hidingLocker\)return\{type:'leaveLocker'/);
  assert.match(js,/if\(item\.type==='hideLocker'\)\{enterLocker\(item\.i\)/);
  assert.match(js,/if\(typeof hidingLocker!=='undefined'&&hidingLocker\)\{/,'WASD is locked');
});

test('staying hidden beside a nearby ghost eventually gets discovered',()=>{
  assert.match(js,/lockerDanger>=3\.2/);
  assert.match(js,/const goal=lockerTime<13\?\(lockerLastSeen\|\|hidingLocker\.interact\):SCHOOL\.maidenSpawn/);
  assert.match(js,/const goal=lockerTime<13\?\(lockerLastSeen\|\|hidingLocker\.interact\):\{x:-1\.5,z:16\.8\}/);
  assert.match(js,/const exposed=typeof hidingLocker==='undefined'\|\|!hidingLocker/);
  assert.match(js,/const away=exposed&&/,'hide cannot complete egg gaze trial for free');
  assert.match(js,/const staring=exposed&&/,'hide cannot also punish accidental glance');
});



test('school classroom doors open for students and ghosts, then close behind them',()=>{
  const start=js.indexOf('const schoolDoors=[]'),stop=js.indexOf('// Compact, collision-aware hide spots',start);
  const physStart=js.indexOf('function collides('),physEnd=js.indexOf('function navigationTarget(',physStart);
  assert.ok(start>=0&&stop>start&&physStart>=0&&physEnd>physStart);
  const player={x:-24.2,z:0},maiden={x:25.5,z:-16.8},encounter={wolf:{x:-1.5,z:16.8},doorClosed:false};
  const state={stage:1,maidenPhase:'approach'};
  const SCHOOL={roomCenters:[-10.5,-1.5,7.5,16.5,25.5]};
  class Group{constructor(){this.position={set(){}};this.rotation={y:0};}}
  const env={SCHOOL,scene:{add(){}},THREE:{Group},cube:()=>({}),mat:()=>({}),
    NORTH_ROOMS:['6-1','6-2','음악','미술','과학'],
    SOUTH_ROOMS:['5-1','5-2','컴퓨터','방송','가사'],
    SPINE_ROOMS:['자료','보건','관리','전기','교무'],
    walls:[],furniture:[],encounter,player,maiden,state};
  const code=js.slice(physStart,physEnd)+js.slice(start,stop)
    .replaceAll('stage===2','state.stage===2')
    .replaceAll('stage===10','state.stage===10')
    .replaceAll('stage===11','state.stage===11')
    .replaceAll("maidenPhase!=='approach'","state.maidenPhase!=='approach'");
  const {schoolDoors,canWalk,updateSchoolDoors,routePlan}=new Function(...Object.keys(env),code+
    'return {schoolDoors,canWalk,updateSchoolDoors,routePlan};')(...Object.values(env));
  assert.equal(schoolDoors.length,14,'ten wing doors and four regular west-wing doors');
  assert.equal(schoolDoors.filter(d=>d.axis==='wing').length,10);
  assert.equal(schoolDoors.filter(d=>d.axis==='spine').length,4);
  for(const d of schoolDoors){
    assert.equal(canWalk(d.x,d.z),false,'closed door blocks movement: '+d.name);
    player.x=d.x+(d.axis==='spine'?-2:0);
    player.z=d.z+(d.axis==='wing'?(d.z<0?2:-2):0);
    for(let i=0;i<30;i++)updateSchoolDoors(1/60);
    assert.equal(canWalk(d.x,d.z),true,'player approaches and door swings open: '+d.name);
    player.x=-24.2;player.z=0;
    for(let i=0;i<215;i++)updateSchoolDoors(1/60);
    assert.equal(canWalk(d.x,d.z),false,'door swings shut after players leave: '+d.name);
  }
  assert.ok(routePlan({x:-24.2,z:0},{x:25.5,z:-15.2},1.5).length,
    'openable school doors must not cut the north wing off in the AI route planner');
  state.stage=10;
  encounter.wolf.x=7.5;encounter.wolf.z=-9.0;
  for(let i=0;i<32;i++)updateSchoolDoors(1/60);
  const wolfDoor=schoolDoors.find(d=>d.x===7.5&&d.z===-10.2);
  assert.ok(wolfDoor.openAmount>.82,'hunting wolf opens a classroom door');
});

test('school doors stop vision until they open, without preventing sight through an empty doorway',()=>{
  const start=js.indexOf('function segmentHitsRect('),end=js.indexOf('function playerLookDirection(',start);
  assert.ok(start>=0&&end>start);
  const wall={x:0,z:-10.2,hx:1.28,hz:.105};
  const schoolDoors=[{openAmount:0,barrier:wall}];
  const clear=new Function('walls','schoolDoors',js.slice(start,end)+
    'return clearGhostSight;')([],schoolDoors);
  assert.equal(clear(0,-8.6,0,-12),false,'solid classroom door masks the ghost');
  schoolDoors[0].openAmount=1;
  assert.equal(clear(0,-8.6,0,-12),true,'swinging door makes eye contact possible again');
});

test('voluntary guidance reaches each stage without permanently replacing exploration',()=>{
  const first=js.indexOf('function navigationTarget(){'),last=js.indexOf('function setGuidePath(',first);
  assert.ok(first>=0&&last>first);
  const SCHOOL={guard:{x:-24.2,z:0},dokkaebi:{x:-10.5,z:-14.8},science:{x:25.5,z:-15.2}};
  const disturbed=[{x:-10.5,z:-15,done:false,name:'화분'}];
  const encounter={heatNodes:[{x:24,z:11.8,done:false,label:'배관'}]};
  const maiden={x:25.5,z:-16.5},bellDoor={x:-20.35,z:8},wolfTrap={x:-10.5,z:14};
  for(let stage=1;stage<=12;stage++){
    const fn=new Function('SCHOOL','disturbed','encounter','maiden','bellDoor','wolfTrap',
      'stage','maidenPhase',js.slice(first,last)+'return navigationTarget;')(
      SCHOOL,disturbed,encounter,maiden,bellDoor,wolfTrap,stage,'approach');
    const goal=fn();
    assert.ok(goal&&Number.isFinite(goal.x)&&Number.isFinite(goal.z),'stage '+stage+' has a useful target');
  }
  assert.match(js,/guideAssistance=!guideAssistance;updateNavigation\(0,true\);updateHud\(\)/);
  assert.match(html,/id="guide"/);
  assert.match(html,/H 키나 길찾기 버튼/);
});

test('unrigged horrors have scene motion and a finite wolf-lure window',()=>{
  assert.match(js,/egg\.root\.rotation\.z=Math\.sin\(elapsed\*9\.3\)/);
  assert.match(js,/egg\.root\.position\.y=Math\.sin\(elapsed\*2\.3\)/);
  assert.match(js,/reaper\.root\.rotation\.z=Math\.sin\(elapsed\*1\.1\)/);
  assert.match(js,/yuki\.root\.rotation\.z=Math\.sin\(elapsed\*2\.9\)/);
  assert.match(js,/w\.lureTime=22;/);
  assert.match(js,/lockerTime<13\?/);
  assert.match(js,/const speed=run\?5\.25:3\.6/);
});
