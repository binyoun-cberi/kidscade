'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'games/cube3d/cube-architect.js'),'utf8');
function harness(){
  const ctx={window:{},console};vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/vendor/three-r160/three-global.js'),'utf8'),ctx);
  vm.runInContext(`const THREE=window.THREE;
    ${source.slice(source.indexOf('class SimpleOrbit'),source.indexOf('const $ ='))}
    const canvas={addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})};
    window.addEventListener=()=>{};
    let camera=new THREE.PerspectiveCamera(55,800/600,.05,220),mode='net';
    let orbit=new SimpleOrbit(camera,canvas,new THREE.Vector3());
    const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
    const netAssigned=Array(6).fill(''),selectedSymbol='🌟',netQuizMode='decorate';
    const netBox=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.2,2.2),Array.from({length:6},()=>new THREE.MeshBasicMaterial()));
    const faceNames=['right','left','top','bottom','front','back'];
    const label={textContent:''},$=()=>label,sfx=()=>{},tutorialSignal=()=>{};
    const symbolMaterial=()=>new THREE.MeshBasicMaterial();
    ${source.slice(source.indexOf('function setNetView('),source.indexOf('function buildNetBoard('))}
    ${source.slice(source.indexOf('function netHit('),source.indexOf('function checkNet('))}
    ${source.match(/camera\.position\.set\(5,4\.2,6\);camera\.lookAt\(0,0,0\);makeOrbit[^\n]+/)[0].replace('makeOrbit(new THREE.Vector3(0,0,0));','orbit.syncFromCamera();')}
    function clickFace(i){
      camera.updateMatrixWorld();netBox.updateMatrixWorld();
      const point=new THREE.Vector3(...[[1.1,0,0],[-1.1,0,0],[0,1.1,0],[0,-1.1,0],[0,0,1.1],[0,0,-1.1]][i]).project(camera);
      const hit=netHit({clientX:(point.x+1)*400,clientY:(1-point.y)*300});
      assignNetFace(hit);return hit?.face.materialIndex;
    }
  `,ctx);
  return code=>vm.runInContext(code,ctx);
}
test('bottom-view button exposes a clickable bottom face and preserves other answers',()=>{
  const run=harness();
  assert.equal(run('clickFace(2)'),2);
  run('setNetView(true)');assert.ok(run('camera.position.y<0'));
  assert.equal(run('clickFace(3)'),3);
  assert.equal(run('netAssigned[3]'),'🌟');assert.equal(run('netAssigned[2]'),'🌟');
  run('setNetView(false)');assert.ok(run('camera.position.y>0'));
  assert.equal(run('netAssigned[3]'),'🌟');
});
test('dragging reaches every face, including the bottom, through the actual camera and raycaster',()=>{
  const run=harness();
  for(const [i,theta,phi] of [[0,Math.PI/2,Math.PI/2],[1,-Math.PI/2,Math.PI/2],[2,0,.12],[3,0,Math.PI-.12],[4,0,Math.PI/2],[5,Math.PI,Math.PI/2]]){
    run(`orbit.theta=${theta};orbit.phi=${phi};orbit.updatePosition()`);
    assert.equal(run(`clickFace(${i})`),i);
  }
  assert.equal(run('netAssigned.filter(Boolean).length'),6);
  run('setNetView(false);orbit.onDown({button:0,clientX:400,clientY:300});orbit.onMove({clientX:400,clientY:600})');
  assert.ok(run('camera.position.y<0'),'vertical drag can move below the cube');
});
