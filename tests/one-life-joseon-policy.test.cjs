'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=W2;
const P=require(path.join(root,'joseon-history-policy.js'));global.window.OneLifeJoseonPolicy=P;
const J=require(path.join(root,'joseon-v1.js'));global.window.OneLifeJoseon=J;
const V2=require(path.join(root,'joseon-v2.js'));global.window.OneLifeJoseon2=V2;
const V3=require(path.join(root,'joseon-v3.js'));global.window.OneLifeJoseon3=V3;
const V4=require(path.join(root,'joseon-v4.js'));global.window.OneLifeJoseon4=V4;
const V5=require(path.join(root,'joseon-v5.js'));delete global.window;
const born=(year,seed)=>{const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});if(J.isJoseon(l)){J.ensure(l);V2.ensure(l);V3.ensure(l);V4.ensure(l);V5.ensure(l);}return l;};
function advance(l,target,policy=0){
 let count=0;
 while(l.alive&&l.year<target){
  assert.ok(++count<280,'stalled '+l.year+' '+l.pending);
  if(l.pending){const p=l.getChoice();
   if(p)assert.equal(l.choose(policy%p.options.length),true);
   else if(l.getReflection())assert.equal(l.reflect(''),true);
   else assert.fail('unexpected '+l.pending);
  }else assert.equal(l.tick(),true);
 }
 return l;
}
test('Daedong begins in Gyeonggi in 1608, not in 1750',()=>{
 assert.equal(P.tribute(1607,'경기도').kind,'tribute');
 assert.equal(P.tribute(1608,'경기도').kind,'daedong');
 assert.equal(P.tribute(1665,'경기도').kind,'daedong');
});
test('province-specific Daedong chronology keeps inland Jeolla and Gyeongsang later',()=>{
 for(const [region,year] of [['강원도',1623],['충청도',1651],['전라도',1662],['함경도',1666],['경상도',1678],['황해도',1708]]){
  assert.notEqual(P.tribute(year-1,region).kind,'daedong',region);
  assert.equal(P.tribute(year,region).kind,'daedong',region);
 }
});
test('Pyeongan and Hanyang are not treated as ordinary provincial Daedong districts',()=>{
 for(const year of [1400,1608,1665,1750,1850]){
  assert.equal(P.tribute(year,'평안도').kind,'pyeongan');
  assert.equal(P.tribute(year,'한양').kind,'capital');
 }
});
test('pre-1871 yangban do not pay ordinary commoner military tax in 1732',()=>{
 assert.equal(P.military(1732,'문반 양반','남자').eligible,false);
 assert.equal(P.military(1732,'무반 양반','남자').eligible,false);
 assert.equal(P.military(1732,'소작 농가','남자').eligible,true);
});
test('1750 reduction and 1871 household tax change the bearer, not just the title',()=>{
 assert.equal(P.military(1749,'소작 농가','남자').kind,'gunpo');
 assert.equal(P.military(1750,'소작 농가','남자').kind,'gyunyeok');
 assert.ok(P.military(1750,'소작 농가','남자').cost<P.military(1749,'소작 농가','남자').cost);
 assert.equal(P.military(1870,'문반 양반','남자').eligible,false);
 assert.equal(P.military(1871,'문반 양반','남자').kind,'hopo');
 assert.equal(P.military(1871,'소작 농가','여자').kind,'hopo');
 assert.equal(P.military(1871,'사노비','남자').kind,'hopo');
});
test('one generic kingdom-wide male-draft rule no longer controls regional taxes',()=>{
 const code=fs.readFileSync(path.join(root,'joseon-v5.js'),'utf8');
 assert.match(code,/P\.military\(life\.year,origin,life\.gender\)/);
 assert.match(code,/P\.tribute\(life\.year,j\.region\)/);
 assert.doesNotMatch(code,/life\.year>=1750\?'대동미/);
});
test('a baekjeong family before 1423 is named by its earlier historical category',()=>{
 assert.equal(P.originLabel(1422,'백정'),'화척·재인 계열 가계');
 assert.equal(P.originLabel(1423,'백정'),'백정');
});
test('early Joseon specialized professions are not automatically a mature Jungin estate',()=>{
 assert.equal(P.originLabel(1450,'역관 가계'),'통역을 맡은 역관 가계');
 assert.equal(P.originLabel(1450,'서리 가계'),'관아의 서리 가계');
 assert.equal(P.originLabel(1700,'역관 가계'),'역관 가계');
});
test('legally free children may be born to slave-descended families after 1886',()=>{
 assert.equal(P.legalStatus(1860,'사노비',1860),'천인');
 assert.equal(P.legalStatus(1890,'사노비',1890),'양인 (노비 출신 가계)');
 assert.equal(P.legalStatus(1860,'사노비',1894),'법적 신분 구별 폐지');
 assert.equal(P.childStatus(1885,true,true),'천인');
 assert.equal(P.childStatus(1886,true,true),'양인');
 assert.equal(P.childStatus(1740,false,true),'양인');
 assert.equal(P.childStatus(1740,true,false),'천인');
 let descendants=0;
 for(let i=1;i<=3400;i++){const l=born(1890,891*i);if(V5.summary(l).origin==='노비 후손 가계'){descendants++;assert.equal(V5.summary(l).legal,'양인');assert.equal(V5.summary(l).freed,false,'born free should not be described as personally freed');}}
 assert.ok(descendants>0,'post-1886 legally free descendants must be represented');
});
test('1801 frees central-agency slaves but not every provincial office slave',()=>{
 const a=born(1760,14),b=born(1760,15);
 const sa=V5.ensure(a),sb=V5.ensure(b);
 for(const s of [sa,sb]){s.origin='공노비';s.freed=false;s.legal='천인';}
 sa.publicOffice='중앙 관서';sb.publicOffice='지방 관아';
 for(const l of [a,b]){l.year=1801;l.age=41;l.pending=null;J.ensure(l).active=null;}
 V5.prepare(a,sa);V5.prepare(b,sb);
 assert.equal(sa.freed,true);
 assert.equal(sb.freed,false);
 assert.equal(V5.summary(a).legal,'양인');
 assert.equal(V5.summary(b).legal,'천인');
});
test('random royal relatives cannot displace a documented monarch',()=>{
 for(const year of [1418,1494,1608,1674,1776,1863]){
  assert.equal(P.royalSuccession(year,year-26,'왕실 종친','남자').allowed,false);
 }
 assert.equal(P.canInspect('왕실 종친',5,true,'왕',1679),false);
 assert.equal(P.canInspect('문반 양반',2,true,'관료',1679),true);
 assert.equal(P.canInspect('문반 양반',2,false,'관료',1679),false);
});
test('a female from an interpreter family learns languages, not automatic official appointment',()=>{
 const l=born(1710,18);l.gender='여자';
 const s=V5.ensure(l);s.origin='역관 가계';s.originLabel=V5.ORIGINS['역관 가계'].label;s.trade=V5.ORIGINS['역관 가계'].trade;
 l.age=15;l.year=1725;const j=J.ensure(l);
 j.active={id:'vocation-audit',kind:'vocation',year:l.year};l.pending='joseon:vocation-audit';
 const p=l.getChoice(),idx=p.options.findIndex(x=>x.action==='workTrade');
 assert.ok(idx>=0);assert.equal(l.choose(idx),true);
 assert.notEqual(V5.summary(l).role,'역관');
 assert.match(V5.summary(l).role,/통역|외국어/);
});
test('a child born into an enslaved family after the reforms is legally free',()=>{
 const l=born(1850,77),s=V5.ensure(l),j=J.ensure(l);
 s.origin='사노비';s.freed=false;j.married=true;j.children=1;
 l.year=1886;l.age=36;
 const family=V4.ensure(l);
 // Child legal status is recorded when the household creates a new relative.
 const child=V4.summary(l).people.find(p=>p.role==='child');
 if(child&&child.age===0)assert.equal(child.legal,'양인');
 assert.equal(P.childStatus(1886,true,true),'양인');
});
test('simulated Joseon lives preserve legal status and family history across saves',()=>{
 let total=0;
 for(const year of [1392,1450,1600,1650,1700,1750,1800,1870,1890,1897,1919]){
  for(let seed=1;seed<=40;seed++){
   const l=advance(born(year,year+seed*73),year+93,seed%3);
   const restore=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.equal(restore.pending,l.pending);
   if(J.isJoseon(l)){
    assert.deepEqual(V5.summary(restore),V5.summary(l));
    assert.deepEqual(V4.summary(restore).people,V4.summary(l).people);
    assert.notEqual(V5.summary(l).role,'왕','fictional monarch generated');
    assert.ok(V5.ensure(l).queue.length<=7);
   }else assert.equal(V5.summary(l),null);
   total++;
  }
 }
 assert.equal(total,440);
});
test('script load order and policy provenance remain visible',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('joseon-history-policy.js')<html.indexOf('joseon-v1.js'));
 assert.ok(html.indexOf('joseon-v1.js')<html.indexOf('joseon-v4.js'));
 assert.ok(P.SOURCES.tax.includes('encykorea.aks.ac.kr'));
});
