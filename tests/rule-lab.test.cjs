const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('Rule Lab files are present and scripts parse',()=>{
  for(const rel of [
    'games/high_rule_lab/index.html',
    'games/high_rule_lab/style.css',
    'games/high_rule_lab/levels.js',
    'games/high_rule_lab/game.js'
  ]) assert.ok(fs.existsSync(path.join(ROOT,rel)),rel);
  new vm.Script(read('games/high_rule_lab/levels.js'));
  new vm.Script(read('games/high_rule_lab/game.js'));
});

test('Rule Lab uses the Kidscade game SDK and safe game folder entrypoint',()=>{
  const html=read('games/high_rule_lab/index.html');
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data-game-id="high_rule_lab"/);
  assert.match(html,/levels\.js/);
  assert.match(html,/game\.js/);
});

test('Rule Lab is registered as a featured thinking puzzle',()=>{
  const catalog=JSON.parse(read('data/games.json'));
  const game=catalog.games.find(g=>g.id==='high_rule_lab');
  assert.ok(game);
  assert.equal(game.href,'games/high_rule_lab/index.html?v=2');
  assert.equal(game.subject,'thinking');
  assert.equal(game.genre,'puzzle');
  assert.equal(game.qualityStatus,'featured');
  assert.deepEqual(game.input,['touch','keyboard']);
});

test('Rule Lab contains a substantial authored stage set and rule vocabulary',()=>{
  const levels=read('games/high_rule_lab/levels.js');
  const stageCount=(levels.match(/\nL\('/g)||[]).length;
  assert.equal(stageCount,60,'expected exactly 60 authored stages');
  for(const token of ['YOU','STOP','PUSH','WIN','DEFEAT','SINK','HOT','MELT','OPEN','SHUT','MOVE','WEAK']){
    assert.match(levels,new RegExp(token));
  }
});

test('Rule Lab shared sprite paths point to existing Kidscade assets',()=>{
  for(const rel of [
    'assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
    'assets/game/2d/racing/kenney-racing-pack/objects/rock3.png',
    'assets/game/2d/platformer-art/base/tiles/brick-wall.png',
    'assets/game/2d/platformer-art/base/tiles/liquid-water-top-mid.png'
  ]) assert.ok(fs.existsSync(path.join(ROOT,rel)),rel);
});


test('Rule Lab v2 has the planned chapter counts and no initial cell overlaps',()=>{
  const sandbox={};
  vm.runInNewContext(read('games/high_rule_lab/levels.js'),sandbox);
  const levels=sandbox.RuleLabData.levels;
  const counts={};
  levels.forEach((lv,index)=>{
    counts[lv.chapter]=(counts[lv.chapter]||0)+1;
    const cells=new Map();
    for(const e of [...lv.objects,...lv.words]){
      const key=e.x+','+e.y;
      const list=cells.get(key)||[];
      list.push(e.kind==='word'?e.token:e.type);
      cells.set(key,list);
      assert.ok(e.x>=0&&e.y>=0&&e.x<lv.w&&e.y<lv.h,'out of bounds stage '+(index+1)+' '+key);
    }
    for(const [key,list] of cells)assert.equal(list.length,1,'overlap stage '+(index+1)+' '+key+' '+list.join('/'));
  });
  assert.deepEqual(counts,{
    '규칙의 문':6,
    '법칙을 깨라':10,
    '나는 누구?':10,
    '세상을 바꿔라':10,
    '두 법칙':10,
    '규칙 연구소':9,
    '금지된 실험':5
  });
});

test('Rule Lab v2 engine implements MOVE and WEAK behavior hooks',()=>{
  const runtime=read('games/high_rule_lab/game.js');
  assert.match(runtime,/hasProp\(e\.type,'MOVE'/);
  assert.match(runtime,/hasProp\(e\.type,'WEAK'/);
  assert.match(runtime,/progress_v2/);
  assert.match(runtime,/chapter-row/);
});
