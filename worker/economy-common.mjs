import { requireStudent } from './accounts.mjs';

export const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'cache-control': 'no-store'
});

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

export function nowIso() {
  return new Date().toISOString();
}

export function clean(value, max = 120) {
  return String(value ?? '')
    .replace(/[<>\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function cleanId(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 96);
}

export function clampInt(value, min = 0, max = 1000000, fallback = min) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export async function parseJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}

export async function classRow(env, classId) {
  return env.DB.prepare('SELECT id, class_code, name FROM kidscade_classes WHERE id = ?').bind(classId).first();
}

export async function settingsRow(env, classId) {
  return env.DB.prepare(
    'SELECT class_id, currency, opening_balance, income_tax_rate, consumption_tax_rate, ' +
    'savings_interest_rate, fine_cap_percent, payday_label, treasury_balance, enabled, created_at, updated_at ' +
    'FROM economy_class_settings WHERE class_id = ?'
  ).bind(classId).first();
}

export function settingsPayload(row) {
  if (!row) return null;
  return {
    classId: row.class_id,
    currency: row.currency || '뚝',
    openingBalance: Number(row.opening_balance || 0),
    incomeTaxRate: Number(row.income_tax_rate || 0),
    consumptionTaxRate: Number(row.consumption_tax_rate || 0),
    savingsInterestRate: Number(row.savings_interest_rate || 0),
    fineCapPercent: Number(row.fine_cap_percent || 0),
    paydayLabel: row.payday_label || '금요일',
    treasury: Number(row.treasury_balance || 0),
    enabled: Number(row.enabled || 0) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function ensureStudentAccount(env, studentId, classId, openingBalance) {
  const existing = await env.DB.prepare('SELECT student_id FROM economy_accounts WHERE student_id = ?').bind(studentId).first();
  if (existing) return false;
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT OR IGNORE INTO economy_accounts ' +
      '(student_id, class_id, balance, savings_balance, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)'
    ).bind(studentId, classId, openingBalance, now, now),
    env.DB.prepare(
      'INSERT INTO economy_transactions ' +
      '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
      "VALUES (?, ?, 'opening', '학급경제 시작금', ?, ?, 0, '{}', ?)"
    ).bind(classId, studentId, openingBalance, openingBalance, now)
  ]);
  return true;
}

export async function ensureClassAccounts(env, classId, openingBalance) {
  const students = await env.DB.prepare(
    'SELECT id FROM student_accounts WHERE class_id = ? AND disabled = 0 ORDER BY login_id ASC'
  ).bind(classId).all();
  const existing = await env.DB.prepare(
    'SELECT student_id FROM economy_accounts WHERE class_id = ?'
  ).bind(classId).all();
  const existingIds = new Set((existing?.results || []).map(row => row.student_id));
  const missing = (students?.results || []).filter(row => !existingIds.has(row.id));
  if (!missing.length) return 0;

  const now = nowIso();
  const statements = [];
  for (const student of missing) {
    statements.push(env.DB.prepare(
      'INSERT OR IGNORE INTO economy_accounts ' +
      '(student_id, class_id, balance, savings_balance, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)'
    ).bind(student.id, classId, openingBalance, now, now));
    statements.push(env.DB.prepare(
      'INSERT INTO economy_transactions ' +
      '(class_id, student_id, type, reason, amount, balance_after, savings_after, meta_json, created_at) ' +
      "VALUES (?, ?, 'opening', '학급경제 시작금', ?, ?, 0, '{}', ?)"
    ).bind(classId, student.id, openingBalance, openingBalance, now));
  }
  await env.DB.batch(statements);
  return missing.length;
}

export async function requireEconomyStudent(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return { response: auth.response };
  const settings = await settingsRow(env, auth.row.class_id);
  if (!settings || !Number(settings.enabled)) {
    return { response: json({ ok: false, error: 'economy_not_enabled' }, 404) };
  }
  await ensureStudentAccount(env, auth.row.student_id, auth.row.class_id, Number(settings.opening_balance || 0));
  return { ...auth, settings };
}

export function methodNotAllowed(allow) {
  return json({ ok: false, error: 'method_not_allowed' }, 405, { allow });
}
