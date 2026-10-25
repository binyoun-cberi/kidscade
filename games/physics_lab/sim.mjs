/** 와르르! 물리 연구소 — deterministic 2D game simulation, independent of Canvas and DOM.
 * Units: CSS-independent world pixels, seconds, kilograms (game-scale).
 * Physical relationships are illustrative, with documented arcade-scale coefficients.
 */
export const W = 960;
export const H = 600;
export const FIXED_DT = 1 / 60;
export const ZONES = Object.freeze([
  {name:'던지기 훈련장', concept:'방향과 힘', intro:'방향을 살피고 던져 봐. 물건이 날아가는 길을 예상할 수 있을까?', theme:'#e9f5dc'},
  {name:'미끌미끌 실험실', concept:'마찰', intro:'같은 힘으로 밀어도 바닥에 따라 멈추는 거리가 달라져!', theme:'#dceff7'},
  {name:'무게의 비밀', concept:'질량과 충격', intro:'무거운 물건과 가벼운 물건이 부딪힐 때 어떤 일이 생길까?', theme:'#ffedce'},
  {name:'통통 반사 공장', concept:'충돌과 반사', intro:'한 번 튕긴 뒤 어디로 갈까? 벽과 범퍼를 잘 이용해 봐.', theme:'#f4e1f4'},
  {name:'와르르 연쇄 연구실', concept:'연쇄 반응', intro:'첫 도미노를 맞히면 다음 도미노는 어디로 쓰러질까? 문을 여는 장치를 찾아 봐.', theme:'#f5e7d8'},
  {name:'움직이는 공장', concept:'운동과 힘의 전달', intro:'컨베이어 벨트가 물건을 움직여! 압력판에 올리고 문을 열어 봐.', theme:'#e1e9fa'},
]);
export const ITEMS = Object.freeze({
  tennis:{name:'테니스공', mass:0.65, radius:14, restitution:0.82, color:'#f6db4a', outline:'#8d762e'},
  ball:{name:'고무공', mass:1.0, radius:17, restitution:0.88, color:'#f0807d', outline:'#aa4351'},
  wood:{name:'나무 상자', mass:2.2, radius:20, restitution:0.34, color:'#d7a36b', outline:'#815a39'},
  metal:{name:'쇠공', mass:4.3, radius:17, restitution:0.54, color:'#9db9c6', outline:'#536e82'},
  cube:{name:'블록', mass:1.5, radius:17, restitution:0.4, color:'#8dc5e1', outline:'#467c9b'},
});
export const SURFACES = Object.freeze({
  normal:{label:'나무', drag:0.38,color:'#dfc49a'},
  ice:{label:'얼음', drag:0.07,color:'#a7e5f4'},
  carpet:{label:'카펫', drag:1.05,color:'#a4cc8f'},
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
// Authored early missions: every assignment has its own target placement and
// an observable physical distinction. Legacy stage IDs remain unchanged.
const EARLY_MISSIONS = [
  {goals:[[690,300]],tip:'물건을 집어 오른쪽 스위치를 향해 던져 봐.'},
  {goals:[[730,188]],tip:'같은 자리에서 방향을 바꾸면 어디에 도착할까?'},
  {goals:[[832,420]],tip:'멀리 있는 스위치야. 힘과 방향을 함께 조절해 봐.'},
  {goals:[[816,320]],barriers:[[508,235,32,152]],tip:'벽을 향해 곧장 던지면 튕겨. 위나 아래로 돌아가 봐.'},
  {goals:[[730,178],[808,428]],tip:'스위치 두 곳을 서로 다른 방향으로 맞혀 봐.'},
  {goals:[[820,196],[814,412]],barriers:[[525,265,30,124],[665,100,22,130]],bumpers:[[652,438,23]],tip:'장애물 두 개와 범퍼가 있어. 위치를 옮기며 차례로 도전해.'},
  {goals:[[760,300]],surfaces:[[270,110,590,390,'ice']],tip:'같은 힘에서도 얼음에서는 물건이 더 오래 움직여.'},
  {goals:[[784,225]],surfaces:[[270,110,590,390,'normal']],tip:'얼음보다 나무 바닥에서 더 빨리 느려지는지 보자.'},
  {goals:[[724,390]],surfaces:[[270,110,590,390,'carpet']],tip:'카펫 위에서는 더 빨리 느려져. 더 가까이 가도 좋아.'},
  {goals:[[830,183]],surfaces:[[270,100,620,175,'ice'],[270,320,620,165,'carpet']],tip:'위쪽 얼음길과 아래쪽 카펫길 중 어떤 길이 유리할까?'},
  {goals:[[740,180],[772,415]],surfaces:[[270,90,610,200,'ice'],[270,320,610,175,'carpet']],tip:'두 바닥의 감속이 달라. 어느 쪽에 힘을 더 줘야 할까?'},
  {goals:[[810,208],[805,410]],surfaces:[[300,100,570,185,'carpet'],[300,315,570,190,'ice']],barriers:[[545,275,30,60]],tip:'빠르게 멈추는 길과 멀리 미끄러지는 길을 나누어 실험해.'},
  {goals:[[710,300,11]],tip:'가벼운 공과 무거운 쇠공 중 어느 것이 스위치를 강하게 밀까?'},
  {goals:[[785,226,14]],tip:'물건이 무거워도 속도가 너무 낮으면 스위치가 움직이지 않아.'},
  {goals:[[816,376,19]],tip:'충돌은 질량과 속도의 영향을 함께 받아.'},
  {goals:[[814,300,21]],barriers:[[520,240,25,135]],tip:'벽을 피하면서도 충분히 큰 충격을 만들어 봐.'},
  {goals:[[735,192,18],[799,407,26]],tip:'위아래 스위치는 필요한 충격이 달라. 물건도 바꿔 봐.'},
  {goals:[[802,304,20]],pads:[{x:430,y:310,r:27,requiredMass:3.5}],gates:[{x:664,y:155,w:28,h:305,key:'pad'}],tip:'무거운 쇠공으로 압력판을 누르면 문이 열려. 그 뒤 스위치를 맞혀!'},
  {goals:[[759,300]],bumpers:[[495,413,25]],tip:'범퍼 가까이에서 던지면 튕김을 관찰할 수 있어.'},
  {goals:[[753,208]],bumpers:[[500,405,28]],tip:'튕기는 물건과 곧장 가는 물건의 길을 비교해 봐.'},
  {goals:[[811,300]],bumpers:[[495,145,23],[598,442,24]],tip:'공은 범퍼에서 잘 튕기고 상자는 상대적으로 덜 튕겨.'},
  {goals:[[770,300,7,1]],bumpers:[[508,417,26]],tip:'이번 스위치는 한 번 이상 벽이나 범퍼에 튕긴 물건으로만 켜져.'},
  {goals:[[747,205],[820,418]],bumpers:[[525,190,24],[637,375,26]],barriers:[[584,250,22,105]],tip:'장애물과 범퍼를 피해 두 스위치를 차례대로 맞혀.'},
  {goals:[[815,355,7,1]],bumpers:[[502,410,25],[646,178,28]],barriers:[[560,270,23,80]],tip:'마지막 임무! 벽이나 범퍼에서 한 번 튕겨 목표로 보내 봐.'},
];
const EARLY_NAMES=[
  ['첫 번째 스위치','왼쪽? 오른쪽?','멀리 있는 버튼','벽을 피해 가자','두 개의 스위치','방향의 달인'],
  ['매끈한 얼음','나무 바닥','폭신한 카펫','두 갈래 바닥','얼음과 카펫','마찰 탐험가'],
  ['가벼운 공','상자를 던져요','묵직한 쇠공','강한 충돌','두 가지 충격','쇠공으로 문 열기'],
  ['첫 번째 범퍼','통통 튕기기','두 개의 범퍼','튕겨서 켜기','장애물 사이로','반사 마스터'],
];
export const STAGES=Object.freeze(EARLY_MISSIONS.map((spec,i)=>{
  const zone=Math.floor(i/6),number=i%6;
  const goals=spec.goals.map(([x,y,threshold,requiredBounces=0])=>({x,y,threshold:threshold??(zone===2?17:6),requiredBounces}));
  const surfaces=(spec.surfaces||[]).map(([x,y,w,h,type])=>({x,y,w,h,type}));
  const barriers=(spec.barriers||[]).map(([x,y,w,h])=>({x,y,w,h}));
  const bumpers=(spec.bumpers||[]).map(([x,y,r])=>({x,y,r}));
  const itemTypes=zone===2?['tennis','wood','metal','ball']:zone===3?['ball','tennis','cube']:['ball','wood','tennis'];
  return {id:i+1,zone,number,chapter:`${zone+1}구역`,title:EARLY_NAMES[zone][number],concept:ZONES[zone].concept,
    goals,surfaces,barriers,bumpers,itemTypes,pads:spec.pads||[],gates:spec.gates||[],dominos:[],belts:[],tip:spec.tip};
}));
// Original 24 missions remain in place: existing completion records stay valid.
// The new machine missions use authored layouts instead of repeating generic targets.
const machineMissions=Array.from({length:12},(_,i)=>{
  const chain=i<6, k=i%6, id=i+25;
  const lane=[280,320,245,360,285,325][k];
  const dominoCount=[4,5,6,6,7,8][k];
  const dominos=chain?Array.from({length:dominoCount},(_,n)=>({x:346+n*46,y:lane})):[];
  const pad=chain?null:{x:k%3===2?335:410+(k%2)*45,y:lane,requiredMass:k>=3?2:1.4,r:25};
  const belts=chain?[]:[{x:285,y:lane-49,w:520,h:98,vx:k%3===2?-95:125+(k%3)*35,vy:0}];
  // The gate separates the launcher from the objective without cutting off the
  // rest of the arena: learners may creatively go around it too.
  const gates=[{x:665,y:155,w:28,h:302,key:chain?'chain':'pad',open:false}];
  const goals=[{x:800,y:lane,threshold:chain?7:10}];
  if(k>=4)goals.push({x:825,y:lane+(lane<300?115:-115),threshold:10});
  const titles=chain?['첫 번째 도미노','톡톡 이어지는 길','길어진 도미노 줄','빈틈을 찾아서','두 곳을 밝혀라','연쇄 반응의 달인']:
    ['움직이는 바닥','눌러서 문 열기','반대 방향 벨트','무거운 물건의 힘','두 목표를 지켜라','공장 완전 가동'];
  return {id,zone:chain?4:5,number:k,chapter:`${chain?5:6}구역`,title:titles[k],concept:ZONES[chain?4:5].concept,
    goals,surfaces:chain?[]:[{x:280,y:lane-49,w:530,h:98,type:k%2?'normal':'ice'}],
    bumpers:chain&&k>=3?[{x:577,y:lane+(k%2?85:-85),r:20}]:[],barriers:[],
    dominos,belts,pads:pad?[pad]:[],gates,
    itemTypes:chain?['ball','wood','tennis']:['wood','ball','metal'],
    tip:chain?'도미노 첫 조각을 건드리면 다음 조각으로 움직임이 이어져. 맨 끝까지 전달되면 문이 열려!':
      (k%3===2?`벨트가 반대로 움직여. 질량 ${pad.requiredMass} 이상인 물건으로 압력판을 누른 다음, 바깥길로 돌아 목표를 노려 봐.`:
      `압력판은 질량 ${pad.requiredMass} 이상인 물건으로 눌러야 해. 벨트의 방향도 살펴봐.`)};
});
export const ALL_STAGES=Object.freeze([...STAGES,...machineMissions]);
export const getStage=id=>ALL_STAGES[clamp(Math.floor(Number(id)||1),1,ALL_STAGES.length)-1];
const makeItem=(kind,id,x,y)=>({id,type:kind,x,y,vx:0,vy:0,r:ITEMS[kind].radius,m:ITEMS[kind].mass,bounce:ITEMS[kind].restitution,held:false,active:true,rest:0,bounces:0});
const gameBounds={l:36,r:924,t:60,b:562};
function resetObjects(world){
  const stage=world.stage;
  world.items=stage.itemTypes.map((kind,k)=>makeItem(kind,k,205+(k%2)*5,230+k*75));
  world.goals=stage.goals.map((g,k)=>({...g,id:k,active:false,pulse:0}));
  world.bumpers=stage.bumpers.map(b=>({...b}));
  world.barriers=stage.barriers.map(b=>({...b}));
  world.dominos=(stage.dominos||[]).map((d,k)=>({...d,id:k,r:13,fallen:false,timer:0}));
  world.belts=(stage.belts||[]).map(b=>({...b}));
  world.pads=(stage.pads||[]).map(p=>({...p,active:false}));
  world.gates=(stage.gates||[]).map(g=>({...g,open:false}));
  world.chainStarted=false;world.chainComplete=false;
}
export function createWorld(stageId=1,mode='campaign'){
  const stage=getStage(stageId);
  const world={mode,stage,player:{x:137,y:300,r:20,speed:245,held:null,invulnerable:0},items:[],goals:[],bumpers:[],barriers:[],dominos:[],belts:[],pads:[],gates:[],bots:[],
    time:0,score:0,shots:0,hits:0,experiments:[],combo:0,maxCombo:0,comboTimer:0,particles:[],messages:[],status:'playing',hearts:3,
    spawnTimer:4,spawnCount:0,nextId:1000,events:[],clock:0};
  resetObjects(world);
  if(mode==='arcade'){
    world.stage={...stage,zone:0,title:'와르르 챌린지',tip:'연속으로 로봇을 맞히면 콤보 보너스!',surfaces:[],goals:[],bumpers:[{x:490,y:180,r:22},{x:585,y:425,r:22}],barriers:[],itemTypes:['ball','wood','tennis','metal']};
    resetObjects(world);world.spawnTimer=2;
  }
  return world;
}
export function surfaceAt(world,x,y){
  for(const z of world.stage.surfaces){if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)return z.type;}
  return 'normal';
}
function finishExperiment(world,item,reason){
  if(!item.launch)return;
  const launch=item.launch;
  world.experiments.push({...launch,distance:Math.round(launch.travel),reason});
  world.experiments=world.experiments.slice(-8);
  item.launch=null;
  world.events.push({type:'experiment',reason});
}
export function pickup(world){
  if(world.status!=='playing'||world.player.held!==null)return false;
  let chosen=null,best=92;
  for(const item of world.items){if(item.held||!item.active||Math.hypot(item.vx,item.vy)>55)continue;const d=Math.hypot(item.x-world.player.x,item.y-world.player.y);
    if(d<best){best=d;chosen=item;}}
  if(!chosen)return false;
  finishExperiment(world,chosen,'다시 집기');
  chosen.held=true;chosen.vx=chosen.vy=0;world.player.held=chosen.id;
  world.events.push({type:'pickup',name:ITEMS[chosen.type].name});return true;
}
export function drop(world){
  const item=world.items.find(x=>x.id===world.player.held);
  if(!item)return false;
  finishExperiment(world,item,'내려놓기');
  item.held=false;item.x=world.player.x+30;item.y=world.player.y;item.vx=0;item.vy=0;
  world.player.held=null;return true;
}
export function throwItem(world,tx,ty,power=0.82){
  if(world.status!=='playing')return false;
  const item=world.items.find(x=>x.id===world.player.held);
  if(!item)return false;
  const dir=norm(tx-world.player.x,ty-world.player.y),p=clamp(Number(power)||0,0.2,1);
  const speed=(500*p)/Math.pow(item.m,0.2); // arcade throw: heavy objects are somewhat slower, with more momentum
  item.held=false;item.x=world.player.x+dir.x*(world.player.r+item.r+3);item.y=world.player.y+dir.y*(world.player.r+item.r+3);
  item.vx=dir.x*speed;item.vy=dir.y*speed;item.rest=0;item.bounces=0;item.launch={type:item.type,power:p,travel:0,surface:surfaceAt(world,item.x,item.y),surfaceTrail:[surfaceAt(world,item.x,item.y)],elapsed:0,bounces:0};
  world.player.held=null;world.shots++;world.events.push({type:'throw',name:ITEMS[item.type].name,power:p});return true;
}
function collideWalls(body){
  const {l,r,t,b}=gameBounds,rest=body.bounce??0.35;
  if(body.x-body.r<l){if(body.vx< -15){body.bounces=(body.bounces||0)+1;if(body.launch)body.launch.bounces++;}body.x=l+body.r;body.vx=Math.abs(body.vx||0)*rest;}
  if(body.x+body.r>r){if(body.vx>15){body.bounces=(body.bounces||0)+1;if(body.launch)body.launch.bounces++;}body.x=r-body.r;body.vx=-Math.abs(body.vx||0)*rest;}
  if(body.y-body.r<t){if(body.vy< -15){body.bounces=(body.bounces||0)+1;if(body.launch)body.launch.bounces++;}body.y=t+body.r;body.vy=Math.abs(body.vy||0)*rest;}
  if(body.y+body.r>b){if(body.vy>15){body.bounces=(body.bounces||0)+1;if(body.launch)body.launch.bounces++;}body.y=b-body.r;body.vy=-Math.abs(body.vy||0)*rest;}
}
function bumpStatic(item,x,y,r,bounce=0.86){
  const dx=item.x-x,dy=item.y-y,d=Math.hypot(dx,dy),min=item.r+r;
  if(d>=min)return false;
  const dir=norm(dx||0.001,dy),closing=item.vx*dir.x+item.vy*dir.y;
  item.x=x+dir.x*min;item.y=y+dir.y*min;
  if(closing< -15){item.bounces=(item.bounces||0)+1;if(item.launch)item.launch.bounces++;item.vx-=(1+bounce)*closing*dir.x;item.vy-=(1+bounce)*closing*dir.y;}
  return true;
}
function bumpRect(item,rect){
  const nx=clamp(item.x,rect.x,rect.x+rect.w),ny=clamp(item.y,rect.y,rect.y+rect.h);
  if(Math.hypot(item.x-nx,item.y-ny)>=item.r)return;
  let dx=item.x-nx,dy=item.y-ny;
  if(Math.abs(dx)+Math.abs(dy)<0.001){const sides=[Math.abs(item.x-rect.x),Math.abs(item.x-(rect.x+rect.w)),Math.abs(item.y-rect.y),Math.abs(item.y-(rect.y+rect.h))];
    const m=sides.indexOf(Math.min(...sides));dx=m===0?-1:m===1?1:0;dy=m===2?-1:m===3?1:0;}
  const n=norm(dx,dy),overlap=item.r-Math.hypot(item.x-nx,item.y-ny);item.x+=n.x*overlap;item.y+=n.y*overlap;
  const vn=item.vx*n.x+item.vy*n.y;if(vn<0){item.vx-=vn*1.48*n.x;item.vy-=vn*1.48*n.y;}
}
function collidePair(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
  if(d>=min)return false;
  const n=norm(dx||0.001,dy),overlap=(min-d)/2;
  a.x-=n.x*overlap;a.y-=n.y*overlap;b.x+=n.x*overlap;b.y+=n.y*overlap;
  const rel=(b.vx-a.vx)*n.x+(b.vy-a.vy)*n.y;
  if(rel>=0)return false;
  const impulse=-(1+Math.min(a.bounce,b.bounce))*rel/(1/a.m+1/b.m);
  a.vx-=impulse*n.x/a.m;a.vy-=impulse*n.y/a.m;
  b.vx+=impulse*n.x/b.m;b.vy+=impulse*n.y/b.m;
  return Math.abs(impulse)>80;
}
function hit(world,x,y,color='#ffe477',n=9){
  for(let i=0;i<n;i++){const angle=i*(Math.PI*2/n),v=70+20*(i%3);world.particles.push({x,y,vx:Math.cos(angle)*v,vy:Math.sin(angle)*v,life:0.4,max:0.4,color});}
}
function goalInteractions(world,item){
  for(const goal of world.goals){if(goal.active)continue;
    const d=Math.hypot(item.x-goal.x,item.y-goal.y);
    if(d<item.r+22){const force=Math.hypot(item.vx,item.vy)*item.m*0.043;
      if(force>=goal.threshold && (item.bounces||0)>=(goal.requiredBounces||0)){finishExperiment(world,item,'목표 명중');goal.active=true;goal.pulse=0.6;world.hits++;world.combo++;world.maxCombo=Math.max(world.combo,world.maxCombo);world.comboTimer=2.6;
        const bonus=100+world.combo*30;world.score+=bonus;hit(world,goal.x,goal.y);world.events.push({type:'goal',score:bonus,combo:world.combo});
      }else if(Math.hypot(item.vx,item.vy)>20 && world.time-(goal.lastHintAt??-99)>1.5){goal.lastHintAt=world.time;world.events.push({type:'soft-hit',reason:(item.bounces||0)<(goal.requiredBounces||0)?'bounce':'impact'});}
      bumpStatic(item,goal.x,goal.y,22,0.4);
    }
  }
}
function botsStep(world,dt){
  world.spawnTimer-=dt;
  if(world.spawnTimer<=0){world.spawnCount++;world.spawnTimer=clamp(3.6-world.score/850,1.0,3.6);
    world.bots.push({x:850,y:100+((world.spawnCount*137)%380),vx:-(38+Math.min(75,world.score/50)),vy:Math.sin(world.spawnCount*7)*18,r:20,hp:1,id:world.nextId++});
    world.events.push({type:'spawn'});
  }
  for(const bot of world.bots){bot.x+=bot.vx*dt;bot.y+=bot.vy*dt;
    for(const item of world.items){if(item.held||!item.active)continue;
      if(Math.hypot(item.x-bot.x,item.y-bot.y)<item.r+bot.r && Math.hypot(item.vx,item.vy)*item.m>65){
        bot.hp=0;world.combo++;world.maxCombo=Math.max(world.combo,world.maxCombo);world.comboTimer=2.8;
        world.hits++;const points=50+world.combo*20;world.score+=points;hit(world,bot.x,bot.y,'#f4b3cb',12);
        item.vx*=.6;item.vy*=.6;world.events.push({type:'bot-hit',points});break;
      }
    }
    if(bot.x<190&&bot.hp>0){bot.hp=0;world.hearts--;world.combo=0;world.events.push({type:'hurt',hearts:world.hearts});}
  }
  world.bots=world.bots.filter(b=>b.hp>0);
  if(world.hearts<=0){world.status='lost';world.events.push({type:'lost'});}
  if(world.items.filter(i=>i.active&&!i.held&&Math.hypot(i.x-world.player.x,i.y-world.player.y)<85).length===0 && world.player.held===null){
    world.clock+=dt;
    if(world.clock>4){world.clock=0;const types=['ball','wood','tennis','metal'];const ty=types[world.spawnCount%types.length];
      world.items.push(makeItem(ty,world.nextId++,205,285));world.events.push({type:'restock'});}
  }else world.clock=0;
}
// A lightweight one-shot chain reaction. Each falling domino relays an impulse
// to its nearest standing neighbor within a fixed radius; the chain completes
// only if the last domino actually falls, not merely after a fixed timer.
function toppleDomino(world, domino){
  if(domino.fallen)return;
  domino.fallen=true;domino.timer=0.12;
  world.chainStarted=true;
  world.events.push({type:'domino',id:domino.id});
  hit(world,domino.x,domino.y,'#f8cf77',5);
}
function stepMachines(world,dt){
  for(const pad of world.pads){
    if(pad.active)continue;
    const loaded=world.items.some(item=>!item.held&&item.active&&item.m>=pad.requiredMass && Math.hypot(item.x-pad.x,item.y-pad.y)<=item.r+pad.r-8);
    if(loaded){pad.active=true;world.events.push({type:'pad',mass:pad.requiredMass});}
  }
  for(const domino of world.dominos){
    if(!domino.fallen){for(const item of world.items){
      if(item.held||!item.active)continue;
      const dist=Math.hypot(item.x-domino.x,item.y-domino.y);
      if(dist<=item.r+domino.r&&Math.hypot(item.vx,item.vy)*item.m>75){toppleDomino(world,domino);break;}
    }}
    if(domino.fallen&&domino.timer>0){domino.timer-=dt;if(domino.timer<=0){
      const next=world.dominos.find(d=>!d.fallen&&Math.hypot(d.x-domino.x,d.y-domino.y)<53);
      if(next)toppleDomino(world,next);
    }}
  }
  if(world.dominos.length && world.dominos.every(d=>d.fallen))world.chainComplete=true;
  for(const gate of world.gates){
    if(gate.open)continue;
    if((gate.key==='chain'&&world.chainComplete)||(gate.key==='pad'&&world.pads.length&&world.pads.every(p=>p.active))){
      gate.open=true;hit(world,gate.x+gate.w/2,gate.y+gate.h/2,'#9edcbd',12);
      world.events.push({type:'gate'});
    }
  }
}
export function stepWorld(world,input={},dt=FIXED_DT){
  if(world.status!=='playing')return world;
  dt=clamp(Number(dt)||FIXED_DT,0.001,1/30);world.time+=dt;
  const {player}=world;
  const dir=norm(Number(input.dx)||0,Number(input.dy)||0),moving=Math.abs(Number(input.dx)||0)+Math.abs(Number(input.dy)||0)>0.01;
  if(moving){player.x+=dir.x*player.speed*dt;player.y+=dir.y*player.speed*dt;}
  player.x=clamp(player.x,gameBounds.l+player.r,gameBounds.r-player.r);
  player.y=clamp(player.y,gameBounds.t+player.r,gameBounds.b-player.r);
  for(const rect of [...world.barriers,...world.gates.filter(g=>!g.open)]){
    const nx=clamp(player.x,rect.x,rect.x+rect.w),ny=clamp(player.y,rect.y,rect.y+rect.h);
    const dx=player.x-nx,dy=player.y-ny,d=Math.hypot(dx,dy);
    if(d<player.r){
      if(d<1e-6){const sides=[player.x-rect.x,rect.x+rect.w-player.x,player.y-rect.y,rect.y+rect.h-player.y];
        const side=sides.indexOf(Math.min(...sides));
        if(side===0)player.x=rect.x-player.r;else if(side===1)player.x=rect.x+rect.w+player.r;
        else if(side===2)player.y=rect.y-player.r;else player.y=rect.y+rect.h+player.r;
      }else{const n=norm(dx,dy);player.x+=n.x*(player.r-d);player.y+=n.y*(player.r-d);}
    }
  }
  for(const item of world.items){
    if(item.held){item.x=player.x+26;item.y=player.y-24;continue;}
    if(!item.active)continue;
    const surface=surfaceAt(world,item.x,item.y),drag=SURFACES[surface].drag;
    if(item.launch&&!item.launch.surfaceTrail.includes(surface))item.launch.surfaceTrail.push(surface);
    const damp=Math.exp(-drag*dt);item.vx*=damp;item.vy*=damp;
    for(const belt of world.belts){if(item.x>=belt.x&&item.x<=belt.x+belt.w&&item.y>=belt.y&&item.y<=belt.y+belt.h){
      const gain=1-Math.exp(-3*dt);item.vx+=(belt.vx-item.vx)*gain;item.vy+=(belt.vy-item.vy)*gain;
    }}
    if(item.launch){item.launch.travel+=Math.hypot(item.vx,item.vy)*dt;item.launch.elapsed+=dt;}
    if(Math.hypot(item.vx,item.vy)<1.2){item.vx=0;item.vy=0;if(item.launch)finishExperiment(world,item,'멈춤');}
    if(item.launch&&item.launch.elapsed>=7)finishExperiment(world,item,'7초 관찰');
    item.x+=item.vx*dt;item.y+=item.vy*dt;
    collideWalls(item);
    for(const rect of [...world.barriers,...world.gates.filter(g=>!g.open)])bumpRect(item,rect);
    for(const b of world.bumpers){if(bumpStatic(item,b.x,b.y,b.r,1.06)&&Math.hypot(item.vx,item.vy)>45){world.events.push({type:'bounce'});}}
    if(world.mode!=='arcade')goalInteractions(world,item);
  }
  for(let i=0;i<world.items.length;i++){
    const a=world.items[i];if(a.held||!a.active)continue;
    for(let j=i+1;j<world.items.length;j++){const b=world.items[j];if(b.held||!b.active)continue;
      if(collidePair(a,b)){hit(world,(a.x+b.x)/2,(a.y+b.y)/2,'#ffffff',4);world.events.push({type:'clack'});}}
  }
  stepMachines(world,dt);
  for(const p of world.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  world.particles=world.particles.filter(p=>p.life>0).slice(-250);
  for(const goal of world.goals)goal.pulse=Math.max(0,goal.pulse-dt);
  world.comboTimer-=dt;if(world.comboTimer<=0)world.combo=0;
  if(world.mode==='arcade')botsStep(world,dt);
  else if(world.goals.length&&world.goals.every(g=>g.active) && world.gates.every(g=>g.open)){world.status='won';world.events.push({type:'won',score:world.score});}
  return world;
}
export function simulate(world,steps,input={}){for(let i=0;i<steps;i++)stepWorld(world,input,FIXED_DT);return world;}
export function medal(world){
  if(world.status!=='won')return 0;
  const planned=world.goals.length+(world.pads.length?1:0)+(world.dominos.length?1:0);
  return world.shots<=planned?3:world.shots<=planned+2?2:1;
}
