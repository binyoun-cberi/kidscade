'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname,'..');
const dir = path.join(ROOT,'games','squid-memory-bridge');
const paths = require(path.join(dir,'path.js'));
const html = fs.readFileSync(path.join(dir,'index.html'),'utf8');
const source = fs.readFileSync(path.join(dir,'game.js'),'utf8');
const css = fs.readFileSync(path.join(dir,'style.css'),'utf8');

test('random paths meet stage length, minimum turns, start/end and uniqueness', () => {
  for (let stage=1;stage<=20;stage++) for(let trial=1;trial<=75;trial++) {
    const map=paths.generate(stage,(Math.imul(trial,35029)+stage)>>>0);
    const checked=paths.validate(map);
    assert.ok(checked.ok,`stage ${stage}, trial ${trial}: ${checked.reason}`);
    const spec=paths.specs(stage);
    assert.ok(checked.turns>=spec.minTurns);
    assert.ok(checked.length>=spec.minCells && checked.length<=spec.maxCells);
    assert.equal(map.path[0]%map.width,0);
    assert.equal(map.path.at(-1)%map.width,map.width-1);
    assert.equal(new Set(map.path).size,map.path.length);
  }
});
test('later stages strictly grow and require backtracking horizontally', () => {
  for(let stage=2;stage<=28;stage++){
    const previous=paths.specs(stage-1),next=paths.specs(stage);
    assert.ok(next.width>previous.width);
    assert.ok(next.minCells>previous.maxCells,'every next maze must have strictly more tiles');
    assert.ok(next.minTurns>previous.minTurns);
    if(stage>=3){
      const map=paths.generate(stage,stage*7407);
      const steps=map.path.slice(1).map((cell,i)=>cell%map.width-map.path[i]%map.width);
      assert.ok(steps.includes(-1),`stage ${stage} needs at least one left movement`);
    }
  }
});
test('rejects tampered short and skipped paths', () => {
  const original=paths.generate(5,42);
  assert.equal(paths.validate({...original,path:original.path.slice(0,5)}).ok,false);
  assert.equal(paths.validate({...original,path:[...original.path.slice(0,6),original.path[7],...original.path.slice(8)]}).ok,false);
});
test('game assets reference landscape orientation and SDK', () => {
  assert.match(html,/data-game-id="squid_memory_bridge"/);
  assert.match(html,/data-orientation="landscape"/);
  assert.match(html,/\.\/path\.js/);
  assert.match(css,/orientation:portrait/);
  assert.match(source,/s\.deadline=Date\.now\(\)\+300000/);
});

function simulatedGame() {
  const elements=new Map(), directional=[];
  function fakeElement(id='') {
    const listeners=new Map(),classes=new Set(id==='result'||id==='help'?'hidden':[]);
    return {
      id,listeners,dataset:{},hidden:false,disabled:false,textContent:'',style:{},width:900,height:280,
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,force)=>force?classes.add(x):classes.delete(x)},
      addEventListener:(name,fn)=>listeners.set(name,fn),
      click(){listeners.get('click')?.({preventDefault(){}})},
      getContext(){return context2d},
      getBoundingClientRect(){return {width:900,height:280,left:0,top:0}},
      focus(){},setPointerCapture(){},setAttribute(){}
    };
  }
  const noOp=()=>{},context2d={
    setTransform:noOp,clearRect:noOp,fillRect:noOp,roundRect:noOp,strokeRect:noOp,
    beginPath:noOp,moveTo:noOp,lineTo:noOp,stroke:noOp,fill:noOp,arc:noOp,ellipse:noOp,
    save:noOp,restore:noOp,translate:noOp,fillText:noOp,
    createLinearGradient:()=>({addColorStop:noOp})
  };
  const getElementById=id=>{
    if(!elements.has(id))elements.set(id,fakeElement(id));
    return elements.get(id);
  };
  for (const dir of ['left','right','up','down']) {
    const element=fakeElement(dir);element.dataset.dir=dir;directional.push(element);
  }
  let clock=Date.UTC(2026,9,10,10,0),nextFrame=null,seed=12003;
  const sdkEvents=[];
  class FakeDate extends Date {static now(){return clock;}}
  const fakeDocument={
    getElementById,querySelector:()=>fakeElement('result-dialog'),
    querySelectorAll:()=>directional,addEventListener:noOp
  };
  const fakeWindow={
    devicePixelRatio:1,addEventListener:noOp,
    KidscadeGame:{
      start:x=>sdkEvents.push(['start',x]),
      result:x=>sdkEvents.push(['result',x]),
      score:x=>sdkEvents.push(['score',x]),
      milestone:x=>sdkEvents.push(['milestone',x])
    },
    ResizeObserver:class {observe(){}}
  };
  const context={window:fakeWindow,document:fakeDocument,SquidPath:paths,localStorage:{getItem:()=>null,setItem:noOp},
    Date:FakeDate,Math,Uint32Array,Set,ResizeObserver:fakeWindow.ResizeObserver,
    crypto:{getRandomValues:a=>{a[0]=(seed+=101);return a}},
    requestAnimationFrame:fn=>{nextFrame=fn},
    globalThis:null};
  context.globalThis=context;
  vm.runInNewContext(source,context,{filename:'game.js'});
  function click(id){getElementById(id).click();}
  function advance(ms){clock+=ms;if(nextFrame)nextFrame(clock);}
  function press(dx,dy){
    const name=dx===1?'right':dx===-1?'left':dy===1?'down':'up';
    directional.find(el=>el.dataset.dir===name).click();
  }
  return {click,advance,press,get:id=>getElementById(id),sdkEvents,seedMap:(stage,seedValue)=>paths.generate(stage,seedValue)};
}
test('confirmation resets to START on the same map while clock continues', () => {
  const game=simulatedGame();
  game.click('startBtn');game.advance(11000);
  const map=game.seedMap(1,12104);
  const first=map.path[0],second=map.path[1];
  game.press(second%map.width-first%map.width,Math.floor(second/map.width)-Math.floor(first/map.width));
  assert.match(game.get('pathText').textContent,/2 \/ /);
  game.click('checkBtn');
  assert.match(game.get('pathText').textContent,/1 \/ /);
  assert.equal(game.get('checkBtn').disabled,true);
  game.advance(12000);
  assert.ok(!game.get('checkBtn').disabled);
  assert.equal(game.get('timeText').textContent,'04:37');
  assert.equal(game.get('attemptText').textContent,'정답 확인 1회');
  assert.equal(game.get('result').classList.contains('hidden'),true);
});
test('wrong adjacent tile immediately ends the run, correct path clears and next stage grows', () => {
  const game=simulatedGame();
  game.click('startBtn');game.advance(11000);
  const map=game.seedMap(1,12104),start=map.path[0],next=map.path[1];
  const alternatives=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>{
    const x=start%map.width+dx,y=Math.floor(start/map.width)+dy;
    return x>=0&&x<map.width&&y>=0&&y<map.height&&y*map.width+x!==next;
  });
  game.press(...alternatives[0]);
  assert.equal(game.get('result').classList.contains('hidden'),false);
  assert.equal(game.get('resultTitle').textContent,'여기서 탈락!');
  assert.ok(game.sdkEvents.some(([name,payload])=>name==='result'&&payload.scope==='run'&&payload.status==='failed'));

  game.click('continueBtn');game.advance(11000);
  const newMap=game.seedMap(1,12205);
  for(let i=1;i<newMap.path.length;i++){
    const a=newMap.path[i-1],b=newMap.path[i];
    game.press(b%newMap.width-a%newMap.width,Math.floor(b/newMap.width)-Math.floor(a/newMap.width));
  }
  assert.equal(game.get('resultTitle').textContent,'돌파 성공!');
  assert.ok(game.sdkEvents.some(([name,payload])=>name==='result'&&payload.scope==='stage'&&payload.stage===1));
  game.click('continueBtn');
  assert.equal(game.get('stageText').textContent,'02');
  assert.equal(game.get('timeText').textContent,'05:00');
});
test('time expiry ends the current stage even during preview',()=>{
  const game=simulatedGame();game.click('startBtn');game.advance(301000);
  assert.equal(game.get('resultTitle').textContent,'여기서 탈락!');
  assert.match(game.get('resultMessage').textContent,/시간 초과/);
});
