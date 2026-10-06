const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..'),game=path.join(root,'games','high_emergency_escape');
test('10초 위기탈출은 50개 상황과 공통 SDK를 가진다',()=>{for(const f of ['index.html','style.css','scenarios.js','game.js'])assert.ok(fs.existsSync(path.join(game,f)),f);const scenarios=fs.readFileSync(path.join(game,'scenarios.js'),'utf8');assert.equal((scenarios.match(/"id":\s*\d+/g)||[]).length,50);const html=fs.readFileSync(path.join(game,'index.html'),'utf8');assert.match(html,/kidscade-game-sdk\.js/);assert.match(html,/high_emergency_escape/)});
test('응급처치 핵심 상호작용을 포함한다',()=>{const s=fs.readFileSync(path.join(game,'scenarios.js'),'utf8');for(const token of ['CPR 리듬','AED가 분석 중','등 두드리기 5회','복부 밀어내기 5회','흐르는 찬물로 20분'])assert.ok(s.includes(token),token);const js=fs.readFileSync(path.join(game,'game.js'),'utf8');for(const token of ["mode==='rhythm'","mode==='sequence'","aid-defibrillator-red.glb","KidscadeAvatarShop"])assert.ok(js.includes(token),token)});
test('10초 위기탈출 3D 에셋의 외부 컬러맵이 함께 배포된다',()=>{
  for(const rel of [
    'assets/game/3d/vehicles/kenney-car-kit/Textures/colormap.png',
    'assets/game/3d/city/kenney-city-kit-roads/Textures/colormap.png',
    'assets/game/props/accessibility/Textures/colormap.png'
  ]) assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
});
