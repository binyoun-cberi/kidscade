const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const dir=path.join(root,'games','high_code_quest');
const source=fs.readFileSync(path.join(dir,'topdown-game.js'),'utf8');

test('top-view Code Quest engine is valid JavaScript',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.match(source,/GRID_W=20,GRID_H=13/);
 assert.match(source,/MOVE_UP/);
 assert.match(source,/SLASH/);
 assert.match(source,/SPIN/);
 assert.match(source,/BOLT/);
 assert.match(source,/projectileThreat/);
 assert.match(source,/function enemyProgram/);
 assert.match(source,/kind==='boss'/);
});

test('top-view enemies expose rule-driven AI and HP combat',()=>{
 assert.match(source,/거리 ≤ 1/);
 assert.match(source,/직선 시야/);
 assert.match(source,/HP 절반 이하/);
 assert.match(source,/e\.hp=Math\.max\(0,e\.hp-n\)/);
 assert.match(source,/world\.projectiles\.push/);
 assert.match(source,/e\.guard/);
 assert.match(source,/world\.evade=0/);
});

test('Code Quest entry point loads the consolidated top-view engine',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(html,/2D 탑뷰 전장/);
 assert.match(html,/topdown\.css/);
 assert.match(html,/topdown-game\.js\?v=3/);
 assert.doesNotMatch(html,/topdown-loader/);
 assert.doesNotMatch(html,/src="\.\/game\.js/);
 assert.match(source,/progress_v3/);
});

test('top-view HUD has every static editor control used by the engine',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const ids=[...source.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
 const dynamic=new Set(['enemyCodeHud','enemyCodeName','enemyCodeHp','enemyCodeLines']);
 for(const id of new Set(ids)){
  if(dynamic.has(id))continue;
  assert.ok(html.includes('id="'+id+'"'),'missing #'+id);
 }
});
