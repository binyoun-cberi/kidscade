'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function game(seed=42){
  const math=Object.create(Math);math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const ctx={window:{},console,Math:math,setTimeout:()=>0,clearTimeout(){}};vm.createContext(ctx);
  for(const f of ['core/actions.js','core/pathfinding.js','core/supply.js','core/warfare.js','ai/strategy.js','data/events.js','core/invariants.js'])vm.runInContext(fs.readFileSync(path.join(root,'games/high_history_map',f),'utf8'),ctx);
  const html=fs.readFileSync(path.join(root,'games/high_history_map/index.html'),'utf8');
  let src=html.slice(html.indexOf('<script>\n(function(){')+8,html.lastIndexOf('</script>'));
  src=src.replace('bind();initStart();',`log=function(){};toast=function(){};renderAll=function(){};save=function(){};openResult=function(){};maybeOpenHistoryEvent=function(){};
    window.run=function(code){return eval(code)};state=initialState('baekje');`);
  vm.runInContext(src,ctx);return {run:code=>ctx.window.run(code),war:ctx.window.UnificationWarWarfare};
}
test('combat predictions bound real outcomes, including close wins and tiny armies',()=>{
  const {war}=game();
  for(const ranged of [false,true])for(const troops of [1,10,180,600])for(const ratio of [.2,.87,.98,1,1.02,1.14,3]){
    const atk=troops*ratio,def=troops,r=war.combatRange(atk,def,troops,troops,ranged);
    for(let x=0;x<=20;x++)for(let y=0;y<=20;y++){
      const out=war.combatOutcome(atk*(.93+x*.007),def*(.93+y*.007),troops,troops,ranged);
      assert.ok(out.attackers<=troops&&out.defenders<=troops);
      assert.ok(troops-out.attackers>=r.ownMin&&troops-out.attackers<=r.ownMax,JSON.stringify({ratio,r,out}));
      assert.ok(troops-out.defenders>=r.enemyMin&&troops-out.defenders<=r.enemyMax);
    }
  }
});
test('starvation, isolation and retreat never create troops; hungry units do not receive free reinforcements',()=>{
  const {run}=game();
  assert.equal(run(`var u=unitById('b1');u.troops=10;resource('baekje').food=0;applyIncome('baekje');u.troops`),0);
  assert.equal(run(`var u=unitById('b2');u.q=0;u.r=0;u.troops=3;applySupplyAttrition('baekje');u.troops`),0);
  assert.equal(run(`state=initialState('baekje');var u=unitById('b1');u.troops=10;resource('baekje').food=0;applyFieldReinforcement('baekje');u.troops`),10);
  assert.ok(run(`var u=unitById('b1');u.troops=3;var r=applyAction({type:'retreat',actor:'baekje',unitId:u.id});r.ok&&u.troops<=3`));
});
test('splitting preserves troops and type, consumes both actions, and rejects unsafe placement',()=>{
  const {run}=game();
  assert.ok(run(`var u=unitById('b1'),before=u.troops,r=applyAction({type:'split',actor:'baekje',unitId:u.id}),v=unitById(r.unitId);r.ok&&v.type===u.type&&u.troops+v.troops===before&&u.moved&&v.moved`));
  assert.equal(run(`applyAction({type:'split',actor:'baekje',unitId:'b1'}).ok`),false);
  assert.equal(run(`state=initialState('baekje');actionBus=null;var u=unitById('b1');neighbors(u.q,u.r).forEach(t=>t.owner='goguryeo');var n=state.units.length;var r=applyAction({type:'split',actor:'baekje',unitId:u.id});!r.ok&&state.units.length===n&&u.troops===280`),true);
});
test('merging respects type and capacity; recruiting without space does not spend resources',()=>{
  const {run}=game();
  assert.equal(run(`var a=unitById('b1'),b=unitById('b2');canMergeUnits(a,b)`),false);
  assert.equal(run(`var a=unitById('b1'),b=unitById('b2');b.type='infantry';a.troops=400;b.troops=210;canMergeUnits(a,b)`),false);
  assert.equal(run(`var a=unitById('b1'),b=unitById('b2');a.troops=390;canMergeUnits(a,b)`),true);
  assert.ok(run(`var r=applyAction({type:'move',actor:'baekje',unitId:'b1',target:'21_27'});r.ok&&unitById('b2').troops===600&&unitById('b2').moved&&!unitById('b1')`));
  assert.ok(run(`var c=tile(22,27);[c].concat(neighbors(c.q,c.r)).forEach((t,i)=>{t.owner='baekje';state.units=state.units.filter(u=>u.q!==t.q||u.r!==t.r);state.units.push({id:'full'+i,owner:'baekje',type:'infantry',q:t.q,r:t.r,troops:600,moved:false});});var before=resource('baekje').money;var r=applyAction({type:'recruit',actor:'baekje',target:'22_27',unitType:'archer'});!r.ok&&before===resource('baekje').money`));
});
test('income forecast is the calculation used when income is applied',()=>{
  const {run}=game();assert.ok(run(`var r=resource('baekje'),before={...r},d=incomeForecast('baekje');applyIncome('baekje');['food','money','manpower','authority'].every(k=>r[k]===clamp(before[k]+d[k],0,k==='authority'?100:999))`));
});
test('adjacent mixed arms support attacks; changing mission after acting is rejected',()=>{
  const {run}=game();assert.ok(run(`var a=unitById('b1'),b=unitById('b2'),dst=neighbors(a.q,a.r).find(t=>hexDistance(b.q,b.r,t.q,t.r)===1);combinedArmsBonus(a,dst)>=.08`));
  assert.equal(run(`var a=unitById('b1');a.moved=true;applyAction({type:'setMission',actor:a.owner,unitId:a.id,mission:'defend'}).ok`),false);
});
test('legacy saves retain oversized armies and can split without destroying soldiers',()=>{
  const {run}=game();assert.ok(run(`unitById('b1').troops=1600;state=migrateState(JSON.parse(JSON.stringify(state)));var before=unitById('b1').troops,r=applyAction({type:'split',actor:'baekje',unitId:'b1'});r.ok&&unitById(r.unitId).troops<=UNIT_CAP&&unitById('b1').troops+unitById(r.unitId).troops===before`));
});
test('48-turn campaign has valid state and active northern expansion and battles',()=>{
  const {run}=game();
  run(`for(var i=0;i<48&&!state.finished;i++){aiStep(state.player);endTurn();var issues=validateStateNow('playtest');if(issues.length)throw new Error(issues.join(';'));if(state.units.some(u=>u.troops>UNIT_CAP))throw new Error('unit capacity exceeded');}`);
  assert.equal(run('state.finished'),true);
  assert.ok(run(`(state.battleStats.goguryeo||{}).battles>0`));
  assert.ok(run(`factionCities('goguryeo').length>=2`));
});
