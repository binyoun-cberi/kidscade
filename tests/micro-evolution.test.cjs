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

test('Ecology loop includes environmental pressure, reproduction, events and AI mutation',()=>{
  assert.match(js,/function advanceGeneration/);
  assert.match(js,/function mutateTraits/);
  assert.match(js,/const EVENTS=/);
  assert.match(js,/salinityStress/);
  assert.match(js,/temperatureStress/);
  assert.match(js,/function reproductionRequirement/);
  assert.match(js,/function reproductionProgress/);
  assert.match(js,/function canReproduce/);
  assert.doesNotMatch(js,/state\.generationClock>=55/);
  assert.match(js,/state\.editorMode='reproduction'/);
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

test('Field rework keeps the play area dense, zoomed and biologically legible',()=>{
  assert.match(js,/const CAMERA_ZOOM = 1\.55/);
  assert.match(js,/for\(let i=0;i<46;i\+\+\)/);
  assert.match(js,/115\+env\.food\*1\.15/);
  assert.match(js,/function wrappedDelta/);
  assert.match(js,/function drawBiomeScenery/);
  assert.match(js,/function creatureTint/);
  assert.match(js,/function scanCreatureRelations/);
  assert.match(js,/c\.traits\.diet==='hunter'/);
  assert.match(js,/c\.r<player\.radius\*\.78/);
});

test('Biome events have visible field effects instead of only changing numbers',()=>{
  for(const id of ["rain","sun","murk","oxygen","evaporate","bloom"]) assert.match(js,new RegExp("id:'"+id+"'"));
  assert.match(js,/state\.activeEvent=e\.id/);
  assert.match(js,/state\.activeEvent==='rain'/);
  assert.match(js,/state\.activeEvent==='murk'/);
});

test('Evolution editing is tied to reproduction readiness',()=>{
  assert.match(html,/id="editorBtnLabel"/);
  assert.match(html,/번식하며 진화하기/);
  assert.match(js,/if\(!canReproduce\(\)\)/);
  assert.match(js,/advanceGeneration\(\);save\(\)/);
  assert.match(js,/p\.biomass=0/);
  assert.match(css,/\.evolve-btn\.ready/);
});

test('Canvas is resized after the hidden game screen becomes visible',()=>{
  assert.match(html,/id="gameScreen" class="screen game-screen hidden"/);
  const start=js.slice(js.indexOf('function startGame'),js.indexOf('function goHome'));
  const showIndex=start.indexOf("classList.remove('hidden')");
  const resizeIndex=start.indexOf('resize()');
  assert.ok(showIndex>=0);
  assert.ok(resizeIndex>showIndex,'resize must happen after gameScreen becomes visible');
  assert.match(js,/viewW<10\|\|viewH<10\|\|canvas\.width<10\|\|canvas\.height<10/);
});

test('First play is populated and tells the player what to do',()=>{
  assert.match(js,/if\(i<70\)/);
  assert.match(js,/if\(i<16\)/);
  assert.match(html,/id="starterGuide"/);
  assert.match(html,/먼저 먹이를 먹어 보세요/);
  assert.match(js,/function updateStarterGuide/);
  assert.match(js,/state\.discovered\.firstFood=1/);
  assert.match(js,/첫 먹이/);
});


test('DNA economy requires multi-generation saving and escalating duplicate costs',()=>{
  assert.match(js,/generation:1,generationClock:0,eventClock:0,dna:4/);
  assert.match(js,/return 28\+Math\.min\(42,\(state\.generation-1\)\*6\)/);
  assert.match(js,/function partPurchaseCost/);
  assert.match(js,/1\+owned\*\.32/);
  assert.match(js,/state\.dna\+=base\*\.04\*mult/);
  assert.match(js,/const huntReward=1\.2/);
  assert.match(js,/state\.generation\+\+;state\.reproductions\+\+;state\.generationClock=0;state\.dna\+=2/);
  assert.match(js,/predatorMouth:\{id:'predatorMouth'.*cost:10/);
  assert.match(js,/chloroplast:\{id:'chloroplast'.*cost:14/);
  assert.match(js,/electro:\{id:'electro'.*cost:16/);
  assert.match(html,/여러 세대에 걸쳐 모으는 장기 진화 자원/);
});
