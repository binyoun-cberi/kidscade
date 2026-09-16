(() => {
  'use strict';

  // Rhythm Dash v11 runtime rework.
  // It intentionally sits on top of the existing one-button game so old saves,
  // level unlocks and heart rules remain compatible while the stage design,
  // soundtrack and moment-to-moment presentation become substantially richer.

  const V11 = {
    version: '11.0',
    activeSection: -1,
    sectionToastTimer: 0,
    lastJudgement: '',
    lastClearLevel: 0,
    palettePulse: 0,
    quickRestartReadyAt: 0
  };

  const SECTIONS = [
    { key: 'intro', name: 'INTRO', from: 0.00, to: 0.17, intensity: 0.72 },
    { key: 'groove', name: 'GROOVE', from: 0.17, to: 0.40, intensity: 0.96 },
    { key: 'break', name: 'BREAK', from: 0.40, to: 0.57, intensity: 0.58 },
    { key: 'drop', name: 'DROP', from: 0.57, to: 0.83, intensity: 1.18 },
    { key: 'finale', name: 'FINALE', from: 0.83, to: 1.01, intensity: 1.30 }
  ];

  const STAGE_META = [
    null,
    { title: 'Stage 1: 네온 운동장', theme: 'Neon Playground', root: 48, prog: [0, 5, 3, 4], palette: ['#38bdf8','#22d3ee','#60a5fa','#a78bfa'], motif: [0,2,4,2,5,4,2,1] },
    { title: 'Stage 2: 달빛 세마치', theme: 'Moonlit Semachi', root: 50, prog: [0, 3, 5, 4], palette: ['#a855f7','#c084fc','#818cf8','#38bdf8'], motif: [0,2,4,5,4,2,1,2] },
    { title: 'Stage 3: 등불 굿거리', theme: 'Lantern Groove', root: 45, prog: [0, 5, 2, 4], palette: ['#10b981','#34d399','#f59e0b','#22d3ee'], motif: [0,2,3,5,3,2,6,5] },
    { title: 'Stage 4: 오렌지 러시', theme: 'Orange Rush', root: 47, prog: [0, 4, 5, 3], palette: ['#f97316','#fb923c','#facc15','#ef4444'], motif: [0,2,4,6,5,4,2,5] },
    { title: 'Stage 5: 장미 터널', theme: 'Rose Tunnel', root: 48, prog: [0, 5, 1, 4], palette: ['#fb7185','#f43f5e','#e879f9','#fda4af'], motif: [0,3,5,4,2,5,6,4] },
    { title: 'Stage 6: 황금 휘모리', theme: 'Golden Hwimori', root: 52, prog: [0, 4, 3, 5], palette: ['#f59e0b','#facc15','#fb7185','#f97316'], motif: [0,2,4,5,7,5,4,2] },
    { title: 'Stage 7: 인디고 엇박', theme: 'Indigo Oddmeter', root: 46, prog: [0, 3, 6, 4], palette: ['#818cf8','#6366f1','#c084fc','#22d3ee'], motif: [0,4,2,5,3,6,2,4] },
    { title: 'Stage 8: 보랏빛 전환', theme: 'Violet Switch', root: 49, prog: [0, 5, 4, 2], palette: ['#c084fc','#a855f7','#60a5fa','#f472b6'], motif: [0,2,5,4,6,5,2,3] },
    { title: 'Stage 9: 에메랄드 펄스', theme: 'Emerald Pulse', root: 43, prog: [0, 5, 3, 6], palette: ['#22c55e','#10b981','#2dd4bf','#84cc16'], motif: [0,3,5,7,5,4,2,6] },
    { title: 'Stage 10: 터콰이즈 행진', theme: 'Turbo March', root: 45, prog: [0, 4, 5, 4], palette: ['#14b8a6','#22d3ee','#38bdf8','#a3e635'], motif: [0,4,2,4,5,4,2,7] },
    { title: 'Stage 11: 옐로 스윙', theme: 'Yellow Swing', root: 50, prog: [0, 3, 5, 2], palette: ['#facc15','#fde047','#fb923c','#38bdf8'], motif: [0,2,5,3,6,3,5,2] },
    { title: 'Stage 12: 마젠타 싱크', theme: 'Magenta Sync', root: 51, prog: [0, 6, 4, 5], palette: ['#e879f9','#d946ef','#fb7185','#818cf8'], motif: [0,3,6,2,5,7,4,2] },
    { title: 'Stage 13: 블루 하이퍼드라이브', theme: 'Blue Hyperdrive', root: 53, prog: [0, 5, 4, 6], palette: ['#60a5fa','#38bdf8','#22d3ee','#818cf8'], motif: [0,2,4,7,6,5,4,2] },
    { title: 'Stage 14: 핑크 메들리', theme: 'Pink Medley', root: 48, prog: [0, 3, 5, 4, 6], palette: ['#f472b6','#fb7185','#c084fc','#facc15'], motif: [0,2,5,4,7,6,3,5] },
    { title: 'Stage 15: 크림슨 오버드라이브', theme: 'Crimson Overdrive', root: 47, prog: [0, 5, 6, 4], palette: ['#f43f5e','#ef4444','#f97316','#e879f9'], motif: [0,3,5,7,6,4,2,6] },
    { title: 'Stage 16: 골든 피날레', theme: 'Golden Finale', root: 52, prog: [0, 5, 3, 4, 6, 5], palette: ['#f59e0b','#facc15','#fb7185','#38bdf8','#c084fc'], motif: [0,2,4,7,5,6,4,2] }
  ];

  const SCALE = [0, 2, 4, 5, 7, 9, 11, 12];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function seeded(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function getSection(progressValue = progress) {
    const p = clamp(Number(progressValue || 0) / 100, 0, 1);
    return SECTIONS.find(section => p >= section.from && p < section.to) || SECTIONS[SECTIONS.length - 1];
  }

  function getSectionIndex(progressValue = progress) {
    const section = getSection(progressValue);
    return Math.max(0, SECTIONS.findIndex(item => item.key === section.key));
  }

  function stageMeta(level = currentLevel) {
    return STAGE_META[level?.id] || STAGE_META[1];
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || '#38bdf8').replace('#','');
    const value = Number.parseInt(clean.length === 3 ? clean.split('').map(x => x + x).join('') : clean, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function ensureV11Ui() {
    if (!document.getElementById('rdv11-style')) {
      const style = document.createElement('style');
      style.id = 'rdv11-style';
      style.textContent = `
        #rdv11-badge{position:fixed;right:12px;top:12px;z-index:45;padding:6px 10px;border:1px solid rgba(148,163,184,.25);border-radius:999px;background:rgba(2,6,23,.55);backdrop-filter:blur(8px);font:900 10px/1.2 'Noto Sans KR',sans-serif;color:#cbd5e1;pointer-events:none;letter-spacing:.04em}
        #rdv11-section{position:fixed;left:50%;top:78px;z-index:16;transform:translate(-50%,-8px);opacity:0;padding:8px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(2,6,23,.58);backdrop-filter:blur(10px);font:1000 13px/1.1 'Noto Sans KR',sans-serif;color:white;pointer-events:none;transition:opacity .18s ease,transform .18s ease;white-space:nowrap}
        #rdv11-section.show{opacity:1;transform:translate(-50%,0)}
        #rdv11-track{position:fixed;left:12px;bottom:12px;z-index:16;max-width:min(520px,calc(100vw - 24px));padding:7px 10px;border-radius:12px;background:rgba(2,6,23,.48);border:1px solid rgba(148,163,184,.16);backdrop-filter:blur(8px);font:800 10px/1.35 'Noto Sans KR',sans-serif;color:rgba(226,232,240,.8);pointer-events:none;opacity:0;transition:opacity .2s ease}
        body.rdv11-playing #rdv11-track{opacity:.78}
        @media(max-width:700px){#rdv11-badge{top:auto;bottom:8px;right:8px;font-size:8px;padding:4px 7px}#rdv11-section{top:64px;font-size:11px}#rdv11-track{display:none}}
      `;
      document.head.appendChild(style);
    }

    if (!document.getElementById('rdv11-badge')) {
      const badge = document.createElement('div');
      badge.id = 'rdv11-badge';
      badge.textContent = 'RHYTHM DASH · REMIX v11';
      document.body.appendChild(badge);
    }
    if (!document.getElementById('rdv11-section')) {
      const toast = document.createElement('div');
      toast.id = 'rdv11-section';
      document.body.appendChild(toast);
    }
    if (!document.getElementById('rdv11-track')) {
      const track = document.createElement('div');
      track.id = 'rdv11-track';
      document.body.appendChild(track);
    }

    document.title = '리듬 대시 REMIX v11';
    const subtitle = document.querySelector('#mainMenu p');
    if (subtitle) subtitle.textContent = '장단이 음악이 되고, 음악이 맵이 되는 원버튼 리듬 러너 · REMIX v11';
    const title = document.querySelector('#mainMenu h1');
    if (title) title.textContent = 'RHYTHM DASH REMIX';
    const helpTitle = document.querySelector('#helpMenu h2');
    if (helpTitle) helpTitle.textContent = '리듬 대시 REMIX 설명서';
  }

  function buildReworkedMap(level) {
    const width = level.map?.[0]?.length || 400;
    const rows = Array.from({ length: 7 }, () => Array(width).fill('.'));
    rows[6].fill('#');
    rows[0][Math.max(0, width - 2)] = 'E';

    const rnd = seeded(level.id * 9719 + width * 13);
    const base = Array.isArray(level.beatPattern) && level.beatPattern.length ? level.beatPattern : ['N',0,'M',0];
    const beatStep = BEAT_TILES;
    const start = 18;
    const end = width - 18;
    const totalBeats = Math.max(1, Math.floor((end - start) / beatStep));

    function put(row, col, char) {
      if (row < 0 || row >= rows.length || col < 0 || col >= width) return;
      if (SAFE_LEVEL_CHARS.has(char)) rows[row][col] = char;
    }
    function floorHazard(col, token) {
      const char = token === 'M' ? 'm' : token === 'U' ? 'u' : '^';
      put(5, col, char);
      if (token === 'D' && col + 1 < width - 4) put(5, col + 1, '^');
    }
    function gap(col, span = 2) {
      for (let i = 0; i < span && col + i < width - 5; i++) rows[6][col + i] = '.';
      put(4, col + Math.max(0, Math.floor(span / 2)), 'C');
    }
    function optionalPlatform(col) {
      for (let i = 0; i < 3 && col + i < width - 5; i++) put(5, col + i, '#');
      put(4, col + 1, 'C');
    }

    for (let beat = 0; beat < totalBeats; beat++) {
      const col = start + beat * beatStep;
      const p = beat / totalBeats;
      const sectionIndex = p < .17 ? 0 : p < .40 ? 1 : p < .57 ? 2 : p < .83 ? 3 : 4;
      const section = SECTIONS[sectionIndex];
      let token = base[(beat + sectionIndex * 2) % base.length];
      const roll = rnd();

      // The break breathes; the drop and finale deliberately become denser.
      if (section.key === 'break' && beat % 3 === 1) token = 0;
      if ((section.key === 'drop' || section.key === 'finale') && !token && roll > 0.64) token = level.id >= 6 ? (roll > .82 ? 'M' : 'U') : 'M';

      // Repeating copy-paste lanes are broken up with authored-feeling motifs.
      if (level.id >= 4 && beat > 8 && beat % (17 - Math.min(5, Math.floor(level.id / 3))) === 0 && section.key !== 'break') {
        gap(col, level.id >= 12 && roll > .55 ? 3 : 2);
        continue;
      }
      if (level.id >= 3 && beat % 19 === 11 && section.key !== 'drop') {
        optionalPlatform(col);
        continue;
      }

      if (token === 'N' || token === 1) floorHazard(col, 'N');
      else if (token === 'M') floorHazard(col, 'M');
      else if (token === 'U') floorHazard(col, 'U');
      else if (token === 'D' || token === 2) floorHazard(col, 'D');
      else if (token === 'C' && level.id >= 5) put(3, col, 'v');
      else if (token === 'O' && level.id >= 7) put(4, col, 'O');
      else if (token === 'F') put(5, col, 'F');

      // Rest beats gain readable scenery or anti-mash hazards rather than staying visually empty.
      if (!token) {
        if (level.id >= 7 && beat % 13 === 6 && section.key !== 'intro') put(4, col, 'O');
        else if (level.id >= 5 && beat % 11 === 5 && section.key === 'break') put(3, col, 'v');
        else if (beat % 7 === 3) put(5, col, 'F');
      }

      // Coins form a visible musical phrase instead of being sprinkled randomly.
      if (beat > 5 && beat % 16 === 8) {
        const coinRow = section.key === 'drop' ? 3 : 4;
        put(coinRow, Math.min(width - 5, col + 2), 'C');
      }

      // Decorative suspended architecture gives each level a skyline without changing controls.
      if (beat % 12 === 2 && col + 2 < width - 8) {
        put(2, col, '#');
        put(2, col + 1, '#');
        if (section.key === 'finale') put(2, col + 2, '#');
      }
    }

    // Safe launch and finish corridors.
    for (let c = 0; c < 14; c++) {
      rows[5][c] = '.';
      rows[6][c] = '#';
    }
    for (let c = Math.max(0, width - 14); c < width; c++) {
      if (c !== width - 2) rows[0][c] = '.';
      rows[3][c] = rows[4][c] = rows[5][c] = '.';
      rows[6][c] = '#';
    }
    rows[0][width - 2] = 'E';
    return rows.map(row => row.join(''));
  }

  function reworkLevels() {
    LEVELS.forEach(level => {
      const meta = STAGE_META[level.id];
      if (!meta) return;
      level.title = meta.title;
      level.theme = meta.theme;
      level.v11 = true;
      level.sectionNames = SECTIONS.map(section => section.name);
      level.map = buildReworkedMap(level);
      level.desc = `${meta.theme} · ${getRhythmInfo(level).name}. 다섯 구간이 서로 다른 밀도와 음악 편곡으로 이어지는 리워크 스테이지입니다.`;
      const counts = countObjectChars(level.map, ['^','m','u','v','O','F']);
      level.objectSummary = `가시${counts['^']} · 작은${counts.m} · 납작${counts.u} · 천장${counts.v} · 톱니${counts.O} · 장식${counts.F}`;
      level.tested = `v11 리워크 · 5구간 편곡 · ${meta.theme} · ${level.objectSummary}`;
    });

    try {
      const refreshed = validateLevelsForStudents(LEVELS);
      if (Array.isArray(LEVEL_AUDIT)) LEVEL_AUDIT.splice(0, LEVEL_AUDIT.length, ...refreshed);
    } catch (error) {
      console.warn('[Rhythm Dash v11] level audit refresh skipped', error);
    }
  }

  function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function synthTone(freq, type, volume, duration, when, detune = 0) {
    if (!audio?.ctx || !Number.isFinite(freq) || freq <= 0) return;
    const t = Math.max(audio.ctx.currentTime, Number(when || audio.ctx.currentTime));
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    const filter = audio.ctx.createBiquadFilter();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.setValueAtTime(detune, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'sawtooth' ? 1650 : 3200, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, duration));
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.masterGain);
    osc.start(t);
    osc.stop(t + Math.max(0.07, duration) + 0.03);
  }

  function synthKick(when, strength = 1) {
    const t = Math.max(audio.ctx.currentTime, when || audio.ctx.currentTime);
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(128, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    gain.gain.setValueAtTime(0.17 * strength, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain); gain.connect(audio.masterGain);
    osc.start(t); osc.stop(t + 0.17);
  }

  function synthHat(when, strength = 1) {
    if (!audio?.ctx) return;
    const duration = 0.035;
    const size = Math.max(1, Math.floor(audio.ctx.sampleRate * duration));
    const buffer = audio.ctx.createBuffer(1, size, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = audio.ctx.createBufferSource();
    const filter = audio.ctx.createBiquadFilter();
    const gain = audio.ctx.createGain();
    filter.type = 'highpass'; filter.frequency.value = 6500;
    const t = Math.max(audio.ctx.currentTime, when || audio.ctx.currentTime);
    gain.gain.setValueAtTime(0.025 * strength, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.buffer = buffer; src.connect(filter); filter.connect(gain); gain.connect(audio.masterGain);
    src.start(t); src.stop(t + duration + 0.01);
  }

  function playChord(rootMidi, when, intensity) {
    [0, 4, 7].forEach((offset, index) => {
      synthTone(midiToFreq(rootMidi + offset), index === 0 ? 'triangle' : 'sine', 0.022 * intensity, 0.62, when, index === 2 ? 4 : 0);
    });
  }

  function getBeatSeconds() {
    const speed = Math.max(1, Number(player?.speed || currentLevel?.baseSpeed || 5));
    return clamp(getBeatDistance() / (speed * 60), 0.32, 0.72);
  }

  function arrangeBeat() {
    if (state !== 'PLAYING' || !currentLevel) return;
    const meta = stageMeta();
    const section = getSection();
    const sectionIndex = getSectionIndex();
    const rhythm = getRhythmInfo();
    const pattern = rhythm.pattern || ['덩','쿵','덕','쿵'];
    const accents = rhythm.accents || [];
    const beatInMeasure = getCurrentBeatIndex();
    const now = audio.ctx.currentTime;
    const beatSeconds = getBeatSeconds();
    const beat = beatCounter;
    const chordDegree = meta.prog[Math.floor(beat / 4) % meta.prog.length] || 0;
    const rootMidi = meta.root + SCALE[chordDegree % SCALE.length];
    const intensity = section.intensity;

    audio.playJanggu(pattern[beatInMeasure] || '덩', (accents[beatInMeasure] || 1) * (0.72 + intensity * 0.22));
    synthKick(now, (beat % 4 === 0 ? 1.2 : 0.72) * intensity);
    if (section.key !== 'break') synthHat(now + beatSeconds * 0.5, 0.65 + intensity * 0.28);
    if (section.key === 'drop' || section.key === 'finale') synthHat(now + beatSeconds * 0.75, 0.48);

    // Bass anchors the map every other beat; break sections intentionally leave more air.
    if (section.key !== 'break' || beat % 2 === 0) {
      synthTone(midiToFreq(rootMidi - 12), 'triangle', 0.045 * intensity, beatSeconds * 0.72, now);
    }

    // Chords mark phrase starts and make the soundtrack feel composed rather than a metronome.
    if (beat % 4 === 0) playChord(rootMidi, now, intensity);

    const motifStep = meta.motif[(beat + sectionIndex) % meta.motif.length] || 0;
    const melodyMidi = meta.root + 12 + SCALE[motifStep % SCALE.length];
    if (section.key !== 'intro' || beat % 2 === 0) {
      synthTone(midiToFreq(melodyMidi), section.key === 'finale' ? 'sawtooth' : 'square', 0.025 * intensity, beatSeconds * 0.42, now);
    }
    if ((section.key === 'drop' || section.key === 'finale') && beat % 2 === 1) {
      synthTone(midiToFreq(melodyMidi + 12), 'sine', 0.017 * intensity, beatSeconds * 0.28, now + beatSeconds * 0.5);
    }
  }

  function showSection(section) {
    const toast = document.getElementById('rdv11-section');
    const track = document.getElementById('rdv11-track');
    if (!toast || !currentLevel) return;
    const meta = stageMeta();
    const sectionIndex = getSectionIndex();
    const color = meta.palette[sectionIndex % meta.palette.length];
    toast.textContent = `${section.name} · ${meta.theme}`;
    toast.style.color = color;
    toast.style.borderColor = hexToRgba(color, .42);
    toast.classList.add('show');
    window.clearTimeout(V11.sectionToastTimer);
    V11.sectionToastTimer = window.setTimeout(() => toast.classList.remove('show'), 1000);
    if (track) track.textContent = `♪ ${meta.theme} · ${getRhythmInfo().name} · ${section.name}`;
  }

  function currentPaletteColor() {
    const meta = stageMeta();
    return meta.palette[getSectionIndex() % meta.palette.length] || meta.palette[0];
  }

  function drawV11Overlay() {
    if (state !== 'PLAYING' || !currentLevel) return;
    const color = currentPaletteColor();
    const section = getSection();
    const time = performance.now() * 0.001;
    const intensity = section.intensity;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Top equalizer / sky rhythm - intentionally kept away from the play lane.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.10 + beatPulse * 0.12;
    const bars = 20;
    const barW = cw / bars;
    for (let i = 0; i < bars; i++) {
      const wave = (Math.sin(time * 4 + i * 0.82) + 1) * 0.5;
      const h = 10 + wave * 28 * intensity + beatPulse * 18;
      ctx.fillStyle = i % 3 === 0 ? color : stageMeta().palette[(i + getSectionIndex()) % stageMeta().palette.length];
      ctx.fillRect(i * barW + 2, 0, Math.max(2, barW - 5), h);
    }

    // Subtle section wash gives the five parts different stage identities.
    const gradient = ctx.createLinearGradient(0, 0, 0, ch);
    gradient.addColorStop(0, hexToRgba(color, 0.065 + beatPulse * 0.035));
    gradient.addColorStop(0.55, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, hexToRgba(color, 0.045));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cw, ch);

    // Beat ring near the horizon, sized by the active accent.
    if (beatPulse > 0.04) {
      ctx.globalAlpha = clamp(beatPulse * 0.22, 0, .2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cw * .78, ch * .30, 38 + (1 - beatPulse) * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function enhanceLevelCards() {
    const buttons = document.querySelectorAll('#levelList > button');
    buttons.forEach((button, index) => {
      const level = LEVELS[index];
      if (!level || !gameData.unlockedLevels.includes(level.id)) return;
      const meta = STAGE_META[level.id];
      const label = button.querySelector('.text-cyan-300');
      if (label && meta) label.textContent = `🎵 ${meta.theme} · ${getRhythmInfo(level).name} · INTRO → GROOVE → BREAK → DROP → FINALE`;
      const audit = button.querySelector('.text-emerald-300');
      if (audit) audit.textContent = `🎚️ v11 편곡 · 맵 구간 5개 · ${level.objectSummary}`;
    });
  }

  function installOverrides() {
    const baseUpdateMusicBeat = updateMusicBeat;
    updateMusicBeat = function updateMusicBeatV11() {
      if (beatPulse > 0) beatPulse -= 0.055;
      const beatDistance = getBeatDistance();
      if (player.x - lastBeatX >= beatDistance) {
        while (player.x - lastBeatX >= beatDistance) {
          lastBeatX += beatDistance;
          beatCounter++;
        }
        beatPulse = 0.72;
        V11.palettePulse = 1;
        arrangeBeat();
        renderRhythmHud();
      }

      const index = getSectionIndex();
      if (index !== V11.activeSection) {
        V11.activeSection = index;
        showSection(SECTIONS[index]);
        createParticles(player.x + player.w / 2, player.y + player.h / 2, 18, currentPaletteColor());
      }
    };
    updateMusicBeat.__v11Base = baseUpdateMusicBeat;

    const baseDraw = draw;
    draw = function drawV11() {
      baseDraw();
      drawV11Overlay();
    };

    const baseUpdate = update;
    update = function updateV11() {
      baseUpdate();
      if (state !== 'PLAYING' || !currentLevel) return;
      player.color = currentPaletteColor();
      if (V11.palettePulse > 0) V11.palettePulse = Math.max(0, V11.palettePulse - 0.04);
    };

    const baseInitGame = initGame;
    initGame = function initGameV11(levelId) {
      V11.activeSection = -1;
      V11.palettePulse = 0;
      baseInitGame(levelId);
      document.body.classList.add('rdv11-playing');
      const track = document.getElementById('rdv11-track');
      if (track && currentLevel) track.textContent = `♪ ${stageMeta().theme} · ${getRhythmInfo().name} · INTRO`;
      window.setTimeout(() => state === 'PLAYING' && showSection(SECTIONS[0]), 120);
    };

    const baseGameOver = gameOver;
    gameOver = function gameOverV11(isClear) {
      baseGameOver(isClear);
      document.body.classList.remove('rdv11-playing');
      V11.quickRestartReadyAt = performance.now() + 220;
      if (resultMsg) resultMsg.innerText += '  ·  [R] 또는 [Space]로 빠른 재도전';
      if (isClear && currentLevel) V11.lastClearLevel = currentLevel.id;
    };

    const baseChangeState = changeState;
    changeState = function changeStateV11(nextState) {
      baseChangeState(nextState);
      document.body.classList.toggle('rdv11-playing', nextState === 'PLAYING');
    };

    const baseRenderLevelSelect = renderLevelSelect;
    renderLevelSelect = function renderLevelSelectV11() {
      baseRenderLevelSelect();
      enhanceLevelCards();
    };
  }

  function bindQuickRestart() {
    window.addEventListener('keydown', event => {
      if (state !== 'GAMEOVER') return;
      if (performance.now() < V11.quickRestartReadyAt) return;
      if (event.code !== 'KeyR' && event.code !== 'Space') return;
      if (!currentLevel) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      tryStartLevel(currentLevel.id);
    }, true);
  }

  function boot() {
    if (typeof LEVELS === 'undefined' || typeof audio === 'undefined' || typeof draw !== 'function') {
      console.warn('[Rhythm Dash v11] base game globals not ready.');
      return;
    }
    ensureV11Ui();
    reworkLevels();
    installOverrides();
    bindQuickRestart();
    renderLevelSelect();
    console.info(`[Rhythm Dash v11] ${LEVELS.length} stages reworked with section maps and layered procedural music.`);
  }

  boot();
})();
