(function(root){
'use strict';
const DC=root.DisasterCity,D=DC.DATA,sim=new DC.Simulation(),renderer=new DC.Renderer(document.getElementById('gameCanvas'));
const sfx=(key,opts={})=>{try{root.KidscadeAudio?.play?.(key,opts)?.catch?.(()=>{})}catch(_){}};
const ui=new DC.UI({
 start(tutorial){sim.start({tutorial});renderer.agents=[];renderer.lastCitizenTime=0;ui.startDone();root.KidscadeGame?.start?.({tutorial:Boolean(tutorial)});sfx('collect.coin_pickup',{volume:.24,cooldownMs:100});},
 refresh(){if(sim.refreshHand())sfx('collect.coin_drop',{volume:.20,cooldownMs:120});},
 pause(){sim.togglePause();},
 sound(){const a=root.KidscadeAudio;if(!a)return;const muted=!a.getSettings().muted;a.setMuted(muted);ui.soundState();if(!muted)sfx('collect.coin_pickup',{volume:.20,cooldownMs:100})},
 card(uid){const d=sim.cardDef(uid);if(!d)return;if(d.kind==='build'){if(sim.selectCard(uid))sfx('collect.coin_pickup',{volume:.14,cooldownMs:70})}else if(sim.playAction(uid))sfx('combat.impact_heavy',{volume:.22,cooldownMs:100});},
 reward(id){if(sim.acceptReward(id))sfx(id==='cleanup'?'collect.coin_drop':'shop.purchase',{volume:.24,cooldownMs:120})},
 remove(id){if(sim.removeRewardCard(id))sfx('collect.coin_pickup',{volume:.22,cooldownMs:120})}
});
document.getElementById('gameCanvas').addEventListener('pointerdown',e=>{e.preventDefault();const idx=renderer.hitSlot(e.clientX,e.clientY);if(idx>=0&&sim.placeSelected(idx))sfx('shop.purchase',{volume:.20,cooldownMs:120})},{passive:false});
document.addEventListener('keydown',e=>{
 if(e.repeat)return;if(e.key>='1'&&e.key<='5'){const c=sim.state.hand[Number(e.key)-1];if(c){const d=sim.cardDef(c.uid);if(d?.kind==='build')sim.selectCard(c.uid);else sim.playAction(c.uid)}}else if(e.key.toLowerCase()==='r')sim.refreshHand();else if(e.code==='Space'&&sim.state.mode==='playing'){e.preventDefault();sim.togglePause()}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&sim.state.mode==='playing'&&!sim.state.paused)sim.state.paused=true});
function handleSignals(){
 for(const ev of sim.drainSignals()){
  if(ev.message)ui.showToast(ev.message);
  if(ev.kind==='warning'||ev.kind==='damage')sfx('combat.impact_heavy',{volume:ev.kind==='warning'?.24:.18,cooldownMs:260});
  else if(ev.kind==='clear')sfx('success.cheer_yay',{volume:.27,cooldownMs:500});
  else if(ev.kind==='gameover'){sfx('failure.fail_sting',{volume:.35,cooldownMs:900});root.KidscadeGame?.gameOver?.({score:Math.round(sim.state.time||0),scoreOptions:{unit:'sec'},survivedSeconds:Math.round(sim.state.time||0)});}
  else if(ev.kind==='build'||ev.kind==='reward'||ev.kind==='supply')sfx('collect.coin_pickup',{volume:.16,cooldownMs:90});
 }
}
let last=performance.now(),acc=0,uiClock=0;const STEP=1/30;
function frame(now){
 const raw=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(sim.state.mode==='playing'&&!sim.state.paused){acc=Math.min(.16,acc+raw);while(acc>=STEP){sim.update(STEP);acc-=STEP}}
 handleSignals();renderer.render(sim.state);uiClock+=raw;if(uiClock>.08){uiClock=0;ui.render(sim.state,sim)}requestAnimationFrame(frame)
}
root.KidscadeGame?.registerPauseHandlers?.({
 pause(){if(sim.state.mode==='playing'&&!sim.state.paused){sim.togglePause();ui.render(sim.state,sim)}},
 resume(){if(sim.state.mode==='playing'&&sim.state.paused){sim.togglePause();ui.render(sim.state,sim)}}
});
renderer.load().then(()=>{ui.render(sim.state,sim);requestAnimationFrame(frame)}).catch(()=>{ui.render(sim.state,sim);requestAnimationFrame(frame)});
root.__disasterCity={sim,renderer,ui};
})(window);