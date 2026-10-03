const test = require('node:test');
const assert = require('node:assert/strict');
const ui = require('../daily-ui.js');

function dailyFixture() {
  let rewardClaimed = false;
  let attendanceClaimed = false;
  const missionState = {
    date: '2026. 10. 3.',
    missions: [
      { id:'play_any', icon:'🎮', title:'첫 게임 도전', desc:'아무 게임이나 1번 플레이하기', goal:1, progress:0, reward:20, type:'any', claimed:false }
    ]
  };
  return {
    getTodayKey: () => '2026. 10. 3.',
    isDailyRewardClaimed: () => rewardClaimed,
    markDailyRewardClaimed: () => { rewardClaimed = true; },
    isAttendanceClaimed: () => attendanceClaimed,
    markAttendanceClaimed: () => { attendanceClaimed = true; },
    getMissionState: () => missionState,
    advanceMissions: () => {
      if (!missionState.missions[0].claimed) {
        missionState.missions[0].progress = 1;
        missionState.missions[0].claimed = true;
        return { state:missionState, completed:[{...missionState.missions[0]}] };
      }
      return { state:missionState, completed:[] };
    }
  };
}

test('daily reward marks the day only after the reward was really granted', () => {
  const daily = dailyFixture();
  const events = [];
  const failed = ui.claimDailyReward(
    { name:'씨앗 주머니', amount:30, rewardType:'seed' },
    { daily, changeSeeds:() => false, showToast:message => events.push(message) }
  );
  assert.equal(failed.ok, false);
  assert.equal(daily.isDailyRewardClaimed(), false);

  const success = ui.claimDailyReward(
    { name:'씨앗 주머니', amount:30, rewardType:'seed' },
    { daily, changeSeeds:() => true, showToast:message => events.push(message) }
  );
  assert.equal(success.ok, true);
  assert.equal(daily.isDailyRewardClaimed(), true);
});

test('mission completion grants seeds and sprout power once through the shared daily state', () => {
  const daily = dailyFixture();
  const seeds = [];
  const power = [];
  const activity = [];
  const first = ui.updateMissionProgress('math', 'demo-game', {
    daily,
    categoryNames:{ math:'수학' },
    changeSeeds:amount => seeds.push(amount),
    sproutPower:{ earn:(amount,reason) => power.push([amount,reason]) },
    activity:{ record:(type,payload) => activity.push([type,payload]) },
    showToast() {}
  });
  assert.equal(first.ok, true);
  assert.equal(first.completed.length, 1);
  assert.deepEqual(seeds, [20]);
  assert.equal(power[0][0], 5);
  assert.equal(activity[0][0], 'mission');

  const second = ui.updateMissionProgress('math', 'demo-game', {
    daily,
    categoryNames:{ math:'수학' },
    changeSeeds:amount => seeds.push(amount),
    sproutPower:{ earn:(amount,reason) => power.push([amount,reason]) },
    showToast() {}
  });
  assert.equal(second.completed.length, 0);
  assert.deepEqual(seeds, [20]);
});

test('attendance cannot award twice after the shared daily state is marked', () => {
  const daily = dailyFixture();
  let seeds = 0;
  let affection = 0;
  const first = ui.checkAttendance({
    daily,
    changeSeeds:amount => { seeds += amount; return true; },
    addPetAffection:amount => { affection += amount; }
  });
  const second = ui.checkAttendance({
    daily,
    changeSeeds:amount => { seeds += amount; return true; },
    addPetAffection:amount => { affection += amount; }
  });
  assert.equal(first.ok, true);
  assert.equal(second.reason, 'already-claimed');
  assert.equal(seeds, 30);
  assert.equal(affection, 20);
});

test('daily mission renderer owns mission cards and sidebar progress', () => {
  const daily = dailyFixture();
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id,
      innerHTML:'',
      textContent:'',
      style:{},
      children:[],
      appendChild(node) { this.children.push(node); }
    });
    return elements.get(id);
  }
  const document = {
    getElementById:id => element(id),
    createElement:() => ({ className:'', innerHTML:'' })
  };

  assert.equal(ui.renderDailyMissions({ daily, document, categoryNames:{} }), true);
  assert.equal(element('sook-mission-list').children.length, 1);
  assert.equal(element('sidebar-mission-count').textContent, '0 / 1');
  assert.equal(element('sidebar-mission-fill').style.width, '0%');
});
