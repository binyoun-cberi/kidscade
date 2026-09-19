export const CELL_SIZE=20;
export const CELL_HALF=CELL_SIZE/2;

export const WORLD_GRID={
  beach:{id:'beach',name:'해변가',cx:-30,cz:-20,color:0xd7c58f,kind:'nature',hint:'낚시·해안'},
  waterfront:{id:'waterfront',name:'북쪽 강가',cx:-10,cz:-20,color:0x78a77b,kind:'nature',hint:'다리·비버'},
  ranch:{id:'ranch',name:'목장',cx:10,cz:-20,color:0x9db66d,kind:'life',hint:'Cube Pets·생산물'},
  forest:{id:'forest',name:'깊은 숲',cx:-30,cz:0,color:0x4f8050,kind:'resource',hint:'목재·버섯'},
  home:{id:'home',name:'집 구역',cx:-10,cz:0,color:0x7faf62,kind:'life',hint:'집·연못·펫 마당'},
  farm:{id:'farm',name:'농장',cx:10,cz:0,color:0x94b76b,kind:'life',hint:'자유 재배·제작'},
  quarry:{id:'quarry',name:'광산',cx:30,cz:0,color:0x918b76,kind:'resource',hint:'돌·철광석'},
  camp:{id:'camp',name:'야영지',cx:-30,cz:20,color:0x718f55,kind:'nature',hint:'모닥불·휴식'},
  cityMarket:{id:'cityMarket',name:'씨앗마을 · 상점가',cx:-10,cz:20,color:0xbab29d,kind:'city',hint:'마트·철물점'},
  cityLeisure:{id:'cityLeisure',name:'씨앗마을 · 광장/놀이',cx:10,cz:20,color:0xc2ba9e,kind:'city',hint:'카페·아케이드·광장'},
  cityCivic:{id:'cityCivic',name:'씨앗마을 · 공공시설',cx:-10,cz:40,color:0xb3ad99,kind:'city',hint:'도서관·마을회관'},
  cityTransit:{id:'cityTransit',name:'씨앗마을 · 교통/보건',cx:10,cz:40,color:0xbbb39a,kind:'city',hint:'보건소·버스'}
};

export const WORLD_BOUNDS={x1:-40,x2:40,z1:-30,z2:50};
export const CITY_BOUNDS={x1:-20,x2:20,z1:10,z2:50};

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
export function isTravelCorridor(x,z){
  // Main survival row: forest <-> home <-> farm <-> quarry.
  if(z>=-1.45&&z<=1.45&&x>=WORLD_BOUNDS.x1&&x<=WORLD_BOUNDS.x2)return true;
  // Vertical links between stacked square cells.
  if(x>=-31.45&&x<=-28.55&&z>=-30&&z<=30)return true; // beach/forest/camp
  if(x>=-11.45&&x<=-8.55&&z>=-30&&z<=12)return true;  // river/home/city market
  if(x>=8.55&&x<=11.45&&z>=-30&&z<=12)return true;    // ranch/farm/city leisure
  // City grid boundaries.
  if(x>=-1.65&&x<=1.65&&z>=10&&z<=50)return true;
  if(z>=28.35&&z<=31.65&&x>=-20&&x<=20)return true;
  return false;
}
