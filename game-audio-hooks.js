(() => {
  'use strict';
  if (window.__kidscadeAudioHooksV1) return;
  window.__kidscadeAudioHooksV1 = true;

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

  function readJson(key, fallback = {}) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && typeof value === 'object' ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

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

  function watchNewChildren(node, callback) {
    if (!node) return null;
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const child of record.addedNodes || []) {
          if (child?.nodeType === 1) callback(child);
        }
      }
    });
    observer.observe(node, { childList: true, subtree: false });
    return observer;
  }

  function setupPatienceTower() {
    soundAllowed = () => !(document.getElementById('muteBtn')?.textContent || '').includes('🔇');
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
    soundAllowed = () => readJson('mathDogRunnerSave_v2', {}).sfx !== false;
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
    soundAllowed = () => readJson('spaceSandwichV4', {}).sound !== false;
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

  function setupClassroomWar() {
    preload(['combat.impact_heavy', 'combat.hurt_grunt', 'success.cheer_yay', 'success.victory_fanfare', 'failure.fail_sting']);

    waitFor('#baseHpText', hp => {
      let previous = parseFirstNumber(hp.textContent, 20);
      observe(hp, () => {
        const next = parseFirstNumber(hp.textContent, previous);
        if (next < previous) {
          play('combat.impact_heavy', { volume: 0.40, rateJitter: 0.025, cooldownMs: 180 });
          play('combat.hurt_grunt', { volume: 0.31, cooldownMs: 320 });
        }
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#toast', toast => {
      let last = '';
      const react = () => {
        const text = toast.textContent.trim();
        if (!text || text === last || toast.style.opacity === '0') return;
        last = text;
        setTimeout(() => { if (last === text) last = ''; }, 420);
        if (/^(?:\+|×)/.test(text)) play('success.cheer_yay', { volume: 0.28, cooldownMs: 260 });
        else if (/^(?:-|÷)/.test(text)) play('failure.fail_sting', { volume: 0.25, cooldownMs: 320 });
      };
      observe(toast, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    });

    waitFor('#banner', banner => {
      let last = '';
      const react = () => {
        const text = banner.querySelector('strong')?.textContent?.trim() || '';
        if (!text || text === last || banner.style.opacity === '0') return;
        last = text;
        if (text.includes('숙제 폭발') || text.includes('벽 충돌')) {
          play('combat.impact_heavy', { volume: 0.50, rateJitter: 0.02, cooldownMs: 350 });
        }
      };
      observe(banner, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    });

    waitFor('#overlay', overlay => {
      let lastEnd = '';
      const react = () => {
        if (overlay.style.display !== 'grid') return;
        const endText = document.getElementById('panel')?.textContent || '';
        if (!/(새 최고 기록|교실 방어선이 무너졌습니다)/.test(endText) || endText === lastEnd) return;
        lastEnd = endText;
        const record = endText.includes('새 최고 기록');
        play(record ? 'success.victory_fanfare' : 'failure.fail_sting', { volume: record ? 0.48 : 0.43, cooldownMs: 1200 });
      };
      observe(overlay, react, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true });
    });
  }

  function setupNumberTower() {
    preload(['combat.projectile_whoosh', 'success.cheer_yay', 'success.victory_fanfare', 'failure.fail_sting']);

    document.addEventListener('click', event => {
      const target = event.target.closest?.('.room.exposed,.gateArch.exposed,.ans');
      if (!target) return;
      if (target.classList.contains('ans')) {
        setTimeout(() => {
          if (!document.contains(target)) {
            play('success.cheer_yay', { volume: 0.31, cooldownMs: 240 });
          } else if (target.classList.contains('wrong')) {
            play('failure.fail_sting', { volume: 0.35, cooldownMs: 260 });
          } else {
            play('success.cheer_yay', { volume: 0.31, cooldownMs: 240 });
          }
        }, 60);
      } else {
        play('combat.projectile_whoosh', { volume: 0.25, rateJitter: 0.035, cooldownMs: 180 });
      }
    }, true);

    waitFor('#end', end => {
      let wasOpen = end.classList.contains('open');
      observe(end, () => {
        const open = end.classList.contains('open');
        if (!wasOpen && open) {
          const cleared = (document.getElementById('endTitle')?.textContent || '').includes('클리어');
          play(cleared ? 'success.victory_fanfare' : 'failure.fail_sting', { volume: cleared ? 0.47 : 0.42, cooldownMs: 1000 });
        }
        wasOpen = open;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupSpellingFrog() {
    preload(['movement.jump', 'collect.coin_pickup', 'success.cheer_yay', 'success.cheer_woohoo', 'failure.fail_sting', 'combat.impact_heavy', 'combat.hurt_voice']);

    const jump = () => {
      if (!document.getElementById('startOverlay')?.classList.contains('hidden')) return;
      if (!document.getElementById('gameOver')?.classList.contains('hidden')) return;
      play('movement.jump', { volume: 0.30, rateJitter: 0.045, cooldownMs: 105 });
    };
    document.addEventListener('pointerdown', event => {
      if (event.target.closest?.('[data-move]')) jump();
    }, true);
    document.addEventListener('keydown', event => {
      if (!event.repeat && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) jump();
    }, true);

    waitFor('#toast', toast => {
      let last = '';
      const react = () => {
        if (!toast.classList.contains('on')) return;
        const text = toast.textContent.trim();
        if (!text || text === last) return;
        last = text;
        setTimeout(() => { if (last === text) last = ''; }, 500);
        if (text.includes('정답!')) play('success.cheer_yay', { volume: 0.35, cooldownMs: 180 });
        else if (text.includes('황금 파리')) play('collect.coin_pickup', { volume: 0.38, rateJitter: 0.035, cooldownMs: 180 });
        else if (text.includes(' = ')) play('success.cheer_woohoo', { volume: 0.34, cooldownMs: 360 });
        else if (/물에 풍덩|부딪혔|기차/.test(text)) {
          play('combat.impact_heavy', { volume: 0.36, cooldownMs: 180 });
          play('combat.hurt_voice', { volume: 0.28, cooldownMs: 330 });
        } else if (/말고|막혔/.test(text)) {
          play('failure.fail_sting', { volume: 0.27, cooldownMs: 260 });
        }
      };
      observe(toast, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupBlockraft() {
    soundAllowed = () => (document.getElementById('soundBtn')?.textContent || '♪').trim() !== '×';
    preload(['collect.coin_pickup', 'success.cheer_yay', 'success.cheer_woohoo', 'failure.fail_sting', 'combat.impact_heavy', 'combat.hurt_grunt']);

    waitFor('.toast-area', area => {
      watchNewChildren(area, node => {
        if (!node.classList?.contains('toast')) return;
        const text = node.textContent.trim();
        if (node.classList.contains('bad')) {
          play('failure.fail_sting', { volume: 0.28, cooldownMs: 240 });
          return;
        }
        if (/보상|황금|잡았|줄을 감았|획득/.test(text)) {
          play('collect.coin_pickup', { volume: 0.34, rateJitter: 0.03, cooldownMs: 170 });
        } else if (/설치 완료|완성|발견|마셨어요|먹었어요/.test(text)) {
          play('success.cheer_yay', { volume: 0.28, cooldownMs: 250 });
        } else if (node.classList.contains('good')) {
          play('success.cheer_woohoo', { volume: 0.24, cooldownMs: 260 });
        }
      });
    });

    waitFor('#healthText', health => {
      let previous = parseFirstNumber(health.textContent, 100);
      observe(health, () => {
        const next = parseFirstNumber(health.textContent, previous);
        if (next < previous) {
          play('combat.impact_heavy', { volume: 0.34, cooldownMs: 210 });
          play('combat.hurt_grunt', { volume: 0.25, cooldownMs: 360 });
        }
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });
  }

  function setupOutbreakKorea() {
    preload(['shop.purchase', 'success.cheer_woohoo', 'success.victory_fanfare', 'failure.fail_sting', 'combat.projectile_whoosh']);

    waitFor('#toast', toast => {
      let last = '';
      const react = () => {
        if (!toast.classList.contains('show')) return;
        const text = toast.textContent.trim();
        if (!text || text === last) return;
        last = text;
        setTimeout(() => { if (last === text) last = ''; }, 500);
        if (text.includes('획득')) play('shop.purchase', { volume: 0.30, cooldownMs: 260 });
        else if (/부족|먼저 선행/.test(text)) play('failure.fail_sting', { volume: 0.30, cooldownMs: 300 });
        else if (/돌연변이|확산 압력/.test(text)) play('combat.projectile_whoosh', { volume: 0.24, rateJitter: 0.04, cooldownMs: 280 });
      };
      observe(toast, react, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#transition', transition => {
      let wasShown = transition.classList.contains('show');
      observe(transition, () => {
        const shown = transition.classList.contains('show');
        if (!wasShown && shown) play('success.cheer_woohoo', { volume: 0.38, cooldownMs: 900 });
        wasShown = shown;
      }, { attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#helpOverlay', overlay => {
      let lastFinal = '';
      const react = () => {
        if (!overlay.classList.contains('show')) return;
        const text = document.getElementById('helpBody')?.textContent || '';
        if (!/(대한민국 회복|대응 실패)/.test(text) || text === lastFinal) return;
        lastFinal = text;
        const win = text.includes('대한민국 회복');
        play(win ? 'success.victory_fanfare' : 'failure.fail_sting', { volume: win ? 0.50 : 0.43, cooldownMs: 1200 });
      };
      observe(overlay, react, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    });
  }

  function setupHanjaSurvivors() {
    soundAllowed = () => !(document.getElementById('sound-icon')?.className || '').includes('speaker-slash');
    preload(['combat.projectile_whoosh', 'combat.impact_heavy', 'combat.hurt_voice', 'success.cheer_yay', 'success.victory_fanfare', 'failure.fail_sting']);

    waitFor('#canvas-wrapper', wrapper => {
      let wasCasting = wrapper.classList.contains('cast-active');
      observe(wrapper, () => {
        const casting = wrapper.classList.contains('cast-active');
        if (!wasCasting && casting) play('combat.projectile_whoosh', { volume: 0.30, rateJitter: 0.045, cooldownMs: 130 });
        wasCasting = casting;
      }, { attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#hud-hp', hp => {
      let previous = parseFirstNumber(hp.textContent, 100);
      observe(hp, () => {
        const next = parseFirstNumber(hp.textContent, previous);
        if (next < previous) {
          play('combat.impact_heavy', { volume: 0.34, cooldownMs: 180 });
          play('combat.hurt_voice', { volume: 0.27, cooldownMs: 320 });
        }
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#level-up-modal', modal => {
      let wasHidden = modal.classList.contains('hidden');
      observe(modal, () => {
        const hidden = modal.classList.contains('hidden');
        if (wasHidden && !hidden) play('success.cheer_yay', { volume: 0.34, cooldownMs: 700 });
        wasHidden = hidden;
      }, { attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#end-modal', modal => {
      let wasHidden = modal.classList.contains('hidden');
      observe(modal, () => {
        const hidden = modal.classList.contains('hidden');
        if (wasHidden && !hidden) {
          const win = (document.getElementById('end-title')?.textContent || '').includes('대승리');
          play(win ? 'success.victory_fanfare' : 'failure.fail_sting', { volume: win ? 0.50 : 0.42, cooldownMs: 1200 });
        }
        wasHidden = hidden;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function boot() {
    if (path.includes('인내의 탑') || title.includes('인내의 탑')) setupPatienceTower();
    else if (path.includes('멍멍 곱셈 러너') || title.includes('멍멍 곱셈 러너')) setupDogRunner();
    else if (path.includes('우주 샌드위치 가게') || title.includes('우주 샌드위치 가게')) setupSpaceSandwich();
    else if (path.includes('아이스크림 나눗셈 가게') || title.includes('아이스크림 나눗셈 가게')) setupIceCreamShop();
    else if (path.includes('교실전쟁 3D') || title.includes('교실전쟁 3D')) setupClassroomWar();
    else if (path.includes('숫자 타워') || title.includes('숫자 타워')) setupNumberTower();
    else if (path.includes('스펠링 프로그') || title.includes('스펠링 프로그')) setupSpellingFrog();
    else if (path.includes('블록래프트') || title.includes('블록래프트')) setupBlockraft();
    else if (path.includes('OUTBREAK KOREA') || title.includes('OUTBREAK KOREA')) setupOutbreakKorea();
    else if (path.includes('한자 수호전') || title.includes('한자 수호전')) setupHanjaSurvivors();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
