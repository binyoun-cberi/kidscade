/* Kidscade Openmon playable roster. Graphic IDs are stable; names are editable. */
(function(w){
"use strict";
const db=w.OPENMON_DEX;
if(!db || db.sprites.length!==118)throw Error("Load monsters.js before roster.js");
const id=(a,r,c)=>a+"_r"+String(r).padStart(2,"0")+"_c"+String(c).padStart(2,"0");
const families=[];
function add(key,label,parts,origin="kidscade-design",kind="linear"){families.push({key,label,parts,origin,kind})}
for(const [key,label,coord] of [
 ["rodent","관성쥐",[[0,1],[0,2]]],["mantis","다윈벌",[[0,3],[0,4]]],
 ["seed","멘델콩",[[1,1],[1,2]]],["beetle","아보가갑",[[1,3],[1,4]]]
])add("set1-"+key,label+" 계열",coord.map(([r,c])=>id("set1",r,c)));
for(const [row,label] of [[2,"클로로"],[3,"파스칼집게"],[4,"피보새"]])
 add("starter-"+row,label+" 스타팅",[2,3,4].map(c=>id("set1",row,c)),"source-confirmed");
for(const [r,n] of [[0,4],[1,3],[2,2]])for(let p=0;p<n;p++)
 add("set2-"+r+"-"+p,"Set 2 이미지 검토 "+r+"-"+p,[id("set2",r,2*p),id("set2",r,2*p+1)],"provisional");
add("set4-butterfly","프랙나비 계열",[id("set4",1,0),id("set4",1,1)]);
for(let r=0;r<3;r++)for(let c=0;c<4;c++){
 if(r===1&&c<2)continue;
 add("set4-"+r+"-"+c,"유적 개체 "+r+"-"+c,[id("set4",r,c)],"standalone");
}
for(let r=0;r<4;r++)for(let p=0;p<3;p++)
 add("set5-"+r+"-"+p,"Set 5 "+r+"-"+p+" 계열",[id("set5",r,2*p),id("set5",r,2*p+1)]);
add("set5-electric","암페각 계열",[id("set5",4,0),id("set5",4,1)]);
for(let c=2;c<6;c++)add("set5-4-"+c,"Set 5 개체 4-"+c,[id("set5",4,c)],"standalone");
add("set5-firebat","열역박 계열",[0,1,2].map(c=>id("set5",5,c)));
add("set5-fibobird","피보참새 계열",[3,4,5].map(c=>id("set5",5,c)));
const shibu=id("shibu",0,0),branches=[];
for(let r=0;r<4;r++)for(let c=0;c<5;c++)if(!(r===0&&c===0)&&!(r===3&&c===4))branches.push(id("shibu",r,c));
add("shibu-main","분기견 18갈래 진화",[shibu,...branches],"source-confirmed","branch");
const src=new Map(db.sprites.map(s=>[s.id,s])), members=new Map();
for(const f of families)f.parts.forEach((key,pos)=>{
 if(members.has(key)||src.get(key)?.role!=="monster")throw Error("bad family member "+key);
 members.set(key,{f,pos});
});
if(members.size!==102 || branches.length!==18)throw Error("roster completeness failure");
const weights={neutral:[0,0,0,3],leaf:[2,0,1,0],water:[3,1,1,0],fire:[0,3,-1,1],electric:[-1,3,-1,2],earth:[3,1,3,-2],air:[0,0,-1,4],ice:[1,1,0,0],mind:[-1,2,0,1],dark:[0,2,1,1]};
function stats(s,stage){
 const seed=[...s.id].reduce((a,c)=>(a*31+c.charCodeAt(0))%9973,17);
 const w=weights[s.type],up=stage===3?9:stage===2?5:0;
 return {hp:25+up+(seed%8)+w[0]+(s.rarity==="rare"?1:0),
 attack:9+((seed>>3)%6)+Math.floor(up*.58)+w[1],
 defense:8+((seed>>5)%7)+Math.floor(up*.52)+w[2],
 speed:8+((seed>>2)%7)+Math.floor(up*.48)+w[3]};
}
let dex=0;
for(const s of db.sprites){
 if(s.role!=="monster"){s.dexNo=null;s.playable=false;s.battle=null;continue}
 const {f,pos}=members.get(s.id);
 const stage=f.kind==="branch"?(pos===0?1:2):pos+1;
 const prev=pos===0?null:f.kind==="branch"?f.parts[0]:f.parts[pos-1];
 const allowed=f.origin!=="provisional";
 const base=stats(s,stage);
 if(s.rarity==="starter"&&stage===1){base.hp+=3;base.speed+=2}
 if(f.kind==="branch"&&stage===2){base.hp=Math.min(base.hp,40);base.attack=Math.min(base.attack,18)}
 const statBudget=Object.values(base).reduce((a,b)=>a+b,0);
 if(statBudget<52||statBudget>113)throw Error("stat budget "+s.id+" "+statBudget);
 s.dexNo=++dex;s.playable=true;s.familyKey=f.key;s.familyName=f.label;
 s.familyKind=f.kind;s.familyOrigin=f.origin;s.evolutionRank=stage;
 s.evolvesFrom=prev;s.evolutionStatus=f.origin;
 s.evolutionCondition=prev?{kind:"level",level:stage===2?14:26,enabled:allowed}:null;
 s.stage=stage;s.evolutionFrom=prev&&allowed?prev:null;
 s.verifiedEvolution=f.origin==="source-confirmed"&&!!prev;
 s.battle={base,statBudget,growth:{hp:2.5,attack:1.15,defense:1.05,speed:1.08},
 captureBase:f.kind==="branch"&&stage===1?.18:s.rarity==="rare"?.17:stage===3?.19:stage===2?.30:.48,
 experienceYield:6+(s.rarity==="rare"?6:s.rarity==="uncommon"?3:0)+(stage-1)*4,
 role:base.speed>=base.defense+4?"swift":base.defense>=base.speed+4?"guard":"balanced"};
}
const zones={
 meadow:{label:"이슬초원",level:[2,4],pool:[id("set1",0,1),id("set1",0,3),id("set1",1,1),id("set1",1,3),id("set2",0,0),id("set2",0,2)]},
 forest:{label:"가지숲",level:[4,7],pool:[id("set1",0,3),id("set1",1,1),id("set2",0,0),id("set2",0,2),id("set5",1,0),id("set5",3,2)]},
 cave:{label:"잔돌동굴",level:[7,10],pool:[id("set1",0,1),id("set1",1,3),id("set2",1,4),id("set5",3,0),id("set5",3,4),id("set5",4,0)]},
 clearing:{label:"비밀숲",level:[6,8],pool:[shibu]}
};
for(const z of Object.values(zones))for(const key of z.pool){
 const s=src.get(key);if(!s?.playable||s.evolutionRank!==1||s.rarity==="starter")throw Error("bad encounter "+key);
}
db.version="2.0.0-roster";
db.species=db.sprites.filter(s=>s.playable);
db.dexEntries=db.species;db.totalDexEntries=db.species.length;
db.families=families;db.shibuBranches=branches;db.encounters=zones;
db.designNotes={
 numbers:"001–102 are collectible visual forms, not 102 unrelated evolution families.",
 family:"Set 2's nine pairs are provisional art groups: level evolution is disabled.",
 alternate:"Wolf artwork is unnumbered, alternate-only. The ship is excluded.",
 progress:"Source-confirmed and Kidscade-designed evolution conditions are distinct."
};
})(window);
