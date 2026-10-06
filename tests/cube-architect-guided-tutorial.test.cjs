const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');
const css=read('games/cube3d/cube-architect.css');

test('Cube Architect guided tutorial stays parseable and exposed on desktop/mobile',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/id="actionTutorial"/);
  assert.match(html,/id="mobileTutorial"/);
  assert.match(html,/id="tutorialProgress"/);
  assert.match(html,/id="tutorialSkip"/);
  assert.match(css,/Guided hands-on tutorial/);
});

test('guided tutorial requires real build actions before advancing core practice',()=>{
  assert.match(js,/tutorialSignal\('challenge-place'\)/);
  assert.match(js,/tutorialSignal\('challenge-break'\)/);
  assert.match(js,/tutorialSignal\('free-place'\)/);
  assert.match(js,/tutorialSignal\('free-break'\)/);
  assert.match(js,/wait:'challenge-place'/);
  assert.match(js,/wait:'challenge-break'/);
  assert.match(js,/wait:'free-place'/);
  assert.match(js,/wait:'free-break'/);
});

test('guided tutorial covers challenge, net, survival, creative and can be replayed',()=>{
  assert.match(js,/if\(kind==='challenge'\)return\[/);
  assert.match(js,/if\(kind==='net'\)return\[/);
  assert.match(js,/gameFreeMode==='survival'/);
  assert.match(js,/cubeArchitectGuidedTutorial_v5_/);
  assert.match(js,/showTutorial\(mode==='free'\?'free':mode,true\)/);
});


test('free-world tutorial camera step cannot deadlock on first/third-person switching',()=>{
  assert.match(js,/wait:'free-view-toggle'/);
  assert.match(js,/tutorialSignal\('free-view-toggle'\)/);
  assert.match(js,/title:'7\. 1인칭 ↔ 3인칭 시점'/);
  assert.match(js,/title:'1-1\. 1인칭 ↔ 3인칭 바꾸기'/);
  assert.match(js,/if\(e\.code==='KeyV'\)\{cycleFreeView\(\);return\}/);
  assert.match(html,/id="actionView"[^>]*>시점 · 3인칭<\/button>/);
  assert.match(html,/id="mobileView"[^>]*>3인칭<\/button>/);
  assert.match(js,/textContent='시점 · '\+current/);
  assert.match(js,/textContent=current/);
});
