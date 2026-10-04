const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'assets/game/characters/kidscade-avatar-v3/school-starter');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const runtime=fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v3/runtime/school-avatar-runtime.js'),'utf8');
const publicStudio=fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v3/runtime/avatar-school-studio.js'),'utf8');
const publicHtml=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8');
const adminStudio=fs.readFileSync(path.join(root,'teacher-avatar-clothing-studio.js'),'utf8');

function pngSize(file){
  const data=fs.readFileSync(file);
  assert.equal(data.toString('ascii',1,4),'PNG');
  return [data.readUInt32BE(16),data.readUInt32BE(20)];
}

test('v3 school starter has the complete 23-frame animation contract',()=>{
  assert.equal(manifest.id,'school-starter-01');
  assert.deepEqual(manifest.canvas,[128,128]);
  assert.equal(manifest.frameOrder.length,23);
  const expected={stand:2,walk:4,jump:1,attack:5,hurt:2,dead:4,sit:2,pickup:3};
  for(const [kind,count] of Object.entries(expected)){
    assert.equal(manifest.animations[kind].length,count,kind);
    for(const frame of manifest.animations[kind])assert.ok(manifest.frameOrder.includes(frame.id),frame.id);
  }
});

test('v3 sprite sheet and default preview dimensions match the 128px contract',()=>{
  assert.deepEqual(pngSize(path.join(dir,'school-starter-sheet.png')),[128*23,128]);
  assert.deepEqual(pngSize(path.join(dir,'guest-default.png')),[128,128]);
});

test('public runtime consumes only approved runtime assets, not the admin adjustment JSON',()=>{
  assert.match(runtime,/manifest\.json/);
  assert.match(runtime,/school-starter-sheet\.png/);
  assert.doesNotMatch(runtime,/school-starter\.json|FileReader|application\/json/);
  assert.match(publicStudio,/school-avatar-v3-23f-1/);
  assert.doesNotMatch(publicStudio,/FileReader|importFullAdjustment|importPartAdjustment/);
  assert.doesNotMatch(publicHtml,/type="file"|JSON 적용|JSON 내보내기/);
});

test('admin studio alone wires the editable school starter JSON after global-admin verification',()=>{
  assert.match(adminStudio,/async function verifyAdmin\(\)/);
  assert.match(adminStudio,/body\.scope!=='global'/);
  assert.match(adminStudio,/if\(!await verifyAdmin\(\)\)return/);
  assert.match(adminStudio,/school-starter\/school-starter\.json/);
  assert.match(adminStudio,/async function loadSchoolStarterSet\(\)/);
});
