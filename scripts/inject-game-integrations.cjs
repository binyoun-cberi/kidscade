const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const TOUCH_GUARD_SRC = '/touch-interaction-guard.js?v=20260919-1';
const AUDIO_MANAGER_SRC = '/audio-manager.js?v=20260917-1';
const AUDIO_HOOKS_SRC = '/game-audio-hooks.js?v=20260917-2';
const AUDIO_EXTRA_HOOKS_SRC = '/game-audio-hooks-extra.js?v=20260917-1';
const AUDIO_HOOK_TITLES = new Set([
  '인내의 탑',
  '멍멍 곱셈 러너',
  '우주 샌드위치 가게',
  '아이스크림 나눗셈 가게',
  '교실전쟁 3D',
  '숫자 타워',
  '스펠링 프로그',
  '블록래프트',
  'OUTBREAK KOREA',
  '한자 수호전: 8급'
]);
const AUDIO_EXTRA_HOOK_TITLES = new Set([
  '외계인 피자 가게',
  '문방구 사장님',
  '약수 타워 디펜스',
  '넘버 시그널 (룬의 숲)',
  '역사 로얄',
  '오목 아레나'
]);

function injectScripts(relativeHtml, scripts) {
  const file = path.join(dist, relativeHtml);
  if (!fs.existsSync(file)) throw new Error(`Missing built game file: ${relativeHtml}`);
  let html = fs.readFileSync(file, 'utf8');
  const tags = scripts
    .filter(src => !html.includes(`src="${src}"`))
    .map(src => `<script src="${src}"></script>`)
    .join('\n');
  if (!tags) return false;
  if (!html.includes('</body>')) throw new Error(`Cannot inject game integration: ${relativeHtml} has no </body>`);
  html = html.replace('</body>', `${tags}\n</body>`);
  fs.writeFileSync(file, html);
  return true;
}

function stripHrefSuffix(href) {
  const value = String(href || '').trim();
  if (!value || /^(?:https?:|data:|javascript:|#)/i.test(value)) return '';
  const plain = value.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  try { return decodeURIComponent(plain); } catch (_) { return plain; }
}

function injectDocumentStartScript(html, tag, relativeHtml) {
  if (/<\/head\s*>/i.test(html)) {
    return html.replace(/<\/head\s*>/i, `${tag}\n</head>`);
  }

  const bodyMatch = html.match(/<body\b[^>]*>/i);
  if (bodyMatch) {
    return html.replace(bodyMatch[0], `${bodyMatch[0]}\n${tag}`);
  }

  // A few older single-file games omit explicit <head>/<body> tags. Browsers
  // still parse them correctly, so put the shared runtime immediately after
  // <html> and let the HTML parser infer the document sections.
  const htmlMatch = html.match(/<html\b[^>]*>/i);
  if (htmlMatch) {
    return html.replace(htmlMatch[0], `${htmlMatch[0]}\n${tag}`);
  }

  const doctypeMatch = html.match(/^\s*<!doctype\b[^>]*>/i);
  if (doctypeMatch) {
    return html.replace(doctypeMatch[0], `${doctypeMatch[0]}\n${tag}`);
  }

  throw new Error(`Cannot inject audio manager: ${relativeHtml} has no document anchor`);
}

function injectDocumentEndScript(html, tag) {
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${tag}\n</body>`);
  }
  if (/<\/html\s*>/i.test(html)) {
    return html.replace(/<\/html\s*>/i, `${tag}\n</html>`);
  }
  return `${html}\n${tag}\n`;
}

function injectAudioRuntimeIntoCatalogGames() {
  const catalogPath = path.join(dist, 'data', 'games.json');
  if (!fs.existsSync(catalogPath)) throw new Error('Missing built game catalog: data/games.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const targets = new Map();

  for (const game of Array.isArray(catalog.games) ? catalog.games : []) {
    if (!game || game.disabled) continue;
    const relativeHtml = stripHrefSuffix(game.href);
    if (!relativeHtml || !/\.html?$/i.test(relativeHtml)) continue;
    if (!targets.has(relativeHtml)) targets.set(relativeHtml, []);
    targets.get(relativeHtml).push(game);
  }

  let touchGuardInjected = 0;
  let managerInjected = 0;
  let hooksInjected = 0;
  let extraHooksInjected = 0;
  for (const [relativeHtml, games] of targets) {
    const file = path.join(dist, relativeHtml);
    if (!fs.existsSync(file)) throw new Error(`Catalog audio target does not exist: ${relativeHtml}`);
    let html = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (!/touch-interaction-guard\.js(?:\?|\")/.test(html)) {
      const tag = `<script src="${TOUCH_GUARD_SRC}"></script>`;
      html = injectDocumentStartScript(html, tag, relativeHtml);
      touchGuardInjected += 1;
      changed = true;
    }

    if (!/audio-manager\.js(?:\?|\")/.test(html)) {
      const tag = `<script src="${AUDIO_MANAGER_SRC}"></script>`;
      html = injectDocumentStartScript(html, tag, relativeHtml);
      managerInjected += 1;
      changed = true;
    }

    const needsHooks = games.some(game => AUDIO_HOOK_TITLES.has(String(game.title || '').trim()));
    if (needsHooks && !/game-audio-hooks\.js(?:\?|\")/.test(html)) {
      html = injectDocumentEndScript(html, `<script src="${AUDIO_HOOKS_SRC}"></script>`);
      hooksInjected += 1;
      changed = true;
    }

    const needsExtraHooks = games.some(game => AUDIO_EXTRA_HOOK_TITLES.has(String(game.title || '').trim()));
    if (needsExtraHooks && !/game-audio-hooks-extra\.js(?:\?|\")/.test(html)) {
      html = injectDocumentEndScript(html, `<script src="${AUDIO_EXTRA_HOOKS_SRC}"></script>`);
      extraHooksInjected += 1;
      changed = true;
    }

    if (changed) fs.writeFileSync(file, html, 'utf8');
  }

  return { games: targets.size, touchGuardInjected, managerInjected, hooksInjected, extraHooksInjected };
}

function fixDogRunnerGateOrientation() {
  const relativeHtml = 'games/low_math_dog_runner/멍멍 곱셈 러너.html';
  const file = path.join(dist, relativeHtml);
  if (!fs.existsSync(file)) throw new Error(`Missing built game file: ${relativeHtml}`);
  let html = fs.readFileSync(file, 'utf8');
  const sideways = 'g.rotation.y=Math.PI/2;';
  const forward = 'g.rotation.y=0;';

  if (html.includes(sideways)) {
    html = html.replace(sideways, forward);
    fs.writeFileSync(file, html, 'utf8');
    return true;
  }
  if (html.includes(forward)) return false;
  throw new Error('Dog runner gate orientation marker was not found.');
}

function bumpGameHref(gameId, nextHref) {
  const catalogPath = path.join(dist, 'data', 'games.json');
  if (!fs.existsSync(catalogPath)) throw new Error('Missing built game catalog: data/games.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const game = Array.isArray(catalog.games)
    ? catalog.games.find(item => item && item.id === gameId)
    : null;
  if (!game) throw new Error(`Game catalog entry was not found: ${gameId}`);
  const changed = game.href !== nextHref;
  game.href = nextHref;
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return changed;
}

const classroomChanged = injectScripts('games/high_classroom_war_3d/교실전쟁 3D.html', [
  '/classroom-war-records.js?v=20260916-1',
  '/classroom-war-records-observer.js?v=20260916-1'
]);

const timingChanged = injectScripts('딱! 타임 LCD.html', [
  'timing-exact10-records.js?v=20260916-1'
]);

const rhythmDashChanged = injectScripts('리듬 대시.html', [
  '/rhythm-dash-v11.js?v=20260916-1'
]);

const patienceTowerChanged = injectScripts('인내의 탑.html', [
  '/patience-tower-rework.js?v=20260918-3',
  '/patience-tower-duel-entry.js?v=20260918-1'
]);
const patienceTowerHrefChanged = bumpGameHref(
  'patience_tower',
  '인내의 탑.html?v=6'
);

const dogRunnerGateChanged = fixDogRunnerGateOrientation();
const dogRunnerFxChanged = injectScripts('games/low_math_dog_runner/멍멍 곱셈 러너.html', [
  '/dog-runner-polish.js?v=20260917-2'
]);
const dogRunnerHrefChanged = bumpGameHref(
  'low_math_dog_runner',
  'games/low_math_dog_runner/멍멍 곱셈 러너.html?v=5'
);
const spaceSandwichHrefChanged = bumpGameHref(
  'alien_sandwich',
  'games/alien_sandwich/우주 샌드위치 가게.html?v=4'
);

const audioRuntime = injectAudioRuntimeIntoCatalogGames();

console.log(`[game-integrations] Classroom War records ${classroomChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Timing exact 10 records ${timingChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Rhythm Dash v11 ${rhythmDashChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Patience Tower rework + duel entry ${patienceTowerChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Patience Tower href ${patienceTowerHrefChanged ? 'bumped to v6' : 'already v6'}.`);
console.log(`[game-integrations] Dog runner gate ${dogRunnerGateChanged ? 'rotated forward' : 'already forward'}.`);
console.log(`[game-integrations] Dog runner polish ${dogRunnerFxChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Dog runner href ${dogRunnerHrefChanged ? 'bumped to v5' : 'already v5'}.`);
console.log(`[game-integrations] Space sandwich href ${spaceSandwichHrefChanged ? 'bumped to v4' : 'already v4'}.`);
console.log(`[game-integrations] Touch long-press guard checked ${audioRuntime.games} catalog games; injected ${audioRuntime.touchGuardInjected}.`);
console.log(`[game-integrations] Audio manager checked ${audioRuntime.games} catalog games; injected ${audioRuntime.managerInjected}, enhanced hooks ${audioRuntime.hooksInjected}, extra hooks ${audioRuntime.extraHooksInjected}.`);
