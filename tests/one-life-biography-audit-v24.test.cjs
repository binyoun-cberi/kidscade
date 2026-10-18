'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
// Use the gameplay module installation order, including the stacked Joseon and colonial wrappers.
const scripts=[
 ['world-v2.js','OneLifeWorld2'],['world-v3.js','OneLifeWorld3'],
 ['world-v4.js','OneLifeWorld4'],['world-v5.js','OneLifeWorld5'],
 ['careers-v6.js','OneLifeCareers6'],['events-v6.js','OneLifeEvents6'],
 ['world-v6.js','OneLifeWorld6'],['world-v7.js','OneLifeWorld7'],
 ['world-v8.js','OneLifeWorld8'],['history.js','OneLifeHistory'],
 ['world-v9.js','OneLifeWorld9'],['history-data-v10.js','OneLifeHistoryData10'],
 ['history-stories-v10.js','OneLifeHistoryStories10'],
 ['history-effects-v10.js','OneLifeHistoryEffects10'],
 ['world-v10.js','OneLifeWorld10'],['history-choices-v11.js','OneLifeHistoryChoices11'],
 ['era-policy-v12.js','OneLifeEraPolicy12'],['world-v12.js','OneLifeWorld12'],
 ['world-v13.js','OneLifeWorld13'],['joseon-history-policy.js','OneLifeJoseonPolicy'],
 ['joseon-v1.js','OneLifeJoseon'],['joseon-v2.js','OneLifeJoseon2'],
 ['joseon-v3.js','OneLifeJoseon3'],['joseon-v4.js','OneLifeJoseon4'],
 ['joseon-v5.js','OneLifeJoseon5'],['joseon-v6.js','OneLifeJoseon6'],
 ['joseon-v7-life.js','OneLifeJoseon7'],['joseon-v8-lineage.js','OneLifeJoseon8'],
 ['joseon-v9-village.js','OneLifeJoseon9'],['joseon-annals-v10.js','OneLifeJoseonAnnals'],
 ['joseon-v11-late-life.js','OneLifeJoseon11'],['joseon-v12-regional.js','OneLifeJoseon12'],
 ['joseon-v13-war-recovery.js','OneLifeJoseon13'],
 ['joseon-v14-captivity-generations.js','OneLifeJoseon14'],
 ['joseon-v15-genealogy.js','OneLifeGenealogyV15'],
 ['joseon-v17-branch-switch.js','OneLifeBranchSwitchV17'],
 ['joseon-v18-sedo-samjeong.js','OneLifeJoseon18'],
 ['joseon-v19-local-office.js','OneLifeJoseon19'],
 ['colonial-daily-v2.js','OneLifeColonialDaily'],['travel-v22.js','OneLifeTravel22']
];
for(const [file,key] of scripts){
 const api=require(path.join(root,file));global.window[key]=api;
}
const W8=global.window.OneLifeWorld8,J=global.window.OneLifeJoseon,
 J8=global.window.OneLifeJoseon8,J9=global.window.OneLifeJoseon9,
 W10=global.window.OneLifeWorld10,History=global.window.OneLifeHistory,
 Travel=global.window.OneLifeTravel22;
// Keep window bindings while the run executes: era-dependent modules consult them at runtime.
const BIRTH_YEARS=[1392,1400,1450,1495,1550,1575,1590,1600,1620,1630,1660,1700,1750,1800,1830,1860,1875,1885,1892,1898,1903,1910,1919,1929,1935,1942,1945,1950,1975,2000,2026];
const fragments=/\([이와을으]\)(?:가|과|를|로)|낮선|undefined|null|NaN|\[object Object\]/;
function play(seed,birthYear,index){
 let life=new Sim.Life(seed,{birthYear,countryName:'대한민국',
  birthSetup:{gender:index%2?'여자':'남자',
   ...(birthYear<1894?{origin:['양반','중인','상민','사노비','백정'][index%5]}:{familyLevel:['빠듯한 형편','평범한 형편','여유 있는 형편'][index%3]})}});
 W8.ensure(life);
 if(J.isJoseon(life)){J.ensure(life);J8.ensure(life);J9.ensure(life);}
 else{W8.moment(life);W10.ensure(life);}
 History.contextualize(life);
 let steps=0,decisions=0,resumes=0,foreignYears=0;
 while(life.alive&&steps++<550){
  assert.equal(life.year,life.birthYear+life.age,'life-year mismatch '+birthYear+'/'+seed);
  if(life.pending){
   const choice=life.getChoice();
   if(choice){
    assert.ok(Array.isArray(choice.options)&&choice.options.length>0,
     'empty choice '+String(life.pending)+' at '+life.year+'/'+seed);
    const which=(life.age+index+Math.floor(seed/31))%choice.options.length;
    assert.equal(life.choose(which),true,'choice not resolved '+String(life.pending)+' '+life.year+'/'+seed);
    decisions++;
   }else if(life.getReflection()){
    assert.equal(life.reflect('그때 생각한 일을 돌아봤다.'),true);
    decisions++;
   }else assert.fail('orphaned pending '+String(life.pending)+' at '+life.year+'/'+seed);
  }else {
   const was=life.year;
   const ok=life.tick();
   assert.equal(ok,true,'tick must advance from no pending '+birthYear+'/'+seed);
   assert.equal(life.year,was+1);
   History.contextualize(life);
   if(Travel.summary(life)?.residence.abroad)foreignYears++;
  }
  if(life.age===33&&seed%4===0&&resumes===0&&life.alive){
   const restored=Sim.Life.restore(JSON.parse(JSON.stringify(life.snapshot())));
   assert.ok(restored,'restore failed for '+birthYear+'/'+seed);
   assert.equal(restored.profile?.name,life.profile?.name);
   assert.equal(restored.year,life.year);
   life=restored;resumes++;
  }
 }
 assert.ok(steps<550,'life never concluded '+birthYear+'/'+seed);
 const weird=life.log.filter(e=>fragments.test(e.text)).slice(0,3);
 const ancientSchool=life.log.filter(e=>e.year<1970&&e.kind==='relationship'&&/\d+세가 되어 (학교에 입학|중등 과정을 시작|학교를 마치고)/.test(e.text));
 const oldPension=life.log.filter(e=>e.year<1988&&e.kind==='money'&&/연금과 모은 돈/.test(e.text));
 return {life,steps,decisions,resumes,foreignYears,weird,ancientSchool,oldPension};
}
test('310+ complete biographies across 1392–2026 do not leak grammar placeholders or break life chronology',()=>{
 const report={lives:0,years:0,decisions:0,foreignYears:0,restores:0,endingAges:[],
  fragmentExamples:[],historicalSchoolExamples:[],earlyPensionExamples:[],sampleBiographies:[]};
 for(let i=0;i<BIRTH_YEARS.length;i++){
  for(let n=0;n<11;n++){
   const year=BIRTH_YEARS[i],seed=((Math.imul(1103515245,n+19)+Math.imul(year,2349))>>>0);
   const result=play(seed,year,n);
   report.lives++;report.years+=result.life.age;report.decisions+=result.decisions;
   report.foreignYears+=result.foreignYears;report.restores+=result.resumes;
   report.endingAges.push(result.life.age);
   for(const [from,list] of [[result.weird,report.fragmentExamples],[result.ancientSchool,report.historicalSchoolExamples],[result.oldPension,report.earlyPensionExamples]]){
    if(from.length&&list.length<8)list.push({born:year,seed,year:from[0].year,text:from[0].text});
   }
   if(n===1&&[1392,1590,1630,1800,1892,1903,1919,1935,1950,2026].includes(year)){
    report.sampleBiographies.push({birth:year,seed,age:result.life.age,decisions:result.decisions,
     events:result.life.log.filter(e=>['joseon-choice','joseon14-captivity','travel22-depart','travel22-return','colonialDaily-choice','history','milestone','relationship'].includes(e.kind))
      .slice(0,9).map(e=>e.year+': '+e.text.slice(0,95))});
   }
  }
 }
 report.meanAge=Math.round(report.years/report.lives);
 report.meanDecisions=Number((report.decisions/report.lives).toFixed(1));
 // Samples are output to the GitHub CI log for an actual editorial review.
 console.log('ONE_LIFE_BIOGRAPHY_AUDIT='+JSON.stringify(report));
 assert.ok(report.lives>=310);
 assert.deepEqual(report.fragmentExamples,[],'literal particle or debug token in prose');
 assert.deepEqual(report.historicalSchoolExamples,[],'assumed universal school enrollment');
 assert.deepEqual(report.earlyPensionExamples,[],'ahistorical universal pension');
});
test('particle normalization chooses natural forms in Korean conversation',()=>{
 const l=new Sim.Life(822,{birthYear:2026,countryName:'대한민국'});
 for(const phrase of ['김철(이)가','민아(이)가','영수(와)과','순덕(와)과','홍길동(을)를','수아(을)를','집(으)로','마을(으)로']){
  l.logEvent(phrase,'voice-audit');
 }
 const got=l.log.filter(e=>e.kind==='voice-audit').map(e=>e.text);
 assert.deepEqual(got,['김철이가','민아가','영수와','순덕과','홍길동을','수아를','집으로','마을로']);
});
test('narration and historical behavior are guarded without modifying the player start controls',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('world-v9.js?v=5'));
 assert.match(html,/world-v2\.js\?v=\d+/);
 assert.ok(html.includes('history-effects-v10.js?v=5'));
 assert.ok(html.includes('travel-v22.js?v=3'));
});
