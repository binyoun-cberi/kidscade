/* One Life v17: switch perspective among living relatives without rewriting history.
 * Every played life has an independent save. The shared family register retains
 * stable person IDs. Unplayed years are gaps, never retroactively invented events.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon4,
  root?.OneLifeJoseon8,root?.OneLifeGenealogyV15);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeBranchSwitchV17=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V4,V8,Tree){
'use strict';
const MAX_STATES=10;
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=text=>[...String(text)].reduce((n,c)=>Math.imul(n,33)+c.charCodeAt(0)>>>0,5381);
const eligibleYear=(n,year)=>!!n&&n.alive!==false&&!n.missing&&
 Number.isInteger(n.birthYear)&&n.birthYear>=1392&&n.birthYear<=1897&&
 year>=n.birthYear+12&&year<=n.birthYear+95&&year<=1897;
function get(l){
 if(!J?.isJoseon(l)||!Tree)return null;
 if(!l.branchSwitch17){
  l.branchSwitch17={version:1,currentId:Tree.ensure(l).selfId,states:{},order:[],lastYear:l.year};
 }
 return l.branchSwitch17;
}
function options(l){
 if(!l||!J?.isJoseon(l)||!Tree)return [];
 const current=Tree.summary(l),clock=l.year,reg=get(l);
 return current.nodes.filter(n=>n.id!==current.selfId&&n.role!=='spouse'&&eligibleYear(n,clock))
 .map(n=>({id:n.id,name:n.name,birthYear:n.birthYear,age:clock-n.birthYear,
  sex:n.sex,played:!!reg.states[n.id]||!n.simulated,simulated:!!n.simulated,
  branchId:n.branchId||null}))
 .sort((a,b)=>a.birthYear-b.birthYear||a.id.localeCompare(b.id));
}
function stripped(l){
 const snap=l.snapshot();
 delete snap.branchSwitch17;
 return snap;
}
function syncClock(l,year){
 if(l.year>=year)return;
 const from=l.year;
 // This life was not played while the player was in another branch. Do not
 // pretend annual choices or historical events occurred during the gap.
 l.year=year;l.age=year-l.birthYear;l.pending=null;
 for(const key of ['joseon','joseon2','joseon3','joseon4','joseon5',
  'joseon6','joseon7','joseon9','joseon11','joseon12','joseon13',
  'joseon14','joseonAnnals','colonialDaily']){
  const state=l[key];
  if(!state)continue;
  if(Number.isFinite(state.processedYear))state.processedYear=year;
  if('active' in state)state.active=null;
  if(Array.isArray(state.queue))state.queue=[];
  if(Array.isArray(state.followups))state.followups=state.followups.filter(f=>f.year>year);
 }
 l.logEvent(from+'년부터 '+year+'년까지는 다른 식구의 삶을 지켜보았다. 이 기간의 자세한 선택은 기록되지 않았다.','joseon17-gap');
}
function bookFor(l,book,target){
 const result=clone(book);
 result.selfId=target.id;result.generation=target.generation;
 result.refs={self:target.id};
 if(target.motherId)result.refs.mother=target.motherId;
 if(target.fatherId)result.refs.father=target.fatherId;
 if(target.partnerId)result.refs.spouse=target.partnerId;
 const relatives=book.nodes;
 for(const n of relatives){
  if(n.id===target.id)continue;
  if((target.motherId&&n.motherId===target.motherId)||
     (target.fatherId&&n.fatherId===target.fatherId)){
   result.refs['sibling:branch-sibling-'+n.id]=n.id;
  }
  if(n.fatherId===target.id||n.motherId===target.id){
   result.refs['child:branch-child-'+n.id]=n.id;
  }
 }
 return result;
}
function householdFor(l,target,tree,source){
 const people=tree.nodes,relative=id=>people.find(n=>n.id===id);
 const relatives=[
  ['mother',relative(target.motherId)],
  ['father',relative(target.fatherId)]
 ];
 for(const person of people){
  if(person.id===target.id)continue;
  const shared=(target.motherId&&person.motherId===target.motherId)||
    (target.fatherId&&person.fatherId===target.fatherId);
  if(shared&&person.id!==target.motherId&&person.id!==target.fatherId)
   relatives.push(['sibling',person]);
 }
 if(target.partnerId)relatives.push(['spouse',relative(target.partnerId)]);
 for(const person of people){
  if(person.motherId===target.id||person.fatherId===target.id)
   relatives.push(['child',person]);
 }
 const family=V4.ensure(l),base=family.people.find(x=>x.role==='sibling')||family.people[0];
 family.people=relatives.filter(([,p])=>!!p).slice(0,16).map(([role,p])=>{
  const y=p.birthYear,now=l.year,old=now-y;
  return {...base,id:'branch-'+role+'-'+p.id,role,name:p.name,sex:p.sex,
   birthYear:y,alive:p.alive!==false&&!p.diedYear,atHome:role!=='sibling',
   married:!!p.partnerId,joinedYear:role==='spouse'?Math.min(now,y+22):null,
   diedYear:p.diedYear||null,lifeYears:p.diedYear?p.diedYear-y:Math.max(98,old+8),
   work:p.work||'집안에서 하는 일',legal:p.legal||'양인',
   relation:clamp(50+hash(p.id)%30,0,100),wellbeing:70};
 });
 family.processedYear=l.year;family.queue=[];family.active=null;family.followups=[];
 l.profile.siblings=family.people.filter(p=>p.role==='sibling').length;
 const j=J.ensure(l);
 const spouse=family.people.find(p=>p.role==='spouse');
 j.married=!!spouse&&spouse.alive;
 j.children=family.people.filter(p=>p.role==='child').length;
 l.profile.child=j.children>0;l.profile.partner=!!spouse;
 return family;
}
function newPerspective(current,target,book){
 const now=current.year,seed=(current.seed^hash(target.id)^Math.imul(target.birthYear,1103515245))>>>0;
 const life=new Sim.Life(seed,{birthYear:target.birthYear,countryName:'대한민국'});
 life.year=now;life.age=now-target.birthYear;life.gender=target.sex;life.profile.name=target.name;
 life.pending=null;life.alive=true;
 const oldJ=J.ensure(current),j=J.ensure(life);
 j.region=oldJ.region;
 j.capital=Math.floor(oldJ.capital*.15);
 j.land=Math.floor(Math.max(0,oldJ.land)*.12);
 j.birthStatus=target.legal==='천인'?'천민':oldJ.birthStatus;
 const clan=current.joseon8;
 if(clan&&target.name.startsWith(clan.surname)){
  life.joseon8=clone(clan);
  life.joseon8.givenName=target.name.slice(clan.surname.length);
  life.joseon8.generation=target.generation;
 }
 // Side-branch descendants can use another paternal surname. Never falsely
 // assign those people to the founding clan purely by proximity in the tree.
 householdFor(life,target,book,current);
 const after=J.ensure(life);
 after.processedYear=now;
 for(const key of ['joseon2','joseon3','joseon5','joseon6','joseon7','joseon9','joseon11','joseon12','joseon13','joseon14']){
  if(life[key]&&Number.isFinite(life[key].processedYear))life[key].processedYear=now;
 }
 life.logEvent('족보에서 '+target.name+'의 인생을 선택했다. '+now+
   '년부터 이 사람의 이야기를 이어 간다. 지나간 세월의 세부 사건은 새로 만들지 않았다.','joseon17-switch');
 return life;
}
function switchTo(l,id){
 if(!l||typeof id!=='string'||!J?.isJoseon(l))return null;
 const tree=Tree.summary(l),reg=get(l),target=tree.nodes.find(p=>p.id===id);
 if(id===tree.selfId||!eligibleYear(target,l.year)||target.role==='spouse')return null;
 const activeId=tree.selfId;
 // Avoid retroactively killing a person who has a valid played life saved.
 const save=reg.states[id];
 let other=save?Sim.Life.restore(save):newPerspective(l,target,tree);
 if(!other||!other.alive||other.birthYear!==target.birthYear||other.year>l.year)return null;
 const archived={...reg.states,[activeId]:stripped(l)};
 delete archived[id];
 const order=[...reg.order.filter(x=>x!==activeId&&x!==id),activeId];
 while(order.length>MAX_STATES){const stale=order.shift();delete archived[stale];}
 syncClock(other,l.year);
 const fresh=bookFor(other,Tree.ensure(l),target);
 other.genealogy15=fresh;
 other.branchSwitch17={version:1,currentId:id,states:archived,order,lastYear:l.year};
 // Newly selected fictional side lives become genuine played personalities.
 const node=other.genealogy15.nodes.find(n=>n.id===id);
 if(node)node.simulated=false;
 Tree.sync(other);
 return other;
}
function hydrate(l,data){
 if(!l||!J?.isJoseon(l))return null;
 const r=get(l),src=data?.branchSwitch17;
 if(!src||src.version!==1)return r;
 const ids=new Set(Tree.ensure(l).nodes.map(p=>p.id));
 const states={},order=[];
 for(const key of (Array.isArray(src.order)?src.order:[]).slice(-MAX_STATES)){
  if(typeof key!=='string'||!ids.has(key)||key===Tree.ensure(l).selfId)continue;
  const snap=src.states?.[key];
  if(!snap||snap.version!==1||!Number.isInteger(snap.birthYear)||
    !Number.isInteger(snap.age)||snap.age<0||snap.age>108)continue;
  const clean=clone(snap);delete clean.branchSwitch17;
  states[key]=clean;order.push(key);
 }
 r.currentId=Tree.ensure(l).selfId;r.states=states;r.order=order;r.lastYear=l.year;
 return r;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!Tree?.sync||Sim.Life.prototype.__branchSwitch17)return false;
 const L=Sim.Life,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.snapshot=function(){
  const s=snapshot.call(this);
  if(J.isJoseon(this)){
   const reg=get(this);
   s.branchSwitch17={version:1,currentId:reg.currentId,
    states:clone(reg.states),order:reg.order.slice(-MAX_STATES),lastYear:this.year};
  }
  return s;
 };
 L.restore=function(data){
  const l=restore.call(this,data);
  if(l&&J.isJoseon(l))hydrate(l,data);
  return l;
 };
 Object.defineProperty(L.prototype,'__branchSwitch17',{value:true});
 return true;
}
install();
return Object.freeze({get,options,switchTo,hydrate,install});
});
