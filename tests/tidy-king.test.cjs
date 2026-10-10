const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','sim_tidy_king');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');

test('Tidy King has a locally hosted Three.js stage, touch controls and clear loop',()=>{
 assert.match(html,/kidscade-game-sdk\.js/);
 assert.match(js,/KidscadeGame\?\.result\?/);
 assert.match(html,/three-r160\/three\.module\.js/);
 assert.match(html,/src="\.\/game\.js"/);
 for(const id of ['world','intro','start','end','next','replay','count','coins','percent','barFill','missionText','help']){
  assert.match(html,new RegExp('id="'+id+'"'),'missing control '+id);
 }
 assert.match(js,/function buildRoom\(/);
 assert.match(js,/function startLevel\(/);
 assert.match(js,/function finish\(/);
 assert.match(js,/canvas\.addEventListener\('pointerdown'/);
 assert.match(js,/canvas\.addEventListener\('pointermove'/);
 assert.match(js,/canvas\.addEventListener\('pointerup'/);
});
test('Tidy King provides physical destination sorting and gradual scrubbing',()=>{
 for(const kind of ['shelf','laundry','recycle','trash','sink','toys'])
  assert.match(js,new RegExp(kind+':\\{label:'),'missing station '+kind);
 assert.match(js,/function selectItem\(/);
 assert.match(js,/function placeItem\(/);
 assert.match(js,/station\.key!==item\.zone/);
 assert.match(js,/animations\.push\(\{kind:'move'/);
 assert.match(js,/function cleanStain\(/);
 assert.match(js,/stain\.amount=Math\.min\(1,stain\.amount\+effort\)/);
 assert.match(js,/scrubDistance/);
 assert.match(js,/function makeSparkles\(/);
});
test('Tidy King uses existing Kidscade assets and includes apartment and kitchen',()=>{
 assert.match(js,/kenney-furniture-kit/);
 assert.match(js,/charming-kitchen-set/);
 assert.match(js,/StylooClassroomAssetPack/);
 assert.match(js,/soda-bottle\.glb/);
 assert.match(js,/soda-can\.glb/);
 assert.match(js,/2 · 난장판 주방/);
 assert.match(js,/1 · 엉망진창 원룸/);
 assert.match(js,/portraitFit/);
 assert.match(js,/pickables\.push\(group\)/);
});
test('Tidy King catalog classification and entrypoint are valid',()=>{
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
 const game=catalog.games.find(g=>g.id==='sim_tidy_king');
 assert.ok(game);
 assert.equal(game.title,'싹싹! 정리왕');
 assert.equal(game.category,'job');
 assert.equal(game.age,'toddler');
 assert.deepEqual(game.ages,['toddler']);
 assert.equal(game.sessionMinutes,5);
 assert.equal(game.href,'games/sim_tidy_king/index.html');
 assert.equal(game.genre,'simulation');
});

test('Tidy King handles final stain cleanup without null access',()=>{
 assert.match(js,/if\(scrubbing&&!\s*scrubbing\.done\)/);
 assert.match(js,/const active=scrubbing;cleanStain\(active,/);
 assert.match(js,/if\(active\.done\)scrubbing=null/);
});
test('Tidy King has real receptacles, persistent deposited props and finish photos',()=>{
 assert.match(js,/function stationModel\(/);
 assert.match(js,/trashcan/);
 assert.match(js,/function depositPosition\(/);
 assert.match(js,/finalScale:station\.key/);
 assert.doesNotMatch(js,/root\.remove\(a\.item\.group\);makeSparkles\(a\.end\)/);
 assert.match(js,/function captureScene\(/);
 assert.match(js,/beforeImage=captureScene\(\)/);
 assert.match(js,/after\.src=clean/);
 for(const id of ['beforePhoto','afterPhoto','startKitchen'])assert.match(html,new RegExp('id="'+id+'"'));
});
test('Tidy King unlocks kitchen independently of the apartment and refreshes stage controls',()=>{
 assert.match(js,/saved\.unlocked\?'🍽️ 주방 정리!'/);
 assert.match(js,/if\(saved\.unlocked\)launchStage\(1\)/);
 assert.match(js,/saved\.unlocked=Math\.max/);
 assert.match(js,/showStageButtons\(\)/);
});

test('Tidy King places items through physical pointer drag, not tap-then-tap',()=>{
 assert.match(js,/function beginDrag\(/);
 assert.match(js,/function moveDrag\(/);
 assert.match(js,/function candidateAt\(/);
 assert.match(js,/function resetDrag\(/);
 assert.match(js,/const state=dragging,station=state\.moved\?candidateAt\(e\):null/);
 assert.match(js,/if\(station&&station\.key===state\.item\.zone\)/);
 assert.match(js,/function groundAt\(/);
 assert.match(js,/canvas\.setPointerCapture\(e\.pointerId\)/);
 assert.match(html,/id="dropGuide"/);
 assert.match(html,/물건을 손가락으로 끌어요/);
});
test('Tidy King scatters props into natural clusters, not an 8-column grid',()=>{
 assert.match(js,/function scatterClutter\(/);
 assert.match(js,/const anchors=\{/);
 assert.match(js,/const scatter=scatterClutter\(list,rand\)/);
 assert.doesNotMatch(js,/const col=i%8,row=Math\.floor\(i\/8\)/);
 assert.match(js,/source\.home\.x\+Math\.cos\(theta\)/);
});

test('Tidy King has large clearable three-dimensional trash mountains',()=>{
 assert.match(js,/book:14,pen:8,pillow:10/);
 assert.match(js,/cup:18,plate:16,pan:5/);
 assert.match(js,/function createClutterMountains\(/);
 assert.match(js,/new THREE\.InstancedMesh\(/);
 assert.match(js,/itemModel\(kind,size,props\[kind\]\.color\)/);
 assert.match(js,/function retreatClutterMountains\(/);
 assert.match(js,/retreatClutterMountains\(\)/);
 assert.match(js,/ratio>=1\?decorations\.length/);
 assert.match(js,/m\.geometry\.dispose\(\)/);
});

test('Tidy King offers preschool default and optional full pile cleanup',()=>{
 assert.match(html,/id="modeEasy"/);
 assert.match(html,/id="modeBig"/);
 assert.match(html,/약 20개만 정리하면 성공해요!/);
 assert.match(js,/let running=false, level=0, challengeMode=false/);
 assert.match(js,/littleItems:\{book:5,toy:5,bottle:5,cup:3\},littleStains:2/);
 assert.match(js,/littleItems:\{cup:5,plate:4,bottle:5,can:3,bag:3\},littleStains:2/);
 assert.match(js,/challengeMode\?def\.items:def\.littleItems/);
 assert.match(js,/challengeMode\?def\.stains:def\.littleStains/);
 assert.match(js,/setMode\(false\)/);
 assert.match(js,/34:26/);
 assert.match(js,/90:76/);
});
