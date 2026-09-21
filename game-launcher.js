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
    if (!target) return false;
    if (target.closest) return Boolean(target.closest('.fav-star, .cert-btn'));
    return Boolean(target?.classList?.contains?.('fav-star') || target?.classList?.contains?.('cert-btn'));
  }

  function open(event, cardElement, bridge = {}) {
    if (shouldIgnoreEvent(event)) return { handled: false, opened: false, reason: 'card-action' };
    event?.preventDefault?.();

    if (bridge.canLaunch && !bridge.canLaunch(event)) {
      return { handled: true, opened: false, reason: 'navigation-not-ready' };
    }
    if (bridge.getSession?.()?.id) {
      return { handled: true, opened: false, reason: 'session-active' };
    }

    const gameId = String(getCardValue(cardElement, 'id', 'data-id') || '');
    if (!gameId) return { handled: true, opened: false, reason: 'missing-id' };

    const game = bridge.getGame?.(gameId) || null;
    const originCard = bridge.getCard?.(gameId) || cardElement;
    const disabled = Boolean(
      game?.disabled ||
      originCard?.classList?.contains?.('disabled') ||
      originCard?.getAttribute?.('aria-disabled') === 'true'
    );
    if (disabled) {
      bridge.playSound?.('click');
      bridge.alert?.('열심히 준비 중인 게임입니다! 조금만 기다려주세요 😊');
      return { handled: true, opened: false, reason: 'disabled' };
    }

    const href = String(game?.href || originCard?.getAttribute?.('href') || '').trim();
    if (!href || href === '#') {
      bridge.playSound?.('click');
      bridge.alert?.('게임 파일을 찾지 못했습니다. 관리자에게 알려주세요.');
      return { handled: true, opened: false, reason: 'missing-href' };
    }

    const category = String(game?.category || getCardValue(originCard, 'category', 'data-category') || 'all');
    const title = String(game?.title || originCard?.querySelector?.('.game-title')?.textContent || '게임');
    const startedAt = finiteNumber(bridge.now?.(), Date.now());

    const hadBonus = Boolean(bridge.consumePlayTicket?.(gameId));
    if (!hadBonus) {
      const recharge = bridge.getNextRechargeMs?.(gameId);
      const rechargeText = bridge.formatRechargeTime?.(recharge);
      bridge.showToast?.(`추천 에너지가 없어도 플레이할 수 있어요. 이번 판은 기본 보상으로 진행됩니다. ${rechargeText || '잠시'} 뒤 보너스 +1`);
    }

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
    bridge.afterOpen?.(session);

    return { handled: true, opened: true, session };
  }

  function close(bridge = {}) {
    const closedAt = finiteNumber(bridge.now?.(), Date.now());
    const session = bridge.getSession?.() || null;
    let sessionSec = 0;
    let reward = null;

    bridge.playSound?.('close');
    bridge.closeModal?.();

    try {
      if (!session || finiteNumber(session.startedAt) <= 0) {
        return { handled: true, sessionSec: 0, reward: null };
      }

      sessionSec = Math.max(0, Math.floor((closedAt - finiteNumber(session.startedAt)) / 1000));
      bridge.checkpointPlayTime?.(closedAt);

      reward = calculateReward(sessionSec, Boolean(session.hadBonus), bridge.minRewardPlaySec);
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
          title: session.title,
          category: session.category,
          seconds: reward.sessionSec
        });
        if (typeof window !== 'undefined') {
          window.KidscadeServerStats?.recordPlay?.(session.id, reward.sessionSec);
          try {
            window.KidscadeProfileHistory?.recordSession?.({
              id: session.id,
              category: session.category,
              seconds: reward.sessionSec
            });
            window.KidscadeProfileHistory?.renderBrowserUI?.();
          } catch (profileError) {
            console.warn('[KidscadeGameLauncher] local profile history write failed:', profileError);
          }
        }
      } else if (sessionSec > 0) {
        bridge.showToast?.(`학습시간 ${sessionSec}초는 저장했어요. 씨앗과 미션은 ${Math.max(0, Math.floor(finiteNumber(bridge.minRewardPlaySec, DEFAULT_MIN_REWARD_SECONDS)))}초 이상 플레이하면 인정돼요.`);
      }

      return { handled: true, sessionSec, reward };
    } catch (error) {
      console.error('[KidscadeGameLauncher] close lifecycle failed:', error);
      bridge.showToast?.('게임은 닫혔지만 기록 정리 중 문제가 생겼어요. 다음 실행은 정상적으로 시작할 수 있습니다.');
      return { handled: true, sessionSec, reward, error };
    } finally {
      bridge.resetSession?.();
      bridge.syncBadges?.();
      bridge.afterClose?.({ session, sessionSec, reward });
    }
  }

  return Object.freeze({
    DEFAULT_MIN_REWARD_SECONDS,
    calculateReward,
    open,
    close
  });
});
