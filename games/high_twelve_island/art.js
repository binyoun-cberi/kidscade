/* 촌장 시뮬레이터 — 기존 Kenney Tiny Town/Farm의 16px 타일을 사용하는 마을 렌더러. */
((root) => {
  "use strict";
  const BASE = "../../assets/game/2d/tilesets/";
  const MAPS = {
    town: BASE + "kenney-tiny-town/atlas/tilemap-packed.png",
    farm: BASE + "kenney-tiny-farm/atlas/tilemap-packed.png"
  };
  const images = {};
  let canvas = null, ctx = null, latest = null, ready = false, elapsed = 0, frame = 0, preview = null, impact = null;
  for (const [name, path] of Object.entries(MAPS)) {
    const img = new Image();
    img.onload = () => { images[name] = img; redraw(); };
    img.onerror = () => { images[name] = null; redraw(); };
    img.src = path;
  }
  const WIDTH = 720, HEIGHT = 420, TILE = 16, COLS = 12;
  const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
  function sprite(kind, index, x, y, scale = 2) {
    const img = images[kind];
    if (!img || !ctx) return false;
    ctx.drawImage(img, (index % COLS) * TILE, Math.floor(index / COLS) * TILE,
      TILE, TILE, Math.round(x), Math.round(y), TILE * scale, TILE * scale);
    return true;
  }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); }
  function ellipse(x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -.08, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
  }
  function background(s, t) {
    rect(0, 0, WIDTH, HEIGHT, s.stormUntil > s.tick ? "#315c67" : "#317e92");
    ctx.strokeStyle = s.stormUntil > s.tick ? "#7e9ba5" : "#65a4ab";
    ctx.lineWidth = 3;
    for (let j = 0; j < 16; j++) {
      const yy = 23 + j * 26, start = ((j * 79 + t * .015) % 180) - 90;
      for (let x = start; x < WIDTH; x += 180) {
        ctx.beginPath();
        ctx.moveTo(Math.round(x), yy);
        ctx.lineTo(Math.round(x + 38), yy);
        ctx.lineTo(Math.round(x + 49), yy - 3);
        ctx.stroke();
      }
    }
    ctx.save();
    ctx.shadowColor = "#184b51";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 10;
    ellipse(362, 204, 294, 171, "#b7b080");
    ctx.restore();
    // 육지의 가장자리에 Tiny Town의 해변 타일을 사용한다.
    ctx.save();
    ctx.beginPath(); ctx.ellipse(362, 204, 294, 171, -.08, 0, Math.PI * 2);
    ctx.clip();
    for (let y = 28; y < 380; y += 32)
      for (let x = 58; x < 660; x += 32)
        sprite("town", 13, x, y, 2);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(354, 196, 255, 135, -.08, 0, Math.PI * 2);
    ctx.clip();
    rect(90, 45, 540, 310, "#81b36f");
    // 지면은 Tiny Town 잔디 타일을 자연스럽게 반복한다.
    for (let y = 46; y < 356; y += 32)
      for (let x = 90; x < 635; x += 32)
        sprite("town", ((x * 7 + y * 11) % 9 === 0) ? 1 : 0, x, y, 2);
    ctx.restore();
    // 중앙 광장과 지름길. 플레이 장치가 아닌 장식이므로 네모형 경로로 간소화.
    rect(259, 201, 223, 35, "#c6ad77");
    rect(327, 148, 34, 157, "#c6ad77");
    for (let i = 0; i < 7; i++) {
      rect(266 + i * 32, 215 + (i % 2) * 4, 14, 4, "#e5d29c");
    }
    if (s.stage === 2) {
      rect(310, 175, 77, 4, "#846f51");
      rect(310, 246, 77, 4, "#846f51");
    }
  }
  function tree(x, y, orange = false, scale = 2) {
    const top = orange ? 3 : 4, bottom = orange ? 15 : 16;
    sprite("town", top, x, y, scale);
    sprite("town", bottom, x, y + TILE * scale, scale);
  }
  function landscape(s) {
    [
      [120, 84, 0], [162, 65, 1], [207, 87, 0], [596, 96, 0],
      [624, 139, 1], [102, 179, 0], [115, 267, 1], [174, 314, 0],
      [559, 319, 0], [612, 268, 1]
    ].forEach(([x, y, orange]) => tree(x, y, Boolean(orange), 2));
    [ [190, 145], [578, 180], [537, 283], [198, 289], [230, 118] ].forEach(([x, y], i) => {
      sprite("town", i % 2 ? 6 : 5, x, y, 2);
    });
    if (images.town) {
      sprite("town", 83, 608, 238, 2);
    }
    // Tiny Farm 통나무와 자원 오브젝트.
    sprite("farm", 2, 177, 239, 2);
    sprite("farm", 14, 198, 247, 2);
  }
  function house(x, y, variant = "blue", size = 1.45) {
    const roof = variant === "red" ? [52, 53, 54] : [48, 49, 50];
    const mid = variant === "red" ? [64, 65, 66] : [60, 61, 62];
    const wall = [72, 73, 74];
    const unit = TILE * size;
    // 지붕과 벽은 완성 건물이 아닌 9개의 조립 타일이다.
    ctx.fillStyle = "#42564355"; ctx.fillRect(x + 6, y + unit * 3 - 2, unit * 3 - 7, 5);
    [roof, mid, wall].forEach((row, j) => {
      row.forEach((tile, i) => sprite("town", tile, x + i * unit, y + j * unit, size));
    });
    // 기존 Tiny Town의 문과 창문 에셋을 벽 위에 배치한다.
    sprite("town", 84, x + unit * .35, y + unit * 2.05, size * .65);
    sprite("town", 85, x + unit * 2.05, y + unit * 2.05, size * .65);
  }
  function farm(x, y, count) {
    if (!count) return;
    // 농지: Tiny Farm의 작물과 Tiny Town의 울타리 사용.
    const width = 102, height = 69;
    rect(x, y, width, height, "#956b45");
    rect(x + 4, y + 4, width - 8, height - 8, "#aa7f4d");
    for (let i = 0; i < 3; i++) {
      rect(x + 11, y + 13 + i * 18, 80, 4, "#704e35");
      for (let j = 0; j < 5; j++) {
        const crop = [64, 65, 66, 67, 68][(i + j + count) % 5];
        sprite("farm", crop, x + 9 + j * 17, y + 3 + i * 17, .95);
      }
    }
    for (let i = 0; i < 4; i++) sprite("town", 45, x + i * 27, y - 12, 1.7);
    if (count >= 2) {
      rect(x + 8, y + height + 9, 84, 12, "#a87c4c");
      for (let i = 0; i < 5; i++) sprite("farm", 64 + (i % 3), x + 10 + i * 17, y + height + 5, 1.05);
    }
  }
  function warehouse(x, y) {
    // 창고는 Tiny Farm의 자루·상자 에셋을 조립한다.
    rect(x - 5, y + 21, 75, 29, "#6a563d");
    rect(x - 7, y + 14, 79, 6, "#a17d50");
    sprite("farm", 90, x + 1, y - 9, 2);
    sprite("farm", 91, x + 32, y - 9, 2);
    sprite("farm", 74, x, y + 19, 2);
    sprite("farm", 72, x + 30, y + 19, 2);
  }
  function townHall(x, y) {
    house(x, y, "blue", 1.65);
    rect(x + 12, y + 78, 59, 8, "#9d9476");
    rect(x + 24, y + 87, 36, 4, "#d0bb8b");
    rect(x + 40, y - 18, 3, 23, "#634e3c");
    sprite("town", 83, x + 31, y - 22, 1.3);
  }
  function buildings(s) {
    const b = s.buildings;
    farm(130, 183, b.farm);
    if (b.hut) {
      house(399, 91, "blue", 1.45);
      if (b.hut >= 2) house(505, 216, "blue", 1.25);
      if (b.hut >= 3) house(216, 100, "red", 1.15);
    }
    if (b.store) warehouse(478, 261);
    if (b.clinic) {
      house(495, 115, "red", 1.23);
      rect(524, 151, 16, 4, "#f6f5de");
      rect(530, 145, 4, 16, "#f6f5de");
    }
    if (b.hall) townHall(294, 85);
    // 회관 건설 이전의 모닥불과 원시 야영지.
    if (!b.hall) {
      rect(330, 276, 40, 8, "#7c573c");
      rect(340, 258, 20, 22, "#f4a744");
      rect(344, 250, 9, 27, "#ed6a3c");
      rect(350, 264, 6, 12, "#ffe49f");
      sprite("farm", 74, 313, 280, 1.4);
      sprite("farm", 75, 364, 280, 1.4);
    }
  }
  function badge(x, y, text, fill = "rgba(30,49,55,.90)") {
    ctx.save();
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const w = Math.ceil(ctx.measureText(text).width) + 14;
    rect(x, y, w, 24, fill);
    ctx.fillStyle = "#fffdf3";
    ctx.fillText(text, Math.round(x + 7), Math.round(y + 12));
    ctx.restore();
  }
  function zone(x, y, w, h, label, fill = "rgba(255,244,196,.18)") {
    ctx.save();
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(255,255,255,.82)"; ctx.lineWidth = 2; ctx.setLineDash([6,5]);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.setLineDash([]);
    ctx.restore();
    badge(x + 4, Math.max(4, y - 27), label);
  }
  // 주민 행동은 저장 데이터가 아니라 렌더러의 가벼운 런타임 상태로 유지한다.
  // 실제 생산량·파업·재난 상태는 sim.js가 결정하고, 이 레이어는 그것을 생활 장면으로 번역한다.
  const actorRuntime = new Map();
  const ACTIVITY_SPOTS = Object.freeze({
    farm: [[142,211],[165,225],[190,244],[210,218]],
    forest: [[112,126],[151,103],[204,128],[566,126],[604,148]],
    fishing: [[91,298],[116,322],[585,304],[615,282]],
    fire: [[311,292],[335,306],[376,296],[401,311]],
    plaza: [[300,218],[332,226],[370,218],[405,230],[436,216]],
    homes: [[410,151],[442,157],[500,264],[527,274],[236,159]],
    clinic: [[474,164],[501,181],[535,187]],
    hall: [[287,158],[318,166],[350,159],[382,166]],
    water: [[300,326],[329,338],[362,330]],
    highground: [[405,108],[455,120],[526,194],[273,137]],
    floodedge: [[151,318],[194,327],[241,335],[487,329]],
    storage: [[479,286],[504,299],[532,294]],
    queue: [[303,253],[329,253],[355,253],[381,253],[407,253]],
    excluded: [[104,224]],
    family: [[548,306],[579,319],[610,303]]
  });

  // Dead Shop식 POI 이동 원리를 주민 생활에 맞게 적용한 보행 경로망.
  // 주민은 목적지로 직선 이동하지 않고 광장·교차로·시설 입구를 순서대로 지나간다.
  const ROUTE_NODES = Object.freeze({
    plaza:[360,220], west:[270,220], east:[465,220], north:[350,170], south:[350,286],
    farmGate:[232,222], forestWest:[214,164], forestEast:[526,174],
    fishWest:[207,292], fishEast:[520,294], homes:[430,176], clinic:[486,194],
    hall:[350,165], water:[350,312], storage:[477,276], family:[520,302],
    highground:[430,132], floodWest:[238,306], floodEast:[490,316]
  });
  const ROUTE_LINKS = Object.freeze({
    plaza:['west','east','north','south'], west:['plaza','farmGate','forestWest','floodWest'],
    east:['plaza','homes','clinic','forestEast','storage','floodEast'], north:['plaza','hall','highground','homes'],
    south:['plaza','water','floodWest','floodEast'], farmGate:['west','forestWest'], forestWest:['west','farmGate'],
    forestEast:['east','homes'], fishWest:['floodWest','water'], fishEast:['floodEast','storage'],
    homes:['east','north','clinic','forestEast'], clinic:['east','homes'], hall:['north','plaza'],
    water:['south','fishWest','fishEast'], storage:['east','floodEast','fishEast','family'],
    family:['storage','floodEast'], highground:['north','homes'], floodWest:['west','south','fishWest'],
    floodEast:['east','south','storage','fishEast','family']
  });
  function nearestRouteNode(x,y) {
    let best='plaza', d=Infinity;
    for (const [key,p] of Object.entries(ROUTE_NODES)) {
      const nd=Math.hypot(p[0]-x,p[1]-y);
      if (nd<d) { d=nd; best=key; }
    }
    return best;
  }
  function destinationNode(kind,target) {
    if (kind==='farm') return 'farmGate';
    if (kind==='forest') return target.x<360?'forestWest':'forestEast';
    if (kind==='fishing') return target.x<360?'fishWest':'fishEast';
    if (kind==='homes') return 'homes';
    if (kind==='clinic') return 'clinic';
    if (kind==='hall') return 'hall';
    if (kind==='water') return 'water';
    if (kind==='highground') return 'highground';
    if (kind==='floodedge') return target.x<360?'floodWest':'floodEast';
    if (kind==='storage') return 'storage';
    if (kind==='family') return 'family';
    if (kind==='queue'||kind==='excluded'||kind==='fire'||kind==='plaza') return 'plaza';
    return 'plaza';
  }
  function buildRoute(actor,kind,target) {
    const start=nearestRouteNode(actor.x,actor.y), goal=destinationNode(kind,target);
    if (start===goal) return [{x:target.x,y:target.y}];
    const queue=[start], prev=new Map([[start,null]]);
    while (queue.length) {
      const here=queue.shift();
      if (here===goal) break;
      for (const next of ROUTE_LINKS[here]||[]) {
        if (!prev.has(next)) { prev.set(next,here); queue.push(next); }
      }
    }
    const keys=[];
    let cur=goal;
    while (cur&&prev.has(cur)) { keys.push(cur); cur=prev.get(cur); }
    keys.reverse();
    const points=keys.map(k=>({x:ROUTE_NODES[k][0],y:ROUTE_NODES[k][1]}));
    points.push({x:target.x,y:target.y});
    return points;
  }

  function hashValue(value) {
    const text = String(value ?? "");
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function seeded(id, salt = 0) {
    let h = hashValue(id) ^ Math.imul((salt | 0) + 1, 2654435761);
    h ^= h >>> 16; h = Math.imul(h, 2246822507);
    h ^= h >>> 13; h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }
  function pickSpot(kind, actor, salt = 0) {
    const spots = ACTIVITY_SPOTS[kind] || ACTIVITY_SPOTS.plaza;
    const index = Math.floor(seeded(actor.id, salt + actor.index * 17) * spots.length) % spots.length;
    const base = spots[index];
    const jitterX = Math.round((seeded(actor.id, salt + 91) - .5) * 8);
    const jitterY = Math.round((seeded(actor.id, salt + 137) - .5) * 6);
    return [base[0] + jitterX, base[1] + jitterY];
  }
  function actorFor(citizen, index) {
    const id = citizen?.id || "visible-" + index;
    let actor = actorRuntime.get(id);
    if (!actor) {
      const start = ACTIVITY_SPOTS.plaza[index % ACTIVITY_SPOTS.plaza.length];
      actor = {
        id, index, citizen, activity: "idle", forcedKey: "",
        x: start[0] + (index % 3) * 4, y: start[1] + (index % 2) * 3,
        targetX: start[0], targetY: start[1], route: [], waypoint: 0,
        nextDecisionAt: 0, lastAt: 0, arrived: false, phase: seeded(id, 3) * Math.PI * 2
      };
      actorRuntime.set(id, actor);
    }
    actor.index = index;
    actor.citizen = citizen;
    return actor;
  }
  function workerAssignment(s, citizen, adultOrdinal) {
    if (citizen?.isChild || adultOrdinal < 0) return null;
    if (adultOrdinal < (s.jobs?.gather || 0)) return "gather";
    if (adultOrdinal < (s.jobs?.gather || 0) + (s.jobs?.wood || 0)) return "wood";
    return null;
  }
  function sickVisualIndex(index, count) {
    if (!count) return false;
    return ((index * 7 + 3) % 24) < count;
  }
  function forcedActivity(s, citizen, index, adultOrdinal, visibleCount) {
    const childWork = s.childWorkUntil > s.tick;
    const forced = s.forcedLaborUntil > s.tick;
    const excluded = s.exclusionUntil > s.tick;
    const workerStrike = (s.strikes?.workers || 0) > s.tick;
    const familyStrike = (s.strikes?.families || 0) > s.tick;
    const carerStrike = (s.strikes?.carers || 0) > s.tick;
    const sickCount = Math.min(visibleCount, Math.max(0, Math.ceil(Number(s.sick) || 0)));
    const isSick = sickVisualIndex(index, sickCount);

    if (excluded && index === 2) return ["excluded", "excluded"];
    if (childWork && citizen?.isChild) return [index % 2 ? "gather" : "farm", "child-work"];
    if (workerStrike && adultOrdinal >= 0 && adultOrdinal < 4) return ["protest", "worker-strike"];
    if (forced && adultOrdinal >= 0 && adultOrdinal < 4) return [adultOrdinal % 2 ? "chop" : "carry", "forced-work"];
    if (familyStrike && index >= 4 && index <= 6) return [index % 2 ? "talk" : "pack", "family-strike"];
    if (carerStrike && adultOrdinal === 6) return ["protest", "carer-strike"];
    if (isSick) return [s.buildings?.clinic ? "heal" : "sleep", "sick"];

    if (s.disasters?.flood > s.tick) {
      if (adultOrdinal >= 0 && adultOrdinal < 3) return ["repair", "flood"];
      return ["evacuate", "flood"];
    }
    if (s.disasters?.epidemic > s.tick && s.buildings?.clinic && adultOrdinal >= 0 && adultOrdinal < 2 && !carerStrike) {
      return ["care", "epidemic"];
    }
    if (s.trust < 28 && adultOrdinal >= 0 && adultOrdinal < 2 && !workerStrike) return ["protest", "low-trust"];
    return null;
  }
  function ambientActivity(s, citizen, index, adultOrdinal, actor, t) {
    const assignment = workerAssignment(s, citizen, adultOrdinal);
    const epoch = Math.floor(t / 8000) + s.tick * 29;
    const roll = seeded(actor.id, epoch);

    if (citizen?.isChild) {
      if (roll < .48) return "play";
      if (roll < .69) return "eat";
      if (roll < .84) return "talk";
      return "sleep";
    }

    if (assignment === "gather") {
      if (s.food < 28 && roll < .30) return "fish";
      if (s.buildings?.farm && roll < .70) return "farm";
      return "gather";
    }
    if (assignment === "wood") return roll < .78 ? "chop" : "carry";

    if (s.coldUntil > s.tick && s.warmth < 62) return roll < .72 ? "warm" : "carry";
    if (s.disasters?.heat > s.tick) return roll < .45 ? "fetch_water" : "rest";
    if (s.disasters?.dust > s.tick) return roll < .70 ? "rest" : "talk";
    if (s.water < 34 && roll < .58) return "fetch_water";
    if (s.food < 24) {
      if (roll < .34) return "queue";
      if (roll < .64) return "fish";
      return "gather";
    }

    if (roll < .20) return "talk";
    if (roll < .37) return "eat";
    if (roll < .51) return "fish";
    if (roll < .65) return "rest";
    if (roll < .77) return "carry";
    if (roll < .89) return "sleep";
    return "walk";
  }
  function targetKind(activity, s) {
    if (activity === "farm") return "farm";
    if (activity === "gather" || activity === "chop") return "forest";
    if (activity === "fish") return "fishing";
    if (activity === "eat" || activity === "warm" || activity === "rest") return s.buildings?.hall ? "plaza" : "fire";
    if (activity === "talk" || activity === "play" || activity === "protest" || activity === "walk") return s.buildings?.hall ? "hall" : "plaza";
    if (activity === "sleep") return s.buildings?.hut ? "homes" : "fire";
    if (activity === "heal" || activity === "care") return s.buildings?.clinic ? "clinic" : "homes";
    if (activity === "repair") return "floodedge";
    if (activity === "evacuate") return "highground";
    if (activity === "fetch_water") return "water";
    if (activity === "queue") return "queue";
    if (activity === "excluded") return "excluded";
    if (activity === "pack") return "family";
    if (activity === "carry") return s.buildings?.store ? "storage" : "plaza";
    return "plaza";
  }
  function setActivity(actor, activity, key, s, t) {
    actor.activity = activity;
    actor.forcedKey = key || "";
    const salt = Math.floor(t / 4000) + s.tick * 41 + activity.length * 7;
    const [x, y] = pickSpot(targetKind(activity, s), actor, salt);
    actor.targetX = x;
    actor.targetY = y;
    actor.route = buildRoute(actor, targetKind(activity, s), {x, y});
    actor.waypoint = 0;
    actor.arrived = false;
    actor.nextDecisionAt = t + 6200 + seeded(actor.id, salt + 211) * 7600;
  }
  function updateActor(actor, s, t) {
    const dt = actor.lastAt ? clamp((t - actor.lastAt) / 1000, 0, .16) : 0;
    actor.lastAt = t;
    const point = actor.route?.[actor.waypoint] || {x:actor.targetX,y:actor.targetY};
    const dx = point.x - actor.x, dy = point.y - actor.y;
    const dist = Math.hypot(dx, dy);
    const speed = actor.activity === "evacuate" ? 40 : actor.activity === "sleep" ? 19 : 27;
    if (dist > 1.4 && dt > 0) {
      const step = Math.min(dist, speed * dt * (s.pending ? .25 : 1));
      actor.x += dx / dist * step;
      actor.y += dy / dist * step;
      actor.arrived = false;
    } else if (actor.route?.length && actor.waypoint < actor.route.length - 1) {
      actor.waypoint += 1;
      actor.arrived = false;
    } else actor.arrived = true;
  }
  function pixelText(text, x, y, size = 10, color = "#fff8db") {
    ctx.save();
    ctx.font = "800 " + size + "px ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(24,39,37,.82)";
    ctx.fillText(text, Math.round(x + 1), Math.round(y + 1));
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  }
  function activityProp(actor, s, t, x, y) {
    if (!actor.arrived) return;
    const pulse = Math.sin(t * .008 + actor.phase);
    const phase = Math.floor((t / 520 + actor.index) % 2);
    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = "square";
    if (actor.activity === "farm") {
      ctx.strokeStyle = "#63482d";
      ctx.beginPath(); ctx.moveTo(x + 5, y + 24); ctx.lineTo(x + 18, y + 18 + phase * 3); ctx.stroke();
      rect(x + 17, y + 17 + phase * 3, 4, 3, "#d6bf72");
    } else if (actor.activity === "gather") {
      rect(x + 17, y + 18, 9, 7, "#8a633d");
      rect(x + 19, y + 16, 5, 2, "#d8b96a");
    } else if (actor.activity === "chop") {
      ctx.strokeStyle = "#6d4c30"; ctx.beginPath(); ctx.moveTo(x + 14, y + 15); ctx.lineTo(x + 22 + phase * 2, y + 7); ctx.stroke();
      rect(x + 20 + phase * 2, y + 5, 5, 4, "#cfd6c6");
    } else if (actor.activity === "fish") {
      ctx.strokeStyle = "#59442e"; ctx.beginPath(); ctx.moveTo(x + 12, y + 13); ctx.lineTo(x + 31, y + 6); ctx.stroke();
      ctx.strokeStyle = "#dce9dd"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 31, y + 6); ctx.lineTo(x + 34, y + 28); ctx.stroke();
      ctx.strokeStyle = "rgba(221,244,232,.65)";
      ctx.beginPath(); ctx.ellipse(x + 34, y + 29, 5 + phase * 2, 2, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (actor.activity === "talk") {
      rect(x + 6, y - 11, 25, 12, "rgba(246,239,203,.92)");
      pixelText(phase ? "· ·" : "···", x + 18, y - 5, 8, "#40514a");
    } else if (actor.activity === "eat") {
      rect(x + 9, y + 23, 15, 4, "#efe1aa");
      rect(x + 11, y + 20, 11, 4, "#9b6542");
      if (phase) pixelText("~", x + 17, y + 15, 8, "#f4d7a0");
    } else if (actor.activity === "sleep") {
      pixelText(phase ? "Z" : "z", x + 23, y - 4 - phase * 3, 10, "#e8f2dd");
    } else if (actor.activity === "protest") {
      rect(x + 5, y - 13 - phase * 2, 20, 12, "#eadfb9");
      rect(x + 14, y - 1 - phase * 2, 3, 15, "#72583d");
      pixelText("!", x + 15, y - 7 - phase * 2, 9, "#8c443b");
    } else if (actor.activity === "heal") {
      rect(x + 6, y - 7, 18, 12, "rgba(230,239,220,.92)");
      rect(x + 13, y - 5, 4, 8, "#ba5b56"); rect(x + 11, y - 3, 8, 4, "#ba5b56");
    } else if (actor.activity === "care") {
      rect(x + 20, y + 4, 4, 12, "#f0eee0"); rect(x + 16, y + 8, 12, 4, "#f0eee0");
    } else if (actor.activity === "repair") {
      ctx.strokeStyle = "#745036"; ctx.beginPath(); ctx.moveTo(x + 7, y + 22); ctx.lineTo(x + 22, y + 7 + phase * 4); ctx.stroke();
      rect(x + 19, y + 5 + phase * 4, 7, 4, "#c5c7b1");
    } else if (actor.activity === "evacuate" || actor.activity === "pack" || actor.activity === "carry") {
      rect(x + 14, y + 15, 12, 10, actor.activity === "pack" ? "#b98d65" : "#98704c");
      ctx.strokeStyle = "#66472f"; ctx.strokeRect(Math.round(x + 14), Math.round(y + 15), 12, 10);
    } else if (actor.activity === "fetch_water") {
      rect(x + 15, y + 17, 10, 9, "#558ca1");
      ctx.strokeStyle = "#d8e7dc"; ctx.beginPath(); ctx.arc(x + 20, y + 17, 5, Math.PI, 0); ctx.stroke();
    } else if (actor.activity === "warm") {
      ctx.strokeStyle = "rgba(250,205,117,.9)"; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const xx = x + 13 + i * 6;
        ctx.beginPath(); ctx.moveTo(xx, y + 1); ctx.quadraticCurveTo(xx - 3, y - 5 - pulse * 2, xx, y - 10); ctx.stroke();
      }
    } else if (actor.activity === "play") {
      rect(x + 20 + phase * 3, y + 20 - Math.max(0,pulse) * 5, 5, 5, "#e0b453");
    } else if (actor.activity === "queue") {
      rect(x + 18, y + 19, 7, 6, "#d7b06c");
      rect(x + 19, y + 17, 5, 2, "#efe0aa");
    } else if (actor.activity === "excluded") {
      pixelText("…", x + 17, y - 5, 10, "#e0d9c5");
    }
    ctx.restore();
  }
  function drawActor(actor, s, t) {
    const citizen = actor.citizen || {};
    const moving = !actor.arrived;
    const bob = moving ? Math.sin(t * .016 + actor.phase) * 2 : Math.sin(t * .004 + actor.phase) * .7;
    const tremble = s.coldUntil > s.tick && s.warmth < 36 && actor.activity !== "warm" ? Math.sin(t * .045 + actor.phase) * 1.5 : 0;
    const x = actor.x + tremble, y = actor.y + bob;
    const child = !!citizen.isChild;
    const scale = child ? 1.28 : 1.52;
    const tile = moving ? (Math.floor(t / 240 + actor.index) % 2 ? 108 : 109) : (actor.index % 3 === 0 ? 108 : 109);

    if (actor.activity === "sleep" && actor.arrived) {
      ctx.save();
      ctx.translate(Math.round(x + 14), Math.round(y + 15));
      ctx.rotate(.35);
      sprite("farm", tile, -12, -12, scale);
      ctx.restore();
    } else {
      sprite("farm", tile, x, y, scale);
    }
    activityProp(actor, s, t, x, y);
    if (actor.forcedKey === "forced-work") pixelText("!", x + 15, y - 6, 11, "#ffd3a2");
  }
  function citizens(s, t) {
    const visibleCitizens = (s.citizens || []).slice(0, Math.min(s.population, 24));
    const N = Math.min(s.population, 24);
    while (visibleCitizens.length < N) {
      const index = visibleCitizens.length;
      visibleCitizens.push({ id: "fallback-" + index, name: "주민 " + (index + 1), isChild: index === 10 || index === 11 });
    }

    const liveIds = new Set();
    let adultOrdinal = 0;
    const actors = [];
    for (let i = 0; i < N; i++) {
      const citizen = visibleCitizens[i];
      const actor = actorFor(citizen, i);
      liveIds.add(actor.id);
      const adultIndex = citizen?.isChild ? -1 : adultOrdinal++;
      actor.assignedJob = workerAssignment(s, citizen, adultIndex);
      const forced = forcedActivity(s, citizen, i, adultIndex, N);
      const activity = forced ? forced[0] : ambientActivity(s, citizen, i, adultIndex, actor, t);
      const key = forced ? forced[1] : "ambient";

      if (actor.forcedKey !== key || (forced && actor.activity !== activity) || (!forced && t >= actor.nextDecisionAt)) {
        setActivity(actor, activity, key, s, t);
      }
      updateActor(actor, s, t);
      actors.push(actor);
    }

    // 떠난 주민의 화면용 상태는 바로 정리하여 장시간 플레이에도 메모리가 늘지 않게 한다.
    for (const id of actorRuntime.keys()) if (!liveIds.has(id)) actorRuntime.delete(id);

    // 아래쪽 주민이 위쪽 주민보다 나중에 그려지도록 하여 자연스러운 깊이를 만든다.
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) drawActor(actor, s, t);
  }
  function getActivitySnapshot() {
    const counts = {};
    let moving = 0, routed = 0, foodAssigned = 0, foodWorking = 0, woodAssigned = 0, woodWorking = 0;
    const foodActivities = new Set(["farm","gather","fish"]);
    const woodActivities = new Set(["chop","carry"]);
    for (const actor of actorRuntime.values()) {
      counts[actor.activity] = (counts[actor.activity] || 0) + 1;
      if (!actor.arrived) moving += 1;
      if (actor.route?.length > 1) routed += 1;
      if (actor.assignedJob === "gather") {
        foodAssigned++;
        if (actor.arrived && foodActivities.has(actor.activity)) foodWorking++;
      } else if (actor.assignedJob === "wood") {
        woodAssigned++;
        if (actor.arrived && woodActivities.has(actor.activity)) woodWorking++;
      }
    }
    const foodPresence = foodAssigned ? clamp(.95 + .05 * (foodWorking / foodAssigned), .94, 1) : 1;
    const woodPresence = woodAssigned ? clamp(.95 + .05 * (woodWorking / woodAssigned), .94, 1) : 1;
    return { total: actorRuntime.size, counts, moving, routed, foodAssigned, foodWorking, woodAssigned, woodWorking, foodPresence, woodPresence };
  }
  function stateSignals(s) {
    if (s.childWorkUntil > s.tick) {
      zone(124, 248, 100, 70, "아이들이 채집 중", "rgba(217,142,84,.20)");
    }
    if (s.forcedLaborUntil > s.tick) {
      zone(104, 66, 122, 78, "강제 작업", "rgba(185,94,79,.18)");
    }
    if (s.exclusionUntil > s.tick) {
      zone(86, 202, 70, 78, "배급 제외", "rgba(188,91,79,.18)");
    }
    if ((s.strikes?.workers || 0) > s.tick) badge(306, 192, "노동 주민 작업 중단", "rgba(118,69,62,.92)");
    if ((s.strikes?.families || 0) > s.tick) badge(520, 339, "가족들이 떠날 준비", "rgba(118,69,62,.92)");
    if ((s.strikes?.carers || 0) > s.tick && s.buildings.clinic) {
      rect(507, 124, 69, 72, "rgba(50,54,54,.34)");
      badge(488, 102, "돌봄 서비스 중단", "rgba(118,69,62,.92)");
    }
    if (s.food < 18) badge(133, 144, "식량 바닥", "rgba(127,66,56,.92)");
    if (s.water < 18) badge(332, 325, "식수 부족", "rgba(56,83,112,.94)");
    if (s.trust < 28 && (s.strikes?.workers || 0) <= s.tick) badge(298, 191, "주민 항의", "rgba(126,76,55,.92)");
    if (s.sick >= 3) {
      const q = Math.min(4, Math.ceil(s.sick / 2));
      for (let i = 0; i < q; i++) sprite("farm", 109, 455 - i * 18, 155 + i * 13, 1.2);
      badge(455, 128, "진료 대기 " + Math.ceil(s.sick) + "명", "rgba(55,84,78,.92)");
    }
  }
  function previewOverlay(s, choice) {
    if (!choice) return;
    badge(18, 16, "선택하면 이렇게 바뀝니다", "rgba(24,45,52,.94)");
    if (choice.cost?.food) badge(135, 154, "식량 -" + choice.cost.food, "rgba(91,70,52,.93)");
    if (choice.cost?.wood) badge(548, 79, "물자 -" + choice.cost.wood, "rgba(91,70,52,.93)");
    if (choice.changes?.food) badge(135, 181, "식량 " + (choice.changes.food > 0 ? "+" : "") + choice.changes.food, "rgba(69,91,65,.94)");
    if (choice.changes?.wood) badge(548, 106, "물자 " + (choice.changes.wood > 0 ? "+" : "") + choice.changes.wood, "rgba(69,91,65,.94)");
    if (choice.changes?.water) badge(326, 327, "식수 " + (choice.changes.water > 0 ? "+" : "") + choice.changes.water, "rgba(55,87,112,.94)");
    if (choice.changes?.health) badge(343, 256, "건강 " + (choice.changes.health > 0 ? "+" : "") + choice.changes.health, "rgba(105,69,69,.94)");
    if (choice.quietRest) zone(126, 176, 108, 84, "생산 ↓ " + choice.quietRest + "주", "rgba(103,122,77,.17)");
    if (choice.startChildLabor) zone(124, 248, 100, 70, "아이 투입", "rgba(217,142,84,.22)");
    if (choice.startForcedLabor) zone(104, 66, 122, 78, "강제 작업", "rgba(185,94,79,.22)");
    if (choice.startExclusion) zone(86, 202, 70, 78, "배급 제외", "rgba(188,91,79,.22)");
    if (choice.floodRepair) zone(79, 310, 565, 59, "방벽·배수로", "rgba(62,120,142,.18)");
    if (choice.floodRelocate) zone(392, 83, 182, 195, "주민 대피", "rgba(100,113,133,.17)");
    if (choice.climateCare?.kind === "heat") zone(300, 188, 122, 70, "그늘·급수소", "rgba(205,166,76,.17)");
    if (choice.climateCare?.kind === "epidemic" || choice.medicine) zone(480, 104, 105, 96, "돌봄 강화", "rgba(88,127,117,.18)");
    if (choice.groupStrike === "workers") zone(284, 191, 158, 87, "작업 중단", "rgba(185,94,79,.20)");
    if (choice.groupStrike === "families") zone(520, 270, 115, 82, "이탈 준비", "rgba(185,94,79,.20)");
    if (choice.groupStrike === "carers") zone(478, 105, 110, 95, "진료 중단", "rgba(185,94,79,.20)");
  }
  function impactOverlay(data) {
    if (!data) return;
    if (Date.now() > data.until) { impact = null; return; }
    rect(165, 367, 390, 37, "rgba(18,41,47,.90)");
    ctx.save();
    ctx.font = "700 14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fffdf2"; ctx.fillText("결정 적용 · " + data.label, 360, 386);
    ctx.restore();
  }
  function storm(s, t) {
    if (!(s.stormUntil > s.tick)) return;
    ctx.fillStyle = "rgba(10,40,52,.18)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "#b6cfcc91";
    ctx.lineWidth = 2;
    for (let i = 0; i < 65; i++) {
      const x = ((i * 117 + t * .12) % (WIDTH + 40)) - 20;
      const y = ((i * 67 + t * .17) % (HEIGHT + 40)) - 20;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 17); ctx.stroke();
    }
  }
  function climate(s,t) {
    if (s.disasters?.flood > s.tick) {
      rect(65, 321, 590, 55, "rgba(70,145,169,.34)");
      ctx.strokeStyle="rgba(199,235,239,.72)";ctx.lineWidth=2;
      for(let i=0;i<12;i++){
        const y=330+i*4,x=80+(i*79+t*.012)%540;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+20,y);ctx.stroke();
      }
    }
    if (s.disasters?.heat > s.tick) {
      rect(0,0,WIDTH,HEIGHT,"rgba(232,159,76,.11)");
      rect(610,27,28,28,"rgba(255,225,151,.65)");
      rect(603,20,42,42,"rgba(244,183,109,.13)");
    }
    if (s.disasters?.dust > s.tick) {
      rect(0,0,WIDTH,HEIGHT,"rgba(172,141,89,.19)");
      for(let i=0;i<34;i++){
        const x=(i*131+t*.035)%(WIDTH+20),y=(i*83+t*.012)%(HEIGHT+20);
        rect(x,y,3,2,"rgba(218,193,142,.55)");
      }
    }
    if (s.disasters?.epidemic > s.tick && s.sick>0) {
      rect(0,0,WIDTH,HEIGHT,"rgba(113,137,133,.08)");
      // 진료소의 표시만 바꾸고 주민에게 병적 이미지를 붙이지 않는다.
      if (s.buildings.clinic) rect(528,141,7,7,"rgba(211,229,228,.90)");
    }
  }
  function redraw(t = elapsed) {
    if (!ctx || !latest) return;
    elapsed = t;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.imageSmoothingEnabled = false;
    background(latest, t);
    landscape(latest);
    buildings(latest);
    citizens(latest, t);
    climate(latest, t);
    storm(latest, t);
    stateSignals(latest);
    if (preview) previewOverlay(latest, preview);
    if (impact) impactOverlay(impact);
    if (latest.coldUntil > latest.tick) {
      rect(0, 0, WIDTH, HEIGHT, "rgba(215,232,241,.14)");
      ctx.fillStyle = "rgba(245,252,253,.9)";
      for (let i = 0; i < 46; i++) {
        const x = (i * 109 + t * .019) % (WIDTH + 15);
        const y = (i * 73 + t * .037) % (HEIGHT + 15);
        ctx.fillRect(Math.round(x), Math.round(y), 2 + (i % 2), 2 + (i % 2));
      }
      if (latest.warmth < 35) rect(0, 0, WIDTH, HEIGHT, "rgba(52,81,105,.16)");
    }
  }
  function loop(t) {
    // 장시간 실행 시 불필요한 렌더링을 줄인다 (약 12fps).
    if (t - elapsed > 80 && !document.hidden) redraw(t);
    frame = root.requestAnimationFrame(loop);
  }
  function mount(node) {
    canvas = node;
    ctx = node?.getContext?.("2d", { alpha: false }) || null;
    if (!ctx) return false;
    canvas.width = WIDTH; canvas.height = HEIGHT;
    ready = true;
    redraw();
    if (typeof root.requestAnimationFrame === "function") frame = root.requestAnimationFrame(loop);
    return true;
  }
  function setState(s) { latest = s; if (ready) redraw(); }
  function setPreview(choice) { preview = choice || null; if (ready) redraw(); }
  function impactChoice(choice, label) {
    preview = null;
    impact = { choice: choice || null, label: label || "선택", until: Date.now() + 1800 };
    if (ready) redraw();
  }
  root.IslandArt = Object.freeze({ mount, setState, setPreview, impactChoice, redraw, getActivitySnapshot, MAPS, ROUTE_NODES });
})(window);
