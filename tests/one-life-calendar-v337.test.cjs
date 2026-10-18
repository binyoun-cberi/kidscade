'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games/high_one_life');
function setup(){
 const c={console};c.window=c;vm.createContext(c);
 const html=fs.readFileSync(root+'/index.html','utf8');
 for(const m of html.matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(root+'/'+m[1],'utf8'),c,{filename:m[1]});
 return c;
}
const c=setup(),Cal=c.OneLifeCalendar337;
function born(year=1608,gender='여자'){const l=new c.OneLifeSim.Life(7184,{birthYear:year,countryName:'대한민국',birthSetup:{gender}});c.OneLifeWorld8.ensure(l);return l;}
const clean=x=>JSON.parse(JSON.stringify(x));
test('all 27 monarchs have accession events and regnal-year-one never shifts the accession',()=>{
 assert.equal(Cal.REIGNS.length,28); // Gojong appears again on becoming emperor.
 for(const [year,name,title] of Cal.REIGNS){
  assert.ok(Cal.forYear(year).some(e=>e.title===title));
  assert.ok(Cal.ruler(year).endsWith(name)||Cal.ruler(year)===name+' 재위');
 }
 assert.match(Cal.ruler(1398),/태조 → 정종/);assert.match(Cal.ruler(1400),/정종 → 태종/);
 assert.equal(Cal.ruler(1419),'세종 재위');assert.match(Cal.ruler(1907),/고종 황제 → 순종 황제/);
 assert.equal(Cal.ruler(1910),null);
 assert.match(Cal.forYear(1506).find(e=>e.title==='중종반정').detail,/폐위/);
 assert.match(Cal.forYear(1623).find(e=>e.title==='인조반정').detail,/폐위/);
});
test('creation, publication and local introduction keep their independently documented dates',()=>{
 for(const [year,title] of [[1443,'훈민정음 창제'],[1446,'훈민정음 반포'],[1610,'동의보감 완성'],[1613,'동의보감 간행'],[1887,'경복궁 전등 점등'],[1899,'한성 전차 운행 시작'],[1899,'경인선 일부 개통']]){
  assert.ok(Cal.forYear(year).some(e=>e.title===title),title);
  assert.ok(!Cal.forYear(year-1).some(e=>e.title===title));
 }
 assert.ok(Cal.forYear(1608).length>=2);assert.ok(Cal.forYear(1899).length>=2);
 const y1960=Cal.forYear(1960).map(e=>e.title);assert.ok(y1960.indexOf('4·19혁명')<y1960.indexOf('이승만 하야'));
 const events=Cal.events();assert.equal(new Set(events.map(e=>e.year+'|'+e.title)).size,events.length);
 for(const e of events)assert.match(e.source,/^https:\/\/(?:sillok\.history\.go\.kr|contents\.history\.go\.kr|www\.korean\.go\.kr|encykorea\.aks\.ac\.kr|webzine\.nfm\.go\.kr|theme\.archives\.go\.kr|www\.archives\.go\.kr|www\.kdca\.go\.kr|www\.bok\.or\.kr)\//);
});
test('annual facts preserve resources and agency, including children and people abroad',()=>{
 const l=born(1608),stats=clean(l.stats),money=clean(l.money),pending=l.pending;
 assert.ok(Cal.record(l)>0);assert.equal(l.pending,pending);assert.deepEqual(clean(l.stats),stats);assert.deepEqual(clean(l.money),money);
 assert.ok(l.log.some(e=>e.kind==='history'&&e.year===1608&&e.text.includes('광해군 즉위')));
 assert.equal(Cal.record(l),0);
 const travel=born(1899);travel.travel22={residence:{abroad:true}};
 assert.ok(Cal.record(travel)>0);assert.deepEqual(clean(travel.stats),clean(born(1899).stats));
 assert.ok(travel.log.filter(e=>e.kind==='history').every(e=>!/(?:나는 전차를|우리 집에 전등|직접 목격)/.test(e.text)));
});
test('real script order emits all facts once at birth and on a new year, and reload never repeats them',()=>{
 const l=born(1608);l.tick();
 const facts=l.log.filter(e=>e.kind==='history'&&e.year===1608);
 assert.ok(facts.some(e=>e.text.includes('광해군 즉위')));assert.ok(facts.some(e=>e.text.includes('대동법')));
 assert.equal(facts.filter(e=>e.text.includes('대동법 경기도 첫 시행')).length,1);
 const cp=c.OneLifeSim.Life.restore(clean(l.snapshot()));
 const before=cp.log.filter(e=>e.kind==='history').length;assert.equal(Cal.record(cp),0);assert.equal(cp.log.filter(e=>e.kind==='history').length,before);
 const newYear=born(1898);newYear.pending=null;newYear.alive=true;assert.equal(newYear.tick(),true);
 assert.equal(newYear.year,1899);assert.ok(newYear.log.some(e=>e.kind==='history'&&e.text.includes('한성 전차')));
 const foreign=new c.OneLifeSim.Life(81,{birthYear:1899,countryName:'일본'});foreign.country=['일본'];assert.equal(Cal.record(foreign),0);
});
test('old saves do not receive invented prior-year encounters and entries keep exact sources after restore',()=>{
 const l=born(1600);l.year=1608;l.age=8;l.pending=null;
 const before=l.log.length;Cal.record(l);
 assert.ok(l.log.slice(before).every(e=>e.year===1608));assert.ok(!l.log.slice(before).some(e=>e.text.includes('선조 즉위')));
 const restored=c.OneLifeSim.Life.restore(clean(l.snapshot()));
 const entry=restored.log.find(e=>e.kind==='history'&&e.text.includes('대동법 경기도 첫 시행'));
 assert.equal(Cal.matchEntry(entry).source,'https://contents.history.go.kr/front/hm/view.do?levelId=hm_102_0040');
 assert.equal(Cal.matchEntry({kind:'joseon-choice',year:1608,text:entry.text}),null);
});
test('mobile yearly facts, accessible past chronology and individual source links are connected',()=>{
 const html=fs.readFileSync(root+'/index.html','utf8'),game=fs.readFileSync(root+'/game.js','utf8');
 for(const id of ['calendar337Title','calendar337Year','calendar337Current','calendar337Past'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.indexOf('history-calendar-v337.js')>html.indexOf('joseon-women-v327.js'));
 assert.ok(html.indexOf('history-calendar-v337.js')<html.indexOf('game.js?'));
 assert.match(game,/e.year>=life.birthYear&&e.year<=life.year/);assert.match(game,/Calendar\?\.matchEntry\(entry\)/);
 assert.ok(html.indexOf('id="decision"')<html.indexOf('aria-labelledby="calendar337Title"'));
 assert.ok(html.includes('id="calendar337End"'));
});

test('public history never appears after the final death record',()=>{
 const l=born(1608);l.finish('세상을 떠났다.');const length=l.log.length;assert.equal(Cal.record(l),0);assert.equal(l.log.length,length);assert.equal(l.log.at(-1).kind,'death');
});

test('every catalogued year emits all of its facts exactly once and survives a save',()=>{
 for(const year of new Set(Cal.events().map(e=>e.year))){
  const l=born(year);Cal.record(l);const expected=Cal.forYear(year);
  for(const event of expected){
   const prefix=year+'년 · '+event.title+' — ';
   assert.equal(l.log.filter(e=>e.kind==='history'&&e.year===year&&e.text.startsWith(prefix)).length,1,event.title);
  }
  const restored=c.OneLifeSim.Life.restore(clean(l.snapshot()));assert.ok(restored);assert.equal(Cal.record(restored),0,year);
 }
});
