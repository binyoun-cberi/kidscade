const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const main=fs.readFileSync('games/cube3d/cube-architect.js','utf8'),mod=fs.readFileSync('games/cube3d/cube-architect-experience.js','utf8');
const c={window:{}};vm.createContext(c);vm.runInContext(mod,c);const rules=c.window.CubeArchitectExperience;
const copy=x=>JSON.parse(JSON.stringify(x));
function extract(name){const start=main.indexOf('function '+name+'(');let count=0;for(let i=main.indexOf('{',start);i<main.length;i++){if(main[i]==='{')count++;if(main[i]==='}'&&!--count)return main.slice(start,i+1)}}
test('correction first removes an extra block, then builds from the lowest missing block',()=>{
 assert.deepEqual(copy(rules.nextCorrection([[0,0,0]],[[0,0,0],[1,0,0]])),{kind:'remove',point:[1,0,0],text:'빨간 테두리의 블록 하나를 빼 보자.'});
 assert.deepEqual(copy(rules.nextCorrection([[0,1,0],[0,0,0]],[])).point,[0,0,0]);assert.equal(rules.nextCorrection([[0,0,0]],[[0,0,0]]),null);
});
test('bridge has three gap cells and avoids existing work and hazards',()=>{
 const plan=rules.bridgePlan(()=>1,()=>null);assert.equal(plan.cells.length,3);assert.equal(plan.anchors.length,2);
 assert.equal(rules.bridgePlan(()=>1,()=>({playerBuilt:true,type:'planks'})),null);
 assert.equal(rules.bridgePlan(()=>1,()=>({type:'lava'})),null);
 assert.equal(rules.bridgePlan(x=>x%2,()=>null),null);
});
test('three actual player-built planks are needed, not scaffold or wrong material',()=>{
 const p=rules.bridgePlan(()=>1,()=>null);assert.equal(rules.bridgeReady(p,()=>({type:'planks'})),false);assert.equal(rules.bridgeReady(p,()=>({type:'stone',playerBuilt:true})),false);assert.equal(rules.bridgeReady(p,()=>({type:'planks',playerBuilt:true})),true);
});
test('saved journey validation resumes a real plan and rejects malformed coordinates',()=>{
 const plan=rules.bridgePlan(()=>1,()=>null);assert.equal(rules.readJourney({phase:'build',plan}).phase,'build');assert.equal(rules.readJourney({phase:'build',plan:{cells:[]}}).phase,'idle');assert.equal(rules.readJourney({phase:'done'}).phase,'done');
});
test('artwork storage keeps six bounded photos and plain titles',()=>{
 const works=Array.from({length:9},(_,i)=>({name:'house '+i,photo:'data:image/jpeg;base64,AA',date:'today'}));assert.equal(rules.readWorks(works).length,6);assert.equal(rules.readWorks(works)[0].name,'house 3');assert.equal(rules.readWorks([{name:'bad',photo:'https://example.test/photo'}]).length,0);
});
test('bridge completion requires reaching the elevated far end, pays once across reload',()=>{
 const els={};const $=id=>els[id]||(els[id]={classList:{toggle(){},add(){}},textContent:''});
 const plan=rules.bridgePlan(()=>1,()=>null),bag={};const ctx={$,mode:'free',gameFreeMode:'survival',campActive:()=>false,survivalStage:6,firstJourney:{phase:'build',plan},experience:rules,getBlock:()=>({type:'planks',playerBuilt:true}),showJourneyMarker(){},clearJourneyMarker(){},camera:{position:{x:plan.end[0],z:plan.end[2]}},freePhysicsY:plan.end[1]+1.62,markFreeWorldDirty(){},addToBag:(t,n)=>bag[t]=(bag[t]||0)+n,sfx(){},toast(){},saveFreeWorld(){}};
 vm.createContext(ctx);vm.runInContext(extract('updateFirstJourney'),ctx);
 ctx.freePhysicsY-=1;ctx.updateFirstJourney();assert.equal(ctx.firstJourney.phase,'cross');assert.equal(bag.planks,undefined);
 ctx.freePhysicsY+=1;ctx.updateFirstJourney();assert.equal(ctx.firstJourney.phase,'done');assert.equal(bag.planks,4);
 ctx.firstJourney=rules.readJourney(copy(ctx.firstJourney));ctx.updateFirstJourney();assert.equal(bag.planks,4);
});
test('craft feedback distinguishes workbench proximity from the exact missing ingredients',()=>{
 const ctx={bagCount:t=>t==='log'?1:0,hasWorkbench:()=>false,blockDef:t=>({name:t})};vm.createContext(ctx);vm.runInContext(extract('craftNeedHint'),ctx);
 assert.match(ctx.craftNeedHint({bench:true,needs:{planks:4}}),/제작대/);assert.match(ctx.craftNeedHint({needs:{log:3}}),/2개.*나무/);assert.match(ctx.craftNeedHint({needs:{planks:2}}),/2개.*원목/);
});
test('runtime loads experience before game code and persists journeys and photos',()=>{
 const html=fs.readFileSync('games/cube3d/index.html','utf8');assert.ok(html.indexOf('src="./cube-architect-experience.js')<html.indexOf('src="./cube-architect.js'));assert.match(main,/firstJourney,buildingWorks,projectGuide/);assert.match(main,/inventoryOpen\|\|furnaceOpen\|\|worksOpen/);assert.match(main,/img\.src=work\.photo;img\.alt=work\.name;name\.textContent=work\.name/);assert.doesNotThrow(()=>new Function(main));
});
