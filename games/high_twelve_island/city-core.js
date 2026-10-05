/* 촌장 시뮬레이터 v10 — OpenSC2K에서 영감을 받은 독립 도시 시뮬레이션 코어.
 * OpenSC2K의 원본 SimCity 2000 자산/소스는 포함하지 않는다.
 * 도로 통근, 전력/수도 네트워크, 서비스 커버리지, 예산 구조를 KIDSCADE용으로 새로 구현한다.
 */
((root, factory) => {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.IslandCityCore = api;
})(typeof window !== "undefined" ? window : null, () => {
  "use strict";

  const VERSION = 2;
  const WIDTH = 24;
  const HEIGHT = 18;
  const ZONES = Object.freeze({
    residential: { title: "주거", short: "R" },
    commercial: { title: "상업", short: "C" },
    industrial: { title: "산업", short: "I" }
  });
  const TOOLS = Object.freeze({
    road: { title: "도로", cost: 4 },
    residential: { title: "주거 구역", cost: 1 },
    commercial: { title: "상업 구역", cost: 1 },
    industrial: { title: "산업 구역", cost: 1 },
    powerLine: { title: "전선", cost: 3, overlay: true },
    pipe: { title: "수도관", cost: 2, overlay: true },
    powerPlant: { title: "발전소", cost: 100, civic: true },
    waterTower: { title: "급수탑", cost: 80, civic: true },
    park: { title: "공원", cost: 18, civic: true },
    school: { title: "학교", cost: 55, civic: true },
    clinic: { title: "진료소", cost: 70, civic: true },
    police: { title: "경찰서", cost: 75, civic: true },
    fire: { title: "소방서", cost: 75, civic: true },
    repair: { title: "복구", cost: 6 },
    bulldoze: { title: "철거", cost: 2 }
  });
  const CIVIC_UPKEEP = Object.freeze({
    park: .35, school: 1.6, clinic: 2.0, police: 1.8, fire: 1.8,
    powerPlant: 2.5, waterTower: 1.5
  });

  const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
  const idx = (city, x, y) => y * city.width + x;
  const key = (x, y) => x + "," + y;
  const inside = (city, x, y) => x >= 0 && y >= 0 && x < city.width && y < city.height;
  const cell = (city, x, y) => inside(city, x, y) ? city.tiles[idx(city, x, y)] : null;
  const neighbors4 = (city, x, y) => [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]
    .filter(([nx,ny]) => inside(city,nx,ny));

  function seeded(seed, n) {
    let x = (seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  }

  function makeTerrain(seed, x, y, width, height) {
    const edgeWater = y > height - 3 && x > width - 7;
    const river = x > width - 4 && y > 2 && y < height - 2;
    const rough = seeded(seed, y * width + x);
    if (edgeWater || river) return "water";
    if (rough > .93 && (x < 5 || y < 4)) return "forest";
    return "land";
  }

  function blankTile(terrain = "land") {
    return {
      terrain, road: false, zone: null, density: 0, civic: null,
      powerLine: false, pipe: false, connected: false, roadAccess: false,
      powered: false, watered: false, tripAccess: false, tripLength: 0, commuters: 0,
      traffic: 0, pollution: 0, landValue: 35, crime: 0, fireRisk: 0, growth: 0,
      service: 0, policeCoverage: 0, fireCoverage: 0, damage: 0
    };
  }

  function defaultStats() {
    return {
      roads: 0, developed: 0, homes: 0, jobs: 0, connectedRoads: 0,
      avgLandValue: 0, avgPollution: 0, avgTraffic: 0, avgCrime: 0,
      powerDemand: 0, powerCapacity: 0, powerServed: 0, poweredRate: 100,
      waterDemand: 0, waterCapacity: 0, waterServed: 0, wateredRate: 100,
      trips: 0, failedTrips: 0, commuteSuccess: 100, avgCommute: 0,
      damaged: 0, serviceScore: 0
    };
  }

  function initial(seed = 8429) {
    const city = {
      version: VERSION,
      seed: seed >>> 0,
      width: WIDTH,
      height: HEIGHT,
      week: 0,
      funds: 520,
      taxRate: 7,
      taxIncome: 0,
      maintenance: 0,
      netIncome: 0,
      budgetRatio: 1,
      demand: { residential: 48, commercial: 24, industrial: 30 },
      stats: defaultStats(),
      log: [],
      tiles: []
    };
    for (let y = 0; y < city.height; y++) {
      for (let x = 0; x < city.width; x++) city.tiles.push(blankTile(makeTerrain(seed, x, y, city.width, city.height)));
    }

    for (let x = 4; x <= 19; x++) {
      const t = cell(city, x, 9);
      if (t && t.terrain !== "water") t.road = true;
    }
    for (let y = 5; y <= 13; y++) {
      const t = cell(city, 12, y);
      if (t && t.terrain !== "water") t.road = true;
    }

    [[9,8],[10,8],[9,10],[10,10]].forEach(([x,y]) => { const t=cell(city,x,y); if(t) t.zone="residential"; });
    [[13,8],[14,8]].forEach(([x,y]) => { const t=cell(city,x,y); if(t) t.zone="commercial"; });
    [[15,10],[16,10]].forEach(([x,y]) => { const t=cell(city,x,y); if(t) t.zone="industrial"; });

    seedStarterUtilities(city);
    recompute(city);
    return city;
  }

  function findFreeRoadside(city, preferred) {
    for (const [x,y] of preferred) {
      const t = cell(city,x,y);
      if (!t || t.terrain === "water" || t.road || t.civic || t.zone) continue;
      if (neighbors4(city,x,y).some(([nx,ny]) => cell(city,nx,ny)?.road)) return [x,y];
    }
    for (let y=0;y<city.height;y++) for (let x=0;x<city.width;x++) {
      const t=cell(city,x,y);
      if (t?.terrain !== "water" && !t.road && !t.civic && !t.zone &&
        neighbors4(city,x,y).some(([nx,ny]) => cell(city,nx,ny)?.road)) return [x,y];
    }
    return null;
  }

  function seedStarterUtilities(city) {
    let plant = city.tiles.some(t => t.civic === "powerPlant");
    let tower = city.tiles.some(t => t.civic === "waterTower");
    if (!plant) {
      const p = findFreeRoadside(city, [[11,5],[11,6],[11,7],[13,6]]);
      if (p) { cell(city,p[0],p[1]).civic = "powerPlant"; plant = true; }
    }
    if (!tower) {
      const p = findFreeRoadside(city, [[13,5],[13,7],[11,8],[14,10]]);
      if (p) { cell(city,p[0],p[1]).civic = "waterTower"; tower = true; }
    }
    // v1에는 기반시설 개념이 없었으므로 기존 중심 도로를 공짜 백본으로 승계한다.
    if (plant || tower) {
      for (const t of city.tiles) if (t.road) {
        if (plant) t.powerLine = true;
        if (tower) t.pipe = true;
      }
    }
  }

  function normalize(raw) {
    const validVersion = raw && (raw.version === 1 || raw.version === VERSION);
    if (!validVersion || raw.width !== WIDTH || raw.height !== HEIGHT ||
      !Array.isArray(raw.tiles) || raw.tiles.length !== WIDTH * HEIGHT) {
      return initial(raw?.seed || 8429);
    }

    const base = initial(raw.seed);
    const city = {
      ...base,
      ...raw,
      version: VERSION,
      demand: { ...base.demand, ...(raw.demand || {}) },
      stats: { ...defaultStats(), ...(raw.stats || {}) },
      log: Array.isArray(raw.log) ? raw.log.slice(0, 40) : []
    };
    city.funds = clamp(Number(city.funds), 0, 99999);
    city.taxRate = clamp(Math.round(Number(city.taxRate) || 7), 4, 12);
    city.budgetRatio = clamp(Number(city.budgetRatio) || 1, .2, 1);
    city.week = Math.max(0, Math.floor(Number(city.week) || 0));
    city.tiles = raw.tiles.map(t => ({
      ...blankTile(t?.terrain === "water" ? "water" : t?.terrain === "forest" ? "forest" : "land"),
      ...(t || {}),
      density: clamp(Math.floor(Number(t?.density) || 0), 0, 3),
      traffic: clamp(Number(t?.traffic) || 0),
      pollution: clamp(Number(t?.pollution) || 0),
      landValue: clamp(Number(t?.landValue) || 0),
      crime: clamp(Number(t?.crime) || 0),
      fireRisk: clamp(Number(t?.fireRisk) || 0),
      growth: clamp(Number(t?.growth) || 0, -100, 100),
      damage: clamp(Math.floor(Number(t?.damage) || 0), 0, 3)
    }));

    if (raw.version === 1) seedStarterUtilities(city);
    recompute(city);
    return city;
  }

  function ensureVillage(village) {
    if (!village || typeof village !== "object") return initial();
    const city=village.city;
    const valid=city&&city.version===VERSION&&city.width===WIDTH&&city.height===HEIGHT&&
      Array.isArray(city.tiles)&&city.tiles.length===WIDTH*HEIGHT;
    if(!valid)village.city=normalize(city);
    return village.city;
  }

  function connectedRoadSet(city) {
    const roads = [];
    for (let y = 0; y < city.height; y++) for (let x = 0; x < city.width; x++) {
      const t = cell(city,x,y);
      if (t?.road && t.damage < 3) roads.push([x,y]);
    }
    if (!roads.length) return new Set();

    const preferred = cell(city,12,9)?.road && cell(city,12,9).damage < 3 ? [12,9] : roads[0];
    const seen = new Set([key(preferred[0],preferred[1])]);
    const q = [preferred];
    while (q.length) {
      const [x,y] = q.shift();
      for (const [nx,ny] of neighbors4(city,x,y)) {
        const n = cell(city,nx,ny);
        if (!n?.road || n.damage >= 3) continue;
        const k = key(nx,ny);
        if (!seen.has(k)) { seen.add(k); q.push([nx,ny]); }
      }
    }
    return seen;
  }

  function networkSet(city, lineField, sourceCivic) {
    const q = [];
    const seen = new Set();
    for (let y=0;y<city.height;y++) for (let x=0;x<city.width;x++) {
      const t=cell(city,x,y);
      if (t?.civic === sourceCivic && t.damage < 3) {
        q.push([x,y]);
        seen.add(key(x,y));
      }
    }
    while (q.length) {
      const [x,y]=q.shift();
      for (const [nx,ny] of neighbors4(city,x,y)) {
        const n=cell(city,nx,ny);
        if (!n || n.damage >= 3) continue;
        const pass = n[lineField] || n.civic === sourceCivic;
        if (!pass) continue;
        const k=key(nx,ny);
        if (!seen.has(k)) { seen.add(k); q.push([nx,ny]); }
      }
    }
    return seen;
  }

  function touchesSet(city, set, x, y) {
    if (set.has(key(x,y))) return true;
    return neighbors4(city,x,y).some(([nx,ny]) => set.has(key(nx,ny)));
  }

  function utilityNeed(t, kind) {
    if (!t) return 0;
    if (t.zone) {
      const base = t.density > 0 ? t.density : .5;
      if (kind === "power") return base * (t.zone === "industrial" ? 3 : t.zone === "commercial" ? 2.2 : 1.8);
      return base * (t.zone === "industrial" ? 2.5 : t.zone === "commercial" ? 1.8 : 2);
    }
    if (!t.civic) return 0;
    if (kind === "power") {
      if (t.civic === "powerPlant") return 0;
      return ({waterTower:3,park:.4,school:4,clinic:5,police:4,fire:4})[t.civic] || 2;
    }
    if (t.civic === "waterTower" || t.civic === "powerPlant" || t.civic === "park") return 0;
    return ({school:3,clinic:5,police:2,fire:3})[t.civic] || 2;
  }

  function assignPower(city, village) {
    for (const t of city.tiles) t.powered = false;
    const network = networkSet(city,"powerLine","powerPlant");
    let plants=0;
    for (const t of city.tiles) if (t.civic === "powerPlant" && t.damage < 3) plants++;
    const winterLoad = village && village.coldUntil > village.tick ? 1.22 : 1;
    const capacity = plants * 70 * clamp(city.budgetRatio,.2,1);

    const users=[];
    for (let y=0;y<city.height;y++) for (let x=0;x<city.width;x++) {
      const t=cell(city,x,y);
      if (network.has(key(x,y))) t.powered = true;
      const need=utilityNeed(t,"power") * winterLoad;
      if (!need) continue;
      const connected=touchesSet(city,network,x,y);
      const priority=t.civic === "waterTower" ? 0 : t.civic ? 1 : t.zone === "residential" ? 2 : t.zone === "commercial" ? 3 : 4;
      users.push({t,need,connected,priority,x,y});
    }
    users.sort((a,b)=>a.priority-b.priority || a.y-b.y || a.x-b.x);
    const demand=users.reduce((n,u)=>n+u.need,0);
    let used=0,served=0;
    for (const u of users) {
      if (!u.connected || used + u.need > capacity + .0001) { u.t.powered=false; continue; }
      u.t.powered=true; used+=u.need; served+=u.need;
    }
    return {network,capacity,demand,served};
  }

  function assignWater(city, village) {
    for (const t of city.tiles) t.watered = false;
    const network = networkSet(city,"pipe","waterTower");
    let towers=0;
    for (const t of city.tiles) {
      if (t.civic === "waterTower" && t.damage < 3 && t.powered) towers++;
    }
    const heat = village?.disasters?.heat > village?.tick ? .72 : 1;
    const villageWater = Number(village?.water);
    const drought = Number.isFinite(villageWater) && villageWater < 28 ? .78 : 1;
    const capacity=towers * 65 * clamp(city.budgetRatio,.2,1) * heat * drought;
    const users=[];
    for (let y=0;y<city.height;y++) for (let x=0;x<city.width;x++) {
      const t=cell(city,x,y);
      if (network.has(key(x,y))) t.watered=true;
      const need=utilityNeed(t,"water");
      if (!need) continue;
      const connected=touchesSet(city,network,x,y);
      const priority=t.civic === "clinic" ? 0 : t.civic ? 1 : t.zone === "residential" ? 2 : t.zone === "commercial" ? 3 : 4;
      users.push({t,need,connected,priority,x,y});
    }
    users.sort((a,b)=>a.priority-b.priority || a.y-b.y || a.x-b.x);
    const demand=users.reduce((n,u)=>n+u.need,0);
    let used=0,served=0;
    for (const u of users) {
      if (!u.connected || used + u.need > capacity + .0001) { u.t.watered=false; continue; }
      u.t.watered=true; used+=u.need; served+=u.need;
    }
    return {network,capacity,demand,served};
  }

  function roadStarts(city,x,y) {
    return neighbors4(city,x,y).filter(([nx,ny]) => {
      const n=cell(city,nx,ny);
      return n?.road && n.connected && n.damage < 3;
    });
  }

  function compatibleZones(zone) {
    return zone === "residential" ? ["commercial","industrial"] : ["residential"];
  }

  function roadTouchesDestination(city,x,y,originX,originY,targetZones,allowEmpty) {
    for (const [nx,ny] of neighbors4(city,x,y)) {
      if (nx===originX && ny===originY) continue;
      const t=cell(city,nx,ny);
      if (!t?.zone || !targetZones.includes(t.zone) || !t.roadAccess || !t.powered || !t.watered || t.damage >= 3) continue;
      if (!allowEmpty && t.density <= 0) continue;
      return true;
    }
    return false;
  }

  function traceTrip(city,x,y,allowEmptyTarget=false) {
    const origin=cell(city,x,y);
    if (!origin?.zone || !origin.roadAccess) return null;
    const starts=roadStarts(city,x,y);
    if (!starts.length) return null;
    const targets=compatibleZones(origin.zone);
    const q=[];
    const seen=new Set();
    const parent=new Map();
    for (const p of starts) {
      const k=key(p[0],p[1]);
      if (!seen.has(k)) { seen.add(k); q.push(p); parent.set(k,null); }
    }
    let finish=null;
    while(q.length) {
      const [cx,cy]=q.shift();
      if (roadTouchesDestination(city,cx,cy,x,y,targets,allowEmptyTarget)) { finish=[cx,cy]; break; }
      for (const [nx,ny] of neighbors4(city,cx,cy)) {
        const n=cell(city,nx,ny), k=key(nx,ny);
        if (!n?.road || !n.connected || n.damage >= 3 || seen.has(k)) continue;
        seen.add(k); parent.set(k,[cx,cy]); q.push([nx,ny]);
      }
    }
    if (!finish) return null;
    const path=[];
    let cur=finish;
    while(cur) {
      path.push(cur);
      cur=parent.get(key(cur[0],cur[1])) || null;
    }
    path.reverse();
    return path;
  }

  function computeTrips(city) {
    for (const t of city.tiles) {
      if (t.road) t.traffic=0;
      t.tripAccess=false; t.tripLength=0; t.commuters=0;
    }
    let trips=0,failedTrips=0,lengthTotal=0;
    for (let y=0;y<city.height;y++) for (let x=0;x<city.width;x++) {
      const t=cell(city,x,y);
      if (!t?.zone || !t.roadAccess || t.damage >= 3) continue;
      const route=traceTrip(city,x,y,t.density===0);
      t.tripAccess=!!route;
      t.tripLength=route?.length || 0;
      const people=t.density>0 ? t.density*(t.zone==="residential"?4:t.zone==="commercial"?2:3) : 0;
      t.commuters=people;
      if (!people) continue;
      if (!route) { failedTrips+=people; continue; }
      trips+=people; lengthTotal+=route.length*people;
      for (const [rx,ry] of route) {
        const road=cell(city,rx,ry);
        road.traffic=clamp(road.traffic + people*1.7,0,100);
      }
    }
    return {trips,failedTrips,avgCommute:trips?lengthTotal/trips:0};
  }

  function distanceEffect(city,x,y,civicType,radius,amount) {
    let best=0;
    for (let yy=Math.max(0,y-radius);yy<=Math.min(city.height-1,y+radius);yy++) {
      for (let xx=Math.max(0,x-radius);xx<=Math.min(city.width-1,x+radius);xx++) {
        const t=cell(city,xx,yy);
        if (t?.civic!==civicType || t.damage>=3) continue;
        const d=Math.abs(xx-x)+Math.abs(yy-y);
        if (d<=radius) best=Math.max(best,amount*(1-d/(radius+1)));
      }
    }
    return best;
  }

  function facilityFunctional(t,type) {
    if (!t || t.civic!==type || t.damage>=3 || !t.roadAccess) return false;
    if (type==="park") return true;
    if (type==="police" || type==="fire") return t.powered;
    return t.powered && t.watered;
  }

  function roadCoverage(city,type,radius,strength) {
    const out=new Array(city.tiles.length).fill(0);
    for (let sy=0;sy<city.height;sy++) for (let sx=0;sx<city.width;sx++) {
      const source=cell(city,sx,sy);
      if (!facilityFunctional(source,type)) continue;
      const starts=roadStarts(city,sx,sy);
      const q=[],dist=new Map();
      for (const [x,y] of starts) { const k=key(x,y); if(!dist.has(k)){dist.set(k,0);q.push([x,y]);} }
      while(q.length) {
        const [x,y]=q.shift(),d=dist.get(key(x,y));
        if (d>radius) continue;
        const value=strength*(1-d/(radius+1))*clamp(city.budgetRatio,.2,1);
        for (const [tx,ty] of [[x,y],...neighbors4(city,x,y)]) {
          const i=idx(city,tx,ty);
          out[i]=Math.max(out[i],value);
        }
        if (d===radius) continue;
        for (const [nx,ny] of neighbors4(city,x,y)) {
          const n=cell(city,nx,ny),k=key(nx,ny);
          if (!n?.road || !n.connected || n.damage>=3 || dist.has(k)) continue;
          dist.set(k,d+1);q.push([nx,ny]);
        }
      }
    }
    return out;
  }

  function industrialPollution(city,x,y) {
    let value=0;
    for (let yy=Math.max(0,y-3);yy<=Math.min(city.height-1,y+3);yy++) {
      for (let xx=Math.max(0,x-3);xx<=Math.min(city.width-1,x+3);xx++) {
        const t=cell(city,xx,yy);
        if (t?.zone!=="industrial" || !t.density) continue;
        const d=Math.abs(xx-x)+Math.abs(yy-y);
        if (d<=3) value+=t.density*Math.max(2,13-d*3);
      }
    }
    return value;
  }

  function maintenanceCost(city) {
    let value=0;
    for (const t of city.tiles) {
      if (t.road) value+=.12;
      if (t.powerLine) value+=.05;
      if (t.pipe) value+=.04;
      if (t.civic) value+=CIVIC_UPKEEP[t.civic] || 0;
    }
    return Math.round(value*10)/10;
  }

  function recompute(city,village=null) {
    const connected=connectedRoadSet(city);
    let roads=0,connectedRoads=0,developed=0,homes=0,jobs=0,damaged=0;
    let landTotal=0,pollutionTotal=0,trafficTotal=0,crimeTotal=0,serviceTotal=0,landCount=0;

    for (let y=0;y<city.height;y++) for (let x=0;x<city.width;x++) {
      const t=cell(city,x,y),k=key(x,y);
      t.connected=!!t.road && connected.has(k);
      if(t.road){roads++;if(t.connected)connectedRoads++;}
      if(t.damage>0)damaged++;
      t.roadAccess=neighbors4(city,x,y).some(([nx,ny]) => {
        const n=cell(city,nx,ny); return n?.road && n.connected && n.damage<3;
      });
    }

    const power=assignPower(city,village);
    const water=assignWater(city,village);
    const trip=computeTrips(city);

    const schoolCov=roadCoverage(city,"school",7,32);
    const clinicCov=roadCoverage(city,"clinic",7,34);
    const policeCov=roadCoverage(city,"police",8,70);
    const fireCov=roadCoverage(city,"fire",8,70);
    const dust=village?.disasters?.dust>village?.tick ? 16 : 0;

    let poweredDeveloped=0,wateredDeveloped=0;
    for (let y=0;y<city.height;y++) for (let x=0;x<city.width;x++) {
      const i=idx(city,x,y),t=cell(city,x,y);
      const park=distanceEffect(city,x,y,"park",4,24);
      const school=schoolCov[i],clinic=clinicCov[i];
      t.policeCoverage=clamp(policeCov[i]);
      t.fireCoverage=clamp(fireCov[i]);
      t.service=clamp(park+school*.45+clinic*.5,0,55);

      const nearbyTraffic=neighbors4(city,x,y).reduce((m,[nx,ny])=>Math.max(m,cell(city,nx,ny)?.traffic||0),0);
      t.pollution=clamp(industrialPollution(city,x,y)+nearbyTraffic*.1-park*.22+dust,0,100);
      const nature=t.terrain==="forest"?9:0;
      const access=t.roadAccess?20:-14;
      const utilityValue=(t.powered?6:-14)+(t.watered?6:-16);
      const preliminary=clamp(34+access+t.service+nature+utilityValue-t.pollution*.56-t.damage*8,0,100);
      t.crime=clamp(31+nearbyTraffic*.12+(t.density||0)*5+(100-preliminary)*.12-t.policeCoverage*.62,0,100);
      t.fireRisk=clamp(9+(t.density||0)*12+(t.zone==="industrial"?20:0)+t.damage*12-t.fireCoverage*.66,0,100);
      t.landValue=clamp(preliminary-t.crime*.23+t.policeCoverage*.08+t.fireCoverage*.05,0,100);

      const d=t.zone?city.demand[t.zone]||0:0;
      const healthFactor=village?clamp((Number(village.health)||70)-55,-20,20)*.25:0;
      const trustFactor=village?clamp((Number(village.trust)||60)-50,-30,30)*.18:0;
      const tripFactor=t.zone?(t.tripAccess?18:-42):0;
      const utilityFactor=t.zone?((t.powered?12:-48)+(t.watered?12:-44)):0;
      t.growth=clamp(d+(t.roadAccess?18:-50)+tripFactor+utilityFactor+
        (t.landValue-45)*.5-t.pollution*.24-t.crime*.12-t.damage*18+healthFactor+trustFactor,-100,100);

      if(t.density>0){
        developed++;
        if(t.powered)poweredDeveloped++;
        if(t.watered)wateredDeveloped++;
        if(t.zone==="residential")homes+=t.density*4;
        if(t.zone==="commercial")jobs+=t.density*3;
        if(t.zone==="industrial")jobs+=t.density*5;
      }
      if(t.terrain!=="water"){
        landTotal+=t.landValue;pollutionTotal+=t.pollution;crimeTotal+=t.crime;
        trafficTotal+=t.road?t.traffic:0;
        serviceTotal+=Math.max(t.service,t.policeCoverage*.45,t.fireCoverage*.45);
        landCount++;
      }
    }

    city.stats={
      roads,connectedRoads,developed,homes,jobs,damaged,
      avgLandValue:landCount?Math.round(landTotal/landCount):0,
      avgPollution:landCount?Math.round(pollutionTotal/landCount):0,
      avgTraffic:roads?Math.round(trafficTotal/roads):0,
      avgCrime:landCount?Math.round(crimeTotal/landCount):0,
      powerDemand:Math.round(power.demand*10)/10,
      powerCapacity:Math.round(power.capacity*10)/10,
      powerServed:Math.round(power.served*10)/10,
      poweredRate:developed?Math.round(poweredDeveloped/developed*100):100,
      waterDemand:Math.round(water.demand*10)/10,
      waterCapacity:Math.round(water.capacity*10)/10,
      waterServed:Math.round(water.served*10)/10,
      wateredRate:developed?Math.round(wateredDeveloped/developed*100):100,
      trips:Math.round(trip.trips),
      failedTrips:Math.round(trip.failedTrips),
      commuteSuccess:(trip.trips+trip.failedTrips)?Math.round(trip.trips/(trip.trips+trip.failedTrips)*100):100,
      avgCommute:Math.round(trip.avgCommute*10)/10,
      serviceScore:landCount?Math.round(serviceTotal/landCount):0
    };
    city.maintenance=maintenanceCost(city);
    const taxScale=city.taxRate/7;
    city.taxIncome=Math.max(0,Math.round((homes*.18+jobs*.22)*taxScale*10)/10);
    city.netIncome=Math.round((city.taxIncome-city.maintenance)*10)/10;
    return city.stats;
  }

  function updateDemand(city,village=null) {
    const pop=Math.max(1,Number(village?.population)||city.stats.homes||12);
    const homes=city.stats.homes,jobs=city.stats.jobs;
    const trust=Number(village?.trust)||60,health=Number(village?.health)||75;
    const taxDelta=city.taxRate-7;
    const commutePenalty=Math.max(0,70-city.stats.commuteSuccess)*.22;
    const utilityPenalty=Math.max(0,80-Math.min(city.stats.poweredRate,city.stats.wateredRate))*.25;
    const epidemic=village?.disasters?.epidemic>village?.tick?12:0;

    city.demand.residential=Math.round(clamp(38+jobs*1.4+pop*1.2-homes*2.3+(trust-55)*.35-
      taxDelta*4-commutePenalty-utilityPenalty,-100,100));
    city.demand.commercial=Math.round(clamp(18+homes*.8+pop*.9-city.stats.developed*1.8+(trust-50)*.2-
      taxDelta*3-commutePenalty*.7-epidemic,-100,100));
    city.demand.industrial=Math.round(clamp(28+homes*.7-jobs*.65+(health-60)*.15-
      taxDelta*2.5-utilityPenalty*.7,-100,100));
  }

  function growthCandidates(city) {
    const list=[];
    for(let y=0;y<city.height;y++)for(let x=0;x<city.width;x++){
      const t=cell(city,x,y);
      if(!t.zone||t.terrain==="water"||!t.roadAccess||!t.powered||!t.watered||!t.tripAccess||t.civic||t.road||t.damage>=3)continue;
      if(t.density>=3&&t.growth>=0)continue;
      list.push({x,y,t,score:t.growth+t.landValue*.2-t.pollution*.1-t.crime*.08});
    }
    list.sort((a,b)=>b.score-a.score||a.y-b.y||a.x-b.x);
    return list;
  }

  function advanceGrowth(city) {
    const candidates=growthCandidates(city);
    if(!candidates.length)return null;
    const offset=city.week%Math.min(5,candidates.length);
    const ordered=candidates.slice(offset).concat(candidates.slice(0,offset));
    const grow=ordered.find(c=>c.t.growth>=15&&c.t.density<3);
    if(grow){
      grow.t.density++;
      city.log.unshift({week:city.week,text:ZONES[grow.t.zone].title+" 구역이 "+grow.t.density+"단계로 성장했습니다."});
      city.log=city.log.slice(0,40);
      return {type:"grow",x:grow.x,y:grow.y,density:grow.t.density};
    }
    const shrink=ordered.slice().reverse().find(c=>c.t.growth<=-45&&c.t.density>0);
    if(shrink&&city.week%3===0){
      shrink.t.density--;
      city.log.unshift({week:city.week,text:ZONES[shrink.t.zone].title+" 구역의 건물이 줄었습니다."});
      city.log=city.log.slice(0,40);
      return {type:"shrink",x:shrink.x,y:shrink.y,density:shrink.t.density};
    }
    return null;
  }

  function damageTile(city,t,label) {
    if(!t||t.terrain==="water")return false;
    t.damage=clamp((t.damage||0)+1,0,3);
    if(t.damage>=3&&t.density>0)t.density=Math.max(0,t.density-1);
    city.log.unshift({week:city.week,text:label+" 피해로 도시 시설 한 곳이 손상되었습니다."});
    city.log=city.log.slice(0,40);
    return true;
  }

  function applyVillageHazards(city,village) {
    if(!village)return;
    const flood=village.disasters?.flood>village.tick;
    if(flood&&city.week%3===0){
      const candidates=city.tiles.filter((t,i)=>{
        const y=Math.floor(i/city.width);
        return y>=Math.floor(city.height*.48)&&t.terrain!=="water"&&t.damage<3&&(t.road||t.pipe||t.powerLine||t.civic||t.density>0);
      });
      if(candidates.length){
        const n=Math.floor(seeded(city.seed+city.week,city.week*37)*candidates.length);
        damageTile(city,candidates[n],"홍수");
      }
    }
    const storm=village.stormUntil>village.tick;
    if(storm&&city.week%4===0){
      const candidates=city.tiles.filter(t=>t.damage<3&&(t.powerLine||t.road)&&t.terrain!=="water");
      if(candidates.length){
        const n=Math.floor(seeded(city.seed^0x55aa,city.week*19)*candidates.length);
        damageTile(city,candidates[n],"폭풍");
      }
    }
  }

  function settleBudget(city) {
    const available=city.funds+city.taxIncome;
    if(city.maintenance<=0){
      city.funds=clamp(available,0,99999);city.budgetRatio=1;city.netIncome=city.taxIncome;return;
    }
    if(available>=city.maintenance){
      city.funds=clamp(available-city.maintenance,0,99999);
      city.budgetRatio=1;
    }else{
      city.budgetRatio=clamp(available/city.maintenance,.2,1);
      city.funds=0;
    }
    city.netIncome=Math.round((city.taxIncome-city.maintenance)*10)/10;
  }

  function applyVillageEffects(city,village) {
    if(!village||!city.stats.developed)return;
    const lowPower=Math.max(0,70-city.stats.poweredRate);
    const lowWater=Math.max(0,70-city.stats.wateredRate);
    const badCommute=Math.max(0,55-city.stats.commuteSuccess);
    if(lowPower>0&&Number.isFinite(village.trust))village.trust=clamp(village.trust-lowPower*.006);
    if(lowWater>0&&Number.isFinite(village.health))village.health=clamp(village.health-lowWater*.008);
    if(city.stats.avgPollution>55&&Number.isFinite(village.health))village.health=clamp(village.health-(city.stats.avgPollution-55)*.004);
    if(badCommute>0&&Number.isFinite(village.trust))village.trust=clamp(village.trust-badCommute*.005);
    if(city.stats.serviceScore>=28&&Number.isFinite(village.health))village.health=clamp(village.health+.04);
    if(city.stats.serviceScore>=24&&Number.isFinite(village.education)&&village.education<100)village.education=clamp(village.education+.04);
  }

  function tick(city,village=null) {
    if(!city)return null;
    city.week++;
    applyVillageHazards(city,village);
    recompute(city,village);
    updateDemand(city,village);
    recompute(city,village);
    const change=advanceGrowth(city);
    recompute(city,village);
    settleBudget(city);
    recompute(city,village);
    applyVillageEffects(city,village);
    return change;
  }

  function paint(city,tool,x,y,village=null) {
    const spec=TOOLS[tool],t=cell(city,x,y);
    if(!spec||!t)return {ok:false,reason:"사용할 수 없는 도구입니다."};
    if(t.terrain==="water")return {ok:false,reason:"물 위에는 아직 건설할 수 없습니다."};

    if(tool==="repair"){
      if(!t.damage)return {ok:false,reason:"복구할 피해가 없습니다."};
      if(city.funds<spec.cost)return {ok:false,reason:"도시 예산이 부족합니다."};
      city.funds-=spec.cost;t.damage=0;recompute(city,village);
      return {ok:true,note:"시설 피해를 복구했습니다."};
    }

    if(tool==="bulldoze"){
      if(!t.road&&!t.zone&&!t.civic&&!t.powerLine&&!t.pipe)return {ok:false,reason:"철거할 것이 없습니다."};
      if(city.funds<spec.cost)return {ok:false,reason:"도시 예산이 부족합니다."};
      city.funds-=spec.cost;
      t.road=false;t.zone=null;t.density=0;t.civic=null;t.powerLine=false;t.pipe=false;t.damage=0;
      recompute(city,village);
      return {ok:true,note:"철거했습니다."};
    }

    if(city.funds<spec.cost)return {ok:false,reason:"도시 예산이 부족합니다."};

    if(tool==="powerLine"||tool==="pipe"){
      if(t[tool])return {ok:false,reason:"이미 "+spec.title+"이 있습니다."};
      city.funds-=spec.cost;t[tool]=true;
    }else if(tool==="road"){
      if(t.road)return {ok:false,reason:"이미 도로가 있습니다."};
      city.funds-=spec.cost;t.road=true;t.zone=null;t.density=0;t.civic=null;
    }else if(ZONES[tool]){
      if(t.road||t.civic)return {ok:false,reason:"도로·공공시설 위에는 구역을 지정할 수 없습니다."};
      if(t.zone===tool)return {ok:false,reason:"이미 같은 구역입니다."};
      city.funds-=spec.cost;t.zone=tool;t.density=0;t.civic=null;
    }else if(spec.civic){
      if(t.road)return {ok:false,reason:"도로 위에는 공공시설을 지을 수 없습니다."};
      if(t.civic===tool)return {ok:false,reason:"이미 같은 시설이 있습니다."};
      const hasRoad=neighbors4(city,x,y).some(([nx,ny])=>cell(city,nx,ny)?.road);
      if(!hasRoad)return {ok:false,reason:"공공시설은 도로 옆에 지어 주세요."};
      city.funds-=spec.cost;t.zone=null;t.density=0;t.civic=tool;
    }
    recompute(city,village);
    return {ok:true,note:spec.title+" 적용 완료"};
  }

  function changeTaxRate(city,delta,village=null) {
    const before=city.taxRate;
    city.taxRate=clamp(city.taxRate+Number(delta||0),4,12);
    if(city.taxRate===before)return {ok:false,reason:"세율 범위는 4~12%입니다."};
    updateDemand(city,village);recompute(city,village);
    return {ok:true,note:"도시 세율을 "+city.taxRate+"%로 조정했습니다."};
  }

  function tileInfo(city,x,y) {
    const t=cell(city,x,y);
    if(!t)return null;
    return {
      ...t,x,y,
      zoneTitle:t.zone?ZONES[t.zone].title:"",
      civicTitle:t.civic?TOOLS[t.civic]?.title||t.civic:"",
      status:t.road?(t.damage>=3?"파손된 도로":t.connected?"연결된 도로":"끊긴 도로"):
        t.civic?(TOOLS[t.civic]?.title||t.civic):
        t.zone?ZONES[t.zone].title+" "+(t.density?t.density+"단계":"빈 구역"):
        t.terrain==="forest"?"숲":"빈 땅"
    };
  }

  function summary(city) {
    return {
      funds:Math.round(city.funds*10)/10,
      taxRate:city.taxRate,
      taxIncome:city.taxIncome,
      maintenance:city.maintenance,
      netIncome:city.netIncome,
      budgetRatio:Math.round(city.budgetRatio*100),
      demand:{...city.demand},
      ...city.stats
    };
  }

  return Object.freeze({
    VERSION,WIDTH,HEIGHT,ZONES,TOOLS,
    initial,normalize,ensureVillage,tick,paint,recompute,updateDemand,advanceGrowth,
    applyVillageHazards,applyVillageEffects,traceTrip,changeTaxRate,tileInfo,summary,cell
  });
});