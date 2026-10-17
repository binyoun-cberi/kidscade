// A patch of rice is planted one seedling at a time, not one plot at a time.
// Pure model: independent of WebGL and DOM; previous saves remain readable.
export const TRANSPLANT_SIDE=5;
export const TRANSPLANT_COUNT=TRANSPLANT_SIDE**2;
export const TRANSPLANT_STAMINA=1;
const isCell=i=>Number.isInteger(i)&&i>=0&&i<TRANSPLANT_COUNT;
export const emptySeedlings=()=>Array(TRANSPLANT_COUNT).fill(false);
export const fullSeedlings=()=>Array(TRANSPLANT_COUNT).fill(true);
export function normalizeSeedlings(raw,planted=false){
  if(!Array.isArray(raw)||raw.length!==TRANSPLANT_COUNT)return planted?fullSeedlings():emptySeedlings();
  return raw.map(Boolean);
}
export function seedlingCount(field){
  return field?.kind==='rice'?normalizeSeedlings(field.transplants,field.planted).filter(Boolean).length:0;
}
export function nextEmptySeedling(field,preferred=null){
  if(field?.kind!=='rice')return -1;
  const filled=normalizeSeedlings(field.transplants,field.planted);
  if(isCell(preferred)&&!filled[preferred])return preferred;
  return filled.findIndex(value=>!value);
}
export function seedlingPosition(plot,index){
  if(!plot||!isCell(index))return null;
  const row=Math.floor(index/TRANSPLANT_SIDE),column=index%TRANSPLANT_SIDE;
  return {x:plot.x+(column-2)*(plot.w/5.35),
    z:plot.z+(row-2)*(plot.d/5.35)};
}
export function seedlingAtPoint(plot,point){
  if(!plot||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return -1;
  const col=Math.round((point.x-plot.x)/(plot.w/5.35)+2);
  const row=Math.round((point.z-plot.z)/(plot.d/5.35)+2);
  if(col<0||col>4||row<0||row>4)return -1;
  return row*5+col;
}
export function canPlantSeedling(state,id,index){
  const field=state?.fields?.find(f=>f.id===id);
  if(!field||field.kind!=='rice'||!isCell(index))return {ok:false,message:'심을 자리를 다시 선택해 주세요.'};
  const cells=normalizeSeedlings(field.transplants,field.planted);
  if(field.planted||cells[index])return {ok:false,message:'이미 모가 심어진 자리예요.'};
  if(!field.tilled)return {ok:false,message:'먼저 논의 흙을 준비해 주세요.'};
  if(state.energy<TRANSPLANT_STAMINA)return {ok:false,message:'기운이 부족해요. 내일 다시 심어 보세요.'};
  if(!cells.some(Boolean)&&!state.inventory.seedRice)
    return {ok:false,message:'모종이 없어요. 장터에서 모종을 마련해 주세요.'};
  return {ok:true};
}
export function plantSeedling(state,id,index){
  const can=canPlantSeedling(state,id,index);if(!can.ok)return can;
  const f=state.fields.find(x=>x.id===id);
  f.transplants=normalizeSeedlings(f.transplants,false);
  const first=!f.transplants.some(Boolean);
  if(first)state.inventory.seedRice--; // One bundle covers the 25 planting positions.
  f.transplants[index]=true;
  state.energy=Math.max(0,state.energy-TRANSPLANT_STAMINA);
  state.minute=Math.min(1320,state.minute+1);
  const count=seedlingCount(f);
  const complete=count===TRANSPLANT_COUNT;
  if(complete){f.planted=true;f.growth=.025;f.health=1;f.weeds=.03;}
  return {ok:true,action:'plant',fieldId:id,index,count,total:TRANSPLANT_COUNT,
    complete,message:complete?'모내기를 마쳤어요! 스물다섯 포기가 논에 자리 잡았어요.':
      '모 '+count+' / 25포기 · 다음 자리에 심어 보세요.'};
}
