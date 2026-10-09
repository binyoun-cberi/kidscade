(function(global){
"use strict";
const DB=global.OPENMON_DEX;
if(!DB?.combat||!DB.encounters)throw Error("Openmon: load monsters.js, roster.js, combat.js first");
const WIDTH=84,HEIGHT=26,START={x:8,y:13};
const ZONES=[
 {key:"town",name:"여울마을",left:0,right:17},
 {key:"meadow",name:"이슬초원",left:18,right:41},
 {key:"forest",name:"가지숲",left:42,right:63},
 {key:"cave",name:"잔돌동굴",left:64,right:83}
];
const byId=new Map(DB.species.map(s=>[s.id,s]));
const h=(x,y)=>{let n=Math.imul(x+13,374761393)+Math.imul(y+19,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
function zoneAt(x){return x<18?"town":x<42?"meadow":x<64?"forest":"cave"}
function terrain(x,y){
 if(x<0||x>=WIDTH||y<0||y>=HEIGHT)return "wall";
 if(y<2||y>=HEIGHT-2)return "wall";
 if(x>=6&&x<=13&&y>=5&&y<=9)return "building";
 if(zoneAt(x)==="town")return "town";
 if(y>=11&&y<=13)return "path";
 if(zoneAt(x)==="cave"){
  if(x===76&&y===5)return "crystal";
  if(h(x,y)%13===1 && y!==10)return "rock";
  return h(x,y)%5<2?"rough":"cave";
 }
 if(x===56&&y===7)return "clearing";
 if(h(x,y)%15===0 && y!==10)return "tree";
 const chance=zoneAt(x)==="forest"?76:61;
 return h(x,y)%100<chance?"grass":"field";
}
function canMove(x,y){return !["wall","tree","building","rock"].includes(terrain(x,y))}
function activeCreature(save){return save.party[save.active]||save.party.find(p=>p.hp>0)||null}
function makeCreature(spriteId,level){
 const s=byId.get(spriteId);if(!s?.playable)throw Error("unknown monster "+spriteId);
 const st=DB.combat.statsAtLevel(s,level);
 return {id:spriteId,uid:"m"+Math.random().toString(36).slice(2,11),level,xp:0,hp:st.hp,seen:true};
}
function createNew(starter){
 if(!["set1_r02_c02","set1_r03_c02","set1_r04_c02"].includes(starter))throw Error("invalid starter");
 return {version:1,pos:{...START},facing:"down",party:[makeCreature(starter,5)],box:[],active:0,
  items:{ball:7,potion:3},coins:120,flags:{shibuSeen:false,shibuCaught:false},
  collection:{[starter]:true},seen:{[starter]:true},steps:0,grassSteps:0,wins:0,catches:0,
  encounters:0,log:["연구소에서 첫 몬스터를 받았어!"],createdAt:Date.now()};
}
function validateSave(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.party)||!raw.party.length||!raw.pos)return null;
 if(raw.party.length>6||!Array.isArray(raw.box)||raw.box.length>500)return null;
 const party=raw.party.concat(raw.box);
 for(const p of party){
  if(!byId.has(p.id)||!Number.isInteger(p.level)||p.level<1||p.level>60||
     !Number.isFinite(p.hp)||!Number.isFinite(p.xp))return null;
  p.level=Math.min(60,p.level);p.hp=Math.max(0,Math.min(DB.combat.statsAtLevel(p.id,p.level).hp,Math.floor(p.hp)));
  p.xp=Math.max(0,Math.floor(p.xp));
 }
 if(!Number.isInteger(raw.pos.x)||!Number.isInteger(raw.pos.y)||!canMove(raw.pos.x,raw.pos.y))return null;
 raw.active=Math.max(0,Math.min(raw.party.length-1,Math.floor(raw.active)||0));
 raw.items={ball:Math.max(0,Math.min(999,Math.floor(raw.items?.ball||0))),potion:Math.max(0,Math.min(999,Math.floor(raw.items?.potion||0)))};
 raw.coins=Math.max(0,Math.min(999999,Math.floor(raw.coins||0)));
 raw.flags={shibuSeen:!!raw.flags?.shibuSeen,shibuCaught:!!raw.flags?.shibuCaught};
 raw.collection=raw.collection&&typeof raw.collection==="object"?raw.collection:{};
 raw.seen=raw.seen&&typeof raw.seen==="object"?raw.seen:{};
 raw.steps=Math.max(0,Math.floor(raw.steps)||0);
 raw.grassSteps=Math.max(0,Math.floor(raw.grassSteps)||0);
 raw.wins=Math.max(0,Math.floor(raw.wins)||0);
 raw.catches=Math.max(0,Math.floor(raw.catches)||0);
 raw.encounters=Math.max(0,Math.floor(raw.encounters)||0);
 raw.log=Array.isArray(raw.log)?raw.log.slice(-12).map(x=>String(x).slice(0,120)):[];
 return raw;
}
function pickEncounter(zone,rand=Math.random){
 const cfg=DB.encounters[zone];
 if(!cfg?.pool?.length)return null;
 const index=Math.max(0,Math.min(cfg.pool.length-1,Math.floor(rand()*cfg.pool.length)));
 const level=cfg.level[0]+Math.max(0,Math.min(cfg.level[1]-cfg.level[0],Math.floor(rand()*(cfg.level[1]-cfg.level[0]+1))));
 return makeCreature(cfg.pool[index],level);
}
function shouldMeet(save,tile,rand=Math.random){
 if(!["grass","rough","cave"].includes(tile))return false;
 save.grassSteps++;
 // The first encounter is assured by the fifth hazard tile: no aimless searching.
 const guaranteed=save.encounters===0&&save.grassSteps>=5;
 const chance=tile==="grass"?.23:.13;
 return guaranteed||save.grassSteps>=11||rand()<chance;
}
function move(save,dx,dy,rand=Math.random){
 if(![-1,0,1].includes(dx)||![-1,0,1].includes(dy)||Math.abs(dx)+Math.abs(dy)!==1)return {moved:false};
 save.facing=dx===1?"right":dx===-1?"left":dy===-1?"up":"down";
 const x=save.pos.x+dx,y=save.pos.y+dy;
 if(!canMove(x,y))return {moved:false,reason:terrain(x,y)};
 save.pos={x,y};save.steps++;
 const tile=terrain(x,y),zone=zoneAt(x);
 let encounter=null;
 if(x===56&&y===7&&!save.flags.shibuSeen&&!save.flags.shibuCaught){
  save.flags.shibuSeen=true;
  encounter=makeCreature("shibu_r00_c00",7);
 }else if(zone!=="town"&&shouldMeet(save,tile,rand)){
  encounter=pickEncounter(zone,rand);
 }
 if(encounter){save.encounters++;save.grassSteps=0;save.seen[encounter.id]=true}
 return {moved:true,zone,tile,encounter};
}
function healAll(save){for(const p of save.party)p.hp=DB.combat.statsAtLevel(p.id,p.level).hp}
function xpGain(save,amount){
 const p=activeCreature(save);if(!p)return [];
 let events=[];p.xp+=amount;
 while(p.level<60&&p.xp>=DB.combat.xpToNext(p.level)){
  const required=DB.combat.xpToNext(p.level);
  p.xp-=required;const before=DB.combat.statsAtLevel(p.id,p.level).hp;
  p.level++;const after=DB.combat.statsAtLevel(p.id,p.level).hp;
  p.hp+=after-before;events.push({kind:"level",level:p.level});
 }
 if(p.level===60)p.xp=0;
 return events;
}
function addCaptured(save,target){
 const p={...target,hp:Math.max(1,target.hp),xp:0,uid:"m"+Math.random().toString(36).slice(2,11)};
 const inParty=save.party.length<6;
 (inParty?save.party:save.box).push(p);
 save.collection[p.id]=true;save.seen[p.id]=true;save.catches++;
 return inParty?"party":"box";
}
function levelRewards(save,foe){
 const earned=DB.combat.xpReward(foe.id,foe.level);
 const events=xpGain(save,earned);
 const coins=6+foe.level*2;
 save.coins+=coins;save.wins++;
 return {earned,coins,events};
}
function maybeEvolve(save,chosenId){
 const p=activeCreature(save);if(!p)return false;
 const options=DB.combat.evolutionAvailable(p.id,p.level);
 if(!options.some(o=>o.id===chosenId))return false;
 const oldMax=DB.combat.statsAtLevel(p.id,p.level).hp;
 const delta=oldMax-p.hp;
 p.id=chosenId;
 const newMax=DB.combat.statsAtLevel(p.id,p.level).hp;
 p.hp=Math.max(1,newMax-delta);
 save.collection[p.id]=true;save.seen[p.id]=true;
 return true;
}
global.OPENMON_EXPEDITION_ENGINE={WIDTH,HEIGHT,START,ZONES,zoneAt,terrain,canMove,makeCreature,createNew,validateSave,pickEncounter,shouldMeet,move,healAll,activeCreature,xpGain,addCaptured,levelRewards,maybeEvolve};
})(window);
