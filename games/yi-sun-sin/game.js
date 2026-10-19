import {
  WORLD, ISLANDS, SHIP_TYPES, WAVES, UPGRADES, createGame, startRun,
  getWave, stepGame, takeUpgrade, issueSignal, togglePause
} from './sim.mjs';

const $ = id => document.getElementById(id);
const canvas = $('sea');
const ctx = canvas.getContext('2d', { alpha: false });
const overlay = $('overlay');
const input = { forward: false, backward: false, left: false, right: false };
const joystick = { active: false, x: 0, y: 0, pointerId: -1 };
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const color = { hull: '#b68c54', trim: '#f0ca83', dark: '#4a3425' };
let game = createGame();
let muted = false;
let audioCtx = null;
let lastFrame = performance.now();
let elapsed = 0;
let lastHud = 0;
let oldMode = 'menu';
let toastUntil = 0;
let lastSound = 0;
let viewport = { w: 1280, h: 720, dpr: 1 };
const camera = { x: game.player.x, y: game.player.y };

function sizeCanvas() {
  viewport.w = Math.max(320, window.innerWidth);
  viewport.h = Math.max(300, window.innerHeight);
  viewport.dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(viewport.w * viewport.dpr);
  canvas.height = Math.round(viewport.h * viewport.dpr);
}
window.addEventListener('resize', sizeCanvas);
sizeCanvas();

function noise(seed) {
  return Math.sin(seed * 127.1 + 13.5) * 0.5 + Math.cos(seed * 83.19) * 0.25;
}

function playSound(kind) {
  if (muted) return;
  const now = performance.now();
  if (kind === 'fire' && now - lastSound < 120) return;
  if (kind === 'fire') lastSound = now;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const t = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = kind === 'fire' ? 'sawtooth' : kind === 'hit' ? 'triangle' : 'sine';
    const start = kind === 'fire' ? 150 : kind === 'hit' ? 220 : 560;
    oscillator.frequency.setValueAtTime(start, t);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'fire' ? 42 : 120, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(kind === 'fire' ? 0.065 : 0.04, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.23);
    oscillator.connect(gain).connect(audioCtx.destination);
    oscillator.start(t);
    oscillator.stop(t + 0.24);
  } catch { /* Audio is optional in restricted browsers. */ }
}

function formatTime(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const rest = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${minutes}:${rest}`;
}

function toast(message) {
  if (!message) return;
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  toastUntil = performance.now() + 2150;
}

function readRecord() {
  try { return JSON.parse(localStorage.getItem('kidscade.yi_sun_sin.record') || 'null'); }
  catch { return null; }
}

function saveRecord() {
  try {
    const previous = readRecord();
    if (!previous || game.score > previous.score) {
      localStorage.setItem('kidscade.yi_sun_sin.record', JSON.stringify({ score: game.score, seconds: game.seconds, date: new Date().toISOString() }));
    }
  } catch { /* Private browsing or disabled storage. */ }
}

function showOverlay(mode) {
  overlay.classList.remove('hidden');
  $('howTo').style.display = mode === 'menu' ? '' : 'none';
  $('historyNote').style.display = mode === 'menu' || mode === 'victory' ? '' : 'none';
  $('dialogEmblem').textContent = mode === 'victory' ? '勝' : mode === 'defeat' ? '再' : mode === 'upgrade' ? '備' : '水';
  const actions = $('dialogActions');
  actions.replaceChildren();
  const primary = (label, action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-button';
    button.textContent = label;
    button.addEventListener('click', action);
    actions.appendChild(button);
  };
  if (mode === 'menu') {
    $('overlayEyebrow').textContent = '임진년 · 첫 번째 출전';
    $('overlayTitle').textContent = '옥포로 출전하다';
    $('overlayText').textContent = '1592년, 조선 수군이 적선을 향해 바다로 나섭니다. 기함을 조종하고 아군과 함께 적의 함대를 물리치세요.';
    primary('옥포로 출전하기 →', () => { beginRun(); playSound('confirm'); });
  } else if (mode === 'upgrade') {
    $('overlayEyebrow').textContent = `${game.waveIndex + 1}차 교전 마침 · 출전 준비`;
    $('overlayTitle').textContent = '함선을 정비할 시간';
    $('overlayText').textContent = '다음 교전 전에 한 가지 보강을 선택하세요. 선택한 강화는 이번 출전이 끝날 때까지 유지됩니다.';
    const choices = document.createElement('div');
    choices.className = 'upgrade-list';
    for (const id of game.selected) {
      const option = UPGRADES.find(u => u.id === id);
      if (!option) continue;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'upgrade-choice';
      const icon = document.createElement('span');
      icon.className = 'upgrade-icon';
      icon.textContent = option.icon;
      const text = document.createElement('span');
      const title = document.createElement('b');
      title.textContent = option.title;
      const hint = document.createElement('small');
      hint.textContent = option.text;
      text.append(title, hint);
      item.append(icon, text);
      item.addEventListener('click', () => {
        if (takeUpgrade(game, id)) {
          overlay.classList.add('hidden');
          canvas.focus();
          playSound('confirm');
        }
      });
      choices.appendChild(item);
    }
    actions.appendChild(choices);
  } else if (mode === 'paused') {
    $('overlayEyebrow').textContent = '전투 잠시 멈춤';
    $('overlayTitle').textContent = '잠시 숨을 고르세요';
    $('overlayText').textContent = '화면을 다시 열면 멈춘 순간부터 전투가 이어집니다.';
    primary('전투 이어하기 →', switchPause);
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'secondary-button';
    restart.textContent = '처음부터 다시 출전';
    restart.addEventListener('click', restartRun);
    actions.appendChild(restart);
  } else if (mode === 'victory') {
    saveRecord();
    $('overlayEyebrow').textContent = '1592 · 옥포 해전 승리';
    $('overlayTitle').textContent = '바다에 승전의 소식이 퍼지다';
    const best = readRecord();
    $('overlayText').textContent = `격침 ${game.kills}척 · 전공 ${game.score.toLocaleString('ko-KR')} · 소요 ${formatTime(game.seconds)}${best ? ` · 최고 기록 ${best.score.toLocaleString('ko-KR')}` : ''}`;
    primary('다시 출전하기 →', restartRun);
  } else if (mode === 'defeat') {
    $('overlayEyebrow').textContent = '옥포 해전 · 출전 실패';
    $('overlayTitle').textContent = '기함이 전투를 이어갈 수 없습니다';
    $('overlayText').textContent = `격침 ${game.kills}척. 다시 도전할 때는 적선의 선수를 피하고 좌우 함포의 사거리를 유지해 보세요.`;
    primary('다시 도전하기 →', restartRun);
  }
  requestAnimationFrame(() => actions.querySelector('button')?.focus());
}

function restartRun() {
  game = createGame(Date.now() >>> 0);
  oldMode = 'menu';
  joystick.active = false;
  resetJoystick();
  Object.assign(input, { forward: false, backward: false, left: false, right: false });
  beginRun();
}

function beginRun() {
  startRun(game);
  window.KidscadeGame?.start?.({ source: 'yi-sun-sin-okpo' });
  overlay.classList.add('hidden');
  canvas.focus();
}

function syncHud() {
  const wave = getWave(game) || WAVES[WAVES.length - 1];
  const total = wave.ships.length;
  const destroyed = Math.min(total, game.spawned - game.enemies.length);
  $('waveName').textContent = `제${game.waveIndex + 1}교전 · ${wave.name}`;
  $('waveProgress').textContent = `${destroyed} / ${total}척 격침`;
  $('waveDots').querySelectorAll('i').forEach((dot, i) => dot.classList.toggle('active', i <= game.waveIndex));
  $('missionTitle').textContent = game.mode === 'victory' ? '옥포의 바다를 지켜냈습니다' : wave.name;
  $('missionText').textContent = wave.note;
  $('missionFill').style.width = `${destroyed / total * 100}%`;
  $('missionCounter').textContent = `적선 ${destroyed} / ${total}`;
  const hp = Math.max(0, Math.ceil(game.player.hp));
  $('hullText').textContent = `${hp} / ${game.player.maxHp}`;
  $('hullFill').style.width = `${hp / game.player.maxHp * 100}%`;
  $('hullProgress').setAttribute('aria-valuenow', hp);
  $('hullFill').style.background = hp < game.player.maxHp * .28 ? 'linear-gradient(90deg,#cf654d,#efaa75)' : hp < game.player.maxHp * .55 ? 'linear-gradient(90deg,#b39c50,#f4d481)' : '';
  $('killCount').textContent = game.kills;
  $('scoreCount').textContent = game.score.toLocaleString('ko-KR');
  $('timer').textContent = formatTime(game.seconds);
  for (let side = 0; side < 2; side++) {
    const fill = $(side === 0 ? 'portReload' : 'starboardReload');
    const label = $(side === 0 ? 'portLabel' : 'starboardLabel');
    const remaining = game.player.reload[side];
    const totalReload = SHIP_TYPES.panokseon.reload * game.bonuses.reload;
    fill.style.width = `${clamp(1 - remaining / totalReload, 0, 1) * 100}%`;
    label.textContent = remaining <= 0 ? '발사 준비' : `${remaining.toFixed(1)}초`;
  }
  $('signalBtn').disabled = game.mode !== 'playing' || game.signalCooldown > 0;
  $('signalLabel').textContent = game.signalRemaining > 0 ? '집결 중!' : game.signalCooldown > 0 ? `${Math.ceil(game.signalCooldown)}초 후` : 'Space · 준비';
}

function drawOcean(left, top, width, height) {
  const grad = ctx.createLinearGradient(left, top, left + width, top + height);
  grad.addColorStop(0, '#144960');
  grad.addColorStop(0.52, '#1b6075');
  grad.addColorStop(1, '#123f59');
  ctx.fillStyle = grad;
  ctx.fillRect(left, top, width, height);
  ctx.lineWidth = 1.35;
  const startX = Math.floor(left / 105) * 105;
  const startY = Math.floor(top / 76) * 76;
  for (let y = startY; y <= top + height + 76; y += 76) {
    for (let x = startX; x <= left + width + 105; x += 105) {
      const shift = Math.sin((x + y) * 0.006 + elapsed * 0.48) * 15;
      const dx = x + shift;
      const dy = y + Math.cos(x * 0.01 + elapsed * 0.8) * 8;
      const shimmer = 0.07 + Math.abs(noise(x * 0.01 + y * 0.03)) * 0.09;
      ctx.strokeStyle = `rgba(175,227,224,${shimmer})`;
      ctx.beginPath();
      ctx.moveTo(dx - 23, dy);
      ctx.quadraticCurveTo(dx - 10, dy - 6, dx + 4, dy);
      ctx.quadraticCurveTo(dx + 17, dy + 5, dx + 29, dy - 1);
      ctx.stroke();
    }
  }
}

function islandPath(x, y, radius, inset = 0) {
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const a = i / 32 * Math.PI * 2;
    const variation = 0.92 + 0.07 * Math.sin(a * 5 + radius) + 0.06 * Math.cos(a * 7);
    const r = (radius - inset) * variation;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawIslands() {
  for (const island of ISLANDS) {
    ctx.save();
    islandPath(island.x, island.y, island.radius, -17);
    ctx.strokeStyle = '#b6eff04f';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.fillStyle = '#9caa82';
    islandPath(island.x, island.y, island.radius, 0);
    ctx.fill();
    ctx.fillStyle = island.tint === 1 ? '#3b6454' : '#47725a';
    islandPath(island.x, island.y, island.radius, 22);
    ctx.fill();
    for (let i = 0; i < 13; i++) {
      const a = i * 2.399 + island.radius;
      const d = island.radius * (0.24 + (i % 4) * 0.13);
      ctx.fillStyle = i % 3 ? '#315846' : '#63856a';
      ctx.beginPath();
      ctx.arc(island.x + Math.cos(a) * d, island.y + Math.sin(a) * d, 13 + i % 3 * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawWake(ship) {
  if (ship.dead || Math.abs(ship.speed) < 24) return;
  const strength = clamp(Math.abs(ship.speed) / SHIP_TYPES[ship.type].speed, 0, 1);
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.strokeStyle = `rgba(226,251,244,${0.20 + 0.28 * strength})`;
  ctx.lineWidth = 1.7;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 9, 18);
    ctx.quadraticCurveTo(side * 20, 37, side * (23 + strength * 12), 74 + strength * 17);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(side * 7, 24);
    ctx.lineTo(side * 10, 48 + strength * 18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShip(ship) {
  if (ship.dead) return;
  const spec = SHIP_TYPES[ship.type];
  const r = spec.radius;
  const friendly = ship.team === 'joseon';
  const flagship = ship.id === 'flagship';
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.fillStyle = '#03253766';
  ctx.beginPath();
  ctx.ellipse(4, 7, r * .83, r * 1.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = friendly ? '#614633' : '#56352e';
  ctx.strokeStyle = friendly ? '#edca84' : '#cb8b6e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * .8, r * .92);
  ctx.lineTo(-r * .86, -r * .55);
  ctx.quadraticCurveTo(-r * .56, -r * 1.34, 0, -r * 1.48);
  ctx.quadraticCurveTo(r * .56, -r * 1.34, r * .86, -r * .55);
  ctx.lineTo(r * .8, r * .92);
  ctx.quadraticCurveTo(0, r * 1.18, -r * .8, r * .92);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = friendly ? '#ad8456' : '#8d5a48';
  ctx.fillRect(-r * .64, -r * .73, r * 1.28, r * 1.42);
  ctx.strokeStyle = '#e7c18b70'; ctx.lineWidth = 1;
  for (let i = -1; i <= 2; i++) {
    const y = i * r * .31;
    ctx.beginPath();ctx.moveTo(-r * .61, y);ctx.lineTo(r * .61, y);ctx.stroke();
  }
  ctx.fillStyle = friendly ? '#65503a' : '#48312d';
  ctx.fillRect(-r * .49, -r * .35, r * .98, r * .65);
  ctx.strokeStyle = friendly ? '#e0c58c' : '#b98369';
  ctx.strokeRect(-r * .49, -r * .35, r * .98, r * .65);
  ctx.fillStyle = '#302d2a';
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(side < 0 ? -r - 6 : r - 2, i * r * .42 - 3, 9, 6);
    }
  }
  ctx.fillStyle = friendly ? '#f3d69c' : '#d68e70';
  ctx.fillRect(-2, -r * .48, 4, r * 1.02);
  ctx.beginPath();
  ctx.moveTo(2, -r * .42);
  ctx.lineTo(r * .53, -r * .22);
  ctx.lineTo(2, -r * .06);
  ctx.closePath();
  ctx.fillStyle = friendly ? '#e6b665' : '#c8584d';
  ctx.fill();
  if (flagship) {
    ctx.fillStyle = '#f5e7c1';
    ctx.font = `bold ${Math.max(9,r * .35)}px Georgia,serif`;
    ctx.textAlign = 'center';
    ctx.fillText('帥', 0, 7);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f4d38a80';
    ctx.beginPath();ctx.arc(0, 1, r * .45, 0, Math.PI * 2);ctx.stroke();
  }
  ctx.restore();

  if (ship.hp < ship.maxHp) {
    const fraction = clamp(ship.hp / ship.maxHp, 0, 1);
    ctx.fillStyle = '#022433cc';
    ctx.fillRect(ship.x - r, ship.y - r * 1.85, r * 2, 5);
    ctx.fillStyle = friendly ? '#9ed69f' : '#ed9479';
    ctx.fillRect(ship.x - r, ship.y - r * 1.85, r * 2 * fraction, 5);
  }
  if (flagship) {
    ctx.save();
    ctx.strokeStyle = '#e9bd6b8c'; ctx.lineWidth = 1.8;
    ctx.beginPath();ctx.arc(ship.x, ship.y, r * 1.85, 0, Math.PI * 2);ctx.stroke();
    ctx.restore();
  }
}

function drawShots() {
  for (const shot of game.shots) {
    const friendly = shot.team === 'joseon';
    ctx.strokeStyle = friendly ? '#ffdb91ac' : '#ff907c98';
    ctx.lineWidth = 3;
    ctx.beginPath();ctx.moveTo(shot.x,shot.y);ctx.lineTo(shot.x - shot.vx * .025,shot.y - shot.vy * .025);ctx.stroke();
    ctx.fillStyle = friendly ? '#ffe3ad' : '#ffc3a6';
    ctx.beginPath();ctx.arc(shot.x,shot.y,shot.radius,0,Math.PI * 2);ctx.fill();
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath();ctx.arc(shot.x - 1,shot.y - 1,1.8,0,Math.PI * 2);ctx.fill();
  }
}

function drawEffects() {
  for (const e of game.effects) {
    const p = clamp(e.age / e.duration, 0, 1);
    ctx.save();ctx.translate(e.x,e.y);
    if (e.type === 'splash' || e.type === 'impact') {
      ctx.strokeStyle = e.type === 'impact' ? `rgba(248,193,112,${1-p})` : `rgba(200,245,241,${.8*(1-p)})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();ctx.arc(0,0,5+35*p,0,Math.PI*2);ctx.stroke();
      for (let i=0;i<5;i++) {
        const a=i*Math.PI*2/5+e.seed*4;
        ctx.fillStyle=e.type==='impact'?`rgba(251,185,107,${1-p})`:`rgba(215,247,245,${1-p})`;
        ctx.beginPath();ctx.arc(Math.cos(a)*(8+25*p),Math.sin(a)*(8+25*p),3*(1-p)+1,0,Math.PI*2);ctx.fill();
      }
    } else if (e.type === 'muzzle') {
      ctx.fillStyle=`rgba(250,216,159,${.75*(1-p)})`;
      ctx.beginPath();ctx.arc(0,0,8+13*p,0,Math.PI*2);ctx.fill();
    } else if (e.type === 'sink') {
      ctx.strokeStyle=`rgba(225,245,222,${.8*(1-p)})`;
      ctx.lineWidth=4*(1-p)+1;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,13+p*55+i*9,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle=`rgba(55,48,36,${.7*(1-p)})`;
      for(let i=0;i<6;i++){let a=i*Math.PI/3+e.seed*5;ctx.fillRect(Math.cos(a)*p*33-4,Math.sin(a)*p*33-4,8,8);}
    }
    ctx.restore();
  }
}

function drawRadar() {
  if (viewport.w < 800 || viewport.h < 540) return;
  const w = 116, h = 85;
  const x = viewport.w - w - 21, y = viewport.h - h - 25;
  ctx.fillStyle = '#092e3fdf';
  ctx.strokeStyle = '#bfdcdb65';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fill();ctx.stroke();
  ctx.strokeStyle = '#d1e6e51e';
  ctx.beginPath();ctx.moveTo(x+w/2,y+10);ctx.lineTo(x+w/2,y+h-10);ctx.moveTo(x+10,y+h/2);ctx.lineTo(x+w-10,y+h/2);ctx.stroke();
  const dot = (ship, tint, radius) => {
    ctx.fillStyle=tint;
    ctx.beginPath();ctx.arc(x+9+(ship.x/WORLD.width)*(w-18),y+9+(ship.y/WORLD.height)*(h-18),radius,0,Math.PI*2);ctx.fill();
  };
  for(const island of ISLANDS) dot(island,'#6c9277',island.radius/75);
  for(const enemy of game.enemies) dot(enemy,'#e88e72',2.6);
  for(const ally of game.allies) if(!ally.dead) dot(ally,'#b7e2cf',3);
  dot(game.player,'#f8d78f',4);
}

function render() {
  const { w, h, dpr } = viewport;
  const zoom = clamp(Math.min(w / 980, h / 620), .52, 1.2);
  const smooth = game.mode === 'menu' ? 0.045 : 0.12;
  camera.x += (game.player.x - camera.x) * smooth;
  camera.y += (game.player.y - camera.y) * smooth;
  const halfW = w / (2 * zoom), halfH = h / (2 * zoom);
  camera.x = halfW * 2 < WORLD.width ? clamp(camera.x,halfW,WORLD.width-halfW) : WORLD.width/2;
  camera.y = halfH * 2 < WORLD.height ? clamp(camera.y,halfH,WORLD.height-halfH) : WORLD.height/2;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.translate(w/2,h/2);
  ctx.scale(zoom,zoom);
  ctx.translate(-camera.x,-camera.y);
  const left=camera.x-halfW,top=camera.y-halfH;
  drawOcean(left,top,halfW*2,halfH*2);
  drawIslands();
  for(const ship of [game.player,...game.allies,...game.enemies]) drawWake(ship);
  for(const enemy of game.enemies) drawShip(enemy);
  for(const ally of game.allies) drawShip(ally);
  drawShip(game.player);
  drawShots();
  drawEffects();
  ctx.restore();
  drawRadar();
}

function runFrame(now) {
  const dt = Math.min((now-lastFrame)/1000,0.05);
  lastFrame=now;
  elapsed+=dt;
  if (game.mode === 'playing') {
    const desired = { ...input };
    if(joystick.active) {
      const magnitude = Math.hypot(joystick.x,joystick.y);
      if (magnitude > .22) {
        desired.aimAngle=Math.atan2(joystick.x,-joystick.y);
        desired.throttle=clamp(magnitude,.4,1);
      }
    }
    stepGame(game, desired, dt);
  }
  while (game.events.length) {
    const event=game.events.shift();
    if(event.kind==='fire') playSound('fire');
    if(event.kind==='hit') playSound('hit');
    if(['wave','signal','upgrade','victory','defeat'].includes(event.kind)) toast(event.text);
  }
  if(game.mode!==oldMode){
    oldMode=game.mode;
    if(game.mode==='victory'||game.mode==='defeat'){
      window.KidscadeGame?.result?.({
        scope:'run', status:'completed', outcome:game.mode==='victory'?'win':'loss',
        score:game.score, kills:game.kills, wave:game.waveIndex+1
      });
    }
    if(['upgrade','paused','victory','defeat'].includes(game.mode)) showOverlay(game.mode);
  }
  if(performance.now()>toastUntil) $('toast').classList.remove('visible');
  if(now-lastHud>85){syncHud();lastHud=now;}
  render();
  requestAnimationFrame(runFrame);
}

const keys = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
window.addEventListener('keydown', event => {
  if (['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)) return;
  const action=keys[event.code];
  if(action){input[action]=true;event.preventDefault();}
  if(event.code==='Space'){
    event.preventDefault();
    if(!event.repeat && issueSignal(game)) playSound('confirm');
  }
  if(event.code==='Escape' || event.code==='KeyP'){
    event.preventDefault();
    if(!event.repeat) switchPause();
  }
});
window.addEventListener('keyup', event => { if(keys[event.code]) {input[keys[event.code]]=false;event.preventDefault();} });
window.addEventListener('blur', () => {Object.keys(input).forEach(k=>input[k]=false);if(game.mode==='playing') switchPause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden && game.mode==='playing')switchPause();});

function setPaused(paused){
  if(paused&&game.mode!=='playing')return;
  if(!paused&&game.mode!=='paused')return;
  togglePause(game);
  if(game.mode==='playing'){overlay.classList.add('hidden');canvas.focus();}
  else showOverlay('paused');
  oldMode=game.mode;
}
function switchPause(){
  if(!['playing','paused'].includes(game.mode))return;
  if(game.mode==='playing'){
    if(window.KidscadeGame?.pause)window.KidscadeGame.pause({source:'yi-sun-sin-controls'});
    else setPaused(true);
  }else{
    if(window.KidscadeGame?.resume)window.KidscadeGame.resume({source:'yi-sun-sin-controls'});
    else setPaused(false);
  }
}
window.KidscadeGame?.registerPauseHandlers?.({pause:()=>setPaused(true),resume:()=>setPaused(false)});
$('pauseBtn').addEventListener('click',switchPause);
$('signalBtn').addEventListener('click',()=>{if(issueSignal(game))playSound('confirm');});
$('soundBtn').addEventListener('click',()=>{muted=!muted;$('soundBtn').textContent=muted?'♩':'♫';$('soundBtn').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');});

function resetJoystick(){
  joystick.active=false;joystick.x=0;joystick.y=0;joystick.pointerId=-1;
  $('touchKnob').style.transform='translate(-50%,-50%)';
}
function updateJoystick(event){
  const bounds=$('touchPad').getBoundingClientRect();
  const radius=bounds.width*.35;
  const dx=event.clientX-(bounds.left+bounds.width/2);
  const dy=event.clientY-(bounds.top+bounds.height/2);
  const distance=Math.hypot(dx,dy)||1;
  const amount=Math.min(distance,radius);
  joystick.x=dx/distance*amount/radius;
  joystick.y=dy/distance*amount/radius;
  $('touchKnob').style.transform=`translate(calc(-50% + ${joystick.x*radius}px),calc(-50% + ${joystick.y*radius}px))`;
}
$('touchPad').addEventListener('pointerdown',event=>{
  event.preventDefault();joystick.active=true;joystick.pointerId=event.pointerId;
  $('touchPad').setPointerCapture(event.pointerId);updateJoystick(event);
});
$('touchPad').addEventListener('pointermove',event=>{if(joystick.active&&event.pointerId===joystick.pointerId)updateJoystick(event);});
for(const name of ['pointerup','pointercancel','lostpointercapture']) $('touchPad').addEventListener(name,event=>{if(event.pointerId===joystick.pointerId)resetJoystick();});

// Visibility in automated QA only; does not alter the normal game's rules.
if (new URLSearchParams(location.search).has('qa')) {
  window.__yiSunSinQA = Object.freeze({
    snapshot: () => ({mode:game.mode,wave:game.waveIndex+1,kills:game.kills,score:game.score,playerHp:game.player.hp,enemies:game.enemies.length,spawned:game.spawned}),
    start:()=>{if(game.mode==='menu')beginRun();},
    advanceWave:()=>{if(game.mode==='playing'){game.spawned=getWave(game).ships.length;game.enemies=[];game.shots=[];}},
    chooseFirst:()=>{if(game.mode==='upgrade')takeUpgrade(game,game.selected[0]);}
  });
}
showOverlay('menu');
requestAnimationFrame(runFrame);
