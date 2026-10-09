/* Rune Forest pixel-art bridge. All images are existing Kenney CC0 assets.
 * Canvas primitives remain as offline/loading fallbacks; no 3D renderer is needed.
 */
(() => {
  'use strict';
  const base = new URL('../../assets/game/2d/platformer-art/', document.currentScript?.src || location.href);
  const paths = {
    heroFront: 'base/player/p1-front.png',
    heroStand: 'base/player/p1-stand.png',
    heroWalk1: 'base/player/p1-walk/png/p1-walk01.png',
    heroWalk2: 'base/player/p1-walk/png/p1-walk02.png',
    heroWalk3: 'base/player/p1-walk/png/p1-walk03.png',
    heroWalk4: 'base/player/p1-walk/png/p1-walk04.png',
    slimeGreen: 'extended/enemies/slime-green.png',
    slimeGreenHit: 'extended/enemies/slime-green-hit.png',
    slimeGreenDead: 'extended/enemies/slime-green-dead.png',
    slimeBlue: 'extended/enemies/slime-blue.png',
    slimeBlueHit: 'extended/enemies/slime-blue-hit.png',
    blocker: 'base/enemies/blocker-body.png',
    bush: 'base/items/bush.png',
    grass: 'base/items/plant.png',
    purple: 'base/items/plant-purple.png',
    mushroomRed: 'base/items/mushroom-red.png',
    mushroomBrown: 'base/items/mushroom-brown.png',
    rock: 'base/items/rock.png',
    rockMoss: 'expansions/buildings/rock-moss.png',
    gemGreen: 'base/items/gem-green.png',
    gemBlue: 'base/items/gem-blue.png'
  };
  const sprites = Object.create(null);
  for (const [key, path] of Object.entries(paths)) {
    const img = new Image();
    sprites[key] = { img, ready: false };
    img.decoding = 'async';
    img.onload = () => { sprites[key].ready = img.naturalWidth > 0; };
    img.onerror = () => { sprites[key].ready = false; };
    img.src = new URL(path, base).href;
  }
  // All coordinates are logical canvas pixels. x/y denote the bottom center.
  function sprite(g, key, x, y, w, h, opacity = 1) {
    const entry = sprites[key];
    if (!entry?.ready) return false;
    g.save();
    g.globalAlpha *= opacity;
    g.imageSmoothingEnabled = false;
    g.drawImage(entry.img, Math.round(x - w / 2), Math.round(y - h), w, h);
    g.restore();
    return true;
  }
  function block(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  }
  function ellipse(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(Math.round(x), Math.round(y), w, h, 0, 0, Math.PI * 2);
    g.fill();
  }
  function flora(g, x, y, n, phase) {
    // Keep the central shrine and the player's starting lane readable.
    if (n > .81 && n < .87) {
      sprite(g, 'bush', x + 18, y + 34, 29, 24, .86);
    } else if (n > .57 && n < .64) {
      sprite(g, 'grass', x + 13, y + 30, 22, 25, .88);
    } else if (n > .685 && n < .718) {
      sprite(g, 'purple', x + 28, y + 30, 22, 24, phase % 2 ? .95 : .72);
    } else if (n > .11 && n < .14) {
      sprite(g, n > .126 ? 'mushroomRed' : 'mushroomBrown', x + 28, y + 31, 21, 24, .95);
    } else if (n > .39 && n < .421) {
      sprite(g, 'rockMoss', x + 17, y + 33, 28, 25, .87);
    }
  }
  function hero(g, x, y, game) {
    if (!sprites.heroFront.ready && !sprites.heroStand.ready) return false;
    const moving = Boolean(game.moving);
    const frame = Math.floor(game.t * 9) % 4 + 1;
    const key = moving && sprites['heroWalk' + frame]?.ready ? 'heroWalk' + frame :
      game.angle > -.785 && game.angle < 2.355 ? 'heroFront' : 'heroStand';
    const bob = moving ? Math.round(Math.sin(game.t * 18) * 1.2) : Math.round(Math.sin(game.t * 2.2) * .5);
    ellipse(g, x, y + 9, 13, 4, '#102525aa');
    // A short indigo cloak and staff turn the CC0 adventurer into a rune keeper.
    block(g, x - 10, y - 12 + bob, 20, 20, '#282c57');
    block(g, x - 8, y + 5 + bob, 16, 7, '#45406d');
    block(g, x - 12, y - 16 + bob, 2, 23, '#b59460');
    block(g, x - 13, y - 18 + bob, 4, 5, '#94dced');
    sprite(g, key, x + 1, y + 9 + bob, 25, 31);
    block(g, x - 3, y + 1 + bob, 6, 3, '#e2c681');
    return true;
  }
  function enemy(g, e, x, y, numberText, active, phaseTime) {
    if (e.factor) {
      // Massive rocky body, with a Kenney moss-rock crest and blocker core.
      ellipse(g, x, y + 23, 24, 6, '#1026289a');
      block(g, x - 23, y - 11, 46, 31, e.hit ? '#bbb6ca' : '#777f8b');
      block(g, x - 29, y - 5, 8, 24, '#4b5867');
      block(g, x + 21, y - 5, 8, 24, '#4b5867');
      block(g, x - 19, y + 18, 13, 8, '#444e5f');
      block(g, x + 6, y + 18, 13, 8, '#444e5f');
      if (sprites.blocker.ready) sprite(g, 'blocker', x, y + 14, 38, 35, .20);
      if (sprites.rockMoss.ready) sprite(g, 'rockMoss', x, y - 13, 54, 27);
      else block(g, x - 18, y - 24, 36, 11, '#a4a1b5');
      block(g, x - 16, y - 15, 8, 4, '#ffe092');
      block(g, x + 8, y - 15, 8, 4, '#ffe092');
      // Fractures grow as the number is divided. They are purely visual.
      if (e.n < e.original) {
        block(g, x - 22, y - 1, 12, 2, '#b6d9db');
        block(g, x - 12, y + 1, 2, 10, '#b6d9db');
      }
      if (e.n <= e.original / 4) {
        block(g, x + 9, y - 3, 3, 12, '#c8e6d2');
        block(g, x + 12, y + 5, 9, 2, '#c8e6d2');
      }
      block(g, x - 19, y - 6, 38, 25, '#202c3c');
      block(g, x - 17, y - 4, 34, 21, '#384357');
      numberText(e.n, x, y + 6, '#fff1c2', e.n > 999 ? 11 : 15);
      if (e.hit) numberText('÷' + active, x, y - 42, '#adf7da', 12);
      if (e.blocked) numberText('×', x, y - 47, '#ff8c9f', 15);
      return true;
    }
    const key = e.n % 3 === 0 ? 'slimeBlue' : 'slimeGreen';
    if (!sprites[key].ready) return false;
    ellipse(g, x, y + 10, 12, 3, '#102928aa');
    const bob = Math.round(Math.sin(e.wiggle) * 2);
    const squash = 1 + Math.sin(e.wiggle) * .05;
    g.save();
    g.translate(Math.round(x), Math.round(y + bob + 10));
    g.scale(squash, 1 / squash);
    sprite(g, key, 0, 0, 30, 25);
    if (e.hit) sprite(g, key === 'slimeBlue' ? 'slimeBlueHit' : 'slimeGreenHit', 0, 0, 30, 25, .45);
    g.restore();
    block(g, x - 12, y - 4 + bob, 24, 16, '#263b46');
    block(g, x - 10, y - 2 + bob, 20, 12, '#354655');
    numberText(e.n, x, y + 4 + bob, '#fff1c0', 13);
    if (e.blocked) numberText('×', x, y - 26, '#ff95ae', 14);
    return true;
  }
  function gem(g, x, y, t) {
    ellipse(g, x, y + 1, 4, 2, '#152f32');
    const key = Math.floor(t * 3) % 2 === 0 ? 'gemGreen' : 'gemBlue';
    return sprite(g, key, x, y + 6, 12, 12);
  }
  function rune(g, x, y, n, color, t, size) {
    const pulse = Math.sin(t * 4) * 2;
    ellipse(g, x, y, 19 + pulse, 19 + pulse, '#a9eaca23');
    block(g, x - 14, y - 14, 28, 28, '#162332');
    block(g, x - 12, y - 12, 24, 24, color);
    block(g, x - 10, y - 10, 20, 20, '#283a4d');
    block(g, x - 8, y - 9, 4, 2, '#ecfbd1');
    block(g, x + 5, y + 7, 3, 2, '#ecfbd1');
    sprite(g, 'gemGreen', x, y - 6, 13, 11, .58);
    numberTextSafe(size, n, x, y + 4);
    function numberTextSafe(fn, value, px, py) {
      // size is the scene's number drawing callback, keeping labels legible.
      fn(value, px, py, '#fff4d0', value > 99 ? 9 : 12);
    }
  }
  window.RuneForestArt = { sprite, flora, hero, enemy, gem, rune };
})();
