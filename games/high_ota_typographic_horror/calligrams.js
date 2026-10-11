/* Ota calligrams — glyph-built objects, independent of Three.js and game state.
 * Dimensions match the real passage, locker and management-desk footprints. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaCalligrams=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const part=(word,x,y,z,w,h,role='frame',rx=0)=>Object.freeze(
    {word,x,y,z,w,h,role,rx});
  function door(id,x,z,rotation,gate=null){
    const parts=[];
    const halfWidth=gate?1.02:2.30;
    // Repeated words trace the REAL opening: small puzzle door, broad side passages.
    for(const y of [.39,.78,1.17,1.56,1.95,2.34]){
      parts.push(part('문',-halfWidth,y,0,.34,.28));
      parts.push(part('문',halfWidth,y,0,.34,.28));
    }
    parts.push(part('문문문문문',0,2.66,0,halfWidth*2+.16,.29));
    parts.push(part('문턱문턱',0,.13,0,halfWidth*2-.12,.24));
    // A repaired door unfolds out of the opening. Open side passages have no leaf.
    if(gate){
      for(const y of [.49,.88,1.27,1.66,2.05]){
        parts.push(part(y===1.27?'닫힘':'문문',-.48,y,.07,.80,.28,'leafL'));
        parts.push(part(y===1.27?'열림':'문문', .48,y,.07,.80,.28,'leafR'));
      }
      parts.push(part('경첩',-.86,.62,.085,.36,.20,'leafL'));
      parts.push(part('경첩',-.86,2.10,.085,.36,.20,'leafL'));
      parts.push(part('손잡이',.71,1.28,.11,.48,.21,'leafR'));
    }
    return Object.freeze({id,type:'door',x,z,rotation,gate,
      parts:Object.freeze(parts)});
  }
  function locker(id,x,z,rotation,chapter=false){
    const parts=[];
    for(const y of [.28,.61,.94,1.27,1.60,1.93]){
      parts.push(part('철문',-.50,y,0,.26,.20));
      parts.push(part('철문', .50,y,0,.26,.20));
    }
    parts.push(part('사물함사물함',0,2.25,0,1.08,.28));
    parts.push(part('바닥',0,.13,0,.95,.22));
    for(const y of [.48,.80,1.12,1.44,1.76]){
      parts.push(part('사물함',-.23,y,.06,.45,.24,'leafL'));
      parts.push(part('사물함', .23,y,.06,.45,.24,'leafR'));
    }
    parts.push(part('틈',0,1.28,.09,.19,.24,'gap'));
    parts.push(part('손잡이',.31,1.31,.13,.37,.19,'leafR'));
    parts.push(part('경첩',-.39,.47,.12,.31,.16,'leafL'));
    parts.push(part('경첩',-.39,1.95,.12,.31,.16,'leafL'));
    parts.push(part('숨기',0,1.87,.16,.61,.25,'action'));
    return Object.freeze({id,type:'locker',x,z,rotation,chapter,parts:Object.freeze(parts)});
  }
  function computer(id,x,z){
    const parts=[];
    // A readable computer silhouette: bezel, screen, stand, keyboard, tower.
    parts.push(part('화면화면화면',0,1.99,.0,1.10,.24));
    parts.push(part('화면화면화면',0,1.28,.0,1.10,.22));
    for(const y of [1.45,1.69,1.87]){
      parts.push(part('화면',-.52,y,.01,.25,.20));
      parts.push(part('화면', .52,y,.01,.25,.20));
    }
    parts.push(part('기록 대기',0,1.63,.04,.94,.29,'screen'));
    parts.push(part('받침대',0,1.14,.12,.58,.23));
    parts.push(part('모니터',0,1.04,.16,.78,.21));
    for(const [row,zz] of [[0,.40],[1,.57],[2,.74]]){
      parts.push(part(row===1?'자판자판':'키보드키보드',0,.992,zz,1.20,.25,'keys',-Math.PI/2));
    }
    parts.push(part('본체',-.68,.73,.50,.40,.29));
    parts.push(part('본체',-.68,.48,.50,.40,.29));
    parts.push(part('전원',-.68,.99,.53,.31,.17,'power'));
    return Object.freeze({id,type:'computer',x,z,rotation:0,parts:Object.freeze(parts)});
  }
  function collection(){
    return Object.freeze([
      door('gate-door',0,-30.04,0,'doorFixed'),
      door('final-door',0,-58.54,0,'finalFixed'),
      door('office-door',-3.235,-46.70,Math.PI/2),
      door('archive-door',3.235,-46.70,-Math.PI/2),
      locker('locker-chase',2.79,-22.4,-Math.PI/2),
      locker('locker-back',-2.79,-11.0,Math.PI/2),
      locker('locker-office',-5.65,-53.6,0,true),
      computer('management-computer',-2.15,1.94)
    ]);
  }
  return Object.freeze({door,locker,computer,collection});
});
