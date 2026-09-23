import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = p => fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
function serverHarness(file, age, participant=true) {
  let reads=0,writes=0;
  const bundle={room:{id:'r',status:'waiting'},players:participant?[{student_id:'s',last_seen_at:new Date(Date.now()-age).toISOString()}]:[]};
  const context=vm.createContext({Response,Request,URL,console,Date,
    auth:async()=>({row:{student_id:'s'}}),
    fetchBundle:async()=>{reads++;return bundle},
    env:{DB:{prepare(){return {bind(){return this},async run(){writes++;return {meta:{changes:1}}}}}}}
  });
  const word=file.includes('wordchain');
  vm.runInContext(read(file).replaceAll('export ', '')+`
    requireStudent=auth;
    ${word?'fetchRoomBundle':'fetchRoom'}=fetchBundle;
    serializeRoom=(bundle)=>bundle;
    globalThis.run=${word?'stateRoom':'syncRoom'};
  `,context);
  return {context,counts:()=>({reads,writes})};
}
for(const file of ['worker/wordchain-match.mjs','worker/multiplayer.mjs']) {
  test(file+' idle polling reads a bundle once and does not write fresh presence',async()=>{
    const h=serverHarness(file,1000);
    const r=await h.context.run(new Request('https://test/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:'r'})}),h.context.env);
    assert.equal(r.status,200);assert.deepEqual(h.counts(),{reads:1,writes:0});
  });
  test(file+' stale presence writes once; repeated polling stays read-only',async()=>{
    const h=serverHarness(file,16000);
    for(let i=0;i<3;i++)await h.context.run(new Request('https://test/state',{method:'POST',headers:{'content-type':'application/json'},body:'{"roomId":"r"}'}),h.context.env);
    assert.deepEqual(h.counts(),{reads:3,writes:1});
  });
  test(file+' refuses nonparticipants before writing',async()=>{
    const h=serverHarness(file,16000,false);
    const r=await h.context.run(new Request('https://test/state',{method:'POST',headers:{'content-type':'application/json'},body:'{"roomId":"r"}'}),h.context.env);
    assert.equal(r.status,403);assert.equal(h.counts().writes,0);
  });
}
function pollingHarness(tower=false){
 const html=read(tower?'games/patience-tower-duel/index.html':'games/low_wordchain_arena/multiplayer.html');
 const source=tower?html.slice(html.indexOf('  async function syncTick('),html.indexOf('  async function prepareGame')):html.slice(html.indexOf('async function sync(){'),html.indexOf('async function toggleReady'));
 const pending=[],scheduled=[],rendered=[];
 const ctx=vm.createContext({document:{hidden:false},Date,Math,room:{id:'old',status:'playing'},pollEnabled:true,pollGeneration:1,pollBusy:false,pollFailures:0,syncBusy:false,syncFailures:0,finishPending:false,localBest:0,
 api:()=>new Promise(resolve=>pending.push(resolve)),scheduleSync:d=>scheduled.push(d),render:r=>rendered.push(r),renderRoom:r=>rendered.push(r),pushOpponentPose:()=>{},readCurrentHeight:()=>12,readCurrentPose:()=>null,nowServer:Date.now,freezeGame:()=>{}});
 vm.runInContext(source,ctx);return {ctx,pending,scheduled,rendered,run:()=>tower?ctx.syncTick():ctx.sync()};
}
for(const tower of [false]){
 test('wordchain delayed network never overlaps polls or applies an old room response',async()=>{
  const h=pollingHarness(tower),a=h.run();await h.run();assert.equal(h.pending.length,1);
  h.ctx.room={id:'new'};h.ctx.pollGeneration++;h.pending[0]({room:{id:'old'}});await a;
  assert.equal(h.rendered.length,0);
 });
}
for(const path of ['games/patience-tower-duel/index.html','games/low_wordchain_arena/multiplayer.html','games/high_history_timebattle/history_timebattle.html'])test(path+' inline scripts parse',()=>{
 for(const match of read(path).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc=/.test(match[1])&&!/type=["'](?:module|application\/)/.test(match[1]))new vm.Script(match[2]);
});

test('tower realtime removes D1 pose polling',()=>{
 const html=read('games/patience-tower-duel/index.html');
 const room=read('worker/tower-room.mjs');
 assert.doesNotMatch(html,/\/api\/multiplayer\/sync/);
 assert.match(html,/tower-realtime\.js/);
 assert.match(room,/broadcastPose/);
 assert.doesNotMatch(room,/env\.DB\.prepare/);
});
