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
 assert.ok(at('historical-sprites-v1.js?v=3')>0);
 assert.ok(at('historical-sprites-v1.js?v=3')<at('joseon-pixel-v2.js?v=6'));
 assert.ok(at('historical-sprites-v1.js?v=3')<at('goryeo-view-v343.js?v=5'));
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


test('historical comparison allows work-specific review but never touches real saves',()=>{
 const html=file('historical-comparison.html');
 for(const job of ['농사','삼베 짜기','나루 일','바구니 만들기','글과 셈']){
  assert.ok(html.includes('<option value="'+job+'">'),job);
 }
 assert.match(html,/job:age<14\?'배움':chosenJob/);
 assert.match(html,/historical-sprites-v1\.js\?v=3/);
 assert.doesNotMatch(html,/localStorage|sessionStorage|indexedDB|XMLHttpRequest|fetch\(/);
 assert.equal(Historical.activityFor('학생',10),'idle');
});


test('an inland ferry worker receives a visible river, but ordinary farmers do not',()=>{
 const farmer=clone(birth),farmFrame=canvas();
 Historical.scene(farmFrame.ctx,farmer,farmer.goryeo343);
 assert.ok(!farmFrame.shapes.some(r=>r[4]==='#759ca0'),'non-ferry inland life has no river strip');
 const ferry=clone(birth);ferry.goryeo343.job='나루 일';
 const before=JSON.stringify(ferry),ferryFrame=canvas();
 const result=Historical.scene(ferryFrame.ctx,ferry,ferry.goryeo343);
 assert.equal(result.coast,false,'a riverside is not automatically a coast');
 assert.ok(ferryFrame.shapes.some(r=>r[4]==='#759ca0'),'ferry worker must stand near water');
 assert.equal(JSON.stringify(ferry),before);
});
test('an actual Goryeo refuge pauses ordinary farm and ferry poses',()=>{
 const displaced=clone(birth);displaced.goryeo343.refuge=true;
 const group=Historical.occupants(displaced,displaced.goryeo343);
 assert.ok(group.length>1,'family remains together in this refuge test');
 assert.ok(group.every(p=>p.activity==='walk'),'refuge should not look like ordinary workplace activity');
 const before=JSON.stringify(displaced);
 Historical.scene(canvas().ctx,displaced,displaced.goryeo343);
 assert.equal(JSON.stringify(displaced),before);
});


test('gold marker stays directly above the actual actor head at every age',()=>{
 for(const age of [0,2,10,14,30,70,90]){
  const life=clone(birth);life.age=age;life.year=life.birthYear+age;life.goryeo343.people=[];
  const frame=canvas(),people=Historical.occupants(life,life.goryeo343);
  assert.equal(people.length,1);
  Historical.scene(frame.ctx,life,life.goryeo343);
  const scale=age<12?.72:1;
  const sample=Historical.actor(canvas().ctx,{x:330,feet:195,age,seed:life.seed,id:'self',scale});
  const marker=frame.shapes.filter(r=>r[4]==='#e3c47d');
  const stem=frame.shapes.filter(r=>r[4]==='#e6cf8e');
  assert.equal(marker.length,1);
  assert.equal(stem.length,1);
  assert.deepEqual(marker[0].slice(0,4),[325,sample.top-7,10,4]);
  assert.equal(stem[0][1]+stem[0][3],sample.top-1,
    'gold marker cannot intrude through the hairstyle');
 }
});
test('ferry inlet is visually near the central actor but below the feet',()=>{
 const l=clone(birth);l.goryeo343.people=[];
 l.goryeo343.job='나루 일';
 const frame=canvas();
 Historical.scene(frame.ctx,l,l.goryeo343);
 const inlet=frame.shapes.filter(r=>r[4]==='#759ca0'&&r[0]===206&&r[2]===185);
 assert.equal(inlet.length,1);
 assert.ok(inlet[0][0]+inlet[0][2]>=330,'water reaches the protagonist x-position');
 assert.ok(inlet[0][1]>195,'river begins below the feet');
 const deck=frame.shapes.find(r=>r[4]==='#947653');
 assert.ok(deck&&deck[0]<=330&&deck[0]+deck[2]>=330);
 const before=JSON.stringify(l);
 Historical.scene(canvas().ctx,l,l.goryeo343);
 assert.equal(JSON.stringify(l),before);
});
test('traveling infant does not suddenly acquire an adult walking pose',()=>{
 const l=clone(birth);l.age=2;l.year=l.birthYear+2;l.goryeo343.away=1;
 assert.equal(Historical.occupants(l,l.goryeo343)[0].activity,'idle');
 l.age=8;l.year=l.birthYear+8;
 assert.equal(Historical.occupants(l,l.goryeo343)[0].activity,'walk');
});


test('historical comparison exposes real scenario differences without inventing changes',()=>{
 const html=file('historical-comparison.html');
 assert.match(html,/id="circumstance"/);
 for(const v of ['home','refuge','away'])assert.ok(html.includes('value="'+v+'"'));
 assert.match(html,/id="sampleRegion"/);
 assert.match(html,/away:situation==='away'\?1:0/);
 assert.match(html,/refuge:situation==='refuge'/);
 assert.match(html,/상황·지역 선택은 고려 예시에만 적용됩니다/);
 assert.doesNotMatch(html,/localStorage|sessionStorage|indexedDB|\.save\(/);
});


test('crowded homes prioritize a real spouse and youngest children without fabricating people',()=>{
 const life=clone(birth),g=life.goryeo343;
 const year=life.year;
 g.people=[
   {id:'mother',role:'어머니',birthYear:year-61,alive:true,plan:'삼베 짜기'},
   {id:'father',role:'아버지',birthYear:year-63,alive:true,plan:'농사'},
   {id:'child-old',role:'자녀',birthYear:year-15,alive:true,plan:'배움'},
   {id:'child-middle',role:'자녀',birthYear:year-9,alive:true,plan:'배움'},
   {id:'spouse',role:'배우자',birthYear:year-28,alive:true,plan:'삼베 짜기'},
   {id:'child-young',role:'자녀',birthYear:year,alive:true,plan:'돌봄'},
   {id:'child-away',role:'자녀',birthYear:year-5,alive:true,atHome:false,plan:'돌봄'},
   {id:'unborn',role:'자녀',birthYear:year+1,alive:true,plan:'돌봄'},
   {id:'deceased',role:'자녀',birthYear:year-7,alive:false,plan:'휴식'}
 ];
 const original=JSON.stringify(life);
 const atHome=Historical.familyAtHome(life,g);
 assert.equal(atHome.length,6,'only living, already-born family members at home');
 assert.deepEqual(Historical.occupants(life,g).map(p=>p.id),
   ['self','spouse','child-young','child-middle','child-old']);
 const frame=canvas(),summary=Historical.scene(frame.ctx,life,g);
 assert.equal(summary.visiblePeople,5);
 assert.equal(summary.offscreenFamily,2);
 assert.equal(JSON.stringify(life),original,'visual selection cannot alter family data');
 g.away=2;
 assert.deepEqual(Historical.occupants(life,g).map(p=>p.id),['self']);
 assert.equal(Historical.scene(canvas().ctx,life,g).offscreenFamily,0);
});
test('a passed-away protagonist does not occupy an imaginary spot in a crowded household',()=>{
 const l=clone(birth);l.alive=false;
 l.goryeo343.people=[
  {id:'mother',role:'어머니',birthYear:l.year-58,alive:true,plan:'삼베 짜기'},
  {id:'spouse',role:'배우자',birthYear:l.year-30,alive:true,plan:'휴식'}
 ];
 assert.deepEqual(Historical.occupants(l,l.goryeo343).map(p=>p.id),['spouse','mother']);
 const summary=Historical.scene(canvas().ctx,l,l.goryeo343);
 assert.equal(summary.visiblePeople,2);
 assert.equal(summary.offscreenFamily,0);
});
test('Goryeo canvas accessible label acknowledges relatives beyond the five-person stage',()=>{
 const source=file('goryeo-view-v343.js');
 assert.match(source,/sprites\?\.familyAtHome\(l,g\)/);
 assert.match(source,/화면 밖에 있는 식구/);
 assert.match(source,/const hiddenCount=Math\.max\(0,presentAtHome\.length/);
});
