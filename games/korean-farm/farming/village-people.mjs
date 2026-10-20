// Village conversation rules are independent from the scene or DOM so that
// greeting, affection and gift-giving remain deterministic across reloads.
import {calendar,fieldCondition,currentDeliveryOrder} from './farm-sim.mjs';

const SEASON_TIPS=Object.freeze({
  '봄':'봄바람이 불면 땅을 고르고 씨앗을 심기 좋아요. 어린 모가 마르지 않는지도 살펴보세요.',
  '여름':'여름에는 물이 빠르게 줄어들어요. 논의 물꼬와 밭의 흙 상태를 자주 살펴보세요.',
  '가을':'가을에는 익은 이삭을 제때 거두는 것이 중요해요. 수확한 곡식은 창고에 잘 넣어 두세요.',
  '겨울':'겨울에는 작물이 아주 천천히 자라요. 쉬면서 다음 농사를 준비하고 농기구를 손보세요.'
});
export function neighborAdvice(state){
  const urgent=state.fields?.find(field=>field.planted&&
    ['상태가 좋지 않아요','논물 상태를 살펴보세요','물이 부족해요','양분이 부족해요','잡초가 많아요'].includes(fieldCondition(field)));
  if(urgent)return '논밭 중에 도움이 필요한 곳이 있구나. '+fieldCondition(urgent)+' 먼저 살펴보렴.';
  if(state.weather==='storm')return '큰비가 지나갔으니 논물 높이와 밭의 수분을 확인해 보렴.';
  return SEASON_TIPS[calendar(state.day).season];
}
export function greetNeighbor(state){
  if(!state.village)state.village={lastTalkDay:0,friendship:0,giftReceived:false};
  const village=state.village;
  let firstToday=false,gift=0;
  if(village.lastTalkDay!==state.day){
    village.lastTalkDay=state.day;village.friendship=Math.min(5,village.friendship+1);firstToday=true;
    if(village.friendship>=3&&!village.giftReceived){
      village.giftReceived=true;gift=2;state.inventory.seedCarrot=(state.inventory.seedCarrot||0)+gift;
    }
  }
  return {ok:true,firstToday,friendship:village.friendship,gift,
    greeting:gift?'자주 찾아와 줘서 고맙구나! 당근 씨앗 두 봉지를 선물로 줄게.':
      firstToday?'잘 왔구나! 날마다 논밭을 돌보는 모습이 기특하구나.':'오늘은 벌써 인사를 나누었지? 또 와 줘서 반갑구나.',
    advice:neighborAdvice(state),order:currentDeliveryOrder(state)};
}
