'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(f,k)=>{const m=require(path.join(root,f));if(k)window[k]=m;return m;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');const V4=load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');load('joseon-v8-lineage.js','OneLifeJoseon8');
load('joseon-v9-village.js','OneLifeJoseon9');load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
load('joseon-v15-genealogy.js','OneLifeGenealogyV15');load('joseon-v17-branch-switch.js','OneLifeBranchSwitchV17');
const V18=load('joseon-v18-sedo-samjeong.js','OneLifeJoseon18');
const V19=load('joseon-v19-local-office.js','OneLifeJoseon19');
load('colonial-daily-v2.js','OneLifeColonialDaily');delete global.window;
const born=(year=1800,seed=101)=>new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
const at=(l,year,region='경상도')=>{l.year=year;l.age=year-l.birthYear;l.alive=true;l.pending=null;J.ensure(l).region=region;return l;};
function force(l,id,i=0){
 const e=V19.EVENTS.find(x=>x.id===id);assert.ok(e,id);
 const s=V19.ensure(l);s.active={id:l.year+'-'+id,eventId:id,year:l.year};l.pending='joseon19:'+s.active.id;
 assert.equal(l.getChoice().options.length,3);assert.equal(l.choose(i),true);return s;
}
test('12 events are unique, documented and have three genuine choices',()=>{
 assert.equal(V19.EVENTS.length,12);
 assert.equal(new Set(V19.EVENTS.map(e=>e.id)).size,12);
 for(const e of V19.EVENTS){assert.equal(e.options.length,3);assert.ok(e.source.startsWith('https://'));assert.ok(e.options.every(o=>o.label&&o.note&&o.follow));}
});
test('a district has one stable fictional magistrate until turnover',()=>{
 const l=at(born(1800,1201),1832),a=V19.summary(l),b=V19.summary(l);
 assert.deepEqual(a,b);assert.ok(a.name.length>=3);assert.ok(a.through-a.from>=4);
 assert.equal(a.region,'경상도');assert.ok(['청렴한 편','탐학한 편','평판이 엇갈림'].includes(a.reputation));
});
test('term rollover changes the governor but preserves existing household debts',()=>{
 const l=at(born(1800,1301),1834),s=V19.ensure(l),v=V18.ensure(l);
 v.grainDebt=11;s.office.through=1834;s.processedYear=1834;at(l,1835);V19.yearly(l,s);
 assert.equal(s.turnovers,2);assert.equal(s.office.from,1835);assert.equal(v.grainDebt,11);
 assert.ok(l.log.some(x=>x.kind==='joseon19-office'));
});
test('audit results depend on proof and patrons rather than automatic justice',()=>{
 for(const seed of [128,129]){
  const l=at(born(1800,seed),1840),s=V19.ensure(l),ledger=V18.ensure(l);
  s.office.patronage=seed===128?90:4;s.proof=15;ledger.landDebt=12;
  s.audit={state:'investigating',since:1836,checked:10,outcome:'',reports:0};s.processedYear=1839;
  V19.yearly(l,s);assert.equal(s.audit.state,'reported');assert.ok(s.audit.outcome.length>3);
  assert.equal(s.audit.reports,1);assert.ok(ledger.landDebt>=0);
 }
});
test('petitions can lead to rumors of inspectors but do not guarantee an intervention',()=>{
 const l=at(born(1800,404),1833),s=V19.ensure(l);
 s.petitions=40;s.proof=60;s.office.patronage=0;s.processedYear=1832;
 V19.yearly(l,s);assert.ok(['none','rumor'].includes(s.audit.state));
 if(s.audit.state==='rumor')assert.ok(s.seen.includes('unknownTraveler'));
});
test('clerk cooperation with false books and taxpayer petitions are different outcomes',()=>{
 const l=at(born(1800,221),1840),s=V19.ensure(l);
 force(l,'appointedClerk',1);assert.ok(s.corruption>=4);
 force(l,'levyRequest',2);assert.ok(s.petitions>=1);
 assert.ok(V18.ensure(l).complaints>=1);
});
test('a good magistrate can ease some debt without abolishing every tax burden',()=>{
 const l=at(born(1800,502),1840),s=V19.ensure(l),v=V18.ensure(l);
 s.office.integrity=90;v.landDebt=10;v.grainDebt=8;v.militaryDebt=6;
 force(l,'goodMagistrate',0);
 assert.equal(v.landDebt,8);assert.equal(v.grainDebt,6);assert.equal(v.militaryDebt,4);
});
test('higher levy pressure uses the existing v18 ledger without charging capital twice',()=>{
 const l=at(born(1800,581),1843),s=V19.ensure(l);
 s.office.levy=90;s.processedYear=1842;const old=J.ensure(l).capital;
 V19.yearly(l,s);assert.equal(J.ensure(l).capital,old);
 assert.ok(V18.summary(l).total>=0);
});
test('outside period local government events do not progress',()=>{
 const l=at(born(1850,809),1898),s=V19.ensure(l),old=s.office.from;
 s.processedYear=1897;V19.yearly(l,s);
 assert.equal(s.office.from,old);assert.equal(s.decisions.length,0);
});
test('next generation inherits complaints and evidence without inherited moral guilt',()=>{
 const l=at(born(1800,1008),1851),f=V4.ensure(l),base=f.people.find(p=>p.role==='sibling')||f.people[0];
 f.people.push({...base,id:'child-0',role:'child',name:'박순',birthYear:1820,
  sex:'여자',alive:true,atHome:true,diedYear:null});
 const s=V19.ensure(l);s.petitions=9;s.proof=13;s.corruption=30;s.integrity=20;
 l.finish('생을 마쳤다');
 const next=V14.continueAsHeir(l,'child-0');assert.ok(next);
 const n=V19.ensure(next);assert.ok(n.petitions>0&&n.proof>0);
 assert.equal(n.corruption,0);assert.equal(n.integrity,0);
});
test('a save restores governor name, term, audit state and personal choices',()=>{
 const l=at(born(1810,1009),1850),s=V19.ensure(l);
 s.petitions=5;s.proof=11;s.audit={state:'rumor',since:1849,checked:0,outcome:'',reports:0};
 force(l,'corruptMagistrate',0);
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(V19.summary(cp),V19.summary(l));
 assert.deepEqual(cp.snapshot().joseon19,l.snapshot().joseon19);
});
test('save and reload preserve zero levy and other zero-value office traits',()=>{
 const l=at(born(1810,1777),1853),s=V19.ensure(l);
 s.office.levy=0;s.office.integrity=0;s.office.patronage=0;s.office.clerks=0;
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 const office=V19.ensure(cp).office;
 for(const k of ['levy','integrity','patronage','clerks'])assert.equal(office[k],0,k);
});

test('older saves with no local-office module rebuild cleanly',()=>{
 const l=at(born(1810,1109),1855),snap=l.snapshot();delete snap.joseon19;
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(snap)));
 assert.ok(V19.summary(cp).name);assert.equal(V19.summary(cp).decisions,0);
});
test('the browser loads after v18 and exposes the inspection ledger',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-v18-sedo-samjeong.js')<html.indexOf('joseon-v19-local-office.js'));
 for(const id of ['localOfficePanel','localOfficeName','localOfficeAudit','localOfficeHistory','localOfficeTax'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes('Joseon19?.summary(life)'));
 assert.ok(js.includes("'joseon19-choice'"));
});
test('144 varied lives resolve their choices and retain identical v19 state after reload',()=>{
 let choices=0;
 for(const year of [1780,1790,1800,1810,1820,1830,1840,1850,1860,1875,1900,1550])
  for(let seed=1;seed<=12;seed++){
   const l=born(year,year*31+seed*113);let guard=0;
   while(l.alive&&l.year<Math.min(1899,year+85)&&guard++<850){
    if(l.pending){
     const p=l.getChoice();
     if(p)assert.equal(l.choose(seed%p.options.length),true);
     else if(l.getReflection())assert.equal(l.reflect(''),true);
     else assert.fail('unhandled '+l.pending);
    }else assert.equal(l.tick(),true);
   }
   assert.ok(guard<850);
   const cp=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.deepEqual(V19.summary(cp),V19.summary(l));
   choices+=V19.summary(l).decisions;
  }
 assert.ok(choices>15,'not enough governance events: '+choices);
});
