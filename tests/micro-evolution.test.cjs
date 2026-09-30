const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const dir=path.join(ROOT,'games','high_micro_evolution');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data','games.json'),'utf8'));

test('Micro Evolution files are parseable and wired to the game SDK',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/<title>마이크로 에볼루션<\/title>/);
  assert.match(html,/data-game-id="high_micro_evolution"/);
  assert.match(html,/data-orientation="landscape"/);
  assert.match(css,/\.cell-editor/);
});

test('Micro Evolution supports chosen and randomized starting biomes',()=>{
  assert.match(js,/const BIOMES = \[/);
  for(const name of ['햇빛 연못','탁한 습지','얕은 바다','심해','열수구','빙하 아래','고염 호수']){
    assert.match(js,new RegExp(name));
  }
  assert.match(js,/function randomBiome\(\)/);
  assert.match(js,/function startGame\(biome\)/);
  assert.match(html,/무작위 생태계에서 시작/);
  assert.match(html,/환경 직접 선택/);
});

test('Cell editor contains feeding, movement, sensing and defense adaptations',()=>{
  for(const token of ['predatorMouth','filter','chloroplast','parasite','flagellum','cilia','pseudopod','anchor','eyespot','chemo','mechano','tactile','thermo','electro','membrane','spike','toxin','camouflage']){
    assert.match(js,new RegExp(token));
  }
  assert.match(js,/externalAngle/);
  assert.match(js,/rear=/);
  assert.match(js,/movementStats/);
});

test('Ecology loop includes environmental pressure, generations, events and AI mutation',()=>{
  assert.match(js,/function advanceGeneration/);
  assert.match(js,/function mutateTraits/);
  assert.match(js,/const EVENTS=/);
  assert.match(js,/salinityStress/);
  assert.match(js,/temperatureStress/);
  assert.match(js,/state\.generationClock>=55/);
});

test('Sensory organs change the information available to the player',()=>{
  assert.match(js,/updateSenseOverlay/);
  assert.match(js,/countPart\('chemo'\)/);
  assert.match(js,/countPart\('eyespot'\)/);
  assert.match(js,/countPart\('mechano'\)/);
  assert.match(js,/sense-arrow/);
  assert.match(js,/sense-label/);
});

test('Photoreceptors expose local light intensity and two-receptor direction sensing',()=>{
  assert.match(html,/id="lightSensor"/);
  assert.match(html,/id="localLightLevel"/);
  assert.match(js,/function lightSenseData/);
  assert.match(js,/function updateLightSensor/);
  assert.match(js,/sense\.eyes===1/);
  assert.match(js,/sense\.eyes>=2/);
  assert.match(js,/lightDirectionArrow/);
  assert.match(js,/현재 위치/);
  assert.match(js,/평균빛/);
  assert.match(css,/\.light-sensor/);
  assert.match(css,/\.sense-arrow\.light-arrow/);
});

test('Micro Evolution is registered as a science sandbox',()=>{
  const game=catalog.games.find(g=>g.id==='high_micro_evolution');
  assert.ok(game);
  assert.equal(game.title,'마이크로 에볼루션');
  assert.equal(game.subject,'science');
  assert.equal(game.genre,'sandbox');
  assert.ok(game.input.includes('touch'));
  assert.ok(game.input.includes('keyboard'));
});
