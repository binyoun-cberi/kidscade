'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'games/squid-survival');
const V=require(path.join(BASE,'versus/versus-rules.js'));
const T=require(path.join(ROOT,'games/dalgona-trace/trace.js'));
const M=require(path.join(BASE,'mini-rules.js'));
const html=fs.readFileSync(path.join(BASE,'versus/index.html'),'utf8');
const ui=fs.readFileSync(path.join(BASE,'versus/versus.js'),'utf8');
const css=fs.readFileSync(path.join(BASE,'versus/versus.css'),'utf8');

function runAt(index,seed=1234,start=1000){
 const match={...V.start(V.initial(seed)),index};
 return V.launch(match,start);
}
test('six independent 2P rounds share identical challenges for 40 seeds',()=>{
 assert.deepEqual(V.ROUNDS.map(x=>x.id),['dalgona','bridge','redlight','tug','marbles','final']);
 for(let seed=1;seed<=40;seed++)for(let round=0;round<6;round++){
  const r=V.makeRound(round,seed,500);
  assert.equal(r.players.length,2);
  assert.ok(r.limit>=38000);
  if(r.id==='bridge'){assert.ok(r.map.path.length>=12);}
  if(r.id==='dalgona'){assert.equal(r.players[0].traceState.progress,0);assert.equal(r.players[1].traceState.progress,0);}
  if(r.id==='marbles')assert.deepEqual(r.players[0].body.questions,r.players[1].body.questions);
  if(r.id==='final'){assert.deepEqual(r.players[0].body.sequence,r.players[1].body.sequence);
   assert.deepEqual(r.players[0].body.math,r.players[1].body.math);}
  if(r.id==='redlight')assert.equal(r.players[0].body.signalEnds,r.players[1].body.signalEnds);
 }
});
test('two pointer-like traces can finish in parallel without overwriting progress',()=>{
 let s=runAt(0,72),r=s.round,time=1000;
 for(let p=0;p<2;p++)s=V.input(s,p,'trace-start',T.sampleAt(r.trace,0),time);
 for(let j=1;j<r.trace.path.length;j++){
   time+=18;
   for(let p=0;p<2;p++)s=V.input(s,p,'trace-move',T.sampleAt(r.trace,r.trace.path[j].distance),time);
   if(s.phase==='summary')break;
 }
 assert.equal(s.phase,'summary');
 assert.deepEqual(s.results[0].clear,[true,true]);
 assert.equal(s.results[0].winner,null);
 assert.deepEqual(s.totals,[.5,.5]);
});
test('bridge wrong step fails only 1P, other player can still clear the same map',()=>{
 let s=runAt(1,45),r=s.round,time=1000;
 s=V.tick(s,time+5200);time+=5200;
 assert.equal(r.phase,'playing');
 const first=r.map.path[0],second=r.map.path[1],dx=second%r.map.width-first%r.map.width;
 const dy=Math.floor(second/r.map.width)-Math.floor(first/r.map.width);
 const direction=dx===1?'right':dx===-1?'left':dy===1?'down':'up';
 s=V.input(s,0,'step',{up:'down',down:'up',left:'right',right:'left'}[direction],time+100);
 assert.equal(r.players[0].done,true);
 assert.equal(r.players[1].done,false);
 for(let i=1;i<r.map.path.length;i++){
   const a=r.map.path[i-1],b=r.map.path[i],x=b%r.map.width-a%r.map.width;
   const y=Math.floor(b/r.map.width)-Math.floor(a/r.map.width);
   const dir=x===1?'right':x===-1?'left':y===1?'down':'up';
   time+=120;s=V.input(s,1,'step',dir,time);
 }
 assert.equal(s.phase,'summary');assert.equal(s.results[0].winner,1);
});
test('red light uses one shared signal schedule, but each player controls own movement',()=>{
 let s=runAt(2,112),r=s.round;
 s=V.input(s,0,'hold',true,1000);s=V.input(s,1,'hold',false,1000);
 for(let now=1020;now<9000&&s.phase==='playing';now+=20){
   s=V.tick(s,now);
   if(s.phase!=='playing')break;
   s=V.input(s,0,'hold',r.players[0].body.signal==='green',now);
 }
 assert.ok(r.players[0].progress>r.players[1].progress);
 assert.equal(r.players[1].body.progress,0);
});
test('tug rewards timing and punishes repeated tapping separately',()=>{
 let s=runAt(3,5),r=s.round;
 for(let now=1500;now<12000&&s.phase==='playing';now+=1000){
   s=V.input(s,0,'tap',null,now);
   for(let i=0;i<3&&s.phase==='playing';i++)s=V.input(s,1,'tap',null,now+i*60);
 }
 if(s.phase==='playing')s=V.tick(s,30000);
 assert.equal(s.phase,'summary');assert.equal(s.results[0].winner,0);
});
test('same marble questions, wrong answers affect only responding player',()=>{
 let s=runAt(4,66),r=s.round,time=1000;
 for(let i=0;i<5&&s.phase==='playing';i++){
   const q=r.players[0].body.questions[i];
   s=V.input(s,0,'choose',q.answer,time+=750);
   if(i<2&&s.phase==='playing')s=V.input(s,1,'choose',q.answer==='left'?'right':'left',time+100);
 }
 assert.equal(s.phase,'summary');
 assert.equal(r.players[0].clear,true);
 assert.equal(r.players[1].failed,true);
});
test('final memory, independent 2P timing and math permit fair finish',()=>{
 let s=runAt(5,38),r=s.round,time=1000;
 s=V.tick(s,time+4000);time+=4000;
 for(let i=0;i<4;i++){
   const shape=r.players[0].body.sequence[i];time+=110;
   s=V.input(s,0,'symbol',shape,time);s=V.input(s,1,'symbol',shape,time);
 }
 assert.equal(r.players[0].body.part,'timing');
 while(r.players[0].body.part==='timing'||r.players[1].body.part==='timing'){
   time+=35;
   s=V.tick(s,time);
   if(s.phase!=='playing')break;
   for(let i=0;i<2;i++)if(r.players[i].body.part==='timing'&&M.timingPosition(r.players[i].body)>=.84)
      s=V.input(s,i,'tap',null,time);
   if(time>30000)throw Error('final timer stalled');
 }
 for(let id=0;id<2&&s.phase==='playing';id++){
   const b=r.players[id].body;
   s=V.input(s,id,'answer',b.math.answer,time+=110);
 }
 assert.equal(s.phase,'summary');assert.deepEqual(s.results[0].clear,[true,true]);
});
test('exactly six rounds award 1 point for a win, 0.5 each for a draw',()=>{
 let s=V.start(V.initial(887));
 for(let index=0;index<6;index++){
   s=V.launch(s,10000*index);
   const r=s.round;
   r.players.forEach((p,id)=>{p.done=true;p.doneAt=r.startedAt+(index===5?500:1000+id*500);
      p.clear=index>=4?true:id===(index%2);p.failed=!p.clear;});
   s=V.tick(s,r.startedAt+1200);
   assert.equal(s.phase,'summary');
   assert.equal(s.results.length,index+1);
   s=V.next(s,r.startedAt+1500);
 }
 assert.equal(s.phase,'tiebreak');
 assert.deepEqual(s.totals,[3,3]);
 const start=s.tie.startsAt,answer=s.tie.question.answer;
 s=V.input(s,0,'answer',answer,start+100);
 s=V.input(s,1,'answer',answer,start+170);
 assert.equal(s.phase,'tiebreak');
 assert.equal(s.rematch,1);
 assert.ok(s.tie.startsAt<start+500);
 const good=s.tie.question.answer,bad=s.tie.question.options.find(x=>x!==good);
 s=V.input(s,0,'answer',good,start+260);
 s=V.input(s,1,'answer',bad,start+310);
 assert.equal(s.phase,'finished');
 assert.equal(s.champion,0);
 assert.equal(s.totals[0],4);
 assert.equal(V.start(s).phase,'intro');
});
test('rounds never double-credit even when stale inputs arrive',()=>{
 let s=runAt(4,12);
 for(let i=0;i<5;i++){let q=s.round.players[0].body.questions[i];s=V.input(s,0,'choose',q.answer,2000+i*400);}
 s=V.tick(s,20000);
 assert.equal(s.phase,'summary');
 const count=s.results.length,before=s.totals.join(',');
 s=V.input(s,0,'choose','left',25000);
 s=V.tick(s,28000);
 assert.equal(s.results.length,count);assert.equal(s.totals.join(','),before);
});
test('real DOM entry, independent touch captures, keyboard mapping and landscape pause present',()=>{
 assert.match(html,/data-game-id="squid_survival_versus"/);
 assert.match(html,/versus-rules\.js/);
 for(const id of ['board0','board1','controls0','controls1','score0','score1','rotate'])assert.ok(html.includes('id="'+id+'"'));
 for(const key of ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight',
   'KeyF','Space','Enter','KeyQ','KeyU','Digit1','Digit7'])assert.ok(ui.includes(key),key);
 assert.match(ui,/finger=\[null,null\]/);
 assert.match(ui,/setPointerCapture/);
 assert.match(ui,/visibilitychange/);
 assert.match(ui,/updatePause\(/);
 assert.match(css,/max-height:440px/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotThrow(()=>new Function(ui));
 const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data/games.json'),'utf8'));
 const game=catalog.games.find(x=>x.id==='squid_survival_versus');
 assert.equal(game.href,'games/squid-survival/versus/index.html');
 const lobby=fs.readFileSync(path.join(BASE,'index.html'),'utf8');
 assert.match(lobby,/\.\/versus\/index\.html/);
});
