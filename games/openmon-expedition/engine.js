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
 if(zoneAt(x)==="town"){
  // Short paved route visually links the laboratory to the eastern adventure trail.
  if((y>=11&&y<=13&&x>=7)||(x>=9&&x<=10&&y>=10&&y<=13))return "path";
  return "town";
 }
 // A natural grassy bottleneck guarantees the first encounter on the main road.
 if(x>=20&&x<=22&&y>=11&&y<=13)return "grass";
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
const IV_KEYS=DB.combat.STAT_KEYS,NATURES=["균형","용감","신중","쾌속","집중"];
function genesFromUid(uid){
 let h=2166136261;for(const c of String(uid))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 const next=()=>{h=(Math.imul(h,1664525)+1013904223)>>>0;return h};
 const iv={};for(const k of IV_KEYS)iv[k]=next()%16;
 return {iv,nature:NATURES[next()%NATURES.length]};
}
function normalizeGenes(m){
 if(!m.uid)m.uid="legacy-"+m.id+"-"+m.level+"-"+m.hp;
 const fallback=genesFromUid(m.uid);
 const iv={};for(const k of IV_KEYS){const n=m.genetics?.iv?.[k];iv[k]=Number.isInteger(n)&&n>=0&&n<=15?n:fallback.iv[k]}
 m.genetics={iv,nature:NATURES.includes(m.genetics?.nature)?m.genetics.nature:fallback.nature};
 m.shiny=m.shiny===true;
  const training={},saved=m.training||{};let room=72;
  for(const key of IV_KEYS){
   const n=Number.isFinite(saved[key])?Math.floor(saved[key]):0;
   training[key]=Math.max(0,Math.min(24,room,n));room-=training[key];
  }
  m.training=training;return m;
}
const STONES=Object.freeze({
 life:{name:"생명의 결정",types:["leaf","water","neutral"]},
 energy:{name:"에너지 결정",types:["fire","electric","earth"]},
 climate:{name:"기후 결정",types:["air","ice"]},
 thought:{name:"사고의 결정",types:["mind","dark"]}
});
function makeCreature(spriteId,level,rand=Math.random){
 const sp=byId.get(spriteId);if(!sp?.playable)throw Error("unknown monster "+spriteId);
 const m={id:spriteId,uid:"m"+Math.floor(rand()*0xffffffff).toString(36)+"_"+Math.floor(rand()*65536).toString(36),
 level,xp:0,hp:1,seen:true,shiny:rand()<1/256};
 normalizeGenes(m);m.hp=DB.combat.statsAtLevel(sp,level,m).hp;
 global.OPENMON_TURN_BATTLE?.normalize(m);return m;
}
function createNew(starter){
 if(!["set1_r02_c02","set1_r03_c02","set1_r04_c02"].includes(starter))throw Error("invalid starter");
 return {version:1,pos:{...START},facing:"down",party:[makeCreature(starter,5)],box:[],active:0,
  items:{ball:7,potion:3,life:1,energy:0,climate:0,thought:0},coins:120,flags:{shibuSeen:false,shibuCaught:false,shibuLastStep:-100,firstRoadEncounter:false,researchStarters:[]},
  collection:{[starter]:true},seen:{[starter]:true},steps:0,grassSteps:0,wins:0,catches:0,
  encounters:0,log:["연구소에서 첫 키즈몬을 받았어!"],createdAt:Date.now()};
}
function validateSave(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.party)||!raw.party.length||!raw.pos)return null;
 if(raw.party.length>6||!Array.isArray(raw.box)||raw.box.length>500)return null;
 const party=raw.party.concat(raw.box);
 for(const p of party){
  if(!byId.has(p.id)||!Number.isInteger(p.level)||p.level<1||p.level>60||
     !Number.isFinite(p.hp)||!Number.isFinite(p.xp))return null;
  p.level=Math.min(60,p.level);normalizeGenes(p);p.hp=Math.max(0,Math.min(DB.combat.statsAtLevel(p.id,p.level,p).hp,Math.floor(p.hp)));
  p.xp=Math.max(0,Math.floor(p.xp));
  global.OPENMON_TURN_BATTLE?.normalize(p);
 }
 if(!Number.isInteger(raw.pos.x)||!Number.isInteger(raw.pos.y)||!canMove(raw.pos.x,raw.pos.y))return null;
 raw.active=Math.max(0,Math.min(raw.party.length-1,Math.floor(raw.active)||0));
 const oldItems=raw.items||{};
  raw.items={ball:Math.max(0,Math.min(999,Math.floor(oldItems.ball||0))),potion:Math.max(0,Math.min(999,Math.floor(oldItems.potion||0)))};
  for(const key of Object.keys(STONES))raw.items[key]=Math.max(0,Math.min(99,Math.floor(oldItems[key]||0)));
 raw.coins=Math.max(0,Math.min(999999,Math.floor(raw.coins||0)));
 raw.flags={
  shibuSeen:!!raw.flags?.shibuSeen,shibuCaught:!!raw.flags?.shibuCaught,
  shibuLastStep:Number.isFinite(raw.flags?.shibuLastStep)?Math.floor(raw.flags.shibuLastStep):-100,
  firstRoadEncounter:!!raw.flags?.firstRoadEncounter,
  researchStarters:Array.isArray(raw.flags?.researchStarters)?raw.flags.researchStarters.filter(id=>["set1_r02_c02","set1_r03_c02","set1_r04_c02"].includes(id)).slice(0,2):[]
 };
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
function unlockedPool(zone,save){
 const cfg=DB.encounters[zone];
 if(!cfg)return [];
 const result=[...cfg.pool];
 if(save){
  const progress=(save.wins||0)+(save.catches||0);
  const waves=DB.researchEncounters?.[zone]||[];
  for(let i=0;i<waves.length;i++)
   if(progress>=DB.researchUnlockWins[i])result.push(...waves[i]);
 }
 return result;
}
function pickEncounter(zone,rand=Math.random,save=null){
 const cfg=DB.encounters[zone],pool=unlockedPool(zone,save);
 if(!cfg||!pool.length)return null;
 const index=Math.max(0,Math.min(pool.length-1,Math.floor(rand()*pool.length)));
 const boost=save?Math.min(8,Math.floor(((save.wins||0)+(save.catches||0))/6)):0;
 const lo=cfg.level[0]+boost,hi=cfg.level[1]+boost;
 const level=lo+Math.max(0,Math.min(hi-lo,Math.floor(rand()*(hi-lo+1))));
 return makeCreature(pool[index],level,rand);
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
 const firstRoad=zone==="meadow"&&x>=20&&save.encounters===0&&!save.flags.firstRoadEncounter;
 if(x===56&&y===7&&save.steps-save.flags.shibuLastStep>=24){
  save.flags.shibuSeen=true;save.flags.shibuLastStep=save.steps;
  encounter=makeCreature("shibu_r00_c00",Math.min(12,7+Math.floor((save.wins+save.catches)/8)),rand);
 }else if(firstRoad){
  save.flags.firstRoadEncounter=true;
  // First encounter is a safe, familiar scientific concept character.
  const firstByStarter={"set1_r02_c02":"set1_r01_c01","set1_r03_c02":"set2_r02_c00","set1_r04_c02":"set5_r02_c00"};
  encounter=makeCreature(firstByStarter[save.party[0]?.id]||"set1_r01_c01",2,rand);
 }else if(zone!=="town"&&shouldMeet(save,tile,rand)){
  encounter=pickEncounter(zone,rand,save);
 }
 if(encounter){save.encounters++;save.grassSteps=0;save.seen[encounter.id]=true}
 return {moved:true,zone,tile,encounter,firstRoad:!!(firstRoad&&encounter)};
}
function starterChoices(){return ["set1_r02_c02","set1_r03_c02","set1_r04_c02"]}
function researchStarterOptions(save){
 const count=Object.keys(save.collection||{}).filter(k=>byId.has(k)).length;
 const gifted=save.flags?.researchStarters?.length||0;
 const required=gifted===0?4:7;
 if(count<required)return {available:[],required,count};
 return {available:starterChoices().filter(k=>!save.collection[k]),required,count};
}
function claimResearchStarter(save,id){
 if(!starterChoices().includes(id)||save.collection[id])return false;
 const options=researchStarterOptions(save);
 if(!options.available.includes(id))return false;
 const gift=makeCreature(id,5);
 (save.party.length<6?save.party:save.box).push(gift);
 save.collection[id]=true;save.seen[id]=true;
 save.flags.researchStarters.push(id);
 return true;
}
function withdrawFromBox(save,index){
 if(!Number.isInteger(index)||index<0||index>=save.box.length)return false;
 const [member]=save.box.splice(index,1);
 if(save.party.length<6)save.party.push(member);
 else{
  const swapIndex=save.active;
  const old=save.party[swapIndex];
  save.party[swapIndex]=member;
  save.box.push(old);
 }
 return true;
}
function retaliationDamage(save,foe,active){
 const raw=DB.combat.damage({attacker:foe.id,defender:active.id,
  attackerLevel:foe.level,defenderLevel:active.level,power:5});
 let hit=Math.max(2,Math.floor(raw*.58));
 // Rookie protection for the first four meadow encounters, independently of starter type.
 if(zoneAt(save.pos.x)==="meadow"&&save.encounters<=4)
  hit=Math.min(hit,Math.max(3,Math.floor(DB.combat.statsAtLevel(active.id,active.level,active).hp*.15)));
 return hit;
}
function healAll(save){for(const p of save.party){p.hp=DB.combat.statsAtLevel(p.id,p.level,p).hp;global.OPENMON_TURN_BATTLE?.restorePP(p)}}
function xpGain(save,amount){
 const p=activeCreature(save);if(!p)return [];
 let events=[];p.xp+=amount;
 while(p.level<60&&p.xp>=DB.combat.xpToNext(p.level)){
  const required=DB.combat.xpToNext(p.level);
  p.xp-=required;const before=DB.combat.statsAtLevel(p.id,p.level,p).hp;
  p.level++;const after=DB.combat.statsAtLevel(p.id,p.level,p).hp;
  p.hp+=after-before;events.push({kind:"level",level:p.level});
 }
 if(p.level===60)p.xp=0;
 return events;
}
function addCaptured(save,target){
 const p={...target,hp:Math.max(1,target.hp),xp:0,uid:"m"+Math.random().toString(36).slice(2,11)};
 const inParty=save.party.length<6;
 global.OPENMON_TURN_BATTLE?.normalize(p);
 (inParty?save.party:save.box).push(p);
 save.collection[p.id]=true;save.seen[p.id]=true;save.catches++;
 return inParty?"party":"box";
}
function grantTraining(save,foe){
 const m=activeCreature(save),sp=byId.get(foe.id);
 if(!m||!sp)return null;
 normalizeGenes(m);
 const role=sp.battle.role,type=sp.type;
 const stat=role==="swift"?"speed":role==="guard"?(["water","ice","mind"].includes(type)?"spDefense":"defense"):
  type==="neutral"?"hp":DB.combat.SPECIAL_TYPES.has(type)?"spAttack":"attack";
 const used=IV_KEYS.reduce((sum,k)=>sum+m.training[k],0);
 const inc=Math.min(2,72-used,24-m.training[stat]);
 if(inc<=0)return null;
 const old=DB.combat.statsAtLevel(m.id,m.level,m).hp;
 m.training[stat]+=inc;
 const current=DB.combat.statsAtLevel(m.id,m.level,m).hp;
 if(current>old&&m.hp>0)m.hp+=current-old;
 return {stat,amount:inc};
}
function levelRewards(save,foe){
 const earned=DB.combat.xpReward(foe.id,foe.level);
 const events=xpGain(save,earned);
  const training=grantTraining(save,foe);
 const coins=6+foe.level*2;
 save.coins+=coins;save.wins++;
 const milestones={5:"life",10:"energy",15:"climate",20:"thought"};
 if(milestones[save.wins])save.items[milestones[save.wins]]=(save.items[milestones[save.wins]]||0)+1;
 let mentorHeal=0;
 if(save.wins<=3&&zoneAt(save.pos.x)==="meadow"){
  const lead=activeCreature(save);
  if(lead&&lead.hp>0){
   const before=lead.hp,cap=DB.combat.statsAtLevel(lead.id,lead.level,lead).hp;
   lead.hp=Math.min(cap,lead.hp+Math.floor(cap*.10));
   mentorHeal=lead.hp-before;
  }
 }
 return {earned,coins,events,mentorHeal,training};
}
function maybeEvolve(save,chosenId){
 const p=activeCreature(save);if(!p)return false;
 const options=DB.combat.evolutionAvailable(p.id,p.level);
 if(!options.some(o=>o.id===chosenId))return false;
 const oldMax=DB.combat.statsAtLevel(p.id,p.level,p).hp;
 const delta=oldMax-p.hp;
 p.id=chosenId;
 const newMax=DB.combat.statsAtLevel(p.id,p.level,p).hp;
 p.hp=Math.max(1,newMax-delta);
 const newTechnique=global.OPENMON_TURN_BATTLE?.equipEvolutionTechnique(p);
 if(newTechnique)p.lastEvolutionTechnique=newTechnique;
 save.collection[p.id]=true;save.seen[p.id]=true;
 return true;
}
function stoneEvolutionOptions(save){
 const p=activeCreature(save);if(!p||p.level<10||byId.get(p.id)?.evolutionRank!==1)return [];
 return DB.species.filter(s=>s.evolvesFrom===p.id&&s.evolutionCondition?.enabled)
 .map(s=>({id:s.id,name:s.name,stone:Object.keys(STONES).find(k=>STONES[k].types.includes(s.type))}))
 .filter(x=>x.stone);
}
function useEvolutionStone(save,id,stone){
 const option=stoneEvolutionOptions(save).find(x=>x.id===id&&x.stone===stone);
 if(!option||!(save.items?.[stone]>0))return false;
 const p=activeCreature(save),max=DB.combat.statsAtLevel(p.id,p.level,p).hp,lost=max-p.hp;
 save.items[stone]--;p.id=id;
 p.hp=Math.max(1,DB.combat.statsAtLevel(p.id,p.level,p).hp-lost);
 const move=global.OPENMON_TURN_BATTLE?.equipEvolutionTechnique(p);
 if(move)p.lastEvolutionTechnique=move;
 save.collection[p.id]=true;save.seen[p.id]=true;return true;
}
global.OPENMON_EXPEDITION_ENGINE={STONES,genesFromUid,normalizeGenes,stoneEvolutionOptions,useEvolutionStone,WIDTH,HEIGHT,START,ZONES,zoneAt,terrain,canMove,makeCreature,createNew,validateSave,grantTraining,pickEncounter,unlockedPool,shouldMeet,move,healAll,activeCreature,xpGain,addCaptured,levelRewards,maybeEvolve,researchStarterOptions,claimResearchStarter,withdrawFromBox,retaliationDamage};
})(window);
