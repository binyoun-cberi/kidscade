const PREFIX = '/api/history-live/';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const reply = (error,status) => Response.json({ok:false,error},{status,headers:{'cache-control':'no-store'}});
export async function routeHistoryRoom(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(PREFIX)) return null;
  const action = url.pathname.slice(PREFIX.length);
  if (!['rooms','join','state','ticket','socket','heartbeat','answer','start','next','continue','reconfigure','close','retry-results'].includes(action)) return null;
  let body = {};
  if (request.method === 'POST') {
    if (!(request.headers.get('content-type') || '').includes('application/json')) return reply('json_required',400);
    if (Number(request.headers.get('content-length') || 0) > 8192) return reply('request_too_large',413);
    const raw = await request.clone().text();
    if (raw.length > 8192) return reply('request_too_large',413);
    try { body = JSON.parse(raw); } catch { return reply('invalid_json',400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply('invalid_json',400);
  }
  // Legacy codes never contained 0. The namespace is unambiguous, even during rollback.
  const code = String(body.code || url.searchParams.get('code') || '').toUpperCase();
  const creating = action === 'rooms' && request.method === 'POST' && body.transport === 'v2' && env.HISTORY_LIVE_V2 === 'true';
  if (!creating && !code.startsWith('0')) return null;
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || (action === 'socket' && origin !== url.origin)) return reply('invalid_origin',403);
  if (!env.HISTORY_ROOMS) return reply('history_v2_unavailable',503);
  // Authenticated traffic is keyed by token, not classroom shared IP.
  // Only anonymous admission uses a generous per-IP cap; creation has a separate cap.
  const identity=request.headers.get('authorization');
  const limiter=creating?env.HISTORY_CREATE_LIMIT:identity?env.HISTORY_REQUEST_LIMIT:env.HISTORY_ANON_LIMIT;
  if(limiter){
    const source=identity||request.headers.get('cf-connecting-ip')||'local';
    const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');
    if(!(await limiter.limit({key})).success)return reply('rate_limited',429);
  }
  if (creating) {
    for (let attempt=0; attempt<5; attempt++) {
      const bytes = crypto.getRandomValues(new Uint8Array(5));
      const roomCode = '0' + Array.from(bytes,b=>ALPHABET[b % ALPHABET.length]).join('');
      const target = new URL(request.url); target.searchParams.set('code',roomCode);
      const result = await env.HISTORY_ROOMS.get(env.HISTORY_ROOMS.idFromName(roomCode)).fetch(new Request(target,request));
      if (result.status !== 409) return result;
    }
    return reply('room_code_exhausted',503);
  }
  if (!/^0[A-HJ-NP-Z2-9]{5}$/.test(code)) return reply('invalid_room_code',400);
  return env.HISTORY_ROOMS.get(env.HISTORY_ROOMS.idFromName(code)).fetch(request);
}
