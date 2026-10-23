'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),html=fs.readFileSync(dir+'/index.html','utf8'),c={console};
c.window=c;vm.createContext(c);
for(const m of html.matchAll(/<script src="\.\/([^?" ]+)/g)){
 if(['game.js','goryeo-view-v343.js'].includes(m[1]))continue;
 vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),c,{filename:m[1]});
}
const L=c.OneLifeSim.Life,F=c.OneLifeFate344,M=c.OneLifeMagistrate345,W=c.OneLifeWorld9,J=c.OneLifeJoseon,V5=c.OneLifeJoseon5;
function born(b=1700,seed=10){const l=new L(seed,{birthYear:b,countryName:'대한민국',birthSetup:{origin:'양반',gender:'남자'}});J.ensure(l);V5.ensure(l);return l;}
const later=(l,n)=>{l.age+=n;l.year+=n;return l;};
test('pass 1: untaken exam is not described as a failure or a retake',()=>{
 const l=later(born(1700,31),20);assert.equal(F.queue(l,'scholar'),true);assert.equal(l.choose(1),true);
 later(l,2);F.advance(l);assert.match(l.getChoice().description,/응시하지 않았다/);
 assert.match(l.getChoice().options[1].label,/처음 소과/);assert.equal(l.choose(1),true);
 assert.ok(l.log.some(x=>/처음으로 소과/.test(x.text)));
});
test('pass 2: an open choice cannot be silently overwritten or trigger a crop loss',()=>{
 const l=later(born(1800,37),25);assert.equal(F.queue(l,'scholar'),true);
 assert.equal(F.queue(l,'harvest'),false);assert.equal(l.pending,'joseon344:scholar');
 assert.equal(F.ensure(l).seen.includes('harvest'),false);
});
test('pass 3: a real stele is reflected by both magistrate and fate summaries',()=>{
 let found=false;
 for(let seed=1;seed<=65;seed++){
  const l=later(born(1690,seed),32);J.ensure(l).office=true;V5.ensure(l).rank=2;
  assert.equal(F.queue(l,'magistrate'),true);assert.equal(l.choose(0),true);
  for(let i=0;i<4;i++){later(l,1);assert.equal(M.schedule(l),true);assert.equal(l.choose(0),true);}
  later(l,2);assert.equal(M.schedule(l),true);assert.equal(l.choose(0),true);
  if(M.ensure(l).judgment!=='monument')continue;
  assert.equal(F.ensure(l).memorial,'raised');assert.match(F.summary(l).title,/송덕비/);
  assert.equal(L.restore(JSON.parse(JSON.stringify(l.snapshot()))).joseon344.memorial,'raised');
  found=true;break;
 }
 assert.ok(found,'memorial outcome was unreachable');
});
test('pass 4: future records do not invent a completed fabric sale',()=>{
 const t=fs.readFileSync(dir+'/joseon-women-v326.js','utf8');
 assert.ok(t.includes('전에 옷감을 내놓았던 장터'));
 assert.ok(!t.includes('지난번 옷감을 팔던 장터'));
 assert.ok(t.includes('예전에 식구들과 적어 둔 이야기를 다시 펼쳐 읽었다'));
});
test('pass 5: historical childhood choices have era-appropriate activities',()=>{
 const l=later(born(1610,93),7),opts=W.prompt('hobby',l);
 assert.deepEqual(JSON.parse(JSON.stringify(opts.options.map(o=>o.label))),['씨름','윷놀이','그림','노래']);
 W.ensure(l).activeChoice={id:'choose-hobby',choice:'hobby'};l.pending='v9:choose-hobby';
 assert.equal(l.choose(1),true);assert.equal(W.ensure(l).hobby,'윷놀이');
 const copy=L.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(W.ensure(copy).hobby,'윷놀이');
});
test('historic early careers and school days avoid modern occupations',()=>{
 const l=later(born(1610,132),20);l.pending=20;assert.equal(l.choose(0),true);
 assert.equal(l.career,'배움을 이어 가는 사람');
 const w=later(born(1710,219),29);w.pending=29;assert.equal(w.choose(0),true);
 assert.equal(w.career,'맡은 생업을 이어 가는 사람');
 const child=later(born(1610,322),10);child.pending=10;assert.match(child.getChoice().title,/열 살의 하루/);
});
test('tax narration does not use known empty or ungrammatical formulas',()=>{
 const t=fs.readFileSync(dir+'/joseon-v18-sedo-samjeong.js','utf8');
 for(const bad of ['쉽게 바뀌지 않다','조정의 방과 실제 고을','마음이 편하지만 압력은 남았다','고을 사람들의 뜻을 모아 올렸다'])
 assert.ok(!t.includes(bad),bad);
});
