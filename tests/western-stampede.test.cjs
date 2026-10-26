const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const BASE=path.join(ROOT,'games/western_quickdraw');
const SOURCE=fs.readFileSync(path.join(BASE,'stampede.js'),'utf8');

function harness({width=450,height=800,seed=.5,stored=null}={}){
 let ms=0,frames=[],elem=new Map(),listeners={},result=[],memory=new Map(),serial=0;
 const viewport={width,height};
 if(stored)memory.set('kidscade-western-stampede-v1',JSON.stringify(stored));
 function get(id){
  if(elem.has(id))return elem.get(id);
  const flags=new Set();
  const e={id,textContent:'',innerHTML:'',style:{},dataset:{},value:'',handlers:{},attrs:{},
   classList:{toggle(key,on){if(on)flags.add(key);else flags.delete(key)},contains:k=>flags.has(k),add:k=>flags.add(k),remove:k=>flags.delete(k)},
   addEventListener(key,fn){this.handlers[key]=fn},
   setAttribute(key,value){this.attrs[key]=value},
   closest(){return null},focus(){},
   getBoundingClientRect(){return {top:0,left:0,width:viewport.width,height:viewport.height}},
   getContext(){return new Proxy({}, {get(target,key){
    if(key==='createLinearGradient')return ()=>({addColorStop(){}});
    return ()=>{};
   }})}
  };elem.set(id,e);return e;
 }
 const document={getElementById:get,hidden:false,addEventListener(k,fn){listeners['document:'+k]=fn}};
 const window={devicePixelRatio:1,addEventListener(k,fn){listeners['window:'+k]=fn},
  KidscadeGame:{start:x=>result.push(['start',x]),result:x=>result.push(['result',x])}};
 const rng=Object.create(Math);rng.random=()=>seed;
 const context={document,window,Math:rng,performance:{now:()=>ms},
  localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,val)=>memory.set(key,val)},
  Audio:class{pause(){}play(){return Promise.resolve()}},
  Image:class{constructor(){this.complete=false;this.naturalWidth=0}set src(v){this.url=v}},
  requestAnimationFrame:fn=>{frames.push(fn);return ++serial},console
 };
 vm.runInNewContext(SOURCE,context,{filename:'stampede.js'});
 function frame(count=1){for(let i=0;i<count;i++){ms+=50;const callback=frames.shift();assert.equal(typeof callback,'function');callback(ms)}}
 function click(id){const el=get(id);assert.equal(typeof el.handlers.click,'function');el.handlers.click({target:el})}
 function coords(x){return viewport.width*(x+1)/2}
 function down(x=0){const c=get('scene');c.handlers.pointerdown({clientX:coords(x),pointerId:1,preventDefault(){}})}
 function move(x=0){const c=get('scene');c.handlers.pointermove({clientX:coords(x),pointerId:1,preventDefault(){}})}
 function up(){const c=get('scene');c.handlers.pointerup({pointerId:1})}
 function key(type,code){listeners['window:'+type]({code,repeat:false,target:{closest(){return null}},preventDefault(){}})}
 return {frame,click,down,move,up,key,state:()=>window.KidscadeStampede.getState(),window,document,listeners,result,memory,coords,resize(w,h){viewport.width=w;viewport.height=h;listeners['window:resize']()},get};
}

test('original duel and Western arcade link to new original animal-hopping runner',()=>{
 const quick=fs.readFileSync(path.join(BASE,'index.html'),'utf8');
 const arcade=fs.readFileSync(path.join(BASE,'arcade.html'),'utf8');
 const html=fs.readFileSync(path.join(BASE,'stampede.html'),'utf8');
 assert.match(quick,/href="stampede\.html"/);
 assert.match(arcade,/href="stampede\.html"/);
 assert.match(html,/data-game-id="western_quickdraw"/);
 assert.match(html,/누르고 끌기/);
 assert.doesNotThrow(()=>new vm.Script(SOURCE));
 for(const id of ['horse','cow','buffalo','zebra','goat','elephant']){
  assert.ok(fs.existsSync(path.join(ROOT,'assets/game/2d/animals/round',id+'.png')),id);
 }
});
test('starts mounted, advances automatically and persists pause',()=>{
 const h=harness();h.click('startBtn');
 assert.equal(h.state().status,'mounted');assert.equal(h.state().mount,'horse');
 h.frame(20);assert.ok(h.state().distance>25);
 h.click('pauseBtn');const d=h.state().distance;assert.equal(h.state().phase,'pause');
 h.frame(30);assert.equal(h.state().distance,d);
 h.click('resumeBtn');h.frame(3);assert.ok(h.state().distance>d);
});
test('press, release, press catches a new animal with preserved hold state',()=>{
 const h=harness();h.click('startBtn');
 h.down(-.12);h.frame(8);h.up();assert.equal(h.state().status,'air');
 h.down(-.12);assert.equal(h.state().status,'mounted');
 assert.equal(h.state().mount,'buffalo');assert.equal(h.state().transfers,1);
 assert.equal(h.state().held,true);
});
test('failure to reattach during airborne window ends run rather than teleporting',()=>{
 const h=harness();h.click('startBtn');h.down(.9);h.frame(5);h.up();
 h.down(.9);h.frame(35);
 assert.equal(h.state().phase,'result');
 assert.ok(h.result.some(x=>x[0]==='result'));
});
test('animal bucks after mount stamina expires, records are still preserved',()=>{
 const h=harness();h.click('startBtn');
 h.frame(170);assert.equal(h.state().phase,'result');
 const record=JSON.parse(h.memory.get('kidscade-western-stampede-v1'));
 assert.ok(record.best>0);assert.ok(record.tamed.includes('horse'));
 assert.equal(h.result.find(x=>x[0]==='result')[1].miniGame,'animal_hopping');
});
test('keyboard hold/release/hold and lateral movement work',()=>{
 const h=harness();h.click('startBtn');h.key('keydown','Space');h.key('keydown','ArrowLeft');
 h.frame(10);assert.ok(h.state().x<0);
 h.key('keyup','ArrowLeft');h.key('keyup','Space');
 assert.equal(h.state().status,'air');
 h.key('keydown','Space');assert.equal(h.state().status,'mounted');
});
test('existing progress is loaded without mixing old cattle or duel records',()=>{
 const h=harness({stored:{best:610,tamed:['horse','cow']}});assert.equal(h.state().best,610);
 assert.equal(h.state().tamed.length,2);
 h.click('startBtn');h.frame(4);assert.equal(h.state().best,610);
});
test('visibility pause and resume does not fast forward or trigger a jump',()=>{
 const h=harness();h.click('startBtn');h.down(-.2);h.frame(5);
 h.document.hidden=true;h.listeners['document:visibilitychange']();
 assert.equal(h.state().phase,'pause');const d=h.state().distance;
 h.frame(20);assert.equal(h.state().distance,d);
 h.click('resumeBtn');assert.equal(h.state().status,'mounted');
});
