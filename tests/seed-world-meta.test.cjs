const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','seed-world-meta.js'),'utf8');

function makeApi(){
  const store=new Map();
  const listeners=new Map();
  class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}}
  const window={
    localStorage:{
      getItem:key=>store.has(key)?store.get(key):null,
      setItem:(key,value)=>store.set(key,String(value)),
      removeItem:key=>store.delete(key)
    },
    dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);return true},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
    KidscadeCatalog:{games:[{id:'math-demo',title:'수학 데모'},{id:'kor-demo',title:'국어 데모'}]}
  };
  const context=vm.createContext({window,CustomEvent,queueMicrotask:fn=>fn(),console,Date,JSON,Object,Array,Set,Map,Math,Number,String,Boolean});
  vm.runInContext(source,context);
  return {api:window.KidscadeSeedWorldMeta,store,window};
}

test('one qualifying game creates one parcel per game per day and keeps counting trophies',()=>{
  const {api}=makeApi();
  const first=api.recordGameSession({game:'math-demo',category:'math',seconds:60});
  const second=api.recordGameSession({game:'math-demo',category:'math',seconds:60});
  assert.equal(first.parcelCreated,true);
  assert.equal(second.parcelCreated,false);
  assert.equal(api.pendingParcels().length,1);
  const trophies=api.trophies();
  assert.equal(trophies.length,1);
  assert.equal(trophies[0].count,2);
  assert.equal(trophies[0].title,'수학 데모');
});

test('daily Seed World loop is mail plus harvest plus two-zone exploration',()=>{
  const {api}=makeApi();
  api.recordGameSession({game:'kor-demo',category:'korean',seconds:45});
  const parcel=api.pendingParcels()[0];
  api.claimParcel(parcel.id);
  api.advanceTask('harvest',1);
  api.recordExplore('home');
  api.recordExplore('farm');
  const summary=api.summary();
  assert.equal(summary.dailyDone,3);
  assert.equal(summary.dailyComplete,true);
  const pending=api.pendingParcels();
  assert.ok(pending.some(p=>p.dailyBonus&&p.reward.kind==='seeds'&&p.reward.amount===30));
});

test('cosmetics unlock and equip without affecting game statistics',()=>{
  const {api}=makeApi();
  const def=api.COSMETICS[0];
  assert.equal(api.unlockCosmetic(def.id).ok,true);
  assert.equal(api.equipCosmetic(def.id).ok,true);
  const state=api.cosmeticState();
  assert.ok(state.owned.includes(def.id));
  assert.equal(state.equipped,def.id);
  assert.equal(api.equipCosmetic('').ok,true);
  assert.equal(api.cosmeticState().equipped,'');
});
