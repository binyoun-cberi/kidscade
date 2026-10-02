'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const avatar=read('games/cube3d/cube-architect-avatar.js');
const html=read('games/cube3d/index.html');

test('v21 avatar module and runtime parse',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(avatar));
  assert.match(html,/cube-architect-avatar\.js\?v=20261002-25/);
  assert.ok(html.indexOf('cube-architect-avatar.js')<html.indexOf('cube-architect.js'));
});

test('free world has a modular Kidscade block avatar',()=>{
  assert.match(avatar,/kidscade_avatar_equipped/);
  assert.match(avatar,/kidscade-avatar-shop-v2/);
  assert.match(avatar,/skin_peach/);
  assert.match(avatar,/hair_short/);
  assert.match(avatar,/top_tee/);
  assert.match(avatar,/bottom_shorts/);
  assert.match(avatar,/CubeArchitectPlayerAvatar/);
  assert.match(avatar,/addHeadItem/);
  assert.match(avatar,/addFace/);
  assert.match(avatar,/addHandItem/);
  assert.match(avatar,/addAura/);
  assert.match(js,/function refreshFreeAvatar/);
  assert.match(js,/freeAvatarRoot\.rotation\.y=yaw/);
});

test('player can switch first and third person without moving the physics camera permanently',()=>{
  assert.match(js,/let freeViewMode='third'/);
  assert.match(js,/function cycleFreeView/);
  assert.match(js,/function thirdPersonCameraPoint/);
  assert.match(js,/function renderFreeScene/);
  assert.match(js,/savedPos=camera\.position\.clone\(\)/);
  assert.match(js,/camera\.position\.copy\(savedPos\)/);
  assert.match(js,/if\(e\.code==='KeyV'\)/);
  assert.match(html,/id="actionView"/);
  assert.match(html,/id="mobileView"/);
});

test('avatar customization is reachable on desktop and touch controls',()=>{
  assert.match(html,/id="actionAvatar"/);
  assert.match(html,/id="mobileAvatar"/);
  assert.match(js,/function openAvatarCustomizer/);
  assert.match(js,/getElementById\('avatar-open-btn'\)/);
  assert.match(js,/avatar-studio\.html/);
  assert.match(js,/tap\('mobileAvatar'/);
});

test('avatar animates while moving and keeps cosmetic slots visual-only',()=>{
  assert.match(avatar,/leftLeg\.rotation\.x=walk/);
  assert.match(avatar,/rightLeg\.rotation\.x=-walk/);
  assert.match(avatar,/leftArm\.rotation\.x=-walk/);
  assert.match(avatar,/auraPieces/);
  assert.doesNotMatch(avatar,/damage|attackPower|speedBonus|armorBonus/);
});
