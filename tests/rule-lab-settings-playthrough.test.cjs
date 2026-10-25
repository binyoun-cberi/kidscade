const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../games/high_rule_lab/settings_mode',p),'utf8');
function fakeBrowser(){
 const elements=new Map(),rafs=[],listeners={},completed=[];
 let playerX=0,playerY=0;
 function el(id){
  if(!elements.has(id)){
   elements.set(id,{id,style:{},dataset:{},listeners:{},open:false,hidden:false,value:'0',textContent:'',
    classList:{add(){},remove(){}},
    addEventListener(n,fn){(this.listeners[n]??=[]).push(fn)},
    setPointerCapture(){},releasePointerCapture(){},hasPointerCapture(){return true},
    getBoundingClientRect(){return {left:0,top:0,width:960,height:540}},
    append(){},appendChild(){},focus(){},showModal(){this.open=true},close(){this.open=false}
   });
  }
  return elements.get(id);
 }
 const ctx=new Proxy({fillStyle:''},{
  get(obj,key){
   if(key==='measureText')return text=>({width:text.length*8});
   if(key==='roundRect')return (x,y)=>{if(obj.fillStyle==='#f6c77b'){playerX=x-4;playerY=y}};
   return obj[key]===undefined?()=>{}:obj[key];
  },set(obj,key,value){obj[key]=value;return true}
 });
 el('scene').getContext=()=>ctx;
 const doc={getElementById:el,createElement:()=>el('created'+Math.random()),querySelectorAll:()=>[],addEventListener(){},hidden:false};
 const win={addEventListener(n,fn){(listeners[n]??=[]).push(fn)},KidscadeGame:{start(){},result(x){completed.push(x)},registerPauseHandlers(){}}};
 const requestAnimationFrame=fn=>rafs.push(fn);
 const root={window:win,document:doc,localStorage:{getItem(){return null},setItem(){}},
  Image:class{constructor(){this.complete=false;this.naturalWidth=0}},requestAnimationFrame};
 vm.runInNewContext(read('logic.js'),root);
 vm.runInNewContext(read('game.js'),root);
 let time=1000;
 function frames(count){
  for(let i=0;i<count;i++){
   const next=rafs.shift();assert.ok(next,'animation loop must remain active');
   time+=16;next(time);
  }
 }
 function key(type,value){for(const fn of listeners[type]||[])fn({key:value,target:{tagName:'BODY'},preventDefault(){},repeat:false})}
 function walk(count){key('keydown','ArrowRight');frames(count);key('keyup','ArrowRight')}
 function change(name,value){el(name).value=value;for(const fn of el(name).listeners.input||[])fn()}
 function drag(sx,sy,tx,ty){
  const handle=el('dragHandle');
  for(const fn of handle.listeners.pointerdown||[])fn({pointerId:1,clientX:sx,clientY:sy,preventDefault(){}});
  for(const fn of handle.listeners.pointermove||[])fn({pointerId:1,clientX:tx,clientY:ty,preventDefault(){}});
  for(const fn of handle.listeners.pointerup||[])fn({pointerId:1,clientX:tx,clientY:ty,preventDefault(){}});
 }
 function cleared(){return el('clearDialog').open}
 function next(){assert.equal(cleared(),true,'must clear '+el('stageTitle').textContent+' before advancing');el('next').onclick();frames(2)}
 return {el,frames,key,walk,change,drag,cleared,next,completed,position(){return {x:playerX,y:playerY}}};
}
test('설정 탈출 7개 방: 이동, 잠금, 드래그 착지, 방어와 마지막 조합으로 실제 클리어',()=>{
 const game=fakeBrowser();
 game.frames(2);game.walk(235);assert.ok(game.cleared(),'1방 걷기');game.next();
 game.walk(235);assert.equal(game.cleared(),false,'어둠 상태는 잠금');
 game.change('brightness',75);game.walk(60);assert.ok(game.cleared(),'2방 밝기');game.next();
 game.change('volume',20);game.walk(235);assert.ok(game.cleared(),'3방 소리');game.next();
 game.drag(185,280,445,380);
 game.walk(55);
 game.key('keydown','ArrowRight');game.key('keydown',' ');game.frames(35);game.key('keyup',' ');
 assert.ok(game.position().y<410,'첫 점프로 올라가기');
 game.frames(22);assert.ok(Math.abs(game.position().y-337)<3,'창 위에 착지');
 game.key('keydown',' ');game.frames(47);game.key('keyup',' ');
 game.frames(110);game.key('keyup','ArrowRight');
 assert.ok(game.cleared(),'4방 두 번 점프로 낭떠러지 통과');game.next();
 game.change('frame',100);game.walk(240);assert.ok(game.cleared(),'5방 화면 길이');game.next();
 game.drag(145,260,635,385);game.frames(220);
 assert.match(game.el('feedback').textContent,/2 \/ 2/,'설정 창으로 두 번 막는다');
 game.walk(240);assert.ok(game.cleared(),'6방 방패');game.next();
 game.change('brightness',80);game.change('volume',20);game.change('frame',100);
 game.walk(240);assert.ok(game.cleared(),'7방 모든 설정 결합');
 assert.equal(game.completed.length,7);
});
