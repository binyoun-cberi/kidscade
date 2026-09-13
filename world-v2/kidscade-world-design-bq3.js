/* Kidscade World v2 - locked BrowserQuest 3 design profile.
   BrowserQuest content/assets are CC BY-SA 3.0. See THIRD_PARTY_BROWSERQUEST.md. */
(function(root){
  'use strict';
  const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
  const BQ=K.BrowserQuestArt;
  if(!BQ)throw new Error('KidscadeWorldV2.BrowserQuestArt must load before design profile');

  const TILE=48;
  const PROFILE={
    id:'bq3-kidscade-v1',
    label:'BrowserQuest 3 · Kidscade Life v1',
    atlas:{cols:20,rows:98,width:960,height:4704,tile:TILE},
    // These windows deliberately restrict terrain selection to visually related
    // parts of the BrowserQuest atlas. We no longer search the entire sheet.
    terrainWindows:{
      grass:[{c0:15,c1:19,r0:6,r1:18}],
      path:[{c0:17,c1:19,r0:11,r1:19},{c0:13,c1:19,r0:22,r1:31}],
      soil:[{c0:13,c1:19,r0:22,r1:33}],
      water:[{c0:4,c1:12,r0:16,r1:25},{c0:0,c1:7,r0:49,r1:57},{c0:0,c1:19,r0:88,r1:91}],
      stone:[{c0:12,c1:19,r0:18,r1:41}]
    },
    // Fixed atlas crops chosen from the environment/village section of BQ3.
    // They are intentionally versioned here so world design does not drift.
    regions:{
      cottage:{col:4,row:2,w:7,h:8},
      cottageLarge:{col:4,row:10,w:9,h:10},
      hut:{col:0,row:17,w:4,h:6},
      tree:{col:11,row:6,w:6,h:6},
      bush:{col:16,row:7,w:4,h:4},
      rock:{col:13,row:19,w:5,h:5},
      waterside:{col:5,row:18,w:7,h:5}
    },
    colors:{grass:'#89aa59',path:'#bda86f',soil:'#765436',water:'#5b9db5',stone:'#8b8c83',ink:'#2b3026'}
  };

  let resolved={status:'waiting',profile:PROFILE.id,tiles:{},regions:PROFILE.regions};
  const listeners=new Set();

  function inWindows(m,windows){
    return windows.some(w=>m.col>=w.c0&&m.col<=w.c1&&m.row>=w.r0&&m.row<=w.r1);
  }
  function choose(metrics,windows,filter,score){
    let best=null,bestScore=-Infinity;
    for(const m of metrics){
      if(!inWindows(m,windows)||!filter(m))continue;
      const s=score(m);if(s>bestScore){bestScore=s;best=m;}
    }
    return best;
  }
  function resolve(){
    const p=BQ.palette();
    if(p.status!=='ready'||!p.metrics?.length)return resolved;
    const M=p.metrics,W=PROFILE.terrainWindows;
    const grass=choose(M,W.grass,m=>m.coverage>.88&&m.green>.16,m=>m.green*5+m.coverage-(Math.abs(m.lum-125)/200));
    const path=choose(M,W.path,m=>m.coverage>.86&&(m.pale>.10||m.brown>.18),m=>m.pale*4+m.brown*2+m.coverage-(Math.abs(m.lum-160)/220));
    const soil=choose(M,W.soil,m=>m.coverage>.86&&m.brown>.18,m=>m.brown*5+(1-Math.min(1,m.lum/190))-.5*m.pale);
    const water=choose(M,W.water,m=>m.coverage>.70&&m.blue>.12,m=>m.blue*6+m.coverage+m.lum/600);
    const stone=choose(M,W.stone,m=>m.coverage>.55&&m.gray>.12,m=>m.gray*5+m.coverage-m.green-m.blue*.5);
    resolved={
      status:'ready',profile:PROFILE.id,
      tiles:{
        grass:grass?.id??p.tiles.grass,
        path:path?.id??p.tiles.path,
        soil:soil?.id??p.tiles.soil,
        water:water?.id??p.tiles.water,
        stone:stone?.id??p.tiles.stone
      },
      regions:PROFILE.regions
    };
    listeners.forEach(fn=>{try{fn(resolved);}catch(e){console.error('[BQ3 design]',e);}});
    return resolved;
  }

  BQ.onPaletteReady(resolve);

  function onReady(fn){listeners.add(fn);if(resolved.status==='ready')fn(resolved);return()=>listeners.delete(fn);}
  function tileId(kind){return resolved.tiles[kind];}
  function drawTile(ctx,kind,x,y,size=TILE){
    const id=tileId(kind);return Number.isFinite(id)?BQ.drawTile(ctx,id,x,y,size):false;
  }
  function fallbackTile(ctx,kind,x,y,size=TILE){ctx.fillStyle=PROFILE.colors[kind]||PROFILE.colors.grass;ctx.fillRect(x,y,size,size);}
  function fill(ctx,kind,x,y,w,h){
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const x0=Math.floor(x/TILE)*TILE,y0=Math.floor(y/TILE)*TILE;
    for(let yy=y0;yy<y+h;yy+=TILE)for(let xx=x0;xx<x+w;xx+=TILE){if(!drawTile(ctx,kind,xx,yy,TILE))fallbackTile(ctx,kind,xx,yy,TILE);}
    ctx.restore();
  }
  function drawRegion(ctx,name,x,y,scale=1){return BQ.drawRegion(ctx,PROFILE.regions[name],x,y,scale);}

  // World entities use a small collision footprint while rendering the taller
  // BrowserQuest crop above the entity's feet for correct depth ordering.
  function renderObject(name,fallback){
    return function(ctx,e){
      const reg=PROFILE.regions[name],scale=e.data?.scale||1;
      if(reg){const sw=reg.w*TILE,sh=reg.h*TILE,dw=sw*scale,dh=sh*scale;if(drawRegion(ctx,name,e.centerX-dw/2,e.y+e.h-dh,scale))return;}
      if(fallback)fallback(ctx,e);
    };
  }

  // The selected BrowserQuest tree crop is foliage-heavy and on some atlas/
  // scaling combinations its lower trunk becomes visually transparent. Draw a
  // small Kidscade trunk underneath the atlas crop so every tree has a clear
  // ground connection while keeping the BQ canopy untouched.
  function treeTrunkUnderlay(c,e){
    const scale=Math.max(.45,Number(e.data?.scale)||1),foot=e.y+e.h;
    const h=Math.round(72*scale),w=Math.max(11,Math.round(18*scale));
    c.save();c.imageSmoothingEnabled=false;
    c.fillStyle='#4b3324';c.fillRect(Math.round(e.centerX-w/2-2),Math.round(foot-h+2),w+4,h-2);
    c.fillStyle='#715036';c.fillRect(Math.round(e.centerX-w/2),Math.round(foot-h),w,h);
    c.fillStyle='#8c6845';c.fillRect(Math.round(e.centerX-w/2+3),Math.round(foot-h+5),Math.max(3,Math.round(w*.25)),Math.max(10,h-12));
    c.fillStyle='#4b3324';c.fillRect(Math.round(e.centerX-w/2-7),Math.round(foot-6),Math.round(w*.65),6);c.fillRect(Math.round(e.centerX+1),Math.round(foot-5),Math.round(w*.65),5);
    c.restore();
  }
  function renderTree(c,e){
    const reg=PROFILE.regions.tree,scale=e.data?.scale||1;
    treeTrunkUnderlay(c,e);
    if(reg){const sw=reg.w*TILE,sh=reg.h*TILE,dw=sw*scale,dh=sh*scale;if(drawRegion(c,'tree',e.centerX-dw/2,e.y+e.h-dh,scale))return;}
    c.fillStyle='#5d8c4c';c.fillRect(e.centerX-48,e.y-105,96,72);
  }

  const renderBush=renderObject('bush',(c,e)=>{c.fillStyle='#648b4f';c.fillRect(e.x-12,e.y-28,e.w+24,e.h+28);});
  const renderRock=renderObject('rock',(c,e)=>{c.fillStyle='#898a84';c.fillRect(e.x-10,e.y-24,e.w+20,e.h+24);});
  const renderCottage=renderObject('cottage',(c,e)=>{c.fillStyle='#d1b36f';c.fillRect(e.x-55,e.y-190,e.w+110,e.h+190);c.fillStyle='#5c3a2b';c.fillRect(e.x-75,e.y-250,e.w+150,90);});
  const renderHut=renderObject('hut',(c,e)=>{c.fillStyle='#92704b';c.fillRect(e.x-35,e.y-120,e.w+70,e.h+120);});

  K.BQ3Design={
    PROFILE,TILE,resolve,onReady,state(){return resolved;},tileId,drawTile,fill,drawRegion,
    render:{tree:renderTree,bush:renderBush,rock:renderRock,cottage:renderCottage,hut:renderHut},
    sprite:BQ.sprite
  };
  resolve();
})(window);
