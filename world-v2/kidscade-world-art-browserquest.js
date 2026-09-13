/* Kidscade World v2 - BrowserQuest scale-3 art adapter.
   BrowserQuest content is CC BY-SA 3.0. See THIRD_PARTY_BROWSERQUEST.md. */
(function(root){
  'use strict';
  const NS=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
  const TILE=48;
  const REMOTE_BASE='https://raw.githubusercontent.com/mozilla/BrowserQuest/master/client/img/3/';
  const cache=new Map();
  const paletteListeners=new Set();
  let analysis={status:'waiting',error:null,cols:0,rows:0,tiles:{},regions:{},metrics:[]};

  function pixelated(ctx){ctx.imageSmoothingEnabled=false;}

  function load(name){
    if(cache.has(name))return cache.get(name);
    const rec={name,status:'loading',image:new Image(),error:null};
    rec.image.crossOrigin='anonymous';
    rec.image.onload=()=>{
      rec.status='ready';
      if(name==='tilesheet.png'){
        try{ analyzeTilesheet(); }
        catch(err){ analysis={...analysis,status:'error',error:String(err&&err.message||err)}; }
      }
    };
    rec.image.onerror=e=>{rec.status='error';rec.error=e;};
    rec.image.src=REMOTE_BASE+name;
    cache.set(name,rec);
    return rec;
  }

  function ready(name){return load(name).status==='ready';}
  function image(name){const r=load(name);return r.status==='ready'?r.image:null;}

  function drawImage(ctx,name,dx,dy,dw,dh,sx=0,sy=0,sw=null,sh=null){
    const img=image(name);if(!img)return false;
    pixelated(ctx);
    if(sw==null||sh==null)ctx.drawImage(img,dx,dy,dw,dh);
    else ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);
    return true;
  }

  function drawTile(ctx,id,dx,dy,size=TILE){
    const img=image('tilesheet.png');if(!img||!Number.isFinite(id))return false;
    const cols=Math.max(1,Math.floor(img.width/TILE));
    const sx=(id%cols)*TILE,sy=Math.floor(id/cols)*TILE;
    if(sx+TILE>img.width||sy+TILE>img.height)return false;
    pixelated(ctx);ctx.drawImage(img,sx,sy,TILE,TILE,dx,dy,size,size);return true;
  }

  function drawRegion(ctx,region,dx,dy,scale=1){
    const img=image('tilesheet.png');if(!img||!region)return false;
    const sx=region.col*TILE,sy=region.row*TILE,sw=region.w*TILE,sh=region.h*TILE;
    pixelated(ctx);ctx.drawImage(img,sx,sy,sw,sh,dx,dy,sw*scale,sh*scale);return true;
  }

  function classifyPixel(r,g,b,a){
    if(a<28)return 0;
    let mask=1;
    if(g>70&&g>r*1.08&&g>b*1.10)mask|=2;
    if(r>72&&g>42&&r>g*1.06&&b<g*.96)mask|=4;
    if(b>72&&b>r*1.10&&b>g*1.03)mask|=8;
    if(Math.abs(r-g)<20&&Math.abs(g-b)<20&&r>48&&r<225)mask|=16;
    if(r>135&&g>105&&b<115&&r-g<95)mask|=32;
    return mask;
  }

  function tileMetric(data,width,col,row){
    const x0=col*TILE,y0=row*TILE,total=TILE*TILE;
    let alpha=0,green=0,brown=0,blue=0,gray=0,pale=0,lum=0;
    for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
      const i=((y0+y)*width+(x0+x))*4,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(a<28)continue;
      alpha++;lum+=(r+g+b)/3;
      const m=classifyPixel(r,g,b,a);
      if(m&2)green++;if(m&4)brown++;if(m&8)blue++;if(m&16)gray++;if(m&32)pale++;
    }
    const den=Math.max(1,alpha);
    return {coverage:alpha/total,green:green/den,brown:brown/den,blue:blue/den,gray:gray/den,pale:pale/den,lum:lum/den};
  }

  function best(metrics,filter,score,exclude=new Set()){
    let out=null,bestScore=-Infinity;
    for(const m of metrics){
      if(exclude.has(m.id)||!filter(m))continue;
      const s=score(m);if(s>bestScore){bestScore=s;out=m;}
    }
    return out;
  }

  function aggregate(metrics,cols,col,row,w,h){
    const list=[];
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
      const m=metrics[(row+yy)*cols+col+xx];if(m)list.push(m);
    }
    if(!list.length)return null;
    const sum=k=>list.reduce((a,m)=>a+m[k],0)/list.length;
    return {col,row,w,h,coverage:sum('coverage'),green:sum('green'),brown:sum('brown'),blue:sum('blue'),gray:sum('gray'),pale:sum('pale'),lum:sum('lum')};
  }

  function bestRegion(metrics,cols,rows,sizes,filter,score){
    let out=null,bestScore=-Infinity;
    for(const [w,h] of sizes){
      for(let row=0;row<=rows-h;row++)for(let col=0;col<=cols-w;col++){
        const a=aggregate(metrics,cols,col,row,w,h);if(!a||!filter(a))continue;
        const s=score(a);if(s>bestScore){bestScore=s;out=a;}
      }
    }
    return out;
  }

  function analyzeTilesheet(){
    const img=image('tilesheet.png');if(!img)return null;
    analysis={status:'analyzing',error:null,cols:0,rows:0,tiles:{},regions:{},metrics:[]};
    const cvs=document.createElement('canvas');cvs.width=img.width;cvs.height=img.height;
    const c=cvs.getContext('2d',{willReadFrequently:true});pixelated(c);c.drawImage(img,0,0);
    const pixels=c.getImageData(0,0,img.width,img.height).data;
    const cols=Math.floor(img.width/TILE),rows=Math.floor(img.height/TILE),metrics=[];
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      metrics.push({id:row*cols+col,col,row,...tileMetric(pixels,img.width,col,row)});
    }

    const used=new Set();
    const grass=best(metrics,m=>m.coverage>.94&&m.green>.22,m=>m.green*5-(Math.abs(m.lum-125)/180),used);if(grass)used.add(grass.id);
    const path=best(metrics,m=>m.coverage>.94&&(m.pale>.18||m.brown>.28),m=>m.pale*4+m.brown*2-(Math.abs(m.lum-165)/180),used);if(path)used.add(path.id);
    const soil=best(metrics,m=>m.coverage>.94&&m.brown>.25,m=>m.brown*4+(1-Math.min(1,m.lum/180))*1.2-m.pale,used);if(soil)used.add(soil.id);
    const water=best(metrics,m=>m.coverage>.90&&m.blue>.18,m=>m.blue*5+m.lum/500,used);if(water)used.add(water.id);
    const stone=best(metrics,m=>m.coverage>.88&&m.gray>.25,m=>m.gray*4-(m.green+m.blue),used);if(stone)used.add(stone.id);

    const tree=bestRegion(metrics,cols,rows,[[2,2],[2,3],[3,3]],
      a=>a.coverage>.18&&a.coverage<.84&&a.green>.19&&a.brown>.025&&a.blue<.20,
      a=>a.green*5+a.brown*1.7+(1-a.coverage)*.8-a.blue*2-a.gray*.4);
    const bush=bestRegion(metrics,cols,rows,[[1,1],[2,1],[2,2]],
      a=>a.coverage>.16&&a.coverage<.86&&a.green>.24&&a.brown<.28&&a.blue<.18,
      a=>a.green*5+(1-a.coverage)*.7-a.brown*.4);
    const rock=bestRegion(metrics,cols,rows,[[1,1],[2,1],[2,2]],
      a=>a.coverage>.14&&a.coverage<.90&&a.gray>.23&&a.green<.30&&a.blue<.24,
      a=>a.gray*5+(1-a.coverage)*.75-a.green-a.blue*.7);

    analysis={
      status:'ready',error:null,cols,rows,metrics,
      tiles:{grass:grass?.id??null,path:path?.id??null,soil:soil?.id??null,water:water?.id??null,stone:stone?.id??null},
      regions:{tree:tree?{col:tree.col,row:tree.row,w:tree.w,h:tree.h}:null,bush:bush?{col:bush.col,row:bush.row,w:bush.w,h:bush.h}:null,rock:rock?{col:rock.col,row:rock.row,w:rock.w,h:rock.h}:null}
    };
    paletteListeners.forEach(fn=>{try{fn(analysis);}catch(e){console.error('[BQ art listener]',e);}});
    return analysis;
  }

  function drawAutoTile(ctx,kind,dx,dy,size=TILE){
    const id=analysis.tiles?.[kind];return Number.isFinite(id)?drawTile(ctx,id,dx,dy,size):false;
  }
  function drawAutoRegion(ctx,kind,dx,dy,scale=1){return drawRegion(ctx,analysis.regions?.[kind],dx,dy,scale);}
  function onPaletteReady(fn){paletteListeners.add(fn);if(analysis.status==='ready')fn(analysis);return()=>paletteListeners.delete(fn);}

  const sprite={
    chest:(ctx,x,y,s=1)=>drawImage(ctx,'chest.png',x,y,48*s,48*s),
    wood:(ctx,x,y,s=1)=>drawImage(ctx,'wood.png',x,y,48*s,48*s),
    villager:(ctx,x,y,s=1)=>drawImage(ctx,'villager.png',x,y,48*s,48*s),
    villageGirl:(ctx,x,y,s=1)=>drawImage(ctx,'villagegirl.png',x,y,48*s,48*s),
    shadow:(ctx,x,y,s=1)=>drawImage(ctx,'shadow16.png',x,y,48*s,48*s)
  };

  function preload(){['tilesheet.png','chest.png','wood.png','villager.png','villagegirl.png','shadow16.png'].forEach(load);}

  NS.BrowserQuestArt={
    TILE,REMOTE_BASE,load,ready,image,drawImage,drawTile,drawRegion,drawAutoTile,drawAutoRegion,sprite,preload,onPaletteReady,
    palette(){return analysis;},
    status(){return [...cache.values()].map(r=>({name:r.name,status:r.status}));}
  };
  preload();
})(window);
