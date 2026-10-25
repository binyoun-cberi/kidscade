const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'games/high_road_weaver/game.js'),'utf8');
class Classes{
  constructor(){this.values=new Set();}
  add(x){this.values.add(x);}
  remove(x){this.values.delete(x);}
  contains(x){return this.values.has(x);}
  toggle(x,on){if(on===undefined)on=!this.contains(x);on?this.add(x):this.remove(x);return on;}
}
class Element{
  constructor(id,ctx){this.id=id;this.events=new Map();this.classList=new Classes();this.style={};this.dataset={};this.textContent='';this.ctx=ctx;}
  addEventListener(name,fn){const list=this.events.get(name)||[];list.push(fn);this.events.set(name,list);}
  emit(name,value){for(const fn of this.events.get(name)||[])fn(value);}
  click(){this.emit('click',{preventDefault(){}});}
  getBoundingClientRect(){return{left:0,top:0,width:1080,height:720};}
  getContext(){return this.ctx;}
  setPointerCapture(){}
}
async function makePage(savedCity=null){
  const sim=await import(pathToFileURL(path.join(ROOT,'games/high_road_weaver/sim-core.mjs')).href);
  const ctx=new Proxy({measureText:s=>({width:String(s).length*9})},{
    get(target,key){if(key in target)return target[key];return()=>{};},
    set(target,key,value){target[key]=value;return true;}
  });
  const elements=new Map(),get=id=>{
    if(!elements.has(id))elements.set(id,new Element(id,ctx));
    return elements.get(id);
  };
  const modes=['road','widen','light','roundabout','island','overpass','ramp','pan'].map(value=>{
    const e=new Element(value,ctx);e.dataset.mode=value;return e;
  });
  const widths=[2,4,6].map(value=>{const e=new Element(String(value),ctx);e.dataset.lanes=String(value);return e;});
  const document={
    hidden:false,
    getElementById:get,
    querySelectorAll:sel=>sel.includes('data-mode')?modes:widths,
    addEventListener(){}
  };
  const window={addEventListener(){}};
  const store=new Map(savedCity?[['kidscade_game_v1:high_road_weaver:world',JSON.stringify(savedCity)]]:[]),localStorage={
    getItem:k=>store.get(k)||null,
    setItem:(k,v)=>store.set(k,v)
  };
  class Image{constructor(){this.complete=false;this.naturalWidth=0;}set src(x){this._src=x;}}
  const clean=source.replace(/^import .*$/gm,'');
  const run=new Function('RoadWeaver','TOWN_TYPES','costOfRoad','pointOnPath','isWeekend',
    'document','window','localStorage','Image','devicePixelRatio','performance','requestAnimationFrame',
    'HTMLButtonElement',clean+';return {sim:()=>sim,render,updateHud};');
  const page=run(sim.RoadWeaver,sim.TOWN_TYPES,sim.costOfRoad,sim.pointOnPath,sim.isWeekend,
    document,window,localStorage,Image,1,{now:()=>100},()=>{},Element);
  return {page,get,modes,store};
}
function tap(canvas,id,x,y){
  const event={pointerId:id,clientX:x,clientY:y,preventDefault(){}};
  canvas.emit('pointerdown',event);canvas.emit('pointerup',event);
}
function drag(canvas,id,x0,y0,x1,y1){
  const start={pointerId:id,clientX:x0,clientY:y0,preventDefault(){}};
  const finish={pointerId:id,clientX:x1,clientY:y1,preventDefault(){}};
  canvas.emit('pointerdown',start);canvas.emit('pointermove',finish);canvas.emit('pointerup',finish);
}
test('the actual UI can start, draw a road and persist it without a browser',async()=>{
  const {page,get,store}=await makePage();
  get('startBtn').click();
  const canvas=get('map');
  drag(canvas,1,164,378,915,354);
  assert.equal(page.sim().roads.length,1);
  assert.ok(page.sim().route(page.sim().towns[0],page.sim().towns[1]));
  assert.ok(store.has('kidscade_game_v1:high_road_weaver:world'));
});
test('a saved v1 city still offers the continue button',async()=>{
  const {page,get,store}=await makePage();
  get('startBtn').click();
  const save=page.sim().snapshot();save.version=1;save.openTowns=2;
  store.set('kidscade_game_v1:high_road_weaver:world',JSON.stringify(save));
  get('continueBtn').click();
  assert.equal(page.sim().openTowns,2);
});
test('UI road tools create a real roundabout and protect map actions',async()=>{
  const {page,get,modes}=await makePage();
  get('startBtn').click();
  const map=get('map');
  drag(map,1,164,378,915,354);
  drag(map,2,530,120,530,610);
  modes.find(x=>x.dataset.mode==='roundabout').click();
  tap(map,3,530,366);
  assert.equal(page.sim().roundabouts.length,1);
  assert.ok(page.sim().route(page.sim().towns[0],page.sim().towns[1]).some(x=>x.edge.kind==='roundabout'));
  // No extra drawn road after a pinch gesture.
  modes.find(x=>x.dataset.mode==='road').click();
  const before=page.sim().roads.length;
  const a={pointerId:10,clientX:300,clientY:200,preventDefault(){}};
  const b={pointerId:11,clientX:380,clientY:200,preventDefault(){}};
  map.emit('pointerdown',a);map.emit('pointerdown',b);
  map.emit('pointermove',{...b,clientX:440});
  map.emit('pointerup',a);map.emit('pointerup',b);
  assert.equal(page.sim().roads.length,before);
});
test('UI draws new district scenes and weekday HUD without image assets',async()=>{
  const {page,get}=await makePage();
  get('startBtn').click();
  page.sim().openTowns=7;
  page.sim().day=6;
  assert.doesNotThrow(()=>page.render());
  assert.doesNotThrow(()=>page.updateHud(1000));
  assert.match(get('day').textContent,/토요일/);
  assert.match(get('guideTitle').textContent,/길이 필요|이어/);
});

test('QA 2: existing city is never overwritten by a single accidental tap',async()=>{
  const {RoadWeaver,TOWN_TYPES}=await import(pathToFileURL(path.join(ROOT,'games/high_road_weaver/sim-core.mjs')).href);
  const city=new RoadWeaver();
  assert.ok(city.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok);
  const saved=city.snapshot(),key='kidscade_game_v1:high_road_weaver:world';
  const {page,get,store}=await makePage(saved);
  assert.equal(get('continueBtn').classList.contains('hidden'),false);
  const before=store.get(key);
  get('startBtn').click();
  assert.equal(store.get(key),before,'one tap destroyed an existing save');
  assert.equal(get('overwriteWarning').classList.contains('hidden'),false);
  get('continueBtn').click();
  assert.equal(page.sim().roads.length,1,'continue must still load the old city');
});

test('QA 2: canceling a touch after setting a start point does not draw an unexpected road',async()=>{
  const {page,get}=await makePage();
  get('startBtn').click();
  const canvas=get('map');
  tap(canvas,1,164,378);
  const event={pointerId:2,clientX:350,clientY:370,preventDefault(){}};
  canvas.emit('pointerdown',event);canvas.emit('pointercancel',event);
  tap(canvas,3,915,354);
  assert.equal(page.sim().roads.length,0,'canceled touch reused the old start position');
});
