import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('global admin exposes the Chibi-only 3D avatar studio',()=>{
  const admin=read('teacher/index.html');
  const html=read('teacher/character-3d-studio.html');
  assert.match(admin,/\/teacher\/character-3d-studio\.html/);
  assert.match(html,/3D 아바타 제작실/);
  assert.match(html,/Styloo Chibi Characters v1\.2/);
  assert.match(html,/전역 관리자/);
});

test('3D studio has no V1 V2 V3 procedural body UI or generator',()=>{
  const html=read('teacher/character-3d-studio.html');
  const js=read('teacher/character-3d-studio.js');
  for(const stale of ['V1 ·','V2 ·','V3 ·','data-body-style','proceduralPanel','soft3','chibi2','action2']){
    assert.equal(html.includes(stale),false,stale+' must be removed');
  }
  for(const stale of ['buildCharacter','makeBone','rigidGeometry','softTorsoGeometry','softForearmGeometry','softLegGeometry','BODY_STYLES','RIG_VERSION','CLIP_NAMES']){
    assert.equal(js.includes(stale),false,stale+' must be removed');
  }
});

test('Chibi studio uses one canonical GLB with no character fallback',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/const CHIBI_ASSET_URL='\/assets\/game\/chibi\/ChibiCharactersV1\.2\/ChibiCharacters\/glb\/allinonepr\.glb'/);
  assert.equal(js.includes('CHIBI_ASSET_CANDIDATES'),false);
  assert.equal(js.toLowerCase().includes('fallback'),false);
  assert.match(js,/폴백 캐릭터는 사용하지 않습니다/);
});

test('Chibi studio loads source rig and exports visible parts only',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/GLTFLoader/);
  assert.match(js,/GLTFExporter/);
  assert.match(js,/choosePrimarySkinnedMesh/);
  assert.match(js,/uniqueBones/);
  assert.match(js,/onlyVisible:true/);
  assert.match(js,/animations,/);
  assert.match(js,/kidscade-chibi-/);
});

test('Chibi wardrobe exposes source clothes hair and presets',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  for(const part of ['shirt','skirt','shoe','bag','chemise','pants','hat','greenoutfit','ninjassuit','armorhelmet','armorshoe','hairvariant','hairtail']){
    assert.ok(js.includes(part),part+' must exist');
  }
  for(const preset of ['base','student','merchant','archer','ninja','knight']){
    assert.ok(html.includes('data-chibi-preset="'+preset+'"'),preset+' preset must exist');
  }
  assert.match(js,/applyPreset/);
  assert.match(js,/applyHair/);
  assert.match(js,/selectedParts/);
});

test('Chibi source animation labels remain available',()=>{
  const js=read('teacher/character-3d-studio.js');
  for(const clip of ['anim_crouch','anim_crouchiddle','anim_dying','anim_flip','anim_iddle','anim_jump','anim_push','anim_run','anim_uncrouch','anim_walk']){
    assert.ok(js.includes(clip),clip+' must exist');
  }
  assert.match(js,/populateAnimationButtons/);
  assert.match(js,/new THREE\.AnimationMixer/);
});

test('Chibi studio remains global-admin only',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/kc_teacher_admin_key/);
  assert.match(js,/\/api\/teacher\/overview/);
  assert.match(js,/body\.scope!=='global'/);
});

test('required local Three runtime modules are vendored',()=>{
  for(const rel of [
    'assets/vendor/three-r160/three.module.js',
    'assets/vendor/three-r160/addons/loaders/GLTFLoader.js',
    'assets/vendor/three-r160/addons/exporters/GLTFExporter.js',
    'assets/vendor/three-r160/addons/utils/TextureUtils.js'
  ]){
    assert.ok(fs.existsSync(path.join(ROOT,rel)),rel+' must exist');
  }
});

test('Chibi asset manifest is canonical and has no fallback source',()=>{
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(manifest.license,'CC0-1.0');
  assert.equal(manifest.primary,'glb/allinonepr.glb');
  assert.equal(manifest.repositoryPath,'assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/allinonepr.glb');
  assert.equal(Object.hasOwn(manifest,'fallbackPrimary'),false);
  assert.equal(manifest.animations.length,11);
  assert.ok(manifest.presets.student.includes('shirt'));
  assert.ok(manifest.presets.ninja.includes('ninjassuit'));
  assert.ok(manifest.presets.knight.includes('armorhelmet'));
});


test('Chibi studio provides an import map for Three addons',()=>{
  const html=read('teacher/character-3d-studio.html');
  assert.match(html,/type="importmap"/);
  assert.match(html,/"three": "\/assets\/vendor\/three-r160\/three\.module\.js"/);
  assert.match(html,/"three\/addons\/": "\/assets\/vendor\/three-r160\/addons\/"/);
});


test('Kidscade blue hoodie is generated from the source skinned shirt',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  assert.match(js,/kidscade_hoodie_blue/);
  assert.match(js,/createKidscadeBlueHoodie/);
  assert.match(js,/const shirt=getNode\('shirt'\)/);
  assert.match(js,/body\.bind\(shirt\.skeleton,shirt\.bindMatrix\)/);
  assert.match(js,/DEF-spine\.003/);
  assert.match(js,/kidscade_hoodie_blue_pocket/);
  assert.match(js,/kidscade_hoodie_string_/);
  assert.match(html,/data-chibi-preset="hoodie"/);
});

test('Chibi manifest records the custom hoodie part',()=>{
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.ok(manifest.presets.hoodie.includes('kidscade_hoodie_blue'));
  assert.equal(manifest.customParts.kidscade_hoodie_blue.type,'garment');
  assert.equal(manifest.customParts.kidscade_hoodie_blue.generatedFrom,'shirt');
  assert.equal(manifest.customParts.kidscade_hoodie_blue.color,'#4f7df3');
});


test('hoodie bone resolver tolerates Three-sanitized Blender names',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/function normalizeRuntimeBoneName/);
  assert.match(js,/THREE\.PropertyBinding\?\.sanitizeNodeName/);
  assert.match(js,/function resolveBoneIndex/);
  assert.match(js,/normalizeRuntimeBoneName\(bone\.name\)===wanted/);
});


test('hoodie pocket uses a thin shaped kangaroo geometry',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/new THREE\.Shape\(\)/);
  assert.match(js,/quadraticCurveTo\(0,\.118,\.095,\.090\)/);
  assert.match(js,/new THREE\.ExtrudeGeometry\(pocketShape/);
  assert.match(js,/depth:\.012/);
  assert.match(js,/kidscade_hoodie_blue_pocket/);
  assert.doesNotMatch(js,/new THREE\.BoxGeometry\(\.30,\.125,\.045/);
});


test('hoodie includes collar and garment seam details',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/kidscade_hoodie_blue_collar/);
  assert.match(js,/kidscade_hoodie_blue_seam_left/);
  assert.match(js,/kidscade_hoodie_blue_seam_right/);
  assert.match(js,/kidscade_hoodie_blue_pocket_opening_L/);
  assert.match(js,/kidscade_hoodie_blue_pocket_opening_R/);
  assert.match(js,/kidscade_hoodie_blue_pocket_bottom_seam/);
  assert.match(js,/function makeBoundSeam/);
  assert.match(js,/function resolveFirstBoneName/);
  assert.match(js,/if\(torsoVertex&&y>1\.075\)/);
});

test('hoodie v2 has sleeves hood volume and subtle seams',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/function makeSleeveGeometry/);
  assert.match(js,/kidscade_hoodie_blue_sleeve_L/);
  assert.match(js,/kidscade_hoodie_blue_sleeve_R/);
  assert.match(js,/kidscade_hoodie_blue_hood_back/);
  assert.match(js,/new THREE\.SphereGeometry\(\.195,16,10/);
  assert.match(js,/Kidscade Hoodie Stitch/);
  assert.match(js,/#6687e6/);
  assert.match(js,/kidscade_hoodie_blue_pocket_opening_L/);
  assert.match(js,/kidscade_hoodie_blue_pocket_opening_R/);
  assert.match(js,/kidscade_hoodie_blue_pocket_bottom_seam/);
  assert.doesNotMatch(js,/kidscade_hoodie_blue_pocket_opening',\.0030/);
});


test('left rail stays readable without nested scrolling',()=>{
  const html=read('teacher/character-3d-studio.html');
  assert.match(html,/grid-template-columns:370px minmax\(560px,1fr\) 300px/);
  assert.match(html,/\.left-rail\{display:grid;gap:10px;width:370px;max-width:370px;min-width:0;align-self:start;position:static;max-height:none;overflow:clip\}/);
  assert.match(html,/font-size:\.64rem/);
  assert.match(html,/<aside class="left-rail">/);
  assert.match(html,/@media\(max-width:1250px\)/);
});

test('left rail v2 forces a wide non-scrolling desktop column',()=>{
  const html=read('teacher/character-3d-studio.html');
  const admin=read('teacher/index.html');
  assert.match(html,/grid-template-columns:370px minmax\(560px,1fr\) 300px/);
  assert.match(html,/\.left-rail\{[^}]*width:370px;max-width:370px;[^}]*overflow:clip/);
  assert.match(html,/data-layout-version="left-rail-no-scroll-v4"/);
  assert.match(admin,/character-3d-studio\.html\?v=20261007-noscroll4/);
});

test('left rail never inherits side scrolling',()=>{
  const html=read('teacher/character-3d-studio.html');
  assert.match(html,/<aside class="left-rail">/);
  assert.doesNotMatch(html,/<aside class="side left">/);
  assert.match(html,/\.left-rail\{[^}]*position:static;max-height:none;overflow:clip\}/);
  assert.match(html,/data-layout-version="left-rail-no-scroll-v4"/);
});

test('admin navigation cache-busts the no-scroll layout',()=>{
  const admin=read('teacher/index.html');
  assert.match(admin,/character-3d-studio\.html\?v=20261007-noscroll4/);
});


test('left rail clips overflow instead of creating scrollbars',()=>{
  const html=read('teacher/character-3d-studio.html');
  assert.match(html,/\.left-rail\{display:grid;gap:10px;width:370px;max-width:370px;min-width:0;align-self:start;position:static;max-height:none;overflow:clip\}/);
  assert.match(html,/\.left-rail>\.card\{min-width:0;max-width:100%;overflow:hidden\}/);
  assert.match(html,/\.left-rail \*\{min-width:0\}/);
  assert.match(html,/overflow-wrap:anywhere/);
  assert.match(html,/data-layout-version="left-rail-no-scroll-v4"/);
});


test('sanitized Chibi node names are resolved',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/function normalizeRuntimeNodeName/);
  assert.match(js,/THREE\.PropertyBinding\?\.sanitizeNodeName/);
  assert.match(js,/normalizeRuntimeNodeName\(object\.name\)===wanted/);
  assert.match(js,/hairvariant\.001/);
});

test('Chibi hair is mutually exclusive across presets dropdown and part toggles',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/HAIR_NODES\.forEach\(node=>setNodeVisible\(node,false\)\)/);
  assert.match(js,/if\(hair\)setNodeVisible\(hair,true\)/);
  assert.match(js,/if\(HAIR_NODES\.includes\(part\)\)/);
  assert.match(js,/applyHair\(input\.checked\?part:''\)/);
});


test('male Chibi preset reuses source meshes for body face hair and clothes',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  for(const name of [
    'kidscade_male_body','kidscade_male_eyes','kidscade_male_brows',
    'kidscade_male_tshirt','kidscade_male_shorts'
  ]) assert.match(js,new RegExp(name));
  assert.match(js,/function createKidscadeMaleSet/);
  assert.match(js,/const lashesSource=getNode\('eyelashes'\)/);
  assert.match(js,/const shirtSource=getNode\('shirt'\)/);
  assert.match(js,/const shortsSource=getNode\('ninjasuitshort'\)/);
  assert.match(js,/male:\[\.\.\.MALE_BASE_NODES,'hairone'/);
  assert.match(js,/eyeCenterY=1\.620/);
  assert.match(html,/data-chibi-preset="male"/);
  assert.match(html,/남자 기본/);
  assert.doesNotMatch(html,/kidscade_male_hair_short/);
});

test('male and female Chibi bases are mutually exclusive',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/const FEMALE_BASE_NODES=/);
  assert.match(js,/const MALE_BASE_NODES=/);
  assert.match(js,/BASE_VARIANT_NODES\.forEach\(node=>setNodeVisible\(node,false\)\)/);
  assert.match(js,/PRESETS=\{[\s\S]*male:\[\.\.\.MALE_BASE_NODES/);
});

test('male Chibi manifest records source-mesh reuse',()=>{
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.ok(manifest.presets.male.includes('kidscade_male_body'));
  assert.ok(manifest.presets.male.includes('hairone'));
  assert.equal(manifest.customParts.kidscade_male_body.type,'body');
  assert.equal(manifest.customParts.kidscade_male_brows.generatedFrom,'eyelashes');
  assert.equal(manifest.customParts.kidscade_male_tshirt.generatedFrom,'shirt');
  assert.equal(manifest.customParts.kidscade_male_shorts.generatedFrom,'ninjasuitshort');
  assert.match(manifest.customParts.kidscade_male_set_policy.rule,/no procedural hair, sleeves/);
});


test('male Chibi generator does not create procedural hair sleeves or compressed pants',()=>{
  const js=read('teacher/character-3d-studio.js');
  const start=js.indexOf('function createKidscadeMaleSet(){');
  const end=js.indexOf('function makeUnlitMaterial(source){',start);
  assert.ok(start>=0&&end>start);
  const male=js.slice(start,end);
  assert.doesNotMatch(male,/SphereGeometry|ConeGeometry|makeSleeveGeometry/);
  assert.doesNotMatch(male,/pantsSource|getNode\('pants'\)|shortsTop/);
  assert.match(male,/getNode\('hairone'\)|male:\[\.\.\.MALE_BASE_NODES,'hairone'/);
  assert.match(male,/getNode\('ninjasuitshort'\)/);
  assert.match(male,/meshPolicy:'reuse-source-meshes-only'/);
});
