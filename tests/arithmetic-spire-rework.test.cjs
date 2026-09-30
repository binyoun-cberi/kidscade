const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'..','games','school_tower','수식의 첨탑.html'),'utf8');

test('arithmetic spire uses shared Kidscade art assets',()=>{
  for(const token of [
    '../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
    '../../assets/game/2d/platformer-art/extended/enemies/slime-green.png',
    '../../assets/game/2d/platformer-art/extended/enemies/bat-fly.png',
    '../../assets/game/2d/platformer-art/extended/enemies/snake-lava.png',
    '../../assets/game/2d/platformer-art/base/tiles/castle-center.png',
    '../../assets/game/2d/platformer-art/base/items/gem-yellow.png'
  ]) assert.ok(html.includes(token),token);
});

test('arithmetic spire exposes the simplified combat guide and precision rune',()=>{
  assert.match(html,/id="combat-guide"/);
  assert.match(html,/id="rune-target"/);
  assert.match(html,/function makeRuneTarget/);
  assert.match(html,/function runeMatched/);
  assert.match(html,/function comboBonus/);
});

test('starting operator deck does not contain a redundant minus card',()=>{
  const start=html.match(/function newGame\(\).*?operators:\[([^\]]+)\]/s);
  assert.ok(start,'starting operator deck');
  assert.doesNotMatch(start[1],/O\('−'\)/);
  assert.match(start[1],/O\('×'\)/);
  assert.match(start[1],/O\('÷'\)/);
  assert.match(start[1],/O\('\(\)'\)/);
});

test('embedded game script parses as JavaScript',()=>{
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.ok(scripts.length);
  for(const source of scripts) assert.doesNotThrow(()=>new Function(source));
});
