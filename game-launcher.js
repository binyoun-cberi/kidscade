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

  function calculateReward(seconds, minRewardSeconds = DEFAULT_MIN_REWARD_SECONDS) {
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
        gainedExp: 0
      };
    }

    const baseSeeds = sessionMin > 0 ? Math.max(5, sessionMin * 5) : 3;
    const baseExp = sessionMin > 0 ? Math.max(8, sessionMin * 10) : 5;

    return {
      eligible: true,
      sessionSec,
      sessionMin,
      durationText,
      baseSeeds,
      baseExp,
      rewardSeeds: baseSeeds,
      gainedExp: baseExp
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
    if (bridge.isLaunchPending?.()) {
      return { handled: true, opened: false, reason: 'launch-pending' };
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
    let activatedSession = null;

    const activate = () => {
      if (activatedSession) return activatedSession;

      const startedAt = finiteNumber(bridge.now?.(), Date.now());

      activatedSession = { id: gameId, category, title, href, startedAt };
      bridge.startSession?.(activatedSession);
      bridge.remember?.(gameId);
      bridge.updateModalTitle?.(`진행 중: ${title}`);
      bridge.afterOpen?.(activatedSession);
      return activatedSession;
    };

    bridge.playSound?.('open');

    if (bridge.deferLaunch === true && typeof bridge.openModal === 'function') {
      bridge.openModal({
        game: game || {
          id: gameId,
          title,
          href,
          category
        },
        href,
        title,
        titleText: `준비: ${title}`,
        onStart: activate,
        startedTitle: () => `진행 중: ${title}`
      });
      return { handled: true, opened: true, pending: true, session: null };
    }

    const session = activate();
    bridge.openModal?.({
      game,
      ...session,
      titleText: `진행 중: ${title}`
    });

    return { handled: true, opened: true, pending: false, session };
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

      reward = calculateReward(sessionSec, bridge.minRewardPlaySec);
      if (reward.eligible) {
        bridge.addCoins?.(reward.rewardSeeds, `게임 도전 · ${reward.durationText}`);
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
