const test = require('node:test');
const assert = require('node:assert/strict');
const dailyLib = require('../daily-progress.js');

function fakeLocalStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    dump() { return Object.fromEntries(values); }
  };
}

function fakeDate(day = 17) {
  return {
    getDate() { return day; },
    toLocaleDateString(locale) { return locale === 'ko-KR' ? `2026. 9. ${day}.` : `9/${day}/2026`; }
  };
}

const names = { math:'수학·퍼즐', korean:'국어', lang:'외국어·한자', trivia:'상식·생활', music:'음악·예술' };

test('daily mission state initializes on the canonical date and reuses the stored state', () => {
  const storage = fakeLocalStorage();
  const date = fakeDate(17);
  const daily = dailyLib.create({ localStorage: storage, now: () => date });
  const first = daily.getMissionState(names);
  assert.equal(first.date, '2026. 9. 17.');
  assert.equal(first.missions.length, 3);
  assert.equal(first.missions[1].category, 'lang');

  first.missions[0].progress = 1;
  daily.saveMissionState(first);
  assert.equal(daily.getMissionState(names).missions[0].progress, 1);
});

test('mission advancement returns only newly completed rewards and persists progress', () => {
  const storage = fakeLocalStorage();
  const daily = dailyLib.create({ localStorage: storage, now: () => fakeDate(17) });

  const first = daily.advanceMissions('lang', names);
  assert.deepEqual(first.completed.map(m => m.reward), [20, 35]);
  assert.equal(first.state.missions.find(m => m.id === 'play_two').progress, 1);

  const second = daily.advanceMissions('math', names);
  assert.deepEqual(second.completed.map(m => m.reward), [45]);
  assert.ok(second.state.missions.every(m => m.claimed));

  const third = daily.advanceMissions('lang', names);
  assert.equal(third.completed.length, 0);
});

test('a new date replaces yesterday mission state', () => {
  const storage = fakeLocalStorage({
    kidscade_daily_missions: JSON.stringify({ date:'2026. 9. 16.', missions:[{ id:'old' }] })
  });
  const daily = dailyLib.create({ localStorage: storage, now: () => fakeDate(17) });
  const state = daily.getMissionState(names);
  assert.equal(state.date, '2026. 9. 17.');
  assert.equal(state.missions[0].id, 'play_any');
});

test('daily reward claimed state preserves the existing physical key', () => {
  const storage = fakeLocalStorage();
  const daily = dailyLib.create({ localStorage: storage, now: () => fakeDate(17) });
  assert.equal(daily.isDailyRewardClaimed(), false);
  daily.markDailyRewardClaimed();
  assert.equal(daily.isDailyRewardClaimed(), true);
  assert.equal(storage.dump().kidscade_daily_reward_claimed, '2026. 9. 17.');
});

test('attendance recognizes the legacy browser-locale date and writes canonical date', () => {
  const storage = fakeLocalStorage({ kidscade_attendance: '9/17/2026' });
  const daily = dailyLib.create({ localStorage: storage, now: () => fakeDate(17) });
  assert.equal(daily.isAttendanceClaimed(), true);

  const nextStorage = fakeLocalStorage();
  const next = dailyLib.create({ localStorage: nextStorage, now: () => fakeDate(17) });
  next.markAttendanceClaimed();
  assert.equal(nextStorage.dump().kidscade_attendance, '2026. 9. 17.');
});

test('daily state uses KidscadeStorage registered names when available', () => {
  const values = new Map();
  const storageApi = {
    keys: {
      dailyMissions:'kidscade_daily_missions',
      dailyRewardClaimed:'kidscade_daily_reward_claimed',
      attendance:'kidscade_attendance'
    },
    getRaw(name, fallback) { return values.has(name) ? values.get(name) : fallback; },
    setRaw(name, value) { values.set(name, String(value)); return true; },
    getJson(name, fallback) {
      if (!values.has(name)) return fallback;
      try { return JSON.parse(values.get(name)); } catch { return fallback; }
    },
    setJson(name, value) { values.set(name, JSON.stringify(value)); return true; }
  };
  const daily = dailyLib.create({ storageApi, now: () => fakeDate(17) });
  daily.getMissionState(names);
  daily.markDailyRewardClaimed();
  daily.markAttendanceClaimed();
  assert.ok(values.has('dailyMissions'));
  assert.equal(values.get('dailyRewardClaimed'), '2026. 9. 17.');
  assert.equal(values.get('attendance'), '2026. 9. 17.');
});
