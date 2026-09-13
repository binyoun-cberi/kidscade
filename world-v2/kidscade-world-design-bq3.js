/* Kidscade World v2 - locked BrowserQuest 3 design profile.
   BrowserQuest content/assets are CC BY-SA 3.0. See THIRD_PARTY_BROWSERQUEST.md. */
(function(root){
  'use strict';
  const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
  const BQ=K.BrowserQuestArt;
  if(!BQ)throw new Error('KidscadeWorldV2.BrowserQuestArt must load before design profile');

  const TILE=48;
  const PROFILE={
    id:'bq3-kidscade-v2',
    label:'BrowserQuest 3 · Kidscade Life v2',
    atlas:{cols:20,rows:98,width:960,height:4704,tile:TILE},
    terrainWindows:{
      grass:[{c0:15,c1:19,r0:6,r1:18}],
      path:[{c0:17,c1:19,r0:11,r1:19},{c0:13,c1:19,r0:22,r1:31}],
      soil:[{c0:13,c1:19,r0:22,r1:33}],
      water:[{c0:4,c1:12,r0:16,r1:25},{c0:0,c1:7,r0:49,r1:57},{c0:0,c1:19,r0:88,r1:91}],
      stone:[{c0:12,c1:19,r0:18,r1:41}]
    },
    // Cottage/hut crops are visually stable. Tree/bush/rock crops are kept
    // only for atlas inspection; World v2 renders complete Kidscade originals
    // for those objects so transparent/partial atlas crops can never cut them.
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

  function inWindows(m,windows){return windows.some(w=>m.col>=w.c0&&m.col<=w.c1&&m.row>=w.r0&&m.row<=w.r1);}
  function choose(metrics,windows,filter,score){let best=null,bestScore=-Infinity;for(const m of metrics){if(!inWindows(m,windows)||!filter(m))continue;const s=score(m);if(s>bestScore){bestScore=s;best=m;}}return best;}
  function resolve(){
    const p=BQ.palette();if(p.status!=='ready'||!p.metrics?.length)return resolved;
    const M=p.metrics,W=PROFILE.terrainWindows;
    const grass=choose(M,W.grass,m=>m.coverage>.88&&m.green>.16,m=>m.green*5+m.coverage-(Math.abs(m.lum-125)/200));
    const path=choose(M,W.path,m=>m.coverage>.86&&(m.pale>.10||m.brown>.18),m=>m.pale*4+m.brown*2+m.coverage-(Math.abs(m.lum-160)/220));
    const soil=choose(M,W.soil,m=>m.coverage>.86&&m.brown>.18,m=>m.brown*5+(1-Math.min(1,m.lum/190))-.5*m.pale);
    const water=choose(M,W.water,m=>m.coverage>.70&&m.blue>.12,m=>m.blue*6+m.coverage+m.lum/600);
    const stone=choose(M,W.stone,m=>m.coverage>.55&&m.gray>.12,m=>m.gray*5+m.coverage-m.green-m.blue*.5);
    resolved={status:'ready',profile:PROFILE.id,tiles:{grass:grass?.id??p.tiles.grass,path:path?.id??p.tiles.path,soil:soil?.id??p.tiles.soil,water:water?.id??p.tiles.water,stone:stone?.id??p.tiles.stone},regions:PROFILE.regions};
    listeners.forEach(fn=>{try{fn(resolved);}catch(e){console.error('[BQ3 design]',e);}});return resolved;
  }
  BQ.onPaletteReady(resolve);

  function onReady(fn){listeners.add(fn);if(resolved.status==='ready')fn(resolved);return()=>listeners.delete(fn);}
  function tileId(kind){return resolved.tiles[kind];}
  function drawTile(ctx,kind,x,y,size=TILE){const id=tileId(kind);return Number.isFinite(id)?BQ.drawTile(ctx,id,x,y,size):false;}
  function fallbackTile(ctx,kind,x,y,size=TILE){ctx.fillStyle=PROFILE.colors[kind]||PROFILE.colors.grass;ctx.fillRect(x,y,size,size);}
  function fill(ctx,kind,x,y,w,h){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();const x0=Math.floor(x/TILE)*TILE,y0=Math.floor(y/TILE)*TILE;for(let yy=y0;yy<y+h;yy+=TILE)for(let xx=x0;xx<x+w;xx+=TILE){if(!drawTile(ctx,kind,xx,yy,TILE))fallbackTile(ctx,kind,xx,yy,TILE);}ctx.restore();}
  function drawRegion(ctx,name,x,y,scale=1){return BQ.drawRegion(ctx,PROFILE.regions[name],x,y,scale);}

  function renderObject(name,fallback){return function(ctx,e){const reg=PROFILE.regions[name],scale=e.data?.scale||1;if(reg){const sw=reg.w*TILE,sh=reg.h*TILE,dw=sw*scale,dh=sh*scale;if(drawRegion(ctx,name,e.centerX-dw/2,e.y+e.h-dh,scale))return;}fallback?.(ctx,e);};}
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}

  // Complete Kidscade-original environmental objects. These intentionally do
  // not crop the BQ atlas; the previous guessed crop rectangles produced the
  // half-tree/half-bush artifacts visible in the live world.
  function renderTree(c,e){
    const s=Math.max(.55,Number(e.data?.scale)||1),fx=e.centerX,fy=e.y+e.h;
    const tw=18*s,th=67*s;
    c.save();c.imageSmoothingEnabled=false;
    c.globalAlpha=.18;c.fillStyle='#172116';c.beginPath();c.ellipse(fx,fy+3,42*s,11*s,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
    rect(c,fx-tw/2-3*s,fy-th,tw+6*s,th,'#3e2c20');
    rect(c,fx-tw/2,fy-th,tw,th,'#765033');
    rect(c,fx-tw/2+4*s,fy-th+5*s,5*s,th-13*s,'#9a6e43');
    rect(c,fx-21*s,fy-8*s,20*s,7*s,'#4b3524');rect(c,fx+1*s,fy-7*s,21*s,7*s,'#4b3524');
    const dark='#315f3d',mid='#4f8c4e',light='#6eaa5b';
    rect(c,fx-54*s,fy-128*s,108*s,57*s,dark);
    rect(c,fx-43*s,fy-151*s,86*s,77*s,dark);
    rect(c,fx-27*s,fy-169*s,54*s,37*s,dark);
    rect(c,fx-48*s,fy-124*s,94*s,45*s,mid);
    rect(c,fx-35*s,fy-147*s,70*s,61*s,mid);
    rect(c,fx-21*s,fy-164*s,42*s,29*s,mid);
    rect(c,fx-31*s,fy-139*s,23*s,18*s,light);rect(c,fx+8*s,fy-123*s,25*s,19*s,light);rect(c,fx-4*s,fy-157*s,20*s,15*s,light);
    c.restore();
  }
  function renderBush(c,e){
    const s=Math.max(.55,Number(e.data?.scale)||1),fx=e.centerX,fy=e.y+e.h;
    c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.15;c.fillStyle='#172116';c.beginPath();c.ellipse(fx,fy+2,34*s,8*s,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
    rect(c,fx-42*s,fy-43*s,84*s,42*s,'#315f3d');rect(c,fx-31*s,fy-58*s,62*s,56*s,'#315f3d');
    rect(c,fx-36*s,fy-39*s,72*s,34*s,'#4f8c4e');rect(c,fx-25*s,fy-53*s,50*s,45*s,'#4f8c4e');
    rect(c,fx-20*s,fy-46*s,17*s,13*s,'#6eaa5b');rect(c,fx+9*s,fy-31*s,18*s,13*s,'#6eaa5b');c.restore();
  }
  function renderRock(c,e){
    const s=Math.max(.55,Number(e.data?.scale)||1),fx=e.centerX,fy=e.y+e.h;
    c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.16;c.fillStyle='#171b18';c.beginPath();c.ellipse(fx,fy+2,28*s,7*s,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
    c.fillStyle='#555c5a';c.strokeStyle='#303532';c.lineWidth=Math.max(2,3*s);c.beginPath();c.moveTo(fx-31*s,fy-3*s);c.lineTo(fx-25*s,fy-28*s);c.lineTo(fx-5*s,fy-42*s);c.lineTo(fx+24*s,fy-31*s);c.lineTo(fx+33*s,fy-8*s);c.lineTo(fx+22*s,fy);c.lineTo(fx-22*s,fy);c.closePath();c.fill();c.stroke();
    rect(c,fx-15*s,fy-30*s,18*s,9*s,'#858d89');rect(c,fx+7*s,fy-21*s,13*s,7*s,'#717976');c.restore();
  }

  const renderCottage=renderObject('cottage',(c,e)=>{c.fillStyle='#d1b36f';c.fillRect(e.x-55,e.y-190,e.w+110,e.h+190);c.fillStyle='#5c3a2b';c.fillRect(e.x-75,e.y-250,e.w+150,90);});
  const renderHut=renderObject('hut',(c,e)=>{c.fillStyle='#92704b';c.fillRect(e.x-35,e.y-120,e.w+70,e.h+120);});

  K.BQ3Design={PROFILE,TILE,resolve,onReady,state(){return resolved;},tileId,drawTile,fill,drawRegion,render:{tree:renderTree,bush:renderBush,rock:renderRock,cottage:renderCottage,hut:renderHut},sprite:BQ.sprite};
  resolve();
})(window);
