const PREFIX='/api/multiplayer/wordchain/';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SESSION_COOKIE='kc_session';
const reply=(error,status,extra={})=>Response.json({ok:false,error,...extra},{status,headers:{'cache-control':'no-store'}});

function parseCookies(request) {
  const out={};
  for (const part of (request.headers.get('cookie')||'').split(';')) {
    const index=part.indexOf('=');
    if (index<0) continue;
    const key=part.slice(0,index).trim();
    if (key) out[key]=part.slice(index+1).trim();
  }
  return out;
}

async function sha256(value) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)))),
    b=>b.toString(16).padStart(2,'0')
  ).join('');
}

async function requireStudent(request,env) {
  if (!env.DB) return {response:reply('account_database_not_configured',503)};
  const session=parseCookies(request)[SESSION_COOKIE]||'';
  if (!/^[0-9a-f]{64}$/i.test(session)) return {response:reply('not_authenticated',401)};
  const tokenHash=await sha256(session);
  const row=await env.DB.prepare(`
    SELECT a.id AS student_id, a.nickname, a.disabled, s.expires_at
    FROM student_sessions s
    JOIN student_accounts a ON a.id=s.student_id
    WHERE s.token_hash=?
  `).bind(tokenHash).first();
  if (!row || row.disabled) return {response:reply('not_authenticated',401)};
  if (!row.expires_at || Date.parse(row.expires_at)<=Date.now()) return {response:reply('session_expired',401)};
  return {row};
}

async function parseBody(request) {
  if (request.method!=='POST') return {};
  if (!(request.headers.get('content-type')||'').toLowerCase().includes('application/json')) throw Object.assign(new Error('json_required'),{status:400});
  if (Number(request.headers.get('content-length')||0)>8192) throw Object.assign(new Error('request_too_large'),{status:413});
  const raw=await request.clone().text();
  if (raw.length>8192) throw Object.assign(new Error('request_too_large'),{status:413});
  const body=JSON.parse(raw||'{}');
  if (!body || typeof body!=='object' || Array.isArray(body)) throw Object.assign(new Error('invalid_json'),{status:400});
  return body;
}

function validCode(value) {
  return /^0[A-HJ-NP-Z2-9]{5}$/.test(String(value||'').toUpperCase());
}

function randomCode() {
  const bytes=crypto.getRandomValues(new Uint8Array(5));
  return '0'+Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');
}

async function limited(binding,key) {
  if (!binding) return true;
  return (await binding.limit({key:await sha256(key)})).success;
}

function internalRequest(request,target,body) {
  const headers=new Headers();
  headers.set('content-type','application/json');
  headers.set('x-kidscade-wordchain-admit','1');
  return new Request(target,{method:'POST',headers,body:JSON.stringify(body)});
}

export async function routeWordchainRoom(request,env) {
  const url=new URL(request.url);
  if (!url.pathname.startsWith(PREFIX)) return null;
  const action=url.pathname.slice(PREFIX.length);
  const allowed=['rooms','join','state','ticket','socket','heartbeat','ready','start','submit','leave'];
  if (!allowed.includes(action)) return reply('not_found',404);

  const origin=request.headers.get('origin');
  if ((origin&&origin!==url.origin)||(action==='socket'&&origin!==url.origin)) return reply('invalid_origin',403);
  if (!env.WORDCHAIN_ROOMS) return reply('wordchain_v2_unavailable',503);

  let body={};
  try{body=await parseBody(request);}
  catch(error){return reply(error.message==='Unexpected end of JSON input'?'invalid_json':error.message,error.status||400);}

  if (action==='rooms'&&request.method==='POST') {
    const auth=await requireStudent(request,env);
    if (auth.response) return auth.response;
    if (!await limited(env.WORDCHAIN_CREATE_LIMIT,auth.row.student_id)) return reply('rate_limited',429);
    for (let attempt=0;attempt<6;attempt++) {
      const code=randomCode();
      const target=new URL(request.url);
      target.searchParams.set('code',code);
      const identity={id:auth.row.student_id,nickname:auth.row.nickname};
      const response=await env.WORDCHAIN_ROOMS.get(env.WORDCHAIN_ROOMS.idFromName(code))
        .fetch(internalRequest(request,target,{...body,identity}));
      if (response.status!==409) return response;
    }
    return reply('room_code_exhausted',503);
  }

  if (action==='join'&&request.method==='POST') {
    const code=String(body.code||'').toUpperCase();
    if (!validCode(code)) return reply('room_not_found',404);
    const auth=await requireStudent(request,env);
    if (auth.response) return auth.response;
    if (!await limited(env.WORDCHAIN_REQUEST_LIMIT,auth.row.student_id)) return reply('rate_limited',429);
    const target=new URL(request.url);
    target.searchParams.set('code',code);
    const identity={id:auth.row.student_id,nickname:auth.row.nickname};
    return env.WORDCHAIN_ROOMS.get(env.WORDCHAIN_ROOMS.idFromName(code))
      .fetch(internalRequest(request,target,{...body,code,identity}));
  }

  const code=String(body.code||url.searchParams.get('code')||'').toUpperCase();
  if (!validCode(code)) return reply('room_not_found',404);
  const identity=request.headers.get('authorization')||request.headers.get('cf-connecting-ip')||'local';
  const limiter=request.headers.get('authorization')?env.WORDCHAIN_REQUEST_LIMIT:env.WORDCHAIN_ANON_LIMIT;
  if (!await limited(limiter,identity)) return reply('rate_limited',429);
  return env.WORDCHAIN_ROOMS.get(env.WORDCHAIN_ROOMS.idFromName(code)).fetch(request);
}
