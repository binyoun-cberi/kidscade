(() => {
  'use strict';

  let data = null;
  const $ = id => document.getElementById(id);

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[ch]);
  }

  function money(value) {
    const currency = data?.settings?.currency || '뚝';
    return Number(value || 0).toLocaleString('ko-KR') + ' ' + currency;
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
      invalid_credentials:'ID 또는 PIN을 확인해 주세요.',
      temporarily_locked:'로그인 실패가 반복되어 잠시 잠겼어요.',
      not_authenticated:'로그인이 필요해요.',
      session_expired:'로그인이 만료됐어요.',
      economy_not_enabled:'선생님이 아직 학급경제를 시작하지 않았어요.',
      insufficient_funds:'지갑 잔액이 부족해요.',
      insufficient_savings:'저축 잔액이 부족해요.',
      certificate_required:'필요한 자격증이 없어요.',
      item_not_found:'상품을 찾을 수 없어요.',
      out_of_stock:'품절된 상품이에요.',
      job_not_found:'직업을 찾을 수 없어요.',
      case_not_appealable:'현재는 이의 신청을 할 수 없어요.',
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
    ['loginView','disabledView','walletView'].forEach(id => {
      $(id)?.classList.toggle('hidden', id !== view);
    });
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
        data = null;
        show('loginView');
        $('loginStatus').textContent = errorText(body?.error);
        $('loginStatus').classList.remove('hidden');
        return;
      }
      data = body;
      show('walletView');
      render();
    } catch (_) {
      show('loginView');
      $('loginStatus').textContent = '네트워크 연결을 확인해 주세요.';
      $('loginStatus').classList.remove('hidden');
    }
  }

  async function login() {
    const loginId = String($('loginId')?.value || '').trim().toUpperCase().replace(/\s+/g,'');
    const pin = String($('pin')?.value || '').replace(/\D/g,'').slice(0,6);
    if (!loginId || pin.length !== 6) {
      $('loginStatus').textContent = 'ID와 6자리 PIN을 모두 입력해 주세요.';
      $('loginStatus').classList.remove('hidden');
      return;
    }

    const button = $('loginBtn');
    button.disabled = true;
    button.textContent = '확인 중…';
    try {
      const { response, body } = await request('/api/account/login', {
        method:'POST',
        body:JSON.stringify({ loginId, pin })
      });
      if (!response.ok || !body.ok) {
        $('loginStatus').textContent = errorText(body?.error);
        $('loginStatus').classList.remove('hidden');
        return;
      }
      $('loginStatus').classList.add('hidden');
      await load();
    } catch (_) {
      $('loginStatus').textContent = '네트워크 연결을 확인해 주세요.';
      $('loginStatus').classList.remove('hidden');
    } finally {
      button.disabled = false;
      button.textContent = '로그인';
    }
  }

  async function mutate(path, body, successText) {
    try {
      const result = await request(path, { method:'POST', body:JSON.stringify(body) });
      if (!result.response.ok || !result.body.ok) {
        toast(errorText(result.body?.error));
        return false;
      }
      if (successText) toast(successText);
      await load();
      return true;
    } catch (_) {
      toast('네트워크 연결을 확인해 주세요.');
      return false;
    }
  }

  async function saveMoney(direction) {
    const amount = Math.floor(Number($('bankAmount')?.value || 0));
    if (!amount || amount < 1) return toast('금액을 입력해 주세요.');
    await mutate(
      '/api/economy/savings',
      { direction, amount },
      direction === 'deposit' ? '저축했어요.' : '지갑으로 꺼냈어요.'
    );
  }

  async function applyJob(jobId) {
    await mutate('/api/economy/job-apply', { jobId }, '지원서를 냈어요.');
  }

  async function buy(itemId, total) {
    if (!confirm('총 ' + money(total) + '에 구매할까요?')) return;
    await mutate('/api/economy/buy', { itemId }, '구매했어요.');
  }

  async function appeal(caseId) {
    const text = prompt('선생님께 전달할 이의 신청 내용을 적어 주세요.');
    if (text == null) return;
    await mutate('/api/economy/appeal', { caseId, text }, '이의 신청을 보냈어요.');
  }

  function caseStatus(value) {
    const map = {
      pending:'처분 예정',
      confirmed:'확정',
      appealed:'이의 신청 중',
      upheld:'처분 유지',
      cancelled:'취소',
      reversed:'취소·환급'
    };
    return map[value] || value;
  }

  function renderTransactions() {
    const list = Array.isArray(data.transactions) ? data.transactions : [];
    $('txRows').innerHTML = list.length ? list.map(item => {
      const sign = Number(item.amount || 0) > 0 ? '+' : '';
      return '<div class="row"><div><strong>' + escapeHtml(item.reason || item.type) +
        '</strong><small>' + escapeHtml(new Date(item.createdAt).toLocaleString('ko-KR')) +
        '</small></div><b>' + sign + escapeHtml(money(item.amount)) + '</b></div>';
    }).join('') : '<div class="empty">아직 거래가 없어요.</div>';
  }

  function renderJobs() {
    const certMap = new Map((data.certificates || []).map(item => [item.id,item]));
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
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

      return '<div class="row"><div><strong>' + escapeHtml(job.name) + ' · 월급 ' + escapeHtml(money(job.salary)) +
        '</strong><small>' + escapeHtml(job.task || '') + ' · 채용 ' + Number(job.assignedCount || 0) + '/' + Number(job.capacity || 1) +
        '</small><div>' + certHtml + '</div></div><div>' + action + '</div></div>';
    }).join('') : '<div class="empty">아직 등록된 직업이 없어요.</div>';

    document.querySelectorAll('[data-apply]').forEach(button => {
      button.onclick = () => applyJob(button.dataset.apply);
    });
  }

  function renderStore() {
    const items = Array.isArray(data.items) ? data.items : [];
    const rate = Number(data.settings?.consumptionTaxRate || 0);

    $('storeRows').innerHTML = items.length ? items.map(item => {
      const tax = Math.round(Number(item.price || 0) * rate / 100);
      const total = Number(item.price || 0) + tax;
      const soldOut = item.stock != null && Number(item.stock) <= 0;
      return '<div class="row"><div><strong>' + escapeHtml(item.name) + ' · ' + escapeHtml(money(total)) +
        '</strong><small>가격 ' + escapeHtml(money(item.price)) + ' + 소비세 ' + escapeHtml(money(tax)) +
        ' · ' + (item.stock == null ? '재고 무제한' : '재고 ' + Number(item.stock) + '개') +
        '</small></div><button class="btn ' + (soldOut ? 'soft' : 'green') + '" ' +
        (soldOut ? 'disabled' : 'data-buy="' + escapeHtml(item.id) + '" data-total="' + total + '"') +
        '>' + (soldOut ? '품절' : '구매') + '</button></div>';
    }).join('') : '<div class="empty">아직 상품이 없어요.</div>';

    document.querySelectorAll('[data-buy]').forEach(button => {
      button.onclick = () => buy(button.dataset.buy, Number(button.dataset.total || 0));
    });
  }

  function renderLaws() {
    const laws = Array.isArray(data.laws) ? data.laws : [];
    $('lawRows').innerHTML = laws.length ? laws.map(law => {
      return '<div class="row"><div><strong>' + escapeHtml(law.title) +
        '</strong><small>' + escapeHtml(law.description || '') +
        ' · 기본 과태료 ' + escapeHtml(money(law.defaultFine)) +
        ' · ' + escapeHtml(law.effectiveFrom || '') + ' 시행</small></div></div>';
    }).join('') : '<div class="empty">아직 등록된 법이 없어요.</div>';

    const lawMap = new Map(laws.map(law => [law.id,law]));
    const cases = Array.isArray(data.cases) ? data.cases : [];
    $('caseRows').innerHTML = cases.length ? cases.map(item => {
      const law = lawMap.get(item.law_id);
      const fine = Number(item.applied_fine || item.proposed_fine || 0);
      const canAppeal = ['confirmed','upheld'].includes(item.status);
      const appeal = item.appeal_text ? ' · 이의: ' + escapeHtml(item.appeal_text) : '';
      return '<div class="row"><div><strong>' + escapeHtml(law?.title || '처분') + ' · ' + escapeHtml(caseStatus(item.status)) +
        '</strong><small>' + escapeHtml(item.note || '') + ' · 과태료 ' + escapeHtml(money(fine)) + appeal +
        '</small></div>' + (canAppeal ? '<button class="btn soft" data-appeal="' + escapeHtml(item.id) + '">이의 신청</button>' : '') + '</div>';
    }).join('') : '<div class="empty">내 처분 기록이 없어요.</div>';

    document.querySelectorAll('[data-appeal]').forEach(button => {
      button.onclick = () => appeal(button.dataset.appeal);
    });
  }

  function render() {
    $('className').textContent = (data.classroom?.name || '우리 반') + ' · ' + (data.student?.loginId || '');
    $('studentName').textContent = data.student?.nickname || '새싹 게이머';
    $('cash').textContent = money(data.student?.balance);
    $('savings').textContent = money(data.student?.savings);

    const currentJob = (data.jobs || []).find(job => job.assigned);
    $('jobLine').textContent = currentJob
      ? currentJob.name + ' · 월급 ' + money(currentJob.salary)
      : '직업 미배정';

    $('interestInfo').textContent =
      '현재 저축 이율은 월급 회차당 ' + Number(data.settings?.savingsInterestRate || 0) + '%예요.';

    renderTransactions();
    renderJobs();
    renderStore();
    renderLaws();
  }

  document.querySelectorAll('.tab').forEach(button => {
    button.onclick = () => {
      document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'panel-' + button.dataset.tab);
      });
    };
  });

  $('loginBtn').onclick = login;
  $('depositBtn').onclick = () => saveMoney('deposit');
  $('withdrawBtn').onclick = () => saveMoney('withdraw');
  load();
})();