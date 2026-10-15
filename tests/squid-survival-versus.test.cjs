'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'games/squid-survival');
const E=require(path.join(BASE,'versus/passplay-rules.js'));
const T=require(path.join(ROOT,'games/dalgona-trace/trace.js'));
const M=require(path.join(BASE,'mini-rules.js'));
const html=fs.readFileSync(path.join(BASE,'versus/index.html'),'utf8');
const js=fs.readFileSync(path.join(BASE,'versus/passplay.js'),'utf8');
const css=fs.readFileSync(path.join(BASE,'versus/versus.css'),'utf8');
const base=(round,seed=123)=>({...E.begin(E.start(seed)),roundIndex:round,
 turnIndex:0,active:E.orderFor(round)[0],phase:'handoff'});
function runRound(round,seed,play,how='same'){
 let s=base(round,seed),clock=1000;
 for(let turn=0;turn<2;turn++){
   const player=s.active;s=E.ready(s,clock);const g=s.game;
   if(play) s=play(s,g,clock,player,how);
   if(s.phase==='playing')s=E.tick(s,clock+g.limit+5);
   if(s.phase==='handoff')clock+=g.limit+4000;
 }
 return s;
}
function follow(g,clock,act){
 if(g.id==='dalgona'){
   act('trace-start',T.sampleAt(g.trace,0),clock);
   for(let j=1;j<g.trace.path.length;j++)act('trace-move',
     T.sampleAt(g.trace,g.trace.path[j].distance),clock+j*18);
 }else if(g.id==='bridge'){
   for(let j=1;j<g.map.path.length;j++){
     const a=g.map.path[j-1],b=g.map.path[j],dx=b%g.map.width-a%g.map.width,
       dy=Math.floor(b/g.map.width)-Math.floor(a/g.map.width);
     const dir=dx===1?'right':dx===-1?'left':dy===1?'down':'up';
     act('step',dir,clock+g.previewUntil+100+j*95);
   }
 }else if(g.id==='redlight'){
   for(let t=clock+20;t<clock+g.limit;t+=20){
     M.advance(g.body,t);
     act('hold',g.body.signal==='green',t);
   }
 }else if(g.id==='tug'){
   for(let cycle=0;cycle<12;cycle++){
      const at=clock+Math.round((cycle+.5)*g.body.tugPeriod-g.body.tugOffset);
      if(at>clock)act('tap',null,at);
    }
 }else if(g.id==='marbles'){
   for(let j=0;j<5;j++)act('choose',g.body.questions[j].answer,clock+1000+j*800);
 }else if(g.id==='final'){
   for(let j=0;j<4;j++)act('symbol',g.body.sequence[j],clock+4000+j*100);
   for(let t=clock+4700;t<clock+26000&&g.body.part==='timing';t+=45){
     M.advance(g.body,t);
     if(M.timingPosition(g.body)>=.84)act('tap',null,t);
   }
   act('answer',g.body.math.answer,clock+27000);
 }else if(g.id==='overtime')act('answer',g.question.answer,clock+1900);
}
function perfect(s,g,clock){
 let current=s;
 const act=(action,value,when)=>{if(current.phase==='playing')current=E.input(current,action,value,when);};
 follow(g,clock,act);
 return current;
}
test('canonical game title stays 꼴뚜기 게임 across catalog, menu, page and shell',()=>{
 const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data/games.json'),'utf8'));
 const game=catalog.games.find(g=>g.id==='squid_survival');
 assert.ok(game,'one canonical game id');
 assert.equal(game.title,'꼴뚜기 게임');
 assert.equal(game.href,'games/squid-survival/index.html');
 assert.deepEqual(game.players,['solo','local2']);
 assert.equal(catalog.games.filter(g=>g.id==='squid_survival'||g.id==='squid_survival_versus').length,1);
 assert.equal(catalog.games.some(g=>g.id==='squid_survival_versus'),false);
 assert.equal(catalog.games.filter(g=>g.href==='games/squid-survival/index.html').length,1);
 assert.match(html,/<title>꼴뚜기 게임 \| KIDSCADE<\/title>/);
 assert.match(html,/data-title="꼴뚜기 게임"/);
 assert.match(html,/<h1 id="dialogTitle">꼴뚜기 게임<\/h1>/);
 assert.match(js,/el\.title\.textContent='꼴뚜기 게임'/);
 const lobby=fs.readFileSync(path.join(BASE,'index.html'),'utf8');
 assert.match(lobby,/<strong>둘이서 하기<\/strong>/);
 assert.match(lobby,/<title>꼴뚜기 게임 \| KIDSCADE<\/title>/);
 assert.match(lobby,/<h1>꼴뚜기 게임<\/h1>/);
 assert.match(lobby,/id="startButton"[^>]*>혼자 하기/);
 assert.match(lobby,/href="\.\/versus\/index\.html"/);
 assert.match(lobby,/data-game-id="squid_survival" data-title="꼴뚜기 게임"/);
});
test('all platforms use one full-canvas playfield, pass-and-play overlay and no orientation lock',()=>{
 assert.match(html,/data-orientation="any"/);
 assert.match(html,/passplay-rules\.js/);assert.match(html,/passplay\.js/);
 assert.match(html,/id="board"/);assert.doesNotMatch(html,/id="board0"/);
 assert.doesNotMatch(html,/id="board1"/);
 assert.match(html,/id="dialogButton"/);assert.match(html,/id="progress"/);
 assert.match(html,/id="controls"/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-height:470px\)/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotThrow(()=>new Function(js));
});
test('rounds alternate first player exactly and turn privacy is enforced',()=>{
 let s=E.begin(E.start(42));
 assert.equal(s.phase,'handoff');assert.equal(s.active,0);
 for(let round=0;round<6;round++){
   assert.equal(s.active,round%2,'first player must alternate');
   s=E.ready(s,1000+round*100000);
   assert.equal(s.game.player,round%2);
   const at=s.game.startedAt,limit=s.game.limit;
   s=E.tick(s,at+limit+5);
   assert.equal(s.phase,'handoff');
   assert.equal(s.active,1-round%2);
   assert.equal(s.game,null,'previous game must be discarded before handoff');
   assert.ok(s.turns[round%2]);
   assert.equal(s.turns[1-round%2],null);
   s=E.ready(s,at+limit+1000);
   s=E.tick(s,s.game.startedAt+s.game.limit+5);
   assert.equal(s.phase,'round-result');
   assert.equal(s.history.length,round+1,'scoring once after both players');
   if(round<5)s=E.advanceRound(s);
 }
});
test('separate equal-difficulty memory, marble, final, and overtime questions prevent copying',()=>{
 let differences={bridge:0,marbles:0,final:0,overtime:0};
 for(let seed=1;seed<=60;seed++)for(const round of [1,4,5,6]){
   const a=E.createGame(round,0,seed,100),b=E.createGame(round,1,seed,100);
   assert.equal(a.limit,b.limit);
   if(round===1){assert.equal(a.map.path.length,b.map.path.length);
     if(a.map.path.join(',')!==b.map.path.join(','))differences.bridge++;}
   if(round===4){assert.equal(a.body.questions.length,b.body.questions.length);
     if(JSON.stringify(a.body.questions)!==JSON.stringify(b.body.questions))differences.marbles++;}
   if(round===5){assert.equal(a.body.sequence.length,b.body.sequence.length);
     if(a.body.sequence.join(',')!==b.body.sequence.join(','))differences.final++;}
   if(round===6&&a.question.prompt!==b.question.prompt)differences.overtime++;
 }
 for(const [kind,n] of Object.entries(differences))assert.ok(n>=54,kind+' produces too many repeated problems '+n);
});
test('pass-and-play dalgona supports both tracing directions in 200 real-input attempts',()=>{
 for(let seed=1;seed<=100;seed++)for(const backward of [false,true]){
   let s=E.ready(E.begin(E.start(seed)),1000);
   const g=s.game,path=(backward?g.traceReverse:g.trace).path;
   s=E.input(s,'trace-start',path[0],1000);
   for(let i=1;i<path.length&&s.phase==='playing';i++)
     s=E.input(s,'trace-move',path[i],1000+i*18);
   assert.equal(s.phase,'handoff','seed '+seed+' backward '+backward);
   assert.equal(s.turns[0].clear,true);
   assert.equal(g.traceDirection,backward?'reverse':'forward');
 }
});
test('each of six rounds can be cleared by both players using full-screen inputs',()=>{
 for(let round=0;round<6;round++)for(let seed=1;seed<=25;seed++){
   const s=runRound(round,seed,perfect);
   assert.equal(s.phase,'round-result','round '+round+' seed '+seed+' phase '+s.phase);
   assert.deepEqual(s.turns.map(x=>x.clear),[true,true]);
   assert.equal(s.history.length,1);
 }
});
test('pass-and-play accepts opposite tracing directions from both players',()=>{
 for(let seed=1;seed<=100;seed++){
   let s=base(0,seed),clock=1000;
   for(let turn=0;turn<2;turn++){
     s=E.ready(s,clock);
     const g=s.game,backwards=(seed+turn)%2===1;
     const samples=(backwards?g.traceReverse:g.trace).path;
     s=E.input(s,'trace-start',{x:samples[0].x,y:samples[0].y},clock);
     for(let j=1;j<samples.length&&s.phase==='playing';j++)
       s=E.input(s,'trace-move',{x:samples[j].x,y:samples[j].y},clock+j*18);
     assert.equal(s.phase,turn===0?'handoff':'round-result','seed '+seed+' turn '+turn);
     assert.equal(g.traceDirection,backwards?'reverse':'forward');
     clock+=g.limit+4000;
   }
   assert.deepEqual(s.turns.map(p=>p.clear),[true,true]);
   assert.ok(Math.abs(s.turns[0].metric-s.turns[1].metric)<=3,'opposite tracing direction was unfair');
 }
});
test('pass-and-play warning light obeys held input until the actual release',()=>{
 for(let seed=1;seed<=100;seed++){
   let s=base(2,seed);s=E.ready(s,1000);const g=s.game;
   s=E.input(s,'hold',true,1020);
   let yellow=null,continued=null;
   for(let now=1040;now<9500&&s.phase==='playing';now+=20){
     s=E.tick(s,now);
     if(s.phase!=='playing')break;
     if(g.body.signal==='warning'&&yellow===null)yellow={when:now,progress:g.body.progress};
     if(yellow&&now===yellow.when+200)continued=g.body.progress;
   }
   assert.ok(continued>yellow.progress+2,'player was automatically stopped on warning');
   assert.equal(s.phase,'handoff','holding into red must fail and hand off');
   assert.equal(s.turns[0].clear,false);
 }
});
test('only skilled player wins even when the first competitor changes sides',()=>{
 for(let round=0;round<6;round++)for(let seed=1;seed<=20;seed++){
   const champion=seed%2;
   const s=runRound(round,seed,(s,g,clock,id)=>id===champion?perfect(s,g,clock):s);
   assert.equal(s.phase,'round-result');
   assert.equal(s.history[0].winner,champion,'round '+round+' seed '+seed);
   assert.equal(s.totals[champion],1);
 }
});
test('getting one answer wrong does not leak answers or change score before second turn',()=>{
 let s=base(4,73);s=E.ready(s,1000);
 const first=s.active;const expected=s.game.body.questions[0].answer;
 s=E.input(s,'choose',expected==='left'?'right':'left',1200);
 assert.equal(s.totals[0],0);assert.equal(s.totals[1],0);
 assert.equal(s.turns[0],null);assert.equal(s.turns[1],null);
 s=E.tick(s,1000+E.LIMITS.marbles+5);
 assert.equal(s.phase,'handoff');assert.equal(s.game,null);
 assert.equal(s.totals[0],0);assert.equal(s.totals[1],0);
});
test('same player quality and timing determines winner, ties award half a point',()=>{
 assert.equal(E.winnerOf(
  {clear:true,metric:90,elapsed:12000},{clear:true,metric:85,elapsed:10000}),0);
 assert.equal(E.winnerOf(
  {clear:true,metric:88,elapsed:10000},{clear:true,metric:88,elapsed:11000}),0);
 assert.equal(E.winnerOf(
  {clear:false,progress:.7},{clear:false,progress:.3}),0);
 assert.equal(E.winnerOf(
  {clear:false,progress:.3},{clear:false,progress:.3}),null);
 let s=runRound(0,99,(s,g,clock)=>perfect(s,g,clock));
 assert.equal(s.history[0].winner,null);
 assert.deepEqual(s.totals,[.5,.5]);
});
test('match final resolves tie into private alternating overtime and best of speed/accuracy',()=>{
 let s=E.begin(E.start(5));
 for(let round=0;round<6;round++){
   for(let i=0;i<2;i++){
     s=E.ready(s,round*100000+i*50000+1000);
     s=E.tick(s,s.game.startedAt+s.game.limit+1);
   }
   if(round<5)s=E.advanceRound(s);
 }
 assert.deepEqual(s.totals,[3,3]);
 s=E.advanceRound(s);assert.equal(s.phase,'handoff');assert.equal(s.roundIndex,6);
 assert.equal(s.active,0);
 s=E.ready(s,610000);const q0=s.game.question;
 s=E.input(s,'answer',q0.answer,611500);
 assert.equal(s.phase,'handoff');assert.equal(s.game,null);
 s=E.ready(s,620000);const q1=s.game.question;
 s=E.input(s,'answer',q1.options.find(x=>x!==q1.answer),621000);
 assert.equal(s.phase,'finished');assert.equal(s.winner,0);assert.equal(s.totals[0],4);
 const again=E.begin(s);assert.equal(again.phase,'handoff');assert.equal(again.history.length,0);
});
test('overtime replays with reverse first player on exact ties',()=>{
 let s=E.begin(E.start(8));
 s={...s,roundIndex:6,active:0,phase:'handoff',totals:[3,3]};
 s=E.ready(s,1000);const a=s.game.question.answer;
 s=E.input(s,'answer',a,3000);
 s=E.ready(s,9000);const b=s.game.question.answer;
 s=E.input(s,'answer',b,11000);
 assert.equal(s.phase,'handoff');
 assert.equal(s.overtime,1);assert.equal(s.active,1);assert.deepEqual(s.totals,[3,3]);
});
test('idempotent after turns, illegal actions and early round skips are ignored',()=>{
 let s=E.begin(E.start(11));
 assert.equal(E.advanceRound(s),s);
 s=E.ready(s,1000);
 const a=E.input(s,'choose','left',1100);
 assert.equal(a.phase,'playing');assert.equal(a.turns[0],null);
 s=E.tick(s,47000);assert.equal(s.phase,'handoff');
 assert.equal(E.input(s,'trace-start',{x:0,y:0},55000),s);
 assert.equal(E.advanceRound(s),s);
});

test('dalgona varies across matches and stays identical for both players',()=>{
  const seen=new Set();
  for(let seed=1;seed<=150;seed++){
    const a=E.createGame(0,0,seed,100),b=E.createGame(0,1,seed,100);
    assert.equal(a.trace.shape,b.trace.shape,'different shapes for seed '+seed);
    assert.equal(a.trace.total,b.trace.total);
    seen.add(a.trace.shape);
  }
  assert.equal(seen.size,T.SHAPES.length);
});
test('two-player tug rhythm is fair within a match and varied between matches',()=>{
  const periods=new Set();
  for(let seed=1;seed<=90;seed++){
    const a=E.createGame(3,0,seed,100),b=E.createGame(3,1,seed,100);
    assert.equal(a.body.tugPeriod,b.body.tugPeriod);
    assert.equal(a.body.tugOffset,b.body.tugOffset);
    periods.add(a.body.tugPeriod);
  }
  assert.ok(periods.size>=40);
});
