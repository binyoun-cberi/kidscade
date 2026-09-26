(() => {
  'use strict';

  let data = null;
  const $ = id => document.getElementById(id);
  const busy = new Set();

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[ch]);
  }

  function money(value) {
    const currency = data?.settings?.currency || '뚝';
    return Number(value || 0).toLocaleString('ko-KR') + ' ' + currency;
  }

  function todayText() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + day;
  }

  function defaultPeriod() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + Math.ceil(d.getDate()/7) + '주';
  }

  function requestKey() {
    return crypto?.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function toast(text) {
    const el = $('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  function errorText(code) {
    const map = {
      not_authenticated:'로그인이 필요해요.',
      session_expired:'로그인이 만료됐어요.',
      economy_not_enabled:'선생님이 아직 학급경제를 시작하지 않았어요.',
      insufficient_funds:'지갑 잔액이 부족해요.',
      insufficient_savings:'저축 잔액이 부족해요.',
      certificate_required:'필요한 자격증이 없어요.',
      item_not_found:'상품을 찾을 수 없어요.',
      out_of_stock:'품절된 상품이에요.',
      job_not_found:'직업을 찾을 수 없어요.',
      job_not_assigned:'먼저 직업이 배정되어야 해요.',
      work_log_required:'급여 회차와 한 일을 적어 주세요.',
      work_log_locked:'이미 확인이 끝난 근무일지예요.',
      case_not_appealable:'이 처분은 더 이상 이의 신청할 수 없어요.',
      loan_already_open:'이미 진행 중인 대출이 있어요.',
      loan_limit_exceeded:'신용등급에 따른 대출 한도를 넘었어요.',
      loan_not_found:'상환할 대출을 찾지 못했어요.',
      inventory_not_usable:'현재 사용할 수 없는 보관함 상품이에요.',
      company_already_open:'이미 운영 중이거나 심사 중인 회사가 있어요.',
      company_not_active:'승인된 회사만 상품을 등록할 수 있어요.',
      company_funds_insufficient:'회사 잔액이 부족해요.',
      request_in_progress:'같은 요청을 처리 중이에요. 잠시만 기다려 주세요.',
      economy_schema_not_ready:'학급경제 서버를 준비 중이에요.'
    };
    return map[code] || '요청을 처리하지 못했어요.';
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials:'same-origin',
      headers:{
        ...(options.body ? {'content-type':'application/json'} : {}),
        ...(options.headers || {})
      }
    });
    let body = {};
    try { body = await response.json(); } catch (_) {}
    return { response, body };
  }

  function show(view) {
    ['loginView','disabledView','errorView','walletView'].forEach(id => {
      $(id)?.classList.toggle('hidden', id !== view);
    });
  }

  function showServerError(body = {}) {
    data = null;
    show('errorView');
    const code = body?.error || '';
    if ($('errorText')) $('errorText').textContent = errorText(code);
    if ($('errorNotice')) {
      $('errorNotice').textContent = code === 'economy_schema_not_ready'
        ? '선생님 쪽에서 학급경제 DB 준비가 끝나면 같은 계정으로 바로 열립니다.'
        : '로그인 정보는 그대로 유지됩니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  async function load() {
    try {
      const { response, body } = await request('/api/economy');
      if (response.status === 401) {
        data = null;
        show('loginView');
        return;
      }
      if (response.status === 404 && body?.error === 'economy_not_enabled') {
        data = null;
        show('disabledView');
        return;
      }
      if (!response.ok || !body.ok) {
        showServerError(body);
        return;
      }
      data = body;
      show('walletView');
      render();
    } catch (_) {
      showServerError({ error:'network_error' });
      if ($('errorText')) $('errorText').textContent = '네트워크 연결을 확인해 주세요.';
    }
  }

  async function mutate(path, payload, successText, key = path) {
    if (busy.has(key)) return false;
    busy.add(key);
    try {
      const body = { ...payload };
      if (!body.requestKey && /savings|buy|repay|withdraw/.test(path)) body.requestKey = requestKey();
      const result = await request(path, { method:'POST', body:JSON.stringify(body) });
      if (!result.response.ok || !result.body.ok) {
        toast(errorText(result.body?.error));
        return false;
      }
      if (successText) toast(successText);
      await load();
      return result.body;
    } catch (_) {
      toast('네트워크 연결을 확인해 주세요.');
      return false;
    } finally {
      busy.delete(key);
    }
  }

  async function saveMoney(direction) {
    const amount = Math.floor(Number($('bankAmount')?.value || 0));
    if (!amount || amount < 1) return toast('금액을 입력해 주세요.');
    await mutate('/api/economy/savings',{direction,amount},
      direction === 'deposit' ? '저축했어요.' : '지갑으로 꺼냈어요.','bank');
  }

  async function applyJob(jobId) {
    await mutate('/api/economy/job-apply',{jobId},'지원서를 냈어요.','job-'+jobId);
  }

  async function buy(itemId,total) {
    if (!confirm('총 ' + money(total) + '에 구매할까요?')) return;
    await mutate('/api/economy/buy',{itemId},'구매했어요.','buy-'+itemId);
  }

  async function companyBuy(productId,total) {
    if (!confirm('총 ' + money(total) + '에 학생 회사 상품을 구매할까요?')) return;
    await mutate('/api/economy/company-buy',{productId},'구매했어요.','cbuy-'+productId);
  }

  async function appeal(caseId) {
    const text = prompt('선생님께 전달할 이의 신청 내용을 적어 주세요.');
    if (text == null) return;
    await mutate('/api/economy/appeal',{caseId,text},'이의 신청을 보냈어요.','appeal-'+caseId);
  }

  async function submitWork() {
    const periodId = String($('workPeriod')?.value || '').trim();
    const workDate = $('workDate')?.value || todayText();
    const note = String($('workNote')?.value || '').trim();
    if (!periodId || !note) return toast('급여 회차와 한 일을 적어 주세요.');
    const ok = await mutate('/api/economy/work-log',{periodId,workDate,note},'근무일지를 제출했어요.','work');
    if (ok && $('workNote')) $('workNote').value = '';
  }

  async function requestLoan() {
    const amount = Math.floor(Number($('loanAmount')?.value || 0));
    if (!amount) return toast('대출 금액을 입력해 주세요.');
    if (!confirm(money(amount) + ' 대출을 신청할까요?')) return;
    await mutate('/api/economy/loan-request',{amount},'대출 심사를 요청했어요.','loan-request');
  }

  async function repayLoan(loanId) {
    const text = prompt('상환할 금액을 입력하세요.');
    if (text == null) return;
    const amount = Math.floor(Number(text));
    if (!amount) return toast('금액을 확인해 주세요.');
    await mutate('/api/economy/loan-repay',{loanId,amount},'대출을 상환했어요.','loan-'+loanId);
  }

  async function requestUse(inventoryId) {
    await mutate('/api/economy/inventory-use',{inventoryId},'사용 요청을 보냈어요.','use-'+inventoryId);
  }

  async function createCompany() {
    const name = String($('companyName')?.value || '').trim();
    const description = String($('companyDesc')?.value || '').trim();
    if (!name) return toast('회사 이름을 입력해 주세요.');
    await mutate('/api/economy/company-create',{name,description},'회사 설립 심사를 요청했어요.','company-create');
  }

  async function createCompanyProduct() {
    const mine = (data.companies || []).find(c => c.mine && c.status === 'active');
    if (!mine) return toast('승인된 회사가 필요해요.');
    const name = String($('companyProductName')?.value || '').trim();
    const price = Math.floor(Number($('companyProductPrice')?.value || 0));
    const stock = Math.floor(Number($('companyProductStock')?.value || 0));
    const fulfillmentType = $('companyProductType')?.value || 'inventory';
    if (!name || !price) return toast('상품 이름과 가격을 확인해 주세요.');
    await mutate('/api/economy/company-product',{
      companyId:mine.id,name,price,stock,fulfillmentType
    },'회사 상품을 등록했어요.','company-product');
  }

  async function withdrawCompany() {
    const mine = (data.companies || []).find(c => c.mine && c.status === 'active');
    if (!mine) return toast('승인된 회사가 필요해요.');
    const amount = Math.floor(Number($('companyWithdrawAmount')?.value || 0));
    if (!amount) return toast('인출 금액을 확인해 주세요.');
    await mutate('/api/economy/company-withdraw',{companyId:mine.id,amount},'회사 수익을 지갑으로 옮겼어요.','company-withdraw');
  }

  function caseStatus(value) {
    return ({
      pending:'처분 예정',confirmed:'확정',appealed:'이의 신청 중',
      upheld:'최종 유지',cancelled:'취소',reversed:'취소·환급'
    })[value] || value;
  }

  function workStatus(value) {
    return ({submitted:'확인 대기',approved:'승인',rejected:'반려'})[value] || value;
  }

  function loanStatus(value) {
    return ({pending:'심사 중',active:'상환 중',rejected:'거절',closed:'상환 완료'})[value] || value;
  }

  function renderPayslips() {
    const list = data.payslips || [];
    $('payslipRows').innerHTML = list.length ? list.map(p =>
      '<div class="row"><div><strong>' + escapeHtml(p.period_id) + ' · ' + escapeHtml(p.job_name || '직업 없음') +
      '</strong><small>기본 ' + escapeHtml(money(p.base_salary)) +
      ' × 근무 ' + Number(p.work_percent || 0) + '% = 세전 ' + escapeHtml(money(p.gross_pay)) +
      '<br>소득세 ' + escapeHtml(money(p.income_tax)) + ' · 실수령 ' + escapeHtml(money(p.net_pay)) +
      ' · 저축이자 +' + escapeHtml(money(p.savings_interest)) +
      ' · 대출이자 +' + escapeHtml(money(p.loan_interest)) +
      '</small></div><span class="pill good">' + escapeHtml(p.credit_grade || '-') + ' 등급</span></div>'
    ).join('') : '<div class="empty">아직 급여명세서가 없어요.</div>';
  }

  function renderTransactions() {
    const list = data.transactions || [];
    $('txRows').innerHTML = list.length ? list.map(item => {
      const sign = Number(item.amount || 0) > 0 ? '+' : '';
      return '<div class="row"><div><strong>' + escapeHtml(item.reason || item.type) +
        '</strong><small>' + escapeHtml(new Date(item.createdAt).toLocaleString('ko-KR')) +
        '</small></div><b>' + sign + escapeHtml(money(item.amount)) + '</b></div>';
    }).join('') : '<div class="empty">아직 거래가 없어요.</div>';
  }

  function renderWork() {
    const list = data.workLogs || [];
    $('workRows').innerHTML = list.length ? list.map(item =>
      '<div class="row"><div><strong>' + escapeHtml(item.period_id) + ' · ' + escapeHtml(workStatus(item.status)) +
      '</strong><small>' + escapeHtml(item.work_date) + ' · ' + escapeHtml(item.note || '') +
      (item.status === 'approved' ? ' · 급여 반영 ' + Number(item.pay_percent || 0) + '%' : '') +
      (item.teacher_note ? '<br>선생님: ' + escapeHtml(item.teacher_note) : '') +
      '</small></div></div>'
    ).join('') : '<div class="empty">아직 제출한 근무일지가 없어요.</div>';
  }

  function renderLoans() {
    const list = data.loans || [];
    $('loanRows').innerHTML = list.length ? list.map(loan =>
      '<div class="row"><div><strong>' + escapeHtml(loanStatus(loan.status)) + ' · 잔액 ' + escapeHtml(money(loan.outstanding)) +
      '</strong><small>원금 ' + escapeHtml(money(loan.principal)) + ' · 이율 ' + Number(loan.rate_percent || 0) + '%' +
      (loan.teacher_note ? ' · ' + escapeHtml(loan.teacher_note) : '') +
      '</small></div>' +
      (loan.status === 'active' ? '<button class="btn soft" data-repay="' + escapeHtml(loan.id) + '">상환</button>' : '') +
      '</div>'
    ).join('') : '<div class="empty">대출 기록이 없어요.</div>';

    document.querySelectorAll('[data-repay]').forEach(button => {
      button.onclick = () => repayLoan(button.dataset.repay);
    });

    $('creditRows').innerHTML = (data.creditEvents || []).length ? data.creditEvents.map(e =>
      '<div class="row"><div><strong>' + (Number(e.delta) >= 0 ? '+' : '') + Number(e.delta) + '점 · ' + escapeHtml(e.reason) +
      '</strong><small>' + escapeHtml(new Date(e.created_at).toLocaleString('ko-KR')) + '</small></div><b>' +
      Number(e.score_after || 0) + '</b></div>'
    ).join('') : '<div class="empty">아직 신용 변동 기록이 없어요.</div>';
  }

  function renderJobs() {
    const certMap = new Map((data.certificates || []).map(item => [item.id,item]));
    const jobs = data.jobs || [];
    $('jobRows').innerHTML = jobs.length ? jobs.map(job => {
      const certs = (job.requiredCertificateIds || []).map(id => certMap.get(id)).filter(Boolean);
      let action = '';
      if (job.assigned) action = '<span class="pill good">현재 직업</span>';
      else if (job.applied) action = '<span class="pill warn">지원 완료</span>';
      else if (!job.qualified) action = '<span class="pill bad">자격 필요</span>';
      else action = '<button class="btn primary" data-apply="' + escapeHtml(job.id) + '">지원</button>';
      const certHtml = certs.length
        ? certs.map(cert => '<span class="pill ' + (cert.owned ? 'good' : 'bad') + '">' + escapeHtml(cert.name) + '</span>').join('')
        : '<span class="pill good">자격 제한 없음</span>';
      return '<div class="row"><div><strong>' + escapeHtml(job.name) + ' · 기본 월급 ' + escapeHtml(money(job.salary)) +
        '</strong><small>' + escapeHtml(job.task || '') + ' · 채용 ' + Number(job.assignedCount || 0) + '/' + Number(job.capacity || 1) +
        '</small><div>' + certHtml + '</div></div><div>' + action + '</div></div>';
    }).join('') : '<div class="empty">아직 등록된 직업이 없어요.</div>';
    document.querySelectorAll('[data-apply]').forEach(button => button.onclick = () => applyJob(button.dataset.apply));
  }

  function renderStore() {
    const rate = Number(data.settings?.consumptionTaxRate || 0);
    const items = data.items || [];
    $('storeRows').innerHTML = items.length ? items.map(item => {
      const tax = Math.round(Number(item.price || 0) * rate / 100);
      const total = Number(item.price || 0) + tax;
      const soldOut = item.stock != null && Number(item.stock) <= 0;
      return '<div class="row"><div><strong>' + escapeHtml(item.name) + ' · 결제 ' + escapeHtml(money(total)) +
        '</strong><small>가격 ' + escapeHtml(money(item.price)) + ' + 소비세 ' + escapeHtml(money(tax)) +
        ' · ' + (item.stock == null ? '재고 무제한' : '재고 ' + Number(item.stock) + '개') +
        '</small></div><button class="btn ' + (soldOut ? 'soft' : 'green') + '" ' +
        (soldOut ? 'disabled' : 'data-buy="' + escapeHtml(item.id) + '" data-total="' + total + '"') +
        '>' + (soldOut ? '품절' : '구매') + '</button></div>';
    }).join('') : '<div class="empty">아직 학급상점 상품이 없어요.</div>';

    $('companyStoreRows').innerHTML = (data.companyProducts || []).length ? data.companyProducts.map(item => {
      const tax = Math.round(Number(item.price || 0) * rate / 100);
      const total = Number(item.price || 0) + tax;
      const soldOut = item.stock != null && Number(item.stock) <= 0;
      return '<div class="row"><div><strong>' + escapeHtml(item.company_name) + ' · ' + escapeHtml(item.name) +
        ' · ' + escapeHtml(money(total)) + '</strong><small>상품 ' + escapeHtml(money(item.price)) +
        ' + 소비세 ' + escapeHtml(money(tax)) + ' · ' + (item.stock == null ? '재고 무제한' : '재고 ' + Number(item.stock) + '개') +
        '</small></div><button class="btn ' + (soldOut ? 'soft' : 'primary') + '" ' +
        (soldOut ? 'disabled' : 'data-company-buy="' + escapeHtml(item.id) + '" data-total="' + total + '"') +
        '>' + (soldOut ? '품절' : '구매') + '</button></div>';
    }).join('') : '<div class="empty">학생 회사 상품이 아직 없어요.</div>';

    document.querySelectorAll('[data-buy]').forEach(button => button.onclick = () => buy(button.dataset.buy,Number(button.dataset.total||0)));
    document.querySelectorAll('[data-company-buy]').forEach(button => button.onclick = () => companyBuy(button.dataset.companyBuy,Number(button.dataset.total||0)));
  }

  function renderInventory() {
    const list = data.inventory || [];
    $('inventoryRows').innerHTML = list.length ? list.map(item => {
      const status = item.status === 'unused' ? '사용 가능' : item.status === 'use_requested' ? '사용 확인 중' : item.status === 'used' ? '사용 완료' : item.status;
      return '<div class="row"><div><strong>' + escapeHtml(item.item_name) + '</strong><small>' +
        escapeHtml(status) + ' · ' + escapeHtml(new Date(item.purchased_at).toLocaleString('ko-KR')) +
        (item.teacher_note ? ' · ' + escapeHtml(item.teacher_note) : '') +
        '</small></div>' +
        (item.status === 'unused' ? '<button class="btn green" data-use="' + escapeHtml(item.id) + '">사용 요청</button>' : '') +
        '</div>';
    }).join('') : '<div class="empty">보관 중인 상품이 없어요.</div>';
    document.querySelectorAll('[data-use]').forEach(button => button.onclick = () => requestUse(button.dataset.use));
  }

  function renderCompany() {
    const mine = (data.companies || []).find(c => c.mine && ['pending','active'].includes(c.status));
    $('myCompanyRows').innerHTML = mine
      ? '<div class="row"><div><strong>' + escapeHtml(mine.name) + ' · ' + (mine.status === 'active' ? '운영 중' : '설립 심사 중') +
        '</strong><small>' + escapeHtml(mine.description || '') +
        (mine.status === 'active' ? ' · 회사 잔액 ' + escapeHtml(money(mine.cash_balance)) : '') +
        (mine.teacher_note ? ' · ' + escapeHtml(mine.teacher_note) : '') +
        '</small></div></div>'
      : '<div class="empty">아직 내 회사가 없어요.</div>';
    $('companyProductForm')?.classList.toggle('hidden', !mine || mine.status !== 'active');
  }

  function renderGovernment() {
    $('governmentStatus').textContent =
      '정부계좌 ' + money(data.settings?.treasury || 0) +
      ' · 정부 채무 ' + money(data.settings?.governmentDebt || 0) +
      ' · 소비세 ' + Number(data.settings?.consumptionTaxRate || 0) + '% · 소득세 ' + Number(data.settings?.incomeTaxRate || 0) + '%';
    const list = data.publicSpending || [];
    $('spendingRows').innerHTML = list.length ? list.map(item =>
      '<div class="row"><div><strong>' + escapeHtml(item.reason) + ' · ' + escapeHtml(money(item.amount)) +
      '</strong><small>세금/정부계좌에서 ' + escapeHtml(money(item.treasury_used)) +
      (Number(item.debt_increase || 0) > 0 ? ' · 부족분 채무 ' + escapeHtml(money(item.debt_increase)) : '') +
      ' · ' + escapeHtml(new Date(item.created_at).toLocaleString('ko-KR')) +
      '</small></div></div>'
    ).join('') : '<div class="empty">아직 공개된 공공지출이 없어요.</div>';
  }

  function renderLaws() {
    const laws = data.laws || [];
    $('lawRows').innerHTML = laws.length ? laws.map(law =>
      '<div class="row"><div><strong>' + escapeHtml(law.title) +
      '</strong><small>' + escapeHtml(law.description || '') +
      ' · 기본 과태료 ' + escapeHtml(money(law.defaultFine)) +
      ' · ' + escapeHtml(law.effectiveFrom || '') + ' 시행</small></div></div>'
    ).join('') : '<div class="empty">아직 등록된 법이 없어요.</div>';

    const lawMap = new Map(laws.map(law => [law.id,law]));
    const cases = data.cases || [];
    $('caseRows').innerHTML = cases.length ? cases.map(item => {
      const law = lawMap.get(item.law_id);
      const fine = Number(item.applied_fine || item.proposed_fine || 0);
      const canAppeal = item.status === 'confirmed' && Number(item.appeal_count || 0) < 1;
      return '<div class="row"><div><strong>' + escapeHtml(law?.title || '처분') + ' · ' + escapeHtml(caseStatus(item.status)) +
        '</strong><small>' + escapeHtml(item.note || '') + ' · 과태료 ' + escapeHtml(money(fine)) +
        ' · 사건 당시 상한 ' + escapeHtml(money(item.fine_cap_snapshot || 0)) +
        (item.appeal_text ? '<br>이의: ' + escapeHtml(item.appeal_text) : '') +
        (item.final_note ? '<br>최종 의견: ' + escapeHtml(item.final_note) : '') +
        '</small></div>' + (canAppeal ? '<button class="btn soft" data-appeal="' + escapeHtml(item.id) + '">1회 이의신청</button>' : '') + '</div>';
    }).join('') : '<div class="empty">내 처분 기록이 없어요.</div>';
    document.querySelectorAll('[data-appeal]').forEach(button => button.onclick = () => appeal(button.dataset.appeal));
  }

  function render() {
    $('className').textContent = (data.classroom?.name || '우리 반') + ' · ' + (data.student?.loginId || '');
    $('studentName').textContent = data.student?.nickname || '새싹 게이머';
    $('cash').textContent = money(data.student?.balance);
    $('savings').textContent = money(data.student?.savings);
    $('creditGrade').textContent = data.credit?.grade || 'B';
    $('creditScore').textContent = Number(data.credit?.score || 700) + '점';

    const currentJob = (data.jobs || []).find(job => job.assigned);
    $('jobLine').textContent = currentJob ? currentJob.name + ' · 기본 월급 ' + money(currentJob.salary) : '직업 미배정';

    $('interestInfo').textContent =
      '내 신용등급 ' + (data.credit?.grade || 'B') +
      ' · 저축이율 ' + Number(data.credit?.savingsRate || 0) + '% / 급여회차' +
      ' · 대출이율 ' + Number(data.credit?.loanRate || 0) + '% / 급여회차';
    $('creditInfo').textContent =
      '신용점수 ' + Number(data.credit?.score || 700) + '점 · 대출한도 ' + money(data.credit?.loanLimit || 0) +
      ' · 현재 대출 ' + money(data.credit?.activeOutstanding || 0) +
      ' · 추가 가능 ' + money(data.credit?.availableLoan || 0);

    renderPayslips();
    renderTransactions();
    renderWork();
    renderLoans();
    renderJobs();
    renderStore();
    renderInventory();
    renderCompany();
    renderGovernment();
    renderLaws();
  }

  document.querySelectorAll('.tab').forEach(button => {
    button.onclick = () => {
      document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === 'panel-' + button.dataset.tab));
    };
  });

  $('retryBtn')?.addEventListener('click',load);
  $('depositBtn').onclick = () => saveMoney('deposit');
  $('withdrawBtn').onclick = () => saveMoney('withdraw');
  $('submitWork').onclick = submitWork;
  $('requestLoan').onclick = requestLoan;
  $('createCompany').onclick = createCompany;
  $('createCompanyProduct').onclick = createCompanyProduct;
  $('withdrawCompany').onclick = withdrawCompany;

  $('workDate').value = todayText();
  $('workPeriod').value = defaultPeriod();

  load();
})();