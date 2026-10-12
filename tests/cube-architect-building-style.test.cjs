'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const main=fs.readFileSync(path.resolve(__dirname,'../games/cube3d/cube-architect.js'),'utf8');

function vector(){return {x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}}
class Object3D{
  constructor(){this.children=[];this.position=vector();this.rotation=vector();this.scale=vector();this.userData={};this.parent=null}
  add(...objects){objects.forEach(object=>{object.parent=this;this.children.push(object)})}
}
class Group extends Object3D{}
class Mesh extends Object3D{
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;this.visible=true}
}
class BoxGeometry{constructor(...dimensions){this.dimensions=dimensions}}
class ConeGeometry{constructor(...dimensions){this.dimensions=dimensions}}
class MeshStandardMaterial{constructor(properties={}){Object.assign(this,properties)}}
class PointLight extends Object3D{constructor(color,intensity,distance){super();this.color=color;this.intensity=intensity;this.distance=distance}}
const THREE={Group,Mesh,BoxGeometry,ConeGeometry,MeshStandardMaterial,PointLight,DoubleSide:2,FrontSide:0};

function fixtureFunctions(){
  const start=main.indexOf('/* Shared low-poly voxel furniture language:');
  const end=main.indexOf('function makeChestObject(',start);
  assert.ok(start>=0&&end>start,'design helpers must exist');
  const worldMeshMap=new Map();
  const scope=new Function('THREE','materialFor','worldMeshMap',
    main.slice(start,end)+'\nreturn {makeWindowObject,makeDoorObject,makeFurnaceObject,setFurnaceHeating,architecturalMaterial,architecturalBox}');
  return {...scope(THREE,type=>({type}),worldMeshMap),worldMeshMap};
}

test('crafting table enters individual 3D rendering instead of ordinary voxel chunk batching',()=>{
  assert.match(main,/workbench:\{name:'제작대'[^\n]*special:'workbench'/);
  assert.match(main,/if\(d.hidden\|\|d.special\|\|d.liquid/);
  assert.match(main,/type==='workbench'\|\|CAMP_STRUCTURE_TYPES.has\(type\)/);
  assert.match(main,/hydrateFurnishingGLB\(root,key,x,y,z,type,data\)/);
});

test('window has framed, mullioned, inset glass and keeps glazing out of shadows',()=>{
  const window=fixtureFunctions().makeWindowObject();
  assert.ok(window.children.length>=13,'woodwork should have meaningful depth and grid');
  assert.ok(window.children.some(m=>m.userData.worldGlazing),'pane material is tagged');
  assert.match(main,/o.castShadow=casts&&!o.userData\?\.worldGlazing/);
});

test('door has a fixed frame and only leaf hinges open, without rotating the entire block',()=>{
  const {makeDoorObject}=fixtureFunctions();
  const closed=makeDoorObject(0,false),open=makeDoorObject(0,true);
  const hingeClosed=closed.children.find(child=>child instanceof Group);
  const hingeOpen=open.children.find(child=>child instanceof Group);
  assert.ok(hingeClosed&&hingeOpen);
  assert.equal(hingeClosed.rotation.y,0);
  assert.equal(hingeOpen.rotation.y,-Math.PI/2);
  assert.equal(open.rotation.y,0,'world frame orientation is constant');
  assert.equal(makeDoorObject(1,true).rotation.y,Math.PI/2,'cardinal placement is preserved');
  assert.ok(closed.children.length>=3,'doorjamb and lintel remain in place');
});

test('furnace glow changes only as a transient render state, maintaining facing and voxel save format',()=>{
  const {makeFurnaceObject,setFurnaceHeating,worldMeshMap}=fixtureFunctions();
  const furnace=makeFurnaceObject(2);
  assert.equal(furnace.rotation.y,Math.PI);
  assert.ok(furnace.children.length>=14,'opening, bands, coals and grate should be modeled');
  const flameMeshes=furnace.children.filter(c=>c.geometry instanceof ConeGeometry);
  assert.equal(flameMeshes.length,3);
  assert.ok(flameMeshes.every(mesh=>mesh.visible===false));
  worldMeshMap.set('1,2,3',furnace);
  setFurnaceHeating('1,2,3',true,.5);
  assert.ok(flameMeshes.every(mesh=>mesh.visible===true));
  setFurnaceHeating('1,2,3',false);
  assert.ok(flameMeshes.every(mesh=>mesh.visible===false));
  assert.match(main,/const heatingKey=furnaceTargetKey/);
  assert.match(main,/setFurnaceHeating\(heatingKey,p<1,p\)/);
});

test('crafting and campfire fallbacks are recognizable; campfire flame animates and cleans up',()=>{
  const f=fixtureFunctions(),animatedCampfireRoots=new Set();
  const start=main.indexOf('function makeFurnishingFallback(');
  const end=main.indexOf('function hydrateFurnishingGLB(',start);
  assert.ok(start>=0&&end>start);
  const {makeFurnishingFallback,addFurnishingEffect,animateCampfireVisuals}=
    new Function('THREE','materialFor','architecturalMaterial','architecturalBox','blockDef','animatedCampfireRoots',
      main.slice(start,end)+'\nreturn {makeFurnishingFallback,addFurnishingEffect,animateCampfireVisuals}')
      (THREE,type=>({type}),f.architecturalMaterial,f.architecturalBox,type=>({color:0x998877}),animatedCampfireRoots);
  const bench=makeFurnishingFallback('workbench',{facing:0});
  assert.ok(bench.children.length>=9,'bench fallback must show tabletop, legs and tools');
  const camp=makeFurnishingFallback('campfire',{facing:0});
  assert.ok(camp.children.length>=6,'campfire fallback needs stone ring and logs');
  addFurnishingEffect(camp,'campfire',{lit:true});
  assert.equal(camp.userData.fireVisual.flames.children.length,3);
  assert.ok(animatedCampfireRoots.has(camp));
  new Group().add(camp);animateCampfireVisuals(200);
  assert.ok(camp.userData.fireVisual.light.intensity>0);
  assert.match(main,/animatedCampfireRoots.delete\(root\)/,'unloaded chunks do not keep animated fixtures');
});

test('new architectural geometry and legacy game script remain syntactically valid',()=>{
  assert.doesNotThrow(()=>new Function(main));
});
