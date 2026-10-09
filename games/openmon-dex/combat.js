/* Pure deterministic battle maths for KIDSCADE Openmon. Values are design prototypes. */
(function(w){
"use strict";
const d=w.OPENMON_DEX;
if(!d?.dexEntries?.length)throw Error("Load roster.js first");
const counters={
 leaf:["water","earth"],water:["fire","air"],air:["leaf","earth"],
 fire:["leaf","ice"],electric:["water","air"],earth:["electric","fire"],
 ice:["air","leaf"],mind:["neutral"],dark:["mind"],neutral:[]
};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const byId=new Map(d.species.map(x=>[x.id,x]));
function get(key){
 const obj=typeof key==="string"?byId.get(key):key;
 if(!obj?.playable||!obj.battle)throw Error("Unknown combat species");
 return obj;
}
function statsAtLevel(key,level){
 const s=get(key);
 if(!Number.isInteger(level)||level<1||level>60)throw Error("Level must be 1–60");
 const stats=s.battle.base, growth=s.battle.growth, result={};
 for(const k of ["hp","attack","defense","speed"])
  result[k]=Math.floor(stats[k]+(level-1)*growth[k]);
 return result;
}
function effectiveness(attackType,defenderType){
 if(!d.types[attackType]||!d.types[defenderType])throw Error("Invalid element");
 if(attackType===defenderType)return 1;
 if(counters[attackType].includes(defenderType))return 2;
 if(counters[defenderType].includes(attackType))return 0.5;
 return 1;
}
function damage({attacker,defender,attackerLevel,defenderLevel,power=9,moveType}){
 const a=get(attacker),b=get(defender);
 if(!Number.isInteger(power)||power<1||power>40)throw Error("Move power out of bounds");
 const atk=statsAtLevel(a,attackerLevel).attack;
 const def=statsAtLevel(b,defenderLevel).defense;
 const element=moveType||a.type;
 const multiplier=effectiveness(element,b.type);
 const stab=element===a.type?1.1:1;
 const raw=Math.max(1,atk+power-Math.floor(def*.75));
 return Math.max(1,Math.floor(raw*stab*multiplier));
}
function captureChance({target,level,hp,maxHp,ball="standard",status=false}){
 const s=get(target);
 if(!Number.isInteger(level)||level<1||level>60||!Number.isFinite(maxHp)||maxHp<=0||
    !Number.isFinite(hp)||hp<1||hp>maxHp)throw Error("Invalid capture HP");
 const item={standard:0,improved:.14,advanced:.25}[ball];
 if(item===undefined)throw Error("Unknown ball");
 if(s.rarity==="starter"||s.evolutionRank>=3)return 0; // story rewards, not farmable
 const remaining=hp/maxHp;
 return Math.round(clamp(s.battle.captureBase*(.68+1.45*(1-remaining))+(status?.1:0)+item,.04,.9)*100)/100;
}
function xpToNext(level){
 if(!Number.isInteger(level)||level<1||level>=60)throw Error("Invalid XP level");
 return 8+4*level+Math.floor(level*level/3);
}
function xpReward(target,level){
 const s=get(target);
 return level*3+s.battle.experienceYield;
}
function evolutionAvailable(key,level){
 const s=get(key),branches=d.species.filter(next=>next.evolvesFrom===s.id&&next.evolutionCondition?.enabled);
 return branches.filter(x=>level>=x.evolutionCondition.level).map(x=>({dexNo:x.dexNo,id:x.id,name:x.name,requiredLevel:x.evolutionCondition.level}));
}
d.combat={statsAtLevel,effectiveness,damage,captureChance,xpToNext,xpReward,evolutionAvailable,counters};
})(window);
