/* 열두 명의 섬 — 기존 Kenney Tiny Town/Farm의 16px 타일을 사용하는 마을 렌더러. */
((root) => {
  "use strict";
  const BASE = "../../assets/game/2d/tilesets/";
  const MAPS = {
    town: BASE + "kenney-tiny-town/atlas/tilemap-packed.png",
    farm: BASE + "kenney-tiny-farm/atlas/tilemap-packed.png"
  };
  const images = {};
  let canvas = null, ctx = null, latest = null, ready = false, elapsed = 0, frame = 0;
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
  function citizens(s, t) {
    const N = Math.min(s.population, 16);
    const spots = [
      [269,237],[307,221],[390,235],[426,246],[287,273],[403,289],
      [247,291],[463,206],[274,173],[441,165],[364,305],[216,246],
      [475,288],[356,167],[525,219],[305,314]
    ];
    for (let i = 0; i < N; i++) {
      const [px, py] = spots[i], wiggle = s.pending ? 0 : Math.sin(t * .0013 + i * 2) * 4;
      const x = px + (i % 2 ? wiggle : -wiggle), y = py + Math.sin(t * .001 + i) * 2;
      sprite("farm", i % 3 === 0 ? 108 : 109, x, y, 1.65);
    }
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
  function redraw(t = elapsed) {
    if (!ctx || !latest) return;
    elapsed = t;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.imageSmoothingEnabled = false;
    background(latest, t);
    landscape(latest);
    buildings(latest);
    citizens(latest, t);
    storm(latest, t);
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
  root.IslandArt = Object.freeze({ mount, setState, redraw, MAPS });
})(window);
