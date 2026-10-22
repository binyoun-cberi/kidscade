'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
const Historical=require(path.join(root,'historical-sprites-v1.js'));
const canvas=()=>{const shapes=[];const ctx={
 fillStyle:'',imageSmoothingEnabled:true,
 fillRect(...args){assert.ok(args.every(Number.isInteger));assert.ok(args[2]>0&&args[3]>0);shapes.push([...args,this.fillStyle]);},
 clearRect(){},beginPath(){},moveTo(){},lineTo(){},fill(){}};
 return {ctx,shapes,canvas:{width:720,height:220,getContext:()=>ctx,setAttribute(){} }};
};
const birth={
 seed:1729,birthYear:1280,year:1305,age:25,alive:true,gender:'여자',
 profile:{name:'강월'},
 goryeo343:{
   region:'충청 내륙',origin:'농민 가구',job:'농사',grain:22,
   bound:false,away:0,refuge:false,
   people:[
    {id:'mother',name:'어머니',birthYear:1252,alive:true,plan:'삼베 짜기'},
    {id:'father',name:'아버지',birthYear:1249,alive:false,plan:'농사'},
    {id:'not-yet',name:'동생',birthYear:1310,alive:true,plan:'농사'},
    {id:'faraway',name:'큰언니',birthYear:1260,alive:true,atHome:false,plan:'나루 일'},
    {id:'sibling',name:'형제',birthYear:1290,alive:true,plan:'배움'}
   ]
 }
};
const clone=x=>JSON.parse(JSON.stringify(x));
test('a Goryeo scene never invents four neighbors; only living people actually at home appear',()=>{
 const l=clone(birth),g=l.goryeo343,original=JSON.stringify(l);
 const people=Historical.occupants(l,g);
 assert.deepEqual(people.map(x=>x.id),['self','mother','sibling']);
 assert.ok(people.every(x=>Number.isFinite(x.age)&&x.age>=0));
 const image=canvas(),result=Historical.scene(image.ctx,l,g);
 assert.equal(result.visiblePeople,3);
 assert.equal(image.ctx.imageSmoothingEnabled,true,'caller owns nearest-neighbor setting');
 assert.ok(image.shapes.length>80);
 assert.equal(JSON.stringify(l),original,'visuals cannot modify a saved life');
 g.away=3;assert.deepEqual(Historical.occupants(l,g).map(x=>x.id),['self']);
 const travel=canvas(),traveler=Historical.scene(travel.ctx,l,g);
 assert.equal(traveler.visiblePeople,1);assert.equal(traveler.away,true);
});
test('historical faces keep appearance through 10/30/70, but silhouettes and work change',()=>{
 const stable=Historical.appearance(1729,'self');
 const diff=Historical.appearance(1729,'mother');
 assert.notDeepEqual(stable,diff);
 for(const age of [10,30,70]){
   const image=canvas();
   const a=Historical.actor(image.ctx,{seed:1729,id:'self',age,feet:196,x:330,
       activity:'craft',phase:age%2,scale:1});
   assert.deepEqual(a.identity,stable);
   assert.equal(a.feet,196);
   assert.ok(image.shapes.every(row=>row.every((v,i)=>i===4||Number.isInteger(v))));
 }
 const young=Historical.actor(canvas().ctx,{seed:1729,age:10});
 const grown=Historical.actor(canvas().ctx,{seed:1729,age:30});
 const older=Historical.actor(canvas().ctx,{seed:1729,age:70});
 assert.equal(young.ageBand,'child');assert.equal(grown.ageBand,'adult');assert.equal(older.ageBand,'elder');
 assert.ok(young.height<grown.height&&older.height<grown.height);
 const child=canvas(),adult=canvas();
 Historical.actor(child.ctx,{seed:1729,age:10,activity:'craft'});
 Historical.actor(adult.ctx,{seed:1729,age:30,activity:'craft'});
 assert.ok(!child.shapes.some(row=>row[4]==='#a68354'),'child cannot carry an adult craft basket');
 assert.equal(adult.shapes.filter(row=>row[4]==='#a68354').length,1);
});
test('Goryeo condition affects shelters without generating people or changing the economy',()=>{
 const original=clone(birth);
 const rural=canvas(),coast=canvas();
 Historical.scene(rural.ctx,original,original.goryeo343);
 original.goryeo343.region='서남 해안';
 const coastal=Historical.scene(coast.ctx,original,original.goryeo343);
 assert.equal(coastal.coast,true);
 assert.ok(coast.shapes.some(x=>x[4]==='#759ca0'),'coastal environment has water');
 assert.ok(!rural.shapes.some(x=>x[4]==='#759ca0'));
 assert.equal(original.goryeo343.grain,22);
 const refugeLife=clone(birth),refuge=canvas();
 refugeLife.goryeo343.refuge=true;
 const people=Historical.occupants(refugeLife,refugeLife.goryeo343);
 const result=Historical.scene(refuge.ctx,refugeLife,refugeLife.goryeo343);
 assert.equal(result.visiblePeople,people.length,'the family may still be together while taking refuge');
 assert.ok(refuge.shapes.some(x=>x[4]==='#baa079'),'refuge should have a temporary shelter');
 assert.ok(!refuge.shapes.some(x=>x[4]==='#d4bf9b'),'refuge must not pretend the household is still in its usual house');
});
test('Joseon scene keeps its existing period wardrobe while supplying seeded face identity',()=>{
 const ctx={};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(file('joseon-culture-v1.js'),ctx);
 ctx.OneLifeHistoricalSpritesV1=Historical;
 ctx.OneLifeJoseon3={zone:()=> 'farm',season:()=> '봄'};
 vm.runInContext(file('joseon-pixel-v2.js'),ctx);
 const life={seed:1729,year:1588,age:30,birthYear:1558,gender:'남자',
 profile:{name:'남석'},joseon:{birthStatus:'양반',occupation:'농사'},
 joseon4:{people:[{id:'mother',birthYear:1535,age:53,sex:'여자',alive:true,atHome:true}]},
 joseon5:{origin:'문반 양반'}};
 const image=canvas(),original=JSON.stringify(life);
 assert.equal(ctx.OneLifeJoseonPixel2.paint(image.canvas,life,{time:600}),true);
 assert.equal(JSON.stringify(life),original);
 const self=Historical.appearance(life.seed,'self');
 const mother=Historical.appearance(life.seed,'mother');
 assert.ok(image.shapes.some(r=>r[4]===self.skin),'self skin uses identity');
 assert.ok(image.shapes.some(r=>r[4]===mother.skin),'family face uses own identity');
 assert.equal(ctx.OneLifeJoseonCulture.wardrobe(1588,'문반 양반','남자','관직 생활',30,{duty:true}).headwear,'samo');
 assert.match(file('joseon-pixel-v2.js'),/Culture\?\.wardrobe\(year,origin,sex/);
});
test('historical composer precedes both renderers and never ships licensed external art',()=>{
 const html=file('index.html');
 const at=name=>html.indexOf(name);
 assert.ok(at('historical-sprites-v1.js?v=1')>0);
 assert.ok(at('historical-sprites-v1.js?v=1')<at('joseon-pixel-v2.js?v=6'));
 assert.ok(at('historical-sprites-v1.js?v=1')<at('goryeo-view-v343.js?v=2'));
 assert.match(file('goryeo-view-v343.js'),/historical\.scene\(c,l,g/);
 assert.match(file('joseon-pixel-v2.js'),/Historical\?\.appearance\(life\.seed,personId\)/);
 assert.doesNotMatch(file('historical-sprites-v1.js'),/fetch\(|XMLHttpRequest|localStorage|sessionStorage|https?:\/\//);
 const css=file('goryeo-v343.css');
 assert.match(css,/#goryeoPlay canvas\{image-rendering:crisp-edges;image-rendering:pixelated/);
});


test('Goryeo recorded livelihood selects distinct tools and never gives children adult tools',()=>{
 const jobs=[
  ['농사','farm','#72776b'],['삼베 짜기','weave','#d6c6a6'],
  ['모시 짜기','weave','#d6c6a6'],['나루 일','river','#bdad81'],
  ['바구니 만들기','craft','#a68354'],['글과 셈','read','#e4d4ad']
 ];
 for(const [job,activity,color] of jobs){
   assert.equal(Historical.activityFor(job,30),activity,job);
   const image=canvas(),before=JSON.stringify(birth);
   Historical.actor(image.ctx,{age:30,activity,seed:1729,id:'self',phase:1});
   assert.ok(image.shapes.some(x=>x[4]===color),job+' has its own visible prop');
   assert.equal(JSON.stringify(birth),before);
 }
 for(const age of [3,10,13,70,90]){
  for(const [job] of jobs)assert.equal(Historical.activityFor(job,age),'idle');
 }
 assert.equal(Historical.activityFor('농사',30,true),'walk','away from home is walking, not farming');
 assert.equal(Historical.activityFor('아직 정해지지 않음',30),'idle');
 const l=clone(birth),people=Historical.occupants(l,l.goryeo343);
 assert.equal(people[0].activity,'farm');
 assert.equal(people[1].activity,'weave');
 assert.equal(people[2].activity,'read');
});
test('tools follow the wrist on both frames while the ground baseline stays fixed',()=>{
 for(const [activity,ink] of [['farm','#72776b'],['weave','#d6c6a6'],['river','#bdad81'],['craft','#a68354']]){
  const a=canvas(),b=canvas();
  const first=Historical.actor(a.ctx,{x:340,feet:192,age:35,activity,phase:0,seed:14});
  const second=Historical.actor(b.ctx,{x:340,feet:192,age:35,activity,phase:1,seed:14});
  const prop=shapes=>shapes.filter(x=>x[4]===ink).map(x=>x[1]);
  assert.ok(prop(a.shapes).length>0&&prop(b.shapes).length>0,activity);
  assert.notDeepEqual(prop(a.shapes),prop(b.shapes),'wrist-connected '+activity+' should move');
  assert.equal(first.feet,second.feet);
 }
});
