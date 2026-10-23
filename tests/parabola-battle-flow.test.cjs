'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const gameSource=fs.readFileSync(path.join(__dirname,'../games/low_parabola_battle/game.js'),'utf8');
const physics=require('../games/low_parabola_battle/physics.js');
function fakeGame(mode='practice',wind='off'){
  const nodes=new Map(), timers=[], events=[];
  let raf=()=>{},clock=0;
  function element(){
    const classes=new Set(['hidden']);
    return {
      textContent:'',innerHTML:'',value:'',style:{},disabled:false,options:[{},{}],
      classList:{
        add(k){classes.add(k);},remove(k){classes.delete(k);},contains(k){return classes.has(k);},
        toggle(k,yes){if(yes)classes.add(k);else classes.delete(k);}
      },
      addEventListener(k,fn){this[k]=fn;}
    };
  }
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,element());
    return nodes.get(id);
  };
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},
    {get(target,k){return k in target?target[k]:()=>{};}});
  el('scene').getContext=()=>context;
  el('scene').getBoundingClientRect=()=>({left:0,top:0,width:1200,height:650});
  Object.assign(el('angle'),{value:'45'});
  Object.assign(el('power'),{value:'70'});
  Object.assign(el('ammo'),{value:'basic'});
  Object.assign(el('windOption'),{value:wind});
  Object.assign(el('difficulty'),{value:'normal'});
  const selected={dataset:{mode}};
  const document={getElementById:el,querySelector:()=>selected,querySelectorAll:()=>[]};
  const window={
    ParabolaPhysics:physics,
    KidscadeGame:{start:()=>events.push({type:'start'}),result:value=>events.push({type:'result',value})},
    setTimeout:fn=>{timers.push(fn);},
    addEventListener(){}
  };
  vm.runInNewContext(gameSource,{window,document,Image:function Image(){},
    requestAnimationFrame:callback=>{raf=callback;}},{timeout:3000});
  function frames(n=500){for(let i=0;i<n;i++){clock+=16;raf(clock);}}
  return {el,events,frames,flush:()=>{const callback=timers.shift();if(callback)callback();}};
}
test('retry after a missed practice shot retains aim and records last trial',()=>{
  const a=fakeGame();
  a.el('start').click();
  a.el('angle').value='41';a.el('power').value='30';
  a.el('angle').input();a.el('fire').click();a.frames();
  assert.match(a.el('lastShot').textContent,/41° · 세기 30/);
  a.flush();
  assert.equal(a.el('angle').value,'41');
  assert.equal(a.el('power').value,'30');
  assert.equal(a.el('fire').disabled,false);
  assert.equal(a.events.filter(event=>event.type==='result').length,0);
});
test('burst shells are limited per side, and turns alternate correctly',()=>{
  const a=fakeGame('local2','on');
  a.el('start').click();
  a.el('ammo').value='burst';a.el('ammo').change();
  a.el('fire').click();a.frames();
  assert.match(a.el('lastShot').textContent,/펑펑탄/);
  a.flush();
  assert.match(a.el('turnLabel').textContent,/주황 대포/);
  a.el('fire').click();a.frames();a.flush();
  assert.match(a.el('turnLabel').textContent,/파란 대포/);
  assert.match(a.el('ammoCount').textContent,/1발 남음/);
  assert.match(a.el('windLabel').textContent,/바람/);
});

test('pointer dragging cannon adjusts elevation and keeps the manual fire step',()=>{
  const a=fakeGame();
  a.el('start').click();
  const scene=a.el('scene');
  scene.pointerdown({clientX:205,clientY:330,pointerId:5});
  scene.pointermove({clientX:220,clientY:280,pointerId:5});
  scene.pointerup({pointerId:5});
  assert.ok(Number(a.el('angle').value)>45);
  assert.equal(a.el('fire').disabled,false);
  assert.equal(a.events.filter(event=>event.type==='result').length,0);
});
test('finishing six practice targets displays a meaningful replay panel',()=>{
  const a=fakeGame();
  a.el('start').click();
  const answers=[[11,98],[11,96],[21,98],[15,96],[29,100],[21,98]];
  for(let i=0;i<answers.length;i++){
    const [angle,power]=answers[i];
    a.el('angle').value=String(angle);
    a.el('power').value=String(power);
    a.el('angle').input();
    a.el('fire').click();
    a.frames(390);
    if(i<answers.length-1)a.flush();
  }
  assert.equal(a.el('finishOverlay').classList.contains('hidden'),false);
  assert.match(a.el('finishTitle').textContent,/명사수/);
  assert.equal(a.events.filter(event=>event.type==='result'&&event.value.scope==='stage').length,6);
  assert.equal(a.events.filter(event=>event.type==='result'&&event.value.scope==='campaign').length,1);
  a.el('playAgain').click();
  assert.equal(a.el('finishOverlay').classList.contains('hidden'),true);
  assert.equal(a.el('fire').disabled,false);
});
