const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const gamePath=path.join(root,'games','hanja_survivors_8','한자 수호전： 8급.html');
const html=fs.readFileSync(gamePath,'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('Hanja Survivors starts with all official grade-8 50 Hanja available',()=>{
  assert.match(html,/const GRADE8_KEYS = \[/);
  assert.match(html,/let unlockedChars = \[\.\.\.GRADE8_KEYS\]/);
  assert.match(html,/let spellStats = createInitialSpellStats\(\)/);
  assert.match(html,/btn\.onclick=\(\)=>\{selectHanja\(key\);renderSpellbookPage\(\)\}/);
});

test('Hanja skills grow independently from weaker level-one values',()=>{
  assert.match(html,/const SPELL_MAX_LEVEL = 8/);
  assert.match(html,/function gainSpellMastery/);
  assert.match(html,/function getSpellGrowth/);
  assert.match(html,/damage: Math\.min\(1\.39, 0\.48/);
  assert.match(html,/range: Math\.min\(1\.28, 0\.68/);
  assert.match(html,/effect: Math\.min\(1\.33, 0\.70/);
  assert.match(html,/gainSpellMastery\(currentHanjaKey, masteryGain\)/);
});

test('Hanja Survivors eases speed but grows danger through monster numbers',()=>{
  assert.match(html,/player\.hitCooldown = 42/);
  assert.match(html,/speed: 2\.65/);
  assert.match(html,/Vampire-survivor curve/);
  assert.match(html,/baseSpeed:speed/);
  assert.match(html,/desired=28 \+ phase\*24/);
  assert.match(html,/for \(let i = 0; i < 4; i\+\+\) \{\s*spawnEnemy\(\)/);
  assert.doesNotMatch(html,/e\.speed = e\.type === 'zombie'/);
});

test('Hanja Survivors uses committed Kidscade character and monster assets',()=>{
  const required=[
    ['assets','game','characters','people','kenney-platformer-characters','player','poses','player-stand.png'],
    ['assets','game','characters','people','kenney-platformer-characters','player','poses','player-action1.png'],
    ['assets','game','characters','people','kenney-platformer-characters','player','poses','player-hurt.png'],
    ['assets','game','2d','platformer-art','extended','enemies','ghost.png'],
    ['assets','game','2d','platformer-art','extended','enemies','slime-green.png'],
    ['assets','game','2d','platformer-art','extended','enemies','spider.png'],
    ['assets','game','2d','platformer-art','extended','enemies','snake-lava.png'],
    ['assets','game','2d','platformer-art','base','items','gem-yellow.png'],
    ['assets','game','2d','racing','kenney-racing-pack','objects','tree_large.png']
  ];
  for(const parts of required) assert.ok(fs.existsSync(path.join(root,...parts)),'missing '+parts.join('/'));
  assert.match(html,/GAME_ASSETS/);
  assert.match(html,/assetReady\('xp'\)/);
  assert.match(html,/e\.type === 'elite' \? 'elite'/);
  assert.match(html,/heroKey = player\.hitCooldown > 28/);
});

test('Hanja Survivors catalog points to the full-arena balance rework',()=>{
  const game=catalog.games.find(g=>g.id==='hanja_survivors_8');
  assert.ok(game);
  assert.equal(game.href,'games/hanja_survivors_8/한자 수호전： 8급.html?v=6');
});

test('Hanja Survivors has the exact official grade-8 roster and all expansion spells',()=>{
  const expected=['一','二','三','四','五','六','七','八','九','十','人','山','水','木','金','土','日','月','火','門','白','百','萬','父','母','兄','弟','男','女','國','天','地','春','夏','秋','冬','東','西','南','北','上','中','下','左','右','前','後','內','外','大'];
  const m=html.match(/const GRADE8_KEYS = \[([\s\S]*?)\];/);
  assert.ok(m);
  const actual=[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  assert.deepEqual(actual,expected);
  assert.equal(new Set(actual).size,50);
  assert.match(html,/function castGrade8ExpansionSpell/);
  assert.match(html,/GRADE8_EXPANSION\.has\(char\)/);
});

test('Hanja mastery range calculation uses the player range multiplier',()=>{
  assert.match(html,/const spellSize = player\.sizeMult \* growth\.range/);
  assert.doesNotMatch(html,/const spellSize = spellSize \* growth\.range/);
});

test('Hanja Survivors movement and writing own separate pointer input',()=>{
  assert.match(html,/let movePointerId = null/);
  assert.match(html,/e\.pointerId !== movePointerId/);
  assert.match(html,/canvas\.setPointerCapture\(e\.pointerId\)/);
  assert.match(html,/lostpointercapture/);
  assert.doesNotMatch(html,/canvas\.addEventListener\('touchstart'/);
});

test('Hanja Survivors spellbook pauses time but closing it resumes realtime writing',()=>{
  assert.match(html,/function openSpellbook/);
  assert.match(html,/bookOpen = true;[\s\S]*?isPaused = true/);
  assert.match(html,/function closeSpellbook/);
  assert.match(html,/bookOpen = false;[\s\S]*?isPaused = false;[\s\S]*?writingActive = true/);
  assert.match(html,/SPELLS_PER_PAGE = 5/);
  assert.match(html,/renderSpellbookPage/);
});

test('Hanja battle writing is forgiving and re-arms the same selected spell',()=>{
  assert.match(html,/leniency: 2\.35/);
  assert.match(html,/showHintAfterMisses: 1/);
  assert.match(html,/if \(!bookOpen && !isPaused\) castHanjaSpell\(\)/);
  assert.match(html,/if \(!bookOpen\) initHanjaWriter\(currentHanjaKey\)/);
});

test('Hanja Survivors has fantasy biome backgrounds',()=>{
  for(const token of ['신록의 숲','한기의 설원','불타는 지옥','심연의 동굴']) assert.ok(html.includes(token),token);
  assert.match(html,/function drawWorldEnvironment/);
  assert.match(html,/assetReady\(r>\.82\?'tree':'treeSmall'\)/);
});

test('Hanja Survivors uses full remaining viewport and prominent spellbook UI',()=>{
  assert.match(html,/function resizeBattleCanvas/);
  assert.match(html,/flex:1 1 auto!important/);
  assert.match(html,/min-width:132px!important/);
  assert.match(html,/마법책<\/span>/);
  assert.match(html,/right:22px;bottom:20px;top:auto/);
  assert.match(html,/width:min\(97vw,1180px\)/);
});

test('Hanja Survivors nerfs Seven spam while One auto-aims at the nearest enemy',()=>{
  assert.match(html,/function getNearestEnemyAngle/);
  assert.match(html,/const angle = getNearestEnemyAngle\(\)/);
  assert.match(html,/damage:58 \* spellPower/);
  assert.match(html,/damage:24\*spellPower/);
  assert.match(html,/filter\(v=>v\.d<245\*spellSize\)/);
});
