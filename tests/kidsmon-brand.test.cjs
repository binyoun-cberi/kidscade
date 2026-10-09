'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const game=read('games/openmon-expedition/index.html');
const runtime=read('games/openmon-expedition/game.js');
const engine=read('games/openmon-expedition/engine.js');
const dex=read('games/openmon-dex/index.html');
const catalog=JSON.parse(read('data/games.json'));
const achievements=read('achievement-catalog.js');
const entry=catalog.games.find(g=>g.id==='openmon_expedition');
test('KIDSMON is the consistent public-facing game and dex name',()=>{
 assert.ok(entry);
 assert.equal(entry.title,'키즈몬');
 assert.equal(entry.href,'games/openmon-expedition/index.html');
 assert.match(entry.description,/키즈몬/);
 assert.match(game,/<title>키즈몬 KIDSMON \| KIDSCADE<\/title>/);
 assert.match(game,/KIDSMON<\/span>/);
 assert.match(dex,/<title>키즈몬 도감 제작실 \| KIDSCADE<\/title>/);
 assert.match(achievements,/"openmon_expedition":\["첫 키즈볼"/);
 for(const content of [game,runtime,dex,achievements,entry.title,entry.description]){
   assert.doesNotMatch(content,/개념몬/);
 }
});
test('all capture equipment is displayed as 키즈볼, original game balances remain intact',()=>{
 for(const content of [game,runtime,dex])assert.doesNotMatch(content,/포획구/);
 assert.match(game,/>키즈볼</);
 assert.match(runtime,/키즈볼 던지기/);
 assert.match(runtime,/포획 성공/);
 assert.match(runtime,/data-buy="ball"/);
 assert.match(engine,/items:\{ball:7,potion:3\}/);
 assert.match(runtime,/item==="ball"\?35/);
});
test('legacy saves, achievement IDs, filenames, sprite credits remain unchanged',()=>{
 assert.match(runtime,/kidscade\.openmon\.expedition\.save\.v1/);
 assert.match(runtime,/window\.OPENMON_EXPEDITION_DEBUG/);
 assert.match(engine,/OPENMON_EXPEDITION_ENGINE/);
 assert.match(game,/\.\.\/openmon-dex\/monsters\.js/);
 assert.match(game,/Openmon 원작 그래픽/);
 assert.match(dex,/Openmon 원본 스프라이트/);
 assert.match(achievements,/"openmon_expedition":/);
 assert.doesNotThrow(()=>new Function(runtime));
 assert.doesNotThrow(()=>new Function(engine));
});
