// Five visible working strips, deliberately separate from the 25 rice planting positions.
// Pure, save-safe helpers shared by simulation and rendering.
export const WORK_STRIPS=5;
export const PATCH_ACTIONS=Object.freeze(['till','water','weed','fertilize','harvest']);
export const PATCH_ENERGY=Object.freeze({till:2,water:1,weed:1,fertilize:1,harvest:2});
export function validWorkStrip(index){return Number.isInteger(index)&&index>=0&&index<WORK_STRIPS}
const flags=(value,fallback)=>Array.isArray(value)&&value.length===WORK_STRIPS?
  value.map(item=>item===true):Array(WORK_STRIPS).fill(fallback);
export function newFieldWork(tilled=false){
  return {tilled:Array(WORK_STRIPS).fill(Boolean(tilled)),
    watered:Array(WORK_STRIPS).fill(false),weeded:Array(WORK_STRIPS).fill(false),
    fertilized:Array(WORK_STRIPS).fill(false),harvested:Array(WORK_STRIPS).fill(false)};
}
export function restoreFieldWork(raw,field){
  const initial=newFieldWork(field.tilled);
  if(!raw||typeof raw!=='object')return initial;
  return {tilled:flags(raw.tilled,field.tilled),watered:flags(raw.watered,false),
    weeded:flags(raw.weeded,false),fertilized:flags(raw.fertilized,false),
    harvested:field.planted?flags(raw.harvested,false):initial.harvested};
}
export function workStripPosition(plot,index){
  if(!plot||!validWorkStrip(index))return null;
  return {x:plot.x+(index%2===0?-.18:.18),
    z:plot.z+(index-(WORK_STRIPS-1)/2)*(plot.d/5.3)};
}
export function completedWorkStrips(field,action){
  const property=action==='till'?'tilled':action==='water'?'watered':
    action==='weed'?'weeded':action==='fertilize'?'fertilized':'harvested';
  return field?.work?.[property]?.filter(Boolean).length||0;
}
export function nextWorkStrip(field,action,preferred=null){
  const key=action==='till'?'tilled':action==='water'?'watered':
    action==='weed'?'weeded':action==='fertilize'?'fertilized':'harvested';
  const cells=field?.work?.[key];
  if(!Array.isArray(cells)||cells.length!==WORK_STRIPS)return -1;
  if(validWorkStrip(preferred)&&!cells[preferred])return preferred;
  return cells.findIndex(x=>!x);
}
