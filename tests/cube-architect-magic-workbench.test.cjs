'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'games/cube3d/cube-architect.js'),'utf8');
const html=fs.readFileSync(path.join(root,'games/cube3d/index.html'),'utf8');
const campSource=fs.readFileSync(path.join(root,'games/cube3d/cube-architect-camp.js'),'utf8');
const getSection=(start,end)=>{
 const a=main.indexOf(start),b=main.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'missing section: '+start);
 return main.slice(a,b);
};
const workshopRuntime=getSection('const MAGIC_WORKBENCH_SITE=','function hasWorkbench(){');
function makeWorld(){
 const data=new Map(),edits=new Map();
 for(let x=-12;x<=12;x++)for(let z=-12;z<=17;z++)data.set([x,2,z].join(','),{type:'grass'});
 const c={gameFreeMode:'survival',magicWorkbenchPos:null,magicWorkbenchBeacon:null,magicWorkbenchReturnAt:-60000,
   worldEdits:edits,worldData:data,performance:{now:()=>50000},
   getBlock:(x,y,z)=>data.get([x,y,z].join(','))||null,
   getHighestSolidY:()=>2,isSolidData:d=>!!d&&d.type==='grass',
   setRawBlock:(x,y,z,block)=>{data.set([x,y,z].join(','),block)},
   markEdit:(x,y,z,block)=>{edits.set([x,y,z].join(','),block)},
   markFreeWorldDirty(){},parseWorldKey:key=>key.split(',').map(Number),Math,
   groundTopBelow:()=>3,playerCollidesAt:()=>false};
 vm.createContext(c);vm.runInContext(workshopRuntime,c);return {c,data,edits};
}
test('starter provides one permanent magical workbench without crafting it',()=>{
 const {c,data,edits}=makeWorld();
 const p=Array.from(c.ensureMagicWorkbench());
 assert.deepEqual(p,[2,3,3]);
 assert.equal(data.get('2,3,3').type,'workbench');
 assert.equal(data.get('2,3,3').magicWorkbench,true);
 assert.equal(edits.size,1);
 assert.deepEqual(Array.from(c.ensureMagicWorkbench()),p);
 assert.equal(edits.size,1,'returning to the game must not duplicate the starter');
});
test('existing houses remain untouched and a different clear site is picked',()=>{
 const {c,data,edits}=makeWorld();
 data.set('2,3,3',{type:'bed',playerBuilt:true});
 const p=Array.from(c.ensureMagicWorkbench());
 assert.notDeepEqual(p,[2,3,3]);
 assert.equal(data.get('2,3,3').type,'bed');
 assert.equal(edits.size,1);
 assert.equal(data.get(p.join(',')).magicWorkbench,true);
});
test('stored magic workbench is restored in place instead of being moved',()=>{
 const {c,data,edits}=makeWorld();
 data.set('4,3,7',{type:'workbench',magicWorkbench:true});
 edits.set('4,3,7',{type:'workbench',magicWorkbench:true});
 assert.deepEqual(Array.from(c.ensureMagicWorkbench()),[4,3,7]);
 assert.equal(edits.size,1);
});
test('return selects a nearby walkable safe cell, skipping collisions and hazards',()=>{
 const {c,data}=makeWorld();c.ensureMagicWorkbench();
 c.playerCollidesAt=(x,y,z)=>x===2&&z===4;
 data.set('3,3,3',{type:'lava'});
 const p=Array.from(c.magicWorkbenchReturnPoint());
 assert.notDeepEqual(p,[2,4.62,4]);
 assert.ok(p.every(Number.isFinite));
 assert.ok(!c.playerCollidesAt(...p));
 assert.ok(Math.hypot(p[0]-2,p[2]-3)<=4);
 data.delete('2,3,3');
 assert.equal(c.magicWorkbenchReturnPoint(),null,'missing home must not teleport into empty space');
});
test('crafting is physically constrained to the workshop, including basic planks',()=>{
 const section=getSection('function recipePossible(recipe){','function recipeCategory(recipe){');
 const ctx={gameFreeMode:'survival',near:false,hasWorkbench(){return this.near},bagCount:()=>4};
 ctx.hasWorkbench=()=>ctx.near;
 vm.createContext(ctx);vm.runInContext(section,ctx);
 const recipe={bench:false,needs:{log:1}};
 assert.equal(ctx.recipePossible(recipe),false);
 ctx.near=true;assert.equal(ctx.recipePossible(recipe),true);
});
test('backpack and workshop crafting have independent screens and names',()=>{
 const section=getSection('function setSurvivalInventoryTab(tab){','function mobileDefaultAction(){');
 const buttons=[{dataset:{bagTab:'bag'},classList:{toggle(){}},disabled:false},
   {dataset:{bagTab:'craft'},classList:{toggle(){}},disabled:false}];
 const panel={dataset:{},querySelectorAll:()=>buttons},title={textContent:''},subtitle={textContent:''};
 const c={gameFreeMode:'survival',survivalInventoryTab:'bag',near:false,
   hasWorkbench:()=>c.near,toast(){},updateMagicWorkbenchGuide(){},
   $:id=>({blockInventory:panel,inventoryTitle:title,inventorySubtitle:subtitle}[id])};
 vm.createContext(c);vm.runInContext(section,c);
 assert.equal(c.setSurvivalInventoryTab('craft'),false);
 assert.equal(c.survivalInventoryTab,'bag');
 c.near=true;assert.equal(c.setSurvivalInventoryTab('craft'),true);
 assert.equal(panel.dataset.bagTab,'craft');
 assert.match(title.textContent,/만들기/);
 assert.equal(c.setSurvivalInventoryTab('bag'),true);
 assert.match(title.textContent,/배낭/);
 assert.match(html,/id="magicWorkbenchGuide"/);
 assert.match(html,/id="magicWorkbenchReturn"/);
 assert.match(html,/data-bag-tab="craft"/);
});
test('first-day lesson teaches workbench interaction, not compulsory workbench crafting',()=>{
 const win={};new Function('window',campSource)(win);
 assert.ok(win.CubeArchitectCamp.STEPS.some(step=>step.id==='benchFind'));
 assert.ok(!win.CubeArchitectCamp.STEPS.some(step=>step.id==='benchCraft'||step.id==='benchPlace'));
 assert.equal(win.CubeArchitectCamp.satisfied('benchFind',{workbenchOpened:false}),false);
 assert.equal(win.CubeArchitectCamp.satisfied('benchFind',{workbenchOpened:true}),true);
 assert.match(main,/if\(campActive\(\)\)survivalCamp\.workbenchOpened=true/);
});
test('home is marked permanently and saved without interfering with old save fields',()=>{
 assert.match(main,/magicWorkbenchPos:magicWorkbenchPos\?\.slice\(\)\|\|null/);
 assert.match(main,/data\.magicWorkbenchPos/);
 assert.match(main,/blockDef\(data\)\.unbreakable\|\|data\.magicWorkbench/);
 assert.match(main,/magicWorkbenchHudTick>180/);
 assert.match(main,/return magicWorkbenchReturnPoint\(\)\|\|\[0,safeReturnEyeY\(\),5\]/);
 assert.doesNotThrow(()=>new Function(main));
});
