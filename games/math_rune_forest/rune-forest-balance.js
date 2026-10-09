/* Rune Forest v2.1 pacing. Pure rules shared by the live game and tests. */
(() => {
'use strict';
const SEALED_SECONDS = 25;
function duration(mode){return mode==='long'?75:45;}
function enemyCap(phase,easy){
 if(phase%2===0)return easy?4:5;
 if(phase===1)return easy?12:18;
 if(phase===3)return easy?18:27;
 return easy?22:34;
}
function spawnDelay(phase,easy){
 if(phase%2===0)return easy?10:8;
 if(phase===1)return easy?1.45:1.15;
 if(phase===3)return easy?1.2:.95;
 return easy?1.12:.82;
}
function beginSeal(scene){
 scene.ending=true;scene.sealLeft=SEALED_SECONDS;scene.sealElapsed=0;
 scene.sealPulses=0;scene.sealBonus=0;scene.sealCleared=0;
 scene.nextSpawn=Infinity;
 // Entering the shrine grants a last chance without removing the danger.
 scene.hp=Math.min(scene.maxHp,scene.hp+18);
}
function divisionDuringSeal(scene){
 if(!scene.ending||scene.sealLeft<=0)return;
 const reward=Math.min(.4,10-scene.sealBonus);
 if(reward<=0)return;
 scene.sealLeft=Math.max(0,scene.sealLeft-reward);
 scene.sealBonus+=reward;
}
function stepSeal(scene,dt){
 if(!scene.ending)return false;
 scene.sealElapsed+=dt;scene.sealLeft=Math.max(0,scene.sealLeft-dt);
 // Three generous breathing windows: knock back only, never falsify divisions.
 const marks=[5,12,19];
 while(scene.sealPulses<marks.length&&scene.sealElapsed>=marks[scene.sealPulses]){
  scene.sealPulses++;
  for(const e of scene.enemies){
   if(e.dead)continue;
   const dx=e.x-scene.x,dy=e.y-scene.y,d=Math.hypot(dx,dy)||1;
   e.stun=Math.max(e.stun,1.25);
   if(d<160){
    e.x=Math.max(-900,Math.min(900,e.x+dx/d*65));
    e.y=Math.max(-900,Math.min(900,e.y+dy/d*65));
   }
  }
  scene.burst=.5;
 }
 return scene.sealLeft<=0;
}
window.RuneForestBalance={duration,enemyCap,spawnDelay,beginSeal,divisionDuringSeal,stepSeal,SEALED_SECONDS};
})();
