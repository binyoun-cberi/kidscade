const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const dir=path.join(ROOT,'games/western_quickdraw');
const SRC=fs.readFileSync(path.join(dir,'arcade.js'),'utf8');
const MODES=['gallery','hurdles','coins','cattle','disco'];

function playHarness(){
 let now=0,raf=[],serial=0;
 const elems=new Map(),listeners={},events=[],memory=new Map();
 function el(id){
  if(elems.has(id))return elems.get(id);
  const cls=new Set();
  const item={
   id,dataset:{},handlers:{},textContent:'',innerHTML:'',disabled:false,
   classList:{contains:v=>cls.has(v),add:v=>cls.add(v),remove:v=>cls.delete(v),
    toggle(v,on){if(on===undefined?!cls.has(v):on)cls.add(v);else cls.delete(v)}},
   addEventListener(name,fn){this.handlers[name]=fn},focus(){},closest(){return null},
   getBoundingClientRect(){return {left:0,top:0,width:900,height:600}},
   getContext(){return new Proxy({}, {get(){return ()=>{}}})}
  };
  elems.set(id,item);return item;
 }
 const document={
  hidden:false,
  getElementById:el,
  querySelectorAll(query){
   if(query==='[data-arcade]'||query==='[data-best]'){
    return MODES.map(mode=>{const e=el(query+'-'+mode);e.dataset[query==='[data-arcade]'?'arcade':'best']=mode;return e});
   }
   return [];
  },
  addEventListener(name,fn){listeners['document:'+name]=fn}
 };
 const window={
  devicePixelRatio:1,
  addEventListener(name,fn){listeners['window:'+name]=fn},
  KidscadeGame:{start:payload=>events.push(['start',payload]),result:payload=>events.push(['result',payload])}
 };
 const math=Object.create(Math);math.random=()=>.5;
 const sandbox={document,window,performance:{now:()=>now},Math:math,
   localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,val)=>memory.set(key,val)},
   Audio:class{pause(){}play(){return Promise.resolve()}},
   Image:class{constructor(){this.complete=false;this.naturalWidth=0}set src(value){this.url=value}},
   requestAnimationFrame:fn=>{raf.push(fn);return ++serial},
   console
 };
 assert.doesNotThrow(()=>vm.runInNewContext(SRC,sandbox,{filename:'arcade.js'}));
 function frame(n=1){for(let i=0;i<n;i++){now+=50;const cb=raf.shift();assert.equal(typeof cb,'function');cb(now)}}
 function click(id){const e=el(id);assert.equal(typeof e.handlers.click,'function',id);e.handlers.click({target:e,preventDefault(){}})}
 function begin(mode){click('[data-arcade]-'+mode);assert.equal(state().mode,mode)}
 function pointer(x,y){
  const e=el('playfield');assert.equal(typeof e.handlers.pointerdown,'function');
  e.handlers.pointerdown({clientX:x,clientY:y,preventDefault(){},target:e});
 }
 function key(code){const handler=listeners['window:keydown'];assert.equal(typeof handler,'function');handler({code,repeat:false,target:{closest(){return false}},preventDefault(){}})}
 function state(){return window.KidscadeWesternArcade.getState()}
 return {begin,click,frame,pointer,key,state,el,document,listeners,events,memory};
}
test('arcade is reachable from existing duel page and references only available resources',()=>{
 assert.match(fs.readFileSync(path.join(dir,'index.html'),'utf8'),/href="arcade\.html"/);
 const html=fs.readFileSync(path.join(dir,'arcade.html'),'utf8');
 assert.match(html,/data-game-id="western_quickdraw"/);
 assert.deepEqual([...html.matchAll(/data-arcade="([a-z]+)"/g)].map(x=>x[1]),MODES);
 for(const file of ['arcade.html','arcade.css','arcade.js',
  '../../assets/game/2d/animals/round/horse.png',
  '../../assets/game/2d/animals/round/cow.png',
  '../../assets/audio/sfx/collect/coin-pickup-01.mp3',
  '../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',
  '../../assets/audio/sfx/combat/impact-heavy-01.mp3',
  '../../assets/audio/sfx/success/cheer-yay-01.mp3',
  '../../assets/audio/sfx/failure/fail-sting-01.mp3']){
  assert.ok(fs.existsSync(path.join(dir,file)),'missing asset: '+file);
 }
 assert.doesNotThrow(()=>new vm.Script(SRC));
});
test('all five modes start with valid HUD and make progress without crashes',()=>{
 for(const mode of MODES){
  const h=playHarness();h.begin(mode);assert.equal(h.state().phase,'playing');
  h.frame(19);assert.ok(h.state().elapsed>0);
  assert.ok(h.el('gameName').textContent.length>0);
  assert.equal(h.events[0][0],'start');
  h.click('pauseBtn');assert.equal(h.state().phase,'paused');
  const seconds=h.state().elapsed;h.frame(5);assert.equal(h.state().elapsed,seconds);
  h.click('resumeBtn');h.frame(2);assert.ok(h.state().elapsed>seconds);
 }
});
test('gallery shoots targets, expends ammo and rewards empty-magazine reload',()=>{
 const h=playHarness();h.begin('gallery');h.frame(14);
 assert.ok(h.state().spawned>0);
 h.pointer(450,289);assert.ok(h.state().points>0);
 for(let i=0;i<5;i++)h.pointer(5,100);
 assert.equal(h.state().ammo,0);
 h.key('KeyR');assert.equal(h.state().ammo,6);assert.equal(h.state().multiplier,2);
});
test('hurdles jump through touch and keyboard, and movement earns distance points',()=>{
 const h=playHarness();h.begin('hurdles');h.frame(10);
 assert.ok(h.state().points>0);h.pointer(300,340);h.frame(2);
 assert.ok(h.state().jumpY>0);
});
test('coin click produces a real bounce and score',()=>{
 const h=playHarness();h.begin('coins');h.frame(4);
 h.pointer(450,125);assert.ok(h.state().points>0);assert.equal(h.state().lives,3);
});
test('cow lasso predicts motion and captures a cow after rope travel',()=>{
 const h=playHarness();h.begin('cattle');h.frame(32);
 assert.ok(h.state().spawned>0);
 h.pointer(198,321);assert.equal(h.state().ropes,1);h.frame(8);
 assert.ok(h.state().points>0,'predictive throw should catch the first moving cow');
});
test('disco notes have distinct lanes, registered timing hits and 6-shot reload',()=>{
 const h=playHarness();h.begin('disco');h.frame(40);
 h.key('KeyK');assert.ok(h.state().points>0);assert.equal(h.state().ammo,5);
 for(let i=0;i<5;i++)h.key('KeyK');
 assert.equal(h.state().ammo,0);
 h.key('KeyR');assert.equal(h.state().ammo,6);assert.equal(h.state().multiplier,2);
});
test('failed arcade run emits its own result without mixing with duel scores',()=>{
 const h=playHarness();h.begin('gallery');
 h.frame(500);
 assert.equal(h.state().phase,'finish');
 const e=h.events.find(e=>e[0]==='result');
 assert.ok(e);assert.equal(e[1].scope,'run');assert.equal(e[1].miniGame,'gallery');
 assert.equal(Object.hasOwn(e[1],'score'),false);
 h.click('menuBtn');assert.equal(h.state().phase,'menu');
});
test('visibility pause stops simulated game time until resumed',()=>{
 const h=playHarness();h.begin('coins');h.frame(5);
 h.document.hidden=true;h.listeners['document:visibilitychange']();
 assert.equal(h.state().phase,'paused');
 const before=h.state().elapsed;h.frame(6);
 assert.equal(h.state().elapsed,before);
 h.click('resumeBtn');h.frame(2);assert.ok(h.state().elapsed>before);
});
