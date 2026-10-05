'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const main=read('games/cube3d/cube-architect.js');
const avatar=read('games/cube3d/cube-architect-avatar.js');
const html=read('games/cube3d/index.html');

test('Cube Architect routes Kidscade avatar action frames through the shared renderer',()=>{
  assert.doesNotThrow(()=>new Function(main));
  assert.doesNotThrow(()=>new Function(avatar));
  assert.match(avatar,/actionMode\|\|\(airborne\?'jump'/);
  assert.match(avatar,/renderPreviewFrame\?\.\(mode,frameTime\)/);
  assert.match(main,/triggerFreeAvatarAction\('attack'/);
  assert.match(main,/triggerFreeAvatarAction\('hurt'/);
  assert.match(main,/triggerFreeAvatarAction\('dead'/);
  assert.match(main,/triggerFreeAvatarAction\('pickup'/);
});

test('defeat plays dead animation before respawn and temporarily exposes third person',()=>{
  assert.match(main,/function beginFreeAvatarDefeat/);
  assert.match(main,/freeAvatarReturnAt=now\+FREE_AVATAR_ACTION_MS\.dead/);
  assert.match(main,/if\(freeViewMode!=='third'\)setFreeView\('third',false\)/);
  assert.match(main,/if\(t>=freeAvatarReturnAt\)returnAfterCreatureDefeat\(\)/);
  assert.match(main,/if\(restoreView&&restoreView!==freeViewMode\)setFreeView\(restoreView,false\)/);
});

test('jump and pickup motions are tied to real survival actions',()=>{
  assert.match(avatar,/airborne\?'jump'/);
  assert.match(main,/if\(survival&&resource\)triggerFreeAvatarAction\('pickup'\)/);
  assert.match(main,/trackSurvival\('forage'.*triggerFreeAvatarAction\('pickup'/s);
  assert.match(main,/triggerFreeAvatarAction\('pickup',FREE_AVATAR_ACTION_MS\.pickup,t\)/);
});

test('avatar action build is cache-busted',()=>{
  assert.match(html,/cube-architect-avatar\.js\?v=20261005-avatar-actions1/);
  assert.match(html,/cube-architect\.js\?v=20261005-avatar-actions1/);
});
