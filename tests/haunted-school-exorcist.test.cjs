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
  assert.match(html,/src="\.\/game\.js\?v=2"/);
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
  assert.match(js,/세 번 붙잡혀서 실패했어요/);
});

test('beginner experience includes wayfinding, actionable hints, and camera obstruction repair',()=>{
  assert.match(js,/function updateNavigation\(dt,force=false\)/);
  assert.match(js,/function setGuidePath\(path\)/);
  assert.match(js,/routePlan\(player,target,1\.15\)/);
  assert.match(js,/노란 안내선/);
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
    const player={x:-10.3,z:-6};
    const maiden={x:12,z:-10,speed:1.2,charge:0,attacks:0,root:{visible:false,position:{set(){}},rotation:{y:0}}};
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
    player.x=10.25;player.z=-4.5;
    viewYaw=aim?-Math.atan2(1.75,5.5):Math.PI;
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
