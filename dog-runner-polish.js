(() => {
  'use strict';

  const SAVE_KEY = 'mathDogRunnerSave_v2';
  let audio = null;
  let musicTimer = null;
  let musicStep = 0;

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
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch {
      return null;
    }
  };

  const playNote = (freq, type, gain, duration, when) => {
    const ctx = ensureAudio();
    if (!ctx || !soundEnabled()) return;
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
  };

  const musicPulse = () => {
    if (!isRunning() || !soundEnabled()) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const lead = [659.25, 783.99, 880, 783.99, 698.46, 783.99, 987.77, 880];
    const bass = [164.81, 164.81, 196, 196, 174.61, 174.61, 220, 196];
    const step = musicStep++ % lead.length;
    const t = ctx.currentTime;
    playNote(lead[step], 'square', 0.010, 0.10, t);
    if (step % 2 === 0) playNote(bass[step], 'triangle', 0.016, 0.15, t);
    if (step % 4 === 0) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, t);
      osc.frequency.exponentialRampToValueAtTime(52, t + 0.09);
      amp.gain.setValueAtTime(0.026, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  };

  const startMusic = () => {
    if (musicTimer || !soundEnabled() || !isRunning()) return;
    musicStep = 0;
    musicPulse();
    musicTimer = setInterval(musicPulse, 190);
  };

  const stopMusic = () => {
    if (!musicTimer) return;
    clearInterval(musicTimer);
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

  const impactSound = (bad) => {
    const ctx = ensureAudio();
    if (!ctx || !soundEnabled()) return;
    const t = ctx.currentTime;
    if (bad) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(64, t + 0.12);
      amp.gain.setValueAtTime(0.035, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } else {
      playNote(784, 'triangle', 0.022, 0.10, t);
      playNote(1046.5, 'triangle', 0.020, 0.14, t + 0.07);
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
    else stopMusic();
  };

  [menu, pause, result].filter(Boolean).forEach(el => {
    new MutationObserver(syncMusic).observe(el, { attributes: true, attributeFilter: ['class'] });
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

  document.addEventListener('pointerdown', () => {
    ensureAudio();
    setTimeout(syncMusic, 0);
  }, { passive: true });

  const soundBtn = document.getElementById('soundBtn');
  soundBtn?.addEventListener('click', () => setTimeout(syncMusic, 40));
  window.addEventListener('pagehide', stopMusic);
})();
