/* 촌장 시뮬레이터 v9 — OpenSC2K에서 영감을 받은 독립 도시 시뮬레이션 코어.
 * OpenSC2K의 원본 SimCity 2000 자산/소스는 포함하지 않는다.
 * 브라우저/Node 공용. 이 파일의 수치와 규칙은 KIDSCADE용으로 새로 단순화한 구현이다.
 */
((root, factory) => {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.IslandCityCore = api;
})(typeof window !== "undefined" ? window : null, () => {
  "use strict";

  const VERSION = 1;
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
    park: { title: "공원", cost: 18 },
    school: { title: "학교", cost: 55 },
    clinic: { title: "진료소", cost: 70 },
    bulldoze: { title: "철거", cost: 2 }
  });

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
  const idx = (city, x, y) => y * city.width + x;
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
      connected: false, roadAccess: false, traffic: 0, pollution: 0,
      landValue: 35, growth: 0, service: 0
    };
  }

  function initial(seed = 8429) {
    const city = {
      version: VERSION,
      seed: seed >>> 0,
      width: WIDTH,
      height: HEIGHT,
      week: 0,
      funds: 420,
      taxIncome: 0,
      demand: { residential: 48, commercial: 24, industrial: 30 },
      stats: {
        roads: 0, developed: 0, homes: 0, jobs: 0, connectedRoads: 0,
        avgLandValue: 0, avgPollution: 0, avgTraffic: 0
      },
      log: [],
      tiles: []
    };
    for (let y = 0; y < city.height; y++) {
      for (let x = 0; x < city.width; x++) city.tiles.push(blankTile(makeTerrain(seed, x, y, city.width, city.height)));
    }

    // 작은 마을의 첫 중심 도로. 이후 플레이어가 직접 확장한다.
    for (let x = 4; x <= 19; x++) {
      const t = cell(city, x, 9);
      if (t && t.terrain !== "water") t.road = true;
    }
    for (let y = 5; y <= 13; y++) {
      const t = cell(city, 12, y);
      if (t && t.terrain !== "water") t.road = true;
    }

    // 시작 구역은 빈 땅으로 남겨 두되 도로 접근이 되는 위치를 제공한다.
    [[9,8],[10,8],[9,10],[10,10]].forEach(([x,y]) => { const t=cell(city,x,y); if(t) t.zone="residential"; });
    [[13,8],[14,8]].forEach(([x,y]) => { const t=cell(city,x,y); if(t) t.zone="commercial"; });
    [[15,10],[16,10]].forEach(([x,y]) => { const t=cell(city,x,y); if(t) t.zone="industrial"; });

    recompute(city);
    return city;
  }

  function normalize(raw) {
    if (!raw || raw.version !== VERSION || raw.width !== WIDTH || raw.height !== HEIGHT || !Array.isArray(raw.tiles) || raw.tiles.length !== WIDTH * HEIGHT) {
      return initial(raw?.seed || 8429);
    }
    const city = {
      ...initial(raw.seed),
      ...raw,
      demand: { ...initial(raw.seed).demand, ...(raw.demand || {}) },
      stats: { ...initial(raw.seed).stats, ...(raw.stats || {}) },
      log: Array.isArray(raw.log) ? raw.log.slice(0, 30) : []
    };
    city.funds = clamp(Number(city.funds), 0, 99999);
    city.week = Math.max(0, Math.floor(Number(city.week) || 0));
    city.tiles = raw.tiles.map(t => ({
      ...blankTile(t?.terrain === "water" ? "water" : t?.terrain === "forest" ? "forest" : "land"),
      ...(t || {}),
      density: clamp(Math.floor(Number(t?.density) || 0), 0, 3),
      traffic: clamp(Number(t?.traffic) || 0, 0, 100),
      pollution: clamp(Number(t?.pollution) || 0, 0, 100),
      landValue: clamp(Number(t?.landValue) || 0, 0, 100),
      growth: clamp(Number(t?.growth) || 0, -100, 100)
    }));
    recompute(city);
    return city;
  }

  function ensureVillage(village) {
    if (!village || typeof village !== "object") return initial();
    village.city = normalize(village.city);
    return village.city;
  }

  function connectedRoadSet(city) {
    const roads = [];
    for (let y = 0; y < city.height; y++) for (let x = 0; x < city.width; x++) {
      if (cell(city,x,y)?.road) roads.push([x,y]);
    }
    if (!roads.length) return new Set();

    // 중심 교차로가 남아 있으면 거기서, 없으면 첫 도로에서 네트워크를 탐색한다.
    const preferred = cell(city,12,9)?.road ? [12,9] : roads[0];
    const key = (x,y) => x + "," + y;
    const seen = new Set([key(preferred[0], preferred[1])]);
    const q = [preferred];
    while (q.length) {
      const [x,y] = q.shift();
      for (const [nx,ny] of neighbors4(city,x,y)) {
        if (!cell(city,nx,ny)?.road) continue;
        const k = key(nx,ny);
        if (!seen.has(k)) { seen.add(k); q.push([nx,ny]); }
      }
    }
    return seen;
  }

  function distanceEffect(city, x, y, civicType, radius, amount) {
    let best = 0;
    for (let yy = Math.max(0,y-radius); yy <= Math.min(city.height-1,y+radius); yy++) {
      for (let xx = Math.max(0,x-radius); xx <= Math.min(city.width-1,x+radius); xx++) {
        const t = cell(city,xx,yy);
        if (t?.civic !== civicType) continue;
        const d = Math.abs(xx-x) + Math.abs(yy-y);
        if (d <= radius) best = Math.max(best, amount * (1 - d / (radius + 1)));
      }
    }
    return best;
  }

  function industrialPollution(city, x, y) {
    let value = 0;
    for (let yy = Math.max(0,y-3); yy <= Math.min(city.height-1,y+3); yy++) {
      for (let xx = Math.max(0,x-3); xx <= Math.min(city.width-1,x+3); xx++) {
        const t = cell(city,xx,yy);
        if (t?.zone !== "industrial" || !t.density) continue;
        const d = Math.abs(xx-x) + Math.abs(yy-y);
        if (d <= 3) value += t.density * Math.max(2, 13 - d * 3);
      }
    }
    return value;
  }

  function recompute(city, village = null) {
    const connected = connectedRoadSet(city);
    let roads = 0, connectedRoads = 0, developed = 0, homes = 0, jobs = 0;
    let landTotal = 0, pollutionTotal = 0, trafficTotal = 0, landCount = 0;

    // 1차: 네트워크와 도로 접근성
    for (let y = 0; y < city.height; y++) for (let x = 0; x < city.width; x++) {
      const t = cell(city,x,y);
      const k = x + "," + y;
      t.connected = !!t.road && connected.has(k);
      if (t.road) { roads++; if (t.connected) connectedRoads++; }
      t.roadAccess = neighbors4(city,x,y).some(([nx,ny]) => {
        const n = cell(city,nx,ny);
        return n?.road && n.connected;
      });
    }

    // 2차: 교통. 개발 타일이 인접한 연결 도로에 부담을 준다.
    for (let y = 0; y < city.height; y++) for (let x = 0; x < city.width; x++) {
      const t = cell(city,x,y);
      if (!t.road) { t.traffic = 0; continue; }
      let load = 0;
      for (let yy = Math.max(0,y-2); yy <= Math.min(city.height-1,y+2); yy++) {
        for (let xx = Math.max(0,x-2); xx <= Math.min(city.width-1,x+2); xx++) {
          const n = cell(city,xx,yy);
          if (n?.density) load += n.density * (n.zone === "commercial" ? 7 : n.zone === "industrial" ? 6 : 4);
          if (n?.civic) load += 4;
        }
      }
      t.traffic = clamp(load * (t.connected ? 1 : .35), 0, 100);
    }

    // 3차: 서비스·오염·지가·성장 압력
    for (let y = 0; y < city.height; y++) for (let x = 0; x < city.width; x++) {
      const t = cell(city,x,y);
      const park = distanceEffect(city,x,y,"park",4,24);
      const school = distanceEffect(city,x,y,"school",5,18);
      const clinic = distanceEffect(city,x,y,"clinic",5,16);
      t.service = clamp(park + school + clinic, 0, 50);
      const nearbyRoadTraffic = neighbors4(city,x,y).reduce((m,[nx,ny]) => Math.max(m, cell(city,nx,ny)?.traffic || 0), 0);
      t.pollution = clamp(industrialPollution(city,x,y) + nearbyRoadTraffic * .08 - park * .22, 0, 100);
      const nature = t.terrain === "forest" ? 9 : 0;
      const access = t.roadAccess ? 22 : -12;
      t.landValue = clamp(34 + access + t.service + nature - t.pollution * .62, 0, 100);

      const d = t.zone ? city.demand[t.zone] || 0 : 0;
      const healthFactor = village ? clamp((Number(village.health) || 70) - 55, -20, 20) * .25 : 0;
      const trustFactor = village ? clamp((Number(village.trust) || 60) - 50, -30, 30) * .18 : 0;
      t.growth = clamp(d + (t.roadAccess ? 22 : -55) + (t.landValue - 45) * .55 - t.pollution * .28 + healthFactor + trustFactor, -100, 100);

      if (t.density > 0) {
        developed++;
        if (t.zone === "residential") homes += t.density * 4;
        if (t.zone === "commercial") jobs += t.density * 3;
        if (t.zone === "industrial") jobs += t.density * 5;
      }
      if (t.terrain !== "water") {
        landTotal += t.landValue;
        pollutionTotal += t.pollution;
        trafficTotal += t.road ? t.traffic : 0;
        landCount++;
      }
    }

    city.stats = {
      roads, connectedRoads, developed, homes, jobs,
      avgLandValue: landCount ? Math.round(landTotal / landCount) : 0,
      avgPollution: landCount ? Math.round(pollutionTotal / landCount) : 0,
      avgTraffic: roads ? Math.round(trafficTotal / roads) : 0
    };
    city.taxIncome = Math.max(0, Math.round((homes * .18 + jobs * .22) * 10) / 10);
    return city.stats;
  }

  function updateDemand(city, village = null) {
    const pop = Math.max(1, Number(village?.population) || city.stats.homes || 12);
    const homes = city.stats.homes;
    const jobs = city.stats.jobs;
    const trust = Number(village?.trust) || 60;
    const health = Number(village?.health) || 75;

    city.demand.residential = Math.round(clamp(38 + jobs * 1.4 + pop * 1.2 - homes * 2.3 + (trust - 55) * .35, -100, 100));
    city.demand.commercial = Math.round(clamp(18 + homes * .8 + pop * .9 - city.stats.developed * 1.8 + (trust - 50) * .2, -100, 100));
    city.demand.industrial = Math.round(clamp(28 + homes * .7 - jobs * .65 + (health - 60) * .15, -100, 100));
  }

  function growthCandidates(city) {
    const list = [];
    for (let y = 0; y < city.height; y++) for (let x = 0; x < city.width; x++) {
      const t = cell(city,x,y);
      if (!t.zone || t.terrain === "water" || !t.roadAccess || t.civic || t.road) continue;
      if (t.density >= 3 && t.growth >= 0) continue;
      list.push({x,y,t,score:t.growth + t.landValue * .2 - t.pollution * .1});
    }
    list.sort((a,b) => b.score - a.score || a.y - b.y || a.x - b.x);
    return list;
  }

  function advanceGrowth(city, village = null) {
    const candidates = growthCandidates(city);
    if (!candidates.length) return null;

    // 한 주에 한 필지만 변해 어린 플레이어가 원인과 결과를 따라가기 쉽게 한다.
    const offset = city.week % Math.min(5, candidates.length);
    const ordered = candidates.slice(offset).concat(candidates.slice(0,offset));
    const grow = ordered.find(c => c.t.growth >= 15 && c.t.density < 3);
    if (grow) {
      grow.t.density++;
      city.log.unshift({ week: city.week, text: ZONES[grow.t.zone].title + " 구역이 " + grow.t.density + "단계로 성장했습니다." });
      city.log = city.log.slice(0, 30);
      return { type:"grow", x:grow.x, y:grow.y, density:grow.t.density };
    }

    const shrink = ordered.slice().reverse().find(c => c.t.growth <= -45 && c.t.density > 0);
    if (shrink && city.week % 3 === 0) {
      shrink.t.density--;
      city.log.unshift({ week: city.week, text: ZONES[shrink.t.zone].title + " 구역의 건물이 줄었습니다." });
      city.log = city.log.slice(0, 30);
      return { type:"shrink", x:shrink.x, y:shrink.y, density:shrink.t.density };
    }
    return null;
  }

  function tick(city, village = null) {
    if (!city) return null;
    city.week++;
    recompute(city, village);
    updateDemand(city, village);
    recompute(city, village);
    const change = advanceGrowth(city, village);
    recompute(city, village);
    city.funds = clamp(city.funds + city.taxIncome, 0, 99999);
    return change;
  }

  function paint(city, tool, x, y) {
    const spec = TOOLS[tool];
    const t = cell(city, x, y);
    if (!spec || !t) return { ok:false, reason:"사용할 수 없는 도구입니다." };
    if (t.terrain === "water") return { ok:false, reason:"물 위에는 아직 건설할 수 없습니다." };

    if (tool === "bulldoze") {
      if (!t.road && !t.zone && !t.civic) return { ok:false, reason:"철거할 것이 없습니다." };
      if (city.funds < spec.cost) return { ok:false, reason:"도시 예산이 부족합니다." };
      city.funds -= spec.cost;
      t.road = false; t.zone = null; t.density = 0; t.civic = null;
      recompute(city);
      return { ok:true, note:"철거했습니다." };
    }

    if (city.funds < spec.cost) return { ok:false, reason:"도시 예산이 부족합니다." };

    if (tool === "road") {
      if (t.road) return { ok:false, reason:"이미 도로가 있습니다." };
      city.funds -= spec.cost;
      t.road = true; t.zone = null; t.density = 0; t.civic = null;
    } else if (ZONES[tool]) {
      if (t.road || t.civic) return { ok:false, reason:"도로·공공시설 위에는 구역을 지정할 수 없습니다." };
      if (t.zone === tool) return { ok:false, reason:"이미 같은 구역입니다." };
      city.funds -= spec.cost;
      t.zone = tool; t.density = 0; t.civic = null;
    } else if (["park","school","clinic"].includes(tool)) {
      if (t.road) return { ok:false, reason:"도로 위에는 공공시설을 지을 수 없습니다." };
      if (!neighbors4(city,x,y).some(([nx,ny]) => cell(city,nx,ny)?.road)) return { ok:false, reason:"공공시설은 도로 옆에 지어 주세요." };
      city.funds -= spec.cost;
      t.zone = null; t.density = 0; t.civic = tool;
    }
    recompute(city);
    return { ok:true, note:spec.title + " 적용 완료" };
  }

  function tileInfo(city, x, y) {
    const t = cell(city,x,y);
    if (!t) return null;
    return {
      ...t, x, y,
      zoneTitle: t.zone ? ZONES[t.zone].title : "",
      civicTitle: t.civic ? TOOLS[t.civic].title : "",
      status: t.road ? (t.connected ? "연결된 도로" : "끊긴 도로") :
        t.civic ? TOOLS[t.civic].title :
        t.zone ? ZONES[t.zone].title + " " + (t.density ? t.density + "단계" : "빈 구역") :
        t.terrain === "forest" ? "숲" : "빈 땅"
    };
  }

  function summary(city) {
    return {
      funds: Math.round(city.funds * 10) / 10,
      taxIncome: city.taxIncome,
      demand: { ...city.demand },
      ...city.stats
    };
  }

  return Object.freeze({
    VERSION, WIDTH, HEIGHT, ZONES, TOOLS,
    initial, normalize, ensureVillage, tick, paint, recompute, updateDemand,
    advanceGrowth, tileInfo, summary, cell
  });
});