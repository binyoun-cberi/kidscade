// Contextual directions for the first minutes and the ongoing farming loop.
// This is intentionally separate from the renderer so save state determines
// the same objective after a reload.
import {FIELD_DEFS} from '../world.mjs';
import {fieldCondition,basketCount,currentDeliveryOrder,seasonalFestival,CROPS} from './farm-sim.mjs';

const steps=['inspect','harvest','sell','upgrade'];

export function nextFarmObjective(state,inspected=(state.seenPlots||[]).length){
  const hasUpgrade=Object.values(state.upgrades||{}).some(Boolean);
  const progress=[inspected>0,(state.stats?.harvests||0)>0,(state.stats?.sales||0)>0,hasUpgrade];
  const completed=progress.filter(Boolean).length;
  if(completed<4){
    const pending=steps[progress.findIndex(ok=>!ok)];
    const goals={
      inspect:{title:'논밭을 둘러봐요',description:'가까운 논을 눌러 작물을 살펴보세요.',label:'첫 번째 논으로',kind:'field',target:'rice-1'},
      harvest:{title:'첫 수확을 해 봐요',description:'네 번째 논에 익은 벼가 있어요. 낫을 들고 다섯 구역을 베어 보세요.',label:'익은 벼로 가기',kind:'field',target:'rice-4'},
      sell:basketCount(state)>0?
        {title:'장터에 가져가요',description:'바구니에 담은 작물을 장터에 가져가 판매하세요.',label:'장터로 가기',kind:'market'}:
        {title:'창고에서 싣고 가요',description:'수확물을 농가 창고에서 바구니에 담아 장터로 가져가세요.',label:'창고로 가기',kind:'barn'},
      upgrade:{title:'농기구를 개선해요',description:'장터에서 잘 드는 낫이나 가벼운 괭이를 골라 보세요.',label:'농기구 둘러보기',kind:'market'}
    };
    return {...goals[pending],completed,total:4,intro:true};
  }
  const fields=FIELD_DEFS.map(def=>({def,field:state.fields.find(f=>f.id===def.id)}))
    .filter(item=>item.field);
  const festival=seasonalFestival(state);
  if(festival.open&&!festival.completed&&(state.cargo?.[festival.produce]||0)>=festival.count)
    return {title:festival.title+'에 참여해요',description:'싣고 온 '+CROPS[festival.produce].name+'을 소담이에게 건네주세요.',
      label:'행사 장소로 가기',kind:'festival',completed:4,total:4};
  const ripe=fields.find(({field})=>field.planted&&field.growth>=.999);
  if(ripe)return {title:'익은 작물을 거둬요',description:ripe.def.label+'에서 수확할 수 있어요.',label:'수확하러 가기',kind:'field',target:ripe.def.id,completed:4,total:4};
  const stock=['rice','carrot','corn'].reduce((sum,k)=>sum+(state.inventory[k]||0),0);
  if(festival.open&&!festival.completed&&(state.inventory?.[festival.produce]||0)>=festival.count&&!basketCount(state))
    return {title:festival.title+' 준비하기',description:CROPS[festival.produce].name+' '+festival.count+'개를 창고에서 싣고 소담이에게 전해주세요.',
      label:'창고로 가기',kind:'barn',completed:4,total:4};
  if(basketCount(state)>0){
    const order=currentDeliveryOrder(state);
    if(order&&(state.cargo[order.produce]||0)>=order.count)
      return {title:'이웃의 부탁을 전해요',description:'영수 할아버지에게 부탁받은 수확물을 직접 가져다주세요.',label:'이웃 만나러 가기',kind:'neighbor',completed:4,total:4};
    return {title:'수확물을 장터로 가져가요',description:'가져온 작물을 장터에서 팔거나 마을 이웃에게 전달해 보세요.',label:'장터로 가기',kind:'market',completed:4,total:4};
  }
  if(stock>0)return {title:'창고에서 수확물을 실어요',description:'창고에 작물이 '+stock+'개 있어요. 바구니에 담아 장터로 가져가 보세요.',label:'창고로 가기',kind:'barn',completed:4,total:4};
  if(state.energy<20)return {title:'오늘은 푹 쉬어요',description:'기운이 부족해요. 집으로 돌아가 내일을 준비하세요.',label:'집으로 가기',kind:'home',completed:4,total:4};
  const urgent=fields.find(({field})=>field.planted&&fieldCondition(field)!=='잘 자라고 있어요');
  if(urgent)return {title:'작물 상태를 살펴봐요',description:urgent.def.label+' · '+fieldCondition(urgent.field),label:'상태 확인하기',kind:'field',target:urgent.def.id,completed:4,total:4};
  const empty=fields.find(({field})=>!field.planted);
  if(empty)return {title:'새 작물을 심어 봐요',description:empty.def.label+'이(가) 비어 있어요. 흙을 준비하고 씨앗을 심어 보세요.',label:'빈 논밭으로',kind:'field',target:empty.def.id,completed:4,total:4};
  return {title:'내일의 농사를 준비해요',description:'오늘 작물을 잘 돌봤어요. 집에서 쉬고 내일 자란 모습을 확인해 보세요.',label:'집으로 가기',kind:'home',completed:4,total:4};
}
