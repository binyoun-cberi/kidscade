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
  assert.match(html,/badge\.onclick = \(\) => selectHanja\(key\)/);
  assert.match(html,/8급 50자 마법첩 · 눌러서 선택/);
});

test('Hanja skills grow independently from mastery XP',()=>{
  assert.match(html,/const SPELL_MAX_LEVEL = 8/);
  assert.match(html,/function gainSpellMastery/);
  assert.match(html,/function getSpellGrowth/);
  assert.match(html,/damage: Math\.min\(1\.72, 0\.68/);
  assert.match(html,/range: Math\.min\(1\.34, 0\.74/);
  assert.match(html,/effect: Math\.min\(1\.42, 0\.78/);
  assert.match(html,/gainSpellMastery\(currentHanjaKey, masteryGain\)/);
  assert.match(html,/현재 한자 수련/);
});

test('Hanja Survivors eases the early survival curve',()=>{
  assert.match(html,/player\.hitCooldown = 42/);
  assert.match(html,/const spawnCount = 1 \+ Math\.floor\(Math\.max\(0, gameTime - 45\) \/ 60\)/);
  assert.match(html,/for \(let i = 0; i < 2; i\+\+\) \{\s*spawnEnemy\(\)/);
  assert.match(html,/hp: 120/);
  assert.match(html,/maxHp: 120/);
});

test('Hanja Survivors uses committed Kidscade character and monster assets',()=>{
  const required=[
    ['assets','game','characters','people','kenney-platformer-characters','player','poses','player-stand.png'],
    ['assets','game','characters','people','kenney-platformer-characters','player','poses','player-action1.png'],
    ['assets','game','characters','people','kenney-platformer-characters','player','poses','player-hurt.png'],
    ['assets','game','2d','platformer-art','extended','enemies','ghost.png'],
    ['assets','game','2d','platformer-art','extended','enemies','slime-green.png'],
    ['assets','game','2d','platformer-art','extended','enemies','spider.png'],
    ['assets','game','2d','platformer-art','base','items','gem-yellow.png']
  ];
  for(const parts of required) assert.ok(fs.existsSync(path.join(root,...parts)),'missing '+parts.join('/'));
  assert.match(html,/GAME_ASSETS/);
  assert.match(html,/assetReady\('xp'\)/);
  assert.match(html,/assetKey = e\.type === 'zombie'/);
  assert.match(html,/heroKey = player\.hitCooldown > 28/);
});

test('Hanja Survivors catalog points to the mastery rework',()=>{
  const game=catalog.games.find(g=>g.id==='hanja_survivors_8');
  assert.ok(game);
  assert.equal(game.href,'games/hanja_survivors_8/한자 수호전： 8급.html?v=4');
});

test('Hanja Survivors has the exact official grade-8 roster and all 27 previously missing spells',()=>{
  const expected=['一','二','三','四','五','六','七','八','九','十','人','山','水','木','金','土','日','月','火','門','白','百','萬','父','母','兄','弟','男','女','國','天','地','春','夏','秋','冬','東','西','南','北','上','中','下','左','右','前','後','內','外','大'];
  const m=html.match(/const GRADE8_KEYS = \[([\s\S]*?)\];/);
  assert.ok(m);
  const actual=[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  assert.deepEqual(actual,expected);
  assert.equal(new Set(actual).size,50);
  for(const ch of ['白','百','萬','父','母','兄','弟','男','女','國','地','春','夏','秋','冬','東','西','南','北','上','下','左','右','前','後','內','外']){
    assert.match(html,new RegExp(`'${ch}': \\{ char: '${ch}'`));
  }
  assert.match(html,/function castGrade8ExpansionSpell/);
  assert.match(html,/GRADE8_EXPANSION\.has\(char\)/);
});

test('Hanja mastery range calculation uses the player range multiplier',()=>{
  assert.match(html,/const spellSize = player\.sizeMult \* growth\.range/);
  assert.doesNotMatch(html,/const spellSize = spellSize \* growth\.range/);
});
