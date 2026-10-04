'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const html=read('games/korea_marble/K-트래블 마블.html');
const dataSrc=read('games/korea_marble/data/world-marble-data.js');
const game=read('games/korea_marble/world-marble.js');
const fx=read('games/korea_marble/travel-fx.js');
const geo=JSON.parse(read('assets/maps/world-countries-110m.geojson'));

const sandbox={window:{}};vm.runInNewContext(dataSrc,sandbox);
const {COUNTRIES,ROUTES,EVENTS,CONTINENTS}=sandbox.window.WorldMarbleData;

test('K-Travel Marble is a world-map transport graph instead of the old 32-cell loop',()=>{
  assert.match(html,/K-트래블 마블 · 세계판/);
  assert.match(html,/id="worldMap"/);
  assert.match(html,/world-marble-data\.js/);
  assert.match(html,/world-marble\.js/);
  assert.match(game,/MAP_URL='\.\.\/\.\.\/assets\/maps\/world-countries-110m\.geojson'/);
  assert.doesNotMatch(html,/32칸/);
  assert.doesNotMatch(game,/BOARD_DATA/);
  assert.equal(COUNTRIES.length,42);
  assert.ok(ROUTES.length>=60);
});

test('all route nodes are valid unique connections and every country can travel 1-6 hops',()=>{
  const ids=new Set(COUNTRIES.map(c=>c.id));
  assert.equal(ids.size,COUNTRIES.length);
  const seen=new Set();
  const adj=new Map(COUNTRIES.map(c=>[c.id,[]]));
  for(const r of ROUTES){
    assert.ok(ids.has(r.a),r.a);assert.ok(ids.has(r.b),r.b);
    assert.ok(Array.isArray(r.modes)&&r.modes.length>0);
    for(const mode of r.modes)assert.ok(['air','rail','sea'].includes(mode),mode);
    const key=[r.a,r.b].sort().join('-');
    assert.ok(!seen.has(key),'duplicate route '+key);seen.add(key);
    adj.get(r.a).push(r.b);adj.get(r.b).push(r.a);
  }
  function hasExact(start,n){
    let ok=false;const used=new Set([start]);
    function dfs(cur,left){
      if(ok)return;
      if(left===0){ok=true;return}
      for(const next of adj.get(cur)||[]){
        if(used.has(next))continue;
        used.add(next);dfs(next,left-1);used.delete(next);
      }
    }
    dfs(start,n);return ok;
  }
  for(const c of COUNTRIES)for(let n=1;n<=6;n++)assert.ok(hasExact(c.id,n),c.id+' has no '+n+'-hop route');
});

test('all playable countries can be matched to the committed Natural Earth map',()=>{
  const iso=new Set();
  for(const f of geo.features){
    let code=String(f.properties?.ISO_A2||'').toUpperCase();
    if(code==='-99'){
      if(f.properties?.NAME==='France')code='FR';
      if(f.properties?.NAME==='Singapore')code='SG';
    }
    iso.add(code);
  }
  for(const c of COUNTRIES){
    if(c.id==='SG')continue; // Natural Earth 110m omits this microstate polygon; the game renders its travel node from coordinates.
    assert.ok(iso.has(c.id),'missing map feature '+c.id);
  }
  assert.ok(COUNTRIES.some(c=>c.id==='SG'&&Number.isFinite(c.lon)&&Number.isFinite(c.lat)));
  assert.match(String(geo.source||''),/Natural Earth/i);
  assert.ok(geo.features.length>=170,'world map should retain a broad Natural Earth country set');
});

test('world travel movement uses fair bounded tickets, three transport modes and layered animations',()=>{
  assert.match(game,/function exactRoutes\(start,steps\)/);
  assert.doesNotMatch(game,/found\.size>=28/);
  assert.match(game,/sort\(\(a,b\)=>a\.to\.localeCompare\(b\.to\)\)/);
  assert.match(game,/function pickTravelTickets\(routes,player,roll\)/);
  assert.match(game,/const target=state\.round>=7\?3:\(roll<=2\?3:4\)/);
  assert.match(game,/state\.round<=3/);
  assert.match(game,/state\.round<=6/);
  assert.match(game,/prepareRouteChoice\(player,roll\)/);
  assert.match(game,/travelRoute\(player,option\)/);
  assert.match(game,/animateMapSegment\(from,to,mode,fast=false\)/);
  assert.match(game,/shouldShowcaseTravel\(player,mode,from,to\)/);
  assert.match(game,/chooseMode\(route,segmentIndex,player\)/);
  assert.match(html,/항공/);assert.match(html,/철도/);assert.match(html,/항로/);
  assert.match(fx,/train-electric-bullet-a\.glb/);
  assert.match(fx,/boat-row-large\.glb/);
  assert.ok(fs.existsSync(path.join(ROOT,'assets/game/3d/rail/kenney-train-kit/train-electric-bullet-a.glb')));
  assert.ok(fs.existsSync(path.join(ROOT,'assets/game/3d/byeokrando/ships/boat-row-large.glb')));
  assert.match(fx,/function planeModel\(/);
});

test('economy preserves investment, upgrades, tolls, takeovers, continent collections and world events',()=>{
  assert.equal(Object.keys(CONTINENTS).length,6);
  assert.ok(EVENTS.length>=8);
  for(const needle of [
    'promptInvestment','upgradeCountry','getToll','offerTakeover','collectionActive','drawEvent','setFestival','bankrupt','netWorth',
    'remoteBuildCost','maybeOfferBuild','remoteUpgrade','routeTransitFee','chargeTransit'
  ])assert.ok(game.includes('function '+needle),needle);
  assert.match(game,/buildPoints:1/);
  assert.match(game,/buildPoints=Math\.min\(3,p\.buildPoints\+1\)/);
  assert.match(game,/toll\*=1\.3/);
  assert.match(game,/money:300/);
  assert.match(game,/Math\.min\(6,Math\.round\(getToll\(countryId\)\*\.08\)\)/);
  assert.match(game,/if\(player\.turnTransitPaid>0\)return true/);
  assert.match(game,/state\.festival/);
});

test('game reports bounded campaign results to Kidscade and supports local multiplayer plus CPUs',()=>{
  assert.match(game,/scope:'campaign',status:'completed'/);
  assert.match(game,/outcome/);
  assert.match(game,/countriesVisited/);
  assert.match(game,/continentsVisited/);
  assert.match(game,/landmarks/);
  assert.match(html,/사람 플레이어 수/);
  assert.match(html,/CPU 전략/);
  assert.match(html,/data-value="8"/);
  assert.match(html,/data-value="10"/);
  assert.match(html,/data-value="12"/);
});

test('new module sources parse after module declarations are stripped',()=>{
  assert.doesNotThrow(()=>new Function(dataSrc));
  const fxBody=fx.replace(/^import .*$/gm,'').replace('export const travelFX','const travelFX');
  assert.doesNotThrow(()=>new Function(fxBody));
  const gameBody=game.replace(/^import .*$/gm,'');
  assert.doesNotThrow(()=>new Function('travelFX',gameBody));
});
