'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../games/high_one_life');
const Composer=require(path.join(root,'sprite-composer-v1.js'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context=()=>{
 const shapes=[];
 return {shapes,ctx:{fillStyle:'#000',fillRect(x,y,w,h){shapes.push([x,y,w,h,this.fillStyle]);},fillText(){},imageSmoothingEnabled:true}};
};
test('stable identities change body stage but not hair/skin/clothing',()=>{
 const person={seed:72911};
 const a=Composer.appearance(person),b=Composer.appearance({...person});
 assert.deepEqual(a,b);
 assert.notDeepEqual(a,Composer.appearance({seed:81002}));
 assert.notDeepEqual(a,Composer.appearance(person,'relative-3'));
 for(const age of [2,8,18,37,79]){
   const {shapes,ctx}=context(),body=Composer.character(ctx,{identity:person.seed,age,x:300,feet:217,scale:age<12?1:1.55});
   assert.deepEqual(body.identity,a);
   assert.equal(body.feet,217);
   assert.ok(shapes.every(([x,y,w,h])=>[x,y,w,h].every(Number.isInteger)),'whole pixel positions only');
   assert.ok(shapes.every(([, ,w,h])=>w>0&&h>0),'no negative pixel spans');
 }
});
test('walk and work are genuine two-frame poses with stable feet',()=>{
 for(const pose of ['walk','work']){
  const a=context(),b=context();
  const p=Composer.character(a.ctx,{identity:1234,age:32,pose,frame:0});
  const q=Composer.character(b.ctx,{identity:1234,age:32,pose,frame:1});
  assert.equal(p.feet,q.feet);
  assert.notDeepEqual(a.shapes,b.shapes,pose+' changes limb rectangles');
 }
});
test('depth stages and foreground remain deterministic and outside central actor',()=>{
 for(const rural of [true,false]){
  const a=context(),b=context();
  const n=Composer.distant(a.ctx,{rural,seed:4321,season:3});
  Composer.distant(b.ctx,{rural,seed:4321,season:3});
  assert.ok(n>=40);assert.deepEqual(a.shapes,b.shapes);
  const f=context();Composer.foreground(f.ctx,{rural,seed:4321});
  assert.ok(f.shapes.length>=4);
  assert.ok(f.shapes.every(([x,,w])=>x+w<=115||x>=500),'do not hide main character');
 }
});
test('actual game renders composed layers and protagonist without imported artwork',()=>{
 const html=read('index.html'),game=read('pixel-scene.js');
 assert.ok(html.indexOf('sprite-composer-v1.js?v=1')<html.indexOf('pixel-scene.js?v=4'));
 for(const api of ['Composer.distant','Composer.character','Composer.foreground'])assert.ok(game.includes(api));
 assert.match(game,/age,scale,identity:life\.seed/);
 assert.match(game,/isRural&&farming/);
 assert.doesNotMatch(read('sprite-composer-v1.js'),/fetch\(|XMLHttpRequest|apiKey|require\(['"]https?:/);
});
test('historical glossary differentiates documentary units from fictional counters',()=>{
 const html=read('index.html'),game=read('game.js');
 assert.match(html,/id="historicalUnits"/);
 assert.match(html,/게임의 곡식·땅·돈 수치는 실제 되·말·섬이나 결로 환산한 값이 아닙니다/);
 assert.match(html,/10홉 = 1되, 10되 = 1말/);
 assert.match(html,/주척 약 20\.6cm, 영조척 약 30\.8cm/);
 assert.ok(html.includes('https://encykorea.aks.ac.kr/Article/E0060270'));
 assert.match(game,/measurementGuide\.hidden=life\.year>=1900/);
 assert.ok(!html.includes('15말(평석)')&&!html.includes('섬 = 약 180L'));
 const source=read('goryeo-v343.js');
 assert.match(source,/grain:origin/,'original game's economy values are untouched');
});

test('browser-style module loading activates the new compositor in a real scene',()=>{
 const vm=require('node:vm'),ctxState=context();
 const sandbox={window:{OneLifeSpriteComposerV1:Composer},module:{exports:{}},console};
 vm.runInNewContext(read('pixel-scene.js'),sandbox,{filename:'pixel-scene.js'});
 const scene=sandbox.window.OneLifeScene;
 assert.ok(scene);
 const player={
   seed:72911,age:33,year:1991,career:'농부',
   profile:{settlement:'농촌',city:'마을',partner:false,child:false},world:{educationYears:6},arc:{}
 };
 const original=JSON.stringify(player);
 const canvas={width:600,height:258,getContext:()=>ctxState.ctx};
 assert.ok(scene.paint(canvas,player));
 assert.equal(JSON.stringify(player),original,'rendering must not mutate underlying life');
 const avatar=Composer.appearance({seed:player.seed});
 assert.ok(ctxState.shapes.some(shape=>shape[4]===avatar.hair),'seeded hairstyle should actually be painted');
 assert.ok(ctxState.shapes.some(shape=>shape[4]==='#816c4e'),'rural foreground should be painted');
});


test('10/30/70 comparison changes silhouette without changing actor identity',()=>{
 const rows=[10,30,70].map(age=>{
  const {ctx,shapes}=context();
  const bounds=Composer.character(ctx,{identity:72911,age,scale:1.5,feet:217,x:292});
  return {age,bounds,shapes};
 });
 assert.deepEqual(rows.map(r=>r.bounds.ageBand),['child','adult','elder']);
 assert.ok(rows[0].bounds.height<rows[1].bounds.height,'child must be smaller than adult');
 assert.ok(rows[2].bounds.height<rows[1].bounds.height,'elder should have a distinct silhouette');
 assert.ok(rows.every(row=>JSON.stringify(row.bounds.identity)===JSON.stringify(rows[0].bounds.identity)));
 assert.ok(rows[2].shapes.some(shape=>shape[4]==='#c4bbaa'),'elder should show graying hair');
 assert.ok(!rows[1].shapes.some(shape=>shape[4]==='#c4bbaa'),'adult should not gain graying hair');
 assert.ok(rows.every(row=>row.bounds.feet===217),'all ages stand on the same baseline');
});
test('the working hand holds exactly one hoe and children do not wield tools',()=>{
 const work=context(),idle=context(),child=context();
 Composer.character(work.ctx,{identity:82,age:30,pose:'work',frame:0,x:292,feet:217});
 Composer.character(idle.ctx,{identity:82,age:30,pose:'idle',x:292,feet:217});
 Composer.character(child.ctx,{identity:82,age:10,pose:'work',x:292,feet:217});
 const isHandle=shape=>shape[4]==='#866b4d';
 const isBlade=shape=>shape[4]==='#727d7b';
 assert.equal(work.shapes.filter(isHandle).length,1);
 assert.equal(work.shapes.filter(isBlade).length,1);
 assert.ok(!idle.shapes.some(isHandle)&&!idle.shapes.some(isBlade));
 assert.ok(!child.shapes.some(isHandle)&&!child.shapes.some(isBlade));
 const render=read('pixel-scene.js');
 assert.match(render,/if\(isRural&&farming&&!Composer\)/);
});
test('developer comparison grid covers all nine cases without accessing saves',()=>{
 const html=read('sprite-comparison.html');
 assert.match(html,/const ages=\[10,30,70\]/);
 assert.match(html,/id:'rural'/);
 assert.match(html,/id:'urban'/);
 assert.match(html,/id:'farm'/);
 assert.match(html,/for\(const age of ages\)for\(const place of conditions\)/);
 assert.match(html,/image-rendering:pixelated/);
 assert.ok(html.indexOf('sprite-composer-v1.js?v=2')<html.indexOf('pixel-scene.js?v=4'));
 assert.doesNotMatch(html,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|\.save\(/);
});
