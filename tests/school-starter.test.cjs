const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),studio=fs.readFileSync(path.join(root,'teacher-avatar-clothing-studio.js'),'utf8');
const dir=path.join(root,'assets/game/characters/kidscade-avatar-v3/school-starter');
const pack=JSON.parse(fs.readFileSync(path.join(dir,'school-starter.json')));
function fn(source,name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const next=source.indexOf('\nfunction ',start+1),asyncNext=source.indexOf('\nasync function ',start+1);return source.slice(start,Math.min(...[next,asyncNext].filter(n=>n>0)));}
test('school set applies through real importer pixel operations without touching BODY or unrelated layers',()=>{
 const constants=studio.slice(studio.indexOf('const SIZE='),studio.indexOf('const DRAFT_BODY_SOURCE_SECONDS='));
 const sandbox={};vm.createContext(sandbox);vm.runInContext(constants+';globalThis.defs={LAYERS,FRAMES,LAYER_ID_FIELDS};',sandbox);
 const frames=new Map(),metas=new Map();
 for(const f of sandbox.defs.FRAMES){const row={};for(const layer of sandbox.defs.LAYERS){let data=new Uint8ClampedArray(128*128*4);data[3]=255;row[layer]={getImageData:()=>({data:data.slice()}),putImageData:im=>{data=im.data.slice()},clearRect:()=>data.fill(0),data:()=>data};}frames.set(f.id,row);}
 Object.assign(sandbox,{frames,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),layerCtx:(id,l)=>frames.get(id)[l],layerCanvas:(id,l)=>frames.get(id)[l],snapshotFrameLayer(){},assetMeta:(id,l)=>metas.get(id+'/'+l),setAssetMeta:(id,l,v)=>metas.set(id+'/'+l,v),assetIdForLayer:l=>'old-'+l,hasInk:()=>true,rememberBodyFrame(){}});
 vm.runInContext(fn(studio,'validateFullAdjustmentFile')+'\n'+fn(studio,'applyPixelTuples')+'\n'+fn(studio,'applyLayerAdjustmentPlan'),sandbox);
 sandbox.validateFullAdjustmentFile(pack);
 assert.equal(Object.keys(pack.frames).length,23);assert.equal(Object.keys(pack.assetIds).length,11);
 for(const [fid,f] of Object.entries(pack.frames))for(const [layer,plan] of Object.entries(f.layers)){
  assert.notEqual(layer,'body');const seen=new Set();
  for(const [x,y,...rgba] of plan.operations[0].pixels){assert.ok(Number.isInteger(x)&&x>=0&&x<128&&Number.isInteger(y)&&y>=0&&y<128);assert.equal(rgba.length,4);for(const v of rgba)assert.ok(Number.isInteger(v)&&v>=0&&v<=255);assert.ok(!seen.has(x+','+y));seen.add(x+','+y);}
  metas.set(fid+'/'+layer,{id:'old-item'});sandbox.applyLayerAdjustmentPlan(fid,layer,plan,pack.assetIds[layer]);
  assert.equal(metas.get(fid+'/'+layer).id,pack.assetIds[layer]);
  assert.equal(frames.get(fid)[layer].data().filter((v,i)=>i%4===3&&v>0).length,seen.size);
 }
 for(const row of frames.values())for(const layer of ['body','mask','hat','gloves'])assert.equal(row[layer].data()[3],255);
 assert.throws(()=>sandbox.validateFullAdjustmentFile({...pack,frames:{'fake-01':{layers:{}}}}));
});
test('equipment has nonoverlapping front/back passes and an explicit back windup',()=>{
 for(const f of Object.values(pack.frames))for(const kind of ['weapon','shield']){
  const coords=l=>new Set(f.layers[l].operations[0].pixels.map(p=>p.slice(0,2).join(',')));
  const front=coords(kind+'Front'),back=coords(kind+'Back');assert.ok(front.size+back.size>0);for(const p of front)assert.ok(!back.has(p));
 }
 assert.ok(pack.frames['attack-02'].layers.weaponBack.operations[0].pixels.length>0);
 assert.equal(pack.frames['attack-02'].layers.weaponFront.operations[0].pixels.length,0);
});
test('guest default chooses school image; saved choices bypass it; missing image uses old renderer',async()=>{
 const src=fs.readFileSync(path.join(root,'avatar-integration.js'),'utf8');
 const start=src.indexOf('  function ensureGuestDefaultPreview()'),end=src.indexOf('\n  function ',start+10);const functionSource=src.slice(start,end);
 for(const scenario of ['new','saved','custom','failed']){
  const writes=new Map();let rigCalls=0,imageCalls=0;
  const ctx={URL,Image:class{constructor(){imageCalls++}async decode(){if(scenario==='failed')throw Error('missing')}},document:{baseURI:'https://example.com/',createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/png;school'})},storedPreview:()=>scenario==='saved'?'data:image/png;saved':'',guestDefaultPreviewPromise:null,isGuestSession:()=>true,pixelState:()=>scenario==='custom'?{hairId:'custom'}:null,localStorage:{getItem:k=>writes.get(k),setItem:(k,v)=>writes.set(k,v),removeItem:k=>writes.delete(k)},PREVIEW_KEY:'preview',PREVIEW_VERSION_KEY:'version',PREVIEW_VERSION:'v',loadAvatarRigRuntime:async()=>({create:async()=>{rigCalls++;return{snapshot:async()=> 'data:image/png;rig',destroy(){}}}}),guestConfigFromPixelState:()=>({}),isPreviewData:s=>s.startsWith('data:image/png')};
  vm.createContext(ctx);vm.runInContext(functionSource,ctx);const result=await ctx.ensureGuestDefaultPreview();
  assert.equal(result,'data:image/png;'+({new:'school',saved:'saved',custom:'rig',failed:'rig'}[scenario]));
  assert.equal(rigCalls,['custom','failed'].includes(scenario)?1:0);assert.equal(imageCalls,['new','failed'].includes(scenario)?1:0);
  if(scenario==='saved')assert.equal(writes.size,0);
 }
});
