((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KidscadeGameLauncher = Object.freeze(api);
})(() => {
  'use strict';

  const DEFAULT_MIN_REWARD_SECONDS = 30;

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function calculateReward(seconds, hadBonus = false, minRewardSeconds = DEFAULT_MIN_REWARD_SECONDS) {
    const sessionSec = Math.max(0, Math.floor(finiteNumber(seconds)));
    const threshold = Math.max(0, Math.floor(finiteNumber(minRewardSeconds, DEFAULT_MIN_REWARD_SECONDS)));
    const eligible = sessionSec >= threshold;
    const sessionMin = Math.floor(sessionSec / 60);
    const durationText = sessionMin > 0 ? `${sessionMin}분 ${sessionSec % 60}초` : `${sessionSec}초`;

    if (!eligible) {
      return {
        eligible: false,
        sessionSec,
        sessionMin,
        durationText,
        baseSeeds: 0,
        baseExp: 0,
        rewardSeeds: 0,
        gainedExp: 0,
        multiplier: 1
      };
    }

    const baseSeeds = sessionMin > 0 ? Math.max(5, sessionMin * 5) : 3;
    const baseExp = sessionMin > 0 ? Math.max(8, sessionMin * 10) : 5;
    const multiplier = hadBonus ? 2 : 1;

    return {
      eligible: true,
      sessionSec,
      sessionMin,
      durationText,
      baseSeeds,
      baseExp,
      rewardSeeds: baseSeeds * multiplier,
      gainedExp: baseExp * multiplier,
      multiplier
    };
  }

  function getCardValue(card, datasetName, attributeName) {
    return card?.dataset?.[datasetName] || card?.getAttribute?.(attributeName) || '';
  }

  function shouldIgnoreEvent(event) {
    const target = event?.target;
    return Boolean(target?.classList?.contains?.('fav-star') || target?.classList?.contains?.('cert-btn'));
  }

  function open(event, cardElement, bridge = {}) {
    if (shouldIgnoreEvent(event)) return { handled: false, opened: false, reason: 'card-action' };
    event?.preventDefault?.();

    const gameId = String(getCardValue(cardElement, 'id', 'data-id') || '');
    if (!gameId) return { handled: true, opened: false, reason: 'missing-id' };

    const game = bridge.getGame?.(gameId) || null;
    const originCard = bridge.getCard?.(gameId) || cardElement;
    const disabled = Boolean(game?.disabled || originCard?.classList?.contains?.('disabled'));
    if (disabled) {
      bridge.playSound?.('click');
      bridge.alert?.('열심히 준비 중인 게임입니다! 조금만 기다려주세요 😊');
      return { handled: true, opened: false, reason: 'disabled' };
    }

    const hadBonus = Boolean(bridge.consumePlayTicket?.(gameId));
    if (!hadBonus) {
      const recharge = bridge.getNextRechargeMs?.(gameId);
      const rechargeText = bridge.formatRechargeTime?.(recharge);
      bridge.showToast?.(`추천 에너지가 없어도 플레이할 수 있어요. 이번 판은 기본 보상으로 진행됩니다. ${rechargeText || '잠시'} 뒤 보너스 +1`);
    }

    const startedAt = finiteNumber(bridge.now?.(), Date.now());
    const category = String(game?.category || getCardValue(originCard, 'category', 'data-category') || 'all');
    const title = String(game?.title || originCard?.querySelector?.('.game-title')?.textContent || '게임');
    const href = String(game?.href || originCard?.getAttribute?.('href') || '');
    const energyState = bridge.getPlayState?.(gameId) || { plays: 0 };
    const playLimitMax = finiteNumber(bridge.playLimitMax, 0);
    const bonusText = hadBonus
      ? `추천 에너지 보너스 적용 · 남은 보너스 ${finiteNumber(energyState.plays, 0)}/${playLimitMax}`
      : '기본 보상 진행';

    const session = { id: gameId, category, title, href, startedAt, hadBonus };
    bridge.playSound?.('open');
    bridge.startSession?.(session);
    bridge.remember?.(gameId);
    bridge.openModal?.({ ...session, bonusText, titleText: `진행 중: ${title} · ${bonusText}` });

    return { handled: true, opened: true, session };
  }

  function close(bridge = {}) {
    const closedAt = finiteNumber(bridge.now?.(), Date.now());
    const session = bridge.getSession?.() || null;

    bridge.playSound?.('close');
    bridge.closeModal?.();

    if (!session || finiteNumber(session.startedAt) <= 0) {
      bridge.syncBadges?.();
      return { handled: true, sessionSec: 0, reward: null };
    }

    const sessionSec = Math.max(0, Math.floor((closedAt - finiteNumber(session.startedAt)) / 1000));
    bridge.checkpointPlayTime?.(closedAt);

    const reward = calculateReward(sessionSec, Boolean(session.hadBonus), bridge.minRewardPlaySec);
    if (reward.eligible) {
      const reason = session.hadBonus
        ? `추천 에너지 보너스 · ${reward.durationText}`
        : `게임 도전 · ${reward.durationText}`;
      bridge.addCoins?.(reward.rewardSeeds, reason);
      bridge.addPetExp?.(reward.gainedExp, session.category);
      bridge.savePet?.();
      bridge.updateMission?.(session.category, session.id);
      bridge.recordGardenSession?.({
        game: session.id,
        category: session.category,
        seconds: reward.sessionSec
      });
    } else if (sessionSec > 0) {
      bridge.showToast?.(`학습시간 ${sessionSec}초는 저장했어요. 씨앗과 미션은 ${Math.max(0, Math.floor(finiteNumber(bridge.minRewardPlaySec, DEFAULT_MIN_REWARD_SECONDS)))}초 이상 플레이하면 인정돼요.`);
    }

    bridge.resetSession?.();
    bridge.syncBadges?.();
    return { handled: true, sessionSec, reward };
  }

  return Object.freeze({
    DEFAULT_MIN_REWARD_SECONDS,
    calculateReward,
    open,
    close
  });
});
