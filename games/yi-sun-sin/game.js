import {
  WORLD, SHIP_TYPES, SHIP_GUIDE, UPGRADES, WEAPONS, DIFFICULTIES, BATTLES, BATTLE_ORDER, createGame, startRun,
  getWave, getEscapeLimit, getRebuildSite, canRebuildHere, getTacticalObjective, stepGame, takeUpgrade, issueOrder, issueSpecial, restoreCampaign, isBattleUnlocked,
  togglePause, broadsideTarget, radarContacts, boardingThreat
} from './sim.mjs';
import { CAMPAIGN_INTROS } from './campaign-intros.mjs';

const $ = id => document.getElementById(id);
const canvas = $('sea');
const ctx = canvas.getContext('2d', { alpha: false });
const overlay = $('overlay');
const input = { forward: false, backward: false, left: false, right: false };
const joystick = { active: false, x: 0, y: 0, pointerId: -1 };
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const color = { hull: '#b68c54', trim: '#f0ca83', dark: '#4a3425' };
let game = createGame();
const CAMPAIGN_KEY = 'kidscade.yi_sun_sin.campaign.v1';
let campaign = restoreCampaign(null);
try {
  const saved = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || 'null');
  campaign = restoreCampaign(saved);
} catch { /* Continue with in-session progress if storage is disabled. */ }
function isUnlocked(id) {
  return isBattleUnlocked(campaign, id);
}
function markBattleCleared() {
  if (!campaign.completed.includes(game.battleId)) campaign.completed.push(game.battleId);
  try { localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign)); } catch { /* Optional persistence. */ }
}
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
  if (['fire', 'heavy'].includes(kind) && now - lastSound < 120) return;
  if (['fire', 'heavy'].includes(kind)) lastSound = now;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const t = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = ['fire', 'heavy'].includes(kind) ? 'sawtooth' : kind === 'hit' ? 'triangle' : 'sine';
    const start = kind === 'heavy' ? 88 : kind === 'fire' ? 150 : kind === 'hit' ? 220 : 560;
    oscillator.frequency.setValueAtTime(start, t);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'heavy' ? 30 : kind === 'fire' ? 42 : 120, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(kind === 'heavy' ? .085 : kind === 'fire' ? .065 : .04, t + 0.018);
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
  const key = recordKey();
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}

function saveRecord() {
  try {
    const previous = readRecord();
    if (!previous || game.score > previous.score) {
      const key = recordKey();
      localStorage.setItem(key, JSON.stringify({ score: game.score, seconds: game.seconds, date: new Date().toISOString() }));
    }
  } catch { /* Private browsing or disabled storage. */ }
}

function recordKey() {
  const suffix = game.difficulty === 'hard' ? '.hard' : '';
  return `kidscade.yi_sun_sin.record${game.battleId === 'okpo' ? '' : `.${game.battleId}`}${suffix}`;
}

function renderCampaignMap() {
  const markers = $('mapMarkers');
  const chapters = $('mapChapterList');
  markers.replaceChildren();
  chapters.replaceChildren();
  for (const id of BATTLE_ORDER) {
    const battle = BATTLES[id];
    const intro = CAMPAIGN_INTROS[id];
    const unlocked = isUnlocked(id);
    const cleared = campaign.completed.includes(id);
    const selected = game.battleId === id;
    const state = !unlocked ? '미개방' : cleared ? '승전 완료' : '출전 가능';
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = `map-marker${cleared ? ' cleared' : ''}${!unlocked ? ' locked' : ''}${selected ? ' selected' : ''}`;
    marker.style.left = `${intro.x}%`;
    marker.style.top = `${intro.y}%`;
    marker.textContent = String(battle.chapter).padStart(2, '0');
    marker.title = `${battle.title} · ${intro.place} · ${state}`;
    marker.setAttribute('aria-label', `${battle.chapter}장 ${battle.title}, ${intro.place}, ${state}`);
    marker.addEventListener('click', () => chooseMapBattle(id));
    marker.addEventListener('focus', () => showMapDetail(id));
    markers.appendChild(marker);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = `map-chapter${cleared ? ' cleared' : ''}${!unlocked ? ' locked' : ''}${selected ? ' selected' : ''}`;
    row.setAttribute('aria-label', `${battle.chapter}장 ${battle.title}, ${state}`);
    const number = document.createElement('span');
    number.className = 'map-chapter-num';
    number.textContent = String(battle.chapter).padStart(2, '0');
    const caption = document.createElement('span');
    caption.className = 'map-chapter-caption';
    const name = document.createElement('b');
    const subtitle = document.createElement('small');
    name.textContent = battle.title;
    subtitle.textContent = intro.place;
    caption.append(name, subtitle);
    const indicator = document.createElement('span');
    indicator.className = 'map-chapter-state';
    indicator.textContent = !unlocked ? '🔒' : cleared ? '✓' : '→';
    row.append(number, caption, indicator);
    row.addEventListener('click', () => chooseMapBattle(id));
    row.addEventListener('focus', () => showMapDetail(id));
    chapters.appendChild(row);
  }
  showMapDetail(game.battleId);
  selectDifficulty(game.difficulty);
  $('mapStartBtn').disabled = !isUnlocked(game.battleId);
  $('mapStartBtn').textContent = `${game.battle.title} 기록 읽고 출전 →`;
}

function showMapDetail(id) {
  const battle = BATTLES[id];
  if (!battle) return;
  const intro = CAMPAIGN_INTROS[id];
  const panel = $('mapSelected');
  panel.replaceChildren();
  const heading = document.createElement('strong');
  const note = document.createElement('p');
  heading.textContent = `${battle.chapter}장 · ${battle.title} · ${battle.date}`;
  note.textContent = isUnlocked(id) ? intro.lead : '앞 전장의 승전 기록을 남기면 이 전장이 열립니다.';
  panel.append(heading, note);
}

function chooseMapBattle(id) {
  if (!isUnlocked(id)) { showMapDetail(id); playSound('hit'); return; }
  selectBattle(id);
}

function showCinematic() {
  if (!isUnlocked(game.battleId)) return;
  const intro = CAMPAIGN_INTROS[game.battleId];
  $('campaignScreen').hidden = true;
  $('dialogCard').hidden = true;
  $('cinematicScreen').hidden = false;
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-labelledby', 'cinematicTitle');
  $('cinematicChapter').textContent = `${game.battle.chapter}장 · ${intro.era}`;
  $('cinematicCaveat').textContent = intro.caveat;
  $('cinematicSource').href = intro.source;
  const crawl = $('crawlContent');
  crawl.classList.remove('running');
  crawl.replaceChildren();
  const add = (tag, className, content) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = content;
    crawl.appendChild(node);
  };
  add('span', 'crawl-prelude', '一 · 七年海戰');
  add('h1', 'crawl-title', game.battle.title);
  add('p', 'crawl-date', `${game.battle.date}  ·  ${intro.place}`);
  add('p', 'crawl-lead', intro.lead);
  add('p', 'crawl-story', intro.story);
  add('span', 'crawl-record-label', intro.diaryDate);
  if (intro.diaryQuote) add('blockquote', 'crawl-quote', `“${intro.diaryQuote}”`);
  add('p', 'crawl-diary', intro.diary);
  add('p', 'crawl-final', '기함의 닻을 올릴 때가 왔다.');
  // The heading is reused for the dialog's accessible name even when the text
  // inside the moving crawl changes between chapters.
  crawl.querySelector('h1').id = 'cinematicTitle';
  void crawl.offsetWidth; // restart animation even when the same battle is selected twice
  crawl.classList.add('running');
  $('cinematicSkip').textContent = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '출전하기 →' : '연출 건너뛰고 출전 →';
  requestAnimationFrame(() => $('cinematicSkip').focus());
}

function leaveCinematic() {
  $('crawlContent').classList.remove('running');
  $('cinematicScreen').hidden = true;
}

function showOverlay(mode) {
  overlay.classList.remove('hidden');
  leaveCinematic();
  $('campaignScreen').hidden = mode !== 'menu';
  $('dialogCard').hidden = mode === 'menu';
  overlay.setAttribute('aria-labelledby', mode === 'menu' ? 'atlasTitle' : 'overlayTitle');
  if (mode === 'menu') {
    renderCampaignMap();
    requestAnimationFrame(() => $('mapStartBtn').focus());
    return;
  }
  $('shipGuide').hidden = true;
  $('shipGuide').replaceChildren();
  $('historyNote').style.display = mode === 'menu' || mode === 'victory' ? '' : 'none';
  $('historyNote').textContent = `${game.battle.history} 날짜는 음력 기준이며, 함선 규모·세부 지형·해류 수치는 게임에 맞게 재구성했습니다.`;
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
  const secondary = (label, action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-button';
    button.textContent = label;
    button.addEventListener('click', action);
    actions.appendChild(button);
  };
  if (mode === 'upgrade') {
    $('overlayEyebrow').textContent = `${game.waveIndex + 1}차 교전 마침 · 출전 준비`;
    $('overlayTitle').textContent = '함선을 정비할 시간';
    $('overlayText').textContent = '좌현·우현 무장을 바꾸거나 아군을 보강하세요. 선택한 강화는 이번 출전 동안 유지됩니다.';
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
    markBattleCleared();
    saveRecord();
    $('overlayEyebrow').textContent = `${DIFFICULTIES[game.difficulty].label} · ${game.battle.title} 승리`;
    $('overlayTitle').textContent = '바다에 승전의 소식이 퍼지다';
    const best = readRecord();
    const completed = game.tactical.completed.filter(Boolean).length;
    $('overlayText').textContent = `격침 ${game.kills}척 · 전술 임무 ${completed}/3 · 전공 ${game.score.toLocaleString('ko-KR')} · 소요 ${formatTime(game.seconds)}${best ? ` · 최고 기록 ${best.score.toLocaleString('ko-KR')}` : ''}`;
    if (game.battleId === 'noryang') $('overlayTitle').textContent = '마지막 승전, 바다에 남은 이름';
    const next = BATTLE_ORDER[BATTLE_ORDER.indexOf(game.battleId) + 1];
    if (next) primary(`다음 장 · ${BATTLES[next].title} →`, () => selectBattle(next));
    else primary('마지막 전장 다시 출전 →', restartRun);
    secondary('전장 선택으로 돌아가기', backToMenu);
  } else if (mode === 'defeat') {
    $('overlayEyebrow').textContent = `${game.battle.title} · 출전 실패`;
    $('overlayTitle').textContent = '기함이 전투를 이어갈 수 없습니다';
    $('overlayText').textContent = game.battle.retreat ? '적선이 퇴로를 빠져나갔거나 기함이 격침되었습니다. 탈출로를 먼저 봉쇄하고 기함을 보호하세요.' : `격침 ${game.kills}척. 적선을 뱃머리가 아닌 판옥선의 좌우에 두고, 필요할 때 협선의 호위를 요청하세요.`;
    primary('다시 도전하기 →', restartRun);
    secondary('난이도 다시 고르기', backToMenu);
  }
  requestAnimationFrame(() => actions.querySelector('button')?.focus());
}

function restartRun() {
  game = createGame(Date.now() >>> 0, game.difficulty, game.battleId);
  oldMode = 'menu';
  joystick.active = false;
  resetJoystick();
  Object.assign(input, { forward: false, backward: false, left: false, right: false });
  beginRun();
}

function backToMenu() {
  game = createGame(Date.now() >>> 0, game.difficulty, game.battleId);
  oldMode = 'menu';
  resetJoystick();
  Object.assign(input, { forward: false, backward: false, left: false, right: false });
  showOverlay('menu');
}

function selectBattle(id) {
  if (!BATTLES[id] || !isUnlocked(id)) return;
  game = createGame(Date.now() >>> 0, game.difficulty, id);
  oldMode = 'menu';
  resetJoystick();
  Object.assign(input, { forward: false, backward: false, left: false, right: false });
  showCinematic();
  playSound('confirm');
}

function beginRun() {
  if (game.mode !== 'menu') return;
  leaveCinematic();
  startRun(game);
  window.KidscadeGame?.start?.({ source: `yi-sun-sin-${game.battleId}` });
  overlay.classList.add('hidden');
  canvas.focus();
}

function selectDifficulty(id) {
  if (game.mode !== 'menu' || !DIFFICULTIES[id]) return;
  game.difficulty = id;
  for (const [difficulty, buttonId] of [['normal', 'normalDifficulty'], ['hard', 'hardDifficulty']]) {
    const selected = difficulty === id;
    $(buttonId).classList.toggle('selected', selected);
    $(buttonId).setAttribute('aria-pressed', String(selected));
  }
}

function syncHud() {
  const wave = getWave(game) || game.battle.waves.at(-1);
  const total = wave.ships.length;
  const destroyed = Math.min(total, game.spawned - game.enemies.length);
  const site = getRebuildSite(game);
  const siteDistance = site ? Math.ceil(Math.hypot(site.x - game.player.x, site.y - game.player.y)) : 0;
  const siteDirection = site ? (() => {
    const dx = site.x - game.player.x, dy = site.y - game.player.y;
    const eastWest = dx > 75 ? '동' : dx < -75 ? '서' : '';
    const northSouth = dy > 75 ? '남' : dy < -75 ? '북' : '';
    return northSouth + eastWest || '현재 위치';
  })() : '';
  const siteBearing = siteDirection === '현재 위치' ? '바로 근처' : `${siteDirection}쪽`;
  const recovered = game.battle.rebuild && game.tactical.recovered > game.waveIndex;
  $('campaignYear').textContent = `${game.battle.date.slice(0, 4)} · 조선 수군`;
  $('battleName').textContent = game.battle.title;
  $('waveName').textContent = `${game.difficulty === 'hard' ? '어려움 · ' : ''}${game.battle.chapter}장 ${game.waveIndex + 1}/3 · ${wave.name}`;
  $('waveProgress').textContent = game.withdrawal ? '서쪽 외해로 철수하세요!' : site && !recovered ? `수군 재건 ${game.tactical.recovered}/3 · 집결 대기` : game.battle.pursuit ? `${destroyed} / ${total}척 차단` : `${destroyed} / ${total}척 격침`;
  $('waveDots').querySelectorAll('i').forEach((dot, i) => dot.classList.toggle('active', i <= game.waveIndex));
  $('missionTitle').textContent = game.mode === 'victory' ? `${game.battle.title} 승전!` : game.withdrawal ? '부산포 함대 철수' : site && !recovered ? site.label : wave.name;
  $('missionText').textContent = game.withdrawal ? '항구 타격을 마쳤습니다. 지도 왼쪽의 청록색 안전 해역으로 이동하세요.' : site && !recovered ? `${wave.note} · ${siteBearing} ${siteDistance}m` : wave.note;
  $('missionFill').style.width = `${game.withdrawal ? Math.min(100, Math.max(0, (WORLD.width - game.player.x) / (WORLD.width - game.battle.withdraw.x) * 100)) : site ? (game.tactical.recovered / 3 * 100) : destroyed / total * 100}%`;
  $('missionCounter').textContent = game.withdrawal ? `안전 해역까지 ${Math.max(0, Math.ceil(game.player.x - game.battle.withdraw.x))}m` : site ? `수군 집결 ${game.tactical.recovered}/3 · 적선 ${destroyed}/${total}` : game.battle.pursuit ? `적선 ${destroyed}/${total} · 도주 ${game.tactical.escaped}/${getEscapeLimit(game)}` : `적선 ${destroyed} / ${total}`;
  const objective = getTacticalObjective(game);
  const tacticStatus = $('tacticStatus');
  tacticStatus.textContent = objective.completed
    ? `✓ 전술 임무 완료 · ${objective.label} (수리 +22)`
    : `전술 임무 · ${objective.label} ${Math.min(objective.target, Math.floor(objective.value))} / ${objective.target}${objective.unit || ''}`;
  tacticStatus.classList.toggle('done', objective.completed);
  const hp = Math.max(0, Math.ceil(game.player.hp));
  $('hullText').textContent = `${hp} / ${game.player.maxHp}`;
  $('hullFill').style.width = `${hp / game.player.maxHp * 100}%`;
  $('hullProgress').setAttribute('aria-valuenow', hp);
  $('hullFill').style.background = hp < game.player.maxHp * .28 ? 'linear-gradient(90deg,#cf654d,#efaa75)' : hp < game.player.maxHp * .55 ? 'linear-gradient(90deg,#b39c50,#f4d481)' : '';
  $('killCount').textContent = game.kills;
  $('scoreCount').textContent = game.score.toLocaleString('ko-KR');
  const escort = game.allies[0];
  const messenger = game.allies.find(ally => ally.type === 'sahuseon');
  const turtle = game.allies.find(ally => ally.type === 'turtle');
  $('escortStatus').textContent = `${!escort || escort.dead ? '협선 격침' : `협선 ${Math.ceil(escort.hp)}/${escort.maxHp}`} · ${!messenger || messenger.dead ? '사후선 격침' : '사후선 정찰 중'}${turtle ? ` · 거북선 ${turtle.dead ? '격침' : Math.ceil(turtle.hp) + '/' + turtle.maxHp}` : ''}`;
  const condition = $('seaCondition');
  condition.hidden = !(game.battle.current || game.battle.shoreBattery || game.battle.night || game.battle.formation || game.battle.pursuit || game.battle.harbor || site);
  if (game.battle.current) condition.textContent = `↔ 울돌목 조류: ${game.tideDirection > 0 ? '동쪽 →' : '← 서쪽'} · ${Math.ceil(game.battle.current.period - game.tideClock)}초 뒤 반전`;
  else if (game.withdrawal) condition.textContent = '↢ 부산포 철수 지시 · 서쪽 안전 해역으로';
  else if (game.battle.shoreBattery) condition.textContent = `⚠ 부산포 연안 포대 ${game.battle.shoreBatteries?.length || 1}곳 · 4번 함대 일제 포격`;
  else if (site) condition.textContent = recovered ? '⚑ 집결 완료 · 남은 적을 정리하면 다음 수습지로 이동' : `⚑ ${site.label} · ${canRebuildHere(game) ? '집결 범위 안! 4번 수군 수습' : `${siteBearing} ${siteDistance}m · 표식 원으로 이동`}`;
  else if (game.battle.night) condition.textContent = `☾ 야간 교전 · ${game.allies.some(a => a.id === 'ming-1') ? '조·명 연합 작전' : '명나라 지원 대기'}`;
  else if (game.battle.formation) condition.textContent = `鶴 학익진 · ${game.special.state === 'lure' ? '적 주력을 유인한 뒤 4번' : game.special.state === 'deploying' ? `진형 전개 ${Math.ceil(game.special.deployClock)}초` : `포위 포격 ${Math.ceil(game.special.remaining)}초`} · 날개 ${game.allies.filter(a => a.id.startsWith('wing-') && !a.dead).length}/2척`;
  else if (game.battle.pursuit) condition.textContent = `➤ 율포 추격 · 역풍 속 노 젓기(4번) · 도주 ${game.tactical.escaped}/${getEscapeLimit(game)}`;
  else if (game.battle.harbor) condition.textContent = '⚓ 안골포 포구 · 얕은 수심선 밖에서 4번 교대 포격';
  const exposure = $('exposureWarning');
  const exposed = game.mode === 'playing' && game.stationarySeconds >= 3;
  exposure.hidden = !exposed;
  if (exposed) exposure.textContent = game.stationarySeconds >= 6
    ? '⚠ 정박 노출! 적의 집중 포격 · 전진하여 이탈하세요'
    : `⚠ 기함 정박 · ${Math.ceil(6 - game.stationarySeconds)}초 뒤 적 집중 포격`;
  $('timer').textContent = formatTime(game.seconds);
  for (let side = 0; side < 2; side++) {
    const slot = side === 0 ? 'port' : 'starboard';
    const weapon = WEAPONS[game.arsenal[slot]] || WEAPONS.standard;
    $(side === 0 ? 'portWeaponName' : 'starboardWeaponName').textContent = `${side === 0 ? '좌현' : '우현'} · ${weapon.name}`;
    const fill = $(side === 0 ? 'portReload' : 'starboardReload');
    const label = $(side === 0 ? 'portLabel' : 'starboardLabel');
    const remaining = game.player.reload[side];
    const totalReload = weapon.reload * game.bonuses.reload * (game.signalRemaining > 0 && game.signalOrder === 'rally' ? .7 : 1);
    fill.style.width = `${clamp(1 - remaining / totalReload, 0, 1) * 100}%`;
    label.textContent = remaining <= 0 ? '발사 준비' : `${remaining.toFixed(1)}초`;
  }
  const escortAlive = game.allies.some(ship => ship.type === 'escort' && !ship.dead);
  for (const [order, id, labelId, key, action] of [
    ['rally', 'signalBtn', 'signalLabel', '1', '속사'],
    ['focus', 'focusBtn', 'focusLabel', '2', '집중'],
    ['guard', 'guardBtn', 'guardLabel', '3', '엄호']
  ]) {
    const active = game.signalRemaining > 0 && game.signalOrder === order;
    $(id).classList.toggle('is-active', active);
    $(id).disabled = game.mode !== 'playing' || game.signalCooldown > 0 || !escortAlive || (order === 'focus' && game.enemies.length === 0);
    $(labelId).textContent = !escortAlive ? '협선 격침' : active ? `${action} 중!` : game.signalCooldown > 0 ? `${Math.ceil(game.signalCooldown)}초` : `${key} · 준비`;
  }
  const special = $('specialBtn');
  const specialNames = { oars: '노 젓기', crane: '학익진', rotation: '교대 포격', broadside: '함대 일제 포격', rebuild: '수군 수습' };
  special.hidden = !game.battle.special;
  if (game.battle.special) {
    $('specialTitle').textContent = specialNames[game.battle.special];
    special.setAttribute('aria-label', `4번 특수 명령, ${specialNames[game.battle.special]}`);
    const active = ['deploying', 'active'].includes(game.special.state);
    special.classList.toggle('is-active', active);
    special.disabled = game.mode !== 'playing' || game.special.cooldown > 0 || game.special.state === 'deploying' ||
      game.battle.special === 'crane' && !game.allies.some(a => a.id.startsWith('wing-') && !a.dead) ||
      game.battle.special === 'rebuild' && recovered;
    $('specialLabel').textContent = game.special.state === 'deploying' ? game.battle.special === 'rebuild' ? `수습 ${Math.ceil(game.special.deployClock)}초` : '전개 중' : game.special.state === 'active' ? '명령 수행 중' : game.special.cooldown > 0 ? `${Math.ceil(game.special.cooldown)}초` : recovered && game.battle.special === 'rebuild' ? '집결 완료' : '4 · 준비';
  }
  const nearest = game.enemies.reduce((best, enemy) => !best || Math.hypot(enemy.x-game.player.x,enemy.y-game.player.y)<Math.hypot(best.x-game.player.x,best.y-game.player.y) ? enemy : best, null);
  const left = broadsideTarget(game.player,game.enemies,-1,WEAPONS[game.arsenal.port].range * game.bonuses.range);
  const right = broadsideTarget(game.player,game.enemies,1,WEAPONS[game.arsenal.starboard].range * game.bonuses.range);
  const widestRange = Math.max(WEAPONS[game.arsenal.port].range, WEAPONS[game.arsenal.starboard].range) * game.bonuses.range;
  const boarding = boardingThreat(game);
  $('battleTip').textContent = game.withdrawal ? '부산포 공격 완료 · 서쪽 안전 해역으로 철수!' : site && !recovered ? game.special.state === 'deploying' ? '집결을 진행합니다! 표시 원 안에서 잠시 머무르세요.' : canRebuildHere(game) ? '집결지 도착! 4번 수군 수습 명령을 누르세요.' : `집결지 표식을 찾아 항해하세요 · ${siteDistance}m` : boarding ? `도선 위협 ${Math.round(boarding.boardingProgress * 100)}% · 적선과 거리를 벌리세요!` : game.battle.formation && game.special.state === 'lure' && game.tactical.sailed < 95 ? '기함을 움직여 주력을 유인하세요 · 4번 학익진' : game.battle.formation && game.special.state === 'deploying' ? '학익진 전개 중 · 날개 함대의 기동을 엄호하세요' : game.battle.pursuit && game.tactical.escaped >= 2 ? `주의! 적선 ${game.tactical.escaped}척 도주 · 추격하세요` : game.stationarySeconds >= 6 ? '정박 중에는 포격 피해 증가! W 또는 ↑로 항해하세요' : !nearest ? '적선을 기다리는 중' : game.player.aimSteady < .58 ? '급선회 중 · 방향을 잡으면 포격합니다' : left || right ? `${left ? '좌현' : '우현'} 화포 사격 범위!` : Math.hypot(nearest.x-game.player.x,nearest.y-game.player.y)>widestRange ? '적선에 접근한 뒤 측면을 잡으세요' : '적선을 뱃머리가 아닌 좌우에 두세요';
  $('battleTip').classList.toggle('is-boarding', !!boarding || game.stationarySeconds >= 6);
}

function drawOcean(left, top, width, height) {
  const grad = ctx.createLinearGradient(left, top, left + width, top + height);
  grad.addColorStop(0, game.battle.night ? '#071a31' : '#144960');
  grad.addColorStop(0.52, game.battle.night ? '#12304b' : '#1b6075');
  grad.addColorStop(1, game.battle.night ? '#061524' : '#123f59');
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
      const shimmer = (game.battle.night ? .025 : .07) + Math.abs(noise(x * 0.01 + y * 0.03)) * (game.battle.night ? .035 : .09);
      ctx.strokeStyle = `rgba(175,227,224,${shimmer})`;
      ctx.beginPath();
      ctx.moveTo(dx - 23, dy);
      ctx.quadraticCurveTo(dx - 10, dy - 6, dx + 4, dy);
      ctx.quadraticCurveTo(dx + 17, dy + 5, dx + 29, dy - 1);
      ctx.stroke();
    }
  }
}

function drawBattleFeatures() {
  const site = getRebuildSite(game);
  if (site) {
    const completed = game.tactical.recovered > game.waveIndex;
    const radius = game.battle.rebuild.radius;
    ctx.save();
    ctx.strokeStyle = completed ? '#8cddbe' : '#e7d392';
    ctx.fillStyle = completed ? '#52bba920' : '#f9d47725';
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 9]);
    ctx.beginPath();ctx.arc(site.x, site.y, radius, 0, Math.PI * 2);ctx.fill();ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffecc1';ctx.textAlign = 'center';ctx.font = 'bold 22px system-ui';
    ctx.fillText(completed ? '✓ 집결 완료' : `⚑ ${site.label}`, site.x, site.y - 18);
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(completed ? '다음 항해 준비' : '원 안에서 4번 수군 수습', site.x, site.y + 12);
    if (!completed) {
      ctx.globalAlpha = .65;ctx.strokeStyle = '#e7d392';ctx.lineWidth = 2;ctx.setLineDash([7, 12]);
      ctx.beginPath();ctx.moveTo(game.player.x,game.player.y);ctx.lineTo(site.x,site.y);ctx.stroke();ctx.setLineDash([]);
      if (game.special.state === 'deploying') {
        const max = game.difficulty === 'hard' ? game.battle.rebuild.hardHold : game.battle.rebuild.normalHold;
        ctx.globalAlpha = 1;ctx.strokeStyle = '#8deccd';ctx.lineWidth = 9;
        ctx.beginPath();ctx.arc(site.x,site.y,radius-12,-Math.PI/2,-Math.PI/2+(1-game.special.deployClock/max)*Math.PI*2);ctx.stroke();
      }
    }
    ctx.restore();
  }
  if (game.battle.fleet && ['deploying','active'].includes(game.special.state)) {
    ctx.save();ctx.strokeStyle = '#96eedda0';ctx.lineWidth = 3;ctx.setLineDash([15, 10]);
    for (const ally of game.allies.filter(a => !a.dead && a.id.startsWith('fleet-'))) {
      ctx.beginPath();ctx.moveTo(game.player.x,game.player.y);ctx.lineTo(ally.x,ally.y);ctx.stroke();
      ctx.beginPath();ctx.arc(ally.x,ally.y,45,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  if (game.battle.harbor) {
    const x = game.battle.harbor.shallowX;
    ctx.save();
    ctx.fillStyle = '#d4b46b15';ctx.fillRect(x,0,WORLD.width-x,WORLD.height);
    ctx.setLineDash([17,10]);ctx.lineWidth = 3;ctx.strokeStyle = '#f6d78bad';
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD.height);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle = '#ffe9b4';ctx.font = 'bold 18px system-ui';ctx.textAlign = 'center';
    ctx.fillText('⚠ 얕은 수심',x + 120,760);
    ctx.restore();
  }
  if (game.battle.pursuit) {
    ctx.save();
    ctx.fillStyle = '#a1dce42a';ctx.fillRect(game.battle.pursuit.escapeX,0,WORLD.width-game.battle.pursuit.escapeX,WORLD.height);
    ctx.setLineDash([10,10]);ctx.strokeStyle = '#f7a87ca0';ctx.lineWidth = 3;
    ctx.beginPath();ctx.moveTo(game.battle.pursuit.escapeX,0);ctx.lineTo(game.battle.pursuit.escapeX,WORLD.height);ctx.stroke();ctx.setLineDash([]);
    ctx.restore();
  }
  if (game.battle.formation && ['deploying','active'].includes(game.special.state)) {
    const wings = game.allies.filter(a => a.id.startsWith('wing-') && !a.dead);
    ctx.save();ctx.lineWidth = 3;ctx.setLineDash([12,11]);
    ctx.strokeStyle = game.special.state === 'active' ? '#89efc9aa' : '#eadc99a0';
    for (const wing of wings) {
      ctx.beginPath();ctx.moveTo(game.player.x,game.player.y);ctx.lineTo(wing.x,wing.y);ctx.stroke();
      ctx.beginPath();ctx.arc(wing.x,wing.y,48,0,Math.PI*2);ctx.stroke();
    }
    ctx.setLineDash([]);ctx.restore();
  }
  if (game.battle.current) {
    const water = game.battle.current;
    ctx.save();
    ctx.strokeStyle = '#99ecf3a3';
    ctx.fillStyle = '#d9ffffc8';
    ctx.lineWidth = 2.5;
    const offset = elapsed * water.speed * .45 * game.tideDirection;
    for (let y = water.yMin + 68; y < water.yMax; y += 115) {
      for (let x = water.xMin + 90; x < water.xMax; x += 165) {
        const px = x + ((offset % 165 + 165) % 165) - 82;
        ctx.beginPath();ctx.moveTo(px - game.tideDirection * 35, y);ctx.lineTo(px + game.tideDirection * 22, y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(px + game.tideDirection * 22, y);ctx.lineTo(px + game.tideDirection * 12, y - 6);
        ctx.lineTo(px + game.tideDirection * 12, y + 6);ctx.closePath();ctx.fill();
      }
    }
    ctx.restore();
  }
  for (const { x, y } of game.battle.shoreBatteries || (game.battle.shoreBattery ? [game.battle.shoreBattery] : [])) {
    ctx.save();
    ctx.strokeStyle = '#f8b67f';ctx.fillStyle = '#763b2e';ctx.lineWidth = 3;
    ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle = '#ffe5ac';ctx.font = 'bold 14px system-ui';ctx.textAlign = 'center';ctx.fillText('砲',x,y+5);
    ctx.restore();
  }
  if (game.withdrawal) {
    const x = game.battle.withdraw.x;
    ctx.save();ctx.fillStyle = '#4de6d11c';ctx.fillRect(0,0,x,WORLD.height);
    ctx.setLineDash([15,10]);ctx.lineWidth = 4;ctx.strokeStyle = '#8eeed6';
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD.height);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle = '#bffff0';ctx.font = 'bold 19px system-ui';ctx.textAlign = 'center';ctx.fillText('↤ 안전 해역',x/2,800);
    ctx.restore();
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
  for (const island of game.islands) {
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
  if (ship.type === 'panokseon' || ship.type === 'turtle' || ship.type === 'ming') {
    // Broad, nearly squared fighting platform: a recognizable panokseon profile.
    ctx.moveTo(-r * .91, r * .98);
    ctx.lineTo(-r * .98, -r * .99);
    ctx.quadraticCurveTo(0, -r * 1.22, r * .98, -r * .99);
    ctx.lineTo(r * .91, r * .98);
    ctx.quadraticCurveTo(0, r * 1.16, -r * .91, r * .98);
  } else if (ship.type === 'sahuseon' || ship.type === 'kobaya') {
    ctx.moveTo(-r * .47, r * 1.12);
    ctx.lineTo(-r * .62, -r * .45);
    ctx.quadraticCurveTo(-r * .45, -r * 1.55, 0, -r * 1.64);
    ctx.quadraticCurveTo(r * .45, -r * 1.55, r * .62, -r * .45);
    ctx.lineTo(r * .47, r * 1.12);
    ctx.quadraticCurveTo(0, r * 1.26, -r * .47, r * 1.12);
  } else {
    ctx.moveTo(-r * .8, r * .92);
    ctx.lineTo(-r * .86, -r * .55);
    ctx.quadraticCurveTo(-r * .56, -r * (ship.type === 'sekibune' ? 1.65 : 1.34), 0, -r * (ship.type === 'sekibune' ? 1.72 : 1.48));
    ctx.quadraticCurveTo(r * .56, -r * (ship.type === 'sekibune' ? 1.65 : 1.34), r * .86, -r * .55);
    ctx.lineTo(r * .8, r * .92);
    ctx.quadraticCurveTo(0, r * 1.18, -r * .8, r * .92);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = friendly ? '#ad8456' : '#8d5a48';
  ctx.fillRect(-r * .64, -r * .73, r * 1.28, r * 1.42);
  ctx.strokeStyle = '#e7c18b70'; ctx.lineWidth = 1;
  for (let i = -1; i <= 2; i++) {
    const y = i * r * .31;
    ctx.beginPath();ctx.moveTo(-r * .61, y);ctx.lineTo(r * .61, y);ctx.stroke();
  }
  if (ship.type !== 'kobaya' && ship.type !== 'sahuseon') {
    ctx.fillStyle = friendly ? '#65503a' : '#48312d';
    ctx.fillRect(-r * .49, -r * .35, r * .98, r * .65);
    ctx.strokeStyle = friendly ? '#e0c58c' : '#b98369';
    ctx.strokeRect(-r * .49, -r * .35, r * .98, r * .65);
  }
  if (ship.type === 'panokseon') {
    // Two separated working levels and raised battlements, rather than a flat deck.
    ctx.fillStyle = '#d4aa72';
    ctx.fillRect(-r * .8, -r * .76, r * 1.6, r * .18);
    ctx.fillRect(-r * .8, r * .64, r * 1.6, r * .18);
    ctx.fillStyle = '#e4c496';
    for (const side of [-1, 1]) {
      ctx.fillRect(side < 0 ? -r * .99 : r * .78, -r * .69, r * .21, r * 1.32);
      for (let y = -1; y <= 1; y++) {
        ctx.fillStyle = '#704e31';
        ctx.fillRect(side < 0 ? -r * 1.06 : r * .78, y * r * .35 - 2, r * .28, 4);
      }
    }
    ctx.fillStyle = '#463e30';ctx.fillRect(-r * .44, -r * .38, r * .88, r * .74);
    ctx.strokeStyle = '#eccb99';ctx.lineWidth = 2;ctx.strokeRect(-r * .44, -r * .38, r * .88, r * .74);
  } else if (ship.type === 'turtle') {
    ctx.fillStyle = '#55685d';
    ctx.beginPath();ctx.ellipse(0, 0, r * .81, r * 1.04, 0, 0, Math.PI*2);ctx.fill();
    ctx.strokeStyle = '#c7b88b';ctx.lineWidth = 1.5;
    for (let y = -2; y <= 2; y++) {
      ctx.beginPath();ctx.moveTo(-r*.7,y*r*.34);ctx.lineTo(r*.7,y*r*.34);ctx.stroke();
      ctx.fillStyle = '#d9ccab';ctx.beginPath();ctx.arc(0,y*r*.35,2.2,0,Math.PI*2);ctx.fill();
    }
  } else if (ship.type === 'ming') {
    ctx.fillStyle = '#86634a';ctx.fillRect(-r*.5,-r*.72,r,r*1.25);
    ctx.fillStyle = '#bd8a5b';ctx.fillRect(-r*.62,-r*.22,r*1.24,r*.25);
    ctx.strokeStyle = '#e6bd8c';ctx.lineWidth = 2;
    ctx.beginPath();ctx.moveTo(-r*.42,-r*.76);ctx.lineTo(0,-r*1.16);ctx.lineTo(r*.42,-r*.76);ctx.stroke();
  }
  if (ship.type === 'atakebune') {
    // The high, tiered fighting deck makes the largest enemy readable at game zoom.
    ctx.fillStyle = '#b47552';
    ctx.fillRect(-r * .62, -r * .62, r * 1.24, r * .42);
    ctx.fillRect(-r * .53, r * .36, r * 1.06, r * .27);
    ctx.fillStyle = '#6f3934';
    ctx.fillRect(-r * .42, -r * .55, r * .84, r * .18);
    ctx.fillRect(-r * .35, r * .4, r * .7, r * .12);
    ctx.strokeStyle = '#f0bc888c';
    ctx.strokeRect(-r * .62, -r * .62, r * 1.24, r * .42);
  } else if (ship.type === 'sekibune') {
    ctx.fillStyle = '#b86b54';
    ctx.fillRect(-r * .44, -r * .48, r * .88, r * .12);
    ctx.fillRect(-r * .44, r * .31, r * .88, r * .12);
  } else if (ship.type === 'kobaya') {
    ctx.strokeStyle = '#dba180';
    ctx.beginPath();ctx.moveTo(-r*.55,r*.48);ctx.lineTo(r*.55,-r*.48);ctx.stroke();
  } else if (ship.type === 'sahuseon') {
    // Open messenger boat with visible benches and oars, without gunports.
    ctx.strokeStyle = '#f7d99e';ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();ctx.moveTo(-r*.49,i*r*.51);ctx.lineTo(r*.49,i*r*.51);ctx.stroke();
    }
  }
  // Deck rails and visible planking help distinguish the wooden vessels at
  // the game's far zoom without depending on large external textures.
  ctx.strokeStyle = friendly ? '#f5dcaa91' : '#e6a48186';
  ctx.lineWidth = 1.3;
  for (const side of [-1, 1]) {
    ctx.beginPath();ctx.moveTo(side*r*.67,-r*.65);ctx.lineTo(side*r*.65,r*.72);ctx.stroke();
  }
  if (ship.type !== 'sahuseon') {
    ctx.fillStyle = '#302d2a';
    for (const side of [-1, 1]) {
      const slots = ship.type === 'kobaya' ? 1 : ship.type === 'sekibune' || ship.type === 'escort' ? 2 : 3;
      for (let i = 0; i < slots; i++) {
        const y = (i - (slots - 1) / 2) * r * .42;
        ctx.fillRect(side < 0 ? -r - 6 : r - 2, y - 3, 9, 6);
      }
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
  if (game.battle.night) {
    ctx.shadowColor = friendly ? '#ffd38c' : '#ff9771';ctx.shadowBlur = 17;
    ctx.fillStyle = friendly ? '#ffe9ab' : '#f9a380';
    ctx.beginPath();ctx.arc(-r*.52,r*.25,3.7,0,Math.PI*2);ctx.arc(r*.52,r*.25,3.7,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (ship.burnRemaining > 0) {
    for (let i = 0; i < 4; i++) {
      const pulse = Math.sin(elapsed * 13 + i * 2.3 + ship.x) * 3;
      const fx = (i - 1.5) * r * .32;
      const fy = Math.cos(i * 3.4 + elapsed * 3) * r * .32;
      ctx.fillStyle = i % 2 ? '#ffd27abf' : '#eb663ee0';
      ctx.beginPath();ctx.ellipse(fx,fy-5-pulse,3.5,8+Math.abs(pulse),0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#173c3e80';ctx.beginPath();ctx.arc(fx+3,fy-16-pulse,6,0,Math.PI*2);ctx.fill();
    }
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

function drawShipNameplates() {
  // Readable vessel types make the 1592 fleet easier to learn at a glance.
  // Limit enemy tags to the nearest three so the final wave stays legible.
  const nearbyEnemies = game.enemies.filter(ship => !ship.dead &&
    Math.hypot(ship.x - game.player.x, ship.y - game.player.y) < 490)
    .sort((a, b) => Math.hypot(a.x - game.player.x, a.y - game.player.y) -
      Math.hypot(b.x - game.player.x, b.y - game.player.y)).slice(0, 3);
  for (const ship of [game.player, ...game.allies.filter(ally => !ally.dead), ...nearbyEnemies]) {
    if (ship.dead) continue;
    const label = ship.id === 'flagship' ? '기함 · 판옥선' : ship.id === 'eokgi-1' ? '이억기 · 지원 판옥선' : ship.id.startsWith('wing-') ? `학익진 · ${ship.id === 'wing-left' ? '좌익' : '우익'}` : ship.type === 'ming' ? '진린 · 명나라 전선' : ship.type === 'turtle' ? '거북선 · 돌격' : game.difficulty === 'hard' && ship.team === 'japan'
      ? `${SHIP_TYPES[ship.type].name} · ${ship.aiMode}` : SHIP_TYPES[ship.type].name;
    const friendly = ship.team === 'joseon';
    const radius = SHIP_TYPES[ship.type].radius;
    const y = ship.y + radius * 1.5 + 16;
    ctx.save();
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    const width = ctx.measureText(label).width + 16;
    ctx.fillStyle = friendly ? '#092d37df' : '#4b2627e5';
    ctx.strokeStyle = friendly ? '#a9dcc593' : '#e9aa899e';
    ctx.lineWidth = 1;
    ctx.beginPath();ctx.roundRect(ship.x - width / 2, y - 11, width, 18, 5);ctx.fill();ctx.stroke();
    ctx.fillStyle = friendly ? '#e9f3cf' : '#ffdfb5';
    ctx.fillText(label, ship.x, y + 2);
    ctx.restore();
  }
}

function drawBroadsideGuides() {
  if (game.mode !== 'playing' || game.player.dead) return;
  ctx.save();
  ctx.translate(game.player.x, game.player.y);
  ctx.rotate(game.player.angle);
  for (const side of [-1, 1]) {
    const weapon = WEAPONS[game.arsenal[side < 0 ? 'port' : 'starboard']];
    const active = game.player.aimSteady >= .58 && !!broadsideTarget(game.player, game.enemies, side, weapon.range * game.bonuses.range);
    const center = side === 1 ? 0 : Math.PI;
    ctx.beginPath();
    ctx.arc(0, 0, 61, center - 0.73, center + 0.73);
    ctx.strokeStyle = active ? '#ffe5a9e8' : '#e7d6a45c';
    ctx.lineWidth = active ? 4.5 : 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawShots() {
  for (const shot of game.shots) {
    const friendly = shot.team === 'joseon';
    ctx.strokeStyle = shot.weapon === 'fire' ? '#ff8241d6' : shot.weapon === 'heavy' ? '#ffe3a5e0' : friendly ? '#ffdb91ac' : '#ff907c98';
    ctx.lineWidth = shot.weapon === 'heavy' ? 5 : 3;
    ctx.beginPath();ctx.moveTo(shot.x,shot.y);ctx.lineTo(shot.x - shot.vx * .025,shot.y - shot.vy * .025);ctx.stroke();
    ctx.fillStyle = shot.weapon === 'fire' ? '#ffb36f' : friendly ? '#ffe3ad' : '#ffc3a6';
    ctx.beginPath();ctx.arc(shot.x,shot.y,shot.radius,0,Math.PI * 2);ctx.fill();
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath();ctx.arc(shot.x - 1,shot.y - 1,1.8,0,Math.PI * 2);ctx.fill();
  }
}

function drawBoarding() {
  for (const enemy of game.enemies) {
    if (enemy.boardingProgress <= 0 || !enemy.boardingTargetId) continue;
    const target = [game.player, ...game.allies].find(ship => ship.id === enemy.boardingTargetId && !ship.dead);
    if (!target) continue;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#f5a17fee';
    ctx.lineWidth = 3;
    const a = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const gap = SHIP_TYPES[enemy.type].radius * .7;
    ctx.beginPath();ctx.moveTo(enemy.x + Math.cos(a)*gap,enemy.y + Math.sin(a)*gap);
    ctx.lineTo(target.x - Math.cos(a)*SHIP_TYPES[target.type].radius*.7,target.y - Math.sin(a)*SHIP_TYPES[target.type].radius*.7);ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#782e26ee';ctx.lineWidth = 6;
    ctx.beginPath();ctx.arc(enemy.x,enemy.y,SHIP_TYPES[enemy.type].radius*1.65,-Math.PI/2,3*Math.PI/2);ctx.stroke();
    ctx.strokeStyle = '#ffc178';
    ctx.beginPath();ctx.arc(enemy.x,enemy.y,SHIP_TYPES[enemy.type].radius*1.65,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(enemy.boardingProgress,0,1));ctx.stroke();
    ctx.restore();
  }
}

function drawEffects() {
  for (const e of game.effects) {
    const p = clamp(e.age / e.duration, 0, 1);
    ctx.save();ctx.translate(e.x,e.y);
    if (['splash','impact','heavy-impact','boarding'].includes(e.type)) {
      const heavy = e.type === 'heavy-impact', hit = e.type !== 'splash';
      ctx.strokeStyle = hit ? `rgba(248,193,112,${1-p})` : `rgba(200,245,241,${.8*(1-p)})`;
      ctx.lineWidth = heavy ? 5.2*(1-p)+1 : 2.6;
      ctx.beginPath();ctx.arc(0,0,(heavy?9:5)+(heavy?60:35)*p,0,Math.PI*2);ctx.stroke();
      for (let i=0;i<(heavy?12:5);i++) {
        const a=i*Math.PI*2/(heavy?12:5)+e.seed*4;
        ctx.fillStyle=hit?`rgba(251,185,107,${1-p})`:`rgba(215,247,245,${1-p})`;
        const travel = (heavy?44:25)*p;
        ctx.beginPath();ctx.arc(Math.cos(a)*(8+travel),Math.sin(a)*(8+travel),heavy?4.8*(1-p)+1:3*(1-p)+1,0,Math.PI*2);ctx.fill();
        if(heavy){ctx.strokeStyle=`rgba(59,48,37,${.6*(1-p)})`;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(Math.cos(a)*travel,Math.sin(a)*travel);ctx.lineTo(Math.cos(a)*(travel+12),Math.sin(a)*(travel+12));ctx.stroke();}
      }
    } else if (e.type === 'damage') {
      ctx.font = '900 16px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(12,31,42,${1-p})`;
      ctx.fillStyle = e.friendly ? `rgba(255,145,118,${1-p})` : `rgba(255,228,146,${1-p})`;
      const shift = (e.seed - .5) * 28;
      const number = `−${e.amount}`;
      ctx.strokeText(number, shift, -p * 28);
      ctx.fillText(number, shift, -p * 28);
    } else if (e.type === 'muzzle') {
      ctx.fillStyle=`rgba(250,216,159,${.75*(1-p)})`;
      ctx.beginPath();ctx.arc(0,0,8+13*p,0,Math.PI*2);ctx.fill();
    } else if (e.type === 'sink') {
      ctx.strokeStyle=`rgba(225,245,222,${.8*(1-p)})`;
      ctx.lineWidth=4*(1-p)+1;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,13+p*55+i*9,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle=`rgba(55,48,36,${.7*(1-p)})`;
      for(let i=0;i<6;i++){let a=i*Math.PI/3+e.seed*5;ctx.fillRect(Math.cos(a)*p*33-4,Math.sin(a)*p*33-4,8,8);}
      ctx.fillStyle=`rgba(37,47,39,${.4*(1-p)})`;
      ctx.beginPath();ctx.ellipse(0,-22-18*p,21+14*p,9+8*p,0,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
}

function drawOrders() {
  if (game.mode !== 'playing' || game.signalRemaining <= 0) return;
  const blink = .65 + .22 * Math.sin(elapsed * 6);
  if (game.signalOrder === 'focus') {
    const target = game.enemies.find(enemy => enemy.id === game.focusTargetId && !enemy.dead);
    if (!target) return;
    ctx.save();ctx.strokeStyle=`rgba(255,211,123,${blink})`;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(target.x,target.y,SHIP_TYPES[target.type].radius*1.85,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const r=SHIP_TYPES[target.type].radius*2;ctx.beginPath();ctx.moveTo(target.x+Math.cos(a)*r,target.y+Math.sin(a)*r);ctx.lineTo(target.x+Math.cos(a)*(r+15),target.y+Math.sin(a)*(r+15));ctx.stroke();}
    ctx.restore();
  } else {
    const guarding = game.signalOrder === 'guard';
    ctx.save();ctx.strokeStyle=guarding?`rgba(140,231,215,${blink})`:`rgba(253,222,151,${blink})`;ctx.lineWidth=2.5;
    for(const ship of [game.player,...game.allies]){
      if(ship.dead)continue;
      ctx.beginPath();ctx.arc(ship.x,ship.y,SHIP_TYPES[ship.type].radius*(guarding?2.2:1.9)+Math.sin(elapsed*4)*3,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
}

function drawRadar() {
  const compact = viewport.w < 800 || viewport.h < 540;
  const w = compact ? 94 : 116, h = compact ? 69 : 85;
  // The SDK's corner menu occupies the last ~75px at bottom-right.
  // Keep the radar to its left, clear of the mobile helm and command row.
  const x = viewport.w - w - (compact ? 91 : 101);
  const y = compact ? Math.max(168, viewport.h - h - 130) : viewport.h - h - 25;
  ctx.fillStyle = '#092e3fdf';
  ctx.strokeStyle = '#bfdcdb65';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fill();ctx.stroke();
  ctx.strokeStyle = '#d1e6e51e';
  ctx.beginPath();ctx.moveTo(x+w/2,y+10);ctx.lineTo(x+w/2,y+h-10);ctx.moveTo(x+10,y+h/2);ctx.lineTo(x+w-10,y+h/2);ctx.stroke();
  const dot = (ship, tint, radius) => {
    ctx.fillStyle=tint;
    ctx.beginPath();ctx.arc(x+9+(ship.x/WORLD.width)*(w-18),y+9+(ship.y/WORLD.height)*(h-18),radius,0,Math.PI*2);ctx.fill();
  };
  for(const island of game.islands) dot(island,'#6c9277',island.radius/75);
  for(const enemy of radarContacts(game)) dot(enemy,enemy.type==='atakebune'?'#ffd491':'#e88e72',enemy.type==='atakebune'?4.3:2.6);
  for(const ally of game.allies) if(!ally.dead) dot(ally,ally.type==='sahuseon'?'#8fe7f8':'#b7e2cf',ally.type==='sahuseon'?2:3);
  dot(game.player,'#f8d78f',4);
}

function render() {
  const { w, h, dpr } = viewport;
  const zoom = clamp(Math.min(w / 850, h / 530), .58, 1.56);
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
  drawBattleFeatures();
  for(const ship of [game.player,...game.allies,...game.enemies]) drawWake(ship);
  for(const enemy of game.enemies) drawShip(enemy);
  for(const ally of game.allies) drawShip(ally);
  drawShip(game.player);
  drawShipNameplates();
  drawBoarding();
  drawOrders();
  drawBroadsideGuides();
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
      // Stick X is a relative rudder (same as A/D); stick Y is throttle (W/S).
      desired.turn=Math.abs(joystick.x) > .15 ? joystick.x : 0;
      desired.throttle=Math.abs(joystick.y) > .15 ? -joystick.y : 0;
    }
    stepGame(game, desired, dt);
  }
  while (game.events.length) {
    const event=game.events.shift();
    if(event.kind==='fire') playSound(event.weapon === 'heavy' ? 'heavy' : 'fire');
    if(event.kind==='hit') playSound('hit');
    if(['wave','signal','upgrade','victory','defeat','boss','boarding','boarded','objective'].includes(event.kind)) toast(event.text);
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
    if(!event.repeat && issueOrder(game,'rally')) playSound('confirm');
  }
  const command = { Digit1: 'rally', Digit2: 'focus', Digit3: 'guard', Numpad1: 'rally', Numpad2: 'focus', Numpad3: 'guard' }[event.code];
  if(command){
    event.preventDefault();
    if(!event.repeat && issueOrder(game,command)) playSound('confirm');
  }
  if(event.code==='Digit4' || event.code==='Numpad4') {
    event.preventDefault();
    if(!event.repeat && issueSpecial(game)) playSound('confirm');
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
for (const [id, order] of [['signalBtn', 'rally'], ['focusBtn', 'focus'], ['guardBtn', 'guard']]) {
  $(id).addEventListener('click',()=>{if(issueOrder(game,order))playSound('confirm');});
}
$('specialBtn').addEventListener('click',()=>{if(issueSpecial(game))playSound('confirm');});
$('normalDifficulty').addEventListener('click', () => selectDifficulty('normal'));
$('hardDifficulty').addEventListener('click', () => selectDifficulty('hard'));
$('mapStartBtn').addEventListener('click', () => { showCinematic(); playSound('confirm'); });
$('cinematicSkip').addEventListener('click', () => { beginRun(); playSound('confirm'); });
$('cinematicBack').addEventListener('click', backToMenu);
$('crawlContent').addEventListener('animationend', event => {
  if (event.target === $('crawlContent') && event.animationName === 'historyCrawl' && !$('cinematicScreen').hidden && game.mode === 'menu') beginRun();
});
$('shipGuideBtn').addEventListener('click', () => {
  const guide = $('shipGuide');
  guide.hidden = !guide.hidden;
  $('shipGuideBtn').textContent = guide.hidden ? '조선·일본 함선 도감 보기' : '함선 도감 접기';
  if (guide.childElementCount) return;
  for (const ship of SHIP_GUIDE) {
    const entry = document.createElement('article');
    entry.className = `guide-entry ${SHIP_TYPES[ship.type].side}`;
    const name = document.createElement('strong');
    const role = document.createElement('span');
    const note = document.createElement('small');
    name.textContent = SHIP_TYPES[ship.type].name;
    role.textContent = `${ship.period} · ${ship.role}`;
    note.textContent = ship.note;
    entry.append(name, role, note);
    guide.appendChild(entry);
  }
});
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
    snapshot: () => ({mode:game.mode,battleId:game.battleId,withdrawal:game.withdrawal,tideDirection:game.tideDirection,difficulty:game.difficulty,wave:game.waveIndex+1,kills:game.kills,score:game.score,playerHp:game.player.hp,enemies:game.enemies.length,spawned:game.spawned,arsenal:{...game.arsenal},order:game.signalOrder,enemyTactics:game.enemies.slice(0,4).map(e=>({type:e.type,mode:e.aiMode,target:e.aiTargetId}))}),
    start:()=>{if(game.mode==='menu')beginRun();},
    advanceWave:()=>{if(game.mode==='playing'){game.spawned=getWave(game).ships.length;game.enemies=[];game.shots=[];}},
    chooseFirst:()=>{if(game.mode==='upgrade')takeUpgrade(game,game.selected[0]);}
  });
}
showOverlay('menu');
requestAnimationFrame(runFrame);
