const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('../games/high_ota_typographic_horror/guidance.js');
const C=require('../games/high_ota_typographic_horror/chapter3.js');
const R=require('../games/high_ota_typographic_horror/rules.js');

function stage(name){
 const s=R.initialState();s.stage=name;return s;
}
test('start only teaches controls; it does not spoil every future monster',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../games/high_ota_typographic_horror/index.html'),'utf8');
 const intro=html.split('<section class="overlay" id="intro"')[1].split('</section>')[0];
 assert.match(intro,/WASD.*E 조사.*H 힌트/);
 assert.doesNotMatch(intro,/빨간 「뒤」|세 번 반복|사물함에 숨으세요|3시가 되기 전에/);
 assert.match(html,/id="help"/);
 assert.match(html,/id="hintBox"/);
 assert.match(html,/src="guidance.js"/);
});
test('novices get escalating clues without immediate full-answer spoilers',()=>{
 const s=stage('console'),p={x:0,z:4};
 assert.equal(G.scope(s,p),'console');
 assert.match(G.hint(s,p,1),/컴퓨터/);
 assert.doesNotMatch(G.hint(s,p,1),/왼쪽/);
 assert.match(G.hint(s,p,3),/왼쪽/);
 assert.equal(G.hint(s,p,9),G.hint(s,p,3),'extra requests cap at hint 3');
 assert.match(G.hint(stage('distortion'),p,3),/통로/);
 assert.match(G.hint(stage('door'),p,1),/달리면 위험/);
 assert.match(G.hint(stage('anomaly'),p,2),/걸어/);
});
test('stage cues give actionable help at first danger without spoiling future hazards',()=>{
 assert.match(G.cue('chase'),/달려서/);
 assert.match(G.cue('hiding'),/기다리세요/);
 assert.match(G.cue('door'),/걷거나 멈추세요/);
 assert.equal(G.cue('console'),null);
});
test('the same exploration stage offers hints for the actual current room',()=>{
 const s=stage('explore');C.ensure(s);
 const hub={x:0,z:-47},office={x:-8.8,z:-47.5},archive={x:12,z:-51};
 assert.equal(G.scope(s,hub),'hub');
 assert.equal(G.scope(s,office),'office');
 assert.equal(G.scope(s,archive),'archive');
 assert.match(G.hint(s,archive,1),/봉인/);
 assert.doesNotMatch(G.hint(s,archive,1),/약 1초/);
 assert.match(G.hint(s,archive,3),/약 1초/);
 C.ensure(s).cipher.fragments=3;
 assert.equal(G.scope(s,archive),'archiveDeciphered');
 C.ensure(s).records.archive=true;
 assert.equal(G.scope(s,archive),'hub');
 C.ensure(s).officeFixed=true;
 assert.equal(G.scope(s,office),'officeRecord');
 C.ensure(s).records.office=true;
 assert.equal(G.scope(s,hub),'finalGate');
 s.stage='final';
 assert.equal(G.scope(s,hub),'final');
});
test('failure texts teach the cause and a recoverable next action',()=>{
 const watcher=stage('lost');watcher.lossReason='watcher';
 assert.match(G.failure(watcher).detail,/시선을 돌리세요/);
 const echo=stage('lost');echo.echo.alert=100;
 assert.match(G.failure(echo).detail,/걷거나 멈추세요/);
 const chase=stage('lost');
 assert.match(G.failure(chase).detail,/사물함/);
});
test('in-world objectives must match what the player actually does',()=>{
 assert.match(R.objective(stage('anomaly')),/이동해/);
 assert.doesNotMatch(R.objective(stage('anomaly')),/조사하세요/);
});
