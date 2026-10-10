/* KIDSMON move encyclopedia — read-only index of the live battle engine. */
(function(w){
"use strict";
const D=w.OPENMON_DEX,B=w.OPENMON_TURN_BATTLE;
if(!D?.species||!B?.moves)throw Error("Load KIDSMON dex and turn battle before move-dex.js");
const TYPE_ORDER=["neutral","leaf","water","fire","electric","earth","air","ice","mind","dark"];
const TYPE_SYMBOLS={neutral:"◇",leaf:"✿",water:"≈",fire:"✹",electric:"ϟ",earth:"◆",air:"➶",ice:"❄",mind:"◎",dark:"◈"};
const CATEGORY_NAMES={attack:"공격",control:"견제",heal:"회복",shield:"방어",counter:"반격",buff:"강화"};
const AILMENT_NAMES={burn:"화상",slow:"둔화",weaken:"공격 약화"};
const STATS={attack:"공격",defense:"방어",speed:"속도"};
const MILESTONES=[1,10,14,26];
function category(move){
 if(move.kind==="heal")return "heal";
 if(move.kind==="shield")return "shield";
 if(move.kind==="counter")return "counter";
 if(move.kind==="buff")return "buff";
 if(move.afflict||move.trap||move.stunChance)return "control";
 return "attack";
}
function detail(id){
 const m=B.moves[id];if(!m)return null;
 const lines=[];
 if(m.power>0)lines.push((m.damageClass||(D.combat.SPECIAL_TYPES.has(m.type)?"special":"physical"))==="special"?"특수 공격 · 상대 특수방어에 영향":"물리 공격 · 상대 방어에 영향");
 if(m.hits)lines.push("한 턴에 최대 "+m.hits+"번 연속 공격");
 if(m.drain)lines.push("입힌 피해의 "+Math.round(m.drain*100)+"%만큼 사용자 HP 회복");
 if(m.kind==="heal")lines.push("최대 HP의 약 "+Math.round(m.heal*100)+"% 회복");
 if(m.kind==="shield")lines.push("다음에 받는 공격 피해를 "+Math.round(m.shield*100)+"% 감소");
 if(m.kind==="counter")lines.push("받는 피해 "+Math.round(m.shield*100)+"% 감소 · 이번 턴 공격을 받으면 피해의 "+Math.round(m.reflect*100)+"% 반격");
 if(m.trap)lines.push("맞은 키즈몬의 교체를 잠시 봉쇄");
 if(m.stunChance)lines.push(Math.round(m.stunChance*100)+"% 확률로 감전 · 다음 행동을 1회 차단 (연속 발동 방지)");
 if(m.kind==="buff")lines.push("자신의 "+STATS[m.buff.stat]+"을 "+m.buff.amount+"단계 올림 (최대 3단계)");
 if(m.afflict){
  let duration=m.afflict.kind==="burn"?3:2;
  const descriptions={burn:"턴 종료 시 지속 피해",slow:"행동 속도 30% 감소",weaken:"공격 1단계 감소"};
  lines.push(Math.round(m.afflict.chance*100)+"% 확률로 "+AILMENT_NAMES[m.afflict.kind]+
   " ("+duration+"턴, "+descriptions[m.afflict.kind]+")");
 }
 if(m.priority)lines.push("기술 우선도 +"+m.priority+" (속도보다 먼저 적용)");
 const how=lines.length?lines.join(" · "):"특별한 추가 효과 없이 피해를 줌";
 const family=D.families.find(f=>f.key===m.familyKey);
 const tier=m.signatureTier||0;
 const tierLabel=family?(tier===0?"계열 고유기":tier===1?"진화 기술":"최종 진화 기술"):null;
 return {id,name:m.name,type:m.type,typeName:D.types[m.type].name,
  symbol:TYPE_SYMBOLS[m.type],category:category(m),categoryName:CATEGORY_NAMES[category(m)],
  power:m.power||0,accuracy:m.accuracy,pp:m.pp,priority:m.priority||0,
  familyKey:m.familyKey||null,familyName:family?.label||null,tierLabel,
  description:how,
  summary:lines.filter(x=>!/타입의 기술로/.test(x)).join(" · ")||"기본 공격"};
}
function earliestLevel(speciesId,moveId){
 for(const lv of MILESTONES)if(B.learnable({id:speciesId,level:lv}).includes(moveId))return lv;
 return null;
}
const LEARNER_CACHE=new Map();
function learners(moveId){
 if(!B.moves[moveId])return [];
 if(LEARNER_CACHE.has(moveId))return LEARNER_CACHE.get(moveId);
 const result=D.species.map(s=>{
  const at=earliestLevel(s.id,moveId);
  return at===null?null:{id:s.id,name:s.name,type:s.type,level:at,dexNo:s.dexNo};
 }).filter(Boolean).sort((a,b)=>a.level-b.level||a.dexNo-b.dexNo);
 LEARNER_CACHE.set(moveId,result);
 return result;
}
const all=Object.keys(B.moves).map(detail).sort((a,b)=>TYPE_ORDER.indexOf(a.type)-TYPE_ORDER.indexOf(b.type)||
  a.name.localeCompare(b.name,"ko"));
function search({query="",type="all",category:kind="all",family="all",owner=null}={}){
 const text=String(query).trim().toLocaleLowerCase("ko");
 const allowed=owner?.id?new Set(B.learnable(owner)):null;
 return all.filter(m=>(type==="all"||m.type===type)&&
  (kind==="all"||m.category===kind)&&
  (family==="all"||family==="signature"&&!!m.familyKey||family==="common"&&!m.familyKey)&&
  (!allowed||allowed.has(m.id))&&
  (!text||[m.name,m.typeName,m.description,m.familyName||"",...learners(m.id).map(x=>x.name)]
   .some(x=>x.toLocaleLowerCase("ko").includes(text))));
}
w.KIDSMON_MOVE_DEX={all,detail,learners,earliestLevel,search,TYPE_ORDER,TYPE_SYMBOLS,CATEGORY_NAMES};
})(window);
