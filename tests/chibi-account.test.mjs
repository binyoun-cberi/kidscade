import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 CHIBI_ACCOUNT_CATALOG,CHIBI_ACCOUNT_DEFAULTS,
 sanitizeChibiAccountAvatar,isChibiAccountClothed
} from '../chibi/account-avatar-policy.mjs';
import {sanitizeSyncState} from '../worker/accounts.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('partial and undressed Chibi accounts always gain a full allowed outfit',()=>{
 for(const fit of ['male','female']){
  const a=sanitizeChibiAccountAvatar({bodyFit:fit,parts:{top:'',bottom:null,shoes:'none',hair:'none'}});
  assert.equal(a.parts.top,CHIBI_ACCOUNT_DEFAULTS[fit].top);
  assert.equal(a.parts.bottom,CHIBI_ACCOUNT_DEFAULTS[fit].bottom);
  assert.equal(a.parts.shoes,CHIBI_ACCOUNT_DEFAULTS[fit].shoes);
  assert.equal(a.parts.hair,CHIBI_ACCOUNT_DEFAULTS[fit].hair);
  assert.equal(isChibiAccountClothed(a),true);
 }
 assert.equal(sanitizeChibiAccountAvatar(null),null);
});
test('account sync removes unsupported GLB IDs and rejects opposite-fit clothes',()=>{
 const supplied={bodyFit:'female',parts:{
  hair:'kidscade_male_hair_short',top:'kidscade_male_tshirt',
  bottom:'kidscade_male_shorts',shoes:'https://bad.example/mesh.glb',
  face:'custom_face_unsafe',bag:'chibi_bag_school',
  costume:'armorhelmet',sourceUrl:'https://bad.example/mesh.glb'
 }};
 const state=sanitizeSyncState({chibiAvatar:supplied,seeds:10});
 const avatar=state.chibiAvatar;
 assert.equal(avatar.parts.top,'shirt');
 assert.equal(avatar.parts.bottom,'skirt');
 assert.equal(avatar.parts.shoes,'chibi_shoe_sneakers');
 assert.equal(avatar.parts.hair,'hairone');
 assert.equal(avatar.parts.face,'');
 assert.equal(avatar.parts.bag,'chibi_bag_school');
 assert.equal(avatar.parts.costume,undefined);
 assert.equal(avatar.sourceUrl,undefined);
 assert.equal(state.seeds,10);
 assert.equal(isChibiAccountClothed(avatar),true);
});
test('allowed tops and bottoms remain varied for both account body shapes',()=>{
 for(const fit of ['male','female']){
  const catalog=CHIBI_ACCOUNT_CATALOG[fit];
  assert.ok(catalog.top.length>=8);
  assert.ok(catalog.bottom.length>=6);
  const spec=sanitizeChibiAccountAvatar({bodyFit:fit,parts:{
   hair:catalog.hair.at(-1),top:catalog.top.at(-1),bottom:catalog.bottom.at(-1),
   shoes:catalog.shoes.at(-1),hat:catalog.hat.at(-1)
  }});
  assert.equal(spec.parts.top,catalog.top.at(-1));
  assert.equal(spec.parts.bottom,catalog.bottom.at(-1));
  assert.equal(spec.parts.hat,catalog.hat.at(-1));
  assert.ok(isChibiAccountClothed(spec));
 }
});
test('UI uses same strict policy and does not replace the existing pixel avatar',()=>{
 const studio=read('teacher/character-3d-studio.js');
 const html=read('teacher/character-3d-studio.html');
 const account=read('account-client.js');
 const entry=read('chibi-account-entry.js');
 const index=read('index_base.html');
 assert.match(studio,/function enforceAccountOutfit\(\)/);
 assert.match(studio,/function saveAccountAvatar\(\)/);
 assert.match(studio,/if\(accountStudio&&!input.checked/);
 assert.match(studio,/if\(accountPreview\)/);
 assert.match(html,/id="saveAccountChibi"/);
 assert.match(account,/chibiAvatar: s\?\.getJson/);
 assert.match(account,/s\.setJson\('chibiAvatar', state\.chibiAvatar\)/);
 assert.match(entry,/event\.source!==studio\.frame\.contentWindow/);
 assert.match(entry,/KidscadeAccount\?\.sync/);
 assert.match(entry,/3D 캐릭터 만들기/);
 assert.match(index,/chibi-account-entry\.js/);
 assert.match(index,/id="avatar-plaza-preview"/);
});

test('2D and 3D account atelier modes coexist in one overlay without overwriting pixel state',()=>{
  const pixel=read('avatar-studio.html');
  const integration=read('avatar-integration.js');
  const studio=read('teacher/character-3d-studio.html');
  const three=read('teacher/character-3d-studio.js');
  const account=read('chibi-account-entry.js');
  const css=read('chibi/account-studio.css');
  const lazyBoot=read('avatar-preview-boot-fix.js');
  assert.match(pixel,/id="switchToChibi"/);
  assert.match(pixel,/kidscade:avatar-switch-mode/);
  assert.match(studio,/class="kc3d-mode-nav"/);
  assert.match(studio,/data-kc3d-switch-2d/);
  assert.match(integration,/function changeStudioMode\(mode\)/);
  assert.match(integration,/data-kc-avatar-mode="2d"/);
  assert.match(integration,/data-kc-avatar-mode="3d"/);
  assert.match(integration,/window\.KidscadeAvatarStudio = Object\.freeze/);
  assert.match(integration,/if \(mode === '3d' && !window\.KidscadeAccount\?\.account\)/);
  assert.match(integration,/if \(activeStudioMode === '2d'\) snapshotFromStudio\(\)/);
  assert.match(three,/function prepareAccountStudioLayout\(\)/);
  assert.match(three,/const showTiles=\(accountStudio&&!accountPreview\)\|\|/);
  assert.match(three,/window\.parent\.postMessage\(\{/);
  assert.match(css,/grid-template-columns:minmax\(300px,400px\)/);
  assert.match(css,/#wardrobeParts \.part-tile/);
  assert.match(account,/KidscadeAvatarStudio\?\.open\?\.\('3d'\)/);
  assert.match(account,/event\.source!==studio\.frame\.contentWindow/);
  assert.match(account,/const previous=store\(\)\?\.getJson/);
  assert.match(integration,/frame\.dataset\.kidscadeDeferredSrc=nextSrc/);
  assert.match(lazyBoot,/frame\.getAttribute\('src'\)/);
  assert.match(lazyBoot,/current\.startsWith\('about:blank'\)/);
  // The pixel avatar is independently loaded in its original studio.
  assert.match(pixel,/id="avatarCanvas"/);
  assert.match(pixel,/avatar-pixel-studio\.js/);
  assert.doesNotMatch(integration,/localStorage\.removeItem\(PIXEL_STATE_KEY\)/);
});
