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

function mount(initialProgress=null,options={}){
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)};
  const toolOps=['+','-','×','÷'],tools=toolOps.map(op=>{const n=node('tool-'+op);n.dataset.op=op;return n});
  const modes=['practice','rush','master'].map(mode=>{const n=node('mode-'+mode);n.dataset.mode=mode;return n});
  const slots=[get('#slotA'),get('#slotB')];slots.forEach((n,i)=>n.dataset.slot=String(i));
  const pending=[],keys={},intervals=new Map();let now=1000,raf=0,intervalId=0;
  const document={body:node('body'),querySelector:get,querySelectorAll:selector=>selector==='.tool'?tools:selector==='[data-mode]'?modes:selector==='.slot'?slots:[],createElement:()=>node('created'),elementFromPoint:()=>null};
  const saved=new Map(),localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
  if(initialProgress)saved.set(S.KEY,JSON.stringify(initialProgress));
  const progressService={...S,
    load:()=>JSON.parse(localStorage.getItem(S.KEY)||JSON.stringify({gold:0,crafted:0,collection:{},upgrades:{furnace:0,hammer:0,counter:0}})),
    reward:(...args)=>{const result=S.reward(...args);localStorage.setItem(S.KEY,JSON.stringify(result));return result},
    purchase:(...args)=>{const result=S.purchase(...args);if(result.ok)localStorage.setItem(S.KEY,JSON.stringify(result.progress));return result}
  };
  const puzzles=options.singleRush?{...P,create:mode=>P.create(mode==='rush'?'practice':mode)}:P;
  const context={document,window:{FractionSmithMath:E,FractionSmithPuzzles:puzzles,FractionSmithOrders:O,FractionSmithForge:F,FractionSmithProgress:progressService,FractionSmithAvatar:{ForgeAvatar:class{playForge(){}celebrate(){}}}},localStorage,Audio:class{play(){return Promise.resolve()}},performance:{now:()=>now},setTimeout:fn=>{pending.push(fn);return pending.length},clearTimeout:()=>{},setInterval:fn=>{const id=++intervalId;intervals.set(id,fn);return id},clearInterval:id=>intervals.delete(id),requestAnimationFrame:()=>++raf,cancelAnimationFrame:()=>{},addEventListener:(type,handler)=>{keys[type]=handler},console};
  vm.runInNewContext(fs.readFileSync(path.join(dir,'game.js'),'utf8'),context,{filename:'game.js'});
  const flush=()=>{let count=0;while(pending.length){if(count++>300)throw Error('Too many pending timers');pending.shift()()}};
  const advance=ms=>{now+=ms};
  const tick=ms=>{now+=ms;for(const run of intervals.values())run()};
  return {get,tools,modes,flush,advance,tick,keys,saved,body:document.body};
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

test('Shop buys a furnace upgrade, saves gold and shortens the following craft loop',()=>{
  const sim=mount({gold:500,crafted:2,collection:{sword:1,axe:1},upgrades:{furnace:0,hammer:0,counter:0}});
  sim.modes[0].dispatch('click');
  assert.match(sim.get('#itemName').textContent,/창/,'newly unlocked spear should appear as the next commission');
  sim.get('#shopBtn').dispatch('click');
  assert.equal(sim.get('#shopModal').classList.contains('open'),true);
  assert.equal(sim.get('#collectionGrid').children.length,8);
  assert.equal(sim.get('#collectionCount').textContent,'4/8종 해금');
  const firstUpgrade=sim.get('#upgradeGrid').children[0].children[2];
  assert.equal(firstUpgrade.disabled,false);
  firstUpgrade.dispatch('click');
  assert.equal(sim.get('#shopGold').textContent,'420 G');
  assert.equal(sim.body.dataset.furnace,'1');
  assert.equal(JSON.parse(sim.saved.get(S.KEY)).upgrades.furnace,1);
  sim.keys.keydown({key:'Escape',code:'Escape',repeat:false,preventDefault(){}});
  assert.equal(sim.get('#shopModal').classList.contains('open'),false);
  assert.equal(sim.get('#shopBtn').disabled,false);
  const target=E.parse(sim.get('#targetValue').textContent);
  const chips=sim.get('#materialTray').children.map(chip=>({node:chip,value:E.parse(chip.innerHTML.match(/piece-value">([^<]+)/)[1])}));
  let answer=null;
  for(let i=0;i<chips.length;i++)for(let j=0;j<chips.length;j++)if(i!==j)for(const op of toolOps()){
    try{if(E.eq(E.apply(op,chips[i].value,chips[j].value),target))answer={i,j,op}}catch(_){}
  }
  assert.ok(answer);
  chips[answer.i].node.dispatch('click');chips[answer.j].node.dispatch('click');
  sim.tools.find(t=>t.dataset.op===answer.op).dispatch('click');sim.flush();
  assert.match(sim.get('#craftStatus').textContent,/0\/3/);
  for(let i=0;i<3;i++)sim.get('#craftActionBtn').dispatch('click');
  assert.match(sim.get('#craftStep').textContent,/망치질/);
});

test('Rush disables shopping but retains collected gold and upgrades',()=>{
  const sim=mount({gold:120,crafted:6,collection:{sword:2},upgrades:{furnace:2,hammer:1,counter:0}});
  sim.modes[1].dispatch('click');
  assert.equal(sim.get('#shopBtn').disabled,true);
  sim.get('#shopBtn').dispatch('click');
  assert.equal(sim.get('#shopModal').classList.contains('open'),false);
  assert.equal(sim.body.dataset.furnace,'2');
});

test('Counter upgrade increases awarded gold and new milestone announces a product',()=>{
  const sim=mount({gold:0,crafted:1,collection:{sword:1},upgrades:{furnace:2,hammer:0,counter:2}});
  sim.modes[0].dispatch('click');
  const strikes=Number(sim.get('#orderMeta').textContent.match(/최단 (\d+)타/)[1]);
  const target=E.parse(sim.get('#targetValue').textContent);
  const chips=sim.get('#materialTray').children.map(chip=>({node:chip,value:E.parse(chip.innerHTML.match(/piece-value">([^<]+)/)[1])}));
  let answer=null;
  for(let i=0;i<chips.length;i++)for(let j=0;j<chips.length;j++)if(i!==j)for(const op of toolOps()){
    try{if(E.eq(E.apply(op,chips[i].value,chips[j].value),target))answer={i,j,op}}catch(_){}
  }
  assert.ok(answer);
  chips[answer.i].node.dispatch('click');chips[answer.j].node.dispatch('click');
  sim.tools.find(t=>t.dataset.op===answer.op).dispatch('click');sim.flush();
  for(let i=0;i<2+3+1;i++)sim.get('#craftActionBtn').dispatch('click');
  const quality=Number(sim.get('#craftInstruction').textContent.match(/정밀도 (\d+)점/)[1]);
  const expected=Math.round((30+strikes*10+Math.round(quality/5))*1.3);
  assert.equal(JSON.parse(sim.saved.get(S.KEY)).gold,expected);
  assert.match(sim.get('#craftTip').textContent,/정찰병의 창/);
  sim.get('#craftActionBtn').dispatch('click');
  assert.match(sim.get('#itemName').textContent,/정찰병의 창/);
});

function solveOneStep(sim){
  const target=E.parse(sim.get('#targetValue').textContent);
  const chips=sim.get('#materialTray').children.map(chip=>({node:chip,value:E.parse(chip.innerHTML.match(/piece-value">([^<]+)/)[1])}));
  let answer=null;
  for(let i=0;i<chips.length&&!answer;i++)for(let j=0;j<chips.length&&!answer;j++)if(i!==j)for(const op of toolOps()){
    try{if(E.eq(E.apply(op,chips[i].value,chips[j].value),target)){answer={i,j,op};break}}catch(_){}
  }
  assert.ok(answer,'commission must be directly solvable in this test');
  chips[answer.i].node.dispatch('click');chips[answer.j].node.dispatch('click');
  sim.tools.find(t=>t.dataset.op===answer.op).dispatch('click');sim.flush();
  assert.equal(sim.get('#craftModal').classList.contains('open'),true);
}

test('Three consecutive commissions grant a milestone bonus and reset the progress bar',()=>{
  const sim=mount({gold:0,crafted:0,collection:{},upgrades:{furnace:2,hammer:0,counter:0}});
  sim.modes[0].dispatch('click');
  for(let order=1;order<=3;order++){
    solveOneStep(sim);
    assert.ok(['blade','tool','guard','royal'].includes(sim.get('#craftScene').dataset.family));
    for(let i=0;i<2+3+1;i++)sim.get('#craftActionBtn').dispatch('click');
    assert.equal(sim.get('#craftGrade').textContent,'⚒️ 튼튼한 제작품');
    if(order===3){
      assert.match(sim.get('#craftTip').textContent,/3연속 납품! 추가 \+25 G/);
      assert.equal(JSON.parse(sim.saved.get(S.KEY)).gold,52*3+25);
      assert.equal(sim.get('#chainFill').style.width,'0%');
      assert.match(sim.get('#chainLabel').textContent,/연속 3회/);
    }
    sim.get('#craftActionBtn').dispatch('click');
  }
});

test('Perfect rush crafting awards a masterpiece, feedback stars and three bonus seconds',()=>{
  const sim=mount({gold:0,crafted:0,collection:{},upgrades:{furnace:2,hammer:0,counter:0}},{singleRush:true});
  sim.modes[1].dispatch('click');sim.tick(18000);
  assert.equal(sim.get('#timer').textContent,72);
  solveOneStep(sim);
  for(let i=0;i<2;i++)sim.get('#craftActionBtn').dispatch('click');
  sim.advance(1125);
  for(let i=0;i<3;i++)sim.get('#craftActionBtn').dispatch('click');
  assert.equal(sim.get('#hammerHits').children.length,3);
  assert.ok(sim.get('#hammerHits').children.every(pip=>pip.className.includes('perfect')));
  assert.match(sim.get('#craftBurst').textContent,/완벽/);
  sim.get('#craftActionBtn').dispatch('click');
  assert.equal(sim.get('#timer').textContent,75);
  assert.match(sim.get('#craftGrade').textContent,/명품 제작품/);
  assert.equal(sim.get('#craftScene').dataset.grade,'masterpiece');
  assert.match(sim.get('#craftTip').textContent,/\+3초/);
  assert.equal(JSON.parse(sim.saved.get(S.KEY)).gold,80);
});

function toolOps(){return ['+','-','×','÷']}
