(() => {
  'use strict';

  const KEY_NAME = 'kc_teacher_admin_key';
  let adminKey = '';
  let authMode = 'none';
  let lastCredentials = [];
  let lastCredentialClass = null;
  let overviewData = { classes: [], students: [] };

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
    try {
      if (value) sessionStorage.setItem(KEY_NAME, value);
      else sessionStorage.removeItem(KEY_NAME);
    } catch (_) {}
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(adminKey ? { authorization: `Bearer ${adminKey}` } : {}),
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    let body = {};
    try { body = await response.json(); } catch (_) {}
    return { response, body };
  }

  function errorText(body) {
    if (body?.error === 'unauthorized') return '로그인 정보가 올바르지 않거나 세션이 만료되었습니다.';
    if (body?.error === 'invalid_teacher_credentials') return '교사 ID 또는 비밀번호를 확인해 주세요.';
    if (body?.error === 'teacher_temporarily_locked') return '로그인 실패가 반복되어 잠시 잠겼습니다.';
    if (body?.error === 'teacher_session_expired') return '교사 로그인이 만료되었습니다. 다시 로그인해 주세요.';
    if (body?.error === 'teacher_schema_not_ready') return '교사 계정 DB 준비가 아직 끝나지 않았습니다.';
    if (body?.error === 'forbidden_class') return '이 교사 계정은 해당 학급을 관리할 수 없습니다.';
    if (body?.error === 'teacher_admin_not_configured') return 'Cloudflare Worker Secret에 KIDSCADE_ADMIN_KEY를 먼저 등록해야 합니다.';
    if (body?.error === 'account_secret_not_configured') return 'Cloudflare Worker Secret에 KIDSCADE_ACCOUNT_PEPPER를 먼저 등록해야 합니다.';
    if (body?.error === 'account_schema_not_ready') return 'D1 계정 테이블이 아직 없습니다. 0002_student_accounts.sql을 적용해 주세요.';
    if (body?.error === 'class_name_required') return '학급 이름을 입력해 주세요.';
    if (body?.error === 'class_not_found') return '학급을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.';
    if (body?.error === 'account_not_found') return '학생 계정을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.';
    if (body?.error === 'class_size_limit') return `한 학급은 최대 ${body.max || 50}명까지 관리할 수 있습니다.`;
    if (body?.error === 'confirmation_mismatch') return '확인 문구가 일치하지 않아 취소했습니다.';
    return body?.message || '요청을 처리하지 못했습니다.';
  }

  function showManagement(open) {
    ['admin-dashboard','class-list'].forEach(id => $(id)?.classList.toggle('hidden', !open));
    $('class-create')?.classList.toggle('hidden', !open || overviewData?.scope !== 'global');
    $('admin-logout')?.classList.toggle('hidden', !open);
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
      const { response, body } = await api('/api/teacher/overview');
      if (!response.ok || !body.ok) {
        setStatus('auth-status', errorText(body), 'error');
        showManagement(false);
        return;
      }
      authMode = 'global';
      saveKey(adminKey);
      overviewData = body;
      showManagement(true);
      setStatus('auth-status', '전역 관리자 모드로 열렸습니다.', 'success');
      renderOverview();
    } catch (_) {
      setStatus('auth-status', '네트워크 연결을 확인해 주세요.', 'error');
    }
  }

  async function endManagement() {
    if (authMode === 'class') {
      try { await api('/api/teacher/auth/logout', { method:'POST' }); } catch (_) {}
    }
    adminKey = '';
    authMode = 'none';
    saveKey('');
    overviewData = { classes: [], students: [], scope:'none' };
    if ($('admin-key')) $('admin-key').value = '';
    if ($('teacher-login-password')) $('teacher-login-password').value = '';
    showManagement(false);
    setStatus('auth-status', '교사 관리가 종료되었습니다.');
  }

  async function authenticateTeacher() {
    const loginId = String($('teacher-login-id')?.value || '').trim().toUpperCase().replace(/\s+/g,'');
    const password = String($('teacher-login-password')?.value || '');
    if (!loginId || !password) {
      setStatus('auth-status','교사 ID와 비밀번호를 입력해 주세요.','error');
      return;
    }
    adminKey = '';
    saveKey('');
    setStatus('auth-status','교사 계정을 확인하고 있습니다...');
    try {
      const { response, body } = await api('/api/teacher/auth/login', {
        method:'POST',
        body:JSON.stringify({ loginId, password })
      });
      if (!response.ok || !body.ok) {
        setStatus('auth-status',errorText(body),'error');
        showManagement(false);
        return;
      }
      authMode = 'class';
      if ($('teacher-login-password')) $('teacher-login-password').value = '';
      await refreshOverview();
      setStatus('auth-status',(body.teacher?.className || '우리 반') + ' 교사 관리가 열렸습니다.','success');
    } catch (_) {
      setStatus('auth-status','네트워크 연결을 확인해 주세요.','error');
    }
  }

  async function resumeTeacherSession() {
    if (adminKey) return false;
    try {
      const { response, body } = await api('/api/teacher/auth/me');
      if (!response.ok || !body.ok || body.scope !== 'class') return false;
      authMode = 'class';
      await refreshOverview();
      setStatus('auth-status',(body.teacher?.className || '우리 반') + ' 교사 로그인 유지 중','success');
      return true;
    } catch (_) {
      return false;
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
      setCredentials(body.classroom, body.credentials || []);
      const teacherText = body.teacherCredential
        ? ` · 교사 ID ${body.teacherCredential.loginId} / 비밀번호 ${body.teacherCredential.password}`
        : '';
      setStatus('create-status', `${name} 학생 계정 ${lastCredentials.length}개를 만들었습니다.${teacherText}`, 'success');
      if ($('class-name')) $('class-name').value = '';
      await refreshOverview();
    } catch (_) {
      setStatus('create-status', '네트워크 연결을 확인해 주세요.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function setCredentials(classroom, credentials) {
    lastCredentialClass = classroom || null;
    lastCredentials = Array.isArray(credentials) ? credentials : [];
    renderCredentials(lastCredentialClass, lastCredentials);
  }

  function renderCredentials(classroom, credentials) {
    const card = $('credential-card');
    const host = $('credentials');
    if (!card || !host || !credentials.length) return;
    host.innerHTML = credentials.map((item, index) => `
      <article class="credential">
        <b>🎮 ${escapeHtml(classroom?.name || 'Kidscade')}</b>
        <span>ID: ${escapeHtml(item.loginId)}</span>
        <span>PIN: ${escapeHtml(item.pin)}</span>
        <small style="display:block;margin-top:7px;color:#64748b">${index + 1}번 로그인 카드</small>
      </article>
    `).join('');
    card.classList.remove('hidden');
    card.scrollIntoView?.({ behavior:'smooth', block:'start' });
  }

  function formatDate(value) {
    if (!value) return '아직 없음';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds || 0)));
    if (total < 60) return total ? `${total}초` : '0분';
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours) return `${hours}시간 ${minutes}분`;
    return `${Math.floor(total / 60)}분`;
  }

  function isLocked(student) {
    if (!student?.locked_until) return false;
    return new Date(student.locked_until).getTime() > Date.now();
  }

  function statusBadge(student) {
    if (Number(student.disabled)) return '<span class="pill off">사용 중지</span>';
    if (isLocked(student)) return '<span class="pill locked">PIN 잠김</span>';
    return '<span class="pill">사용 가능</span>';
  }

  function filteredStudents(students) {
    const keyword = String($('student-search')?.value || '').trim().toLowerCase();
    const status = $('student-status-filter')?.value || 'all';
    return students.filter(student => {
      const matchesKeyword = !keyword || `${student.login_id} ${student.nickname}`.toLowerCase().includes(keyword);
      let matchesStatus = true;
      if (status === 'active') matchesStatus = !Number(student.disabled);
      if (status === 'disabled') matchesStatus = Boolean(Number(student.disabled));
      if (status === 'online') matchesStatus = Number(student.active_sessions || 0) > 0;
      return matchesKeyword && matchesStatus;
    });
  }

  function renderMetrics() {
    const classes = Array.isArray(overviewData.classes) ? overviewData.classes : [];
    const students = Array.isArray(overviewData.students) ? overviewData.students : [];
    const active = students.filter(student => !Number(student.disabled)).length;
    const sessions = students.reduce((sum, student) => sum + (Number(student.active_sessions || 0) > 0 ? 1 : 0), 0);
    if ($('metric-classes')) $('metric-classes').textContent = String(classes.length);
    if ($('metric-students')) $('metric-students').textContent = String(students.length);
    if ($('metric-active')) $('metric-active').textContent = String(active);
    if ($('metric-sessions')) $('metric-sessions').textContent = String(sessions);
  }

  function renderOverview() {
    if ($('management-scope')) {
      $('management-scope').textContent = overviewData?.scope === 'global'
        ? '전역 관리자 · 모든 학급과 교사 계정을 관리합니다.'
        : ((overviewData?.teacher?.className || '우리 반') + ' 전용 관리 · 이 학급만 표시됩니다.');
    }
    renderMetrics();
    renderClasses();
  }

  function renderClasses() {
    const host = $('classes');
    if (!host) return;
    const classes = Array.isArray(overviewData.classes) ? overviewData.classes : [];
    const students = Array.isArray(overviewData.students) ? overviewData.students : [];
    if (!classes.length) {
      host.innerHTML = '<div class="empty">아직 만든 학급이 없습니다.</div>';
      return;
    }
    const searched = filteredStudents(students);
    const filterActive = Boolean(String($('student-search')?.value || '').trim()) || ($('student-status-filter')?.value || 'all') !== 'all';
    const blocks = classes.map(classroom => {
      const allMembers = students.filter(student => student.class_id === classroom.id);
      const members = searched.filter(student => student.class_id === classroom.id);
      if (filterActive && !members.length) return '';
      const onlineCount = allMembers.filter(student => Number(student.active_sessions || 0) > 0).length;
      const disabledCount = allMembers.filter(student => Number(student.disabled)).length;
      const totalPlays = allMembers.reduce((sum, student) => sum + Number(student.summary?.plays || 0), 0);
      const teacherCredential = (overviewData.teacherCredentials || []).find(item => item.classId === classroom.id);
      const teacherCredentialHtml = overviewData.scope === 'global'
        ? (teacherCredential
          ? `<div class="teacher-credential"><b>👩‍🏫 교사 계정</b><code>${escapeHtml(teacherCredential.loginId)}</code><code>${escapeHtml(teacherCredential.password || '확인 불가')}</code><button class="secondary" type="button" data-action="copy-teacher" data-teacher-id="${escapeHtml(teacherCredential.loginId)}" data-teacher-password="${escapeHtml(teacherCredential.password || '')}">복사</button><button type="button" data-action="reset-teacher" data-class-id="${escapeHtml(classroom.id)}" data-class-name="${escapeHtml(classroom.name)}">비밀번호 재발급</button></div>`
          : '<div class="teacher-credential"><b>👩‍🏫 교사 계정 준비 중</b></div>')
        : `<div class="teacher-credential"><b>👩‍🏫 내 교사 ID</b><code>${escapeHtml(overviewData.teacher?.loginId || '')}</code></div>`;
      const rows = members.map(student => {
        const summary = student.summary || {};
        const online = Number(student.active_sessions || 0) > 0
          ? `<span class="pill session">로그인 ${Number(student.active_sessions)}개</span>`
          : '<span class="tiny">오프라인</span>';
        return `
          <tr>
            <td data-label="계정"><span class="idline">${escapeHtml(student.login_id)}</span><span class="tiny">${statusBadge(student)} ${online}</span></td>
            <td data-label="닉네임"><b>${escapeHtml(student.nickname || '새싹 게이머')}</b></td>
            <td data-label="기록"><b>🌱 ${Number(summary.seeds || 0).toLocaleString('ko-KR')}</b><span class="tiny">${Number(summary.plays || 0)}회 · ${Number(summary.gameCount || 0)}게임 · ${escapeHtml(formatDuration(summary.seconds))}</span></td>
            <td data-label="클라우드">${student.state_revision > 0 ? `저장 ${Number(student.state_revision)}회` : '첫 저장 전'}<span class="tiny">${escapeHtml(formatDate(student.updated_at))}</span></td>
            <td data-label="마지막 로그인">${escapeHtml(formatDate(student.last_login_at))}</td>
            <td data-label="관리"><div class="student-actions">
              <button type="button" data-action="reset-pin" data-login="${escapeHtml(student.login_id)}">PIN 재발급</button>
              <button class="secondary" type="button" data-action="logout-student" data-login="${escapeHtml(student.login_id)}">로그아웃</button>
              <button class="${Number(student.disabled) ? 'secondary' : 'warn'}" type="button" data-action="toggle-status" data-login="${escapeHtml(student.login_id)}" data-disabled="${Number(student.disabled) ? '1' : '0'}">${Number(student.disabled) ? '사용 복구' : '사용 중지'}</button>
              <button class="warn" type="button" data-action="reset-progress" data-login="${escapeHtml(student.login_id)}">기록 초기화</button>
              <button class="danger" type="button" data-action="delete-student" data-login="${escapeHtml(student.login_id)}">계정 삭제</button>
            </div></td>
          </tr>
        `;
      }).join('');
      return `
        <section class="class-block" data-class-id="${escapeHtml(classroom.id)}">
          <div class="class-head">
            <div>
              <h3>${escapeHtml(classroom.name)}</h3>
              <div class="muted">학급 코드 ${escapeHtml(classroom.class_code)}</div>
              <div class="class-summary"><span>학생 ${allMembers.length}명</span><span>현재 로그인 ${onlineCount}명</span><span>사용 중지 ${disabledCount}명</span><span>누적 플레이 ${totalPlays}회</span></div>
              ${teacherCredentialHtml}
            </div>
            <div class="class-actions">
              <button type="button" data-action="economy" data-class-id="${escapeHtml(classroom.id)}" data-class-name="${escapeHtml(classroom.name)}">💰 학급경제</button>
              <button class="secondary" type="button" data-action="rename-class" data-class-id="${escapeHtml(classroom.id)}" data-class-name="${escapeHtml(classroom.name)}">이름 변경</button>
              <button type="button" data-action="add-students" data-class-id="${escapeHtml(classroom.id)}" data-class-name="${escapeHtml(classroom.name)}">학생 추가</button>
              <button class="secondary" type="button" data-action="logout-class" data-class-id="${escapeHtml(classroom.id)}" data-class-name="${escapeHtml(classroom.name)}">전체 로그아웃</button>
              <button class="danger" type="button" data-action="delete-class" data-class-id="${escapeHtml(classroom.id)}" data-class-name="${escapeHtml(classroom.name)}">학급 삭제</button>
            </div>
          </div>
          ${members.length ? `<table class="student-table"><thead><tr><th>계정</th><th>닉네임</th><th>개인 기록</th><th>클라우드</th><th>마지막 로그인</th><th>관리</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">조건에 맞는 학생이 없습니다.</div>'}
        </section>
      `;
    }).filter(Boolean).join('');
    host.innerHTML = blocks || '<div class="empty">검색 조건에 맞는 학생이 없습니다.</div>';
  }

  async function refreshOverview() {
    if (!adminKey && authMode !== 'class') return;
    try {
      const { response, body } = await api('/api/teacher/overview');
      if (!response.ok || !body.ok) {
        if (response.status === 401) await endManagement();
        else alert(errorText(body));
        return;
      }
      overviewData = body;
      renderOverview();
    } catch (_) {
      alert('네트워크 연결을 확인해 주세요.');
    }
  }

  async function resetPin(loginId, button) {
    if (!confirm(`${loginId}의 기존 PIN을 폐기하고 새 PIN을 발급할까요?\n현재 로그인된 기기도 로그아웃됩니다.`)) return;
    await withButton(button, '처리 중', async () => {
      const { response, body } = await api('/api/teacher/reset-pin', { method:'POST', body:JSON.stringify({ loginId }) });
      if (!response.ok || !body.ok) return alert(errorText(body));
      alert(`${body.loginId}\n새 PIN: ${body.pin}\n\n이 PIN은 지금만 확인할 수 있습니다.`);
      await refreshOverview();
    });
  }

  async function addStudents(classId, className, button) {
    const raw = prompt(`${className}에 추가할 학생 수를 입력하세요.\n학급 전체는 최대 50명입니다.`, '1');
    if (raw === null) return;
    const count = Math.floor(Number(raw));
    if (!Number.isFinite(count) || count < 1 || count > 40) return alert('1~40 사이의 숫자를 입력해 주세요.');
    await withButton(button, '추가 중', async () => {
      const { response, body } = await api('/api/teacher/add-students', { method:'POST', body:JSON.stringify({ classId, count }) });
      if (!response.ok || !body.ok) return alert(errorText(body));
      setCredentials(body.classroom, body.credentials || []);
      await refreshOverview();
    });
  }

  async function renameClass(classId, currentName, button) {
    const name = prompt('새 학급 이름을 입력하세요.', currentName || '');
    if (name === null || !name.trim() || name.trim() === currentName) return;
    await withButton(button, '변경 중', async () => {
      const { response, body } = await api('/api/teacher/class', { method:'PATCH', body:JSON.stringify({ classId, name }) });
      if (!response.ok || !body.ok) return alert(errorText(body));
      await refreshOverview();
    });
  }

  async function toggleStudent(loginId, disabled, button) {
    const willDisable = !disabled;
    if (willDisable && !confirm(`${loginId} 계정을 사용 중지할까요?\n현재 로그인된 기기도 즉시 로그아웃됩니다.`)) return;
    await withButton(button, '처리 중', async () => {
      const { response, body } = await api('/api/teacher/student-status', {
        method:'POST', body:JSON.stringify({ loginId, disabled: willDisable })
      });
      if (!response.ok || !body.ok) return alert(errorText(body));
      await refreshOverview();
    });
  }

  async function forceStudentLogout(loginId, button) {
    if (!confirm(`${loginId}의 모든 로그인 세션을 종료할까요?`)) return;
    await withButton(button, '처리 중', async () => {
      const { response, body } = await api('/api/teacher/student-logout', { method:'POST', body:JSON.stringify({ loginId }) });
      if (!response.ok || !body.ok) return alert(errorText(body));
      alert(`${loginId}의 로그인 세션 ${Number(body.loggedOutSessions || 0)}개를 종료했습니다.`);
      await refreshOverview();
    });
  }

  async function forceClassLogout(classId, className, button) {
    if (!confirm(`${className} 학생들의 모든 로그인 세션을 종료할까요?`)) return;
    await withButton(button, '처리 중', async () => {
      const { response, body } = await api('/api/teacher/class-logout', { method:'POST', body:JSON.stringify({ classId }) });
      if (!response.ok || !body.ok) return alert(errorText(body));
      alert(`로그인 세션 ${Number(body.loggedOutSessions || 0)}개를 종료했습니다.`);
      await refreshOverview();
    });
  }

  async function resetProgress(loginId, button) {
    const typed = prompt(`정말 ${loginId}의 닉네임·씨앗·아바타·플레이 기록·쑥쑥랜드 기록을 초기화할까요?\n되돌릴 수 없습니다. 계속하려면 학생 ID를 정확히 입력하세요.`, '');
    if (typed === null) return;
    await withButton(button, '초기화 중', async () => {
      const { response, body } = await api('/api/teacher/reset-progress', {
        method:'POST', body:JSON.stringify({ loginId, confirmLoginId: typed })
      });
      if (!response.ok || !body.ok) return alert(errorText(body));
      alert(`${loginId}의 클라우드 기록을 초기화했습니다. 학생은 다시 로그인해야 합니다.`);
      await refreshOverview();
    });
  }

  async function deleteStudent(loginId, button) {
    const typed = prompt(`${loginId} 계정을 완전히 삭제합니다. 클라우드 기록도 함께 삭제되며 되돌릴 수 없습니다.\n계속하려면 학생 ID를 정확히 입력하세요.`, '');
    if (typed === null) return;
    await withButton(button, '삭제 중', async () => {
      const { response, body } = await api('/api/teacher/student', {
        method:'DELETE', body:JSON.stringify({ loginId, confirmLoginId: typed })
      });
      if (!response.ok || !body.ok) return alert(errorText(body));
      await refreshOverview();
    });
  }

  async function deleteClass(classId, className, button) {
    const typed = prompt(`${className} 학급과 소속 학생 계정을 모두 삭제합니다. 모든 클라우드 기록이 사라지며 되돌릴 수 없습니다.\n계속하려면 학급 이름을 정확히 입력하세요.`, '');
    if (typed === null) return;
    await withButton(button, '삭제 중', async () => {
      const { response, body } = await api('/api/teacher/class-delete', {
        method:'DELETE', body:JSON.stringify({ classId, confirmName: typed })
      });
      if (!response.ok || !body.ok) return alert(errorText(body));
      alert(`${className} 학급과 학생 ${Number(body.deletedStudents || 0)}명 계정을 삭제했습니다.`);
      await refreshOverview();
    });
  }

  async function resetTeacherCredential(classId, className, button) {
    if (!confirm(className + ' 교사의 기존 비밀번호를 폐기하고 새 비밀번호를 발급할까요?\n현재 교사 로그인 세션도 종료됩니다.')) return;
    await withButton(button,'재발급 중',async()=>{
      const { response, body } = await api('/api/teacher/class-credential',{
        method:'POST',
        body:JSON.stringify({ classId })
      });
      if (!response.ok || !body.ok) return alert(errorText(body));
      alert('교사 ID: ' + body.loginId + '\n새 비밀번호: ' + body.password);
      await refreshOverview();
    });
  }

  async function copyTeacherCredential(loginId, password) {
    const text = '교사 ID: ' + loginId + '\n비밀번호: ' + password;
    try {
      await navigator.clipboard.writeText(text);
      alert('교사 ID와 비밀번호를 복사했습니다.');
    } catch (_) {
      prompt('아래 내용을 복사하세요.', text);
    }
  }

  async function withButton(button, busyText, task) {
    const previous = button?.textContent;
    if (button) { button.disabled = true; button.textContent = busyText; }
    try { await task(); }
    catch (_) { alert('네트워크 연결을 확인해 주세요.'); }
    finally { if (button?.isConnected) { button.disabled = false; button.textContent = previous || '완료'; } }
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

  function csvEscape(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
    const blob = new Blob(['\ufeff', text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function downloadCredentials() {
    if (!lastCredentials.length) return;
    const rows = [['학급','Kidscade ID','PIN'], ...lastCredentials.map(item => [lastCredentialClass?.name || '', item.loginId, item.pin])];
    downloadText('kidscade-login-cards.csv', rows.map(row => row.map(csvEscape).join(',')).join('\n'));
  }

  function exportOverview() {
    const classes = new Map((overviewData.classes || []).map(item => [item.id, item]));
    const rows = [['학급','학급코드','ID','닉네임','상태','현재로그인','씨앗','플레이횟수','플레이시간(초)','플레이게임수','클라우드저장횟수','마지막로그인']];
    (overviewData.students || []).forEach(student => {
      const classroom = classes.get(student.class_id) || {};
      rows.push([
        classroom.name || student.class_name || '', classroom.class_code || student.class_code || '', student.login_id,
        student.nickname || '', Number(student.disabled) ? '사용 중지' : (isLocked(student) ? 'PIN 잠김' : '사용 가능'),
        Number(student.active_sessions || 0), Number(student.summary?.seeds || 0), Number(student.summary?.plays || 0),
        Number(student.summary?.seconds || 0), Number(student.summary?.gameCount || 0), Number(student.state_revision || 0), student.last_login_at || ''
      ]);
    });
    downloadText('kidscade-student-overview.csv', rows.map(row => row.map(csvEscape).join(',')).join('\n'));
  }

  function handleClassActions(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const loginId = button.dataset.login;
    const classId = button.dataset.classId;
    const className = button.dataset.className;
    if (action === 'economy') location.href = '/teacher/economy.html?classId=' + encodeURIComponent(classId || '') + '&className=' + encodeURIComponent(className || '');
    else if (action === 'reset-teacher') resetTeacherCredential(classId, className, button);
    else if (action === 'copy-teacher') copyTeacherCredential(button.dataset.teacherId || '', button.dataset.teacherPassword || '');
    else if (action === 'reset-pin') resetPin(loginId, button);
    else if (action === 'logout-student') forceStudentLogout(loginId, button);
    else if (action === 'toggle-status') toggleStudent(loginId, button.dataset.disabled === '1', button);
    else if (action === 'reset-progress') resetProgress(loginId, button);
    else if (action === 'delete-student') deleteStudent(loginId, button);
    else if (action === 'add-students') addStudents(classId, className, button);
    else if (action === 'rename-class') renameClass(classId, className, button);
    else if (action === 'logout-class') forceClassLogout(classId, className, button);
    else if (action === 'delete-class') deleteClass(classId, className, button);
  }

  function init() {
    $('teacher-login')?.addEventListener('click', authenticateTeacher);
    $('admin-login')?.addEventListener('click', authenticate);
    $('admin-logout')?.addEventListener('click', endManagement);
    $('create-class')?.addEventListener('click', createClass);
    $('refresh-list')?.addEventListener('click', refreshOverview);
    $('print-credentials')?.addEventListener('click', () => window.print());
    $('copy-credentials')?.addEventListener('click', copyCredentials);
    $('download-credentials')?.addEventListener('click', downloadCredentials);
    $('export-overview')?.addEventListener('click', exportOverview);
    $('classes')?.addEventListener('click', handleClassActions);
    $('student-search')?.addEventListener('input', renderClasses);
    $('student-status-filter')?.addEventListener('change', renderClasses);
    $('admin-key')?.addEventListener('keydown', event => { if (event.key === 'Enter') authenticate(); });
    $('teacher-login-password')?.addEventListener('keydown', event => { if (event.key === 'Enter') authenticateTeacher(); });

    const saved = loadSavedKey();
    if (saved) {
      adminKey = saved;
      if ($('admin-key')) $('admin-key').value = saved;
      authenticate();
    } else {
      resumeTeacherSession();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
