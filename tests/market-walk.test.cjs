const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'games/math_base10_blocks/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'games/math_base10_blocks/market-walk.js'),'utf8');

test('neighborhood mart is a free-form life simulator instead of a shopping-list mission',()=>{
  assert.match(html,/우리 동네에서 먹고 살아보기/);
  assert.match(html,/정해진 장보기 목록은 없어요/);
  assert.doesNotMatch(html,/class="missionCard"|id="shoppingList"/);
  assert.match(js,/WEEKLY_BUDGET=35000/);
  assert.match(js,/function buildHome\(/);
  assert.match(js,/function buildStore\(/);
  assert.match(js,/function rollEvent\(/);
  assert.match(js,/dailyKcal/);
});

test('market is first-person, cart based, and checkout requires manual arithmetic',()=>{
  assert.match(js,/PerspectiveCamera\(62/);
  assert.match(js,/function tryTakeMarketProduct\(/);
  assert.match(js,/function putHeldInCart\(/);
  assert.match(js,/async function spawnCart\(/);
  assert.match(html,/총액 직접 계산/);
  assert.match(html,/거스름돈 직접 계산/);
  assert.doesNotMatch(html,/id="checkoutTotal"/);
  assert.match(js,/function submitTotal\(/);
  assert.match(js,/function submitChange\(/);
});

test('home kitchen supports physical storage, cooking, quick food, and eating',()=>{
  assert.match(js,/interactable\('fridge'/);
  assert.match(js,/interactable\('pantry'/);
  assert.match(js,/interactable\('counter'/);
  assert.match(js,/interactable\('stove'/);
  assert.match(js,/interactable\('microwave'/);
  assert.match(js,/interactable\('table'/);
  assert.match(js,/async function cookPrep\(/);
  assert.match(js,/async function microwaveHeld\(/);
  assert.match(js,/async function eatAtTable\(/);
  assert.match(js,/protein:/);
  assert.match(js,/sodium:/);
  assert.match(js,/sugar:/);
});

test('required 3D market and food assets exist',()=>{
  const required=[
    'assets/game/shops/market/cash-register.glb',
    'assets/game/shops/market/shopping-cart.glb',
    'assets/game/shops/market/display-fruit.glb',
    'assets/game/shops/market/display-bread.glb',
    'assets/game/shops/market/freezer.glb',
    'assets/game/shops/market/freezers-standing.glb',
    'assets/game/shops/market/shelf-boxes.glb',
    'assets/game/shops/market/shelf-bags.glb',
    'assets/game/food/apple.glb',
    'assets/game/food/egg.glb',
    'assets/game/food/tomato.glb',
    'assets/game/food/fish.glb',
    'assets/game/food/pizza.glb',
    'assets/game/3d/food/ultimate-food-pack/banana.glb',
    'assets/game/3d/food/ultimate-food-pack/broccoli.glb',
    'assets/game/3d/food/ultimate-food-pack/fries.glb',
    'assets/game/3d/interiors/charming-kitchen-set/toaster.glb',
    'assets/game/3d/interiors/charming-kitchen-set/kettle.glb',
    'assets/game/3d/interiors/charming-kitchen-set/pan.glb',
    'assets/game/3d/city/poly-pizza-city-pack/bench.glb',
    'assets/game/3d/city/poly-pizza-city-pack/bicycle.glb',
    'assets/game/3d/city/poly-pizza-city-pack/planter-and-bushes.glb'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing asset: '+rel);
});

test('v4 asset pass upgrades products, kitchen detail, store fixtures, and neighborhood props',()=>{
  assert.match(js,/const ULTIMATE_FOOD=ROOT\+'3d\/food\/ultimate-food-pack\/'/);
  assert.match(js,/const CHARMING=ROOT\+'3d\/interiors\/charming-kitchen-set\/'/);
  assert.match(js,/PRODUCT_V4=\{/);assert.match(js,/function productAssetUrl\(p\)\{return PRODUCT_V4\[p\?\.id\]\?ULTIMATE_FOOD\+PRODUCT_V4\[p\.id\]:FOOD\+p\.model\}/);
  assert.match(js,/marketSurfaceModel\('?/);
  assert.match(js,/display-fruit/);
  assert.match(js,/freezers-standing/);
  assert.match(js,/CITY_DECOR_ASSETS=\{/);
  assert.match(js,/planter-and-bushes\.glb/);
});

const vm=require('node:vm');
function mealHarness(){const source=js.slice(js.indexOf('function applyMeal('),js.indexOf('function rollEvent('));const state={running:true,location:'home',phase:'home',day:1,slot:0,hunger:40,condition:75,satisfaction:62,dailyKcal:0,dailyNutrition:{protein:0,veg:0,sugar:0,sodium:0},dailyIncome:0,dailyExpense:0,dailyIncidents:[],weightKg:35,treatmentNeeded:false,injury:null,mealFoods:[],mealCooked:false,mealQuick:false,inventory:[],weekStats:{sugar:0,sodium:0,veg:0,protein:0,meals:0,cooked:0,quick:0}};const classList={add(){},remove(){}};const field={textContent:'',classList};const context={state,nearest:{type:'table'},DAILY_CAL_TARGET:1800,SLOTS:['아침','점심','저녁'],ui:{dayReportTitle:field,dayReportSummary:field,dayIncome:field,dayExpense:field,dayKcal:field,dayNutrition:field,dayWeight:field,dayHealth:field,dayModal:{classList}},freshDailyNutrition:()=>({protein:0,veg:0,sugar:0,sodium:0}),nutritionText:()=> '무난함',conditionText:()=> '좋음',fmt:n=>Math.round(n).toLocaleString('ko-KR')+'원',clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),toast(){},tone(){},save(){},renderHud(){},showWeekReport(){},rollEvent(){}};vm.createContext(context);vm.runInContext(source,context);return context}
const food={name:'사과',nutrition:{kcal:95,satiety:17,veg:2,protein:0,sugar:10,sodium:0,mood:2}};
test('multiple foods stay in one meal until explicit finish, and finish cannot repeat',()=>{const c=mealHarness();c.applyMeal(food,false,false);c.applyMeal(food,false,false);assert.equal(c.state.slot,0);assert.equal(c.state.dailyKcal,190);assert.equal(c.state.weekStats.meals,0);c.finishMeal();assert.equal(c.state.slot,1);assert.equal(c.state.weekStats.meals,1);assert.equal(c.state.weekStats.quick,0);c.finishMeal();assert.equal(c.state.slot,1)});
test('meal completion requires proximity to the table and preserves food records otherwise',()=>{const c=mealHarness();c.applyMeal(food,true,false);c.nearest={type:'stove'};c.finishMeal();assert.equal(c.state.slot,0);assert.equal(c.state.mealFoods.length,1);c.nearest={type:'table'};c.finishMeal();assert.equal(c.state.weekStats.cooked,1)});
test('cooking does not manufacture vegetables or an unconditional condition bonus',()=>{const a=mealHarness(),b=mealHarness();a.applyMeal(food,true,false);b.applyMeal(food,false,false);assert.equal(a.state.condition,b.state.condition);assert.equal(a.state.dailyNutrition.veg,food.nutrition.veg);assert.equal(b.state.dailyNutrition.veg,food.nutrition.veg)});
test('three finished meals open the daily report, and the next-day action advances and resets calories',()=>{const c=mealHarness();for(let i=0;i<3;i++){c.applyMeal(food,false,false);c.finishMeal()}assert.equal(c.state.day,1);assert.equal(c.state.phase,'day');assert.equal(c.state.dailyKcal,285);assert.equal(c.state.weekStats.meals,3);c.completeDay();assert.equal(c.state.day,2);assert.equal(c.state.slot,0);assert.equal(c.state.dailyKcal,0)});

function kitchenHarness(){
 const runtime={window:{},console};vm.createContext(runtime);vm.runInContext(fs.readFileSync(path.join(root,'assets/vendor/three-r160/three-global.js'),'utf8'),runtime);const THREE=runtime.window.THREE;
 function glbModel(url){const file=path.join(root,'assets/game',url.replace('../../assets/game/',''));const bytes=fs.readFileSync(file);assert.equal(bytes.toString('ascii',0,4),'glTF',file);const len=bytes.readUInt32LE(12),g=JSON.parse(bytes.toString('utf8',20,20+len));const binOffset=20+len+8;
 function node(i){const n=g.nodes[i],o=new THREE.Group();o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);if(n.mesh!==undefined)for(const prim of g.meshes[n.mesh].primitives){const a=g.accessors[prim.attributes.POSITION],view=g.bufferViews[a.bufferView],start=binOffset+(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||12,xyz=[];for(let k=0;k<a.count;k++)for(let j=0;j<3;j++)xyz.push(bytes.readFloatLE(start+k*stride+j*4));const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));o.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial()))}for(const child of n.children||[])o.add(node(child));return o}
 const scene=new THREE.Group();for(const i of g.scenes[g.scene||0].nodes)scene.add(node(i));return{scene}}
 const ctx={THREE,asset:async u=>glbModel(u),KITCHEN:'../../assets/game/3d/interiors/kenney-furniture-kit/',FOOD:'../../assets/game/food/',world:new THREE.Group(),colliders:[],state:{location:'home'},recolor(){},addCollider(x,z,w,d){ctx.colliders.push({x,z,w,d})}};vm.createContext(ctx);vm.runInContext(js.slice(js.indexOf('async function homeModel('),js.indexOf('async function toggleStorage(')),ctx);vm.runInContext(js.slice(js.indexOf('function canStand('),js.indexOf('function sign(')),ctx);return ctx
}
test('real kitchen models retain proportions, sit on the floor, and face reachable interaction points',async()=>{const c=kitchenHarness();const fixtures=[['kitchen-fridge',2.25,[-2.65,0,-.9],'y',[-1.25,-.9],Math.PI/2],['kitchen-cabinet-upper-double',1.05,[-2.65,0,.65],'x',[-1.25,.65],Math.PI/2],['kitchen-sink',1,[-1.15,0,-2.35],'y',[-1.15,-1.1],0],['kitchen-stove-electric',1,[2.65,0,-.9],'y',[1.25,-.9],-Math.PI/2],['table',.78,[0,0,2.1],'y',[0,.9],0]];for(const [name,value,pos,axis,spot,rot]of fixtures){const r=await c.homeModel(name,value,pos,axis,rot);const b=r.userData.closedBounds;assert.ok(Math.abs(b.min.y)<1e-5,name+' grounded');assert.ok(Math.abs(r.userData.localBounds.getSize(new c.THREE.Vector3())[axis]-value)<1e-5,name+' scale');assert.ok(c.canStand(...spot),name+' interaction accessible');if(name==='kitchen-fridge'){const door=r.getObjectByName('doorFridge');assert.ok(door);c.setStorageDoors(r,true);assert.ok(door.rotation.y<0);assert.ok(r.userData.closedBounds.equals(b));c.setStorageDoors(r,false);assert.equal(door.rotation.y,0)}}});
test('meal visuals preserve their ingredients and use real plate and cooked egg models',()=>{assert.match(js,/ingredients:d.ingredients/);assert.match(js,/ingredients:\[p.id\]/);assert.match(js,/FOOD\+'plate.glb'/);assert.match(js,/'egg-cooked.glb'/);assert.doesNotMatch(js,/CylinderGeometry|TorusGeometry/);const ctx={};vm.createContext(ctx);vm.runInContext(js.slice(js.indexOf('function dishIngredients('),js.indexOf('async function dishModel(')),ctx);assert.deepEqual(Array.from(ctx.dishIngredients({ingredients:['egg','tomato']})),['egg','tomato']);assert.deepEqual(Array.from(ctx.dishIngredients({name:'달걀 토스트'})),['bread','egg'])});

test('tap shopping puts an item directly into the cart without a movement or held-item step',async()=>{const source=js.slice(js.indexOf('async function tryTakeMarketProduct('),js.indexOf('async function takeHomeItem('));const state={running:true,phase:'shopping',location:'market',hasCart:true,basket:[],held:null};const c={state,tapBusy:false,productById:id=>({id,name:id}),spawnCart:async()=>{},syncCartCargo:async()=>{},tone(){},renderHud(){},save(){},toast(){}};vm.createContext(c);vm.runInContext(source,c);await c.tryTakeMarketProduct('apple');assert.deepEqual(Array.from(state.basket),['apple']);assert.equal(state.held,null);state.phase='checkout';await c.tryTakeMarketProduct('apple');assert.equal(state.basket.length,1)});
test('walkable town connects home, mart, office, hospital, traffic injuries, and condition-based dog escapes',()=>{assert.match(js,/async function buildTown\(/);assert.match(js,/async function buildOffice\(/);assert.match(js,/async function buildHospital\(/);assert.match(js,/HOSPITAL_COST=\{dog:12000,car:30000,sick:8000\}/);assert.match(js,/dogChaseLeft=10\+Math\.random\(\)\*10/);assert.match(js,/dogSpeed=4\.45/);assert.match(js,/speed=3\.4\+1\.4\*clamp\(state\.condition/);assert.match(js,/function handleCarCollision\(/);assert.match(html,/id="nutritionStat"/);assert.match(html,/id="weightStat"/);assert.match(html,/id="dayModal"/)});
test('market product click requires a physical cart before adding goods',async()=>{const source=js.slice(js.indexOf('async function tryTakeMarketProduct('),js.indexOf('async function takeHomeItem('));const state={running:true,phase:'shopping',location:'market',hasCart:false,basket:[],held:null};let warned=0;const c={state,tapBusy:false,productById:id=>({id,name:id}),syncCartCargo:async()=>{},tone(){},renderHud(){},save(){},toast(){warned++}};vm.createContext(c);vm.runInContext(source,c);await c.tryTakeMarketProduct('apple');assert.equal(state.basket.length,0);assert.equal(warned,1);state.hasCart=true;await c.tryTakeMarketProduct('apple');assert.deepEqual(Array.from(state.basket),['apple'])});
test('skipping a meal advances time with a real hunger and condition cost',()=>{const c=mealHarness();const h=c.state.hunger,cond=c.state.condition;c.skipMeal();assert.equal(c.state.slot,1);assert.ok(c.state.hunger<h);assert.ok(c.state.condition<cond);assert.match(c.state.dailyIncidents[0],/아침 끼니를 건너뛰었어요/)});
test('overnight sleep recovery prevents a reasonable day from endlessly draining condition',()=>{const c=mealHarness();for(let i=0;i<3;i++){c.applyMeal(food,false,false);c.finishMeal()}const before=c.state.condition;c.completeDay();assert.ok(c.state.condition>before);assert.equal(c.state.day,2)});
test('traffic stops continuously at the line, resumes without teleporting, and exposes a yellow phase',()=>{const source=js.slice(js.indexOf('function trafficPhase('),js.indexOf('async function ensureCity('));const pos={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};const mover={root:{position:pos,rotation:{y:0}},lane:6.8,z:-2.9,speed:2.4,offset:0,walk:false};const c={state:{running:true,location:'town',phase:'town'},document:{hidden:false},cityTime:8.5,carHitCooldown:0,trafficSignalMeshes:[],cityMovers:[mover],playerPos:{x:99,z:99},tone(){},renderHud(){},save(){},toast(){},injuryBurst(){},setTimeout(){},buildHospital(){},clamp:(x,a,b)=>Math.min(b,Math.max(a,x))};vm.createContext(c);vm.runInContext(source,c);c.updateCity(.1);assert.equal(mover.z,-2.8);c.updateCity(.1);assert.equal(mover.z,-2.8);c.cityTime=.1;c.updateCity(.1);assert.ok(mover.z>-2.8&&mover.z<-2.4);c.cityTime=8.1;assert.equal(c.trafficPhase(),'yellow');assert.match(js,/carYellow/)});
test('dog chase respects town collision geometry and uses the intended medium-condition pressure',()=>{assert.match(js,/dogSpeed=4\.45/);assert.match(js,/canStand\(dog\.position\.x\+vx,dog\.position\.z\)/);assert.match(js,/canStand\(x,z\)&&Math\.hypot\(x-playerPos\.x,z-playerPos\.z\)>7/);assert.match(js,/function renderEvent\(\)\{if\(dog\|\|!state\.event\)/)});
test('tap ingredient selection moves exactly one stored item to the tray',async()=>{const source=js.slice(js.indexOf('async function selectTapFood('),js.indexOf('async function tapAction('));const state={running:true,location:'home',held:null,inventory:[{uid:'a',id:'egg'}],prep:[]};const c={state,tapBusy:false,productById:id=>({name:id}),tone(){},renderHud(){},save(){},toast(){},syncHomeInventory:async()=>{}};vm.createContext(c);vm.runInContext(source,c);await c.selectTapFood('a');await c.selectTapFood('a');assert.equal(state.inventory.length,0);assert.equal(state.prep.length,1)});
test('tap cooking delivers a dish to the table and guards overlapping actions',async()=>{const source=js.slice(js.indexOf('async function tapAction('),js.indexOf("$('#placeButtons').onclick"));const state={running:true,location:'home',prep:[{id:'egg'}],held:null,dish:null};let finishCooking;const c={state,tapBusy:false,tapStation:'counter',renderTapControls(){},renderHud(){},jumpToStation(){},productById:id=>({id,quick:false}),cookPrep:async()=>{await new Promise(r=>finishCooking=r);state.held={kind:'dish',name:'달걀구이'};state.prep=[]},clearHeldModel(){},syncHomeInventory:async()=>{},save(){},tone(){},toast(){}};vm.createContext(c);vm.runInContext(source,c);const first=c.tapAction('cook');assert.equal(c.tapBusy,true);await c.tapAction('cook');finishCooking();await first;assert.equal(state.dish.name,'달걀구이');assert.equal(state.held,null);assert.equal(c.tapStation,'table');assert.equal(c.tapBusy,false)});

test('checkout advances through one visible stage only after each prerequisite succeeds',()=>{const c={state:{basket:['egg','bread'],scanned:new Set(),totalConfirmed:false,paid:0}};vm.createContext(c);vm.runInContext(js.slice(js.indexOf('function checkoutStage('),js.indexOf('function renderCheckoutStage(')),c);assert.equal(c.checkoutStage(),'scan');c.state.scanned.add(0);assert.equal(c.checkoutStage(),'scan');c.state.scanned.add(1);assert.equal(c.checkoutStage(),'total');c.state.totalConfirmed=true;assert.equal(c.checkoutStage(),'pay');c.state.paid=5000;assert.equal(c.checkoutStage(),'change')});
test('mobile markup consolidates duplicate actions and provides separate main and local places',()=>{assert.doesNotMatch(html,/class="lifePanel|id="finishMeal"|id="returnPrep"/);assert.match(html,/id="localPlaces"/);assert.match(html,/id="scanSection"/);assert.match(html,/id="checkoutStep"/);const css=fs.readFileSync(path.join(root,'games/math_base10_blocks/market-walk.css'),'utf8');assert.match(css,/#tapItems\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/\.scanItem b,\.scanItem strong\{font-size:17px/)});

test('compact kitchen station anchors remain connected around all fixtures',async()=>{const c=kitchenHarness();for(const [name,value,pos,axis,rot]of [['kitchen-fridge',2.25,[-2.65,0,-.9],'y',Math.PI/2],['kitchen-cabinet-upper-double',1.05,[-2.65,0,.65],'x',Math.PI/2],['kitchen-sink',1,[-1.15,0,-2.35],'y',0],['kitchen-cabinet',1,[0,0,-2.35],'y',0],['kitchen-cabinet',1,[1.05,0,-2.35],'y',0],['kitchen-stove-electric',1,[2.65,0,-.9],'y',-Math.PI/2],['kitchen-cabinet',1,[2.65,0,.65],'y',-Math.PI/2],['table',.78,[0,0,2.1],'y',0],['chair',.9,[-.65,0,2.95],'y',Math.PI],['chair',.9,[.65,0,2.95],'y',Math.PI]])await c.homeModel(name,value,pos,axis,rot);const seen=new Set(['0,0']),queue=[[0,0]];while(queue.length){const [x,z]=queue.shift();for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=nx+','+nz;if(!seen.has(key)&&c.canStand(nx*.1,nz*.1)){seen.add(key);queue.push([nx,nz])}}}for(const [x,z]of [[-1.25,-.9],[-1.25,.65],[.5,-1.1],[1.25,-.9],[1.25,.65],[0,.9],[-2.4,2.5]]){assert.ok(c.canStand(x,z),'clear station '+[x,z]);assert.ok(seen.has(Math.round(x*10)+','+Math.round(z*10)),'connected station '+[x,z])}});
test('compact store products rest on real displays and its station anchors stay reachable',async()=>{const c=kitchenHarness();c.state.location='market';c.marketDisplays={};for(const [key,x,z,width]of [['produceA',-3.4,-3.4,2.3],['produceB',-.85,-3.4,2.3],['bakery',2.6,-3.4,2.3],['chilled',3.85,-.4,2.5],['island',0,0,2.6]]){const r=await c.homeModel('table',width,[x,0,z],'x',key==='chilled'?Math.PI/2:0);c.marketDisplays[key]=r.userData.closedBounds}c.addCollider(-3.3,2.7,2,1.1);vm.runInContext(js.slice(js.indexOf('const PRODUCTS='),js.indexOf('\n];',js.indexOf('const PRODUCTS='))+3)+'\nglobalThis.PRODUCTS=PRODUCTS;',c);vm.runInContext(js.slice(js.indexOf('function productPlacement('),js.indexOf('async function buildMarketProducts(')),c);const occupied=[];for(const p of c.PRODUCTS){const pos=c.productPlacement(p);assert.ok(Object.values(c.marketDisplays).some(b=>Math.abs(pos[1]-b.max.y-.01)<1e-5&&pos[0]>b.min.x&&pos[0]<b.max.x&&pos[2]>b.min.z&&pos[2]<b.max.z),p.id+' supported');for(const q of occupied)assert.ok(Math.hypot(pos[0]-q[0],pos[2]-q[2])>.32,p.id+' separated');occupied.push(pos)}for(const q of [[-1.7,-1.8],[2.6,-1.8],[2.2,-.7],[2.2,.4],[0,1.5],[-3.3,3.7],[1.6,3.6]])assert.ok(c.canStand(...q),'clear market station '+q);assert.doesNotMatch(js,/box\(\[\.72,\.54,\.72\]/)});
test('window walls use framed modular bays with clear city views',()=>{const c=kitchenHarness(),solids=[];c.box=(size,pos,color,rough,parent)=>{solids.push({size,pos,color});const m=new c.THREE.Mesh(new c.THREE.BoxGeometry(...size),new c.THREE.MeshBasicMaterial());m.position.set(...pos);parent?.add(m);return m};vm.runInContext(js.slice(js.indexOf('function windowWall('),js.indexOf('function cityPose(')),c);const wall=c.windowWall(6.4,3.3,[3.35,0,0],Math.PI/2,.92,3.2);assert.equal(wall.rotation.y,Math.PI/2);const panes=[];wall.traverse(x=>{if(x.isMesh&&x.material?.transparent&&x.material?.depthWrite===false)panes.push(x)});assert.ok(panes.length>=2,'multiple glass bays');for(const pane of panes){assert.ok(pane.material.opacity>0&&pane.material.opacity<.5);assert.equal(pane.material.depthWrite,false)}assert.ok(solids.filter(b=>b.color===0x716b62).length>=6,'visible frames');assert.ok(solids.some(b=>b.color===0xc9c2b4),'sill and lintel trim')});
test('city traffic remains outside both rooms, wraps smoothly, and pauses offscreen',()=>{const c={state:{running:true,location:'home'},document:{hidden:false},cityTime:0,cityMovers:[],carHitCooldown:0,trafficSignalMeshes:[]};vm.createContext(c);vm.runInContext(js.slice(js.indexOf('function cityPose('),js.indexOf('async function ensureCity(')),c);for(const lane of [4.9,6.8,9.2,11.1])for(const speed of [-2.1,.75,2.4])for(const time of [0,1,20,10000]){const q=c.cityPose(time,speed,17,lane);assert.equal(q.x,lane);assert.ok(q.z>=-16&&q.z<16);assert.equal(q.y,0)}c.updateCity(.05);assert.equal(c.cityTime,.05);c.document.hidden=true;c.updateCity(.05);assert.equal(c.cityTime,.05);assert.match(js,/if\(cityReady\)return cityReady/);assert.match(js,/await ensureCity\(\)/);assert.match(js,/Object.values\(CITY_ASSETS\)/)});

test('every neighborhood backdrop model resolves to an existing bundled asset',()=>{const c={ROOT:'assets/game/'};vm.createContext(c);vm.runInContext(js.slice(js.indexOf('const CITY_ASSETS='),js.indexOf('const SAVE_KEY='))+'globalThis.models=CITY_ASSETS;',c);assert.equal(Object.keys(c.models).length,7);for(const file of Object.values(c.models))assert.ok(fs.existsSync(path.join(root,file)),file)});

test('town doors are visible and pedestrians are grounded to the sidewalk surface',()=>{assert.match(js,/function visibleDoor\(/);assert.match(js,/visibleDoor\(\[-2\.4,0,3\.11\]/);assert.match(js,/visibleDoor\(\[\.8,0,4\.36\]/);assert.match(js,/visibleDoor\(\[-3\.5,0,3\.27\]/);assert.match(js,/groundY=groundModel\(r,surfaceY,\.04\)/);assert.match(js,/surfaceY=\.06/);assert.match(js,/keepPedestrianAboveGround\(m,\.025\)/);assert.match(js,/footLocalY:r\.userData\.footLocalY/)});

test('pedestrian gait simulation never lets feet enter the sidewalk',()=>{
  const helperSource=js.slice(js.indexOf('function pedestrianFootY('),js.indexOf('function box('));
  const citySource=js.slice(js.indexOf('function trafficPhase('),js.indexOf('async function ensureCity('));
  const pos={x:4.9,y:.1,z:-9,set(x,y,z){this.x=x;this.y=y;this.z=z}};
  const mover={root:{position:pos,rotation:{y:0}},lane:4.9,z:-9,speed:.75,offset:4,walk:true,groundY:.1,surfaceY:.06,footLocalY:0};
  const c={state:{running:true,location:'town',phase:'town'},document:{hidden:false},cityTime:0,carHitCooldown:0,trafficSignalMeshes:[],cityMovers:[mover],playerPos:{x:99,z:99},tone(){},renderHud(){},save(){},toast(){},injuryBurst(){},setTimeout(){},buildHospital(){},clamp:(x,a,b)=>Math.min(b,Math.max(a,x))};
  vm.createContext(c);vm.runInContext(helperSource,c);vm.runInContext(citySource,c);
  let min=Infinity;
  for(let i=0;i<1200;i++){c.updateCity(1/60);min=Math.min(min,c.pedestrianFootY(mover))}
  assert.ok(min>=.085-1e-9,'foot bottom '+min+' must stay at least 2.5 cm above the 0.06 sidewalk top');
});
test('town people use skeleton-safe clones and actual walk animation instead of collapsed skinned meshes',()=>{
  assert.ok(js.includes("three/addons/utils/SkeletonUtils.js"));
  assert.ok(js.includes("cloneSkeleton(g.scene)"));
  assert.ok(js.includes("wrap.userData.animations=g.animations||[]"));
  assert.ok(js.includes("new THREE.AnimationMixer(root)"));
  assert.ok(js.includes("m.mixer?.update(dt)"));
  assert.ok(js.includes("mixer=startModelAnimation(r,/walk|sprint|run/i)"));
});
test('traffic crashes and dog attacks have distinct audible and visual feedback',()=>{
  assert.ok(js.includes("function playCarImpactSound("));
  assert.ok(js.includes("function playDogSound("));
  assert.ok(js.includes("impactBurst(playerPos,'car')"));
  assert.ok(js.includes("triggerCameraImpact(.34,.52)"));
  assert.ok(js.includes("playDogSound('bark')"));
  assert.ok(js.includes("dogBarkCooldown=1.35+Math.random()*1.15"));
  assert.ok(js.includes("playDogSound('bite')"));
  assert.ok(js.includes("updateCameraImpact(dt)"));
});
test('market page cache-busts the town feedback fix',()=>{assert.ok(html.includes('market-walk.js?v=15-town-feedback'))});
