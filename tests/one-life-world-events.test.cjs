'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));
global.window.OneLifeWorld2=W2;
const W3=require(path.join(root,'world-v3.js'));
global.window.OneLifeWorld3=W3;
const W4=require(path.join(root,'world-v4.js'));
global.window.OneLifeWorld4=W4;
const W5=require(path.join(root,'world-v5.js'));
delete global.window;
const row=id=>W5.templates.find(x=>x.id===id);
const newLife=(country='대한민국',seed=912389)=>{
 const l=new Sim.Life(seed);
 l.country=Sim.COUNTRIES.find(c=>c[0]===country);
 assert.ok(l.country,country+' should exist');
 W5.ensure(l);return l;
};
function progress(life,choose=1){
 let steps=0;
 while(life.alive&&steps<110){
  if(life.pending){
   const choice=life.getChoice();
   assert.ok(choice,'decision must be present');
   assert.equal(life.choose(Math.min(choose,choice.options.length-1)),true);
  }else{life.tick();steps++;}
  assert.ok(Number.isFinite(life.money.netWorth));
 }
 assert.equal(life.alive,false,'infinite life');
 return life;
}
test('103 named countries and regional coverage; 300+ narrative variations',()=>{
 assert.ok(Sim.COUNTRIES.length>=103);
 assert.equal(W5.groupFor('모나코'),'westernEurope');
 assert.equal(W5.groupFor('인도'),'southAsia');
 assert.equal(W5.groupFor('대한민국'),'eastAsia');
 for(const c of Sim.COUNTRIES)assert.notEqual(W5.groupFor(c[0]),'other',c[0]);
 assert.ok(W5.templates.length>=80);
 assert.ok(W5.templates.every(e=>e.lines.length===3&&e.lines.every(x=>x.length>=10)));
 const unique=new Set(W5.templates.map(e=>e.id));
 assert.equal(unique.size,W5.templates.length);
 const narratives=W5.templates.reduce((s,e)=>s+e.lines.length,0)+
   W4.EVENTS.reduce((s,e)=>s+e.lines.length,0);
 assert.ok(narratives>=340);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/world-v5\.js\?v=\d+/);
 assert.match(html,/worldEventCount/);
 assert.match(html,/world-v5\.css/);
});
test('voluntary Sikh seva, Buddhist monastic life and secular community are selectable',()=>{
 for(const [index,faith] of [[0,'불교 수행'],[1,'시크교 봉사'],[2,'비종교적 지역 활동']]){
  const p=newLife('인도',815191+index);
  p.age=29;p.year=2026+29;p.pending=29;p.arc.community=4;
  const choice=p.getChoice();
  assert.match(choice.title,/수행/);
  assert.equal(choice.options.length,3);
  assert.equal(p.choose(index),true);
  assert.equal(p.world5.faith,faith);
  if(index===0){assert.ok(W5.eligible(p,row('india-monastic'))===true);}
  if(index===1){assert.ok(W5.eligible(p,row('india-langar'))===true);}
  assert.equal(p.arc.decisionCount,1);
 }
});
test('investment routes produce distinct gain, delisting/loss and recovery effects',()=>{
 const p=newLife('일본',234149);
 p.age=35;p.year=2061;
 p.money.netWorth=85000;
 const w=p.world5;
 w.investment='주식';w.investmentEntry=10000;
 assert.ok(W5.eligible(p,row('stocks-loss')));
 const base=p.money.netWorth;
 W5.apply(p,row('stocks-loss'));
 assert.equal(w.investment,'');
 assert.equal(p.money.netWorth,base-9000);
 assert.ok(W5.eligible(p,row('diversify-recover')));
 const r=newLife('미국',251134);
 r.age=35;r.year=2061;r.money.netWorth=85000;r.world5.investment='가상자산';r.world5.investmentEntry=10000;
 const money=r.money.netWorth;
 W5.apply(r,row('crypto-boom'));
 assert.equal(r.money.netWorth,money+60000);
 assert.ok(r.arc.tags.includes('crypto-boom'));
});
test('Korea military injury, recovery and the right to an accessible life are linked',()=>{
 const p=newLife('대한민국',129139);
 p.age=24;p.year=2050;p.world5.service='복무';
 p.arc.tags.push('border-duty');
 const event=row('korea-mine-injury');
 assert.equal(W5.eligible(p,event),true);
 W5.apply(p,event);
 assert.equal(p.world5.injury,true);
 assert.ok(W5.eligible(p,row('korea-accessibility')));
 W5.apply(p,row('korea-accessibility'));
 assert.ok(p.arc.tags.includes('rehabilitation'));
});
test('future Russian conflict is conditional, never the automatic fate of a nationality',()=>{
 const p=newLife('러시아',92182);p.age=26;p.year=2052;
 assert.ok(W5.eligible(p,row('russia-future-crisis')));
 assert.equal(p.world5.fictionalCrisis,false);
 assert.equal(W5.eligible(p,row('russia-drone-loss')),false);
 W5.apply(p,row('russia-future-crisis'));
 assert.ok(p.world5.fictionalCrisis);
 assert.ok(W5.eligible(p,row('russia-drone-loss')));
 W5.apply(p,row('russia-drone-loss'));
 assert.ok(W5.eligible(p,row('russia-recovery')));
});
test('children caught in a hypothetical local conflict have a protection and reintegration path',()=>{
 const p=newLife('콩고민주공화국',821903);
 p.age=13;p.year=2039;p.world5.fictionalCrisis=true;
 p.arc.tags.push('displaced');
 const dangerous=row('child-protection');
 assert.equal(W5.eligible(p,dangerous),true);
 W5.apply(p,dangerous);
 assert.ok(p.arc.tags.includes('child-protected'));
 assert.ok(W5.eligible(p,row('reintegration-study')));
 W5.apply(p,row('reintegration-study'));
 assert.ok(p.arc.learning>=3);
 assert.ok(p.arc.tags.includes('reintegration'));
});
test('USA school safety is support-focused and Monaco movement is legal',()=>{
 const p=newLife('미국',623721);p.age=12;
 assert.ok(W5.eligible(p,row('usa-bullying')));
 W5.apply(p,row('usa-bullying'));
 assert.ok(W5.eligible(p,row('usa-counseling')));
 W5.apply(p,row('usa-counseling'));
 const m=newLife('모나코',317001);m.age=24;
 assert.ok(W5.eligible(m,row('monaco-spain')));
 W5.apply(m,row('monaco-spain'));
 assert.ok(W5.eligible(m,row('monaco-civic')));
 assert.match(row('monaco-spain').lines.join(' '),/합법적으로/);
});
test('multi-country lifetime completion and repeated save/restore retain world stories',()=>{
 const places=['인도','미국','러시아','대한민국','콩고민주공화국','모나코','스페인','나이지리아'];
 let completed=0,checked=0;const seen=new Set();let stories=0;
 for(const country of places){
  for(let i=1;i<=100;i++){
   const p=newLife(country,Math.imul(i+52,2654435761)>>>0);
   while(p.alive){
    if(p.pending)p.choose((i+p.age)%p.getChoice().options.length);
    else p.tick();
    if(p.age===39&&p.alive&&!p.pending){
     const snapshot=JSON.parse(JSON.stringify(p.snapshot()));
     assert.deepEqual(Sim.Life.restore(snapshot).snapshot(),snapshot);
     checked++;
    }
   }
   for(const event of p.world5.seen)seen.add(event);
   stories+=p.world5.eventCount;completed++;
  }
 }
 assert.equal(completed,800);
 assert.ok(checked>600);
 assert.ok(seen.size>=35,'regional conditions all produce the same events');
 assert.ok(stories/completed>5,'too few narrative turns to diversify lives');
});
