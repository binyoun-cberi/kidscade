import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// Optional real workerd test: npm install --no-save miniflare@4 esbuild, then run this file.
// HISTORY_TEST_DEPS points to an isolated dependency directory in CI if desired.
const require=createRequire(process.env.HISTORY_TEST_DEPS?path.resolve(process.env.HISTORY_TEST_DEPS,'package.json'):import.meta.url);
let Miniflare,build;
try{({Miniflare}=require('miniflare'));({build}=require('esbuild'));}catch{}
test('real SQLite Durable Object: WebSocket push, one-time tickets, private progress, 26 concurrent answers and result export', {skip:!Miniflare,timeout:60000},async()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const output=await build({stdin:{contents:"export { HistoryQuizRoom } from './worker/history-room.mjs';import {routeHistoryRoom} from './worker/history-room-router.mjs';export default {async fetch(r,e){return await routeHistoryRoom(r,e)||new Response('legacy',{status:404})}}",resolveDir:root,sourcefile:'runtime-test.mjs'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  const persistence=fs.mkdtempSync(path.join(os.tmpdir(),'history-v2-runtime-'));
  const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:process.env.HISTORY_TEST_DATE||'2026-08-06',bindings:{HISTORY_LIVE_V2:'true'},durableObjects:{HISTORY_ROOMS:{className:'HistoryQuizRoom',useSQLite:true}},durableObjectsPersist:path.join(persistence,'do'),d1Databases:{DB:'test-history'},d1Persist:path.join(persistence,'d1')});
  const sockets=[];
  const post=async(action,body={},token)=>{
    const response=await mf.dispatchFetch('https://game.test/api/history-live/'+action,{method:'POST',headers:{'content-type':'application/json',origin:'https://game.test',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
    const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;
  };
  const getState=async(code,token)=>(await mf.dispatchFetch('https://game.test/api/history-live/state?code='+code,{headers:{authorization:'Bearer '+token}})).json();
  const connect=async(code,token)=>{
    const {ticket}=await post('ticket',{code},token);
    const url='https://game.test/api/history-live/socket?code='+code+'&ticket='+ticket;
    const r=await mf.dispatchFetch(url,{headers:{Upgrade:'websocket',Origin:'https://game.test'}});assert.equal(r.status,101);
    const ws=r.webSocket;sockets.push(ws);const messages=[];
    ws.addEventListener('message',e=>{if(e.data!=='pong')messages.push(JSON.parse(e.data));});ws.accept();
    const repeated=await mf.dispatchFetch(url,{headers:{Upgrade:'websocket',Origin:'https://game.test'}});assert.equal(repeated.status,401);
    return {ws,messages};
  };
  async function waitFor(fn,timeout=4000){const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)assert.fail('websocket event timed out');await new Promise(r=>setTimeout(r,10));}}
  try{
    const db=await mf.getD1Database('DB');await db.exec(fs.readFileSync(path.join(root,'migrations/0010_history_live_v2_results.sql'),'utf8').replaceAll('\n',' '));
    const host=await post('rooms',{transport:'v2',questionCount:5,secondsPerQuestion:8});assert.match(host.code,/^0/);
    const players=[];for(let i=0;i<26;i++)players.push(await post('join',{code:host.code,nickname:'학생'+i}));
    const teacher=await connect(host.code,host.hostToken),student=await connect(host.code,players[0].playerToken);
    await waitFor(()=>teacher.messages.length&&student.messages.length);
    let state=await getState(host.code,host.hostToken);
    const hostAction=async(action)=>{await post(action,{code:host.code,roundId:state.room.roundId,version:state.version,requestId:crypto.randomUUID()},host.hostToken);state=await getState(host.code,host.hostToken);};
    await hostAction('start');await waitFor(()=>student.messages.some(m=>m.state?.room.status==='question'));
    const studentCount=student.messages.length;
    await post('answer',{code:host.code,roundId:state.room.roundId,questionIndex:0,optionIndex:0},players[1].playerToken);
    await waitFor(()=>teacher.messages.some(m=>m.state?.players.some(p=>p.answered)));
    assert.equal(student.messages.length,studentCount,'another student answer should not broadcast to all students');
    for(let q=0;q<5;q++){
      const bodies=players.map(p=>post('answer',{code:host.code,roundId:state.room.roundId,questionIndex:q,optionIndex:0},p.playerToken));
      const answers=await Promise.all(bodies);assert.ok(answers.every(a=>a.submitted&&!('correct' in a)));
      state=await getState(host.code,host.hostToken);assert.equal(state.room.status,'reveal');
      await hostAction('next');
    }
    assert.equal(state.room.status,'finished');
    await waitFor(()=>student.messages.some(m=>m.state?.room.status==='finished'));
    const end=Date.now()+5000;let row;
    do {row=await db.prepare('SELECT COUNT(*) AS n FROM history_live_v2_results').first();if(row.n)break;await new Promise(r=>setTimeout(r,50));}while(Date.now()<end);
    assert.equal(row.n,1);
    const firstRound=state.room.roundId;await hostAction('reconfigure');assert.notEqual(state.room.roundId,firstRound);assert.equal(state.room.status,'waiting');
    await hostAction('start');
    const roundId=state.room.roundId;
    // No state polling or answers: the durable alarm alone must reveal the question.
    await waitFor(()=>student.messages.some(m=>m.state?.room.roundId===roundId&&m.state?.room.status==='reveal'),35000);
    let pong=false;student.ws.addEventListener('message',e=>{if(e.data==='pong')pong=true;});student.ws.send('ping');await waitFor(()=>pong);
  }finally{for(const ws of sockets)try{ws.close();}catch{}await mf.dispose();}
});
