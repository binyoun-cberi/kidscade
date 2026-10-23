'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'life-ui-v2.css'),'utf8');
const Sim=require(path.join(dir,'engine.js'));
const Archive=require(path.join(dir,'life-archive-v1.js'));
test('the final screen makes cause and year of death unmistakably visible',()=>{
 for(const id of ['endFarewellHeading','endDeathReason','endDeathYear']){
  assert.equal(html.split('id="'+id+'"').length-1,1);
 }
 assert.match(html,/사망 원인은 게임 속 사건과 선택에 따른 설정/);
 assert.ok(js.includes("$('endDeathReason').textContent=deathCause;"));
 assert.ok(js.includes("$('endDeathYear').textContent=life.year+'년 · '+life.age+'세';"));
 assert.ok(css.includes('.end-farewell'));
 assert.ok(css.includes('.end-death-reason'));
});
test('fictional mortality has concrete, age-aware outcomes without exact disease fabrication',()=>{
 assert.match(Sim.deathEvent({age:2,stats:{health:55}},.9),/어린 나이|어린/);
 assert.match(Sim.deathEvent({age:11,stats:{health:50}},.9),/사고/);
 assert.match(Sim.deathEvent({age:36,stats:{health:70}},.1),/병/);
 assert.match(Sim.deathEvent({age:36,stats:{health:70}},.95),/사고/);
 assert.match(Sim.deathEvent({age:67,stats:{health:0}},.95),/건강/);
 assert.match(Sim.deathEvent({age:92,stats:{health:20}},.6),/노년/);
 assert.match(Sim.deathEvent({age:108,stats:{health:60}},.6),/노환/);
 for(const r of ['암','뇌졸중','심근경색'])assert.ok(!Sim.deathEvent({age:50,stats:{health:55}},.45).includes(r));
});
test('a completed life actually records and restores its last event and does not overwrite scripted deaths',()=>{
 const l=new Sim.Life(136,{birthYear:2026,countryName:'대한민국'});
 l.age=107;l.year=2133;l.stats.health=53;
 assert.equal(l.tick(),true);
 assert.equal(l.alive,false);
 assert.equal(l.age,108);
 assert.match(l.deathReason,/노환/);
 assert.equal(l.log.at(-1).kind,'death');
 assert.equal(l.log.at(-1).text,l.deathReason);
 assert.equal(Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot()))).deathReason,l.deathReason);
 const scripted=new Sim.Life(913,{birthYear:1590,countryName:'대한민국'});
 scripted.finish('전란 중 싸움에 휘말려 목숨을 잃었다.');
 assert.equal(scripted.tick(),false);
 assert.equal(scripted.deathReason,'전란 중 싸움에 휘말려 목숨을 잃었다.');
});
test('new archive entries preserve death reason while older entries clearly say it was not recorded',()=>{
 const l=new Sim.Life(91,{birthYear:2026,countryName:'대한민국'});
 l.age=61;l.year=2087;l.finish('갑작스러운 병을 앓은 뒤 세상을 떠났다.');
 const recent=Archive.make(l,{career:'교사',origin:'평범한 집안'});
 assert.equal(recent.deathCause,l.deathReason);
 assert.match(Archive.describe(recent).death,/병/);
 const prior={birthYear:1890,age:44,country:'대한민국',career:'상인'};
 assert.equal(Archive.describe(prior).death,'사망 원인 기록 없음');
 assert.ok(js.includes("death.textContent='마지막 이야기 · '+summary.death;"));
 assert.ok(js.includes('ending:fate||social,deathCause'));
 assert.ok(!js.includes('death.innerHTML'));
});
test('mobile launch action precedes era portraits, and reading order follows the document',()=>{
 assert.match(css,/#intro\.home-intro \.home-intro-copy\{order:0/);
 assert.match(css,/#intro\.home-intro \.home-gallery\{order:1/);
 assert.match(css,/#intro\.home-intro \.home-people-grid\{grid-template-columns:repeat\(2/);
 assert.ok(html.indexOf('id="decision"')<html.indexOf('class="lived-moment"'));
 assert.ok(html.indexOf('id="timeline"')<html.indexOf('class="life-archive"'));
 assert.doesNotMatch(css,/#play[^{}]*\{order:-/);
 assert.match(css,/#end\.end \.end-summary/);
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
test('the hidden homepage overrides its decorative display rule and controls stay unique',()=>{
 assert.match(css,/#intro\.home-intro\.hidden\{display:none!important\}/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['pauseBtn','v9NextChoice','autoChoiceBtn','timeline','decision'])assert.equal(ids.filter(x=>x===id).length,1);
 assert.ok(html.indexOf('id="pauseBtn"')<html.indexOf('id="decision"'));
 assert.match(html,/<details class="life-play-settings">\s*<summary>배속·자동 선택 설정<\/summary>/);
 assert.match(html,/<details class="life-archive">/);
 assert.match(html,/<details class="life-profile-details">/);
 assert.match(js,/\$\('storyHeadingBlock'\)\.classList\.toggle\('hidden',!!choice \|\| !!reflection\)/);
});
