(() => {
  'use strict';
  if (window.__byeokrandoKoreaBgmV1) return;
  window.__byeokrandoKoreaBgmV1 = true;

  let bgmHandle = null;
  let starting = false;

  async function startBgm() {
    const audio = window.KidscadeAudio;
    if (!audio || starting || bgmHandle || audio.getSettings?.().muted) return false;
    starting = true;
    try {
      const result = await audio.play?.('music.korea_welcome', {
        loop: true,
        volume: 0.12,
        cooldownMs: 700
      });
      if (result?.ok) {
        bgmHandle = result;
        document.removeEventListener('pointerdown', startBgm);
        document.removeEventListener('keydown', startBgm);
        return true;
      }
    } catch (_) {}
    finally {
      starting = false;
    }
    return false;
  }

  window.KidscadeAudio?.preload?.(['music.korea_welcome'])?.catch?.(() => {});
  document.addEventListener('pointerdown', startBgm, { passive: true });
  document.addEventListener('keydown', startBgm);
})();