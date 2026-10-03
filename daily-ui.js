((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KidscadeDailyUI = Object.freeze(api);
})(root => {
  'use strict';

  let attendancePending = false;

  const dailyApi = context => context?.daily || root?.KidscadeDaily || null;
  const activityApi = context => context?.activity || root?.KidscadeActivity || null;
  const sproutApi = context => context?.sproutPower || root?.KidscadeSproutPower || null;
  const storageApi = context => context?.localStorage || root?.localStorage || null;
  const docApi = context => context?.document || root?.document || null;

  function getDailyRewardKey(context = {}) {
    return dailyApi(context)?.getTodayKey?.() || new Date().toLocaleDateString('ko-KR');
  }

  function isDailyRewardClaimed(context = {}) {
    const daily = dailyApi(context);
    if (daily?.isDailyRewardClaimed) return Boolean(daily.isDailyRewardClaimed());
    try {
      return storageApi(context)?.getItem?.('kidscade_daily_reward_claimed') === getDailyRewardKey(context);
    } catch (_) {
      return false;
    }
  }

  function claimDailyReward(item, context = {}) {
    if (!item || typeof item !== 'object') return { ok:false, reason:'invalid-item' };
    if (isDailyRewardClaimed(context)) {
      context.showToast?.('오늘의 보상은 이미 골랐어요. 내일 다시 받을 수 있어요!');
      return { ok:false, reason:'already-claimed' };
    }

    const amount = Math.max(0, Number(item.amount) || 0);
    let granted = false;
    if (item.rewardType === 'seed') {
      granted = Boolean(context.changeSeeds?.(amount, '', { toast:false }));
      if (granted) context.showToast?.(`${item.name} 선택! 씨앗 ${amount}개를 받았어요.`, true);
    } else if (item.rewardType === 'exp') {
      context.addPetExp?.(amount);
      context.showToast?.(`${item.name} 선택! 쑥쑥이 경험치 +${amount}`);
      granted = true;
    } else {
      granted = Boolean(context.changeSeeds?.(amount, '', { toast:false }));
      if (granted) {
        context.addPetExp?.(10);
        context.showToast?.(`${item.name} 선택! 씨앗 ${amount}개와 성장 경험치를 받았어요.`, true);
      }
    }

    if (!granted) return { ok:false, reason:'grant-failed' };

    const daily = dailyApi(context);
    if (daily?.markDailyRewardClaimed) daily.markDailyRewardClaimed();
    else {
      try { storageApi(context)?.setItem?.('kidscade_daily_reward_claimed', getDailyRewardKey(context)); } catch (_) {}
    }

    activityApi(context)?.record?.('reward', {
      title: '오늘의 보상 수령',
      summary: item.name + (item.rewardType === 'exp' ? ' · 쑥쑥이 경험치 +' : ' · 씨앗 +') + amount,
      place: '키즈케이드 상점',
      dedupeKey: 'daily-reward-' + new Date().toLocaleDateString('sv-SE')
    });

    context.renderShop?.();
    context.updatePetUI?.();
    return { ok:true, amount, rewardType:String(item.rewardType || '') };
  }

  function getMissionState(context = {}) {
    const daily = dailyApi(context);
    if (!daily?.getMissionState) return null;
    return daily.getMissionState(context.categoryNames || {});
  }

  function renderDailyMissions(context = {}) {
    const doc = docApi(context);
    const box = doc?.getElementById?.('sook-mission-list');
    if (!box) return false;
    const state = getMissionState(context);
    if (!state || !Array.isArray(state.missions)) return false;

    box.innerHTML = '';
    state.missions.forEach(mission => {
      const done = Boolean(mission.claimed || mission.progress >= mission.goal);
      const card = doc.createElement('div');
      card.className = `sook-mission-card ${done ? 'done' : ''}`;
      card.innerHTML = `<div class="mission-title">${mission.icon} ${mission.title}</div><div class="mission-desc">${mission.desc}<br>완료 보상: 🌱 ${mission.reward}개</div><div class="mission-progress">${mission.claimed ? '완료!' : `${Math.min(mission.progress, mission.goal)} / ${mission.goal}`}</div>`;
      box.appendChild(card);
    });

    const completed = state.missions.filter(mission => mission.claimed || mission.progress >= mission.goal).length;
    const total = Math.max(1, state.missions.length);
    const sideCount = doc.getElementById('sidebar-mission-count');
    const sideFill = doc.getElementById('sidebar-mission-fill');
    const sideNote = doc.getElementById('sidebar-mission-note');
    if (sideCount) sideCount.textContent = `${completed} / ${state.missions.length}`;
    if (sideFill) sideFill.style.width = `${(completed / total) * 100}%`;
    if (sideNote) sideNote.textContent = completed >= state.missions.length
      ? '오늘의 미션 완료! 멋지게 해냈어요.'
      : `미션 ${state.missions.length - completed}개가 남았어요. 완료하면 씨앗을 받아요.`;
    return true;
  }

  function updateMissionProgress(category, gameId, context = {}) {
    const daily = dailyApi(context);
    if (!daily?.advanceMissions) return { ok:false, completed:[] };
    const completed = daily.advanceMissions(category, context.categoryNames || {}).completed || [];

    completed.forEach(mission => {
      context.changeSeeds?.(mission.reward, '', { toast:false });
      const power = Math.max(5, Math.round(Number(mission.reward || 0) / 5));
      sproutApi(context)?.earn?.(power, '일일 미션 · ' + mission.title);
      context.showToast?.(`${mission.title} 완료! 씨앗 ${mission.reward}개 · 새싹력 +${power}`, true);
      activityApi(context)?.record?.('mission', {
        title: mission.title + ' 완료!',
        summary: '씨앗 +' + mission.reward + ' · 새싹력 +' + power,
        place: '오늘의 미션',
        gameId: gameId || ''
      });
    });

    renderDailyMissions(context);
    return { ok:true, completed };
  }

  function checkAttendance(context = {}) {
    const daily = dailyApi(context);
    if (attendancePending) return { ok:false, reason:'pending' };
    const claimed = daily?.isAttendanceClaimed?.() ?? false;
    if (claimed) return { ok:false, reason:'already-claimed' };

    attendancePending = true;
    try {
      const granted = Boolean(context.changeSeeds?.(30, '오늘의 출석 씨앗', { toast:false }));
      if (!granted) return { ok:false, reason:'grant-failed' };

      context.addPetAffection?.(20);
      daily?.markAttendanceClaimed?.();
      activityApi(context)?.record?.('attendance', {
        title: '오늘의 출석 완료!',
        summary: '씨앗 +30 · 쑥쑥이 친밀도 +20',
        place: '키즈케이드',
        dedupeKey: 'attendance-' + new Date().toLocaleDateString('sv-SE')
      });
      return { ok:true };
    } finally {
      attendancePending = false;
    }
  }

  function isAttendancePending() {
    return attendancePending;
  }

  return Object.freeze({
    getDailyRewardKey,
    isDailyRewardClaimed,
    claimDailyReward,
    getMissionState,
    renderDailyMissions,
    updateMissionProgress,
    checkAttendance,
    isAttendancePending
  });
});
