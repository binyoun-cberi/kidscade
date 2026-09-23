const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(ROOT, 'games', 'high_bridge_builder', 'bridge-builder.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'games', 'high_bridge_builder', 'index.html'), 'utf8');

function readNumber(pattern, label) {
  const match = runtime.match(pattern);
  assert.ok(match, 'missing ' + label);
  return Number(match[1]);
}

test('Bridge Lab requires structural support instead of road-only ropes', () => {
  assert.match(runtime, /function structuralSupportSet\(\)/);
  assert.match(runtime, /function computeRouteFlexStress\(\)/);
  assert.match(runtime, /m\.type==="road"\)proxy=Math\.max\(proxy,S\.flexStress/);

  const freeSpan = readNumber(/freeSpan:(\d+(?:\.\d+)?)/, 'road free span');
  const breakThreshold = readNumber(/proxy>(\d+(?:\.\d+)?)/, 'break threshold');
  const centerFactor = 0.72 + 0.42;
  const flexStress = span => Math.pow(span / freeSpan, 1.45) * 0.72 * centerFactor;

  assert.ok(
    flexStress(340) > breakThreshold,
    'the first level must not be solvable by a 340m unsupported road-only span'
  );
  assert.ok(
    flexStress(210) < breakThreshold,
    'a sensibly supported early-game span should keep a forgiving safety margin'
  );
});

test('Bridge Lab materials have distinct engineering roles', () => {
  const roadStiff = readNumber(/road:\{[^}]*stiff:(\d+(?:\.\d+)?)/, 'road stiffness');
  const beamStiff = readNumber(/beam:\{[^}]*stiff:(\d+(?:\.\d+)?)/, 'beam stiffness');
  const cableStiff = readNumber(/cable:\{[^}]*stiff:(\d+(?:\.\d+)?)/, 'cable stiffness');

  assert.ok(roadStiff < beamStiff, 'road deck should be more flexible than structural beams');
  assert.ok(cableStiff < beamStiff, 'cables should not behave like compression beams');
  assert.match(runtime, /m\.type==="cable"&&stretch<0/);
  assert.match(runtime, /applyMemberWeight\(\)/);
});

test('Bridge Lab teaches the same rule the simulation enforces', () => {
  assert.match(html, /긴 도로는 혼자 못 버텨요/);
  assert.match(html, /철제 빔/);
  assert.match(html, /케이블/);
  assert.match(runtime, /maxSag:48/);
  assert.match(runtime, /maxSway:46/);
});
