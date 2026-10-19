'use strict';
// Minimal browser-event harness: checks the entire order → calculation →
// forging → reward loop without installing a browser in the CI runner.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.resolve(__dirname,'../games/high_fraction_smith');
const E=require(path.join(dir,'fraction-engine.js'));
const P=require(path.join(dir,'puzzle-generator.js'));
const O=require(path.join(dir,'order-generator.js'));
const F=require(path.join(dir,'forge-minigame.js'));
const S=require(path.join(dir,'progress-store.js'));

function node(id=''){
  const listeners=new Map(),classes=new Set(),obj={id,dataset:{},style:{setProperty(key,value){this[key]=value}},children:[],disabled:false,_listeners:listeners};
  obj.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>{if(on)classes.add(c);else classes.delete(c)}};
  obj.addEventListener=(type,handler)=>{const list=listeners.get(type)||[];list.push(handler);listeners.set(type,list)};
  obj.dispatch=(type,props={})=>{for(const handler of listeners.get(type)||[])handler({type,...props})};
  obj.appendChild=child=>obj.children.push(child);
  obj.remove=()=>{};obj.focus=()=>{};obj.setPointerCapture=()=>{};
  obj.cloneNode=()=>node(id+'-clone');
  obj.getBoundingClientRect=()=>({left:0,right:400,top:0,bottom:250,width:400,height:250});
  obj.querySelector=()=>({textContent:'🔨'});
  Object.defineProperty(obj,'innerHTML',{get(){return obj._html||''},set(v){obj._html=v;if(v==='')obj.children=[]}});
  return obj;
}

function mount(){
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)};
  const toolOps=['+','-','×','÷'],tools=toolOps.map(op=>{const n=node('tool-'+op);n.dataset.op=op;return n});
  const modes=['practice','rush','master'].map(mode=>{const n=node('mode-'+mode);n.dataset.mode=mode;return n});
  const slots=[get('#slotA'),get('#slotB')];slots.forEach((n,i)=>n.dataset.slot=String(i));
  const pending=[],keys={};let now=1000,raf=0;
  const document={body:node('body'),querySelector:get,querySelectorAll:selector=>selector==='.tool'?tools:selector==='[data-mode]'?modes:selector==='.slot'?slots:[],createElement:()=>node('created'),elementFromPoint:()=>null};
  const saved=new Map(),localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
  const context={document,window:{FractionSmithMath:E,FractionSmithPuzzles:P,FractionSmithOrders:O,FractionSmithForge:F,FractionSmithProgress:S,FractionSmithAvatar:{ForgeAvatar:class{playForge(){}celebrate(){}}}},localStorage,Audio:class{play(){return Promise.resolve()}},performance:{now:()=>now},setTimeout:fn=>{pending.push(fn);return pending.length},clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:()=>++raf,cancelAnimationFrame:()=>{},addEventListener:(type,handler)=>{keys[type]=handler},console};
  vm.runInNewContext(fs.readFileSync(path.join(dir,'game.js'),'utf8'),context,{filename:'game.js'});
  const flush=()=>{let count=0;while(pending.length){if(count++>300)throw Error('Too many pending timers');pending.shift()();now+=150}};
  return {get,tools,modes,flush,keys,saved};
}

test('Practice: commission → solve fraction → heat → hammer → quench → earn gold',()=>{
  const sim=mount();sim.modes[0].dispatch('click');sim.flush();
  assert.match(sim.get('#itemName').textContent,/검/);
  const target=E.parse(sim.get('#targetValue').textContent);
  const chips=sim.get('#materialTray').children.map(chip=>({node:chip,value:E.parse(chip.innerHTML.match(/piece-value">([^<]+)/)[1])}));
  let answer=null;
  for(let i=0;i<chips.length;i++)for(let j=0;j<chips.length;j++)if(i!==j)for(const op of toolOps()){
    try{if(E.eq(E.apply(op,chips[i].value,chips[j].value),target))answer={i,j,op}}catch(_){}
  }
  assert.ok(answer,'practice puzzle should be directly solvable');
  chips[answer.i].node.dispatch('click');chips[answer.j].node.dispatch('click');
  sim.tools.find(tool=>tool.dataset.op===answer.op).dispatch('click');sim.flush();
  assert.equal(sim.get('#craftModal').classList.contains('open'),true);
  assert.match(sim.get('#craftStep').textContent,/가열/);
  for(let i=0;i<4;i++)sim.get('#craftActionBtn').dispatch('click');
  assert.match(sim.get('#craftStep').textContent,/망치질/);
  for(let i=0;i<3;i++)sim.get('#craftActionBtn').dispatch('click');
  assert.match(sim.get('#craftStep').textContent,/담금질/);
  sim.get('#craftActionBtn').dispatch('click');
  assert.match(sim.get('#craftTitle').textContent,/완성/);
  assert.ok(Number(sim.get('#gold').textContent.replace(/\D/g,''))>0);
  sim.get('#craftActionBtn').dispatch('click');
  assert.equal(sim.get('#craftModal').classList.contains('open'),false);
  assert.equal(sim.get('#orderCount').textContent,1);
});

test('Rush and master keep visible recovery controls, and master has a real 3-step target',()=>{
  const sim=mount();
  sim.modes[1].dispatch('click');
  assert.notEqual(sim.get('#undoBtn').style.display,'none');
  const target=E.parse(sim.get('#targetValue').textContent);
  const chips=sim.get('#materialTray').children.map(chip=>({node:chip,value:E.parse(chip.innerHTML.match(/piece-value">([^<]+)/)[1])}));
  let mistake=null;
  for(let i=0;i<chips.length&&!mistake;i++)for(let j=0;j<chips.length&&!mistake;j++)if(i!==j)for(const op of toolOps()){
    const value=P.safeApply(op,chips[i].value,chips[j].value);
    if(value&&!E.eq(value,target)){mistake={i,j,op};break}
  }
  assert.ok(mistake);
  chips[mistake.i].node.dispatch('click');chips[mistake.j].node.dispatch('click');
  sim.tools.find(t=>t.dataset.op===mistake.op).dispatch('click');sim.flush();
  assert.equal(sim.get('#undoBtn').disabled,false);
  sim.get('#undoBtn').dispatch('click');
  assert.equal(sim.get('#materialTray').children.length,chips.length-2);
  // Undo restores the two selected ingots to the anvil; restarting restores
  // every original material without consuming the customer's order.
  sim.get('#restartBtn').dispatch('click');
  assert.equal(sim.get('#orderCount').textContent,0);
  assert.equal(sim.get('#materialTray').children.length,chips.length);
  sim.modes[2].dispatch('click');
  assert.match(sim.get('#orderMeta').textContent,/최단 3타/);
  assert.equal(sim.get('#restartBtn').disabled,false);
});

function toolOps(){return ['+','-','×','÷']}
