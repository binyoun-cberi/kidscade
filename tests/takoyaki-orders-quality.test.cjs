const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.resolve(__dirname,'../games/job_takoyaki_simulator/빙글빙글 타코야키집.html'),'utf8');
const moduleSource = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

function loadGame(){
  assert.ok(moduleSource);
  const nodes=new Map();
  function node(){
    return {
      style:{setProperty(){}},dataset:{},children:[],textContent:'',className:'',
      classList:{add(){},remove(){},toggle(){}},
      appendChild(child){this.children.push(child);},addEventListener(){},
      querySelector(){return null;},setAttribute(){},remove(){},
      getBoundingClientRect(){return {width:800,height:600};}
    };
  }
  const app=node(),context={
    Math, console, setTimeout(){}, performance:{now:()=>20000},
    localStorage:{getItem:()=>null,setItem(){}},
    window:{devicePixelRatio:1,addEventListener(){}},
    document:{
      addEventListener(){},querySelector(selector){return selector==='.app'?app:null;},
      getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},
      createElement(){return node();}
    }
  };
  context.globalThis=context;
  const source=moduleSource.replace(/^import .*;\s*$/gm,'').replace(/boot\(\);\s*\}\)\(\);/,[
    'globalThis.takoyakiQualityTest={game,emptySlot,tapSlot,actionTopping,actionFilling,',
    'actionPack,scoreBall,qualityReasons,activeOrder,chooseOrder,startDay,updateButtonLocks};',
    '})();'
  ].join('\n'));
  vm.runInNewContext(source,context,{filename:'takoyaki-module.js'});
  return {api:context.takoyakiQualityTest, nodes, app};
}
function order(id,config={}){
  return {id,type:'basic',pieces:1,filling:'octopus',extraOcto:false,cheese:false,hot:false,crispy:false,
    sauce:1,mayo:0,katsu:0,aonori:0,age:0,maxWait:90,...config};
}
function cooked(api,id,i=0){
  return Object.assign(api.emptySlot(i),{
    unlocked:true,orderId:id,batter:true,oil:1,fill:1,filling:'octopus',
    totalCook:42,innerCook:34,phaseCook:8,shape:100,rollCount:3,burn:0,finished:true
  });
}
test('quality rewards requested ingredients and penalizes missing, extra and burnt ingredients',()=>{
  const {api}=loadGame();const o=order('a');
  const good=cooked(api,'a');good.sauce=1;
  const noSauce={...good,sauce:0};
  const extraMayo={...good,mayo:1};
  const extraOctopus={...good,extraOcto:1};
  const burnt={...good,totalCook:71,burn:40};
  assert.ok(api.scoreBall(good,o).score>api.scoreBall(noSauce,o).score);
  assert.ok(api.scoreBall(good,o).score>api.scoreBall(extraMayo,o).score);
  assert.ok(api.scoreBall(good,o).score>api.scoreBall(extraOctopus,o).score);
  assert.ok(api.scoreBall(good,o).score>api.scoreBall(burnt,o).score);
  assert.match(api.qualityReasons(noSauce,o).join(','),/소스가 빠졌어요/);
  assert.match(api.qualityReasons(extraMayo,o).join(','),/마요가 더 들어갔어요/);
  assert.match(api.qualityReasons(burnt,o).join(','),/오래 구웠어요/);
});
test('from four holes, plating does not quietly add requested toppings or auto-serve',()=>{
  const {api,nodes}=loadGame();
  const {game}=api;game.day=4;game.started=true;game.paused=false;
  game.slots=Array.from({length:12},(_,i)=>api.emptySlot(i));
  game.slots.slice(0,4).forEach(s=>s.unlocked=true);
  game.orders=[order('a')];game.activeOrderId='a';game.nextOrderAt=Infinity;
  api.tapSlot(0);
  const s=game.slots[0];
  assert.equal(s.orderId,'a');
  assert.equal(s.filling,'octopus'); // easy starter recipe keeps automatic fillings
  s.totalCook=42;s.innerCook=34;s.phaseCook=8;s.rollCount=3;s.shape=100;
  api.tapSlot(0);
  assert.equal(s.finished,true);
  assert.equal(s.sauce,0);
  assert.equal(game.dayServed,0);
  api.actionTopping('sauce');
  assert.equal(s.sauce,1);
  api.actionTopping('sauce');
  assert.equal(s.sauce,0);
  api.actionTopping('sauce');
  api.actionPack();
  assert.equal(game.dayServed,1);
  assert.match(nodes.get('qualityResult').textContent,/맛 평가/);
});
test('from seven holes, players choose the filling instead of receiving it for free',()=>{
  const {api}=loadGame(),{game}=api;
  game.day=7;game.started=true;game.paused=false;
  game.slots=Array.from({length:12},(_,i)=>api.emptySlot(i));
  game.slots[0].unlocked=true;
  game.orders=[order('cheese',{type:'cheese',filling:'cheese',cheese:true})];
  game.activeOrderId='cheese';
  api.tapSlot(0);
  assert.equal(game.slots[0].batter,true);
  assert.equal(game.slots[0].filling,null);
  api.actionFilling('cheese');
  assert.equal(game.slots[0].filling,'cheese');
});
test('simultaneous orders keep plated takoyaki assigned to their own customers',()=>{
  const {api}=loadGame(),{game}=api;
  game.day=8;game.started=true;game.paused=false;game.dayStart=20;
  game.orders=[order('a'),order('b')];game.activeOrderId='b';game.nextOrderAt=Infinity;
  game.slots=Array.from({length:12},(_,i)=>api.emptySlot(i));
  game.slots[0]=cooked(api,'a',0);game.slots[0].sauce=1;
  game.slots[1]=cooked(api,'b',1);game.slots[1].sauce=1;
  api.actionPack();
  assert.equal(game.orders.length,1);
  assert.equal(game.orders[0].id,'a');
  assert.equal(game.dayServed,1);
  assert.equal(game.slots[0].finished,true);
  assert.equal(game.slots[1].batter,false);
  assert.equal(game.activeOrderId,'a');
});
