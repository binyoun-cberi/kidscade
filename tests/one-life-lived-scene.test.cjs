'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const Pixel=require('../games/high_one_life/pixel-scene.js');

function renderScene(life){
  const shapes=[];
  const ctx={fillStyle:'#000',imageSmoothingEnabled:true,fillRect(x,y,w,h){shapes.push({x,y,w,h,color:this.fillStyle});},fillText(){}};
  const canvas={width:600,height:258,getContext:()=>ctx};
  const original=JSON.stringify(life);
  const stage=Pixel.paint(canvas,life);
  assert.equal(JSON.stringify(life),original,'pixel render must not mutate a saved life');
  assert.equal(ctx.imageSmoothingEnabled,false,'pixel art should stay pixelated');
  return {stage,shapes};
}
test('the lived scene, live stats and decisions precede secondary history',()=>{
  const html=read('index.html');
  const keys=['id="historyContext"','class="lived-moment"','id="lifeScene"','id="lifeVitals"','id="pauseBtn"','id="v9NextChoice"','id="decision"','id="v10HistoryPanel"','id="timeline"'];
  const indices=keys.map(k=>html.indexOf(k));
  assert.ok(indices.every(i=>i>=0),'all main reading elements should exist');
  assert.deepEqual([...indices].sort((a,b)=>a-b),indices,'actual life and choice should appear ahead of the archive');
  for(const id of ['lifeScene','lifeVitals','vitalHealth','vitalHappiness','vitalKnowledge','vitalBonds','decision']){
    assert.equal(html.split('id="'+id+'"').length-1,1,'duplicate '+id);
  }
  assert.match(html,/lived-scene-v1\.css\?v=1/);
  const css=read('lived-scene-v1.css');
  assert.match(css,/\.life-vitals/);
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  const game=read('game.js');
  assert.match(game,/function paintMomentVitals\(\)/);
  assert.match(game,/paintStats\(\);\s*paintMomentVitals\(\);/);
  for(const key of ['health','happiness','knowledge','bonds'])assert.ok(game.includes("['"+key+"','vital"));
});

test('a worked rural plot appears only for an actual farming career',()=>{
  const person={
    age:41,year:1987,career:'농부',profile:{settlement:'농촌',city:'읍내',partner:false,child:false},
    world:{educationYears:6},arc:{},money:{netWorth:0}
  };
  const plot={x:343,y:191,w:172,h:20};
  const isPlot=shape=>Object.entries(plot).every(([k,v])=>shape[k]===v);
  const farm=renderScene(person);
  assert.ok(farm.shapes.some(isPlot),'recorded farm work should have a planted patch');
  assert.equal(renderScene({...person,career:'초등학교 교사'}).shapes.some(isPlot),false);
  assert.equal(renderScene({...person,profile:{...person.profile,settlement:'도시'}}).shapes.some(isPlot),false);
  assert.equal(renderScene({...person,age:8}).shapes.some(isPlot),false);
});

test('scene detail is inferred from recorded state, never from a new person or payout',()=>{
  const source=read('pixel-scene.js');
  assert.match(source,/isRural&&farming/);
  assert.doesNotMatch(source,/person\(baseX-53,baseY/);
  assert.doesNotMatch(source,/person\(baseX-60,baseY/);
  assert.ok(!source.includes('life.money.netWorth='),'visual effects cannot award money');
});
