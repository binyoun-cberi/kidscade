(() => {
  'use strict';

  const SAVE_KEY = 'mathDogRunnerSave_v2';
  let audio = null;
  let musicTimer = null;
  let musicStep = 0;
  let startCuePlayed = false;

  const soundEnabled = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return saved.sfx !== false;
    } catch {
      return true;
    }
  };

  const ensureAudio = () => {
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      return audio;
    } catch (err) {
      console.warn('[dog-runner-audio] AudioContext unavailable', err);
      return null;
    }
  };

  // iOS/WKWebView는 사용자 제스처 안에서 AudioContext를 실제로 깨워야 한다.
  const unlockAudio = () => {
    const ctx = ensureAudio();
    if (!ctx) return false;
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      amp.gain.value = 0.00001;
      osc.frequency.value = 220;
      osc.connect(amp).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.015);
      const resumed = ctx.resume?.();
      if (resumed?.catch) resumed.catch(() => {});
      return true;
    } catch (err) {
      console.warn('[dog-runner-audio] unlock failed', err);
      return false;
    }
  };

  const playNote = (freq, type = 'triangle', gain = 0.03, duration = 0.12, when) => {
    if (!soundEnabled()) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      const resumed = ctx.resume?.();
      if (resumed?.catch) resumed.catch(() => {});
    }
    try {
      const t = when ?? ctx.currentTime;
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.03);
    } catch (err) {
      console.warn('[dog-runner-audio] note failed', err);
    }
  };

  const startCue = () => {
    if (!soundEnabled()) return;
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01;
    playNote(523.25, 'triangle', 0.035, 0.10, t);
    playNote(659.25, 'triangle', 0.035, 0.10, t + 0.09);
    playNote(783.99, 'triangle', 0.04, 0.16, t + 0.18);
  };

  const musicPulse = () => {
    if (!isRunning() || !soundEnabled()) return;
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== 'running') return;
    const lead = [659.25, 783.99, 880, 783.99, 698.46, 783.99, 987.77, 880];
    const bass = [164.81, 164.81, 196, 196, 174.61, 174.61, 220, 196];
    const step = musicStep++ % lead.length;
    const t = ctx.currentTime;
    playNote(lead[step], 'square', 0.020, 0.105, t);
    if (step % 2 === 0) playNote(bass[step], 'triangle', 0.028, 0.16, t);
    if (step % 4 === 0) {
      try {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(125, t);
        osc.frequency.exponentialRampToValueAtTime(48, t + 0.095);
        amp.gain.setValueAtTime(0.045, t);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.115);
        osc.connect(amp).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      } catch {}
    }
  };

  const startMusic = () => {
    if (musicTimer || !soundEnabled() || !isRunning()) return;
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== 'running') return;
    musicStep = 0;
    if (!startCuePlayed) {
      startCuePlayed = true;
      startCue();
    }
    musicPulse();
    musicTimer = setInterval(musicPulse, 180);
  };

  const stopMusic = () => {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
  };

  const style = document.createElement('style');
  style.textContent = `
    #dogRunnerFx{position:fixed;inset:0;z-index:14;pointer-events:none;overflow:hidden}
    .dogRunnerParticle{position:absolute;width:9px;height:9px;border-radius:2px;will-change:transform,opacity;animation:dogRunnerBurst .58s cubic-bezier(.15,.75,.25,1) forwards}
    @keyframes dogRunnerBurst{0%{transform:translate(0,0) scale(.7) rotate(0);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.1) rotate(var(--rot));opacity:0}}
    #scene.dogRunnerShake{animation:dogRunnerShake .25s linear}
    @keyframes dogRunnerShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-7px,2px)}40%{transform:translate(6px,-3px)}60%{transform:translate(-4px,-1px)}80%{transform:translate(3px,2px)}}
  `;
  document.head.appendChild(style);

  const fx = document.createElement('div');
  fx.id = 'dogRunnerFx';
  document.body.appendChild(fx);

  const burst = (palette, count = 24, stronger = false) => {
    const cx = innerWidth * 0.5;
    const cy = innerHeight * 0.66;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.className = 'dogRunnerParticle';
      const angle = Math.random() * Math.PI * 2;
      const distance = (stronger ? 115 : 90) * (0.45 + Math.random() * 0.75);
      p.style.left = `${cx + (Math.random() - 0.5) * 42}px`;
      p.style.top = `${cy + (Math.random() - 0.5) * 28}px`;
      p.style.background = palette[Math.floor(Math.random() * palette.length)];
      p.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * distance - 28}px`);
      p.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 540)}deg`);
      fx.appendChild(p);
      setTimeout(() => p.remove(), 650);
    }
  };

  const shake = () => {
    const canvas = document.getElementById('scene');
    if (!canvas) return;
    canvas.classList.remove('dogRunnerShake');
    void canvas.offsetWidth;
    canvas.classList.add('dogRunnerShake');
    setTimeout(() => canvas.classList.remove('dogRunnerShake'), 280);
  };

  const impactSound = bad => {
    if (!soundEnabled()) return;
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (bad) {
      try {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(165, t);
        osc.frequency.exponentialRampToValueAtTime(58, t + 0.13);
        amp.gain.setValueAtTime(0.06, t);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        osc.connect(amp).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.17);
      } catch {}
    } else {
      playNote(784, 'triangle', 0.04, 0.10, t);
      playNote(1046.5, 'triangle', 0.038, 0.15, t + 0.07);
    }
  };

  const menu = document.getElementById('menuOverlay');
  const pause = document.getElementById('pauseOverlay');
  const result = document.getElementById('resultOverlay');
  const message = document.getElementById('message');

  function isRunning() {
    return !!menu && menu.classList.contains('hidden') &&
      !!pause && pause.classList.contains('hidden') &&
      !!result && result.classList.contains('hidden');
  }

  const syncMusic = () => {
    if (isRunning() && soundEnabled()) startMusic();
    else {
      stopMusic();
      if (!isRunning()) startCuePlayed = false;
    }
  };

  [menu, pause, result].filter(Boolean).forEach(el => {
    new MutationObserver(() => setTimeout(syncMusic, 30)).observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  if (message) {
    let lastSignal = '';
    new MutationObserver(() => {
      if (!message.classList.contains('show')) return;
      const text = message.textContent.trim();
      const signal = `${text}:${performance.now().toFixed(0)}`;
      if (signal === lastSignal) return;
      lastSignal = signal;
      if (text.includes('정답!')) {
        burst(['#ffd85b', '#fff2a8', '#71d58a', '#ffffff'], 28, true);
        impactSound(false);
      } else if (text.includes('장애물')) {
        burst(['#ff8a4c', '#f6c36a', '#f3e2b3', '#ffffff'], 24, true);
        shake();
        impactSound(true);
        navigator.vibrate?.(35);
      } else if (text.includes('정답은')) {
        burst(['#ff625c', '#ff9a83', '#ffd0c5', '#ffffff'], 22, false);
        shake();
        impactSound(true);
      }
    }).observe(message, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  // 가장 빠른 사용자 제스처에서 오디오를 깨운다. iPhone Safari/웹뷰 대응.
  const gestureUnlock = () => {
    unlockAudio();
    setTimeout(syncMusic, 60);
  };
  window.addEventListener('pointerdown', gestureUnlock, { capture: true, passive: true });
  window.addEventListener('touchstart', gestureUnlock, { capture: true, passive: true });
  window.addEventListener('mousedown', gestureUnlock, { capture: true, passive: true });
  window.addEventListener('keydown', gestureUnlock, { capture: true });

  document.querySelectorAll('.modeBtn').forEach(btn => btn.addEventListener('click', () => {
    unlockAudio();
    setTimeout(syncMusic, 90);
  }));

  document.getElementById('jumpBtn')?.addEventListener('click', () => {
    unlockAudio();
    const ctx = ensureAudio();
    if (ctx?.state === 'running' && soundEnabled()) {
      const t = ctx.currentTime;
      playNote(392, 'triangle', 0.035, 0.08, t);
      playNote(587.33, 'triangle', 0.028, 0.10, t + 0.05);
    }
  });

  const soundBtn = document.getElementById('soundBtn');
  soundBtn?.addEventListener('click', () => {
    unlockAudio();
    setTimeout(() => {
      if (soundEnabled()) {
        playNote(880, 'triangle', 0.04, 0.12);
        syncMusic();
      } else stopMusic();
    }, 80);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic();
    else if (audio?.state === 'running') syncMusic();
  });
  window.addEventListener('pagehide', stopMusic);
})();
