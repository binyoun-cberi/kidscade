'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('games/high_haunted_school_exorcist/index.html');
const js=read('games/high_haunted_school_exorcist/game.js');
const games=JSON.parse(read('data/games.json')).games;

test('3D school gameplay is a parseable local Three.js module',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:js,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/src="\.\/game\.js\?v=1"/);
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
  for(const id of ['game','joystick','knob','action','flash','intro','end','health','gazeValue','progress','minimap'])assert.ok(ids.has(id),id);
});

test('the demo contains two mechanically distinct ghosts and a complete return-to-office ending',()=>{
  assert.match(js,/fixPositions=\[/);
  assert.match(js,/fixes===3/);
  assert.match(js,/maiden\.charge/);
  assert.match(js,/watched=d<12/);
  assert.match(js,/case 001|ghostWaiting=3\.4/i);
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
  assert.match(js,/if\(actual<1\.18&&invulnerable<=0\)/);
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
