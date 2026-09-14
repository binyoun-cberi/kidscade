(()=>{
  'use strict';

  // 메인 화면의 기록 표시는 이 파일에서 한 번에 정리합니다.
  // 각 게임의 기존 localStorage 저장 방식은 그대로 두고, 화면에 보여줄 의미/단위만 통일합니다.
  const OVERRIDES = {
    // 목표가 100%로 고정된 진행도이므로 최고점수 경쟁으로 표시하지 않음.
    sim_mosquito: { hidden: true },
    // 열린 스테이지 번호를 저장하는 진행도 값이므로 최고점수로 표시하지 않음.
    lab_water_sort: { hidden: true },

    // 기존 메인 설정 오류/단위 보정.
    high_kite_wind_rider: { key: 'kite3d_best', type: 'meters', icon: '🪁' },
    low_rubiks_cube: { key: 'cubeMasterDX_best_3', type: 'timeMs' },
    tod_puzzle_time: { key: 'puzzleBestTime', type: 'timeMs' },
    jineung_bird: { key: 'calcBird_best_normal', type: 'seconds1' },

    // 숫자는 맞지만 의미가 '점수'가 아닌 기록들.
    patience_tower: { key: 'patienceTowerBestM', type: 'meters', icon: '🗼' },
    kor_typing_tadak: { key: 'tadak_bestSpeed2', type: 'typing', icon: '⌨️' },
    tod_symbol_duel: { key: 'symbolDuelBestStreak', type: 'streak' },
    geo_exorcist: { key: 'geomatch_max_combo', type: 'combo' },
    school_tower: { key: 'arithmeticSpireBest_v1', type: 'floor', icon: '🏰' },

    // JSON으로 저장되는 한국사 솔리테어 기록.
    high_history_match: {
      key: 'historyMatchHS',
      type: 'score',
      read(raw){
        try {
          const parsed = JSON.parse(raw);
          return Math.max(Number(parsed.figures) || 0, Number(parsed.events) || 0);
        } catch (_) {
          return 0;
        }
      }
    }
  };

  function numberText(value, decimals = 0){
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatSeconds(value){
    const total = Math.max(0, Math.floor(Number(value) || 0));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function formatMilliseconds(value){
    const ms = Math.max(0, Math.floor(Number(value) || 0));
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }

  function getPolicy(card){
    const id = card.dataset.id || '';
    const override = OVERRIDES[id] || {};
    if (override.hidden) return { hidden: true };

    const key = override.key || card.dataset.scorekey;
    if (!key) return null;

    let type = override.type;
    if (!type) {
      if (card.dataset.istime === 'true') type = 'timeSeconds';
      else if (card.dataset.scoreunit === 'm') type = 'meters';
      else type = 'score';
    }

    return { ...override, key, type };
  }

  function readValue(policy){
    let raw;
    try { raw = localStorage.getItem(policy.key); }
    catch (_) { return 0; }
    if (raw == null || raw === '') return 0;
    if (typeof policy.read === 'function') return policy.read(raw);
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  function badgeText(policy, value){
    const icon = policy.icon || '🏆';
    switch (policy.type) {
      case 'timeMs':
        return `⏱️ 최고 ${formatMilliseconds(value)}`;
      case 'timeSeconds':
        return `⏱️ 최고 ${formatSeconds(value)}`;
      case 'seconds1':
        return `⏱️ 최고 ${numberText(value, 1)}초`;
      case 'meters':
        return `${icon} 최고 ${numberText(value)}m`;
      case 'typing':
        return `${icon} 최고 ${numberText(value)}타/분`;
      case 'streak':
        return `🔥 최고 ${numberText(value)}연승`;
      case 'combo':
        return `🔥 최고 콤보 ${numberText(value)}`;
      case 'floor':
        return `${icon} 최고 ${numberText(value)}층`;
      case 'percent':
        return `${icon} 최고 ${numberText(value)}%`;
      case 'score':
      default:
        return `${icon} 최고 ${numberText(value)}점`;
    }
  }

  function ensureContainer(card){
    let container = card.querySelector('.badge-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'badge-container';
      card.appendChild(container);
    }
    return container;
  }

  function syncCard(card){
    const policy = getPolicy(card);
    const old = card.querySelector('.badge-score');

    if (!policy || policy.hidden) {
      if (old) old.remove();
      const container = card.querySelector('.badge-container');
      if (container && !container.children.length) container.remove();
      return;
    }

    const value = readValue(policy);
    if (!(value > 0)) {
      if (old) old.remove();
      return;
    }

    const container = ensureContainer(card);
    const badge = old || document.createElement('div');
    badge.className = 'badge badge-score';
    badge.dataset.normalizedScore = 'true';
    badge.textContent = badgeText(policy, value);

    const certButton = container.querySelector('.cert-btn');
    if (!old) container.insertBefore(badge, certButton || null);
  }

  function syncAll(){
    document.querySelectorAll('.game-card').forEach(syncCard);
  }

  function scheduleSync(){
    requestAnimationFrame(()=>requestAnimationFrame(syncAll));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
  } else {
    scheduleSync();
  }

  // 게임에서 뒤로 돌아오거나 탭이 다시 활성화됐을 때 갱신.
  window.addEventListener('pageshow', scheduleSync);
  window.addEventListener('focus', scheduleSync);
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'visible') scheduleSync();
  });

  // 개발 중 콘솔에서 즉시 다시 맞출 수 있도록 최소 API만 공개.
  window.KidscadeScoreDisplay = Object.freeze({ sync: syncAll });
})();