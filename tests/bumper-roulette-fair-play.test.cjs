'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '../games/low_bumper_roulette/index.html'),
  'utf8'
);

test('bumper roulette never exposes or applies teacher-picked outcomes', () => {
  for (const forbidden of [
    '교사 지정 결과', 'teacherResults', 'cheatData', 'debug-panel',
    'cheat-row', 'reservedFor', 'reserveTeacherSlots',
    'parseCheatData', 'isTeacherDirected'
  ]) {
    assert.ok(!html.includes(forbidden), `Obsolete directed-result logic: ${forbidden}`);
  }
});

test('winner and assignment modes retain setup, race, and saved preferences', () => {
  for (const required of [
    'data-student-mode="winner"', 'data-student-mode="assign"',
    'function startGame()', 'function getPreferredSlotForMarble',
    'function captureMarbleInSlot', 'function saveGameConfig()',
    'function loadGameConfig()', "localStorage.setItem(CONFIG_KEY"
  ]) {
    assert.ok(html.includes(required), `Missing race functionality: ${required}`);
  }
});

test('bumper roulette inline JavaScript parses', () => {
  const scripts = html.split(/<script[^>]*>/).slice(1)
    .map(piece => piece.split('</script>')[0].trim())
    .filter(Boolean);
  assert.ok(scripts.length > 0, 'Expected inline game script');
  for (const script of scripts) assert.doesNotThrow(() => new vm.Script(script));
});
