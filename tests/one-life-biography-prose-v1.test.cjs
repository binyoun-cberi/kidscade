'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),B=require(dir+'/biography-v328.js');
const event=(age,text,kind='event',causeId)=>({age,year:1740+age,text,kind,...(causeId?{causeId}:{})});
const person=(log,extra={})=>({birthYear:1740,year:1800,age:60,alive:false,profile:{name:'박송'},birthSetup:{origin:'상민'},deathReason:'갑작스러운 병을 앓은 뒤 세상을 떠났다.',log,...extra});
test('biography has a named beginning, several moments per paragraph, and the actual last year and death',()=>{
 const l=person([event(8,'그림에 흥미를 붙였다.','decision'),event(10,'친구와 함께 그림을 그렸다.','relationship'),event(20,'장터에서 삼베를 팔았다.','profession'),event(30,'고향으로 돌아왔다.','travel22-return')]);
 const p=B.portrait(l,{place:'전라도'}),text=p.paragraphs.join('\n');
 assert.equal(p.title,'박송의 생애');assert.match(text,/1740년, 전라도에서 박송이 태어났다/);assert.match(text,/상민이었다/);
 assert.ok(p.paragraphs.some(x=>x.includes('그림에 마음이')&&x.includes('친구와 함께')));
 assert.match(p.paragraphs.at(-1),/1800년, 60세.*갑작스러운 병/);
 assert.doesNotMatch(text,/ — |몇 세 무렵|undefined|NaN|장엄한|위대한|불멸/);
});
test('a selected action remains intent and only its own linked outcome is recalled',()=>{
 const log=[event(20,'장터의 일 — 삼베와 모시 짜는 일을 배운다','goryeo-choice','weaving'),
  event(20,'이웃에게 길을 물었다.','decision','road'),event(23,'짠 옷감을 장에 내다 팔았다.','goryeo-followup','weaving')];
 const l=person(log),text=B.chapters(l).join(' '),scenes=B.portrait(l).scenes;
 assert.match(text,/삼베와 모시 짜는 일을 배우기로/);assert.doesNotMatch(text,/삼베와 모시 짜는 일을 배웠다/);
 assert.ok(scenes.some(e=>e.causeId==='weaving'&&e.age===20));assert.ok(scenes.some(e=>e.causeId==='weaving'&&e.age===23));
 assert.ok(text.indexOf('삼베와 모시')<text.indexOf('짠 옷감'));
});
test('different lives preserve their concrete differences instead of sharing an invented moral',()=>{
 const loom=B.chapters(person([event(14,'삼베 짜는 일을 배웠다.','profession'),event(30,'짠 옷감을 팔았다.','profession')])).join(' ');
 const exile=B.chapters(person([event(14,'전란 중 포로로 끌려갔다.','joseon14-captivity'),event(30,'고향으로 돌아왔다.','travel22-return')])).join(' ');
 assert.match(loom,/삼베/);assert.doesNotMatch(loom,/포로|고향으로 돌아/);assert.match(exile,/포로/);assert.doesNotMatch(exile,/삼베|옷감을 팔/);
});
test('historical action headlines and multi-sentence choices read as past intentions without doubled grammar',()=>{
 const prepare=B.chapters(person([event(20,'1950년 한국전쟁 발발. 가족과 피란·연락 방법을 준비한다. 안전을 위한 이동과 생활비를 마련했다.','history-choice')])).join(' ');
 assert.match(prepare,/준비하기로/);assert.match(prepare,/생활비를 마련했다/);assert.doesNotMatch(prepare,/준비한다|한국전쟁 발발\./);
 const stay=B.chapters(person([event(20,'살던 곳 — 익숙한 집과 사람들 곁에서 버텨 보기로 한다','care13-choice')])).join(' ');
 assert.match(stay,/버텨 보기로/);assert.doesNotMatch(stay,/하기로 하기로|보기로 하기로|한다/);
});
test('background history and current-state data cannot invent personal experience or an earlier career',()=>{
 const l=person([event(1,'한국전쟁이 일어났다.','history'),event(4,'전쟁이 끝났다.','goryeo-fact'),event(8,'집안에서 글을 배웠다.','event')],{career:'의사',profile:{name:'박송',partner:true,child:true}});
 const text=B.chapters(l).join(' ');assert.match(text,/글을 배웠/);assert.doesNotMatch(text,/한국전쟁|전쟁이 끝|의사|결혼|자녀|아이를 낳/);
});
test('short lives have no fabricated adulthood, profession, marriage or bereaved family',()=>{
 const infant=person([],{age:0,year:1740,deathReason:'어린 나이에 갑작스러운 병을 앓다가 세상을 떠났다.'});
 const text=B.chapters(infant).join(' ');assert.match(text,/태어난 해에 삶이 끝났다/);assert.match(text,/갑작스러운 병/);
 assert.doesNotMatch(text,/자랐다|어른|청년|노년|가족들은|품에 안|평생 일|중간 기록/);
 const noCause=B.chapters(person([],{age:2,year:1742,deathReason:''})).join(' ');assert.match(noCause,/사망 원인은 전해지지/);assert.doesNotMatch(noCause,/사고|폐렴|전란/);
});
test('repeated annual lines and HUD numbers cannot drown out a turning point',()=>{
 const log=Array.from({length:45},(_,i)=>event(i+14,'장터에서 물건을 팔았다.','profession'));
 log.push(event(31,'전쟁을 피해 고향을 떠났다.','travel22-depart'),event(35,'고향으로 돌아왔다.','travel22-return'),event(32,'건강 +2, 행복 -1','decision-effect'));
 const p=B.portrait(person(log)),text=p.paragraphs.join(' ');
 assert.equal((text.match(/장터에서 물건을 팔았다/g)||[]).length,1);assert.match(text,/고향을 떠났/);assert.match(text,/고향으로 돌아/);assert.doesNotMatch(text,/건강 \+2/);
 assert.ok(p.scenes.every((e,i,a)=>!i||e.age>=a[i-1].age));
});
test('old and malformed snapshots are handled without backdating future events',()=>{
 const l=person([null,event(70,'미래의 일이었다.'),event(-1,'태어나기 전 일을 했다.'),event(8,'undefined를 만났다.'),event(9,'집안에서 글을 배웠다.')]);
 const text=B.chapters(l).join(' ');assert.match(text,/글을 배웠/);assert.doesNotMatch(text,/미래의|태어나기 전|undefined/);
 assert.doesNotThrow(()=>B.chapters({log:null}));
});
test('rendering is deterministic, does not mutate a life, and survives JSON restore exactly',()=>{
 const l=person([event(8,'집안에서 글을 배웠다.'),event(25,'장부를 썼다.','profession')]);l.rng=12345;
 const before=JSON.stringify(l),first=B.portrait(l);for(let i=0;i<5;i++)assert.deepEqual(B.portrait(l),first);
 assert.equal(JSON.stringify(l),before);assert.deepEqual(B.portrait(JSON.parse(before)),first);
});
test('real module stack supplies varied adult and short biographies across four eras without changing snapshots',()=>{
 const c={console};c.window=c;vm.createContext(c);
 for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(!['game.js','goryeo-view-v343.js'].includes(m[1]))vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
 let total=0,choices=0,short=0,adults=0;const outputs=new Set();
 for(const year of [1270,1580,1740,1919,2026])for(let seed=1;seed<=20;seed++){
  const l=new c.OneLifeSim.Life(seed,{birthYear:year,countryName:'대한민국'});let steps=0;
  while(l.alive&&steps++<600){const q=l.getChoice();if(q){l.choose((seed+l.age)%q.options.length);choices++;}else if(l.getReflection())l.reflect('');else l.tick();}
  assert.equal(l.alive,false);const before=JSON.stringify(l),p=c.OneLifeBiography328.portrait(l),text=p.paragraphs.join(' ');
  assert.equal(JSON.stringify(l),before);assert.doesNotMatch(text,/ — |undefined|NaN|\[object Object\]/);assert.ok(text.includes(l.deathReason));
  assert.equal(JSON.stringify(c.OneLifeBiography328.portrait(JSON.parse(before))),JSON.stringify(p));
  assert.ok(p.scenes.every(e=>e.age<=l.age));assert.ok(p.scenes.every((e,i,a)=>!i||e.age>=a[i-1].age));
  outputs.add(text);if(l.age<13)short++;if(l.age>=30)adults++;total++;
 }
 assert.equal(outputs.size,total);assert.ok(short>0);assert.ok(adults>0);console.log(JSON.stringify({biographies:total,choices,short,adults}));
});
