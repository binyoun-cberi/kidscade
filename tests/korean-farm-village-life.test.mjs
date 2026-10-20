import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmState,restoreFarmState,calendar,seasonalFestival,fulfillSeasonalFestival,FARM_SAVE_VERSION} from '../games/korean-farm/farming/farm-sim.mjs';
import {festivalActivity,playFestivalActivity,FESTIVAL_ACTIVITY_REWARD} from '../games/korean-farm/farming/festival-activities.mjs';
import {villageRoutine,villageClock,DAILY_ROUTINES} from '../games/korean-farm/rendering/village-routines.mjs';

function setup(season){
  const s=createFarmState();
  const index=['봄','여름','가을','겨울'].indexOf(season);
  s.day=index*14+7;
  s.weather='sunny';
  const event=seasonalFestival(s);
  s.cargo[event.produce]=event.count;
  return s;
}
test('routines follow farm minutes with four distinct daily activities and stable familiar targets',()=>{
  assert.equal(villageClock(420),'07:00');
  assert.equal(villageClock(1320),'22:00');
  for(const [role,stops] of Object.entries(DAILY_ROUTINES)){
    const samples=[420,650,900,1200];
    const observed=samples.map(min=>villageRoutine(role,min));
    assert.deepEqual(observed.map(x=>x.phase),['morning','noon','afternoon','evening']);
    assert.equal(new Set(observed.map(x=>x.label)).size,4);
    const origin=role==='market'?[9.8,15.3]:role==='neighbor'?[2.8,13.4]:[-1.1,15.4];
    for(const stop of stops)assert.ok(Math.hypot(stop.x-origin[0],stop.z-origin[1])<1.3);
  }
});
test('seasonal games require physical delivery and have different playable rules',()=>{
  for(const season of ['봄','여름','가을','겨울']){
    const s=setup(season),event=seasonalFestival(s);
    assert.equal(calendar(s.day).season,season);
    assert.equal(playFestivalActivity(s,'rice').ok,false,'cannot play before delivery');
    assert.equal(fulfillSeasonalFestival(s).ok,true);
    const game=festivalActivity(s);
    assert.equal(game.delivered,true);
    assert.equal(game.completed,false);
    assert.equal(game.open,true);
    const actions=season==='봄'?['rice','carrot','corn']:season==='여름'?['wash','water','corn']:
      season==='가을'?['ripe2','ripe1','ripe3']:['elder','family','elder','family','neighbor'];
    const startingMoney=s.money;
    if(season==='봄'||season==='여름'){
      const wrong=playFestivalActivity(s,season==='봄'?'corn':'corn');
      assert.equal(wrong.ok,false);assert.equal(festivalActivity(s).progress,0);
    }
    if(season==='가을'){
      assert.equal(playFestivalActivity(s,'green1').ok,false);
      assert.equal(festivalActivity(s).progress,0);
    }
    for(let n=0;n<actions.length;n++){
      const result=playFestivalActivity(s,actions[n]);
      assert.equal(result.ok,true,season+' step '+n+' '+result.message);
      assert.equal(result.completed,n===actions.length-1);
      assert.equal(festivalActivity(s).progress,n+1);
      if(n===1){
        const restored=restoreFarmState(JSON.parse(JSON.stringify(s)));
        assert.equal(festivalActivity(restored).progress,2,'progress survives reload');
      }
    }
    assert.equal(s.money,startingMoney+FESTIVAL_ACTIVITY_REWARD);
    assert.equal(s.stats.festivalActivities,1);
    assert.equal(playFestivalActivity(s,actions[0]).ok,false,'cannot farm repeat rewards');
    assert.equal(s.money,startingMoney+FESTIVAL_ACTIVITY_REWARD);
    const reloaded=restoreFarmState(JSON.parse(JSON.stringify(s)));
    assert.equal(reloaded.version,FARM_SAVE_VERSION);
    assert.equal(festivalActivity(reloaded).completed,true);
    assert.equal(playFestivalActivity(reloaded,actions[0]).ok,false);
  }
});
test('new year and next season reset the activity without erasing legacy delivery',()=>{
  const s=setup('봄');
  s.cargo.carrot=3;
  assert.equal(fulfillSeasonalFestival(s).ok,true);
  for(const id of ['rice','carrot','corn'])assert.equal(playFestivalActivity(s,id).ok,true);
  s.day=21;
  const summer=festivalActivity(s);
  assert.equal(summer.progress,0);
  assert.equal(summer.completed,false);
  assert.equal(summer.delivered,false);
  s.day=7+56;
  assert.equal(festivalActivity(s).progress,0);
  const v6=JSON.parse(JSON.stringify(s));v6.version=6;v6.festival={completedKey:'1:봄'};
  const restored=restoreFarmState(v6);
  assert.equal(restored.festival.completedKey,'1:봄');
  assert.equal(restored.festival.activityDoneKey,'');
  assert.equal(restored.stats.festivalActivities,0);
});
test('invalid progress and festival timing cannot print unlimited rewards',()=>{
  const s=setup('겨울');
  const event=seasonalFestival(s);
  s.cargo[event.produce]=event.count;
  fulfillSeasonalFestival(s);
  assert.equal(playFestivalActivity(s,'elder').ok,true);
  assert.equal(playFestivalActivity(s,'elder').ok,true);
  assert.equal(playFestivalActivity(s,'elder').ok,false,'house has only two parcels');
  assert.equal(festivalActivity(s).progress,2);
  s.day+=7; // festival over
  assert.equal(playFestivalActivity(s,'family').ok,false);
  const malformed={...s,version:7,festival:{completedKey:'1:겨울',activityKey:'!!!',
    activityDoneKey:'bad',activitySteps:['ok',{},'x'.repeat(200),'neighbor']}};
  const cleaned=restoreFarmState(malformed);
  assert.equal(cleaned.festival.activityKey,'');
  assert.equal(cleaned.festival.activityDoneKey,'');
  assert.deepEqual(cleaned.festival.activitySteps,['ok','neighbor']);
});
