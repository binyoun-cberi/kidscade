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
// Six battle statistics; existing four-stat species and saves remain valid.
const STAT_KEYS=["hp","attack","defense","spAttack","spDefense","speed"];
const SPECIAL_TYPES=new Set(["leaf","water","fire","electric","ice","mind"]);
const ABILITIES=Object.freeze({
 fortify:{name:"견고함",description:"전투에서 처음 받는 공격 피해가 20% 감소"},
 agility:{name:"기민함",description:"기술 우선도가 같으면 행동 속도 12% 상승"},
 recovery:{name:"회복 본능",description:"위기 시 전투마다 한 번 최대 HP의 12% 회복"}
});
function abilityFor(mon){
 const s=get(mon?.id||mon);
 return s.battle.role==="guard"?"fortify":s.battle.role==="swift"?"agility":"recovery";
}
function statsAtLevel(key,level,mon=null){
 const s=get(key);
 if(!Number.isInteger(level)||level<1||level>60)throw Error("Level must be 1–60");
 const base=s.battle.base,growth=s.battle.growth,role=s.battle.role||"balanced",result={};
 const specialAttack=base.spAttack??Math.max(4,Math.round(base.attack*(SPECIAL_TYPES.has(s.type)?1.10:.88)));
 const specialDefense=base.spDefense??Math.max(4,Math.round(base.defense*(role==="guard"?1.08:role==="swift"?.90:1)));
 const values={...base,spAttack:specialAttack,spDefense:specialDefense};
 const rates={...growth,spAttack:growth.spAttack??growth.attack,spDefense:growth.spDefense??growth.defense};
 for(const k of STAT_KEYS){
  const raw=Math.floor(values[k]+(level-1)*rates[k]);
  // 0-15 individual potential contributes at most ~5% at higher levels.
  const iv=mon?.genetics?.iv?.[k];
  const bonus=Number.isInteger(iv)&&iv>=0&&iv<=15?Math.floor(raw*.05*iv/15):0;
  result[k]=Math.max(1,raw+bonus);
 }
 return result;
}
function effectiveness(attackType,defenderType){
 if(!d.types[attackType]||!d.types[defenderType])throw Error("Invalid element");
 if(attackType===defenderType)return 1;
 if(counters[attackType].includes(defenderType))return 2;
 if(counters[defenderType].includes(attackType))return 0.5;
 return 1;
}
function damage({attacker,defender,attackerLevel,defenderLevel,power=9,moveType,damageClass,attackerMon=null,defenderMon=null}){
 const a=get(attacker),b=get(defender);
 if(!Number.isInteger(power)||power<1||power>40)throw Error("Move power out of bounds");
 const element=moveType||a.type;
 const category=damageClass|| (SPECIAL_TYPES.has(element)?"special":"physical");
 const stat=category==="special"?"spAttack":"attack",guard=category==="special"?"spDefense":"defense";
 const atk=statsAtLevel(a,attackerLevel,attackerMon)[stat];
 const def=statsAtLevel(b,defenderLevel,defenderMon)[guard];
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
d.combat={statsAtLevel,effectiveness,damage,captureChance,xpToNext,xpReward,evolutionAvailable,counters,STAT_KEYS,SPECIAL_TYPES,ABILITIES,abilityFor};
})(window);
