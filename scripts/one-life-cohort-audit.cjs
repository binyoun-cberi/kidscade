'use strict';
/**
 * Compare rarely-tested Korean birth cohorts to earlier reference cohorts.
 * Usage: node scripts/one-life-cohort-audit.cjs [games-per-cohort=250]
 * All ages/currencies/events are fictional simulation outputs, NOT demographic estimates.
 */
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
const traces=new WeakMap();
const originalLog=Sim.Life.prototype.logEvent;
Sim.Life.prototype.logEvent=function(text,kind){
 let t=traces.get(this);
 if(!t){t={raw:0,kind:{},perAge:{},unique:new Set(),repeated:0,beforeBirth:0,
   afterDeath:0,wrongYear:0,historyYearErrors:0,futureHistory:0,wording:0};
   traces.set(this,t);}
 const k=kind||'life';
 t.raw++;t.kind[k]=(t.kind[k]||0)+1;
 const age=this.age,year=this.year;
 t.perAge[age]=(t.perAge[age]||0)+1;
 if(year!==this.birthYear+age)t.wrongYear++;
 if(age<0)t.beforeBirth++;
 if(this.alive===false&&k!=='death')t.afterDeath++;
 if(k==='history'&&year>2026)t.futureHistory++;
 // A repeated story in the same lifetime is a narrative defect, not "variety".
 if(t.unique.has(text))t.repeated++;
 else t.unique.add(text);
 if(/게임용|가상 인생|시뮬레이션|게임 모형/.test(text))t.wording++;
 return originalLog.call(this,text,kind);
};
global.window={OneLifeSim:Sim};
for(const [file,key] of [
 ['world-v2.js','OneLifeWorld2'],['world-v3.js','OneLifeWorld3'],
 ['world-v4.js','OneLifeWorld4'],['world-v5.js','OneLifeWorld5'],
 ['careers-v6.js','OneLifeCareers6'],['events-v6.js','OneLifeEvents6'],
 ['world-v6.js','OneLifeWorld6'],['world-v7.js','OneLifeWorld7'],
 ['world-v8.js','OneLifeWorld8'],['world-v9.js','OneLifeWorld9'],
 ['history-data-v10.js','OneLifeHistoryData10'],
 ['history-stories-v10.js','OneLifeHistoryStories10'],
 ['history-effects-v10.js','OneLifeHistoryEffects10'],
 ['world-v10.js','OneLifeWorld10'],
 ['history-choices-v11.js','OneLifeHistoryChoices11'],
 ['era-policy-v12.js','OneLifeEraPolicy12'],
 ['world-v12.js','OneLifeWorld12'],
 ['world-v13.js','OneLifeWorld13']
])global.window[key]=require(path.join(root,file));
const W9=global.window.OneLifeWorld9,W10=global.window.OneLifeWorld10,
 W12=global.window.OneLifeWorld12,W13=global.window.OneLifeWorld13,
 DATA=global.window.OneLifeHistoryData10;
delete global.window;
const YEARS=[1907,1919,1935,1942,1968,1983,2004,2026];
const N=Math.max(10,Math.min(1000,parseInt(process.argv[2]||'250',10)||250));
const groups=[],totals={lives:0,fullRuns:0,invalidYears:0,stuckChoices:0,repeats:0};
const round=n=>Math.round(n*10)/10;
const means=(sum,n)=>n?round(sum/n):0;
function createGroup(year){
 return {birthYear:year,lives:0,meanLifespan:0,survivorsTo20:0,survivorsTo50:0,
  totalYears:0,allRawEvents:0,allRetainedEvents:0,eventRecordsLost:0,
  historicalFacts:0,historicalImpact:0,historicalChoices:0,historicalFollowups:0,
  dailyLifeEvents:0,dailyLifeChoices:0,dailyLifeFollowups:0,
  familyCareChoices:0,careFollowups:0,peopleEvents:0,
  lowDensityYears:0,zeroEventYears:0,
  after2026Years:0,after2026EraChoices:0,after2026Facts:0,after2026Events:0,
  decisions:0,distinctPerLife:0,repeatedTexts:0,
  childYears:{years:0,events:0},youngAdult:{years:0,events:0},midlife:{years:0,events:0},elderly:{years:0,events:0},
  historyExposureYears:new Set(),sample:[],timeSlots:{},eras:new Set(),
  versions:['world-v9','world-v10','world-v12','world-v13']};
}
const rowByKind=(trace,k)=>trace.kind[k]||0;
const recent=Object.keys(Sim).slice(0,10);
const began=Date.now();
for(const year of YEARS){
 const g=createGroup(year);groups.push(g);
 const sampledSeeds=[];
 for(let i=0;i<N;i++){
  const seed=(Math.imul(i+1,2654435761)^0x9e3779b9)>>>0;
  const life=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
  assert.equal(life.country[0],'대한민국');
  W13.state(life);
  const t=traces.get(life);
  let guard=0,choiceCount=0,eraFuture=0;
  const seenKinds={},decisions=[];
  while(life.alive&&guard++<500){
   if(life.pending){
    const c=life.getChoice();
    if(c?.options?.length){
     const k=String(life.pending).split(':')[0];
     if(k==='v12'&&life.year>2026)eraFuture++;
     const idx=(i+life.age+choiceCount)%c.options.length;
     if(!life.choose(idx))throw new Error('unresolvable choice birth='+year+' age='+life.age+' pending='+life.pending);
     seenKinds[k]=(seenKinds[k]||0)+1;
     if(i===0&&decisions.length<10)decisions.push({age:life.age,year:life.year,title:c.title,k});
     choiceCount++;continue;
    }
    if(life.getReflection()){
     if(!life.reflect())throw new Error('unresolvable reflection');
     choiceCount++;continue;
    }
    throw new Error('unknown pending '+life.pending+' birth='+year);
   }
   const age=life.age,oldYear=life.year;
   const res=life.tick();
   assert.equal(res,true,'tick stuck birth '+year);
   assert.equal(life.age,age+1,'age skip '+year);
   assert.equal(life.year,oldYear+1,'year skip '+year);
   assert.equal(life.year,life.birthYear+life.age);
  }
  assert.equal(life.alive,false,'never dies birth '+year);
  assert.ok(guard<=500,'endless simulation birth '+year);
  assert.ok(Number.isFinite(life.money.netWorth),'invalid finance');
  const s10=W10.ensure(life),s12=W12.ensure(life),s13=W13.state(life),p=W9.ensure(life);
  assert.equal(new Set(s10.decisions.map(d=>d.id)).size,s10.decisions.length);
  assert.equal(new Set(s12.decisions.map(d=>d.id)).size,s12.decisions.length);
  assert.equal(new Set(s13.decisions.map(d=>d.id)).size,s13.decisions.length);
  assert.equal(t.wrongYear,0,'bad timeline year');
  assert.equal(t.futureHistory,0,'future incorrectly marked as factual history');
  assert.ok(p.people.every(x=>x.deadYear==null||x.deadYear>=x.birthYear),'relative dies before birth');
  const actualYears=life.age;
  g.lives++;g.meanLifespan+=life.age;
  g.totalYears+=actualYears;g.survivorsTo20+=Number(life.age>=20);g.survivorsTo50+=Number(life.age>=50);
  g.allRawEvents+=t.raw;g.allRetainedEvents+=life.log.length;g.eventRecordsLost+=t.raw-life.log.length;
  g.distinctPerLife+=t.unique.size;g.repeatedTexts+=t.repeated;
  g.historicalFacts+=rowByKind(t,'history');
  g.historicalChoices+=rowByKind(t,'history-choice');
  g.historicalImpact+=rowByKind(t,'history-impact');
  g.historicalFollowups+=rowByKind(t,'history-followup');
  g.dailyLifeEvents+=rowByKind(t,'history-life');
  g.dailyLifeChoices+=rowByKind(t,'era-choice');
  g.dailyLifeFollowups+=rowByKind(t,'era-followup');
  g.familyCareChoices+=rowByKind(t,'care13-choice');
  g.careFollowups+=rowByKind(t,'care13-followup');
  g.peopleEvents+=rowByKind(t,'relationship')+rowByKind(t,'family13');
  g.decisions+=choiceCount;g.after2026EraChoices+=eraFuture;
  for(const [ageText,n] of Object.entries(t.perAge)){
   const age=+ageText,cy=year+age;if(age===0)continue;
   const band=age<20?'childYears':age<40?'youngAdult':age<60?'midlife':'elderly';
   g[band].years++;g[band].events+=n;
   if(n<3)g.lowDensityYears++;
   if(n===0)g.zeroEventYears++;
   if(cy>2026){g.after2026Years++;g.after2026Events+=n;}
   const decade=Math.floor(age/10)*10;
   const key=decade+'s';
   const slot=g.timeSlots[key]||(g.timeSlots[key]={years:0,events:0,under3:0});
   slot.years++;slot.events+=n;slot.under3+=Number(n<3);
  }
  for(const x of s10.factsSeen)g.historyExposureYears.add(DATA.FACTS.find(f=>f.id===x)?.year);
  for(const x of s12.decisions)g.eras.add(x.topic);
  if(i<2){
   sampledSeeds.push({seed,sex:life.gender,lifespan:life.age,logStored:life.log.length,rawEvents:t.raw,
    historyFacts:rowByKind(t,'history'),sceneEvents:rowByKind(t,'history-life'),
    eraChoices:rowByKind(t,'era-choice'),familyChoices:rowByKind(t,'care13-choice'),
    choices:decisions,lateDecadeEvents:Object.entries(t.perAge).filter(([a])=>+a>=40).slice(0,3)});
  }
 }
 g.meanLifespan=means(g.meanLifespan,N);
 g.eventsPerAliveYear=means(g.allRawEvents,g.totalYears);
 g.displayedEventsPerLife=means(g.allRetainedEvents,N);
 g.allEventsPerLife=means(g.allRawEvents,N);
 g.historyPerLife=means(g.historicalFacts,N);
 g.historyDecisionsPerLife=means(g.historicalChoices,N);
 g.lifeScenesPerLife=means(g.dailyLifeEvents,N);
 g.eraChoicesPerLife=means(g.dailyLifeChoices,N);
 g.careChoicesPerLife=means(g.familyCareChoices,N);
 g.choiceCountPerLife=means(g.decisions,N);
 g.followupPerLife=means(g.historicalFollowups+g.dailyLifeFollowups+g.careFollowups,N);
 g.under3Percent=means(g.lowDensityYears*100,g.totalYears);
 g.retainedPercent=means(g.allRetainedEvents*100,g.allRawEvents);
 g.post2026EventsPerYear=means(g.after2026Events,g.after2026Years);
 g.after2026EraChoicesPer100Years=means(g.after2026EraChoices*100,g.after2026Years);
 g.distinctEraTopics=[...g.eras].sort();
 g.historicYearsSample=[...g.historyExposureYears].filter(x=>Number.isFinite(x)).sort((a,b)=>a-b).slice(0,18);
 g.timeSlots=Object.fromEntries(Object.entries(g.timeSlots).sort().map(([key,v])=>
  [key,{eventsPerYear:means(v.events,v.years),under3Percent:means(v.under3*100,v.years),years:v.years}]));
 g.sample=sampledSeeds;
 delete g.historyExposureYears;delete g.eras;
 totals.lives+=N;totals.fullRuns+=N;totals.repeats+=g.repeatedTexts;
}
totals.runtimeSeconds=round((Date.now()-began)/1000);
console.log('COHORT_AUDIT_JSON_START');
console.log(JSON.stringify({N,years:YEARS,totals,groups},null,2));
console.log('COHORT_AUDIT_JSON_END');
