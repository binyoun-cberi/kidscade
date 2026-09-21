export const CELL_SIZE=20;
export const ROAD_WIDTH=4;
export const CELL_PITCH=CELL_SIZE+ROAD_WIDTH;
export const CELL_HALF=CELL_SIZE/2;
export const ROAD_HALF=ROAD_WIDTH/2;

export const WORLD_GRID={
  beach:{id:'beach',name:'해변가',cx:-36,cz:-24,color:0xd7c58f,kind:'nature',hint:'낚시·해안'},
  waterfront:{id:'waterfront',name:'북쪽 강가',cx:-12,cz:-24,color:0x78a77b,kind:'nature',hint:'다리·비버'},
  ranch:{id:'ranch',name:'목장',cx:12,cz:-24,color:0x9db66d,kind:'life',hint:'Cube Pets·생산물'},
  orchard:{id:'orchard',name:'과수원',cx:36,cz:-24,color:0xa8b86c,kind:'life',hint:'과일나무·수확'},
  forest:{id:'forest',name:'깊은 숲',cx:-36,cz:0,color:0x4f8050,kind:'resource',hint:'목재·버섯'},
  home:{id:'home',name:'집 구역',cx:-12,cz:0,color:0x7faf62,kind:'life',hint:'집·연못·펫 마당'},
  farm:{id:'farm',name:'농장',cx:12,cz:0,color:0x94b76b,kind:'life',hint:'자유 재배·제작'},
  quarry:{id:'quarry',name:'광산',cx:36,cz:0,color:0x918b76,kind:'resource',hint:'돌·철광석'},
  camp:{id:'camp',name:'야영지',cx:-36,cz:24,color:0x718f55,kind:'nature',hint:'모닥불·휴식'},
  cityMarket:{id:'cityMarket',name:'씨앗마을 · 상점가',cx:-12,cz:24,color:0xbab29d,kind:'city',hint:'마트·철물점'},
  cityLeisure:{id:'cityLeisure',name:'씨앗마을 · 광장/놀이',cx:12,cz:24,color:0xc2ba9e,kind:'city',hint:'카페·아케이드·광장'},
  cityCivic:{id:'cityCivic',name:'씨앗마을 · 공공시설',cx:-12,cz:48,color:0xb3ad99,kind:'city',hint:'도서관·마을회관'},
  cityTransit:{id:'cityTransit',name:'씨앗마을 · 교통/보건',cx:12,cz:48,color:0xbbb39a,kind:'city',hint:'보건소·버스'}
};

export const WORLD_BOUNDS={x1:-46,x2:46,z1:-34,z2:58};
export const CITY_BOUNDS={x1:-22,x2:22,z1:14,z2:58};
export const ROAD_X=[-24,0,24];
export const ROAD_Z=[-12,12,36];

export function cellBounds(cell){
  return {x1:cell.cx-CELL_HALF,x2:cell.cx+CELL_HALF,z1:cell.cz-CELL_HALF,z2:cell.cz+CELL_HALF};
}
export function contains(cell,x,z,pad=0){
  const b=cellBounds(cell);
  return x>=b.x1+pad&&x<=b.x2-pad&&z>=b.z1+pad&&z<=b.z2-pad;
}
export function zoneAt(x,z){
  for(const cell of Object.values(WORLD_GRID))if(contains(cell,x,z))return cell;
  return null;
}
export function isCityArea(x,z){
  return x>=CITY_BOUNDS.x1&&x<=CITY_BOUNDS.x2&&z>=CITY_BOUNDS.z1&&z<=CITY_BOUNDS.z2;
}
export function isRoadArea(x,z,pad=0){
  const px=ROAD_HALF+pad;
  const pz=ROAD_HALF+pad;
  const onVertical=ROAD_X.some(rx=>Math.abs(x-rx)<=px)&&z>=WORLD_BOUNDS.z1&&z<=WORLD_BOUNDS.z2;
  const onHorizontal=ROAD_Z.some(rz=>Math.abs(z-rz)<=pz)&&x>=WORLD_BOUNDS.x1&&x<=WORLD_BOUNDS.x2;
  return onVertical||onHorizontal;
}
export function footprintTouchesRoad(x,z,w=0,d=0,pad=.12){
  const hx=Math.max(0,w)/2+pad;
  const hz=Math.max(0,d)/2+pad;
  const vertical=ROAD_X.some(rx=>Math.abs(x-rx)<=ROAD_HALF+hx);
  const horizontal=ROAD_Z.some(rz=>Math.abs(z-rz)<=ROAD_HALF+hz);
  return vertical||horizontal;
}
export function isTravelCorridor(x,z){return isRoadArea(x,z)}
export function pointInCell(id,dx=0,dz=0){
  const c=WORLD_GRID[id];if(!c)return {x:dx,z:dz};
  return {x:c.cx+dx,z:c.cz+dz};
}
