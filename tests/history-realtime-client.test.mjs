import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function setup(ticket=async()=>({ticket:'short-lived'})){
 const timers=new Map(),intervals=new Map(),sockets=[],modes=[],states=[];let seq=0;
 class Socket{constructor(url){this.url=String(url);this.readyState=1;this.sent=[];sockets.push(this);}send(m){this.sent.push(m);}close(){this.readyState=3;this.onclose?.({code:1000});}}
 const ctx={URL,Date,Math,location:{href:'https://game.test/game'},WebSocket:Socket,setTimeout:(f,ms)=>{timers.set(++seq,{f,ms});return seq;},clearTimeout:id=>timers.delete(id),setInterval:(f,ms)=>{intervals.set(++seq,{f,ms});return seq;},clearInterval:id=>intervals.delete(id)};
 vm.runInNewContext(fs.readFileSync(new URL('../history-live-realtime.js',import.meta.url),'utf8'),ctx);
 const client=new ctx.HistoryLiveRealtime({code:'0ABCDE',ticket,onMode:v=>modes.push(v),onState:s=>states.push(s)});
 return {client,timers,intervals,sockets,modes,states};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('socket becomes ready only after a valid initial state and uses auto ping',async()=>{
 const h=setup();h.client.start();await tick();assert.equal(h.client.ready,false);
 const ws=h.sockets[0];assert.match(ws.url,/ticket=short-lived/);
 ws.onmessage({data:JSON.stringify({type:'state',state:{room:{code:'0ABCDE'}}})});
 assert.equal(h.client.ready,true);assert.deepEqual(h.modes,[true]);assert.equal(h.timers.size,0);
 [...h.intervals.values()][0].f();assert.deepEqual(ws.sent,['ping']);h.client.stop();assert.equal(h.intervals.size,0);
});
test('a stopped room ignores a ticket that arrives later',async()=>{
 let resolve;const h=setup(()=>new Promise(r=>{resolve=r;}));h.client.start();h.client.stop();resolve({ticket:'late'});await tick();assert.equal(h.sockets.length,0);
});
test('socket failure enables fallback and schedules bounded reconnect',async()=>{
 const h=setup();h.client.start();await tick();h.sockets[0].onclose({code:1006});
 assert.deepEqual(h.modes,[false]);assert.ok([...h.timers.values()].some(t=>t.ms>=1000&&t.ms<=1500));h.client.stop();
});
test('replaced connection stops instead of fighting a second tab',async()=>{
 const h=setup();let replaced=false;h.client.onReplaced=()=>{replaced=true;};h.client.start();await tick();h.sockets[0].onclose({code:4001});
 assert.equal(replaced,true);assert.equal(h.client.stopped,true);assert.equal(h.timers.size,0);
});
