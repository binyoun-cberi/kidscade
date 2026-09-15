(() => {
  'use strict';

  const KEY_NAME = 'kc_teacher_admin_key';
  let adminKey = '';
  let lastCredentials = [];

  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function setStatus(id, text, kind = '') {
    const el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = `status ${kind}`.trim();
  }

  function loadSavedKey() {
    try { return sessionStorage.getItem(KEY_NAME) || ''; } catch (_) { return ''; }
  }

  function saveKey(value) {
    try { sessionStorage.setItem(KEY_NAME, value); } catch (_) {}
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        authorization: `Bearer ${adminKey}`,
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    let body = {};
    try { body = await response.json(); } catch (_) {}
    return { response, body };
  }

  function errorText(body) {
    if (body?.error === 'unauthorized') return '관리 코드가 올바르지 않습니다.';
    if (body?.error === 'teacher_admin_not_configured') return 'Cloudflare Worker Secret에 KIDSCADE_ADMIN_KEY를 먼저 등록해야 합니다.';
    if (body?.error === 'account_secret_not_configured') return 'Cloudflare Worker Secret에 KIDSCADE_ACCOUNT_PEPPER를 먼저 등록해야 합니다.';
    if (body?.error === 'account_schema_not_ready') return 'D1 계정 테이블이 아직 없습니다. 0002_student_accounts.sql을 적용해 주세요.';
    if (body?.error === 'class_name_required') return '학급 이름을 입력해 주세요.';
    return '요청을 처리하지 못했습니다.';
  }

  async function authenticate() {
    const key = String($('admin-key')?.value || '').trim();
    if (!key) {
      setStatus('auth-status', '관리 코드를 입력해 주세요.', 'error');
      return;
    }
    adminKey = key;
    setStatus('auth-status', '확인 중...');
    try {
      const { response, body } = await api('/api/teacher/classes');
      if (!response.ok || !body.ok) {
        setStatus('auth-status', errorText(body), 'error');
        return;
      }
      saveKey(adminKey);
      $('class-create')?.classList.remove('hidden');
      $('class-list')?.classList.remove('hidden');
      setStatus('auth-status', '교사 관리가 열렸습니다.', 'success');
      renderClasses(body);
    } catch (_) {
      setStatus('auth-status', '네트워크 연결을 확인해 주세요.', 'error');
    }
  }

  async function createClass() {
    const name = String($('class-name')?.value || '').trim();
    const count = Math.max(1, Math.min(40, Number($('student-count')?.value || 1)));
    if (!name) {
      setStatus('create-status', '학급 이름을 입력해 주세요.', 'error');
      return;
    }
    setStatus('create-status', '학생 계정을 만들고 있어요...');
    const button = $('create-class');
    if (button) button.disabled = true;
    try {
      const { response, body } = await api('/api/teacher/classes', {
        method: 'POST',
        body: JSON.stringify({ name, count })
      });
      if (!response.ok || !body.ok) {
        setStatus('create-status', errorText(body), 'error');
        return;
      }
      lastCredentials = Array.isArray(body.credentials) ? body.credentials : [];
      renderCredentials(body.classroom, lastCredentials);
      setStatus('create-status', `${name} 학생 계정 ${lastCredentials.length}개를 만들었습니다.`, 'success');
      await refreshClasses();
    } catch (_) {
      setStatus('create-status', '네트워크 연결을 확인해 주세요.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function renderCredentials(classroom, credentials) {
    const card = $('credential-card');
    const host = $('credentials');
    if (!card || !host) return;
    host.innerHTML = credentials.map((item, index) => `
      <article class="credential">
        <b>🎮 ${escapeHtml(classroom?.name || 'Kidscade')}</b>
        <span>ID: ${escapeHtml(item.loginId)}</span>
        <span>PIN: ${escapeHtml(item.pin)}</span>
        <small style="display:block;margin-top:7px;color:#64748b">${index + 1}번 로그인 카드</small>
      </article>
    `).join('');
    card.classList.remove('hidden');
  }

  function formatDate(value) {
    if (!value) return '아직 없음';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function renderClasses(data) {
    const host = $('classes');
    if (!host) return;
    const classes = Array.isArray(data?.classes) ? data.classes : [];
    const students = Array.isArray(data?.students) ? data.students : [];
    if (!classes.length) {
      host.innerHTML = '<div class="muted" style="margin-top:14px">아직 만든 학급이 없습니다.</div>';
      return;
    }
    host.innerHTML = classes.map(classroom => {
      const members = students.filter(student => student.class_id === classroom.id);
      const rows = members.map(student => `
        <tr>
          <td><b>${escapeHtml(student.login_id)}</b></td>
          <td>${escapeHtml(student.nickname || '새싹 게이머')}</td>
          <td>${student.state_revision > 0 ? `저장 ${student.state_revision}회` : '첫 저장 전'}</td>
          <td>${escapeHtml(formatDate(student.last_login_at))}</td>
          <td><button type="button" data-reset-pin="${escapeHtml(student.login_id)}">PIN 초기화</button></td>
        </tr>
      `).join('');
      return `
        <section class="class-block">
          <div class="class-head"><div><h3>${escapeHtml(classroom.name)}</h3><div class="muted">학급 코드 ${escapeHtml(classroom.class_code)} · ${members.length}명</div></div></div>
          <table class="student-table"><thead><tr><th>ID</th><th>닉네임</th><th>클라우드</th><th>마지막 로그인</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        </section>
      `;
    }).join('');
    host.querySelectorAll('[data-reset-pin]').forEach(button => {
      button.addEventListener('click', () => resetPin(button.dataset.resetPin, button));
    });
  }

  async function refreshClasses() {
    if (!adminKey) return;
    const { response, body } = await api('/api/teacher/classes');
    if (response.ok && body.ok) renderClasses(body);
  }

  async function resetPin(loginId, button) {
    if (!confirm(`${loginId}의 기존 PIN과 로그인 세션을 모두 초기화할까요?`)) return;
    const previous = button?.textContent;
    if (button) { button.disabled = true; button.textContent = '처리 중'; }
    try {
      const { response, body } = await api('/api/teacher/reset-pin', {
        method:'POST',
        body:JSON.stringify({ loginId })
      });
      if (!response.ok || !body.ok) {
        alert(errorText(body));
        return;
      }
      alert(`${body.loginId}\n새 PIN: ${body.pin}\n\n이 PIN은 지금만 확인할 수 있습니다.`);
    } finally {
      if (button) { button.disabled = false; button.textContent = previous || 'PIN 초기화'; }
    }
  }

  async function copyCredentials() {
    if (!lastCredentials.length) return;
    const lines = lastCredentials.map(item => `${item.loginId}\t${item.pin}`).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      alert('ID와 PIN 목록을 복사했습니다.');
    } catch (_) {
      prompt('아래 내용을 복사하세요.', lines);
    }
  }

  function init() {
    $('admin-login')?.addEventListener('click', authenticate);
    $('create-class')?.addEventListener('click', createClass);
    $('refresh-list')?.addEventListener('click', refreshClasses);
    $('print-credentials')?.addEventListener('click', () => window.print());
    $('copy-credentials')?.addEventListener('click', copyCredentials);
    $('admin-key')?.addEventListener('keydown', event => { if (event.key === 'Enter') authenticate(); });

    const saved = loadSavedKey();
    if (saved) {
      adminKey = saved;
      if ($('admin-key')) $('admin-key').value = saved;
      authenticate();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
