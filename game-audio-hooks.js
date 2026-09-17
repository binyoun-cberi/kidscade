(() => {
  'use strict';
  if (window.__kidscadeAudioHooksV1) return;
  window.__kidscadeAudioHooksV1 = true;

  const title = document.title || '';
  const path = (() => { try { return decodeURIComponent(location.pathname); } catch (_) { return location.pathname || ''; } })();
  const audio = () => window.KidscadeAudio;
  const play = (key, options = {}) => audio()?.play?.(key, options)?.catch?.(() => {});
  const playAny = (keys, options = {}) => audio()?.playAny?.(keys, options)?.catch?.(() => {});
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

  function setupPatienceTower() {
    preload(['movement.jump', 'combat.impact_heavy', 'combat.hurt_grunt', 'combat.hurt_voice', 'collect.coin_pickup']);
    waitFor('#pt3Game', () => {
      const menu = document.getElementById('menu');
      const pause = document.getElementById('pauseScreen');
      const heart = document.getElementById('heartNow');
      let lastHeartCount = (heart?.textContent.match(/♥/g) || []).length;
      const canJumpSound = () => menu?.classList.contains('hidden') && !pause?.classList.contains('show');
      const jump = () => {
        if (!canJumpSound()) return;
        play('movement.jump', { volume: 0.48, rateJitter: 0.035, cooldownMs: 115 });
      };

      document.addEventListener('keydown', event => {
        if (event.repeat) return;
        if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) jump();
      }, true);
      document.querySelector('[data-ptkey="jump"]')?.addEventListener('pointerdown', jump, { passive: true });

      if (heart) observe(heart, () => {
        const next = (heart.textContent.match(/♥/g) || []).length;
        if (next < lastHeartCount) {
          play('combat.impact_heavy', { volume: 0.42, rateJitter: 0.03, cooldownMs: 150 });
          playAny(['combat.hurt_grunt', 'combat.hurt_voice'], { volume: 0.45, cooldownMs: 260 });
        } else if (next > lastHeartCount) {
          play('collect.coin_pickup', { volume: 0.36, rate: 1.08, cooldownMs: 180 });
        }
        lastHeartCount = next;
      }, { childList: true, characterData: true, subtree: true });
    });
  }

  function setupDogRunner() {
    preload(['movement.jump', 'success.cheer_yay', 'success.victory_fanfare', 'failure.fail_sting', 'combat.impact_heavy']);
    waitFor('#message', message => {
      let lastToken = '';
      const react = () => {
        if (!message.classList.contains('show')) return;
        const text = message.textContent.trim();
        const token = `${text}|${message.className}`;
        if (!text || token === lastToken) return;
        lastToken = token;
        setTimeout(() => { if (lastToken === token) lastToken = ''; }, 250);
        if (text.includes('정답!')) play('success.cheer_yay', { volume: 0.40, rateJitter: 0.025, cooldownMs: 180 });
        else if (text.includes('장애물')) play('combat.impact_heavy', { volume: 0.45, cooldownMs: 180 });
        else if (text.includes('정답은')) play('failure.fail_sting', { volume: 0.42, cooldownMs: 220 });
      };
      observe(message, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });

    const jump = () => play('movement.jump', { volume: 0.42, rateJitter: 0.04, cooldownMs: 120 });
    waitFor('#jumpBtn', button => button.addEventListener('pointerdown', jump, { passive: true }));
    document.addEventListener('keydown', event => {
      if (!event.repeat && event.code === 'Space') jump();
    }, true);

    waitFor('#resultOverlay', result => {
      let wasHidden = result.classList.contains('hidden');
      observe(result, () => {
        const hidden = result.classList.contains('hidden');
        if (wasHidden && !hidden) {
          const success = (document.getElementById('resultTitle')?.textContent || '').includes('성공');
          play(success ? 'success.victory_fanfare' : 'failure.fail_sting', { volume: success ? 0.46 : 0.40, cooldownMs: 1000 });
        }
        wasHidden = hidden;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupSpaceSandwich() {
    preload(['combat.projectile_whoosh', 'success.cheer_yay', 'success.cheer_woohoo', 'failure.fail_sting', 'shop.register_open']);
    waitFor('#toast', toast => {
      let last = '';
      const react = () => {
        if (!toast.classList.contains('toastShow')) return;
        const text = toast.textContent.trim();
        const token = `${text}|${toast.className}`;
        if (!text || token === last) return;
        last = token;
        setTimeout(() => { if (last === token) last = ''; }, 260);
        if (toast.classList.contains('toastGood')) play('success.cheer_yay', { volume: 0.36, cooldownMs: 170 });
        if (toast.classList.contains('toastBad')) play('failure.fail_sting', { volume: 0.38, cooldownMs: 200 });
      };
      observe(toast, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });

    document.addEventListener('click', event => {
      const button = event.target.closest?.('button');
      if (!button) return;
      if (button.classList.contains('cut')) play('combat.projectile_whoosh', { volume: 0.32, rateJitter: 0.05, cooldownMs: 90 });
      else if (button.classList.contains('serve')) play('success.cheer_woohoo', { volume: 0.34, cooldownMs: 220 });
      else if (button.classList.contains('open')) play('shop.register_open', { volume: 0.30, cooldownMs: 700 });
    }, true);
  }

  function setupIceCreamShop() {
    preload(['collect.coin_drop', 'success.cheer_yay', 'success.cheer_woohoo', 'success.victory_fanfare', 'failure.fail_sting', 'shop.register_open']);
    waitFor('#remain', remain => {
      let previous = Number(remain.textContent) || 0;
      observe(remain, () => {
        const next = Number(remain.textContent) || 0;
        if (next < previous) play('collect.coin_drop', { volume: 0.28, rate: 1.04, rateJitter: 0.025, cooldownMs: 80 });
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#toast', toast => {
      let last = '';
      const react = () => {
        if (!toast.classList.contains('toastShow')) return;
        const token = `${toast.textContent.trim()}|${toast.className}`;
        if (!toast.textContent.trim() || token === last) return;
        last = token;
        setTimeout(() => { if (last === token) last = ''; }, 280);
        if (toast.classList.contains('toastGood')) play('success.cheer_woohoo', { volume: 0.38, cooldownMs: 200 });
        if (toast.classList.contains('toastBad')) play('failure.fail_sting', { volume: 0.40, cooldownMs: 220 });
      };
      observe(toast, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#finish', finish => {
      let wasHidden = finish.classList.contains('hidden');
      observe(finish, () => {
        const hidden = finish.classList.contains('hidden');
        if (wasHidden && !hidden) play('success.victory_fanfare', { volume: 0.46, cooldownMs: 1200 });
        wasHidden = hidden;
      }, { attributes: true, attributeFilter: ['class'] });
    });
    waitFor('#open', button => button.addEventListener('click', () => play('shop.register_open', { volume: 0.30, cooldownMs: 700 })));
  }

  function boot() {
    if (path.includes('인내의 탑') || title.includes('인내의 탑')) setupPatienceTower();
    else if (path.includes('멍멍 곱셈 러너') || title.includes('멍멍 곱셈 러너')) setupDogRunner();
    else if (path.includes('우주 샌드위치 가게') || title.includes('우주 샌드위치 가게')) setupSpaceSandwich();
    else if (path.includes('아이스크림 나눗셈 가게') || title.includes('아이스크림 나눗셈 가게')) setupIceCreamShop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
