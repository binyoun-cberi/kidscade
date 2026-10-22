const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const dir=path.resolve(__dirname,'../games/tod_mot_chatgetda_kkwaekkori');
const modules=Promise.all([import(pathToFileURL(path.join(dir,'sim.mjs')).href),import(pathToFileURL(path.join(dir,'journeys.mjs')).href)]);

test('bakery visitors complete purchase, park meal and return without losing targets or overlapping',async()=>{
  const [sim,journeys]=await modules;
  for(const difficulty of ['easy','normal','hard'])for(let seed=1;seed<=30;seed++){
    const town=sim.makeTown('small',seed,difficulty);
    const targets=town.order.map(id=>town.people.find(p=>p.id===id));
    const before=targets.map(p=>[sim.signature(p),sim.getRoutePosition(p,town.config)]);
    const state=journeys.setupBakeryTrips(town,b=>sim.getBlockCenter(b,town.config));
    assert.ok(state.people.length>0,`${difficulty}/${seed}: visitors exist`);
    const seen=new Set(),previous=new Map();
    for(let tick=0;tick<2200;tick++){
      sim.movePeople(town,.1);
      for(const id of state.people){
        const p=town.people.find(p=>p.id===id),t=p.trip,pos=sim.getRoutePosition(p,town.config);
        seen.add(t.stage);
        if(previous.has(id))assert.ok(Math.hypot(pos.x-previous.get(id).x,pos.z-previous.get(id).z)<=.07201,'no teleport');
        previous.set(id,pos);
        assert.equal(p.reserved,false,'targets and foils never join the trip');
        if(['buy','queue','return','returnWait','rest','toCounter'].includes(t.stage))assert.equal(t.carrying,false);
        if(['pickup','depart','toPark','eat'].includes(t.stage))assert.equal(t.carrying,true);
        if(t.stage==='eat')assert.equal(state.seats.find(s=>s.id===t.seat).owner,id);
        if(tick%10===0)for(const other of town.people){
          if(other.id===id)continue;
          const q=sim.getRoutePosition(other,town.config);
          assert.ok(Math.hypot(q.x-pos.x,q.z-pos.z)>=journeys.WALK_RADIUS*2-.00001,`separation ${id}/${other.id}`);
        }
      }
      for(const target of targets)assert.ok(sim.personIsDiscoverable(town,target.id));
      assert.ok(state.returned<=state.eaten&&state.eaten<=state.bought);
    }
    for(const id of state.people)assert.ok(town.people.find(p=>p.id===id).trip.cycles>=1,`${id} cannot be starved`);
    for(const stage of ['buy','pickup','toPark','eat','return'])assert.ok(seen.has(stage),stage);
    assert.deepEqual(targets.map(sim.signature),before.map(([look])=>look));
    for(let i=0;i<targets.length;i++){
      const at=sim.getRoutePosition(targets[i],town.config),origin=before[i][1];
      assert.ok(Math.hypot(at.x-origin.x,at.z-origin.z)<=.16001,'target remains in its original activity bay');
    }
  }
});

test('trip paths avoid building envelopes, and counter and picnic seats have single owners',async()=>{
  const [sim,journeys]=await modules,town=sim.makeTown('small',91);
  const state=journeys.setupBakeryTrips(town,b=>sim.getBlockCenter(b,town.config));
  for(let tick=0;tick<2400;tick++){
    sim.movePeople(town,.1);
    assert.ok(state.people.filter(id=>town.people.find(p=>p.id===id).trip.moving).length<=1);
    assert.ok(new Set(state.seats.filter(s=>s.owner).map(s=>s.owner)).size===state.seats.filter(s=>s.owner).length);
    for(const id of state.people){
      const t=town.people.find(p=>p.id===id).trip;
      const b=state.bakeryCenter;
      // Building wings occupy x +/- .95 and 1.05, z -.25, with width at most 1.7.
      for(const x of [b.x-.95,b.x+1.05]){
        const dx=Math.max(Math.abs(t.x-x)-.85,0),dz=Math.max(Math.abs(t.z-(b.z-.25))-.85,0);
        assert.ok(Math.hypot(dx,dz)>=journeys.WALK_RADIUS,'building clearance');
      }
    }
  }
});

test('only ready looks join the prototype and large towns retain their existing activity loop',async()=>{
  const [sim,journeys]=await modules;
  const small=sim.makeTown('small',11);
  const empty=journeys.setupBakeryTrips(small,b=>sim.getBlockCenter(b,small.config),[],[]);
  assert.equal(empty.people.length,0);
  for(const size of ['medium','large']){
    const town=sim.makeTown(size,11);
    assert.equal(journeys.setupBakeryTrips(town,b=>sim.getBlockCenter(b,town.config)),null);
    assert.equal(town.people.some(p=>p.trip),false);
  }
});
