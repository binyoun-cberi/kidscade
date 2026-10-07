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
const catalogData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
const catalog = Array.isArray(catalogData) ? catalogData : catalogData.games;
const game = catalog.find(g => g.id === 'job_teacher_classroom');

test('teacher simulator v63 loads the six-period direct-control game', () => {
  assert.match(html, /id="game"/);
  assert.match(html, /id="joystick"/);
  assert.match(html, /id="actionButton"/);
  assert.match(html, /id="dayStrip"/);
  assert.match(html, /school-day-game\.js\?v=62/);
  assert.match(html, /style\.css\?v=62/);
  assert.match(css, /#dayStrip/);
});

test('teacher simulator school-day module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:js,encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'school-day game syntax check failed');
});

test('six periods and six school spaces are configured', async () => {
  const day = await import(pathToFileURL(dayPath).href + '?day=' + Date.now());
  assert.equal(day.PERIODS.length, 6);
  assert.deepEqual(day.PERIODS.map(p => p.subject), ['수학','국어','체육','과학','미술','컴퓨터']);
  assert.deepEqual(Object.keys(day.SCHOOL_SPACES).sort(), ['art','cafeteria','classroom','computer','gym','science'].sort());
  assert.ok(day.DAY_STEPS.some(s => s.kind === 'social' && s.lunch));
  assert.equal(day.DAY_STEPS.at(-1).kind, 'done');
});

test('every lesson is preceded by a preparation step in the same space', async () => {
  const day = await import(pathToFileURL(dayPath).href + '?prep=' + Date.now());
  for (let i=0;i<day.DAY_STEPS.length;i++) {
    const step = day.DAY_STEPS[i];
    if (step.kind !== 'lesson') continue;
    const prev = day.DAY_STEPS[i-1];
    assert.ok(prev);
    assert.equal(prev.kind, 'prep');
    assert.equal(prev.location, step.location);
    assert.equal(prev.period, step.period);
  }
});

test('space changes use explicit transition steps', async () => {
  const day = await import(pathToFileURL(dayPath).href + '?transitions=' + Date.now());
  for (let i=1;i<day.DAY_STEPS.length;i++) {
    const prev = day.DAY_STEPS[i-1];
    const step = day.DAY_STEPS[i];
    if (prev.location === step.location) continue;
    assert.equal(prev.kind, 'transition');
    assert.equal(prev.nextLocation, step.location);
  }
});

test('student stations and teaching points are outside configured furniture obstacles', async () => {
  const day = await import(pathToFileURL(dayPath).href + '?layout=' + Date.now());
  const blocked = (space,p,pad=0.03) => space.obstacles.some(o => Math.abs(p.x-o.x)<o.hx+pad && Math.abs(p.z-o.z)<o.hz+pad);
  for (const space of Object.values(day.SCHOOL_SPACES)) {
    assert.equal(space.seats.length, 6, space.id+' must have six student stations');
    for (const seat of space.seats) assert.equal(blocked(space,seat), false, space.id+' seat inside obstacle');
    assert.equal(blocked(space,space.teachingPoint), false, space.id+' teaching point inside obstacle');
  }
});

test('multi-room game wires real repository assets for each specialist room', () => {
  const assets = [
    'assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/allinonepr.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/desk.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/bench.glb',
    'assets/game/platformer/props/ball.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/kitchen-sink.glb',
    'assets/game/3d/bakery/interior/table-round-a.glb',
    'assets/game/3d/bakery/interior/serving-tray.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/bookcase-open-low.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/computer-screen.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/computer-keyboard.glb'
  ];
  for (const rel of assets) assert.ok(fs.existsSync(path.join(root, rel)), 'missing teacher simulator asset: '+rel);
  assert.match(js, /function addGym\(/);
  assert.match(js, /function addScience\(/);
  assert.match(js, /function addCafeteria\(/);
  assert.match(js, /function addArt\(/);
  assert.match(js, /function addComputer\(/);
});

test('student AI keeps classroom chaos capped', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?ai=' + Date.now());
  assert.equal(ai.AI_RULES.maxConcurrentSocialPairs, 2);
  assert.equal(ai.AI_RULES.maxConcurrentConflicts, 1);
  assert.equal(ai.AI_RULES.maxFightsPerRecess, 1);
  assert.equal(ai.AI_RULES.focusNaturalRecoveryMultiplier, .5);
  assert.equal(ai.AI_RULES.socialNaturalRecoveryMultiplier, .5);
});

test('lesson-specific focus drain is supported without adding personality classes', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?drain=' + Date.now());
  const profile = ai.STUDENT_PROFILES.find(s => s.id === 'minsu');
  const calm = ai.createStudentRuntime(profile);
  const demanding = ai.createStudentRuntime(profile);
  for (let t=0;t<40;t+=.1) {
    ai.updateLessonFocus(calm,.1,{teacherNear:false,drainMultiplier:.75});
    ai.updateLessonFocus(demanding,.1,{teacherNear:false,drainMultiplier:1.15});
  }
  assert.ok(demanding.focus < calm.focus);
});

test('student navigation still uses exact furniture intersection checks', () => {
  assert.match(js, /function segmentHitsRect\(/);
  assert.match(js, /function studentSegmentClear\(/);
  assert.match(js, /function findStudentPath\(/);
  assert.doesNotMatch(js, /\|\|actor\.kind==='student'/);
});

test('room changes require walking to the door action', () => {
  assert.match(js, /currentStep\.kind==='transition'/);
  assert.match(js, /distance2D\(player\.root\.position,DOOR_POINT\)<1\.55/);
  assert.match(js, /currentAction=\{type:'moveNext'\}/);
  assert.match(js, /transitionToSpace\(currentStep\.nextLocation\)/);
});

test('catalog publishes teacher simulator v63', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/teacher-classroom-sim-prototype/index.html?v=62');
  assert.match(game.description, /6교시/);
  assert.match(game.description, /체육관/);
});
