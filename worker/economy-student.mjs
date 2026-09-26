import { json, nowIso, clean, cleanId, clampInt, parseJson, requireEconomyStudent, settingsPayload } from './economy-common.mjs';

export async function getStudentEconomy(request, env) {
  const auth = await requireEconomyStudent(request, env);
  if (auth.response) return auth.response;
  const row = auth.row;
  const settings = auth.settings;

  const account = await env.DB.prepare(
    'SELECT balance, savings_balance, created_at, updated_at FROM economy_accounts WHERE student_id = ?'
  ).bind(row.student_id).first();

  const certs = await env.DB.prepare(
    'SELECT c.id, c.name, c.description, CASE WHEN sc.student_id IS NULL THEN 0 ELSE 1 END AS owned ' +
    'FROM economy_certificates c ' +
    'LEFT JOIN economy_student_certificates sc ON sc.certificate_id = c.id AND sc.student_id = ? ' +
    'WHERE c.class_id = ? ORDER BY c.created_at ASC'
  ).bind(row.student_id, row.class_id).all();

  const jobs = await env.DB.prepare(
    'SELECT j.id, j.name, j.salary, j.capacity, j.task, ' +
    '(SELECT COUNT(*) FROM economy_job_assignments a2 WHERE a2.job_id = j.id) AS assigned_count, ' +
    'CASE WHEN a.student_id IS NULL THEN 0 ELSE 1 END AS assigned, ' +
    'CASE WHEN p.student_id IS NULL THEN 0 ELSE 1 END AS applied ' +
    'FROM economy_jobs j ' +
    'LEFT JOIN economy_job_assignments a ON a.job_id = j.id AND a.student_id = ? ' +
    'LEFT JOIN economy_job_applications p ON p.job_id = j.id AND p.student_id = ? ' +
    'WHERE j.class_id = ? AND j.active = 1 ORDER BY j.created_at ASC'
  ).bind(row.student_id, row.student_id, row.class_id).all();

  const required = await env.DB.prepare(
    'SELECT jc.job_id, jc.certificate_id FROM economy_job_certificates jc ' +
    'JOIN economy_jobs j ON j.id = jc.job_id WHERE j.class_id = ? AND j.active = 1'
  ).bind(row.class_id).all();

  const ownedIds = new Set((certs?.results || []).filter(item => Number(item.owned)).map(item => item.id));
  const reqMap = new Map();
  for (const link of required?.results || []) {
    if (!reqMap.has(link.job_id)) reqMap.set(link.job_id, []);
    reqMap.get(link.job_id).push(link.certificate_id);
  }

  const safeJobs = (jobs?.results || []).map(job => {
    const requiredCertificateIds = reqMap.get(job.id) || [];
    return {
      id: job.id,
      name: job.name,
      salary: Number(job.salary || 0),
      capacity: Number(job.capacity || 1),
      task: job.task || '',
      assignedCount: Number(job.assigned_count || 0),
      assigned: Boolean(Number(job.assigned)),
      applied: Boolean(Number(job.applied)),
      requiredCertificateIds,
      qualified: requiredCertificateIds.every(id => ownedIds.has(id))
    };
  });

  const items = await env.DB.prepare(
    'SELECT id, name, price, stock FROM economy_items WHERE class_id = ? AND active = 1 ORDER BY created_at ASC'
  ).bind(row.class_id).all();

  const laws = await env.DB.prepare(
    'SELECT id, title, description, default_fine, effective_from FROM economy_laws ' +
    'WHERE class_id = ? AND active = 1 ORDER BY effective_from ASC, created_at ASC'
  ).bind(row.class_id).all();

  const cases = await env.DB.prepare(
    'SELECT id, law_id, proposed_fine, applied_fine, note, occurred_at, status, appeal_text, created_at, decided_at, appealed_at ' +
    'FROM economy_cases WHERE student_id = ? ORDER BY created_at DESC LIMIT 30'
  ).bind(row.student_id).all();

  const transactions = await env.DB.prepare(
    'SELECT id, type, reason, amount, balance_after, savings_after, meta_json, created_at ' +
    'FROM economy_transactions WHERE student_id = ? ORDER BY id DESC LIMIT 40'
  ).bind(row.student_id).all();

  return json({
    ok: true,
    classroom: { id: row.class_id, code: row.class_code, name: row.class_name },
    student: {
      id: row.student_id,
      loginId: row.login_id,
      nickname: row.nickname || '새싹 게이머',
      balance: Number(account?.balance || 0),
      savings: Number(account?.savings_balance || 0)
    },
    settings: settingsPayload(settings),
    certificates: (certs?.results || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      owned: Boolean(Number(item.owned))
    })),
    jobs: safeJobs,
    items: (items?.results || []).map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price || 0),
      stock: item.stock == null ? null : Number(item.stock)
    })),
    laws: (laws?.results || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || '',
      defaultFine: Number(item.default_fine || 0),
      effectiveFrom: item.effective_from
    })),
    cases: cases?.results || [],
    transactions: (transactions?.results || []).map(item => {
      let meta = {};
      try { meta = JSON.parse(item.meta_json || '{}'); } catch (_) {}
      return {
        id: item.id,
        type: item.type,
        reason: item.reason,
        amount: Number(item.amount || 0),
        balanceAfter: item.balance_after == null ? null : Number(item.balance_after),
        savingsAfter: item.savings_after == null ? null : Number(item.savings_after),
        createdAt: item.created_at,
        meta
      };
    })
  });
}

export async function studentSavings(request, env) {
  const auth = await requireEconomyStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false, error:'invalid_json' },400); }
  const amount = clampInt(body?.amount, 1, 1000000, 0);
  const direction = body?.direction === 'withdraw' ? 'withdraw' : 'deposit';
  if (!amount) return json({ ok:false, error:'invalid_amount' },400);

  const account = await env.DB.prepare(
    'SELECT balance, savings_balance FROM economy_accounts WHERE student_id = ?'
  ).bind(auth.row.student_id).first();
  if (!account) return json({ ok:false, error:'economy_account_not_found' },404);

  let balance = Number(account.balance || 0);
  let savings = Number(account.savings_balance || 0);
  if (direction === 'deposit') {
    if (balance < amount) return json({ ok:false, error:'insufficient_funds' },409);
    balance -= amount;
    savings += amount;
  } else {
    if (savings < amount) return json({ ok:false, error:'insufficient_savings' },409);
    savings -= amount;
    balance += amount;
  }

  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE economy_accounts SET balance = ?, savings_balance = ?, updated_at = ? WHERE student_id = ?'
    ).bind(balance, savings, now, auth.row.student_id),
    env.DB.prepare(
      'INSERT INTO economy_transactions ' +
      '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
      "VALUES (?, ?, 'savings', ?, ?, ?, ?, '{}', ?)"
    ).bind(
      auth.row.class_id,
      auth.row.student_id,
      direction === 'deposit' ? '저축' : '저축 인출',
      direction === 'deposit' ? -amount : amount,
      balance,
      savings,
      now
    )
  ]);
  return json({ ok:true, balance, savings });
}

export async function studentApply(request, env) {
  const auth = await requireEconomyStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false, error:'invalid_json' },400); }
  const jobId = cleanId(body?.jobId);

  const job = await env.DB.prepare(
    'SELECT id FROM economy_jobs WHERE id = ? AND class_id = ? AND active = 1'
  ).bind(jobId, auth.row.class_id).first();
  if (!job) return json({ ok:false, error:'job_not_found' },404);

  const missing = await env.DB.prepare(
    'SELECT jc.certificate_id FROM economy_job_certificates jc ' +
    'WHERE jc.job_id = ? AND NOT EXISTS (' +
    'SELECT 1 FROM economy_student_certificates sc ' +
    'WHERE sc.student_id = ? AND sc.certificate_id = jc.certificate_id' +
    ') LIMIT 1'
  ).bind(jobId, auth.row.student_id).first();
  if (missing) return json({ ok:false, error:'certificate_required' },409);

  await env.DB.prepare(
    'INSERT OR IGNORE INTO economy_job_applications (job_id, student_id, applied_at) VALUES (?, ?, ?)'
  ).bind(jobId, auth.row.student_id, nowIso()).run();
  return json({ ok:true });
}

export async function studentBuy(request, env) {
  const auth = await requireEconomyStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false, error:'invalid_json' },400); }
  const itemId = cleanId(body?.itemId);

  const item = await env.DB.prepare(
    'SELECT id, name, price, stock FROM economy_items WHERE id = ? AND class_id = ? AND active = 1'
  ).bind(itemId, auth.row.class_id).first();
  const account = await env.DB.prepare(
    'SELECT balance, savings_balance FROM economy_accounts WHERE student_id = ?'
  ).bind(auth.row.student_id).first();

  if (!item) return json({ ok:false, error:'item_not_found' },404);
  if (item.stock != null && Number(item.stock) <= 0) return json({ ok:false, error:'out_of_stock' },409);

  const tax = Math.round(Number(item.price || 0) * Number(auth.settings.consumption_tax_rate || 0) / 100);
  const total = Number(item.price || 0) + tax;
  if (Number(account?.balance || 0) < total) return json({ ok:false, error:'insufficient_funds' },409);

  const nextBalance = Number(account.balance || 0) - total;
  const nextStock = item.stock == null ? null : Number(item.stock) - 1;
  const nextTreasury = Number(auth.settings.treasury_balance || 0) + total;
  const now = nowIso();

  const statements = [
    env.DB.prepare('UPDATE economy_accounts SET balance = ?, updated_at = ? WHERE student_id = ?')
      .bind(nextBalance, now, auth.row.student_id),
    env.DB.prepare('UPDATE economy_class_settings SET treasury_balance = ?, updated_at = ? WHERE class_id = ?')
      .bind(nextTreasury, now, auth.row.class_id),
    env.DB.prepare(
      'INSERT INTO economy_transactions ' +
      '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
      "VALUES (?, ?, 'purchase', ?, ?, ?, ?, ?, ?)"
    ).bind(
      auth.row.class_id,
      auth.row.student_id,
      item.name + ' 구매',
      -total,
      nextBalance,
      Number(account.savings_balance || 0),
      JSON.stringify({ basePrice:Number(item.price || 0), consumptionTax:tax }),
      now
    ),
    env.DB.prepare(
      'INSERT INTO economy_transactions ' +
      '(class_id, student_id, type, reason, amount, treasury_after, meta_json, created_at) ' +
      "VALUES (?, NULL, 'treasury', ?, ?, ?, ?, ?)"
    ).bind(
      auth.row.class_id,
      (auth.row.nickname || auth.row.login_id) + ' 상점 구매 수입',
      total,
      nextTreasury,
      JSON.stringify({ studentId:auth.row.student_id, itemId }),
      now
    )
  ];

  if (nextStock != null) {
    statements.splice(2, 0, env.DB.prepare('UPDATE economy_items SET stock = ? WHERE id = ?').bind(nextStock, itemId));
  }
  await env.DB.batch(statements);
  return json({ ok:true, total, tax, balance:nextBalance, stock:nextStock });
}

export async function studentAppeal(request, env) {
  const auth = await requireEconomyStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok:false, error:'invalid_json' },400); }
  const caseId = cleanId(body?.caseId);
  const text = clean(body?.text, 300);

  const found = await env.DB.prepare(
    'SELECT id, status FROM economy_cases WHERE id = ? AND student_id = ?'
  ).bind(caseId, auth.row.student_id).first();
  if (!found) return json({ ok:false, error:'case_not_found' },404);
  if (!['confirmed','upheld'].includes(found.status)) return json({ ok:false, error:'case_not_appealable' },409);

  await env.DB.prepare(
    "UPDATE economy_cases SET status = 'appealed', appeal_text = ?, appealed_at = ? WHERE id = ?"
  ).bind(text, nowIso(), caseId).run();
  return json({ ok:true });
}
