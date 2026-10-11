/* KIDSMON research trainers: deterministic 3v3 controller, no wild encounter side effects. */
(function(w){
"use strict";
const D=w.OPENMON_DEX,E=w.OPENMON_EXPEDITION_ENGINE,B=w.OPENMON_TURN_BATTLE;
if(!D?.combat||!E?.makeCreature||!B?.moves)throw Error("Trainer mode requires dex, expedition and battle engine");
const TRAINERS=Object.freeze([
 {id:"meadow",name:"초원의 연구원",title:"속성의 첫걸음",requiredWins:0,bonus:-4,
  species:["set1_r01_c01","set2_r00_c04","set4_r00_c03"],
  lesson:"식물·물·불의 상성에 맞춰 키즈몬을 교체해 봐."},
 {id:"forest",name:"숲의 전술가",title:"반격과 교체",requiredWins:3,bonus:1,
  species:["set1_r00_c01","set4_r01_c02","set5_r00_c02"],
  lesson:"반격을 예상했다면 보조 기술이나 교체를 선택할 수 있어."},
 {id:"lab",name:"연구소 수석 연구원",title:"속도와 방어",requiredWins:8,bonus:1,
  species:["set5_r01_c04","set5_r02_c02","set1_r04_c02"],
  lesson:"속도·속박·반격을 이용해 세 마리의 전투 순서를 설계해 봐."}
]);
const GYMS=Object.freeze([
 {id:"gym_energy",name:"수정 체육관장 테슬라",title:"전류의 수수께끼",badge:"전류 배지",
  village:"crystalTown",requiredWins:0,bonus:-3,prev:null,
  species:["set4_r01_c02","set4_r02_c00","set5_r04_c00"],
  lesson:"전기는 땅에 약해! 땅 속성으로 교체하고 상대의 반격도 살펴봐."},
 {id:"gym_tide",name:"해류 체육관장 아르키",title:"부력의 비밀",badge:"해류 배지",
  village:"harborTown",requiredWins:0,bonus:3,prev:"gym_energy",
  species:["set2_r00_c06","set2_r01_c00","set5_r00_c00"],
  lesson:"물의 흐름에 맞는 상성으로 대응해. 앞 체육관의 전류 키즈몬도 도움이 될 수 있어."},
 {id:"gym_frost",name:"설빛 체육관장 켈빈",title:"빙점의 기록",badge:"서리 배지",
  village:"snowTown",requiredWins:0,bonus:0,prev:"gym_tide",
  species:["set5_r01_c04","set5_r03_c04","set5_r04_c02"],
  lesson:"얼음·정신·속도 속성을 비교하며 방어와 교체로 대응해."}
]);
const allTrainers=[...TRAINERS,...GYMS];
const configFor=id=>allTrainers.find(x=>x.id===id);
const species=id=>D.species.find(s=>s.id===id);
const maxHp=mon=>D.combat.statsAtLevel(mon.id,mon.level,mon).hp;
function eligibleSlots(save){
 return Array.isArray(save?.party)?save.party.map((p,i)=>p.hp>0?i:-1).filter(i=>i>=0).slice(0,3):[];
}
function validateSelection(save,indices){
 return Array.isArray(indices)&&indices.length===3&&new Set(indices).size===3&&
  indices.every(i=>Number.isInteger(i)&&i>=0&&i<save.party.length&&save.party[i].hp>0);
}
function available(save,id){
  const preset=configFor(id);
 if(!preset||!save||(save.wins||0)<preset.requiredWins||eligibleSlots(save).length!==3)return false;
 if(!preset.village)return true;
 return !!(save.flags?.visitedZones?.includes(preset.village)&&
  E.questStatus(save,preset.village)?.claimed&&
  (!preset.prev||(save.trainerWins?.[preset.prev]||0)>0));
}
function makeTrainer(save,id,rand=Math.random,selected=null){
 if(!available(save,id))return null;
 const preset=configFor(id);
 const playerSlots=selected===null?eligibleSlots(save):selected.slice();
 if(!validateSelection(save,playerSlots))return null;
 const level=Math.min(55,Math.max(2,Math.round(playerSlots.reduce((n,i)=>n+save.party[i].level,0)/3)+preset.bonus));
 const team=preset.species.map((id,i)=>{
  const mon=E.makeCreature(id,Math.min(60,level+(i===2?1:0)),rand);
  mon.shiny=false;return mon;
 });
 return {id:preset.id,name:preset.name,lesson:preset.lesson,party:team,active:0,
   playerSlots,turn:0,switches:0,lastSwitchTurn:-9,maxSwitches:3};
}
function preview(save,id){
 const preset=configFor(id);
 if(!preset)return null;
 const slots=eligibleSlots(save);
 return {...preset,ready:slots.length===3,unlocked:(save.wins||0)>=preset.requiredWins,
  party:preset.species.map(id=>({id,name:species(id).name,type:species(id).type}))};
}
function estimate(from,to){
 const moves=from.moveSlots.filter(x=>x.pp>0).map(x=>B.moves[x.id]).filter(m=>m?.power);
 if(!moves.length)return 0;
 return Math.max(...moves.map(move=>{
  const raw=D.combat.damage({attacker:from.id,defender:to.id,attackerLevel:from.level,
   defenderLevel:to.level,attackerMon:from,defenderMon:to,power:move.power,
   moveType:move.type,damageClass:move.damageClass});
  return Math.max(1,Math.floor(raw*.62))*(move.hits||1)*(move.accuracy/100);
 }));
}
function matchup(mon,player){
 const offence=estimate(mon,player)/maxHp(player);
 const danger=estimate(player,mon)/maxHp(mon);
 const health=mon.hp/maxHp(mon);
 return offence*.95-danger*1.15+(health-.5)*.2;
}
function bestReserve(trainer,player){
 const alive=trainer.party.map((m,i)=>m.hp>0?i:-1).filter(i=>i>=0&&i!==trainer.active);
 return alive.sort((a,b)=>matchup(trainer.party[b],player)-matchup(trainer.party[a],player))[0]??-1;
}
function chooseSwitch({trainer,player,foe,side}){
 if(!trainer||side.foe.trapTurns>0||trainer.switches>=trainer.maxSwitches||
  trainer.turn-trainer.lastSwitchTurn<2)return -1;
 const index=bestReserve(trainer,player);
 if(index<0)return -1;
 const better=matchup(trainer.party[index],player)-matchup(foe,player);
 const exposed=estimate(player,foe)/maxHp(foe);
 const low=foe.hp/maxHp(foe);
 // A switch costs an attack, so only choose it when the alternative is distinctly safer.
 return better>.19&&(exposed>.22||low<.45)&&trainer.party[index].hp>0?index:-1;
}
function chooseReplacement({trainer,player}){
 return bestReserve(trainer,player);
}
function reward(save,trainer){
 if(!save||!configFor(trainer?.id))return null;
 if(!save.trainerWins||typeof save.trainerWins!=="object")save.trainerWins={};
 const first=!save.trainerWins[trainer.id];
 const config=configFor(trainer.id);
 const coins=config.badge?(first?180:45):(first?120:35);
 const participantIndices=trainer.playerSlots.filter(i=>save.party[i]?.hp>0);
 const original=save.active,exp=8+trainer.party.reduce((sum,m)=>sum+m.level,0);
 const changes=[];
 for(const index of participantIndices){
  save.active=index;
  const events=E.xpGain(save,Math.max(4,Math.floor(exp/participantIndices.length)));
  changes.push({index,level:save.party[index].level,events});
 }
 save.active=original;save.coins+=coins;save.trainerWins[trainer.id]=(save.trainerWins[trainer.id]||0)+1;
 return {coins,first,badge:config.badge&&first?config.badge:null,
  xpEach:participantIndices.length?Math.max(4,Math.floor(exp/participantIndices.length)):0,changes};
}
w.KIDSMON_TRAINERS={TRAINERS,GYMS,configFor,available,eligibleSlots,validateSelection,makeTrainer,preview,estimate,matchup,chooseSwitch,chooseReplacement,reward};
})(window);
