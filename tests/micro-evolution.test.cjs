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
const audioCatalog=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','audio','audio-catalog.json'),'utf8'));

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
  for(const token of ['primitiveMouth','predatorMouth','filter','chloroplast','parasite','flagellum','cilia','pseudopod','anchor','eyespot','chemo','mechano','tactile','thermo','electro','membrane','spike','toxin','camouflage']){
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
  assert.match(js,/for\(let i=0;i<40;i\+\+\)/);
  assert.match(js,/46\+env\.food\*\.42/);
  assert.match(js,/function buildFoodClusters/);
  assert.match(js,/function drawFoodClusters/);
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
  assert.match(js,/if\(i<18\)/);
  assert.match(js,/if\(i<12\)/);
  assert.match(html,/id="starterGuide"/);
  assert.match(html,/먼저 먹이를 먹어 보세요/);
  assert.match(js,/function updateStarterGuide/);
  assert.match(js,/state\.discovered\.firstFood=1/);
  assert.match(js,/첫 먹이/);
});


test('DNA economy requires multi-generation saving and escalating duplicate costs',()=>{
  assert.match(js,/generation:1,generationClock:0,eventClock:0,dna:4/);
  assert.match(js,/const base=28\+Math\.min\(42,\(state\.generation-1\)\*6\)/);
  assert.match(js,/function partPurchaseCost/);
  assert.match(js,/1\+owned\*\.32/);
  assert.match(js,/state\.dna\+=base\*dnaScale\*mult/);
  assert.match(js,/const huntReward=1\.35/);
  assert.match(js,/state\.generation\+\+;state\.reproductions\+\+;state\.generationClock=0;state\.dna\+=2/);
  assert.match(js,/predatorMouth:\{id:'predatorMouth'.*cost:10/);
  assert.match(js,/chloroplast:\{id:'chloroplast'.*cost:14/);
  assert.match(js,/electro:\{id:'electro'.*cost:16/);
  assert.match(html,/여러 세대에 걸쳐 모으는 장기 진화 자원/);
});


test('Micro Evolution uses the shared asset-backed audio system',()=>{
  assert.match(html,/audio-manager\.js\?v=20260917-1/);
  assert.match(js,/const AUDIO_KEYS=Object\.freeze/);
  assert.match(js,/function preloadAudio\(\)/);
  assert.match(js,/function startAmbience\(\)/);
  assert.match(js,/ambient\.underwater/);
  assert.deepEqual(audioCatalog.sounds['ambient.underwater'],['incoming/newmusical/dragon-studio-underwater-ambience-376890.mp3']);
  for(const key of [
    'ui.click','ui.select','ui.confirm','ui.error',
    'collect.coin_pickup','collect.coin_drop',
    'combat.impact_heavy','combat.hurt_grunt','combat.projectile_whoosh',
    'ui.open','ambient.underwater'
  ]) assert.ok(audioCatalog.sounds[key]?.length,'missing audio catalog key '+key);
  assert.match(js,/sound\('eat'/);
  assert.match(js,/sound\('bite'/);
  assert.match(js,/sound\('hurt'/);
  assert.match(js,/sound\('dash'/);
  assert.match(js,/sound\('generation'/);
  assert.match(js,/stopAmbience\(\)/);
});


test('Survival strategies have different biomass economies',()=>{
  assert.match(js,/slots\[0\]='primitiveMouth'/);
  assert.match(js,/primitiveMouth:\{id:'primitiveMouth'.*starter:true/);
  assert.match(js,/why==='primitive'/);
  assert.match(js,/why==='filter'/);
  assert.match(js,/why==='predatorLoose'/);
  assert.match(js,/photoBiomass=gain\*\(\.14\+Math\.min\(\.06,chlor\*\.015\)\)/);
  assert.match(js,/p\.biomass\+=gain\*\.34/);
  assert.match(js,/const biomassReward=\(8\+sizeFactor\*8\)/);
  assert.match(js,/1\.65\+filter\*\.32/);
});

test('Environmental events are temporary and recover toward biome baseline',()=>{
  assert.match(js,/let baseEnv=/);
  assert.match(js,/let eventDelta=/);
  assert.match(js,/function updateEnvironment\(dt\)/);
  assert.match(js,/env\[key\]=clamp\(baseEnv\[key\]\+Number\(eventDelta\[key\]\|\|0\)\*fade,0,100\)/);
  assert.match(js,/duration:18/);
  assert.match(js,/state\.eventClock>=45/);
  assert.doesNotMatch(js,/e\.apply\(\)/);
});

test('Camouflage lowers predator detection instead of only reducing damage',()=>{
  assert.match(js,/const playerVisibility=camouflage/);
  assert.match(js,/dp<see\*1\.15\*playerVisibility/);
});

test('Internal organs can be removed and starter organ cannot refund DNA',()=>{
  assert.match(js,/function removeInternalPart/);
  assert.match(js,/className='part-remove'/);
  assert.match(js,/if\(part\.starter\)return 0/);
  assert.match(js,/filter\(p=>p\.cat===activeTab&&!p\.starter\)/);
});


test('Morphology editor can create cosmetic body diversity without DNA cost',()=>{
  for(const id of ['bodyShapeSelect','bodySymmetrySelect','bodyPatternSelect','bodyBaseColor','bodyAccentColor','bodyLengthRange','bodyWidthRange','bodyOpacityRange','organStyleSelect','organScaleRange','organTwistRange']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/const BODY_SHAPES=Object\.freeze/);
  assert.match(js,/const BODY_PATTERNS=Object\.freeze/);
  assert.match(js,/const BODY_SYMMETRY=Object\.freeze/);
  assert.match(js,/function applyMorphologyControl/);
  assert.match(js,/function traceBodyPath/);
  assert.match(js,/function drawBodyPattern/);
  assert.match(js,/slotMeta:Array\.from/);
  assert.match(js,/appearance:\{shape:'oval'/);
  assert.match(css,/\.morph-editor/);
  assert.match(css,/\.organ-style-box/);
});

test('Colony evolution requires adhesion, signaling and differentiation in order',()=>{
  for(const token of ['adhesion','signaling','differentiation'])assert.match(js,new RegExp(token));
  assert.match(js,/const COLONY_PATH=\['adhesion','signaling','differentiation'\]/);
  assert.match(js,/signaling:\{id:'signaling'.*requires:'adhesion'/);
  assert.match(js,/differentiation:\{id:'differentiation'.*requires:'signaling'/);
  assert.match(js,/function colonyProgress/);
  assert.match(js,/function colonyReady/);
  assert.match(js,/p\.stage==='unicellular'&&colonyReady\(p\)/);
  assert.match(js,/p\.stage='colony'/);
  assert.match(js,/if\(p\.stage==='colony'\)\{speed\*=\.9;turn\*=\.88;sense\*=1\.12;armor\+=\.28\}/);
  assert.match(html,/id="colonyProgressBox"/);
  assert.match(css,/\.colony-progress/);
});

test('Colony and morphology edits survive undo snapshots and saving',()=>{
  assert.match(js,/appearance:state\.player\.appearance/);
  assert.match(js,/slotMeta:state\.player\.slotMeta/);
  assert.match(js,/stage:state\.player\.stage/);
  assert.match(js,/appearance:state\.player\.appearance,slotMeta:state\.player\.slotMeta,stage:state\.player\.stage/);
  assert.match(js,/state\.player\.appearance=JSON\.parse\(JSON\.stringify\(editorSnapshot\.appearance\)\)/);
  assert.match(js,/state\.player\.slotMeta=JSON\.parse\(JSON\.stringify\(editorSnapshot\.slotMeta\)\)/);
});

test('Colony core traits cannot be broken out of dependency order',()=>{
  assert.match(js,/part\.requires&&!countPart\(part\.requires\)/);
  assert.match(js,/part\.id==='adhesion'.*countPart\('signaling'\).*countPart\('differentiation'\)/);
  assert.match(js,/part\.id==='signaling'&&countPart\('differentiation'\)/);
  assert.match(js,/state\.player\.stage!=='unicellular'&&COLONY_PATH\.includes\(part\.id\)/);
});


test('Early multicellular evolution requires tissues and real cell specialization',()=>{
  for(const token of ['bodyAxis','epithelium']) assert.match(js,new RegExp(token));
  for(const role of ['general','sensory','motor','digestive','protective','photo']) assert.match(js,new RegExp(role));
  assert.match(js,/const TISSUE_ROLES=Object\.freeze/);
  assert.match(js,/const TISSUE_CELL_COUNT=7/);
  assert.match(js,/function tissueCounts/);
  assert.match(js,/function specializedTissueCount/);
  assert.match(js,/function specializedTissueTypes/);
  assert.match(js,/function tissueEditorUnlocked/);
  assert.match(js,/function multicellularReady/);
  assert.match(js,/specializedTissueCount\(p\)>=4/);
  assert.match(js,/specializedTissueTypes\(p\)>=2/);
  assert.match(js,/p\.stage==='colony'&&multicellularReady\(p\)/);
  assert.match(js,/p\.stage='multicellular'/);
  assert.match(html,/id="tissueEditorBox"/);
  assert.match(html,/id="tissueCellGrid"/);
  assert.match(html,/id="tissueRoleSelect"/);
  assert.match(css,/\.tissue-editor/);
  assert.match(css,/\.tissue-cell\[data-cell="0"\]/);
});

test('Tissue roles alter multicellular survival statistics',()=>{
  assert.match(js,/tissues\.motor/);
  assert.match(js,/tissues\.sensory/);
  assert.match(js,/tissues\.protective/);
  assert.match(js,/tissueCounts\(p\)\.digestive/);
  assert.match(js,/tissueCounts\(p\)\.photo/);
  assert.match(js,/p\.stage==='multicellular'.*specializedTissueCount\(p\)/s);
  assert.match(js,/return base\+34/);
});

test('Multicellular body displays tissue layout and front-back axis',()=>{
  assert.match(js,/stage==='multicellular'/);
  assert.match(js,/const roles=Array\.from\(\{length:TISSUE_CELL_COUNT\}/);
  assert.match(js,/TISSUE_ROLES\[roles\[i\]\]/);
  assert.match(js,/ctx\.setLineDash\(\[4,5\]\)/);
  assert.match(js,/previewStage=state\.player\.stage==='colony'&&specializedTissueCount\(\)>0\?'multicellular'/);
});

test('Tissue assignments persist through save cancel and undo',()=>{
  assert.match(js,/tissueRoles:state\.player\.tissueRoles/);
  assert.match(js,/tissueRoles:state\.player\.tissueRoles,dna:state\.dna/);
  assert.match(js,/state\.player\.tissueRoles=\[\.\.\.editorSnapshot\.tissueRoles\]/);
  assert.match(js,/selectedTissueCell=0/);
});

test('Tissue prerequisites cannot be bypassed',()=>{
  assert.match(js,/bodyAxis:\{id:'bodyAxis'.*requires:'differentiation'.*colonyOnly:true/);
  assert.match(js,/epithelium:\{id:'epithelium'.*requires:'bodyAxis'.*colonyOnly:true/);
  assert.match(js,/part\.colonyOnly&&state\.player\.stage==='unicellular'/);
  assert.match(js,/part\.id==='bodyAxis'&&countPart\('epithelium'\)/);
  assert.match(js,/part\.id==='epithelium'.*specializedTissueCount\(\)>0/s);
});


test('Tissue position changes the value of specialization',()=>{
  assert.match(js,/function tissuePlacementBonuses/);
  assert.match(js,/sensoryFront/);
  assert.match(js,/motorRear/);
  assert.match(js,/digestiveCore/);
  assert.match(js,/protectiveSurface/);
  assert.match(js,/placement\.motorRear\*\.045/);
  assert.match(js,/placement\.sensoryFront\*\.055/);
  assert.match(js,/placement\.digestiveCore\*\.045/);
  assert.match(js,/placement\.protectiveSurface\*\.035/);
});

test('Multicellular bodies stay physically larger than colonies',()=>{
  assert.match(js,/const baseRadius=p\.stage==='multicellular'\?36:p\.stage==='colony'\?33:30/);
});


test('Multicellular organisms keep colony core traits',()=>{
  assert.match(js,/state\.player\.stage!=='unicellular'&&COLONY_PATH\.includes\(part\.id\)/);
  assert.match(js,/군체 이후에는 이 핵심 형질을 제거할 수 없어요/);
});
