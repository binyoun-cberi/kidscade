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
  assert.match(js,/animations:animations\.map\(clip=>resolvePlaybackClip\(clip\)\)/);
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
  assert.match(js,/male:\[\.\.\.MALE_BASE_NODES,'kidscade_male_hair_short'/);
  assert.match(js,/const eyebrowRegionFloor=1\.76/);
  assert.match(js,/const browCenterY=1\.792/);
  assert.match(js,/extractedBrowTriangles:kept\.length\/3/);
  assert.match(html,/data-chibi-preset="male"/);
  assert.match(html,/남성형 기본/);
  assert.match(html,/value="kidscade_male_hair_short"(?: selected)?>남자 짧은 머리/);
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
  assert.ok(manifest.presets.male.includes('kidscade_male_hair_short'));
  assert.equal(manifest.customParts.kidscade_male_body.type,'body');
  assert.equal(manifest.customParts.kidscade_male_brows.generatedFrom,'eyelashes');
  assert.equal(manifest.customParts.kidscade_male_hair_short.generatedFrom,'hairone');
  assert.ok(manifest.hairNodes.includes('kidscade_male_hair_short'));
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
  assert.match(male,/getNode\('ninjasuitshort'\)/);
  assert.match(male,/meshPolicy:'reuse-source-meshes-only'/);
});


test('avatar spec tracks visible base meshes as well as wardrobe toggles',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/const TRACKED_PART_NODES=\[\.\.\.new Set\(\[\.\.\.BASE_VARIANT_NODES,\.\.\.TOGGLE_NODES\]\)\]/);
  assert.match(js,/return TRACKED_PART_NODES\.filter\(name=>getNode\(name\)\?\.visible\)/);
});


test('male short hair reuses hairone topology, materials and original skin weights',()=>{
  const js=read('teacher/character-3d-studio.js');
  const maleHair=js.slice(
    js.indexOf('function createKidscadeMaleHairShort(){'),
    js.indexOf('const HAIR_STYLE_PARAMETERS=')
  );
  assert.match(maleHair,/const source=getNode\('hairone'\)/);
  assert.match(maleHair,/const geometry=source\.geometry\.clone\(\)/);
  assert.match(maleHair,/geometry\.computeBoundingBox\(\)/);
  assert.match(maleHair,/positions\.setXYZ\(i,x,y,z\)/);
  assert.match(maleHair,/const taper=lower\*lower\*\(3-2\*lower\)/);
  assert.match(maleHair,/const templeFringeBlend=templeBridge\*/);
  assert.match(maleHair,/\.135\*templeFringeBlend/);
  assert.match(maleHair,/const eyeClearanceY=eyes\.geometry\.boundingBox\.max\.y\+\.02/);
  assert.match(maleHair,/const backOfFaceZ=centerZ-\.045/);
  assert.match(maleHair,/const faceOverhang=lowest<eyeClearanceY&&foremost>backOfFaceZ/);
  assert.match(maleHair,/if\(!faceOverhang\|\|outerTemple\)/);
  assert.match(maleHair,/geometry\.setIndex\(kept\)/);
  assert.match(maleHair,/removedEyeLevelTriangles:removedFaceTriangles/);
  assert.match(maleHair,/preservedTempleTriangles/);
  assert.match(maleHair,/eyeClearancePolicy:'trim central\/front eye-level faces only; retain original outer temple and rear nape'/);
  assert.match(maleHair,/cloneSkinnedMeshWithGeometry\(/);
  assert.match(maleHair,/source\.parent\.add\(hair\)/);
  assert.doesNotMatch(maleHair,/SphereGeometry|ConeGeometry|CylinderGeometry|TubeGeometry/);
  assert.match(js,/createKidscadeMaleSet\(\);\s*createKidscadeMaleHairShort\(\);/);
  assert.match(js,/const HAIR_NODES=\[\.\.\.FEMALE_HAIR_STYLES,\.\.\.MALE_HAIR_STYLES\]/);
  assert.match(js,/kidscade_male_hair_short:'남자 짧은 머리'/);
});


test('deployed Chibi studio uses commit-scoped HTML and JS assets',()=>{
  const build=read('scripts/build-cloudflare.cjs');
  const worker=read('worker/main.mjs');
  const wrangler=read('wrangler.jsonc');
  assert.match(build,/function writeVersioned3dStudioAssets\(buildId\)/);
  assert.match(build,/fs\.copyFileSync\(sourceJs,jsDest\)/);
  assert.match(build,/character-3d-studio-\$\{version\}\.js/);
  assert.match(build,/assertExists\(writeVersioned3dStudioAssets\(buildId\)\)/);
  assert.match(worker,/async function serveFresh3dStudio\(request, env\)/);
  assert.match(worker,/env\.ASSETS\.fetch\(new Request\(versionedUrl/);
  assert.match(worker,/x-kidscade-studio-build/);
  assert.match(wrangler,/\/teacher\/character-3d-studio\.html/);
});


test('male Chibi eyes align with native face markings and eyebrows only use two source islands',()=>{
  const js=read('teacher/character-3d-studio.js');
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  const male=js.slice(js.indexOf('function createKidscadeMaleSet(){'),js.indexOf('function makeUnlitMaterial(source){'));
  assert.match(male,/const eyeGeometry=eyesSource\.geometry\.clone\(\)/);
  assert.match(male,/eyeHeightScale:1/);
  assert.match(male,/alignsWith:'character_low native face markings'/);
  assert.match(male,/const browGeometry=lashesSource\.geometry\.clone\(\)/);
  assert.match(male,/const eyebrowRegionFloor=1\.76/);
  assert.match(male,/if\(kept\.length!==72\)/);
  assert.match(male,/browGeometry\.setIndex\(kept\)/);
  assert.doesNotMatch(male,/new THREE\.(?:SphereGeometry|TubeGeometry|ConeGeometry)/);
  assert.equal(manifest.customParts.kidscade_male_eyes.revision,'native-aligned-eyes-v5');
  assert.equal(manifest.customParts.kidscade_male_brows.generatedFrom,'eyelashes');
  const html=read('teacher/character-3d-studio.html');
  assert.match(html,/character-3d-studio\.js\?v=20261010-silhouette59/);
});

test('male shoulders and sleeves use smooth weighting without extra procedural meshes',()=>{
  const js=read('teacher/character-3d-studio.js');
  const male=js.slice(js.indexOf('function createKidscadeMaleSet(){'),js.indexOf('function makeUnlitMaterial(source){'));
  assert.match(male,/const upperTorso=smooth\(\.76,1\.02,y\)/);
  assert.match(male,/const torsoCore=1-smooth\(\.21,\.48,ax\)/);
  assert.match(male,/const sleeve=smooth\(\.10,\.23,Math\.abs\(x\)\)/);
  assert.match(male,/const maleTshirt=cloneSkinnedMeshWithGeometry\(/);
  assert.match(male,/generatedFrom:'shirt',fit:'smooth shoulder\/sleeve clearance'/);
  assert.doesNotMatch(male,/new THREE\.(?:CylinderGeometry|SphereGeometry|BoxGeometry)/);
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(manifest.customParts.kidscade_male_tshirt.revision,'wide-upper-torso-fit-v4');
});

test('male face preset uses one native-aligned pair of eyes and only original eyebrow islands',()=>{
  const js=read('teacher/character-3d-studio.js');
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.match(js,/const FEMALE_BASE_NODES=\['character_low','eyelashes','eyes','tooth'\]/);
  assert.match(js,/const MALE_BASE_NODES=\['kidscade_male_body','kidscade_male_eyes','kidscade_male_brows','tooth'\]/);
  assert.match(js,/BASE_VARIANT_NODES\.forEach\(node=>setNodeVisible\(node,false\)\)/);
  assert.deepEqual(manifest.presets.male.filter(name=>/eyes|eyelashes|brows/.test(name)),['kidscade_male_eyes','kidscade_male_brows']);
  assert.match(js,/const lashesSource=getNode\('eyelashes'\)/);
});

test('male haircut never disables depth testing or mutates source hair materials',()=>{
  const js=read('teacher/character-3d-studio.js');
  const male=js.slice(js.indexOf('function createKidscadeMaleHairShort(){'),js.indexOf('function createKidscadeMaleSet(){'));
  assert.doesNotMatch(male,/transparent\s*=|renderOrder\s*=|depthTest\s*=|depthWrite\s*=/);
  assert.match(male,/const geometry=source\.geometry\.clone\(\)/);
  assert.match(male,/source\.parent\.add\(hair\)/);
});

test('male Chibi proportional rework widens upper torso and slims individual legs and shorts',()=>{
  const js=read('teacher/character-3d-studio.js');
  const male=js.slice(js.indexOf('function createKidscadeMaleSet(){'),js.indexOf('function makeUnlitMaterial(source){'));
  assert.match(male,/upperTorso\*\(\.145\*torsoCore\+\.018\*\(1-torsoCore\)\)/);
  assert.match(male,/const thigh=smooth\(\.18,\.36,y\)/);
  assert.match(male,/const calf=smooth\(\.025,\.12,y\)/);
  assert.match(male,/const legSlim=legBand\*\(\.115\*thigh\+\.085\*calf\)/);
  assert.match(male,/const legCenter=Math\.sign\(x\)\*\.145/);
  assert.match(male,/x=legCenter\+\(x-legCenter\)\*\(1-legSlim\)/);
  assert.match(male,/const openingTrim=\.072\*legOpening\*legBand/);
  assert.match(male,/x\*=1\.135\+\.065\*shoulder\*sleeve/);
  assert.doesNotMatch(male,/new THREE\.(?:CylinderGeometry|SphereGeometry|BoxGeometry)/);
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(manifest.customParts.kidscade_male_body.revision,'balanced-boy-pelvis-v5');
  assert.equal(manifest.customParts.kidscade_male_shorts.revision,'slim-pelvis-shorts-v5');
});


test('male WALK and RUN use bind-pose-relative movement rather than bending resting bones',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/const MALE_WALK_POSITION_X=\.30/);
  assert.match(js,/const MALE_RUN_POSITION_X=\.38/);
  assert.match(js,/const MALE_WALK_SPINE_FACTORS=/);
  assert.match(js,/const MALE_RUN_SPINE_FACTORS=/);
  assert.match(js,/function sourceBone\(name\)/);
  assert.match(js,/invertedBase\.copy\(base\)\.invert\(\)/);
  assert.match(js,/delta\.copy\(invertedBase\)\.multiply\(animated\)/);
  assert.match(js,/function buildMaleLocomotionClip\(sourceClip,settings\)/);
  assert.match(js,/function buildMaleWalkClip\(sourceClip\)/);
  assert.match(js,/function buildMaleRunClip\(sourceClip\)/);
  assert.match(js,/const upperArm=\/upper\[_-\]\?arm\/i\.test\(bone\)/);
  assert.match(js,/animations\.filter\(clip=>isWalkClipName\(clip\.name\)\)/);
  assert.match(js,/animations\.filter\(clip=>isRunClipName\(clip\.name\)\)/);
  assert.match(js,/if\(isWalkClipName\(sourceClip\.name\)\)/);
  assert.match(js,/if\(isRunClipName\(sourceClip\.name\)\)/);
  assert.match(js,/animations:animations\.map\(clip=>resolvePlaybackClip\(clip\)\)/);
  assert.doesNotMatch(js,/animations\.push\(.*male(?:Walk|Run)/);

  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(manifest.animations.length,11);
  assert.equal(manifest.customParts.kidscade_male_set_policy.walkStyle,'grounded-boy-locomotion-v3');
  assert.equal(manifest.customParts.kidscade_male_set_policy.runAnimation.pelvisLateralScale,.38);
});

test('male base opens first and provides brows visibility, face zoom and gait status',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  assert.match(js,/applyPreset\('male'\)/);
  assert.match(js,/if\(name==='male'&&!\$\('maleBrowPreview'\)\.checked\)/);
  assert.match(js,/\$\('maleBrowPreview'\)\.addEventListener\('change'/);
  assert.match(js,/if\(name==='face'\)/);
  assert.match(js,/gaitBadge\.textContent=derived/);
  assert.match(html,/id="maleBrowPreview"/);
  assert.match(html,/id="gaitBadge"/);
  assert.match(html,/data-view="face"/);
  assert.match(html,/data-chibi-preset="male" data-preset-fit="male">남성형 기본/);
  assert.match(html,/character-3d-studio\.js\?v=20261010-silhouette59/);
});

test('mobile studio shows the live avatar preview before the long wardrobe',()=>{
  const html=read('teacher/character-3d-studio.html');
  assert.match(html,/@media\(max-width:820px\)\{\s*\.canvas-card\{order:-1;min-height:0\}/);
  assert.match(html,/\.view\{height:min\(64svh,540px\);min-height:340px\}/);
  assert.match(html,/\.left-rail\{overflow:visible!important\}/);
  assert.match(html,/\.view-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
});

test('male pelvis and shorts reduce rear volume together without modifying the original female base',()=>{
  const js=read('teacher/character-3d-studio.js');
  const body=js.slice(js.indexOf('function createKidscadeMaleSet(){'),js.indexOf('function makeUnlitMaterial(source){'));
  assert.match(body,/const bodyGeometry=bodySource\.geometry\.clone\(\)/);
  assert.match(body,/const pelvis=smooth\(\.43,\.55,y\)\*\(1-smooth\(\.74,\.91,y\)\)/);
  assert.match(body,/x\*=1-\.085\*pelvis/);
  assert.match(body,/if\(z<0\)z\*=1-\.105\*pelvis/);
  assert.match(body,/x\*=1-\.065\*pelvis/);
  assert.match(body,/if\(z<0\)z\*=1-\.080\*pelvis/);
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(manifest.customParts.kidscade_male_body.revision,'balanced-boy-pelvis-v5');
  assert.equal(manifest.customParts.kidscade_male_shorts.revision,'slim-pelvis-shorts-v5');
});

test('male ear-side bob flap is drawn toward the head with a continuous weighted taper',()=>{
  const js=read('teacher/character-3d-studio.js');
  const hair=js.slice(js.indexOf('function createKidscadeMaleHairShort(){'),js.indexOf('const HAIR_STYLE_PARAMETERS='));
  assert.match(hair,/const temple=smooth\(\.43,\.83,side\)\*smooth\(\.08,\.60,lower\)/);
  assert.match(hair,/const x=centerX\+\(ox-centerX\)\*/);
  assert.match(hair,/\.095\*templeBridge/);
  assert.match(hair,/const z=centerZ\+\(oz-centerZ\)\*/);
  assert.match(hair,/\.018\*templeBridge/);
  assert.match(hair,/sideHairPolicy:/);
  assert.match(hair,/geometry\.setIndex\(kept\)/);
  assert.doesNotMatch(hair,/new THREE\.(?:SphereGeometry|ConeGeometry|CylinderGeometry)/);
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(manifest.customParts.kidscade_male_hair_short.revision,'v7-temple-bridge');
});

test('grounded male gait damps vertical hip hop and splayed thigh swing in WALK and RUN',()=>{
  const js=read('teacher/character-3d-studio.js');
  const gait=js.slice(js.indexOf('function buildMaleLocomotionClip('),js.indexOf('function resolvePlaybackClip('));
  assert.match(gait,/values\[i\+1\]=centerY\+\(values\[i\+1\]-centerY\)\*settings\.verticalScale/);
  assert.match(gait,/const thigh=\/\(\?:thigh\|upper\[_-\]\?leg\)\/i\.test\(bone\)/);
  assert.match(gait,/const shin=\/\(\?:shin\|calf\|lower\[_-\]\?leg\)\/i\.test\(bone\)/);
  assert.match(gait,/euler\.z\*=settings\.thighRoll/);
  assert.match(gait,/euler\.x\*=settings\.shinPitch/);
  assert.match(gait,/verticalScale:\.72/);
  assert.match(gait,/verticalScale:\.66/);
  assert.match(gait,/thighRoll:\.62/);
  assert.match(gait,/thighRoll:\.64/);
  assert.match(js,/walkStyle:isMaleBodyVisible\(\)\?'grounded-boy-locomotion-v3':'source'/);
  assert.match(js,/if\(!isMaleBodyVisible\(\)\)return sourceClip/);
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(manifest.animations.length,11);
  assert.equal(manifest.customParts.kidscade_male_set_policy.runAnimation.pelvisVerticalScale,.66);
});


test('local-only Chibi audit samples real mixer poses without production auth changes',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(js,/localVisualAudit=\/\^\(\?:localhost\|127\\\.0\\\.0\\\.1\)\$/);
  assert.match(js,/window\.__kc3dAudit=\{/);
  assert.match(js,/if\(mixer&&!localVisualAudit\)mixer\.update\(dt\)/);
  assert.match(js,/mixer\.setTime\(source\.duration\*fraction\)/);
  assert.match(js,/sampledBones:bones/);
  assert.match(audit,/Page\.captureScreenshot/);
  assert.match(audit,/KIDSCADE_CHIBI_AUDIT_OUT/);
  assert.match(audit,/Chibi WebGL never became ready/);
  assert.match(html,/id="view"/);
});

test('one-touch mobile Chibi controls are wired to the same real animation, view and speed',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  for(const clip of ['IDLE','WALK','RUN','JUMP'])assert.ok(html.includes('data-quick-clip="'+clip+'"'));
  for(const view of ['front','threeQuarter','side','back'])assert.ok(html.includes('data-quick-view="'+view+'"'));
  for(const speed of ['0.5','1','1.5'])assert.ok(html.includes('data-quick-speed="'+speed+'"'));
  assert.match(js,/const clip=animations\.find\(item=>clipLabel\(item\.name\)===button\.dataset\.quickClip\)/);
  assert.match(js,/if\(clip\)playClip\(clip\.name\)/);
  assert.match(js,/setCameraView\(button\.dataset\.quickView\)/);
  assert.match(js,/\[data-chibi-preset\],\[data-view\],\[data-quick-clip\],\[data-quick-view\],\[data-quick-speed\]/);
  assert.match(js,/\$\('speed'\)\.value=button\.dataset\.quickSpeed/);
  assert.match(html,/character-3d-studio\.js\?v=20261010-silhouette59/);
});

test('Chibi v5 wardrobe exposes gender-fit filter and category tabs without restricting shared accessories',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  const m=JSON.parse(read('chibi/asset-manifest.json'));
  assert.match(js,/const FIT_PARTS=\{male:MALE_FIT_PARTS,female:FEMALE_FIT_PARTS,shared:SHARED_FIT_PARTS\}/);
  assert.match(js,/function selectBodyFit\(fit\)/);
  assert.match(js,/compatiblePart\(name\)&&PART_GROUP\(name\)===activeWardrobeCategory/);
  assert.match(js,/function updateWardrobeNavigation\(\)/);
  assert.match(js,/if\(!compatiblePart\(part\)\)/);
  assert.match(js,/if\(input\.checked&&\['top','bottom','shoes'\]\.includes\(exclusive\)\)/);
  assert.match(js,/bodyFit:activeBodyFit/);
  assert.match(html,/data-body-fit="male"/);
  assert.match(html,/data-body-fit="female"/);
  for(const c of ['hair','top','bottom','shoes','accessory','costume']){
    assert.ok(html.includes('data-wardrobe-category="'+c+'"'));
    assert.ok(m.wardrobeLibrary.categories.includes(c));
  }
  assert.equal(m.wardrobeLibrary.bodyFits.male.baseNode,'kidscade_male_body');
  assert.equal(m.wardrobeLibrary.bodyFits.female.baseNode,'character_low');
});

test('Chibi v5 provides eight distinct skinned hair entries per body fit, with unique mesh metadata',()=>{
  const js=read('teacher/character-3d-studio.js');
  const m=JSON.parse(read('chibi/asset-manifest.json'));
  const male=m.wardrobeLibrary.hairStyles.male;
  const female=m.wardrobeLibrary.hairStyles.female;
  assert.equal(male.length,12);
  assert.equal(female.length,12);
  assert.equal(new Set([...male,...female]).size,24);
  assert.equal(m.wardrobeLibrary.counts.newVariants,17);
  assert.match(js,/function createKidscadeHairCollection\(\)/);
  assert.match(js,/geometry\.computeVertexNormals\(\)/);
  assert.match(js,/template\.parent\.add\(hair\)/);
  assert.match(js,/createKidscadeMaleHairShort\(\);\s*createKidscadeHairCollection\(\);/);
  assert.match(js,/const part=style\.part\*size\.x\*crown/);
  assert.match(js,/const wave=style\.wave\*size\.y\*Math\.sin/);
  assert.match(js,/styleParameters:\{\.\.\.style\}/);
  for(const name of [...male.slice(1),...female.slice(-2)]){
    assert.ok(js.includes(name),'Style not declared in client: '+name);
    assert.equal(m.customParts[name].revision,name.startsWith('kidscade_male_')?'v7-male-temple-fill':'v5-wardrobe-hair-pack-1');
  }
});

test('v5.2 outfit library registers exactly 6 tops and 4 bottoms for each body fit',()=>{
  const m=JSON.parse(read('chibi/asset-manifest.json'));
  const pack=read('teacher/chibi-outfit-pack.js');
  const studio=read('teacher/character-3d-studio.js');
  assert.deepEqual(m.outfitLibrary.counts,{maleTops:9,femaleTops:9,maleBottoms:6,femaleBottoms:6,newSkinnedStyles:25});
  for(const fit of ['male','female']){
    assert.equal(m.outfitLibrary[fit].top.length,9);
    assert.equal(m.outfitLibrary[fit].bottom.length,6);
    for(const id of [...m.outfitLibrary[fit].top,...m.outfitLibrary[fit].bottom])
      assert.ok(studio.includes(id)||pack.includes(id),'Missing wardrobe item '+id);
  }
  assert.match(studio,/import \{OUTFIT_LIBRARY,OUTFIT_STYLES,createOutfitPack\} from '\.\/chibi-outfit-pack\.js'/);
  assert.match(studio,/createOutfitPack\(\{getNode,cloneSkinnedMeshWithGeometry,makeSolidMaterial,makeRigidSkinnedPiece,resolveFirstBoneName\}\)/);
  assert.match(studio,/for\(const style of OUTFIT_STYLES\)PART_CATEGORY\[style\.id\]=style\.category/);
  assert.match(studio,/partLibraryVersion:'chibi-v5\.6-strict-fit'/);
  assert.match(studio,/outfitLibrary:OUTFIT_LIBRARY/);
});

test('v5.2 outfits reshape actual skinned geometry and add three-dimensional sleeve/hood/waist detail',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  const m=JSON.parse(read('chibi/asset-manifest.json'));
  const styles=[...m.outfitLibrary.male.top,...m.outfitLibrary.male.bottom,...m.outfitLibrary.female.top,...m.outfitLibrary.female.bottom];
  const newIds=styles.filter(name=>name.startsWith('chibi_'));
  assert.equal(newIds.length,25);
  assert.equal(new Set(newIds).size,25);
  assert.match(pack,/function remeshSource\(source,style\)/);
  assert.match(pack,/const geometry=source\.geometry\.clone\(\)/);
  assert.match(pack,/shape\.chest\*torso\+shape\.shoulder\*shoulder\+shape\.hem\*hem\+shape\.sleeve\*sleeves/);
  assert.match(pack,/shape\.hip\*waist\+shape\.thigh\*thigh\*legBand/);
  assert.match(pack,/new THREE\.SphereGeometry\(\.185/);
  assert.match(pack,/new THREE\.TorusGeometry/);
  assert.match(pack,/new THREE\.BoxGeometry/);
  assert.match(pack,/const shell=cloneSkinnedMeshWithGeometry\(source,geometry,material,style\.id\+'_shell'\)/);
  assert.match(pack,/group\.add\(makeRigidSkinnedPiece\(source,geometry,bone,material,style\.id\+'_'\+id\)\)/);
  assert.match(pack,/source\.parent\.add\(group\)/);
  assert.match(pack,/function makeTrouserLegs\(/);
  assert.match(pack,/const geometry=new THREE\.CylinderGeometry\(upperRadius,lowerRadius,top-bottom,16,9,false\)/);
  assert.match(pack,/transferSmoothSkinWeights\(geometry,reference,\{sign,region:'leg'\}\)/);
  assert.match(pack,/skinTransfer:geometry\.userData\.skinTransfer/);
  assert.match(pack,/articulation:'four-neighbor-smooth-body-weights'/);
  assert.match(pack,/sourceWeights:'native-fitted-body-skin'/);
  assert.match(pack,/const bone=refIndex\.getComponent\(j,k\)/);
  assert.match(pack,/const w=refWeight\.getComponent\(j,k\)\*strength/);
  assert.match(pack,/style\.id\+'_leg_'\+side/);
  for(const id of newIds){
    assert.ok(pack.includes('id:\''+id+'\''),'Style definition missing '+id);
    assert.equal(m.customParts[id].rigging.includes('78-bone'),true);
  }
});

test('v5.2 local browser audit surveys animated garments and reimports rigged GLB exports',()=>{
  const js=read('teacher/character-3d-studio.js');
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(js,/outfitCatalog\(\)/);
  assert.match(js,/garmentSurvey\(\)/);
  assert.match(js,/async roundtripExport\(\)/);
  assert.match(js,/new GLTFExporter\(\)\.parseAsync\(avatarRoot/);
  assert.match(js,/new GLTFLoader\(\)\.parseAsync\(binary,''\)/);
  assert.match(audit,/const catalog3d=await evalPage\('window\.__kc3dAudit\.outfitCatalog\(\)'\)/);
  assert.match(audit,/assert\.equal\(catalog3d\.length,30/);
  assert.match(audit,/window\.__kc3dAudit\.garmentSurvey\(\)/);
  assert.match(audit,/window\.__kc3dAudit\.roundtripExport\(\)/);
  assert.match(audit,/assert\.equal\(exported\.clips\.length,11/);
  assert.match(audit,/outfit-'\+name/);
});


test('male Chibi v7 preserves outer temple triangle connectivity while still clearing frontal eye overhang',()=>{
  const js=read('teacher/character-3d-studio.js');
  const male=js.slice(js.indexOf('function createKidscadeMaleHairShort(){'),js.indexOf('const HAIR_STYLE_PARAMETERS='));
  assert.match(male,/const originalPositions=source\.geometry\.getAttribute\('position'\)/);
  assert.match(male,/const center=\(originalPositions\.getX\(a\)\+originalPositions\.getX\(b\)\+originalPositions\.getX\(c\)\)\/3/);
  assert.match(male,/const outerTemple=lateral>=\.49&&lowest>=eyeClearanceY-\.135&&/);
  assert.match(male,/rear<=centerZ\+size\.z\*\.12/);
  assert.match(male,/const faceOverhang=lowest<eyeClearanceY&&foremost>backOfFaceZ/);
  assert.match(male,/if\(!faceOverhang\|\|outerTemple\)/);
  assert.match(male,/if\(faceOverhang&&outerTemple\)preservedTempleTriangles\+\+/);
  assert.match(male,/const templeBridge=smooth\(\.43,\.72,side\)\*smooth\(\.12,\.52,lower\)/);
  assert.match(male,/const sideburn=smooth\(\.52,\.82,side\)\*smooth\(\.46,\.88,lower\)/);
  assert.doesNotMatch(male,/new THREE\.(SphereGeometry|CylinderGeometry|ConeGeometry)/);
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(manifest.wardrobeLibrary.hairTempleRevision,'v7-temple-bridge');
});

test('seven derived male hairstyles keep the temple cover without affecting female hairstyles',()=>{
  const js=read('teacher/character-3d-studio.js');
  const styles=js.slice(js.indexOf('const HAIR_STYLE_PARAMETERS='),js.indexOf('function createKidscadeHairCollection(){'));
  const maleLines=styles.split('\n').filter(line=>line.trim().startsWith('kidscade_male_hair_'));
  assert.equal(maleLines.length,11);
  assert.ok(maleLines.every(line=>/templeFill:\.\d+/.test(line)));
  assert.match(js,/const safeSide=style\.templeFill===undefined\?style\.side:Math\.max\(style\.side,-\.12\)/);
  assert.match(js,/templeBridgeVersion:style\.templeFill===undefined\?null:'v7'/);
  assert.match(js,/preservedTempleTriangles:mesh\?\.userData\?\.preservedTempleTriangles\|\|0/);
});


test('v5.3 catalog contains 22 separate real 3D accessory styles and complete attachment slots',()=>{
  const pack=read('teacher/chibi-accessory-pack.js');
  const m=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(m.accessoryLibrary.count,22);
  assert.deepEqual(m.accessoryLibrary.slots,{shoes:6,hat:6,face:5,bag:3,wrist:1,neck:1});
  const ids=[...m.accessoryLibrary.categories.shoes,...m.accessoryLibrary.categories.accessory];
  assert.equal(ids.length,22);
  assert.equal(new Set(ids).size,22);
  for(const id of ids){
    assert.ok(pack.includes("id:'"+id+"'"),'Missing procedural 3D entry '+id);
    assert.equal(m.customParts[id].revision,'v5.3');
    assert.equal(m.customParts[id].fit,'shared');
  }
  assert.match(pack,/const geometry=source\.geometry\.clone\(\)/);
  assert.match(pack,/new THREE\.SphereGeometry/);
  assert.match(pack,/new THREE\.TorusGeometry/);
  assert.match(pack,/new THREE\.CylinderGeometry/);
  assert.match(pack,/new THREE\.BoxGeometry/);
  assert.match(pack,/const mesh=cloneSkinnedMeshWithGeometry\(template,geometry,material,style\.id\+'_\'\+id\)/);
  assert.match(pack,/nearestWeight\(geometry,region==='shoe'\)/);
  assert.match(pack,/group\.visible=false/);
});

test('v5.3 3D preview picker uses real render-target pixels, no flat/stock placeholder sprites',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  assert.match(js,/from '\.\/chibi-accessory-pack\.js'/);
  assert.match(js,/createAccessoryPack\(\{getNode,cloneSkinnedMeshWithGeometry,makeSolidMaterial\}\)/);
  assert.match(js,/for\(const style of ACCESSORY_STYLES\)PART_CATEGORY\[style\.id\]=style\.category/);
  assert.match(js,/const SHARED_FIT_PARTS=new Set\(/);
  assert.match(js,/function paintAccessoryThumbnail\(name,canvas\)/);
  assert.match(js,/new THREE\.WebGLRenderTarget\(112,112/);
  assert.match(js,/renderer\.readRenderTargetPixels\(thumbnailTarget,0,0,112,112,pixels\)/);
  assert.match(js,/const focusWorld=sourceScene\.localToWorld\(new THREE\.Vector3\(x,y,z\)\)/);
  assert.match(js,/const radius=dist\*Math\.max\(Math\.abs\(sourceScale\.x\),\.01\)/);
  assert.match(js,/new ImageData\(flipped,112,112\)/);
  assert.match(js,/thumbnailCache\.set\(name/);
  assert.match(js,/function queueAccessoryThumbnails\(\)/);
  assert.match(js,/data-part-thumb="/);
  assert.match(html,/\.part-tile\.selected/);
  assert.match(html,/\.part-preview canvas/);
  assert.match(js,/partLibraryVersion:'chibi-v5\.6-strict-fit'/);
});

test('v5.3 shared accessory equipment is mutually exclusive only within matching slots',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/const ACCESSORY_SLOT=name=>ACCESSORY_STYLE_MAP\.get\(name\)\?\.slot\|\|LEGACY_ACCESSORY_SLOTS\[name\]\|\|null/);
  assert.match(js,/if\(input\.checked&&accessorySlot\)/);
  assert.match(js,/TOGGLE_NODES\.filter\(name=>name!==part&&ACCESSORY_SLOT\(name\)===accessorySlot\)/);
  assert.match(js,/for\(const style of ACCESSORY_STYLES\)PART_CATEGORY\[style\.id\]=style\.category/);
  assert.match(js,/ACCESSORY_STYLES\.map\(style=>style\.id\)/);
  assert.match(js,/accessoryLibrary:\{count:ACCESSORY_COUNT,slots:ACCESSORY_SLOTS\}/);
});


test('v5.3.1 accessory fit rules clamp positioning and clear jacket/scarf clipping',()=>{
  const pack=read('teacher/chibi-accessory-pack.js');
  const m=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(m.accessoryLibrary.fitRevision,'v5.3.1-collision-fit');
  assert.match(pack,/export const ACCESSORY_FIT_RULES=\{/);
  assert.match(pack,/export const ACCESSORY_STYLE_FIT=\{/);
  assert.match(pack,/export const ACCESSORY_CONFLICTS=\{/);
  assert.match(pack,/export function applyAccessoryFit\(/);
  assert.match(pack,/new THREE\.Box3\(\)\.setFromObject\(group,true\)/);
  assert.match(pack,/new THREE\.Box3\(\)\.setFromObject\(reference,true\)/);
  assert.match(pack,/const parentScale=group\.parent\?\.getWorldScale/);
  assert.match(pack,/group\.position\.y=THREE\.MathUtils\.clamp/);
  assert.match(pack,/if\(style\.slot==='bag'&&puffy\)z-=\.042/);
  assert.match(pack,/if\(style\.slot==='neck'&&elevatedCollar\)/);
  assert.match(pack,/group\.scale\.setScalar\(THREE\.MathUtils\.clamp\(scale,\.84,1\.10\)\)/);
  assert.match(pack,/Math\.max\(/);
});

test('v5.3.1 prevents legacy/new accessory stacking and restores original hair on cap removal',()=>{
  const js=read('teacher/character-3d-studio.js');
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(js,/const LEGACY_SHOE_IDS=\['shoe','bottes'/);
  assert.match(js,/function equipmentSlot\(name\)/);
  assert.match(js,/function resolveAccessoryConflicts\(preferred=''\)/);
  assert.match(js,/function hatSafeGeometry\(mesh\)/);
  assert.match(js,/function applyHideMasks\(\)/);
  assert.match(js,/function applyAccessoryFit\(preferred=''\)/);
  assert.match(js,/const candidate=hatOn&&mesh\.visible\?hatSafeGeometry\(mesh\):original/);
  assert.match(js,/const originalHatHair=new WeakMap\(\)/);
  assert.match(js,/const hatSafeHair=new WeakMap\(\)/);
  assert.match(js,/const conflicts=resolveAccessoryConflicts\(preferred\)/);
  assert.match(js,/applyRiggedAccessoryFit\(\{/);
  assert.match(js,/hairName:HAIR_NODES\.find\(name=>getNode\(name\)\?\.visible\)\|\|''/);
  assert.match(js,/equipmentAudit\(\)/);
  assert.match(audit,/HAT-SAFE hair geometry/);
  assert.match(audit,/Legacy shoes show through selected boots/);
  assert.match(audit,/Backpack did not release jacket clearance/);
});


test('Chibi v5.5 guards against inverted cloth triangles and outsized vertex drifts',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(pack,/function stabilizeGarmentMesh\(source,geometry\)/);
  assert.match(pack,/const maxDrift=\.062/);
  assert.match(pack,/const invalid=dot<=0\|\|changedArea<originalArea\*\.42\|\|/);
  assert.match(pack,/changedArea>originalArea\*2\.4/);
  assert.match(pack,/stabilizeGarmentMesh\(source,geometry\)/);
  assert.match(pack,/safetyReport:\{\.\.\.geometry\.userData\}/);
  assert.match(pack,/meshSafety:'bounded-deformation-with-local-triangle-winding-and-area-v5\.5'/);
  assert.match(audit,/report\.outfitPack\.safetyReports=/);
});

test('Chibi v5.5 prevents mismatched and doubled shirt/pants from rendering together',()=>{
  const js=read('teacher/character-3d-studio.js');
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(js,/const GARMENT_SLOT=name=>LEGACY_OUTFIT_SLOTS\[name\]/);
  assert.match(js,/function sanitizeGarmentLayers\(preferred=''\)/);
  assert.match(js,/!compatiblePart\(name\)/);
  assert.match(js,/const garmentConflicts=sanitizeGarmentLayers\(preferred\)/);
  assert.match(js,/garmentIntegrityAudit\(\)/);
  assert.match(audit,/mesh-repro-original-shirt/);
  assert.match(audit,/Original shirt remained under newer top/);
  assert.match(audit,/Body switch retained gender-incompatible clothing/);
});


test('v5.6 male and female geometry ownership is explicit with no accidental shared legacy costumes',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  assert.match(js,/const MALE_FIT_PARTS=new Set\(\[/);
  assert.match(js,/const FEMALE_FIT_PARTS=new Set\(\[/);
  assert.match(js,/const SHARED_FIT_PARTS=new Set\(\['shoe',\.\.\.ACCESSORY_STYLES\.map\(style=>style\.id\)\]\)/);
  assert.match(js,/if\(owners\.length!==1\)throw Error\('Unclassified or duplicated Chibi fit part: '\+name\)/);
  assert.match(js,/const PRESET_FIT=Object\.fromEntries/);
  assert.match(html,/data-chibi-preset="base" data-preset-fit="female" hidden/);
  assert.match(html,/data-chibi-preset="male" data-preset-fit="male"/);
  assert.match(html,/id="fitWorkspaceLabel"/);
  assert.match(html,/id="fitWorkspaceHelp"/);
  assert.match(html,/\.preset-grid button\[hidden\]\{display:none!important\}/);
  assert.match(js,/function sanitizeFitVisibility\(\)/);
  assert.match(js,/const incompatible=sanitizeFitVisibility\(\)/);
  assert.match(js,/if\(PRESET_FIT\[name\]!==activeBodyFit\)return/);
  assert.match(js,/activeBodyFit=fit;\s*activateRigScene\(fit\);\s*applyPreset\(fit==='male'\?'male':'base'\)/);
  assert.match(js,/function fitIntegrityIssues\(\)/);
  assert.match(js,/missing-body:/);
  assert.match(js,/bodyFitAudit\(\)/);
  assert.match(js,/enforcedFit:activeBodyFit/);
});

test('v5.6 independently switches male/female presets and divides the visible equipment list',()=>{
  const js=read('teacher/character-3d-studio.js');
  assert.match(js,/const owned=names\.filter\(name=>PART_FIT\(name\)===activeBodyFit\)/);
  assert.match(js,/const shared=names\.filter\(name=>PART_FIT\(name\)==='shared'\)/);
  assert.match(js,/data-part-fit="/);
  assert.match(js,/function selectBodyFit\(fit\)/);
  assert.match(js,/const valid=PRESET_FIT\[button\.dataset\.chibiPreset\]===activeBodyFit/);
  assert.match(js,/button\.hidden=!valid/);
  assert.match(js,/button\.disabled=!ready\|\|!allowed/);
  assert.match(js,/if\(fitIntegrityIssues\(\)\.length\)/);
  assert.match(js,/partLibraryVersion:'chibi-v5\.6-strict-fit'/);
});


test('v5.6 asset manifest owns every fitting part in exactly one body scope',()=>{
  const m=JSON.parse(read('chibi/asset-manifest.json'));
  const f=m.wardrobeLibrary.fitIsolation;
  assert.equal(f.version,'v5.6-hard-fit');
  assert.equal(f.mode,'deny-by-default');
  assert.equal(f.blockInvalidGlbExport,true);
  assert.deepEqual(Object.keys(f.parts),['male','female','shared']);
  const parts=[...f.parts.male,...f.parts.female,...f.parts.shared];
  assert.equal(new Set(parts).size,parts.length);
  for(const item of ['bottes','bottesgreen','armorshoe','ninjassuitshoe','hat','bag','armorhelmet'])
    assert.ok(f.parts.female.includes(item),item+' legacy female-fit resource leaked into shared');
  for(const name of m.wardrobeLibrary.hairStyles.male)
    assert.ok(f.parts.male.includes(name));
  for(const name of m.wardrobeLibrary.hairStyles.female)
    assert.ok(f.parts.female.includes(name));
  assert.ok(f.parts.shared.includes('chibi_hat_baseball'));
  assert.ok(!f.parts.shared.includes('skirt'));
});

test('v5.6 Chrome audit covers strict fitted tab switching without wrong-fit equipment leaks',()=>{
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(audit,/report\.fitIsolation=\{cases:\[\],outfitSwaps:\[\]\}/);
  assert.match(audit,/window\.__kc3dAudit\.bodyFitAudit\(\)/);
  assert.match(audit,/assert\.deepEqual\(audit\.incompatible,\[\]/);
  assert.match(audit,/Incompatible preset changed body without using fit switch/);
  assert.match(audit,/fit-isolation-/);
});


test('v5.7 separates male and female bone ownership, animation roots and GLB rig state',()=>{
  const js=read('teacher/character-3d-studio.js');
  const html=read('teacher/character-3d-studio.html');
  const manifest=JSON.parse(read('chibi/asset-manifest.json'));
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  const rig=manifest.wardrobeLibrary.rigIsolation;
  assert.equal(rig.version,'v5.7-independent-runtime-rigs');
  assert.equal(rig.runtimeBoneInstancesPerFit,78);
  assert.equal(rig.oneMountedRigAtATime,true);
  assert.equal(rig.mixerReboundOnBodySwitch,true);
  assert.match(js,/import \{clone as cloneRiggedScene\} from '\.\.\/assets\/vendor\/three-r160\/addons\/utils\/SkeletonUtils\.js'/);
  assert.match(js,/rigScenes=\{female:sourceScene,male:cloneRiggedScene\(sourceScene\)\}/);
  assert.match(js,/function inspectRig\(root\)/);
  assert.match(js,/function rigIntegrityIssues\(\)/);
  assert.match(js,/function activateRigScene\(fit\)/);
  assert.match(js,/mixer=new THREE\.AnimationMixer\(sourceScene\)/);
  assert.match(js,/rigIsolationAudit\(\)\{/);
  assert.match(js,/rigIsolationVersion:'chibi-v5\.7-independent-78-bone-rigs'/);
  assert.match(audit,/window\.__kc3dAudit\.rigIsolationAudit\(\)/);
  assert.match(audit,/sharedBones,0/);
  assert.match(audit,/roundtripExport\(\)/);
  assert.match(html,/character-3d-studio\.js\?v=20261010-silhouette59/);
});

test('v5.8 smooth garment skin weights have four-neighbor blending and reject invalid meshes',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  const studio=read('teacher/character-3d-studio.js');
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(pack,/function transferSmoothSkinWeights\(geometry,reference,\{sign,region\}\)/);
  assert.match(pack,/const nearest=\[\]/);
  assert.match(pack,/if\(nearest\.length>4\)nearest\.pop\(\)/);
  assert.match(pack,/const sorted=\[\.\.\.influence\]\.sort/);
  assert.match(pack,/weights\[i\*4\+k\]=sorted\[k\]\[1\]\/sum/);
  assert.match(pack,/skinTransfer:\{/);
  assert.match(pack,/distantSamples:fallbackCount/);
  assert.match(pack,/add\(ring,dark,sign<0\?'cuff_left':'cuff_right',shin\)/);
  assert.doesNotMatch(pack,/add\(ring,dark,sign<0\?'cuff_left':'cuff_right',pelvis\)/);
  assert.match(pack,/for\(let pass=0;pass<12;pass\+\+\)/);
  assert.match(pack,/if\(residualUnsafeTriangles\)throw Error/);
  assert.match(pack,/recoveryPasses,residualUnsafeTriangles/);
  assert.match(studio,/garmentSkinAudit\(\)\{/);
  assert.match(audit,/window\.__kc3dAudit\.garmentSkinAudit\(\)/);
  assert.match(audit,/unweighted,0/);
  assert.match(audit,/invalidBones,0/);
  assert.match(audit,/residualUnsafeTriangles,0/);
});

test('v5.8 visual cleanup uses continuous skinned sleeves and visibly separate wide pant legs',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  assert.match(pack,/function buildSkinConformingSleeve\(body,sign,puff\)/);
  assert.match(pack,/const sleeve=buildSkinConformingSleeve\(fitBody,sign,puff\)/);
  assert.match(pack,/geometry\.setAttribute\('skinWeight',new THREE\.Float32BufferAttribute\(weights,4\)\)/);
  assert.doesNotMatch(pack,/shoulderCap=new THREE\.SphereGeometry/);
  assert.match(pack,/const upperRadius=wide\?\.140/);
  assert.match(pack,/const lowerRadius=wide\?\.104/);
  assert.match(pack,/geometry\.translate\(sign\*\(wide\?\.178:\.153\)/);
  assert.match(pack,/const fullness=1-\.11\*knee\+\.025\*hem/);
});

test('v5.9 repairs exposed long-sleeve wrists and trouser crotch wedge without joining the legs',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(pack,/const coverage=smooth\(\.50,\.61,y\)/);
  assert.match(pack,/function addTrouserHipYoke\(/);
  assert.match(pack,/new THREE\.CylinderGeometry\(\.227,\.201,top-bottom,24,7,true\)/);
  assert.match(pack,/addTrouserHipYoke\(\{source,style,group,material,reference,cloneSkinnedMeshWithGeometry\}\)/);
  assert.match(pack,/bindYokeToPelvis\(geometry,source\.skeleton\)/);
  assert.match(pack,/style\.id\+'_hip_yoke'/);
  assert.match(audit,/skinAudit\.length,51/);
  assert.match(audit,/crotch-wrist-repro-/);
  assert.match(audit,/bottom\+'_hip_yoke'/);
});

test('v5.9 source-surface sleeves preserve original arm skin weights and pelvis bridge',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  assert.match(pack,/function buildSkinConformingSleeve\(body,sign,puff\)/);
  assert.match(pack,/armBones=new Set/);
  assert.match(pack,/\/UPPERARM\|FOREARM\|LOWERARM\//);
  assert.match(pack,/method:'source-body-arm-skin-v5\.9'/);
  assert.match(pack,/const sleeve=buildSkinConformingSleeve\(fitBody,sign,puff\)/);
  assert.match(pack,/function bindYokeToPelvis\(geometry,skeleton\)/);
  assert.match(pack,/method:'pelvis-anchored-yoke-v5\.9'/);
});

test('v5.9 body-normal sleeve offset and localized crotch yoke coverage',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  assert.match(pack,/const normals=original\.getAttribute\('normal'\)/);
  assert.match(pack,/const allowance=\(puff\?\.058:\.026\)\*coverage/);
  assert.match(pack,/z\+normals\.getZ\(i\)\*allowance/);
  assert.match(pack,/const frontCenter=z>0\?/);
  assert.match(pack,/\.035\*frontCenter/);
});

test('v5.9 sleeve excludes independent hand triangles and apparel details stay on chest',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  assert.match(pack,/return armWeight>\.16/);
  assert.match(pack,/const sleeveHem=puff\?\.945:\.50/);
  assert.match(pack,/zip\.translate\(0,\.985,\.105\)/);
  assert.match(pack,/pocket\.translate\(0,\.835,\.151\)/);
});

test('v5.9 lower forearm recovery reports sleeve surface coverage by vertical bands',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  const audit=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(pack,/verticalBands=\[0,0,0,0\]/);
  assert.match(pack,/verticalBands\[y<\.6\?0:y<\.75\?1:y<\.95\?2:3\]\+\+/);
  assert.match(pack,/vertices:verts\.length\/3,triangles,minY,maxY,verticalBands/);
  assert.match(audit,/CHIBI_ARM_COVERAGE/);
});

test('v5.9 Blender numbered forearm bones contribute to lower sleeve surface',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  const visual=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(pack,/sideVariant=new RegExp\(side\+'\[0-9\]\*\$'\)/);
  assert.match(pack,/sideVariant\.test\(item\.name\)/);
  assert.match(visual,/Numbered Blender forearm bone missing/);
  assert.match(visual,/Lower-arm surface still missing/);
});

test('v5.9 preserves short puff sleeves instead of extending all tops to wrist',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  const visual=read('tests/chibi-visual-browser-audit.cjs');
  assert.match(pack,/const sleeveHem=puff\?\.945:\.50/);
  assert.match(pack,/const allowance=\(puff\?\.058:\.026\)\*coverage/);
  assert.match(visual,/Puff blouse sleeve extends past elbow/);
});

test('v6.0 expanded Chibi catalogs contain 8 new hairstyles and 10 new garments',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  const studio=read('teacher/character-3d-studio.js');
  const m=JSON.parse(read('chibi/asset-manifest.json'));
  assert.equal(m.wardrobeLibrary.hairStyles.male.length,12);
  assert.equal(m.wardrobeLibrary.hairStyles.female.length,12);
  assert.equal(m.outfitLibrary.male.top.length,9);
  assert.equal(m.outfitLibrary.male.bottom.length,6);
  assert.equal(m.outfitLibrary.female.top.length,9);
  assert.equal(m.outfitLibrary.female.bottom.length,6);
  assert.match(pack,/chibi_male_cargo/);
  assert.match(pack,/chibi_female_pleated/);
  assert.match(studio,/kidscade_male_hair_spiky/);
  assert.match(studio,/chibi_female_hair_twintail/);
});

test('v6.0 cargo pockets and tracksuit stripes attach to animated legs',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  assert.match(pack,/if\(style\.category==='bottom'\)/);
  assert.match(pack,/cargo_flap_left/);
  assert.match(pack,/cargo_flap_right/);
  assert.match(pack,/transferSmoothSkinWeights\(piping,reference/);
  assert.match(pack,/stripe_left_/);
  assert.match(pack,/stripe_right_/);
});

test('v6.1 hair silhouettes use head-bone rigged volumes and pixie avoids pinched side gaps',()=>{
  const studio=read('teacher/character-3d-studio.js');
  assert.match(studio,/function attachChibiHairDetailMeshes\(/);
  assert.match(studio,/chibi_female_hair_twintail/);
  assert.match(studio,/rigged-hair-volume/);
  assert.match(studio,/kidscade_male_hair_spiky/);
  assert.match(studio,/const pixieLift=/);
  assert.match(studio,/chibi_female_hair_pixie:\{crown:-\.025,side:-\.015/);
});
test('v6.1 hats and face items use corrected crown/mouth registration',()=>{
  const pack=read('teacher/chibi-accessory-pack.js');
  assert.match(pack,/referenceBox\.max\.y-\.158/);
  assert.match(pack,/accessoryBox\.max\.y:accessoryBox\.min\.y/);
  assert.match(pack,/scalpY-\.012,hc\.z/);
  assert.match(pack,/crownWall/);
  assert.match(pack,/eyeY-\.305/);
  assert.match(pack,/faceZ\+\.025/);
});
test('v6.1 tracksuit piping bends with weighted knees rather than floating rigid boxes',()=>{
  const pack=read('teacher/chibi-outfit-pack.js');
  assert.match(pack,/part:'weighted-trouser-side-piping'/);
  assert.match(pack,/transferSmoothSkinWeights\(piping,reference,\{sign,region:'leg'\}\)/);
  assert.match(pack,/stripe_left_weighted/);
});

test('v6.1 visual identity details include layered school collar, rugby stripes, pleats, and tunic length',()=>{
  const outfits=read('teacher/chibi-outfit-pack.js');
  for(const signature of [
    'rugby_band_','utility_pocket_','blazer_lapel_','sailor_v_collar_',
    'sailor_smooth_hem','tunic_long_hem','skirt_pleat_','culottes_leg_split'
  ])assert.ok(outfits.includes(signature),'Missing distinguishable garment shape '+signature);
  const hair=read('teacher/character-3d-studio.js');
  assert.match(hair,/source GLB hair atlas has alpha-cutout/);
  assert.match(hair,/side:THREE.DoubleSide/);
});

test('v6.3 retains face accessories and mask ear loops',()=>{
  const src=read('teacher/chibi-accessory-pack.js');
  assert.match(src,/case 'sunglasses':return facePatch/);
  assert.match(src,/case 'mask':return facePatch/);
  assert.ok(src.includes('earLoop_'));
});


test('Chibi v6.3 facial accessories use curved, outward-facing geometry',()=>{
  const pack=read('teacher/chibi-accessory-pack.js');
  assert.match(pack,/function facePatch\(/);
  assert.match(pack,/indices\.push\(a,a\+1,b,b,a\+1,b\+1\)/);
  assert.match(pack,/case 'mask':return facePatch\(/);
  assert.match(pack,/case 'sunglasses':return facePatch\(/);
  assert.match(pack,/add\(facePatch\(\.110,eyeY/);
  assert.doesNotMatch(pack,/case 'mask':return sphere\(/);
  assert.doesNotMatch(pack,/case 'sunglasses':return sphere\(/);
});
