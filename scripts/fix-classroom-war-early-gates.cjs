const fs=require('fs');
const p='classroom_war_3d.html';
let s=fs.readFileSync(p,'utf8');

const oldSpawn='function spawnGate(){const count=state.period>=2&&Math.random()<.42?3:2,good=Math.random()<.72,choices=gateChoiceSet(good,count),bases=count===2?[-2.15,2.15]:[-2.85,0,2.85],width=count===2?3.7:2.45,gate={z:-47,speed:5.9+Math.min(2.0,state.period*.22),good,resolved:false,phase:rand(0,6.28),items:[]};';
const newSpawn='function spawnGate(){const count=state.period>=2&&Math.random()<.42?3:2,safeOpening=(state.gatesPassed||0)<3||totalArmy()<8||state.t<18,good=safeOpening||Math.random()<.72,choices=gateChoiceSet(good,count),bases=count===2?[-2.15,2.15]:[-2.85,0,2.85],width=count===2?3.7:2.45,gate={z:-47,speed:5.9+Math.min(2.0,state.period*.22),good,resolved:false,phase:rand(0,6.28),items:[]};';
if(!s.includes(oldSpawn))throw new Error('spawnGate target not found');
s=s.replace(oldSpawn,newSpawn);

const oldApply='function applyGate(item){const before=totalArmy(),after=clamp(gateResult(item.choice,before),0,99999);setArmyTotal(after,{announce:true,reason:`${item.choice.label} → ${after.toLocaleString()}명`});tone("gate");if(after>before&&rankNameForTotal(after)!==rankNameForTotal(before))showBanner(`🎖 ${rankNameForTotal(after)} 승급!`,rankSummaryText(),1.6);}';
const newApply='function applyGate(item){const before=totalArmy(),after=clamp(gateResult(item.choice,before),1,99999);state.gatesPassed=(state.gatesPassed||0)+1;setArmyTotal(after,{announce:true,reason:`${item.choice.label} → ${after.toLocaleString()}명`});tone("gate");if(after>before&&rankNameForTotal(after)!==rankNameForTotal(before))showBanner(`🎖 ${rankNameForTotal(after)} 승급!`,rankSummaryText(),1.6);}';
if(!s.includes(oldApply))throw new Error('applyGate target not found');
s=s.replace(oldApply,newApply);

const oldReset='period:1,shownPeriod:1,warningT:0,toastT:0,camShake:0,flash:0,hitStop:0,worldSpeed:1,playerX:0,targetX:0';
const newReset='period:1,shownPeriod:1,gatesPassed:0,warningT:0,toastT:0,camShake:0,flash:0,hitStop:0,worldSpeed:1,playerX:0,targetX:0';
if(!s.includes(oldReset))throw new Error('reset state target not found');
s=s.replace(oldReset,newReset);

// Safety checks: opening protection and one-soldier floor must both be present.
if(!s.includes('(state.gatesPassed||0)<3||totalArmy()<8||state.t<18'))throw new Error('opening protection missing');
if(!s.includes('clamp(gateResult(item.choice,before),1,99999)'))throw new Error('minimum army protection missing');

fs.writeFileSync(p,s);
console.log('Classroom War early-game gate balance fixed');