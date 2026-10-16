// Visual test-farm state only. Agricultural growth simulation belongs in PR 2.
export const SAVE_VERSION = 1;
export const RICE_STAGES = Object.freeze([
  {id:1,name:'어린 모',detail:'모내기를 마친 어린 벼예요.'},
  {id:2,name:'새끼치기',detail:'줄기 수가 늘어나며 자라는 시기예요.'},
  {id:3,name:'이삭 준비',detail:'이삭이 만들어지는 과정을 살펴봐요.'},
  {id:4,name:'익어가는 벼',detail:'이삭이 무르익어 수확을 준비해요.'}
]);
export const FIELD_DEFS = Object.freeze([
  {id:'rice-1',label:'첫 번째 논',kind:'rice',x:-12.85,z:-5.2,w:3.5,d:3.4,stage:1},
  {id:'rice-2',label:'두 번째 논',kind:'rice',x:-8.65,z:-5.2,w:3.5,d:3.4,stage:2},
  {id:'rice-3',label:'세 번째 논',kind:'rice',x:-12.85,z:-.9,w:3.5,d:3.4,stage:3},
  {id:'rice-4',label:'네 번째 논',kind:'rice',x:-8.65,z:-.9,w:3.5,d:3.4,stage:4},
  {id:'carrot-1',label:'당근밭',kind:'carrot',x:6.2,z:-3.5,w:4.5,d:3.5,stage:4},
  {id:'corn-1',label:'옥수수밭',kind:'corn',x:12.0,z:-3.5,w:4.5,d:3.5,stage:4}
]);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function makeFarmState(){
  return {version:SAVE_VERSION,selected:'rice-1',player:{x:-5,z:3},camera:{zoom:21,angle:.78},
    plots:FIELD_DEFS.map(({id,stage})=>({id,stage})),seenPlots:[],visits:0};
}
export function validateFarmState(raw){
  const base=makeFarmState();
  if(!raw||raw.version!==SAVE_VERSION||!Array.isArray(raw.plots))return base;
  const savedPlots=new Map(raw.plots.filter(p=>typeof p?.id==='string').map(p=>[p.id,p]));
  base.plots=FIELD_DEFS.map(d=>({id:d.id,stage:d.kind==='rice'?
    clamp(Number.isFinite(savedPlots.get(d.id)?.stage)?Math.round(savedPlots.get(d.id).stage):d.stage,1,4):4}));
  base.selected=FIELD_DEFS.some(d=>d.id===raw.selected)?raw.selected:base.selected;
  for(const axis of ['x','z'])if(Number.isFinite(raw.player?.[axis]))base.player[axis]=clamp(raw.player[axis],-21.5,21.5);
  if(Number.isFinite(raw.camera?.zoom))base.camera.zoom=clamp(raw.camera.zoom,15,36);
  if(Number.isFinite(raw.camera?.angle))base.camera.angle=clamp(raw.camera.angle,-Math.PI*4,Math.PI*4);
  base.seenPlots=[...new Set((Array.isArray(raw.seenPlots)?raw.seenPlots:[]).filter(id=>FIELD_DEFS.some(d=>d.kind==='rice'&&d.id===id)))];
  base.visits=base.seenPlots.length;
  return base;
}
export function plotById(id){return FIELD_DEFS.find(p=>p.id===id)||null;}
export function plotStage(state,id){return state.plots.find(p=>p.id===id)?.stage||1;}
export function setPreviewStage(state,id,stage){
  if(plotById(id)?.kind!=='rice')return false;
  const plot=state.plots.find(p=>p.id===id);
  if(!plot)return false;
  plot.stage=clamp(Math.round(Number(stage)||1),1,4);
  return true;
}
export function distanceToPlot(position,plot){
  const dx=Math.max(0,Math.abs(position.x-plot.x)-plot.w/2);
  const dz=Math.max(0,Math.abs(position.z-plot.z)-plot.d/2);
  return Math.hypot(dx,dz);
}
