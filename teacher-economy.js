(() => {
  'use strict';

  const ADMIN_KEY_NAME = 'kc_teacher_admin_key';
  const params = new URLSearchParams(location.search);
  const classId = String(params.get('classId') || '').trim();
  const classNameHint = String(params.get('className') || '').trim();
  let adminKey = '';
  let data = null;

  const $ = id => document.getElementById(id);

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[ch]);
  }

  function loadKey() {
    try { return sessionStorage.getItem(ADMIN_KEY_NAME) || ''; } catch (_) { return ''; }
  }

  function money(value) {
    const currency = data?.settings?.currency || $('setupCurrency')?.value || '뚝';
    return Number(value || 0).toLocaleString('ko-KR') + ' ' + currency;
  }

  function setStatus(id, text, kind = '') {
    const el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = ('status ' + kind).trim();
  }

  function errorText(code) {
    const map = {
      unauthorized:'교사 관리 코드가 올바르지 않습니다.',
      class_id_required:'학급 정보가 없습니다.',
      class_not_found:'학급을 찾지 못했습니다.',
      economy_not_enabled:'먼저 이 학급의 경제를 시작해 주세요.',
      economy_schema_not_ready:'학급경제 DB 마이그레이션이 아직 적용되지 않았습니다.',
      certificate_required:'필요한 자격증이 없는 학생입니다.',
      job_full:'직업 정원이 찼습니다.',
      payroll_already_run:'이미 정산한 급여 회차입니다.',
      period_required:'급여 회차를 입력해 주세요.',
      insufficient_funds:'학생 잔액이 부족합니다.',
      insufficient_treasury:'정부계좌 잔액이 부족합니다.',
      law_not_in_effect:'사건 발생일에는 아직 시행 전인 법입니다.',
      invalid_case_transition:'현재 상태에서는 그 처리를 할 수 없습니다.',
      name_required:'이름을 입력해 주세요.',
      title_required:'법 이름을 입력해 주세요.'
    };
    return map[code] || '요청을 처리하지 못했습니다.';
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials:'same-origin',
      headers:{
        authorization:'Bearer ' + adminKey,
        ...(options.body ? {'content-type':'application/json'} : {}),
        ...(options.headers || {})
      }
    });
    let body = {};
    try { body = await response.json(); } catch (_) {}
    return { response, body };
  }

  function show(name) {
    ['authMissing','setupView','appView'].forEach(id => $(id)?.classList.toggle('hidden', id !== name));
  }

  async function load() {
    if (!adminKey || !classId) {
      $('titleClass').textContent = classNameHint || '학급경제';
      show('authMissing');
      return;
    }

    try {
      const result = await api('/api/teacher/economy?classId=' + encodeURIComponent(classId));
      if (result.response.status === 401) {
        show('authMissing');
        return;
      }
      if (!result.response.ok || !result.body.ok) {
        if (result.body?.error === 'economy_schema_not_ready') {
          $('titleClass').textContent = classNameHint || '학급경제';
          $('authMissing').innerHTML =
            '<h2 style="margin-top:0">학급경제 DB 준비 필요</h2>' +
            '<div class="notice">Cloudflare D1에 0011_classroom_economy.sql 마이그레이션을 먼저 적용해야 합니다.</div>';
          show('authMissing');
          return;
        }
        alert(errorText(result.body?.error));
        return;
      }

      if (!result.body.enabled) {
        data = null;
        $('titleClass').textContent = result.body.classroom?.name || classNameHint || '학급경제';
        $('subtitle').textContent = '학급 코드 ' + (result.body.classroom?.class_code || '');
        show('setupView');
        return;
      }

      data = result.body;
      $('titleClass').textContent = data.classroom?.name || classNameHint || '학급경제';
      $('subtitle').textContent = '학급 코드 ' + (data.classroom?.class_code || '') + ' · KIDScade 계정 연동';
      show('appView');
      render();
    } catch (_) {
      alert('네트워크 연결을 확인해 주세요.');
    }
  }

  async function enableEconomy() {
    const button = $('enableEconomy');
    button.disabled = true;
    setStatus('setupStatus','학급경제 계좌를 만들고 있습니다…');
    try {
      const result = await api('/api/teacher/economy/enable', {
        method:'POST',
        body:JSON.stringify({
          classId,
          currency:$('setupCurrency').value,
          openingBalance:Number($('setupOpening').value),
          incomeTaxRate:Number($('setupIncome').value),
          consumptionTaxRate:Number($('setupSales').value),
          savingsInterestRate:Number($('setupInterest').value),
          fineCapPercent:Number($('setupFineCap').value),
          paydayLabel:$('setupPayday').value
        })
      });
      if (!result.response.ok || !result.body.ok) {
        setStatus('setupStatus',errorText(result.body?.error),'error');
        return;
      }
      setStatus('setupStatus','학급경제를 시작했습니다.','success');
      await load();
    } catch (_) {
      setStatus('setupStatus','네트워크 연결을 확인해 주세요.','error');
    } finally {
      button.disabled = false;
    }
  }

  async function mutate(path, method, body, message) {
    try {
      const result = await api(path, { method, body:JSON.stringify({ classId, ...body }) });
      if (!result.response.ok || !result.body.ok) {
        alert(errorText(result.body?.error));
        return null;
      }
      if (message) setStatus('payStatus',message,'success');
      await load();
      return result.body;
    } catch (_) {
      alert('네트워크 연결을 확인해 주세요.');
      return null;
    }
  }

  function studentName(id) {
    const student = data?.students?.find(item => item.id === id);
    return student ? (student.nickname || student.loginId) : '학생';
  }

  function jobName(id) {
    const job = data?.jobs?.find(item => item.id === id);
    return job ? job.name : '미배정';
  }

  function optionsStudents() {
    return (data.students || []).map(student =>
      '<option value="' + escapeHtml(student.id) + '">' +
      escapeHtml(student.loginId + ' · ' + (student.nickname || '새싹 게이머')) +
      '</option>'
    ).join('');
  }

  function caseStatus(value) {
    const map = {
      pending:'처분 예정',
      confirmed:'확정',
      appealed:'이의 신청',
      upheld:'처분 유지',
      cancelled:'취소',
      reversed:'취소·환급'
    };
    return map[value] || value;
  }

  function renderMetrics() {
    let cash = 0;
    let savings = 0;
    let jobs = 0;
    (data.students || []).forEach(student => {
      cash += Number(student.balance || 0);
      savings += Number(student.savings || 0);
      if (student.jobId) jobs += 1;
    });
    $('mCash').textContent = money(cash);
    $('mSavings').textContent = money(savings);
    $('mTreasury').textContent = money(data.settings?.treasury);
    $('mJobs').textContent = jobs + '명';
  }

  function renderStudents() {
    $('studentRows').innerHTML = (data.students || []).map(student =>
      '<tr><td class="code">' + escapeHtml(student.loginId) +
      '</td><td>' + escapeHtml(student.nickname || '새싹 게이머') +
      '</td><td>' + escapeHtml(jobName(student.jobId)) +
      '</td><td>' + escapeHtml(money(student.balance)) +
      '</td><td>' + escapeHtml(money(student.savings)) +
      '</td><td>' + Number((student.certificateIds || []).length) + '개</td></tr>'
    ).join('');
  }

  function renderCertificatesAndJobs() {
    const certMap = new Map((data.certificates || []).map(cert => [cert.id,cert]));

    $('certRows').innerHTML = (data.certificates || []).length
      ? data.certificates.map(cert =>
          '<div class="row"><div><strong>' + escapeHtml(cert.name) +
          '</strong><small>' + escapeHtml(cert.description || '') +
          '</small></div><span class="pill">자격증</span></div>'
        ).join('')
      : '<div class="empty">아직 자격증이 없습니다.</div>';

    const certOptions = (data.certificates || []).map(cert =>
      '<option value="' + escapeHtml(cert.id) + '">' + escapeHtml(cert.name) + '</option>'
    ).join('');

    $('grantStudent').innerHTML = optionsStudents();
    $('manualStudent').innerHTML = optionsStudents();
    $('caseStudent').innerHTML = optionsStudents();
    $('grantCert').innerHTML = certOptions;
    $('jobCerts').innerHTML = certOptions;

    $('jobRows').innerHTML = (data.jobs || []).length
      ? data.jobs.map(job => {
          const applicants = (job.applicantIds || []).map(studentName).join(', ') || '없음';
          const assigned = (job.assignedStudentIds || []).map(studentName).join(', ') || '미채용';
          const required = (job.requiredCertificateIds || []).map(id => certMap.get(id)?.name).filter(Boolean).join(', ') || '없음';
          return '<div class="row"><div><strong>' + escapeHtml(job.name) + ' · ' + escapeHtml(money(job.salary)) +
            ' · 정원 ' + Number(job.capacity || 1) +
            '</strong><small>필요 자격증: ' + escapeHtml(required) +
            '<br>지원: ' + escapeHtml(applicants) +
            ' / 채용: ' + escapeHtml(assigned) +
            '</small></div><div style="display:flex;gap:6px;align-items:center">' +
            '<select data-job-select="' + escapeHtml(job.id) + '" style="min-width:150px">' +
            '<option value="">학생 선택</option>' + optionsStudents() +
            '</select><button class="btn" data-assign-job="' + escapeHtml(job.id) + '">채용</button></div></div>';
        }).join('')
      : '<div class="empty">아직 직업이 없습니다.</div>';

    document.querySelectorAll('[data-assign-job]').forEach(button => {
      button.onclick = async () => {
        const jobId = button.dataset.assignJob;
        const select = document.querySelector('[data-job-select="' + CSS.escape(jobId) + '"]');
        const studentId = select?.value || '';
        if (!studentId) return alert('채용할 학생을 선택해 주세요.');
        await mutate('/api/teacher/economy/job-assign','POST',{ jobId,studentId });
      };
    });
  }

  function renderPayroll() {
    const rate = Number(data.settings?.incomeTaxRate || 0);
    const interestRate = Number(data.settings?.savingsInterestRate || 0);
    $('payTax').value = rate + '%';

    $('payPreview').innerHTML = (data.students || []).map(student => {
      const job = data.jobs.find(item => item.id === student.jobId);
      const gross = job ? Number(job.salary || 0) : 0;
      const tax = Math.round(gross * rate / 100);
      const interest = Math.floor(Number(student.savings || 0) * interestRate / 100);
      return '<tr><td>' + escapeHtml(student.nickname || student.loginId) +
        '</td><td>' + escapeHtml(job?.name || '-') +
        '</td><td>' + escapeHtml(money(gross)) +
        '</td><td>' + escapeHtml(money(tax)) +
        '</td><td>' + escapeHtml(money(gross - tax)) +
        '</td><td>' + escapeHtml(money(interest)) + '</td></tr>';
    }).join('');
  }

  function renderStore() {
    $('itemRows').innerHTML = (data.items || []).length
      ? data.items.map(item =>
          '<div class="row"><div><strong>' + escapeHtml(item.name) + ' · ' + escapeHtml(money(item.price)) +
          '</strong><small>' + (item.stock == null ? '재고 무제한' : '재고 ' + Number(item.stock) + '개') +
          ' · 소비세 ' + Number(data.settings?.consumptionTaxRate || 0) + '%</small></div>' +
          '<span class="pill good">' + (item.active ? '판매중' : '중지') + '</span></div>'
        ).join('')
      : '<div class="empty">아직 상품이 없습니다.</div>';
  }

  function renderLaw() {
    $('lawRows').innerHTML = (data.laws || []).length
      ? data.laws.map(law =>
          '<div class="row"><div><strong>' + escapeHtml(law.title) +
          '</strong><small>' + escapeHtml(law.description || '') +
          ' · 기본 ' + escapeHtml(money(law.defaultFine)) +
          ' · ' + escapeHtml(law.effectiveFrom || '') + ' 시행</small></div>' +
          '<span class="pill">법</span></div>'
        ).join('')
      : '<div class="empty">아직 등록된 법이 없습니다.</div>';

    $('caseLaw').innerHTML = (data.laws || []).map(law =>
      '<option value="' + escapeHtml(law.id) + '">' + escapeHtml(law.title) + '</option>'
    ).join('');

    const lawMap = new Map((data.laws || []).map(law => [law.id,law]));
    $('caseRows').innerHTML = (data.cases || []).length
      ? data.cases.map(item => {
          const law = lawMap.get(item.law_id);
          let buttons = '';
          if (item.status === 'pending') {
            buttons =
              '<button class="btn green" data-case="' + escapeHtml(item.id) + '" data-decision="confirm">확정</button>' +
              '<button class="btn secondary" data-case="' + escapeHtml(item.id) + '" data-decision="cancel">취소</button>';
          } else if (item.status === 'appealed') {
            buttons =
              '<button class="btn" data-case="' + escapeHtml(item.id) + '" data-decision="uphold">유지</button>' +
              '<button class="btn secondary" data-case="' + escapeHtml(item.id) + '" data-decision="reverse">취소·환급</button>';
          }
          return '<div class="row"><div><strong>' + escapeHtml(studentName(item.student_id)) +
            ' · ' + escapeHtml(law?.title || '법') +
            ' · ' + escapeHtml(caseStatus(item.status)) +
            '</strong><small>' + escapeHtml(item.note || '') +
            ' · 예정 ' + escapeHtml(money(item.proposed_fine)) +
            (Number(item.applied_fine || 0) ? ' · 적용 ' + escapeHtml(money(item.applied_fine)) : '') +
            (item.appeal_text ? ' · 이의: ' + escapeHtml(item.appeal_text) : '') +
            '</small></div><div class="actions" style="margin:0">' + buttons + '</div></div>';
        }).join('')
      : '<div class="empty">처분 사건이 없습니다.</div>';

    document.querySelectorAll('[data-case][data-decision]').forEach(button => {
      button.onclick = async () => {
        if (!confirm('처분 상태를 변경할까요?')) return;
        await mutate(
          '/api/teacher/economy/case-decision',
          'POST',
          { caseId:button.dataset.case, decision:button.dataset.decision }
        );
      };
    });
  }

  function renderLedgerAndSettings() {
    $('txRows').innerHTML = (data.transactions || []).length
      ? data.transactions.map(tx => {
          const owner = tx.student_id ? studentName(tx.student_id) : '정부계좌';
          const amount = Number(tx.amount || 0);
          return '<div class="row"><div><strong>' + escapeHtml(owner + ' · ' + (tx.reason || tx.type)) +
            '</strong><small>' + escapeHtml(new Date(tx.created_at).toLocaleString('ko-KR')) +
            '</small></div><b>' + (amount > 0 ? '+' : '') + escapeHtml(money(amount)) + '</b></div>';
        }).join('')
      : '<div class="empty">아직 거래가 없습니다.</div>';

    $('setCurrency').value = data.settings?.currency || '뚝';
    $('setIncome').value = Number(data.settings?.incomeTaxRate || 0);
    $('setSales').value = Number(data.settings?.consumptionTaxRate || 0);
    $('setInterest').value = Number(data.settings?.savingsInterestRate || 0);
    $('setFineCap').value = Number(data.settings?.fineCapPercent || 0);
    $('setPayday').value = data.settings?.paydayLabel || '금요일';
  }

  function render() {
    renderMetrics();
    renderStudents();
    renderCertificatesAndJobs();
    renderPayroll();
    renderStore();
    renderLaw();
    renderLedgerAndSettings();
  }

  async function createCertificate() {
    await mutate('/api/teacher/economy/certificate','POST',{
      name:$('certName').value,
      description:$('certDesc').value
    });
  }

  async function grantCertificate(grant) {
    await mutate('/api/teacher/economy/certificate-grant','POST',{
      studentId:$('grantStudent').value,
      certificateId:$('grantCert').value,
      grant
    });
  }

  async function createJob() {
    const requiredCertificateIds = Array.from($('jobCerts').selectedOptions).map(option => option.value);
    await mutate('/api/teacher/economy/job','POST',{
      name:$('jobName').value,
      salary:Number($('jobSalary').value),
      capacity:Number($('jobCapacity').value),
      task:$('jobTask').value,
      requiredCertificateIds
    });
  }

  async function runPayroll() {
    const periodId = String($('periodId').value || '').trim();
    if (!periodId) return alert('급여 회차를 입력해 주세요.');
    if (!confirm(periodId + ' 월급을 전체 정산할까요?')) return;

    const result = await mutate('/api/teacher/economy/payroll','POST',{ periodId });
    if (result?.summary) {
      setStatus(
        'payStatus',
        '지급 ' + Number(result.summary.paidStudents || 0) + '명 · 세전 ' +
        money(result.summary.grossTotal) + ' · 소득세 ' + money(result.summary.taxTotal) +
        ' · 이자 ' + money(result.summary.interestTotal),
        'success'
      );
    }
  }

  async function spendTreasury() {
    await mutate('/api/teacher/economy/treasury','POST',{
      amount:Number($('treasuryAmount').value),
      reason:$('treasuryReason').value
    });
  }

  async function manualTransaction() {
    await mutate('/api/teacher/economy/manual','POST',{
      studentId:$('manualStudent').value,
      amount:Number($('manualAmount').value),
      reason:$('manualReason').value,
      toTreasury:$('manualTreasury').value === 'yes'
    });
  }

  async function createItem() {
    await mutate('/api/teacher/economy/item','POST',{
      name:$('itemName').value,
      price:Number($('itemPrice').value),
      stock:Number($('itemStock').value),
      unlimited:$('itemUnlimited').checked
    });
  }

  async function createLaw() {
    await mutate('/api/teacher/economy/law','POST',{
      title:$('lawTitle').value,
      description:$('lawDesc').value,
      defaultFine:Number($('lawFine').value),
      effectiveFrom:$('lawDate').value
    });
  }

  async function createCase() {
    await mutate('/api/teacher/economy/case','POST',{
      studentId:$('caseStudent').value,
      lawId:$('caseLaw').value,
      fine:Number($('caseFine').value),
      occurredAt:$('caseDate').value,
      note:$('caseNote').value
    });
  }

  async function saveSettings() {
    await mutate('/api/teacher/economy/settings','PATCH',{
      currency:$('setCurrency').value,
      incomeTaxRate:Number($('setIncome').value),
      consumptionTaxRate:Number($('setSales').value),
      savingsInterestRate:Number($('setInterest').value),
      fineCapPercent:Number($('setFineCap').value),
      paydayLabel:$('setPayday').value
    });
  }

  document.querySelectorAll('.tab').forEach(button => {
    button.onclick = () => {
      document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'panel-' + button.dataset.tab);
      });
    };
  });

  $('enableEconomy').onclick = enableEconomy;
  $('refresh').onclick = load;
  $('createCert').onclick = createCertificate;
  $('grantCertBtn').onclick = () => grantCertificate(true);
  $('revokeCertBtn').onclick = () => grantCertificate(false);
  $('createJob').onclick = createJob;
  $('runPayroll').onclick = runPayroll;
  $('spendTreasury').onclick = spendTreasury;
  $('manualTx').onclick = manualTransaction;
  $('createItem').onclick = createItem;
  $('createLaw').onclick = createLaw;
  $('createCase').onclick = createCase;
  $('saveSettings').onclick = saveSettings;

  const today = new Date();
  const dateText = today.toISOString().slice(0,10);
  $('lawDate').value = dateText;
  $('caseDate').value = dateText;
  $('periodId').value =
    today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2,'0') + '-' +
    Math.ceil(today.getDate() / 7) + '주';

  adminKey = loadKey();
  load();
})();