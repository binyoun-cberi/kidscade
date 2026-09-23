import { requireStudent, nickname } from './multiplayer.mjs';

const PREFIX = '/api/multiplayer/tower/';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const reply = (error, status) => Response.json(
  { ok: false, error },
  { status, headers: { 'cache-control': 'no-store' } }
);

function codeOf(body, url) {
  return String(body.code || url.searchParams.get('code') || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function forward(request, code, body, student) {
  const url = new URL(request.url);
  url.searchParams.set('code', code);
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  if (student) {
    headers.set('x-kc-student-id', String(student.student_id));
    headers.set('x-kc-nickname', nickname(student.nickname));
  }
  return new Request(url, {
    method: request.method,
    headers,
    body: request.method === 'POST' ? JSON.stringify(body) : undefined
  });
}

export async function routeTowerRoom(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(PREFIX)) return null;

  const action = url.pathname.slice(PREFIX.length);
  if (!['rooms', 'join', 'state', 'ticket', 'socket', 'ready', 'leave'].includes(action)) {
    return null;
  }

  let body = {};
  if (request.method === 'POST') {
    if (!(request.headers.get('content-type') || '').includes('application/json')) {
      return reply('invalid_json', 400);
    }
    try { body = await request.clone().json(); } catch (_) {
      return reply('invalid_json', 400);
    }
  }

  const creating =
    action === 'rooms' &&
    request.method === 'POST' &&
    body.transport === 'v2' &&
    env.TOWER_LIVE_V2 === 'true';

  let code = codeOf(body, url);
  if (!creating && !code.startsWith('1')) return null;
  if (!env.TOWER_ROOMS) return reply('multiplayer_internal_error', 503);

  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || (action === 'socket' && origin !== url.origin)) {
    return reply('invalid_origin', 403);
  }

  if (creating) {
    const auth = await requireStudent(request, env);
    if (auth.response) return auth.response;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const bytes = crypto.getRandomValues(new Uint8Array(5));
      code = '1' + Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
      const stub = env.TOWER_ROOMS.get(env.TOWER_ROOMS.idFromName(code));
      const response = await stub.fetch(forward(request, code, body, auth.row));
      if (response.status !== 409) return response;
    }
    return reply('room_code_exhausted', 503);
  }

  if (!/^1[A-HJ-NP-Z2-9]{5}$/.test(code)) return reply('invalid_room_code', 400);

  const stub = env.TOWER_ROOMS.get(env.TOWER_ROOMS.idFromName(code));
  if (action === 'join') {
    const auth = await requireStudent(request, env);
    if (auth.response) return auth.response;
    return stub.fetch(forward(request, code, body, auth.row));
  }
  return stub.fetch(request);
}
