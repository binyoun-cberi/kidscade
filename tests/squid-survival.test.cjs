'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.join(ROOT,'games/squid-survival');
const rules=require(path.join(DIR,'rules.js'));
const source=fs.readFileSync(path.join(DIR,'game.js'),'utf8');
const html=fs.readFileSync(path.join(DIR,'index.html'),'utf8');

const event=(round,status='completed',outcome='clear')=>({
  type:'kidscade:game-event',version:1,gameId:round.gameId,
  detail:{event:'result',gameId:round.gameId,scope:round.id==='bridge'?'stage':'stage',
    status,outcome,score:87}
});
test('tournament has only two playable rounds with existing original game URLs',()=>{
  assert.equal(rules.ROUNDS.length,2);
  assert.deepEqual(rules.ROUNDS.map(x=>x.gameId),['dalgona_trace','squid_memory_bridge']);
  assert.deepEqual(rules.ROUNDS.map(x=>rules.gameUrl(x)),
    ['../dalgona-trace/index.html?survival=1','../squid-memory-bridge/index.html?survival=1']);
  for(const r of rules.ROUNDS){
    assert.ok(fs.existsSync(path.join(DIR,r.src)));
  }
});
test('progression requires two real wins and cannot advance twice on a duplicate result',()=>{
  let s=rules.reduce(rules.initial(),{type:'START'});
  assert.equal(s.phase,'intro');
  s=rules.reduce(s,{type:'READY'});
  assert.equal(s.phase,'running');
  const a=rules.validateEvent(s,event(rules.ROUNDS[0]),true,true);
  assert.ok(a);
  s=rules.reduce(s,a);
  assert.equal(s.phase,'intermission');
  assert.equal(s.clearCount,1);
  assert.equal(rules.validateEvent(s,event(rules.ROUNDS[0]),true,true),null);
  assert.equal(rules.reduce(s,a),s);
  s=rules.reduce(s,{type:'NEXT'});
  assert.equal(s.roundIndex,1);
  s=rules.reduce(s,{type:'ROTATE'});
  assert.equal(s.phase,'rotate');
  s=rules.reduce(s,{type:'ORIENTED'});
  assert.equal(s.phase,'intro');
  s=rules.reduce(s,{type:'READY'});
  s=rules.reduce(s,rules.validateEvent(s,event(rules.ROUNDS[1]),true,true));
  assert.equal(s.phase,'champion');
  assert.equal(s.clearCount,2);
  assert.deepEqual(s.results.map(x=>x.id),['dalgona','bridge']);
  s=rules.reduce(s,{type:'START'});
  assert.equal(s.clearCount,0);
  assert.equal(s.roundIndex,0);
});
test('wrong game, wrong iframe source, wrong origin, and irrelevant SDK messages cannot pass',()=>{
  const s=rules.reduce(rules.reduce(rules.initial(),{type:'START'}),{type:'READY'});
  assert.equal(rules.validateEvent(s,event(rules.ROUNDS[0]),false,true),null);
  assert.equal(rules.validateEvent(s,event(rules.ROUNDS[0]),true,false),null);
  assert.equal(rules.validateEvent(s,event(rules.ROUNDS[1]),true,true),null);
  assert.equal(rules.validateEvent(s,{...event(rules.ROUNDS[0]),type:'kidscade:game-error'},true,true),null);
  assert.equal(rules.validateEvent(s,{...event(rules.ROUNDS[0]),detail:{event:'score',gameId:'dalgona_trace'}},true,true),null);
  assert.equal(rules.validateEvent(s,event(rules.ROUNDS[0],'failed','clear'),true,true),null);
});
test('losing ends the whole run, not just the current round',()=>{
  let s=rules.reduce(rules.reduce(rules.initial(),{type:'START'}),{type:'READY'});
  s=rules.reduce(s,rules.validateEvent(s,event(rules.ROUNDS[0],'failed','loss'),true,true));
  assert.equal(s.phase,'failed');
  assert.equal(s.clearCount,0);
  assert.equal(rules.reduce(s,{type:'NEXT'}),s);
  s=rules.reduce(s,{type:'START'});
  assert.equal(s.phase,'intro');
});
function simulator(){
  const elements=new Map(),listeners=new Map(),intervals=new Map(),saved=new Map(),sdk=[];
  let clock=1_700_000_000_000,intervalId=0,isPortrait=false;
  function element(id){
    const events=new Map(),classes=new Set(id==='pregame'||id==='rotate'||id==='end'?['hidden']:[]);
    return {
      id,hidden:id==='gameFrame'||id==='quitButton',textContent:'',style:{},src:'',
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
        contains:x=>classes.has(x),toggle:(x,force)=>{if(force)classes.add(x);else classes.delete(x)}},
      addEventListener:(name,fn)=>events.set(name,fn),
      click(){events.get('click')?.({})},
      removeAttribute(name){if(name==='src')this.src=''},
      contentWindow:id==='gameFrame'?{}:undefined
    };
  }
  const get=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id);};
  const fakeWindow={
    SquidSurvivalRules:rules,location:{origin:'https://example.com'},
    addEventListener:(name,fn)=>listeners.set(name,fn),
    matchMedia:()=>({matches:isPortrait}),
    KidscadeGame:{start:x=>sdk.push(['start',x]),score:x=>sdk.push(['score',x]),
      milestone:x=>sdk.push(['milestone',x]),result:x=>sdk.push(['result',x])}
  };
  class FakeDate extends Date{static now(){return clock;}}
  vm.runInNewContext(source,{
    window:fakeWindow,document:{getElementById:get},localStorage:{
      getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},
    Date:FakeDate,setInterval:fn=>{const id=++intervalId;intervals.set(id,fn);return id},
    clearInterval:id=>intervals.delete(id),Number,String,Math
  });
  return {
    get,click:id=>get(id).click(),sdk,advance(ms){clock+=ms;for(const fn of [...intervals.values()])fn()},
    send(data,{origin='https://example.com',source=get('gameFrame').contentWindow}={}){
      listeners.get('message')?.({data,origin,source});
    },
    portrait(x){isPortrait=x;listeners.get('resize')?.({})},
    saved
  };
}
test('end-to-end frame orchestration: intro, guarded signals, rotate, crown and replay',()=>{
  const s=simulator();
  assert.equal(s.get('lobby').classList.contains('hidden'),false);
  s.click('startButton');
  assert.equal(s.get('pregame').classList.contains('hidden'),false);
  assert.equal(s.get('gameFrame').src,'');
  s.advance(2900);assert.equal(s.get('gameFrame').src,'');
  s.advance(110);
  assert.match(s.get('gameFrame').src,/dalgona-trace.*survival=1/);
  assert.equal(s.get('lobby').classList.contains('hidden'),true);
  assert.equal(s.get('gameFrame').hidden,false);
  s.send(event(rules.ROUNDS[0]),{origin:'https://attacker.invalid'});
  assert.equal(s.get('end').classList.contains('hidden'),true);
  s.send(event(rules.ROUNDS[0]));
  assert.equal(s.get('end').classList.contains('hidden'),false);
  assert.equal(s.get('endClears').textContent,'1 / 2');
  s.send(event(rules.ROUNDS[0]));
  assert.equal(s.get('endClears').textContent,'1 / 2');
  s.portrait(true);
  s.click('endButton');
  assert.equal(s.get('rotate').classList.contains('hidden'),false);
  s.advance(6000);assert.match(s.get('gameFrame').src,/dalgona/);
  s.portrait(false);
  assert.equal(s.get('pregame').classList.contains('hidden'),false);
  s.advance(3001);
  assert.match(s.get('gameFrame').src,/squid-memory-bridge.*survival=1/);
  s.send(event(rules.ROUNDS[1]));
  assert.equal(s.get('endTitle').textContent,'최종 생존 성공!');
  assert.equal(s.get('endWins').textContent,'1');
  assert.equal(s.sdk.filter(([n,v])=>n==='result'&&v.status==='completed').length,1);
  assert.equal(JSON.parse(s.saved.get(rules.SAVE_KEY)).best,2);
  s.click('endButton');
  assert.equal(s.get('pregame').classList.contains('hidden'),false);
  assert.equal(s.get('endWins').textContent,'1');
});
test('quit is elimination and repeats cannot award extra championships',()=>{
  const s=simulator();
  s.click('startButton');s.advance(3100);
  s.click('quitButton');
  assert.equal(s.get('endTitle').textContent,'대회 탈락!');
  assert.equal(s.get('endClears').textContent,'0 / 2');
  s.send(event(rules.ROUNDS[0]));
  assert.equal(s.get('endClears').textContent,'0 / 2');
  s.click('endButton');
  assert.equal(s.get('pregame').classList.contains('hidden'),false);
});
test('game catalog, common save key, and both standalone launch paths exist',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data/games.json'),'utf8'));
  const game=catalog.games.find(x=>x.id==='squid_survival');
  assert.ok(game);
  assert.equal(game.href,'games/squid-survival/index.html');
  assert.match(html,/data-game-id="squid_survival"/);
  assert.match(html,/gameFrame/);
  assert.match(html,/quitButton/);
  assert.match(html,/dalgona-trace\/index.html/);
  assert.match(html,/squid-memory-bridge\/index.html/);
  const bridge=fs.readFileSync(path.join(ROOT,'games/squid-memory-bridge/game.js'),'utf8');
  const dalgona=fs.readFileSync(path.join(ROOT,'games/dalgona-trace/game.js'),'utf8');
  assert.match(bridge,/ROUND_TIME_MS=SURVIVAL_MODE\?90000:300000/);
  assert.match(bridge,/if\(SURVIVAL_MODE\)\{/);
  assert.match(bridge,/startRun\(\);/);
  assert.match(dalgona,/if\(SURVIVAL_MODE\)start\(\)/);
  assert.match(bridge,/if\(!SURVIVAL_MODE\).*record\.best/);
  assert.match(dalgona,/if\(!SURVIVAL_MODE\).*record\.best/);
});
