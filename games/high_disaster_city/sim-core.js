(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rngStep(state){state.seed=(state.seed*1664525+1013904223)>>>0;return state.seed/4294967296}
function shuffle(state,list){for(let i=list.length-1;i>0;i--){const j=Math.floor(rngStep(state)*(i+1));[list[i],list[j]]=[list[j],list[i]]}return list}
function sideOfX(x){return x<D.TOWN_X?'left':'right'}
class Simulation{
 constructor(){this.uid=1;this.listeners=[];this.reset()}
 reset(){
  this.state={mode:'ready',paused:false,tutorial:false,tutorialStep:0,time:0,seed:1,money:320,food:28,population:14,stability:100,maxPopulation:14,
   slots:D.SLOT_X.map((x,i)=>({i,x,building:null})),deck:[],discard:[],hand:[],selectedUid:null,refreshCooldown:0,economyClock:0,growthClock:0,hungerClock:0,
   disasters:[],next:{side:'left',type:'wildfire',in:24,visible:true},lastSide:'right',lastType:null,rewardChoices:[],cleanupChoices:[],rewardBacklog:0,effects:[],signals:[],
   stats:{resolved:0,lost:0,placed:0,replaced:0,upgraded:0,cardsPlayed:0,removed:0}};
 }
 on(fn){this.listeners.push(fn)}
 emit(kind,message,data){this.state.signals.push({kind,message,data})}
 start(opts={}){
  this.reset();const s=this.state;s.mode='playing';s.tutorial=!!opts.tutorial;s.seed=(opts.seed>>>0)||((Date.now()^Math.floor(performance.now()*1000))>>>0)||1;
  s.deck=shuffle(s,D.START_DECK.slice());this.drawToFive();s.next.type=rngStep(s)<.5?'wildfire':'flood';s.next.in=22+rngStep(s)*5;s.next.visible=true;
  if(s.tutorial){s.tutorialStep=1;this.emit('tip','건설 카드를 누른 뒤 밝아지는 땅을 눌러 보세요.')}
  this.emit('start','도시 운영을 시작합니다.');
 }
 rand(){return rngStep(this.state)}
 pick(list){return list[Math.floor(this.rand()*list.length)]}
 cardDef(uid){const c=this.state.hand.find(x=>x.uid===uid);return c?D.CARDS[c.id]:null}
 drawOne(){
  const s=this.state;if(!s.deck.length){if(!s.discard.length)return null;s.deck=shuffle(s,s.discard.splice(0))}
  const id=s.deck.pop();if(!id)return null;const c={id,uid:this.uid++};s.hand.push(c);return c
 }
 drawToFive(){while(this.state.hand.length<5&&this.drawOne()){}}
 discardCard(uid){
  const s=this.state,i=s.hand.findIndex(c=>c.uid===uid);if(i<0)return null;const [c]=s.hand.splice(i,1);s.discard.push(c.id);if(s.selectedUid===uid)s.selectedUid=null;this.drawToFive();return c
 }
 selectCard(uid){
  const c=this.cardDef(uid);if(!c||c.kind!=='build'||!this.buildCardUsable(uid))return false;
  this.state.selectedUid=this.state.selectedUid===uid?null:uid;return true
 }
 buildCardUsable(uid){return this.state.slots.some((_,i)=>this.canPlace(uid,i))}
 canAfford(cost){return this.state.money>=cost}
 buildingCount(id,side){
  return this.state.slots.reduce((n,s)=>n+(s.building&&s.building.id===id&&(!side||sideOfX(s.x)===side)?1:0),0)
 }
 supportPower(id,side,progress=.5){
  const frontX=side==='left'?70+progress*650:1370-progress*650;let power=0;
  for(const slot of this.state.slots){const b=slot.building;if(!b||b.id!==id||sideOfX(slot.x)!==side)continue;
   const level=b.level||1,dist=Math.abs(slot.x-frontX),weight=clamp(1.18-dist/850,.52,1.18);power+=level*weight;
  }
  return power
 }
 cityValue(){return this.state.slots.reduce((n,s)=>n+(s.building?D.BUILDINGS[s.building.id].cost*(1+((s.building.level||1)-1)*.45):0),0)}
 pressure(){const t=this.state.time;const early=.52+.48*(1-Math.exp(-t/180));const late=Math.max(0,t-180)/720*.85;const city=this.cityValue()/9000;return clamp(early+late+city,.52,2.35)}
 capacity(){return 14+this.state.slots.reduce((n,s)=>n+(s.building?.id==='house'?6*(s.building.level||1):0),0)}
 placementCost(uid,slotIndex){
  const c=this.cardDef(uid),slot=this.state.slots[slotIndex];if(!c||c.kind!=='build'||!slot)return Infinity;
  if(!slot.building)return c.cost;
  const old=D.BUILDINGS[slot.building.id];if(slot.building.id===c.building){if((slot.building.level||1)>=3)return Infinity;return Math.max(10,Math.round(c.cost*(.58+.12*(slot.building.level||1))))}
  return Math.max(10,Math.round(c.cost-old.cost*.25))
 }
 canPlace(uid,slotIndex){const cost=this.placementCost(uid,slotIndex);return Number.isFinite(cost)&&this.canAfford(cost)}
 placeSelected(slotIndex){
  const s=this.state,uid=s.selectedUid;if(!this.canPlace(uid,slotIndex))return false;const c=this.cardDef(uid),def=D.BUILDINGS[c.building],slot=s.slots[slotIndex],cost=this.placementCost(uid,slotIndex),old=slot.building;
  s.money-=cost;
  if(old&&old.id===def.id){
   const nextLevel=(old.level||1)+1,ratio=clamp(old.hp/old.maxHp,0,1),maxHp=Math.round(def.hp*(1+.32*(nextLevel-1)));
   slot.building={...old,level:nextLevel,maxHp,hp:Math.max(Math.round(maxHp*.72),Math.round(maxHp*ratio))};s.stats.upgraded++;this.emit('build',def.name+' '+nextLevel+'단계 강화!',{x:slot.x});
  }else{
   if(old){s.stats.replaced++;this.emit('replace',D.BUILDINGS[old.id].name+'을(를) '+def.name+'으로 교체',{x:slot.x})}
   slot.building={id:def.id,hp:def.hp,maxHp:def.hp,level:1,placedAt:s.time};s.stats.placed++;if(!old)this.emit('build',def.name+' 건설 완료',{x:slot.x});
  }
  s.stats.cardsPlayed++;this.discardCard(uid);
  if(s.tutorial&&s.tutorialStep===1){s.tutorialStep=2;this.emit('tip','좋아요. 이제 좌우 경고를 보면서 도시를 키우세요.')}
  return true
 }
 matchingDisaster(type){return this.state.disasters.filter(d=>d.type===type).sort((a,b)=>b.progress-a.progress)[0]||null}
 repairTarget(){
  const s=this.state,flood=this.matchingDisaster('flood');
  if(flood&&Number.isInteger(flood.blockedSlot)&&flood.blockedSlot>=0){
   const slot=s.slots[flood.blockedSlot];if(slot?.building?.id==='levee'&&slot.building.hp<slot.building.maxHp)return slot;
  }
  return s.slots.filter(x=>x.building&&x.building.hp<x.building.maxHp).sort((a,b)=>(a.building.hp/a.building.maxHp)-(b.building.hp/b.building.maxHp))[0]||null
 }
 actionUsable(def){
  const s=this.state;if(!def||def.kind!=='action'||!this.canAfford(def.cost))return false;
  if(def.action==='fireBrigade'||def.action==='firebreak')return !!this.matchingDisaster('wildfire');
  if(def.action==='sandbags'||def.action==='emergencyDrain')return !!this.matchingDisaster('flood');
  if(def.action==='repair')return !!this.repairTarget();
  return true
 }
 playAction(uid){
  const s=this.state,def=this.cardDef(uid);if(!this.actionUsable(def))return false;s.money-=def.cost;
  if(def.action==='fireBrigade'){
   const d=this.matchingDisaster('wildfire'),bonus=1+this.buildingCount('reservoir',d.side)*.12;d.energy=Math.max(0,d.energy-34*bonus);d.progress=Math.max(0,d.progress-.09*bonus);this.emit('response','소방대가 불길을 밀어냈습니다.');
  }else if(def.action==='firebreak'){
   const d=this.matchingDisaster('wildfire');d.energy=Math.max(0,d.energy-6);d.progress=Math.max(0,d.progress-.145);d.blockPause=Math.max(d.blockPause||0,2.4);this.emit('response','방화선이 불길의 전진을 끊었습니다.');
  }else if(def.action==='sandbags'){
   const d=this.matchingDisaster('flood');d.energy=Math.max(0,d.energy-18);d.progress=Math.max(0,d.progress-.075);d.blockPause=Math.max(d.blockPause||0,2.1);this.emit('response','모래주머니로 물길을 늦췄습니다.');
  }else if(def.action==='emergencyDrain'){
   const d=this.matchingDisaster('flood');d.energy=Math.max(0,d.energy-7);d.progress=Math.max(0,d.progress-.14);d.blockPause=Math.max(d.blockPause||0,1.7);this.emit('response','긴급 배수로 물길을 뒤로 밀었습니다.');
  }else if(def.action==='repair'){
   const damaged=this.repairTarget();
   if(damaged){const isBlockingLevee=damaged.building.id==='levee'&&this.state.disasters.some(d=>d.type==='flood'&&d.blockedSlot===damaged.i),amount=isBlockingLevee?72:52;damaged.building.hp=Math.min(damaged.building.maxHp,damaged.building.hp+amount);this.emit('repair',(isBlockingLevee?'홍수를 막는 ':'')+D.BUILDINGS[damaged.building.id].name+' 긴급 수리',{x:damaged.x})}
  }else if(def.action==='ration'){s.food+=12;this.emit('supply','비상 식량 +12')}
  s.stats.cardsPlayed++;this.discardCard(uid);return true
 }
 refreshHand(){
  const s=this.state;if(s.refreshCooldown>0||s.hand.length===0)return false;for(const c of s.hand)s.discard.push(c.id);s.hand.length=0;s.selectedUid=null;s.refreshCooldown=12;this.drawToFive();this.emit('shuffle','손패를 새로 받았습니다.');return true
 }
 damageBuilding(slotIndex,amount,cause){
  const s=this.state,slot=s.slots[slotIndex];if(!slot?.building)return false;slot.building.hp-=amount;if(slot.building.hp>0)return false;
  const old=slot.building,def=D.BUILDINGS[old.id];slot.building=null;s.stats.lost++;s.stability=Math.max(0,s.stability-(old.id==='house'?7:5));
  if(old.id==='house')s.population=Math.max(1,s.population-2*(old.level||1));
  s.effects.push({type:'ruin',x:slot.x,life:2.8,maxLife:2.8});this.emit('damage',def.name+'이(가) 무너졌습니다.',{x:slot.x,cause});return true
 }
 makeRewards(){
  const pool=D.REWARD_POOL.slice(),out=[];while(out.length<2&&pool.length){const i=Math.floor(this.rand()*pool.length);out.push({kind:'add',id:pool.splice(i,1)[0]})}
  if(this.totalDeckSize()>8)out.push({kind:'cleanup',id:'cleanup'});else if(pool.length)out.push({kind:'add',id:pool.splice(Math.floor(this.rand()*pool.length),1)[0]});
  return out
 }
 totalDeckSize(){return this.state.deck.length+this.state.discard.length+this.state.hand.length}
 openReward(){
  const s=this.state;if(s.rewardChoices.length||s.cleanupChoices.length){s.rewardBacklog++;return}s.rewardChoices=this.makeRewards()
 }
 resolveDisaster(d){
  const s=this.state,i=s.disasters.indexOf(d);if(i<0)return;s.disasters.splice(i,1);s.stats.resolved++;s.stability=Math.min(100,s.stability+1.5);this.emit('clear',d.type==='wildfire'?'산불이 진정됐습니다!':'홍수가 빠져나갔습니다!');
  if(!s.disasters.length){const rest=s.time<180?12:s.time<300?9:6;s.next.in=Math.max(s.next.in,rest+this.rand()*3);}
  this.openReward();if(s.tutorial&&s.tutorialStep===3)s.tutorialStep=4;
 }
 cleanupCandidates(){
  const all=[...this.state.hand.map(c=>c.id),...this.state.deck,...this.state.discard],counts={};for(const id of all)counts[id]=(counts[id]||0)+1;
  return Object.keys(counts).filter(id=>counts[id]>0&&D.CARDS[id]).sort((a,b)=>D.CARDS[a].cost-D.CARDS[b].cost)
 }
 acceptReward(key){
  const s=this.state,choice=s.rewardChoices.find(x=>(x.kind==='cleanup'?'cleanup':x.id)===key);if(!choice)return false;
  if(choice.kind==='cleanup'){s.rewardChoices=[];s.cleanupChoices=this.cleanupCandidates();this.emit('reward','덱에서 카드 한 장을 정리하세요.');return true}
  s.discard.push(choice.id);s.rewardChoices=[];this.emit('reward',D.CARDS[choice.id].name+' 카드가 덱에 들어왔습니다.');this.finishReward();return true
 }
 removeRewardCard(id){
  const s=this.state;if(!s.cleanupChoices.includes(id)||this.totalDeckSize()<=8)return false;let removed=false;
  let i=s.deck.indexOf(id);if(i>=0){s.deck.splice(i,1);removed=true}
  if(!removed){i=s.discard.indexOf(id);if(i>=0){s.discard.splice(i,1);removed=true}}
  if(!removed){i=s.hand.findIndex(c=>c.id===id);if(i>=0){const [c]=s.hand.splice(i,1);if(s.selectedUid===c.uid)s.selectedUid=null;removed=true;this.drawToFive()}}
  if(!removed)return false;s.stats.removed++;s.cleanupChoices=[];this.emit('reward',D.CARDS[id].name+' 카드 1장을 덱에서 제거했습니다.');this.finishReward();return true
 }
 finishReward(){
  const s=this.state;if(s.rewardBacklog>0){s.rewardBacklog--;s.rewardChoices=this.makeRewards()}
 }
 scheduleNext(d){
  const s=this.state;s.lastSide=d.side;s.lastType=d.type;s.next.side=d.side==='left'?'right':'left';s.next.type=this.rand()<.5?'wildfire':'flood';
  const p=this.pressure();s.next.in=clamp(30-(p-.55)*7.5,16,30)+this.rand()*4;s.next.visible=false;
 }
 maxConcurrent(){return this.state.time<300?1:2}
 updateEconomy(){
  const s=this.state;let money=s.population*.055,food=-s.population*.032,upkeep=0;
  for(const slot of s.slots){const b=slot.building;if(!b)continue;const def=D.BUILDINGS[b.id],lvl=b.level||1;money+=(def.money||0)*(1+.55*(lvl-1));food+=(def.food||0)*(1+.55*(lvl-1));upkeep+=(def.upkeep||0)*(1+.35*(lvl-1))}
  s.money=Math.max(0,s.money+money-upkeep);s.food=Math.max(0,s.food+food);
  s.growthClock++;if(s.growthClock>=4){s.growthClock=0;if(s.population<this.capacity()&&s.food>5){s.population++;s.maxPopulation=Math.max(s.maxPopulation,s.population)}}
  if(s.food<=.01){s.hungerClock++;s.stability=Math.max(0,s.stability-.7);if(s.hungerClock>=5){s.hungerClock=0;s.population=Math.max(1,s.population-1);this.emit('hunger','식량 부족으로 주민이 떠났습니다.')}}else s.hungerClock=0;
 }
 updateEffects(dt){const a=this.state.effects;for(const e of a)e.life-=dt;for(let i=a.length-1;i>=0;i--)if(a[i].life<=0)a.splice(i,1)}
 update(dt){
  const s=this.state;if(s.mode!=='playing'||s.paused)return;s.time+=dt;s.refreshCooldown=Math.max(0,s.refreshCooldown-dt);this.updateEffects(dt);
  s.economyClock+=dt;while(s.economyClock>=1){s.economyClock-=1;this.updateEconomy()}
  if(DC.Disasters)DC.Disasters.update(this,dt);
  if(s.stability<=0){s.stability=0;this.gameOver()}
 }
 gameOver(){
  const s=this.state;if(s.mode!=='playing')return;s.mode='gameover';s.paused=false;s.selectedUid=null;this.emit('gameover','마을 안정도가 0이 되었습니다.');
  const best=Math.floor(s.time);try{const old=root.KidscadeStorage?.getInt?.(D.SCORE_KEY,0)||0;if(best>old)root.KidscadeStorage?.setRaw?.(D.SCORE_KEY,best)}catch(_){}
 }
 togglePause(){const s=this.state;if(s.mode!=='playing')return false;s.paused=!s.paused;return s.paused}
 drainSignals(){return this.state.signals.splice(0)}
}
DC.Simulation=Simulation;
})(window);