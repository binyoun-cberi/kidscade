import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {motionPose,actionProgress,FARM_ACTION_MOTIONS} from '../games/korean-farm/animation/motion-spec.mjs';
import {cropGrowthScale,harvestRewardLabel} from '../games/korean-farm/rendering/crop-presentation.mjs';
import {isNeutralUntextured,cropFallbackHex,scanSceneColors,repairRiceColors}
  from '../games/korean-farm/animation/color-audit.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=(p)=>readFileSync(resolve(root,'games/korean-farm',p),'utf8');

test('all nine farming actions have distinctive tool and stable motion',()=>{
  const actions=['till','plant','water','gate','weed','fertilize','harvest','scoop','sleep'];
  assert.deepEqual(Object.keys(FARM_ACTION_MOTIONS),actions);
  const poses=new Map();
  for(const action of actions){
    const spec=FARM_ACTION_MOTIONS[action];
    assert.ok(spec.duration>.6&&spec.duration<2);
    assert.ok(spec.impact>.2&&spec.impact<.9);
    assert.equal(actionProgress(action,0),0);
    assert.equal(actionProgress(action,spec.duration*10),1);
    const pose=motionPose(action,.5);
    assert.equal(pose.working,true);
    assert.equal(pose.tool,spec.tool);
    for(const [key,value] of Object.entries(pose)){
      if(typeof value==='number')assert.ok(Number.isFinite(value),action+':'+key);
    }
    poses.set(action,[pose.bodyLean,pose.rightArm,pose.crouch,pose.toolTilt].map(v=>v.toFixed(3)).join('/'));
  }
  assert.ok(new Set(poses.values()).size>=6,'Action poses should not look identical');
});
test('walking and idle use different arm and leg motion',()=>{
  const idle=motionPose(null,0,{moving:false,time:1.2});
  const walk=motionPose(null,0,{moving:true,time:1.2});
  assert.notEqual(idle.leftLeg,walk.leftLeg);
  assert.notEqual(idle.rightArm,walk.rightArm);
  assert.equal(idle.working,false);
});
test('color repair leaves textured and existing colored materials untouched',()=>{
  const texture={color:{r:1,g:1,b:1},map:{},vertexColors:false};
  const vertex={color:{r:1,g:1,b:1},vertexColors:true};
  const painted={color:{r:.13,g:.65,b:.29}};
  const neutral={color:{r:.78,g:.78,b:.78}};
  assert.equal(isNeutralUntextured(texture),false);
  assert.equal(isNeutralUntextured(vertex),false);
  assert.equal(isNeutralUntextured(painted),false);
  assert.equal(isNeutralUntextured(neutral),true);
  assert.equal(isNeutralUntextured({color:{r:.2,g:.2,b:.2}}),false);
});
test('rice fallback mat colors advance from green to golden without recoloring roots',()=>{
  assert.notEqual(cropFallbackHex('rice',1),cropFallbackHex('rice',4));
  assert.equal(cropFallbackHex('rice',4,'grain_top'),0xe4c067);
  assert.equal(cropFallbackHex('rice',2,'soil'),0x86674a);
});
test('material inspection and palette correction isolate only neutral rice materials',()=>{
  const mat=(r,g,b,{map=null,vertexColors=false,name=''}={})=>({
    color:{r,g,b,hex:null,setHex(hex){this.hex=hex}},
    map,vertexColors,name,clone(){return mat(this.color.r,this.color.g,this.color.b,{map:this.map,vertexColors:this.vertexColors,name:this.name})}
  });
  const white=mat(.97,.97,.97),green=mat(.2,.7,.15),textured=mat(1,1,1,{map:{}});
  const leaf={isMesh:true,name:'Leaves',material:[white,green,textured]};
  const source={traverse(fn){fn(leaf)}};
  const before=scanSceneColors(source);
  assert.equal(before.meshes,1);
  assert.equal(before.materials,3);
  assert.equal(before.textured,1);
  assert.equal(before.neutralUntextured,1);
  const repairs=repairRiceColors(source,4);
  assert.equal(repairs,1);
  assert.equal(leaf.material[0].color.hex,cropFallbackHex('rice',4,'Leaves'));
  assert.equal(white.color.hex,null,'Original cached material remains unchanged');
  assert.equal(leaf.material[1],green,'Existing green material preserved');
  assert.equal(leaf.material[2],textured,'Textured material preserved');
});
test('original carrot and corn models cover all four growth stages',()=>{
  const code=src('assets.js'),game=src('game.js');
  assert.match(code,/export async function loadFarmCropStage/);
  assert.match(code,/Carrot_/);
  assert.match(code,/crops-corn-stage-/);
  assert.match(game,/loadFarmCropStage\(plot\.kind,stage\)/);
  for(let stage=1;stage<=4;stage++){
    assert.ok(existsSync(resolve(root,'assets/game/crops/FBX',`Carrot_${stage}.fbx`)));
    const letter=['a','b','c','d'][stage-1];
    assert.ok(existsSync(resolve(root,'assets/game/3d/nature/kenney-nature-kit',`crops-corn-stage-${letter}.glb`)));
  }
});
test('rendering code activates articulated actor and visual impact effects',()=>{
  const game=src('game.js'),assets=src('assets.js'),actor=src('animation/farmer-animator.js');
  const effects=src('animation/field-effects.js');
  assert.match(game,/createFarmerAnimator\(\)/);
  assert.match(game,/farmerAnimator\?\.trigger\(event\.action\)/);
  assert.match(game,/farmFlow\.tick/);
  assert.match(game,/applyFarmAction\(state,plot\.id,event\.action\)/);
  assert.match(game,/updateEnvironmentAnimation/);
  assert.match(game,/fieldEffects\?\.emit/);
  assert.match(assets,/repairRiceColors/);
  assert.match(assets,/scanSceneColors/);
  assert.match(actor,/shoulders\.right\.rotation\.x/);
  assert.match(effects,/TetrahedronGeometry/);
  for(const p of [
    'animation/farmer-animator.js','animation/field-effects.js','animation/motion-spec.mjs',
    'animation/color-audit.mjs','assets.js','game.js'
  ]){
    const file=resolve(root,'games/korean-farm',p);
    assert.ok(existsSync(file),p);
    execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
  }
});

test('growth displays interpolate within each of four model stages without modifying farming state',()=>{
  assert.equal(cropGrowthScale(0,0),1);
  assert.equal(cropGrowthScale(NaN,3),1);
  for(const [stage,start,end] of [[1,0,.24],[2,.24,.49],[3,.49,.83],[4,.83,1]]){
    const a=cropGrowthScale(start,stage),b=cropGrowthScale((start+end)/2,stage),c=cropGrowthScale(end,stage);
    assert.ok(a<b&&b<c,'smooth growth inside stage '+stage);
    assert.ok(a>=.8&&c<=1.05,'asset proportions remain recognizable');
  }
  assert.equal(cropGrowthScale(-100,1),cropGrowthScale(0,1));
  assert.equal(cropGrowthScale(100,4),cropGrowthScale(1,4));
  const game=src('game.js');
  assert.match(game,/cropGrowthScale\(field\.growth,stage\)/);
  assert.match(game,/model\.userData\.baseGrowthScale=model\.scale\.clone\(\)/);
  assert.match(game,/plant\.scale\.copy\(plant\.userData\.baseGrowthScale\)\.multiplyScalar\(scale\)/);
});

test('harvest reward shows the actual final payout once rather than every cut strip',()=>{
  assert.equal(harvestRewardLabel('rice',8),'벼 +8');
  assert.equal(harvestRewardLabel('carrot',3),'당근 +3');
  assert.equal(harvestRewardLabel('corn',4),'옥수수 +4');
  assert.equal(harvestRewardLabel('rice',0),'');
  assert.equal(harvestRewardLabel('rice',2.3),'');
  assert.equal(harvestRewardLabel('unknown',7),'');
  const game=src('game.js'),reward=src('animation/harvest-reward.js');
  assert.match(game,/event\.action==='harvest'&&result\.quantity>0/);
  assert.match(game,/harvestReward\?\.show\(plot,result\.produce,result\.quantity\)/);
  assert.match(game,/harvestReward\?\.dispose\(\)/);
  assert.match(reward,/new THREE\.CanvasTexture/);
  assert.match(reward,/this\.sprite\.visible=false/);
  assert.match(reward,/this\.texture\.dispose\(\)/);
  execFileSync(process.execPath,['--check',resolve(root,'games/korean-farm/animation/harvest-reward.js')],{stdio:'pipe'});
});
