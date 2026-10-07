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
  assert.match(js,/const CHIBI_ASSET_URL='\/assets\/game\/chibi\/ChibiCharactersV1\\.2\/ChibiCharacters\/glb\/allinonepr\\.glb'/);
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
