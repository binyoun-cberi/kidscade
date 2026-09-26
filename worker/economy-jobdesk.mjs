import {
  json, nowIso, clean, cleanId, clampInt, parseJson, requireEconomyStudent
} from './economy-common.mjs';
import { authorizeTeacherForClass } from './teacher-auth.mjs';

export const JOB_CAPABILITY_CATALOG = Object.freeze([
  {
    code: 'stats.clean_plate',
    label: '통계청 · 클린식판 통계',
    description: '학생별 클린식판 결과를 기록하고 학급 통계를 만듭니다.'
  },
  {
    code: 'credit.learning_ledger',
    label: '신용평가사 · 제출물·숙제 장부',
    description: '숙제·제출물·준비물 이행을 장부에 기록합니다. 신용점수 반영은 교사가 최종 승인합니다.'
  }
]);

const ALLOWED_CAPABILITIES = new Set(JOB_CAPABILITY_CATALOG.map(item => item.code));

export function sanitizeJobCapabilities(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(
    values
      .map(value => clean(String(value || ''), 80))
      .filter(value => ALLOWED_CAPABILITIES.has(value))
  )].slice(0, 20);
}

function periodForDate(value) {
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
    ? String(value)
    : new Date().toISOString().slice(0,10);
  const [year,month,day] = raw.split('-').map(Number);
  return year + '-' + String(month).padStart(2,'0') + '-' + Math.ceil(day / 7) + '주';
}

async function activeJobWithCapabilities(env, classId, studentId) {
  const job = await env.DB.prepare(
    'SELECT j.id, j.name, j.task, j.salary FROM economy_job_assignments a ' +
    'JOIN economy_jobs j ON j.id = a.job_id ' +
    'WHERE a.student_id = ? AND j.class_id = ? AND j.active = 1'
  ).bind(studentId,classId).first();

  if (!job) return { job:null, capabilities:[] };

  const rows = await env.DB.prepare(
    'SELECT capability, access_level, limit_value FROM economy_job_capabilities ' +
    'WHERE job_id = ? AND class_id = ? ORDER BY capability'
  ).bind(job.id,classId).all();

  return {
    job: {
      id:job.id,
      name:job.name,
      task:job.task || '',
      salary:Number(job.salary || 0)
    },
    capabilities:(rows?.results || []).map(row => ({
      code:row.capability,
      accessLevel:row.access_level || 'execute',
      limitValue:row.limit_value == null ? null : Number(row.limit_value)
    }))
  };
}

async function requireCapability(request, env, capability) {
  const auth = await requireEconomyStudent(request,env);
  if (auth.response) return auth;

  const current = await activeJobWithCapabilities(
    env,auth.row.class_id,auth.row.student_id
  );
  if (!current.job) {
    return { response:json({ok:false,error:'job_not_assigned'},409) };
  }
  if (!current.capabilities.some(item => item.code === capability)) {
    return { response:json({ok:false,error:'job_capability_required'},403) };
  }
  return { ...auth, job:current.job, capabilities:current.capabilities };
}

async function classStudent(env,classId,studentId) {
  return env.DB.prepare(
    'SELECT id, login_id, nickname FROM student_accounts ' +
    'WHERE id = ? AND class_id = ? AND disabled = 0'
  ).bind(studentId,classId).first();
}

async function recordActivity(env,{classId,studentId,jobId,capability,actionLabel,targetStudentId=null,sourceId=null,recordDate=null}) {
  const now=nowIso();
  await env.DB.prepare(
    'INSERT INTO economy_job_activity ' +
    '(class_id,student_id,job_id,capability,action_label,target_student_id,source_id,period_id,created_at) ' +
    'VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(
    classId,studentId,jobId,capability,clean(actionLabel,120),
    targetStudentId || null,sourceId || null,periodForDate(recordDate),now
  ).run();
}

export async function getStudentJobDesk(env,classId,studentId) {
  const current=await activeJobWithCapabilities(env,classId,studentId);
  const codes=current.capabilities.map(item=>item.code);
  if(!current.job || !codes.length){
    return {
      job:current.job,
      capabilities:current.capabilities,
      roster:[],
      cleanPlate:{today:null,summary:{total:0,clean:0,partial:0,leftover:0},records:[]},
      creditLedger:[],
      activities:[]
    };
  }

  const today=new Date().toISOString().slice(0,10);
  const needsRoster=codes.includes('stats.clean_plate') || codes.includes('credit.learning_ledger');

  const [roster,cleanSummary,cleanRecords,creditLedger,activities]=await Promise.all([
    needsRoster
      ? env.DB.prepare(
          'SELECT id, login_id, nickname FROM student_accounts WHERE class_id=? AND disabled=0 ORDER BY login_id'
        ).bind(classId).all()
      : Promise.resolve({results:[]}),
    codes.includes('stats.clean_plate')
      ? env.DB.prepare(
          'SELECT result,COUNT(*) AS total FROM economy_clean_plate_records WHERE class_id=? AND record_date=? GROUP BY result'
        ).bind(classId,today).all()
      : Promise.resolve({results:[]}),
    codes.includes('stats.clean_plate')
      ? env.DB.prepare(
          'SELECT r.id,r.target_student_id,r.record_date,r.result,r.note,r.updated_at,a.login_id,a.nickname '+
          'FROM economy_clean_plate_records r JOIN student_accounts a ON a.id=r.target_student_id '+
          'WHERE r.class_id=? ORDER BY r.record_date DESC,r.updated_at DESC LIMIT 60'
        ).bind(classId).all()
      : Promise.resolve({results:[]}),
    codes.includes('credit.learning_ledger')
      ? env.DB.prepare(
          'SELECT r.id,r.target_student_id,r.record_date,r.category,r.title,r.result,r.note,r.suggested_delta,'+
          'r.review_status,r.teacher_note,r.created_at,a.login_id,a.nickname '+
          'FROM economy_credit_book_records r JOIN student_accounts a ON a.id=r.target_student_id '+
          'WHERE r.class_id=? AND r.recorder_student_id=? ORDER BY r.created_at DESC LIMIT 60'
        ).bind(classId,studentId).all()
      : Promise.resolve({results:[]}),
    env.DB.prepare(
      'SELECT id,capability,action_label,target_student_id,source_id,period_id,created_at '+
      'FROM economy_job_activity WHERE student_id=? AND class_id=? ORDER BY id DESC LIMIT 80'
    ).bind(studentId,classId).all()
  ]);

  const summary={total:0,clean:0,partial:0,leftover:0};
  for(const row of cleanSummary?.results || []){
    const count=Number(row.total || 0);
    summary.total+=count;
    if(Object.prototype.hasOwnProperty.call(summary,row.result)) summary[row.result]+=count;
  }

  return {
    job:current.job,
    capabilities:current.capabilities,
    roster:(roster?.results || []).map(row=>({
      id:row.id,
      loginId:row.login_id,
      nickname:row.nickname || '새싹 게이머'
    })),
    cleanPlate:{
      today,
      summary,
      records:cleanRecords?.results || []
    },
    creditLedger:creditLedger?.results || [],
    activities:activities?.results || []
  };
}

export async function studentCleanPlateRecord(request,env){
  const auth=await requireCapability(request,env,'stats.clean_plate');
  if(auth.response)return auth.response;

  let body;
  try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}

  const targetStudentId=cleanId(body?.targetStudentId);
  const target=await classStudent(env,auth.row.class_id,targetStudentId);
  if(!target)return json({ok:false,error:'student_not_found'},404);

  const recordDate=/^\d{4}-\d{2}-\d{2}$/.test(String(body?.recordDate||''))
    ? String(body.recordDate)
    : new Date().toISOString().slice(0,10);
  const result=['clean','partial','leftover'].includes(body?.result) ? body.result : '';
  if(!result)return json({ok:false,error:'clean_plate_result_required'},400);

  const note=clean(body?.note,200);
  const now=nowIso();
  const existing=await env.DB.prepare(
    'SELECT id FROM economy_clean_plate_records WHERE class_id=? AND target_student_id=? AND record_date=?'
  ).bind(auth.row.class_id,targetStudentId,recordDate).first();
  const id=existing?.id || crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO economy_clean_plate_records '+
    '(id,class_id,recorder_student_id,target_student_id,record_date,result,note,created_at,updated_at) '+
    'VALUES (?,?,?,?,?,?,?,?,?) '+
    'ON CONFLICT(class_id,target_student_id,record_date) DO UPDATE SET '+
    'recorder_student_id=excluded.recorder_student_id,result=excluded.result,note=excluded.note,updated_at=excluded.updated_at'
  ).bind(
    id,auth.row.class_id,auth.row.student_id,targetStudentId,recordDate,result,note,now,now
  ).run();

  await recordActivity(env,{
    classId:auth.row.class_id,
    studentId:auth.row.student_id,
    jobId:auth.job.id,
    capability:'stats.clean_plate',
    actionLabel:existing?'클린식판 기록 수정':'클린식판 기록',
    targetStudentId,
    sourceId:id,
    recordDate
  });

  return json({ok:true,recordId:id});
}

function creditDeltaForResult(result){
  return ({excellent:2,complete:1,late:-1,missing:-2})[result] ?? 0;
}

export async function studentCreditBookRecord(request,env){
  const auth=await requireCapability(request,env,'credit.learning_ledger');
  if(auth.response)return auth.response;

  let body;
  try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}

  const targetStudentId=cleanId(body?.targetStudentId);
  if(targetStudentId===auth.row.student_id){
    return json({ok:false,error:'self_credit_record_forbidden'},409);
  }
  const target=await classStudent(env,auth.row.class_id,targetStudentId);
  if(!target)return json({ok:false,error:'student_not_found'},404);

  const recordDate=/^\d{4}-\d{2}-\d{2}$/.test(String(body?.recordDate||''))
    ? String(body.recordDate)
    : new Date().toISOString().slice(0,10);
  const category=['homework','submission','materials','other'].includes(body?.category)
    ? body.category
    : 'other';
  const result=['excellent','complete','late','missing'].includes(body?.result)
    ? body.result
    : '';
  const title=clean(body?.title,80);
  if(!title || !result)return json({ok:false,error:'credit_record_required'},400);

  const id=crypto.randomUUID();
  const delta=creditDeltaForResult(result);
  await env.DB.prepare(
    'INSERT INTO economy_credit_book_records '+
    '(id,class_id,recorder_student_id,target_student_id,record_date,category,title,result,note,suggested_delta,review_status,teacher_note,created_at) '+
    "VALUES (?,?,?,?,?,?,?,?,?,?,'pending','',?)"
  ).bind(
    id,auth.row.class_id,auth.row.student_id,targetStudentId,recordDate,category,title,result,
    clean(body?.note,240),delta,nowIso()
  ).run();

  await recordActivity(env,{
    classId:auth.row.class_id,
    studentId:auth.row.student_id,
    jobId:auth.job.id,
    capability:'credit.learning_ledger',
    actionLabel:'학습 신용장부 기록',
    targetStudentId,
    sourceId:id,
    recordDate
  });

  return json({ok:true,recordId:id,suggestedDelta:delta});
}

export async function teacherJobCapabilities(request,env){
  let body;
  try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  const classId=cleanId(body?.classId);
  const jobId=cleanId(body?.jobId);
  const access=await authorizeTeacherForClass(request,env,classId);
  if(access.response)return access.response;

  const job=await env.DB.prepare(
    'SELECT id FROM economy_jobs WHERE id=? AND class_id=?'
  ).bind(jobId,classId).first();
  if(!job)return json({ok:false,error:'job_not_found'},404);

  const capabilities=sanitizeJobCapabilities(body?.capabilities);
  const statements=[
    env.DB.prepare('DELETE FROM economy_job_capabilities WHERE job_id=? AND class_id=?').bind(jobId,classId)
  ];
  const now=nowIso();
  for(const capability of capabilities){
    statements.push(
      env.DB.prepare(
        'INSERT INTO economy_job_capabilities (job_id,class_id,capability,access_level,limit_value,created_at) '+
        "VALUES (?,?,?,'execute',NULL,?)"
      ).bind(jobId,classId,capability,now)
    );
  }
  await env.DB.batch(statements);
  return json({ok:true,capabilities});
}

export async function teacherCreditBookDecision(request,env){
  let body;
  try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  const classId=cleanId(body?.classId);
  const recordId=cleanId(body?.recordId);
  const decision=body?.decision==='approve'?'approve':'reject';
  const access=await authorizeTeacherForClass(request,env,classId);
  if(access.response)return access.response;

  const record=await env.DB.prepare(
    "SELECT * FROM economy_credit_book_records WHERE id=? AND class_id=? AND review_status='pending'"
  ).bind(recordId,classId).first();
  if(!record)return json({ok:false,error:'credit_record_not_pending'},409);

  const now=nowIso();
  const teacherNote=clean(body?.teacherNote,240);
  const updated=await env.DB.prepare(
    'UPDATE economy_credit_book_records SET review_status=?,teacher_note=?,reviewed_at=? '+
    "WHERE id=? AND class_id=? AND review_status='pending'"
  ).bind(decision==='approve'?'approved':'rejected',teacherNote,now,recordId,classId).run();
  if(!Number(updated?.meta?.changes||0)){
    return json({ok:false,error:'credit_record_not_pending'},409);
  }

  let score=null;
  if(decision==='approve' && Number(record.suggested_delta||0)!==0){
    const account=await env.DB.prepare(
      'SELECT credit_score FROM economy_accounts WHERE student_id=? AND class_id=?'
    ).bind(record.target_student_id,classId).first();
    if(account){
      score=clampInt(
        Number(account.credit_score||700)+Number(record.suggested_delta||0),
        300,1000,700
      );
      await env.DB.batch([
        env.DB.prepare(
          'UPDATE economy_accounts SET credit_score=?,updated_at=? WHERE student_id=? AND class_id=?'
        ).bind(score,now,record.target_student_id,classId),
        env.DB.prepare(
          'INSERT INTO economy_credit_events (class_id,student_id,delta,reason,score_after,created_at) VALUES (?,?,?,?,?,?)'
        ).bind(
          classId,record.target_student_id,Number(record.suggested_delta||0),
          '학습 신용장부 · '+clean(record.title,80),score,now
        )
      ]);
    }
  }

  return json({ok:true,score});
}
