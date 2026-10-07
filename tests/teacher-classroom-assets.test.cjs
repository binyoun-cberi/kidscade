const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', 'teacher-classroom-sim-prototype');
const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(gameDir, 'classroom-assets.css'), 'utf8');
const catalogData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
const catalog = Array.isArray(catalogData) ? catalogData : catalogData.games;
const game = catalog.find(g => g.id === 'job_teacher_classroom');

test('teacher simulator loads the classroom asset layer cleanly', () => {
  assert.match(html, /classroom-assets\.css\?v=53/);
  assert.doesNotMatch(html, /style\.css\?v=51">\\n<link/);
});

test('teacher simulator classroom layer reuses committed Styloo classroom sprites', () => {
  const assets = [
    'assets/more assets/2dClassroomAssetPackByStyloo/Classroom/Classroom First Spritesheet 1.png',
    'assets/more assets/2dClassroomAssetPackByStyloo/Classroom 2 Props/Classroom Props First Spritesheet 1.png',
    'assets/more assets/2dClassroomAssetPackByStyloo/Classroom 2 Props/Classroom Props Second Spritesheet 1.png'
  ];
  for (const rel of assets) assert.ok(fs.existsSync(path.join(root, rel)), 'missing classroom asset: '+rel);
  assert.match(css, /--kc-classroom-sheet:/);
  assert.match(css, /--kc-classroom-props:/);
  assert.match(css, /--kc-classroom-stationery:/);
  assert.match(css, /\.classroom-backdrop:before/);
  assert.match(css, /\.board:before/);
  assert.match(css, /\.student-silhouettes i/);
  assert.match(css, /\.desk:after/);
});

test('teacher simulator catalog publishes the asset pass', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/teacher-classroom-sim-prototype/index.html?v=53');
});
