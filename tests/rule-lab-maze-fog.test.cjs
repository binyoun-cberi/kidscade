const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..','games/high_rule_lab');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
function elem(){
 return {style:{setProperty(){}},className:'',hidden:false,textContent:'',
  children:[],dataset:{},appendChild(x){this.children.push(x)},setAttribute(){}};
}
function setup(){
 const window={};window.window=window;window.document={createElement:elem};
 for(const rel of ['levels.js','engine/state.js','engine/rules.js','ui/fog.js'])
  vm.runInNewContext(read(rel),window);
 return window;
}
test('어려운 규칙 미로는 미탐험 시야를 가리고 방문 위치를 기억한다',()=>{
 const w=setup(),E=w.RuleLabEngine,ui=w.RuleLabUI;
 const b=elem(),fog=new ui.Fog(b);
 const level=w.RuleLabData.levels[15],state=E.State.fromLevel(level);
 const rules=E.Rules.parse(state);
 fog.reset(level.w,level.h,true);
 assert.equal(fog.cells.length,120);
 fog.render(state,rules);
 const unseen=fog.cells.filter(c=>c.className==='fog-cell unseen').length;
 const visible=fog.cells.filter(c=>c.className==='fog-cell visible').length;
 assert.ok(unseen>0);assert.ok(visible>0);
 fog.toggle(false);assert.equal(fog.layer.hidden,true);
 fog.toggle(true);assert.equal(fog.layer.hidden,false);
 const x=state.entities.find(e=>e.type==='hero');x.x=8;x.y=7;
 fog.render(state,E.Rules.parse(state));
 assert.ok(fog.cells.some(c=>c.className==='fog-cell seen'),'방문했던 곳이 희미하게 남아야 함');
});
test('첫 수업은 안개 없이, 이후 모드에는 끄기 버튼을 제공한다',()=>{
 const html=read('index.html'),js=read('game.js');
 assert.match(html,/ui\/fog\.js\?v=1/);
 assert.match(html,/id="fogBtn"/);
 assert.match(js,/levelIndex>=6/);
 assert.match(js,/explorationFog\.render/);
 assert.match(js,/explorationFog\.toggle/);
});
