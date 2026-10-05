/* Registered per-frame wardrobe parts. Public users select catalog IDs only. */
(function(root){
 'use strict';
 async function create({rootUrl,manifest,fetchJson,loadImage,createCanvas}){
  const catalog=await fetchJson(rootUrl+'/'+manifest.partCatalogs.wardrobe),parts=new Map(),pending=new Map(),cache=new Map();
  if(catalog.type!=='kidscade-avatar-wardrobe-catalog')throw new Error('복장 목록 형식이 올바르지 않습니다.');
  const baseUrl=rootUrl+'/wardrobe/',fallback=await loadImage(baseUrl+catalog.bodyFallback+'?v='+catalog.revision);
  const category=key=>catalog.categories[key];
  function normalize(ids={}){const next={...ids};for(const [key,g] of Object.entries(catalog.categories))if(!g.items.some(item=>item.id===next[key]))next[key]=g.defaultId;return next}
  async function load(key,id){
   const item=category(key)?.items.find(item=>item.id===id);if(!item)throw new Error('등록되지 않은 파츠입니다.');
   if(parts.has(id))return parts.get(id);if(pending.has(id))return pending.get(id);
   const request=(async()=>{const part=await fetchJson(baseUrl+item.file);validate(part,key,id,manifest.frameOrder);parts.set(id,part);return part})();pending.set(id,request);
   try{return await request}finally{pending.delete(id)}
  }
  async function prepare(ids){const next=normalize(ids);await Promise.all(Object.entries(catalog.categories).flatMap(([key,g])=>[load(key,g.defaultId),load(key,next[key])]));return next}
  function frame(id,frameId,layer){const key=id+':'+frameId;if(cache.has(key))return cache.get(key);const pixels=parts.get(id)?.frames?.[frameId]?.layers?.[layer]?.operations?.[0]?.pixels;if(!pixels?.length)return null;const canvas=createCanvas();canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d'),image=ctx.createImageData(128,128);for(const [x,y,r,g,b,a] of pixels)image.data.set([r,g,b,a],(y*128+x)*4);ctx.putImageData(image,0,0);if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,canvas);return canvas}
  const bodyCache=new Map();
  return {catalog,category,normalize,load,prepare,
   draw(ctx,frameId,layer,ids){const normalized=normalize(ids),canvas=frame(normalized[layer],frameId,layer);if(canvas)ctx.drawImage(canvas,0,0)},
   body(frameId){if(bodyCache.has(frameId))return bodyCache.get(frameId);const index=manifest.frameOrder.indexOf(frameId);if(index<0)return null;const canvas=createCanvas();canvas.width=128;canvas.height=128;canvas.getContext('2d').drawImage(fallback,index*128,0,128,128,0,0,128,128);bodyCache.set(frameId,canvas);return canvas}
  };
 }
 function validate(part,layer,id,frames){
  if(part?.type!=='kidscade-avatar-full-adjustment'||part.assetIds?.[layer]!==id)throw new Error('파츠 형식이 올바르지 않습니다.');
  for(const frame of frames){const layers=part.frames?.[frame]?.layers,ops=layers?.[layer]?.operations;if(!layers||Object.keys(layers).length!==1||ops?.length!==1||ops[0].op!=='replacePixels'||!Array.isArray(ops[0].pixels))throw new Error('파츠 프레임이 올바르지 않습니다.');
   for(const p of ops[0].pixels)if(p.length!==6||!p.every(Number.isInteger)||p[0]<0||p[0]>=128||p[1]<0||p[1]>=128||p.slice(2).some(v=>v<0||v>255))throw new Error('파츠 좌표가 올바르지 않습니다.');
  }
 }
 root.KidscadeAvatarWardrobe={create,validate};
})(typeof window!=='undefined'?window:globalThis);
