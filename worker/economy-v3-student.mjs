import {
  json, nowIso, clean, cleanId, clampInt, parseJson, requireEconomyStudent,
  creditProfile, adjustCredit, claimRequest, completeRequest
} from './economy-common.mjs';
import { getStudentEconomy as getStudentEconomyLegacy } from './economy-student.mjs';

async function requestBody(request) {
  try { return await parseJson(request); } catch (_) { return null; }
}

async function studentAccount(env, studentId) {
  return env.DB.prepare(
    'SELECT balance, savings_balance, credit_score FROM economy_accounts WHERE student_id = ?'
  ).bind(studentId).first();
}

async function currentJob(env, studentId) {
  return env.DB.prepare(
    'SELECT j.id, j.name, j.salary FROM economy_job_assignments a ' +
    'JOIN economy_jobs j ON j.id = a.job_id WHERE a.student_id = ? AND j.active = 1'
  ).bind(studentId).first();
}

async function activeLoanTotal(env, studentId) {
  const row = await env.DB.prepare(
    "SELECT COALESCE(SUM(outstanding),0) AS total FROM economy_loans WHERE student_id = ? AND status = 'active'"
  ).bind(studentId).first();
  return Number(row?.total || 0);
}

function duplicateResponse(claim) {
  if (claim.status === 'done') return json({ ok:true, duplicate:true, ...(claim.body || {}) });
  return json({ ok:false,error:'request_in_progress' },409);
}

export async function getStudentEconomyV3(request, env) {
  const legacy = await getStudentEconomyLegacy(request, env);
  if (!legacy.ok) return legacy;
  const base = await legacy.json();
  const studentId = base.student?.id;
  const classId = base.classroom?.id;
  if (!studentId || !classId) return json(base);

  const account = await studentAccount(env, studentId);
  const job = await currentJob(env, studentId);
  const profile = creditProfile(account?.credit_score, base.settings || {});
  const salaryBase = Number(job?.salary || base.settings?.openingBalance || 100);
  const loanLimit = Math.floor(salaryBase * profile.loanMultiplier);
  const activeOutstanding = await activeLoanTotal(env, studentId);

  const [workLogs, loans, inventory, payslips, spending, creditEvents, companies, products, sales] = await Promise.all([
    env.DB.prepare(
      'SELECT id, job_id, period_id, work_date, note, status, pay_percent, teacher_note, submitted_at, decided_at ' +
      'FROM economy_work_logs WHERE student_id = ? ORDER BY submitted_at DESC LIMIT 20'
    ).bind(studentId).all(),
    env.DB.prepare(
      'SELECT id, principal, outstanding, rate_percent, status, requested_at, decided_at, last_interest_period, teacher_note, closed_at ' +
      'FROM economy_loans WHERE student_id = ? ORDER BY requested_at DESC LIMIT 20'
    ).bind(studentId).all(),
    env.DB.prepare(
      'SELECT id, source_type, source_id, item_name, status, purchased_at, use_requested_at, used_at, teacher_note ' +
      'FROM economy_inventory WHERE student_id = ? ORDER BY purchased_at DESC LIMIT 60'
    ).bind(studentId).all(),
    env.DB.prepare(
      'SELECT period_id, job_name, base_salary, work_percent, gross_pay, income_tax, net_pay, savings_interest, ' +
      'savings_rate_percent, loan_interest, loan_rate_percent, credit_grade, created_at ' +
      'FROM economy_payslips WHERE student_id = ? ORDER BY created_at DESC LIMIT 12'
    ).bind(studentId).all(),
    env.DB.prepare(
      'SELECT id, reason, amount, treasury_used, debt_increase, created_at FROM economy_public_spending ' +
      'WHERE class_id = ? ORDER BY created_at DESC LIMIT 20'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT delta, reason, score_after, created_at FROM economy_credit_events WHERE student_id = ? ORDER BY id DESC LIMIT 20'
    ).bind(studentId).all(),
    env.DB.prepare(
      'SELECT id, owner_student_id, name, description, status, cash_balance, created_at, decided_at, teacher_note ' +
      'FROM economy_companies WHERE class_id = ? ORDER BY created_at DESC'
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT p.id, p.company_id, p.name, p.price, p.stock, p.fulfillment_type, p.active, c.name AS company_name ' +
      'FROM economy_company_products p JOIN economy_companies c ON c.id = p.company_id ' +
      "WHERE p.class_id = ? AND p.active = 1 AND c.status = 'active' ORDER BY p.created_at DESC"
    ).bind(classId).all(),
    env.DB.prepare(
      'SELECT s.company_id, s.product_id, s.gross_amount, s.tax_amount, s.net_amount, s.created_at ' +
      'FROM economy_company_sales s JOIN economy_companies c ON c.id = s.company_id ' +
      'WHERE c.owner_student_id = ? ORDER BY s.id DESC LIMIT 30'
    ).bind(studentId).all()
  ]);

  return json({
    ...base,
    settings: {
      ...base.settings,
      loanInterestRate: Number(base.settings?.loanInterestRate ?? 5),
      governmentDebt: Number(base.settings?.governmentDebt ?? 0)
    },
    credit: {
      ...profile,
      loanLimit,
      activeOutstanding,
      availableLoan: Math.max(0, loanLimit - activeOutstanding)
    },
    workLogs: workLogs?.results || [],
    loans: loans?.results || [],
    inventory: inventory?.results || [],
    payslips: payslips?.results || [],
    publicSpending: spending?.results || [],
    creditEvents: creditEvents?.results || [],
    companies: (companies?.results || []).map(company => ({
      ...company,
      cash_balance:Number(company.cash_balance || 0),
      mine:company.owner_student_id === studentId
    })),
    companyProducts: (products?.results || []).map(product => ({
      ...product,
      price:Number(product.price || 0),
      stock:product.stock == null ? null : Number(product.stock),
      active:Boolean(Number(product.active))
    })),
    companySales: sales?.results || []
  });
}

export async function studentSavingsV3(request, env) {
  const auth = await requireEconomyStudent(request, env);
  if (auth.response) return auth.response;
  const body = await requestBody(request);
  if (!body) return json({ok:false,error:'invalid_json'},400);
  const amount = clampInt(body.amount,1,1000000,0);
  const direction = body.direction === 'withdraw' ? 'withdraw' : 'deposit';
  if (!amount) return json({ok:false,error:'invalid_amount'},400);
  const claim = await claimRequest(env,auth.row.class_id,auth.row.student_id,'savings',body.requestKey);
  if (!claim.ok) return duplicateResponse(claim);

  const now = nowIso();
  let update;
  if (direction === 'deposit') {
    update = await env.DB.prepare(
      'UPDATE economy_accounts SET balance = balance - ?, savings_balance = savings_balance + ?, updated_at = ? ' +
      'WHERE student_id = ? AND class_id = ? AND balance >= ?'
    ).bind(amount,amount,now,auth.row.student_id,auth.row.class_id,amount).run();
  } else {
    update = await env.DB.prepare(
      'UPDATE economy_accounts SET balance = balance + ?, savings_balance = savings_balance - ?, updated_at = ? ' +
      'WHERE student_id = ? AND class_id = ? AND savings_balance >= ?'
    ).bind(amount,amount,now,auth.row.student_id,auth.row.class_id,amount).run();
  }
  if (!Number(update?.meta?.changes || 0)) {
    return json({ok:false,error:direction === 'deposit' ? 'insufficient_funds' : 'insufficient_savings'},409);
  }
  const account = await studentAccount(env,auth.row.student_id);
  await env.DB.prepare(
    'INSERT INTO economy_transactions ' +
    '(class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) ' +
    "VALUES (?,?,'savings',?,?,?,?, '{}',?)"
  ).bind(
    auth.row.class_id,auth.row.student_id,direction === 'deposit' ? '저축' : '저축 인출',
    direction === 'deposit' ? -amount : amount,
    Number(account.balance || 0),Number(account.savings_balance || 0),now
  ).run();
  const result={balance:Number(account.balance||0),savings:Number(account.savings_balance||0)};
  await completeRequest(env,claim.key,result);
  return json({ok:true,...result});
}

export async function studentBuyV3(request, env) {
  const auth = await requireEconomyStudent(request, env);
  if (auth.response) return auth.response;
  const body = await requestBody(request);
  if (!body) return json({ok:false,error:'invalid_json'},400);
  const itemId=cleanId(body.itemId);
  const claim=await claimRequest(env,auth.row.class_id,auth.row.student_id,'class-buy',body.requestKey);
  if(!claim.ok)return duplicateResponse(claim);

  const item=await env.DB.prepare(
    'SELECT id,name,price,stock,fulfillment_type FROM economy_items WHERE id=? AND class_id=? AND active=1'
  ).bind(itemId,auth.row.class_id).first();
  if(!item)return json({ok:false,error:'item_not_found'},404);
  if(item.stock!=null&&Number(item.stock)<=0)return json({ok:false,error:'out_of_stock'},409);

  const tax=Math.round(Number(item.price||0)*Number(auth.settings.consumption_tax_rate||0)/100);
  const total=Number(item.price||0)+tax;
  const now=nowIso();
  const debit=await env.DB.prepare(
    'UPDATE economy_accounts SET balance=balance-?,updated_at=? WHERE student_id=? AND class_id=? AND balance>=?'
  ).bind(total,now,auth.row.student_id,auth.row.class_id,total).run();
  if(!Number(debit?.meta?.changes||0))return json({ok:false,error:'insufficient_funds'},409);

  if(item.stock!=null){
    const stock=await env.DB.prepare(
      'UPDATE economy_items SET stock=stock-1 WHERE id=? AND class_id=? AND stock>0'
    ).bind(itemId,auth.row.class_id).run();
    if(!Number(stock?.meta?.changes||0)){
      await env.DB.prepare('UPDATE economy_accounts SET balance=balance+? WHERE student_id=?').bind(total,auth.row.student_id).run();
      return json({ok:false,error:'out_of_stock'},409);
    }
  }

  await env.DB.prepare(
    'UPDATE economy_class_settings SET treasury_balance=treasury_balance+?,updated_at=? WHERE class_id=?'
  ).bind(total,now,auth.row.class_id).run();
  const account=await studentAccount(env,auth.row.student_id);
  const settings=await env.DB.prepare(
    'SELECT treasury_balance FROM economy_class_settings WHERE class_id=?'
  ).bind(auth.row.class_id).first();
  const statements=[
    env.DB.prepare(
      'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
      "VALUES (?,?,'purchase',?,?,?,?,?,?)"
    ).bind(auth.row.class_id,auth.row.student_id,item.name+' 구매',-total,Number(account.balance||0),Number(account.savings_balance||0),JSON.stringify({basePrice:Number(item.price),consumptionTax:tax}),now)
  ];
  if((item.fulfillment_type||'inventory')==='inventory'){
    statements.push(env.DB.prepare(
      'INSERT INTO economy_inventory (id,class_id,student_id,source_type,source_id,item_name,status,purchased_at) '+
      "VALUES (?,?,?,'class_store',?,?, 'unused',?)"
    ).bind(crypto.randomUUID(),auth.row.class_id,auth.row.student_id,item.id,item.name,now));
  }
  await env.DB.batch(statements);
  const result={total,tax,balance:Number(account.balance||0),treasury:Number(settings?.treasury_balance||0)};
  await completeRequest(env,claim.key,result);
  return json({ok:true,...result});
}

export async function studentWorkLog(request, env) {
  const auth=await requireEconomyStudent(request,env);
  if(auth.response)return auth.response;
  const body=await requestBody(request);
  if(!body)return json({ok:false,error:'invalid_json'},400);
  const periodId=clean(body.periodId,40);
  const workDate=clean(body.workDate,20)||new Date().toISOString().slice(0,10);
  const note=clean(body.note,400);
  if(!periodId||!note)return json({ok:false,error:'work_log_required'},400);
  const job=await currentJob(env,auth.row.student_id);
  if(!job)return json({ok:false,error:'job_not_assigned'},409);
  const now=nowIso();
  const id=crypto.randomUUID();
  const result=await env.DB.prepare(
    'INSERT INTO economy_work_logs (id,class_id,student_id,job_id,period_id,work_date,note,status,pay_percent,teacher_note,submitted_at) '+
    "VALUES (?,?,?,?,?,?,?,'submitted',100,'',?) "+
    'ON CONFLICT(student_id,period_id) DO UPDATE SET job_id=excluded.job_id,work_date=excluded.work_date,note=excluded.note,'+
    "status='submitted',pay_percent=100,teacher_note='',submitted_at=excluded.submitted_at,decided_at=NULL "+
    "WHERE economy_work_logs.status IN ('submitted','rejected')"
  ).bind(id,auth.row.class_id,auth.row.student_id,job.id,periodId,workDate,note,now).run();
  if(!Number(result?.meta?.changes||0))return json({ok:false,error:'work_log_locked'},409);
  return json({ok:true});
}

export async function studentLoanRequest(request,env){
  const auth=await requireEconomyStudent(request,env); if(auth.response)return auth.response;
  const body=await requestBody(request); if(!body)return json({ok:false,error:'invalid_json'},400);
  const amount=clampInt(body.amount,1,1000000,0); if(!amount)return json({ok:false,error:'invalid_amount'},400);
  const existing=await env.DB.prepare(
    "SELECT id FROM economy_loans WHERE student_id=? AND status IN ('pending','active') LIMIT 1"
  ).bind(auth.row.student_id).first();
  if(existing)return json({ok:false,error:'loan_already_open'},409);
  const account=await studentAccount(env,auth.row.student_id);
  const job=await currentJob(env,auth.row.student_id);
  const profile=creditProfile(account?.credit_score,auth.settings);
  const base=Number(job?.salary||auth.settings.opening_balance||100);
  const limit=Math.floor(base*profile.loanMultiplier);
  if(amount>limit)return json({ok:false,error:'loan_limit_exceeded',limit},409);
  await env.DB.prepare(
    'INSERT INTO economy_loans (id,class_id,student_id,principal,outstanding,rate_percent,status,requested_at) '+
    "VALUES (?,?,?,?,?,?,'pending',?)"
  ).bind(crypto.randomUUID(),auth.row.class_id,auth.row.student_id,amount,amount,profile.loanRate,nowIso()).run();
  return json({ok:true,rate:profile.loanRate,limit});
}

export async function studentLoanRepay(request,env){
  const auth=await requireEconomyStudent(request,env); if(auth.response)return auth.response;
  const body=await requestBody(request); if(!body)return json({ok:false,error:'invalid_json'},400);
  const loanId=cleanId(body.loanId),amount=clampInt(body.amount,1,1000000,0);
  const claim=await claimRequest(env,auth.row.class_id,auth.row.student_id,'loan-repay',body.requestKey);
  if(!claim.ok)return duplicateResponse(claim);
  const loan=await env.DB.prepare(
    "SELECT id,outstanding FROM economy_loans WHERE id=? AND student_id=? AND class_id=? AND status='active'"
  ).bind(loanId,auth.row.student_id,auth.row.class_id).first();
  if(!loan)return json({ok:false,error:'loan_not_found'},404);
  const pay=Math.min(amount,Number(loan.outstanding||0));
  const debit=await env.DB.prepare(
    'UPDATE economy_accounts SET balance=balance-?,updated_at=? WHERE student_id=? AND balance>=?'
  ).bind(pay,nowIso(),auth.row.student_id,pay).run();
  if(!Number(debit?.meta?.changes||0))return json({ok:false,error:'insufficient_funds'},409);
  await env.DB.prepare(
    'UPDATE economy_loans SET outstanding=MAX(0,outstanding-?) WHERE id=?'
  ).bind(pay,loanId).run();
  const updated=await env.DB.prepare('SELECT outstanding FROM economy_loans WHERE id=?').bind(loanId).first();
  if(Number(updated?.outstanding||0)<=0){
    await env.DB.prepare("UPDATE economy_loans SET status='closed',closed_at=? WHERE id=?").bind(nowIso(),loanId).run();
    await adjustCredit(env,auth.row.class_id,auth.row.student_id,20,'대출 전액 상환');
  }
  const account=await studentAccount(env,auth.row.student_id);
  await env.DB.prepare(
    'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
    "VALUES (?,?,'loan-repay','대출 상환',?,?,?,?,?)"
  ).bind(auth.row.class_id,auth.row.student_id,-pay,Number(account.balance||0),Number(account.savings_balance||0),JSON.stringify({loanId}),nowIso()).run();
  const result={paid:pay,outstanding:Number(updated?.outstanding||0),balance:Number(account.balance||0)};
  await completeRequest(env,claim.key,result);
  return json({ok:true,...result});
}

export async function studentInventoryUse(request,env){
  const auth=await requireEconomyStudent(request,env); if(auth.response)return auth.response;
  const body=await requestBody(request); if(!body)return json({ok:false,error:'invalid_json'},400);
  const inventoryId=cleanId(body.inventoryId);
  const result=await env.DB.prepare(
    "UPDATE economy_inventory SET status='use_requested',use_requested_at=? WHERE id=? AND student_id=? AND status='unused'"
  ).bind(nowIso(),inventoryId,auth.row.student_id).run();
  if(!Number(result?.meta?.changes||0))return json({ok:false,error:'inventory_not_usable'},409);
  return json({ok:true});
}

export async function studentCompanyCreate(request,env){
  const auth=await requireEconomyStudent(request,env); if(auth.response)return auth.response;
  const body=await requestBody(request); if(!body)return json({ok:false,error:'invalid_json'},400);
  const name=clean(body.name,50),description=clean(body.description,240);
  if(!name)return json({ok:false,error:'name_required'},400);
  const existing=await env.DB.prepare(
    "SELECT id FROM economy_companies WHERE owner_student_id=? AND status IN ('pending','active') LIMIT 1"
  ).bind(auth.row.student_id).first();
  if(existing)return json({ok:false,error:'company_already_open'},409);
  await env.DB.prepare(
    'INSERT INTO economy_companies (id,class_id,owner_student_id,name,description,status,cash_balance,created_at) '+
    "VALUES (?,?,?,?,?,'pending',0,?)"
  ).bind(crypto.randomUUID(),auth.row.class_id,auth.row.student_id,name,description,nowIso()).run();
  return json({ok:true});
}

export async function studentCompanyProduct(request,env){
  const auth=await requireEconomyStudent(request,env); if(auth.response)return auth.response;
  const body=await requestBody(request); if(!body)return json({ok:false,error:'invalid_json'},400);
  const companyId=cleanId(body.companyId),name=clean(body.name,60);
  const price=clampInt(body.price,1,100000,10),stock=body.unlimited===true?null:clampInt(body.stock,0,10000,0);
  const company=await env.DB.prepare(
    "SELECT id FROM economy_companies WHERE id=? AND owner_student_id=? AND class_id=? AND status='active'"
  ).bind(companyId,auth.row.student_id,auth.row.class_id).first();
  if(!company)return json({ok:false,error:'company_not_active'},409);
  if(!name)return json({ok:false,error:'name_required'},400);
  await env.DB.prepare(
    'INSERT INTO economy_company_products (id,company_id,class_id,name,price,stock,fulfillment_type,active,created_at) '+
    'VALUES (?,?,?,?,?,?,?,1,?)'
  ).bind(
    crypto.randomUUID(),companyId,auth.row.class_id,name,price,stock,
    body.fulfillmentType==='immediate'?'immediate':'inventory',nowIso()
  ).run();
  return json({ok:true});
}

export async function studentCompanyBuy(request,env){
  const auth=await requireEconomyStudent(request,env); if(auth.response)return auth.response;
  const body=await requestBody(request); if(!body)return json({ok:false,error:'invalid_json'},400);
  const productId=cleanId(body.productId);
  const claim=await claimRequest(env,auth.row.class_id,auth.row.student_id,'company-buy',body.requestKey);
  if(!claim.ok)return duplicateResponse(claim);
  const product=await env.DB.prepare(
    'SELECT p.*,c.name AS company_name FROM economy_company_products p JOIN economy_companies c ON c.id=p.company_id '+
    "WHERE p.id=? AND p.class_id=? AND p.active=1 AND c.status='active'"
  ).bind(productId,auth.row.class_id).first();
  if(!product)return json({ok:false,error:'item_not_found'},404);
  if(product.stock!=null&&Number(product.stock)<=0)return json({ok:false,error:'out_of_stock'},409);
  const tax=Math.round(Number(product.price||0)*Number(auth.settings.consumption_tax_rate||0)/100);
  const total=Number(product.price||0)+tax,net=Number(product.price||0);
  const now=nowIso();
  const debit=await env.DB.prepare(
    'UPDATE economy_accounts SET balance=balance-?,updated_at=? WHERE student_id=? AND balance>=?'
  ).bind(total,now,auth.row.student_id,total).run();
  if(!Number(debit?.meta?.changes||0))return json({ok:false,error:'insufficient_funds'},409);
  if(product.stock!=null){
    const stock=await env.DB.prepare(
      'UPDATE economy_company_products SET stock=stock-1 WHERE id=? AND stock>0'
    ).bind(productId).run();
    if(!Number(stock?.meta?.changes||0)){
      await env.DB.prepare('UPDATE economy_accounts SET balance=balance+? WHERE student_id=?').bind(total,auth.row.student_id).run();
      return json({ok:false,error:'out_of_stock'},409);
    }
  }
  await env.DB.batch([
    env.DB.prepare('UPDATE economy_companies SET cash_balance=cash_balance+? WHERE id=?').bind(net,product.company_id),
    env.DB.prepare('UPDATE economy_class_settings SET treasury_balance=treasury_balance+?,updated_at=? WHERE class_id=?').bind(tax,now,auth.row.class_id),
    env.DB.prepare(
      'INSERT INTO economy_company_sales (class_id,company_id,product_id,buyer_student_id,gross_amount,tax_amount,net_amount,created_at) '+
      'VALUES (?,?,?,?,?,?,?,?)'
    ).bind(auth.row.class_id,product.company_id,product.id,auth.row.student_id,total,tax,net,now)
  ]);
  if((product.fulfillment_type||'inventory')==='inventory'){
    await env.DB.prepare(
      'INSERT INTO economy_inventory (id,class_id,student_id,source_type,source_id,item_name,status,purchased_at) '+
      "VALUES (?,?,?,'company_store',?,?, 'unused',?)"
    ).bind(crypto.randomUUID(),auth.row.class_id,auth.row.student_id,product.id,product.name,now).run();
  }
  const account=await studentAccount(env,auth.row.student_id);
  await env.DB.prepare(
    'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
    "VALUES (?,?,'company-purchase',?,?,?,?,?,?)"
  ).bind(
    auth.row.class_id,auth.row.student_id,product.company_name+' · '+product.name+' 구매',
    -total,Number(account.balance||0),Number(account.savings_balance||0),
    JSON.stringify({companyId:product.company_id,productId,tax}),now
  ).run();
  const result={total,tax,balance:Number(account.balance||0)};
  await completeRequest(env,claim.key,result);
  return json({ok:true,...result});
}

export async function studentCompanyWithdraw(request,env){
  const auth=await requireEconomyStudent(request,env); if(auth.response)return auth.response;
  const body=await requestBody(request); if(!body)return json({ok:false,error:'invalid_json'},400);
  const companyId=cleanId(body.companyId),amount=clampInt(body.amount,1,1000000,0);
  const claim=await claimRequest(env,auth.row.class_id,auth.row.student_id,'company-withdraw',body.requestKey);
  if(!claim.ok)return duplicateResponse(claim);
  const take=await env.DB.prepare(
    "UPDATE economy_companies SET cash_balance=cash_balance-? WHERE id=? AND owner_student_id=? AND status='active' AND cash_balance>=?"
  ).bind(amount,companyId,auth.row.student_id,amount).run();
  if(!Number(take?.meta?.changes||0))return json({ok:false,error:'company_funds_insufficient'},409);
  await env.DB.prepare(
    'UPDATE economy_accounts SET balance=balance+?,updated_at=? WHERE student_id=?'
  ).bind(amount,nowIso(),auth.row.student_id).run();
  const account=await studentAccount(env,auth.row.student_id);
  await env.DB.prepare(
    'INSERT INTO economy_transactions (class_id,student_id,type,reason,amount,balance_after,savings_after,meta_json,created_at) '+
    "VALUES (?,?,'company-withdraw','회사 수익 인출',?,?,?,?,?)"
  ).bind(auth.row.class_id,auth.row.student_id,amount,Number(account.balance||0),Number(account.savings_balance||0),JSON.stringify({companyId}),nowIso()).run();
  const result={amount,balance:Number(account.balance||0)};
  await completeRequest(env,claim.key,result);
  return json({ok:true,...result});
}

export async function studentAppealV3(request,env){
  const auth=await requireEconomyStudent(request,env); if(auth.response)return auth.response;
  const body=await requestBody(request); if(!body)return json({ok:false,error:'invalid_json'},400);
  const caseId=cleanId(body.caseId),text=clean(body.text,300);
  const found=await env.DB.prepare(
    'SELECT id,status,appeal_count FROM economy_cases WHERE id=? AND student_id=?'
  ).bind(caseId,auth.row.student_id).first();
  if(!found)return json({ok:false,error:'case_not_found'},404);
  if(found.status!=='confirmed'||Number(found.appeal_count||0)>=1){
    return json({ok:false,error:'case_not_appealable'},409);
  }
  await env.DB.prepare(
    "UPDATE economy_cases SET status='appealed',appeal_text=?,appealed_at=?,appeal_count=appeal_count+1 WHERE id=?"
  ).bind(text,nowIso(),caseId).run();
  return json({ok:true});
}
