(() => {
  'use strict';
  if (window.__kidscadeAudioHooksV4) return;
  window.__kidscadeAudioHooksV4 = true;

  const title = document.title || '';
  const path = (() => {
    try { return decodeURIComponent(location.pathname); }
    catch (_) { return location.pathname || ''; }
  })();
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

  function setupArithmeticSpire() {
    soundAllowed = () => !(document.getElementById('sound-btn')?.textContent || '').includes('꺼짐');
    preload([
      'combat.impact_heavy',
      'combat.hurt_voice',
      'collect.coin_pickup',
      'success.cheer_yay',
      'success.victory_fanfare',
      'failure.fail_sting'
    ]);

    waitFor('#arena', arena => {
      let enemyImpact = false;
      let heroImpact = false;
      observe(arena, () => {
        const nextEnemy = arena.classList.contains('impact-enemy');
        const nextHero = arena.classList.contains('impact-hero');
        if (nextEnemy && !enemyImpact) {
          play('combat.impact_heavy', { volume: 0.34, rateJitter: 0.035, cooldownMs: 190 });
        }
        if (nextHero && !heroImpact) {
          play('combat.impact_heavy', { volume: 0.36, cooldownMs: 210 });
          play('combat.hurt_voice', { volume: 0.30, cooldownMs: 520 });
        }
        enemyImpact = nextEnemy;
        heroImpact = nextHero;
      }, { attributes: true, attributeFilter: ['class'] });
    });

    const bannerObserver = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes || []) {
          if (node?.nodeType !== 1 || !node.matches?.('.battle-result')) continue;
          const text = node.textContent.trim();
          if (text === 'VICTORY') {
            play('success.victory_fanfare', { volume: 0.45, cooldownMs: 1200 });
          } else if (text === 'DEFEAT') {
            play('failure.fail_sting', { volume: 0.42, cooldownMs: 1200 });
          }
        }
      }
    });
    bannerObserver.observe(document.body, { childList: true });

    waitFor('#toast', toast => {
      let last = '';
      observe(toast, () => {
        const text = toast.textContent.trim();
        if (!text || text === last) return;
        last = text;
        if (text.includes('유물 획득')) {
          play('collect.coin_pickup', { volume: 0.30, rate: 1.08, cooldownMs: 500 });
          play('success.cheer_yay', { volume: 0.24, cooldownMs: 650 });
        }
      }, { childList: true, characterData: true, subtree: true });
    });
  }

  function setupTakoyakiShop() {
    preload([
      'collect.coin_drop',
      'success.cheer_yay',
      'success.victory_fanfare',
      'failure.fail_sting'
    ]);

    waitFor('#servedText', served => {
      let previous = parseFirstNumber(served.textContent, 0);
      observe(served, () => {
        const next = parseFirstNumber(served.textContent, previous);
        if (next > previous) {
          play('success.cheer_yay', { volume: 0.28, cooldownMs: 420 });
          setTimeout(() => play('collect.coin_drop', { volume: 0.25, rate: 1.03, cooldownMs: 420 }), 90);
        }
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#notice', notice => {
      let last = '';
      observe(notice, () => {
        const text = notice.textContent.trim();
        const token = `${text}|${notice.className}`;
        if (!text || token === last) return;
        last = token;
        if (notice.classList.contains('bad')) {
          play('failure.fail_sting', { volume: 0.28, cooldownMs: 600 });
        }
      }, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#resultModal', modal => {
      let open = modal.classList.contains('show');
      observe(modal, () => {
        const next = modal.classList.contains('show');
        if (!open && next) play('success.victory_fanfare', { volume: 0.42, cooldownMs: 1500 });
        open = next;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupNailArtist() {
    preload([
      'collect.coin_drop',
      'success.cheer_yay',
      'success.victory_fanfare',
      'failure.fail_sting'
    ]);

    waitFor('#review-modal', modal => {
      let hidden = modal.classList.contains('hide');
      observe(modal, () => {
        const nextHidden = modal.classList.contains('hide');
        if (hidden && !nextHidden) {
          const starsText = document.getElementById('review-stars')?.textContent || '';
          const stars = (starsText.match(/⭐/g) || []).length;
          if (stars >= 4) {
            play('success.cheer_yay', { volume: 0.32, cooldownMs: 650 });
            setTimeout(() => play('collect.coin_drop', { volume: 0.25, cooldownMs: 500 }), 100);
          } else if (stars <= 2) {
            play('failure.fail_sting', { volume: 0.31, cooldownMs: 650 });
          } else {
            play('collect.coin_drop', { volume: 0.21, cooldownMs: 500 });
          }
        }
        hidden = nextHidden;
      }, { attributes: true, attributeFilter: ['class'] });
    });

    waitFor('#end-day-modal', modal => {
      let hidden = modal.classList.contains('hide');
      observe(modal, () => {
        const nextHidden = modal.classList.contains('hide');
        if (hidden && !nextHidden) {
          play('success.victory_fanfare', { volume: 0.40, cooldownMs: 1500 });
        }
        hidden = nextHidden;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupScubaDiver() {
    soundAllowed = () => (document.getElementById('soundBtn')?.textContent || '').includes('SOUND ON');
    preload([
      'collect.coin_pickup',
      'combat.impact_heavy',
      'combat.hurt_grunt',
      'success.victory_fanfare',
      'failure.fail_sting'
    ]);

    waitFor('#bagText', bag => {
      const bagCount = text => {
        const match = String(text || '').match(/BAG\s+(\d+)/i);
        return match ? Number(match[1]) : 0;
      };
      let previous = bagCount(bag.textContent);
      observe(bag, () => {
        const next = bagCount(bag.textContent);
        if (next > previous) play('collect.coin_pickup', { volume: 0.30, rateJitter: 0.035, cooldownMs: 260 });
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#hpText', hp => {
      let previous = parseFirstNumber(hp.textContent, 100);
      observe(hp, () => {
        const next = parseFirstNumber(hp.textContent, previous);
        if (next < previous) {
          play('combat.impact_heavy', { volume: 0.32, cooldownMs: 250 });
          playAny(['combat.hurt_grunt', 'combat.hurt_voice'], { volume: 0.29, cooldownMs: 550 });
        }
        previous = next;
      }, { childList: true, characterData: true, subtree: true });
    });

    waitFor('#resultScreen', result => {
      let hidden = result.classList.contains('hidden');
      observe(result, () => {
        const nextHidden = result.classList.contains('hidden');
        if (hidden && !nextHidden) {
          const resultTitle = document.getElementById('resultTitle')?.textContent || '';
          play(resultTitle.includes('무사 귀환') ? 'success.victory_fanfare' : 'failure.fail_sting', {
            volume: resultTitle.includes('무사 귀환') ? 0.45 : 0.42,
            cooldownMs: 1400
          });
        }
        hidden = nextHidden;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupSteakMaster() {
    preload([
      'combat.projectile_whoosh',
      'success.cheer_yay',
      'success.victory_fanfare',
      'failure.fail_sting'
    ]);

    waitFor('#flipBtn', button => {
      button.addEventListener('pointerdown', () => {
        play('combat.projectile_whoosh', { volume: 0.22, rate: 0.92, rateJitter: 0.04, cooldownMs: 170 });
      }, { passive: true });
    });

    waitFor('#resultScreen', result => {
      let open = result.classList.contains('show');
      observe(result, () => {
        const next = result.classList.contains('show');
        if (!open && next) {
          const rank = (document.getElementById('rankText')?.textContent || '').trim().toUpperCase();
          if (rank === 'S' || rank === 'A') {
            play('success.victory_fanfare', { volume: 0.44, cooldownMs: 1400 });
          } else if (rank === 'B') {
            play('success.cheer_yay', { volume: 0.32, cooldownMs: 1100 });
          } else {
            play('failure.fail_sting', { volume: 0.34, cooldownMs: 1100 });
          }
        }
        open = next;
      }, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function setupCodeBreaker() {
    soundAllowed = () => {
      const button = document.querySelector('button[onclick="toggleAudio()"]');
      const text = button?.textContent || '';
      return !text.includes('Muted') && !text.includes('🔇');
    };
    preload(['success.cheer_yay', 'success.victory_fanfare', 'failure.fail_sting']);

    waitFor('#action-modal', modal => {
      let open = modal.style.display === 'flex';
      observe(modal, () => {
        const next = modal.style.display === 'flex';
        if (!open && next) play('success.cheer_yay', { volume: 0.30, cooldownMs: 600 });
        open = next;
      }, { attributes: true, attributeFilter: ['style'] });
    });

    waitFor('#reveal-modal', modal => {
      let open = modal.style.display === 'flex';
      observe(modal, () => {
        const next = modal.style.display === 'flex';
        if (!open && next) play('failure.fail_sting', { volume: 0.31, cooldownMs: 700 });
        open = next;
      }, { attributes: true, attributeFilter: ['style'] });
    });

    waitFor('#gameover-modal', modal => {
      let open = modal.style.display === 'flex';
      observe(modal, () => {
        const next = modal.style.display === 'flex';
        if (!open && next) {
          const result = (document.getElementById('go-title')?.textContent || '').trim().toUpperCase();
          play(result.includes('VICTORY') ? 'success.victory_fanfare' : 'failure.fail_sting', {
            volume: result.includes('VICTORY') ? 0.45 : 0.42,
            cooldownMs: 1400
          });
        }
        open = next;
      }, { attributes: true, attributeFilter: ['style'] });
    });
  }

  function boot() {
    if (path.includes('수식의 첨탑') || title.includes('수식의 첨탑')) setupArithmeticSpire();
    else if (path.includes('빙글빙글 타코야키집') || title.includes('빙글빙글 타코야키집')) setupTakoyakiShop();
    else if (path.includes('네일 아티스트 타이쿤') || title.includes('네일 아티스트')) setupNailArtist();
    else if (path.includes('심해 다이버 시뮬레이터') || title.includes('심해 다이버')) setupScubaDiver();
    else if (path.includes('그릴 마스터 3D DX') || title.includes('그릴 마스터 3D')) setupSteakMaster();
    else if (path.includes('코드 브레이커') || title.includes('코드 브레이커')) setupCodeBreaker();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
