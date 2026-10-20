'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../games/high_history_map/presentation.js'),'utf8');
function engine(reduce=false){
  const nodes={},frames=new Map();let id=0;
  function node(){return {textContent:'',style:{},classList:{add(){},remove(){}},setAttribute(){},appendChild(){},addEventListener(){}};}
  ['warEffects','warEventTitle','warEventDetail','warEventCount','warPlayback','warSpeed','warSkip'].forEach(k=>nodes[k]=node());
  const window={localStorage:{getItem(){return null},setItem(){}},matchMedia:()=>({matches:reduce}),requestAnimationFrame:cb=>{frames.set(++id,cb);return id},cancelAnimationFrame:id=>frames.delete(id)};
  const context={window,document:{getElementById:id=>nodes[id],createElementNS:()=>node(),addEventListener(){}},console,Promise};
  vm.runInNewContext(source,context);
  return {api:window.UnificationWarPresentation,frames,nodes,tick(time){const list=[...frames.values()];frames.clear();list.forEach(f=>f(time));}};
}
test('replay budget prioritizes battles and capitals but preserves chronology',()=>{
  const {api}=engine();const events=Array.from({length:20},(_,i)=>({kind:'move',relevant:true,priority:i===17?90:i===12?70:10}));
  const chosen=api.chooseEvents(events,3);assert.equal(chosen.filter(Boolean).length,3);assert.ok(chosen[12]&&chosen[17]);
  assert.equal(api.chooseEvents([{relevant:false,priority:100}],1)[0],false);
});
test('skip resolves an in-flight frame and applies every event once',async()=>{
  const {api,frames}=engine(),applied=[];
  const p=api.play([{kind:'turn',relevant:true,place:'봄'},{kind:'turn',relevant:true,place:'여름'}],{after:e=>applied.push(e.place)});
  assert.equal(api.isPlaying(),true);assert.ok(frames.size>0);api.skip();await p;
  assert.deepEqual(applied,['봄','여름']);assert.equal(api.isPlaying(),false);assert.equal(frames.size,0);
});
test('off and reduced-motion modes skip motion while applying all scene patches',async()=>{
  for(const reduced of [false,true]){
    const {api,frames}=engine(reduced),applied=[];if(!reduced)api.setMode('off');
    await api.play([{kind:'turn',relevant:true,place:'봄'},{kind:'turn',relevant:false,place:'여름'}],{after:e=>applied.push(e.place)});
    assert.deepEqual(applied,['봄','여름']);assert.equal(frames.size,0);assert.equal(api.isPlaying(),false);
  }
});
test('a failed replay unlocks the controller for the next replay',async()=>{
  const {api}=engine(true);await assert.rejects(api.play([{kind:'turn',relevant:true}],{after(){throw Error('render failed')}}),/render failed/);
  assert.equal(api.isPlaying(),false);await api.play([],{after(){}});
});
