import { QUESTION_BANK, chronologicalQuestionIndexes } from '../data/history-live-question-bank.mjs';

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});

const PREFIX = '/api/history-live/';
const MAX_PLAYERS = 26;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 8000;
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const QUESTIONS = QUESTION_BANK;


function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), { status, headers:{...JSON_HEADERS,...extra} });
}
function nowIso(ms=Date.now()){ return new Date(ms).toISOString(); }
function clampInt(v,min,max,fallback=min){ const n=Math.floor(Number(v)); return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback; }
function cleanNickname(v){ return String(v||'').replace(/[<>\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,14)||'역사 탐험가'; }
function cleanCode(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); }
function bearer(request){ const raw=request.headers.get('authorization')||''; return raw.startsWith('Bearer ')?raw.slice(7).trim():''; }
async function sha256(value){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));
  return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
}
function randomToken(){ const bytes=new Uint8Array(32); crypto.getRandomValues(bytes); return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''); }
function randomCode(){ const bytes=new Uint8Array(6); crypto.getRandomValues(bytes); return Array.from(bytes,b=>ROOM_ALPHABET[b%ROOM_ALPHABET.length]).join(''); }
function readRoomPlan(room){
  let raw=[]; try{raw=JSON.parse(room?.question_order_json||'[]')}catch(_){}
  if(Array.isArray(raw))return {questions:raw,checkpoints:[],orderMode:'random'};
  const questions=Array.isArray(raw?.questions)?raw.questions:[];
  const checkpoints=Array.isArray(raw?.checkpoints)?raw.checkpoints.map(Number).filter(Number.isInteger):[];
  return {questions,checkpoints:[...new Set(checkpoints)].sort((a,b)=>a-b),orderMode:raw?.orderMode==='chronological'?'chronological':'random'};
}
function normalizeCheckpoints(questionCount,body){
  const count=Number(questionCount)||15, mode=String(body?.checkpointMode||'none');
  let points=[];
  if(mode==='every5') for(let n=5;n<count;n+=5) points.push(n);
  else if(mode==='every10') for(let n=10;n<count;n+=10) points.push(n);
  else if(mode==='custom'){
    const raw=Array.isArray(body?.checkpointQuestions)?body.checkpointQuestions:String(body?.checkpointQuestions||'').split(',');
    points=raw.map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<count);
  }
  return [...new Set(points)].sort((a,b)=>a-b).slice(0,12);
}
function randomQuestionIndexes(count){
  const byFact=new Map();
  QUESTIONS.forEach((q,index)=>{const key=Number(q.sourceFact);if(!byFact.has(key))byFact.set(key,[]);byFact.get(key).push(index)});
  const facts=[...byFact.keys()],bytes=new Uint32Array(Math.max(1,facts.length*2));crypto.getRandomValues(bytes);
  for(let i=facts.length-1;i>0;i--){const j=bytes[i]%(i+1);[facts[i],facts[j]]=[facts[j],facts[i]]}
  return facts.slice(0,count).map((fact,pos)=>{
    const options=byFact.get(fact),pick=bytes[facts.length+pos%facts.length]%options.length;
    return options[pick];
  });
}
function shuffleIndexes(count){
  const a=Array.from({length:QUESTIONS.length},(_,i)=>i), bytes=new Uint32Array(a.length); crypto.getRandomValues(bytes);
  for(let i=a.length-1;i>0;i--){ const j=bytes[i]%(i+1); [a[i],a[j]]=[a[j],a[i]]; }
  return a.slice(0,count);
}
function optionOrder(room,position){
  let seed=2166136261;
  const key=String(room?.id||'')+':'+String(position);
  for(let i=0;i<key.length;i++) seed=Math.imul(seed^key.charCodeAt(i),16777619)>>>0;
  const order=[0,1,2,3];
  for(let i=order.length-1;i>0;i--){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const j=seed%(i+1); [order[i],order[j]]=[order[j],order[i]];
  }
  return order;
}
function displayedQuestion(room,q){
  const order=optionOrder(room,Number(room.current_question));
  return {order,options:order.map(index=>q.o[index]),answerIndex:order.indexOf(q.a)};
}
async function parseJson(request){
  if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}

const SCHEMA=[
  `CREATE TABLE IF NOT EXISTS history_live_rooms (
    id TEXT PRIMARY KEY, room_code TEXT NOT NULL UNIQUE, host_token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting', question_order_json TEXT NOT NULL,
    current_question INTEGER NOT NULL DEFAULT -1, question_count INTEGER NOT NULL DEFAULT 15,
    seconds_per_question INTEGER NOT NULL DEFAULT 12, question_started_at TEXT,
    question_deadline_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS history_live_players (
    id TEXT PRIMARY KEY, room_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
    FOREIGN KEY(room_id) REFERENCES history_live_rooms(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_history_live_players_room ON history_live_players(room_id)`,
  `CREATE TABLE IF NOT EXISTS history_live_answers (
    room_id TEXT NOT NULL, player_id TEXT NOT NULL, question_index INTEGER NOT NULL,
    option_index INTEGER NOT NULL, answered_at TEXT NOT NULL, is_correct INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(room_id,player_id,question_index),
    FOREIGN KEY(room_id) REFERENCES history_live_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY(player_id) REFERENCES history_live_players(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_history_live_answers_room_q ON history_live_answers(room_id,question_index)`
];
let schemaReady=false;
async function ensureSchema(env){ if(schemaReady)return; if(!env.DB)throw new Error('database-not-configured'); for(const sql of SCHEMA)await env.DB.prepare(sql).run(); schemaReady=true; }
async function cleanup(env,now=Date.now()){
  const expired=await env.DB.prepare('SELECT id FROM history_live_rooms WHERE expires_at < ?').bind(nowIso(now)).all();
  for(const row of expired.results||[]) await env.DB.batch([
    env.DB.prepare('DELETE FROM history_live_answers WHERE room_id=?').bind(row.id),
    env.DB.prepare('DELETE FROM history_live_players WHERE room_id=?').bind(row.id),
    env.DB.prepare('DELETE FROM history_live_rooms WHERE id=?').bind(row.id)
  ]);
}
async function uniqueCode(env){
  for(let i=0;i<12;i++){ const code=randomCode(); const row=await env.DB.prepare('SELECT 1 ok FROM history_live_rooms WHERE room_code=?').bind(code).first(); if(!row)return code; }
  throw new Error('room-code-exhausted');
}
async function roomByCode(env,code){ return env.DB.prepare('SELECT * FROM history_live_rooms WHERE room_code=?').bind(cleanCode(code)).first(); }
async function playerByToken(env,roomId,token){
  if(!/^[0-9a-f]{64}$/i.test(token))return null;
  const hash=await sha256(token);
  return env.DB.prepare('SELECT * FROM history_live_players WHERE room_id=? AND token_hash=?').bind(roomId,hash).first();
}
async function roleFor(env,room,token){
  if(!room||!/^[0-9a-f]{64}$/i.test(token))return {role:null,player:null};
  const hash=await sha256(token);
  if(hash===room.host_token_hash)return {role:'host',player:null};
  const player=await env.DB.prepare('SELECT * FROM history_live_players WHERE room_id=? AND token_hash=?').bind(room.id,hash).first();
  return player?{role:'player',player}:{role:null,player:null};
}
async function autoReveal(env,room,now=Date.now()){
  if(room?.status!=='question')return room;
  const count=await env.DB.prepare('SELECT COUNT(*) n FROM history_live_players WHERE room_id=?').bind(room.id).first();
  const answered=await env.DB.prepare('SELECT COUNT(*) n FROM history_live_answers WHERE room_id=? AND question_index=?').bind(room.id,room.current_question).first();
  const deadline=room.question_deadline_at?new Date(room.question_deadline_at).getTime():NaN;
  const everyoneAnswered=Number(count?.n||0)>0 && Number(answered?.n||0)>=Number(count?.n||0);
  if(!everyoneAnswered && (!Number.isFinite(deadline)||now<deadline))return room;
  await env.DB.prepare("UPDATE history_live_rooms SET status='reveal',updated_at=? WHERE id=? AND status='question'").bind(nowIso(now),room.id).run();
  return roomByCode(env,room.room_code);
}
async function createRoom(request,env){
  let body={}; try{body=await parseJson(request)}catch(_){}
  const questionCount=clampInt(body.questionCount,5,40,15), seconds=clampInt(body.secondsPerQuestion,8,30,12), checkpoints=normalizeCheckpoints(questionCount,body), orderMode=body.orderMode==='chronological'?'chronological':'random';
  await cleanup(env);
  const id=crypto.randomUUID(),code=await uniqueCode(env),token=randomToken(),hash=await sha256(token),now=Date.now(),order=orderMode==='chronological'?chronologicalQuestionIndexes(questionCount):randomQuestionIndexes(questionCount),plan={questions:order,checkpoints,orderMode};
  await env.DB.prepare(`INSERT INTO history_live_rooms
    (id,room_code,host_token_hash,status,question_order_json,current_question,question_count,seconds_per_question,created_at,updated_at,expires_at)
    VALUES (?,?,?,'waiting',?,-1,?,?,?,?,?)`)
    .bind(id,code,hash,JSON.stringify(plan),questionCount,seconds,nowIso(now),nowIso(now),nowIso(now+ROOM_TTL_MS)).run();
  return json({ok:true,code,hostToken:token,maxPlayers:MAX_PLAYERS,questionCount,secondsPerQuestion:seconds,checkpoints,orderMode},201);
}
async function joinRoom(request,env){
  let body; try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  const room=await roomByCode(env,body.code);
  if(!room)return json({ok:false,error:'room_not_found'},404);
  if(room.status!=='waiting')return json({ok:false,error:'room_already_started'},409);
  const count=await env.DB.prepare('SELECT COUNT(*) n FROM history_live_players WHERE room_id=?').bind(room.id).first();
  if(Number(count?.n||0)>=MAX_PLAYERS)return json({ok:false,error:'room_full'},409);
  let nick=cleanNickname(body.nickname);
  const names=await env.DB.prepare('SELECT nickname FROM history_live_players WHERE room_id=?').bind(room.id).all();
  const used=new Set((names.results||[]).map(r=>String(r.nickname).toLowerCase()));
  if(used.has(nick.toLowerCase())){ const base=nick.slice(0,11); let n=2; while(used.has((base+n).toLowerCase())&&n<99)n++; nick=(base+n).slice(0,14); }
  const token=randomToken(),hash=await sha256(token),id=crypto.randomUUID(),at=nowIso();
  await env.DB.prepare(`INSERT INTO history_live_players
    (id,room_id,token_hash,nickname,score,streak,joined_at,last_seen_at) VALUES (?,?,?,?,0,0,?,?)`)
    .bind(id,room.id,hash,nick,at,at).run();
  return json({ok:true,code:room.room_code,playerId:id,playerToken:token,nickname:nick},201);
}
function currentQuestion(room){
  const plan=readRoomPlan(room), pos=Number(room.current_question);
  if(pos<0||pos>=plan.questions.length)return null;
  const bankIndex=Number(plan.questions[pos]), q=QUESTIONS[bankIndex];
  return q?{...q,bankIndex}:null;
}
async function state(request,env){
  const url=new URL(request.url), room=await roomByCode(env,url.searchParams.get('code'));
  if(!room)return json({ok:false,error:'room_not_found'},404);
  const auth=await roleFor(env,room,bearer(request));
  if(!auth.role)return json({ok:false,error:'unauthorized'},401);
  const fresh=await autoReveal(env,room);
  if(auth.role==='player')await env.DB.prepare('UPDATE history_live_players SET last_seen_at=? WHERE id=?').bind(nowIso(),auth.player.id).run();
  const playersRes=await env.DB.prepare('SELECT id,nickname,score,streak,last_seen_at,joined_at FROM history_live_players WHERE room_id=? ORDER BY score DESC,joined_at ASC').bind(fresh.id).all();
  const players=playersRes.results||[], qi=Number(fresh.current_question);
  const ansRes=qi>=0?await env.DB.prepare('SELECT player_id,option_index,is_correct,points FROM history_live_answers WHERE room_id=? AND question_index=?').bind(fresh.id,qi).all():{results:[]};
  const answers=ansRes.results||[], answered=new Set(answers.map(a=>a.player_id)), now=Date.now();
  const roster=players.map((p,i)=>({id:p.id,nickname:p.nickname,score:Number(p.score||0),streak:Number(p.streak||0),rank:i+1,answered:answered.has(p.id),online:now-new Date(p.last_seen_at).getTime()<=ONLINE_WINDOW_MS}));
  const plan=readRoomPlan(fresh),q=currentQuestion(fresh),display=q?displayedQuestion(fresh,q):null;
  const payload={ok:true,role:auth.role,selfPlayerId:auth.player?.id||null,room:{code:fresh.room_code,status:fresh.status,maxPlayers:MAX_PLAYERS,questionNumber:qi+1,questionCount:Number(fresh.question_count),secondsPerQuestion:Number(fresh.seconds_per_question),deadlineAt:fresh.question_deadline_at||null,serverNow:nowIso(now),checkpoints:plan.checkpoints,orderMode:plan.orderMode},players:roster};
  if(q&&display&&['question','reveal','finished'].includes(fresh.status))payload.question={number:qi+1,total:Number(fresh.question_count),era:q.era,difficulty:q.difficulty,prompt:q.q,options:display.options};
  if(q&&fresh.status==='reveal'){
    const stats=[0,0,0,0]; answers.forEach(a=>{if(a.option_index>=0&&a.option_index<4)stats[a.option_index]++});
    payload.reveal={answerIndex:display.answerIndex,explanation:q.e,optionStats:stats,answeredCount:answers.length,correctCount:answers.filter(a=>Number(a.is_correct)===1).length};
  }
  if(fresh.status==='checkpoint')payload.checkpoint={afterQuestion:qi+1,nextQuestion:qi+2,totalPlayers:roster.length};
  if(fresh.status==='finished')payload.results=roster;
  return json(payload);
}
async function hostAction(request,env,action){
  let body; try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  let room=await roomByCode(env,body.code);
  if(!room)return json({ok:false,error:'room_not_found'},404);
  const auth=await roleFor(env,room,bearer(request));
  if(auth.role!=='host')return json({ok:false,error:'host_required'},403);
  const now=Date.now();
  if(action==='start'){
    if(room.status!=='waiting')return json({ok:false,error:'invalid_state'},409);
    const count=await env.DB.prepare('SELECT COUNT(*) n FROM history_live_players WHERE room_id=?').bind(room.id).first();
    if(Number(count?.n||0)<1)return json({ok:false,error:'no_players'},409);
    const deadline=now+Number(room.seconds_per_question)*1000;
    await env.DB.prepare(`UPDATE history_live_rooms SET status='question',current_question=0,question_started_at=?,question_deadline_at=?,updated_at=?,expires_at=? WHERE id=?`)
      .bind(nowIso(now),nowIso(deadline),nowIso(now),nowIso(now+ROOM_TTL_MS),room.id).run();
  }else if(action==='next'){
    room=await autoReveal(env,room,now);
    if(room.status!=='reveal')return json({ok:false,error:'reveal_not_ready'},409);
    const next=Number(room.current_question)+1,completed=Number(room.current_question)+1,plan=readRoomPlan(room);
    if(next>=Number(room.question_count)){
      await env.DB.prepare(`UPDATE history_live_rooms SET status='finished',question_started_at=NULL,question_deadline_at=NULL,updated_at=?,expires_at=? WHERE id=?`)
        .bind(nowIso(now),nowIso(now+30*60*1000),room.id).run();
    }else if(plan.checkpoints.includes(completed)){
      await env.DB.prepare(`UPDATE history_live_rooms SET status='checkpoint',question_started_at=NULL,question_deadline_at=NULL,updated_at=? WHERE id=?`)
        .bind(nowIso(now),room.id).run();
    }else{
      const deadline=now+Number(room.seconds_per_question)*1000;
      await env.DB.prepare(`UPDATE history_live_rooms SET status='question',current_question=?,question_started_at=?,question_deadline_at=?,updated_at=? WHERE id=?`)
        .bind(next,nowIso(now),nowIso(deadline),nowIso(now),room.id).run();
    }
  }else if(action==='continue'){
    if(room.status!=='checkpoint')return json({ok:false,error:'checkpoint_not_ready'},409);
    const next=Number(room.current_question)+1,deadline=now+Number(room.seconds_per_question)*1000;
    await env.DB.prepare(`UPDATE history_live_rooms SET status='question',current_question=?,question_started_at=?,question_deadline_at=?,updated_at=? WHERE id=?`)
      .bind(next,nowIso(now),nowIso(deadline),nowIso(now),room.id).run();
  }else if(action==='close'){
    await env.DB.batch([
      env.DB.prepare('DELETE FROM history_live_answers WHERE room_id=?').bind(room.id),
      env.DB.prepare('DELETE FROM history_live_players WHERE room_id=?').bind(room.id),
      env.DB.prepare('DELETE FROM history_live_rooms WHERE id=?').bind(room.id)
    ]);
  }
  return json({ok:true});
}
async function answerQuestion(request,env){
  let body; try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  let room=await roomByCode(env,body.code);
  if(!room)return json({ok:false,error:'room_not_found'},404);
  room=await autoReveal(env,room);
  if(room.status!=='question')return json({ok:false,error:'answer_closed'},409);
  const player=await playerByToken(env,room.id,bearer(request));
  if(!player)return json({ok:false,error:'player_required'},403);
  const raw=Number(body.optionIndex);
  if(!Number.isInteger(raw)||raw<0||raw>3)return json({ok:false,error:'invalid_option'},400);
  const now=Date.now(),deadline=new Date(room.question_deadline_at).getTime(),started=new Date(room.question_started_at).getTime();
  if(!Number.isFinite(deadline)||now>deadline)return json({ok:false,error:'answer_closed'},409);
  const qi=Number(room.current_question),q=currentQuestion(room);
  if(!q)return json({ok:false,error:'question_missing'},500);
  const display=displayedQuestion(room,q),originalOption=display.order[raw];
  const correct=originalOption===q.a,duration=Math.max(1,deadline-started),remaining=Math.max(0,deadline-now),speed=Math.round(500*(remaining/duration));
  const newStreak=correct?Number(player.streak||0)+1:0,streakBonus=correct&&newStreak>=2?Math.min(300,(newStreak-1)*100):0,points=correct?1000+speed+streakBonus:0;
  const inserted=await env.DB.prepare(`INSERT OR IGNORE INTO history_live_answers
    (room_id,player_id,question_index,option_index,answered_at,is_correct,points) VALUES (?,?,?,?,?,?,?)`)
    .bind(room.id,player.id,qi,raw,nowIso(now),correct?1:0,points).run();
  if(!Number(inserted?.meta?.changes||0))return json({ok:false,error:'already_answered'},409);
  await env.DB.prepare('UPDATE history_live_players SET score=score+?,streak=?,last_seen_at=? WHERE id=?').bind(points,newStreak,nowIso(now),player.id).run();
  return json({ok:true,submitted:true});
}

export async function handleHistoryLiveRequest(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith(PREFIX))return null;
  try{
    await ensureSchema(env);
    if(request.method==='GET'&&url.pathname==='/api/history-live/health')return json({ok:true,database:'ready',questions:QUESTIONS.length,maxPlayers:MAX_PLAYERS});
    if(request.method==='POST'&&url.pathname==='/api/history-live/rooms')return createRoom(request,env);
    if(request.method==='POST'&&url.pathname==='/api/history-live/join')return joinRoom(request,env);
    if(request.method==='GET'&&url.pathname==='/api/history-live/state')return state(request,env);
    if(request.method==='POST'&&url.pathname==='/api/history-live/start')return hostAction(request,env,'start');
    if(request.method==='POST'&&url.pathname==='/api/history-live/next')return hostAction(request,env,'next');
    if(request.method==='POST'&&url.pathname==='/api/history-live/continue')return hostAction(request,env,'continue');
    if(request.method==='POST'&&url.pathname==='/api/history-live/close')return hostAction(request,env,'close');
    if(request.method==='POST'&&url.pathname==='/api/history-live/answer')return answerQuestion(request,env);
    return json({ok:false,error:'not_found'},404);
  }catch(error){
    console.error('[history-live]',error);
    const msg=String(error?.message||'');
    if(/database-not-configured|no such table|SQLITE/i.test(msg))return json({ok:false,error:'history_live_database_not_ready'},503);
    return json({ok:false,error:'history_live_server_error'},500);
  }
}

export { QUESTIONS, MAX_PLAYERS };
