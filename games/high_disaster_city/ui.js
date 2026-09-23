(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const $=id=>document.getElementById(id),fmt=n=>Math.max(0,Math.floor(n)).toLocaleString('ko-KR');
function clock(sec){sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
class UI{
 constructor(callbacks){
  this.cb=callbacks;this.lastHand='';this.toastTimer=0;this.els={money:$('money'),food:$('food'),population:$('population'),stability:$('stability'),time:$('survivalTime'),deck:$('deckCount'),discard:$('discardCount'),hand:$('hand'),
   refresh:$('refreshBtn'),refreshCool:$('refreshCool'),pause:$('pauseBtn'),pauseShade:$('pauseShade'),left:$('leftThreat'),right:$('rightThreat'),toast:$('toast'),coach:$('coach'),dock:$('dockMessage'),
   reward:$('rewardPanel'),rewardChoices:$('rewardChoices'),start:$('startOverlay'),over:$('gameOverOverlay'),sound:$('soundBtn')};
  $('tutorialBtn').addEventListener('click',()=>this.cb.start(true));$('startBtn').addEventListener('click',()=>this.cb.start(false));$('retryBtn').addEventListener('click',()=>this.cb.start(false));
  this.els.refresh.addEventListener('click',()=>this.cb.refresh());this.els.pause.addEventListener('click',()=>this.cb.pause());this.els.sound.addEventListener('click',()=>this.cb.sound());
  this.els.hand.addEventListener('click',e=>{const b=e.target.closest('.gameCard');if(!b||b.classList.contains('disabled'))return;this.cb.card(Number(b.dataset.uid))});
  this.els.rewardChoices.addEventListener('click',e=>{const b=e.target.closest('[data-reward]');if(b)this.cb.reward(b.dataset.reward)});
 }
 showToast(text){clearTimeout(this.toastTimer);this.els.toast.textContent=text;this.els.toast.classList.add('show');this.toastTimer=setTimeout(()=>this.els.toast.classList.remove('show'),1500)}
 soundState(){const muted=!!root.KidscadeAudio?.getSettings?.().muted;this.els.sound.textContent=muted?'🔇':'🔊'}
 threatText(s,side){
  const el=side==='left'?this.els.left:this.els.right,d=s.disaster;
  el.className='threatBadge '+side+' calm';
  if(d&&d.side===side){const pct=Math.max(0,Math.round(d.energy/d.maxEnergy*100)),name=d.type==='wildfire'?'🔥 산불':'🌊 홍수';el.className='threatBadge '+side+' '+(d.type==='wildfire'?'fire':'flood')+' warn';el.querySelector('span').textContent=name+' '+pct+'%';return}
  if(s.next&&s.next.side===side&&s.next.visible){const name=s.next.type==='wildfire'?'🔥 산불 징조':'🌧️ 홍수 징조',tail=s.disaster?'':' · '+Math.ceil(Math.max(0,s.next.in))+'초';el.className='threatBadge '+side+' '+(s.next.type==='wildfire'?'fire':'flood');el.querySelector('span').textContent=name+tail;return}
  el.querySelector('span').textContent='안정';
 }
 handKey(s){const dmg=s.slots.some(x=>x.building&&x.building.hp<x.building.maxHp)?1:0;return s.hand.map(c=>c.uid+':'+c.id).join('|')+'#'+s.selectedUid+'#'+Math.floor(s.money)+'#'+(s.disaster?.type||'-')+'#'+dmg}
 renderHand(s,sim){
  const key=this.handKey(s);if(key===this.lastHand)return;this.lastHand=key;
  this.els.hand.innerHTML=s.hand.map(c=>{const d=D.CARDS[c.id],usable=d.kind==='build'?sim.canAfford(d.cost):sim.actionUsable(d),sel=s.selectedUid===c.uid;
   return '<button class="gameCard '+d.kind+(usable?'':' disabled')+(sel?' selected':'')+'" data-uid="'+c.uid+'" type="button"><div class="cardTop"><span class="icon">'+d.icon+'</span><span class="cost">💰 '+d.cost+'</span></div><h3>'+d.name+'</h3><p>'+d.desc+'</p><span class="tag">'+d.tag+'</span></button>'
  }).join('');
 }
 renderReward(s){
  this.els.reward.classList.toggle('hidden',!s.rewardChoices.length);if(!s.rewardChoices.length){this.els.rewardChoices.innerHTML='';return}
  this.els.rewardChoices.innerHTML=s.rewardChoices.map(id=>{const d=D.CARDS[id];return '<button class="rewardChoice" type="button" data-reward="'+id+'">'+d.icon+' '+d.name+'</button>'}).join('')
 }
 coach(s){
  let text='';if(s.tutorial&&s.tutorialStep===1)text='카드 한 장을 누른 뒤, 도시의 밝은 빈칸을 눌러 건설하세요.';
  else if(s.tutorial&&s.tutorialStep===2)text='좌우 경계의 징조를 보세요. 재앙은 번갈아 들어옵니다.';
  else if(s.tutorial&&s.tutorialStep===3&&s.disaster)text=s.disaster.type==='wildfire'?'불이 밀려옵니다. 소방대 카드나 소방서를 활용하세요.':'물이 밀려옵니다. 모래주머니·제방·배수펌프를 활용하세요.';
  this.els.coach.textContent=text;this.els.coach.classList.toggle('hidden',!text)
 }
 render(s,sim){
  this.els.money.textContent=fmt(s.money);this.els.food.textContent=fmt(s.food);this.els.population.textContent=fmt(s.population);this.els.stability.textContent=fmt(s.stability);this.els.time.textContent=clock(s.time);
  this.els.deck.textContent=s.deck.length;this.els.discard.textContent=s.discard.length;this.els.refresh.disabled=s.refreshCooldown>0;this.els.refreshCool.textContent=s.refreshCooldown>0?Math.ceil(s.refreshCooldown)+'초':'준비됨';
  this.els.pause.textContent=s.paused?'▶':'Ⅱ';this.els.pauseShade.classList.toggle('hidden',!s.paused);this.threatText(s,'left');this.threatText(s,'right');this.renderHand(s,sim);this.renderReward(s);this.coach(s);this.soundState();
  const d=s.disaster;this.els.dock.textContent=d?(d.type==='wildfire'?'불길이 마을에 닿기 전에 세기를 줄이세요.':'제방으로 막고 펌프로 물을 빼세요.'):'도시를 키우되, 양쪽 재앙을 놓치지 마세요.';
  if(s.mode==='gameover'&&!this.els.over.classList.contains('show')){this.showGameOver(s)}
 }
 startDone(){this.els.start.classList.remove('show');this.els.over.classList.remove('show');this.lastHand=''}
 showGameOver(s){
  $('resultTime').textContent=clock(s.time);$('resultThreats').textContent=s.stats.resolved;$('resultPopulation').textContent=s.maxPopulation;$('resultLost').textContent=s.stats.lost;
  $('resultNote').textContent=s.stats.resolved>=6?'양쪽 방재시설을 균형 있게 유지한 도시였습니다. 다음 판에는 더 얇은 덱으로 빠르게 대응해 보세요.':s.stats.lost>=4?'복구보다 확장이 빨랐어요. 외곽 방재시설을 조금 일찍 준비해 보세요.':'재앙 대응 카드를 너무 일찍 쓰지 않았는지 살펴보세요.';
  this.els.over.classList.add('show')
 }
}
DC.UI=UI;
})(window);