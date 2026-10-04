const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const RESULT_WIRED = [
  ['games/high_folklore_night_guard/index.html', "scope:'shift'"],
  ['games/high_pass_mafia/game.js', "scope:'match'"],
  ['games/high_rule_lab/game.js', "scope:'stage'"],
  ['games/infinite_gugudan/무한 구구단： 무한루.html', "scope:'match'"],
  ['games/job_driver_license/driver-license.js', "scope:'mission'"],
  ['games/joseon_janggu/신명나는 쿵덕장구!.html', "scope:'run'"],
  ['games/low_blind_elephant/game.js', "scope:'session'"],
  ['games/low_pattern_lock/game.js', "scope:'stage'"],
  ['games/low_perfect_pitch/game.js', "scope:'run'"],
  ['games/low_pong_battle/game.js', "scope:'match'"],
  ['games/low_speak_jjoayo/game.js', "scope:'session'"],
  ['games/low_word_blaster/word-blaster.js', "scope:'run'"],
  ['games/low_wordris/game.js', "scope:'run'"],
  ['games/toddler_muk_jji_ppa/index.html', "scope:'match'"],
  ['games/toddler_photo_coloring/game.js', "scope:'creation'"],
  ['한붓쓱.html', "scope:'stage'"]
];

test('batch-one games report structured results instead of legacy gameOver', () => {
  for (const [file, scopeToken] of RESULT_WIRED) {
    const source = read(file);
    assert.ok(source.includes(scopeToken), file + ' missing ' + scopeToken);
    assert.match(source, /KidscadeGame(?:\?\.|\.)result/, file + ' must report result()');
    assert.doesNotMatch(source, /KidscadeGame(?:\?\.|\.)gameOver/, file + ' must not report legacy gameOver()');
  }
});

test('match games distinguish wins and losses', () => {
  const pong = read('games/low_pong_battle/game.js');
  const muk = read('games/toddler_muk_jji_ppa/index.html');
  const gugudan = read('games/infinite_gugudan/무한 구구단： 무한루.html');
  const mafia = read('games/high_pass_mafia/game.js');
  assert.match(pong, /outcome:winner==='left'\?'win':'loss'/);
  assert.match(muk, /outcome:win\?'win':'loss'/);
  assert.match(gugudan, /outcome:winner===0\?'win':'loss'/);
  assert.match(mafia, /outcome:winner === 'town' \? 'win' : 'loss'/);
});

test('stage games report each meaningful clear instead of only final completion', () => {
  const ruleLab = read('games/high_rule_lab/game.js');
  const pattern = read('games/low_pattern_lock/game.js');
  const oneStroke = read('한붓쓱.html');
  assert.match(ruleLab, /stage:levelIndex\+1/);
  assert.doesNotMatch(ruleLab, /clearedCount===DATA\.levels\.length.*gameOver/);
  assert.match(pattern, /function sdkStageClear/);
  assert.match(pattern, /sdkStageClear\(l\.id,'campaign'\)/);
  assert.match(pattern, /sdkStageClear\('friend','friend'\)/);
  assert.match(oneStroke, /outcome:'clear'/);
  assert.match(oneStroke, /completedCount:save\.completed\.length/);
});

test('driver license keeps exam missions separate from practice sessions', () => {
  const source = read('games/job_driver_license/driver-license.js');
  assert.match(source, /scope:'mission',status:passed\?'completed':'failed'/);
  assert.match(source, /outcome:passed\?'clear':'fail'/);
  assert.match(source, /scope:'session',status:'completed',practice:true/);
});

test('Ecopolis progression uses five natural milestone sources', () => {
  const source = read('games/high_ecopolis/game.js');
  const catalog = read('achievement-catalog.js');
  assert.match(source, /milestone\?\.\('species_returned'/);
  assert.match(source, /uniqueKey:species/);
  assert.match(source, /milestone\?\.\('ecosystem_restored'/);
  assert.match(source, /uniqueKey:selectedScenario/);
  assert.match(source, /KidscadeGame\?\.score\?\.\(score\)/);
  assert.match(catalog, /high_ecopolis:\s*\{\s*mastery:\{event:'milestone', field:'restored'/);
});

test('night guard failure and success remain different shift results', () => {
  const source = read('games/high_folklore_night_guard/index.html');
  assert.match(source, /scope:'shift',status:'failed',outcome:'fail'/);
  assert.match(source, /scope:'shift',status:'completed',outcome:'clear'/);
});
