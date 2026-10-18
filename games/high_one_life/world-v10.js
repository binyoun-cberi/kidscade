/* One Life v10: factual calendar + fictional life consequences.
 * Must load after world-v9, history-data-v10, history-stories-v10 and history-effects-v10.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeWorld9,
   root?.OneLifeHistoryData10,root?.OneLifeHistoryStories10,root?.OneLifeHistoryEffects10);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeWorld10=api;
})(typeof window!=='undefined'?window:null,function(Sim,W9,Data,Stories,Effects){
'use strict';
const MAX_FACTS=100,MAX_STORIES=130,MAX_QUEUE=5,MAX_FOLLOWUPS=12,MAX_DECISIONS=50;
const historic=new Set([1910,1919,1929,1945,1948,1950,1953,1960,1980,1987]);
function seedState(){return {version:10,processedYear:-1,factsSeen:[],storiesSeen:[],queue:[],
  active:null,tags:[],decisions:[],followups:[],moves:0,schoolInterrupted:false,hardship:0,
  familyProtected:false,historyImpacts:0,source:'factual-calendar-plus-fictional-effects'};}
function processYear(life,s){
 if(!life?.alive||life.country?.[0]!=='대한민국')return false;
 if(s.processedYear===life.year)return false;
 s.processedYear=life.year;
 const facts=Data.forYear(life.year);
 for(const fact of facts){
  if(s.factsSeen.includes(fact.id))continue;
  s.factsSeen.push(fact.id);
  if(s.factsSeen.length>MAX_FACTS)s.factsSeen.shift();
  if(!life.log.some(e=>e.kind==='history'&&e.year===fact.year&&e.text.startsWith(fact.year+'년 · '+fact.title+' — ')))
   life.logEvent(fact.year+'년 · '+fact.title+' — '+fact.detail,'history');
  Effects.autoContext(life,s,fact);
 }
 // Scheduled consequences of past player choices, never attached to unrelated lives.
 const due=s.followups.filter(e=>e.year<=life.year);
 s.followups=s.followups.filter(e=>e.year>life.year);
 for(const f of due){
  life.logEvent(f.text,'history-followup');
  s.historyImpacts++;
 }
 if(s.hardship>0){
  s.hardship=Math.max(0,s.hardship-1);
  if(life.year>=1950&&life.year<=1953&&life.age>=8&&life.age<=65){
   life.logEvent('전쟁이 길어지자 집안의 살림과 공부를 챙기는 일도 쉽지 않았다.','history-impact');
   s.historyImpacts++;
  }
 }
 // Normal fictional life stories retain diversity while date-based history drives impacts.
 if(life.age>=2){
  const story=Stories.select(life,s.storiesSeen);
  if(story){
   s.storiesSeen.push(story.id);
   s.storiesSeen=s.storiesSeen.slice(-MAX_STORIES);
   life.logEvent(story.text,'history-life');
  }
 }
 const impact=Effects.selectFact(life,facts);
 if(impact&&!s.decisions.some(x=>x.id===impact.id)&&s.queue.length<MAX_QUEUE){
  s.queue.push({id:impact.id,year:life.year});
 }
 return true;
}
function ensure(life,skipBirth=false){
 W9.ensure(life);
 if(!life.world10){
  life.world10=seedState();
  if(!skipBirth&&life.age===0&&life.alive)processYear(life,life.world10);
 }
 return life.world10;
}
function open(life,s){
 if(!life.alive||life.pending||s.active)return false;
 while(s.queue.length){
  const next=s.queue.shift(),fact=Data.FACTS.find(x=>x.id===next.id);
  if(!fact||s.decisions.some(x=>x.id===fact.id)||!Effects.eligible(life,fact))continue;
  // If the player has advanced past the event before resolving, skip stale prompts.
  if(fact.year!==life.year)continue;
  s.active={id:fact.id,year:fact.year};
  life.pending='v10:'+fact.id;
  return true;
 }
 return false;
}
function getChoice(life){
 const s=ensure(life);
 const fact=Data.FACTS.find(e=>e.id===s.active?.id);
 return fact?Effects.prompt(fact,life):null;
}
function takeChoice(life,index){
 const s=ensure(life),fact=Data.FACTS.find(e=>e.id===s.active?.id);
 if(!fact||life.pending!=='v10:'+fact.id)return false;
 if(!Effects.apply(life,s,fact,index))return false;
 s.historyImpacts++;s.active=null;life.pending=null;open(life,s);
 return true;
}
function readCurrent(life){
 if(!life||life.country?.[0]!=='대한민국')return null;
 return Data.forYear(life.year)[0]||null;
}
function summary(life){
 if(life?.country?.[0]!=='대한민국')return null;
 const s=ensure(life),active=s.tags.slice(-4);
 return {period:Data.period(life.year),event:readCurrent(life),
  facts:s.factsSeen.length,impacts:s.historyImpacts,memories:active,
  moved:s.moves,schoolInterrupted:s.schoolInterrupted,hardship:s.hardship,
  nextEvent:s.active?.id||null};
}
function clone(s){return JSON.parse(JSON.stringify(s));}
function hydrate(life,data){
 const saved=data?.world10;
 // Old saves start their historical effects only from the next year onward;
 // past years are not re-run retroactively.
 const s=ensure(life,true);
 if(saved?.version!==10||typeof saved!=='object')return s;
 if(Number.isInteger(saved.processedYear))s.processedYear=Math.max(-1,Math.min(life.year,saved.processedYear));
 const strings=(key,max)=>Array.isArray(saved[key])?saved[key].filter(x=>typeof x==='string').slice(-max):[];
 s.factsSeen=strings('factsSeen',MAX_FACTS);
 s.storiesSeen=strings('storiesSeen',MAX_STORIES);
 s.tags=strings('tags',50);
 s.moves=Number.isInteger(saved.moves)?Math.max(0,Math.min(2,saved.moves)):0;
 s.schoolInterrupted=saved.schoolInterrupted===true;
 s.familyProtected=saved.familyProtected===true;
 s.hardship=Number.isInteger(saved.hardship)?Math.max(0,Math.min(5,saved.hardship)):0;
 s.historyImpacts=Number.isInteger(saved.historyImpacts)?Math.max(0,Math.min(1000,saved.historyImpacts)):0;
 if(Array.isArray(saved.decisions))s.decisions=saved.decisions
  .filter(e=>e&&typeof e.id==='string'&&Number.isInteger(e.year)&&Number.isInteger(e.index)&&
    Data.FACTS.some(f=>f.id===e.id)).slice(-MAX_DECISIONS)
  .map(e=>({id:e.id,year:e.year,index:e.index,age:Number.isInteger(e.age)?e.age:0,scenario:String(e.scenario||'')}));
 if(Array.isArray(saved.followups))s.followups=saved.followups
  .filter(e=>e&&Number.isInteger(e.year)&&typeof e.text==='string'&&e.year>life.year)
  .slice(0,MAX_FOLLOWUPS).map(e=>({year:e.year,kind:String(e.kind||'').slice(0,50),text:e.text.slice(0,250)}));
 if(Array.isArray(saved.queue))s.queue=saved.queue.filter(e=>e&&typeof e.id==='string'&&
   Data.FACTS.some(f=>f.id===e.id)&&Number.isInteger(e.year)&&e.year===life.year).slice(0,MAX_QUEUE)
   .map(e=>({id:e.id,year:e.year}));
 if(saved.active&&typeof saved.active.id==='string'&&saved.active.year===life.year&&
    Data.FACTS.some(f=>f.id===saved.active.id)&&!s.decisions.some(x=>x.id===saved.active.id))
  s.active={id:saved.active.id,year:life.year};
 if(life.alive&&typeof data.pending==='string'&&data.pending==='v10:'+s.active?.id)
  life.pending=data.pending;
 return s;
}
function install(){
 if(!Sim?.Life||!W9?.ensure||!Data?.forYear||!Stories?.select||!Effects?.apply||
     Sim.Life.prototype.__world10)return false;
 const Life=Sim.Life,priorTick=Life.prototype.tick,priorChoose=Life.prototype.choose,
  priorReflect=Life.prototype.reflect,priorGetChoice=Life.prototype.getChoice,
  priorSnapshot=Life.prototype.snapshot,priorRestore=Life.restore;
 Life.prototype.tick=function(){
  if(!this.alive||this.pending)return false;
  const previous=this.age;
  // Create state before tick, but do not accidentally add historical facts
  // to an old mid-life save until its first new calendar year.
  const s=ensure(this,this.age!==0);
  const result=priorTick.call(this);
  if(!result||this.age===previous||!this.alive)return result;
  processYear(this,s);
  if(!this.pending)open(this,s);
  return result;
 };
 Life.prototype.getChoice=function(){
  return typeof this.pending==='string'&&this.pending.startsWith('v10:')
   ?getChoice(this):priorGetChoice.call(this);
 };
 Life.prototype.choose=function(index){
  if(typeof this.pending==='string'&&this.pending.startsWith('v10:'))
   return takeChoice(this,index);
  const result=priorChoose.call(this,index);
  if(result&&!this.pending)open(this,ensure(this,true));
  return result;
 };
 Life.prototype.reflect=function(text){
  const result=priorReflect.call(this,text);
  if(result&&!this.pending)open(this,ensure(this,true));
  return result;
 };
 Life.prototype.snapshot=function(){
  return {...priorSnapshot.call(this),world10:clone(ensure(this,true))};
 };
 Life.restore=function(data){
  const life=priorRestore.call(this,data);
  if(life)hydrate(life,data);
  return life;
 };
 Object.defineProperty(Life.prototype,'__world10',{value:true});
 return true;
}
install();
return Object.freeze({install,ensure,processYear,readCurrent,summary,Data,Stories,Effects,VERSION:10});
});
