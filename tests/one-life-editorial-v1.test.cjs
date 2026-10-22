'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../games/high_one_life');
const file=n=>fs.readFileSync(path.join(base,n),'utf8');
test('historical words are brief and belong in the story, not a measurement textbook',()=>{
 const html=file('index.html'),gloss=html.slice(html.indexOf('<details id="historicalUnits"'),html.indexOf('<div class="playing-top">'));
 assert.ok(gloss.length<1100,'history glossary should fit a short phone panel');
 for(const phrase of ['곡식 한 말','옷감 한 필','밭 한 마지기','자와 치'])assert.ok(gloss.includes(phrase));
 for(const phrase of ['실제 리터 환산값','단일한 리터값','조선 전기 추정치','역사적 측정값','게임의 곡식·땅·돈 수치는'])
  assert.ok(!gloss.includes(phrase),phrase+' must not intrude on play');
 assert.ok(!html.includes('모든 인생은 한반도에서 시작하며'));
});
test('period resource numbers display in period terms without lecture-style warnings',()=>{
 const goryeo=file('goryeo-view-v343.js'),era=require(path.join(base,'ending-era-summary-v1.js'));
 assert.match(goryeo,/g\.grain\+'말'/);
 assert.match(goryeo,/g\.cloth\+'필'/);
 assert.match(goryeo,/g\.pocket\+'냥'/);
 const a={birthYear:1280,eraSummary:{era:'goryeo',household:{partner:0,children:2},
  resources:{grain:3,pocket:1,land:2}}};
 const row=era.rows(a,a);
 assert.ok(row.some(x=>x[0]==='곡식'&&x[1]==='3말'));
 assert.ok(row.some(x=>x[0]==='장터 돈'&&x[1]==='1냥'));
 assert.ok(row.some(x=>x[0]==='밭'&&x[1]==='2마지기'));
 assert.ok(row.every(x=>!x[0].includes('게임 속 수치')));
});