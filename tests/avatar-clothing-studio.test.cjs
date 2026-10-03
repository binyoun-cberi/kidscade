const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'teacher','avatar-clothing-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'teacher-avatar-clothing-studio.js'),'utf8');
const teacherHtml=fs.readFileSync(path.join(root,'teacher','index.html'),'utf8');
const teacherJs=fs.readFileSync(path.join(root,'teacher-accounts.js'),'utf8');

test('avatar clothing studio JavaScript parses cleanly',()=>{
  assert.doesNotThrow(()=>new Function(js));
});

test('global admin exposes the avatar clothing studio entry point',()=>{
  assert.match(teacherHtml,/id="admin-tools"/);
  assert.match(teacherHtml,/\/teacher\/avatar-clothing-studio\.html/);
  assert.match(teacherJs,/\$\('admin-tools'\)\?\.classList\.toggle\('hidden', globalOnlyHidden\)/);
});

test('clothing studio is fixed to real 128x128 runtime coordinates',()=>{
  assert.match(html,/canvas id="workCanvas" width="128" height="128"/);
  assert.match(js,/const SIZE=128/);
  assert.match(js,/master-base-128\.png/);
  assert.match(js,/runtime\/animation\/idle/);
  assert.match(js,/runtime\/animation\/walk/);
  assert.match(js,/imageSmoothingEnabled=false/);
});

test('clothing studio keeps frame-synced upper and lower layers',()=>{
  for(const text of ['STATIC','IDLE','WALK','상의 UPPER','하의 LOWER'])assert.match(html,new RegExp(text));
  assert.match(js,/upper:makeLayerCanvas\(\),lower:makeLayerCanvas\(\)/);
  assert.match(js,/idle-.*padStart/);
  assert.match(js,/walk-.*padStart/);
  assert.match(js,/runtimeScale:1,runtimeOffset:\[0,0\]/);
});

test('editor supports numeric placement pixel cleanup preview and export',()=>{
  for(const id of ['stampX','stampY','stampW','stampH','stampRotation','toolPencil','toolErase','copyPrev','playIdle','playWalk','exportCurrent','exportManifest']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/drawStamp\(/);
  assert.match(js,/paintAt\(/);
  assert.match(js,/snapshot\(/);
  assert.match(js,/toBlob/);
  assert.match(js,/kidscade-frame-synced-clothing-bundle/);
});

test('studio verifies global admin before exposing production tools',()=>{
  assert.match(js,/kc_teacher_admin_key/);
  assert.match(js,/\/api\/teacher\/overview/);
  assert.match(js,/body\.scope!==['"]global['"]/);
});
