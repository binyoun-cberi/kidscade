const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const main=read('games/cube3d/cube-architect.js');
const world=read('games/cube3d/cube-architect-world.js');
const adapter=read('games/cube3d/cube-architect-avatar.js');
const avatar=read('avatar-pixel-studio.js');
const html=read('games/cube3d/index.html');
const avatarHtml=read('avatar-studio.html');

test('survival exposes padded and iron armor plus shields as craftable gear',()=>{
  for(const id of [
    'paddedHelmet','paddedChest','paddedLegs','paddedBoots','woodShield',
    'ironHelmet','ironChest','ironLegs','ironBoots','ironShield'
  ]){
    assert.ok(world.includes("id:'"+id+"'"),id+' recipe');
    assert.ok(main.includes(id),id+' runtime item');
  }
  assert.match(main,/const SURVIVAL_GEAR_DEFS=/);
  assert.match(main,/head:''.*chest:''.*legs:''.*feet:''.*shield:''/);
});

test('armor and shields equip, save, load and reduce real survival damage',()=>{
  assert.match(main,/function equipSurvivalGear/);
  assert.match(main,/function unequipSurvivalGear/);
  assert.match(main,/function survivalProtection/);
  assert.match(main,/Math\.min\(\.65/);
  assert.match(main,/survivalDamageCarry\+=rawAmount\*\(1-protection\)/);
  assert.match(main,/version:13/);
  assert.match(main,/equipment:\{\.\.\.survivalEquipment\}/);
  assert.match(main,/damageCarry:survivalDamageCarry/);
  assert.match(main,/savedEquipment=data\.equipment/);
});

test('survival equipment UI has five explicit slots and armor HUD',()=>{
  assert.match(html,/id="survivalArmor"/);
  assert.match(html,/id="survivalEquipmentPanel"/);
  for(const slot of ['head','chest','legs','feet','shield'])
    assert.match(html,new RegExp('data-gear-slot="'+slot+'"'));
  assert.match(main,/updateSurvivalEquipmentUi/);
});

test('Cube Architect passes temporary combat gear to the public Kidscade avatar renderer',()=>{
  assert.doesNotThrow(()=>new Function(adapter));
  assert.match(adapter,/combatGear=null/);
  assert.match(adapter,/renderPreviewFrame\?\.\(mode,frameTime,\{combatGear:combatGear\|\|null\}\)/);
  assert.match(main,/survivalCombatAppearance\(\)/);
  assert.match(main,/api\.animate\(freeAvatarRoot,now,moving,onGround\|\|freeFlying,motion,freeAvatarActionAt\(now\),survivalCombatAppearance\(\)\)/);
});

test('avatar combat overlay follows existing 23-frame body and hand anchors without mutating avatar state',()=>{
  assert.doesNotThrow(()=>new Function(avatar));
  assert.match(avatar,/function renderPreviewFrame\(mode='stand',time=0,options=\{\}\)/);
  assert.match(avatar,/options\?\.combatGear/);
  assert.match(avatar,/packLayerPixels\(frameId,'upper'\)/);
  assert.match(avatar,/packLayerPixels\(frameId,'lower'\)/);
  assert.match(avatar,/packLayerPixels\(frameId,'shoes'\)/);
  assert.match(avatar,/packLayerPixels\(frameId,'hair'\)/);
  assert.match(avatar,/FRAME_HAND_ANCHORS/);
  assert.match(avatar,/equipmentAnchorAndDirection\(frameId,'weapon'\)/);
  assert.match(avatar,/equipmentAnchorAndDirection\(frameId,'shield'\)/);
  assert.match(avatar,/combatEquipmentDepthParts/);
  assert.match(avatar,/globalCompositeOperation='destination-over'/);
  assert.match(avatar,/toolId!=='__none__'/);
  assert.match(avatar,/aidId!=='__none__'/);
  assert.doesNotMatch(main,/KidscadeAvatarShop\.setState/);
});

test('avatar schema stays compatible while renderer cache is refreshed',()=>{
  assert.match(avatar,/const PREVIEW_VERSION='pixel-v3-school-starter-29'/);
  assert.match(avatar,/version:'pixel-v3-school-starter-29'/);
  assert.match(avatarHtml,/avatar-pixel-studio\.js\?v=74/);
  assert.match(html,/cube-architect-world\.js\?v=20261006-armor1/);
  assert.match(html,/cube-architect-avatar\.js\?v=20261006-armor1/);
  assert.match(html,/cube-architect\.js\?v=20261006-armor1/);
});
