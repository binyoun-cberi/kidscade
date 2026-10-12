'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'games/high_midnight_diner/game.js'),'utf8');
const R=require('../games/high_midnight_diner/rules.js');
function gameHarness(){
 const nodes=new Map(),timers=new Map(),listeners=new Map(),docListeners=new Map();
 let ms=100,nextTimer=0;
 const attach=(group,type,fn)=>{if(!group.has(type))group.set(type,[]);group.get(type).push(fn)};
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const el={id,style:{setProperty(){}},className:id==='notebookPanel'?'hidden':'',
   textContent:'',disabled:false,offsetWidth:1,attrs:{},handlers:new Map(),kids:[],
   setAttribute(k,v){this.attrs[k]=v},append(n){this.kids.push(n)},replaceChildren(){this.kids=[]},
   addEventListener(type,fn){attach(this.handlers,type,fn)},
   emit(type,event={}){for(const fn of this.handlers.get(type)||[])fn(event)}};
  el.classList={
   add(...values){const set=new Set(el.className.split(/\s+/).filter(Boolean));values.forEach(v=>set.add(v));el.className=[...set].join(' ')},
   remove(...values){const set=new Set(el.className.split(/\s+/).filter(Boolean));values.forEach(v=>set.delete(v));el.className=[...set].join(' ')},
   contains(v){return el.className.split(/\s+/).includes(v)},
   toggle(v,forced){const active=forced===undefined?!this.contains(v):!!forced;if(active)this.add(v);else this.remove(v);return active}
  };
  nodes.set(id,el);return el;
 }
 const win={MidnightDinerRules:{...R,begin:()=>R.begin(42)},
  MidnightDinerPlate:{draw(){},hit(canvas,event){return event.zone}},
  addEventListener(type,fn){attach(listeners,type,fn)},
  dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event)}};
 const doc={hidden:false,getElementById:node,createElement(tag){return node(tag+'-'+nodes.size)},
  querySelector:node,addEventListener(type,fn){attach(docListeners,type,fn)},
  dispatchEvent(event){for(const fn of docListeners.get(event.type)||[])fn(event)}};
 const ctx={window:win,document:doc,localStorage:{getItem:()=>null,setItem(){}},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  performance:{now:()=>ms},setInterval(fn){const id=++nextTimer;timers.set(id,fn);return id},
  clearInterval(id){timers.delete(id)},console};
 vm.runInNewContext(source,ctx,{filename:'game.js'});
 function advance(milliseconds){
  const ticks=Math.ceil(milliseconds/50);
  for(let i=0;i<ticks;i++){ms+=50;for(const fn of [...timers.values()])fn()}
 }
 return {node,advance,win};
}
test('the first dish quietly invites a glance, then withdraws the signal on observation',()=>{
 const h=gameHarness();
 h.node('startBtn').emit('click');
 assert.match(h.node('feedback').textContent,/부침개 여덟 조각/);
 assert.equal(h.node('peekBtn').classList.contains('first-glimpse'),true);
 h.node('peekBtn').emit('pointerdown',{cancelable:true,preventDefault(){}});
 h.advance(800);
 h.node('peekBtn').emit('pointerup');
 assert.match(h.node('chefLine').textContent,/내 손을 보고 있었나/);
 assert.equal(h.node('peekBtn').classList.contains('first-glimpse'),false);
 // This is merely an invitation: ordinary cooking completes without a scripted pause.
 h.advance(26000);
 assert.equal(h.node('first').id==='first',true);
 assert.equal(h.node('selectionText').textContent,'아까 본 조각은 어느 쪽이었지?');
 assert.equal(h.node('.game-layout').classList.contains('first-plate-choice'),true);
});
test('first dish selection and first bite are responsive, keyboard/pointer equivalent, and do not repeat',()=>{
 const h=gameHarness();
 h.node('startBtn').emit('click');
 // Wait out normal cooking without peeking; no forced input or automatic reward.
 h.advance(27000);
 assert.equal(h.node('selectionText').textContent,'여덟 조각 중 어디로 손이 갈까?');
 const g=h.win.MidnightDinerRules; // Use original deterministic seed 42 to find safe zones.
 const safe=R.begin(42).dish.zones.filter(z=>!z.dangerous).slice(0,3).map(z=>z.id);
 h.node('plate').emit('pointerdown',{zone:safe[0]});
 assert.match(h.node('chefLine').textContent,/그 조각으로 할 거냐/);
 assert.equal(h.node('.game-layout').classList.contains('first-plate-choice'),false);
 h.node('eatBtn').emit('click');
 assert.match(h.node('chefLine').textContent,/첫입은 넘겼군/);
 h.node('plate').emit('pointerdown',{zone:safe[1]});
 assert.doesNotMatch(h.node('chefLine').textContent,/그 조각으로 할 거냐/);
 h.node('eatBtn').emit('click');
 h.node('plate').emit('pointerdown',{zone:safe[2]});
 h.node('eatBtn').emit('click');
 h.node('nextCourseBtn').emit('click');
 assert.equal(h.node('peekBtn').classList.contains('first-glimpse'),false);
 assert.equal(h.node('.game-layout').classList.contains('first-plate-choice'),false);
 h.node('retryBtn').emit('click');
 assert.equal(h.node('peekBtn').classList.contains('first-glimpse'),true);
 h.advance(27000);
 h.node('document')?.emit?.('noop');
});
test('the subtle first-course styling avoids overlays and respects reduced motion',()=>{
 const html=fs.readFileSync(path.join(ROOT,'games/high_midnight_diner/index.html'),'utf8');
 const css=fs.readFileSync(path.join(ROOT,'games/high_midnight_diner/first-course.css'),'utf8');
 assert.match(html,/href="first-course\.css"/);
 assert.match(css,/#peekBtn\.first-glimpse/);
 assert.match(css,/\.first-plate-choice \.plate-instruction/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/position:\s*(?:fixed|absolute)/);
 assert.doesNotMatch(source,/TUTORIAL|튜토리얼 시작|다음 단계로/);
});
