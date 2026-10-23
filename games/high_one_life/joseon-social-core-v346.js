/* One Life 3.46 — four independent, stateful Joseon social paths.
 * The numerical weights are fictional game design values, not historical rates.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,
   root?.OneLifeJoseon5,root?.OneLifeJoseon325,root?.OneLifeFate344);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeSocial346=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V5,Paths,Fate){
 'use strict';
 const categories=new Map();
 const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
 const roll=(seed,salt)=>Fate?.dice?Fate.dice(seed,salt):.5;
 const copy=x=>JSON.parse(JSON.stringify(x));
 function register(id,config){
  if(!/^(court|bonded|commoner|baekjeong)$/.test(id)||categories.has(id))return false;
  if(typeof config?.eligible!=='function'||typeof config?.outcome!=='function'||
    !Array.isArray(config?.cases)||config.cases.length<4)return false;
  if(config.cases.some(x=>!x||!x.title||!x.intro||!Array.isArray(x.options)||x.options.length!==3))return false;
  categories.set(id,config);return true;
 }
 function ensure(l){
  if(!J?.isJoseon(l))return null;
  if(!l.joseon346)l.joseon346={version:1,active:null,used:[],profiles:{},lastYear:l.year};
  return l.joseon346;
 }
 function track(l,text,kind='joseon346-life'){
  l.logEvent(text,kind);
  const s=ensure(l),p=s?.active&&s.profiles[s.active];
  if(p){p.journal.push({year:l.year,text:text.slice(0,190)});p.journal=p.journal.slice(-24);}
 }
 function adjust(l,s,change){
  const j=J.ensure(l),v=V2.ensure(l),m=change||{};
  for(const [k,value] of Object.entries(m.meters||{})){
   if(Object.hasOwn(s.meters,k)&&Number.isFinite(value))
    s.meters[k]=clamp(s.meters[k]+value,0,100);
  }
  if(Number.isFinite(m.money)){j.capital=clamp(j.capital+m.money,-120,600);
   if(l.money)l.money.netWorth=j.capital*100;}
  if(Number.isFinite(m.grain))v.grain=Math.max(0,Math.min(200,v.grain+m.grain));
  if(m.stats&&typeof m.stats==='object'){
   const approved={};
   for(const k of ['health','happiness','knowledge','bonds','wealth'])
    if(Number.isFinite(m.stats[k]))approved[k]=clamp(m.stats[k],-25,25);
   l.change(approved);
  }
 }
 function enabled(l,kind){
  const cfg=categories.get(kind),j=J.ensure(l),social=V5.ensure(l),ps=Paths?.ensure(l);
  return !!cfg&&l.alive&&J.inOldEra(l)&&l.year>=1500&&l.year<=1887&&
   l.age>=16&&l.age<=72&&ps?.law?.kind==='free'&&
   !l.travel22?.residence?.abroad&&!l.joseon14?.captivity?.status?.includes('held')&&
   !['hearings','review'].includes(l.joseon345?.stage)&&cfg.eligible(l,j,social);
 }
 function order(l,kind){
  const pool=categories.get(kind).cases.map((_,i)=>i),items=[];
  for(let i=0;i<3;i++){const idx=Math.floor(roll(l.seed,l.year*53+(i+1)*43+kind.length*177)*pool.length);
   items.push(pool.splice(idx,1)[0]);}
  return items;
 }
 function start(l,kind){
  const s=ensure(l),cfg=categories.get(kind);
  if(!s||l.pending||s.active||s.used.includes(kind)||!enabled(l,kind))return false;
  s.active=kind;s.used.push(kind);
  s.profiles[kind]={stage:'case',index:0,order:order(l,kind),due:l.year,
    metricsVersion:1,meters:{...cfg.initial},choices:[],journal:[],outcome:''};
  l.pending='joseon346:'+kind+':case1';
  track(l,cfg.arrival);
  return true;
 }
 function parseKey(p){
  if(typeof p!=='string')return null;
  const matched=/^joseon346:(court|bonded|commoner|baekjeong):(case[1-3]|ending)$/.exec(p);
  return matched?{kind:matched[1],step:matched[2]}:null;
 }
 const key=l=>parseKey(l.pending);
 function prompt(l){
  const k=key(l),s=ensure(l),p=k&&s?.profiles[k.kind],cfg=k&&categories.get(k.kind);
  if(!k||!p||!cfg||s.active!==k.kind)return null;
  if(k.step==='ending'&&p.stage==='ending'){
   return {title:cfg.endingTitle,description:cfg.endingIntro,
    options:cfg.endingOptions.map(x=>({label:x.label,note:x.note}))};
  }
  if(p.stage!=='case'||k.step!=='case'+(p.index+1))return null;
  const scenario=cfg.cases[p.order[p.index]];
  if(!scenario)return null;
  return {title:(p.index+1)+'/3 · '+scenario.title,description:scenario.intro,
   options:scenario.options.map(x=>({label:x.label,note:x.note}))};
 }
 function due(l){
  const s=ensure(l),kind=s?.active,p=kind&&s.profiles[kind];
  if(!s||!p||l.pending||!l.alive||!J.inOldEra(l)||l.year>=1894)return false;
  if(Paths.ensure(l)?.law?.kind!=='free')return false;
  if(l.year<p.due)return false;
  const step=p.stage==='case'?'case'+(p.index+1):p.stage==='ending'?'ending':null;
  if(!step)return false;
  l.pending='joseon346:'+kind+':'+step;return true;
 }
 function choice(l,index){
  const k=key(l),s=ensure(l),p=k&&s?.profiles[k.kind],cfg=k&&categories.get(k.kind);
  const shown=prompt(l);
  if(!cfg||!p||!shown||!l.alive||!Number.isInteger(index)||index<0||index>=3)return false;
  const selected=k.step==='ending'?cfg.endingOptions[index]:cfg.cases[p.order[p.index]].options[index];
  if(k.step==='ending'){
   adjust(l,p,selected.delta);
   const result=cfg.outcome(l,p,index,roll(l.seed,l.year*77+index*13+346));
   p.outcome=result?.code||'ordinary';
   track(l,(result?.text||cfg.fallback)+' '+(selected.result||''));
   p.stage='done';s.active=null;l.pending=null;
  }else{
   adjust(l,p,selected.delta);
   track(l,selected.result);
   if(typeof cfg.afterCase==='function')cfg.afterCase(l,p,selected,index);
   p.index++;
   if(p.index===3){p.stage='ending';p.due=l.year+1;}
   else p.due=l.year+1;
   l.pending=null;
  }
  p.choices.push({year:l.year,index,step:k.step});
  p.choices=p.choices.slice(-12);
  l.logEvent(shown.title+' — '+selected.label,'joseon346-choice');
  l.log.at(-1).causeId='joseon346:'+k.kind+':'+k.step+':'+l.year;
  if(l.alive)due(l);
  return true;
 }
 function yearly(l){
  const s=ensure(l);if(!s||!l.alive||s.lastYear>=l.year)return;
  s.lastYear=l.year;
  if(s.active){due(l);return;}
  if(l.pending||l.year>=1888)return;
  const options=[...categories.keys()].filter(k=>!s.used.includes(k)&&enabled(l,k));
  if(!options.length)return;
  if(roll(l.seed,l.year*33+1234)>=.22)return;
  const i=Math.floor(roll(l.seed,l.year*99+431)*options.length);
  start(l,options[i]);
 }
 function summary(l){
  const s=ensure(l);if(!s)return null;
  const k=s.active,p=k&&s.profiles[k],latest=Object.entries(s.profiles).at(-1);
  const activeLabel=p?(categories.get(k)?.label||k)+' · '+(p.stage==='ending'?'마지막 선택을 앞둠':'사건 '+p.index+'/3'):'';
  const recent=latest&&latest[1];
  return {label:activeLabel||(recent?.outcome?categories.get(latest[0])?.endings?.[recent.outcome]||'삶의 한 갈림길을 지나옴':'' ),
   decisions:Object.values(s.profiles).reduce((n,v)=>n+v.choices.length,0),
   lifePaths:s.used.length,lastOutcome:recent?.outcome||''};
 }
 function hydrate(l,data){
  const s=ensure(l),saved=data?.joseon346;
  if(!s||!saved||saved.version!==1)return s;
  s.active=null;s.used=[];s.profiles={};
  s.lastYear=Number.isInteger(saved.lastYear)?clamp(saved.lastYear,l.birthYear,l.year):l.year;
  for(const kind of ['court','bonded','commoner','baekjeong']){
   if(!saved.used?.includes(kind)||!categories.has(kind))continue;
   const old=saved.profiles?.[kind],cfg=categories.get(kind);
   if(!old||!['case','ending','done'].includes(old.stage))continue;
   const ix=old.index,ord=old.order;
   if(!Number.isInteger(ix)||ix<0||ix>3||
     (old.stage==='case'&&ix>=3)||(old.stage!=='case'&&ix!==3)||
     !Array.isArray(ord)||ord.length!==3||
     new Set(ord).size!==3||ord.some(x=>!Number.isInteger(x)||x<0||x>=cfg.cases.length))continue;
   const m={};for(const key of Object.keys(cfg.initial))m[key]=Number.isFinite(old.meters?.[key])?
    clamp(old.meters[key],0,100):cfg.initial[key];
   s.used.push(kind);
   s.profiles[kind]={stage:old.stage,index:ix,order:ord.slice(),meters:m,metricsVersion:1,
    due:Number.isInteger(old.due)?clamp(old.due,l.birthYear,l.year+15):l.year,
    choices:Array.isArray(old.choices)?old.choices.filter(x=>x&&['case1','case2','case3','ending'].includes(x.step)&&
      [0,1,2].includes(x.index)&&Number.isInteger(x.year)&&x.year>=l.birthYear&&x.year<=l.year).slice(-12):[],
    journal:Array.isArray(old.journal)?old.journal.filter(x=>x&&typeof x.text==='string'&&
      Number.isInteger(x.year)&&x.year>=l.birthYear&&x.year<=l.year).slice(-24)
      .map(x=>({year:x.year,text:x.text.slice(0,190)})):[],
    outcome:typeof old.outcome==='string'&&Object.hasOwn(cfg.endings,old.outcome)?old.outcome:''};
   if(saved.active===kind&&old.stage!=='done')s.active=kind;
  }
  // The legacy engine clears unfamiliar pending prefixes on restore.
  // Restore only a known story key that matches the saved, validated phase.
  const raw=typeof data?.pending==='string'?data.pending:'';
  const k=parseKey(raw),p=k&&s.profiles[k.kind];
  const valid=!!(k&&p&&s.active===k.kind&&(
    (k.step==='ending'&&p.stage==='ending')||
    (k.step==='case'+(p.index+1)&&p.stage==='case')));
  if(valid)l.pending='joseon346:'+k.kind+':'+k.step;
  else if(raw.startsWith('joseon346:')||l.pending?.startsWith('joseon346:'))l.pending=null;
  return s;
 }
 function install(){
  if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V5?.ensure||!Paths?.ensure||
   Sim.Life.prototype.__joseon346)return false;
  const L=Sim.Life,oldTick=L.prototype.tick,oldPrompt=L.prototype.getChoice,
   oldChoose=L.prototype.choose,oldReflect=L.prototype.reflect,
   oldSnap=L.prototype.snapshot,oldRestore=L.restore;
  L.prototype.tick=function(){const year=this.year,ok=oldTick.call(this);
   if(ok&&this.alive&&this.year!==year)yearly(this);return ok;};
  L.prototype.getChoice=function(){if(key(this))return prompt(this);return oldPrompt.call(this);};
  L.prototype.choose=function(index){if(key(this))return choice(this,index);
   const ok=oldChoose.call(this,index);if(ok&&this.alive)due(this);return ok;};
  L.prototype.reflect=function(text){const ok=oldReflect.call(this,text);if(ok&&this.alive)due(this);return ok;};
  L.prototype.snapshot=function(){const data=oldSnap.call(this);
   if(this.joseon346)data.joseon346=copy(this.joseon346);return data;};
  L.restore=function(data){const l=oldRestore.call(this,data);
   if(l&&J.isJoseon(l)&&data?.joseon346)hydrate(l,data);return l;};
  Object.defineProperty(L.prototype,'__joseon346',{value:true});return true;
 }
 install();
 return Object.freeze({register,ensure,enabled,start,prompt,choice,due,yearly,summary,hydrate,install,
   roll,adjust,track,categories});
});
