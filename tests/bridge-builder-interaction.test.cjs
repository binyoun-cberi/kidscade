const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const src=fs.readFileSync(path.join(__dirname,'..','games','high_bridge_builder','bridge-builder.js'),'utf8');
const instrumented=src.replace(/\}\)\(\);\s*$/,'window.__bridgeTest={S,LEVELS,banks,resetLevel,updateRun,rebuildWaypointPreview,buildRoadProfile,startTest};\n})();');
assert.notEqual(instrumented,src,'expected a test-only export inside the game IIFE');

function boot(size={width:1024,height:650}){
  const elements=new Map(),timers=[];
  function el(id){
    if(elements.has(id))return elements.get(id);
    const handlers={},classes=new Set();
    const result={
      style:{},disabled:false,textContent:'',handlers,
      classList:{
        add(k){classes.add(k)},remove(k){classes.delete(k)},
        toggle(k,val){if(val)classes.add(k);else classes.delete(k)},
        contains(k){return classes.has(k)}
      },
      setAttribute(){},addEventListener(k,f){handlers[k]=f},
      getBoundingClientRect(){return {left:0,top:0,width:1200,height:700}},
      setPointerCapture(){},
      parentElement:{getBoundingClientRect(){return size}}
    };
    elements.set(id,result);
    return result;
  }
  const doc={getElementById:el,addEventListener(){},hidden:false};
  el('game').getContext=()=>({});
  const win={KidscadeGame:{},addEventListener(){}};
  const context={window:win,document:doc,performance:{now:()=>0},
    requestAnimationFrame(){},setTimeout(f){timers.push(f);return timers.length},
    clearTimeout(){}};
  vm.runInNewContext(instrumented,context,{timeout:3000});
  function event(id,type,props={}){
    const fn=el(id).handlers[type];
    assert.equal(typeof fn,'function','missing '+type+' on '+id);
    fn({pointerId:1,clientX:0,clientY:0,cancelable:true,preventDefault(){},...props});
  }
  return {game:win.__bridgeTest,event,el,flush(){for(const fn of timers.splice(0))fn()}};
}

function advance(game){
  for(let i=0;i<600&&game.S.mode==='run';i++)game.updateRun(.02);
}

test('one finger creates an auto-run road; another finger cannot hijack it',()=>{
  const h=boot(),a=h.game,b=a.banks();
  h.event('game','pointerdown',{clientX:b.leftX+10,clientY:b.leftY});
  h.event('game','pointermove',{pointerId:2,clientX:b.rightX-10,clientY:b.rightY});
  assert.equal(a.S.points.length,2);
  h.event('game','pointermove',{clientX:b.rightX-60,clientY:b.rightY});
  h.event('game','pointerup',{clientX:b.rightX-60,clientY:b.rightY});
  assert.equal(a.S.bridgeReady,true);
  assert.ok(a.S.roadProfile.length>50);
  h.flush();advance(a);
  assert.equal(a.S.mode,'end');
});

test('cancelled tablet gestures do not create an accidental bridge',()=>{
  const h=boot(),a=h.game,b=a.banks();
  h.event('game','pointerdown',{clientX:b.leftX+10,clientY:b.leftY});
  h.event('game','pointercancel',{clientX:b.rightX-70,clientY:b.rightY});
  assert.equal(a.S.drawing,false);
  assert.equal(a.S.points.length,0);
  assert.equal(a.S.bridgeReady,false);
  h.flush();
  assert.equal(a.S.mode,'build');
});

test('tap-to-place points crosses a rock without one long finger swipe',()=>{
  const h=boot(),a=h.game;
  h.event('modeBtn','click');
  a.S.level=1;a.resetLevel();
  const b=a.banks();
  h.event('game','pointerdown',{clientX:(b.leftX+b.rightX)/2,clientY:270});
  assert.equal(a.S.waypoints.length,1);
  h.event('goBtn','click');advance(a);
  assert.equal(a.S.mode,'end');
});

test('wide tablet view is enlarged, retaining intrinsic canvas aspect',()=>{
  const h=boot({width:900,height:360});
  const width=parseInt(h.el('game').style.width,10);
  const height=parseInt(h.el('game').style.height,10);
  assert.ok(width>=800,'expected larger landscape drawing frame');
  assert.ok(Math.abs(width/height-1200/700)<0.01,'aspect remains 12:7');
});

test('all 40 stages have at least one automatically drivable drawn route',()=>{
  const h=boot(),a=h.game;
  assert.equal(a.LEVELS.length,40);
  for(let idx=0;idx<a.LEVELS.length;idx++){
    a.S.level=idx;a.resetLevel();a.S.pointMode=true;
    const b=a.banks(),groups=new Map();
    for(const o of a.LEVELS[idx].obstacles){
      if(!groups.has(o.at))groups.set(o.at,[]);
      groups.get(o.at).push(o);
    }
    const nodes=[];
    for(const [at,obstacles] of [...groups.entries()].sort((x,y)=>x[0]-y[0])){
      const tops=obstacles.filter(o=>o.type==='up').map(o=>o.top);
      const bottoms=obstacles.filter(o=>o.type==='down').map(o=>o.bottom);
      const top=tops.length?Math.min(...tops):999;
      const bottom=bottoms.length?Math.max(...bottoms):0;
      let y;
      if(top<999&&bottom>0)y=(top-25+bottom+85)/2;
      else if(top<999)y=top-80;
      else y=bottom+95;
      const halfWidth=Math.max(...obstacles.map(o=>o.w))/2+55;
      const center=b.leftX+(b.rightX-b.leftX)*at;
      const entry=Math.max(b.leftX+5,center-halfWidth);
      const leave=Math.min(b.rightX-5,center+halfWidth);
      nodes.push({x:nodes.length?Math.max(nodes[nodes.length-1].x+2,entry):entry,y});
      nodes.push({x:Math.max(nodes[nodes.length-1].x+2,leave),y});
    }
    assert.ok(nodes.length<=14,'point-mode limit at stage '+(idx+1));
    a.S.waypoints=nodes;
    a.rebuildWaypointPreview();
    a.S.roadProfile=a.buildRoadProfile();
    assert.ok(a.S.roadProfile,'road at stage '+(idx+1));
    a.S.bridgeReady=true;a.startTest();advance(a);
    assert.equal(a.S.mode,'end','car must reach goal on stage '+(idx+1));
  }
});
