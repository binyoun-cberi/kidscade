'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Sim=require('../games/high_one_life/engine.js');
const Official=require('../games/high_one_life/official-data.js');
const {collect,SERIES,slugFromFlag}=require('../scripts/sync-one-life-official-stats.cjs');

test('all game countries map to distinct two-letter country identifiers',()=>{
  const ids=Sim.COUNTRIES.map(x=>slugFromFlag(x[1]));
  assert.equal(ids.length,103);
  assert.equal(new Set(ids).size,103);
  assert.ok(ids.includes('KR')&&ids.includes('IN')&&ids.includes('US'));
});
test('world bank ingestion calculates births from matching population and birth-rate years only',async()=>{
  const old=global.fetch;
  const countryList=Sim.COUNTRIES.map((x,i)=>({id:'X'+String(i).padStart(2,'0'),iso2Code:slugFromFlag(x[1])}));
  const response=(rows)=>({ok:true,json:async()=>[{pages:1},rows]});
  const index=new Map(countryList.map((x,i)=>[x.id,i]));
  global.fetch=async url=>{
    if(url.includes('/country?'))return response(countryList);
    const code=url.split('/indicator/')[1]?.split('?')[0];
    const key=Object.keys(SERIES).find(k=>SERIES[k].code===code);
    assert.ok(key,'unexpected indicator '+url);
    const rows=countryList.map(({id},i)=>({
      countryiso3code:id,country:{id},date:'2024',
      value:key==='population'?100000*(i+1):key==='crudeBirthRate'?20:
        key==='sexRatioBirth'?1.05:key==='primaryCompletion'?94:
        key==='under5Mortality'?35:key==='unemployment'?6:
        key==='urbanPercent'?67:key==='healthCoverage'?73:76
    }));
    return response(rows);
  };
  try{
    const snapshot=await collect();
    assert.equal(Object.keys(snapshot.countries).length,103);
    assert.equal(snapshot.coverage.estimatedBirths,103);
    assert.equal(snapshot.coverage.primaryCompletion,103);
    assert.equal(snapshot.countries['대한민국'].estimatedBirths.year,2024);
    const krIndex=Sim.COUNTRIES.findIndex(x=>x[0]==='대한민국');
    assert.equal(snapshot.countries['대한민국'].estimatedBirths.value,2000*(krIndex+1));
    assert.equal(snapshot.countries['대한민국'].under5Mortality.value,35);
    assert.equal(snapshot.definitions.primaryCompletion.source,'UNESCO UIS');
  }finally{global.fetch=old;}
});
test('checked-in snapshot never disguises missing measurements',()=>{
  assert.equal(Official.schema,1);
  const all=Object.keys(Official.countries||{});
  assert.ok(all.length===0||all.length===103);
  for(const country of Object.values(Official.countries||{})){
    for(const [key,observation] of Object.entries(country)){
      if(key==='iso2')continue;
      assert.ok(Number.isFinite(observation.value),key);
      assert.ok(Number.isInteger(observation.year)&&observation.year>=2019,key);
    }
  }
});
