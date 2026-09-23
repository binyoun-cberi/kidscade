(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rngStep(state){state.seed=(state.seed*1664525+1013904223)>>>0;return state.seed/4294967296}
function shuffle(state,list){for(let i=list.length-1;i>0;i--){const j=Math.floor(rngStep(state)*(i+1));[list[i],list[j]]=[list[j],list[i]]}return list}
function sideOfX(x){return x<D.TOWN_X?'left':'right'}
class Simulation{
 constructor(){
  this.uid=1;this.listeners=[];this.reset();
 }
 reset(){
  this.state={mode:'ready',paused:false,tutorial:false,tutorialStep:0,time:0,seed:1,money:320,food:28,population:14,stability:100,maxPopulation:14,
   slots:D.SLOT_X.map((x,i)=>({i,x,building:null})),deck:[],discard:[],hand:[],selectedUid:null,refreshCooldown:0,economyClock:0,growthClock:0,hungerClock:0,
   disaster:null,next:{side:'left',type:'wildfire',in:16,visible:true},lastSide:'right',lastType:null,rewardChoices:[],effects:[],signals:[],
   stats:{resolved:0,lost:0,placed:0,cardsPlayed:0}};
 }
 on(fn){this.listeners.push(fn)}
 emit(kind,message,data){this.state.signals.push({kind,message,data})}
 start(opts={}){
  this.reset();const s=this.state;s.mode='playing';s.tutorial=!!opts.tutorial;s.seed=(opts.seed>>>0)||((Date.now()^Math.floor(performance.now()*1000))>>>0)||1;
  s.deck=shuffle(s,D.START_DECK.slice());this.drawToFive();s.next.type=rngStep(s)<.5?'wildfire':'flood';s.next.in=14+rngStep(s)*4;s.next.visible=true;
  if(s.tutorial){s.tutorialStep=1;this.emit('tip','건설 카드를 누른 뒤 밝아지는 빈 땅을 눌러 보세요.')}
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
  const c=this.cardDef(uid);if(!c||c.kind!=='build'||!this.canAfford(c.cost))return false;
  this.state.selectedUid=this.state.selectedUid===uid?null:uid;return true
 }
 canAfford(cost){return this.state.money>=cost}
 buildingCount(id,side){
  return this.state.slots.reduce((n,s)=>n+(s.building&&s.building.id===id&&(!side||sideOfX(s.x)===side)?1:0),0)
 }
 cityValue(){return this.state.slots.reduce((n,s)=>n+(s.building?D.BUILDINGS[s.building.id].cost:0),0)}
 pressure(){return clamp(1+this.state.time/300+this.cityValue()/5200,1,2.55)}
 capacity(){return 14+this.buildingCount('house')*6}
 canPlace(uid,slotIndex){
  const c=this.cardDef(uid),slot=this.state.slots[slotIndex];return !!(c&&c.kind==='build'&&slot&&!slot.building&&this.canAfford(c.cost))
 }
 placeSelected(slotIndex){
  const s=this.state,uid=s.selectedUid;if(!this.canPlace(uid,slotIndex))return false;const c=this.cardDef(uid),def=D.BUILDINGS[c.building],slot=s.slots[slotIndex];
  s.money-=c.cost;slot.building={id:def.id,hp:def.hp,maxHp:def.hp,placedAt:s.time};s.stats.placed++;s.stats.cardsPlayed++;this.discardCard(uid);
  this.emit('build',def.name+' 건설 완료',{x:slot.x});if(s.tutorial&&s.tutorialStep===1){s.tutorialStep=2;this.emit('tip','좋아요. 이제 양쪽 경고를 보면서 도시를 키우세요.')}
  return true
 }
 actionUsable(def){
  const s=this.state;if(!def||def.kind!=='action'||!this.canAfford(def.cost))return false;
  if(def.action==='fireBrigade')return s.disaster?.type==='wildfire';
  if(def.action==='sandbags')return s.disaster?.type==='flood';
  if(def.action==='repair')return s.slots.some(x=>x.building&&x.building.hp<x.building.maxHp);
  return true
 }
 playAction(uid){
  const s=this.state,def=this.cardDef(uid);if(!this.actionUsable(def))return false;s.money-=def.cost;
  if(def.action==='fireBrigade'){
   const bonus=1+this.buildingCount('reservoir')*.16;s.disaster.energy=Math.max(0,s.disaster.energy-34*bonus);s.disaster.progress=Math.max(0,s.disaster.progress-.09*bonus);this.emit('response','소방대가 불길을 밀어냈습니다.');
  }else if(def.action==='sandbags'){
   s.disaster.energy=Math.max(0,s.disaster.energy-18);s.disaster.progress=Math.max(0,s.disaster.progress-.075);s.disaster.blockPause=Math.max(s.disaster.blockPause||0,2.1);this.emit('response','모래주머니로 물길을 늦췄습니다.');
  }else if(def.action==='repair'){
   const damaged=s.slots.filter(x=>x.building&&x.building.hp<x.building.maxHp).sort((a,b)=>(a.building.hp/a.building.maxHp)-(b.building.hp/b.building.maxHp))[0];
   if(damaged){damaged.building.hp=Math.min(damaged.building.maxHp,damaged.building.hp+52);this.emit('repair',D.BUILDINGS[damaged.building.id].name+' 긴급 수리',{x:damaged.x})}
  }else if(def.action==='ration'){s.food+=12;this.emit('supply','비상 식량 +12')}
  s.stats.cardsPlayed++;this.discardCard(uid);return true
 }
 refreshHand(){
  const s=this.state;if(s.refreshCooldown>0||s.hand.length===0)return false;for(const c of s.hand)s.discard.push(c.id);s.hand.length=0;s.selectedUid=null;s.refreshCooldown=12;this.drawToFive();this.emit('shuffle','손패를 새로 받았습니다.');return true
 }
 damageBuilding(slotIndex,amount,cause){
  const s=this.state,slot=s.slots[slotIndex];if(!slot?.building)return false;slot.building.hp-=amount;if(slot.building.hp>0)return false;
  const old=slot.building,def=D.BUILDINGS[old.id];slot.building=null;s.stats.lost++;s.stability=Math.max(0,s.stability-(old.id==='house'?7:5));
  if(old.id==='house')s.population=Math.max(1,s.population-2);
  s.effects.push({type:'ruin',x:slot.x,life:2.8,maxLife:2.8});this.emit('damage',def.name+'이(가) 무너졌습니다.',{x:slot.x,cause});return true
 }
 resolveDisaster(){
  const s=this.state,d=s.disaster;if(!d)return;s.stats.resolved++;s.stability=Math.min(100,s.stability+1.5);this.emit('clear',(d.type==='wildfire'?'산불':'홍수')+'을 막아냈습니다!');
  s.disaster=null;s.next.in=5.5+this.rand()*2.5;s.next.visible=true;s.rewardChoices=this.makeRewards(3);
 }
 makeRewards(n){
  const pool=D.REWARD_POOL.slice(),out=[];while(out.length<n&&pool.length){const i=Math.floor(this.rand()*pool.length);out.push(pool.splice(i,1)[0])}return out
 }
 acceptReward(id){
  const s=this.state;if(!s.rewardChoices.includes(id))return false;s.discard.push(id);s.rewardChoices=[];this.emit('reward',D.CARDS[id].name+' 카드가 덱에 들어왔습니다.');return true
 }
 planNextAfterSpawn(){
  const s=this.state;s.lastSide=s.disaster.side;s.lastType=s.disaster.type;s.next.side=s.disaster.side==='left'?'right':'left';s.next.type=this.rand()<.5?'wildfire':'flood';s.next.in=999;s.next.visible=false;
 }
 updateEconomy(){
  const s=this.state;let money=s.population*.055,food=-s.population*.032,upkeep=0;
  for(const slot of s.slots){const b=slot.building;if(!b)continue;const def=D.BUILDINGS[b.id];money+=def.money||0;food+=def.food||0;upkeep+=def.upkeep||0}
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