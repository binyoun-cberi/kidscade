const test = require('node:test');
const assert = require('node:assert/strict');
const launcher = require('../game-launcher.js');

function makeClassList(values = []) {
  const set = new Set(values);
  return {
    contains(value) { return set.has(value); }
  };
}

function makeCard({ id = 'demo', category = 'math', title = '데모 게임', href = 'demo.html', disabled = false, ariaDisabled = false } = {}) {
  return {
    dataset: { id, category },
    classList: makeClassList(disabled ? ['disabled'] : []),
    getAttribute(name) {
      return ({ 'data-id': id, 'data-category': category, href, 'aria-disabled': ariaDisabled ? 'true' : '' })[name] || '';
    },
    querySelector(selector) {
      if (selector === '.game-title') return { textContent: title };
      return null;
    }
  };
}

test('reward calculation preserves the 30-second threshold and standard rewards', () => {
  assert.deepEqual(launcher.calculateReward(29, 30), {
    eligible: false,
    sessionSec: 29,
    sessionMin: 0,
    durationText: '29초',
    baseSeeds: 0,
    baseExp: 0,
    rewardSeeds: 0,
    gainedExp: 0
  });

  const short = launcher.calculateReward(30, 30);
  assert.equal(short.rewardSeeds, 3);
  assert.equal(short.gainedExp, 5);
  assert.equal(short.durationText, '30초');

  const long = launcher.calculateReward(120, 30);
  assert.equal(long.baseSeeds, 10);
  assert.equal(long.baseExp, 20);
  assert.equal(long.rewardSeeds, 10);
  assert.equal(long.gainedExp, 20);
});

test('open creates a catalog-driven session, remembers the game and opens the iframe payload', () => {
  const card = makeCard();
  let prevented = false;
  let session = null;
  let remembered = null;
  let modalPayload = null;
  const sounds = [];

  const result = launcher.open({
    target: { classList: makeClassList() },
    preventDefault() { prevented = true; }
  }, card, {
    getGame: () => ({ id: 'demo', title: '카탈로그 데모', href: 'catalog-demo.html', category: 'lang' }),
    getCard: () => card,
    now: () => 1000,
    playSound: sound => sounds.push(sound),
    startSession: value => { session = value; },
    remember: id => { remembered = id; },
    openModal: payload => { modalPayload = payload; }
  });

  assert.equal(prevented, true);
  assert.equal(result.opened, true);
  assert.equal(session.id, 'demo');
  assert.equal(session.category, 'lang');
  assert.equal(session.href, 'catalog-demo.html');
  assert.equal(remembered, 'demo');
  assert.match(modalPayload.titleText, /카탈로그 데모/);
  assert.deepEqual(sounds, ['open']);
});

test('nested favorite or certificate controls never launch the game card', () => {
  const card = makeCard();
  let prevented = false;
  const result = launcher.open({
    target: {
      closest(selector) { return selector.includes('.fav-star') ? { className: 'fav-star' } : null; }
    },
    preventDefault() { prevented = true; }
  }, card);

  assert.equal(result.handled, false);
  assert.equal(result.reason, 'card-action');
  assert.equal(prevented, false);
});

test('open blocks disabled games before opening', () => {
  const card = makeCard({ disabled: true });
  let alertText = '';
  const result = launcher.open({ target: { classList: makeClassList() }, preventDefault() {} }, card, {
    getGame: () => ({ id: 'demo', disabled: true }),
    alert: text => { alertText = text; }
  });

  assert.equal(result.opened, false);
  assert.equal(result.reason, 'disabled');
  assert.match(alertText, /준비 중/);
});

test('open blocks aria-disabled cards and missing hrefs before opening', () => {
  const ariaCard = makeCard({ ariaDisabled: true });
  const disabledResult = launcher.open({ target: { classList: makeClassList() }, preventDefault() {} }, ariaCard, {
    getCard: () => ariaCard
  });
  assert.equal(disabledResult.reason, 'disabled');

  const missingHref = makeCard({ href: '' });
  const missingResult = launcher.open({ target: { classList: makeClassList() }, preventDefault() {} }, missingHref, {
    getCard: () => missingHref
  });
  assert.equal(missingResult.reason, 'missing-href');
});

test('close records reward, pet experience, mission and garden session in one lifecycle', () => {
  const calls = [];
  const result = launcher.close({
    now: () => 121000,
    minRewardPlaySec: 30,
    getSession: () => ({ id: 'demo', category: 'math', startedAt: 1000 }),
    playSound: sound => calls.push(['sound', sound]),
    closeModal: () => calls.push(['modal-close']),
    checkpointPlayTime: at => calls.push(['checkpoint', at]),
    addCoins: (amount, reason) => calls.push(['coins', amount, reason]),
    addPetExp: (amount, category) => calls.push(['exp', amount, category]),
    savePet: () => calls.push(['save-pet']),
    updateMission: (category, id) => calls.push(['mission', category, id]),
    recordGardenSession: payload => calls.push(['garden', payload]),
    resetSession: () => calls.push(['reset']),
    syncBadges: () => calls.push(['badges'])
  });

  assert.equal(result.sessionSec, 120);
  assert.equal(result.reward.rewardSeeds, 10);
  assert.equal(result.reward.gainedExp, 20);
  assert.ok(calls.some(call => call[0] === 'coins' && call[1] === 10));
  assert.ok(calls.some(call => call[0] === 'exp' && call[1] === 20 && call[2] === 'math'));
  assert.ok(calls.some(call => call[0] === 'mission'));
  assert.ok(calls.some(call => call[0] === 'garden' && call[1].seconds === 120));
  assert.ok(calls.some(call => call[0] === 'garden' && Object.hasOwn(call[1], 'title')));
  assert.deepEqual(calls.slice(-2), [['reset'], ['badges']]);
});

test('short close saves time but does not grant reward', () => {
  const calls = [];
  const result = launcher.close({
    now: () => 21000,
    minRewardPlaySec: 30,
    getSession: () => ({ id: 'demo', category: 'math', startedAt: 1000 }),
    closeModal: () => {},
    checkpointPlayTime: () => calls.push('checkpoint'),
    addCoins: () => calls.push('coins'),
    addPetExp: () => calls.push('exp'),
    showToast: text => calls.push(text),
    resetSession: () => calls.push('reset'),
    syncBadges: () => calls.push('badges')
  });

  assert.equal(result.sessionSec, 20);
  assert.equal(result.reward.eligible, false);
  assert.equal(calls.includes('coins'), false);
  assert.equal(calls.includes('exp'), false);
  assert.ok(calls.some(value => typeof value === 'string' && value.includes('20초')));
});

test('close always clears stale session state even when reward persistence throws', () => {
  const calls = [];
  const result = launcher.close({
    now: () => 61000,
    minRewardPlaySec: 30,
    getSession: () => ({ id: 'demo', category: 'math', startedAt: 1000 }),
    closeModal: () => calls.push('modal-close'),
    checkpointPlayTime: () => calls.push('checkpoint'),
    addCoins: () => { throw new Error('storage failed'); },
    showToast: () => calls.push('toast'),
    resetSession: () => calls.push('reset'),
    syncBadges: () => calls.push('badges'),
    afterClose: () => calls.push('after-close')
  });

  assert.equal(result.handled, true);
  assert.ok(result.error instanceof Error);
  assert.deepEqual(calls.slice(-3), ['reset', 'badges', 'after-close']);
});


test('deferred start screen does not start playtime before Start is pressed', () => {
  const card = makeCard();
  let started = 0;
  let remembered = 0;
  let payload = null;

  const result = launcher.open({
    target: { classList: makeClassList() },
    preventDefault() {}
  }, card, {
    deferLaunch: true,
    getGame: () => ({
      id:'demo', title:'데모 게임', href:'demo.html', category:'math',
      input:['touch'], sessionMinutes:5, difficulty:'easy', players:['solo']
    }),
    getCard: () => card,
    now: () => 4000,
    startSession: () => { started++; },
    remember: () => { remembered++; },
    openModal: value => { payload = value; }
  });

  assert.equal(result.opened, true);
  assert.equal(result.pending, true);
  assert.equal(result.session, null);
  assert.equal(started, 0);
  assert.equal(remembered, 0);
  assert.equal(typeof payload.onStart, 'function');

  const session = payload.onStart();
  assert.equal(started, 1);
  assert.equal(remembered, 1);
  assert.equal(session.startedAt, 4000);

  payload.onStart();
  assert.equal(started, 1, 'start callback must be idempotent');
});

test('launcher blocks a second game while the common start screen is pending', () => {
  const result = launcher.open({
    target: { classList: makeClassList() },
    preventDefault() {}
  }, makeCard(), {
    isLaunchPending: () => true
  });
  assert.equal(result.opened, false);
  assert.equal(result.reason, 'launch-pending');
});
