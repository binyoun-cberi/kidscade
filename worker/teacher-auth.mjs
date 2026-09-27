const SESSION_COOKIE = 'kc_teacher_session';
const SESSION_MAX_AGE_SEC = 12 * 60 * 60;
const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_MINUTES = 10;
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
const JSON_HEADERS = Object.freeze({
  'content-type':'application/json; charset=utf-8',
  'x-content-type-options':'nosniff',
  'referrer-policy':'same-origin',
  'cache-control':'no-store'
});

function json(data,status=200,extraHeaders={}) {
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extraHeaders}});
}
function nowIso(){return new Date().toISOString()}
function bytesToHex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
function bytesToBase64(bytes){
  let binary='';
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(text){
  const binary=atob(String(text||''));
  return Uint8Array.from(binary,ch=>ch.charCodeAt(0));
}
function randomBytes(size){const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return bytes}
function randomToken(){return bytesToHex(randomBytes(32))}
function randomPassword(length=10){
  const bytes=randomBytes(length);
  let out='';
  for(let i=0;i<length;i+=1) out+=PASSWORD_ALPHABET[bytes[i]%PASSWORD_ALPHABET.length];
  return out;
}
function normalizeTeacherId(value){
  return String(value||'').trim().toUpperCase().replace(/\s+/g,'').slice(0,40);
}
function parseCookies(request){
  const header=request.headers.get('cookie')||'';
  const out={};
  header.split(';').forEach(part=>{
    const index=part.indexOf('=');
    if(index<0)return;
    const key=part.slice(0,index).trim();
    const value=part.slice(index+1).trim();
    if(key)out[key]=value;
  });
  return out;
}
function getBearer(request){
  const auth=request.headers.get('authorization')||'';
  return auth.startsWith('Bearer ')?auth.slice(7).trim():'';
}
function secureEqual(left,right){
  const a=String(left||''),b=String(right||'');
  let diff=a.length^b.length;
  const length=Math.max(a.length,b.length);
  for(let i=0;i<length;i+=1) diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return diff===0;
}
async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));
  return bytesToHex(new Uint8Array(digest));
}
async function passwordHash(loginId,password,pepper){
  const key=await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(pepper||'')),
    {name:'HMAC',hash:'SHA-256'},
    false,
    ['sign']
  );
  const signature=await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(normalizeTeacherId(loginId)+':'+String(password||''))
  );
  return bytesToHex(new Uint8Array(signature));
}
async function encryptionKey(pepper){
  const digest=await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('kidscade-teacher-credentials:'+String(pepper||''))
  );
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function encryptPassword(password,pepper){
  const iv=randomBytes(12);
  const key=await encryptionKey(pepper);
  const encrypted=await crypto.subtle.encrypt(
    {name:'AES-GCM',iv},
    key,
    new TextEncoder().encode(String(password||''))
  );
  return {ciphertext:bytesToBase64(new Uint8Array(encrypted)),iv:bytesToBase64(iv)};
}
export async function decryptTeacherPassword(ciphertext,iv,pepper){
  const key=await encryptionKey(pepper);
  const decrypted=await crypto.subtle.decrypt(
    {name:'AES-GCM',iv:base64ToBytes(iv)},
    key,
    base64ToBytes(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}
function makeSessionCookie(token,maxAge=SESSION_MAX_AGE_SEC){
  return SESSION_COOKIE+'='+token+'; Path=/; Max-Age='+maxAge+'; HttpOnly; Secure; SameSite=Strict';
}
function clearSessionCookie(){return makeSessionCookie('',0)}
function configError(env){
  if(!env.DB)return json({ok:false,error:'account_database_not_configured'},503);
  if(!env.KIDSCADE_ACCOUNT_PEPPER)return json({ok:false,error:'account_secret_not_configured'},503);
  return null;
}
function isGlobalAdmin(request,env){
  return Boolean(env.KIDSCADE_ADMIN_KEY)&&secureEqual(getBearer(request),env.KIDSCADE_ADMIN_KEY);
}
async function parseJson(request){
  const type=request.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('application/json'))throw new Error('json-required');
  return request.json();
}
function clampInt(value,min,max){
  const number=Math.floor(Number(value));
  if(!Number.isFinite(number))return min;
  return Math.min(max,Math.max(min,number));
}
function safeObject(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
function safeArray(value,limit=400){return Array.isArray(value)?value.slice(0,limit):[]}
function cleanStringArray(value,limit=400){
  return safeArray(value,limit).map(item=>String(item||'').trim().slice(0,100)).filter(Boolean);
}
function cleanStringMap(value,maxEntries=80){
  const out={};
  Object.entries(safeObject(value)).slice(0,maxEntries).forEach(([key,entry])=>{
    const safeKey=String(key||'').trim().slice(0,80);
    if(!safeKey||['__proto__','prototype','constructor'].includes(safeKey))return;
    if(typeof entry==='string'||typeof entry==='number'||typeof entry==='boolean'||entry===null){
      out[safeKey]=typeof entry==='string'?entry.slice(0,180):entry;
    }
  });
  return out;
}
function boundedJsonObject(value,byteLimit=56*1024){
  const input=safeObject(value);
  const text=JSON.stringify(input);
  if(new TextEncoder().encode(text).byteLength>byteLimit)return {};
  return JSON.parse(text);
}
function sanitizeTeacherState(input){
  const state=safeObject(input);
  const profile=safeObject(state.profile);
  const out={
    version:1,
    profile:{
      version:1,
      nickname:String(profile.nickname||'선생님').replace(/[<>\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,12)||'선생님',
      createdAt:typeof profile.createdAt==='string'?profile.createdAt.slice(0,40):'',
      updatedAt:typeof profile.updatedAt==='string'?profile.updatedAt.slice(0,40):''
    },
    seeds:clampInt(state.seeds,0,1_000_000_000),
    sproutPower:clampInt(state.sproutPower,0,1_000_000_000),
    avatarInventory:cleanStringArray(state.avatarInventory,500),
    avatarEquipped:cleanStringMap(state.avatarEquipped,40),
    playHistory:boundedJsonObject(state.playHistory,56*1024),
    inventory:boundedJsonObject(state.inventory,16*1024),
    equipped:cleanStringMap(state.equipped,80)
  };
  if(new TextEncoder().encode(JSON.stringify(out)).byteLength>96*1024)throw new Error('state-too-large');
  return out;
}
function parseTeacherState(value){
  try{return value?JSON.parse(value):{}}catch(_){return {}}
}
function teacherAccountPayload(row){
  const state=parseTeacherState(row?.state_json);
  return {
    account:{
      role:'teacher',
      loginId:row.login_id,
      nickname:state?.profile?.nickname||'선생님',
      classId:row.class_id,
      className:row.class_name||'',
      classCode:row.class_code||'',
      revision:Number(row.state_revision||0),
      lastLoginAt:row.last_login_at||null
    },
    state
  };
}

export function authorizeGlobalAdmin(request,env){
  const missing=configError(env);
  if(missing)return missing;
  if(!env.KIDSCADE_ADMIN_KEY)return json({ok:false,error:'teacher_admin_not_configured'},503);
  if(!isGlobalAdmin(request,env))return json({ok:false,error:'unauthorized'},401);
  return null;
}

export async function authorizeTeacherAccess(request,env){
  const missing=configError(env);
  if(missing)return {response:missing};
  if(isGlobalAdmin(request,env))return {global:true,classId:null,loginId:'GLOBAL'};

  const token=parseCookies(request)[SESSION_COOKIE]||'';
  if(!/^[0-9a-f]{64}$/i.test(token))return {response:json({ok:false,error:'unauthorized'},401)};
  const tokenHash=await sha256(token);
  const row=await env.DB.prepare(
    'SELECT s.token_hash,s.expires_at,t.class_id,t.login_id,t.disabled,t.state_json,t.state_revision,t.last_login_at,c.name AS class_name,c.class_code '+
    'FROM class_teacher_sessions s '+
    'JOIN class_teacher_accounts t ON t.class_id=s.class_id '+
    'JOIN kidscade_classes c ON c.id=t.class_id '+
    'WHERE s.token_hash=?'
  ).bind(tokenHash).first();

  if(!row||Number(row.disabled)){
    return {response:json({ok:false,error:'unauthorized'},401,{'set-cookie':clearSessionCookie()})};
  }
  if(!row.expires_at||new Date(row.expires_at).getTime()<=Date.now()){
    await env.DB.prepare('DELETE FROM class_teacher_sessions WHERE token_hash=?').bind(tokenHash).run();
    return {response:json({ok:false,error:'teacher_session_expired'},401,{'set-cookie':clearSessionCookie()})};
  }
  return {
    global:false,
    classId:row.class_id,
    loginId:row.login_id,
    className:row.class_name,
    classCode:row.class_code,
    state_json:row.state_json,
    state_revision:row.state_revision,
    last_login_at:row.last_login_at,
    tokenHash
  };
}

export async function authorizeTeacherForClass(request,env,classId){
  const auth=await authorizeTeacherAccess(request,env);
  if(auth.response)return auth;
  if(auth.global)return auth;
  if(!classId||String(auth.classId)!==String(classId)){
    return {response:json({ok:false,error:'forbidden_class'},403)};
  }
  return auth;
}

export async function ensureTeacherCredential(env,classId,classCode){
  const existing=await env.DB.prepare(
    'SELECT class_id,login_id,password_ciphertext,password_iv FROM class_teacher_accounts WHERE class_id=?'
  ).bind(classId).first();
  if(existing){
    let password='';
    try{password=await decryptTeacherPassword(existing.password_ciphertext,existing.password_iv,env.KIDSCADE_ACCOUNT_PEPPER)}catch(_){}
    return {loginId:existing.login_id,password,created:false};
  }

  const loginId='KT-'+String(classCode||'').toUpperCase();
  const password=randomPassword(10);
  const password_hash=await passwordHash(loginId,password,env.KIDSCADE_ACCOUNT_PEPPER);
  const encrypted=await encryptPassword(password,env.KIDSCADE_ACCOUNT_PEPPER);
  const now=nowIso();
  await env.DB.prepare(
    'INSERT INTO class_teacher_accounts '+
    '(class_id,login_id,password_hash,password_ciphertext,password_iv,failed_attempts,disabled,created_at,updated_at) '+
    'VALUES (?,?,?,?,?,0,0,?,?)'
  ).bind(classId,loginId,password_hash,encrypted.ciphertext,encrypted.iv,now,now).run();
  return {loginId,password,created:true};
}

export async function resetTeacherCredential(env,classId){
  const classroom=await env.DB.prepare('SELECT id,class_code FROM kidscade_classes WHERE id=?').bind(classId).first();
  if(!classroom)throw new Error('class_not_found');
  const loginId='KT-'+String(classroom.class_code||'').toUpperCase();
  const password=randomPassword(10);
  const password_hash=await passwordHash(loginId,password,env.KIDSCADE_ACCOUNT_PEPPER);
  const encrypted=await encryptPassword(password,env.KIDSCADE_ACCOUNT_PEPPER);
  const now=nowIso();

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO class_teacher_accounts '+
      '(class_id,login_id,password_hash,password_ciphertext,password_iv,failed_attempts,locked_until,disabled,created_at,updated_at) '+
      'VALUES (?,?,?,?,?,0,NULL,0,?,?) '+
      'ON CONFLICT(class_id) DO UPDATE SET login_id=excluded.login_id,password_hash=excluded.password_hash,'+
      'password_ciphertext=excluded.password_ciphertext,password_iv=excluded.password_iv,failed_attempts=0,'+
      'locked_until=NULL,disabled=0,updated_at=excluded.updated_at'
    ).bind(classId,loginId,password_hash,encrypted.ciphertext,encrypted.iv,now,now),
    env.DB.prepare('DELETE FROM class_teacher_sessions WHERE class_id=?').bind(classId)
  ]);
  return {loginId,password};
}

export async function listTeacherCredentialsForAdmin(env,classIds=null){
  let query='SELECT t.class_id,t.login_id,t.password_ciphertext,t.password_iv,t.disabled,t.last_login_at FROM class_teacher_accounts t';
  const binds=[];
  if(Array.isArray(classIds)&&classIds.length){
    query+=' WHERE t.class_id IN ('+classIds.map(()=>'?').join(',')+')';
    binds.push(...classIds);
  }
  const result=await env.DB.prepare(query).bind(...binds).all();
  const out=[];
  for(const row of result?.results||[]){
    let password='';
    try{password=await decryptTeacherPassword(row.password_ciphertext,row.password_iv,env.KIDSCADE_ACCOUNT_PEPPER)}catch(_){}
    out.push({
      classId:row.class_id,
      loginId:row.login_id,
      password,
      disabled:Boolean(Number(row.disabled)),
      lastLoginAt:row.last_login_at||null
    });
  }
  return out;
}

async function teacherLogin(request,env){
  const missing=configError(env);
  if(missing)return missing;
  let body;
  try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  const loginId=normalizeTeacherId(body?.loginId);
  const password=String(body?.password||'');
  if(!/^KT-[A-Z0-9]{5,12}$/.test(loginId)||password.length<6||password.length>64){
    return json({ok:false,error:'invalid_teacher_credentials'},401);
  }

  const row=await env.DB.prepare(
    'SELECT t.*,c.name AS class_name,c.class_code FROM class_teacher_accounts t '+
    'JOIN kidscade_classes c ON c.id=t.class_id WHERE t.login_id=? COLLATE NOCASE'
  ).bind(loginId).first();
  if(!row||Number(row.disabled))return json({ok:false,error:'invalid_teacher_credentials'},401);
  if(row.locked_until&&new Date(row.locked_until).getTime()>Date.now()){
    const retryAfterSec=Math.max(1,Math.ceil((new Date(row.locked_until).getTime()-Date.now())/1000));
    return json({ok:false,error:'teacher_temporarily_locked',retryAfterSec},429,{'retry-after':String(retryAfterSec)});
  }

  const expected=await passwordHash(loginId,password,env.KIDSCADE_ACCOUNT_PEPPER);
  if(!secureEqual(expected,row.password_hash)){
    const failures=Number(row.failed_attempts||0)+1;
    const lockedUntil=failures>=LOGIN_LOCK_THRESHOLD
      ?new Date(Date.now()+LOGIN_LOCK_MINUTES*60*1000).toISOString()
      :null;
    await env.DB.prepare(
      'UPDATE class_teacher_accounts SET failed_attempts=?,locked_until=?,updated_at=? WHERE class_id=?'
    ).bind(lockedUntil?0:failures,lockedUntil,nowIso(),row.class_id).run();
    return json(
      {ok:false,error:lockedUntil?'teacher_temporarily_locked':'invalid_teacher_credentials'},
      lockedUntil?429:401
    );
  }

  const token=randomToken();
  const tokenHash=await sha256(token);
  const now=nowIso();
  const expiresAt=new Date(Date.now()+SESSION_MAX_AGE_SEC*1000).toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM class_teacher_sessions WHERE class_id=? AND expires_at<=?').bind(row.class_id,now),
    env.DB.prepare(
      'INSERT INTO class_teacher_sessions (token_hash,class_id,created_at,expires_at) VALUES (?,?,?,?)'
    ).bind(tokenHash,row.class_id,now,expiresAt),
    env.DB.prepare(
      'UPDATE class_teacher_accounts SET failed_attempts=0,locked_until=NULL,last_login_at=?,updated_at=? WHERE class_id=?'
    ).bind(now,now,row.class_id)
  ]);

  row.last_login_at=now;
  return json({
    ok:true,
    teacher:{loginId:row.login_id,classId:row.class_id,className:row.class_name,classCode:row.class_code},
    ...teacherAccountPayload(row)
  },200,{'set-cookie':makeSessionCookie(token)});
}

async function teacherLogout(request,env){
  const token=parseCookies(request)[SESSION_COOKIE]||'';
  if(env.DB&&/^[0-9a-f]{64}$/i.test(token)){
    const tokenHash=await sha256(token);
    await env.DB.prepare('DELETE FROM class_teacher_sessions WHERE token_hash=?').bind(tokenHash).run();
  }
  return json({ok:true},200,{'set-cookie':clearSessionCookie()});
}

async function teacherMe(request,env){
  const auth=await authorizeTeacherAccess(request,env);
  if(auth.response)return auth.response;
  if(auth.global)return json({ok:true,scope:'global',teacher:null});
  return json({
    ok:true,
    scope:'class',
    teacher:{
      loginId:auth.loginId,
      classId:auth.classId,
      className:auth.className,
      classCode:auth.classCode
    },
    ...teacherAccountPayload({
      login_id:auth.loginId,
      class_id:auth.classId,
      class_name:auth.className,
      class_code:auth.classCode,
      state_json:auth.state_json,
      state_revision:auth.state_revision,
      last_login_at:auth.last_login_at
    })
  });
}

async function teacherSync(request,env){
  const auth=await authorizeTeacherAccess(request,env);
  if(auth.response)return auth.response;
  if(auth.global)return json({ok:false,error:'class_teacher_required'},403);
  let body;
  try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  let state;
  try{state=sanitizeTeacherState(body?.state)}catch(error){
    return json({ok:false,error:error?.message==='state-too-large'?'state_too_large':'invalid_state'},400);
  }
  const now=nowIso();
  await env.DB.prepare(
    'UPDATE class_teacher_accounts SET state_json=?,state_revision=state_revision+1,updated_at=? WHERE class_id=?'
  ).bind(JSON.stringify(state),now,auth.classId).run();
  const row=await env.DB.prepare(
    'SELECT t.*,c.name AS class_name,c.class_code FROM class_teacher_accounts t '+
    'JOIN kidscade_classes c ON c.id=t.class_id WHERE t.class_id=?'
  ).bind(auth.classId).first();
  return json({ok:true,...teacherAccountPayload(row)});
}

async function resetCredentialEndpoint(request,env){
  const denied=authorizeGlobalAdmin(request,env);
  if(denied)return denied;
  let body;
  try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  const classId=String(body?.classId||'').trim();
  if(!classId)return json({ok:false,error:'class_id_required'},400);
  try{
    const credential=await resetTeacherCredential(env,classId);
    return json({ok:true,classId,...credential});
  }catch(error){
    if(String(error?.message||'')==='class_not_found')return json({ok:false,error:'class_not_found'},404);
    throw error;
  }
}

export async function handleTeacherAuthRequest(request,env){
  const path=new URL(request.url).pathname;
  if(![
    '/api/teacher/auth/login',
    '/api/teacher/auth/logout',
    '/api/teacher/auth/me',
    '/api/teacher/auth/sync',
    '/api/teacher/class-credential'
  ].includes(path))return null;
  try{
    if(path==='/api/teacher/auth/login')return request.method==='POST'?teacherLogin(request,env):json({ok:false,error:'method_not_allowed'},405,{allow:'POST'});
    if(path==='/api/teacher/auth/logout')return request.method==='POST'?teacherLogout(request,env):json({ok:false,error:'method_not_allowed'},405,{allow:'POST'});
    if(path==='/api/teacher/auth/me')return request.method==='GET'?teacherMe(request,env):json({ok:false,error:'method_not_allowed'},405,{allow:'GET'});
    if(path==='/api/teacher/auth/sync')return request.method==='POST'?teacherSync(request,env):json({ok:false,error:'method_not_allowed'},405,{allow:'POST'});
    if(path==='/api/teacher/class-credential')return request.method==='POST'?resetCredentialEndpoint(request,env):json({ok:false,error:'method_not_allowed'},405,{allow:'POST'});
  }catch(error){
    const message=String(error?.message||'');
    if(/no such table|SQLITE_ERROR/i.test(message))return json({ok:false,error:'teacher_schema_not_ready'},503);
    console.error('[Kidscade teacher auth]',error);
    return json({ok:false,error:'teacher_auth_server_error'},500);
  }
  return null;
}
