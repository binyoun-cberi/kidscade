import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmActionFlow,actionApproachPoint,actionContactPoint}
  from '../games/korean-farm/interactions/action-flow.mjs';
import {FIELD_DEFS} from '../games/korean-farm/world.mjs';
import {createFarmState,canApplyFarmAction,applyFarmAction,fieldById}
  from '../games/korean-farm/farming/farm-sim.mjs';

const rice=FIELD_DEFS.find(p=>p.id==='rice-4');

test('one click from afar creates movement without changing inventory or soil',()=>{
  const state=createFarmState();
  const pos={x:0,z:9},flow=createFarmActionFlow();
  const original=JSON.stringify(state);
  assert.equal(canApplyFarmAction(state,rice.id,'harvest').ok,true);
  assert.equal(flow.request({action:'harvest',plot:rice,position:pos}).phase,'approach');
  assert.equal(flow.busy,true);
  assert.equal(JSON.stringify(state),original);
  const target=flow.active.goal;
  assert.ok(Number.isFinite(target.x)&&Number.isFinite(target.z));
  assert.equal(flow.tick(.1,pos),null);
  assert.equal(flow.tick(.1,target).type,'start');
  assert.equal(JSON.stringify(state),original);
  assert.equal(flow.tick(.1,target,{impact:false,working:true}),null);
  assert.equal(JSON.stringify(state),original);
  const event=flow.tick(.1,target,{impact:true,working:true});
  assert.equal(event.type,'impact');
  assert.equal(event.fieldId,'rice-4');
  assert.equal(applyFarmAction(state,event.fieldId,event.action).ok,true);
  const count=state.inventory.rice;
  assert.ok(count>0);
  assert.equal(flow.tick(.1,target,{impact:true,working:true}),null,'impact cannot repeat');
  assert.equal(state.inventory.rice,count);
  assert.equal(flow.tick(.1,target,{working:false}).type,'complete');
  assert.equal(flow.busy,false);
});
test('busy actions reject duplicate clicks and never replace original field',()=>{
  const flow=createFarmActionFlow();
  assert.equal(flow.request({action:'harvest',plot:rice,position:{x:rice.x,z:rice.z}}).phase,'ready');
  assert.equal(flow.request({action:'harvest',plot:rice,position:{x:0,z:9}}).type,'busy');
  assert.equal(flow.tick(.016,{x:rice.x,z:rice.z}).type,'start');
  assert.equal(flow.cancelApproach(),false,'in-progress swing is not cancelable');
  assert.equal(flow.tick(.7,{x:rice.x,z:rice.z},{impact:true,working:true}).type,'impact');
  assert.equal(flow.tick(.2,{x:rice.x,z:rice.z},{working:false}).type,'complete');
});
test('manual movement cancels only a queued walk; timed-out paths have no cost',()=>{
  const flow=createFarmActionFlow({walkTimeout:.4});
  const pos={x:18,z:20};
  flow.request({action:'weed',plot:rice,position:pos});
  assert.equal(flow.cancelApproach(),true);
  assert.equal(flow.busy,false);
  flow.request({action:'weed',plot:rice,position:pos});
  assert.equal(flow.tick(.5,pos).type,'timeout');
  assert.equal(flow.busy,false);
  assert.equal(flow.tick(.1,pos),null);
});
test('approach and impact target points remain on the proper field boundary',()=>{
  const p={x:5,z:-4,w:4,d:3,id:'test'};
  for(const start of [{x:20,z:-4},{x:5,z:20},{x:-10,z:-12},{x:5,z:-4}]){
    const goal=actionApproachPoint(p,start);
    assert.ok(Number.isFinite(goal.x)&&Number.isFinite(goal.z));
    const contact=actionContactPoint(p,start);
    assert.ok(contact.x>=p.x-p.w/2+.1&&contact.x<=p.x+p.w/2-.1);
    assert.ok(contact.z>=p.z-p.d/2+.1&&contact.z<=p.z+p.d/2-.1);
  }
});
test('farm validation is side-effect-free even when action is impossible',()=>{
  const state=createFarmState();
  const snapshot=JSON.stringify(state);
  assert.equal(canApplyFarmAction(state,'rice-4','harvest').ok,true);
  assert.equal(canApplyFarmAction(state,'rice-1','harvest').ok,false);
  assert.equal(canApplyFarmAction(state,'corn-1','gate').ok,false);
  assert.equal(canApplyFarmAction(state,'rice-4','till').ok,false);
  assert.equal(canApplyFarmAction(state,'missing','harvest').ok,false);
  assert.equal(JSON.stringify(state),snapshot);
  state.energy=0;
  assert.equal(canApplyFarmAction(state,'rice-4','harvest').ok,false);
});
