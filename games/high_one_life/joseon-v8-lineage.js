/* Joseon lineage: historically attested bon-gwan labels, invented individual households.
 * Bon-gwan is ancestral origin, NOT necessarily a person's residence or rank.
 * Stable seeded state; never assigns a fictional character to a documented genealogy.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon4,root?.OneLifeJoseon5);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon8=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V4,V5){
'use strict';
const hash=(seed,n)=>{let x=(seed^Math.imul(n+113,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
// Attested surname-and-seat combinations. Region is geographic association of ancestral seat,
// not a census, residence, class status or claim of pedigree. Each branch is fictional.
const CLANS=Object.freeze([
 ['이','전주','전라도'],['김','광산','전라도'],['정','나주','전라도'],['윤','남원','전라도'],
 ['김','경주','경상도'],['김','김해','경상도'],['박','밀양','경상도'],['권','안동','경상도'],
 ['강','진주','경상도'],['정','진주','경상도'],['심','청송','경상도'],['최','경주','경상도'],
 ['윤','파평','경기도'],['허','양천','경기도'],['이','광주','경기도'],
 ['한','청주','충청도'],['김','청풍','충청도'],['정','동래','경상도'],
 ['최','강릉','강원도'],['원','원주','강원도'],
 ['신','평산','황해도'],['최','해주','황해도'],['이','연안','황해도'],
 ['조','평양','평안도'],['김','순천','평안도'],
 ['차','함흥','함경도'],['이','전주','함경도']
]);
const OTHERS=Object.freeze([
 ['박','밀양','경상도'],['김','경주','경상도'],['신','평산','황해도'],
 ['정','진주','경상도'],['이','전주','전라도'],['윤','파평','경기도']
]);
const bonLabel=c=>c[1]+' '+c[0]+'씨';
function pick(seed,region,salt=0,exclude=null){
 const local=CLANS.filter(c=>c[2]===region&&(exclude?bonLabel(c)!==exclude:true));
 const others=CLANS.filter(c=>(exclude?bonLabel(c)!==exclude:true));
 const pool=hash(seed,919+salt)<.66&&local.length?local:others;
 return pool[Math.min(pool.length-1,Math.floor(hash(seed,920+salt)*pool.length))]||OTHERS[0];
}
function cleanGiven(name,surname){
 const n=String(name||'').trim();
 return n.startsWith(surname)?n.slice(surname.length):n;
}
function make(life){
 const j=J.ensure(life),c=pick(life.seed,j.region),maternal=pick(life.seed,j.region,22,bonLabel(c));
 const spouse=pick(life.seed,j.region,47,bonLabel(c));
 return {version:1,surname:c[0],bon:c[1],seat:bonLabel(c),residence:j.region,
  motherSeat:bonLabel(maternal),motherSurname:maternal[0],spouseSeat:bonLabel(spouse),
  spouseSurname:spouse[0],givenName:cleanGiven(life.profile?.name,c[0]),
  generation:1,neighborsMet:0,ancestryNotes:[],updatedYear:life.year};
}
function decorate(life,s){
 if(life.year>=1900||!s)return;
 const given=s.givenName||cleanGiven(life.profile.name,s.surname);
 const personName=s.surname+given;
 if(life.profile.name!==personName)life.profile.name=personName;
 const state=V4.ensure(life);
 if(!state)return;
 for(const p of state.people){
  const surname=p.role==='mother'?s.motherSurname:p.role==='spouse'?s.spouseSurname:s.surname;
  if(!surname||p.name.startsWith(surname))continue;
  // Do not rename a character after it has entered the story: assign surnames
  // when a character is introduced. Older saves retain their established names.
  const hasHistory=life.age>0&&life.log.some(e=>e.text?.includes(p.name));
  if(!hasHistory)p.name=surname+p.name;
 }
}
function ensure(life){
 if(!J?.isJoseon(life))return null;
 if(!life.joseon8)life.joseon8=make(life);
 decorate(life,life.joseon8);
 return life.joseon8;
}
function summary(life){
 const s=ensure(life);
 if(!s)return null;
 return {clan:s.seat,surname:s.surname,motherClan:s.motherSeat,spouseClan:s.spouseSeat,
  residence:J.summary(life).region,name:life.profile.name,
  identity:s.seat+' 집안이지만 '+J.summary(life).region+'에서 살아간다.'};
}
function canMarry(life,clan){
 const s=ensure(life);if(!s)return true;
 // Lineage membership historically matters; other constraints also apply.
 return s.seat!==clan;
}
function hydrate(life,data){
 const old=data?.joseon8;
 if(!old||old.version!==1||!J.isJoseon(life))return ensure(life);
 const s=ensure(life);
 const c=CLANS.find(c=>bonLabel(c)===old.seat);
 if(c){s.surname=c[0];s.bon=c[1];s.seat=bonLabel(c)}
 if(typeof old.givenName==='string'&&old.givenName.length<=24)s.givenName=old.givenName;
 for(const key of ['motherSeat','spouseSeat']){
  if(CLANsSafe(old[key]))s[key]=old[key];
 }
 const mother=CLANS.find(c=>bonLabel(c)===s.motherSeat),spouse=CLANS.find(c=>bonLabel(c)===s.spouseSeat);
 if(mother)s.motherSurname=mother[0];if(spouse)s.spouseSurname=spouse[0];
 decorate(life,s);return s;
}
function CLANsSafe(value){return typeof value==='string'&&CLANS.some(c=>bonLabel(c)===value)}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V4?.ensure||Sim.Life.prototype.__joseon8)return false;
 const L=Sim.Life,oldSnap=L.prototype.snapshot,oldRestore=L.restore,oldTick=L.prototype.tick;
 L.prototype.snapshot=function(){const s=oldSnap.call(this);if(J.isJoseon(this))s.joseon8=JSON.parse(JSON.stringify(ensure(this)));return s;};
 L.restore=function(data){const life=oldRestore.call(this,data);if(life&&J.isJoseon(life))hydrate(life,data);return life;};
 L.prototype.tick=function(){
  if(!J.inOldEra(this))return oldTick.call(this);
  ensure(this);
  const ok=oldTick.call(this);
  if(ok&&this.alive)decorate(this,ensure(this));
  return ok;
 };
 Object.defineProperty(L.prototype,'__joseon8',{value:true});
 return true;
}
install();
return Object.freeze({CLANS,pick,ensure,summary,canMarry,bonLabel,install});
});
