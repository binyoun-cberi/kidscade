/* A fictional in-game genealogy, not an authenticated historical jokbo. */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon4,root?.OneLifeJoseon8,root?.OneLifeJoseon13,root?.OneLifeJoseon14);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeGenealogyV15=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V4,V8,V13,V14){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ROLES={self:'본인',mother:'어머니',father:'아버지',sibling:'형제자매',spouse:'배우자',child:'자녀'};
const validId=x=>typeof x==='string'&&/^g[0-9]{1,2}-(?:self|[0-9]{1,4})$/.test(x);
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.genealogy15)l.genealogy15={version:1,selfId:'g1-self',generation:1,refs:{self:'g1-self'},next:0,nodes:[],clan:'',residence:''};
 return l.genealogy15;
}
function idFor(s,key,gen){
 if(s.refs[key])return s.refs[key];
 const id='g'+clamp(gen,0,18)+'-'+(++s.next);s.refs[key]=id;return id;
}
function update(s,id,v){
 let n=s.nodes.find(n=>n.id===id);
 if(!n){n={id};s.nodes.push(n);}
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
   legal:person.legal||null,lastSeen:l.year,missing:lost?.status==='missing',
   returned:lost?.status==='returned',...relations});
 }
 for(const role of ['mother','father']){
  const person=fam.find(p=>p.role===role);
  if(person)put(person,parents[role+'Id'],role,gen-1);
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
 s.nodes=s.nodes.slice(-140);
 return s;
}
function inherit(parent,heirId,successor){
 const p=sync(parent),childId=p?.refs['child:'+heirId];
 if(!childId||!successor||!J.isJoseon(successor))return null;
 const child=p.nodes.find(n=>n.id===childId);if(!child)return null;
 const archive=JSON.parse(JSON.stringify(p));
 archive.generation=child.generation;archive.selfId=childId;
 archive.refs={self:childId};
 const spouse=V4.ensure(parent).people.find(x=>x.role==='spouse');
 archive.refs[parent.gender==='여자'?'mother':'father']=p.selfId;
 if(spouse)archive.refs[parent.gender==='여자'?'father':'mother']=p.refs.spouse;
 for(const sibling of V4.ensure(parent).people.filter(x=>x.role==='child'&&x.id!==heirId)){
  const id=p.refs['child:'+sibling.id];
  if(id)archive.refs['sibling:sibling-of-'+sibling.id]=id;
 }
 const ancestor=archive.nodes.find(n=>n.id===p.selfId);
 if(ancestor){ancestor.alive=false;ancestor.diedYear=parent.year;ancestor.lastSeen=parent.year;}
 successor.genealogy15=archive;
 return sync(successor);
}
function summary(l){
 const s=sync(l);if(!s)return null;
 return {clan:s.clan,residence:s.residence,generation:s.generation,selfId:s.selfId,
  nodes:s.nodes.map(n=>({...n})).sort((a,b)=>a.generation-b.generation||
   a.birthYear-b.birthYear||a.id.localeCompare(b.id))};
}
function hydrate(l,data){
 const s=ensure(l),old=data?.genealogy15;
 if(!s||!old||old.version!==1)return sync(l);
 s.selfId=validId(old.selfId)?old.selfId:'g1-self';
 s.generation=clamp(Number(old.generation)||1,1,18);
 s.next=clamp(Number(old.next)||0,0,5000);
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
    missing:!!n.missing,returned:!!n.returned};
  });
 const allIds=new Set(s.nodes.map(n=>n.id));
 for(const [key,id] of Object.entries(old.refs||{}).slice(0,100)){
  if(key.length<=65&&validId(id)&&allIds.has(id))s.refs[key]=id;
 }
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
return Object.freeze({ROLES,ensure,sync,inherit,summary,hydrate,install});
});
