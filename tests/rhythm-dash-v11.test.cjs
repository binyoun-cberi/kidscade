const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const runtimePath = path.join(ROOT, 'rhythm-dash-v11.js');
const gamePath = path.join(ROOT, '리듬 대시.html');
const injectorPath = path.join(ROOT, 'scripts', 'inject-game-integrations.cjs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('Rhythm Dash v11 keeps the existing game but adds five-section stage arrangements', () => {
  const source = read(runtimePath);
  for (const name of ['INTRO', 'GROOVE', 'BREAK', 'DROP', 'FINALE']) {
    assert.match(source, new RegExp(`name: '${name}'`), `missing section ${name}`);
  }
  assert.match(source, /const STAGE_META = \[/);
  assert.match(source, /Stage 1: 네온 운동장/);
  assert.match(source, /Stage 16: 골든 피날레/);
  assert.match(source, /buildReworkedMap\(level\)/);
  assert.match(source, /gap\(col,/);
  assert.match(source, /optionalPlatform\(col\)/);
});

test('Rhythm Dash v11 soundtrack is layered beyond the original single-note melody', () => {
  const source = read(runtimePath);
  assert.match(source, /function synthKick\(/);
  assert.match(source, /function synthHat\(/);
  assert.match(source, /function playChord\(/);
  assert.match(source, /function arrangeBeat\(/);
  assert.match(source, /synthTone\(midiToFreq\(rootMidi - 12\)/);
  assert.match(source, /section\.key === 'drop'/);
  assert.match(source, /section\.key === 'finale'/);
});

test('Rhythm Dash v11 preserves one-button play and adds fast retry instead of new control mechanics', () => {
  const source = read(runtimePath);
  assert.match(source, /event\.code !== 'KeyR' && event\.code !== 'Space'/);
  assert.match(source, /tryStartLevel\(currentLevel\.id\)/);
  assert.doesNotMatch(source, /Portal|jumpOrb|gravityPortal|dashOrb/);
});

test('Rhythm Dash owns the v11 runtime in source instead of build-time injection', () => {
  const html = read(gamePath);
  const injector = read(injectorPath);
  assert.match(html, /rhythm-dash-v11\.js\?v=20260916-1/);
  assert.doesNotMatch(injector, /injectScripts\('리듬 대시\.html'/);
  assert.doesNotMatch(injector, /rhythm-dash-v11\.js/);

  const builtGame = path.join(ROOT, 'dist', '리듬 대시.html');
  if (fs.existsSync(builtGame)) {
    assert.match(read(builtGame), /rhythm-dash-v11\.js\?v=20260916-1/);
  }
});
