const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'world-v2','kidscade-world-storage.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

test('fresh Seed World starts primitive but cannot deadlock',()=>{
  for(const id of ['starter-wood-1','starter-wood-6','starter-stone-1','starter-stone-6'])assert.ok(runtime.includes(id),id);
  assert.match(runtime,/초보자 보급: 목재 \+5 · 돌 \+5/);
  assert.match(runtime,/canCarryBundle\(\{wood:5,stone:5\}\)/);
  assert.match(runtime,/addInventoryItem\('wood',5/);
  assert.match(runtime,/addInventoryItem\('stone',5/);
  assert.match(runtime,/homeCampfire/);
  assert.match(runtime,/집 앞 캠프파이어/);
  assert.match(runtime,/바닥 이불에서 자기/);
  assert.match(runtime,/강물 떠가기/);
  assert.match(storage,/fishingLevel:0/);
  assert.match(storage,/waterLevel:0/);
  assert.match(storage,/orchardLevel:0/);
  assert.match(storage,/ranchLevel:0/);
});

test('starter inventory is limited and home storage matters',()=>{
  assert.match(runtime,/BACKPACK_SLOTS=\[0,8,12,16,20\]/);
  assert.match(runtime,/HOME_STORAGE_SLOTS=\[0,10,20,32,48\]/);
  assert.match(runtime,/function canCarryNewKey/);
  assert.match(runtime,/function homeStoragePanel/);
  assert.match(runtime,/가방이 가득 찼어요/);
});

test('starter guidance reveals one homestead goal at a time',()=>{
  assert.match(runtime,/function nextHomesteadGoal/);
  for(const phrase of ['강물 한 통 떠오기','집 앞 캠프파이어 만들기','첫 작물 키우기','우물 만들기','나무 침대 만들기','침대를 집에 배치하기'])assert.ok(runtime.includes(phrase),phrase);
  assert.match(runtime,/첫 개척 목표/);
});

test('starter loop is current cached Seed World v32',()=>{
  assert.match(html,/kidscade-world-v3\.js\?v=32/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=32/);
});
