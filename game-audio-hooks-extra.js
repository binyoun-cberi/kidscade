(() => {
  'use strict';
  if (window.__kidscadeAudioExtraHooksV1) return;
  window.__kidscadeAudioExtraHooksV1 = true;

  const title = document.title || '';
  const path = (() => { try { return decodeURIComponent(location.pathname); } catch (_) { return location.pathname || ''; } })();
  const audio = () => window.KidscadeAudio;
  let soundAllowed = () => true;

  const play = (key, options = {}) => {
    if (!soundAllowed()) return;
    return audio()?.play?.(key, options)?.catch?.(() => {});
  };
  const playAny = (keys, options = {}) => {
    if (!soundAllowed()) return;
    return audio()?.playAny?.(keys, options)?.catch?.(() => {});
  };
  const preload = keys => audio()?.preload?.(keys)?.catch?.(() => {});

  function waitFor(selector, callback, timeout = 7000) {
    const started = performance.now();
    const check = () => {
      const node = document.querySelector(selector);
      if (node) return callback(node);
      if (performance.now() - started < timeout) requestAnimationFrame(check);
    };
    check();
  }

  function observe(node, callback, options = { childList: true, characterData: true, subtree: true, attributes: true }) {
    if (!node) return null;
    const observer = new MutationObserver(() => callback(node));
    observer.observe(node, options);
    return observer;
  }

  function parseFirstNumber(text, fallback = 0) {
    const match = String(text || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : fallback;
  }

  function setupAlienPizza() {
    soundAllowed = () => !(document.getElementById('sound-btn')?.textContent || '').includes('🔇');
    preload([
      'combat.projectile_whoosh',
      'collect.coin_drop',
      'success.cheer_yay',
      'success.victory_fanfare',
      'failure.fail_sting',
      'shop.purchase'
    ]);

    waitFor('#toast', toast => {
      let last = '';
      const react = () => {
        if (!toast.classList.contains('show')) return;
        const text = toast.textContent.trim();
        const token = `${text}|${toast.className}`;
        if (!text || token === last) return;
        last = token;
        setTimeout(() => { if (last === token) last = ''; }, 350);

        if (toast.classList.contains('error')) {
          play('failure.fail_sting', { volume: 0.32, cooldownMs: 250 });
        } else if (text.includes('구매 완료')) {
          play('shop.purchase', { volume: 0.38, cooldownMs: 250 });
        } else if (text.includes('등분했어요')) {
          play('combat.projectile_whoosh', { volume: 0.25, rateJitter: 0.05, cooldownMs: 120 });
        }
      };
      observe(toast, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#modal-result', modal => {
      let wasActive = modal.classList.contains('active');
      observe(modal, () => {
        const active = modal.classList.contains('active');
        if (!wasActive && active) {
          play('success.cheer_yay', { volume: 0.35, cooldownMs: 700 });
          setTimeout(() => play('collect.coin_drop', { volume: 0.31, rate: 1.04, cooldownMs: 500 }), 90);
        }
        wasActive = active;
      }, { attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#modal-day', modal => {
      let wasActive = modal.classList.contains('active');
      observe(modal, () => {
        const active = modal.classList.contains('active');
        if (!wasActive && active) play('success.victory_fanfare', { volume: 0.40, cooldownMs: 1500 });
        wasActive = active;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupStationeryBoss() {
    preload(['success.cheer_yay', 'success.victory_fanfare', 'failure.fail_sting', 'shop.register_open']);

    waitFor('#feedback', feedback => {
      let wasOpen = feedback.classList.contains('show');
      let lastTitle = '';
      const react = () => {
        const open = feedback.classList.contains('show');
        const feedbackTitle = document.getElementById('feedbackTitle')?.textContent?.trim() || '';
        if (open && (!wasOpen || feedbackTitle !== lastTitle)) {
          if (feedbackTitle.includes('완벽한 계산')) {
            play('success.cheer_yay', { volume: 0.36, cooldownMs: 500 });
            setTimeout(() => play('shop.register_open', { volume: 0.29, cooldownMs: 500 }), 110);
          } else if (feedbackTitle.includes('달라요') || feedbackTitle.includes('다시 계산')) {
            play('failure.fail_sting', { volume: 0.34, cooldownMs: 450 });
          }
          lastTitle = feedbackTitle;
        }
        wasOpen = open;
      };
      observe(feedback, react, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    });

    waitFor('#endScreen', end => {
      let shown = end.style.display === 'grid';
      observe(end, () => {
        const next = end.style.display === 'grid';
        if (!shown && next) play('success.victory_fanfare', { volume: 0.45, cooldownMs: 1500 });
        shown = next;
      }, { attributes: true, attributeFilter: ['style'] });
    });
  }

  function setupTowerDefense() {
    soundAllowed = () => !(document.getElementById('btnSound')?.textContent || '').includes('🔇');
    preload([
      'combat.impact_heavy',
      'combat.hurt_grunt',
      'success.cheer_yay',
      'failure.fail_sting'
    ]);

    waitFor('#uiKills', kills => {
      let previous = parseFirstNumber(kills.textContent, 0);
      observe(kills, () => {
        const next = parseFirstNumber(kills.textContent, previous);
        if (next > previous) play('combat.impact_heavy', { volume: 0.20, rateJitter: 0.055, cooldownMs: 115 });
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#uiLives', lives => {
      let previous = parseFirstNumber(lives.textContent, 20);
      observe(lives, () => {
        const next = parseFirstNumber(lives.textContent, previous);
        if (next < previous) {
          play('combat.impact_heavy', { volume: 0.34, cooldownMs: 260 });
          play('combat.hurt_grunt', { volume: 0.30, cooldownMs: 420 });
        }
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#uiWave', wave => {
      let previous = parseFirstNumber(wave.textContent, 1);
      observe(wave, () => {
        const next = parseFirstNumber(wave.textContent, previous);
        if (next > previous) play('success.cheer_yay', { volume: 0.31, cooldownMs: 900 });
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#modal', modal => {
      let wasHidden = modal.classList.contains('hidden');
      observe(modal, () => {
        const hidden = modal.classList.contains('hidden');
        if (wasHidden && !hidden && (document.getElementById('modalTitle')?.textContent || '').includes('코어 파괴')) {
          play('failure.fail_sting', { volume: 0.44, cooldownMs: 1200 });
        }
        wasHidden = hidden;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupRuneForest() {
    soundAllowed = () => !(document.getElementById('sound')?.textContent || '').includes('꺼짐');
    preload([
      'combat.impact_heavy',
      'combat.hurt_voice',
      'collect.coin_pickup',
      'success.cheer_woohoo',
      'success.victory_fanfare',
      'failure.fail_sting'
    ]);

    waitFor('#kills', kills => {
      let previous = parseFirstNumber(kills.textContent, 0);
      observe(kills, () => {
        const next = parseFirstNumber(kills.textContent, previous);
        if (next > previous) play('combat.impact_heavy', { volume: 0.23, rateJitter: 0.05, cooldownMs: 115 });
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#hp', hp => {
      let previous = parseFirstNumber(hp.textContent, 100);
      observe(hp, () => {
        const next = parseFirstNumber(hp.textContent, previous);
        if (next < previous) play('combat.hurt_voice', { volume: 0.28, cooldownMs: 520 });
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#toast', toast => {
      let last = '';
      observe(toast, () => {
        if (toast.classList.contains('hidden')) return;
        const text = toast.textContent.trim();
        if (!text || text === last) return;
        last = text;
        if (text.includes('무기 소진') || text.includes('충원')) {
          play('collect.coin_pickup', { volume: 0.30, rate: 1.08, cooldownMs: 500 });
        }
      }, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#modal', modal => {
      let lastTag = '';
      const react = () => {
        if (modal.classList.contains('hidden')) return;
        const tag = document.getElementById('modalTag')?.textContent?.trim() || '';
        if (!tag || tag === lastTag) return;
        lastTag = tag;
        if (tag === 'LEVEL UP') play('success.cheer_woohoo', { volume: 0.32, cooldownMs: 800 });
        else if (tag === 'FOREST RESTORED') play('success.victory_fanfare', { volume: 0.46, cooldownMs: 1400 });
        else if (tag === 'TRY AGAIN') play('failure.fail_sting', { volume: 0.42, cooldownMs: 1200 });
      };
      observe(modal, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupHistoryRoyale() {
    soundAllowed = () => !document.getElementById('soundBtn')?.classList.contains('muted');
    preload(['success.victory_fanfare', 'failure.fail_sting', 'failure.disappointed_voice']);

    waitFor('#result', result => {
      let wasOpen = result.style.display === 'grid';
      let lastTitle = '';
      observe(result, () => {
        const open = result.style.display === 'grid';
        const resultTitle = document.getElementById('resultTitle')?.textContent?.trim() || '';
        if (open && (!wasOpen || resultTitle !== lastTitle)) {
          if (resultTitle.includes('승리')) play('success.victory_fanfare', { volume: 0.46, cooldownMs: 1400 });
          else if (resultTitle.includes('패배')) play('failure.fail_sting', { volume: 0.42, cooldownMs: 1200 });
          else if (resultTitle.includes('무승부')) play('failure.disappointed_voice', { volume: 0.28, cooldownMs: 1200 });
          lastTitle = resultTitle;
        }
        wasOpen = open;
      }, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true });
    });
  }

  function setupOmokArena() {
    soundAllowed = () => !(document.getElementById('sound')?.textContent || '').includes('🔇');
    preload(['collect.coin_drop', 'success.victory_fanfare', 'failure.fail_sting']);

    waitFor('#count', count => {
      let previous = parseFirstNumber(count.textContent, 0);
      observe(count, () => {
        const next = parseFirstNumber(count.textContent, previous);
        if (next > previous) play('collect.coin_drop', { volume: 0.17, rate: 0.92, rateJitter: 0.045, cooldownMs: 85 });
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#result', result => {
      let wasOpen = result.classList.contains('show');
      let lastTitle = '';
      observe(result, () => {
        const open = result.classList.contains('show');
        const resultTitle = document.getElementById('rt')?.textContent?.trim() || '';
        if (open && (!wasOpen || resultTitle !== lastTitle)) {
          if (resultTitle === 'AI 승리') play('failure.fail_sting', { volume: 0.41, cooldownMs: 1200 });
          else play('success.victory_fanfare', { volume: 0.45, cooldownMs: 1400 });
          lastTitle = resultTitle;
        }
        wasOpen = open;
      }, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    });
  }

  function boot() {
    if (path.includes('외계인 피자 가게') || title.includes('외계인 피자 가게')) setupAlienPizza();
    else if (path.includes('문방구 사장님') || title.includes('문방구 사장님')) setupStationeryBoss();
    else if (path.includes('약수 타워 디펜스') || title.includes('숫자몬스터 연산 디펜스')) setupTowerDefense();
    else if (path.includes('넘버 시그널') || title.includes('룬의 숲')) setupRuneForest();
    else if (path.includes('역사 로얄') || title.includes('역사 로얄')) setupHistoryRoyale();
    else if (path.includes('오목 아레나') || title.includes('오목 아레나')) setupOmokArena();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
