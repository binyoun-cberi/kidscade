'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'games/job_drone_pilot/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'games/job_drone_pilot/drone-sim.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'games/job_drone_pilot/drone-sim.js'), 'utf8');

test('drone pilot v3 cockpit controls are present', () => {
  for (const id of ['pipView','armBtn','modeBtn','gimbalUpBtn','gimbalDownBtn','wind','health']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /drone-sim\.js\?v=20260929-4/);
  assert.match(html, /drone-sim\.css\?v=20260927-3/);
  assert.match(css, /#controllerScreen/);
});

test('drone pilot v3 source remains syntactically valid', () => {
  const withoutImports = js.replace(/^import .*;$/gm, '');
  assert.doesNotThrow(() => new Function(withoutImports));
});

test('drone pilot v3 includes safety, camera and flight systems', () => {
  assert.match(js, /armed:\s*false/);
  assert.match(js, /flightMode\s*=\s*'stable'/);
  assert.match(js, /function updateWind/);
  assert.match(js, /function pollGamepadButtons/);
  assert.match(js, /function renderPip/);
  assert.match(js, /function cameraAimError/);
  assert.match(js, /rth\.phase='hover'/);
  assert.match(js, /스틱 입력 감지/);
  assert.match(js, /drone\.health/);
  assert.match(js, /groundStill/);
});

test('drone pilot v3 preserves core mission set', () => {
  for (const mission of ['photo','inspect','delivery','search','course']) {
    assert.match(js, new RegExp(`type:'${mission}'`));
  }
  assert.match(js, /FIXED_DT\s*=\s*1\s*\/\s*60/);
});


test('drone pilot uses QA-gated shared community scenery', () => {
  assert.match(js, /shared-community-3d\.js/);
  assert.match(js, /shared-community-3d-runtime\.js/);
  assert.match(js, /prepareShared3DObject/);
  for (const id of ['nature.commonTreeA','nature.pineTreeA','prop.waterTower','building.house']) {
    assert.match(js, new RegExp(id.replace(/\./g, '\\.')));
  }
  assert.match(js, /loadSharedWorldDecor/);
});
