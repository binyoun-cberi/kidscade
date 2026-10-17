'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(name,alias)=>{const module=require(path.join(root,name));if(alias)global.window[alias]=module;return module;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');
load('joseon-v2.js','OneLifeJoseon2');load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4'),V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');
load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');
load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
load('joseon-v17-branch-switch.js','OneLifeBranchSwitchV17');
load('joseon-v18-sedo-samjeong.js','OneLifeJoseon18');
load('joseon-v19-local-office.js','OneLifeJoseon19');
load('colonial-daily-v2.js','OneLifeColonialDaily');
load('travel-v22.js','OneLifeTravel22');
load('consequences-v30.js','OneLifeConsequences30');
load('joseon-branches-v325.js','OneLifeJoseon325');
const W326=load('joseon-women-v326.js','OneLifeJoseonWomen326');
const W=load('joseon-women-v327.js','OneLifeJoseonWomen327');
delete global.window;
function birth(year=1660,seed=17,age=16,sex='여자'){
 const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국',birthSetup:{gender:sex}});
 l.age=age;l.year=year+age;l.gender=sex;l.alive=true;l.pending=null;
 J.ensure(l);V5.ensure(l);V4.ensure(l);if(sex==='여자'){W326.ensure(l);W.ensure(l);}
 return l;
}
function office(l,kind='central'){
 const social=V5.ensure(l);social.origin='공노비';social.publicOffice=kind==='central'?'중앙 관서':'지방 관아';
 social.freed=false;social.monastic=false;J.ensure(l).married=false;
}
function staged(l,key,index){
 const s=W.ensure(l);if(['entry','midwife','widowHome','estate'].includes(key)&&!s.seen.includes(key))s.seen.push(key);
 s.queue=[];s.active=key;l.pending='joseonWomen327:'+key;
 const p=l.getChoice();a.ok(p,key);a.equal(p.options.length,3,key);
 for(const opt of p.options){a.ok(opt.label);a.ok(opt.note);}
 a.equal(l.choose(index),true,key);
 return s;
}
function advance(l,age){
 l.age=age;l.year=l.birthYear+age;l.pending=null;
 if(l.joseonWomen326)W326.ensure(l).processedYear=l.year-1;
 W.ensure(l).processedYear=l.year-1;W.yearly(l);
}
test('government work requires bonded public-office origin, correct age and actual office',()=>{
 const central=birth(1600,23,12);office(central);
 a.deepEqual(W.eligibleOffice(central),['uinyeo','palace']);
 const local=birth(1600,32,16);office(local,'local');
 a.deepEqual(W.eligibleOffice(local),['courtArtist']);
 const farmer=birth(1600,41,16);V5.ensure(farmer).origin='소작 농가';
 a.deepEqual(W.eligibleOffice(farmer),[]);
 const tooOld=birth(1600,52,25);office(tooOld);
 a.deepEqual(W.eligibleOffice(tooOld),[]);
 const future=birth(1886,66,16);office(future);
 a.deepEqual(W.eligibleOffice(future),[]);
 const man=birth(1600,91,16,'남자');office(man);
 a.deepEqual(W.eligibleOffice(man),[]);
});
test('institutional female occupation takes training and does not create royal ranks or marriage',()=>{
 let selected=null;
 for(let seed=1;seed<=60&&!selected;seed++){
  const l=birth(1600,seed,12);office(l);
  staged(l,'entry',0);
  if(W.summary(l).profession)selected=l;
 }
 a.ok(selected,'one candidate should be assigned under fictional test seed');
 a.equal(W.summary(selected).serviceBound,true);
 a.equal(W326.accessible(selected),false,'domestic branch is paused');
 a.match(J.ensure(selected).occupation,/의녀/);
 const j=J.ensure(selected);j.active={kind:'marriage',id:'1619-marriage'};selected.pending='joseon:1619-marriage';
 const prompt=selected.getChoice();
 a.equal(prompt.title,'관아의 일과 내 앞날');
 a.equal(prompt.options.some(p=>p.action==='marry'||p.action==='servileMarry'),false);
 a.ok(selected.choose(0));
 a.equal(J.ensure(selected).married,false);
 a.equal(V4.summary(selected).spouse,null);
 const w=W.ensure(selected);w.workAt=selected.year;w.workDone=0;
 staged(selected,'work',0);
 a.equal(W.summary(selected).workDone,1);
 a.equal(W.summary(selected).serviceBound,true);
});
test('midwife is a learned local occupation, never an automatic government medical title',()=>{
 const l=birth(1730,114,30);V5.ensure(l).origin='소작 농가';
 W326.ensure(l).care=4;
 a.equal(W.eligibleMidwife(l),true);
 staged(l,'midwife',0);
 a.equal(W.summary(l).profession,'마을에서 출산을 돕는 사람');
 a.equal(W.summary(l).serviceBound,false);
 const start=W.summary(l).skill;staged(l,'work',1);
 a.ok(W.summary(l).skill>start);
 const untrained=birth(1730,115,30);V5.ensure(untrained).origin='소작 농가';
 W326.ensure(untrained).care=0;
 a.equal(W.eligibleMidwife(untrained),false);
});
test('widowhood and remarriage preserve the deceased spouse and family history across saves',()=>{
 const l=birth(1650,208,36);
 const people=V4.ensure(l).people;
 people.push({id:'spouse',role:'spouse',name:'옛 배우자',birthYear:1650,sex:'남자',
  atHome:true,joinedYear:1668,alive:false,diedYear:1685,relation:50,wellbeing:50,learning:0,
  work:'농사',trait:'다정한',married:true,lifeYears:70});
 J.ensure(l).married=false;
 W326.ensure(l).seen.push('widow');
 staged(l,'widowHome',2);
 a.ok(W.ensure(l).remarriageDue>l.year);
 l.year+=2;l.age+=2;l.pending=null;W.ensure(l).processedYear=l.year-1;W.yearly(l);
 a.equal(l.pending,'joseonWomen327:remarriage');
 staged(l,'remarriage',0);
 const fam=V4.summary(l),spouses=fam.people.filter(p=>p.role==='spouse');
 a.equal(spouses.length,2);a.equal(spouses.filter(p=>p.alive).length,1);
 a.equal(spouses.find(p=>p.name==='옛 배우자').alive,false);
 a.equal(W326.family(l).bereaved,false);
 a.equal(J.ensure(l).married,true);
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 a.ok(restored);
 a.equal(V4.summary(restored).people.filter(p=>p.role==='spouse'&&p.alive).length,1);
 a.equal(V4.summary(restored).people.filter(p=>p.role==='spouse'&&!p.alive).length,1);
 a.deepEqual(W.summary(restored),W.summary(l));
});
test('estate requires a lost parent, documented evidence and years before a bounded settlement',()=>{
 const l=birth(1520,301,43);V5.ensure(l).origin='소작 농가';
 const mother=V4.ensure(l).people.find(p=>p.role==='mother');
 mother.alive=false;mother.diedYear=l.year-2;
 W326.ensure(l).property=2;
 const cash=J.ensure(l).capital;
 staged(l,'estate',0);
 a.equal(J.ensure(l).capital,cash);
 a.equal(W.summary(l).estate.status,'review');
 l.age+=2;l.year+=2;l.pending=null;W.ensure(l).processedYear=l.year-1;W.yearly(l);
 a.equal(l.pending,'joseonWomen327:estateResult');
 staged(l,'estateResult',0);
 a.equal(W.summary(l).estate.status,'settled');
 a.ok(J.ensure(l).capital>cash);
 const blocked=birth(1780,303,43);W326.ensure(blocked).property=2;
 a.equal(W.offer(blocked,'estate'),null);
 const noEvidence=birth(1720,305,45);V5.ensure(noEvidence).origin='소작 농가';
 const father=V4.ensure(noEvidence).people.find(p=>p.role==='father');
 father.alive=false;father.diedYear=noEvidence.year-2;
 W326.ensure(noEvidence).property=1;
 staged(noEvidence,'estate',2);
 const old=J.ensure(noEvidence).capital;
 staged(noEvidence,'estateResult',0);
 a.equal(J.ensure(noEvidence).capital,old);
 a.equal(W.summary(noEvidence).estate.status,'unresolved');
});
test('childbirth assistance only arises from an actual named newborn; no artificial births',()=>{
 const l=birth(1740,404,29);V5.ensure(l).origin='소작 농가';
 J.ensure(l).occupation='농사';const f=V4.ensure(l);
 a.equal(W.offer(l,'childcare'),null);
 f.people.push({id:'child-test',role:'child',name:'아기',sex:'남자',
  birthYear:l.year,alive:true,atHome:true,relation:66,wellbeing:60,learning:0,
  work:'자라는 중',trait:'다정한',married:false,lifeYears:75});
 const before=J.ensure(l).children;
 advance(l,30);
 a.equal(W.offer(l,'childcare'),null,'a previous-year baby cannot trigger a new-birth event');
 l.age=29;l.year=l.birthYear+29;l.pending=null;
 W.ensure(l).processedYear=l.year-1;W.yearly(l);
 a.equal(l.pending,'joseonWomen327:childcare');
 staged(l,'childcare',1);
 a.equal(J.ensure(l).children,before);
});
test('no government career for men, detainees, or captive women; older saves remain readable',()=>{
 const m=birth(1700,510,31,'남자');
 a.equal(W.ensure(m),null);
 const captive=birth(1700,511,30);captive.joseon14={captivity:{status:'held'}};
 a.equal(W.available(captive),false);
 const legacy=birth(1650,511,30);const old=legacy.snapshot();
 delete old.joseonWomen327;
 const copy=Sim.Life.restore(old);
 a.ok(copy);
 a.equal(W.summary(copy).decisions,0);
});
test('400 historical female lives run through choices, saves and family-work scenarios',()=>{
 const seen=new Set(),jobs=new Set();let choices=0,saved=0,complete=0;
 for(const y of [1420,1510,1630,1720,1830])for(let seed=1;seed<=80;seed++){
  const l=birth(y,y*47+seed*13,12);
  // Enter a real era through each year. Most backgrounds remain naturally drawn by the core.
  l.pending=null;
  for(let n=0;n<215&&l.alive&&l.age<75&&l.year<=1894;n++){
   if(l.pending){
    const p=l.getChoice();
    if(p?.options?.length){
     if(String(l.pending).startsWith('joseonWomen327:'))seen.add(l.pending.split(':')[1]);
     a.equal(l.choose(seed%p.options.length),true,'stuck at '+l.pending);
    }else if(l.getReflection())a.equal(l.reflect(''),true);
    else a.fail('Unresolvable '+l.pending);
   }else l.tick();
  }
  const s=W.summary(l);choices+=s.decisions;
  if(s.profession)jobs.add(s.profession);
  if(!l.alive||l.age>=75)complete++;
  if(seed%10===0){
   const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   a.ok(copy);a.deepEqual(W.summary(copy),s);saved++;
  }
 }
 a.equal(saved,40);a.ok(complete>=50);
 a.ok(seen.has('midwife')&&seen.has('estate'),'missing care/estate choices '+[...seen]);
 a.ok(choices>200,'too few choices: '+choices);
});
test('browser ships historical module after v326 and combines its traces into one panel',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 a.ok(html.indexOf('joseon-women-v326.js')<html.indexOf('joseon-women-v327.js'));
 a.ok(html.indexOf('joseon-women-v327.js')<html.indexOf('game.js?v=62'));
 a.match(game,/OneLifeJoseonWomen327/);
 a.match(game,/more\.profession/);
});
