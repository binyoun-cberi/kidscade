(function () {
  'use strict';
  const S = window.SettlementSim, TILE = 32, W = 1024, H = 704;
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
  function create(canvas) {
    const c = canvas.getContext('2d');
    const terrain = document.createElement('canvas'); terrain.width = W; terrain.height = H;
    const g = terrain.getContext('2d');
    for (let y = 0; y < 22; y++) for (let x = 0; x < 32; x++) {
      rect(g, x * TILE, y * TILE, TILE, TILE, palette.grass[Math.floor(random(x, y) * 4)]);
      if (random(x, y, 1) > .55) { rect(g, x * TILE + 6, y * TILE + 12, 2, 4, '#75995755'); rect(g, x * TILE + 9, y * TILE + 10, 2, 6, '#aac77b'); }
    }
    // A winding river and its stepped bank remain outside all build/work sites.
    for (let y = 0; y < H; y += 8) {
      const bank = Math.floor((902 + Math.sin(y / 160) * 24) / 8) * 8;
      rect(g, bank - 12, y, W - bank + 12, 8, '#c8c49a'); rect(g, bank, y, W - bank, 8, palette.water);
      if ((y / 8) % 3 === 0) for (let x = bank + 16; x < W; x += 40) rect(g, x + (y % 16), y, 13, 2, '#91c0ae');
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
        const t = reducedMotion ? 0 : time;
        ellipse(c, CAMPX(), 366, 108, 70, '#c5ba8755');
        // Paths are functional links: workers move along these same direct routes.
        for (const type of ['wood', 'stone', 'food', 'clay']) {
          if (type === 'clay' && !s.flags.survey) continue;
          if (s.flags.road) line(c, S.CAMP, S.NODES[type], 18, '#c9ba88');
        }
        for (const b of s.buildings) line(c, S.CAMP, b, s.flags.road ? 15 : 9, '#cbbb8c');
        if (s.flags.road) { for (let i = 0; i < 18; i++) rect(c, 330 + i * 14, 351 + Math.sin(i) * 3, 4, 3, '#ab9f79'); }
        // Founder's canvas shelter and shared drop-off.
        c.fillStyle = '#e9d8a9'; c.beginPath(); c.moveTo(480, 366); c.lineTo(507, 315); c.lineTo(538, 366); c.closePath(); c.fill();
        c.fillStyle = '#bfa478'; c.beginPath(); c.moveTo(507, 315); c.lineTo(552, 352); c.lineTo(538, 366); c.closePath(); c.fill();
        c.fillStyle = '#655740'; c.beginPath(); c.moveTo(497, 365); c.lineTo(507, 338); c.lineTo(519, 365); c.closePath(); c.fill();
        rect(c, 529, 367, 21, 14, '#ac8c56'); rect(c, 531, 369, 17, 3, '#d1b77b'); rect(c, 536, 367, 3, 14, '#876d45');
        const drawables = s.buildings.map(b => ({ y: b.y, draw() {
          const x = b.x * TILE, y = b.y * TILE;
          if (b.type === 'hut') hut(c, x, y, s.era === 'neolithic');
          if (b.type === 'farm') farm(c, x, y, t, s.workers.some(w => w.job === 'farm'));
          if (b.type === 'fire') {
            ellipse(c, x, y + 4, 17, 7, '#998667'); rect(c, x - 12, y, 24, 5, '#7d6040');
            rect(c, x - 7, y - 12 - Math.sin(t * 8) * 2, 14, 17, '#d88b45'); rect(c, x - 3, y - 18, 6, 20, '#f3cd73');
            if (!reducedMotion) for (let i = 0; i < 3; i++) ellipse(c, x + Math.sin(t + i) * 6, y - 25 - ((t * 14 + i * 18) % 45), 4 + i, 3 + i, '#f4edce44');
          }
          if (b.type === 'warehouse') { hut(c, x, y, 1); rect(c, x - 30, y + 8, 13, 15, '#b09261'); rect(c, x + 22, y + 8, 12, 15, '#ae8956'); }
        } }));
        s.workers.forEach(w => drawables.push({ y: w.y, draw: () => person(c, w, t) }));
        drawables.sort((a, b) => a.y - b.y).forEach(d => d.draw());
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
        c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#8bc1b2'; c.save(); c.translate(971, 355); c.rotate(Math.PI / 2); c.fillText('여 울 강', 0, 0); c.restore();
      },
      hit(clientX, clientY) {
        const box = canvas.getBoundingClientRect();
        const point = { x: (clientX - box.left) / box.width * 32, y: (clientY - box.top) / box.height * 22 };
        let closest = null, min = 2.8;
        for (const [key, n] of Object.entries(S.NODES)) { const d = Math.hypot(point.x - n.x, point.y - n.y); if (d < min) { min = d; closest = key; } }
        return closest;
      }
    };
  }
  function CAMPX() { return S.CAMP.x * TILE; }
  window.SettlementView = { create };
})();
