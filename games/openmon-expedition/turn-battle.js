/* KIDSMON turn-based battle rules: deterministic pure interface with injectable RNG.
 * Uses existing 10 types, species stats and saved creature IDs without changing saves.
 */
(function(w){
"use strict";
const D=w.OPENMON_DEX;
if(!D?.combat||!D.species)throw Error("Load Kidscade dex and combat before turn-battle.js");
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const M={
 tackle:{name:"몸통박치기",type:"neutral",power:7,accuracy:100,pp:35},
 quick:{name:"재빠른 일격",type:"neutral",power:5,accuracy:100,pp:20,priority:1},
 focus:{name:"집중",type:"neutral",power:0,accuracy:100,pp:15,kind:"buff",buff:{stat:"attack",amount:1}},
 leaf:{name:"씨앗탄",type:"leaf",power:9,accuracy:100,pp:25},
 vine:{name:"덩굴 포박",type:"leaf",power:6,accuracy:95,pp:20,afflict:{kind:"slow",chance:.6},trap:2},
 synthesis:{name:"광합성",type:"leaf",power:0,accuracy:100,pp:8,kind:"heal",heal:.33},
 bloom:{name:"꽃잎 폭풍",type:"leaf",power:13,accuracy:90,pp:10},
 photoPulse:{name:"광합성 파동",type:"leaf",power:7,accuracy:100,pp:16,drain:.25},
 water:{name:"물대포",type:"water",power:9,accuracy:100,pp:25},
 pressure:{name:"압력 분사",type:"water",power:10,accuracy:95,pp:15,afflict:{kind:"weaken",chance:.35}},
 raincoat:{name:"물의 장막",type:"water",power:0,accuracy:100,pp:12,kind:"shield",shield:.38},
 torrent:{name:"급류",type:"water",power:13,accuracy:90,pp:10},
 pascalPress:{name:"파스칼 압력파",type:"water",power:8,accuracy:100,pp:16,afflict:{kind:"weaken",chance:.5}},
 fire:{name:"불꽃탄",type:"fire",power:9,accuracy:100,pp:25},
 ember:{name:"작은 불씨",type:"fire",power:6,accuracy:100,pp:20,afflict:{kind:"burn",chance:.4}},
 heat:{name:"열기 모으기",type:"fire",power:0,accuracy:100,pp:15,kind:"buff",buff:{stat:"attack",amount:1}},
 inferno:{name:"용암 포효",type:"fire",power:14,accuracy:85,pp:8},
 spark:{name:"전격",type:"electric",power:9,accuracy:100,pp:25},
 static:{name:"정전기",type:"electric",power:6,accuracy:95,pp:20,afflict:{kind:"slow",chance:.65},stunChance:.18},
 charge:{name:"충전",type:"electric",power:0,accuracy:100,pp:12,kind:"buff",buff:{stat:"attack",amount:1}},
 thunder:{name:"번개 폭발",type:"electric",power:14,accuracy:85,pp:8},
 stone:{name:"낙석",type:"earth",power:9,accuracy:100,pp:25},
 wall:{name:"암벽",type:"earth",power:0,accuracy:100,pp:12,kind:"shield",shield:.45},
 quake:{name:"지진파",type:"earth",power:12,accuracy:90,pp:12},
 wind:{name:"돌풍",type:"air",power:9,accuracy:100,pp:25},
 gust:{name:"순풍베기",type:"air",power:7,accuracy:100,pp:20,priority:1},
 tailwind:{name:"순풍",type:"air",power:0,accuracy:100,pp:12,kind:"buff",buff:{stat:"speed",amount:1}},
 cyclone:{name:"회오리",type:"air",power:13,accuracy:90,pp:10},
 fiboStrikes:{name:"피보 연격",type:"air",power:5,accuracy:95,pp:16,hits:2},
 ice:{name:"얼음조각",type:"ice",power:8,accuracy:100,pp:25},
 frost:{name:"서리 숨결",type:"ice",power:7,accuracy:95,pp:20,afflict:{kind:"slow",chance:.65}},
 glacier:{name:"빙하방패",type:"ice",power:0,accuracy:100,pp:12,kind:"shield",shield:.38},
 blizzard:{name:"눈보라",type:"ice",power:13,accuracy:85,pp:10},
 mind:{name:"염동력",type:"mind",power:9,accuracy:100,pp:25},
 predict:{name:"미래 예측",type:"mind",power:0,accuracy:100,pp:12,kind:"buff",buff:{stat:"defense",amount:1}},
 mindwave:{name:"정신 파동",type:"mind",power:12,accuracy:95,pp:12,afflict:{kind:"weaken",chance:.3}},
 shadow:{name:"그림자베기",type:"dark",power:9,accuracy:100,pp:25},
 mark:{name:"그림자 표식",type:"dark",power:6,accuracy:95,pp:20,afflict:{kind:"weaken",chance:.55}},
 night:{name:"밤의 일격",type:"dark",power:12,accuracy:90,pp:12},
 counter:{name:"받아치기",type:"neutral",power:0,accuracy:100,pp:12,kind:"counter",shield:.50,reflect:1.3},
 neutral:{name:"정면돌파",type:"neutral",power:11,accuracy:95,pp:15}
};
for(const [id,move] of Object.entries(M))move.id=id;
const MOVESET={
 neutral:["neutral","counter","quick","focus"],
 leaf:["leaf","vine","synthesis","bloom"],
 water:["water","pressure","raincoat","torrent"],
 fire:["fire","ember","heat","inferno"],
 electric:["spark","static","charge","thunder"],
 earth:["stone","wall","quake","focus"],
 air:["wind","gust","tailwind","cyclone"],
 ice:["ice","frost","glacier","blizzard"],
 mind:["mind","predict","mindwave","focus"],
 dark:["shadow","mark","night","quick"]
};
const getSpecies=id=>D.species.find(s=>s.id===id);
const familyMoves=new Map();
const branchMoves=new Map();
const SIGNATURE_PROFILES={
 swift:(tier)=>({power:7+tier*2,accuracy:100,pp:18-tier*2,priority:1}),
 twin:(tier)=>({power:5+tier,accuracy:95,pp:18-tier*2,hits:2}),
 drain:(tier)=>({power:7+tier*2,accuracy:100,pp:17-tier*2,drain:.2+tier*.06}),
 weaken:(tier)=>({power:8+tier*2,accuracy:95,pp:17-tier*2,
  afflict:{kind:"weaken",chance:.25+tier*.1}}),
 slow:(tier)=>({power:7+tier*2,accuracy:95,pp:17-tier*2,
  afflict:{kind:"slow",chance:.3+tier*.1}}),
 burn:(tier)=>({power:7+tier*2,accuracy:95,pp:17-tier*2,
  afflict:{kind:"burn",chance:.22+tier*.1}}),
 burst:(tier)=>({power:11+tier*2,accuracy:90,pp:13-tier*2}),
 heal:(tier)=>({power:0,accuracy:100,pp:10-tier,kind:"heal",heal:.27+tier*.08}),
 shield:(tier)=>({power:0,accuracy:100,pp:12-tier,kind:"shield",shield:.30+tier*.08}),
 buff:(tier)=>({power:0,accuracy:100,pp:12-tier,kind:"buff",
  buff:{stat:tier===2?"speed":"attack",amount:1}})
};
function signatureId(key,suffix="base"){
 return "family_"+key.replace(/[^a-z0-9]/g,"_")+"_"+suffix;
}
function createSignature(id,name,style,type,tier,key){
 if(M[id]||!D.types[type]||!SIGNATURE_PROFILES[style])throw Error("Invalid family skill "+id);
 const data=SIGNATURE_PROFILES[style](tier);
 // Slightly different power and PP within each combat role: same-type family
 // signatures should not merely be different labels for identical attacks.
 const index=D.families.findIndex(f=>f.key===key);
 if(data.power>0)data.power=clamp(data.power+(index%3)-1,4,16);
 data.pp=clamp(data.pp+(index%3)-1,7,35);
 M[id]={id,name,type,...data,familyKey:key,signatureTier:tier};
 return id;
}
function registerFamilyMoves({key,name,style,advancedName,ultimateName,branches}){
 const family=D.families.find(f=>f.key===key);
 if(!family||familyMoves.has(key)||!SIGNATURE_PROFILES[style])throw Error("Invalid or repeated family "+key);
 const forms=family.parts.map(id=>getSpecies(id)),primary=forms[0];
 const starters={"starter-2":"photoPulse","starter-3":"pascalPress","starter-4":"fiboStrikes"};
 const base=starters[key]||createSignature(signatureId(key),name,style,primary.type,0,key);
 const config={key,base,advanced:null,ultimate:null};
 if(family.parts.length>1&&!branches){
  if(!advancedName)throw Error("Missing evolution move "+key);
  config.advanced=createSignature(signatureId(key,"e2"),advancedName,style,forms[1].type,1,key);
 }
 if(family.parts.length>=3&&family.kind!=="branch"){
  if(!ultimateName)throw Error("Missing ultimate move "+key);
  config.ultimate=createSignature(signatureId(key,"e3"),ultimateName,style,forms[2].type,2,key);
 }
 if(branches){
  if(family.kind!=="branch"||branches.length!==family.parts.length-1)
   throw Error("Wrong branch species "+key);
  for(const [index,entry] of branches.entries()){
   if(entry.id!==family.parts[index+1]||!entry.name||entry.type!==forms[index+1].type)
    throw Error("Wrong branch mapping "+entry.id);
   const id=createSignature(signatureId(key,"branch_"+(index+1)),entry.name,entry.style,entry.type,1,key);
   branchMoves.set(entry.id,id);
  }
 }
 familyMoves.set(key,config);
 return config;
}
function growthMoves(mon){
 const sp=getSpecies(mon.id),f=sp&&familyMoves.get(sp.familyKey);
 if(!f)return {base:null,advanced:null,ultimate:null};
 const advanced=sp.evolutionRank>=2&&mon.level>=14?
  branchMoves.get(sp.id)||f.advanced:null;
 const ultimate=sp.evolutionRank>=3&&mon.level>=26?f.ultimate:null;
 return {base:f.base,advanced,ultimate};
}
function equipEvolutionTechnique(mon){
 const growth=growthMoves(mon);
 const desired=growth.ultimate||growth.advanced;
 if(!desired)return null;
 normalize(mon);
 if(mon.moveSlots.some(slot=>slot.id===desired))return desired;
 // User-selected loadouts take priority over automatic evolution teaching.
 if(mon.moveLoadoutCustomized)return null;
 const sp=getSpecies(mon.id),cfg=MOVESET[sp.type]||MOVESET.neutral;
 // Replace a generic starter move first; preserve custom skills and PP otherwise.
 const replaceIndex=mon.moveSlots.findIndex(slot=>
   slot.id==="tackle"||cfg.includes(slot.id));
 if(replaceIndex<0)return null;
 mon.moveSlots[replaceIndex]={id:desired,pp:M[desired].pp};
 return desired;
}

const getMove=id=>M[id]||null;
function learnable(mon){
 const sp=getSpecies(mon.id);if(!sp)return [];
 const cfg=MOVESET[sp.type]||MOVESET.neutral,growth=growthMoves(mon);
 const starters={"starter-2":"photoPulse","starter-3":"pascalPress","starter-4":"fiboStrikes"};
 let list;
 if(starters[sp.familyKey]){
  list=sp.familyKey==="starter-2"?["tackle","leaf","synthesis","photoPulse","vine"]:
   sp.familyKey==="starter-3"?["tackle","water","raincoat","pascalPress","pressure"]:
   ["tackle","wind","gust","fiboStrikes","tailwind"];
 }else if(growth.base){
  list=["tackle",cfg[0],cfg[1],growth.base,cfg[2]];
 }else list=["tackle",...cfg.slice(0,3)];
 if(growth.advanced)list.push(growth.advanced);
 if(growth.ultimate)list.push(growth.ultimate);
 if(mon.level>=14)list.push(cfg[3]);
 if(mon.level>=26)list.push("quick");
 if(sp.battle?.role==="swift"&&mon.level>=10)list.push("quick");
 if(sp.battle?.role==="guard"&&mon.level>=10)list.push("counter");
 return [...new Set(list)];
}
function startingMoves(mon){
 const s=getSpecies(mon.id),cfg=MOVESET[s.type]||MOVESET.neutral;
 const known=learnable(mon),growth=growthMoves(mon);
 if(!growth.base)return known.slice(0,4);
 if(s.evolutionRank>=3&&growth.ultimate)return [...new Set(["tackle",growth.base,growth.advanced,growth.ultimate])].slice(0,4);
 if(s.evolutionRank>=2&&growth.advanced)return [...new Set(["tackle",cfg[0],growth.base,growth.advanced])].slice(0,4);
 return known.slice(0,4);
}
function normalize(mon){
 if(!mon||!getSpecies(mon.id))return [];
 const all=learnable(mon);
 const fallback=startingMoves(mon);
 if(!Array.isArray(mon.moveSlots)||!mon.moveSlots.length)mon.moveSlots=fallback.map(id=>({id,pp:M[id].pp}));
 // Only untouched legacy type-default layouts receive the new signature automatically.
 // User-customized move sets and their remaining PP are never overwritten.
 else if(!mon.moveLoadoutCustomized&&familyMoves.has(getSpecies(mon.id).familyKey)){
  const sp=getSpecies(mon.id),cfg=MOVESET[sp.type]||MOVESET.neutral;
  const vanilla=["tackle",...cfg.slice(0,3)];
  const actual=mon.moveSlots.map(x=>x?.id);
  const growth=growthMoves(mon);
  if(growth.base&&!actual.includes(growth.base)&&actual.length===4&&
     vanilla.every((id,i)=>actual[i]===id)){
   mon.moveSlots[3]={id:growth.base,pp:M[growth.base].pp};
  }
 }
 const unique=new Set();
 mon.moveSlots=mon.moveSlots.filter(slot=>{
  if(!slot||!M[slot.id]||unique.has(slot.id))return false;
  unique.add(slot.id);return true;
 }).slice(0,4).map(slot=>({id:slot.id,pp:clamp(Number.isFinite(slot.pp)?Math.floor(slot.pp):M[slot.id].pp,0,M[slot.id].pp)}));
 for(const id of fallback)if(mon.moveSlots.length<4&&!unique.has(id)){mon.moveSlots.push({id,pp:M[id].pp});unique.add(id)}
 return mon.moveSlots;
}
function changeMove(mon,newId,at){
 normalize(mon);
 if(!learnable(mon).includes(newId)||!Number.isInteger(at)||at<0||at>=4||mon.moveSlots.some((x,i)=>i!==at&&x.id===newId))return false;
 mon.moveSlots[at]={id:newId,pp:M[newId].pp};
 mon.moveLoadoutCustomized=true;
 return true;
}
function restorePP(mon){normalize(mon);mon.moveSlots.forEach(m=>{m.pp=M[m.id].pp})}
function makeSide(){return {attack:0,defense:0,spAttack:0,spDefense:0,speed:0,shield:0,
 counter:0,trapTurns:0,stunPending:false,stunImmunity:0,armorUsed:false,abilityUsed:false,
 condition:null,conditionTurns:0,weakenPenalty:0}}
function state(){return {player:makeSide(),foe:makeSide()}}
function stageValue(stat,n){return stat*(n>=0?(2+n)/2:2/(2-n))}
function score(mon,side){return stageValue(D.combat.statsAtLevel(mon.id,mon.level,mon).speed,side.speed)*(side.condition==="slow"?.7:1)*(D.combat.abilityFor(mon)==="agility"?1.12:1)}
function moveDamage(attacker,target,move,aSide,dSide,protect){
 const raw=D.combat.damage({attacker:attacker.id,defender:target.id,attackerLevel:attacker.level,
  defenderLevel:target.level,power:move.power,moveType:move.type,damageClass:move.damageClass,
  attackerMon:attacker,defenderMon:target});
 const special=(move.damageClass|| (D.combat.SPECIAL_TYPES.has(move.type)?"special":"physical"))==="special";
 const a=(2+Math.max(-3,Math.min(3,special?aSide.spAttack:aSide.attack)))/2;
 const d=(2+Math.max(-3,Math.min(3,special?dSide.spDefense:dSide.defense)))/2;
 // Shorter damage steps leave room to make choices instead of deciding the fight in one turn.
 let dmg=Math.max(1,Math.floor(raw*.62*a/d));
 if(dSide.shield){dmg=Math.max(1,Math.round(dmg*(1-dSide.shield)));dSide.shield=0}
 if(D.combat.abilityFor(target)==="fortify"&&!dSide.armorUsed){dmg=Math.max(1,Math.ceil(dmg*.8));dSide.armorUsed=true}
 if(protect) dmg=Math.min(dmg,protect);
 return dmg;
}
function chooseEnemyMove(foe,own,foeSide,ownSide,rng=Math.random){
 normalize(foe);
 let choices=foe.moveSlots.filter(slot=>slot.pp>0);
 if(!choices.length)return "tackle";
 const hp=foe.hp/D.combat.statsAtLevel(foe.id,foe.level,foe).hp;
 let weighted=choices.map(slot=>{
  let m=M[slot.id],w=1;
  if(m.kind==="heal")w=hp<.45?5:.1;
   else if(m.kind==="counter")w=foeSide.counter?.1:hp<.65?2.6:1.1;
  else if(m.kind==="shield")w=foeSide.shield?0.15:own.hp/D.combat.statsAtLevel(own.id,own.level,own).hp<.6?1.8:.8;
  else if(m.kind==="buff")w=foeSide[m.buff.stat]>=2?.2:foeSide[m.buff.stat]>=1?.8:1.6;
  else {
   let effect=D.combat.effectiveness(m.type,getSpecies(own.id).type);
   w=1+Math.min(3,m.power/6)*effect;
   if(m.afflict&&ownSide.condition)w*=.65;
   if(m.priority)w+=.5;
  }
  return {id:m.id||slot.id,w};
 });
 const total=weighted.reduce((v,x)=>v+x.w,0),x=rng()*total;
 let value=0;
 for(const item of weighted){value+=item.w;if(x<value)return item.id}
 return weighted[weighted.length-1].id;
}
function resolve({save,foe,battle,action,random=Math.random,rookieCap=0}){
 if(!save||!foe||!battle||!action)return {ok:false,reason:"invalid"};
 const side=battle.turnState||(battle.turnState=state());
 const player=()=>save.party[save.active];
 if(!player())return {ok:false,reason:"no active"};
 normalize(player());normalize(foe);
 const events=[];
 const say=msg=>events.push(msg);
 const playerAction=action.type==="move"?getMove(action.id):null;
 if(action.type==="move"){
  const slot=player().moveSlots.find(s=>s.id===action.id);
  if(!playerAction||!slot||slot.pp<=0)return {ok:false,reason:"pp"};
 }
 if(!["move","soft","ball","potion","switch","run"].includes(action.type))return {ok:false,reason:"action"};
 if(action.type==="ball"&&save.items.ball<=0)return {ok:false,reason:"ball"};
 if(action.type==="potion"&&(save.items.potion<=0||player().hp>=D.combat.statsAtLevel(player().id,player().level,player()).hp))return {ok:false,reason:"potion"};
 if(action.type==="switch"&&side.player.trapTurns>0)return {ok:false,reason:"trapped"};
 if(action.type==="switch"&&(!Number.isInteger(action.index)||!save.party[action.index]||save.party[action.index].hp<=0||save.active===action.index))return {ok:false,reason:"switch"};
 const introMoves=foe.moveSlots.filter(x=>x.pp>0&&M[x.id]?.power&&!M[x.id]?.afflict);
 const enemyId=battle.firstRoad&&introMoves.length?
  introMoves[Math.floor(random()*introMoves.length)].id:
  chooseEnemyMove(foe,player(),side.foe,side.player,random);
 const enemyAction=getMove(enemyId)||M.tackle;
 const pPriority=action.type==="run"?8:action.type==="switch"?7:action.type==="ball"||action.type==="potion"?6:
  action.type==="soft"?0:playerAction.priority||0;
 const fPriority=enemyAction.priority||0;
 let playerFirst=pPriority!==fPriority?pPriority>fPriority:score(player(),side.player)!==score(foe,side.foe)?
  score(player(),side.player)>score(foe,side.foe):random()<.5;
 let outcome="continue",captured=false,ran=false,potionUsed=false,switched=false;
 function useMove(user,opponent,from,to,move,enemy=false){
  normalize(user);
  const slot=user.moveSlots.find(s=>s.id===move.id);
  if(slot&&slot.pp>0)slot.pp--;
  else if(move.id!=="tackle"){say((enemy?"상대 ":"")+"기술 PP가 없어!");return}
  const name=getSpecies(user.id).name;
  if(random()*100>=move.accuracy){say(name+"의 "+move.name+"! 빗나갔어.");return}
  if(move.kind==="heal"){
   const cap=D.combat.statsAtLevel(user.id,user.level,user).hp;
   const healed=Math.min(cap-user.hp,Math.max(1,Math.ceil(cap*move.heal)));
   user.hp+=healed;say(name+"의 "+move.name+"! HP "+healed+" 회복.");return;
  }
  if(move.kind==="shield"){from.shield=move.shield;say(name+"의 "+move.name+"! 다음 피해를 줄여.");return}
   if(move.kind==="counter"){from.shield=move.shield;from.counter=move.reflect;say(name+"의 "+move.name+"! 공격을 기다리며 반격 자세!");return}
  if(move.kind==="buff"){from[move.buff.stat]=clamp(from[move.buff.stat]+move.buff.amount,-3,3);say(name+"의 "+move.name+"! "+({attack:"공격",defense:"방어",speed:"속도"}[move.buff.stat])+" 상승.");return}
  let dealt=0;
  for(let hit=0;hit<(move.hits||1)&&opponent.hp>0;hit++){
   const amount=moveDamage(user,opponent,move,from,to,enemy?rookieCap:0);
   const actual=Math.min(opponent.hp,amount);opponent.hp-=actual;dealt+=actual;
  }
  // A counter reverses one direct damaging attack; utility moves safely bait it.
   if(to.counter&&dealt>0&&opponent.hp>0&&user.hp>0){
    const returned=Math.min(user.hp,Math.max(1,Math.floor(dealt*to.counter)));
    user.hp-=returned;to.counter=0;
    say(getSpecies(opponent.id).name+"의 반격! "+returned+" 피해를 되돌렸어.");
   }
   if(opponent.hp>0&&!to.abilityUsed&&D.combat.abilityFor(opponent)==="recovery"&&
     opponent.hp<=Math.floor(D.combat.statsAtLevel(opponent.id,opponent.level,opponent).hp*.35)){
    to.abilityUsed=true;const cap=D.combat.statsAtLevel(opponent.id,opponent.level,opponent).hp;
    const gain=Math.min(cap-opponent.hp,Math.max(1,Math.ceil(cap*.12)));
    opponent.hp+=gain;say(getSpecies(opponent.id).name+"의 회복 본능! HP "+gain+" 회복.");
   }
   const eff=D.combat.effectiveness(move.type,getSpecies(opponent.id).type);
  say(name+"의 "+move.name+"! "+dealt+" 피해."+
   (move.hits?" "+move.hits+"회 연속 공격!":"")+
   (eff===2?" 효과가 굉장해!":eff===.5?" 효과가 약해.":""));
  if(move.drain){
   const cap=D.combat.statsAtLevel(user.id,user.level,user).hp;
   const gain=Math.max(0,Math.min(cap-user.hp,Math.max(1,Math.floor(dealt*move.drain))));
   user.hp+=gain;if(gain)say(name+"이(가) HP "+gain+" 회복!");
  }
  if(move.trap&&opponent.hp>0){to.trapTurns=Math.max(to.trapTurns,move.trap);say(getSpecies(opponent.id).name+"의 교체가 봉쇄되었어!")}
   if(move.stunChance&&opponent.hp>0&&!to.stunImmunity&&!to.stunPending&&random()<move.stunChance){
    to.stunPending=true;to.stunImmunity=3;say(getSpecies(opponent.id).name+"이(가) 감전되어 다음 행동을 쉬어!");
   }
   if(move.afflict&&opponent.hp>0&&!to.condition&&random()<move.afflict.chance){
   to.condition=move.afflict.kind;to.conditionTurns=move.afflict.kind==="burn"?3:2;
   if(to.condition==="weaken"){to.weakenPenalty=to.attack>-3?1:0;to.attack=clamp(to.attack-1,-3,3)}
   say(getSpecies(opponent.id).name+"에게 "+({burn:"화상",slow:"둔화",weaken:"공격 약화"}[to.condition])+" 효과!");
  }
 }
 function act(isPlayer){
  const user=isPlayer?player():foe,other=isPlayer?foe:player();
  const a=isPlayer?side.player:side.foe,b=isPlayer?side.foe:side.player;
  if(!user||!user.hp||!other.hp)return;
  if(a.stunPending){a.stunPending=false;say(getSpecies(user.id).name+"이(가) 감전되어 행동하지 못했어.");return}
  if(isPlayer){
   if(action.type==="run"){ran=true;outcome="run";say("무사히 도망쳤어!");return}
   if(action.type==="switch"){save.active=action.index;normalize(player());switched=true;side.player=makeSide();say(getSpecies(player().id).name+" 출전!");return}
   if(action.type==="potion"){save.items.potion--;const cap=D.combat.statsAtLevel(user.id,user.level,user).hp,healed=Math.min(20,cap-user.hp);user.hp+=healed;potionUsed=true;say(getSpecies(user.id).name+" HP "+healed+" 회복!");return}
   if(action.type==="ball"){
    save.items.ball--;
    const chance=D.combat.captureChance({target:foe.id,level:foe.level,hp:foe.hp,maxHp:D.combat.statsAtLevel(foe.id,foe.level,foe).hp,status:side.foe.condition==="burn"||side.foe.condition==="slow"});
    captured=random()<chance;
    say(captured?getSpecies(foe.id).name+" 포획 성공!":"키즈볼 포획 실패! ("+Math.round(chance*100)+"%)");
    if(captured)outcome="caught";
    return;
   }
   if(action.type==="soft"){
    const basic=M.tackle,estimate=moveDamage(user,other,{...basic,power:4},a,b,0);
    const dealt=Math.min(estimate,Math.max(0,other.hp-1));other.hp-=dealt;
    say(getSpecies(user.id).name+"의 살살 공격! "+dealt+" 피해 · HP 1 남김.");return;
   }
   useMove(user,other,a,b,playerAction);
  }else useMove(user,other,a,b,enemyAction,true);
 }
 if(playerFirst){act(true);if(outcome==="continue"&&player().hp>0&&foe.hp>0)act(false)}
 else{act(false);if(outcome==="continue"&&player().hp>0&&foe.hp>0)act(true)}
 if(outcome==="continue"){
  if(!foe.hp)outcome="won";
  else if(!player().hp){
   const next=save.party.findIndex(x=>x.hp>0);
   if(next>=0){save.active=next;side.player=makeSide();say("다음 키즈몬 "+getSpecies(player().id).name+" 출전!")}
   else outcome="lost";
  }
 }
 if(outcome==="continue"){
  for(const [who,mon,s] of [["아군",player(),side.player],["상대",foe,side.foe]]){
   if(mon.hp>0&&s.condition==="burn"){
    const hit=Math.max(1,Math.floor(D.combat.statsAtLevel(mon.id,mon.level,mon).hp/14));
    mon.hp=Math.max(0,mon.hp-hit);say(who+" 화상 피해 -"+hit);
   }
   if(s.trapTurns>0)s.trapTurns--;
    if(s.stunImmunity>0)s.stunImmunity--;
    if(s.counter){s.counter=0;s.shield=0;say(who+"의 반격 준비가 끝났어.")}
    if(s.conditionTurns>0){s.conditionTurns--;if(!s.conditionTurns){
     if(s.condition==="weaken"&&s.weakenPenalty){s.attack=clamp(s.attack+s.weakenPenalty,-3,3);s.weakenPenalty=0}
     s.condition=null;say(who+" 상태 효과가 끝났어.")}}
   // Weaken changes attack stage once and now restores exactly that temporary penalty on expiry.
  }
  if(!foe.hp)outcome="won";
  else if(!player().hp){const next=save.party.findIndex(p=>p.hp>0);if(next>=0){save.active=next;side.player=makeSide();say("다음 키즈몬 출전!")}else outcome="lost"}
 }
 return {ok:true,outcome,events,enemyMove:enemyId,playerFirst,captured,ran,potionUsed,switched};
}
w.OPENMON_TURN_BATTLE={moves:M,moveSets:MOVESET,normalize,restorePP,learnable,changeMove,chooseEnemyMove,resolve,state,score,registerFamilyMoves,growthMoves,equipEvolutionTechnique,familyMoves,branchMoves};
})(window);
