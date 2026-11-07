'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(!['game.js','goryeo-view-v343.js'].includes(m[1]))vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const L=c.OneLifeSim.Life,G=c.OneLifeGoryeo343,W=c.OneLifeJoseonWomen327,J=c.OneLifeJoseon,Choice=c.OneLifeHistoryChoices11,W12=c.OneLifeWorld12;
const copy=x=>JSON.parse(JSON.stringify(x));
test('every Goryeo offered action has an authored past-tense account, not a copied button or title',()=>{
 const labels=[...fs.readFileSync(dir+'/goryeo-v343.js','utf8').matchAll(/option\('([^']+)'/g)].map(m=>m[1]);
 assert.equal(Object.keys(G.choiceProse).length,51);
 for(const label of labels){assert.equal(typeof G.choiceProse[label],'string',label);assert.match(G.choiceProse[label],/다\.$/);assert.ok(!G.choiceProse[label].includes(' — '));}
});
test('a declined Goryeo action cannot narrate a completed purchase or learning',()=>{
 const l=new L(17,{birthYear:1350,countryName:'대한민국'}),g=G.ensure(l);l.age=5;l.year=1355;g.grain=0;
 l.tick();const q=l.getChoice(),i=q.options.findIndex(o=>o.label==='글자를 배우고 싶다고 청한다');assert.ok(i>=0);
 g.grain=0;const knowledge=l.stats.knowledge;assert.equal(l.choose(i),true);
 assert.equal(l.stats.knowledge,knowledge);assert.equal(g.grain,0);
 assert.match(l.log.at(-1).text,/곡식이 모자라/);assert.doesNotMatch(l.log.at(-1).text,/배웠다|배우고 싶다고 청했다|청한다는/);
});
test('Goryeo family particles and annual accounts work before a child has a vocation',()=>{
 for(const id of ['mother','father']){
  const l=new L(41,{birthYear:1350,countryName:'대한민국'}),g=G.ensure(l);g.people.find(p=>p.id===id).health=0;
  l.age=4;l.year=1354;l.tick();const text=l.log.map(e=>e.text).join(' ');
  assert.match(text,id==='mother'?/어머니가 세상을 떠났다/:/아버지가 세상을 떠났다/);
  assert.match(text,/집안에 들어온 곡식은 \d+말이었다/);assert.doesNotMatch(text,/아직 정해지지 않음과|아버지이|어머니이|짜기과/);
 }
});
test('all 36 women occupation decisions narrate the chosen work while retaining existing skill, cost and progress',()=>{
 let total=0;const prose=new Set();
 for(const [profession,kind] of Object.entries(W.kinds))for(let task=0;task<kind.tasks.length;task++)for(let option=0;option<3;option++){
  const l=new L(101+task,{birthYear:1660,countryName:'대한민국',birthSetup:{gender:'여자'}});l.age=30;l.year=1690;l.pending=null;
  const s=W.ensure(l);s.profession=profession;s.skill=1;s.contacts=0;s.workDone=task;s.active='work';s.queue=[];l.pending='joseonWomen327:work';
  const capital=J.ensure(l).capital;assert.equal(W.resolve(l,option),true,profession+'/'+task+'/'+option);
  const record=l.log.findLast(e=>e.kind==='joseonWomen327-memory');assert.equal(record.text,W.WORK_OUTCOMES[profession][task][option]);
  assert.equal(s.skill,option===0?4:3);assert.equal(s.contacts,option===1?2:1);assert.equal(s.workDone,task+1);
  assert.equal(J.ensure(l).capital,Math.max(-120,Math.min(600,capital-(option===1?2:0))));
  assert.doesNotMatch(record.text,/일을 마쳤다\. 배운 방법|환자가 나았다|무사히 출산|승진했다/);prose.add(record.text);total++;
 }
 assert.equal(total,36);assert.equal(prose.size,36);
});
test('all 20 modern choice accounts describe action rather than guaranteed success',()=>{
 for(const [topic,options] of Object.entries(Choice.OPTIONS)){
  assert.equal(Choice.OUTCOMES[topic].length,options.length);
  for(const text of Choice.OUTCOMES[topic]){assert.match(text,/다\.$/);assert.doesNotMatch(text,/할 것이다|일자리를 얻었다|반드시|건강해졌다|집을 샀다/);}
 }
 for(let i=0;i<2;i++){
  const l=new L(72,{birthYear:1919,countryName:'대한민국'});l.age=17;l.year=1936;l.pending='v12:colonial-books';
  const s=W12.ensure(l);s.active={id:'colonial-books',year:l.year};assert.equal(W12.choose(l,i),true);
  assert.equal(l.log.findLast(e=>e.kind==='era-choice').text,Choice.OUTCOMES.study[i]);
  assert.doesNotMatch(l.log.findLast(e=>e.kind==='era-choice').text,/ — |배울 수 있다/);
 }
});
test('history choices become past intentions in both the live log and the final biography',()=>{
 const History=c.OneLifeHistoryEffects10;
 for(const [label,expected] of Object.entries(History.ACTION_ACCOUNTS)){
  const l=new L(24,{birthYear:1919,countryName:'대한민국'});l.age=27;l.year=1946;
  const scenario=label.includes('세운다')?'transition':'financial-crisis';
  const fact={id:scenario,scenario,year:l.year,title:'그해의 선택'};
  const choiceIndex=label.includes('가족·이웃')?2:1;
  assert.equal(History.apply(l,{decisions:[],tags:[],followups:[],hardship:0},fact,choiceIndex),true);
  const event=l.log.findLast(e=>e.kind==='history-choice');assert.ok(event.text.includes(expected));
  const paragraph=c.OneLifeBiography328.chapters({...l,alive:false,age:27,year:1946,deathReason:'갑작스러운 병을 앓은 뒤 세상을 떠났다.'}).join(' ');
  const biographyAction=label.includes('세운다')?expected.replace(/기로 했다$/,'기로 한 것은'):expected;
  assert.ok(paragraph.includes(biographyAction));assert.doesNotMatch(paragraph,/세운다\.|찾는다\./);
 }
});
test('Joseon stochastic deaths use a concrete engine cause instead of generic wording',()=>{
 const l=new L(28,{birthYear:1580,countryName:'대한민국'});J.ensure(l);l.age=54;l.year=1634;l.rand=()=>0;
 assert.equal(J.yearly(l),true);assert.equal(l.alive,false);
 assert.match(l.deathReason,/병|사고/);
 assert.doesNotMatch(l.deathReason,/오랜 세월을 지나 한 사람의 삶이 끝났다/);
});
test('old saved era followups are recounted from their actual dated choice, without old malformed title prose',()=>{
 const l=new L(91,{birthYear:1919,countryName:'대한민국'});l.year=1939;l.age=20;l.pending=null;
 const s=W12.ensure(l);s.processedYear=1939;s.decisions=[{id:'colonial-books',index:0,year:1937,age:18,topic:'study'}];
 s.followups=[{id:'colonial-books-0',year:1940,text:'당시에 새롭게 시도했던 이웃에게서 빌린 책의 경험이 지금의 삶을 바라보는 데 영향을 주었다.'}];
 const saved=copy(l.snapshot()),r=L.restore(copy(saved));W12.ensure(r).processedYear=1939;r.year=1940;r.age=21;r.pending=null;W12.afterYear(r);
 const e=r.log.findLast(e=>e.kind==='era-followup');assert.ok(e);assert.match(e.text,/1937년의 일이었다/);assert.match(e.text,/공부할 시간을 따로 냈다/);assert.doesNotMatch(e.text,/의 경험이 지금|이웃에게서 빌린 책의/);
});
test('the style review flags the actual malformed narrative templates without rewriting its input',()=>{
 const Audit=require(dir+'/text-style-audit.cjs');const text='삼베 짜기과 식구들의 일. 아버지이 세상을 떠났다. 그때 겪은 ‘짐을 잃다’을 떠올렸다.';
 const before=text;assert.ok(Audit.analyze(text).length>=3);assert.equal(text,before);
});
test('modern prompts use plain language and daily narration keeps a consistent narrator',()=>{
 const l=new L(31,{birthYear:2026,countryName:'대한민국'}),W9=c.OneLifeWorld9;
 for(const kind of ['repair','marriage','housing']){
  const p=W9.prompt(kind,l);assert.ok(p);assert.ok(p.options.length>=2);
  for(const o of p.options)assert.doesNotMatch(o.note,/유동성|순자산 감소|새롭게 정함|이어 감/);
 }
 const source=fs.readFileSync(dir+'/world-v9.js','utf8');
 for(const old of ['나도 뒤늦게 답이 보였다','다음 달은 아껴 써야겠다','모두 지나온 내 시간이다','서로 도운 경험이 관계에 남았다'])assert.ok(!source.includes(old));
});
