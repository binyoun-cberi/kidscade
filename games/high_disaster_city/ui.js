(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const $=id=>document.getElementById(id),fmt=n=>Math.max(0,Math.floor(n)).toLocaleString('ko-KR');
function clock(sec){sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
class UI{
 constructor(callbacks){
  this.cb=callbacks;this.lastHand='';this.toastTimer=0;this.els={money:$('money'),food:$('food'),population:$('population'),stability:$('stability'),time:$('survivalTime'),deck:$('deckCount'),discard:$('discardCount'),hand:$('hand'),
   refresh:$('refreshBtn'),refreshCool:$('refreshCool'),pause:$('pauseBtn'),pauseShade:$('pauseShade'),left:$('leftThreat'),right:$('rightThreat'),toast:$('toast'),coach:$('coach'),dock:$('dockMessage'),
   reward:$('rewardPanel'),rewardChoices:$('rewardChoices'),rewardTitle:$('rewardTitle'),rewardSub:$('rewardSub'),start:$('startOverlay'),over:$('gameOverOverlay'),sound:$('soundBtn')};
  $('tutorialBtn').addEventListener('click',()=>this.cb.start(true));$('startBtn').addEventListener('click',()=>this.cb.start(false));$('retryBtn').addEventListener('click',()=>this.cb.start(false));
  this.els.refresh.addEventListener('click',()=>this.cb.refresh());this.els.pause.addEventListener('click',()=>this.cb.pause());this.els.sound.addEventListener('click',()=>this.cb.sound());
  this.els.hand.addEventListener('click',e=>{const b=e.target.closest('.gameCard');if(!b||b.classList.contains('disabled'))return;this.cb.card(Number(b.dataset.uid))});
  this.els.rewardChoices.addEventListener('click',e=>{const cleanup=e.target.closest('[data-cleanup]');if(cleanup){this.cb.remove(cleanup.dataset.cleanup);return}const b=e.target.closest('[data-reward]');if(b)this.cb.reward(b.dataset.reward)});
 }
 showToast(text){clearTimeout(this.toastTimer);this.els.toast.textContent=text;this.els.toast.classList.add('show');this.toastTimer=setTimeout(()=>this.els.toast.classList.remove('show'),1500)}
 soundState(){const muted=!!root.KidscadeAudio?.getSettings?.().muted;this.els.sound.textContent=muted?'🔇':'🔊'}
 threatText(s,side){
  const el=side==='left'?this.els.left:this.els.right,d=(s.disasters||[]).find(x=>x.side===side);el.className='threatBadge '+side+' calm';
  if(d){
   const power=d.strength||1,def=D.DISASTERS?.[d.type]||{name:'재난',icon:'⚠️'},names={
    wildfire:['작은 산불','산불','거센 산불','대형 산불'],
    flood:['약한 홍수','홍수','거센 홍수','대홍수'],
    typhoon:['약한 태풍','태풍','강한 태풍','매우 강한 태풍'],
    heatwave:['더위','폭염','심한 폭염','극심한 폭염'],
    blizzard:['눈보라','폭설','거센 폭설','기록적 폭설'],
    earthquake:['약한 지진','지진','강한 지진','대지진']
   },tier=power<.78?0:power<1.2?1:power<1.65?2:3,label=names[d.type]?.[tier]||def.name;
   let stage=d.progress<.3?'외곽':d.progress<.62?'접근 중':d.progress<.9?'주거지 위험':'마을 위험';
   if(d.type==='heatwave')stage=d.progress<.35?'기온 상승':d.progress<.75?'열기 절정':'한풀 꺾이는 중';
   if(d.type==='earthquake')stage=d.progress<.35?'첫 흔들림':d.progress<.8?'여진 진행':'진정 중';
   const remain=Math.max(0,Math.ceil((d.maxAge||48)-d.age)),tail=remain>0?' · 약 '+remain+'초 후 잦아듦':'';
   el.className='threatBadge '+side+' '+d.type+' warn';el.querySelector('span').textContent=def.icon+' '+label+' · '+stage+tail;return
  }
  if(s.next&&s.next.side===side&&s.next.visible){const def=D.DISASTERS?.[s.next.type]||{name:'재난',icon:'⚠️'},tail=(s.disasters||[]).length?'':' · '+Math.ceil(Math.max(0,s.next.in))+'초';el.className='threatBadge '+side+' '+s.next.type;el.querySelector('span').textContent=def.icon+' '+def.name+' 징조'+tail;return}
  el.querySelector('span').textContent='안정';
 }
 handKey(s){const dmg=s.slots.some(x=>x.building&&x.building.hp<x.building.maxHp)?1:0,th=(s.disasters||[]).map(d=>d.type+':'+d.side).join(',');return s.hand.map(c=>c.uid+':'+c.id).join('|')+'#'+s.selectedUid+'#'+Math.floor(s.money)+'#'+th+'#'+dmg}
 renderHand(s,sim){
  const key=this.handKey(s);if(key===this.lastHand)return;this.lastHand=key;
  this.els.hand.innerHTML=s.hand.map(c=>{const d=D.CARDS[c.id],usable=d.kind==='build'?sim.buildCardUsable(c.uid):sim.actionUsable(d),sel=s.selectedUid===c.uid;
   return '<button class="gameCard '+d.kind+(usable?'':' disabled')+(sel?' selected':'')+'" data-uid="'+c.uid+'" type="button"><div class="cardTop"><span class="icon">'+d.icon+'</span><span class="cost">💰 '+d.cost+'</span></div><h3>'+d.name+'</h3><p>'+d.desc+'</p><span class="tag">'+d.tag+'</span></button>'
  }).join('');
 }
 renderReward(s){
  const active=s.rewardChoices.length||s.cleanupChoices.length;this.els.reward.classList.toggle('hidden',!active);if(!active){this.els.rewardChoices.innerHTML='';return}
  if(s.cleanupChoices.length){
   this.els.rewardTitle.textContent='✂️ 덱 정리';this.els.rewardSub.textContent='한 장을 골라 영구 제거';
   this.els.rewardChoices.innerHTML=s.cleanupChoices.map(id=>{const d=D.CARDS[id];return '<button class="rewardChoice cleanup" type="button" data-cleanup="'+id+'">'+d.icon+' '+d.name+'</button>'}).join('');return
  }
  this.els.rewardTitle.textContent='📦 방재 보급품';this.els.rewardSub.textContent='새 카드 또는 덱 정리';
  this.els.rewardChoices.innerHTML=s.rewardChoices.map(ch=>ch.kind==='cleanup'
   ?'<button class="rewardChoice cleanup" type="button" data-reward="cleanup">✂️ 카드 1장 제거</button>'
   :'<button class="rewardChoice" type="button" data-reward="'+ch.id+'">'+D.CARDS[ch.id].icon+' '+D.CARDS[ch.id].name+'</button>').join('')
 }
 coach(s){
  let text='';if(s.tutorial&&s.tutorialStep===1)text='카드를 누른 뒤 땅을 누르세요. 기존 시설을 누르면 강화하거나 교체할 수도 있어요.';
  else if(s.tutorial&&s.tutorialStep===2)text='좌우 경계를 보세요. 시간이 지나면 산불·홍수뿐 아니라 태풍·폭염·폭설·지진도 등장합니다.';
  else if(s.tutorial&&s.tutorialStep===3&&(s.disasters||[]).length){const d=s.disasters[0],tips={
   wildfire:'소방대는 세기를 낮추고, 방화선은 전선을 크게 밀어냅니다.',
   flood:'제방으로 시간을 벌고 배수펌프와 긴급 배수로 물을 빼세요.',
   typhoon:'재난대피소를 준비하고 창문 보강으로 강풍을 약화시키세요.',
   heatwave:'무더위 쉼터와 급수 지원으로 식량·안정도 손실을 줄이세요.',
   blizzard:'제설기지로 버티고 제설차로 눈 전선을 밀어내세요.',
   earthquake:'지진은 짧지만 충격이 큽니다. 재난대피소와 긴급 대피가 중요해요.'
  };text=tips[d.type]||'재난에 맞는 방재시설과 대응카드를 조합하세요.'}
  this.els.coach.textContent=text;this.els.coach.classList.toggle('hidden',!text)
 }
 render(s,sim){
  this.els.money.textContent=fmt(s.money);this.els.food.textContent=fmt(s.food);this.els.population.textContent=fmt(s.population);this.els.stability.textContent=fmt(s.stability);this.els.time.textContent=clock(s.time);
  this.els.deck.textContent=s.deck.length;this.els.discard.textContent=s.discard.length;this.els.refresh.disabled=s.refreshCooldown>0;this.els.refreshCool.textContent=s.refreshCooldown>0?Math.ceil(s.refreshCooldown)+'초':'준비됨';
  this.els.pause.textContent=s.paused?'▶':'Ⅱ';this.els.pauseShade.classList.toggle('hidden',!s.paused);this.threatText(s,'left');this.threatText(s,'right');this.renderHand(s,sim);this.renderReward(s);this.coach(s);this.soundState();
  const ds=s.disasters||[],messages={wildfire:'불길을 밀어내고 세기를 함께 낮추세요.',flood:'제방으로 버티며 물길과 세기를 함께 낮추세요.',typhoon:'강풍이 건물을 넓게 때립니다. 대피소와 창문 보강을 활용하세요.',heatwave:'폭염이 식량과 안정도를 갉아먹습니다. 급수와 쉼터가 중요합니다.',blizzard:'눈이 쌓이기 전에 제설기지와 제설차를 준비하세요.',earthquake:'여진이 오기 전에 대피시키고 손상 시설을 수리하세요.'};this.els.dock.textContent=ds.length>=2?'양쪽 재앙이 겹쳤습니다. 핵심 시설부터 지키세요.':ds.length===1?(messages[ds[0].type]||'재난에 맞는 대응카드를 사용하세요.'):'도시를 키우고 다음 징조를 준비하세요.';
  if(s.mode==='gameover'&&!this.els.over.classList.contains('show'))this.showGameOver(s)
 }
 startDone(){this.els.start.classList.remove('show');this.els.over.classList.remove('show');this.lastHand=''}
 showGameOver(s){
  $('resultTime').textContent=clock(s.time);$('resultThreats').textContent=s.stats.resolved;$('resultPopulation').textContent=s.maxPopulation;$('resultLost').textContent=s.stats.lost;
  $('resultNote').textContent=s.stats.resolved>=6?'잘 버텼어요. 다음 판에는 보상에서 필요 없는 카드를 제거해 덱을 더 빠르게 돌려 보세요.':s.stats.lost>=4?'복구보다 확장이 빨랐어요. 외곽 방재시설과 강화 타이밍을 조금 앞당겨 보세요.':'정답 카드 하나만 기다리기보다 서로 다른 대응카드를 조합해 보세요.';
  this.els.over.classList.add('show')
 }
}
DC.UI=UI;
})(window);