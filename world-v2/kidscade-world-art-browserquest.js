/* Kidscade World v2 - BrowserQuest scale-3 art adapter.
   BrowserQuest content is CC BY-SA 3.0. See THIRD_PARTY_BROWSERQUEST.md. */
(function(root){
  'use strict';
  const NS=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
  const TILE=48;
  const REMOTE_BASE='https://raw.githubusercontent.com/mozilla/BrowserQuest/master/client/img/3/';
  const cache=new Map();

  function load(name){
    if(cache.has(name))return cache.get(name);
    const rec={name,status:'loading',image:new Image(),error:null};
    rec.image.crossOrigin='anonymous';
    rec.image.onload=()=>{rec.status='ready';};
    rec.image.onerror=e=>{rec.status='error';rec.error=e;};
    rec.image.src=REMOTE_BASE+name;
    cache.set(name,rec);
    return rec;
  }

  function ready(name){return load(name).status==='ready';}
  function image(name){const r=load(name);return r.status==='ready'?r.image:null;}
  function pixelated(ctx){ctx.imageSmoothingEnabled=false;}

  function drawImage(ctx,name,dx,dy,dw,dh,sx=0,sy=0,sw=null,sh=null){
    const img=image(name);if(!img)return false;
    pixelated(ctx);
    if(sw==null||sh==null)ctx.drawImage(img,dx,dy,dw,dh);
    else ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);
    return true;
  }

  function drawTile(ctx,id,dx,dy,size=TILE){
    const img=image('tilesheet.png');if(!img)return false;
    const cols=Math.max(1,Math.floor(img.width/TILE));
    const sx=(id%cols)*TILE,sy=Math.floor(id/cols)*TILE;
    pixelated(ctx);ctx.drawImage(img,sx,sy,TILE,TILE,dx,dy,size,size);return true;
  }

  // Sprite files that can be used immediately without needing terrain tile IDs.
  const sprite={
    chest:(ctx,x,y,s=1)=>drawImage(ctx,'chest.png',x,y,48*s,48*s),
    wood:(ctx,x,y,s=1)=>drawImage(ctx,'wood.png',x,y,48*s,48*s),
    villager:(ctx,x,y,s=1)=>drawImage(ctx,'villager.png',x,y,48*s,48*s),
    villageGirl:(ctx,x,y,s=1)=>drawImage(ctx,'villagegirl.png',x,y,48*s,48*s),
    shadow:(ctx,x,y,s=1)=>drawImage(ctx,'shadow16.png',x,y,48*s,48*s)
  };

  function preload(){
    ['tilesheet.png','chest.png','wood.png','villager.png','villagegirl.png','shadow16.png'].forEach(load);
  }

  NS.BrowserQuestArt={
    TILE,REMOTE_BASE,load,ready,image,drawImage,drawTile,sprite,preload,
    status(){return [...cache.values()].map(r=>({name:r.name,status:r.status}));}
  };
  preload();
})(window);
