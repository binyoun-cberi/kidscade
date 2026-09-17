((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const library = factory();

  if (typeof module !== 'undefined' && module.exports) module.exports = library;
  if (!root) return;

  root.KidscadeDaily = Object.freeze(library.create({
    storageApi: root.KidscadeStorage || null,
    localStorage: root.localStorage || null
  }));
})(() => {
  'use strict';

  const DEFAULT_KEYS = Object.freeze({
    missions: 'kidscade_daily_missions',
    rewardClaimed: 'kidscade_daily_reward_claimed',
    attendance: 'kidscade_attendance'
  });
  const MISSION_CATEGORIES = Object.freeze(['math', 'korean', 'lang', 'trivia', 'music']);

  function canonicalDateKey(date = new Date()) {
    return date.toLocaleDateString('ko-KR');
  }

  function legacyLocaleDateKey(date = new Date()) {
    return date.toLocaleDateString();
  }

  function categoryForDate(date = new Date()) {
    const day = Number(date.getDate?.()) || 1;
    return MISSION_CATEGORIES[day % MISSION_CATEGORIES.length];
  }

  function missionTemplate(categoryNames = {}, date = new Date()) {
    const category = categoryForDate(date);
    const label = categoryNames[category] || category;
    return {
      date: canonicalDateKey(date),
      missions: [
        { id: 'play_any', icon: '🎮', title: '첫 게임 도전', desc: '아무 게임이나 1번 플레이하기', goal: 1, progress: 0, reward: 20, type: 'any', claimed: false },
        { id: 'play_category', icon: '🧭', title: `${label} 탐험`, desc: `${label} 게임 1번 플레이하기`, goal: 1, progress: 0, reward: 35, type: 'category', category, claimed: false },
        { id: 'play_two', icon: '🔥', title: '두 번의 도전', desc: '오늘 게임을 총 2번 플레이하기', goal: 2, progress: 0, reward: 45, type: 'count', claimed: false }
      ]
    };
  }

  function create(options = {}) {
    const storageApi = options.storageApi || null;
    const local = options.localStorage || null;
    const now = typeof options.now === 'function' ? options.now : () => new Date();
    const keys = Object.freeze({
      missions: storageApi?.keys?.dailyMissions || DEFAULT_KEYS.missions,
      rewardClaimed: storageApi?.keys?.dailyRewardClaimed || DEFAULT_KEYS.rewardClaimed,
      attendance: storageApi?.keys?.attendance || DEFAULT_KEYS.attendance
    });

    function getRaw(name, physicalKey, fallback = null) {
      if (storageApi?.getRaw) return storageApi.getRaw(name, fallback);
      const value = local?.getItem?.(physicalKey);
      return value === null || value === undefined ? fallback : value;
    }

    function setRaw(name, physicalKey, value) {
      if (storageApi?.setRaw) return storageApi.setRaw(name, value);
      local?.setItem?.(physicalKey, String(value));
      return true;
    }

    function getJson(name, physicalKey, fallback) {
      if (storageApi?.getJson) return storageApi.getJson(name, fallback);
      const raw = getRaw(name, physicalKey, null);
      if (raw === null) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
      } catch (_) {
        return fallback;
      }
    }

    function setJson(name, physicalKey, value) {
      if (storageApi?.setJson) return storageApi.setJson(name, value);
      return setRaw(name, physicalKey, JSON.stringify(value));
    }

    function getTodayKey(date = now()) {
      return canonicalDateKey(date);
    }

    function buildMissionState(categoryNames = {}, date = now()) {
      return missionTemplate(categoryNames, date);
    }

    function getMissionState(categoryNames = {}, date = now()) {
      const today = canonicalDateKey(date);
      let state = getJson('dailyMissions', keys.missions, null);
      if (!state || state.date !== today || !Array.isArray(state.missions)) {
        state = buildMissionState(categoryNames, date);
        setJson('dailyMissions', keys.missions, state);
      }
      return state;
    }

    function saveMissionState(state) {
      if (!state || !Array.isArray(state.missions)) return false;
      return setJson('dailyMissions', keys.missions, state);
    }

    function advanceMissions(category, categoryNames = {}, date = now()) {
      const state = getMissionState(categoryNames, date);
      const completed = [];
      state.missions.forEach(mission => {
        if (!mission || mission.claimed) return;
        if (mission.type === 'any' || mission.type === 'count') mission.progress = (Number(mission.progress) || 0) + 1;
        if (mission.type === 'category' && mission.category === category) mission.progress = (Number(mission.progress) || 0) + 1;
        const goal = Math.max(0, Number(mission.goal) || 0);
        if (goal > 0 && mission.progress >= goal) {
          mission.progress = goal;
          mission.claimed = true;
          completed.push({ ...mission });
        }
      });
      saveMissionState(state);
      return { state, completed };
    }

    function isDailyRewardClaimed(date = now()) {
      return getRaw('dailyRewardClaimed', keys.rewardClaimed, '') === canonicalDateKey(date);
    }

    function markDailyRewardClaimed(date = now()) {
      return setRaw('dailyRewardClaimed', keys.rewardClaimed, canonicalDateKey(date));
    }

    function isAttendanceClaimed(date = now()) {
      const stored = String(getRaw('attendance', keys.attendance, '') || '');
      if (!stored) return false;
      const canonical = canonicalDateKey(date);
      const legacy = legacyLocaleDateKey(date);
      return stored === canonical || stored === legacy;
    }

    function markAttendanceClaimed(date = now()) {
      return setRaw('attendance', keys.attendance, canonicalDateKey(date));
    }

    return Object.freeze({
      keys,
      getTodayKey,
      buildMissionState,
      getMissionState,
      saveMissionState,
      advanceMissions,
      isDailyRewardClaimed,
      markDailyRewardClaimed,
      isAttendanceClaimed,
      markAttendanceClaimed
    });
  }

  return Object.freeze({
    create,
    canonicalDateKey,
    legacyLocaleDateKey,
    categoryForDate,
    missionTemplate,
    DEFAULT_KEYS,
    MISSION_CATEGORIES
  });
});
