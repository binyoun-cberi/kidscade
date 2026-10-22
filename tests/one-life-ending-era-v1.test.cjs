'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const era=require(path.join(root,'ending-era-summary-v1.js'));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
test('Goryeo summary uses actual surviving family and recorded abstract grain/land counts',()=>{
 const life={birthYear:1280,year:1340,goryeo343:{grain:17,pocket:4,land:2,
 people:[{role:'배우자',alive:true,birthYear:1282},{role:'자녀',alive:true,birthYear:1330},
 {role:'자녀',alive:false,birthYear:1326},{role:'자녀',alive:true,birthYear:1341},
 {role:'어머니',alive:true,birthYear:1260}]}};
 const previous=clone(life);const a=era.capture(life);
 assert.deepEqual(a,{era:'goryeo',resources:{grain:17,pocket:4,land:2},
 household:{partner:1,children:1}});
 const now=era.capture({...life,goryeo343:{...life.goryeo343,grain:12}});
 const r=era.rows({country:'대한민국',family:'농가',age:60,career:'농사',eraSummary:a},
 {country:'대한민국',family:'농가',age:60,career:'농사',eraSummary:now},()=>{throw Error('modern currency must never be formatted');});
 assert.ok(r.some(x=>x[0]==='곡식'&&x[1]==='17말'&&x[2]==='12말'));
 assert.ok(r.some(x=>x[0]==='밭'&&x[1]==='2마지기'));
 assert.ok(r.some(x=>x[0]==='가족·관계'&&x[1].includes('자녀 1명')));
 assert.ok(!r.some(x=>x[0]==='최종 순자산'||x[0]==='출생 주거'));
 assert.deepEqual(life,previous,'summarizing a life must not mutate it');
});
test('Joseon summary reads the actual capital and granary, not netWorth×100 as cash',()=>{
 const life={birthYear:1620,year:1672,joseon:{capital:-8,land:2},joseon2:{grain:0},
 joseon4:{people:[{role:'배우자',alive:false},{role:'자녀',alive:true,birthYear:1645}]}};
 const info=era.capture(life);
 assert.deepEqual(info.resources,{capital:-8,grain:0});
 assert.deepEqual(info.household,{partner:0,children:1});
 const rows=era.rows({birthYear:1620,eraSummary:info},
  {birthYear:1620,eraSummary:{...info,resources:{capital:7,grain:5}}});
 assert.ok(rows.some(x=>x[0]==='살림 밑천'&&x[1]==='-8냥'&&x[2]==='7냥'));
 assert.ok(rows.some(x=>x[0]==='곡식'&&x[1]==='0말'&&x[2]==='5말'));
 assert.ok(rows.every(x=>!x[0].includes('순자산')));
});
test('older saves missing era details show absent information, never fake inventory',()=>{
 const modernFields={birthYear:1295,country:'대한민국',family:'보통',age:35,
 netWorth:999,housing:'가족이 소유한 집',child:true,partner:true};
 const newer={...modernFields,eraSummary:era.capture({birthYear:1295,year:1330,goryeo343:{grain:9,pocket:1,land:0,people:[]}})};
 const rows=era.rows(modernFields,newer,()=>{throw Error('no credits in Goryeo');});
 assert.ok(rows.some(x=>x[0]==='곡식'&&x[1]==='기록 없음'&&x[2]==='9말'));
 assert.ok(rows.some(x=>x[0]==='가족·관계'&&x[1]==='기록 없음'));
 assert.ok(rows.every(x=>x[0]!=='출생 주거'));
});
test('modern lives retain standard housing, education, roles and formatted money',()=>{
 const prev={birthYear:2001,country:'미국',family:'보통',age:80,career:'교사',
 housing:'임차한 집',education:'고등학교',qualification:'자격증',netWorth:1200,
 roles:['교사'],child:false,partner:false,eraSummary:{era:'modern'}};
 const now={...prev,netWorth:1500,child:true};
 const rows=era.rows(prev,now,n=>n.toLocaleString('en-US')+' credits');
 assert.ok(rows.some(x=>x[0]==='최종 순자산'&&x[1]==='1,200 credits'&&x[2]==='1,500 credits'));
 assert.ok(rows.some(x=>x[0]==='출생 주거'&&x[1]==='임차한 집'));
 assert.ok(rows.some(x=>x[0]==='거쳐 온 직업'&&x[1]==='교사'));
});
test('historical summary loads before controller and is exercised in the full smoke test',()=>{
 const html=read('index.html'),game=read('game.js');
 assert.ok(html.indexOf('ending-era-summary-v1.js?v=2')>0);
 assert.ok(html.indexOf('ending-era-summary-v1.js?v=2')<html.indexOf('game.js?v=78'));
 assert.match(game,/eraSummary:window\.OneLifeEndingEraV1\.capture\(life\)/);
 assert.match(game,/OneLifeEndingEraV1\.rows\(replayBasis,now,formatCredits\)/);
 const smoke=fs.readFileSync(path.join(__dirname,'one-life-screen-flow.test.cjs'),'utf8');
 assert.match(smoke,/OneLifeEndingEraV1:require/);
});
