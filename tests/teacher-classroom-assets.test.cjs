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
const js = fs.readFileSync(path.join(gameDir, 'school-day-game.js'), 'utf8');
const aiPath = path.join(gameDir, 'student-ai.mjs');
const dayPath = path.join(gameDir, 'school-day.mjs');
const lifePath = path.join(gameDir, 'student-life.mjs');
const catalogData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
const catalog = Array.isArray(catalogData) ? catalogData : catalogData.games;
const game = catalog.find(g => g.id === 'job_teacher_classroom');

test('teacher simulator v64 loads the six-period direct-control game', () => {
  assert.match(html, /id="game"/);
  assert.match(html, /id="joystick"/);
  assert.match(html, /id="actionButton"/);
  assert.match(html, /id="dayStrip"/);
  assert.match(html, /school-day-game\.js\?v=64/);
  assert.match(html, /style\.css\?v=64/);
  assert.match(html, /건강/);
  assert.match(html, /안전교육/);
  assert.match(css, /\.focusMeter/);
  assert.match(css, /\.socialMeter/);
});

test('teacher simulator modules parse as JavaScript', () => {
  for (const name of ['school-day-game.js','school-day.mjs','student-ai.mjs','student-life.mjs']) {
    const src = fs.readFileSync(path.join(gameDir, name), 'utf8');
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:src,encoding:'utf8'});
    assert.equal(result.status, 0, name+': '+(result.stderr || result.stdout || 'syntax check failed'));
  }
});

test('six periods include safety and group lessons', async () => {
  const day = await import(pathToFileURL(dayPath).href + '?day=' + Date.now());
  assert.equal(day.PERIODS.length, 6);
  assert.deepEqual(day.PERIODS.map(p => p.subject), ['수학','국어','체육','과학','미술','컴퓨터']);
  const lessons = day.DAY_STEPS.filter(s => s.kind === 'lesson');
  assert.equal(lessons.length, 6);
  assert.deepEqual(lessons.filter(s => s.safetyRequired).map(s => s.subject), ['체육','과학']);
  assert.deepEqual(lessons.filter(s => s.teamActivity).map(s => s.subject), ['체육','과학','미술','컴퓨터']);
  for (const step of lessons.filter(s => s.safetyRequired)) {
    assert.ok(step.teamStartRatio >= .6, 'team activity should start after safety briefing');
  }
});

test('subject preference continuously changes focus drain by 0.8 1.0 1.2', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?pref-ai=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?pref-life=' + Date.now());
  assert.deepEqual(life.PREFERENCE_RULES, {like:.8,neutral:1,dislike:1.2});

  const profile = ai.STUDENT_PROFILES.find(s => s.id === 'minsu');
  const liked = ai.createStudentRuntime(profile);
  const disliked = ai.createStudentRuntime(profile);
  for (let t=0;t<30;t+=.1) {
    ai.updateLessonFocus(liked,.1,{drainMultiplier:life.preferenceMultiplier('minsu','체육')});
    ai.updateLessonFocus(disliked,.1,{drainMultiplier:life.preferenceMultiplier('minsu','국어')});
  }
  assert.ok(disliked.focus < liked.focus);
});

test('illness slows focus recovery without changing focus maximum', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?health-ai=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?health-life=' + Date.now());
  const profile = ai.STUDENT_PROFILES[0];
  const healthy = ai.createStudentRuntime(profile);
  const sick = ai.createStudentRuntime(profile);
  healthy.mode = sick.mode = 'offtask';
  healthy.focus = sick.focus = profile.focusMax * .1;
  for (let t=0;t<4;t+=.1) {
    ai.updateLessonFocus(healthy,.1,{recoveryMultiplier:life.healthRecoveryMultiplier({state:'healthy'})});
    ai.updateLessonFocus(sick,.1,{recoveryMultiplier:life.healthRecoveryMultiplier({state:'sick'})});
  }
  assert.equal(healthy.focusMax, sick.focusMax);
  assert.ok(healthy.focus > sick.focus);
  assert.ok(life.HEALTH_RULES.sickRecoveryMultiplier < life.HEALTH_RULES.mildRecoveryMultiplier);
});

test('daily illness is capped at two students and has a safe fallback', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?health-profiles=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?health-cap=' + Date.now());
  assert.equal(life.HEALTH_RULES.sickChance, .10);
  const health = life.createDailyHealth(ai.STUDENT_PROFILES, () => 0);
  assert.equal(health.filter(h => h.state !== 'healthy').length, 2);

  const stranded = {state:'mild',parentAvailable:false};
  const decision = life.nextHealthAction(stranded,{nurseAvailable:false},3);
  assert.equal(decision.type, 'rest');

  const nurse = life.nextHealthAction({state:'mild',parentAvailable:false},{nurseAvailable:true},6);
  assert.equal(nurse.type, 'nurse');
  assert.equal(nurse.awayUntilPeriod, 7);
});

test('safety attention is continuous and missed safety creates accident risk', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?safety-ai=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?safety-life=' + Date.now());
  const focused = ai.createStudentRuntime(ai.STUDENT_PROFILES[0]);
  const distracted = ai.createStudentRuntime(ai.STUDENT_PROFILES[1]);
  life.beginSafetyRecord(focused,3);
  life.beginSafetyRecord(distracted,3);

  let focusedResult = '', distractedResult = '';
  const end = life.SAFETY_RULES.briefingStartSeconds + life.SAFETY_RULES.briefingDurationSeconds + .2;
  for (let t=0;t<end;t+=.1) {
    const a = life.tickSafetyRecord(focused,.1,{lessonElapsed:t,focusRatio:.9,blocked:false});
    const b = life.tickSafetyRecord(distracted,.1,{lessonElapsed:t,focusRatio:.45,blocked:false});
    if (a) focusedResult = a;
    if (b) distractedResult = b;
  }
  assert.equal(focusedResult, 'safety-heard');
  assert.equal(distractedResult, 'safety-missed');
  assert.equal(life.unsafeAccidentChance(.1,{safetyHeard:true,focusRatio:.2}), 0);
  assert.ok(life.unsafeAccidentChance(.1,{safetyHeard:false,focusRatio:.2}) > 0);
  assert.equal(life.SAFETY_RULES.maxAccidentsPerLesson, 1);
});

test('group activity drains social energy while focus continues', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?group-ai=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?group-life=' + Date.now());
  const student = ai.createStudentRuntime(ai.STUDENT_PROFILES[3]);
  const f0 = student.focus;
  const s0 = student.social;
  for (let t=0;t<20;t+=.1) {
    ai.updateLessonFocus(student,.1,{drainMultiplier:life.preferenceMultiplier(student.id,'과학')});
    ai.drainSocial(student,.1,life.GROUP_RULES.socialDrainMultiplier);
  }
  assert.ok(student.focus < f0);
  assert.ok(student.social < s0);
  assert.equal(life.GROUP_RULES.socialDrainMultiplier, .12);
  assert.equal(life.GROUP_RULES.conflictCheckEverySeconds, 12);
  assert.equal(life.GROUP_RULES.tiredConflictChanceMultiplier, .2);
  assert.equal(life.GROUP_RULES.unresolvedConflictChance, 1);
});

test('unresolved relationships survive step changes until teacher mediation', () => {
  assert.doesNotMatch(js, /relations\.clear\(\)/);
  assert.match(js, /relations\.add\(relationKey/);
  assert.match(js, /relations\.delete\(relationKey/);
  assert.match(js, /GROUP_RULES\.unresolvedConflictChance/);
  assert.match(js, /function beginTeamConflict\(/);
});

test('health actions include check nurse dismissal and classroom rest', () => {
  assert.match(js, /type:'healthCheck'/);
  assert.match(js, /type:'healthDecision'/);
  assert.match(js, /stats\.nurseVisits\+\+/);
  assert.match(js, /stats\.earlyDismissals\+\+/);
  assert.match(js, /stats\.classroomRests\+\+/);
});

test('student AI safety rails still cap chaos', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?rails=' + Date.now());
  assert.equal(ai.AI_RULES.maxConcurrentSocialPairs, 2);
  assert.equal(ai.AI_RULES.maxConcurrentConflicts, 1);
  assert.equal(ai.AI_RULES.maxFightsPerRecess, 1);
});

test('student navigation still uses exact furniture intersection checks', () => {
  assert.match(js, /function segmentHitsRect\(/);
  assert.match(js, /function studentSegmentClear\(/);
  assert.match(js, /function findStudentPath\(/);
  assert.doesNotMatch(js, /\|\|actor\.kind==='student'/);
});

test('multi-room assets remain connected', () => {
  const assets = [
    'assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/allinonepr.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/desk.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/bench.glb',
    'assets/game/platformer/props/ball.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/kitchen-sink.glb',
    'assets/game/3d/bakery/interior/table-round-a.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/computer-screen.glb'
  ];
  for (const rel of assets) assert.ok(fs.existsSync(path.join(root, rel)), 'missing teacher simulator asset: '+rel);
});

test('catalog publishes teacher simulator v64', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/teacher-classroom-sim-prototype/index.html?v=64');
  assert.match(game.description, /건강/);
  assert.match(game.description, /안전교육/);
});
