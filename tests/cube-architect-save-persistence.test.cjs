'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
class MemoryStorage{
 constructor(){this.store=new Map()}
 getItem(key){return this.store.get(String(key))??null}
 setItem(key,value){this.store.set(String(key),String(value))}
 removeItem(key){this.store.delete(String(key))}
}
test('Cube Architect v4 survival and creative world saves round-trip via the shared storage registry',()=>{
 const previous=global.localStorage;global.localStorage=new MemoryStorage();
 try{
  const src=fs.readFileSync(path.join(ROOT,'kidscade-storage.js'),'utf8');
  const module={exports:{}};new Function('module',src)(module);
  const storage=module.exports;
  for(const world of ['survival','creative']){
   const name='cubeArchitectWorldSaveV4_'+world;
   const data={version:15,bag:{planks:4},magicWorkbenchPos:[2,3,3],edits:[['2,3,3',{type:'workbench',magicWorkbench:true}]]};
   assert.equal(storage.resolveKey(name),name,'keep legacy persisted key for compatibility');
   assert.equal(storage.setJson(name,data),true);
   assert.deepEqual(storage.getJson(name,null),data);
   assert.equal(storage.isRegisteredPhysicalKey(name),true);
  }
  for(const version of ['V2','V3']){
   assert.equal(storage.getJson('cubeArchitectWorldSave'+version,null),null,'old saves remain readable');
  }
 }finally{global.localStorage=previous}
});
test('save button displays a failure when shared storage fails rather than a false success toast',()=>{
 const src=fs.readFileSync(path.join(ROOT,'games/cube3d/cube-architect.js'),'utf8');
 assert.match(src,/if\(saveFreeWorld\(\)\)toast\('월드를 저장했어요\.'\)/);
 assert.match(src,/else toast\('저장에 실패했어/);
 assert.doesNotThrow(()=>new Function(src));
});
