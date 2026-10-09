(function(){
"use strict";
const DB=window.OPENMON_DEX,E=window.OPENMON_EXPEDITION_ENGINE;
if(!DB?.combat||!E)throw Error("Openmon Expedition engine missing");
const $=id=>document.getElementById(id);
const C=$("worldCanvas"),cx=C.getContext("2d",{alpha:false});
cx.imageSmoothingEnabled=false;
const SAVE_KEY="kidscade.openmon.expedition.save.v1";
let save=null,battle=null,lastDraw=0,lastMove=0,held=null,moveTimer=0,soundOn=true,audio=null;
let latestToast="풀숲이나 동굴의 거친 땅으로 이동하면 몬스터를 만날 수 있어요.";
const imgs={};
const ASSET="../../assets/";
function load(name,url){const im=new Image();im.decoding="async";im.src=url;im.onload=()=>{imgs[name]=im};im.onerror=()=>{imgs[name]=null}}
load("town",ASSET+"game/2d/tilesets/kenney-tiny-town/atlas/tilemap-packed.png");
load("farm",ASSET+"game/2d/tilesets/kenney-tiny-farm/atlas/tilemap-packed.png");
load("npc",ASSET+"more%20assets/OpenmonSpriteSet1.png");
load("staff",ASSET+"more%20assets/OpenmonSpriteSet2.png");
const sprites=new Map(DB.sprites.map(s=>[s.id,s]));
for(const s of DB.atlas)load("mon-"+s.id,ASSET+"more%20assets/"+encodeURIComponent(s.file));
const esc=t=>String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function beep(note="click"){
 if(!soundOn)return;
 try{
  audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==="suspended")audio.resume();
  let osc=audio.createOscillator(),vol=audio.createGain(),now=audio.currentTime;
  let preset={click:[520,.045,"sine"],step:[200,.025,"sine"],hit:[210,.11,"square"],capture:[740,.18,"sine"],win:[920,.23,"triangle"],fail:[160,.2,"sawtooth"]}[note]||[450,.08,"sine"];
  osc.type=preset[2];osc.frequency.setValueAtTime(preset[0],now);
  if(note==="capture"||note==="win")osc.frequency.exponentialRampToValueAtTime(preset[0]*1.4,now+preset[1]);
  vol.gain.setValueAtTime(.018,now);vol.gain.exponentialRampToValueAtTime(.001,now+preset[1]);
  osc.connect(vol);vol.connect(audio.destination);osc.start(now);osc.stop(now+preset[1]);
 }catch(e){}
}
function stored(){
 try{return E.validateSave(JSON.parse(localStorage.getItem(SAVE_KEY)||"null"))}catch(e){return null}
}
function persist(){
 if(!save)return;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));$("saveInfo").textContent="진행 자동 저장"}catch(e){$("saveInfo").textContent="저장 실패 · 저장공간 확인"}
}
function setToast(message){latestToast=message;$("mapToast").textContent=message}
function species(key){return sprites.get(key)}
function maxHp(p){return DB.combat.statsAtLevel(p.id,p.level).hp}
function artHtml(key,scale=1){
 const s=species(key);if(!s)return "";
 const at=DB.atlas.find(a=>a.id===s.atlas);
 return '<span class="pixel-art" role="img" aria-label="'+esc(s.name)+'" style="width:'+64*scale+'px;height:'+64*scale+'px;background-image:url(&quot;'+ASSET+'more%20assets/'+encodeURIComponent(s.source)+'&quot;);background-size:'+at.width*scale+'px '+at.height*scale+'px;background-position:-'+s.x*scale+'px -'+s.y*scale+'px"></span>';
}
function miniArt(id){
 const s=species(id),at=DB.atlas.find(a=>a.id===s.atlas);
 return '<span class="pixel-art" role="img" aria-label="'+esc(s.name)+'" style="transform:scale(.7);background-image:url(&quot;'+ASSET+'more%20assets/'+encodeURIComponent(s.source)+'&quot;);background-size:'+at.width+'px '+at.height+'px;background-position:-'+s.x+'px -'+s.y+'px"></span>';
}
function hpText(p){return Math.max(0,p.hp)+"/"+maxHp(p)}
function barPct(hp,max){return Math.max(0,Math.min(100,100*hp/max))+"%"}
function announce(event,payload){
 try{if(window.KidscadeGame?.milestone)window.KidscadeGame.milestone(event,payload)}catch(e){}
}
function startNew(id){
 save=E.createNew(id);battle=null;$("starterOverlay").hidden=true;
 setToast("오른쪽으로 이동해 이슬초원을 찾아가 봐. 연구원 옆에서는 A로 대화할 수 있어.");
 updateAll();persist();beep("win");
}
function showStarter(){
 $("starterOverlay").hidden=false;
 const keys=["set1_r02_c02","set1_r03_c02","set1_r04_c02"];
 $("starterChoices").innerHTML=keys.map(id=>{
 const s=species(id),label=DB.types[s.type].name;
 return '<button type="button" class="starter" data-starter="'+id+'">'+artHtml(id)+
 '<strong>'+esc(s.name)+'</strong><span class="badge-type">'+esc(label)+' 속성</span><small>'+esc(s.topicName)+'</small></button>'
 }).join("");
}
function updateAll(){
 if(!save)return;
 const area=E.zoneAt(save.pos.x),data=E.ZONES.find(z=>z.key===area);
 $("areaName").textContent=data?.name||"탐험";
 $("coinCount").textContent=save.coins+" 연구코인";
 $("balls").textContent=save.items.ball+"개";
 $("potions").textContent=save.items.potion+"개";
 $("seenCount").textContent=Object.keys(save.seen).filter(id=>species(id)?.playable).length+" / "+DB.species.length;
 $("caughtCount").textContent=Object.keys(save.collection).filter(id=>species(id)?.playable).length+" / "+DB.species.length;
 $("worldHint").textContent="현재 위치 "+(data?.name||"")+" ("+save.pos.x+","+save.pos.y+")";
 $("objective").textContent=save.catches===0?"첫 야생 몬스터를 포획해 보자":save.catches<3?"서로 다른 몬스터를 세 마리 모아 보자":"도감과 진화 조건을 연구하며 탐험하자";
 renderTeam();
}
function renderTeam(){
 if(!save)return;
 $("teamList").innerHTML=save.party.map((p,i)=>{
 const s=species(p.id),pct=barPct(p.hp,maxHp(p));
 return '<button type="button" class="member '+(i===save.active?"selected":"")+'" data-team="'+i+'" title="이 몬스터로 바꾸기">'+
 '<span class="member-art">'+miniArt(p.id)+'</span><span class="member-info"><b>'+esc(s.name)+' <small>Lv.'+p.level+'</small></b>'+
 '<small>HP '+hpText(p)+'</small><span class="hp-bar"><span class="hp-fill" style="width:'+pct+';background:'+(p.hp/maxHp(p)<.3?"#d97869":"#58ae68")+'"></span></span></span></button>'
 }).join("");
}
function selectTeam(index,fromBattle=false){
 if(!save||index<0||index>=save.party.length)return false;
 const p=save.party[index];
 if(p.hp<=0){setToast("HP가 0인 몬스터는 먼저 회복해야 해.");return false}
 if(index===save.active)return false;
 save.active=index;beep("click");updateAll();persist();
 if(fromBattle&&battle&&!battle.done){
  appendBattle("몬스터를 교체했어! "+species(p.id).name+" 출전!");
  enemyTurn();
  if(battle&&!battle.done){battle.turn++;renderBattle()}
 }else setToast(species(p.id).name+"이(가) 선두에 섰어.");
 return true;
}
function openGeneric(title,body,subtitle=""){
 $("genericTitle").textContent=title;
 $("genericSubtitle").textContent=subtitle;
 $("genericBody").innerHTML=body;
 $("genericOverlay").classList.remove("hidden");
}
function closeGeneric(){$("genericOverlay").classList.add("hidden")}
function talk(){
 if(!save||battle||!$("genericOverlay").classList.contains("hidden"))return;
 const x=save.pos.x,y=save.pos.y;
 if(Math.abs(x-9)+Math.abs(y-10)<=2){openClinic();return}
 if(Math.abs(x-13)+Math.abs(y-10)<=2){
  openGeneric("수학 연구원",'<p>야생 몬스터의 남은 체력과 기술의 피해량을 비교해 봐. 강한 공격만 쓰면 포획에 실패할 수도 있어!</p><button class="modal-action" id="researchDex">도감 열기</button>');
  $("researchDex").onclick=()=>{closeGeneric();openDex()};return
 }
 if(E.terrain(x,y)==="clearing"||Math.abs(x-56)+Math.abs(y-7)<=1){
  setToast("이 숲에서는 분기견이 발견되었다고 해. 풀숲을 살펴봐!");return
 }
 if(E.zoneAt(x)==="town")setToast("오른쪽으로 걸어가 이슬초원을 찾아봐. 위쪽 연구소의 연구원에게도 이야기할 수 있어.");
 else setToast("초록색 긴 풀이나 동굴의 거친 땅을 밟아야 야생 몬스터와 만날 수 있어!");
 beep("click");
}
function openClinic(){
 openGeneric("여울마을 연구소","<p>몬스터를 전부 무료로 치료해 줄게. 모험에 필요한 포획구와 회복약도 살 수 있어.</p>"+
 '<div class="shop-list"><div class="shop-item"><div><strong>전체 무료 회복</strong><small>전투 불능인 몬스터도 회복</small></div><button data-buy="heal">치료</button></div>'+
 '<div class="shop-item"><div><strong>포획구 +1</strong><small>연구코인 35</small></div><button data-buy="ball">35코인</button></div>'+
 '<div class="shop-item"><div><strong>회복약 +1</strong><small>연구코인 25</small></div><button data-buy="potion">25코인</button></div></div>');
}
function buy(item){
 if(!save)return;
 if(item==="heal"){E.healAll(save);setToast("모두 건강해졌어! 다시 모험을 떠나자.");beep("win")}
 else {const cost=item==="ball"?35:item==="potion"?25:Infinity;
  if(save.coins<cost){setToast("연구코인이 부족해! 야생 전투로 모아 보자.");beep("fail");return}
  save.coins-=cost;save.items[item]++;setToast("물품을 구매했어!");beep("capture");
 }
 updateAll();persist();openClinic();
}
function openDex(){
 if(!save)return;
 const seenCount=Object.keys(save.seen).filter(id=>species(id)?.playable).length;
 const got=Object.keys(save.collection).filter(id=>species(id)?.playable).length;
 openGeneric("탐험 도감 · "+got+"/"+DB.species.length,
  '<p>야생에서 발견한 몬스터는 모습이 보이고, 직접 잡은 몬스터는 과학 개념을 알아볼 수 있어. 발견 '+seenCount+'종 / 포획 '+got+'종</p>'+
  '<div class="dex-grid">'+DB.species.map(s=>{
    const caught=!!save.collection[s.id],seen=!!save.seen[s.id];
    return '<button class="dex-card '+(!seen?"unseen":"")+'" type="button" data-dex="'+s.id+'">'+
      (seen?miniArt(s.id):'<span style="font-size:32px">?</span>')+
      '<small>#'+String(s.dexNo).padStart(3,"0")+'</small><b>'+(seen?esc(s.name):"미발견")+'</b>'+
      '<small>'+(caught?"포획 완료":seen?"발견":"미발견")+'</small></button>';
   }).join("")+'</div><div class="dex-detail" id="dexDetail">도감 속 몬스터를 눌러 연구 내용을 살펴보세요.</div>');
}
function openDexDetail(id){
 if(!save?.seen[id])return;
 const s=species(id);if(!s)return;
 const caught=!!save.collection[id];
 $("dexDetail").innerHTML='<b>NO.'+String(s.dexNo).padStart(3,"0")+' '+esc(s.name)+'</b> · '+esc(DB.types[s.type].name)+' 속성 · '+esc(s.habitat)+
 (caught?'<div style="margin-top:5px"><b>'+esc(s.topicName)+'</b>: '+esc(s.fact)+'</div>':'<p>포획하면 이름의 과학·수학 개념을 알아볼 수 있어.</p>');
}
function useFieldPotion(){
 if(!save||battle)return;
 const p=E.activeCreature(save);
 if(!p)return;
 if(save.items.potion<=0){setToast("회복약이 없어. 연구소에서 구매하거나 치료받을 수 있어.");return}
 if(p.hp>=maxHp(p)){setToast("이미 체력이 가득해.");return}
 save.items.potion--;p.hp=Math.min(maxHp(p),p.hp+20);
 setToast(species(p.id).name+"의 HP를 회복했어. "+hpText(p));beep("capture");updateAll();persist();
}
function movePlayer(dx,dy,now=performance.now()){
 if(!save||battle||!$("genericOverlay").classList.contains("hidden")||!$("starterOverlay").hidden)return;
 if(now-lastMove<125)return;
 lastMove=now;
 const old=E.zoneAt(save.pos.x),result=E.move(save,dx,dy);
 if(!result.moved)return;
 if(result.zone!==old)setToast((E.ZONES.find(z=>z.key===result.zone)?.name||"새 지역")+"에 도착했어!");
 if(result.encounter){beep("click");enterBattle(result.encounter,result.zone,!!(result.encounter.id==="shibu_r00_c00"))}
 if(save.steps%5===0)persist();
 updateAll();
}
function leaveBattle(){
 if(battle?.special&&!save.flags.shibuCaught)save.flags.shibuSeen=false;
 battle=null;$("battleOverlay").classList.add("hidden");persist();updateAll();
}
function enterBattle(enemy,zone,special=false){
 const lead=E.activeCreature(save);
 if(!lead||lead.hp<=0){E.healAll(save);save.active=0;setToast("연구소로 돌아와 HP를 회복했어.");return}
 battle={foe:enemy,zone,special,turn:1,done:false,message:"야생 "+species(enemy.id).name+" 등장! 남은 체력을 예상하며 싸워보자."};
 save.seen[enemy.id]=true;save.grassSteps=0;
 $("battleOverlay").classList.remove("hidden");
 $("battleActionPanel").classList.remove("hidden");$("battleAfter").classList.add("hidden");
 renderBattle();persist();
}
function appendBattle(message){if(battle)battle.message=message}
function renderBattle(){
 if(!battle)return;
 const foe=battle.foe,own=E.activeCreature(save),a=species(own.id),b=species(foe.id);
 const maxOwn=maxHp(own),maxFoe=maxHp(foe);
 $("ownName").textContent=a.name+" Lv."+own.level;
 $("foeName").textContent=b.name+" Lv."+foe.level;
 $("ownHpLabel").textContent=own.hp+"/"+maxOwn;
 $("foeHpLabel").textContent=foe.hp+"/"+maxFoe;
 $("ownHpBar").style.width=barPct(own.hp,maxOwn);
 $("foeHpBar").style.width=barPct(foe.hp,maxFoe);
 $("ownHpBar").style.background=own.hp/maxOwn<.3?"#d86b5d":"#58ae68";
 $("foeHpBar").style.background=foe.hp/maxFoe<.3?"#d86b5d":"#58ae68";
 $("ownArt").innerHTML=artHtml(own.id);
 $("foeArt").innerHTML=artHtml(foe.id);
 $("battleZone").textContent=E.ZONES.find(z=>z.key===battle.zone)?.name||"비밀숲";
 const bg=battle.zone==="cave"?"Cave_Back.png":battle.zone==="forest"||battle.special?"Forest_Background.png":"Forest_Background.png";
 $("battleBackdrop").style.backgroundImage="linear-gradient(#ffffff15,#bdd2a725),url('"+ASSET+"more%20assets/"+bg+"')";
 $("battleTurn").textContent=battle.turn+"턴";
 $("battleLog").textContent=battle.message;
 if(battle.done){$("battleActionPanel").classList.add("hidden");$("battleAfter").classList.remove("hidden");return}
 const actions=[
  {act:"typed",title:DB.types[a.type].name+" 기술",description:hitEstimate("typed",9)},
  {act:"normal",title:"기본 공격",description:hitEstimate("normal",7)},
  {act:"soft",title:"살살 공격",description:hitEstimate("soft",4)+" · HP 1 남김"},
  {act:"ball",title:"포획구 던지기",description:catchEstimate()+" · 남은 "+save.items.ball+"개",disabled:save.items.ball<=0},
  {act:"potion",title:"회복약",description:"HP +20 · 남은 "+save.items.potion+"개",disabled:save.items.potion<=0},
  {act:"switch",title:"몬스터 교체",description:"교체하면 상대가 반격"},
  {act:"run",title:"도망가기",description:"언제든지 전투에서 탈출 가능"}
 ];
 $("battleButtons").innerHTML=actions.map(o=>'<button type="button" data-action="'+o.act+'" '+(o.disabled?"disabled":"")+' class="'+(o.act==="typed"?"strong":"")+'"><b>'+esc(o.title)+'</b><small>'+esc(o.description)+'</small></button>').join("");
}
function hitEstimate(action,power){
 const own=E.activeCreature(save),a=species(own.id),foe=battle.foe;
 const type=action==="typed"?a.type:"neutral";
 let value=DB.combat.damage({attacker:own.id,defender:foe.id,attackerLevel:own.level,defenderLevel:foe.level,power,moveType:type});
 if(action==="soft")value=Math.min(value,Math.max(0,foe.hp-1));
 const eff=DB.combat.effectiveness(type,species(foe.id).type);
 return "예상 "+value+" 피해"+(eff===2?" · 2배 상성":eff===.5?" · 절반 상성":"");
}
function catchEstimate(){
 const f=battle.foe;
 return Math.round(DB.combat.captureChance({target:f.id,level:f.level,hp:f.hp,maxHp:maxHp(f)})*100)+"% 확률";
}
function enemyTurn(){
 if(!battle||battle.done)return;
 const foe=battle.foe,active=E.activeCreature(save);
 if(!active)return;
 const raw=DB.combat.damage({attacker:foe.id,defender:active.id,attackerLevel:foe.level,defenderLevel:active.level,power:5});
 const hit=Math.max(2,Math.floor(raw*.58));active.hp=Math.max(0,active.hp-hit);
 appendBattle(battle.message+"\n"+species(foe.id).name+"의 반격! 우리 몬스터 HP -"+hit);
 if(active.hp<=0){
  const alive=save.party.findIndex(p=>p.hp>0);
  if(alive>=0){save.active=alive;appendBattle(battle.message+"\n다음 몬스터가 전투를 이어가!")}
  else{
   appendBattle(battle.message+"\n모든 몬스터가 쓰러졌어. 마을 연구소에서 회복했어.");
   E.healAll(save);save.active=0;save.pos={...E.START};battle.done=true;
   beep("fail");
  }
 }
}
function endFight(message,kind="win"){
 if(!battle)return;
 battle.done=true;appendBattle(message);beep(kind);renderBattle();updateAll();persist();
}
function attack(action){
 if(!battle||battle.done)return;
 const own=E.activeCreature(save),a=species(own.id),foe=battle.foe,b=species(foe.id);
 const power=action==="typed"?9:action==="normal"?7:4;
 const type=action==="typed"?a.type:"neutral";
 let damage=DB.combat.damage({attacker:own.id,defender:foe.id,attackerLevel:own.level,defenderLevel:foe.level,power,moveType:type});
 if(action==="soft")damage=Math.min(damage,Math.max(0,foe.hp-1));
 foe.hp=Math.max(0,foe.hp-damage);
 const multiplier=DB.combat.effectiveness(type,b.type);
 appendBattle(a.name+"의 "+(action==="typed"?DB.types[a.type].name+" 공격":action==="soft"?"살살 공격":"기본 공격")+"! "+damage+" 피해."+(multiplier===2?" 효과가 굉장해!":multiplier===.5?" 효과가 약해.":""));
 beep("hit");
 if(foe.hp<=0){
  const gain=E.levelRewards(save,foe);
  let message=b.name+"을(를) 이겼어! 경험치 +"+gain.earned+" / 코인 +"+gain.coins;
  if(gain.events.length)message+="\n레벨 업! "+a.name+" Lv."+own.level;
  endFight(message,"win");
  if(gain.events.length)pendingEvolution=true;
  return;
 }
 enemyTurn();battle.turn++;renderBattle();updateAll();persist();
}
let pendingEvolution=false;
function capture(){
 if(!battle||battle.done||save.items.ball<=0)return;
 const f=battle.foe,prob=DB.combat.captureChance({target:f.id,level:f.level,hp:f.hp,maxHp:maxHp(f)});
 save.items.ball--;
 if(Math.random()<prob){
  const destination=E.addCaptured(save,f);
  if(f.id==="shibu_r00_c00")save.flags.shibuCaught=true;
  announce("monster_caught",{id:f.id});
  endFight(species(f.id).name+" 포획 성공!\n"+(destination==="party"?"동료로 합류했어.":"동료 6마리가 꽉 차 보관함으로 이동했어.")+" · 확률 "+Math.round(prob*100)+"%","capture");
  return;
 }
 appendBattle("포획 실패! 이번 확률은 "+Math.round(prob*100)+"%였어. 확률이 높아도 실패할 수 있어!");
 beep("fail");enemyTurn();battle.turn++;renderBattle();updateAll();persist();
}
function potionInBattle(){
 if(!battle||battle.done||save.items.potion<=0)return;
 const p=E.activeCreature(save),before=p.hp;
 if(before>=maxHp(p)){appendBattle("체력이 가득 찼어. 공격하거나 포획해 보자.");renderBattle();return}
 save.items.potion--;p.hp=Math.min(maxHp(p),p.hp+20);
 appendBattle(species(p.id).name+" HP +"+(p.hp-before)+" 회복!");beep("capture");
 enemyTurn();battle.turn++;renderBattle();updateAll();persist();
}
function evolveIfReady(){
 if(!save)return;
 const p=E.activeCreature(save);if(!p)return;
 const options=DB.combat.evolutionAvailable(p.id,p.level);
 if(!options.length)return;
 const old=species(p.id);
 openGeneric(old.name+" 진화 선택",'<p>레벨 '+p.level+'이 되었어! 새로운 형태를 선택하면 능력치도 성장해. 지금 진화하지 않고 계속 키워도 괜찮아.</p>'+
 '<div class="evo-options">'+options.map(o=>'<button type="button" data-evolve="'+o.id+'">'+miniArt(o.id)+'<span>'+esc(o.name)+'</span></button>').join("")+'</div>'+
 '<div class="action-row"><button class="act" type="button" id="evoLater">지금은 그대로 둘래</button></div>');
 $("evoLater").onclick=closeGeneric;
}
function showSwap(){
 if(!save||!battle)return;
 openGeneric("교체할 몬스터",'<p>다른 몬스터로 바꾸면 상대가 한 번 공격할 수 있어.</p><div class="shop-list">'+save.party.map((p,i)=>
 '<div class="shop-item">'+miniArt(p.id)+'<div><strong>'+esc(species(p.id).name)+'</strong><small>Lv.'+p.level+' / HP '+hpText(p)+'</small></div><button type="button" data-swap="'+i+'" '+(i===save.active||p.hp<=0?"disabled":"")+'>선택</button></div>').join("")+'</div>');
}
function battleAction(action){
 if(!battle||battle.done)return;
 if(["typed","normal","soft"].includes(action))attack(action);
 else if(action==="ball")capture();
 else if(action==="potion")potionInBattle();
 else if(action==="switch")showSwap();
 else if(action==="run"){
  appendBattle("무사히 달아났어. 다음에는 다른 기술을 써 보자!");
  endFight(battle.message,"click");
 }
}
function renderTerrain(x,y,sx,sy){
 const t=E.terrain(x,y),area=E.zoneAt(x),seed=(x*43+y*71)%17;
 const colors={town:"#8ab58a",meadow:"#8bbd7d",forest:"#639b74",cave:"#777f82"};
 cx.fillStyle=colors[area];cx.fillRect(sx,sy,16,16);
 if(t==="path"){cx.fillStyle=area==="cave"?"#a49d89":"#c9b18b";cx.fillRect(sx,sy,16,16);
   cx.fillStyle="#ffffff22";cx.fillRect(sx+2,sy+3,5,2);cx.fillRect(sx+10,sy+12,4,1);return}
 if(t==="building"){cx.fillStyle="#d5bc8c";cx.fillRect(sx,sy,16,16);return}
 if(t==="wall"){cx.fillStyle="#4d7762";cx.fillRect(sx,sy,16,16);return}
 if(t==="rock"){cx.fillStyle="#646d73";cx.fillRect(sx,sy,16,16);cx.fillStyle="#aab1a4";cx.fillRect(sx+3,sy+3,9,5);cx.fillStyle="#414e58";cx.fillRect(sx+5,sy+11,9,3);return}
 if(t==="grass"){cx.fillStyle=area==="forest"?"#397c55":"#4fa06a";cx.fillRect(sx,sy,16,16);cx.fillStyle="#8ed378";for(let i=0;i<3;i++){let px=(i*5+seed)%13;cx.fillRect(sx+px,sy+4+i*3,2,5)}return}
 if(t==="rough"){cx.fillStyle="#4d5761";cx.fillRect(sx,sy,16,16);cx.fillStyle="#9d8c95";for(let i=0;i<3;i++)cx.fillRect(sx+((seed+i*7)%13),sy+2+i*5,3,2);return}
 if(t==="cave"){cx.fillStyle="#858991";cx.fillRect(sx,sy,16,16);cx.fillStyle="#b5afa4";cx.fillRect(sx+seed%10,sy+4,3,2);return}
 if(t==="crystal"){cx.fillStyle="#46515b";cx.fillRect(sx,sy,16,16);cx.fillStyle="#99dfe5";cx.beginPath();cx.moveTo(sx+8,sy+1);cx.lineTo(sx+14,sy+9);cx.lineTo(sx+8,sy+15);cx.lineTo(sx+2,sy+9);cx.fill();return}
 if(t==="tree"){
  cx.fillStyle="#38694a";cx.fillRect(sx+6,sy+8,4,8);
  cx.fillStyle="#215e43";cx.fillRect(sx+3,sy+3,10,10);
  cx.fillStyle="#4e9b59";cx.fillRect(sx+4,sy+1,8,8);return
 }
 if(t==="clearing"){cx.fillStyle="#d7c58a";cx.fillRect(sx,sy,16,16);cx.fillStyle="#7e79b5";cx.fillRect(sx+5,sy+3,6,10);return}
 if(seed===2||seed===4){
  const img=imgs.farm;if(img&&img.complete){
   const idx=area==="town"?16:area==="forest"?27:20;
   cx.drawImage(img,(idx%12)*16,Math.floor(idx/12)*16,16,16,sx,sy,16,16);
  }else{cx.fillStyle="#5a9757";cx.fillRect(sx+7,sy+8,2,5)}
 }
}
function drawBuilding(camX,camY){
 const sx=(6-camX)*16,sy=(5-camY)*16;if(sx>520||sx+128<0||sy>328||sy+80<0)return;
 cx.fillStyle="#375d5c";cx.fillRect(sx-2,sy+6,132,74);
 cx.fillStyle="#f7e1b0";cx.fillRect(sx+3,sy+27,122,52);
 cx.fillStyle="#bc694e";cx.fillRect(sx-6,sy+16,140,13);cx.fillRect(sx+1,sy+6,126,12);
 cx.fillStyle="#d88b65";cx.fillRect(sx+15,sy+1,99,8);
 cx.fillStyle="#8cc4ad";cx.fillRect(sx+16,sy+43,23,21);cx.fillRect(sx+88,sy+43,23,21);
 cx.fillStyle="#36765e";cx.fillRect(sx+58,sy+41,24,38);
 cx.fillStyle="#ffffff66";cx.fillRect(sx+21,sy+44,5,18);cx.fillRect(sx+94,sy+44,5,18);
 cx.fillStyle="#eed7a6";cx.fillRect(sx+51,sy+19,38,17);
 cx.fillStyle="#315648";cx.font="bold 9px monospace";cx.fillText("연구소",sx+52,sy+31);
}
function drawNpc(name,img,x,y,camX,camY,frame=0){
 const sx=(x-camX)*16,sy=(y-camY)*16;
 if(sx<-24||sx>530||sy<-24||sy>345)return;
 cx.fillStyle="#32583e55";cx.fillRect(sx+1,sy+11,15,4);
 if(img&&img.complete&&img.naturalWidth>=54){
  cx.drawImage(img,(frame%3)*18,0,18,26,sx-1,sy-12,18,26);
 }else{
  cx.fillStyle="#eac08b";cx.fillRect(sx+4,sy-7,9,9);cx.fillStyle="#4f6658";cx.fillRect(sx+4,sy+3,9,12);
 }
 cx.fillStyle="#173d37dd";cx.fillRect(sx-3,sy-24,Math.max(34,name.length*11),11);
 cx.font="bold 9px sans-serif";cx.fillStyle="#fff";cx.fillText(name,sx,sy-15);
}
function render(now){
 window.requestAnimationFrame(render);
 if(now-lastDraw<34)return;lastDraw=now;
 if(held&&!battle&&save&&$("genericOverlay").classList.contains("hidden")&&$("starterOverlay").hidden&&now-lastMove>=145){
  const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[held];
  if(d)movePlayer(...d,now);
 }
 const player=save?.pos||E.START;
 const camX=Math.max(0,Math.min(E.WIDTH-32,player.x-16)),camY=Math.max(0,Math.min(E.HEIGHT-20,player.y-10));
 cx.fillStyle="#80af72";cx.fillRect(0,0,C.width,C.height);
 for(let dy=0;dy<20;dy++)for(let dx=0;dx<32;dx++){const x=camX+dx,y=camY+dy;renderTerrain(x,y,dx*16,dy*16)}
 drawBuilding(camX,camY);
 if(camX<=13&&camY<=10){drawNpc("회복·상점",imgs.staff,9,10,camX,camY);drawNpc("연구원",imgs.npc,13,10,camX,camY)}
 const px=(player.x-camX)*16,py=(player.y-camY)*16;
 cx.fillStyle="#254c3950";cx.fillRect(px+2,py+11,13,4);
 const frame=Math.floor(now/210)%3;
 const facing={down:0,left:1,right:2,up:3}[save?.facing||"down"]||0;
 const npc=imgs.npc;
 if(npc&&npc.complete&&npc.naturalWidth>=54){
  const sy=Math.min(facing*26,Math.max(0,npc.naturalHeight-26));
  cx.drawImage(npc,frame*18,sy,18,26,px-1,py-12,18,26);
 }else{cx.fillStyle="#f0c490";cx.fillRect(px+4,py-6,9,10);cx.fillStyle="#396e93";cx.fillRect(px+4,py+4,9,10)}
 if(!save){cx.fillStyle="#0d3e33c9";cx.fillRect(155,137,205,42);cx.fillStyle="#fff";cx.font="bold 13px sans-serif";cx.fillText("파트너를 골라 탐험을 시작해!",164,162)}
}
function attach(){
 $("starterChoices").addEventListener("click",e=>{const b=e.target.closest("button[data-starter]");if(b)startNew(b.dataset.starter)});
 $("battleButtons").addEventListener("click",e=>{const b=e.target.closest("button[data-action]");if(b&&!b.disabled)battleAction(b.dataset.action)});
 $("battleContinue").addEventListener("click",()=>{leaveBattle();if(pendingEvolution){pendingEvolution=false;evolveIfReady()}});
 $("teamList").addEventListener("click",e=>{const b=e.target.closest("button[data-team]");if(b)selectTeam(Number(b.dataset.team))});
 $("genericBody").addEventListener("click",e=>{
  let b=e.target.closest("button[data-buy]");if(b){buy(b.dataset.buy);return}
  b=e.target.closest("button[data-swap]");if(b){const choice=Number(b.dataset.swap);closeGeneric();selectTeam(choice,true);return}
  b=e.target.closest("button[data-dex]");if(b){openDexDetail(b.dataset.dex);return}
  b=e.target.closest("button[data-evolve]");if(b){
    if(E.maybeEvolve(save,b.dataset.evolve)){beep("win");setToast("새로운 형태로 진화했어!");persist();updateAll()}
    closeGeneric();return}
 });
 $("genericClose").addEventListener("click",closeGeneric);
 $("interactBtn").addEventListener("click",talk);
 $("openDex").addEventListener("click",openDex);
 $("goClinic").addEventListener("click",()=>{if(!save)return;setToast("연구소 직원은 마을 왼쪽 연구소 바로 아래 있어. 걸어 돌아가 A를 눌러 봐.")});
 $("healField").addEventListener("click",useFieldPotion);
 $("newGame").addEventListener("click",()=>{if(!confirm("지금 탐험 기록을 지우고 처음부터 시작할까?"))return;try{localStorage.removeItem(SAVE_KEY)}catch(e){}save=null;showStarter();setToast("새로운 모험을 시작해 보자.")});
 $("exitButton").addEventListener("click",()=>{persist();if(window.KidscadeGame?.exit){window.KidscadeGame.exit();return}if(window.parent!==window){window.parent.postMessage({type:"kidscade:close-game"},location.origin);return}if(history.length>1){history.back();return}location.href="../../"});
 $("audioButton").addEventListener("click",()=>{soundOn=!soundOn;$("audioButton").textContent=soundOn?"소리 켬":"소리 끔";if(soundOn)beep("click")});
 document.querySelectorAll("[data-dir]").forEach(b=>{
  const dir=b.dataset.dir;const stop=e=>{if(held===dir)held=null;clearInterval(moveTimer);moveTimer=0;try{b.releasePointerCapture(e.pointerId)}catch(_){}};
  b.addEventListener("pointerdown",e=>{e.preventDefault();held=dir;const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir];movePlayer(...d,performance.now());try{b.setPointerCapture(e.pointerId)}catch(_){}});
  for(const event of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(event,stop);
 });
 const keys={ArrowUp:"up",KeyW:"up",ArrowDown:"down",KeyS:"down",ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right"};
 window.addEventListener("keydown",e=>{
  if(e.target?.matches("input,textarea,select"))return;
  if(keys[e.code]){
   e.preventDefault();held=keys[e.code];let d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[held];movePlayer(...d,performance.now());
  }else if(["KeyZ","Enter","Space"].includes(e.code)&&!e.repeat){e.preventDefault();if(!battle)talk()}
  else if(e.code==="Escape"&&!e.repeat&&!$("genericOverlay").classList.contains("hidden"))closeGeneric();
 });
 window.addEventListener("keyup",e=>{if(keys[e.code]&&held===keys[e.code])held=null});
 window.addEventListener("blur",()=>{held=null});
 C.addEventListener("click",e=>{
  if(!save||battle)return;
  const rect=C.getBoundingClientRect(),mx=Math.floor((e.clientX-rect.left)*C.width/rect.width/16),my=Math.floor((e.clientY-rect.top)*C.height/rect.height/16);
  const camX=Math.max(0,Math.min(E.WIDTH-32,save.pos.x-16)),camY=Math.max(0,Math.min(E.HEIGHT-20,save.pos.y-10));
  const tx=mx+camX,ty=my+camY,dx=tx-save.pos.x,dy=ty-save.pos.y;
  if(Math.abs(dx)+Math.abs(dy)===1)movePlayer(Math.sign(dx),Math.sign(dy),performance.now());
  else setToast("화면 아래 방향키로 이동할 수 있어. 인접한 칸을 눌러도 움직여.");
 });
 document.addEventListener("visibilitychange",()=>{if(document.hidden){held=null;persist()}});
}
attach();
save=stored();
if(save){if(!save.party.some(p=>p.hp>0)){E.healAll(save);save.active=0}updateAll();setToast("저장된 탐험을 불러왔어. 계속 이동해 보자.")}
else showStarter();
requestAnimationFrame(render);
window.OPENMON_EXPEDITION_DEBUG={getState:()=>save,getBattle:()=>battle,engine:E,begin:id=>startNew(id),move:(dx,dy)=>E.move(save,dx,dy,()=>.5)};
})();