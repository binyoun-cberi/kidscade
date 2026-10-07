const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', 'teacher-classroom-sim-prototype');
const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(gameDir, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
const aiPath = path.join(gameDir, 'student-ai.mjs');
const catalogData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
const catalog = Array.isArray(catalogData) ? catalogData : catalogData.games;
const game = catalog.find(g => g.id === 'job_teacher_classroom');

test('teacher simulator v60 is a direct-control 3D classroom game', () => {
  assert.match(html, /id="game"/);
  assert.match(html, /id="joystick"/);
  assert.match(html, /id="actionButton"/);
  assert.match(html, /game\.js\?v=60/);
  assert.match(html, /style\.css\?v=60/);
  assert.doesNotMatch(html, /waiting-panel/);
  assert.doesNotMatch(html, /visitorCard/);
  assert.doesNotMatch(html, /classroom-assets\.css/);
  assert.match(css, /#joystick/);
  assert.match(css, /#actionButton/);
});

test('teacher simulator game module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:js,encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'teacher simulator syntax check failed');
});

test('teacher simulator reuses Chibi and committed furniture assets', () => {
  const assets = [
    'assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/allinonepr.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/desk.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/chair-desk.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/bookcase-open.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/computer-screen.glb'
  ];
  for (const rel of assets) assert.ok(fs.existsSync(path.join(root, rel)), 'missing teacher simulator asset: '+rel);
  assert.match(js, /allinonepr\.glb/);
  assert.match(js, /kenney-furniture-kit\/desk\.glb/);
  assert.match(js, /student-ai\.mjs/);
});

test('student AI safety rails cap simultaneous chaos', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?t=' + Date.now());
  assert.equal(ai.AI_RULES.maxConcurrentSocialPairs, 2);
  assert.equal(ai.AI_RULES.maxConcurrentConflicts, 1);
  assert.equal(ai.AI_RULES.maxFightsPerRecess, 1);
  assert.ok(ai.AI_RULES.conflictCooldownSeconds >= 6);
  assert.ok(ai.AI_RULES.separatedCooldownSeconds > ai.AI_RULES.conflictCooldownSeconds);
});

test('focus cap and recovery create different student rhythms without personality classes', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?focus=' + Date.now());
  const minsu = ai.createStudentRuntime(ai.STUDENT_PROFILES.find(s => s.id === 'minsu'));
  const seoyeon = ai.createStudentRuntime(ai.STUDENT_PROFILES.find(s => s.id === 'seoyeon'));
  let minsuStarts = 0;
  let seoyeonStarts = 0;
  for (let t=0;t<180;t+=.1) {
    if (ai.updateLessonFocus(minsu,.1,{teacherNear:false}) === 'offtask-start') minsuStarts++;
    if (ai.updateLessonFocus(seoyeon,.1,{teacherNear:false}) === 'offtask-start') seoyeonStarts++;
  }
  assert.ok(minsuStarts > seoyeonStarts, 'low-cap fast-recovery student should cycle off task more often');
  assert.ok(minsuStarts >= 2);
  assert.ok(seoyeonStarts <= 1);
});

test('low social energy raises conflict risk but teacher proximity suppresses it', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?social=' + Date.now());
  const a = ai.createStudentRuntime(ai.STUDENT_PROFILES[0]);
  const b = ai.createStudentRuntime(ai.STUDENT_PROFILES[1]);
  a.social = a.socialMax * .15;
  b.social = b.socialMax * .18;
  const alone = ai.conflictProbability(a,b,{teacherNear:false,relationActive:false});
  const watched = ai.conflictProbability(a,b,{teacherNear:true,relationActive:false});
  assert.ok(alone >= .3 && alone <= .5);
  assert.ok(watched < alone);
  assert.equal(ai.conflictProbability(a,b,{teacherNear:false,relationActive:true}),1);
});

test('catalog publishes teacher simulator v60', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/teacher-classroom-sim-prototype/index.html?v=60');
  assert.match(game.description, /직접 움직여/);
});
