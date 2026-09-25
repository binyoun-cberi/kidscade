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
  if(d){const power=d.strength||1,stage=d.progress<.3?'외곽':d.progress<.62?'접근 중':d.progress<.9?'주거지 위험':'마을 위험';let name;
   if(d.type==='wildfire')name=power<.78?'🔥 작은 산불':power<1.2?'🔥 산불':power<1.65?'🔥 거센 산불':'🔥 대형 산불';else name=power<.78?'🌊 약한 홍수':power<1.2?'🌊 홍수':power<1.65?'🌊 거센 홍수':'🌊 대홍수';
   const remain=Math.max(0,Math.ceil((d.maxAge||48)-d.age)),tail=remain>0?' · 약 '+remain+'초 후 잦아듦':'';el.className='threatBadge '+side+' '+(d.type==='wildfire'?'fire':'flood')+' warn';el.querySelector('span').textContent=name+' · '+stage+tail;return}
  if(s.next&&s.next.side===side&&s.next.visible){const name=s.next.type==='wildfire'?'🔥 산불 징조':'🌧️ 홍수 징조',tail=(s.disasters||[]).length?'':' · '+Math.ceil(Math.max(0,s.next.in))+'초';el.className='threatBadge '+side+' '+(s.next.type==='wildfire'?'fire':'flood');el.querySelector('span').textContent=name+tail;return}
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
  else if(s.tutorial&&s.tutorialStep===2)text='좌우 경계를 보세요. 재앙은 번갈아 오고, 오래 버티면 서로 겹치기도 합니다.';
  else if(s.tutorial&&s.tutorialStep===3&&(s.disasters||[]).length){const d=s.disasters[0];text=d.type==='wildfire'?'소방대는 세기를 낮추고, 방화선은 전선을 크게 밀어냅니다.':'모래주머니는 세기를 낮추고, 긴급 배수는 물길을 크게 밀어냅니다.'}
  this.els.coach.textContent=text;this.els.coach.classList.toggle('hidden',!text)
 }
 render(s,sim){
  this.els.money.textContent=fmt(s.money);this.els.food.textContent=fmt(s.food);this.els.population.textContent=fmt(s.population);this.els.stability.textContent=fmt(s.stability);this.els.time.textContent=clock(s.time);
  this.els.deck.textContent=s.deck.length;this.els.discard.textContent=s.discard.length;this.els.refresh.disabled=s.refreshCooldown>0;this.els.refreshCool.textContent=s.refreshCooldown>0?Math.ceil(s.refreshCooldown)+'초':'준비됨';
  this.els.pause.textContent=s.paused?'▶':'Ⅱ';this.els.pauseShade.classList.toggle('hidden',!s.paused);this.threatText(s,'left');this.threatText(s,'right');this.renderHand(s,sim);this.renderReward(s);this.coach(s);this.soundState();
  const ds=s.disasters||[];this.els.dock.textContent=ds.length>=2?'양쪽 재앙이 겹쳤습니다. 핵심 시설부터 지키세요.':ds.length===1?(ds[0].type==='wildfire'?'불길을 밀어내고 세기를 함께 낮추세요.':'제방으로 버티며 물길과 세기를 함께 낮추세요.'):'도시를 키우고 다음 징조를 준비하세요.';
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