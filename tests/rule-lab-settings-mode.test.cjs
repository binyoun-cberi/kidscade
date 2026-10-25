const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const BASE='games/high_rule_lab';
const MODE=BASE+'/settings_mode';
function config(){const sandbox={};sandbox.window=sandbox;vm.runInNewContext(read(MODE+'/logic.js'),sandbox);return sandbox.RuleSettingsModeConfig}
test('설정 탈출은 독립된 7개 방을 갖고 원본 60단계를 유지한다',()=>{
 const c=config(),box={};box.window=box;
 vm.runInNewContext(read(BASE+'/levels.js'),box);
 assert.equal(c.STAGES.length,7);assert.equal(box.RuleLabData.levels.length,60);
 assert.deepEqual([...new Set(Array.from(c.STAGES,x=>x.kind))],['walk','dark','sound','platform','frame','shield','final']);
});
test('설정 수치가 실제 게임 판정에 반영된다',()=>{
 const c=config(),s={brightness:35,volume:70,frame:25};
 assert.equal(c.canExit(1,s,0),false);s.brightness=70;assert.equal(c.canExit(1,s,0),true);
 assert.equal(c.canExit(2,s,0),false);s.volume=20;assert.equal(c.canExit(2,s,0),true);
 assert.equal(c.isGuardActive(2,s),false);s.volume=70;assert.equal(c.isGuardActive(2,s),true);
 assert.ok(c.guardRadius(70)>c.guardRadius(20));
 assert.equal(c.canExit(4,s,0),false);s.frame=75;assert.equal(c.canExit(4,s,0),true);
 assert.ok(c.bridgeWidth(75)>c.bridgeWidth(25));
 assert.equal(c.canExit(5,s,1),false);assert.equal(c.canExit(5,s,2),true);
 assert.equal(c.canExit(6,s,0),false);s.brightness=75;s.volume=20;assert.equal(c.canExit(6,s,0),true);
});
test('설정 창은 위치에 따라 발판과 방패가 된다',()=>{
 const c=config(),s=c.defaultSettings();
 const floors=c.floorParts(3,s);
 assert.equal(floors.length,2);assert.ok(floors[0].x+floors[0].w<floors[1].x);
 const frame=c.floorParts(4,{...s,frame:100});
 assert.ok(frame.find(x=>x.bridge).w>=frame[1].x-frame[2].x);
 const shot={x:575,y:410,r:10};
 assert.equal(c.interceptsShield(shot,{x:520,y:385,w:155,h:64}),true);
 assert.equal(c.interceptsShield(shot,{x:140,y:250,w:155,h:64}),false);
});
test('신규 모드는 원작 추출 그래픽을 사용하지 않고 기존 키즈케이드 리소스를 사용한다',()=>{
 const html=read(MODE+'/index.html'),script=read(MODE+'/game.js'),css=read(MODE+'/style.css');
 for(const text of [script,read(MODE+'/logic.js')])new vm.Script(text);
 assert.match(html,/kidscade-game-sdk\.js/);
 assert.match(html,/logic\.js/);assert.match(html,/game\.js/);
 assert.match(script,/kenney-platformer-characters/);
 assert.doesNotMatch(script,/ESCAPE_extracted|ESCAPE\.exe|saltvinegar/i);
 assert.ok(css.includes('.floating-panel'));
 assert.match(read(BASE+'/index.html'),/settings_mode\/index\.html/);
});
test('원본 퍼즐은 다시 실행과 연속 이동, 단어 설명을 지원한다',()=>{
 const runtime=read(BASE+'/game.js'),history=read(BASE+'/engine/history.js');
 assert.match(read(BASE+'/index.html'),/id="redoBtn"/);
 assert.match(history,/History\.prototype\.redo/);
 assert.match(runtime,/canRedo/);
 assert.match(runtime,/setInterval\(\(\)=>move/);
 assert.match(runtime,/글자 .*밀어서 문장을/);
 const ctx={};ctx.window=ctx;
 vm.runInNewContext(read(BASE+'/engine/state.js'),ctx);
 vm.runInNewContext(history,ctx);
 const a={w:3,h:3,entities:[],moves:0},b={...a,moves:1},c={...a,moves:2};
 const h=new ctx.RuleLabEngine.History(a);h.push(b);h.push(c);
 assert.equal(h.undo().moves,1);assert.equal(h.redo().moves,2);
 h.undo();h.push({...a,moves:5});
 assert.equal(h.canRedo(),false);assert.equal(h.current().moves,5);
});
