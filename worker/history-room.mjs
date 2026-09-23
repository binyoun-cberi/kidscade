import { createState, roleFor, addPlayer, advanceDeadline, hostCommand, answer, snapshot, fail } from './history-room-model.mjs';

const json = (body,status=200) => Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
async function hash(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join(''); }
const errorResponse = e => json({ok:false,error:e.status?e.message:'history_live_server_error'},e.status||500);

// One serialized command stream for HTTP requests, alarms, and WebSocket callbacks.
// No server setInterval: hibernation remains possible between actual game events.
export class HistoryQuizRoom {
  constructor(ctx, env) {
    this.ctx=ctx; this.env=env; this.state=null; this.queue=Promise.resolve();
    this.ready=ctx.blockConcurrencyWhile(async()=>{
      const saved=await ctx.storage.get('room');
      if(saved)this.state={...saved,questions:await ctx.storage.get('questions:'+saved.roundId)};
    });
    if (typeof WebSocketRequestResponsePair !== 'undefined') ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
  }
  serial(fn) {
    const task=this.queue.then(async()=>{await this.ready;return fn();});
    this.queue=task.catch(()=>{}); return task;
  }
  async commit(next) {
    const now=Date.now();
    const times=[next.expiresAt];
    if(next.status==='question')times.push(next.deadlineAt);
    for(const item of next.outbox)if(item.retryAt)times.push(item.retryAt);
    const {questions,...saved}=next;
    const previousRound=this.state?.roundId;
    await this.ctx.storage.transaction(async tx=>{
      // Immutable questions are stored once per round, not rewritten for every answer.
      if(previousRound!==next.roundId){
        await tx.put('questions:'+next.roundId,questions);
        if(previousRound)await tx.delete('questions:'+previousRound);
      }
      await tx.put('room',saved);
      const deadline=Math.max(now+50,Math.min(...times));
      if(await tx.getAlarm()!==deadline)await tx.setAlarm(deadline);
    });
    // Publish in memory only after durable commit succeeds.
    this.state=next;
  }
  async due() {
    if(!this.state)return;
    if(Date.now()>=this.state.expiresAt){
      if(this.state.status!=='closed'){
        const next=structuredClone(this.state);next.status='closed';next.version++;
        // Retain pending result exports for manual recovery without an infinite alarm loop.
        const {questions,...saved}=next;await this.ctx.storage.put('room',saved);this.state=next;
        this.broadcast();
      }
      for(const ws of this.ctx.getWebSockets())try{ws.close(1000,'room_closed');}catch{}
      await this.ctx.storage.deleteAlarm();
      if(!this.state.outbox.length){await this.ctx.storage.deleteAll();this.state=null;}
      return;
    }
    const next=structuredClone(this.state);
    if(advanceDeadline(next,Date.now())){await this.commit(next);this.broadcast();}
  }
  async authenticate(request) {
    const value=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
    if(!/^[a-f0-9]{64}$/.test(value))fail('unauthorized',401);
    const auth=roleFor(this.state,await hash(value));
    if(!auth)fail('unauthorized',401);return auth;
  }
  view(auth) {
    const data=snapshot(this.state,auth,Date.now());
    const connected=new Set(this.ctx.getWebSockets().map(ws=>{try{return ws.deserializeAttachment()?.id;}catch{return null;}}));
    for(const p of data.players)p.online=connected.has(p.id)||p.id===auth.id;
    return data;
  }
  broadcast(hostOnly=false) {
    for(const ws of this.ctx.getWebSockets()){
      try{
        const auth=ws.deserializeAttachment();if(!auth||hostOnly&&auth.role!=='host')continue;
        ws.send(JSON.stringify({type:'state',state:this.view(auth)}));
      }catch{try{ws.close(1011,'send_failed');}catch{}}
    }
  }
  fetch(request) { return this.serial(async()=>{try{return await this.handle(request);}catch(e){return errorResponse(e);}}); }
  async handle(request) {
    const url=new URL(request.url),action=url.pathname.split('/').pop(),now=Date.now();
    if(!((request.method==='GET'&&['state','socket'].includes(action))||(request.method==='POST'&&!['state','socket'].includes(action))))fail('method_not_allowed',405);
    const body=request.method==='POST'?await request.json():{};
    await this.due();
    if(action==='rooms'){
      if(this.state)fail('room_exists');
      const hostToken=token();const next=createState(url.searchParams.get('code'),await hash(hostToken),body,now);
      await this.commit(next);
      return json({ok:true,code:next.code,hostToken,transport:'v2',maxPlayers:26},201);
    }
    if(!this.state)fail('room_not_found',404);
    if(action==='retry-results'){
      const auth=await this.authenticate(request);if(auth.role!=='host')fail('host_required',403);
      const next=structuredClone(this.state);
      for(const item of next.outbox){item.attempts=0;item.retryAt=Date.now()+1000;}
      next.expiresAt=Date.now()+6*60*60*1000;await this.commit(next);
      return json({ok:true,pending:next.outbox.length});
    }
    if(this.state.status==='closed')fail('room_closed',410);
    if(action==='join'){
      // A nickname or public player id is never proof of ownership.
      if(request.headers.has('authorization')){
        const auth=await this.authenticate(request);
        const p=this.state.players.find(p=>p.id===auth.id);
        if(!p)fail('player_required',403);
        return json({ok:true,code:this.state.code,playerId:p.id,nickname:p.nickname,transport:'v2',reconnected:true});
      }
      const playerToken=token(),next=structuredClone(this.state);
      const p=addPlayer(next,body.nickname,await hash(playerToken),now);
      await this.commit(next);this.broadcast();
      return json({ok:true,code:next.code,playerId:p.id,nickname:p.nickname,playerToken,transport:'v2'},201);
    }
    if(action==='socket')return this.connect(request);
    const auth=await this.authenticate(request);
    if(action==='state')return json(this.view(auth));
    if(action==='heartbeat')return json({ok:true,wrote:false});
    if(action==='ticket'){
      const next=structuredClone(this.state),old=next.tickets[auth.id];
      if(old&&old.expiresAt-now>55000)fail('retry_later',429);
      const ticket=token();next.tickets[auth.id]={hash:await hash(ticket),expiresAt:now+60000,auth};
      await this.commit(next);return json({ok:true,ticket,expiresIn:60});
    }
    const next=structuredClone(this.state);let result;
    if(action==='answer'){
      if(auth.role!=='player')fail('player_required',403);
      result=answer(next,auth.id,body,now);
    }else{
      if(auth.role!=='host')fail('host_required',403);
      result=hostCommand(next,action,body,now);
    }
    if(!result.duplicate){
      await this.commit(next);
      // Answer progress goes only to the teacher; reveal goes to everyone.
      this.broadcast(action==='answer'&&next.status==='question');
    }
    return json(result);
  }
  async connect(request) {
    const url=new URL(request.url);
    if(request.headers.get('origin')!==url.origin)fail('invalid_origin',403);
    if((request.headers.get('upgrade')||'').toLowerCase()!=='websocket')fail('websocket_required',426);
    const ticket=url.searchParams.get('ticket')||'';
    if(!/^[a-f0-9]{64}$/.test(ticket))fail('unauthorized',401);
    const digest=await hash(ticket),entry=Object.entries(this.state.tickets).find(([,v])=>v.hash===digest&&v.expiresAt>Date.now());
    if(!entry)fail('unauthorized',401);
    const [id,{auth}]=entry,next=structuredClone(this.state);delete next.tickets[id];await this.commit(next);
    for(const old of this.ctx.getWebSockets())if(old.deserializeAttachment()?.id===id)try{old.close(4001,'replaced');}catch{}
    const pair=new WebSocketPair(),client=pair[0],server=pair[1];
    this.ctx.acceptWebSocket(server);server.serializeAttachment({...auth,lastSyncAt:Date.now()});
    server.send(JSON.stringify({type:'state',state:this.view(auth)}));
    return new Response(null,{status:101,webSocket:client});
  }
  webSocketMessage(ws,message) {
    return this.serial(async()=>{
      const auth=ws.deserializeAttachment();
      // Keepalive ping is answered by the runtime without waking this object.
      if(message!=='sync'||!auth){ws.close(1008,'invalid_message');return;}
      if(Date.now()-auth.lastSyncAt<2000)return;
      auth.lastSyncAt=Date.now();ws.serializeAttachment(auth);
      await this.due();
      if(!this.state||this.state.status==='closed'){ws.close(1000,'room_closed');return;}
      ws.send(JSON.stringify({type:'state',state:this.view(auth)}));
    });
  }
  webSocketClose(ws,code) { try{ws.close(code===1006?1000:code);}catch{} }
  webSocketError(ws) { try{ws.close(1011,'connection_error');}catch{} }
  alarm() {
    return this.serial(async()=>{
      await this.due();if(!this.state||Date.now()>=this.state.expiresAt)return;
      const next=structuredClone(this.state);let changed=false;
      for(const item of [...next.outbox]){
        if(!item.retryAt||item.retryAt>Date.now())continue;
        changed=true;
        try{
          await this.env.DB.prepare('INSERT OR IGNORE INTO history_live_v2_results (id,room_id,round_id,round_number,results_json,created_at) VALUES (?,?,?,?,?,?)')
            .bind(item.key,next.id,item.roundId,item.round,JSON.stringify(item.players),new Date(item.createdAt).toISOString()).run();
          next.outbox=next.outbox.filter(x=>x.key!==item.key);
        }catch{
          item.attempts++;item.retryAt=item.attempts<6?Date.now()+Math.min(3600000,30000*2**item.attempts):null;
          console.warn('history_result_export_retry',{roomId:next.id,attempts:item.attempts});
        }
      }
      // Also reschedule early/duplicate alarms to the next real deadline.
      await this.commit(changed?next:this.state);
    });
  }
}
