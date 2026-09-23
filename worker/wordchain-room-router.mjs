import { requireStudent, nickname } from './wordchain-match.mjs';
const PREFIX='/api/multiplayer/wordchain/',ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const reply=(error,status)=>Response.json({ok:false,error},{status,headers:{'cache-control':'no-store'}});
const codeOf=(body,url)=>String(body.code||url.searchParams.get('code')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
function forwarded(request,code,body,student){const url=new URL(request.url);url.searchParams.set('code',code);const headers=new Headers(request.headers);if(student){headers.set('x-kc-student-id',String(student.student_id));headers.set('x-kc-nickname',nickname(student.nickname))}return new Request(url,{method:request.method,headers,body:request.method==='POST'?JSON.stringify(body):undefined})}
export async function routeWordchainRoom(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;const action=url.pathname.slice(PREFIX.length);if(!['rooms','join','state','ticket','socket','heartbeat','ready','start','submit','leave'].includes(action))return null;
 let body={};if(request.method==='POST'){if(!(request.headers.get('content-type')||'').includes('application/json'))return reply('invalid_json',400);try{body=await request.clone().json()}catch{return reply('invalid_json',400)}}
 const creating=action==='rooms'&&request.method==='POST'&&body.transport==='v2'&&env.WORDCHAIN_LIVE_V2==='true';let code=codeOf(body,url);if(!creating&&!code.startsWith('0'))return null;if(!env.WORDCHAIN_ROOMS)return reply('multiplayer_internal_error',503);
 const origin=request.headers.get('origin');if((origin&&origin!==url.origin)||(action==='socket'&&origin!==url.origin))return reply('invalid_origin',403);
 if(creating){const auth=await requireStudent(request,env);if(auth.response)return auth.response;for(let n=0;n<5;n++){const bytes=crypto.getRandomValues(new Uint8Array(5));code='0'+Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');const stub=env.WORDCHAIN_ROOMS.get(env.WORDCHAIN_ROOMS.idFromName(code));const res=await stub.fetch(forwarded(request,code,body,auth.row));if(res.status!==409)return res}return reply('room_code_exhausted',503)}
 if(!/^0[A-HJ-NP-Z2-9]{5}$/.test(code))return reply('invalid_room_code',400);const stub=env.WORDCHAIN_ROOMS.get(env.WORDCHAIN_ROOMS.idFromName(code));
 if(action==='join'){const auth=await requireStudent(request,env);if(auth.response)return auth.response;return stub.fetch(forwarded(request,code,body,auth.row))}
 return stub.fetch(request)
}
