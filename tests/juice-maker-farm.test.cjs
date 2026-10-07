const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const game=fs.readFileSync(path.join(root,'games','low_juice_maker','과일 농장 주스 메이커.html'),'utf8');

test('과일 농장 주스 메이커는 3D 수확-제조-서빙 루프를 사용한다',()=>{
  for(const token of ['수확 → 세척 → 믹서 → 서빙','phaseSet(\'wash\')','phaseSet(\'blend\')','phaseSet(\'pour\')','phaseSet(\'serve\')'])assert.ok(game.includes(token),token);
  assert.doesNotMatch(game,/(폭탄|냉동 준비|과일비가 내리|집게 ·|skyJuicePixel_v2)/);
});

test('주요 공유 3D 에셋과 아바타를 실제로 연결한다',()=>{
  for(const file of [
    'food/apple.glb','food/banana.glb','food/grapes.glb','food/orange.glb','food/strawberry.glb','food/pear.glb',
    'shops/market/shopping-basket.glb','shops/market/cash-register.glb',
    '3d/interiors/kenney-furniture-kit/kitchen-sink.glb','3d/bakery/interior/stand-mixer.glb'
  ])assert.ok(game.includes(file),file);
  assert.match(game,/kidscade-avatar-studio-preview/);
  assert.match(game,/guest-default\.png/);
});

test('새 게임의 인라인 ES module은 구문 오류가 없다',()=>{
  const m=game.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(m,'module script missing');
  const js=m[1].replace(/^import .*?;\s*$/gm,'');
  assert.doesNotThrow(()=>new Function(js));
});
