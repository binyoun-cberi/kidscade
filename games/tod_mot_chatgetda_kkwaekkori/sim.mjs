// Seeded, renderer-independent town activities and fair observation puzzles.
export const WORLD_VERSION = 3;
export const BLOCK_PITCH = 7;
export const STAGES = Object.freeze({
  small: { label: '작은 마을', cols: 3, rows: 2, residents: 18, targets: 1 },
  medium: { label: '북적북적 동네', cols: 5, rows: 3, residents: 45, targets: 3 },
  large: { label: '와글와글 대도시', cols: 7, rows: 4, residents: 84, targets: 5 }
});
export const DIFFICULTIES = Object.freeze({
  easy: {name:'똑같은 친구',description:'그림과 같은 친구를 찾아요'},
  normal: {name:'자세히 보기',description:'옷과 하고 있는 일을 함께 봐요'},
  hard: {name:'꼼꼼히 찾기',description:'손에 든 물건까지 비교해요'}
});
export const COLORS = Object.freeze([
  { name:'빨간',hex:'#ee5963' },{ name:'노란',hex:'#f4cc4e' },{ name:'파란',hex:'#5b83d5' }
]);
export const ACTIVITIES = Object.freeze([
  {id:'browse',name:'빵을 고르는',clip:'holding-both',props:['식빵','크루아상','도넛']},
  {id:'deliver',name:'빵을 배달하는',clip:'walk',props:['식빵','크루아상','도넛']},
  {id:'eat',name:'빵을 먹는',clip:'holding-right',props:['식빵','크루아상','도넛']},
  {id:'read',name:'책을 읽는',clip:'holding-both',props:['빨간 책','노란 책','파란 책']},
  {id:'ball',name:'공놀이하는',clip:'idle',props:['빨간 공','노란 공','파란 공']},
  {id:'sit',name:'벤치에서 쉬는',clip:'sit',props:['빨간 방석','노란 방석','파란 방석']},
  {id:'wait',name:'버스를 기다리는',clip:'idle',props:['빨간 가방','노란 가방','파란 가방']},
  {id:'wave',name:'손을 흔드는',clip:'interact-right',props:['빨간 손수건','노란 손수건','파란 손수건']},
  {id:'map',name:'지도를 보는',clip:'holding-both',props:['빨간 지도','노란 지도','파란 지도']}
]);
export const DISTRICTS = Object.freeze([
  {name:'달콤한 빵집',kind:'bakery',activities:['browse','deliver','eat']},
  {name:'햇살 공원',kind:'park',activities:['read','ball','sit']},
  {name:'와글와글 정류장',kind:'stop',activities:['wait','wave','map']},
  {name:'알록달록 시장',kind:'market',activities:['browse','deliver','eat']},
  {name:'다정한 주택가',kind:'home',activities:['read','wave','sit']},
  {name:'학교 앞 거리',kind:'school',activities:['read','ball','wait']}
]);
export function createRng(seed) {
  let state=(Number(seed)>>>0)||1;
  return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function shuffled(input,random){const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function getBlockCenter(block,stage){const c=typeof stage==='string'?STAGES[stage]:stage;return {x:(block.col-(c.cols-1)/2)*BLOCK_PITCH,z:(block.row-(c.rows-1)/2)*BLOCK_PITCH};}
export function signature(p){return `${p.modelVariant}:${p.activity}:${p.propVariant}`;}
export function getRoutePosition(person,stage){
  const c=getBlockCenter(person.block,stage);
  // Separate activity bays in front of every building, with room for bodies and props.
  const motion=person.activity==='deliver'&&!person.found ? Math.sin(person.elapsed*.8)*.16:0;
  return {x:c.x+(person.slot-1)*1.55+motion,z:c.z+2.15};
}
export function makeTown(stageName='small',seed=1,difficulty='easy',autoSelect=true){
  const config=STAGES[stageName];if(!config)throw new Error(`알 수 없는 마을 크기: ${stageName}`);
  if(!DIFFICULTIES[difficulty])difficulty='easy';
  const random=createRng(seed),blocks=[],used=new Set();
  for(let row=0;row<config.rows;row++)for(let col=0;col<config.cols;col++)blocks.push({id:`b${row}-${col}`,col,row,...DISTRICTS[(col+row*config.cols)%6]});
  const people=Array.from({length:config.residents},(_,i)=>{
    const block=blocks[i%blocks.length],slot=Math.floor(i/blocks.length),activity=block.activities[slot%3];
    const choices=shuffled(Array.from({length:36},(_,n)=>({modelVariant:n%12,propVariant:Math.floor(n/12)})),random);
    const look=choices.find(v=>!used.has(signature({...v,activity})));
    const person={id:`person-${i}`,block,slot,...look,activity,action:activity,elapsed:0,routineAt:18+random()*14,reserved:false,found:false};
    used.add(signature(person));return person;
  });
  const town={stageName,config,seed,difficulty,blocks,people,order:[],time:0};
  if(autoSelect)selectTargets(town,people.map(p=>p.id));return town;
}
export function selectTargets(town,eligibleIds,previous=[]){
  const eligible=new Set(eligibleIds),random=createRng(town.seed^0x51fa77);
  const pool=shuffled(town.people.filter(p=>eligible.has(p.id)&&(town.difficulty!=='hard'||town.people.some(q=>q.id!==p.id&&q.activity===p.activity))),random),order=[];
  const recent=new Set(previous),kinds=new Set();
  while(order.length<town.config.targets&&pool.length){
    let index=pool.findIndex(p=>!recent.has(signature(p))&&!kinds.has(p.block.kind)&&!order.some(id=>town.people.find(q=>q.id===id).activity===p.activity));
    if(index<0)index=0;
    const [person]=pool.splice(index,1);order.push(person.id);kinds.add(person.block.kind);
  }
  town.order=order;for(const p of town.people)p.reserved=order.includes(p.id);
  if(town.difficulty!=='easy')for(const id of order){
    const target=town.people.find(p=>p.id===id);
    const candidates=town.people.filter(p=>!p.reserved&&!p.foilFor&&p.id!==id&&(town.difficulty==='hard'?p.activity===target.activity:p.activity!==target.activity));
    let assigned=false;
    for(const foil of candidates){
      for(const propVariant of [(target.propVariant+1)%3,(target.propVariant+2)%3]){
        const look={...foil,modelVariant:target.modelVariant,propVariant};
        if(town.people.some(p=>p.id!==foil.id&&signature(p)===signature(look)))continue;
        Object.assign(foil,{modelVariant:target.modelVariant,propVariant,foilFor:id,reserved:true});assigned=true;break;
      }
      if(assigned)break;
    }
  }
  return order;
}
export function movePeople(town,deltaSeconds){
  const dt=Math.min(.1,Math.max(0,Number(deltaSeconds)||0));town.time+=dt;
  for(const p of town.people){
    p.elapsed+=dt;if(p.reserved||p.found||p.elapsed<p.routineAt)continue;
    const list=p.block.activities,next=list[(list.indexOf(p.activity)+1)%list.length];
    if(!town.people.some(q=>q.id!==p.id&&signature(q)===signature({...p,activity:next}))){p.activity=next;p.action=next;}
    p.routineAt=p.elapsed+20+(p.slot%3)*4;
  }
}
export function getClue(person,difficulty='easy'){
  if(!person)return null;const a=ACTIVITIES.find(a=>a.id===person.activity),prop=a.props[person.propVariant];
  return {title:difficulty==='hard'?`${prop} · ${a.name} 친구`:`${a.name} 친구`,subtitle:`${a.name} 친구를 찾아줘! ${prop}도 확인해 봐.`,place:`${person.block.name} 근처에 있어요.`,prop};
}
export function getComparison(target,picked){
  if(target.modelVariant!==picked.modelVariant)return '하고 있는 일은 비슷할까? 얼굴과 옷도 살펴봐!';
  if(target.activity!==picked.activity)return '옷이 같은 친구네! 무엇을 하고 있는지도 살펴봐!';
  return '아주 비슷하네! 손에 든 물건의 모양과 색도 살펴봐!';
}
export function personIsDiscoverable(town,id){const p=town.people.find(p=>p.id===id);return !!p&&town.people.filter(q=>signature(q)===signature(p)).length===1;}
