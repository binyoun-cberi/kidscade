import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function setup(ticket=async()=>({ticket:'short-lived'})){
  const timers=new Map(),intervals=new Map(),sockets=[],modes=[],states=[];let seq=0;
  class Socket{
    constructor(url){this.url=String(url);this.readyState=1;this.sent=[];sockets.push(this);}
    send(message){this.sent.push(message);}
    close(code=1000){this.readyState=3;this.onclose?.({code});}
  }
  const ctx={
    URL,Date,Math,location:{href:'https://game.test/games/low_wordchain_arena/multiplayer.html'},
    WebSocket:Socket,
    setTimeout:(f,ms)=>{timers.set(++seq,{f,ms});return seq;},
    clearTimeout:id=>timers.delete(id),
    setInterval:(f,ms)=>{intervals.set(++seq,{f,ms});return seq;},
    clearInterval:id=>intervals.delete(id)
  };
  vm.runInNewContext(fs.readFileSync(new URL('../wordchain-realtime.js',import.meta.url),'utf8'),ctx);
  const client=new ctx.WordchainRealtime({code:'0ABCDE',ticket,onMode:v=>modes.push(v),onState:s=>states.push(s)});
  return {client,timers,intervals,sockets,modes,states};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('wordchain socket becomes authoritative after its initial state',async()=>{
  const h=setup();h.client.start();await tick();
  const ws=h.sockets[0];
  assert.match(ws.url,/\/api\/multiplayer\/wordchain\/socket/);
  assert.match(ws.url,/code=0ABCDE/);
  ws.onmessage({data:JSON.stringify({type:'state',state:{code:'0ABCDE',status:'waiting'}})});
  assert.equal(h.client.ready,true);
  assert.deepEqual(h.modes,[true]);
  assert.equal(h.states.length,1);
  h.client.stop();
});

test('wordchain transport ignores another room state',async()=>{
  const h=setup();h.client.start();await tick();
  h.sockets[0].onmessage({data:JSON.stringify({type:'state',state:{code:'0ZZZZZ'}})});
  assert.equal(h.client.ready,false);
  assert.equal(h.states.length,0);
  h.client.stop();
});

test('socket failure enables same-room HTTP fallback mode and bounded reconnect',async()=>{
  const h=setup();h.client.start();await tick();
  h.sockets[0].onclose({code:1006});
  assert.deepEqual(h.modes,[false]);
  assert.ok([...h.timers.values()].some(t=>t.ms>=1000&&t.ms<=1500));
  h.client.stop();
});

test('replaced wordchain tab stops reconnecting',async()=>{
  const h=setup();let replaced=false;h.client.onReplaced=()=>{replaced=true;};
  h.client.start();await tick();h.sockets[0].onclose({code:4001});
  assert.equal(replaced,true);
  assert.equal(h.client.stopped,true);
  assert.equal(h.timers.size,0);
});

test('stopping before ticket resolution cannot resurrect a socket',async()=>{
  let resolve;
  const h=setup(()=>new Promise(r=>{resolve=r;}));
  h.client.start();h.client.stop();resolve({ticket:'late'});await tick();
  assert.equal(h.sockets.length,0);
});
