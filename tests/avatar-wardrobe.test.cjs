const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),dir=path.join(root,'assets/game/characters/kidscade-avatar-v3/school-starter');
const read=p=>JSON.parse(fs.readFileSync(path.join(dir,p),'utf8')),manifest=read('manifest.json'),catalog=read('wardrobe/catalog.json');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'app/features/avatar/wardrobe-parts.js'),'utf8'),context);const api=context.window.KidscadeAvatarWardrobe;
const tops=['hoodie-01','short-puffer-01','long-puffer-01','box-tee-01','leather-jacket-01','denim-jacket-01','suit-jacket-01','baseball-jacket-01'],bottoms=['tennis-skirt-01','detailed-jeans-01','cotton-trousers-01'];
test('tailored tops have real sleeves, independent role details and complete upper-only frames',()=>{
 const cat=read('upper/catalog.json'),parts=cat.items.filter(i=>i.file).map(i=>read('upper/'+i.file)).filter(p=>p.designRevision==='tailored-sleeves-2');
 assert.equal(parts.length,22);
 const signatures=new Set();
 for(const part of parts){
  api.validate(part,'upper',part.id,manifest.frameOrder);
  const px=part.frames['stand-01'].layers.upper.operations[0].pixels;
  signatures.add(JSON.stringify(px));
  if(!['box-tee-01','soccer-uniform-01','baseball-uniform-01','basketball-uniform-01','explorer-vest-01'].includes(part.id)){
   assert.ok(px.some(p=>p[0]<=52&&p[1]>=84&&p[1]<=88),part.id+' left sleeve');
   assert.ok(px.some(p=>p[0]>=80&&p[1]>=84&&p[1]<=88),part.id+' right sleeve');
  }
  for(const frame of Object.values(part.frames)){assert.deepEqual(Object.keys(frame.layers),['upper']);const p=frame.layers.upper.operations[0].pixels;assert.equal(new Set(p.map(v=>v[0]+','+v[1])).size,p.length)}
 }
 assert.equal(signatures.size,22);
 const scientist=parts.find(p=>p.id==='scientist-coat-01').frames['stand-01'].layers.upper.operations[0].pixels;
 assert.ok(scientist.some(p=>p[1]>100));assert.ok(scientist.filter(p=>p[2]>225&&p[3]>225&&p[4]>220).length>200);
});
test('back accessory catalog registers default plus ten distinct 23-frame items',()=>{
 const group=catalog.categories.back;assert.ok(group);assert.equal(group.label,'등 장식');assert.equal(group.defaultId,'no-back');assert.equal(group.layer,'back');assert.equal(group.items.length,11);
 const labels=group.items.map(item=>item.label);for(const label of ['책가방','토끼가방','공룡가방','곰돌이가방','미니백팩','기타 케이스','천사날개','악마날개','로켓부스터','망토'])assert.ok(labels.includes(label),label);
 for(const item of group.items){const part=read('wardrobe/'+item.file);assert.equal(part.assetIds.back,item.id,item.id);assert.equal(Object.keys(part.frames).length,23,item.id);for(const frameId of manifest.frameOrder){const pixels=part.frames[frameId].layers.back.operations[0].pixels;assert.ok(Array.isArray(pixels));if(item.id!=='no-back')assert.ok(pixels.length>80,item.id+' '+frameId)}}
});
test('head accessory catalog adds ten popular 23-frame items beside existing hats',()=>{
  const group=catalog.categories.hat;
  assert.equal(group.label,'머리 장식');
  assert.equal(group.defaultId,'no-hat');
  assert.equal(group.layer,'hat');
  assert.equal(group.items.length,15);
  const labels=group.items.map(item=>item.label);
  for(const label of ['고양이귀','토끼귀','곰귀','왕관','티아라','헤드폰','이어머프','천사링','악마뿔','꽃 머리핀'])assert.ok(labels.includes(label),label);
  for(const id of ['cat-ears-01','bunny-ears-01','bear-ears-01','crown-01','tiara-01','headphones-01','earmuffs-01','angel-halo-01','devil-horns-01','flower-pin-01']){
    const item=group.items.find(candidate=>candidate.id===id);assert.ok(item,id);
    const part=read('wardrobe/'+item.file);
    assert.equal(part.assetIds.hat,id,id);
    assert.equal(Object.keys(part.frames).length,23,id);
    for(const frameId of manifest.frameOrder){
      const pixels=part.frames[frameId].layers.hat.operations[0].pixels;
      assert.ok(Array.isArray(pixels)&&pixels.length>=10,id+' '+frameId);
    }
  }
});

test('face accessory catalog adds nine popular items and renames two existing labels',()=>{
  const group=catalog.categories.mask;
  assert.equal(group.label,'얼굴 장식');
  assert.equal(group.defaultId,'no-mask');
  assert.equal(group.items.length,16);
  const labels=group.items.map(item=>item.label);
  for(const label of ['동그란 안경','뿔테안경','선글라스','하트 안경','고글','수면안대','볼터치','주근깨','별 스티커','하트 스티커','볼 밴드','작은 흉터','마스크','외눈안경','루돌프 빨간코'])assert.ok(labels.includes(label),label);
  assert.equal(read('wardrobe/round-glasses-01.json').name,'동그란 안경');
  assert.equal(read('wardrobe/cheek-bandage-01.json').name,'볼 밴드');
  for(const id of ['blush-cheeks-01','freckles-01','star-sticker-01','heart-sticker-01','small-scar-01','sunglasses-01','heart-glasses-01','goggles-01','sleep-mask-01']){
    const item=group.items.find(candidate=>candidate.id===id);assert.ok(item,id);
    const part=read('wardrobe/'+item.file);
    assert.equal(part.assetIds.mask,id,id);
    assert.equal(Object.keys(part.frames).length,23,id);
    for(const frameId of manifest.frameOrder){
      const pixels=part.frames[frameId].layers.mask.operations[0].pixels;
      assert.ok(Array.isArray(pixels)&&pixels.length>=3,id+' '+frameId);
    }
  }
});

test('all requested wardrobe styles and separate face/hat/mouth slots stay registered for the runtime shop',()=>{
 for(const [key,ids] of [['upper',tops],['lower',bottoms]]){const cat=read(key+'/catalog.json');for(const id of ids)assert.ok(cat.items.some(i=>i.id===id));assert.equal(new Set(cat.items.map(i=>i.id)).size,cat.items.length)}
 assert.deepEqual(Object.fromEntries(Object.entries(catalog.categories).map(([k,g])=>[k,g.items.length])),{mask:16,hat:15,mouth:11,back:11});
 for(const g of Object.values(catalog.categories))for(const i of g.items)assert.equal(i.public,true);assert.equal(manifest.economy.pricing,'global-purchase-sequence');assert.equal(manifest.economy.defaultAssetsFree,true)
});
test('explicit 23-frame JSON modifies only its requested part and passes admin-compatible validation',()=>{
 const entries=[...tops.map(id=>['upper',id,'upper']),...bottoms.map(id=>['lower',id,'lower']),...Object.entries(catalog.categories).flatMap(([layer,g])=>g.items.map(i=>[layer,i.id,'wardrobe']))];
 for(const [layer,id,folder] of entries){const part=read(folder+'/'+id+'.json');api.validate(part,layer,id,manifest.frameOrder);assert.deepEqual(part.target.canvas,[128,128]);assert.equal(part.target.bodyId,manifest.bodyId);assert.deepEqual(Object.keys(part.frames),manifest.frameOrder);
  for(const f of Object.values(part.frames)){assert.deepEqual(Object.keys(f.layers),[layer]);const pixels=f.layers[layer].operations[0].pixels;assert.equal(new Set(pixels.map(p=>p[0]+','+p[1])).size,pixels.length,id)}
 }
});
test('coat silhouettes differ from shirts and pleated tennis skirt replaces trouser legs',()=>{
 const px=(folder,id)=>read(folder+'/'+id+'.json').frames['stand-01'].layers[folder].operations[0].pixels;
 const hem=id=>Math.max(...px('upper',id).map(p=>p[1]));assert.ok(hem('long-puffer-01')>hem('short-puffer-01')+10);assert.ok(hem('box-tee-01')>hem('suit-jacket-01'));
 const skirt=px('lower','tennis-skirt-01');assert.equal(Math.max(...skirt.map(p=>p[1])),103);assert.ok(skirt.some(p=>p[0]<=50)&&skirt.some(p=>p[0]>=84));
 const jeans=px('lower','detailed-jeans-01');assert.ok(jeans.some(p=>p[1]>=109));
});
test('iris colors and makeup/anime eyes have fourteen distinct pixel designs',()=>{
 const cat=read('eyes/catalog.json'),items=cat.items.filter(i=>i.id.endsWith('-eyes-02'));assert.equal(items.length,14);assert.equal(new Set(items.map(i=>JSON.stringify(read('eyes/'+i.file).pixels))).size,14);
 for(const i of items)for(const p of read('eyes/'+i.file).pixels){assert.ok(p[0]>=49&&p[0]<=76);assert.ok(p[1]>=45&&p[1]<=55)}
});
test('wardrobe preserves independent hat and face IDs and preloads reset defaults',async()=>{
 const calls=[];const w=await api.create({rootUrl:'.',manifest,fetchJson:async url=>{calls.push(url);return read(url.replace(/^\.\//,''))},loadImage:async()=>({}),createCanvas:()=>({getContext:()=>({})})});
 const state=await w.prepare({hat:'santa-hat-01',mask:'round-glasses-01',mouth:'unknown',hair:'custom-hair'});assert.equal(state.hat,'santa-hat-01');assert.equal(state.mask,'round-glasses-01');assert.equal(state.mouth,'basic-flat-mouth-01');assert.equal(state.hair,'custom-hair');assert.ok(calls.some(url=>url.endsWith('/no-hat.json')));const count=calls.length;await w.prepare(state);assert.equal(calls.length,count);
 await assert.rejects(w.load('hat','unknown'));
 const broken=read('wardrobe/santa-hat-01.json');broken.frames['stand-01'].layers.body={operations:[]};assert.throws(()=>api.validate(broken,'hat','santa-hat-01',manifest.frameOrder));
});
test('public UI exposes selections, loads dependencies first, and persists new slots without JSON upload',()=>{
 const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8'),js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');for(const key of ['hat','mask','mouth','back'])assert.ok(html.includes('data-tab="'+key+'"'));assert.ok(html.indexOf('app/features/avatar/wardrobe-parts.js')<html.indexOf('app/features/avatar/avatar-economy.js'));assert.ok(html.indexOf('app/features/avatar/avatar-economy.js')<html.indexOf('avatar-pixel-studio.js'));assert.match(js,/wardrobe\.prepare\(state.assetIds\)/);assert.doesNotMatch(html,/type="file"|JSON 가져오기|JSON 내보내기/);
});
