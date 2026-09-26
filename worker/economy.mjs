import { methodNotAllowed, json } from './economy-common.mjs';
import { studentApply } from './economy-student.mjs';
import {
  getStudentEconomyV3,
  studentSavingsV3,
  studentBuyV3,
  studentWorkLog,
  studentLoanRequest,
  studentLoanRepay,
  studentInventoryUse,
  studentCompanyCreate,
  studentCompanyProduct,
  studentCompanyBuy,
  studentCompanyWithdraw,
  studentAppealV3
} from './economy-v3-student.mjs';
import {
  teacherEnable,
  teacherSettings,
  teacherCertificate,
  teacherCertificateGrant,
  teacherJob,
  teacherJobAssign,
  teacherManual,
  teacherLaw
} from './economy-teacher.mjs';
import {
  teacherEconomyStateV3,
  teacherWorkDecision,
  teacherLoanDecision,
  teacherInventoryDecision,
  teacherCompanyDecision,
  teacherItemV3,
  teacherTreasuryV3,
  teacherDebtRepay,
  teacherCaseV3,
  teacherCaseDecisionV3,
  teacherPayrollV3
} from './economy-v3-teacher.mjs';

export async function handleEconomyRequest(request, env) {
  const path = new URL(request.url).pathname;
  const known = new Set([
    '/api/economy',
    '/api/economy/savings',
    '/api/economy/job-apply',
    '/api/economy/buy',
    '/api/economy/appeal',
    '/api/economy/work-log',
    '/api/economy/loan-request',
    '/api/economy/loan-repay',
    '/api/economy/inventory-use',
    '/api/economy/company-create',
    '/api/economy/company-product',
    '/api/economy/company-buy',
    '/api/economy/company-withdraw',
    '/api/teacher/economy/work-decision',
    '/api/teacher/economy/loan-decision',
    '/api/teacher/economy/inventory-decision',
    '/api/teacher/economy/company-decision',
    '/api/teacher/economy/debt-repay',
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
    if (path === '/api/economy') return request.method === 'GET' ? getStudentEconomyV3(request, env) : methodNotAllowed('GET');
    if (path === '/api/economy/savings') return request.method === 'POST' ? studentSavingsV3(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/job-apply') return request.method === 'POST' ? studentApply(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/buy') return request.method === 'POST' ? studentBuyV3(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/appeal') return request.method === 'POST' ? studentAppealV3(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/work-log') return request.method === 'POST' ? studentWorkLog(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/loan-request') return request.method === 'POST' ? studentLoanRequest(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/loan-repay') return request.method === 'POST' ? studentLoanRepay(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/inventory-use') return request.method === 'POST' ? studentInventoryUse(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/company-create') return request.method === 'POST' ? studentCompanyCreate(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/company-product') return request.method === 'POST' ? studentCompanyProduct(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/company-buy') return request.method === 'POST' ? studentCompanyBuy(request, env) : methodNotAllowed('POST');
    if (path === '/api/economy/company-withdraw') return request.method === 'POST' ? studentCompanyWithdraw(request, env) : methodNotAllowed('POST');

    if (path === '/api/teacher/economy') return request.method === 'GET' ? teacherEconomyStateV3(request, env) : methodNotAllowed('GET');
    if (path === '/api/teacher/economy/enable') return request.method === 'POST' ? teacherEnable(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/settings') return request.method === 'PATCH' ? teacherSettings(request, env) : methodNotAllowed('PATCH');
    if (path === '/api/teacher/economy/certificate') return request.method === 'POST' ? teacherCertificate(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/certificate-grant') return request.method === 'POST' ? teacherCertificateGrant(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/job') return request.method === 'POST' ? teacherJob(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/job-assign') return request.method === 'POST' ? teacherJobAssign(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/payroll') return request.method === 'POST' ? teacherPayrollV3(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/manual') return request.method === 'POST' ? teacherManual(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/treasury') return request.method === 'POST' ? teacherTreasuryV3(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/item') return request.method === 'POST' ? teacherItemV3(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/work-decision') return request.method === 'POST' ? teacherWorkDecision(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/loan-decision') return request.method === 'POST' ? teacherLoanDecision(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/inventory-decision') return request.method === 'POST' ? teacherInventoryDecision(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/company-decision') return request.method === 'POST' ? teacherCompanyDecision(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/debt-repay') return request.method === 'POST' ? teacherDebtRepay(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/law') return request.method === 'POST' ? teacherLaw(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/case') return request.method === 'POST' ? teacherCaseV3(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/economy/case-decision') return request.method === 'POST' ? teacherCaseDecisionV3(request, env) : methodNotAllowed('POST');
  } catch (error) {
    const message = String(error?.message || '');
    if (/no such table|SQLITE_ERROR/i.test(message)) return json({ ok:false,error:'economy_schema_not_ready' },503);
    if (/UNIQUE constraint failed: economy_payroll_runs/i.test(message)) return json({ ok:false,error:'payroll_already_run' },409);
    console.error('[Kidscade economy API]', error);
    return json({ ok:false,error:'economy_server_error' },500);
  }
  return null;
}
