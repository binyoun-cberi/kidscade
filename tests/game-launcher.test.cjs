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

test('reward calculation preserves the existing 30-second threshold and bonus multiplier', () => {
  assert.deepEqual(launcher.calculateReward(29, false, 30), {
    eligible: false,
    sessionSec: 29,
    sessionMin: 0,
    durationText: '29초',
    baseSeeds: 0,
    baseExp: 0,
    rewardSeeds: 0,
    gainedExp: 0,
    multiplier: 1
  });

  const normal = launcher.calculateReward(30, false, 30);
  assert.equal(normal.rewardSeeds, 3);
  assert.equal(normal.gainedExp, 5);
  assert.equal(normal.durationText, '30초');

  const bonus = launcher.calculateReward(120, true, 30);
  assert.equal(bonus.baseSeeds, 10);
  assert.equal(bonus.baseExp, 20);
  assert.equal(bonus.rewardSeeds, 20);
  assert.equal(bonus.gainedExp, 40);
  assert.equal(bonus.multiplier, 2);
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
    consumePlayTicket: () => true,
    now: () => 1000,
    getPlayState: () => ({ plays: 4 }),
    playLimitMax: 5,
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
  assert.equal(session.hadBonus, true);
  assert.equal(remembered, 'demo');
  assert.match(modalPayload.titleText, /카탈로그 데모/);
  assert.match(modalPayload.titleText, /4\/5/);
  assert.deepEqual(sounds, ['open']);
});

test('nested favorite or certificate controls never launch the game card', () => {
  const card = makeCard();
  let consumed = false;
  let prevented = false;
  const result = launcher.open({
    target: {
      closest(selector) { return selector.includes('.fav-star') ? { className: 'fav-star' } : null; }
    },
    preventDefault() { prevented = true; }
  }, card, {
    consumePlayTicket: () => { consumed = true; return true; }
  });

  assert.equal(result.handled, false);
  assert.equal(result.reason, 'card-action');
  assert.equal(prevented, false);
  assert.equal(consumed, false);
});

test('open blocks disabled games without consuming energy', () => {
  const card = makeCard({ disabled: true });
  let consumed = false;
  let alertText = '';
  const result = launcher.open({ target: { classList: makeClassList() }, preventDefault() {} }, card, {
    getGame: () => ({ id: 'demo', disabled: true }),
    consumePlayTicket: () => { consumed = true; return true; },
    alert: text => { alertText = text; }
  });

  assert.equal(result.opened, false);
  assert.equal(result.reason, 'disabled');
  assert.equal(consumed, false);
  assert.match(alertText, /준비 중/);
});

test('open blocks aria-disabled cards and missing hrefs before consuming energy', () => {
  let consumed = 0;
  const ariaCard = makeCard({ ariaDisabled: true });
  const disabledResult = launcher.open({ target: { classList: makeClassList() }, preventDefault() {} }, ariaCard, {
    getCard: () => ariaCard,
    consumePlayTicket: () => { consumed++; return true; }
  });
  assert.equal(disabledResult.reason, 'disabled');

  const missingHref = makeCard({ href: '' });
  const missingResult = launcher.open({ target: { classList: makeClassList() }, preventDefault() {} }, missingHref, {
    getCard: () => missingHref,
    consumePlayTicket: () => { consumed++; return true; }
  });
  assert.equal(missingResult.reason, 'missing-href');
  assert.equal(consumed, 0);
});

test('close records reward, pet experience, mission and garden session in one lifecycle', () => {
  const calls = [];
  const result = launcher.close({
    now: () => 121000,
    minRewardPlaySec: 30,
    getSession: () => ({ id: 'demo', category: 'math', startedAt: 1000, hadBonus: true }),
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
  assert.equal(result.reward.rewardSeeds, 20);
  assert.equal(result.reward.gainedExp, 40);
  assert.ok(calls.some(call => call[0] === 'coins' && call[1] === 20));
  assert.ok(calls.some(call => call[0] === 'exp' && call[1] === 40 && call[2] === 'math'));
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
    getSession: () => ({ id: 'demo', category: 'math', startedAt: 1000, hadBonus: false }),
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
    getSession: () => ({ id: 'demo', category: 'math', startedAt: 1000, hadBonus: false }),
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
