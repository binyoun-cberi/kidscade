'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const read=p=>fs.readFileSync(root+'/'+p,'utf8');
const main=read('games/cube3d/cube-architect.js');
const w={};new Function('window',read('games/cube3d/cube-architect-world.js'))(w);
new Function('window',read('games/cube3d/cube-architect-camp.js'))(w);
const camp=w.CubeArchitectCamp,world=w.CubeArchitectWorld;
const fresh=()=>({harvestedWood:0,harvestedStone:0,crafted:{},placed:{},shelterBuilt:false});
test('a first-time player can finish every action using real recipe costs',()=>{
 const stats=fresh(),bag={},baseline={};const c={stats,bag,baseline,moved:0,inventoryOpen:false};
 const harvest=(type,n)=>{bag[type]=(bag[type]||0)+n;if(type==='log')stats.harvestedWood+=n;if(type==='stone')stats.harvestedStone+=n};
 const craft=id=>{const r=world.RECIPES.find(r=>r.id===id);for(const [t,n]of Object.entries(r.needs)){assert.ok(bag[t]>=n,id+' lacks '+t);bag[t]-=n}for(const[t,n]of Object.entries(r.gives))bag[t]=(bag[t]||0)+n;stats.crafted[id]=(stats.crafted[id]||0)+1};
 c.moved=3;c.atWalkTarget=true;assert.ok(camp.satisfied('walk',c));
 harvest('log',3);assert.ok(camp.satisfied('wood',c));
 c.inventoryOpen=true;assert.ok(camp.satisfied('bag',c));
 craft('planks');assert.ok(camp.satisfied('planks',c));
 craft('workbench');assert.ok(camp.satisfied('benchCraft',c));
 bag.workbench--;stats.placed.workbench=1;assert.ok(camp.satisfied('benchPlace',c));
 craft('planks');assert.ok(camp.satisfied('morePlanks',c));
 craft('sticks');assert.ok(camp.satisfied('sticks',c));
 craft('woodPick');assert.ok(camp.satisfied('pick',c));
 harvest('stone',1);assert.ok(camp.satisfied('stone',c));
 harvest('log',1);craft('planks');craft('planks');
 assert.ok(bag.planks>=camp.SHELTER.length);
 bag.planks-=camp.SHELTER.length;stats.placed.planks=camp.SHELTER.length;
 c.shelterComplete=true;assert.ok(camp.satisfied('shelter',c));
 stats.shelterBuilt=true;assert.ok(camp.satisfied('inside',c));
 Object.assign(baseline,camp.snapshot(stats));
 for(const id of ['ownWood','ownPlanks','ownPlace'])assert.equal(camp.satisfied(id,c),false,id);
 harvest('log',1);assert.ok(camp.satisfied('ownWood',c));craft('planks');assert.ok(camp.satisfied('ownPlanks',c));
 bag.planks--;stats.placed.planks++;assert.ok(camp.satisfied('ownPlace',c));
});
test('walking requires reaching the displayed destination',()=>{
 assert.equal(camp.satisfied('walk',{moved:5,atWalkTarget:false}),false);
 assert.equal(camp.satisfied('walk',{moved:0,atWalkTarget:true}),false);
 assert.equal(camp.satisfied('walk',{moved:2,atWalkTarget:true}),true);
});
test('the shelter blueprint creates a real usable shelter with a walkable entrance',()=>{
 const blocks=new Map(camp.SHELTER.map(p=>[p.join(','),{type:'planks',playerBuilt:true}]));
 const read=(x,y,z)=>blocks.get([x,y,z].join(','));
 assert.equal(world.shelterAt(read,-3,3,3).playerBuilt,true);
 assert.equal(read(-3,3,3),undefined);assert.equal(read(-3,4,3),undefined);
 assert.equal(read(-3,3,4),undefined);
 blocks.delete('-3,5,3');assert.equal(world.shelterAt(read,-3,3,3).playerBuilt,false);
});
test('survival goals allow the pickaxe and stone before any cuboid',()=>{
 const s=fresh();s.crafted.woodPick=1;s.harvestedStone=1;
 assert.equal(world.goalProgress(world.GOALS[3],s),1);
 assert.equal(world.goalProgress(world.GOALS[4],s),1);
 assert.equal(camp.STEPS.some(s=>/view-toggle|radial|cuboid/.test(s.id)),false);
});
test('stored lesson achievements do not require recrafting spent materials',()=>{
 const c={stats:{crafted:{workbench:1,woodPick:1},placed:{workbench:1}},bag:{},bagOpened:true};
 for(const id of ['benchCraft','benchPlace','morePlanks','sticks','pick','bag'])assert.ok(camp.satisfied(id,c),id);
 for(const id of ['ownWood','ownPlanks','ownPlace'])assert.equal(camp.satisfied(id,c),false);
});
test('runtime advances from saved milestones and captures independent practice once',()=>{
 const section=main.slice(main.indexOf('function tutorialRefreshProgress(){'),main.indexOf('function tutorialSignal(action){'));
 const context={tutorialState:{camp:true,index:0,steps:camp.STEPS},survivalCamp:{completed:['walk','wood','bag','planks','benchCraft','benchPlace','morePlanks','sticks','pick','stone','shelter','inside'],baseline:null},
  stats:{harvestedWood:8,crafted:{planks:4},placed:{planks:6}},window:w,rendered:0,
  campActive:()=>true,campHelpTarget:null,campStep:()=>context.tutorialState.steps[context.tutorialState.index],
  campContext:()=>({stats:context.stats,baseline:context.survivalCamp.baseline}),survivalStats:null,
  sfx:()=>{},renderTutorialStep:()=>context.rendered++,markFreeWorldDirty:()=>{}};
 context.survivalStats=context.stats;vm.createContext(context);vm.runInContext(section,context);context.tutorialRefreshProgress();
 assert.equal(context.campStep().id,'ownWood');assert.equal(context.survivalCamp.baseline.wood,8);
 context.stats.harvestedWood++;context.tutorialRefreshProgress();assert.equal(context.campStep().id,'ownPlanks');
 context.stats.crafted.planks++;context.tutorialRefreshProgress();assert.equal(context.campStep().id,'ownPlace');
 context.stats.placed.planks++;context.tutorialRefreshProgress();assert.equal(context.campStep().id,'done');
 assert.equal(context.survivalCamp.baseline.wood,8);
});
test('camp preparation never modifies an existing saved world',()=>{
 const section=main.slice(main.indexOf('function prepareSurvivalCamp(){'),main.indexOf('function campNearest(types){'));
 let writes=0;const c={gameFreeMode:'survival',savedFreePosition:[0,4.62,5],worldEdits:new Map(),survivalCamp:{},setRawBlock:()=>writes++,markEdit:()=>writes++};
 vm.createContext(c);vm.runInContext(section,c);c.prepareSurvivalCamp();assert.equal(writes,0);
 c.savedFreePosition=null;c.worldEdits.set('old',{type:'planks'});c.prepareSurvivalCamp();assert.equal(writes,0);
 c.worldEdits.clear();c.prepareSurvivalCamp();assert.ok(writes>0);assert.equal(c.survivalCamp.prepared,true);
});
test('learner copy avoids engineering language and the old compulsory camera/radial lessons',()=>{
 const copy=camp.STEPS.map(s=>s.title+' '+s.text).join(' ');
 assert.doesNotMatch(copy,/자동|감지|통과|판정|핫바|프레임|해금|버전|성공 조건/);
 assert.doesNotMatch(main.slice(main.indexOf('function showSurvivalCamp('),main.indexOf('function tutorialRefreshProgress(')),/free-view-toggle|mobile-radial/);
 assert.ok(main.includes("campLesson:{...survivalCamp}"));
 assert.ok(read('games/cube3d/index.html').indexOf('cube-architect-camp.js')<read('games/cube3d/index.html').indexOf('src="./cube-architect.js'));
});
test('actual crafting consumes ingredients and cannot succeed away from a workbench',()=>{
 const code=main.slice(main.indexOf('function craftSurvival(recipe){'),main.indexOf('function blockButtonMarkup('));
 const bag={planks:3,sticks:2},stats=fresh(),el={classList:{add(){},remove(){}},disabled:false};
 const c={craftingBusy:false,gameFreeMode:'survival',inventoryBatchDepth:0,HOTBAR_TOOL_TYPES:['woodPick'],
  $:()=>el,bagCount:t=>bag[t]||0,hasWorkbench:()=>c.near,blockDef:t=>({name:t}),markRecipeSeen(){},recipePossible:r=>c.near&&Object.entries(r.needs).every(([t,n])=>(bag[t]||0)>=n),
  near:false,toast(){},sfx(){},setTimeout:fn=>fn(),consumeBag:(t,n)=>bag[t]-=n,addToBag:(t,n)=>bag[t]=(bag[t]||0)+n,
  trackSurvival:(a,t)=>stats.crafted[t]=(stats.crafted[t]||0)+1,putOnHotbar:t=>c.selected=t,
  maybeEquipCraftedGear:()=>false,buildHotbar(){},buildInventory(){},updateSurvivalEquipmentUi(){},markFreeWorldDirty(){}};
 vm.createContext(c);vm.runInContext(main.slice(main.indexOf('function craftNeedHint('),main.indexOf('function showCraftSource(')),c);vm.runInContext(code,c);const recipe=world.RECIPES.find(r=>r.id==='woodPick');
 c.craftSurvival(recipe);assert.equal(bag.planks,3);assert.equal(stats.crafted.woodPick,undefined);
 c.near=true;c.craftSurvival(recipe);assert.equal(bag.planks,0);assert.equal(bag.sticks,0);assert.equal(bag.woodPick,1);
 assert.equal(stats.crafted.woodPick,1);assert.equal(c.selected,'woodPick');
 c.craftSurvival(recipe);assert.equal(bag.woodPick,1);
});
test('actual placement counts only successful world changes',()=>{
 const code=main.slice(main.indexOf('function placeFreeBlock(hit){'),main.indexOf('function breakFreeBlock('));
 const blocks=new Map(),bag={workbench:1},stats=fresh(),p={x:2,y:3,z:3};
 const c={selectedType:'workbench',PLACEABLE_TYPES:['workbench'],gameFreeMode:'survival',camera:{position:{x:0,z:5}},freePhysicsY:4.62,
  placementTarget:()=>p,inWorld:()=>true,getBlock:(x,y,z)=>blocks.get([x,y,z].join(',')),blockDef:()=>({solid:true}),
  placementSupportError:()=>'',bagCount:t=>bag[t]||0,facingFromYaw:()=>0,setWorldBlock:(x,y,z,d)=>blocks.set([x,y,z].join(','),d),
  consumeBag:(t,n)=>bag[t]-=n,trackSurvival:(a,t)=>stats.placed[t]=(stats.placed[t]||0)+1,
  buildHotbar(){},updateFreeMission(){},sfx(){},tutorialSignal(){},markFreeWorldDirty(){},toast(){}};
 vm.createContext(c);vm.runInContext(code,c);const hit={object:{userData:{type:'grass'}}};
 c.placeFreeBlock(hit);assert.equal(stats.placed.workbench,1);assert.equal(bag.workbench,0);assert.equal(blocks.get('2,3,3').playerBuilt,true);
 c.placeFreeBlock(hit);assert.equal(stats.placed.workbench,1);
 blocks.clear();p.x=0;p.z=5;bag.workbench=1;c.placeFreeBlock(hit);assert.equal(stats.placed.workbench,1);assert.equal(bag.workbench,1);
});
