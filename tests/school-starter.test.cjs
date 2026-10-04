const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const dir=path.join(root,'assets/game/characters/kidscade-avatar-v3/school-starter');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const pack=JSON.parse(fs.readFileSync(path.join(dir,'school-starter.json'),'utf8'));

test('school starter ships a 23-frame nine-part v3 set',()=>{
  assert.equal(manifest.id,'school-starter-01');
  assert.equal(manifest.frameOrder.length,23);
  assert.equal(Object.keys(pack.frames).length,23);
  for(const id of ['basic-tousled-hair-01','basic-eyes-01','basic-flat-mouth-01','copper-ring-earring-01','basic-school-uniform-upper-01','basic-school-uniform-lower-01','basic-sneakers-01','school-ruler-01','school-textbook-01']){
    assert.ok(Object.values(manifest.assetIds).includes(id),id);
  }
  assert.ok(fs.existsSync(path.join(dir,'guest-default.png')));
  assert.ok(fs.existsSync(path.join(dir,'school-starter-sheet.png')));
});
test('school starter never overwrites BODY',()=>{
  for(const frame of Object.values(pack.frames))assert.ok(!Object.hasOwn(frame.layers,'body'));
});
test('equipment keeps explicit front and back passes',()=>{
  for(const frame of Object.values(pack.frames)){
    for(const layer of ['weaponFront','weaponBack','shieldFront','shieldBack'])assert.ok(frame.layers[layer],layer);
  }
  assert.ok(pack.frames['attack-02'].layers.weaponBack.operations[0].pixels.length>0);
});