const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

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
  '/patience-tower-duel-entry.js?v=20260917-1'
]);

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

console.log(`[game-integrations] Classroom War records ${classroomChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Timing exact 10 records ${timingChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Rhythm Dash v11 ${rhythmDashChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Patience Tower duel entry ${patienceTowerChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Dog runner gate ${dogRunnerGateChanged ? 'rotated forward' : 'already forward'}.`);
console.log(`[game-integrations] Dog runner polish ${dogRunnerFxChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Dog runner href ${dogRunnerHrefChanged ? 'bumped to v5' : 'already v5'}.`);
console.log(`[game-integrations] Space sandwich href ${spaceSandwichHrefChanged ? 'bumped to v4' : 'already v4'}.`);
