'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games/squid-memory-bridge');
const source=fs.readFileSync(path.join(dir,'assets.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');

function createArt(options={}) {
  const loaded=[],drawn=[],audioPlayed=[];
  class TestImage {
    constructor(){this.naturalWidth=0;this.naturalHeight=0;this.decoding='';this.onload=null;this.onerror=null;}
    set src(value) {
      this._src=value;loaded.push(value);
      const isAvatar=value.endsWith('school-starter-sheet.png');
      if(isAvatar && options.failAvatar){this.onerror?.();return;}
      this.naturalWidth=isAvatar?2944:48;this.naturalHeight=isAvatar?128:48;
      this.onload?.();
    }
    get src(){return this._src;}
  }
  class TestAudio {
    constructor(src){this.src=src;this.volume=1;this.currentTime=0;this.preload='none';}
    pause(){}
    play(){audioPlayed.push(this.src);return Promise.resolve();}
  }
  const window={},ctx={
    save(){drawn.push('save')},restore(){drawn.push('restore')},
    translate(x,y){drawn.push(['translate',x,y])},
    scale(x,y){drawn.push(['scale',x,y])},
    drawImage(...args){drawn.push(['image',...args])}
  };
  vm.runInNewContext(source,{
    window,document:{currentScript:{src:'https://example.com/games/squid-memory-bridge/assets.js'}},
    location:{href:'https://example.com/games/squid-memory-bridge/'},
    Image:TestImage,Audio:TestAudio,URL,Math
  },{filename:'squid-assets.js'});
  return {art:window.SquidBridgeArt,loaded,drawn,audioPlayed,ctx};
}

test('asset registry references only real files already in Kidscade',()=>{
  for(const p of [
    'assets/game/characters/kidscade-avatar-v3/school-starter/school-starter-sheet.png',
    'assets/game/characters/kidscade-avatar-v3/school-starter/guest-default.png',
    'assets/game/2d/platformer-art/base/items/flag-green.png',
    'assets/game/2d/platformer-art/base/items/flag-yellow.png',
    'assets/game/2d/platformer-art/base/items/gem-green.png',
    'assets/game/2d/platformer-art/base/backgrounds/bg-castle.png',
    'assets/audio/ui/kenney_interface/tick_001.ogg',
    'assets/audio/ui/kenney_interface/confirmation_001.ogg',
    'assets/audio/ui/kenney_interface/confirmation_003.ogg',
    'assets/audio/ui/kenney_interface/error_002.ogg'
  ]) assert.ok(fs.existsSync(path.join(root,p)),p);
  assert.match(html,/\.\/assets\.js\?v=1/);
  assert.ok(html.indexOf('assets.js?v=1')<html.indexOf('game.js?v=2'));
  assert.match(game,/SquidBridgeArt\?\.drawAvatar/);
  assert.match(game,/if \(!drewAsset\) drawPlayer/);
  assert.match(game,/SquidBridgeArt\?\.play/);
  assert.doesNotMatch(source,/https?:\/\/(?:cdn|unpkg|jsdelivr|raw\.githubusercontent)/);
});

test('reused character atlas plays stand, walk and jump at 128x128 frame boundaries',()=>{
  const {art,loaded,drawn,ctx}=createArt();
  assert.equal(loaded.length,5);
  assert.equal(art.available('avatar'),true);
  assert.equal(art.drawAvatar(ctx,0,0,48,{now:1000,phase:'playing',lastStepAt:900,facing:1}),true);
  const spriteDraw=drawn.find(x=>Array.isArray(x)&&x[0]==='image');
  assert.equal(spriteDraw[2],256); // walk index 2: source X 2*128
  assert.equal(spriteDraw[4],128); // source width
  assert.equal(spriteDraw[5],128); // source height
  assert.ok(drawn.some(x=>Array.isArray(x)&&x[0]==='scale'&&x[1]===-1&&x[2]===1));
  drawn.length=0;
  art.drawAvatar(ctx,0,0,48,{now:1200,phase:'cleared',facing:-1});
  assert.equal(drawn.find(x=>Array.isArray(x)&&x[0]==='image')[2],6*128);
  assert.equal(drawn.filter(x=>Array.isArray(x)&&x[0]==='scale').length,0);
});

test('transparent art failure falls back without breaking the game',()=>{
  const {art,ctx}=createArt({failAvatar:true});
  assert.equal(art.available('avatar'),false);
  assert.equal(art.drawAvatar(ctx,0,0,48,{phase:'playing'}),false);
  assert.equal(art.drawFlag(ctx,'start',0,0,48),true);
  assert.equal(art.drawFlag(ctx,'goal',48,0,48),true);
  assert.equal(art.drawGem(ctx,48,0,48,500),true);
});

test('Kenney sounds are loaded lazily and do not depend on a CDN',()=>{
  const {art,audioPlayed}=createArt();
  assert.equal(art.play('step'),true);
  assert.equal(art.play('wrong'),true);
  assert.equal(art.play('check'),true);
  assert.equal(art.play('win'),true);
  assert.equal(audioPlayed.length,4);
  assert.ok(audioPlayed.every(u=>u.startsWith('https://example.com/assets/audio/ui/kenney_interface/')));
  assert.equal(art.play('absent'),false);
});
