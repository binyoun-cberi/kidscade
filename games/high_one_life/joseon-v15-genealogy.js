/* A fictional in-game genealogy, not an authenticated historical jokbo. */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon4,root?.OneLifeJoseon8,root?.OneLifeJoseon13,root?.OneLifeJoseon14);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeGenealogyV15=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V4,V8,V13,V14){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ROLES={self:'본인',mother:'어머니',father:'아버지',sibling:'형제자매',spouse:'배우자',child:'자녀',descendant:'방계 후손',ancestor:'윗대 조상'};
const hash=(seed,salt)=>{let x=(seed^Math.imul(salt+97,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
const numberOf=id=>[...id].reduce((sum,ch)=>sum*31+ch.charCodeAt(0)>>>0,0);
const MEN=['준','호','석','민','근','영','도','수','찬','현'];
const WOMEN=['연','선','희','옥','분','정','영','화','순','경'];
const FAMILY_NAMES=['김','이','박','정','최','윤','강','한','신','권'];

const validId=x=>typeof x==='string'&&/^g[0-9]{1,2}-(?:self|[0-9]{1,4})$/.test(x);
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.genealogy15)l.genealogy15={version:1,selfId:'g1-self',generation:1,refs:{self:'g1-self'},next:0,familySeed:l.seed,nodes:[],branches:[],clan:'',residence:''};
 return l.genealogy15;
}
function idFor(s,key,gen){
 if(s.refs[key])return s.refs[key];
 const id='g'+clamp(gen,0,18)+'-'+(++s.next);s.refs[key]=id;return id;
}
function update(s,id,v){
 let n=s.nodes.find(n=>n.id===id);
 if(!n){n={id,motherId:null,fatherId:null,partnerId:null,legal:null,married:false,simulated:false,branchId:null,sideDepth:0,missing:false,returned:false};s.nodes.push(n);}
 Object.assign(n,v);return n;
}
function sync(l){
 const s=ensure(l);if(!s)return null;
 const clan=V8?.summary(l);
 const fam=V4.ensure(l).people.filter(p=>p.birthYear<=l.year);
 const gen=s.generation,selfId=s.selfId;
 const missing=V13?.ensure(l)?.missing||[];
 const parents={};
 for(const role of ['mother','father']){
  const person=fam.find(p=>p.role===role);
  if(person)parents[role+'Id']=idFor(s,role,gen-1);
 }
 function put(person,id,role,g,relations={}){
  const lost=missing.find(m=>m.personId===person.id);
  return update(s,id,{name:String(person.name||'이름 미상').slice(0,28),
   birthYear:person.birthYear,sex:person.sex==='여자'?'여자':'남자',
   diedYear:Number.isInteger(person.diedYear)?person.diedYear:null,alive:person.alive!==false,
   role,generation:g,work:String(person.work||'').slice(0,65),
   legal:person.legal||null,married:!!person.married,lastSeen:l.year,missing:lost?.status==='missing',
   returned:lost?.status==='returned',...relations});
 }
 for(const role of ['mother','father']){
  const person=fam.find(p=>p.role===role);
  if(person)put(person,parents[role+'Id'],role,gen-1);
 }
 if(parents.motherId&&parents.fatherId){
  update(s,parents.motherId,{partnerId:parents.fatherId});
  update(s,parents.fatherId,{partnerId:parents.motherId});
 }
 const prior=s.nodes.find(n=>n.id===selfId);
 update(s,selfId,{name:String(l.profile.name||'이름 미상').slice(0,28),birthYear:l.birthYear,
  sex:l.gender,alive:l.alive,diedYear:l.alive?null:l.year,role:'self',generation:gen,
  motherId:parents.motherId||null,fatherId:parents.fatherId||null,
  work:J.summary(l).occupation,lastSeen:l.year,missing:false,
  returned:V14?.summary(l)?.captivity?.status==='returned',
  partnerId:prior?.partnerId||null});
 for(const p of fam.filter(p=>p.role==='sibling')){
  put(p,idFor(s,'sibling:'+p.id,gen),'sibling',gen,parents);
 }
 const spouse=fam.find(p=>p.role==='spouse');
 const spouseId=spouse?idFor(s,'spouse',gen):null;
 if(spouse){
  put(spouse,spouseId,'spouse',gen,{partnerId:selfId});
  update(s,selfId,{partnerId:spouseId});
 }
 for(const p of fam.filter(p=>p.role==='child')){
  const rel=l.gender==='여자'?{motherId:selfId,fatherId:spouseId}:{fatherId:selfId,motherId:spouseId};
  put(p,idFor(s,'child:'+p.id,gen+1),'child',gen+1,rel);
 }
 s.clan=clan?.clan||s.clan||'본관 미상';
 s.residence=J.summary(l).region;
 advanceBranches(l,s);
 s.nodes=s.nodes.slice(-140).map(n=>({motherId:null,fatherId:null,partnerId:null,legal:null,married:false,simulated:false,branchId:null,sideDepth:0,missing:false,returned:false,...n}));
 return s;
}
function advanceBranches(l,s){
 if(!Array.isArray(s.branches)||!s.branches.length)return;
 const current=l.year;
 // The non-played side of the family is necessarily only a fictional outline,
 // not the same fully played life as the protagonist. Branches are created in
 // ordinary years, capped at two further descent levels to keep the tree small.
 for(const branch of s.branches.slice(0,14)){
  const root=s.nodes.find(n=>n.id===branch.id);
  if(!root)continue;
  const expand=(person,depth)=>{
   if(depth>1||s.nodes.length>=135||person.birthYear+23>current||person.birthYear>=1890)return;
   if(person.diedYear&&person.diedYear<person.birthYear+23)return;
   const salt=numberOf(person.id);
   if(!person.married&&hash(s.familySeed,salt+11)>.68)return;
   const yearOfUnion=person.birthYear+22+Math.floor(hash(s.familySeed,salt+31)*7);
   if(yearOfUnion>current||(person.diedYear&&person.diedYear<yearOfUnion))return;
   let partnerId=person.partnerId&&s.nodes.some(n=>n.id===person.partnerId)?person.partnerId:null;
   if(!partnerId){
    partnerId=idFor(s,'side-partner:'+person.id,person.generation);
    const gender=person.sex==='여자'?'남자':'여자';
    const surname=FAMILY_NAMES[Math.floor(hash(s.familySeed,salt+33)*FAMILY_NAMES.length)];
    const syllable=(gender==='여자'?WOMEN:MEN)[Math.floor(hash(s.familySeed,salt+34)*10)];
    update(s,partnerId,{name:surname+syllable,birthYear:person.birthYear+Math.floor(hash(s.familySeed,salt+45)*7)-3,
     sex:gender,generation:person.generation,role:'spouse',partnerId:person.id,
     work:'방계 집안의 사람',simulated:true,branchId:branch.id,sideDepth:depth,alive:true,
     diedYear:null,lastSeen:current});
    person.partnerId=partnerId;
   }
   const spouse=s.nodes.find(n=>n.id===partnerId);
   if(!spouse)return;
   const names=person.sex==='남자'?person.name:spouse.name;
   const surname=names?.slice(0,1)||'김';
   const max=depth===0?2:1;
   for(let ordinal=0;ordinal<max;ordinal++){
    const born=person.birthYear+25+ordinal*4+Math.floor(hash(s.familySeed,salt+80+ordinal)*3);
    if(born>current||born>1897||s.nodes.length>=135||(person.diedYear&&born>person.diedYear))continue;
    const id=idFor(s,'side-child:'+person.id+':'+ordinal,person.generation+1);
    let child=s.nodes.find(n=>n.id===id);
    if(!child){
     const male=hash(s.familySeed,salt+97+ordinal)>.48;
     const pool=male?MEN:WOMEN;
     const name=surname+pool[Math.floor(hash(s.familySeed,salt+125+ordinal)*pool.length)];
     child=update(s,id,{name,birthYear:born,sex:male?'남자':'여자',
      generation:person.generation+1,role:'descendant',
      fatherId:person.sex==='남자'?person.id:spouse.id,
      motherId:person.sex==='여자'?person.id:spouse.id,
      work:'방계 집안의 살림',simulated:true,branchId:branch.id,
      sideDepth:depth+1,alive:true,diedYear:null,lastSeen:current});
    }
    const lifetime=57+Math.floor(hash(s.familySeed,numberOf(id)+144)*29);
    if(current>=born+lifetime){child.alive=false;child.diedYear=born+lifetime;}
    else{child.alive=true;child.diedYear=null;}
    child.lastSeen=current;
    if(depth===0)expand(child,1);
   }
  };
  expand(root,0);
 }
}
function inherit(parent,heirId,successor){
 const p=sync(parent),childId=p?.refs['child:'+heirId];
 if(!childId||!successor||!J.isJoseon(successor))return null;
 const child=p.nodes.find(n=>n.id===childId);if(!child)return null;
 const archive=JSON.parse(JSON.stringify(p));
 archive.familySeed=p.familySeed;
 archive.generation=child.generation;archive.selfId=childId;
 archive.refs={self:childId};
 archive.branches=Array.isArray(archive.branches)?archive.branches:[];
 const children=V4.ensure(parent).people.filter(x=>x.role==='child'&&x.birthYear<=parent.year)
  .sort((a,b)=>a.birthYear-b.birthYear||a.id.localeCompare(b.id));
 for(const [i,person] of children.entries()){
  if(person.id===heirId)continue;
  const personId=p.refs['child:'+person.id];if(!personId)continue;
  if(!archive.branches.some(b=>b.id===personId))
   archive.branches.push({id:personId,label:([ '첫째','둘째','셋째','넷째','다섯째','여섯째'][i]||((i+1)+'번째'))+' '+(person.sex==='여자'?'딸':'아들')+'의 집안',openedYear:parent.year});
 }
 const spouse=V4.ensure(parent).people.find(x=>x.role==='spouse');
 archive.refs[parent.gender==='여자'?'mother':'father']=p.selfId;
 if(spouse)archive.refs[parent.gender==='여자'?'father':'mother']=p.refs.spouse;
 for(const sibling of V4.ensure(parent).people.filter(x=>x.role==='child'&&x.id!==heirId)){
  const id=p.refs['child:'+sibling.id];
  if(id)archive.refs['sibling:sibling-of-'+sibling.id]=id;
 }
 const ancestor=archive.nodes.find(n=>n.id===p.selfId);
 if(ancestor){ancestor.alive=false;ancestor.role='ancestor';ancestor.diedYear=parent.year;ancestor.lastSeen=parent.year;}
 successor.genealogy15=archive;
 return sync(successor);
}
function summary(l){
 const s=sync(l);if(!s)return null;
 return {clan:s.clan,residence:s.residence,generation:s.generation,selfId:s.selfId,
  branches:(s.branches||[]).map(b=>({...b})),
  nodes:s.nodes.map(n=>({...n})).sort((a,b)=>a.generation-b.generation||
   a.birthYear-b.birthYear||a.id.localeCompare(b.id))};
}
function hydrate(l,data){
 const s=ensure(l),old=data?.genealogy15;
 if(!s||!old||old.version!==1)return sync(l);
 s.selfId=validId(old.selfId)?old.selfId:'g1-self';
 s.generation=clamp(Number(old.generation)||1,1,18);
 s.next=clamp(Number(old.next)||0,0,5000);
 s.familySeed=Number.isInteger(old.familySeed)?old.familySeed>>>0:l.seed;
 s.refs={self:s.selfId};
 const raw=Array.isArray(old.nodes)?old.nodes.slice(0,140):[];
 const ids=new Set();
 s.nodes=raw.filter(n=>n&&validId(n.id)&&!ids.has(n.id)&&Number.isInteger(n.birthYear)&&n.birthYear>=1250&&n.birthYear<=2026)
  .map(n=>{ids.add(n.id);return {
    id:n.id,name:String(n.name||'이름 미상').slice(0,28),birthYear:n.birthYear,
    diedYear:Number.isInteger(n.diedYear)&&n.diedYear>=n.birthYear&&n.diedYear<=l.year?n.diedYear:null,
    alive:n.alive!==false,role:ROLES[n.role]?n.role:'sibling',
    generation:clamp(Number(n.generation)||0,0,18),sex:n.sex==='여자'?'여자':'남자',
    motherId:validId(n.motherId)?n.motherId:null,
    fatherId:validId(n.fatherId)?n.fatherId:null,
    partnerId:validId(n.partnerId)?n.partnerId:null,
    work:String(n.work||'').slice(0,65),legal:['양인','천인'].includes(n.legal)?n.legal:null,
    lastSeen:clamp(Number(n.lastSeen)||n.birthYear,n.birthYear,l.year),
    married:!!n.married,simulated:!!n.simulated,
    branchId:validId(n.branchId)?n.branchId:null,
    sideDepth:clamp(Number(n.sideDepth)||0,0,3),
    missing:!!n.missing,returned:!!n.returned};
  });
 const allIds=new Set(s.nodes.map(n=>n.id));
 for(const [key,id] of Object.entries(old.refs||{}).slice(0,100)){
  if(key.length<=65&&validId(id)&&allIds.has(id))s.refs[key]=id;
 }
 s.branches=Array.isArray(old.branches)?old.branches.slice(0,14)
  .filter(b=>b&&validId(b.id)&&allIds.has(b.id))
  .map(b=>({id:b.id,label:String(b.label||'방계 가족').slice(0,30),
    openedYear:clamp(Number(b.openedYear)||l.birthYear,l.birthYear,l.year)})):[];
 s.clan=typeof old.clan==='string'?old.clan.slice(0,45):'';
 return sync(l);
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V4?.ensure||Sim.Life.prototype.__genealogy15)return false;
 const L=Sim.Life,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.snapshot=function(){
  const data=snapshot.call(this);if(J.isJoseon(this))data.genealogy15=JSON.parse(JSON.stringify(sync(this)));return data;
 };
 L.restore=function(data){const l=restore.call(this,data);if(l&&J.isJoseon(l))hydrate(l,data);return l;};
 Object.defineProperty(L.prototype,'__genealogy15Inherit',{value:inherit});
 Object.defineProperty(L.prototype,'__genealogy15',{value:true});return true;
}
install();
return Object.freeze({ROLES,ensure,sync,inherit,summary,hydrate,advanceBranches,install});
});
