const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),dir=path.join(root,'assets/game/characters/kidscade-avatar-v3/school-starter');
const read=p=>JSON.parse(fs.readFileSync(path.join(dir,p),'utf8')),manifest=read('manifest.json'),catalog=read('wardrobe/catalog.json');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'app/features/avatar/wardrobe-parts.js'),'utf8'),context);const api=context.window.KidscadeAvatarWardrobe;
const tops=['hoodie-01','short-puffer-01','long-puffer-01','box-tee-01','leather-jacket-01','denim-jacket-01','suit-jacket-01','baseball-jacket-01'],bottoms=['tennis-skirt-01','detailed-jeans-01','cotton-trousers-01'];
test('all requested wardrobe styles and separate face/hat/mouth slots are registered free choices',()=>{
 for(const [key,ids] of [['upper',tops],['lower',bottoms]]){const cat=read(key+'/catalog.json');for(const id of ids)assert.ok(cat.items.some(i=>i.id===id));assert.equal(new Set(cat.items.map(i=>i.id)).size,cat.items.length)}
 assert.deepEqual(Object.fromEntries(Object.entries(catalog.categories).map(([k,g])=>[k,g.items.length])),{mask:7,hat:5,mouth:11});
 for(const g of Object.values(catalog.categories))for(const i of g.items){assert.equal(i.price,0);assert.equal(i.public,true)}
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
 const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8'),js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');for(const key of ['hat','mask','mouth'])assert.ok(html.includes('data-tab="'+key+'"'));assert.ok(html.indexOf('app/features/avatar/wardrobe-parts.js')<html.indexOf('avatar-pixel-studio.js'));assert.match(js,/wardrobe\.prepare\(state.assetIds\)/);assert.doesNotMatch(html,/type="file"|JSON 가져오기|JSON 내보내기/);
});
