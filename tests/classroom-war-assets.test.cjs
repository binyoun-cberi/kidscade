const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'games','high_classroom_war_3d','교실전쟁 3D.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('Classroom War uses local Three r160 and GLTFLoader before CDN fallback',()=>{
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/assets\/vendor\/three-r160\/addons\/loaders\/GLTFLoader\.js/);
  assert.match(html,/window\.__classroomAssetRuntime = "local-r160"/);
  assert.match(html,/procedural fallback/);
  assert.ok(fs.existsSync(path.join(root,'assets','vendor','three-r160','three.module.js')));
  assert.ok(fs.existsSync(path.join(root,'assets','vendor','three-r160','addons','loaders','GLTFLoader.js')));
});

test('Classroom War connects all twelve people GLB assets with fallbacks',()=>{
  for(const sex of ['male','female']){
    for(const letter of ['a','b','c','d','e','f']){
      const rel=path.join('assets','game','characters','people',`character-${sex}-${letter}.glb`);
      assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
      assert.ok(html.includes(`character-${sex}-${letter}.glb`));
    }
  }
  assert.match(html,/function cloneClassroomCharacter/);
  assert.match(html,/function rankAssetCharacter/);
  assert.match(html,/function enemyAssetCharacter/);
  assert.match(html,/const asset=rankAssetCharacter\(0\);if\(asset\)return asset/);
  assert.match(html,/const asset=enemyAssetCharacter\(type\);if\(asset\)return asset/);
});

test('Classroom War shares GLB geometry and materials for endless-run performance',()=>{
  assert.match(html,/sharedAssetGeometry=true/);
  assert.match(html,/sharedAssetMaterial=true/);
  assert.match(html,/!n\.userData\?\.sharedAssetGeometry/);
  assert.match(html,/!n\.userData\?\.sharedAssetMaterial/);
});

test('Classroom War widens desktop presentation and the physical classroom',()=>{
  assert.match(html,/width:min\(100vw,1180px\)/);
  assert.match(html,/new THREE\.PlaneGeometry\(26,82\)/);
  assert.match(html,/wallL\.position\.set\(-13,3,-19\)/);
  assert.match(html,/for\(const x of \[-10\.2,10\.2\]\)/);
});

test('Classroom War math gates preview their resulting army count',()=>{
  assert.match(html,/before=totalArmy\(\),after=clamp\(gateResult\(choice,before\),1,99999\)/);
  assert.match(html,/before\.toLocaleString\(\).*after\.toLocaleString\(\)/);
  assert.match(html,/계산 결과를 보고 가장 좋은 통로를 고르세요/);
});

test('Classroom War catalog points to the asset rework',()=>{
  const game=catalog.games.find(g=>g.id==='high_classroom_war_3d');
  assert.ok(game);
  assert.equal(game.href,'games/high_classroom_war_3d/교실전쟁 3D.html?v=13');
});

test('Classroom War uses SkeletonUtils clone and stable grounding for skinned people',()=>{
  assert.match(html,/addons\/utils\/SkeletonUtils\.js/);
  assert.match(html,/window\.cloneSkeleton = skeletonMod\.clone/);
  assert.match(html,/window\.cloneSkeleton\?window\.cloneSkeleton\(gltf\.scene\)/);
  assert.match(html,/const baseSize=Math\.max\(size\.x,size\.y,size\.z\)\|\|1/);
  assert.match(html,/model\.position\.y-=bounds\.min\.y/);
  assert.match(html,/root\.userData\.groundY=\.035/);
  assert.match(html,/Math\.max\(0,Math\.sin\(phase\)\)/);
});

test('Classroom War spreads army ranks and rows instead of piling models together',()=>{
  assert.match(html,/function lineUp\(list,z,span=6\.2,rowStep=\.96\)/);
  assert.match(html,/row\*rowStep/);
  assert.match(html,/player\.soldiers,createStudent,player\.agents,1\.35,5\.8,\.94/);
  assert.match(html,/player\.generals,createGeneralStudent,player\.generalAgents,-3\.92,6\.3,1\.08/);
});
