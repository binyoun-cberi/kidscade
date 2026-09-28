(() => {
  'use strict';

  const SAVE_NAME = 'mafiaPassPlaySave';
  const MIN_PLAYERS = 4;
  const MAX_PLAYERS = 24;
  const CLASS_MODE_MIN = 17;

  const ROLE = Object.freeze({
    mafia: {
      name: '마피아',
      emoji: '🔪',
      team: 'mafia',
      teamLabel: '마피아 진영',
      desc: '밤마다 시민 진영 한 명을 노립니다. 낮에는 정체를 숨기세요.'
    },
    detective: {
      name: '경찰',
      emoji: '🔍',
      team: 'town',
      teamLabel: '시민 진영',
      desc: '밤마다 살아 있는 한 명을 조사해 마피아인지 확인합니다.'
    },
    doctor: {
      name: '의사',
      emoji: '💉',
      team: 'town',
      teamLabel: '시민 진영',
      desc: '밤마다 살아 있는 한 명을 보호해 마피아의 공격을 막을 수 있습니다.'
    },
    citizen: {
      name: '시민',
      emoji: '🙂',
      team: 'town',
      teamLabel: '시민 진영',
      desc: '특별한 밤 능력은 없습니다. 토론과 투표로 마피아를 찾아내세요.'
    }
  });

  const el = {
    screen: document.getElementById('screen'),
    setupTemplate: document.getElementById('setupTemplate'),
    soundBtn: document.getElementById('soundBtn'),
    resetBtn: document.getElementById('resetBtn'),
    toast: document.getElementById('toast')
  };

  let state = null;
  let setup = defaultSetup(6);
  let soundOn = true;
  let timerHandle = null;
  let toastHandle = null;
  let audioCtx = null;

  function defaultSetup(count) {
    const mafia = recommendedMafia(count);
    return {
      playerCount: count,
      names: Array.from({ length: count }, (_, i) => '플레이어 ' + (i + 1)),
      mafia,
      detective: true,
      doctor: count >= 5,
      discussionSeconds: 180,
      defenseSeconds: 30,
      revealDeath: false,
      allowConsecutiveSelfHeal: false
    };
  }

  function recommendedMafia(count) {
    if (count <= 6) return 1;
    if (count <= 9) return 2;
    if (count <= 12) return 3;
    if (count <= 16) return 4;
    if (count <= 21) return 5;
    return 6;
  }

  function storageGet() {
    try {
      return window.KidscadeStorage ? window.KidscadeStorage.getJson(SAVE_NAME, null) : null;
    } catch (_) {
      return null;
    }
  }

  function storageSet(payload) {
    try {
      return window.KidscadeStorage ? window.KidscadeStorage.setJson(SAVE_NAME, payload) : false;
    } catch (_) {
      return false;
    }
  }

  function persist() {
    storageSet({
      version: 1,
      active: state,
      lastSetup: setup,
      sound: soundOn
    });
  }

  function restore() {
    const saved = storageGet();
    if (!saved || typeof saved !== 'object') return;
    if (saved.lastSetup) setup = sanitizeSetup(saved.lastSetup);
    if (typeof saved.sound === 'boolean') soundOn = saved.sound;
    if (saved.active && Array.isArray(saved.active.players) && saved.active.players.length >= MIN_PLAYERS) {
      state = saved.active;
    }
  }

  function sanitizeSetup(raw) {
    const count = clamp(Number(raw.playerCount) || 6, MIN_PLAYERS, MAX_PLAYERS);
    const base = defaultSetup(count);
    const names = Array.from({ length: count }, (_, i) => {
      const value = Array.isArray(raw.names) ? raw.names[i] : '';
      return cleanName(value) || ('플레이어 ' + (i + 1));
    });
    const maxMafia = Math.max(1, Math.floor((count - 1) / 2));
    return {
      playerCount: count,
      names,
      mafia: clamp(Number(raw.mafia) || base.mafia, 1, maxMafia),
      detective: raw.detective !== false,
      doctor: count >= 5 ? raw.doctor !== false : Boolean(raw.doctor),
      discussionSeconds: [120, 180, 300].includes(Number(raw.discussionSeconds)) ? Number(raw.discussionSeconds) : 180,
      defenseSeconds: [20, 30, 60].includes(Number(raw.defenseSeconds)) ? Number(raw.defenseSeconds) : 30,
      revealDeath: Boolean(raw.revealDeath),
      allowConsecutiveSelfHeal: Boolean(raw.allowConsecutiveSelfHeal)
    };
  }

  function cleanName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 14);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function shuffle(values) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);
  }

  function roleMeta(role) {
    return ROLE[role] || ROLE.citizen;
  }

  function playerById(id) {
    return state ? state.players.find(p => p.id === id) || null : null;
  }

  function alivePlayers() {
    return state ? state.players.filter(p => p.alive) : [];
  }

  function isClassMode() {
    if (!state) return setup.playerCount >= CLASS_MODE_MIN;
    if (typeof state.settings?.classMode === 'boolean') return state.settings.classMode;
    return state.players.length >= CLASS_MODE_MIN;
  }

  function setScreen(html) {
    stopTimer();
    el.screen.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function toast(message) {
    clearTimeout(toastHandle);
    el.toast.textContent = message;
    el.toast.classList.add('show');
    toastHandle = setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  function tone(freq, duration, volume) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(volume || 0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (duration || 0.12));
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start(now);
      oscillator.stop(now + (duration || 0.12) + 0.02);
    } catch (_) {}
  }

  function cue(type) {
    if (type === 'night') {
      tone(220, .16, .03);
      setTimeout(() => tone(164, .22, .025), 130);
    } else if (type === 'vote') {
      tone(520, .08, .025);
    } else if (type === 'danger') {
      tone(145, .20, .04);
      setTimeout(() => tone(115, .26, .035), 170);
    } else if (type === 'safe') {
      tone(520, .10, .03);
      setTimeout(() => tone(660, .16, .025), 95);
    } else {
      tone(420, .08, .025);
    }
  }

  function sdkStart() {
    try {
      if (window.KidscadeGame && typeof window.KidscadeGame.start === 'function') window.KidscadeGame.start();
    } catch (_) {}
  }

  function sdkGameOver(winner) {
    try {
      if (window.KidscadeGame && typeof window.KidscadeGame.gameOver === 'function') {
        window.KidscadeGame.gameOver({ score: winner === 'town' ? 1 : 0 });
      }
    } catch (_) {}
  }

  function updateTopbar() {
    el.soundBtn.textContent = soundOn ? '🔊' : '🔇';
    el.resetBtn.classList.toggle('hidden', !state || state.phase === 'game_over');
  }

  function render() {
    updateTopbar();
    if (!state) return renderSetup();
    switch (state.phase) {
      case 'role_handoff': return renderRoleHandoff();
      case 'role_reveal': return renderRoleReveal();
      case 'night_intro': return renderNightIntro();
      case 'night_handoff': return renderNightHandoff();
      case 'night_action': return renderNightAction();
      case 'detective_result': return renderDetectiveResult();
      case 'dawn': return renderDawn();
      case 'discussion': return renderDiscussion();
      case 'class_candidate_select': return renderClassCandidateSelect();
      case 'class_defense': return renderClassDefense();
      case 'class_vote_handoff': return renderClassVoteHandoff();
      case 'class_vote': return renderClassVote();
      case 'class_result': return renderClassResult();
      case 'nomination_handoff': return renderNominationHandoff();
      case 'nomination_vote': return renderNominationVote();
      case 'nomination_result': return renderNominationResult();
      case 'defense': return renderDefense();
      case 'trial_handoff': return renderTrialHandoff();
      case 'trial_vote': return renderTrialVote();
      case 'trial_result': return renderTrialResult();
      case 'game_over': return renderGameOver();
      default:
        state.phase = 'night_intro';
        persist();
        return render();
    }
  }

  function renderSetup() {
    const fragment = el.setupTemplate.content.cloneNode(true);
    el.screen.innerHTML = '';
    el.screen.appendChild(fragment);
    el.resetBtn.classList.add('hidden');

    const countEl = document.getElementById('playerCount');
    const countLabel = document.getElementById('playerCountLabel');
    const nameFields = document.getElementById('nameFields');
    const modePreview = document.getElementById('modePreview');
    const bulkNames = document.getElementById('bulkNames');
    const mafiaCount = document.getElementById('mafiaCount');
    const citizenCount = document.getElementById('citizenCount');
    const detectiveToggle = document.getElementById('detectiveToggle');
    const doctorToggle = document.getElementById('doctorToggle');
    const discussionSelect = document.getElementById('discussionSelect');
    const defenseSelect = document.getElementById('defenseSelect');
    const revealDeathToggle = document.getElementById('revealDeathToggle');
    const selfHealToggle = document.getElementById('selfHealToggle');
    const balanceNote = document.getElementById('balanceNote');
    const resumeCard = document.getElementById('resumeCard');

    function syncSetupUi() {
      setup = sanitizeSetup(setup);
      countEl.textContent = setup.playerCount;
      countLabel.textContent = setup.playerCount + '명';
      mafiaCount.textContent = setup.mafia;
      detectiveToggle.checked = setup.detective;
      doctorToggle.checked = setup.doctor;
      discussionSelect.value = String(setup.discussionSeconds);
      defenseSelect.value = String(setup.defenseSeconds);
      revealDeathToggle.checked = setup.revealDeath;
      selfHealToggle.checked = setup.allowConsecutiveSelfHeal;
      renderNames();
      updateModePreview();
      updateBalance();
    }

    function updateModePreview() {
      const classroom = setup.playerCount >= CLASS_MODE_MIN;
      modePreview.classList.toggle('classroom', classroom);
      modePreview.innerHTML = classroom
        ? '<b>🏫 학급 모드 · ' + setup.playerCount + '명</b>밤에는 전원이 빠르게 휴대폰을 확인하고, 낮에는 공개 후보 2명 선정 → 후보별 변론 → 후보를 제외한 전원의 단 한 번 비밀 최종투표로 진행합니다.'
        : '<b>🌙 클래식 모드 · ' + setup.playerCount + '명</b>비밀 지목 → 최후 변론 → 처형 찬반 투표의 정통 마피아 흐름으로 진행합니다.';
    }

    function renderNames() {
      nameFields.innerHTML = setup.names.map((name, i) =>
        '<label class="name-field"><span>' + (i + 1) + '</span><input type="text" maxlength="14" data-name-index="' + i + '" value="' + escapeHtml(name) + '" aria-label="' + (i + 1) + '번 플레이어 이름"></label>'
      ).join('');
      nameFields.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
          const idx = Number(input.dataset.nameIndex);
          setup.names[idx] = input.value;
          persist();
        });
      });
    }

    function updateBalance() {
      const special = (setup.detective ? 1 : 0) + (setup.doctor ? 1 : 0);
      const citizens = setup.playerCount - setup.mafia - special;
      citizenCount.textContent = Math.max(0, citizens);
      const bad = citizens < 1 || setup.mafia >= (setup.playerCount - setup.mafia);
      balanceNote.classList.toggle('bad', bad);
      balanceNote.textContent = bad
        ? '역할 구성을 조정해 주세요. 시민 진영이 최소 1명 있어야 하고, 시작할 때 마피아 수가 시민 진영보다 적어야 해요.'
        : '현재 구성: 마피아 ' + setup.mafia + '명 · 경찰 ' + (setup.detective ? 1 : 0) + '명 · 의사 ' + (setup.doctor ? 1 : 0) + '명 · 시민 ' + citizens + '명';
      document.getElementById('startBtn').disabled = bad;
    }

    document.querySelectorAll('[data-count]').forEach(btn => btn.addEventListener('click', () => {
      const oldCount = setup.playerCount;
      const next = clamp(oldCount + Number(btn.dataset.count), MIN_PLAYERS, MAX_PLAYERS);
      if (next === oldCount) return;
      if (next > oldCount) {
        for (let i = oldCount; i < next; i++) setup.names.push('플레이어 ' + (i + 1));
      } else {
        setup.names = setup.names.slice(0, next);
      }
      setup.playerCount = next;
      setup.mafia = Math.min(setup.mafia, Math.max(1, Math.floor((next - 1) / 2)));
      if (next < 5 && setup.doctor && next - setup.mafia - (setup.detective ? 1 : 0) - 1 < 1) setup.doctor = false;
      syncSetupUi();
      persist();
    }));

    document.querySelectorAll('[data-role-step]').forEach(btn => btn.addEventListener('click', () => {
      const parts = btn.dataset.roleStep.split(':');
      if (parts[0] !== 'mafia') return;
      setup.mafia = clamp(setup.mafia + Number(parts[1]), 1, Math.max(1, Math.floor((setup.playerCount - 1) / 2)));
      syncSetupUi();
      persist();
    }));

    document.getElementById('recommendBtn').addEventListener('click', () => {
      setup.mafia = recommendedMafia(setup.playerCount);
      setup.detective = true;
      setup.doctor = setup.playerCount >= 5;
      syncSetupUi();
      persist();
      toast('인원에 맞는 기본 역할로 맞췄어요.');
    });

    detectiveToggle.addEventListener('change', () => { setup.detective = detectiveToggle.checked; updateBalance(); persist(); });
    doctorToggle.addEventListener('change', () => { setup.doctor = doctorToggle.checked; updateBalance(); persist(); });
    discussionSelect.addEventListener('change', () => { setup.discussionSeconds = Number(discussionSelect.value); persist(); });
    defenseSelect.addEventListener('change', () => { setup.defenseSeconds = Number(defenseSelect.value); persist(); });
    revealDeathToggle.addEventListener('change', () => { setup.revealDeath = revealDeathToggle.checked; persist(); });
    selfHealToggle.addEventListener('change', () => { setup.allowConsecutiveSelfHeal = selfHealToggle.checked; persist(); });

    document.getElementById('applyBulkNames').addEventListener('click', () => {
      const values = String(bulkNames.value || '')
        .split(/[\n,;]+/)
        .map(cleanName)
        .filter(Boolean)
        .slice(0, setup.playerCount);
      if (!values.length) {
        toast('붙여넣은 명단에서 이름을 찾지 못했어요.');
        return;
      }
      values.forEach((name, i) => { setup.names[i] = name; });
      syncSetupUi();
      persist();
      toast(values.length + '명의 이름을 적용했어요.');
    });

    document.getElementById('startBtn').addEventListener('click', startGame);

    const saved = storageGet();
    if (saved && saved.active && saved.active.phase && saved.active.phase !== 'game_over') {
      const phaseText = phaseLabel(saved.active.phase);
      resumeCard.innerHTML =
        '<div class="resume-box"><div><b>진행 중인 게임이 있어요</b><p>DAY ' + escapeHtml(saved.active.day || 1) + ' · ' + escapeHtml(phaseText) + '</p></div>' +
        '<button class="primary" id="resumeBtn" type="button">이어하기</button></div>';
      document.getElementById('resumeBtn').addEventListener('click', () => {
        state = saved.active;
        cue('default');
        render();
      });
    } else {
      resumeCard.classList.add('hidden');
    }

    syncSetupUi();
  }

  function phaseLabel(phase) {
    const labels = {
      role_handoff: '역할 확인',
      role_reveal: '역할 확인',
      night_intro: '밤 시작',
      night_handoff: '밤 행동',
      night_action: '밤 행동',
      detective_result: '경찰 조사 결과',
      dawn: '아침',
      discussion: '토론',
      class_candidate_select: '학급 후보 선정',
      class_defense: '학급 후보 변론',
      class_vote_handoff: '학급 최종투표',
      class_vote: '학급 최종투표',
      class_result: '학급 투표 결과',
      nomination_handoff: '용의자 지목',
      nomination_vote: '용의자 지목',
      nomination_result: '지목 결과',
      defense: '최후 변론',
      trial_handoff: '처형 투표',
      trial_vote: '처형 투표',
      trial_result: '재판 결과'
    };
    return labels[phase] || '게임 진행 중';
  }

  function validateNames() {
    const normalized = setup.names.map(cleanName);
    if (normalized.some(name => !name)) {
      toast('모든 플레이어의 이름을 입력해 주세요.');
      return false;
    }
    const lowered = normalized.map(name => name.toLocaleLowerCase('ko-KR'));
    if (new Set(lowered).size !== lowered.length) {
      toast('플레이어 이름은 서로 다르게 적어 주세요.');
      return false;
    }
    setup.names = normalized;
    return true;
  }

  function buildRoleDeck() {
    const roles = [];
    for (let i = 0; i < setup.mafia; i++) roles.push('mafia');
    if (setup.detective) roles.push('detective');
    if (setup.doctor) roles.push('doctor');
    while (roles.length < setup.playerCount) roles.push('citizen');
    return shuffle(roles);
  }

  function startGame() {
    if (!validateNames()) return;
    const deck = buildRoleDeck();
    const players = setup.names.map((name, i) => ({
      id: 'p' + (i + 1),
      seat: i,
      name,
      role: deck[i],
      team: roleMeta(deck[i]).team,
      alive: true
    }));
    state = {
      version: 1,
      phase: 'role_handoff',
      day: 1,
      players,
      settings: {
        discussionSeconds: setup.discussionSeconds,
        defenseSeconds: setup.defenseSeconds,
        revealDeath: setup.revealDeath,
        allowConsecutiveSelfHeal: setup.allowConsecutiveSelfHeal,
        classMode: setup.playerCount >= CLASS_MODE_MIN
      },
      roleIndex: 0,
      nightOrder: [],
      turnIndex: 0,
      nightActions: null,
      pendingInvestigation: null,
      lastNight: null,
      previousProtectId: null,
      pendingWinner: null,
      nominationPool: null,
      nominationRound: 1,
      votes: {},
      accusedId: null,
      trialVotes: {},
      deadline: null,
      lastTrial: null,
      classCandidates: [],
      classDefenseIndex: 0,
      classVotes: {}
    };
    persist();
    sdkStart();
    cue('night');
    render();
  }

  function renderRoleHandoff() {
    const p = state.players[state.roleIndex];
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">📱</div><div class="phase-label">비밀 역할 확인 · ' + (state.roleIndex + 1) + '/' + state.players.length + '</div>' +
      '<h2>' + escapeHtml(p.name) + ' 차례</h2>' +
      '<p>' + (isClassMode() ? '이름을 확인한 뒤 바로 개인 역할을 보세요.' : '휴대폰을 <b>' + escapeHtml(p.name) + '</b>에게만 보여 주세요.<br>다른 사람은 화면에서 시선을 떼어 주세요.') + '</p>' +
      '<div class="' + (isClassMode() ? 'fast-pass' : 'privacy-shield') + '">🔒 역할은 다음 화면에서만 공개됩니다.</div>' +
      '<div class="phase-actions"><button class="primary giant" id="privateBtn" type="button">내가 ' + escapeHtml(p.name) + '입니다</button></div>' +
      '</section></div>'
    );
    document.getElementById('privateBtn').addEventListener('click', () => {
      state.phase = 'role_reveal';
      persist();
      render();
    });
  }

  function attachHold(button, secret, onFirstReveal) {
    let holdTimer = null;
    let shown = false;
    const hide = () => {
      clearTimeout(holdTimer);
      holdTimer = null;
      button.classList.remove('holding');
      secret.classList.add('hidden');
    };
    const start = ev => {
      ev.preventDefault();
      if (button.setPointerCapture && ev.pointerId != null) {
        try { button.setPointerCapture(ev.pointerId); } catch (_) {}
      }
      clearTimeout(holdTimer);
      button.classList.add('holding');
      holdTimer = setTimeout(() => {
        secret.classList.remove('hidden');
        if (!shown) {
          shown = true;
          if (onFirstReveal) onFirstReveal();
        }
      }, 320);
    };
    button.addEventListener('pointerdown', start);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => button.addEventListener(type, hide));
    button.addEventListener('contextmenu', ev => ev.preventDefault());
  }

  function renderRoleReveal() {
    const p = state.players[state.roleIndex];
    const meta = roleMeta(p.role);
    const allies = p.role === 'mafia'
      ? state.players.filter(x => x.role === 'mafia' && x.id !== p.id).map(x => x.name)
      : [];
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="pass-name">' + escapeHtml(p.name) + '의 비밀 카드</div>' +
      '<h2>누르고 있는 동안만 확인</h2>' +
      '<p>버튼에서 손을 떼면 역할이 즉시 다시 가려져요.</p>' +
      '<button class="hold-btn" id="holdRole" type="button">👆 길게 눌러 역할 보기</button>' +
      '<div class="secret-card hidden" id="roleSecret">' +
        '<div class="team">' + escapeHtml(meta.teamLabel) + '</div>' +
        '<div class="role-emoji">' + meta.emoji + '</div>' +
        '<h3>' + escapeHtml(meta.name) + '</h3>' +
        '<p>' + escapeHtml(meta.desc) + '</p>' +
        (allies.length ? '<div class="ally-box">같은 편 마피아: ' + allies.map(escapeHtml).join(', ') + '</div>' : '') +
      '</div>' +
      '<div class="phase-actions"><button class="primary" id="roleDone" type="button" disabled>역할 확인 완료</button></div>' +
      '</section></div>'
    );
    const done = document.getElementById('roleDone');
    attachHold(document.getElementById('holdRole'), document.getElementById('roleSecret'), () => {
      done.disabled = false;
      cue(p.role === 'mafia' ? 'danger' : 'default');
    });
    done.addEventListener('click', () => {
      state.roleIndex += 1;
      if (state.roleIndex >= state.players.length) {
        state.phase = 'night_intro';
      } else {
        state.phase = 'role_handoff';
      }
      persist();
      render();
    });
  }

  function renderNightIntro() {
    const first = state.day === 1;
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">🌙</div><div class="phase-label">NIGHT ' + state.day + '</div>' +
      '<h2>' + (first ? '첫 번째 밤이 찾아왔습니다' : '다시 밤이 찾아왔습니다') + '</h2>' +
      '<p>지금부터 살아 있는 모든 플레이어가 차례로 휴대폰을 받습니다.<br>행동이 없는 시민도 똑같이 자신의 밤 차례를 확인해요.</p>' +
      '<div class="status-row"><span class="pill">생존 <b>' + alivePlayers().length + '명</b></span><span class="pill">마피아 수는 비밀</span>' + (isClassMode() ? '<span class="pill"><b>학급 빠른 밤</b></span>' : '') + '</div>' +
      '<div class="phase-actions"><button class="primary giant" id="nightStart" type="button">밤 시작</button></div>' +
      '</section></div>'
    );
    document.getElementById('nightStart').addEventListener('click', beginNight);
  }

  function beginNight() {
    state.nightOrder = alivePlayers().sort((a, b) => a.seat - b.seat).map(p => p.id);
    state.turnIndex = 0;
    state.nightActions = {
      mafiaVotes: [],
      protectId: null,
      investigations: []
    };
    state.phase = 'night_handoff';
    state.deadline = null;
    persist();
    cue('night');
    render();
  }

  function currentNightPlayer() {
    return playerById(state.nightOrder[state.turnIndex]);
  }

  function renderNightHandoff() {
    const p = currentNightPlayer();
    if (!p) return resolveNight();
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">📱</div><div class="phase-label">NIGHT ' + state.day + ' · ' + (state.turnIndex + 1) + '/' + state.nightOrder.length + '</div>' +
      '<h2>' + escapeHtml(p.name) + '에게 넘겨주세요</h2>' +
      '<p>' + (isClassMode() ? '이름만 확인하고 바로 개인 밤 차례로 들어갑니다.' : '이 화면에는 역할이나 행동 여부가 표시되지 않습니다.<br><b>' + escapeHtml(p.name) + '</b>만 다음 버튼을 눌러 주세요.') + '</p>' +
      '<div class="' + (isClassMode() ? 'fast-pass' : 'privacy-shield') + '">🔒 역할과 행동 여부는 다른 사람에게 보이지 않습니다.</div>' +
      '<div class="phase-actions"><button class="primary giant" id="nightPrivate" type="button">내 밤 차례 시작</button></div>' +
      '</section></div>'
    );
    document.getElementById('nightPrivate').addEventListener('click', () => {
      state.phase = 'night_action';
      persist();
      render();
    });
  }

  function candidateButtons(players, selectedId, extraText) {
    return '<div class="player-grid ' + (isClassMode() ? 'class-mode-grid' : '') + '">' + players.map(p =>
      '<button class="player-btn ' + (p.id === selectedId ? 'selected' : '') + '" type="button" data-target="' + p.id + '">' +
      escapeHtml(p.name) + (extraText ? '<small>' + escapeHtml(extraText(p)) + '</small>' : '') + '</button>'
    ).join('') + '</div>';
  }

  function renderNightAction() {
    const p = currentNightPlayer();
    if (!p || !p.alive) {
      state.phase = 'night_handoff';
      persist();
      return render();
    }
    const meta = roleMeta(p.role);

    if (p.role === 'citizen') {
      setScreen(
        '<div class="phase-wrap"><section class="phase-card">' +
        '<div class="pass-name">' + escapeHtml(p.name) + '의 밤</div><div class="phase-icon">😴</div>' +
        '<h2>' + (isClassMode() ? '시민 · 행동 없음' : '오늘 밤은 조용합니다') + '</h2><p>' + (isClassMode() ? '특별한 밤 행동이 없습니다. 바로 다음 사람에게 넘겨주세요.' : '당신은 <b>시민</b>입니다. 특별한 밤 행동은 없어요.<br>아침까지 누구도 믿지 마세요.') + '</p>' +
        '<div class="phase-actions"><button class="primary" id="nightDone" type="button">' + (isClassMode() ? '확인 · 다음 사람' : '밤 행동 완료') + '</button></div>' +
        '</section></div>'
      );
      document.getElementById('nightDone').addEventListener('click', finishNightTurn);
      return;
    }

    if (p.role === 'mafia') return renderMafiaAction(p, meta);
    if (p.role === 'doctor') return renderDoctorAction(p, meta);
    if (p.role === 'detective') return renderDetectiveAction(p, meta);
  }

  function renderMafiaAction(p) {
    const candidates = alivePlayers().filter(x => x.team !== 'mafia');
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="pass-name">' + escapeHtml(p.name) + '의 밤</div><div class="phase-icon">🔪</div>' +
      '<div class="phase-label">마피아 행동</div><h2>오늘의 표적을 고르세요</h2>' +
      '<p>마피아가 여러 명이면 각자 고른 표를 합산해 가장 많은 표를 받은 한 명을 공격합니다.</p>' +
      candidateButtons(candidates, null) +
      '<div class="phase-actions"><button class="danger" id="confirmTarget" type="button" disabled>표적 확정</button></div>' +
      '</section></div>'
    );
    let selected = null;
    document.querySelectorAll('[data-target]').forEach(btn => btn.addEventListener('click', () => {
      selected = btn.dataset.target;
      document.querySelectorAll('[data-target]').forEach(x => x.classList.toggle('selected', x === btn));
      document.getElementById('confirmTarget').disabled = false;
      cue('vote');
    }));
    document.getElementById('confirmTarget').addEventListener('click', () => {
      state.nightActions.mafiaVotes.push({ voterId: p.id, targetId: selected });
      persist();
      finishNightTurn();
    });
  }

  function renderDoctorAction(p) {
    const blockSelf = !state.settings.allowConsecutiveSelfHeal && state.previousProtectId === p.id;
    const candidates = alivePlayers().filter(x => !(blockSelf && x.id === p.id));
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="pass-name">' + escapeHtml(p.name) + '의 밤</div><div class="phase-icon">💉</div>' +
      '<div class="phase-label">의사 행동</div><h2>한 명을 보호하세요</h2>' +
      '<p>' + (blockSelf ? '지난밤 자신을 보호했기 때문에 이번 밤에는 다른 사람을 보호해야 해요.' : '오늘 밤 마피아의 공격을 막고 싶은 한 명을 고르세요.') + '</p>' +
      candidateButtons(candidates, null) +
      '<div class="phase-actions"><button class="primary" id="confirmProtect" type="button" disabled>보호 대상 확정</button></div>' +
      '</section></div>'
    );
    let selected = null;
    document.querySelectorAll('[data-target]').forEach(btn => btn.addEventListener('click', () => {
      selected = btn.dataset.target;
      document.querySelectorAll('[data-target]').forEach(x => x.classList.toggle('selected', x === btn));
      document.getElementById('confirmProtect').disabled = false;
      cue('vote');
    }));
    document.getElementById('confirmProtect').addEventListener('click', () => {
      state.nightActions.protectId = selected;
      persist();
      finishNightTurn();
    });
  }

  function renderDetectiveAction(p) {
    const candidates = alivePlayers().filter(x => x.id !== p.id);
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="pass-name">' + escapeHtml(p.name) + '의 밤</div><div class="phase-icon">🔍</div>' +
      '<div class="phase-label">경찰 행동</div><h2>조사할 사람을 고르세요</h2>' +
      '<p>조사하면 그 사람이 마피아인지 아닌지만 알 수 있습니다.</p>' +
      candidateButtons(candidates, null) +
      '<div class="phase-actions"><button class="primary" id="confirmInvestigate" type="button" disabled>조사하기</button></div>' +
      '</section></div>'
    );
    let selected = null;
    document.querySelectorAll('[data-target]').forEach(btn => btn.addEventListener('click', () => {
      selected = btn.dataset.target;
      document.querySelectorAll('[data-target]').forEach(x => x.classList.toggle('selected', x === btn));
      document.getElementById('confirmInvestigate').disabled = false;
      cue('vote');
    }));
    document.getElementById('confirmInvestigate').addEventListener('click', () => showInvestigationResult(p, selected));
  }

  function showInvestigationResult(p, targetId) {
    const target = playerById(targetId);
    if (!target) return;
    const result = {
      detectiveId: p.id,
      targetId: target.id,
      isMafia: target.team === 'mafia',
      day: state.day
    };
    state.nightActions.investigations.push(result);
    state.pendingInvestigation = result;
    state.phase = 'detective_result';
    persist();
    render();
  }

  function renderDetectiveResult() {
    const p = currentNightPlayer();
    const result = state.pendingInvestigation;
    const target = result ? playerById(result.targetId) : null;
    if (!p || !target || !result || result.detectiveId !== p.id || result.day !== state.day) {
      state.pendingInvestigation = null;
      state.phase = 'night_action';
      persist();
      return render();
    }
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="pass-name">' + escapeHtml(p.name) + '만 확인</div><div class="phase-icon">🔍</div>' +
      '<h2>조사 결과가 나왔습니다</h2><p>주변 사람이 보지 못하도록 아래 버튼을 길게 누르세요.</p>' +
      '<button class="hold-btn" id="holdResult" type="button">👆 길게 눌러 조사 결과 보기</button>' +
      '<div class="secret-card hidden" id="investigationSecret">' +
        '<div class="role-emoji">' + (target.team === 'mafia' ? '🚨' : '✅') + '</div>' +
        '<h3>' + escapeHtml(target.name) + '</h3>' +
        '<p class="' + (target.team === 'mafia' ? 'death-name' : 'safe-name') + '">' + (target.team === 'mafia' ? '마피아입니다' : '마피아가 아닙니다') + '</p>' +
      '</div>' +
      '<div class="phase-actions"><button class="primary" id="investigationDone" type="button" disabled>결과 확인 완료</button></div>' +
      '</section></div>'
    );
    const done = document.getElementById('investigationDone');
    attachHold(document.getElementById('holdResult'), document.getElementById('investigationSecret'), () => {
      done.disabled = false;
      cue(target.team === 'mafia' ? 'danger' : 'safe');
    });
    done.addEventListener('click', finishNightTurn);
  }

  function finishNightTurn() {
    state.pendingInvestigation = null;
    state.turnIndex += 1;
    if (state.turnIndex >= state.nightOrder.length) {
      resolveNight();
      return;
    }
    state.phase = 'night_handoff';
    persist();
    render();
  }

  function pluralityTarget(votes) {
    if (!votes.length) return null;
    const count = new Map();
    votes.forEach(v => count.set(v.targetId, (count.get(v.targetId) || 0) + 1));
    let max = 0;
    let top = [];
    count.forEach((value, key) => {
      if (value > max) {
        max = value;
        top = [key];
      } else if (value === max) {
        top.push(key);
      }
    });
    return top[Math.floor(Math.random() * top.length)] || null;
  }

  function resolveNight() {
    const attackedId = pluralityTarget(state.nightActions ? state.nightActions.mafiaVotes : []);
    const protectId = state.nightActions ? state.nightActions.protectId : null;
    const saved = Boolean(attackedId && protectId && attackedId === protectId);
    let killedId = null;
    if (attackedId && !saved) {
      const target = playerById(attackedId);
      if (target && target.alive) {
        target.alive = false;
        killedId = target.id;
      }
    }
    state.previousProtectId = protectId || null;
    state.lastNight = { day: state.day, attackedId, protectId, saved, killedId };
    state.pendingWinner = checkWinner();
    state.phase = 'dawn';
    state.deadline = null;
    persist();
    cue(killedId ? 'danger' : 'safe');
    render();
  }

  function deathRoleText(player) {
    if (!player || !state.settings.revealDeath) return '';
    const meta = roleMeta(player.role);
    return '<div class="pill">역할 공개 · <b>' + meta.emoji + ' ' + escapeHtml(meta.name) + '</b></div>';
  }

  function renderDawn() {
    const result = state.lastNight || {};
    const dead = result.killedId ? playerById(result.killedId) : null;
    let outcome;
    if (dead) {
      outcome = '<div class="death-name">' + escapeHtml(dead.name) + '</div><p>지난밤 마피아의 공격으로 사망했습니다.</p>' + deathRoleText(dead);
    } else if (result.attackedId && result.saved) {
      outcome = '<div class="safe-name">아무도 죽지 않았습니다</div><p>누군가 공격받았지만 살아남았습니다.</p>';
    } else {
      outcome = '<div class="safe-name">조용한 밤이었습니다</div><p>오늘 아침에는 사망자가 없습니다.</p>';
    }
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">🌅</div><div class="phase-label">DAY ' + state.day + '</div><h2>아침이 밝았습니다</h2>' +
      '<div class="big-result">' + outcome + '</div>' +
      '<div class="status-row"><span class="pill">생존 <b>' + alivePlayers().length + '명</b></span></div>' +
      '<div class="phase-actions"><button class="primary giant" id="dawnNext" type="button">' + (state.pendingWinner ? '결과 확인' : '낮 토론 시작') + '</button></div>' +
      '</section></div>'
    );
    document.getElementById('dawnNext').addEventListener('click', () => {
      if (state.pendingWinner) {
        finishGame(state.pendingWinner);
      } else {
        beginDiscussion();
      }
    });
  }

  function beginDiscussion() {
    state.phase = 'discussion';
    state.deadline = Date.now() + state.settings.discussionSeconds * 1000;
    persist();
    render();
  }

  function formatTime(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function runTimer(onEnd) {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;
    let ended = false;
    const tick = () => {
      const left = Math.max(0, (state.deadline || Date.now()) - Date.now());
      timerEl.textContent = formatTime(left);
      timerEl.classList.toggle('warn', left <= 15000);
      if (left <= 0 && !ended) {
        ended = true;
        stopTimer();
        onEnd();
      }
    };
    tick();
    timerHandle = setInterval(tick, 250);
  }

  function stopTimer() {
    clearInterval(timerHandle);
    timerHandle = null;
  }

  function renderDiscussion() {
    if (!state.deadline) state.deadline = Date.now() + state.settings.discussionSeconds * 1000;
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">☀️</div><div class="phase-label">DAY ' + state.day + ' · 토론</div>' +
      '<h2>마피아를 찾아내세요</h2><p>' + (isClassMode() ? '학급 전체가 토론한 뒤 공개적으로 최종 후보 2명을 정합니다. 그 뒤에는 휴대폰을 한 바퀴만 돌려 최종 비밀투표를 합니다.' : '기기는 테이블 가운데 두고 서로의 말을 들어보세요. 밤의 정보는 말로만 설득해야 합니다.') + '</p>' +
      '<div class="timer" id="timer">00:00</div>' +
      '<div class="status-row"><span class="pill">생존 <b>' + alivePlayers().length + '명</b></span><span class="pill">' + (isClassMode() ? '<b>후보 2명 → 1회 비밀투표</b>' : '비밀 지목 예정') + '</span></div>' +
      '<div class="phase-actions"><button class="primary" id="voteNow" type="button">' + (isClassMode() ? '토론 끝내고 후보 2명 정하기' : '토론 끝내고 용의자 지목') + '</button></div>' +
      '</section></div>'
    );
    const next = () => beginNomination(false);
    document.getElementById('voteNow').addEventListener('click', next);
    runTimer(next);
  }

  function beginClassCandidateSelect() {
    stopTimer();
    state.phase = 'class_candidate_select';
    state.classCandidates = [];
    state.classDefenseIndex = 0;
    state.classVotes = {};
    state.deadline = null;
    persist();
    cue('vote');
    render();
  }

  function renderClassCandidateSelect() {
    const alive = alivePlayers().sort((a, b) => a.seat - b.seat);
    const selected = state.classCandidates || [];
    setScreen(
      '<div class="phase-wrap class-mode"><section class="phase-card">' +
      '<div class="phase-icon">🏫</div><div class="phase-label">학급 모드 · 공개 후보 선정</div>' +
      '<h2>최종 후보 2명을 정하세요</h2>' +
      '<p>지금은 비밀투표가 아닙니다. 토론을 바탕으로 학급이 공개적으로 합의한 용의자 두 명을 선택하세요.</p>' +
      '<div class="candidate-pick"><span class="candidate-chip ' + (selected[0] ? 'filled' : '') + '">후보 A · ' + (selected[0] ? escapeHtml(playerById(selected[0])?.name || '') : '선택 전') + '</span>' +
      '<span class="candidate-chip ' + (selected[1] ? 'filled' : '') + '">후보 B · ' + (selected[1] ? escapeHtml(playerById(selected[1])?.name || '') : '선택 전') + '</span></div>' +
      '<div class="class-candidate-grid">' + alive.map(p =>
        '<button class="player-btn ' + (selected.includes(p.id) ? 'selected' : '') + '" type="button" data-class-candidate="' + p.id + '">' + escapeHtml(p.name) + '</button>'
      ).join('') + '</div>' +
      '<div class="phase-actions"><button class="primary giant" id="classCandidatesDone" type="button" ' + (selected.length === 2 ? '' : 'disabled') + '>후보 확정 · 변론 시작</button></div>' +
      '</section></div>'
    );
    document.querySelectorAll('[data-class-candidate]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.classCandidate;
      const current = state.classCandidates || [];
      if (current.includes(id)) {
        state.classCandidates = current.filter(x => x !== id);
      } else if (current.length < 2) {
        state.classCandidates = current.concat(id);
      } else {
        state.classCandidates = [current[1], id];
      }
      persist();
      render();
    }));
    document.getElementById('classCandidatesDone').addEventListener('click', () => {
      if ((state.classCandidates || []).length !== 2) return;
      state.classDefenseIndex = 0;
      state.phase = 'class_defense';
      state.deadline = Date.now() + state.settings.defenseSeconds * 1000;
      persist();
      render();
    });
  }

  function renderClassDefense() {
    const candidates = (state.classCandidates || []).map(playerById).filter(Boolean);
    if (candidates.length !== 2) return beginClassCandidateSelect();
    const index = clamp(Number(state.classDefenseIndex) || 0, 0, 1);
    const candidate = candidates[index];
    if (!state.deadline) state.deadline = Date.now() + state.settings.defenseSeconds * 1000;
    setScreen(
      '<div class="phase-wrap class-mode"><section class="phase-card">' +
      '<div class="phase-icon">🎙️</div><div class="phase-label">학급 모드 · 후보 변론 ' + (index + 1) + '/2</div>' +
      '<h2>' + escapeHtml(candidate.name) + '의 변론</h2>' +
      '<p>후보 한 명씩 짧게 말합니다. 다른 사람은 끼어들지 않고 듣습니다.</p>' +
      '<div class="timer" id="timer">00:00</div>' +
      '<div class="phase-actions"><button class="primary" id="classDefenseNext" type="button">' + (index === 0 ? '다음 후보 변론' : '최종 비밀투표 시작') + '</button></div>' +
      '</section></div>'
    );
    const next = () => {
      stopTimer();
      if (index === 0) {
        state.classDefenseIndex = 1;
        state.deadline = Date.now() + state.settings.defenseSeconds * 1000;
        persist();
        render();
      } else {
        beginClassVote();
      }
    };
    document.getElementById('classDefenseNext').addEventListener('click', next);
    runTimer(next);
  }

  function beginClassVote() {
    stopTimer();
    const excluded = new Set(state.classCandidates || []);
    state.nightOrder = alivePlayers().filter(p => !excluded.has(p.id)).sort((a, b) => a.seat - b.seat).map(p => p.id);
    state.turnIndex = 0;
    state.classVotes = {};
    state.phase = 'class_vote_handoff';
    state.deadline = null;
    persist();
    cue('vote');
    render();
  }

  function renderClassVoteHandoff() {
    const voter = currentVoter();
    const candidates = (state.classCandidates || []).map(playerById).filter(Boolean);
    if (!voter || candidates.length !== 2) return resolveClassVote();
    setScreen(
      '<div class="phase-wrap class-mode"><section class="phase-card">' +
      '<div class="phase-icon">📱</div><div class="phase-label">최종 비밀투표 · ' + (state.turnIndex + 1) + '/' + state.nightOrder.length + '</div>' +
      '<h2>' + escapeHtml(voter.name) + '에게 넘겨주세요</h2>' +
      '<p>후보 두 명 중 한 명을 처형하거나, 둘 다 살릴 수 있습니다.</p>' +
      '<div class="fast-pass">🔒 후보 두 명은 투표에서 빠져 휴대폰 인계 횟수를 줄입니다.</div>' +
      '<div class="phase-actions"><button class="primary giant" id="classVotePrivate" type="button">내 최종투표 시작</button></div>' +
      '</section></div>'
    );
    document.getElementById('classVotePrivate').addEventListener('click', () => {
      state.phase = 'class_vote';
      persist();
      render();
    });
  }

  function renderClassVote() {
    const voter = currentVoter();
    const candidates = (state.classCandidates || []).map(playerById).filter(Boolean);
    if (!voter || candidates.length !== 2) return resolveClassVote();
    setScreen(
      '<div class="phase-wrap class-mode"><section class="phase-card">' +
      '<div class="pass-name">' + escapeHtml(voter.name) + '의 최종 비밀투표</div>' +
      '<div class="phase-icon">⚖️</div><h2>오늘의 결정</h2>' +
      '<p>한 번 선택하면 바꿀 수 없습니다.</p>' +
      '<div class="class-final-grid">' +
        '<button class="candidate-a" type="button" data-class-vote="' + candidates[0].id + '">⚔️<br>' + escapeHtml(candidates[0].name) + '</button>' +
        '<button class="candidate-b" type="button" data-class-vote="' + candidates[1].id + '">⚔️<br>' + escapeHtml(candidates[1].name) + '</button>' +
        '<button class="save-all" type="button" data-class-vote="none">🕊️<br>둘 다 살린다</button>' +
      '</div></section></div>'
    );
    document.querySelectorAll('[data-class-vote]').forEach(btn => btn.addEventListener('click', () => {
      state.classVotes[voter.id] = btn.dataset.classVote;
      state.turnIndex += 1;
      cue('vote');
      if (state.turnIndex >= state.nightOrder.length) resolveClassVote();
      else {
        state.phase = 'class_vote_handoff';
        persist();
        render();
      }
    }, { once: true }));
  }

  function resolveClassVote() {
    const candidates = (state.classCandidates || []).map(playerById).filter(Boolean);
    if (candidates.length !== 2) return beginClassCandidateSelect();
    const counts = { [candidates[0].id]: 0, [candidates[1].id]: 0, none: 0 };
    Object.values(state.classVotes || {}).forEach(value => {
      if (Object.prototype.hasOwnProperty.call(counts, value)) counts[value] += 1;
    });
    const a = counts[candidates[0].id];
    const b = counts[candidates[1].id];
    const none = counts.none;
    let executedId = null;
    if (a > b && a > none) executedId = candidates[0].id;
    if (b > a && b > none) executedId = candidates[1].id;
    const executed = executedId ? playerById(executedId) : null;
    if (executed) executed.alive = false;
    state.lastTrial = {
      classMode: true,
      candidates: candidates.map(p => p.id),
      counts,
      executedId,
      executed: Boolean(executed)
    };
    state.pendingWinner = checkWinner();
    state.phase = 'class_result';
    persist();
    cue(executed ? 'danger' : 'safe');
    render();
  }

  function renderClassResult() {
    const out = state.lastTrial || {};
    const candidates = (out.candidates || state.classCandidates || []).map(playerById).filter(Boolean);
    if (candidates.length !== 2) return beginClassCandidateSelect();
    const executed = out.executedId ? playerById(out.executedId) : null;
    const counts = out.counts || {};
    const a = counts[candidates[0].id] || 0;
    const b = counts[candidates[1].id] || 0;
    const none = counts.none || 0;
    const noExecutionReason = a === b && a >= none
      ? '두 후보가 동률이라 오늘은 아무도 처형하지 않습니다.'
      : '‘둘 다 살린다’가 최다득표이거나 최다득표와 동률이라 오늘은 아무도 처형하지 않습니다.';
    setScreen(
      '<div class="phase-wrap class-mode"><section class="phase-card">' +
      '<div class="phase-icon">' + (executed ? '⚔️' : '🕊️') + '</div><div class="phase-label">학급 모드 · 최종 결과</div>' +
      '<h2>' + (executed ? escapeHtml(executed.name) + ' 처형' : '오늘은 처형 없음') + '</h2>' +
      '<p>' + (executed ? '최종 비밀투표에서 가장 많은 표를 받아 처형되었습니다.' : noExecutionReason) + '</p>' +
      (executed ? deathRoleText(executed) : '') +
      '<div class="result-list">' +
        '<div class="result-row"><span>' + escapeHtml(candidates[0].name) + '</span><strong>' + a + '표</strong></div>' +
        '<div class="result-row"><span>' + escapeHtml(candidates[1].name) + '</span><strong>' + b + '표</strong></div>' +
        '<div class="result-row"><span>둘 다 살린다</span><strong>' + none + '표</strong></div>' +
      '</div>' +
      '<div class="phase-actions"><button class="primary giant" id="afterClassVote" type="button">' + (state.pendingWinner ? '게임 결과 확인' : '다음 밤으로') + '</button></div>' +
      '</section></div>'
    );
    document.getElementById('afterClassVote').addEventListener('click', () => {
      if (state.pendingWinner) {
        finishGame(state.pendingWinner);
      } else {
        state.day += 1;
        state.phase = 'night_intro';
        state.classCandidates = [];
        state.classDefenseIndex = 0;
        state.classVotes = {};
        state.votes = {};
        state.trialVotes = {};
        persist();
        render();
      }
    });
  }

  function beginNomination(runoff) {
    stopTimer();
    if (isClassMode() && !runoff) return beginClassCandidateSelect();
    const alive = alivePlayers().sort((a, b) => a.seat - b.seat);
    state.phase = 'nomination_handoff';
    state.turnIndex = 0;
    state.nightOrder = alive.map(p => p.id);
    state.votes = {};
    state.deadline = null;
    if (!runoff) {
      state.nominationPool = alive.map(p => p.id);
      state.nominationRound = 1;
    }
    persist();
    cue('vote');
    render();
  }

  function currentVoter() {
    return playerById(state.nightOrder[state.turnIndex]);
  }

  function renderNominationHandoff() {
    const voter = currentVoter();
    if (!voter) return resolveNomination();
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">🗳️</div><div class="phase-label">비밀 지목 · ' + (state.turnIndex + 1) + '/' + state.nightOrder.length + '</div>' +
      '<h2>' + escapeHtml(voter.name) + '에게 넘겨주세요</h2><p>누구를 의심하는지는 비밀입니다.<br><b>' + escapeHtml(voter.name) + '</b>만 다음 화면을 확인하세요.</p>' +
      '<div class="privacy-shield">🔒 선택은 결과 집계 전까지 공개되지 않습니다.</div>' +
      '<div class="phase-actions"><button class="primary giant" id="nominationPrivate" type="button">내 투표 시작</button></div>' +
      '</section></div>'
    );
    document.getElementById('nominationPrivate').addEventListener('click', () => {
      state.phase = 'nomination_vote';
      persist();
      render();
    });
  }

  function renderNominationVote() {
    const voter = currentVoter();
    let candidates = (state.nominationPool || []).map(playerById).filter(Boolean).filter(p => p.alive && p.id !== voter.id);
    if (!candidates.length) candidates = alivePlayers().filter(p => p.id !== voter.id);
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="pass-name">' + escapeHtml(voter.name) + '의 비밀 지목</div><div class="phase-icon">🗳️</div>' +
      '<h2>가장 의심되는 사람은?</h2><p>' + (state.nominationRound > 1 ? '동률 후보 중 한 명을 골라 주세요.' : '자신을 제외한 생존자 한 명을 지목하세요.') + '</p>' +
      candidateButtons(candidates, null) +
      '<div class="phase-actions"><button class="primary" id="confirmNomination" type="button" disabled>지목 확정</button></div>' +
      '</section></div>'
    );
    let selected = null;
    document.querySelectorAll('[data-target]').forEach(btn => btn.addEventListener('click', () => {
      selected = btn.dataset.target;
      document.querySelectorAll('[data-target]').forEach(x => x.classList.toggle('selected', x === btn));
      document.getElementById('confirmNomination').disabled = false;
      cue('vote');
    }));
    document.getElementById('confirmNomination').addEventListener('click', () => {
      state.votes[voter.id] = selected;
      state.turnIndex += 1;
      if (state.turnIndex >= state.nightOrder.length) resolveNomination();
      else {
        state.phase = 'nomination_handoff';
        persist();
        render();
      }
    });
  }

  function resolveNomination() {
    const counts = {};
    Object.values(state.votes || {}).forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!rows.length) {
      state.nominationPool = alivePlayers().map(p => p.id);
      state.phase = 'nomination_result';
      state.nominationOutcome = { tie: true, tiedIds: state.nominationPool.slice(), counts: {} };
      persist();
      return render();
    }
    const max = rows[0][1];
    const tiedIds = rows.filter(row => row[1] === max).map(row => row[0]);
    if (tiedIds.length > 1) {
      state.nominationPool = tiedIds;
      state.nominationRound += 1;
      state.nominationOutcome = { tie: true, tiedIds, counts };
      state.phase = 'nomination_result';
    } else {
      state.accusedId = tiedIds[0];
      state.nominationOutcome = { tie: false, accusedId: tiedIds[0], counts };
      state.phase = 'nomination_result';
    }
    persist();
    render();
  }

  function voteCountRows(counts) {
    return Object.entries(counts || {}).sort((a, b) => b[1] - a[1]).map(row => {
      const p = playerById(row[0]);
      return p ? '<div class="result-row"><span>' + escapeHtml(p.name) + '</span><strong>' + row[1] + '표</strong></div>' : '';
    }).join('');
  }

  function renderNominationResult() {
    const out = state.nominationOutcome || { tie: true, tiedIds: state.nominationPool || [], counts: {} };
    if (out.tie) {
      const names = out.tiedIds.map(playerById).filter(Boolean).map(p => p.name);
      setScreen(
        '<div class="phase-wrap"><section class="phase-card">' +
        '<div class="phase-icon">⚖️</div><div class="phase-label">지목 결과</div><h2>동률입니다</h2>' +
        '<p>' + names.map(escapeHtml).join(', ') + '에게 같은 수의 표가 모였습니다.<br>동률 후보만 놓고 다시 비밀 지목합니다.</p>' +
        '<div class="result-list">' + voteCountRows(out.counts) + '</div>' +
        '<div class="phase-actions"><button class="primary giant" id="runoffBtn" type="button">동률 재투표</button></div>' +
        '</section></div>'
      );
      document.getElementById('runoffBtn').addEventListener('click', () => beginNomination(true));
      return;
    }

    const accused = playerById(out.accusedId);
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">👉</div><div class="phase-label">지목 결과</div><h2>' + escapeHtml(accused.name) + ' 지목</h2>' +
      '<p>가장 많은 의심을 받았습니다. 이제 최후 변론을 들은 뒤 실제 처형 여부를 찬반으로 결정합니다.</p>' +
      '<div class="result-list">' + voteCountRows(out.counts) + '</div>' +
      '<div class="phase-actions"><button class="primary giant" id="defenseStart" type="button">최후 변론 시작</button></div>' +
      '</section></div>'
    );
    document.getElementById('defenseStart').addEventListener('click', beginDefense);
  }

  function beginDefense() {
    state.phase = 'defense';
    state.deadline = Date.now() + state.settings.defenseSeconds * 1000;
    persist();
    render();
  }

  function renderDefense() {
    const accused = playerById(state.accusedId);
    if (!state.deadline) state.deadline = Date.now() + state.settings.defenseSeconds * 1000;
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">🎙️</div><div class="phase-label">최후 변론</div><h2>' + escapeHtml(accused.name) + '의 변론</h2>' +
      '<p>지목된 사람만 말할 시간입니다. 다른 플레이어는 말을 끊지 말고 들어주세요.</p>' +
      '<div class="timer" id="timer">00:00</div>' +
      '<div class="phase-actions"><button class="primary" id="trialNow" type="button">변론 끝내고 처형 투표</button></div>' +
      '</section></div>'
    );
    const next = beginTrial;
    document.getElementById('trialNow').addEventListener('click', next);
    runTimer(next);
  }

  function beginTrial() {
    stopTimer();
    state.phase = 'trial_handoff';
    state.nightOrder = alivePlayers().filter(p => p.id !== state.accusedId).sort((a, b) => a.seat - b.seat).map(p => p.id);
    state.turnIndex = 0;
    state.trialVotes = {};
    state.deadline = null;
    persist();
    cue('vote');
    render();
  }

  function renderTrialHandoff() {
    const voter = currentVoter();
    const accused = playerById(state.accusedId);
    if (!voter) return resolveTrial();
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">📱</div><div class="phase-label">처형 찬반 · ' + (state.turnIndex + 1) + '/' + state.nightOrder.length + '</div>' +
      '<h2>' + escapeHtml(voter.name) + '에게 넘겨주세요</h2>' +
      '<p><b>' + escapeHtml(accused.name) + '</b>의 처형 여부를 비밀로 결정합니다.<br>지목된 당사자는 투표하지 않습니다.</p>' +
      '<div class="privacy-shield">🔒 찬반 선택은 집계 전까지 공개되지 않습니다.</div>' +
      '<div class="phase-actions"><button class="primary giant" id="trialPrivate" type="button">내 찬반 투표 시작</button></div>' +
      '</section></div>'
    );
    document.getElementById('trialPrivate').addEventListener('click', () => {
      state.phase = 'trial_vote';
      persist();
      render();
    });
  }

  function renderTrialVote() {
    const voter = currentVoter();
    const accused = playerById(state.accusedId);
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="pass-name">' + escapeHtml(voter.name) + '의 비밀 투표</div><div class="phase-icon">⚖️</div>' +
      '<h2>' + escapeHtml(accused.name) + '을(를)<br>처형할까요?</h2><p>한 번 선택하면 바꿀 수 없습니다.</p>' +
      '<div class="vote-buttons"><button class="yes" type="button" data-trial="yes">⚔️<br>처형</button><button class="no" type="button" data-trial="no">🕊️<br>살려둔다</button></div>' +
      '</section></div>'
    );
    document.querySelectorAll('[data-trial]').forEach(btn => btn.addEventListener('click', () => {
      state.trialVotes[voter.id] = btn.dataset.trial;
      state.turnIndex += 1;
      cue('vote');
      if (state.turnIndex >= state.nightOrder.length) resolveTrial();
      else {
        state.phase = 'trial_handoff';
        persist();
        render();
      }
    }, { once: true }));
  }

  function resolveTrial() {
    const values = Object.values(state.trialVotes || {});
    const yes = values.filter(v => v === 'yes').length;
    const no = values.filter(v => v === 'no').length;
    const executed = yes > no;
    const accused = playerById(state.accusedId);
    if (executed && accused) accused.alive = false;
    state.lastTrial = { accusedId: state.accusedId, yes, no, executed };
    state.pendingWinner = checkWinner();
    state.phase = 'trial_result';
    persist();
    cue(executed ? 'danger' : 'safe');
    render();
  }

  function renderTrialResult() {
    const out = state.lastTrial;
    const accused = playerById(out.accusedId);
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">' + (out.executed ? '⚔️' : '🕊️') + '</div><div class="phase-label">재판 결과</div>' +
      '<h2>' + (out.executed ? escapeHtml(accused.name) + ' 처형' : escapeHtml(accused.name) + ' 생존') + '</h2>' +
      '<p>' + (out.executed ? '마을의 결정으로 처형되었습니다.' : '처형 찬성이 과반을 넘지 못해 살아남았습니다.') + '</p>' +
      (out.executed ? deathRoleText(accused) : '') +
      '<div class="status-row"><span class="pill">처형 <b>' + out.yes + '</b></span><span class="pill">살려둔다 <b>' + out.no + '</b></span></div>' +
      '<div class="phase-actions"><button class="primary giant" id="afterTrial" type="button">' + (state.pendingWinner ? '게임 결과 확인' : '다음 밤으로') + '</button></div>' +
      '</section></div>'
    );
    document.getElementById('afterTrial').addEventListener('click', () => {
      if (state.pendingWinner) {
        finishGame(state.pendingWinner);
      } else {
        state.day += 1;
        state.phase = 'night_intro';
        state.accusedId = null;
        state.nominationPool = null;
        state.votes = {};
        state.trialVotes = {};
        persist();
        render();
      }
    });
  }

  function checkWinner() {
    const alive = alivePlayers();
    const mafia = alive.filter(p => p.team === 'mafia').length;
    const town = alive.length - mafia;
    if (mafia === 0) return 'town';
    if (mafia >= town) return 'mafia';
    return null;
  }

  function finishGame(winner) {
    state.pendingWinner = winner;
    state.phase = 'game_over';
    state.deadline = null;
    persist();
    sdkGameOver(winner);
    cue(winner === 'town' ? 'safe' : 'danger');
    render();
  }

  function renderGameOver() {
    const winner = state.pendingWinner || checkWinner() || 'town';
    const townWin = winner === 'town';
    const ordered = state.players.slice().sort((a, b) => a.seat - b.seat);
    setScreen(
      '<div class="phase-wrap"><section class="phase-card">' +
      '<div class="phase-icon">' + (townWin ? '🏘️' : '🔪') + '</div><div class="phase-label">GAME OVER</div>' +
      '<h2>' + (townWin ? '시민 진영 승리!' : '마피아 진영 승리!') + '</h2>' +
      '<p>' + (townWin ? '모든 마피아를 찾아내 마을을 지켰습니다.' : '살아 있는 마피아가 시민 진영과 같은 수 이상이 되어 마을을 장악했습니다.') + '</p>' +
      '<div class="game-over-roles">' + ordered.map(p => {
        const meta = roleMeta(p.role);
        return '<div class="game-over-role ' + (p.alive ? '' : 'dead') + '"><div><b>' + escapeHtml(p.name) + '</b><small>' + (p.alive ? '생존' : '사망') + '</small></div><strong>' + meta.emoji + ' ' + escapeHtml(meta.name) + '</strong></div>';
      }).join('') + '</div>' +
      '<div class="phase-actions"><button class="primary giant" id="rematchBtn" type="button">🔀 같은 멤버로 다시하기</button><button class="secondary" id="setupBtn" type="button">인원·규칙 바꾸기</button></div>' +
      '</section></div>'
    );
    document.getElementById('rematchBtn').addEventListener('click', () => {
      setup.playerCount = state.players.length;
      setup.names = state.players.slice().sort((a, b) => a.seat - b.seat).map(p => p.name);
      setup.mafia = state.players.filter(p => p.role === 'mafia').length;
      setup.detective = state.players.some(p => p.role === 'detective');
      setup.doctor = state.players.some(p => p.role === 'doctor');
      setup.discussionSeconds = state.settings.discussionSeconds;
      setup.defenseSeconds = state.settings.defenseSeconds;
      setup.revealDeath = state.settings.revealDeath;
      setup.allowConsecutiveSelfHeal = state.settings.allowConsecutiveSelfHeal;
      state = null;
      persist();
      startGame();
    });
    document.getElementById('setupBtn').addEventListener('click', () => {
      state = null;
      persist();
      render();
    });
  }

  function endCurrentGame() {
    if (!state) return;
    const ok = window.confirm('현재 게임을 끝내고 설정 화면으로 돌아갈까요? 진행 중인 판은 사라집니다.');
    if (!ok) return;
    stopTimer();
    state = null;
    persist();
    render();
  }

  el.soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    persist();
    updateTopbar();
    if (soundOn) cue('default');
  });
  el.resetBtn.addEventListener('click', endCurrentGame);

  restore();
  updateTopbar();
  render();
})();