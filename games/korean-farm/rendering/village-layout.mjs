// Declarative obstacles and village districts. Imported by gameplay and scene tests.
export const VILLAGE_LANDMARKS=Object.freeze([
  {id:'house',label:'솔내리 농가',x:10.1,z:-13,w:5.25,d:4.6},
  {id:'shed',label:'농산물 창고',x:18,z:-12,w:3.4,d:3.2},
  {id:'yard',label:'장독대와 마당',x:11.65,z:-9.1,w:8.35,d:3.1},
  {id:'market',label:'농산물 판매대',x:8.5,z:14,w:2.6,d:1.2},
  {id:'cart',label:'시장 손수레',x:12.1,z:14.2,w:1.3,d:.9},
  {id:'pyeongsang',label:'마당 평상',x:14.55,z:-10.65,w:1.55,d:1.08},
  {id:'ditch',label:'논물 농수로',x:-17.5,z:-3,w:1.65,d:30}
]);
export const VILLAGE_COLLIDERS=Object.freeze(
  VILLAGE_LANDMARKS.filter(x=>['house','shed','market','cart','pyeongsang'].includes(x.id))
    .map(x=>Object.freeze({x:x.x,z:x.z,w:x.w,d:x.d}))
);
// Farm plot hit meshes have priority over scenery. Paths between rice and the market stay open.
export function plotLandscapeOverlap(plot,landmark,padding=0){
  const a=plot.w/2+landmark.w/2+padding;
  const b=plot.d/2+landmark.d/2+padding;
  return Math.abs(plot.x-landmark.x)<a&&Math.abs(plot.z-landmark.z)<b;
}
export function intersectsVillageCollision(point,radius=.45){
  return VILLAGE_COLLIDERS.some(q=>
    Math.abs(point.x-q.x)<q.w/2+radius&&Math.abs(point.z-q.z)<q.d/2+radius);
}
