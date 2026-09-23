import {
  createState, addOrReconnect, authForHash, snapshot, setReady, startMatch,
  advanceDeadline, validateSubmission, applySubmission, leaveMatch, fail, WordchainError
} from './wordchain-room-model.mjs';
import { dictionaryLookup, hasContinuation } from './wordchain-dictionary.mjs';

const json = (body,status=200) => Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
async function hash(value) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)))),
    b=>b.toString(16).padStart(2,'0')
  ).join('');
}
function errorResponse(error) {
  const message=String(error?.message||'');
  if (/wordchain-static-assets-not-configured|wordchain-asset-|invalid-wordchain-manifest/.test(message)) {
    console.error('wordchain v2 dictionary failed',error);
    return json({ok:false,error:'wordchain_dictionary_not_ready'},503);
  }
  if (error instanceof WordchainError || error?.status) {
    return json({ok:false,error:message,...(error.extra||{})},error.status||409);
  }
  console.error('wordchain v2 room failed',error);
  return json({ok:false,error:'multiplayer_internal_error'},500);
}

export class WordchainRoom {
  constructor(ctx,env) {
    this.ctx=ctx;
    this.env=env;
    this.state=null;
    this.queue=Promise.resolve();
    this.ready=ctx.blockConcurrencyWhile(async()=>{
      this.state=await ctx.storage.get('room')||null;
    });
    if (typeof WebSocketRequestResponsePair !== 'undefined') {
      ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
    }
  }

  serial(fn) {
    const task=this.queue.then(async()=>{await this.ready;return fn();});
    this.queue=task.catch(()=>{});
    return task;
  }

  async commit(next) {
    const now=Date.now();
    const deadlines=[next.expiresAt];
    if (next.status==='playing' && next.turnDeadline) deadlines.push(next.turnDeadline);
    await this.ctx.storage.transaction(async tx=>{
      await tx.put('room',next);
      const deadline=Math.max(now+50,Math.min(...deadlines.filter(Number.isFinite)));
      if (await tx.getAlarm()!==deadline) await tx.setAlarm(deadline);
    });
    this.state=next;
  }

  connectedIds() {
    return new Set(this.ctx.getWebSockets().map(ws=>{
      try{return ws.deserializeAttachment()?.id||null;}catch{return null;}
    }).filter(Boolean));
  }

  view(auth) {
    return snapshot(this.state,auth,this.connectedIds(),Date.now());
  }

  broadcast() {
    if (!this.state) return;
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const auth=ws.deserializeAttachment();
        if (!auth) continue;
        ws.send(JSON.stringify({type:'state',state:this.view(auth)}));
      } catch {
        try{ws.close(1011,'send_failed');}catch{}
      }
    }
  }

  async due() {
    if (!this.state) return;
    const now=Date.now();
    if (now>=this.state.expiresAt) {
      for (const ws of this.ctx.getWebSockets()) {
        try{ws.send(JSON.stringify({type:'closed'}));ws.close(1000,'room_expired');}catch{}
      }
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      this.state=null;
      return;
    }
    const next=structuredClone(this.state);
    if (advanceDeadline(next,now)) {
      await this.commit(next);
      this.broadcast();
    }
  }

  async authenticate(request) {
    const value=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
    if (!/^[a-f0-9]{64}$/.test(value)) fail('not_authenticated',401);
    const auth=authForHash(this.state,await hash(value));
    if (!auth) fail('not_authenticated',401);
    return auth;
  }

  fetch(request) {
    return this.serial(async()=>{
      try{return await this.handle(request);}
      catch(error){return errorResponse(error);}
    });
  }

  async handle(request) {
    const url=new URL(request.url);
    const action=url.pathname.split('/').pop();
    const now=Date.now();
    const getAction=request.method==='GET' && ['state','socket'].includes(action);
    const postAction=request.method==='POST' && action!=='socket';
    if (!getAction && !postAction) fail('method_not_allowed',405);
    const body=request.method==='POST'?await request.json():{};
    await this.due();

    if (action==='rooms') {
      if (request.headers.get('x-kidscade-wordchain-admit')!=='1') fail('not_authenticated',401);
      if (this.state) fail('room_exists',409);
      const identity=body.identity;
      if (!identity?.id) fail('not_authenticated',401);
      const roomToken=token();
      const seed=crypto.getRandomValues(new Uint32Array(1))[0]&0x7fffffff||1;
      const next=createState(url.searchParams.get('code'),identity,await hash(roomToken),body.maxPlayers,now,seed);
      await this.commit(next);
      const auth={id:identity.id};
      return json({ok:true,transport:'v2',code:next.code,roomToken,room:this.view(auth)},201);
    }

    if (!this.state) fail('room_not_found',404);

    if (action==='join') {
      if (request.headers.get('x-kidscade-wordchain-admit')!=='1') fail('not_authenticated',401);
      const identity=body.identity;
      if (!identity?.id) fail('not_authenticated',401);
      const roomToken=token();
      const next=structuredClone(this.state);
      const result=addOrReconnect(next,identity,await hash(roomToken),now);
      await this.commit(next);
      this.broadcast();
      return json({
        ok:true,
        transport:'v2',
        code:next.code,
        roomToken,
        reconnected:result.reconnected,
        room:this.view({id:identity.id})
      },result.reconnected?200:201);
    }

    if (action==='socket') return this.connect(request);

    const auth=await this.authenticate(request);
    if (action==='state') return json({ok:true,room:this.view(auth)});
    if (action==='heartbeat') return json({ok:true,wrote:false});
    if (action==='ticket') {
      const next=structuredClone(this.state);
      const old=next.tickets[auth.id];
      if (old && old.expiresAt-now>55000) fail('retry_later',429);
      const ticket=token();
      next.tickets[auth.id]={hash:await hash(ticket),expiresAt:now+60000,auth};
      await this.commit(next);
      return json({ok:true,ticket,expiresIn:60});
    }

    const next=structuredClone(this.state);
    let result;
    if (action==='ready') {
      setReady(next,auth.id,body.ready,now);
      result={ok:true};
    } else if (action==='start') {
      startMatch(next,auth.id,now);
      result={ok:true};
    } else if (action==='submit') {
      const check=validateSubmission(next,auth.id,body,now);
      if (check.duplicate) {
        return json({ok:true,...check.result,duplicate:true,room:this.view(auth)});
      }
      const lookup=await dictionaryLookup(request,this.env,check.word);
      if (lookup.blocked) fail('word_not_allowed',422);
      if (!lookup.exists) fail('word_not_found',404);
      const used=new Set(next.usedWords);
      used.add(check.word);
      const continuation=await hasContinuation(request,this.env,check.word,used);
      result=applySubmission(next,check,continuation,now);
    } else if (action==='leave') {
      result=leaveMatch(next,auth.id,now);
      if (result.closed) {
        for (const ws of this.ctx.getWebSockets()) try{ws.close(1000,'room_closed');}catch{}
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
        this.state=null;
        return json({ok:true,left:true});
      }
    } else {
      fail('not_found',404);
    }

    if (!result?.duplicate) {
      await this.commit(next);
      this.broadcast();
    }
    return json({ok:true,...result,room:this.view(auth)});
  }

  async connect(request) {
    const url=new URL(request.url);
    if (request.headers.get('origin')!==url.origin) fail('invalid_origin',403);
    if ((request.headers.get('upgrade')||'').toLowerCase()!=='websocket') fail('websocket_required',426);
    const ticket=url.searchParams.get('ticket')||'';
    if (!/^[a-f0-9]{64}$/.test(ticket)) fail('not_authenticated',401);
    const digest=await hash(ticket);
    const entry=Object.entries(this.state.tickets).find(([,value])=>value.hash===digest&&value.expiresAt>Date.now());
    if (!entry) fail('not_authenticated',401);
    const [id,{auth}]=entry;
    const next=structuredClone(this.state);
    delete next.tickets[id];
    await this.commit(next);

    for (const old of this.ctx.getWebSockets()) {
      if (old.deserializeAttachment()?.id===id) {
        try{old.close(4001,'replaced');}catch{}
      }
    }

    const pair=new WebSocketPair();
    const client=pair[0],server=pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({...auth,lastSyncAt:Date.now()});
    server.send(JSON.stringify({type:'state',state:this.view(auth)}));
    return new Response(null,{status:101,webSocket:client});
  }

  webSocketMessage(ws,message) {
    return this.serial(async()=>{
      const auth=ws.deserializeAttachment();
      if (message!=='sync' || !auth) {
        ws.close(1008,'invalid_message');
        return;
      }
      if (Date.now()-Number(auth.lastSyncAt||0)<2000) return;
      auth.lastSyncAt=Date.now();
      ws.serializeAttachment(auth);
      await this.due();
      if (!this.state) {
        ws.close(1000,'room_closed');
        return;
      }
      ws.send(JSON.stringify({type:'state',state:this.view(auth)}));
    });
  }

  webSocketClose(ws,code) {
    try{ws.close(code===1006?1000:code);}catch{}
    this.broadcast();
  }
  webSocketError(ws) {
    try{ws.close(1011,'connection_error');}catch{}
    this.broadcast();
  }

  alarm() {
    return this.serial(async()=>{await this.due();});
  }
}
