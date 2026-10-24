const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const dir=path.join(ROOT,'games/western_quickdraw');
const SRC=fs.readFileSync(path.join(dir,'arcade.js'),'utf8');
const MODES=['gallery','hurdles','coins','cattle','disco'];

function playHarness({width=900,height=600}={}){
 const viewport={width,height};
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
   getBoundingClientRect(){return {left:0,top:0,width:viewport.width,height:viewport.height}},
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
 function resize(width,height){viewport.width=width;viewport.height=height;listeners['window:resize']()}
 return {begin,click,frame,pointer,key,state,resize,el,document,listeners,events,memory};
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
 h.pointer(450,125);assert.ok(h.state().points>0);assert.equal(h.state().lives,5);
});
test('cow lasso predicts motion and captures a cow after rope travel',()=>{
 const h=playHarness();h.begin('cattle');h.frame(32);
 assert.ok(h.state().spawned>0);
 h.pointer(198,321);assert.equal(h.state().ropes,1);h.frame(8);
 assert.ok(h.state().points>0,'predictive throw should catch the first moving cow');
});
test('coin juggling gives novices more than a few seconds to learn while remaining failable',()=>{
 const h=playHarness();h.begin('coins');h.frame(220);
 assert.equal(h.state().phase,'playing','newcomers should not fail in the first eleven seconds');
 assert.ok(h.state().lives>0);
 h.frame(400);
 assert.equal(h.state().phase,'finish','unattended coins must eventually fall and end the game');
});
test('lasso cannot catch a cow before it enters the playable field',()=>{
 const h=playHarness();h.begin('cattle');h.frame(13);
 h.pointer(30,321);h.frame(8);
 assert.equal(h.state().points,0,'no scoring for invisible cows beyond the left boundary');
 h.frame(12);h.pointer(205,321);h.frame(8);
 assert.ok(h.state().points>0,'leading a visible moving cow should capture it');
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


test('loop 1: first coin uses the live portrait viewport and rescales on rotation',()=>{
 const h=playHarness({width:450,height:800});h.begin('coins');
 assert.equal(h.state().objects.length,1);
 assert.ok(Math.abs(h.state().objects[0].y-400)<1,'coin should start at 25% of actual logical height');
 h.resize(900,600);
 assert.ok(Math.abs(h.state().objects[0].y-150)<1,'coin should remain in corresponding visible location');
});
test('loop 1: gallery outlaw target actually moves and can still be hit',()=>{
 const h=playHarness();h.begin('gallery');h.frame(14);
 const a=h.state().objects.find(o=>o.kind==='outlaw');assert.ok(a);
 h.frame(14);const b=h.state().objects.find(o=>o.kind==='outlaw');assert.ok(b);
 assert.ok(Math.abs(a.x-b.x)>10,'outlaw target should move, not just expire');
 h.pointer(b.x,b.y);assert.ok(h.state().points>0);
});
test('loop 1: a perfect hurdle jump bonus remains after later frames',()=>{
 const h=playHarness();h.begin('hurdles');
 let acquired=false;
 for(let i=0;i<230;i++){
  const g=h.state();
  const obstacle=g.obstacles.find(o=>o.x>=285&&o.x<308&&!o.hit);
  if(obstacle&&g.jumpY===0)h.key('Space');
  h.frame();
  if(h.state().bonusPoints>0){acquired=true;break}
 }
 assert.equal(acquired,true,'a well-timed jump should earn a bonus');
 const bonus=h.state().bonusPoints;
 h.frame(7);
 assert.ok(h.state().bonusPoints>=bonus);
 assert.ok(h.state().points>=Math.floor(h.state().distance)+bonus,'jump bonus must not be overwritten');
});
test('loop 2: three consecutive missed lassos cost one life',()=>{
 const h=playHarness();h.begin('cattle');
 for(let i=0;i<3;i++){h.pointer(840,300);h.frame(12)}
 assert.equal(h.state().lives,2);
 assert.equal(h.state().lassoMisses,0);
});
test('loop 2: rhythm notes trigger visible beats and feedback when hit',()=>{
 const h=playHarness();h.begin('disco');h.frame(40);
 assert.equal(h.state().beatIndex,0);
 h.key('KeyK');
 assert.ok(h.state().points>0);
 assert.ok(h.state().beatFlash>0);
 h.frame(9);
 assert.equal(h.state().beatFlash,0);
});
test('loop 3: arcade exposes keyboard aiming and in-game mute control',()=>{
 const html=fs.readFileSync(path.join(dir,'arcade.html'),'utf8');
 assert.match(html,/id="soundBtn"/);
 assert.match(SRC,/PC는 방향키로 조준/);
 const h=playHarness();h.begin('gallery');
 const before=h.state().aim.x;
 h.key('ArrowLeft');assert.ok(h.state().aim.x<before);
 h.click('soundBtn');assert.equal(h.el('soundBtn').textContent,'×');
 h.click('soundBtn');assert.equal(h.el('soundBtn').textContent,'♪');
});
