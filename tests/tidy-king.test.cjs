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
 assert.equal(game.age,'low');
 assert.equal(game.href,'games/sim_tidy_king/index.html');
 assert.equal(game.genre,'simulation');
});
