'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(base+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(base+'/'+m[1],'utf8'),c,{filename:m[1]});
const Sim=c.OneLifeSim,H=c.OneLifeHistoryLife338,J=c.OneLifeJoseon,V2=c.OneLifeJoseon2,V5=c.OneLifeJoseon5,B=c.OneLifeJoseon325,War=c.OneLifeJoseon13;
const copy=x=>JSON.parse(JSON.stringify(x));
function life(year=1519,gender='남자',region='경상도',age=30,seed=338){const l=new Sim.Life(seed,{birthYear:year-age,countryName:'대한민국',birthSetup:{gender}});c.OneLifeWorld8.ensure(l);l.year=year;l.age=age;l.alive=true;l.pending=null;J.ensure(l).region=region;B.ensure(l);V2.ensure(l);V5.ensure(l);return l;}
function official(l){V5.ensure(l).origin='문반 양반';J.ensure(l).status='양반';J.ensure(l).office=true;J.ensure(l).occupation='관청의 관리';V5.ensure(l).role='관청의 관리';V5.ensure(l).rank=2;return l;}
function farm(l){J.ensure(l).land=3;J.ensure(l).occupation='농사와 집안일';V5.ensure(l).role='농부';V5.ensure(l).origin='자작 농가';return l;}
function trader(l){V5.ensure(l).origin='상인 가계';J.ensure(l).occupation='장사와 운송';V5.ensure(l).role='상인';return l;}
function force(l,key){const s=H.ensure(l),item=H.opportunities(l).find(e=>e.key===key);assert.ok(item,key+' unavailable');s.active={id:key+'-'+l.year,key,year:l.year,title:item.fact.title,source:item.fact.source};l.pending='joseon338:'+s.active.id;return s;}
test('accession and purges affect relevant officials, never an unrelated farmer or child',()=>{
 const farmer=farm(life(1519));assert.equal(H.eligibility(farmer,'purge'),false);
 const officialLife=official(life(1519));assert.equal(H.eligibility(officialLife,'purge'),true);
 assert.equal(H.eligibility(official(life(1519,'여자')),'purge'),false);
 assert.equal(H.eligibility(official(life(1519,'남자','한양',10)),'purge'),false);
 assert.ok(H.opportunities(official(life(1418,'남자','한양',20))).some(x=>x.key==='court'));
 const prior=copy(farmer.stats);H.processYear(farmer);assert.deepEqual(copy(farmer.stats),prior);
});
test('political documents persist and a petition never automatically becomes exile',()=>{
 const l=official(life(1519));const s=force(l,'purge');const capital=J.ensure(l).capital;
 assert.equal(l.choose(0),true);assert.equal(s.proof,1);assert.equal(J.ensure(l).capital,capital);
 const restored=Sim.Life.restore(copy(l.snapshot()));assert.equal(H.ensure(restored).proof,1);
 const choice=restored.log.find(e=>e.kind==='joseon338-choice');assert.ok(H.matchEntry(restored,choice));
 restored.year++;restored.age++;H.settle(restored,H.ensure(restored));assert.ok(restored.log.some(e=>e.kind==='joseon338-followup'));
 assert.equal(B.ensure(restored).law.kind,'free');
 const retire=official(life(1623));force(retire,'purge');retire.choose(2);assert.equal(J.ensure(retire).office,false);assert.equal(V5.ensure(retire).rank,0);
});
test('political scrutiny is delayed, linked to the choice, and requires a separate trial decision',()=>{
 let investigated=0;
 for(let seed=1;seed<=100;seed++){
  const l=official(life(1519,'남자','한양',32,seed));B.ensure(l).politics={faction:'함께 상소를 낸 동료',stage:'petition',risk:3,due:1523};force(l,'purge');l.choose(1);
  assert.equal(B.ensure(l).law.kind,'free');l.year++;l.age++;H.settle(l,H.ensure(l));
  if(B.ensure(l).queue.includes('trial'))investigated++;
  assert.equal(B.ensure(l).law.kind,'free');
 }
 assert.ok(investigated>0&&investigated<100);
});
test('Hangul study requires post-publication access, takes years, and grants no Hanmun qualification',()=>{
 const early=life(1443,'여자','한양',15);assert.equal(H.eligibility(early,'hangul'),false);
 const l=life(1446,'여자','한양',15),j=J.ensure(l),literacy=j.literacy,career=j.occupation;
 const s=force(l,'hangul');l.choose(0);assert.equal(s.hangul,0);assert.equal(j.literacy,literacy);
 l.year+=2;l.age+=2;H.settle(l,s);assert.equal(s.hangul,1);assert.equal(j.literacy,literacy);assert.equal(j.occupation,career);
 const child=life(1446,'여자','한양',2);assert.equal(H.eligibility(child,'hangul'),false);
});
test('a crop trial requires actual seed and cash, is delayed, and can fail during scarcity',()=>{
 const l=farm(life(1765));J.ensure(l).capital=10;V2.ensure(l).grain=10;const s=force(l,'crop');l.choose(0);
 assert.equal(J.ensure(l).capital,8);assert.equal(V2.ensure(l).grain,8);
 l.year++;l.age++;V2.ensure(l).scarcityUntil=l.year+1;H.settle(l,s);assert.equal(V2.ensure(l).grain,8);assert.match(l.log.at(-1).text,/거두지 못했다/);
 const poor=farm(life(1765));J.ensure(poor).capital=0;V2.ensure(poor).grain=0;const p=force(poor,'crop');assert.match(poor.getChoice().options[0].label,/부족/);poor.choose(0);assert.equal(p.followups.length,0);assert.equal(V2.ensure(poor).grain,0);
 assert.equal(H.eligibility(farm(life(1763)),'crop'),false);assert.equal(H.eligibility(farm(life(1765,'남자','함경도')),'crop'),false);
});
test('regional levy changes do not grant a second tax discount and never erase debt',()=>{
 const l=farm(life(1608,'여자','경기도',30));assert.ok(H.opportunities(l).some(e=>e.key==='tax'));
 assert.ok(!H.opportunities(life(1608,'남자','경상도')).some(e=>e.key==='tax'));
 J.ensure(l).capital=-20;const s=force(l,'tax');l.choose(0);assert.equal(J.ensure(l).capital,-20);assert.ok(s.proof>0);
 assert.equal(c.OneLifeJoseonPolicy.tribute(1700,'함경도').kind,'sangjeong');
});
test('transport work requires a relevant job and route, and a later move cancels a pending trade',()=>{
 const l=trader(life(1899,'남자','경기도'));J.ensure(l).capital=10;const s=force(l,'rail');l.choose(0);assert.equal(J.ensure(l).capital,8);
 l.year++;l.age++;J.ensure(l).region='함경도';H.settle(l,s);assert.equal(J.ensure(l).capital,8);assert.match(l.log.at(-1).text,/돌아오지 않았다/);
 assert.equal(H.eligibility(trader(life(1899,'남자','함경도')),'rail'),false);assert.equal(H.eligibility(farm(life(1899,'남자','경기도')),'rail'),false);
});
test('famine borrowing creates a saved liability; actual grain repays it and a repeated shortfall opens subsistence paths',()=>{
 const l=life(1670),v=V2.ensure(l);v.grain=0;v.active={id:'famine-1670',kind:'famine',title:'경신대기근',year:1670};l.pending='joseon2:famine-1670';
 assert.match(l.getChoice().options[1].label,/빌린다/);assert.ok(l.choose(1));assert.equal(v.grain,3);assert.equal(v.famineLoans[0].remaining,4);
 const restored=Sim.Life.restore(copy(l.snapshot()));assert.equal(V2.ensure(restored).famineLoans[0].remaining,4);
 v.famineLoans[0].missed=2;v.grain=0;assert.equal(B.canDebt(l,B.ensure(l)),true);B.queue(l,B.ensure(l),'hardship');l.pending=null;B.promote(l);
 assert.match(l.getChoice().description,/이웃에게 빌린/);l.choose(2);assert.equal(B.ensure(l).stage,'forest');assert.equal(v.famineLoans[0].remaining,4);
 const pay=life(1672);const stock=V2.ensure(pay);stock.famineLoans=[{id:'famine-1670',year:1670,due:1672,remaining:4,missed:1}];stock.grain=100;stock.processedYear=1671;V2.processYear(pay);assert.equal(stock.famineLoans.length,0);assert.ok(pay.log.some(e=>/모두 갚았다/.test(e.text)));
});
test('war chronology schedules the existing regional response once and applies no extra shock',()=>{
 const l=life(1592,'남자','경상도'),s=War.ensure(l);s.active=null;s.queue=[];s.seen=[];const grain=V2.ensure(l).grain,capital=J.ensure(l).capital;
 H.warYear(l);H.warYear(l);assert.equal(s.queue.length,1);assert.equal(s.queue[0].eventId,'imjinAlarm');assert.equal(s.damage,0);assert.equal(V2.ensure(l).grain,grain);assert.equal(J.ensure(l).capital,capital);
 const covered=life(1592);J.ensure(covered).active={kind:'war',id:'1592-war'};covered.pending='joseon:1592-war';H.warYear(covered);assert.equal(War.ensure(covered).queue.length,0,'the core war choice already covers this year');
 const child=life(1592,'여자','경상도',2);H.warYear(child);assert.equal(War.ensure(child).queue.length,0);
});
test('pending choices restore exactly, reject invalid input atomically, and do not activate in captivity',()=>{
 const l=official(life(1519));force(l,'purge');const own=copy(H.ensure(l)),stats=copy(l.stats),pending=l.pending;assert.equal(l.choose(-1),false);assert.deepEqual(copy(H.ensure(l)),own);assert.deepEqual(copy(l.stats),stats);assert.equal(l.pending,pending);const before=copy(l.snapshot());
 const restored=Sim.Life.restore(before);assert.equal(restored.pending,l.pending);assert.deepEqual(copy(restored.getChoice()),copy(l.getChoice()));assert.equal(restored.choose(0),true);
 const captive=life(1765);captive.joseon14={captivity:{status:'held'}};assert.equal(H.eligibility(captive,'crop'),false);
 const abroad=life(1446,'여자','한양');abroad.travel22={residence:{abroad:true}};assert.equal(H.eligibility(abroad,'hangul'),false);
});


test('newly learned writing can reach an actual relative, but a deceased relative never replies',()=>{
 const l=life(1450,'여자','한양'),s=H.ensure(l);s.hangul=1;
 const person=c.OneLifeJoseon4.ensure(l).people[0];person.alive=true;person.atHome=false;
 force(l,'letter');const pendingCopy=Sim.Life.restore(copy(l.snapshot()));assert.equal(pendingCopy.pending,l.pending);assert.deepEqual(copy(pendingCopy.getChoice()),copy(l.getChoice()));assert.equal(l.choose(0),true);assert.equal(s.followups[0].relativeId,person.id);
 const restored=Sim.Life.restore(copy(l.snapshot()));const r=c.OneLifeJoseon4.ensure(restored).people.find(p=>p.id===person.id);r.alive=false;r.diedYear=1451;restored.year=1451;restored.age++;
 const bonds=restored.stats.bonds;H.settle(restored,H.ensure(restored));assert.equal(restored.stats.bonds,bonds);assert.match(restored.log.at(-1).text,/답을 듣지 못했다/);
});
test('enslaved households cannot freely start an independent crop or transport trade',()=>{
 const l=farm(life(1765));V5.ensure(l).origin='사노비';assert.equal(H.eligibility(l,'crop'),false);
 const rail=trader(life(1899,'남자','경기도'));V5.ensure(rail).origin='사노비';assert.equal(H.eligibility(rail,'rail'),true,'legal status distinctions ended in 1894');
});


test('policy dates change the levy calculation without minting an extra cash gift',()=>{
 for(const [year,region] of [[1608,'경기도'],[1750,'경상도']]){
  const l=farm(life(year-1,'남자',region,29));const j=J.ensure(l);j.capital=100;l.focus='balance';l.pending=null;
  assert.equal(J.yearly(l),true);assert.equal(j.capital,100+j.economy.yearlyIncome-j.economy.yearlyExpense);
 }
});
test('an economy memo cannot be appended after the death entry',()=>{
 const l=life(1650);J.ensure(l).capital=-50;l.finish('생을 마쳤다.');const n=l.log.length;J.recordEconomy(l);assert.equal(l.log.length,n);assert.equal(l.log.at(-1).kind,'death');
});

test('modern yearly finance never changes a dead life or appends a later money note',()=>{
 const l=new Sim.Life(338,{birthYear:1950,countryName:'대한민국'});c.OneLifeWorld8.ensure(l);l.age=24;l.year=1974;l.finish('생을 마쳤다.');const stats=copy(l.stats),money=copy(l.money),n=l.log.length;
 c.OneLifeWorld2.financialYear(l);assert.deepEqual(copy(l.stats),stats);assert.deepEqual(copy(l.money),money);assert.equal(l.log.length,n);
});
