const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

test('World v3 loads local Three.js and the v2 storage/avatar bridge',()=>{
  assert.match(html,/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/\.\.\/world-v2\/kidscade-world-storage\.js/);
  assert.match(html,/\.\.\/world-v2\/kidscade-world-bridge\.js/);
  assert.match(html,/kidscade-world-v3\.js\?v=1/);
  assert.match(runtime,/import \* as THREE from 'three'/);
  assert.match(runtime,/GLTFLoader/);
});

test('World v3 keeps the player 2D while the environment is 3D',()=>{
  assert.match(runtime,/new THREE\.Sprite\(avatarMaterial\)/);
  assert.match(runtime,/new THREE\.CanvasTexture\(avatarCanvas\)/);
  assert.match(runtime,/Bridge\?\.readAvatarSource/);
  assert.match(runtime,/renderPreviewFrame\(moving\?'walk':'idle'/);
  assert.match(runtime,/new THREE\.WebGLRenderer/);
});

test('World v3 uses committed 3D world and furniture assets',()=>{
  const assets=[
    ['city','kenney-city-kit-suburban','building-type-a.glb'],
    ['city','kenney-city-kit-suburban','building-type-g.glb'],
    ['nature','kenney-nature-kit','tree-default.glb'],
    ['nature','kenney-nature-kit','tree-oak.glb'],
    ['nature','kenney-nature-kit','rock-large-a.glb'],
    ['survival','kenney-survival-kit','workbench.glb'],
    ['survival','kenney-survival-kit','chest.glb'],
    ['interiors','kenney-furniture-kit','bed-single.glb'],
    ['interiors','kenney-furniture-kit','lounge-sofa.glb'],
    ['interiors','kenney-furniture-kit','kitchen-fridge.glb'],
    ['interiors','kenney-furniture-kit','kitchen-sink.glb'],
    ['interiors','kenney-furniture-kit','kitchen-stove.glb']
  ];
  for(const parts of assets){
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d',...parts)),parts.join('/'));
    assert.ok(runtime.includes(parts.at(-1)),'runtime missing '+parts.at(-1));
  }
});

test('World v3 retains core life interactions and shared saves',()=>{
  assert.match(runtime,/Storage\?\.load/);
  assert.match(runtime,/Storage\?\.save/);
  assert.match(runtime,/집에 들어가기/);
  assert.match(runtime,/제작대 사용하기/);
  assert.match(runtime,/보관 상자 보기/);
  assert.match(runtime,/연못에서 낚시하기/);
  assert.match(runtime,/나무 베기/);
  assert.match(runtime,/바위 캐기/);
  assert.match(runtime,/침대에서 쉬기/);
  assert.match(runtime,/work-crop-/);
});

test('World v3 is the default entry and v2 remains reachable',()=>{
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=1/);
  assert.match(integration,/version:3/);
  assert.match(html,/2D 안정판/);
  assert.match(runtime,/\.\.\/world-v2\/kidscade-world\.html\?v=8/);
});
