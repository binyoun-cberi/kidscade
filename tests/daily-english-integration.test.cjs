const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../games/daily_english/content.js');
const L=require('../games/daily_english/legacy-bridge.js');
const root=path.resolve(__dirname,'..');
const fakeStore=initial=>{const map=new Map(Object.entries(initial));return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};

test('old English mastery is reused without deleting Japanese and Chinese progress',()=>{
  const original={courses:{en:{xp:223,lessons:{'en:u0:l0':{complete:true}}},ja:{xp:101}},items:{'engWords:0':{mastery:2,seen:3,dueAt:1},'ja:7':{mastery:5,seen:4}},studyDays:['2026-10-19']};
  const st=fakeStore({[L.KEY]:JSON.stringify(original)}),before=L.summary(st,5000);
  assert.equal(before.xp,223);assert.equal(before.finished,1);assert.deepEqual(before.keys,['engWords:0']);
  assert.equal(L.record(st,'engWords:0',true,5000),true);
  const p=JSON.parse(st.getItem(L.KEY));assert.equal(p.courses.en.xp,223);assert.equal(p.courses.ja.xp,101);assert.deepEqual(p.items['ja:7'],original.items['ja:7']);
  assert.equal(p.items['engWords:0'].mastery,3);assert.equal(p.items['engWords:0'].seen,4);
  assert.equal(L.record(st,'ja:7',false),false);
});
test('review questions keep original arcade expression identifiers',()=>{
  const keys=Array.from({length:8},(_,i)=>`engWords:${i}`);
  const qs=C.reviewQuestions(keys,()=>.3);
  assert.equal(qs.length,8);assert.deepEqual(qs.map(q=>q.legacyKey),keys);
  assert.equal(C.reviewQuestions(['ja:0']).length,0);
});
test('the old English entry redirects while Japanese and Chinese courses remain',()=>{
  const html=fs.readFileSync(path.join(root,'games/language_arcade/월드 랭귀지 아케이드.html'),'utf8');
  const index=fs.readFileSync(path.join(root,'games/daily_english/index.html'),'utf8');
  assert.match(html,/if\(id==='en'\)\{location\.assign\('\.\.\/daily_english\/index\.html'\)/);
  for(const marker of ["ja:{id:'ja'","zh:{id:'zh'",'arcade-bank.js','legacy-bridge.js','id="memory-start"','id="listening-start"'])assert.ok((html+index).includes(marker),marker);
});
