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
]);
export const ITEMS = Object.freeze({
  tennis:{name:'테니스공', mass:0.65, radius:14, restitution:0.82, color:'#f6db4a', outline:'#8d762e'},
  ball:{name:'고무공', mass:1.0, radius:17, restitution:0.88, color:'#f0807d', outline:'#aa4351'},
  wood:{name:'나무 상자', mass:2.2, radius:20, restitution:0.34, color:'#d7a36b', outline:'#815a39'},
  metal:{name:'쇠공', mass:4.3, radius:17, restitution:0.54, color:'#9db9c6', outline:'#536e82'},
  cube:{name:'블록', mass:1.5, radius:17, restitution:0.4, color:'#8dc5e1', outline:'#467c9b'},
});
export const SURFACES = Object.freeze({
  normal:{label:'나무', drag:0.34,color:'#dfc49a'},
  ice:{label:'얼음', drag:0.075,color:'#a7e5f4'},
  carpet:{label:'카펫', drag:0.54,color:'#a4cc8f'},
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
export const STAGES = Object.freeze(Array.from({length:24},(_,i)=>{
  const zone=Math.floor(i/6), number=i%6, count=number>=4?2:1;
  const goals=Array.from({length:count},(_,j)=>({
    x:710+(number%2)*75+(j?48:0),
    y:count===1 ? 300+(number%3-1)*105 : (j?405:195),
    threshold:zone===2?(number>=3?27:17):6,
  }));
  const surfaces=zone===1?[{x:265,y:90,w:630,h:420,type:['ice','normal','carpet','ice','carpet','normal'][number]}] :
    zone===3?[{x:270,y:100,w:615,h:400,type:number%2?'normal':'ice'}]:[];
  const bumpers=zone===3?Array.from({length:1+Math.floor(number/2)},(_,k)=>({x:480+k*72,y:(k%2?410:185)+((number%2)*35),r:24})):[];
  const barriers=number===3||number===5?[{x:515,y:280,w:20,h:105}]:[];
  const itemTypes=zone===2?['tennis','wood','metal','ball']:zone===3?['ball','tennis','cube']:['ball','wood','tennis'];
  return {id:i+1,zone,number,chapter:`${zone+1}구역`,title:[
    ['첫 번째 스위치','왼쪽? 오른쪽?','멀리 있는 버튼','벽을 피해 가자','두 개의 스위치','방향의 달인'],
    ['매끈한 얼음','나무 바닥','폭신한 카펫','멀리 멀리','어느 바닥이 좋을까','마찰 탐험가'],
    ['가벼운 공','상자를 던져요','묵직한 쇠공','강한 충돌','힘을 모아서','충격의 비밀'],
    ['첫 번째 범퍼','벽에서 통통','두 개의 범퍼','반사로 우회','튕겨서 둘 다','반사 마스터'],
  ][zone][number],concept:ZONES[zone].concept,goals,surfaces,bumpers,barriers,itemTypes,
    tip:[
      ['스위치 방향을 향해 던져 보자.','방향을 바꾸면 물건이 어디로 갈까?','힘을 키워서 먼 목표를 노려 봐.','가로막힌 물건은 다른 방향을 찾아 봐.','빨간 스위치 두 개를 모두 켜야 해.','물건을 주워 여러 번 실험해도 괜찮아.'],
      ['얼음에서는 물건이 천천히 멈춰.','나무와 얼음을 비교해 보자.','카펫은 마찰이 커서 빨리 멈춰.','던지는 힘을 높이면 이동 거리가 달라져.','다른 물건으로 다시 실험해 보자.','어떤 조건이 멀리 가게 만들었니?'],
      ['작은 공은 빠르지만 가벼워.','질량과 속도를 모두 살펴보자.','쇠공은 느려도 충격량이 클 수 있어.','더 빠르게 충돌시키면 어떻게 될까?','힘이 충분해야 스위치가 켜져.','서로 다른 물건의 충돌을 비교해 봐.'],
      ['범퍼는 물체의 방향을 바꾸어.','튕기는 방향을 예상해 보자.','범퍼 두 개를 연달아 이용할 수 있어.','장애물을 돌아가도록 해 보자.','다른 방향으로 먼저 던져 봐.','튕겨 나오는 각도를 살펴봐.'],
    ][zone][number]};
}));
export const getStage=id=>STAGES[clamp(Math.floor(Number(id)||1),1,STAGES.length)-1];
const makeItem=(kind,id,x,y)=>({id,type:kind,x,y,vx:0,vy:0,r:ITEMS[kind].radius,m:ITEMS[kind].mass,bounce:ITEMS[kind].restitution,held:false,active:true,rest:0});
const gameBounds={l:36,r:924,t:60,b:562};
function resetObjects(world){
  const stage=world.stage;
  world.items=stage.itemTypes.map((kind,k)=>makeItem(kind,k,205+(k%2)*5,230+k*75));
  world.goals=stage.goals.map((g,k)=>({...g,id:k,active:false,pulse:0}));
  world.bumpers=stage.bumpers.map(b=>({...b}));
  world.barriers=stage.barriers.map(b=>({...b}));
}
export function createWorld(stageId=1,mode='campaign'){
  const stage=getStage(stageId);
  const world={mode,stage,player:{x:137,y:300,r:20,speed:245,held:null,invulnerable:0},items:[],goals:[],bumpers:[],barriers:[],bots:[],
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
export function pickup(world){
  if(world.status!=='playing'||world.player.held!==null)return false;
  let chosen=null,best=92;
  for(const item of world.items){if(item.held||!item.active||Math.hypot(item.vx,item.vy)>55)continue;const d=Math.hypot(item.x-world.player.x,item.y-world.player.y);
    if(d<best){best=d;chosen=item;}}
  if(!chosen)return false;
  chosen.held=true;chosen.vx=chosen.vy=0;world.player.held=chosen.id;
  world.events.push({type:'pickup',name:ITEMS[chosen.type].name});return true;
}
export function drop(world){
  const item=world.items.find(x=>x.id===world.player.held);
  if(!item)return false;
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
  item.vx=dir.x*speed;item.vy=dir.y*speed;item.rest=0;item.launch={type:item.type,power:p,travel:0,surface:surfaceAt(world,item.x,item.y)};
  world.player.held=null;world.shots++;world.events.push({type:'throw',name:ITEMS[item.type].name,power:p});return true;
}
function collideWalls(body){
  const {l,r,t,b}=gameBounds,rest=body.bounce??0.35;
  if(body.x-body.r<l){body.x=l+body.r;body.vx=Math.abs(body.vx||0)*rest;}
  if(body.x+body.r>r){body.x=r-body.r;body.vx=-Math.abs(body.vx||0)*rest;}
  if(body.y-body.r<t){body.y=t+body.r;body.vy=Math.abs(body.vy||0)*rest;}
  if(body.y+body.r>b){body.y=b-body.r;body.vy=-Math.abs(body.vy||0)*rest;}
}
function bumpStatic(item,x,y,r,bounce=0.86){
  const dx=item.x-x,dy=item.y-y,d=Math.hypot(dx,dy),min=item.r+r;
  if(d>=min)return false;
  const dir=norm(dx||0.001,dy),closing=item.vx*dir.x+item.vy*dir.y;
  item.x=x+dir.x*min;item.y=y+dir.y*min;
  if(closing<0){item.vx-=(1+bounce)*closing*dir.x;item.vy-=(1+bounce)*closing*dir.y;}
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
      if(force>=goal.threshold){goal.active=true;goal.pulse=0.6;world.hits++;world.combo++;world.maxCombo=Math.max(world.combo,world.maxCombo);world.comboTimer=2.6;
        const bonus=100+world.combo*30;world.score+=bonus;hit(world,goal.x,goal.y);world.events.push({type:'goal',score:bonus,combo:world.combo});
      }else if(Math.hypot(item.vx,item.vy)>20){world.events.push({type:'soft-hit'});}
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
export function stepWorld(world,input={},dt=FIXED_DT){
  if(world.status!=='playing')return world;
  dt=clamp(Number(dt)||FIXED_DT,0.001,1/30);world.time+=dt;
  const {player}=world;
  const dir=norm(Number(input.dx)||0,Number(input.dy)||0),moving=Math.abs(Number(input.dx)||0)+Math.abs(Number(input.dy)||0)>0.01;
  if(moving){player.x+=dir.x*player.speed*dt;player.y+=dir.y*player.speed*dt;}
  player.x=clamp(player.x,gameBounds.l+player.r,gameBounds.r-player.r);
  player.y=clamp(player.y,gameBounds.t+player.r,gameBounds.b-player.r);
  for(const rect of world.barriers){
    const nx=clamp(player.x,rect.x,rect.x+rect.w),ny=clamp(player.y,rect.y,rect.y+rect.h);
    const dx=player.x-nx,dy=player.y-ny,d=Math.hypot(dx,dy);
    if(d<player.r){const n=norm(dx||0.001,dy);player.x+=n.x*(player.r-d);player.y+=n.y*(player.r-d);}
  }
  for(const item of world.items){
    if(item.held){item.x=player.x+26;item.y=player.y-24;continue;}
    if(!item.active)continue;
    const surface=surfaceAt(world,item.x,item.y),drag=SURFACES[surface].drag;
    const damp=Math.exp(-drag*dt);item.vx*=damp;item.vy*=damp;
    if(item.launch)item.launch.travel+=Math.hypot(item.vx,item.vy)*dt;
    if(Math.hypot(item.vx,item.vy)<1.2){item.vx=0;item.vy=0;if(item.launch){world.experiments.push({...item.launch,distance:Math.round(item.launch.travel)});world.experiments=world.experiments.slice(-5);item.launch=null;world.events.push({type:'experiment'});}}
    item.x+=item.vx*dt;item.y+=item.vy*dt;
    collideWalls(item);
    for(const rect of world.barriers)bumpRect(item,rect);
    for(const b of world.bumpers){if(bumpStatic(item,b.x,b.y,b.r,1.06)&&Math.hypot(item.vx,item.vy)>45){world.events.push({type:'bounce'});}}
    if(world.mode!=='arcade')goalInteractions(world,item);
  }
  for(let i=0;i<world.items.length;i++){
    const a=world.items[i];if(a.held||!a.active)continue;
    for(let j=i+1;j<world.items.length;j++){const b=world.items[j];if(b.held||!b.active)continue;
      if(collidePair(a,b)){hit(world,(a.x+b.x)/2,(a.y+b.y)/2,'#ffffff',4);world.events.push({type:'clack'});}}
  }
  for(const p of world.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  world.particles=world.particles.filter(p=>p.life>0).slice(-250);
  for(const goal of world.goals)goal.pulse=Math.max(0,goal.pulse-dt);
  world.comboTimer-=dt;if(world.comboTimer<=0)world.combo=0;
  if(world.mode==='arcade')botsStep(world,dt);
  else if(world.goals.length&&world.goals.every(g=>g.active)){world.status='won';world.events.push({type:'won',score:world.score});}
  return world;
}
export function simulate(world,steps,input={}){for(let i=0;i<steps;i++)stepWorld(world,input,FIXED_DT);return world;}
export function medal(world){if(world.status!=='won')return 0;return world.shots<=world.goals.length?3:world.shots<=world.goals.length+2?2:1;}