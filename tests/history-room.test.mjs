import test from 'node:test';
import assert from 'node:assert/strict';
import { HistoryQuizRoom } from '../worker/history-room.mjs';
import { routeHistoryRoom } from '../worker/history-room-router.mjs';
import { createState,addPlayer,hostCommand,answer,advanceDeadline,snapshot } from '../worker/history-room-model.mjs';
import { displayedQuestion } from '../worker/history-live.mjs';

function model(n=2){const s=createState('0ABCDE','host',{},Date.now());for(let i=0;i<n;i++)addPlayer(s,'학생'+i,'hash'+i,Date.now());return s;}
function command(s,action,extra={}){return hostCommand(s,action,{requestId:crypto.randomUUID(),roundId:s.roundId,version:s.version,...extra},Date.now());}
function body(s,optionIndex=0){return {roundId:s.roundId,questionIndex:s.qi,optionIndex};}
function correct(s){return displayedQuestion({id:s.roundId,current_question:s.qi},s.questions[s.qi]).answerIndex;}
class Storage {
  constructor(){this.map=new Map();this.alarm=null;this.writes=0;this.fail=false;}
  async get(k){return structuredClone(this.map.get(k));}
  async put(k,v){if(this.fail)throw Error('disk failed');this.writes++;this.map.set(k,structuredClone(v));}
  async setAlarm(at){this.alarm=at;}
  async getAlarm(){return this.alarm;}
  async delete(key){this.map.delete(key);}
  async deleteAlarm(){this.alarm=null;}
  async deleteAll(){this.map.clear();}
  async transaction(fn){const before=new Map(this.map),alarm=this.alarm;try{return await fn(this);}catch(e){this.map=before;this.alarm=alarm;throw e;}}
}
function harness(storage=new Storage(),sockets=[]){
 const env={DB:{prepare(){return{bind(){return this},run:async()=>({success:true})}}}};
 const ctx={storage,getWebSockets:()=>sockets,blockConcurrencyWhile:fn=>fn(),setWebSocketAutoResponse(){}};
 return {room:new HistoryQuizRoom(ctx,env),storage,ctx,env};
}
const req=(path,body={},token)=>new Request('https://game.test/api/history-live/'+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
async function setup(n=2){
 const h=harness();const created=await (await h.room.fetch(req('rooms?code=0ABCDE'))).json();
 const players=[];for(let i=0;i<n;i++)players.push(await (await h.room.fetch(req('join',{nickname:'아이'+i}))).json());
 const s=h.room.state;
 await h.room.fetch(req('start',{roundId:s.roundId,version:s.version,requestId:crypto.randomUUID()},created.hostToken));
 return {...h,created,players};
}
test('26 simultaneous submissions commit once per student and reveal once',async()=>{
 const h=await setup(26),s=h.room.state,choice=correct(s),request=body(s,choice);
 const responses=await Promise.all(h.players.flatMap(p=>[h.room.fetch(req('answer',request,p.playerToken)),h.room.fetch(req('answer',request,p.playerToken))]));
 assert.ok(responses.every(r=>r.status===200));assert.equal(Object.keys(h.room.state.answers).length,26);
 assert.equal(h.room.state.status,'reveal');assert.ok(h.room.state.players.every(p=>p.streak===1&&p.score<=1500));
 assert.equal(h.room.state.version,s.version+27);
});
test('storage failure does not acknowledge an answer or mutate in-memory score',async()=>{
 const h=await setup(),before=structuredClone(h.room.state);h.storage.fail=true;
 const r=await h.room.fetch(req('answer',body(before,correct(before)),h.players[0].playerToken));
 assert.equal(r.status,500);assert.deepEqual(h.room.state,before);
 h.storage.fail=false;const retry=await h.room.fetch(req('answer',body(before,correct(before)),h.players[0].playerToken));
 assert.equal(retry.status,200);assert.equal(Object.keys(h.room.state.answers).length,1);
});
test('hibernation/restart restores acknowledged answers, score and deadline',async()=>{
 const h=await setup();await h.room.fetch(req('answer',body(h.room.state,correct(h.room.state)),h.players[0].playerToken));
 const restored=harness(h.storage);await restored.room.ready;
 assert.deepEqual(restored.room.state,h.room.state);
 const r=await restored.room.fetch(req('answer',body(h.room.state,correct(h.room.state)),h.players[0].playerToken));
 assert.equal((await r.json()).duplicate,true);
});
test('active question responses hide scores, streak changes, options and answers of others',()=>{
 const s=model();command(s,'start');answer(s,s.players[0].id,body(s,correct(s)),Date.now());
 const view=snapshot(s,{role:'player',id:s.players[1].id},Date.now());
 assert.ok(view.players.every(p=>p.score===0&&p.streak===0&&!p.answered));
 assert.equal(view.reveal,undefined);assert.equal(view.question.answerIndex,undefined);assert.equal(view.question.era,undefined);
 const ack=answer(s,s.players[0].id,body(s,correct(s)),Date.now());assert.equal(ack.correct,undefined);assert.equal(ack.points,undefined);
});
test('late previous-round answer is rejected, even with matching question number',()=>{
 const s=model();command(s,'start');const old=body(s);s.status='finished';command(s,'reconfigure');command(s,'start');
 assert.throws(()=>answer(s,s.players[0].id,old,Date.now()),/stale_question/);
});
test('duplicate alarms reveal only once and break absent player streaks',()=>{
 const s=model();s.players[0].streak=3;command(s,'start');assert.equal(advanceDeadline(s,s.deadlineAt),true);
 const version=s.version;assert.equal(advanceDeadline(s,s.deadlineAt+1000),false);assert.equal(s.version,version);assert.equal(s.players[0].streak,0);
});
test('host action retry cannot advance another question and stale version is refused',()=>{
 const s=model();const b={roundId:s.roundId,version:s.version,requestId:crypto.randomUUID()};hostCommand(s,'start',b,Date.now());
 assert.equal(hostCommand(s,'start',b,Date.now()).duplicate,true);
 assert.throws(()=>hostCommand(s,'next',{...b,requestId:crypto.randomUUID()},Date.now()),/stale_state/);
 assert.throws(()=>hostCommand(s,'next',b,Date.now()),/request_id_conflict/);
});
test('unknown player cannot answer and participant cannot execute host actions',async()=>{
 const h=await setup();const r=await h.room.fetch(req('close',{roundId:h.room.state.roundId,version:h.room.state.version,requestId:crypto.randomUUID()},h.players[0].playerToken));
 assert.equal(r.status,403);assert.equal(h.room.state.status,'question');
 const bad=await h.room.fetch(req('answer',body(h.room.state),'a'.repeat(64)));assert.equal(bad.status,401);
});
test('nickname plus public player id cannot reclaim someone else token',async()=>{
 const h=harness();await h.room.fetch(req('rooms?code=0ABCDE'));
 const p=await (await h.room.fetch(req('join',{nickname:'가람'}))).json();
 const other=await (await h.room.fetch(req('join',{nickname:'가람',playerId:p.playerId}))).json();
 assert.notEqual(other.playerId,p.playerId);assert.notEqual(other.nickname,p.nickname);
});
test('HTTP fallback is read-only in an unchanged phase',async()=>{
 const h=await setup(),writes=h.storage.writes;
 for(let i=0;i<10;i++)assert.equal((await h.room.fetch(new Request('https://game.test/api/history-live/state',{headers:{authorization:'Bearer '+h.players[0].playerToken}}))).status,200);
 assert.equal(h.storage.writes,writes);
});
test('result export retries are bounded and result ID stable',async()=>{
 const h=await setup();let calls=0;h.env.DB.prepare=()=>({bind(){return this},async run(){calls++;throw Error('offline');}});
 const s=structuredClone(h.room.state);s.status='reveal';s.qi=s.questionCount-1;command(s,'next');await h.room.commit(s);
 const key=h.room.state.outbox[0].key;
 for(let i=0;i<7;i++){
  if(i<6)h.room.state.outbox[0].retryAt=Date.now()-1;
  await h.room.alarm();
 }
 assert.equal(calls,6);assert.equal(h.room.state.outbox[0].key,key);assert.equal(h.room.state.outbox[0].retryAt,null);
});
test('legacy room routes remain legacy; v2 rooms never fall back to legacy D1',async()=>{
 assert.equal(await routeHistoryRoom(req('answer',{code:'ABC234'}),{}),null);
 assert.equal((await routeHistoryRoom(req('answer',{code:'0ABCDE'}),{})).status,503);
 assert.equal(await routeHistoryRoom(req('rooms',{transport:'v2'}),{HISTORY_LIVE_V2:'false'}),null);
});
test('cross-origin mutations are rejected before invoking room binding',async()=>{
 const r=new Request('https://game.test/api/history-live/answer',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.test'},body:'{"code":"0ABCDE"}'});
 assert.equal((await routeHistoryRoom(r,{HISTORY_ROOMS:{}})).status,403);
});
test('largest room snapshot fits below KV value limit with bounded history',()=>{
 const s=model(26);Object.assign(s,(createState('0ABCDE','host',{questionCount:40},Date.now())) ,{players:s.players});
 assert.ok(new TextEncoder().encode(JSON.stringify(s)).length<100000);
});
test('pilot at zero keeps new rooms legacy without redirecting existing v2 rooms',async()=>{
 const env={HISTORY_LIVE_V2:'true',HISTORY_LIVE_V2_PERCENT:'0'};
 assert.equal(await routeHistoryRoom(req('rooms',{transport:'v2'}),env),null);
 assert.equal((await routeHistoryRoom(req('answer',{code:'0ABCDE'}),env)).status,503);
});
test('question payload is not rewritten on each answer',async()=>{
 const h=await setup();const key='questions:'+h.room.state.roundId;
 const stored=h.storage.map.get(key);
 await h.room.fetch(req('answer',body(h.room.state),h.players[0].playerToken));
 assert.equal(h.storage.map.get(key),stored);
 assert.equal(h.storage.map.get('room').questions,undefined);
});
test('explicit host retry restores bounded failed result export',async()=>{
 const h=await setup();const s=structuredClone(h.room.state);s.status='reveal';s.qi=s.questionCount-1;command(s,'next');
 s.outbox[0].attempts=6;s.outbox[0].retryAt=null;await h.room.commit(s);
 assert.equal((await h.room.fetch(req('retry-results',{},h.players[0].playerToken))).status,403);
 assert.equal((await h.room.fetch(req('retry-results',{},h.created.hostToken))).status,200);
 assert.equal(h.room.state.outbox[0].attempts,0);assert.ok(h.room.state.outbox[0].retryAt>Date.now());
});
