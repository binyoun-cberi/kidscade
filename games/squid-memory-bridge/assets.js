/* Shared Kidscade assets for the 2D memory bridge: no copies and no external CDN. */
(() => {
  'use strict';
  const scriptBase = document.currentScript?.src || location.href;
  const ROOT = new URL('../../assets/', scriptBase);
  const images = {
    avatar: 'game/characters/kidscade-avatar-v3/school-starter/school-starter-sheet.png',
    start: 'game/2d/platformer-art/base/items/flag-green.png',
    goal: 'game/2d/platformer-art/base/items/flag-yellow.png',
    arena: 'game/2d/platformer-art/base/backgrounds/bg-castle.png',
    gem: 'game/2d/platformer-art/base/items/gem-green.png'
  };
  const sounds = {
    step: 'audio/ui/kenney_interface/tick_001.ogg',
    check: 'audio/ui/kenney_interface/confirmation_001.ogg',
    wrong: 'audio/ui/kenney_interface/error_002.ogg',
    win: 'audio/ui/kenney_interface/confirmation_003.ogg'
  };
  const imageRefs = Object.create(null);
  const audioRefs = Object.create(null);
  const resolved = p => new URL(p, ROOT).href;
  for (const [name, path] of Object.entries(images)) {
    const img = new Image();
    imageRefs[name] = {image:img,loaded:false,failed:false};
    img.onload = () => { imageRefs[name].loaded = img.naturalWidth > 0; };
    img.onerror = () => { imageRefs[name].failed = true; };
    img.decoding = 'async';
    img.src = resolved(path);
  }
  function available(name) {return Boolean(imageRefs[name]?.loaded);}
  function source(name) {return resolved(images[name]);}
  function play(name) {
    if (typeof Audio !== 'function' || !Object.prototype.hasOwnProperty.call(sounds,name)) return false;
    try {
      let audio = audioRefs[name];
      if (!audio) {
        audio = new Audio(resolved(sounds[name]));
        audio.preload = 'auto';
        audio.volume = name === 'step' ? .25 : .38;
        audioRefs[name] = audio;
      }
      audio.pause();
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise?.catch) promise.catch(() => {});
      return true;
    } catch (_) {return false;}
  }
  function drawBackdrop(ctx,width,height) {
    if (!available('arena')) return false;
    ctx.save();
    ctx.globalAlpha = .15;
    const image = imageRefs.arena.image;
    // Scene art is decorative only; playable tiles are always rendered on top.
    const scale = Math.max(width/image.naturalWidth,height/image.naturalHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image,(width-image.naturalWidth*scale)/2,(height-image.naturalHeight*scale)/2,
      image.naturalWidth*scale,image.naturalHeight*scale);
    ctx.restore();
    return true;
  }
  function drawFlag(ctx,type,x,y,tile) {
    if (tile < 25 || !available(type)) return false;
    const img = imageRefs[type].image, size = tile * .58;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img,x+tile*.06,y-size*.20,size,size);
    ctx.restore();
    return true;
  }
  function drawGem(ctx,x,y,tile,now) {
    if (!available('gem')) return false;
    const img=imageRefs.gem.image,size=tile*.29,pulse=1+.06*Math.sin(now/240);
    ctx.save();ctx.globalAlpha=.88;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,x+(tile-size*pulse)/2,y+tile*.08,size*pulse,size*pulse);
    ctx.restore();return true;
  }
  function drawAvatar(ctx,x,y,tile,opts={}) {
    if (!available('avatar')) return false;
    const image=imageRefs.avatar.image;
    const SIZE=128,FRAMES=23;
    if (image.naturalWidth < SIZE*FRAMES || image.naturalHeight < SIZE) return false;
    const now=Number(opts.now)||0,phase=opts.phase||'playing';
    let frame=0;
    if (phase==='failed') frame=14+Math.min(3,Math.floor(Math.max(0,now-(opts.lastStepAt||now))/140));
    else if (phase==='cleared') frame=6;
    else if (phase==='playing' && now-(opts.lastStepAt||0)<450) frame=2+(Math.floor(now/115)%4);
    else frame=Math.floor(now/540)%2;
    const scale=tile*1.45;
    // Sprite feet are at Y=118 in the original 128px canvas (school-starter manifest).
    // Anchor to the center of the selected tile; flip ONLY for horizontal facing.
    const footX=x+tile/2,footY=y+tile*.80;
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    ctx.translate(footX,footY);
    if (opts.facing !== -1) ctx.scale(-1,1); // Original school starter faces left.
    ctx.shadowColor='#061b22';ctx.shadowBlur=Math.max(3,tile*.14);
    ctx.drawImage(image,frame*SIZE,0,SIZE,SIZE,
      -scale*.5,-scale*(118/128),scale,scale);
    ctx.restore();
    return true;
  }
  window.SquidBridgeArt=Object.freeze({sources:Object.freeze({...images}),sounds:Object.freeze({...sounds}),
    source,available,play,drawBackdrop,drawFlag,drawGem,drawAvatar});
})();