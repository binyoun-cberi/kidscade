import { methodNotAllowed, json } from './economy-common.mjs';
import {
  getStudentEconomy,
  studentSavings,
  studentApply,
  studentBuy,
  studentAppeal
} from './economy-student.mjs';
import {
  teacherEconomyState,
  teacherEnable,
  teacherSettings,
  teacherCertificate,
  teacherCertificateGrant,
  teacherJob,
  teacherJobAssign,
  teacherPayroll,
  teacherManual,
  teacherTreasury,
  teacherItem,
  teacherLaw,
  teacherCase,
  teacherCaseDecision
} from './economy-teacher.mjs';

export async function handleEconomyRequest(request, env) {
  const path = new URL(request.url).pathname;
  const known = new Set([
    '/api/economy',
    '/api/economy/savings',
    '/api/economy/job-apply',
    '/api/economy/buy',
    '/api/economy/appeal',
    '/api/teacher/economy',
    '/api/teacher/economy/enable',
    '/api/teacher/economy/settings',
    '/api/teacher/economy/certificate',
    '/api/teacher/economy/certificate-grant',
    '/api/teacher/economy/job',
    '/api/teacher/economy/job-assign',
    '/api/teacher/economy/payroll',
    '/api/teacher/economy/manual',
    '/api/teacher/economy/treasury',
    '/api/teacher/economy/item',
    '/api/teacher/economy/law',
    '/api/teacher/economy/case',
    '/api/teacher/economy/case-decision'
  ]);
  if (!known.has(path)) return null;

  try {
    if (path === '/api/economy') return request.method === 'GET' ? getStudentEconomy(request, env) : methodNotAllowed('GET');
    if (path === '/api/economy/savings') return request.method === 'POST' ? studentSavings(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/job-apply') return request.method === 'POST' ? studentApply(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/buy') return request.method === 'POST' ? studentBuy(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/appeal') return request.method === 'POST' ? studentAppeal(request, env) : methodNotAllowed('POST');

    if (path === '/api/teacher/economy') return request.method === 'GET' ? teacherEconomyState(request, env) : methodNotAllowed('GET');
    if (path === '/api/teacher/economy/enable') return request.method === 'POST' ? teacherEnable(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/settings') return request.method === 'PATCH' ? teacherSettings(request, env) : methodNotAllowed('PATCH');
    if (path === '/api/teacher/economy/certificate') return request.method === 'POST' ? teacherCertificate(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/certificate-grant') return request.method === 'POST' ? teacherCertificateGrant(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/job') return request.method === 'POST' ? teacherJob(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/job-assign') return request.method === 'POST' ? teacherJobAssign(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/payroll') return request.method === 'POST' ? teacherPayroll(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/manual') return request.method === 'POST' ? teacherManual(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/treasury') return request.method === 'POST' ? teacherTreasury(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/item') return request.method === 'POST' ? teacherItem(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/law') return request.method === 'POST' ? teacherLaw(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/case') return request.method === 'POST' ? teacherCase(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/case-decision') return request.method === 'POST' ? teacherCaseDecision(request, env) : methodNotAllowed('POST');
  } catch (error) {
    const message = String(error?.message || '');
    if (/no such table|SQLITE_ERROR/i.test(message)) return json({ ok:false,error:'economy_schema_not_ready' },503);
    if (/UNIQUE constraint failed: economy_payroll_runs/i.test(message)) return json({ ok:false,error:'payroll_already_run' },409);
    console.error('[Kidscade economy API]', error);
    return json({ ok:false,error:'economy_server_error' },500);
  }
  return null;
}
