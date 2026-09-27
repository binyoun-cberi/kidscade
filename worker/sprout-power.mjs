import { requireStudent } from './accounts.mjs';

const JSON_HEADERS = Object.freeze({
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'same-origin'
});
const MAX_POWER_DELTA = 500;

function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
}
async function parseJson(request) {
  const type=request.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}
export function kstWeekKey(date=new Date()) {
  const shifted=new Date(date.getTime()+9*60*60*1000);
  const weekday=shifted.getUTCDay();
  shifted.setUTCDate(shifted.getUTCDate()-((weekday+6)%7));
  const y=shifted.getUTCFullYear();
  const m=String(shifted.getUTCMonth()+1).padStart(2,'0');
  const d=String(shifted.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
export function rankRows(rows,key,selfId) {
  return [...rows]
    .map(row=>({
      studentId:String(row.student_id||''),
      nickname:String(row.nickname||'새싹 게이머').slice(0,12),
      value:Math.max(0,Math.floor(Number(row[key]||0)))
    }))
    .sort((a,b)=>b.value-a.value||a.nickname.localeCompare(b.nickname,'ko')||a.studentId.localeCompare(b.studentId))
    .map((row,index)=>({rank:index+1,nickname:row.nickname,value:row.value,self:row.studentId===selfId}));
}
async function recordEarned(request,env) {
  const auth=await requireStudent(request,env);
  if(auth.response)return auth.response;
  let body;
  try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  const delta=Math.floor(Number(body?.delta||0));
  if(!Number.isFinite(delta)||delta<1||delta>MAX_POWER_DELTA)return json({ok:false,error:'invalid_sprout_power_delta'},400);
  const weekKey=kstWeekKey(),now=new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO student_sprout_weekly (student_id,week_key,earned_power,updated_at)
    VALUES (?,?,?,?)
    ON CONFLICT(student_id,week_key) DO UPDATE SET
      earned_power=student_sprout_weekly.earned_power+excluded.earned_power,
      updated_at=excluded.updated_at
  `).bind(auth.row.student_id,weekKey,delta,now).run();
  const saved=await env.DB.prepare(
    'SELECT earned_power FROM student_sprout_weekly WHERE student_id=? AND week_key=?'
  ).bind(auth.row.student_id,weekKey).first();
  return json({ok:true,weekKey,weeklyEarned:Math.max(0,Number(saved?.earned_power||0))});
}
async function getRanking(request,env) {
  const auth=await requireStudent(request,env);
  if(auth.response)return auth.response;
  const weekKey=kstWeekKey();
  const result=await env.DB.prepare(`
    SELECT a.id AS student_id,a.nickname,
      CAST(COALESCE(json_extract(a.state_json,'$.sproutPower'),0) AS INTEGER) AS total_power,
      COALESCE(w.earned_power,0) AS weekly_power
    FROM student_accounts a
    LEFT JOIN student_sprout_weekly w ON w.student_id=a.id AND w.week_key=?
    WHERE a.class_id=? AND a.disabled=0
  `).bind(weekKey,auth.row.class_id).all();
  const rows=result?.results||[];
  const total=rankRows(rows,'total_power',auth.row.student_id);
  const weekly=rankRows(rows,'weekly_power',auth.row.student_id);
  return json({
    ok:true,
    className:auth.row.class_name||'',
    weekKey,
    memberCount:rows.length,
    total:{top:total.slice(0,10),self:total.find(row=>row.self)||null},
    weekly:{top:weekly.slice(0,10),self:weekly.find(row=>row.self)||null}
  });
}
function methodNotAllowed(allow){return json({ok:false,error:'method_not_allowed'},405,{allow})}

export async function handleSproutPowerRequest(request,env) {
  const path=new URL(request.url).pathname;
  if(path!=='/api/account/sprout-power-earned'&&path!=='/api/account/sprout-power-ranking')return null;
  try{
    if(path==='/api/account/sprout-power-earned')return request.method==='POST'?recordEarned(request,env):methodNotAllowed('POST');
    return request.method==='GET'?getRanking(request,env):methodNotAllowed('GET');
  }catch(error){
    const message=String(error?.message||'');
    if(/no such table: student_sprout_weekly|SQLITE_ERROR.*student_sprout_weekly/i.test(message)){
      return json({ok:false,error:'sprout_power_schema_not_ready'},503);
    }
    if(/no such table|SQLITE_ERROR/i.test(message))return json({ok:false,error:'account_schema_not_ready'},503);
    console.error('[Kidscade sprout power API]',error);
    return json({ok:false,error:'sprout_power_server_error'},500);
  }
}
