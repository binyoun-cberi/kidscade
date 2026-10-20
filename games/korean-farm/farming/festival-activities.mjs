// Four real, small interaction games at the festival. Logic is independent of
// the DOM / Three.js and uses the same deterministic game calendar as farming.
import {seasonalFestival} from './farm-sim.mjs';
export const FESTIVAL_ACTIVITY_REWARD=120;
const ACTIVITIES=Object.freeze({
  '봄':Object.freeze({title:'모종 심을 자리 찾기',instructions:'모종마다 알맞은 농사 자리를 골라 보세요.',
    mode:'sequence',steps:[
      {prompt:'벼 모종은 어디에 심을까요?',answer:'rice'},
      {prompt:'당근 씨앗은 어디에 심을까요?',answer:'carrot'},
      {prompt:'옥수수 씨앗은 어디에 심을까요?',answer:'corn'}
    ],choices:[{id:'rice',label:'물이 있는 논'},{id:'carrot',label:'두둑이 있는 당근밭'},{id:'corn',label:'키 큰 옥수수밭'}]}),
  '여름':Object.freeze({title:'건강한 새참 차리기',instructions:'더운 날 새참을 준비하는 순서를 골라 보세요.',
    mode:'sequence',steps:[
      {prompt:'먹기 전에 가장 먼저 해야 할 일은?',answer:'wash'},
      {prompt:'더위에 지친 이웃에게 무엇을 먼저 챙길까요?',answer:'water'},
      {prompt:'이제 배고픈 이웃에게 무엇을 나눠 줄까요?',answer:'corn'}
    ],choices:[{id:'wash',label:'손 깨끗이 씻기'},{id:'water',label:'시원한 물 마시기'},{id:'corn',label:'익힌 옥수수 나누기'}]}),
  '가을':Object.freeze({title:'황금빛 이삭 찾기',instructions:'푸른 이삭은 남겨 두고 황금빛으로 익은 이삭 세 개를 골라 보세요.',
    mode:'pick',answers:['ripe1','ripe2','ripe3'],
    choices:[{id:'green1',label:'아직 푸른 벼 ①'},{id:'ripe1',label:'황금빛 벼 ①'},
      {id:'ripe2',label:'황금빛 벼 ②'},{id:'green2',label:'아직 푸른 벼 ②'},{id:'ripe3',label:'황금빛 벼 ③'}]}),
  '겨울':Object.freeze({title:'이웃집 겨울 꾸러미 나누기',instructions:'준비된 나눔 꾸러미 다섯 개를 집마다 필요한 수만큼 나눠 주세요.',
    mode:'allocate',needs:{elder:2,family:2,neighbor:1},
    choices:[{id:'elder',label:'혼자 지내는 어르신 · 2개'},{id:'family',label:'세 식구네 · 2개'},
      {id:'neighbor',label:'이웃집 · 1개'}]})
});
export function festivalActivity(state){
  const event=seasonalFestival(state),config=ACTIVITIES[event.season];
  const valid=state.festival?.activityKey===event.key;
  const steps=valid&&Array.isArray(state.festival.activitySteps)?state.festival.activitySteps:[];
  const completed=state.festival?.activityDoneKey===event.key;
  const max=config.mode==='sequence'?config.steps.length:config.mode==='pick'?config.answers.length:
    Object.values(config.needs).reduce((a,b)=>a+b,0);
  const accepted=steps.slice(0,max);
  const prompt=config.mode==='sequence'?
    (config.steps[Math.min(accepted.length,config.steps.length-1)]?.prompt||'활동 완료'):
    config.mode==='pick'?'황금빛으로 익은 벼를 선택하세요.':
      '꾸러미를 나눠 줄 집을 누르세요.';
  const options=config.choices.map(option=>{
    const count=accepted.filter(id=>id===option.id).length;
    return {...option,used:count,disabled:completed||config.mode==='pick'&&count>0||
      config.mode==='allocate'&&count>=config.needs[option.id]};
  });
  return {key:event.key,season:event.season,title:config.title,instructions:config.instructions,
    prompt,mode:config.mode,open:event.open,delivered:event.completed,completed,
    progress:completed?max:accepted.length,total:max,options};
}
export function playFestivalActivity(state,choice){
  const view=festivalActivity(state),config=ACTIVITIES[view.season];
  if(!view.open)return {ok:false,message:'지금은 행사를 진행하지 않아요.'};
  if(!view.delivered)return {ok:false,message:'먼저 소담에게 수확물을 전해 주세요.'};
  if(view.completed)return {ok:false,message:'이 계절의 체험을 이미 마쳤어요.'};
  const option=view.options.find(o=>o.id===choice);
  if(!option||option.disabled)return {ok:false,message:'이미 완료했거나 선택할 수 없는 자리예요.'};
  const accepted=state.festival?.activityKey===view.key&&Array.isArray(state.festival.activitySteps)?
    state.festival.activitySteps.slice(0,view.total):[];
  const valid=config.mode==='sequence'?config.steps[accepted.length]?.answer===choice:
    config.mode==='pick'?config.answers.includes(choice):true;
  if(!valid)return {ok:false,message:config.mode==='pick'?'푸른 벼는 아직 익지 않았어요.':
    '그 순서는 아니에요. 안내를 다시 살펴보세요.'};
  accepted.push(choice);
  state.festival={...state.festival,activityKey:view.key,activitySteps:accepted};
  state.minute=Math.min(1320,(state.minute||420)+3);
  if(accepted.length===view.total){
    state.festival.activityDoneKey=view.key;
    state.money+=FESTIVAL_ACTIVITY_REWARD;
    state.stats.festivalActivities=(state.stats.festivalActivities||0)+1;
    return {ok:true,completed:true,message:'마을 체험 완료! 감사금 '+FESTIVAL_ACTIVITY_REWARD+'원을 받았어요.'};
  }
  return {ok:true,completed:false,message:'좋아요! '+accepted.length+' / '+view.total+'단계를 마쳤어요.'};
}
