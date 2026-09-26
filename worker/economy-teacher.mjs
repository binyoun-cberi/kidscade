import { authorizeTeacher } from './accounts.mjs';
import {
  json, nowIso, clean, cleanId, clampInt, parseJson,
  classRow, settingsRow, settingsPayload, ensureClassAccounts
} from './economy-common.mjs';

export async function teacherEconomyState(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  const classId = cleanId(new URL(request.url).searchParams.get('classId'));
  if (!classId) return json({ ok:false, error:'class_id_required' },400);

  const classroom = await classRow(env, classId);
  if (!classroom) return json({ ok:false, error:'class_not_found' },404);

  const settings = await settingsRow(env, classId);
  if (!settings) return json({ ok:true, enabled:false, classroom });

  await ensureClassAccounts(env, classId, Number(settings.opening_balance || 0));

  const students = await env.DB.prepare(
    'SELECT a.id, a.login_id, a.nickname, a.disabled, e.balance, e.savings_balance ' +
    'FROM student_accounts a LEFT JOIN economy_accounts e ON e.student_id = a.id ' +
    'WHERE a.class_id = ? ORDER BY a.login_id ASC'
  ).bind(classId).all();

  const certificates = await env.DB.prepare(
    'SELECT id, name, description, created_at FROM economy_certificates WHERE class_id = ? ORDER BY created_at ASC'
  ).bind(classId).all();

  const studentCerts = await env.DB.prepare(
    'SELECT sc.student_id, sc.certificate_id FROM economy_student_certificates sc ' +
    'JOIN student_accounts a ON a.id = sc.student_id WHERE a.class_id = ?'
  ).bind(classId).all();

  const jobs = await env.DB.prepare(
    'SELECT id, name, salary, capacity, task, active, created_at FROM economy_jobs ' +
    'WHERE class_id = ? ORDER BY created_at ASC'
  ).bind(classId).all();

  const jobCerts = await env.DB.prepare(
    'SELECT jc.job_id, jc.certificate_id FROM economy_job_certificates jc ' +
    'JOIN economy_jobs j ON j.id = jc.job_id WHERE j.class_id = ?'
  ).bind(classId).all();

  const applications = await env.DB.prepare(
    'SELECT p.job_id, p.student_id, p.applied_at FROM economy_job_applications p ' +
    'JOIN economy_jobs j ON j.id = p.job_id WHERE j.class_id = ?'
  ).bind(classId).all();

  const assignments = await env.DB.prepare(
    'SELECT a.student_id, a.job_id, a.assigned_at FROM economy_job_assignments a ' +
    'JOIN economy_jobs j ON j.id = a.job_id WHERE j.class_id = ?'
  ).bind(classId).all();

  const items = await env.DB.prepare(
    'SELECT id, name, price, stock, active, created_at FROM economy_items WHERE class_id = ? ORDER BY created_at ASC'
  ).bind(classId).all();

  const laws = await env.DB.prepare(
    'SELECT id, title, description, default_fine, effective_from, active, created_at ' +
    'FROM economy_laws WHERE class_id = ? ORDER BY effective_from ASC, created_at ASC'
  ).bind(classId).all();

  const cases = await env.DB.prepare(
    'SELECT id, student_id, law_id, proposed_fine, applied_fine, note, occurred_at, status, ' +
    'appeal_text, created_at, decided_at, appealed_at FROM economy_cases ' +
    'WHERE class_id = ? ORDER BY created_at DESC LIMIT 100'
  ).bind(classId).all();

  const payrollRuns = await env.DB.prepare(
    'SELECT period_id, gross_total, tax_total, interest_total, paid_students, created_at ' +
    'FROM economy_payroll_runs WHERE class_id = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(classId).all();

  const transactions = await env.DB.prepare(
    'SELECT id, student_id, type, reason, amount, balance_after, savings_after, treasury_after, created_at ' +
    'FROM economy_transactions WHERE class_id = ? ORDER BY id DESC LIMIT 120'
  ).bind(classId).all();

  const certByStudent = new Map();
  for (const link of studentCerts?.results || []) {
    if (!certByStudent.has(link.student_id)) certByStudent.set(link.student_id, []);
    certByStudent.get(link.student_id).push(link.certificate_id);
  }

  const jobCertMap = new Map();
  for (const link of jobCerts?.results || []) {
    if (!jobCertMap.has(link.job_id)) jobCertMap.set(link.job_id, []);
    jobCertMap.get(link.job_id).push(link.certificate_id);
  }

  const applicants = new Map();
  for (const link of applications?.results || []) {
    if (!applicants.has(link.job_id)) applicants.set(link.job_id, []);
    applicants.get(link.job_id).push(link.student_id);
  }

  const assigned = new Map();
  for (const link of assignments?.results || []) {
    if (!assigned.has(link.job_id)) assigned.set(link.job_id, []);
    assigned.get(link.job_id).push(link.student_id);
  }

  const assignmentByStudent = new Map((assignments?.results || []).map(link => [link.student_id, link.job_id]));

  return json({
    ok:true,
    enabled:true,
    classroom,
    settings:settingsPayload(settings),
    students:(students?.results || []).map(student => ({
      id:student.id,
      loginId:student.login_id,
      nickname:student.nickname || '새싹 게이머',
      disabled:Boolean(Number(student.disabled)),
      balance:Number(student.balance || 0),
      savings:Number(student.savings_balance || 0),
      certificateIds:certByStudent.get(student.id) || [],
      jobId:assignmentByStudent.get(student.id) || null
    })),
    certificates:certificates?.results || [],
    jobs:(jobs?.results || []).map(job => ({
      id:job.id,
      name:job.name,
      salary:Number(job.salary || 0),
      capacity:Number(job.capacity || 1),
      task:job.task || '',
      active:Boolean(Number(job.active)),
      requiredCertificateIds:jobCertMap.get(job.id) || [],
      applicantIds:applicants.get(job.id) || [],
      assignedStudentIds:assigned.get(job.id) || []
    })),
    items:(items?.results || []).map(item => ({
      id:item.id,
      name:item.name,
      price:Number(item.price || 0),
      stock:item.stock == null ? null : Number(item.stock),
      active:Boolean(Number(item.active))
    })),
    laws:(laws?.results || []).map(item => ({
      id:item.id,
      title:item.title,
      description:item.description || '',
      defaultFine:Number(item.default_fine || 0),
      effectiveFrom:item.effective_from,
      active:Boolean(Number(item.active))
    })),
    cases:cases?.results || [],
    payrollRuns:payrollRuns?.results || [],
    transactions:transactions?.results || []
  });
}

export async function teacherEnable(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const classroom = await classRow(env, classId);
  if (!classroom) return json({ ok:false,error:'class_not_found' },404);

  const existing = await settingsRow(env, classId);
  if (existing) return json({ ok:true, enabled:true, settings:settingsPayload(existing) });

  const openingBalance = clampInt(body?.openingBalance,0,100000,100);
  const currency = clean(body?.currency,12) || '뚝';
  const incomeTaxRate = clampInt(body?.incomeTaxRate,0,100,10);
  const consumptionTaxRate = clampInt(body?.consumptionTaxRate,0,100,10);
  const savingsInterestRate = clampInt(body?.savingsInterestRate,0,20,1);
  const fineCapPercent = clampInt(body?.fineCapPercent,0,100,30);
  const paydayLabel = clean(body?.paydayLabel,20) || '금요일';
  const now = nowIso();

  await env.DB.prepare(
    'INSERT INTO economy_class_settings ' +
    '(class_id, currency, opening_balance, income_tax_rate, consumption_tax_rate, savings_interest_rate, ' +
    'fine_cap_percent, payday_label, treasury_balance, enabled, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)'
  ).bind(
    classId, currency, openingBalance, incomeTaxRate, consumptionTaxRate,
    savingsInterestRate, fineCapPercent, paydayLabel, now, now
  ).run();

  const createdAccounts = await ensureClassAccounts(env, classId, openingBalance);
  return json({ ok:true, enabled:true, createdAccounts });
}

export async function teacherSettings(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const current = await settingsRow(env, classId);
  if (!current) return json({ ok:false,error:'economy_not_enabled' },404);

  const currency = clean(body?.currency ?? current.currency,12) || current.currency;
  const incomeTaxRate = clampInt(body?.incomeTaxRate ?? current.income_tax_rate,0,100,Number(current.income_tax_rate));
  const consumptionTaxRate = clampInt(body?.consumptionTaxRate ?? current.consumption_tax_rate,0,100,Number(current.consumption_tax_rate));
  const savingsInterestRate = clampInt(body?.savingsInterestRate ?? current.savings_interest_rate,0,20,Number(current.savings_interest_rate));
  const fineCapPercent = clampInt(body?.fineCapPercent ?? current.fine_cap_percent,0,100,Number(current.fine_cap_percent));
  const paydayLabel = clean(body?.paydayLabel ?? current.payday_label,20) || current.payday_label;

  await env.DB.prepare(
    'UPDATE economy_class_settings SET currency = ?, income_tax_rate = ?, consumption_tax_rate = ?, ' +
    'savings_interest_rate = ?, fine_cap_percent = ?, payday_label = ?, updated_at = ? WHERE class_id = ?'
  ).bind(
    currency, incomeTaxRate, consumptionTaxRate, savingsInterestRate,
    fineCapPercent, paydayLabel, nowIso(), classId
  ).run();

  return json({ ok:true });
}

export async function teacherCertificate(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  if (!await settingsRow(env,classId)) return json({ ok:false,error:'economy_not_enabled' },404);

  const name = clean(body?.name,50);
  if (!name) return json({ ok:false,error:'name_required' },400);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO economy_certificates (id, class_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id,classId,name,clean(body?.description,180),nowIso()).run();

  return json({ ok:true, certificateId:id });
}

export async function teacherCertificateGrant(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const studentId = cleanId(body?.studentId);
  const certificateId = cleanId(body?.certificateId);

  const student = await env.DB.prepare(
    'SELECT id FROM student_accounts WHERE id = ? AND class_id = ?'
  ).bind(studentId,classId).first();

  const certificate = await env.DB.prepare(
    'SELECT id FROM economy_certificates WHERE id = ? AND class_id = ?'
  ).bind(certificateId,classId).first();

  if (!student || !certificate) return json({ ok:false,error:'not_found' },404);

  if (body?.grant === false) {
    await env.DB.prepare(
      'DELETE FROM economy_student_certificates WHERE student_id = ? AND certificate_id = ?'
    ).bind(studentId,certificateId).run();
  } else {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO economy_student_certificates (student_id, certificate_id, granted_at) VALUES (?, ?, ?)'
    ).bind(studentId,certificateId,nowIso()).run();
  }

  return json({ ok:true });
}

export async function teacherJob(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const name = clean(body?.name,50);
  if (!name) return json({ ok:false,error:'name_required' },400);
  if (!await settingsRow(env,classId)) return json({ ok:false,error:'economy_not_enabled' },404);

  const id = crypto.randomUUID();
  const now = nowIso();
  const required = Array.isArray(body?.requiredCertificateIds)
    ? body.requiredCertificateIds.map(cleanId).filter(Boolean).slice(0,20)
    : [];

  const statements = [
    env.DB.prepare(
      'INSERT INTO economy_jobs (id, class_id, name, salary, capacity, task, active, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    ).bind(
      id, classId, name,
      clampInt(body?.salary,0,100000,100),
      clampInt(body?.capacity,1,20,1),
      clean(body?.task,200),
      now
    )
  ];

  for (const certificateId of required) {
    statements.push(env.DB.prepare(
      'INSERT OR IGNORE INTO economy_job_certificates (job_id, certificate_id) ' +
      'SELECT ?, id FROM economy_certificates WHERE id = ? AND class_id = ?'
    ).bind(id,certificateId,classId));
  }

  await env.DB.batch(statements);
  return json({ ok:true, jobId:id });
}

export async function teacherJobAssign(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const studentId = cleanId(body?.studentId);
  const jobId = cleanId(body?.jobId);

  const student = await env.DB.prepare(
    'SELECT id FROM student_accounts WHERE id = ? AND class_id = ?'
  ).bind(studentId,classId).first();

  const job = await env.DB.prepare(
    'SELECT id, capacity FROM economy_jobs WHERE id = ? AND class_id = ? AND active = 1'
  ).bind(jobId,classId).first();

  if (!student || !job) return json({ ok:false,error:'not_found' },404);

  const missing = await env.DB.prepare(
    'SELECT jc.certificate_id FROM economy_job_certificates jc ' +
    'WHERE jc.job_id = ? AND NOT EXISTS (' +
    'SELECT 1 FROM economy_student_certificates sc WHERE sc.student_id = ? AND sc.certificate_id = jc.certificate_id' +
    ') LIMIT 1'
  ).bind(jobId,studentId).first();

  if (missing) return json({ ok:false,error:'certificate_required' },409);

  const count = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM economy_job_assignments WHERE job_id = ? AND student_id <> ?'
  ).bind(jobId,studentId).first();

  if (Number(count?.total || 0) >= Number(job.capacity || 1)) {
    return json({ ok:false,error:'job_full' },409);
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM economy_job_assignments WHERE student_id = ?').bind(studentId),
    env.DB.prepare(
      'INSERT INTO economy_job_assignments (student_id, job_id, assigned_at) VALUES (?, ?, ?)'
    ).bind(studentId,jobId,nowIso()),
    env.DB.prepare('DELETE FROM economy_job_applications WHERE student_id = ?').bind(studentId)
  ]);

  return json({ ok:true });
}

export async function teacherPayroll(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const periodId = clean(body?.periodId,40);
  if (!periodId) return json({ ok:false,error:'period_required' },400);

  const settings = await settingsRow(env,classId);
  if (!settings) return json({ ok:false,error:'economy_not_enabled' },404);

  const already = await env.DB.prepare(
    'SELECT 1 AS yes FROM economy_payroll_runs WHERE class_id = ? AND period_id = ?'
  ).bind(classId,periodId).first();

  if (already) return json({ ok:false,error:'payroll_already_run' },409);

  await ensureClassAccounts(env,classId,Number(settings.opening_balance || 0));

  const rows = await env.DB.prepare(
    'SELECT e.student_id, e.balance, e.savings_balance, a.nickname, ' +
    'j.id AS job_id, j.name AS job_name, j.salary ' +
    'FROM economy_accounts e ' +
    'JOIN student_accounts a ON a.id = e.student_id ' +
    'LEFT JOIN economy_job_assignments ja ON ja.student_id = e.student_id ' +
    'LEFT JOIN economy_jobs j ON j.id = ja.job_id AND j.active = 1 ' +
    'WHERE e.class_id = ? AND a.disabled = 0 ORDER BY a.login_id ASC'
  ).bind(classId).all();

  let treasury = Number(settings.treasury_balance || 0);
  let grossTotal = 0;
  let taxTotal = 0;
  let interestTotal = 0;
  let paidStudents = 0;
  const now = nowIso();
  const statements = [];

  for (const row of rows?.results || []) {
    let balance = Number(row.balance || 0);
    let savings = Number(row.savings_balance || 0);

    if (row.job_id) {
      const gross = Number(row.salary || 0);
      const tax = Math.round(gross * Number(settings.income_tax_rate || 0) / 100);

      balance += gross;
      grossTotal += gross;
      paidStudents += 1;

      statements.push(env.DB.prepare(
        'INSERT INTO economy_transactions ' +
        '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
        "VALUES (?, ?, 'salary', ?, ?, ?, ?, '{}', ?)"
      ).bind(classId,row.student_id,row.job_name + ' 월급 · ' + periodId,gross,balance,savings,now));

      if (tax > 0) {
        balance -= tax;
        treasury += tax;
        taxTotal += tax;

        statements.push(env.DB.prepare(
          'INSERT INTO economy_transactions ' +
          '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
          "VALUES (?, ?, 'tax', ?, ?, ?, ?, '{}', ?)"
        ).bind(
          classId,row.student_id,
          '소득세 ' + Number(settings.income_tax_rate || 0) + '% · ' + periodId,
          -tax,balance,savings,now
        ));
      }
    }

    if (savings > 0 && Number(settings.savings_interest_rate || 0) > 0) {
      const interest = Math.floor(savings * Number(settings.savings_interest_rate || 0) / 100);
      if (interest > 0) {
        savings += interest;
        interestTotal += interest;

        statements.push(env.DB.prepare(
          'INSERT INTO economy_transactions ' +
          '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
          "VALUES (?, ?, 'interest', ?, ?, ?, ?, '{}', ?)"
        ).bind(
          classId,row.student_id,
          '저축이자 ' + Number(settings.savings_interest_rate || 0) + '% · ' + periodId,
          interest,balance,savings,now
        ));
      }
    }

    statements.push(
      env.DB.prepare(
        'UPDATE economy_accounts SET balance = ?, savings_balance = ?, updated_at = ? WHERE student_id = ?'
      ).bind(balance,savings,now,row.student_id)
    );
  }

  statements.unshift(
    env.DB.prepare(
      'INSERT INTO economy_payroll_runs ' +
      '(class_id, period_id, gross_total, tax_total, interest_total, paid_students, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(classId,periodId,grossTotal,taxTotal,interestTotal,paidStudents,now)
  );

  statements.push(
    env.DB.prepare(
      'UPDATE economy_class_settings SET treasury_balance = ?, updated_at = ? WHERE class_id = ?'
    ).bind(treasury,now,classId)
  );

  if (taxTotal > 0) {
    statements.push(env.DB.prepare(
      'INSERT INTO economy_transactions ' +
      '(class_id, student_id, type, reason, amount, treasury_after, meta_json, created_at) ' +
      "VALUES (?, NULL, 'treasury', ?, ?, ?, '{}', ?)"
    ).bind(classId,'소득세 수입 · ' + periodId,taxTotal,treasury,now));
  }

  await env.DB.batch(statements);
  return json({ ok:true, summary:{ periodId,paidStudents,grossTotal,taxTotal,interestTotal,treasury } });
}

export async function teacherManual(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const studentId = cleanId(body?.studentId);
  const amount = Math.trunc(Number(body?.amount || 0));
  if (!amount) return json({ ok:false,error:'invalid_amount' },400);

  const account = await env.DB.prepare(
    'SELECT balance, savings_balance FROM economy_accounts WHERE student_id = ? AND class_id = ?'
  ).bind(studentId,classId).first();

  const settings = await settingsRow(env,classId);
  if (!account || !settings) return json({ ok:false,error:'not_found' },404);

  const nextBalance = Number(account.balance || 0) + amount;
  if (nextBalance < 0) return json({ ok:false,error:'insufficient_funds' },409);

  let treasury = Number(settings.treasury_balance || 0);
  const toTreasury = amount < 0 && body?.toTreasury === true;
  if (toTreasury) treasury += Math.abs(amount);

  const now = nowIso();
  const statements = [
    env.DB.prepare(
      'UPDATE economy_accounts SET balance = ?, updated_at = ? WHERE student_id = ?'
    ).bind(nextBalance,now,studentId),
    env.DB.prepare(
      'INSERT INTO economy_transactions ' +
      '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
      "VALUES (?, ?, 'manual', ?, ?, ?, ?, '{}', ?)"
    ).bind(
      classId,studentId,clean(body?.reason,120) || '교사 거래',
      amount,nextBalance,Number(account.savings_balance || 0),now
    )
  ];

  if (toTreasury) {
    statements.push(
      env.DB.prepare(
        'UPDATE economy_class_settings SET treasury_balance = ?, updated_at = ? WHERE class_id = ?'
      ).bind(treasury,now,classId),
      env.DB.prepare(
        'INSERT INTO economy_transactions ' +
        '(class_id, student_id, type, reason, amount, treasury_after, meta_json, created_at) ' +
        "VALUES (?, NULL, 'treasury', ?, ?, ?, '{}', ?)"
      ).bind(classId,clean(body?.reason,120) || '교사 징수',Math.abs(amount),treasury,now)
    );
  }

  await env.DB.batch(statements);
  return json({ ok:true, balance:nextBalance, treasury });
}

export async function teacherTreasury(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const amount = clampInt(body?.amount,1,1000000,0);
  const settings = await settingsRow(env,classId);
  if (!settings) return json({ ok:false,error:'economy_not_enabled' },404);
  if (Number(settings.treasury_balance || 0) < amount) return json({ ok:false,error:'insufficient_treasury' },409);

  const next = Number(settings.treasury_balance || 0) - amount;
  const now = nowIso();

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE economy_class_settings SET treasury_balance = ?, updated_at = ? WHERE class_id = ?'
    ).bind(next,now,classId),
    env.DB.prepare(
      'INSERT INTO economy_transactions ' +
      '(class_id, student_id, type, reason, amount, treasury_after, meta_json, created_at) ' +
      "VALUES (?, NULL, 'treasury', ?, ?, ?, '{}', ?)"
    ).bind(classId,clean(body?.reason,120) || '공공지출',-amount,next,now)
  ]);

  return json({ ok:true, treasury:next });
}

export async function teacherItem(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const name = clean(body?.name,60);
  if (!name) return json({ ok:false,error:'name_required' },400);
  if (!await settingsRow(env,classId)) return json({ ok:false,error:'economy_not_enabled' },404);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO economy_items (id, class_id, name, price, stock, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).bind(
    id,classId,name,
    clampInt(body?.price,1,100000,10),
    body?.unlimited === true ? null : clampInt(body?.stock,0,10000,0),
    nowIso()
  ).run();

  return json({ ok:true, itemId:id });
}

export async function teacherLaw(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const title = clean(body?.title,80);
  if (!title) return json({ ok:false,error:'title_required' },400);
  if (!await settingsRow(env,classId)) return json({ ok:false,error:'economy_not_enabled' },404);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO economy_laws ' +
    '(id, class_id, title, description, default_fine, effective_from, active, created_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
  ).bind(
    id,classId,title,clean(body?.description,240),
    clampInt(body?.defaultFine,0,100000,10),
    clean(body?.effectiveFrom,30) || new Date().toISOString().slice(0,10),
    nowIso()
  ).run();

  return json({ ok:true, lawId:id });
}

export async function teacherCase(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const studentId = cleanId(body?.studentId);
  const lawId = cleanId(body?.lawId);

  const student = await env.DB.prepare(
    'SELECT id FROM student_accounts WHERE id = ? AND class_id = ?'
  ).bind(studentId,classId).first();

  const law = await env.DB.prepare(
    'SELECT id, default_fine, effective_from FROM economy_laws ' +
    'WHERE id = ? AND class_id = ? AND active = 1'
  ).bind(lawId,classId).first();

  if (!student || !law) return json({ ok:false,error:'not_found' },404);

  const occurredAt = clean(body?.occurredAt,30) || new Date().toISOString().slice(0,10);
  if (law.effective_from && occurredAt < law.effective_from) {
    return json({ ok:false,error:'law_not_in_effect' },409);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO economy_cases ' +
    '(id, class_id, student_id, law_id, proposed_fine, applied_fine, note, occurred_at, status, appeal_text, created_at) ' +
    "VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'pending', '', ?)"
  ).bind(
    id,classId,studentId,lawId,
    clampInt(body?.fine,0,100000,Number(law.default_fine || 0)),
    clean(body?.note,240),
    occurredAt,
    nowIso()
  ).run();

  return json({ ok:true, caseId:id });
}

export async function teacherCaseDecision(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false,error:'invalid_json' },400); }

  const classId = cleanId(body?.classId);
  const caseId = cleanId(body?.caseId);
  const decision = clean(body?.decision,20);

  const item = await env.DB.prepare(
    'SELECT c.*, e.balance, e.savings_balance, s.treasury_balance, s.opening_balance, s.fine_cap_percent, ' +
    'j.salary AS job_salary FROM economy_cases c ' +
    'JOIN economy_accounts e ON e.student_id = c.student_id ' +
    'JOIN economy_class_settings s ON s.class_id = c.class_id ' +
    'LEFT JOIN economy_job_assignments a ON a.student_id = c.student_id ' +
    'LEFT JOIN economy_jobs j ON j.id = a.job_id ' +
    'WHERE c.id = ? AND c.class_id = ?'
  ).bind(caseId,classId).first();

  if (!item) return json({ ok:false,error:'case_not_found' },404);

  const now = nowIso();
  const statements = [];

  if (decision === 'confirm' && item.status === 'pending') {
    const base = item.job_salary == null ? Number(item.opening_balance || 0) : Number(item.job_salary || 0);
    const cap = Math.floor(base * Number(item.fine_cap_percent || 0) / 100);
    const fine = Math.max(0,Math.min(Number(item.proposed_fine || 0),cap,Number(item.balance || 0)));
    const balance = Number(item.balance || 0) - fine;
    const treasury = Number(item.treasury_balance || 0) + fine;

    statements.push(
      env.DB.prepare(
        "UPDATE economy_cases SET status = 'confirmed', applied_fine = ?, decided_at = ? WHERE id = ?"
      ).bind(fine,now,caseId),
      env.DB.prepare(
        'UPDATE economy_accounts SET balance = ?, updated_at = ? WHERE student_id = ?'
      ).bind(balance,now,item.student_id),
      env.DB.prepare(
        'UPDATE economy_class_settings SET treasury_balance = ?, updated_at = ? WHERE class_id = ?'
      ).bind(treasury,now,classId)
    );

    if (fine > 0) {
      statements.push(
        env.DB.prepare(
          'INSERT INTO economy_transactions ' +
          '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
          "VALUES (?, ?, 'fine', '과태료 처분', ?, ?, ?, ?, ?)"
        ).bind(
          classId,item.student_id,-fine,balance,Number(item.savings_balance || 0),
          JSON.stringify({ caseId,lawId:item.law_id }),now
        ),
        env.DB.prepare(
          'INSERT INTO economy_transactions ' +
          '(class_id, student_id, type, reason, amount, treasury_after, meta_json, created_at) ' +
          "VALUES (?, NULL, 'treasury', '과태료 수입', ?, ?, ?, ?)"
        ).bind(classId,fine,treasury,JSON.stringify({ caseId }),now)
      );
    }
  } else if (decision === 'cancel' && item.status === 'pending') {
    statements.push(
      env.DB.prepare(
        "UPDATE economy_cases SET status = 'cancelled', decided_at = ? WHERE id = ?"
      ).bind(now,caseId)
    );
  } else if (decision === 'uphold' && item.status === 'appealed') {
    statements.push(
      env.DB.prepare(
        "UPDATE economy_cases SET status = 'upheld', decided_at = ? WHERE id = ?"
      ).bind(now,caseId)
    );
  } else if (decision === 'reverse' && ['confirmed','appealed','upheld'].includes(item.status)) {
    const refund = Number(item.applied_fine || 0);
    const balance = Number(item.balance || 0) + refund;
    const treasury = Number(item.treasury_balance || 0) - refund;

    statements.push(
      env.DB.prepare(
        "UPDATE economy_cases SET status = 'reversed', decided_at = ? WHERE id = ?"
      ).bind(now,caseId),
      env.DB.prepare(
        'UPDATE economy_accounts SET balance = ?, updated_at = ? WHERE student_id = ?'
      ).bind(balance,now,item.student_id),
      env.DB.prepare(
        'UPDATE economy_class_settings SET treasury_balance = ?, updated_at = ? WHERE class_id = ?'
      ).bind(treasury,now,classId)
    );

    if (refund > 0) {
      statements.push(
        env.DB.prepare(
          'INSERT INTO economy_transactions ' +
          '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
          "VALUES (?, ?, 'fine-refund', '과태료 처분 취소 환급', ?, ?, ?, ?, ?)"
        ).bind(
          classId,item.student_id,refund,balance,Number(item.savings_balance || 0),
          JSON.stringify({ caseId }),now
        ),
        env.DB.prepare(
          'INSERT INTO economy_transactions ' +
          '(class_id, student_id, type, reason, amount, treasury_after, meta_json, created_at) ' +
          "VALUES (?, NULL, 'treasury', '과태료 환급', ?, ?, ?, ?)"
        ).bind(classId,-refund,treasury,JSON.stringify({ caseId }),now)
      );
    }
  } else {
    return json({ ok:false,error:'invalid_case_transition' },409);
  }

  await env.DB.batch(statements);
  return json({ ok:true });
}
