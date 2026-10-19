const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
export function fieldStatusIndicators(field){
  if(!field)return [];
  const items=[];
  if(field.planted&&field.growth>=.999){
    items.push({id:'harvest',icon:'🌾',label:'수확 가능',urgency:1});
  }
  if(field.planted){
    if(field.kind==='rice'){
      if(field.waterDepthCm<2.2)items.push({id:'dry',icon:'💧',label:'논물이 부족해요',urgency:clamp((2.2-field.waterDepthCm)/2.2)});
      else if(field.waterDepthCm>6.2)items.push({id:'flood',icon:'🌊',label:'논물이 너무 많아요',urgency:clamp((field.waterDepthCm-6.2)/3.8)});
    }else if(field.moisture<.42){
      items.push({id:'dry',icon:'💧',label:'흙이 말라가요',urgency:clamp((.42-field.moisture)/.42)});
    }else if(field.moisture>.86){
      items.push({id:'wet',icon:'🌧️',label:'흙이 너무 젖었어요',urgency:clamp((field.moisture-.86)/.14)});
    }
    if(field.nitrogen<.34)items.push({id:'nutrition',icon:'🌱',label:'양분이 부족해요',urgency:clamp((.34-field.nitrogen)/.34)});
    if(field.weeds>.38)items.push({id:'weeds',icon:'🌿',label:'잡초가 자라고 있어요',urgency:clamp((field.weeds-.38)/.62)});
    if(field.health<.55)items.push({id:'health',icon:'🩹',label:'작물이 힘들어해요',urgency:clamp((.55-field.health)/.55)});
  }else if(field.weeds>.62){
    items.push({id:'weeds',icon:'🌿',label:'밭에 잡초가 많아요',urgency:clamp((field.weeds-.62)/.38)});
  }
  return items.sort((a,b)=>b.urgency-a.urgency).slice(0,2);
}
