(function(){
"use strict";
const DB=window.OPENMON_DEX,E=window.OPENMON_EXPEDITION_ENGINE;
if(!DB?.combat||!E)throw Error("Openmon Expedition engine missing");
const $=id=>document.getElementById(id);
const C=$("worldCanvas"),cx=C.getContext("2d",{alpha:false});
cx.imageSmoothingEnabled=false;
const SAVE_KEY="kidscade.openmon.expedition.save.v1";
let save=null,battle=null,lastDraw=0,lastMove=0,held=null,moveTimer=0,soundOn=true,audio=null;
let latestToast="풀숲이나 동굴의 거친 땅으로 이동하면 키즈몬을 만날 수 있어요.";
let toastTimer=null;
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
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));$("saveInfo").textContent="●";$("saveInfo").title="자동 저장됨";$("saveInfo").setAttribute("aria-label","진행 자동 저장됨")}
 catch(e){$("saveInfo").textContent="!";$("saveInfo").title="저장 실패 · 저장공간 확인";$("saveInfo").setAttribute("aria-label","저장 실패")}
}
function setToast(message){
 latestToast=message;
 const toast=$("mapToast");
 toast.textContent=message;toast.classList.remove("toast-faded");
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>toast.classList.add("toast-faded"),4300);
}
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
 setToast("오른쪽 길을 따라가면 첫 키즈몬을 만나! 키즈몬 연구소에서는 A로 대화할 수 있어.");
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
 const progress=save.wins+save.catches;
 $("objective").textContent=save.encounters===0?"→ 초원 입구에서 첫 키즈몬 만나기":save.catches===0?"첫 야생 키즈몬 포획하기":progress<3?"키즈몬을 더 만나고 연구하기":progress<12?"연구 도감 확장 · 새 종류 찾기":"새로운 키즈몬을 모아 도감 완성하기";
 renderTeam();
}
function renderTeam(){
 if(!save)return;
 $("teamList").innerHTML=save.party.map((p,i)=>{
 const s=species(p.id),pct=barPct(p.hp,maxHp(p));
 return '<button type="button" class="member '+(i===save.active?"selected":"")+'" data-team="'+i+'" title="이 키즈몬으로 바꾸기">'+
 '<span class="member-art">'+miniArt(p.id)+'</span><span class="member-info"><b>'+esc(s.name)+' <small>Lv.'+p.level+'</small></b>'+
 '<small>HP '+hpText(p)+'</small><span class="hp-bar"><span class="hp-fill" style="width:'+pct+';background:'+(p.hp/maxHp(p)<.3?"#d97869":"#58ae68")+'"></span></span></span></button>'
 }).join("");
}
function selectTeam(index,fromBattle=false){
 if(!save||index<0||index>=save.party.length)return false;
 const p=save.party[index];
 if(p.hp<=0){setToast("HP가 0인 키즈몬은 먼저 회복해야 해.");return false}
 if(index===save.active)return false;
 save.active=index;beep("click");updateAll();persist();
 if(fromBattle&&battle&&!battle.done){
  appendBattle("키즈몬을 교체했어! "+species(p.id).name+" 출전!");
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
function openParty(){
 if(!save)return;
 openGeneric("우리 키즈몬","<p>선두 키즈몬을 바꾸거나 회복약을 사용할 수 있어. 전투 중에는 교체에 한 턴이 필요해.</p>"+
 '<div class="team hud-party-list">'+$("teamList").innerHTML+'</div>'+
 '<div class="action-row"><button type="button" class="act primary" data-hud-action="potion">회복약 사용 ('+save.items.potion+'개)</button>'+
 '<button type="button" class="act" data-hud-action="evolve">진화 확인</button></div>',
 save.party.length+"/6마리 · 선택하면 선두 변경");
}
function openBag(){
 if(!save)return;
 openGeneric("탐험 가방","<div class='shop-list'>"+
 '<div class="shop-item"><div><strong>키즈볼</strong><small>야생 키즈몬을 포획할 때 사용 · 전투 중에 던질 수 있어</small></div><strong>'+save.items.ball+'개</strong></div>'+
 '<div class="shop-item"><div><strong>회복약</strong><small>선두 키즈몬 HP 20 회복</small></div><button type="button" data-hud-action="potion" '+(save.items.potion===0?"disabled":"")+'>사용 · '+save.items.potion+'개</button></div>'+
 '<div class="shop-item"><div><strong>연구코인</strong><small>연구소에서 키즈볼·회복약 구매</small></div><strong>'+save.coins+'</strong></div>'+
 '</div><div class="action-row"><button type="button" class="act" data-hud-action="clinic">연구소 위치 확인</button></div>',
 "가방을 열어도 모험 진행은 멈춰 있어");
}
function openGoals(){
 if(!save)return;
 const goal=$("objective").textContent;
 const zone=E.zoneAt(save.pos.x);
 const hint=zone==="town"?"오른쪽 흙길을 따라가면 풀숲이 나타나고 첫 키즈몬을 만날 수 있어. 연구소 근처에서는 A 버튼으로 이야기하자.":
  zone==="meadow"?"첫 만남 후에는 풀숲에서 HP를 줄여 키즈볼을 던져 봐. 승리·포획을 3, 7, 12번 쌓으면 새 야생 키즈몬이 등장해.":
  zone==="forest"?"다양한 속성의 키즈몬을 잡아 보자. 숲 속 숨겨진 장소에서는 특별한 키즈몬을 만날 수도 있어.":
  "동굴에서 타입 상성을 비교해 봐. 다치면 마을 연구소로 돌아와 무료로 치료받을 수 있어.";
 openGeneric("탐험 목표","<div class='mission-sheet'><strong>현재 목표</strong><p>"+esc(goal)+"</p>"+
 "<strong>다음 행동 힌트</strong><p>"+esc(hint)+"</p>"+
 '<div class="equipment"><span>발견한 키즈몬</span><b>'+$("seenCount").textContent+'</b></div>'+
 '<div class="equipment"><span>수집한 키즈몬</span><b>'+$("caughtCount").textContent+'</b></div>'+
 '<div class="equipment"><span>진행 걸음 수</span><b>'+save.steps+'걸음</b></div></div>',
 "연구 진행 "+(save.wins+save.catches)+" · 새 야생 종 해금: 3·7·12 기록");
}
function openMenu(){
 if(!save)return;
 openGeneric("키즈몬 메뉴",'<div class="shop-list">'+
 '<div class="shop-item"><div><strong>소리</strong><small>효과음 켜기·끄기</small></div><button type="button" data-hud-action="audio">'+(soundOn?"끄기":"켜기")+'</button></div>'+
 '<div class="shop-item"><div><strong>자동 저장</strong><small>이 기기에서 진행 기록을 이어할 수 있어</small></div><strong>'+($("saveInfo").textContent==="!"?"저장 실패":"저장됨")+'</strong></div>'+
 '<div class="shop-item"><div><strong>처음부터</strong><small>현재 탐험 기록 초기화 · 확인 후 실행</small></div><button type="button" data-hud-action="restart">초기화</button></div>'+
 '<div class="shop-item"><div><strong>키즈케이드로</strong><small>진행을 저장하고 게임에서 나가기</small></div><button type="button" data-hud-action="exit">나가기</button></div>'+
 '</div>');
}
function openHud(tab){
 if(!save)return;
 if(tab==="party")openParty();
 else if(tab==="bag")openBag();
 else if(tab==="dex")openDex();
 else if(tab==="goals")openGoals();
 else if(tab==="menu")openMenu();
}
function closeGeneric(){$("genericOverlay").classList.add("hidden")}
function talk(){
 if(!save||battle||!$("genericOverlay").classList.contains("hidden"))return;
 const x=save.pos.x,y=save.pos.y;
 if(Math.abs(x-9)+Math.abs(y-10)<=2){openClinic();return}
 if(Math.abs(x-13)+Math.abs(y-10)<=2){
  openGeneric("수학 연구원",'<p>야생 키즈몬의 남은 체력과 기술의 피해량을 비교해 봐. 강한 공격만 쓰면 포획에 실패할 수도 있어!</p><button class="modal-action" id="researchDex">도감 열기</button>');
  $("researchDex").onclick=()=>{closeGeneric();openDex()};return
 }
 if(E.terrain(x,y)==="clearing"||Math.abs(x-56)+Math.abs(y-7)<=1){
  setToast("이 숲에서는 분기견이 발견되었다고 해. 풀숲을 살펴봐!");return
 }
 if(E.zoneAt(x)==="town")setToast("오른쪽으로 걸어가 이슬초원을 찾아봐. 위쪽 연구소의 연구원에게도 이야기할 수 있어.");
 else setToast("초록색 긴 풀이나 동굴의 거친 땅을 밟아야 야생 키즈몬과 만날 수 있어!");
 beep("click");
}
function openClinic(){
 const available=E.researchStarterOptions(save);
 const stillMissing=["set1_r02_c02","set1_r03_c02","set1_r04_c02"].some(id=>!save.collection[id]);
 const gift=available.available.length?
  '<div class="shop-item"><div><strong>연구 스타팅 선물</strong><small>발견·포획 활동 보상! 다른 스타팅을 한 마리 받을 수 있어.</small></div></div>'+
  available.available.map(id=>'<div class="shop-item">'+miniArt(id)+'<div><strong>'+esc(species(id).name)+'</strong><small>Lv.5 · 포획할 필요 없는 보상</small></div><button data-gift="'+id+'">받기</button></div>').join(""):
  stillMissing?'<div class="shop-item"><div><strong>연구 스타팅 선물</strong><small>도감에 서로 다른 키즈몬 '+available.required+'종을 모으면 다른 스타팅을 받을 수 있어. 현재 '+available.count+'종</small></div></div>':
  '<div class="shop-item"><strong>스타팅 세 친구 연구 완료!</strong></div>';
 openGeneric("키즈몬 연구소",'<p>키즈몬을 무료로 치료하거나 키즈볼·회복약을 살 수 있어. 서로 다른 키즈몬을 연구하면 새로운 파트너도 선물할게!</p>'+
 '<div class="shop-list"><div class="shop-item"><div><strong>전체 무료 회복</strong><small>전투 불능인 키즈몬도 회복</small></div><button data-buy="heal">치료</button></div>'+
 '<div class="shop-item"><div><strong>키즈볼 +1</strong><small>연구코인 35</small></div><button data-buy="ball">35코인</button></div>'+
 '<div class="shop-item"><div><strong>회복약 +1</strong><small>연구코인 25</small></div><button data-buy="potion">25코인</button></div>'+
 '<div class="shop-item"><div><strong>키즈몬 보관함</strong><small>보관 중 '+save.box.length+'마리 · 선두 키즈몬과 교체 가능</small></div><button data-hud-action="box">열기</button></div>'+gift+'</div>');
}
function openBox(){
 if(!save)return;
 const list=save.box.length?save.box.map((p,i)=>
 '<div class="shop-item">'+miniArt(p.id)+'<div><strong>'+esc(species(p.id).name)+'</strong>'+
 '<small>Lv.'+p.level+' · HP '+hpText(p)+'</small></div>'+
 '<button type="button" data-withdraw="'+i+'">'+(save.party.length<6?"파티로":"선두와 교체")+'</button></div>').join(""):
 '<p>보관한 키즈몬이 없어. 파티는 최대 6마리까지 데려갈 수 있어.</p>';
 openGeneric("키즈몬 보관함",'<p>여울마을 연구소에서 언제든 꺼낼 수 있어. 파티가 가득 찼다면 현재 선두와 교체해.</p>'+
 '<div class="shop-list">'+list+'</div>');
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
  '<p>야생에서 발견한 키즈몬은 모습이 보이고, 직접 잡은 키즈몬은 과학 개념을 알아볼 수 있어. 발견 '+seenCount+'종 / 포획 '+got+'종</p>'+
  '<div class="dex-grid">'+DB.species.map(s=>{
    const caught=!!save.collection[s.id],seen=!!save.seen[s.id];
    return '<button class="dex-card '+(!seen?"unseen":"")+'" type="button" data-dex="'+s.id+'">'+
      (seen?miniArt(s.id):'<span style="font-size:32px">?</span>')+
      '<small>#'+String(s.dexNo).padStart(3,"0")+'</small><b>'+(seen?esc(s.name):"미발견")+'</b>'+
      '<small>'+(caught?"포획 완료":seen?"발견":"미발견")+'</small></button>';
   }).join("")+'</div><div class="dex-detail" id="dexDetail">도감 속 키즈몬을 눌러 연구 내용을 살펴보세요.</div>');
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
 if(result.encounter){
   beep("click");
   enterBattle(result.encounter,result.zone,!!(result.encounter.id==="shibu_r00_c00"),!!result.firstRoad);
 }
 if(save.steps%5===0)persist();
 updateAll();
}
function leaveBattle(){
 battle=null;$("battleOverlay").classList.add("hidden");persist();updateAll();
}
function enterBattle(enemy,zone,special=false,firstRoad=false){
 const lead=E.activeCreature(save);
 if(!lead||lead.hp<=0){E.healAll(save);save.active=0;setToast("연구소로 돌아와 HP를 회복했어.");return}
 battle={foe:enemy,zone,special,firstRoad,turn:1,done:false,
 message:firstRoad?"첫 번째 키즈몬, 멘델콩을 만났어! '살살 공격'으로 HP를 낮춘 뒤 키즈볼을 던져 보자!":
  "야생 "+species(enemy.id).name+" 등장! 남은 체력을 예상하며 싸워보자."};
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
  {act:"ball",title:"키즈볼 던지기",description:catchEstimate()+" · 남은 "+save.items.ball+"개",disabled:save.items.ball<=0},
  {act:"potion",title:"회복약",description:"HP +20 · 남은 "+save.items.potion+"개",disabled:save.items.potion<=0},
  {act:"switch",title:"키즈몬 교체",description:"교체하면 상대가 반격"},
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
 const hit=E.retaliationDamage(save,foe,active);active.hp=Math.max(0,active.hp-hit);
 appendBattle(battle.message+"\n"+species(foe.id).name+"의 반격! 우리 키즈몬 HP -"+hit);
 if(active.hp<=0){
  const alive=save.party.findIndex(p=>p.hp>0);
  if(alive>=0){save.active=alive;appendBattle(battle.message+"\n다음 키즈몬이 전투를 이어가!")}
  else{
   appendBattle(battle.message+"\n모든 키즈몬이 쓰러졌어. 마을 연구소에서 회복했어.");
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
  if(gain.mentorHeal)message+="\n연구원의 응원! HP +"+gain.mentorHeal+" 자동 회복";
  if([3,7,12].includes(save.wins+save.catches))message+="\n새로운 종류의 야생 키즈몬이 지역에 나타나기 시작했어!";
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
  announce("monster_caught",{id:f.id,uniqueKey:"caught:"+f.id,value:1});
  const progress=save.wins+save.catches;
  endFight(species(f.id).name+" 포획 성공!\n"+(destination==="party"?"동료로 합류했어.":"동료 6마리가 꽉 차 보관함으로 이동했어.")+" · 확률 "+Math.round(prob*100)+"%"+
    ([3,7,12].includes(progress)?"\n연구 기록이 늘어 새 야생 키즈몬이 등장하기 시작했어!":""),"capture");
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
 openGeneric("교체할 키즈몬",'<p>다른 키즈몬으로 바꾸면 상대가 한 번 공격할 수 있어.</p><div class="shop-list">'+save.party.map((p,i)=>
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
 const t=E.terrain(x,y),area=E.zoneAt(x),seed=(x*73+y*91)%41;
 const base={town:"#94b889",meadow:"#9cc987",forest:"#72aa76",cave:"#818792"};
 cx.fillStyle=base[area];cx.fillRect(sx,sy,16,16);
 if(t==="path"){
  cx.fillStyle=area==="cave"?"#c0b49b":area==="town"?"#d1c0a0":"#d5bc93";cx.fillRect(sx,sy,16,16);
  cx.fillStyle="#fff7d62b";cx.fillRect(sx,sy,16,2);
  cx.fillStyle="#746e5740";cx.fillRect(sx+(seed%7),sy+6,4,1);cx.fillRect(sx+((seed+8)%9),sy+12,4,1);
  if(area==="town"){cx.fillStyle="#f8edce3a";cx.fillRect(sx+1,sy+1,6,4)}
  return;
 }
 if(t==="building"){cx.fillStyle="#d5bc8c";cx.fillRect(sx,sy,16,16);return}
 if(t==="wall"){
  cx.fillStyle=area==="cave"?"#4c5662":"#477252";cx.fillRect(sx,sy,16,16);
  cx.fillStyle="#ffffff16";cx.fillRect(sx+2,sy+2,12,2);return
 }
 if(t==="rock"){
  cx.fillStyle="#7b8188";cx.fillRect(sx,sy,16,16);
  cx.fillStyle="#535d67";cx.fillRect(sx+2,sy+5,12,9);
  cx.fillStyle="#a7aab0";cx.fillRect(sx+4,sy+3,7,5);return
 }
 if(t==="grass"){
  const entrance=x>=20&&x<=22&&y>=11&&y<=13;
  cx.fillStyle=entrance?"#4d9b64":area==="forest"?"#39794c":"#508d52";cx.fillRect(sx,sy,16,16);
  cx.fillStyle=entrance?"#b0ea79":"#8edc73";
  for(let i=0;i<3;i++){const px=(i*5+seed)%13;cx.fillRect(sx+px,sy+3+i*4,2,5);cx.fillRect(sx+px+2,sy+5+i*4,1,2)}
  if(entrance){cx.fillStyle="#f5db73";cx.fillRect(sx+6,sy+5,3,3);cx.fillRect(sx+11,sy+9,2,2)}
  return;
 }
 if(t==="rough"){
  cx.fillStyle="#646d75";cx.fillRect(sx,sy,16,16);
  cx.fillStyle="#a5a19b";for(let i=0;i<3;i++)cx.fillRect(sx+((seed+i*7)%13),sy+2+i*5,3,2);return
 }
 if(t==="cave"){
  cx.fillStyle="#8b9199";cx.fillRect(sx,sy,16,16);
  cx.fillStyle="#aeb3b3";cx.fillRect(sx+seed%10,sy+4,4,2);return
 }
 if(t==="crystal"){
  cx.fillStyle="#485b67";cx.fillRect(sx,sy,16,16);cx.fillStyle="#a6eff1";cx.beginPath();
  cx.moveTo(sx+8,sy+1);cx.lineTo(sx+14,sy+9);cx.lineTo(sx+8,sy+15);cx.lineTo(sx+2,sy+9);cx.fill();return
 }
 if(t==="tree"){
  cx.fillStyle="#3b744b";cx.fillRect(sx+6,sy+7,4,9);
  cx.fillStyle=area==="forest"?"#27543b":"#3f7046";cx.fillRect(sx+2,sy+5,12,8);
  cx.fillStyle=area==="forest"?"#4a8c58":"#5f9e5a";cx.fillRect(sx+4,sy+1,8,8);
  cx.fillStyle="#87c47a";cx.fillRect(sx+5,sy+3,3,2);return
 }
 if(t==="clearing"){
  cx.fillStyle="#ead494";cx.fillRect(sx,sy,16,16);cx.fillStyle="#796abb";cx.fillRect(sx+5,sy+3,6,10);
  cx.fillStyle="#d8ecfe";cx.fillRect(sx+7,sy+5,2,4);return
 }
 if(t==="town"){
  // Sparse planted flowers instead of repeating a random atlas decoration every few tiles.
  if(seed===5||seed===24){cx.fillStyle="#478e61";cx.fillRect(sx+7,sy+9,2,4);
    cx.fillStyle=seed===5?"#f4e8a1":"#f4aeb2";cx.fillRect(sx+5,sy+6,6,4)}
  return;
 }
 if(t==="field"){
  if(seed<3){cx.fillStyle="#73b576";cx.fillRect(sx+4,sy+8,2,4);cx.fillRect(sx+9,sy+6,2,5)}
  if(seed===18){cx.fillStyle="#fff0ad";cx.fillRect(sx+8,sy+8,4,3)}
 }
}
function drawLandmarks(camX,camY){
 function tile(x,y){return {x:(x-camX)*16,y:(y-camY)*16}}
 function sign(x,y,title){
  const p=tile(x,y);if(p.x<-95||p.x>C.width+40||p.y<-38||p.y>C.height+25)return;
  cx.fillStyle="#514c33";cx.fillRect(p.x+7,p.y+10,3,10);
  cx.fillStyle="#edd6a1";cx.fillRect(p.x-8,p.y-7,62,17);
  cx.fillStyle="#8b6544";cx.fillRect(p.x-8,p.y-7,62,2);
  cx.fillStyle="#3c513c";cx.font="bold 9px sans-serif";cx.fillText(title,p.x-5,p.y+4);
 }
 function flowerbed(x,y){
  const p=tile(x,y);if(p.x<0||p.x>C.width||p.y<0||p.y>C.height)return;
  cx.fillStyle="#447b4d";cx.fillRect(p.x,p.y+7,16,9);
  for(let i=0;i<3;i++){cx.fillStyle=i===1?"#ffe6a4":"#f2aabb";cx.fillRect(p.x+2+i*5,p.y+6+(i%2)*3,3,3)}
 }
 sign(16,10,"→ 첫 만남");
 sign(39,9,"→ 가지숲");
 sign(61,9,"→ 동굴");
 flowerbed(3,17);flowerbed(4,17);flowerbed(5,17);
}
function drawBuilding(camX,camY){
 const sx=(6-camX)*16,sy=(5-camY)*16;if(sx>C.width+8||sx+128<0||sy>C.height+8||sy+80<0)return;
 cx.fillStyle="#375d5c";cx.fillRect(sx-2,sy+6,132,74);
 cx.fillStyle="#f7e1b0";cx.fillRect(sx+3,sy+27,122,52);
 cx.fillStyle="#bc694e";cx.fillRect(sx-6,sy+16,140,13);cx.fillRect(sx+1,sy+6,126,12);
 cx.fillStyle="#d88b65";cx.fillRect(sx+15,sy+1,99,8);
 cx.fillStyle="#8cc4ad";cx.fillRect(sx+16,sy+43,23,21);cx.fillRect(sx+88,sy+43,23,21);
 cx.fillStyle="#36765e";cx.fillRect(sx+58,sy+41,24,38);
 cx.fillStyle="#ffffff66";cx.fillRect(sx+21,sy+44,5,18);cx.fillRect(sx+94,sy+44,5,18);
 cx.fillStyle="#eed7a6";cx.fillRect(sx+51,sy+19,38,17);
 cx.fillStyle="#315648";cx.font="bold 9px monospace";cx.fillText("키즈몬",sx+52,sy+31);
}
function drawNpc(name,img,x,y,camX,camY,frame=0){
 const sx=(x-camX)*16,sy=(y-camY)*16;
 if(sx<-24||sx>C.width+18||sy<-24||sy>C.height+25)return;
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
 const columns=C.width/16,rows=C.height/16;
 const camX=Math.max(0,Math.min(E.WIDTH-columns,player.x-Math.floor(columns/2)));
 const camY=Math.max(0,Math.min(E.HEIGHT-rows,player.y-Math.floor(rows/2)));
 cx.fillStyle="#80af72";cx.fillRect(0,0,C.width,C.height);
 for(let dy=0;dy<rows;dy++)for(let dx=0;dx<columns;dx++){const x=camX+dx,y=camY+dy;renderTerrain(x,y,dx*16,dy*16)}
 drawBuilding(camX,camY);
 drawLandmarks(camX,camY);
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
 if(!save){cx.fillStyle="#0d3e33c9";cx.fillRect(C.width/2-106,C.height/2-22,212,44);cx.fillStyle="#fff";cx.font="bold 12px sans-serif";cx.fillText("파트너를 골라 탐험을 시작해!",C.width/2-98,C.height/2+5)}
}
function attach(){
 $("starterChoices").addEventListener("click",e=>{const b=e.target.closest("button[data-starter]");if(b)startNew(b.dataset.starter)});
 $("battleButtons").addEventListener("click",e=>{const b=e.target.closest("button[data-action]");if(b&&!b.disabled)battleAction(b.dataset.action)});
 $("battleContinue").addEventListener("click",()=>{leaveBattle();if(pendingEvolution){pendingEvolution=false;evolveIfReady()}});
 $("teamList").addEventListener("click",e=>{const b=e.target.closest("button[data-team]");if(b)selectTeam(Number(b.dataset.team))});
 $("genericBody").addEventListener("click",e=>{
  let b=e.target.closest("button[data-hud-action]");
  if(b){
   const act=b.dataset.hudAction;
   if(act==="potion"){useFieldPotion();if(!battle){if($("genericTitle").textContent==="탐험 가방")openBag();else openParty()}}
   else if(act==="clinic"){closeGeneric();$("goClinic").click()}
   else if(act==="box")openBox();
   else if(act==="evolve"){closeGeneric();evolveIfReady();}
   else if(act==="audio"){$("audioButton").click();openMenu()}
   else if(act==="restart"){closeGeneric();$("newGame").click()}
   else if(act==="exit"){$("exitButton").click()}
   return;
  }
  b=e.target.closest("button[data-team]");
  if(b){const changed=selectTeam(Number(b.dataset.team));if(changed){closeGeneric()}return}
  b=e.target.closest("button[data-withdraw]");
  if(b){
   const member=save.box[Number(b.dataset.withdraw)];
   if(member&&E.withdrawFromBox(save,Number(b.dataset.withdraw))){
    updateAll();persist();setToast(species(member.id).name+"을(를) 파티로 데려왔어!");
   }
   openBox();return;
  }
  b=e.target.closest("button[data-gift]");
  if(b){
   if(E.claimResearchStarter(save,b.dataset.gift)){
    beep("win");updateAll();persist();
    setToast(species(b.dataset.gift).name+"이(가) 연구소에서 합류했어! 가방과 파티를 확인해 보자.");
   }
   openClinic();return;
  }
  b=e.target.closest("button[data-buy]");if(b){buy(b.dataset.buy);return}
  b=e.target.closest("button[data-swap]");if(b){const choice=Number(b.dataset.swap);closeGeneric();selectTeam(choice,true);return}
  b=e.target.closest("button[data-dex]");if(b){openDexDetail(b.dataset.dex);return}
  b=e.target.closest("button[data-evolve]");if(b){
    if(E.maybeEvolve(save,b.dataset.evolve)){beep("win");setToast("새로운 형태로 진화했어!");persist();updateAll()}
    closeGeneric();return}
 });
 $("genericClose").addEventListener("click",closeGeneric);
 document.querySelectorAll("[data-hud]").forEach(button=>button.addEventListener("click",()=>{beep("click");openHud(button.dataset.hud)}));
 $("interactBtn").addEventListener("click",talk);
 $("openDex").addEventListener("click",openDex);
 $("goClinic").addEventListener("click",()=>{if(!save)return;setToast("연구소 직원은 마을 왼쪽 연구소 바로 아래 있어. 걸어 돌아가 A를 눌러 봐.")});
 $("healField").addEventListener("click",useFieldPotion);
 $("newGame").addEventListener("click",()=>{if(!confirm("지금 탐험 기록을 지우고 처음부터 시작할까?"))return;try{localStorage.removeItem(SAVE_KEY)}catch(e){}save=null;closeGeneric();showStarter();setToast("새로운 모험을 시작해 보자.")});
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
  const rect=C.getBoundingClientRect();
  const scale=Math.max(rect.width/C.width,rect.height/C.height);
  const visibleW=C.width*scale,visibleH=C.height*scale;
  const pixelX=(e.clientX-rect.left+(visibleW-rect.width)/2)/scale;
  const pixelY=(e.clientY-rect.top+(visibleH-rect.height)/2)/scale;
  const mx=Math.floor(pixelX/16),my=Math.floor(pixelY/16);
  const columns=C.width/16,rows=C.height/16;
  const camX=Math.max(0,Math.min(E.WIDTH-columns,save.pos.x-Math.floor(columns/2)));
  const camY=Math.max(0,Math.min(E.HEIGHT-rows,save.pos.y-Math.floor(rows/2)));
  const tx=mx+camX,ty=my+camY,dx=tx-save.pos.x,dy=ty-save.pos.y;
  if(Math.abs(dx)+Math.abs(dy)===1)movePlayer(Math.sign(dx),Math.sign(dy),performance.now());
  else setToast("왼쪽 이동키로 이동하고 오른쪽 A 버튼으로 살펴볼 수 있어.");
 });
 document.addEventListener("visibilitychange",()=>{if(document.hidden){held=null;persist()}});
}
function configureViewport(){
 const mobile=window.innerWidth<=760;
 const w=mobile?320:512,h=mobile?416:320;
 if(C.width!==w||C.height!==h){C.width=w;C.height=h;cx.imageSmoothingEnabled=false}
}
configureViewport();
window.addEventListener("resize",configureViewport);
attach();
save=stored();
if(save){if(!save.party.some(p=>p.hp>0)){E.healAll(save);save.active=0}updateAll();setToast("저장된 탐험을 불러왔어. 계속 이동해 보자.")}
else showStarter();
requestAnimationFrame(render);
window.OPENMON_EXPEDITION_DEBUG={getState:()=>save,getBattle:()=>battle,engine:E,begin:id=>startNew(id),move:(dx,dy)=>E.move(save,dx,dy,()=>.5)};
})();