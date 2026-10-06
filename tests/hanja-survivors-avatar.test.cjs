const fs=require('fs');
const path=require('path');
const test=require('node:test');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'games/hanja_survivors_8/한자 수호전： 8급.html'),'utf8');
const bridge=fs.readFileSync(path.join(ROOT,'games/hanja_survivors_8/hanja-avatar.js'),'utf8');

test('Hanja Survivors loads the Kidscade avatar bridge',()=>{
  assert.match(html,/hanja-avatar\.js\?v=1/);
  assert.match(html,/아바타 수호자 에디션/);
});
test('avatar bridge maps battle poses and preserves fallback',()=>{
  assert.match(bridge,/player-hurt/);
  assert.match(bridge,/return 'hurt'/);
  assert.match(bridge,/player-action1/);
  assert.match(bridge,/return 'attack'/);
  assert.match(bridge,/return 'idle'/);
  assert.match(bridge,/staticSource\(\)/);
});
test('avatar bridge flips with movement and exposes lifecycle hooks',()=>{
  assert.match(bridge,/face=dx>lastX\?1:-1/);
  assert.match(bridge,/scale\(-1,1\)/);
  assert.match(bridge,/death\(duration=1300\)/);
  assert.match(bridge,/reset\(\)/);
  assert.match(html,/KidscadeHanjaAvatar\?\.death/);
  assert.match(html,/KidscadeHanjaAvatar\?\.reset/);
});
