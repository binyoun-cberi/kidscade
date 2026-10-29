(function () {
  'use strict';
  const S = window.SettlementSim, TILE = 32, W = 1536, H = 1024;
  const palette = { grass: ['#91b86a', '#95bc6f', '#8db367', '#92b66c'], water: '#679f99', sand: '#d7cba0', ink: '#314d37' };
  function random(x, y, salt = 0) { let n = (x * 374761393 + y * 668265263 + salt * 1447) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  function rect(c, x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(Math.round(x), Math.round(y), w, h); }
  function ellipse(c, x, y, rx, ry, fill) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
  function tree(c, x, y, scale = 1, seed = 0) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    ellipse(c, 2, 10, 15, 6, '#547c3e32'); rect(c, -3, -3, 6, 15, '#896441'); rect(c, 1, 1, 3, 10, '#654e36');
    const dark = seed > .5 ? '#456d3b' : '#4b773e', light = seed > .5 ? '#6c9347' : '#78a44f';
    rect(c, -10, -25, 20, 28, dark); rect(c, -16, -17, 30, 17, dark); rect(c, -11, -29, 18, 20, light); rect(c, -16, -16, 17, 9, light); rect(c, -6, -34, 10, 12, '#91b45f');
    c.restore();
  }
  function rock(c, x, y, size = 1) {
    c.save(); c.translate(x, y); c.scale(size, size); ellipse(c, 1, 5, 12, 5, '#4e69452f');
    c.fillStyle = '#727f75'; c.beginPath(); c.moveTo(-12, 4); c.lineTo(-10, -7); c.lineTo(-3, -14); c.lineTo(7, -11); c.lineTo(13, -3); c.lineTo(11, 5); c.closePath(); c.fill();
    c.fillStyle = '#a8b2a2'; c.beginPath(); c.moveTo(-9, -5); c.lineTo(-3, -12); c.lineTo(6, -9); c.lineTo(2, -3); c.closePath(); c.fill(); rect(c, 3, -2, 7, 6, '#879385'); c.restore();
  }
  function hut(c, x, y, version = 0) {
    ellipse(c, x, y + 16, 29, 11, '#43633a28'); rect(c, x - 21, y - 4, 42, 23, '#cdb785'); rect(c, x - 21, y + 12, 42, 6, '#b09b6b');
    c.fillStyle = version ? '#a56b45' : '#ac8550'; c.beginPath(); c.moveTo(x - 29, y + 1); c.lineTo(x - 19, y - 19); c.lineTo(x, y - 31); c.lineTo(x + 19, y - 19); c.lineTo(x + 29, y + 1); c.closePath(); c.fill();
    c.strokeStyle = version ? '#ca9465' : '#d0ad70'; c.lineWidth = 2;
    for (let i = -18; i <= 18; i += 6) { c.beginPath(); c.moveTo(x + i * .4, y - 23); c.lineTo(x + i, y - 3); c.stroke(); }
    rect(c, x - 6, y + 3, 12, 16, '#5f5034'); rect(c, x - 3, y + 5, 5, 13, '#3f4330'); rect(c, x + 11, y + 5, 5, 5, '#75633f');
  }
  function farm(c, x, y, time, workers) {
    rect(c, x - 42, y - 28, 84, 60, '#ad8856'); rect(c, x - 40, y - 26, 80, 56, '#b99765');
    for (let row = 0; row < 4; row++) for (let col = 0; col < 7; col++) {
      const xx = x - 33 + col * 11, yy = y - 19 + row * 13;
      rect(c, xx, yy, 2, 9, '#698044'); rect(c, xx - 2, yy + 1, 5, 3, workers ? '#dfc270' : '#8fa750');
      if (workers) rect(c, xx - 1, yy - 2, 3, 5, '#e4ce83');
    }
    for (let i = -40; i <= 40; i += 20) { rect(c, x + i, y + 29, 2, 8, '#876641'); }
  }
  function historic(c, b, s, time) {
    const x = b.x * TILE, y = b.y * TILE;
    ellipse(c, x, y + 17, 30, 9, '#36533122');
    if (['kiln', 'ironFurnace', 'forge'].includes(b.type)) {
      rect(c, x - 20, y - 13, 40, 30, '#9e8667'); rect(c, x - 13, y - 29, 26, 18, '#b09c7b');
      rect(c, x - 9, y + 1, 18, 16, '#574b3d'); rect(c, x - 6, y + 4, 12, 10, '#d18c47'); rect(c, x - 2, y, 5, 12, '#edc169');
    } else if (b.type === 'dolmen') {
      rect(c, x - 20, y - 3, 9, 22, '#8d9986'); rect(c, x + 11, y - 3, 9, 22, '#7c8978'); rect(c, x - 30, y - 14, 60, 14, '#a3ae98'); rect(c, x - 26, y - 17, 51, 5, '#bec7ad');
    } else if (b.type === 'fort') {
      for (let i = 0; i < 5; i++) { rect(c, x - 40 + i * 17, y - 18, 16, 35, '#9eac90'); rect(c, x - 40 + i * 17, y - 23, 10, 8, '#afba9c'); }
      rect(c, x - 8, y + 1, 16, 17, '#5c6d52');
    } else if (['dock', 'seaRoute', 'goryeoHarbor'].includes(b.type)) {
      rect(c, x - 18, y - 7, 85, 15, '#b08e59');
      for (let i = 0; i < 7; i++) rect(c, x - 16 + i * 12, y - 7, 2, 15, '#d1b273');
      rect(c, x + 34, y - 5, 4, 31, '#8e7048'); rect(c, x + 53, y - 5, 4, 31, '#8e7048');
      const boatX = Math.min(970, x + 85), boatY = y + 22 + Math.sin(time) * 2;
      rect(c, boatX - 16, boatY, 32, 8, '#846a47'); rect(c, boatX - 9, boatY + 8, 18, 4, '#6a5b42'); rect(c, boatX - 1, boatY - 26, 2, 29, '#7e6e4a'); rect(c, boatX + 1, boatY - 23, 15, 18, '#e4dab4');
    } else if (b.type === 'prospect') {
      rock(c, x - 10, y + 8, 1); rock(c, x + 14, y + 5, .8); rect(c, x - 10, y - 3, 5, 5, '#cc925e'); rect(c, x + 12, y - 3, 5, 5, '#c6cfbd');
    } else if (b.type === 'bronzeRitual') {
      rect(c, x - 16, y + 7, 32, 9, '#b79c6b'); rect(c, x - 4, y - 19, 8, 28, '#9b9559'); rect(c, x - 11, y - 8, 22, 4, '#c6ad69');
    } else if (b.type === 'ironTools') {
      rect(c, x - 20, y + 4, 40, 12, '#a58e63'); rect(c, x - 10, y - 17, 3, 25, '#8b714b'); rect(c, x - 10, y - 18, 14, 6, '#8b9d94');
    } else {
      rect(c, x - 23, y - 6, 46, 25, '#d5c69c'); rect(c, x - 28, y - 14, 56, 10, '#637a72'); rect(c, x - 20, y - 20, 40, 7, '#718b7e');
      rect(c, x - 5, y + 4, 10, 15, '#667161'); rect(c, x + 11, y + 1, 6, 7, '#8a9a80');
      if (['paperWorkshop', 'woodblock', 'movableType', 'taebongRecord'].includes(b.type)) { rect(c, x - 30, y + 9, 17, 10, '#a58a59'); rect(c, x - 28, y + 7, 14, 3, '#f0e6c9'); }
      if (b.type === 'gayaMarket') { rect(c, x + 23, y + 6, 15, 13, '#a68e60'); rect(c, x + 25, y + 4, 11, 4, '#9da99a'); }
    }
    if (S.History.PROJECTS[b.type].chapter === s.history.active) { c.strokeStyle = '#f5e9b3'; c.lineWidth = 2; c.strokeRect(x - 34, y - 32, 68, 56); }
  }
  function person(c, w, t) {
    const x = w.x * TILE, y = w.y * TILE, walking = w.phase === 'walk' || w.phase === 'return';
    const bob = walking ? Math.sin(t * 12 + w.id) * 1.5 : 0;
    const colors = ['#b96f4a', '#5c7981', '#ba9a4f', '#77724a', '#a16e6b', '#477964', '#b4834a', '#7b6c84'];
    ellipse(c, x, y + 9, 8, 3, '#314d3733');
    rect(c, x - 4, y + 4, 3, 7 + (walking ? Math.sin(t * 12) * 2 : 0), '#5c5343'); rect(c, x + 1, y + 4, 3, 7 - (walking ? Math.sin(t * 12) * 2 : 0), '#5c5343');
    rect(c, x - 6, y - 7 + bob, 12, 14, colors[w.id - 1]); rect(c, x - 5, y - 16 + bob, 10, 10, '#d5ad7b'); rect(c, x - 6, y - 18 + bob, 12, 5, '#5e503c'); rect(c, x + 2, y - 12 + bob, 2, 2, '#403b2e');
    if (w.cargo) { rect(c, x + 5, y - 7 + bob, 7, 9, '#d1b56c'); rect(c, x + 7, y - 6 + bob, 2, 8, '#9c7e4d'); }
    if (w.phase === 'work') { const arm = Math.sin(t * 8 + w.id) * 3; rect(c, x + 5, y - 4 + arm, 7, 3, '#d5ad7b'); rect(c, x + 10, y - 9 + arm, 2, 9, '#7c6a44'); }
    if (w.job === 'idle') { c.fillStyle = '#f7f0d7'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillText('…', x, y - 24); }
  }
  function line(c, a, b, width, color) { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x * TILE, a.y * TILE); c.lineTo(b.x * TILE, b.y * TILE); c.stroke(); }
  function label(c, x, y, title, selected = false) {
    c.font = 'bold 15px "Malgun Gothic",sans-serif'; const width = c.measureText(title).width + 24;
    c.fillStyle = selected ? '#294d3e' : '#f6f3dcdd'; c.beginPath(); c.roundRect(x - width / 2, y - 14, width, 28, 7); c.fill(); c.fillStyle = selected ? '#fff4d2' : '#4b6649'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(title, x, y + 1);
  }
  function rabbitPoint(s, reduced = false) { const t = reduced ? 0 : s.time; return { x: 13 + Math.sin(t * .7) * 3, y: 4 + Math.sin(t * .43) * 1.3 }; }
  function create(canvas) {
    const c = canvas.getContext('2d');
    let motionReduced = false;
    const terrain = document.createElement('canvas'); terrain.width = W; terrain.height = H;
    const g = terrain.getContext('2d');
    for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) {
      rect(g, x * TILE, y * TILE, TILE, TILE, palette.grass[Math.floor(random(x, y) * 4)]);
      if (random(x, y, 1) > .55) { rect(g, x * TILE + 6, y * TILE + 12, 2, 4, '#75995755'); rect(g, x * TILE + 9, y * TILE + 10, 2, 6, '#aac77b'); }
    }
    // A winding river and its stepped bank remain outside all build/work sites.
    for (let y = 0; y < H; y += 8) {
      const bank = Math.floor((902 + Math.sin(y / 160) * 24) / 8) * 8;
      rect(g, bank - 12, y, 132, 8, '#c8c49a'); rect(g, bank, y, 108, 8, palette.water);
      if ((y / 8) % 3 === 0) for (let x = bank + 16; x < bank + 104; x += 40) rect(g, x + (y % 16), y, 13, 2, '#91c0ae');
    }
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(random(i, 3) * 27 + 1), y = Math.floor(random(i, 4) * 20 + 1);
      if (x >= 10 && x <= 22 && y >= 7 && y <= 17) continue;
      if (Object.values(S.NODES).some(n => Math.hypot(n.x - x, n.y - y) < 2.4)) continue;
      if (x < 4 || y < 3 || (x < 11 && y < 9)) tree(g, x * TILE, y * TILE, .8 + random(i, 7) * .45, random(i, 8));
      else if (random(i, 9) > .7) { rect(g, x * TILE, y * TILE, 3, 3, '#e5d591'); rect(g, x * TILE + 4, y * TILE + 3, 2, 2, '#e7e4b4'); }
    }
    const woods = S.NODES.wood;
    for (let i = 0; i < 14; i++) tree(g, (woods.x - 1.7 + random(i, 12) * 3.4) * TILE, (woods.y - 1 + random(i, 15) * 2.4) * TILE, .9 + random(i, 5) * .3, random(i, 20));
    for (let i = 0; i < 12; i++) rock(g, (22.5 + random(i, 34) * 3) * TILE, (4.8 + random(i, 31) * 2.4) * TILE, .6 + random(i, 30) * .8);
    for (let i = 0; i < 9; i++) { const x = (5.7 + random(i, 40) * 2.5) * TILE, y = (15 + random(i, 41) * 1.8) * TILE; ellipse(g, x, y, 14, 10, '#6f8e48'); rect(g, x - 6, y - 4, 4, 4, '#bd7956'); rect(g, x + 4, y + 2, 4, 4, '#d69b5c'); }
    for (let i = 0; i < 7; i++) ellipse(g, (24 + random(i, 51) * 2.1) * TILE, (14.2 + random(i, 52) * 1.9) * TILE, 11, 7, '#b69a72');
    return {
      draw(s, selected, time, reducedMotion) {
        c.clearRect(0, 0, W, H); c.drawImage(terrain, 0, 0);
        const t = reducedMotion ? 0 : time; motionReduced = reducedMotion;
        ellipse(c, CAMPX(), 366, 108, 70, '#c5ba8755');
        // Paths are functional links: workers move along these same direct routes.
        for (const type of ['wood', 'stone', 'food', 'clay']) {
          if (type === 'clay' && !s.flags.survey) continue;
          if (s.flags.road) line(c, S.CAMP, S.NODES[type], 18, '#c9ba88');
        }
        for (const b of s.buildings) {
          if (b.x > 30) { line(c, { x: 31.5, y: 11 }, { x: b.x, y: 11 }, 12, '#cbbb8c'); line(c, { x: b.x, y: 11 }, b, 12, '#cbbb8c'); }
          else line(c, S.CAMP, b, s.flags.road ? 15 : 9, '#cbbb8c');
        }
        if (s.civilization.homes) { line(c, S.CAMP, { x: 31.5, y: 11 }, 14, '#cbbb8c'); rect(c, 884, 341, 137, 22, '#a28459'); for (let i = 0; i < 12; i++) rect(c, 885 + i * 12, 342, 2, 20, '#d1b17b'); }
        if (s.flags.road) { for (let i = 0; i < 18; i++) rect(c, 330 + i * 14, 351 + Math.sin(i) * 3, 4, 3, '#ab9f79'); }
        // Founder's canvas shelter and shared drop-off.
        c.fillStyle = '#e9d8a9'; c.beginPath(); c.moveTo(480, 366); c.lineTo(507, 315); c.lineTo(538, 366); c.closePath(); c.fill();
        c.fillStyle = '#bfa478'; c.beginPath(); c.moveTo(507, 315); c.lineTo(552, 352); c.lineTo(538, 366); c.closePath(); c.fill();
        c.fillStyle = '#655740'; c.beginPath(); c.moveTo(497, 365); c.lineTo(507, 338); c.lineTo(519, 365); c.closePath(); c.fill();
        rect(c, 529, 367, 21, 14, '#ac8c56'); rect(c, 531, 369, 17, 3, '#d1b77b'); rect(c, 536, 367, 3, 14, '#876d45');
        const drawables = s.buildings.map(b => ({ y: b.y, draw() {
          const x = b.x * TILE, y = b.y * TILE;
          if (b.type === 'hut') {
            if (s.era !== 'paleolithic') hut(c, x, y, s.era !== 'neolithic');
            else { c.fillStyle = '#cab287'; c.beginPath(); c.moveTo(x - 24, y + 17); c.lineTo(x, y - 25); c.lineTo(x + 25, y + 17); c.closePath(); c.fill(); rect(c, x - 4, y, 8, 17, '#6b6048'); }
          }
          if (b.type === 'farm') {
            farm(c, x, y, t, s.prehistory.crops.some(n => n >= 20));
            if (b === s.buildings.find(a => a.type === 'farm')) for (let i = 0; i < 6; i++) {
              const xx = x - 27 + (i % 3) * 27, yy = y - 12 + Math.floor(i / 3) * 26;
              ellipse(c, xx, yy, 8, 8, s.prehistory.crops[i] >= 20 ? '#efd27b' : '#66864d');
            }
          }
          if (S.Prehistory.PROJECTS[b.type]) { hut(c, x, y, 0); rect(c, x - 25, y + 12, 17, 8, '#a08a65'); }
          if (b.type === 'fire') {
            ellipse(c, x, y + 4, 17, 7, '#998667'); rect(c, x - 12, y, 24, 5, '#7d6040');
            if (s.prehistory.fuel > 0) { rect(c, x - 7, y - 12 - Math.sin(t * 8) * 2, 14, 17, '#d88b45'); rect(c, x - 3, y - 18, 6, 20, '#f3cd73');
            if (!reducedMotion) for (let i = 0; i < 3; i++) ellipse(c, x + Math.sin(t + i) * 6, y - 25 - ((t * 14 + i * 18) % 45), 4 + i, 3 + i, '#f4edce44'); }
          }
          if (b.type === 'warehouse') { hut(c, x, y, 1); rect(c, x - 30, y + 8, 13, 15, '#b09261'); rect(c, x + 22, y + 8, 12, 15, '#ae8956'); }
          if (S.Civilization.PROJECTS[b.type]) {
            const d = S.Civilization.PROJECTS[b.type];
            if (d.homes) {
              const visible = Math.min(30, d.homes), cols = Math.min(6, Math.ceil(Math.sqrt(visible)));
              for (let i = 0; i < visible; i++) { c.save(); c.translate(x - 65 + i % cols * 27, y - 45 + Math.floor(i / cols) * 23); c.scale(.42, .42); hut(c, 0, 0, s.era !== 'neolithic'); c.restore(); }
              farm(c, x - 43, y + 93, t, true); label(c, x, y - 78, `${d.homes}가구 · 주거 구역`);
              if (!reducedMotion && s.civilization.citizens > 0) { const px = x - 60 + ((t * 9 + b.x) % 120); person(c, { id: 1, x: px / TILE, y: (y + 69) / TILE, phase: 'walk' }, t); }
            } else if (b.type === 'civicMonument') {
              rect(c, x - 33, y + 8, 66, 10, '#a3ac90'); rect(c, x - 23, y - 28, 46, 37, '#c6bc99'); rect(c, x - 14, y - 18, 28, 20, '#e6dab2');
              label(c, x, y - 48, '도시의 공동 기록');
            } else if (b.type === 'fishingHut') {
              rect(c, x - 18, y - 12, 42, 29, '#b59465'); for (let i = 0; i < 4; i++) { line(c, { x: (x + 30) / TILE, y: (y - 15 + i * 7) / TILE }, { x: (x + 65) / TILE, y: (y + i * 7) / TILE }, 1, '#e1dab8'); }
              label(c, x, y + 42, '어로터');
            } else {
              rect(c, x - 24, y - 8, 48, 25, '#c5ad7c'); rect(c, x - 28, y - 18, 56, 12, '#8d7955');
              if (b.type === 'woodshop') { rect(c, x - 28, y + 8, 55, 6, '#8a6744'); rect(c, x - 22, y + 2, 39, 5, '#caa674'); }
              if (b.type === 'spinningHut') { ellipse(c, x, y, 12, 12, '#ded5b3'); rect(c, x - 1, y - 20, 2, 36, '#866a44'); }
              if (b.type === 'sewingHut') { rect(c, x - 14, y - 5, 28, 20, '#aebba0'); rect(c, x - 6, y - 12, 12, 28, '#b7c2ad'); }
              if (b.type === 'maintenance') { rock(c, x + 6, y + 7, .7); rect(c, x - 12, y - 8, 3, 23, '#886d46'); }
              label(c, x, y + 41, d.name);
            }
          }
          if (S.Bronze.PROJECTS[b.type]) {
            if (b.type === 'broadField') {
              rect(c, x - 98, y - 38, 196, 82, '#aa8053');
              for (let i = 0; i < 12; i++) {
                const xx = x - 80 + i % 6 * 32, yy = y - 18 + Math.floor(i / 6) * 36;
                const ripe = s.bronze.crops[i] >= S.Bronze.growthTime(s, i);
                rect(c, xx - 1, yy - 9, 3, 22, '#687944');
                rect(c, xx - 7, yy - 13, 15, 8, ripe ? '#efcf77' : '#8da651');
                if (ripe) rect(c, xx - 4, yy - 18, 9, 9, '#eed78b');
              }
              label(c, x, y + 65, `넓은 밭 · 수확 묶음 ${s.bronze.bundles}`);
            } else if (b.type === 'mumunStore') {
              hut(c, x, y, 0);
              for (let i = 0; i < 3; i++) { rect(c, x - 30 + i * 23, y + 9, 17, 26, '#b48a5e'); ellipse(c, x - 21 + i * 23, y + 9, 7, 3, '#735b40'); }
              label(c, x, y + 58, `토기·저장 곡물 ${s.bronze.grain}`);
            } else if (b.type === 'castingWorkshop') {
              rect(c, x - 27, y - 10, 54, 30, '#b49c70'); rect(c, x - 30, y - 20, 60, 12, '#94764d');
              rect(c, x - 22, y + 9, 44, 8, '#705d42'); rect(c, x - 13, y + 6, 22, 6, '#a99d62');
              const task = s.civilization.tasks.bronze;
              label(c, x, y + 50, task ? `청동 제작 ${task.phase === 'delivery' ? '입고' : Math.floor(task.progress / task.duration * 100) + '%'}` : '거푸집 주조 작업터');
            } else if (b.type === 'villageFence') {
              for (let i = 0; i < 10; i++) rect(c, x - 75 + i * 16, y - 15, 6, 36, '#917047');
              rect(c, x - 75, y - 5, 150, 5, '#c1a16b'); label(c, x, y + 48, '공동 울타리 모형');
            } else if (b.type === 'riceField') {
              rect(c, x - 40, y - 26, 80, 58, '#85a694'); farm(c, x, y, t, true); label(c, x, y + 54, '일부 지역 · 벼농사 시험');
            } else { rect(c, x - 28, y - 4, 56, 22, '#b49666'); rect(c, x - 35, y - 18, 70, 15, '#b98358'); label(c, x, y + 49, '여유분 물물교환'); }
          }
          if (S.History.PROJECTS[b.type]) historic(c, b, s, t);
        } }));
        s.workers.forEach(w => drawables.push({ y: w.y, draw: () => person(c, w, t) }));
        drawables.sort((a, b) => a.y - b.y).forEach(d => d.draw());
        if (s.bronze.delivery) {
          const start = S.PROJECTS.broadField.sites[0], end = S.PROJECTS.mumunStore.sites[0], ratio = Math.min(1, s.bronze.delivery.progress / 2);
          const x = (start.x + (end.x - start.x) * ratio) * TILE, y = (start.y + (end.y - start.y) * ratio) * TILE;
          rect(c, x - 7, y - 9, 14, 20, '#ba895c'); ellipse(c, x, y - 9, 6, 3, '#7c6346');
        }
        if (s.flags.pottery) { ellipse(c, 582, 445, 9, 5, '#aa7850'); rect(c, 574, 429, 16, 16, '#b6865a'); rect(c, 577, 426, 10, 4, '#886c48'); ellipse(c, 604, 447, 6, 4, '#b7855b'); }
        if (s.flags.tools) { rect(c, 461, 372, 15, 5, '#99815c'); rect(c, 467, 356, 3, 18, '#775e3e'); rect(c, 462, 354, 11, 6, '#9aab98'); }
        if (s.project) {
          const x = s.project.site.x * TILE, y = s.project.site.y * TILE;
          c.strokeStyle = '#f5ecd0'; c.lineWidth = 2; c.setLineDash([5, 5]); c.strokeRect(x - 30, y - 24, 60, 48); c.setLineDash([]);
          rect(c, x - 25, y + 29, 50, 5, '#5f7149'); rect(c, x - 25, y + 29, 50 * Math.min(1, s.project.progress / S.PROJECTS[s.project.type].time), 5, '#f0d78b');
          label(c, x, y - 42, '공사·작업 중');
        }
        for (const [key, n] of Object.entries(S.NODES)) {
          if (key === 'clay' && !s.flags.survey) { label(c, n.x * TILE, (n.y + 1.6) * TILE, '강가 · 조사 필요'); continue; }
          const isSelected = selected === key;
          if (isSelected) { c.strokeStyle = '#f7edb7'; c.lineWidth = 3; c.setLineDash([6, 5]); c.beginPath(); c.ellipse(n.x * TILE, n.y * TILE, 58, 35, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
          label(c, n.x * TILE, (n.y + 1.6) * TILE, n.name, isSelected);
          if (s.manual.node === key && s.manual.progress > 0) { rect(c, n.x * TILE - 26, n.y * TILE + 25, 52, 5, '#4f704d'); rect(c, n.x * TILE - 26, n.y * TILE + 25, s.manual.progress / 6 * 52, 5, '#f6d18b'); }
        }
        const rabbit = rabbitPoint(s, motionReduced), rx = rabbit.x * TILE, ry = rabbit.y * TILE;
        if (s.prehistory.rabbit.respawn <= 0) {
          ellipse(c, rx, ry + 7, 18, 5, '#42613c33'); ellipse(c, rx, ry, 14, 9, '#ddd9bc');
          ellipse(c, rx + 10, ry - 7, 8, 8, '#ede6cc'); rect(c, rx + 8, ry - 25, 4, 15, '#ede6cc'); rect(c, rx + 14, ry - 24, 4, 15, '#ddd9bc');
          rect(c, rx + 13, ry - 9, 2, 2, '#3d4c39'); ellipse(c, rx - 14, ry, 5, 5, '#f7eed6');
          rect(c, rx - 18, ry + 15, 36, 4, '#55744c'); rect(c, rx - 18, ry + 15, 36 * s.prehistory.rabbit.hp / 18, 4, '#f0ce81');
          label(c, rx, ry + 40, '토끼 · 눌러 사냥');
        }
        if (s.prehistory.shellVisible) {
          const sx = 27 * TILE, sy = 12 * TILE; ellipse(c, sx, sy, 12, 9, '#f5dfba');
          for (let i = -1; i <= 1; i++) rect(c, sx + i * 5, sy - 5, 2, 9, '#c8a787');
          label(c, sx, sy + 28, '조개 발견');
        }
        if (!S.count(s, 'fire')) { rect(c, 546, 328, 20, 5, '#816447'); if (s.prehistory.fuel > 0) { rect(c, 551, 319, 9, 10, '#d5a25c'); } }
        c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#8bc1b2'; c.save(); c.translate(971, 355); c.rotate(Math.PI / 2); c.fillText('여 울 강', 0, 0); c.restore();
      },
      hit(clientX, clientY, s) {
        const box = canvas.getBoundingClientRect();
        const point = { x: (clientX - box.left) / box.width * 48, y: (clientY - box.top) / box.height * 32 };
        if (s) {
          const huntTool = S.Civilization.toolFor(s, 'hunt', S.Prehistory), radius = ['arrowhead', 'stoneSpear', 'point'].includes(huntTool) ? 1.8 : 1.15;
          if (s.prehistory.rabbit.respawn <= 0 && Math.hypot(point.x - rabbitPoint(s, motionReduced).x, point.y - rabbitPoint(s, motionReduced).y) < radius) return 'rabbit';
          if (s.prehistory.shellVisible && Math.hypot(point.x - 27, point.y - 12) < 1) return 'shell';
          const bronzeField = s.buildings.find(b => b.type === 'broadField');
          if (bronzeField && Math.abs(point.x - bronzeField.x) < 3 && Math.abs(point.y - bronzeField.y) < 1.25) {
            const col = Math.max(0, Math.min(5, Math.round(point.x - bronzeField.x + 2.5)));
            return `bronzeCrop:${col + (point.y > bronzeField.y ? 6 : 0)}`;
          }
          const field = s.buildings.find(b => b.type === 'farm');
          if (field && Math.abs(point.x - field.x) < 1.3 && Math.abs(point.y - field.y) < 1) {
            const col = Math.max(0, Math.min(2, Math.round((point.x - field.x) / .84) + 1));
            return `crop:${col + (point.y > field.y ? 3 : 0)}`;
          }
        }
        let closest = null, min = 2.8;
        for (const [key, n] of Object.entries(S.NODES)) { const d = Math.hypot(point.x - n.x, point.y - n.y); if (d < min) { min = d; closest = key; } }
        return closest;
      }
    };
  }
  function CAMPX() { return S.CAMP.x * TILE; }
  window.SettlementView = { create };
})();
