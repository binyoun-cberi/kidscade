import { authorizeTeacherForClass } from './teacher-auth.mjs';
import {
  json, nowIso, clean, cleanId, clampInt, parseJson, settingsRow,
  creditProfile, adjustCredit
} from './economy-common.mjs';
import { teacherEconomyState as teacherEconomyStateLegacy } from './economy-teacher.mjs';
import { JOB_CAPABILITY_CATALOG } from './economy-jobdesk.mjs';

async function body(request){
  try{return await parseJson(request)}catch(_){return null}
}

async function account(env,studentId){
  return env.DB.prepare(
    'SELECT balance,savings_balance,credit_score FROM economy_accounts WHERE student_id=?'
  ).bind(studentId).first();
}

export async function teacherEconomyStateV3(request,env){
  const legacy=await teacherEconomyStateLegacy(request,env);
  if(!legacy.ok)return legacy;
  const base=await legacy.json();
  if(!base.enabled)return json(base);
  const classId=base.classroom?.id;
  if(!classId)return json(base);

  const [workLogs,loans,inventory,payslips,spending,companies,products,sales,creditEvents,creditRows,jobCapabilities,cleanPlateRecords,creditBookRecords]=await Promise.all([
    env.DB.prepare(
      'SELECT w.*,a.login_id,a.nickname,j.name AS job_name,j.salary AS job_salary '+
      'FROM economy_work_logs w JOIN student_accounts a ON a.id=w.student_id '+
      'JOIN economy_jobs j ON j.id=w.job_id WHERE w.class_id=? ORDER BY w.submitted_at DESC LIMIT 120'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT l.*,a.login_id,a.nickname FROM economy_loans l JOIN student_accounts a ON a.id=l.student_id '+
      'WHERE l.class_id=? ORDER BY l.requested_at DESC LIMIT 120'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT i.*,a.login_id,a.nickname FROM economy_inventory i JOIN student_accounts a ON a.id=i.student_id '+
      "WHERE i.class_id=? AND i.status IN ('unused','use_requested') ORDER BY i.purchased_at DESC LIMIT 150"
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT p.*,a.login_id,a.nickname FROM economy_payslips p JOIN student_accounts a ON a.id=p.student_id '+
      'WHERE p.class_id=? ORDER BY p.created_at DESC LIMIT 150'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT id,reason,amount,treasury_used,debt_increase,created_at FROM economy_public_spending '+
      'WHERE class_id=? ORDER BY created_at DESC LIMIT 80'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT c.*,a.login_id,a.nickname FROM economy_companies c JOIN student_accounts a ON a.id=c.owner_student_id '+
      'WHERE c.class_id=? ORDER BY c.created_at DESC'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT p.*,c.name AS company_name FROM economy_company_products p JOIN economy_companies c ON c.id=p.company_id '+
      'WHERE p.class_id=? ORDER BY p.created_at DESC LIMIT 150'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT s.*,c.name AS company_name,a.nickname AS buyer_nickname FROM economy_company_sales s '+
      'JOIN economy_companies c ON c.id=s.company_id JOIN student_accounts a ON a.id=s.buyer_student_id '+
      'WHERE s.class_id=? ORDER BY s.id DESC LIMIT 120'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT e.*,a.login_id,a.nickname FROM economy_credit_events e JOIN student_accounts a ON a.id=e.student_id '+
      'WHERE e.class_id=? ORDER BY e.id DESC LIMIT 120'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT student_id,credit_score FROM economy_accounts WHERE class_id=?'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT job_id,capability,access_level,limit_value FROM economy_job_capabilities WHERE class_id=? ORDER BY job_id,capability'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT r.id,r.recorder_student_id,r.target_student_id,r.record_date,r.result,r.note,r.updated_at,'+
      'rec.nickname AS recorder_nickname,target.nickname AS target_nickname '+
      'FROM economy_clean_plate_records r '+
      'JOIN student_accounts rec ON rec.id=r.recorder_student_id '+
      'JOIN student_accounts target ON target.id=r.target_student_id '+
      'WHERE r.class_id=? ORDER BY r.record_date DESC,r.updated_at DESC LIMIT 120'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT r.id,r.recorder_student_id,r.target_student_id,r.record_date,r.category,r.title,r.result,r.note,'+
      'r.suggested_delta,r.review_status,r.teacher_note,r.created_at,r.reviewed_at,'+
      'rec.nickname AS recorder_nickname,target.nickname AS target_nickname '+
      'FROM economy_credit_book_records r '+
      'JOIN student_accounts rec ON rec.id=r.recorder_student_id '+
      'JOIN student_accounts target ON target.id=r.target_student_id '+
      'WHERE r.class_id=? ORDER BY r.created_at DESC LIMIT 150'
    ).bind(classId).all()
  ]);

  const creditMap=new Map((creditRows?.results||[]).map(row=>[row.student_id,Number(row.credit_score||700)]));
  const capabilityMap=new Map();
  for(const row of jobCapabilities?.results||[]){
    if(!capabilityMap.has(row.job_id)) capabilityMap.set(row.job_id,[]);
    capabilityMap.get(row.job_id).push({
      code:row.capability,
      accessLevel:row.access_level||'execute',
      limitValue:row.limit_value==null?null:Number(row.limit_value)
    });
  }
  const students=[];
  for(const student of base.students||[]){
    const score=creditMap.get(student.id)??700;
    const currentJob=(base.jobs||[]).find(job=>job.id===student.jobId);
    const profile=creditProfile(score,base.settings||{});
    const baseForLoan=Number(currentJob?.salary||base.settings?.openingBalance||100);
    students.push({
      ...student,
      creditScore:Number(score),
      creditGrade:profile.grade,
      savingsRate:profile.savingsRate,
      loanRate:profile.loanRate,
      loanLimit:Math.floor(baseForLoan*profile.loanMultiplier)
    });
  }

  return json({
    ...base,
    jobs:(base.jobs||[]).map(job=>({...job,capabilities:capabilityMap.get(job.id)||[]})),
    capabilityCatalog:JOB_CAPABILITY_CATALOG,
    students,
    workLogs:workLogs?.results||[],
    loans:loans?.results||[],
    inventory:inventory?.results||[],
    payslips:payslips?.results||[],
    publicSpending:spending?.results||[],
    companies:(companies?.results||[]).map(x=>({...x,cash_balance:Number(x.cash_balance||0)})),
    companyProducts:(products?.results||[]).map(x=>({...x,price:Number(x.price||0),stock:x.stock==null?null:Number(x.stock)})),
    companySales:sales?.results||[],
    creditEvents:creditEvents?.results||[],
    cleanPlateRecords:cleanPlateRecords?.results||[],
    creditBookRecords:creditBookRecords?.results||[]
  });
}

export async function teacherWorkDecision(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),logId=cleanId(b.logId);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  const log=await env.DB.prepare(
    "SELECT id,student_id,status FROM economy_work_logs WHERE id=? AND class_id=?"
  ).bind(logId,classId).first();
  if(!log)return json({ok:false,error:'work_log_not_found'},404);
  if(!['submitted','rejected'].includes(log.status))return json({ok:false,error:'work_log_locked'},409);
  const approve=b.decision==='approve';
  const payPercent=approve?clampInt(b.payPercent,0,150,100):0;
  await env.DB.prepare(
    'UPDATE economy_work_logs SET status=?,pay_percent=?,teacher_note=?,decided_at=? WHERE id=?'
  ).bind(approve?'approved':'rejected',payPercent,clean(b.teacherNote,240),nowIso(),logId).run();
  await adjustCredit(env,classId,log.student_id,approve?5:-5,approve?'근무일지 승인':'근무일지 반려');
  return json({ok:true});
}

export async function teacherLoanDecision(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),loanId=cleanId(b.loanId);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  const loan=await env.DB.prepare(
    "SELECT * FROM economy_loans WHERE id=? AND class_id=? AND status='pending'"
  ).bind(loanId,classId).first();
  if(!loan)return json({ok:false,error:'loan_not_found'},404);
  const approve=b.decision==='approve';
  const now=nowIso();
  if(!approve){
    await env.DB.prepare(
      "UPDATE economy_loans SET status='rejected',teacher_note=?,decided_at=? WHERE id=?"
    ).bind(clean(b.teacherNote,240),now,loanId).run();
    return json({ok:true});
  }
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE economy_loans SET status='active',teacher_note=?,decided_at=? WHERE id=?"
    ).bind(clean(b.teacherNote,240),now,loanId),
    env.DB.prepare(
      'UPDATE economy_accounts SET balance=balance+?,updated_at=? WHERE student_id=? AND class_id=?'
    ).bind(Number(loan.principal||0),now,loan.student_id,classId)
  ]);
  const row=await account(env,loan.student_id);
  await env.DB.prepare(
    'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
    "VALUES (?,?,'loan','대출 실행',?,?,?,?,?)"
  ).bind(classId,loan.student_id,Number(loan.principal||0),Number(row?.balance||0),Number(row?.savings_balance||0),JSON.stringify({loanId}),now).run();
  return json({ok:true});
}

export async function teacherInventoryDecision(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),inventoryId=cleanId(b.inventoryId);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  const approve=b.decision==='approve';
  const result=await env.DB.prepare(
    'UPDATE economy_inventory SET status=?,used_at=?,teacher_note=? WHERE id=? AND class_id=? AND status=\'use_requested\''
  ).bind(approve?'used':'unused',approve?nowIso():null,clean(b.teacherNote,200),inventoryId,classId).run();
  if(!Number(result?.meta?.changes||0))return json({ok:false,error:'inventory_not_pending'},409);
  return json({ok:true});
}

export async function teacherCompanyDecision(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),companyId=cleanId(b.companyId);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  const company=await env.DB.prepare(
    'SELECT id,status FROM economy_companies WHERE id=? AND class_id=?'
  ).bind(companyId,classId).first();
  if(!company)return json({ok:false,error:'company_not_found'},404);
  const decision=clean(b.decision,20);
  if(decision==='approve'&&company.status==='pending'){
    await env.DB.prepare(
      "UPDATE economy_companies SET status='active',decided_at=?,teacher_note=? WHERE id=?"
    ).bind(nowIso(),clean(b.teacherNote,240),companyId).run();
  }else if(decision==='reject'&&company.status==='pending'){
    await env.DB.prepare(
      "UPDATE economy_companies SET status='rejected',decided_at=?,teacher_note=? WHERE id=?"
    ).bind(nowIso(),clean(b.teacherNote,240),companyId).run();
  }else if(decision==='close'&&company.status==='active'){
    await env.DB.prepare(
      "UPDATE economy_companies SET status='closed',closed_at=?,teacher_note=? WHERE id=?"
    ).bind(nowIso(),clean(b.teacherNote,240),companyId).run();
  }else{
    return json({ok:false,error:'invalid_company_transition'},409);
  }
  return json({ok:true});
}

export async function teacherItemV3(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),name=clean(b.name,60);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  if(!name)return json({ok:false,error:'name_required'},400);
  if(!await settingsRow(env,classId))return json({ok:false,error:'economy_not_enabled'},404);
  await env.DB.prepare(
    'INSERT INTO economy_items (id,class_id,name,price,stock,active,created_at,fulfillment_type) VALUES (?,?,?,?,?,1,?,?)'
  ).bind(
    crypto.randomUUID(),classId,name,clampInt(b.price,1,100000,10),
    b.unlimited===true?null:clampInt(b.stock,0,10000,0),
    nowIso(),b.fulfillmentType==='immediate'?'immediate':'inventory'
  ).run();
  return json({ok:true});
}

export async function teacherTreasuryV3(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),amount=clampInt(b.amount,1,1000000,0);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  const settings=await settingsRow(env,classId);
  if(!settings)return json({ok:false,error:'economy_not_enabled'},404);
  const available=Number(settings.treasury_balance||0);
  const treasuryUsed=Math.min(available,amount);
  const debtIncrease=Math.max(0,amount-available);
  const nextTreasury=available-treasuryUsed;
  const nextDebt=Number(settings.government_debt_balance||0)+debtIncrease;
  const reason=clean(b.reason,120)||'공공지출';
  const now=nowIso();
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE economy_class_settings SET treasury_balance=?,government_debt_balance=?,updated_at=? WHERE class_id=?'
    ).bind(nextTreasury,nextDebt,now,classId),
    env.DB.prepare(
      'INSERT INTO economy_public_spending (id,class_id,reason,amount,treasury_used,debt_increase,created_at) VALUES (?,?,?,?,?,?,?)'
    ).bind(crypto.randomUUID(),classId,reason,amount,treasuryUsed,debtIncrease,now),
    env.DB.prepare(
      'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,treasury_after,meta_json,created_at) '+
      "VALUES (?,NULL,'treasury',?,?,?,?,?)"
    ).bind(classId,reason,-amount,nextTreasury,JSON.stringify({treasuryUsed,debtIncrease,governmentDebt:nextDebt}),now)
  ]);
  return json({ok:true,treasury:nextTreasury,governmentDebt:nextDebt,debtIncrease});
}

export async function teacherDebtRepay(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),amount=clampInt(b.amount,1,1000000,0);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  const settings=await settingsRow(env,classId);
  if(!settings)return json({ok:false,error:'economy_not_enabled'},404);
  const pay=Math.min(amount,Number(settings.treasury_balance||0),Number(settings.government_debt_balance||0));
  if(pay<=0)return json({ok:false,error:'debt_repay_unavailable'},409);
  const now=nowIso();
  await env.DB.prepare(
    'UPDATE economy_class_settings SET treasury_balance=treasury_balance-?,government_debt_balance=government_debt_balance-?,updated_at=? WHERE class_id=?'
  ).bind(pay,pay,now,classId).run();
  await env.DB.prepare(
    'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,treasury_after,meta_json,created_at) '+
    "VALUES (?,NULL,'debt-repay','정부 채무 상환',?,?,?,?)"
  ).bind(
    classId,-pay,Number(settings.treasury_balance||0)-pay,
    JSON.stringify({debtPaid:pay}),now
  ).run();
  return json({ok:true,paid:pay});
}

export async function teacherCaseV3(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),studentId=cleanId(b.studentId),lawId=cleanId(b.lawId);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  const law=await env.DB.prepare(
    'SELECT id,default_fine,effective_from FROM economy_laws WHERE id=? AND class_id=? AND active=1'
  ).bind(lawId,classId).first();
  if(!law)return json({ok:false,error:'not_found'},404);
  const assignment=await env.DB.prepare(
    'SELECT j.salary FROM economy_job_assignments a JOIN economy_jobs j ON j.id=a.job_id WHERE a.student_id=?'
  ).bind(studentId).first();
  const settings=await settingsRow(env,classId);
  const salarySnapshot=Number(assignment?.salary||settings?.opening_balance||0);
  const fineCapSnapshot=Math.floor(salarySnapshot*Number(settings?.fine_cap_percent||0)/100);
  const occurredAt=clean(b.occurredAt,30)||new Date().toISOString().slice(0,10);
  if(law.effective_from&&occurredAt<law.effective_from)return json({ok:false,error:'law_not_in_effect'},409);
  await env.DB.prepare(
    'INSERT INTO economy_cases (id,class_id,student_id,law_id,proposed_fine,applied_fine,note,occurred_at,status,appeal_text,created_at,'+
    'salary_snapshot,fine_cap_snapshot,appeal_count,severity,final_note) '+
    "VALUES (?,?,?,?,?,0,?,?,'pending','',?,?,?,?,?,'')"
  ).bind(
    crypto.randomUUID(),classId,studentId,lawId,
    clampInt(b.fine,0,100000,Number(law.default_fine||0)),
    clean(b.note,240),occurredAt,nowIso(),salarySnapshot,fineCapSnapshot,0,
    clampInt(b.severity,1,3,1)
  ).run();
  return json({ok:true});
}

export async function teacherCaseDecisionV3(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),caseId=cleanId(b.caseId),decision=clean(b.decision,20);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  const item=await env.DB.prepare(
    'SELECT c.*,e.balance,e.savings_balance,s.treasury_balance,s.government_debt_balance FROM economy_cases c '+
    'JOIN economy_accounts e ON e.student_id=c.student_id JOIN economy_class_settings s ON s.class_id=c.class_id '+
    'WHERE c.id=? AND c.class_id=?'
  ).bind(caseId,classId).first();
  if(!item)return json({ok:false,error:'case_not_found'},404);
  const now=nowIso();
  if(decision==='confirm'&&item.status==='pending'){
    const fine=Math.max(0,Math.min(Number(item.proposed_fine||0),Number(item.fine_cap_snapshot||0),Number(item.balance||0)));
    const balance=Number(item.balance||0)-fine,treasury=Number(item.treasury_balance||0)+fine;
    await env.DB.batch([
      env.DB.prepare("UPDATE economy_cases SET status='confirmed',applied_fine=?,decided_at=?,final_note=? WHERE id=?")
        .bind(fine,now,clean(b.finalNote,240),caseId),
      env.DB.prepare('UPDATE economy_accounts SET balance=?,updated_at=? WHERE student_id=?').bind(balance,now,item.student_id),
      env.DB.prepare('UPDATE economy_class_settings SET treasury_balance=?,updated_at=? WHERE class_id=?').bind(treasury,now,classId)
    ]);
    if(fine>0){
      await env.DB.prepare(
        'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
        "VALUES (?,?,'fine','과태료 처분',?,?,?,?,?)"
      ).bind(classId,item.student_id,-fine,balance,Number(item.savings_balance||0),JSON.stringify({caseId}),now).run();
    }
    await adjustCredit(env,classId,item.student_id,-15*clampInt(item.severity,1,3,1),'과태료 확정');
  }else if(decision==='cancel'&&item.status==='pending'){
    await env.DB.prepare(
      "UPDATE economy_cases SET status='cancelled',decided_at=?,final_note=? WHERE id=?"
    ).bind(now,clean(b.finalNote,240),caseId).run();
  }else if(decision==='uphold'&&item.status==='appealed'){
    await env.DB.prepare(
      "UPDATE economy_cases SET status='upheld',decided_at=?,final_note=? WHERE id=?"
    ).bind(now,clean(b.finalNote,240),caseId).run();
  }else if(decision==='reverse'&&item.status==='appealed'){
    const refund=Number(item.applied_fine||0);
    const balance=Number(item.balance||0)+refund;
    const availableTreasury=Number(item.treasury_balance||0);
    const treasuryUsed=Math.min(availableTreasury,refund);
    const debtIncrease=Math.max(0,refund-availableTreasury);
    const treasury=availableTreasury-treasuryUsed;
    const governmentDebt=Number(item.government_debt_balance||0)+debtIncrease;
    await env.DB.batch([
      env.DB.prepare("UPDATE economy_cases SET status='reversed',decided_at=?,final_note=? WHERE id=?")
        .bind(now,clean(b.finalNote,240),caseId),
      env.DB.prepare('UPDATE economy_accounts SET balance=?,updated_at=? WHERE student_id=?').bind(balance,now,item.student_id),
      env.DB.prepare('UPDATE economy_class_settings SET treasury_balance=?,government_debt_balance=?,updated_at=? WHERE class_id=?')
        .bind(treasury,governmentDebt,now,classId)
    ]);
    if(refund>0){
      await env.DB.prepare(
        'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
        "VALUES (?,?,'fine-refund','과태료 취소 환급',?,?,?,?,?)"
      ).bind(classId,item.student_id,refund,balance,Number(item.savings_balance||0),JSON.stringify({caseId,debtIncrease}),now).run();
    }
    await adjustCredit(env,classId,item.student_id,10,'이의신청 인용');
  }else{
    return json({ok:false,error:'invalid_case_transition'},409);
  }
  return json({ok:true});
}

export async function teacherPayrollV3(request,env){
  const b=await body(request); if(!b)return json({ok:false,error:'invalid_json'},400);
  const classId=cleanId(b.classId),periodId=clean(b.periodId,40);
  const access=await authorizeTeacherForClass(request,env,classId); if(access.response)return access.response;
  if(!periodId)return json({ok:false,error:'period_required'},400);
  const settings=await settingsRow(env,classId); if(!settings)return json({ok:false,error:'economy_not_enabled'},404);
  const exists=await env.DB.prepare(
    'SELECT 1 AS yes FROM economy_payroll_runs WHERE class_id=? AND period_id=?'
  ).bind(classId,periodId).first();
  if(exists)return json({ok:false,error:'payroll_already_run'},409);

  const rows=await env.DB.prepare(
    'SELECT e.student_id,e.balance,e.savings_balance,e.credit_score,a.nickname,a.login_id,'+
    'j.id AS job_id,j.name AS job_name,j.salary,w.status AS work_status,w.pay_percent '+
    'FROM economy_accounts e JOIN student_accounts a ON a.id=e.student_id '+
    'LEFT JOIN economy_job_assignments ja ON ja.student_id=e.student_id '+
    'LEFT JOIN economy_jobs j ON j.id=ja.job_id AND j.active=1 '+
    'LEFT JOIN economy_work_logs w ON w.student_id=e.student_id AND w.period_id=? '+
    'WHERE e.class_id=? AND a.disabled=0 ORDER BY a.login_id'
  ).bind(periodId,classId).all();

  let grossTotal=0,taxTotal=0,interestTotal=0,paidStudents=0;
  const now=nowIso(),statements=[];
  const previews=[];
  for(const row of rows?.results||[]){
    let balance=Number(row.balance||0),savings=Number(row.savings_balance||0);
    const profile=creditProfile(row.credit_score,settings);
    const workPercent=row.job_id&&row.work_status==='approved'?clampInt(row.pay_percent,0,150,100):0;
    const baseSalary=Number(row.salary||0);
    const gross=Math.round(baseSalary*workPercent/100);
    const tax=Math.round(gross*Number(settings.income_tax_rate||0)/100);
    const net=gross-tax;
    if(gross>0){balance+=net;grossTotal+=gross;taxTotal+=tax;paidStudents++;}
    const savingsInterest=savings>0?Math.floor(savings*profile.savingsRate/100):0;
    if(savingsInterest>0){savings+=savingsInterest;interestTotal+=savingsInterest;}

    const loans=await env.DB.prepare(
      "SELECT id,outstanding,rate_percent,last_interest_period FROM economy_loans WHERE student_id=? AND status='active'"
    ).bind(row.student_id).all();
    let loanInterest=0;
    for(const loan of loans?.results||[]){
      if(loan.last_interest_period===periodId)continue;
      const amount=Math.ceil(Number(loan.outstanding||0)*Number(loan.rate_percent||profile.loanRate)/100);
      if(amount>0){
        loanInterest+=amount;
        statements.push(env.DB.prepare(
          'UPDATE economy_loans SET outstanding=outstanding+?,last_interest_period=? WHERE id=?'
        ).bind(amount,periodId,loan.id));
      }
    }

    statements.push(
      env.DB.prepare('UPDATE economy_accounts SET balance=?,savings_balance=?,updated_at=? WHERE student_id=?')
        .bind(balance,savings,now,row.student_id),
      env.DB.prepare(
        'INSERT INTO economy_payslips (class_id,period_id,student_id,job_name,base_salary,work_percent,gross_pay,income_tax,net_pay,'+
        'savings_interest,savings_rate_percent,loan_interest,loan_rate_percent,credit_grade,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(
        classId,periodId,row.student_id,row.job_name||'',baseSalary,workPercent,gross,tax,net,
        savingsInterest,profile.savingsRate,loanInterest,profile.loanRate,profile.grade,now
      )
    );
    if(gross>0){
      statements.push(
        env.DB.prepare(
          'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
          "VALUES (?,?,'salary',?,?,?,?,?,?)"
        ).bind(classId,row.student_id,(row.job_name||'직업')+' 월급 · '+periodId,net,balance,savings,JSON.stringify({gross,tax,workPercent}),now)
      );
    }
    if(savingsInterest>0){
      statements.push(
        env.DB.prepare(
          'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
          "VALUES (?,?,'interest',?,?,?,?,?,?)"
        ).bind(classId,row.student_id,'저축이자 '+profile.savingsRate+'% · '+periodId,savingsInterest,balance,savings,JSON.stringify({creditGrade:profile.grade}),now)
      );
    }
    previews.push({studentId:row.student_id,gross,tax,net,savingsInterest,loanInterest,workPercent,creditGrade:profile.grade});
  }

  statements.unshift(
    env.DB.prepare(
      'INSERT INTO economy_payroll_runs (class_id,period_id,gross_total,tax_total,interest_total,paid_students,created_at) VALUES (?,?,?,?,?,?,?)'
    ).bind(classId,periodId,grossTotal,taxTotal,interestTotal,paidStudents,now)
  );
  if(taxTotal>0){
    statements.push(
      env.DB.prepare(
        'UPDATE economy_class_settings SET treasury_balance=treasury_balance+?,updated_at=? WHERE class_id=?'
      ).bind(taxTotal,now,classId)
    );
  }
  await env.DB.batch(statements);
  const updatedSettings=await settingsRow(env,classId);
  return json({
    ok:true,
    summary:{
      periodId,paidStudents,grossTotal,taxTotal,interestTotal,
      treasury:Number(updatedSettings?.treasury_balance||0),
      governmentDebt:Number(updatedSettings?.government_debt_balance||0)
    },
    payslips:previews
  });
}
