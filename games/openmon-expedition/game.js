(function(){
"use strict";
const DB=window.OPENMON_DEX,E=window.OPENMON_EXPEDITION_ENGINE,B=window.OPENMON_TURN_BATTLE,MD=window.KIDSMON_MOVE_DEX,T=window.KIDSMON_TRAINERS;
if(!DB?.combat||!E||!B||!MD||!T)throw Error("KIDSMON move encyclopedia, trainers or battle engine missing");
const $=id=>document.getElementById(id);
const C=$("worldCanvas"),cx=C.getContext("2d",{alpha:false});
cx.imageSmoothingEnabled=false;
const SAVE_KEY="kidscade.openmon.expedition.save.v1";
let save=null,battle=null,lastDraw=0,lastMove=0,held=null,moveTimer=0,soundOn=true,audio=null,trainerSelection=null;
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
function maxHp(p){return DB.combat.statsAtLevel(p.id,p.level,p).hp}
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
 save=E.createNew(id);B.normalize(save.party[0]);battle=null;$("starterOverlay").hidden=true;
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
 for(const mon of [...save.party,...save.box])B.normalize(mon);
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
 '<span class="member-art" style="filter:'+(p.shiny?'hue-rotate(95deg) saturate(1.7)':'none')+'">'+miniArt(p.id)+'</span><span class="member-info"><b>'+esc(s.name)+(p.shiny?' ✨':'')+' <small>Lv.'+p.level+'</small></b>'+
 '<small>HP '+hpText(p)+'</small><span class="hp-bar"><span class="hp-fill" style="width:'+pct+';background:'+(p.hp/maxHp(p)<.3?"#d97869":"#58ae68")+'"></span></span></span></button>'
 }).join("");
}
function selectTeam(index,fromBattle=false){
 if(!save||index<0||index>=save.party.length)return false;
 const p=save.party[index];
 if(p.hp<=0){setToast("HP가 0인 키즈몬은 먼저 회복해야 해.");return false}
 if(index===save.active)return false;
 save.active=index;beep("click");updateAll();persist();
 setToast(species(p.id).name+"이(가) 선두에 섰어.");
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
 const mon=E.activeCreature(save),st=DB.combat.statsAtLevel(mon.id,mon.level,mon);
 const label={hp:"HP",attack:"공격",defense:"방어",spAttack:"특수공격",spDefense:"특수방어",speed:"속도"};
 const ability=DB.combat.ABILITIES[DB.combat.abilityFor(mon)];
 const profile='<section class="kid-profile"><strong>'+esc(species(mon.id).name)+(mon.shiny?' ✨ 희귀색':'')+' · '+esc(mon.genetics.nature)+' 성격</strong>'+
 '<p>특성: <b>'+esc(ability.name)+'</b> · '+esc(ability.description)+'</p>'+
 '<div class="kid-stat-grid">'+Object.entries(label).map(([k,n])=>'<span>'+n+' <b>'+st[k]+'</b> <small>잠재력 '+mon.genetics.iv[k]+'/15 · 훈련 '+(mon.training?.[k]||0)+'/24</small></span>').join("")+'</div></section>';
 openGeneric("우리 키즈몬",profile+"<p>선두 키즈몬을 바꾸거나 회복약을 사용할 수 있어. 전투 중에는 교체에 한 턴이 필요해.</p>"+
 '<div class="team hud-party-list">'+$("teamList").innerHTML+'</div>'+
 '<div class="action-row"><button type="button" class="act primary" data-hud-action="potion">회복약 사용 ('+save.items.potion+'개)</button>'+
 '<button type="button" class="act" data-hud-action="evolve">진화 확인</button>'+
 '<button type="button" class="act" data-hud-action="skills">기술 관리</button><button type="button" class="act" data-hud-action="stones">진화 결정</button></div>',
 save.party.length+"/6마리 · 선택하면 선두 변경");
}
function openSkills(){
 if(!save)return;
 const own=E.activeCreature(save),known=B.normalize(own),moves=B.moves;
 const options=B.learnable(own);
 const row=known.map((slot,i)=>{
  const m=moves[slot.id];
  const can=options.filter(id=>id!==slot.id&&!known.some((p,k)=>k!==i&&p.id===id));
  return '<div class="shop-item"><div><strong>'+esc(m.name)+(m.familyKey?' <span class="move-signature">전용</span>':'')+'</strong><small>'+esc(DB.types[m.type].name)+' · PP '+slot.pp+'/'+m.pp+
   (m.power?' · 위력 '+m.power:' · 보조 기술')+'</small></div><button type="button" data-skill-slot="'+i+'">교체</button></div>'
 }).join("");
 openGeneric("기술 관리",'<p>한 번에 네 기술을 사용해. 레벨이 오르면 배울 수 있는 기술이 늘어나고, 기술의 PP는 연구소에서 회복할 수 있어.</p>'+
 '<div class="shop-list">'+row+'</div>'+
 '<p class="signature-caption">이 계열은 '+esc(species(own.id).familyName)+'에 속해. 진화하거나 레벨이 오르면 새로운 전용 기술이 열려.</p>'+
 '<p>현재 배울 수 있는 기술: '+options.map(id=>esc(moves[id].name)).join(" · ")+'</p>'+
 '<div class="action-row"><button type="button" class="act" data-hud-action="moveDex">기술 도감 살펴보기</button></div>');
}
function showLearnSkills(slotIndex){
 const p=E.activeCreature(save),options=B.learnable(p);
 const known=B.normalize(p);
 openGeneric("기술 교체",'<p>새 기술을 배우면 선택한 기술과 교체돼. 이미 사용한 PP는 새 기술의 최대치로 시작해.</p>'+
 '<div class="shop-list">'+options.filter(id=>!known.some((p,i)=>i!==slotIndex&&p.id===id)).map(id=>{
  const m=B.moves[id],chosen=known[slotIndex].id===id;
  return '<div class="shop-item"><div><strong>'+esc(m.name)+'</strong><small>'+esc(DB.types[m.type].name)+' · 위력 '+m.power+
   ' · PP '+m.pp+'</small></div><button type="button" data-learn="'+id+'" data-slot="'+slotIndex+'" '+(chosen?'disabled':'')+'>'+(chosen?'배운 기술':'배우기')+'</button></div>'
 }).join("")+'</div>');
}
function openBag(){
 if(!save)return;
 openGeneric("탐험 가방","<div class='shop-list'>"+
 '<div class="shop-item"><div><strong>키즈볼</strong><small>야생 키즈몬을 포획할 때 사용 · 전투 중에 던질 수 있어</small></div><strong>'+save.items.ball+'개</strong></div>'+
 '<div class="shop-item"><div><strong>회복약</strong><small>선두 키즈몬 HP 20 회복</small></div><button type="button" data-hud-action="potion" '+(save.items.potion===0?"disabled":"")+'>사용 · '+save.items.potion+'개</button></div>'+
 Object.entries(E.STONES).map(([k,stone])=>'<div class="shop-item"><div><strong>'+stone.name+'</strong><small>연구 진화 결정</small></div><strong>'+(save.items[k]||0)+'개</strong></div>').join("")+
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
 '<div class="equipment"><span>진행 걸음 수</span><b>'+save.steps+'걸음</b></div></div>'+
 '<div class="action-row"><button type="button" class="act primary" data-hud-action="regions">지역 지도 · 서식지</button></div>',
 "연구 진행 "+(save.wins+save.catches)+" · 새 야생 종 해금: 3·7·12 기록");
}
function openMenu(){
 if(!save)return;
 openGeneric("키즈몬 메뉴",'<div class="shop-list">'+
 '<div class="shop-item"><div><strong>소리</strong><small>효과음 켜기·끄기</small></div><button type="button" data-hud-action="audio">'+(soundOn?"끄기":"켜기")+'</button></div>'+
 '<div class="shop-item"><div><strong>자동 저장</strong><small>이 기기에서 진행 기록을 이어할 수 있어</small></div><strong>'+($("saveInfo").textContent==="!"?"저장 실패":"저장됨")+'</strong></div>'+
 '<div class="shop-item"><div><strong>지역 지도·서식지</strong><small>발견한 마을 사이 빠른 이동과 출현 키즈몬 보기</small></div><button type="button" data-hud-action="regions">지도 열기</button></div>'+
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
 else if(tab==="regions")openRegions();
 else if(tab==="menu")openMenu();
}
function openRegions(){
 if(!save||battle)return;
 const visited=new Set(save.flags?.visitedZones||["town"]),places=E.visitedVillages(save);
 const rows=E.ZONES.map(zone=>{
  const known=visited.has(zone.key),habitat=DB.habitats?.[zone.key],cfg=DB.encounters[zone.key];
  const pool=cfg?E.unlockedPool(zone.key,save):[];
  const found=known?pool.slice(0,12).map(id=>species(id)?.name).filter(Boolean).join(" · "):
   "미발견 · 지역에 도착하면 목록을 확인할 수 있어";
  const village=E.VILLAGES.find(v=>v.key===zone.key);
  const reachable=village&&places.some(v=>v.key===zone.key);
  return '<div class="shop-item region-card"><div><strong>'+(known?'● ':'○ ')+esc(zone.name)+'</strong>'+
   '<small>'+esc(zone.theme||"")+(cfg?' · Lv.'+cfg.level.join("~"):' · 안전한 마을')+'</small>'+
   '<small>'+esc(zone.hint||"")+'</small>'+
   (cfg?'<small>야생: '+esc(found)+(known&&pool.length>12?' 외 '+(pool.length-12)+'종':'')+'</small>':'')+
   (habitat?'<small>연구 주제: '+esc(habitat.subject)+'</small>':'')+
   (cfg?'<small>지역 조사: '+(save.regionResearch?.[zone.key]?.seen?.length||0)+'/3종'+
    (save.regionResearch?.[zone.key]?.rewarded?' · 연구 완료':
     ' · 보상 '+(E.HABITAT_REWARDS[zone.key]?.name||"연구 보상"))+'</small>':'')+'</div>'+
   (village?'<button type="button" data-travel="'+zone.key+'" '+(!reachable?'disabled':'')+
   '>'+(reachable?'빠른 이동':'미발견')+'</button>':'')+'</div>';
 }).join("");
 openGeneric("키즈몬 세계 지도 · 지역 도감",
 '<p>마을은 안전하고 초원·숲·동굴 등에서는 지역 특유의 키즈몬을 만날 수 있어. 연구가 진행되면 더 많은 종이 출현해.</p>'+
 '<p>발견한 마을 사이에서는 빠르게 이동할 수 있어. 아직 방문하지 않은 마을은 걸어서 찾아가야 해.</p>'+
 '<div class="shop-list">'+rows+'</div>');
}
function talkNewVillage(village){
 openGeneric(village.name+" · "+village.npc,
 '<p>'+esc(E.ZONES.find(z=>z.key===village.key)?.hint||"")+'</p>'+
 '<p>오늘의 탐구: <strong>'+esc(village.lesson)+'</strong>. 주변의 관련 키즈몬을 찾아 기술과 특성을 비교해 보자.</p>'+
 '<div class="action-row"><button type="button" class="act primary" data-village-heal="1">HP·PP 무료 회복</button>'+
 '<button type="button" class="act" data-hud-action="regions">세계 지도·빠른 이동</button></div>');
}
function closeGeneric(){$("genericOverlay").classList.add("hidden")}
function talk(){
 if(!save||battle||!$("genericOverlay").classList.contains("hidden"))return;
 const x=save.pos.x,y=save.pos.y;
 const village=E.VILLAGES.find(v=>v.key!=="town"&&Math.abs(x-v.npcX)+Math.abs(y-v.npcY)<=2);
 if(village){talkNewVillage(village);return}
 if(Math.abs(x-9)+Math.abs(y-10)<=2){openClinic();return}
 if(Math.abs(x-13)+Math.abs(y-10)<=2){
  openGeneric("수학 연구원",'<p>야생 키즈몬의 남은 체력과 기술의 피해량을 비교해 봐. 세 마리의 동료가 모였다면 트레이너 배틀에도 도전해 봐!</p>'+
   '<div class="action-row"><button class="modal-action" id="researchDex">도감 열기</button>'+
   '<button type="button" class="act" data-hud-action="trainers">3대3 도전</button></div>');
  $("researchDex").onclick=()=>{closeGeneric();openDex()};return
 }
 if(E.terrain(x,y)==="clearing"||Math.abs(x-56)+Math.abs(y-7)<=1){
  setToast("이 숲에서는 분기견이 발견되었다고 해. 풀숲을 살펴봐!");return
 }
 const zone=E.ZONES.find(z=>z.key===E.zoneAt(x));
 setToast(zone?.hint||"주변의 특별한 땅을 조사해 야생 키즈몬을 찾아봐!");
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
 Object.entries(E.STONES).map(([k,stone])=>'<div class="shop-item"><div><strong>'+stone.name+' +1</strong><small>연구코인 120 · 진화 재료</small></div><button data-buy="'+k+'">120코인</button></div>').join("")+
  '<div class="shop-item"><div><strong>트레이너 연구 대회</strong><small>세 마리의 키즈몬 · 상성에 따라 교체하는 전략 AI</small></div>'+
  '<button type="button" data-hud-action="trainers">3대3 도전</button></div>'+
  '<div class="shop-item"><div><strong>키즈몬 보관함</strong><small>보관 중 '+save.box.length+'마리 · 선두 키즈몬과 교체 가능</small></div><button data-hud-action="box">열기</button></div>'+gift+'</div>');
}
function openTrainers(){
 if(!save||battle)return;
 const slots=T.eligibleSlots(save),ready=slots.length===3;
 const cards=T.TRAINERS.map(config=>{
  const t=T.preview(save,config.id),can=T.available(save,config.id);
  const typeNames=t.party.map(m=>esc(species(m.id).name)+" ("+esc(DB.types[m.type].name)+")").join(" · ");
  const record=save.trainerWins?.[t.id]||0;
  return '<div class="shop-item"><div><strong>'+esc(t.name)+' · '+esc(t.title)+'</strong>'+
   '<small>'+typeNames+'</small><small>'+esc(t.lesson)+'</small>'+
   '<small>필요 야생 승리 '+t.requiredWins+'회 · 도전 성공 '+record+'회</small></div>'+
   '<button type="button" data-trainer="'+t.id+'" '+(can?'':'disabled')+'>'+(can?'대결 시작':!ready?'3마리 필요':'잠김')+'</button></div>';
 }).join("");
 openGeneric("연구원 3대3 배틀",'<p>연구원을 선택한 다음, 파티에서 원하는 세 마리를 골라 출전해. 싸우기·교체·회복약을 사용할 수 있고 키즈볼과 도망은 사용할 수 없어.</p>'+
  '<p>준비한 키즈몬 '+slots.length+'/3 · 상대 연구원은 불리한 상성이 되면 키즈몬을 교체할 수 있어.</p>'+
  '<div class="shop-list">'+cards+'</div><p>승리하면 세 마리가 함께 경험치를 얻고 첫 클리어 보너스를 받아.</p>');
}
function openTrainerSelection(id){
 if(!save||battle||!T.available(save,id))return;
 trainerSelection={id,slots:T.eligibleSlots(save)};
 renderTrainerSelection();
}
function renderTrainerSelection(){
 if(!save||!trainerSelection)return;
 const config=T.TRAINERS.find(x=>x.id===trainerSelection.id);
 if(!config)return;
 const chosen=trainerSelection.slots;
 const cards=save.party.map((p,i)=>{
  const selected=chosen.includes(i);
  return '<div class="shop-item">'+miniArt(p.id)+'<div><strong>'+esc(species(p.id).name)+
   ' · Lv.'+p.level+'</strong><small>'+esc(DB.types[species(p.id).type].name)+' 속성 · HP '+hpText(p)+'</small></div>'+
   '<button type="button" data-trainer-slot="'+i+'" aria-pressed="'+selected+'" '+
    (p.hp<=0?'disabled':'')+'>'+(selected?'✓ 출전':'선택')+'</button></div>';
 }).join("");
 openGeneric(config.name+" · 출전 팀 선발",
  '<p>총 3마리를 선택해. 유리한 속성의 키즈몬을 섞으면 더 쉽게 싸울 수 있어.</p>'+
  '<p><strong>선발 '+chosen.length+'/3</strong> · 상대: '+config.species.map(id=>esc(species(id).name)).join(' · ')+'</p>'+
  '<div class="shop-list">'+cards+'</div>'+
  '<div class="action-row"><button class="act primary" type="button" data-trainer-start="'+config.id+'" '+
   (T.validateSelection(save,chosen)?'':'disabled')+'>이 팀으로 도전!</button>'+
  '<button class="act" type="button" data-hud-action="trainers">연구원 다시 선택</button></div>');
}
function enterTrainer(id,selectedSlots=null){
 if(!save||battle)return false;
 const trainer=T.makeTrainer(save,id,Math.random,selectedSlots);
 if(!trainer){setToast("세 마리의 건강한 키즈몬과 도전 조건을 확인해 줘.");return false}
 if(!trainer.playerSlots.includes(save.active))save.active=trainer.playerSlots[0];
 for(const p of trainer.party)B.normalize(p);
 const foe=trainer.party[trainer.active];
 battle={foe,trainer,zone:"town",special:false,firstRoad:false,turn:1,
  done:false,menu:"root",turnState:B.state(),
  message:trainer.name+"이(가) 대결을 신청했어! 세 마리를 모두 쓰러뜨리면 승리야.\n"+
   trainer.lesson};
 $("battleOverlay").classList.remove("hidden");
 $("battleActionPanel").classList.remove("hidden");
 $("battleAfter").classList.add("hidden");
 trainerSelection=null;
 closeGeneric();renderBattle();persist();return true;
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
 if(item==="heal"){E.healAll(save);for(const mon of save.party)B.restorePP(mon);setToast("HP와 기술 PP를 모두 회복했어!");beep("win")}
 else {const cost=item==="ball"?35:item==="potion"?25:E.STONES[item]?120:Infinity;
  if(save.coins<cost){setToast("연구코인이 부족해! 야생 전투로 모아 보자.");beep("fail");return}
  save.coins-=cost;save.items[item]++;setToast("물품을 구매했어!");beep("capture");
 }
 updateAll();persist();openClinic();
}
function dexTabs(selected){
 return '<nav class="dex-tabs" aria-label="도감 종류">'+
  '<button type="button" data-dex-tab="monsters" role="tab" aria-selected="'+(selected==="monsters")+'" class="'+(selected==="monsters"?"active":"")+'">키즈몬 도감 · '+DB.species.length+'</button>'+
  '<button type="button" data-dex-tab="moves" role="tab" aria-selected="'+(selected==="moves")+'" class="'+(selected==="moves"?"active":"")+'">기술 도감 · '+MD.all.length+'</button></nav>';
}
const moveDexUi={query:"",type:"all",category:"all",family:"all",owner:"all",selectedId:null,expanded:false,limit:36};
function moveDexOwner(){
 if(!save||!moveDexUi.owner.startsWith("party:"))return null;
 return save.party[Number(moveDexUi.owner.slice(6))]||null;
}
function moveDexEntries(){
 return MD.search({query:moveDexUi.query,type:moveDexUi.type,category:moveDexUi.category,family:moveDexUi.family,owner:moveDexOwner()});
}
function ownedSkillSet(){
 const known=new Set();
 if(save)for(const mon of [...save.party,...save.box])for(const skill of mon.moveSlots||[])known.add(skill.id);
 return known;
}
function renderMoveDexList(){
 const target=$("moveDexList");if(!target)return;
 const results=moveDexEntries(),owned=ownedSkillSet();
 if(moveDexUi.selectedId&&!results.some(m=>m.id===moveDexUi.selectedId)){
  moveDexUi.selectedId=null;moveDexUi.expanded=false;
 }
 $("moveResultCount").textContent="검색 결과 "+results.length+"개 · 전체 "+MD.all.length+"개";
 target.innerHTML=results.length?results.slice(0,moveDexUi.limit).map(m=>{
  const chosen=m.id===moveDexUi.selectedId;
  return '<button type="button" class="move-card type-'+m.type+(m.familyKey?' move-card-special':'')+(chosen?' is-selected':'')+
   '" data-move="'+m.id+'" aria-pressed="'+chosen+'">'+
   '<span class="move-type-symbol" aria-hidden="true">'+esc(m.symbol)+'</span>'+
   '<span class="move-card-content"><span class="move-card-title">'+esc(m.name)+(owned.has(m.id)?' <span title="보유 기술">✓</span>':'')+'</span>'+
   (m.familyKey?'<span class="move-stage-label">'+esc(m.tierLabel)+'</span>':'')+
   '<span class="move-card-metrics">'+esc(m.typeName)+' · '+esc(m.categoryName)+' · PP '+m.pp+'</span>'+
   '<span class="move-card-desc">'+esc(m.summary)+'</span></span></button>';
 }).join("")+(results.length>moveDexUi.limit?'<button type="button" class="move-expand" data-move-next>다음 '+Math.min(36,results.length-moveDexUi.limit)+'개 기술 더 보기</button>':''):'<p class="move-empty">조건에 맞는 기술이 없어. 검색어나 필터를 변경해 봐.</p>';
 renderMoveDexDetail();
}
function renderMoveDexDetail(){
 const panel=$("moveDexDetail");if(!panel)return;
 const entry=MD.detail(moveDexUi.selectedId);
 if(!entry){panel.className="move-detail move-detail-hint";panel.innerHTML='<p>기술 카드를 누르면 효과와 배우는 키즈몬을 볼 수 있어.</p>';return}
 const learners=MD.learners(entry.id),visible=moveDexUi.expanded?learners:learners.slice(0,12);
 const owned=new Set([...save.party,...save.box].map(x=>x.id));
 panel.className="move-detail type-"+entry.type;
 panel.innerHTML='<div class="move-detail-heading"><div class="move-detail-title">'+
  '<span class="move-type-symbol" aria-hidden="true">'+esc(entry.symbol)+'</span><h3>'+esc(entry.name)+'</h3></div>'+
  '<span class="move-detail-kind">'+esc(entry.typeName)+' · '+esc(entry.categoryName)+'</span>'+
  (entry.familyKey?'<span class="move-signature">'+esc(entry.tierLabel)+'</span>':'')+
  '<button type="button" data-move-close aria-label="기술 상세 닫기" class="move-detail-close">닫기 ×</button></div>'+
  '<div class="move-detail-metrics">'+[
   ["위력",entry.power||"—"],["명중률",entry.accuracy+"%"],["PP",entry.pp],["선공",entry.priority?"+"+entry.priority:"보통"]
  ].map(([label,val])=>'<span>'+esc(label)+'<b>'+esc(String(val))+'</b></span>').join("")+'</div>'+
  (entry.familyName?'<p class="signature-caption">'+esc(entry.familyName)+' · '+esc(entry.tierLabel)+'</p>':'')+
  '<p class="move-detail-explanation">'+esc(entry.description)+'</p>'+
  '<div class="move-detail-learners"><strong>배울 수 있는 키즈몬 · '+learners.length+'개 형태</strong>'+
  '<small>기술을 배우는 최초 레벨 기준 · ✓는 현재 파티·보관함에 있는 키즈몬</small>'+
  '<div class="move-learner-list">'+visible.map(mon=>
    '<span class="move-learner'+(owned.has(mon.id)?' owned':'')+'"><b>'+
    (owned.has(mon.id)?"✓ ":"")+esc(mon.name)+'</b><small>Lv.'+mon.level+'부터</small></span>').join("")+
  '</div>'+(learners.length>12?'<button type="button" class="move-expand" data-move-more="'+
    entry.id+'">'+(moveDexUi.expanded?'접기':'나머지 '+(learners.length-12)+'종 더 보기')+'</button>':'')+'</div>';
}
function openMoveDex(selectedId=null){
 if(!save)return;
 if(selectedId&&MD.detail(selectedId)){moveDexUi.selectedId=selectedId;moveDexUi.expanded=false;
  moveDexUi.query="";moveDexUi.type="all";moveDexUi.category="all";moveDexUi.family="all";moveDexUi.owner="all";moveDexUi.limit=36}
 const known=ownedSkillSet();
 const typeOptions='<option value="all">모든 타입</option>'+MD.TYPE_ORDER.map(t=>
   '<option value="'+t+'" '+(moveDexUi.type===t?'selected':'')+'>'+esc(DB.types[t].name)+'</option>').join("");
 const categoryOptions='<option value="all">모든 효과</option>'+Object.entries(MD.CATEGORY_NAMES).map(([id,name])=>
   '<option value="'+id+'" '+(moveDexUi.category===id?'selected':'')+'>'+esc(name)+'</option>').join("");
 const familyOptions='<option value="all">전체 기술</option>'+
  '<option value="signature" '+(moveDexUi.family==="signature"?'selected':'')+'>계열 전용·진화 기술</option>'+
  '<option value="common" '+(moveDexUi.family==="common"?'selected':'')+'>공통 기술</option>';
 const partyOptions='<option value="all">전체 키즈몬</option>'+save.party.map((p,i)=>
   '<option value="party:'+i+'" '+(moveDexUi.owner==="party:"+i?'selected':'')+'>'+esc(species(p.id).name)+' Lv.'+p.level+'</option>').join("");
 openGeneric("기술 도감 · "+MD.all.length+"개",
  dexTabs("moves")+
  '<p class="move-dex-intro">실제 전투에서 사용하는 기술을 모았어. 이름·타입·효과·배울 수 있는 키즈몬을 확인해 보자.</p>'+
  '<div class="move-dex-stats"><span><strong>'+MD.all.length+'</strong> 전체 기술</span>'+
  '<span><strong>'+known.size+'</strong> 보유 기술</span><span><strong>'+MD.TYPE_ORDER.length+'</strong> 타입</span></div>'+
  '<div class="move-dex-filters"><label class="move-search">기술 또는 키즈몬 이름 검색'+
  '<input id="moveDexSearch" type="search" autocomplete="off" placeholder="예: 광합성, 피보새, 둔화" value="'+esc(moveDexUi.query)+'"></label>'+
  '<label>타입<select id="moveDexType">'+typeOptions+'</select></label>'+
  '<label>효과<select id="moveDexCategory">'+categoryOptions+'</select></label>'+
  '<label style="grid-column:1/-1">전용 기술<select id="moveDexFamily">'+familyOptions+'</select></label>'+
  '<label style="grid-column:1/-1">배우는 키즈몬<select id="moveDexOwner">'+partyOptions+'</select></label></div>'+
  '<div id="moveResultCount" class="move-result-count"></div>'+
  '<section id="moveDexDetail" class="move-detail" aria-label="선택한 기술 상세 정보"></section>'+
  '<div id="moveDexList" class="move-dex-list" aria-label="기술 목록"></div>',
  "전투에 등록된 실제 기술 · 모든 기술 공개");
 renderMoveDexList();
}
function openDex(){
 if(!save)return;
 const seenCount=Object.keys(save.seen).filter(id=>species(id)?.playable).length;
 const got=Object.keys(save.collection).filter(id=>species(id)?.playable).length;
 openGeneric("탐험 도감 · "+got+"/"+DB.species.length,
  dexTabs("monsters")+
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
 if(result.zone!==old){
  const place=E.ZONES.find(z=>z.key===result.zone);
  setToast((place?.name||"새 지역")+"에 도착! "+(place?.theme||"")+
    (result.welcome?" · 새 마을 발견 보상 키즈볼 2개!":""));
 }
 if(result.encounter){
   beep("click");
   enterBattle(result.encounter,result.zone,!!(result.encounter.id==="shibu_r00_c00"),!!result.firstRoad);
   if(result.regionalReward&&battle){
    battle.message+="\n지역 조사 완료! 새로운 3종 발견 · "+result.regionalReward.name+" 획득!";
    renderBattle();
   }
 }
 if(save.steps%5===0)persist();
 updateAll();
}
function leaveBattle(){
 battle=null;$("battleOverlay").classList.add("hidden");persist();updateAll();
}
function enterBattle(enemy,zone,special=false,firstRoad=false){
 const lead=E.activeCreature(save);
 if(!lead||lead.hp<=0){E.healAll(save);save.active=0;for(const p of save.party)B.restorePP(p);setToast("연구소로 돌아와 HP를 회복했어.");return}
 B.normalize(lead);B.normalize(enemy);
 battle={foe:enemy,zone,special,firstRoad,turn:1,done:false,menu:"root",turnState:B.state(),
  message:firstRoad?"첫 번째 키즈몬, "+species(enemy.id).name+"을(를) 만났어! 싸우기에서 기술을 골라 HP를 낮추고 키즈볼을 던져 보자!":
   "야생 "+species(enemy.id).name+" 등장! 기술의 PP·상성·행동 순서를 생각하며 싸워보자."};
 save.seen[enemy.id]=true;save.grassSteps=0;
 $("battleOverlay").classList.remove("hidden");
 $("battleActionPanel").classList.remove("hidden");$("battleAfter").classList.add("hidden");
 renderBattle();persist();
}
function appendBattle(message){if(battle)battle.message=message}
function hitEstimate(moveId){
 if(!battle)return "";
 const own=E.activeCreature(save),move=B.moves[moveId];
 if(!own||!move)return "";
 if(!move.power)return "변화 기술";
 const foe=battle.foe;
 const damage=DB.combat.damage({attacker:own.id,defender:foe.id,attackerLevel:own.level,
  defenderLevel:foe.level,power:move.power,moveType:move.type,damageClass:move.damageClass,
   attackerMon:own,defenderMon:foe});
 return "예상 "+Math.max(1,Math.floor(damage*.62))+" 피해";
}
function catchEstimate(){
 const f=battle.foe;
 return Math.round(DB.combat.captureChance({target:f.id,level:f.level,hp:f.hp,maxHp:maxHp(f),
  status:!!battle.turnState?.foe?.condition})*100)+"% 확률";
}
function renderBattle(){
 if(!battle)return;
 const foe=battle.foe,own=E.activeCreature(save),a=species(own.id),b=species(foe.id);
 const maxOwn=maxHp(own),maxFoe=maxHp(foe),side=battle.turnState;
 $("ownName").textContent=a.name+(own.shiny?" ✨":"")+" Lv."+own.level;
 $("foeName").textContent=b.name+(foe.shiny?" ✨":"")+" Lv."+foe.level;
 $("ownHpLabel").textContent=own.hp+"/"+maxOwn;
 $("foeHpLabel").textContent=foe.hp+"/"+maxFoe;
 $("ownHpBar").style.width=barPct(own.hp,maxOwn);
 $("foeHpBar").style.width=barPct(foe.hp,maxFoe);
 $("ownHpBar").style.background=own.hp/maxOwn<.3?"#d86b5d":"#58ae68";
 $("foeHpBar").style.background=foe.hp/maxFoe<.3?"#d86b5d":"#58ae68";
 const stateText=(v)=>!v?"":v.stunPending?"감전 · 행동 불가":v.trapTurns>0?"속박":v.counter?"반격 대기":v.condition?({burn:"화상",slow:"둔화",weaken:"약화"}[v.condition]||v.condition):
  v.shield?"방어막":v.attack>0?"공격↑":v.speed>0?"속도↑":"";
 $("ownStatus").textContent=stateText(side.player);
 $("foeStatus").textContent=stateText(side.foe);
 $("ownArt").innerHTML=artHtml(own.id);
  $("ownArt").style.filter=own.shiny?"hue-rotate(95deg) saturate(1.7)":"none";
 $("foeArt").innerHTML=artHtml(foe.id);
  $("foeArt").style.filter=foe.shiny?"hue-rotate(95deg) saturate(1.7)":"none";
 const trainer=battle.trainer;
 $("battleOverlay").querySelector(".modal-head h2").textContent=trainer?"트레이너 3대3 대결":"야생 키즈몬 등장!";
 $("battleZone").textContent=trainer?trainer.name:(E.ZONES.find(z=>z.key===battle.zone)?.name||"비밀숲");
 const roster=$("trainerRoster");
 roster.hidden=!trainer;
 if(trainer){
  const columns=[
   {name:"내 팀",members:trainer.playerSlots.map(i=>save.party[i]),current:save.active,ids:trainer.playerSlots},
   {name:trainer.name,members:trainer.party,current:trainer.active,ids:[0,1,2]}
  ];
  roster.innerHTML=columns.map(col=>
   '<div class="trainer-roster-group"><strong>'+esc(col.name)+'</strong><div class="trainer-pips">'+
   col.members.map((m,i)=>'<span class="trainer-pip '+(m.hp<=0?'fainted':col.ids[i]===col.current?'active':'')+'">'+
    esc(species(m.id).name)+' '+(m.hp>0?'●':'×')+'</span>').join("")+
   '</div></div>').join("");
 }
 const bg=["cave","powerPlant"].includes(battle.zone)?"Cave_Back.png":"Forest_Background.png";
 const tone=battle.zone==="snowfield"?"#d2eafa70":battle.zone==="tidal"?"#67b5d547":
 battle.zone==="powerPlant"?"#e9c27340":"#bdd2a725";
 $("battleBackdrop").style.backgroundImage="linear-gradient(#ffffff15,"+tone+"),url('"+ASSET+"more%20assets/"+bg+"')";
 $("battleTurn").textContent=battle.turn+"턴"+(battle.trainer?" · "+battle.trainer.party.filter(m=>m.hp>0).length+"/3 남음":"");
 $("battleLog").textContent=battle.message;
 if(battle.done){$("battleActionPanel").classList.add("hidden");$("battleAfter").classList.remove("hidden");return}
 $("battleAfter").classList.add("hidden");
 $("battleActionPanel").classList.remove("hidden");
 const button=(act,title,detail,cls="",disabled=false)=>
  '<button type="button" data-action="'+act+'" class="'+cls+'" '+(disabled?'disabled':'')+'><b>'+esc(title)+'</b><small>'+esc(detail)+'</small></button>';
 let html="";
 if(battle.menu==="fight"){
  $("battlePrompt").textContent="어떤 기술을 쓸까?";
  $("battleHint").textContent="PP는 연구소에서 회복";
  const moves=B.normalize(own);
  html=moves.map(slot=>{
   const m=B.moves[slot.id];
   const detail=DB.types[m.type].name+" · "+(m.power?(DB.combat.SPECIAL_TYPES.has(m.type)?"특수 ":"물리 ")+hitEstimate(slot.id):m.kind==="counter"?"반격 자세":"보조 효과")+
    " · PP "+slot.pp+"/"+m.pp;
   return button("move:"+slot.id,m.name,detail,"strong",slot.pp<=0);
  }).join("")+(battle.trainer?"":button("soft","살살 공격","포획용 · HP 1 남김","utility"))+
   button("back","← 돌아가기","행동 선택으로","menu-back");
 }else if(battle.menu==="bag"){
  $("battlePrompt").textContent="가방과 다른 행동";
  $("battleHint").textContent="아이템은 내 턴 사용";
  html=button("potion","회복약","HP +20 · "+save.items.potion+"개","utility",
       save.items.potion<=0||own.hp>=maxOwn)+
   (battle.trainer?"":button("run","도망가기","전투를 빠져나가기"))+
   button("back","← 돌아가기","행동 선택으로","menu-back");
 }else{
  $("battlePrompt").textContent="무엇을 할까?";
  $("battleHint").textContent="속도 순서에 따라 행동";
  html=button("fight","싸우기","기술 네 가지와 PP","strong")+
   (battle.trainer?button("switch","키즈몬 교체","세 명의 참가자 중 선택","utility",
     battle.trainer.playerSlots.filter(i=>save.party[i].hp>0).length<2||side.player.trapTurns>0):
    button("ball","키즈볼 던지기",catchEstimate()+" · "+save.items.ball+"개","utility",save.items.ball<=0))+
   button("bag","가방",battle.trainer?"회복약":"회복약 · 도망가기")+
   (battle.trainer?button("tips","전술 힌트","상성과 교체 규칙 확인"):
    button("switch","키즈몬 교체","다른 동료 출전","",save.party.filter(x=>x.hp>0).length<2));
 }
 $("battleButtons").innerHTML=html;
}
function endFight(message,kind="win"){
 if(!battle)return;
 battle.done=true;appendBattle(message);beep(kind);renderBattle();updateAll();persist();
}
let pendingEvolution=false;
function battleAction(action){
 if(!battle||battle.done)return;
 if(action==="fight"||action==="bag"){battle.menu=action;renderBattle();return}
 if(action==="back"){battle.menu="root";renderBattle();return}
 if(action==="switch"){showSwap();return}
 if(action==="tips"&&battle.trainer){appendBattle(battle.trainer.lesson+"\n싸우기: 공격 · 교체: 다른 속성으로 대응 · 회복약: HP +20\n서로의 키즈몬 세 마리를 모두 쓰러뜨리면 승리!");renderBattle();return}
 const choice=action.startsWith("move:")?{type:"move",id:action.slice(5)}:
  action==="soft"?{type:"soft"}:
  action==="ball"?{type:"ball"}:
  action==="potion"?{type:"potion"}:
  action==="run"?{type:"run"}:null;
 if(choice)resolveBattleTurn(choice);
}
function resolveBattleTurn(choice){
 if(!battle||battle.done)return;
 const foe=battle.foe,own=E.activeCreature(save),foeName=species(foe.id).name;
 const rookieCap=!battle.trainer&&battle.zone==="meadow"&&save.encounters<=4?
  Math.max(3,Math.floor(maxHp(own)*.15)):0;
 const res=B.resolve({save,foe,battle,action:choice,random:Math.random,
  rookieCap});
 if(!res.ok){
  appendBattle(res.reason==="pp"?"이 기술은 PP가 부족해! 다른 기술을 선택해.":res.reason==="trapped"?"속박 상태에서는 교체할 수 없어.":"지금은 사용할 수 없어.");
  renderBattle();return;
 }
 appendBattle(res.events.join("\n"));
 battle.menu="root";
 if(res.captured){
  const destination=E.addCaptured(save,foe);
  if(foe.id==="shibu_r00_c00")save.flags.shibuCaught=true;
  announce("monster_caught",{id:foe.id,uniqueKey:"caught:"+foe.id,value:1});
  const progress=save.wins+save.catches;
  endFight(foeName+" 포획 성공!\n"+(destination==="party"?"동료로 합류했어.":"보관함으로 이동했어.")+
   ([3,7,12].includes(progress)?"\n연구 기록으로 새로운 야생 키즈몬이 나타나기 시작했어!":""),"capture");
  return;
 }
 if(res.outcome==="won"&&battle.trainer){
  const trainer=battle.trainer;
  const prize=T.reward(save,trainer);
  const newLevels=prize.changes.flatMap(c=>c.events);
  if(newLevels.length)pendingEvolution=true;
  endFight(res.events.join("\n")+"\n"+trainer.name+"에게 승리! 세 마리 모두 쓰러뜨렸어!"+
   "\n참가한 키즈몬 경험치 +"+prize.xpEach+" · 연구코인 +"+prize.coins+
   (prize.first?"\n첫 승리 보너스 획득!":"")+
   (newLevels.length?"\n키즈몬 레벨 업! 파티에서 진화도 확인해 봐.":""),"win");
  return;
 }
 if(res.outcome==="won"){
  const gain=E.levelRewards(save,foe);
  let message=res.events.join("\n")+"\n"+foeName+" 승리! 경험치 +"+gain.earned+" · 코인 +"+gain.coins;
  if(gain.mentorHeal)message+="\n연구원의 응원! HP +"+gain.mentorHeal;
   if(gain.training)message+="\n훈련 성장! "+({hp:"HP",attack:"공격",defense:"방어",spAttack:"특수공격",spDefense:"특수방어",speed:"속도"}[gain.training.stat]||gain.training.stat)+" +"+gain.training.amount;
  if([3,7,12].includes(save.wins+save.catches))message+="\n새로운 야생 키즈몬이 지역에 출현해!";
  if(gain.events.length){
   const own=E.activeCreature(save),newMoves=B.learnable(own).filter(id=>
    !B.learnable({...own,level:Math.max(1,own.level-1)}).includes(id));
   message+="\n레벨 업! Lv."+own.level;
   if(newMoves.length)message+="\n새 기술 해금: "+newMoves.map(id=>B.moves[id].name).join(", ")+" · 파티에서 배우기";
   pendingEvolution=true;
  }
  endFight(message);return;
 }
 if(res.outcome==="lost"){
  E.healAll(save);for(const p of save.party)B.restorePP(p);
  save.active=0;save.pos={...E.START};
  endFight(res.events.join("\n")+(battle.trainer?"\n트레이너 대결에서 졌어.":"")+"\n모두 쓰러져 연구소로 돌아와 HP·PP를 회복했어.","fail");return;
 }
 if(res.outcome==="run"){endFight(res.events.join("\n"),"click");return}
 beep(res.captured?"capture":"hit");
 battle.turn++;renderBattle();updateAll();persist();
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
function openStoneEvolution(){
 if(!save)return;
 const options=E.stoneEvolutionOptions(save);
 const html=options.length?options.map(o=>{
  const stone=E.STONES[o.stone],count=save.items[o.stone]||0;
  return '<div class="shop-item">'+miniArt(o.id)+'<div><strong>'+esc(o.name)+'</strong><small>'+esc(stone.name)+' '+count+'개 · 레벨 10부터</small></div>'+
   '<button type="button" data-stone-evolve="'+o.id+'" data-stone="'+o.stone+'" '+(count<=0?'disabled':'')+'>진화</button></div>';
 }).join(""):'<p>지금은 결정으로 진화할 수 없어. 레벨 10 이상의 진화 가능한 키즈몬을 선택해 봐.</p>';
 openGeneric("연구 진화 결정",'<p>진화 결정으로 레벨 10부터 미리 진화할 수 있어. 진화 기술은 원래 해금 레벨에 배울 수 있어.</p>'+
 '<div class="shop-list">'+html+'</div><p>결정은 연구소에서 구매하거나 연구 승리 보상으로 얻어.</p>');
}
function showSwap(){
 if(!save||!battle)return;
 if(battle.turnState?.player?.trapTurns>0){setToast("속박 상태에서는 교체할 수 없어.");return}
 const selected=battle.trainer?battle.trainer.playerSlots:save.party.map((p,i)=>i);
 openGeneric("교체할 키즈몬",'<p>교체는 먼저 진행되지만 상대에게 공격 기회를 줘. 속박 상태에서는 교체할 수 없어.</p><div class="shop-list">'+
 selected.map(i=>{
  const p=save.party[i];
  return '<div class="shop-item">'+miniArt(p.id)+'<div><strong>'+esc(species(p.id).name)+'</strong><small>Lv.'+p.level+' / HP '+hpText(p)+'</small></div>'+
   '<button type="button" data-swap="'+i+'" '+(i===save.active||p.hp<=0?"disabled":"")+'>선택</button></div>';
 }).join("")+'</div>');
}
function renderTerrain(x,y,sx,sy){
 const t=E.terrain(x,y),area=E.zoneAt(x),seed=(x*73+y*91)%41;
 const base={town:"#94b889",meadow:"#9cc987",forest:"#72aa76",cave:"#818792",
 crystalTown:"#81aaa8",powerPlant:"#a6a08c",harborTown:"#81aeb9",tidal:"#82b7bc",
 snowTown:"#b8c7db",snowfield:"#d3e4ef"};
 cx.fillStyle=base[area];cx.fillRect(sx,sy,16,16);
 if(t==="path"){
  cx.fillStyle=area==="cave"?"#c0b49b":area==="snowfield"||area==="snowTown"?"#d4e3e5":
  area==="harborTown"||area==="tidal"?"#d0d5c3":area==="powerPlant"?"#bcaea1":
  area==="town"?"#d1c0a0":"#d5bc93";cx.fillRect(sx,sy,16,16);
  cx.fillStyle="#fff7d62b";cx.fillRect(sx,sy,16,2);
  cx.fillStyle="#746e5740";cx.fillRect(sx+(seed%7),sy+6,4,1);cx.fillRect(sx+((seed+8)%9),sy+12,4,1);
  if(area==="town"){cx.fillStyle="#f8edce3a";cx.fillRect(sx+1,sy+1,6,4)}
  return;
 }
 if(t==="building"){cx.fillStyle=area==="snowTown"?"#91a6c6":area==="harborTown"?"#b59873":area==="crystalTown"?"#8dbeb9":"#d5bc8c";cx.fillRect(sx,sy,16,16);return}
 if(t==="wall"){
  cx.fillStyle=area==="cave"?"#4c5662":"#477252";cx.fillRect(sx,sy,16,16);
  cx.fillStyle="#ffffff16";cx.fillRect(sx+2,sy+2,12,2);return
 }
 if(t==="charged"){
 cx.fillStyle="#626f70";cx.fillRect(sx,sy,16,16);
 cx.fillStyle="#e9d674";cx.fillRect(sx+2,sy+((seed%3)+3),7,2);
 cx.fillRect(sx+8,sy+7,3,2);cx.fillRect(sx+7,sy+9,7,2);return;
}
if(t==="wetland"){
 cx.fillStyle="#4eaaa5";cx.fillRect(sx,sy,16,16);
 cx.fillStyle="#c0e7c3";cx.fillRect(sx+2,sy+5,10,2);cx.fillRect(sx+6,sy+12,7,1);
 cx.fillStyle="#467c64";cx.fillRect(sx+seed%7,sy+2,2,4);return;
}
if(t==="snow"){
 cx.fillStyle="#d3e7ef";cx.fillRect(sx,sy,16,16);
 cx.fillStyle="#ffffff";cx.fillRect(sx+seed%11,sy+3,4,2);
 cx.fillRect(sx+((seed+6)%10),sy+11,5,2);return;
}
if(t==="water"){
 cx.fillStyle="#438cae";cx.fillRect(sx,sy,16,16);
 cx.fillStyle="#9cd6e3";cx.fillRect(sx+3,sy+4,8,2);cx.fillRect(sx+6,sy+11,7,2);return;
}
if(t==="tower"||t==="conductor"){
 cx.fillStyle="#5a7779";cx.fillRect(sx,sy,16,16);
 cx.fillStyle="#46505c";cx.fillRect(sx+5,sy+2,6,14);cx.fillRect(sx+1,sy+6,14,3);
 cx.fillStyle="#e8d47a";cx.fillRect(sx+7,sy+1,2,3);return;
}
if(t==="iceberg"){
 cx.fillStyle="#aacdda";cx.fillRect(sx,sy,16,16);cx.fillStyle="#eefcff";
 cx.beginPath();cx.moveTo(sx+2,sy+14);cx.lineTo(sx+8,sy+1);cx.lineTo(sx+14,sy+14);cx.fill();return;
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
sign(81,9,"→ 수정마을");
sign(101,9,"→ 발전소");
sign(127,9,"→ 해류항");
sign(146,9,"→ 갯벌");
sign(172,9,"→ 설빛");
sign(193,9,"→ 서리고원");
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
function drawSettlements(camX,camY){
 for(const [key,left,label,roof,walls] of [
  ["crystalTown",89,"수정 연구소","#51797e","#b9dcd3"],
  ["harborTown",135,"해류 탐사소","#387b91","#f2d6a4"],
  ["snowTown",180,"기후 연구소","#667ab6","#e0e9f4"]
 ]){
  const x=(left-camX)*16,y=(5-camY)*16;
  if(x>C.width+8||x+128<0||y>C.height+8||y+80<0)continue;
  cx.fillStyle="#35545e";cx.fillRect(x+1,y+22,125,61);
  cx.fillStyle=walls;cx.fillRect(x+3,y+27,120,54);
  cx.fillStyle=roof;cx.fillRect(x-4,y+13,135,16);cx.fillRect(x+9,y+3,109,12);
  cx.fillStyle="#679ab6";cx.fillRect(x+12,y+39,25,24);cx.fillRect(x+90,y+39,25,24);
  cx.fillStyle="#ecf8f3";cx.fillRect(x+15,y+43,6,14);cx.fillRect(x+94,y+43,6,14);
  cx.fillStyle="#405b65";cx.fillRect(x+54,y+46,23,36);
  cx.fillStyle="#fff3d8";cx.fillRect(x+26,y+16,74,15);
  cx.fillStyle="#294f54";cx.font="bold 9px sans-serif";cx.fillText(label,x+29,y+27);
  if(key==="crystalTown"){
   cx.fillStyle="#92f4e9";cx.fillRect(x+6,y+2,5,8);cx.fillRect(x+117,y+1,5,9);
  }else if(key==="harborTown"){
   cx.fillStyle="#f2ece1";cx.fillRect(x+117,y-6,2,23);
   cx.beginPath();cx.moveTo(x+120,y-5);cx.lineTo(x+136,y+8);cx.lineTo(x+120,y+8);cx.fill();
  }else{
   cx.fillStyle="#fff";cx.fillRect(x+4,y+2,20,4);cx.fillRect(x+90,y+1,29,4);
  }
 }
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
  drawSettlements(camX,camY);
 drawLandmarks(camX,camY);
 if(camX<=13&&camY<=10){drawNpc("회복·상점",imgs.staff,9,10,camX,camY);drawNpc("연구원",imgs.npc,13,10,camX,camY)}
  for(const v of E.VILLAGES.filter(v=>v.key!=="town"))
   drawNpc(v.npc,imgs.staff,v.npcX,v.npcY,camX,camY);
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
   else if(act==="trainers")openTrainers();
   else if(act==="evolve"){closeGeneric();evolveIfReady();}
   else if(act==="stones")openStoneEvolution();
   else if(act==="skills")openSkills();
   else if(act==="moveDex")openMoveDex();
   else if(act==="audio"){$("audioButton").click();openMenu()}
   else if(act==="restart"){closeGeneric();$("newGame").click()}
   else if(act==="exit"){$("exitButton").click()}
   return;
  }
  b=e.target.closest("button[data-team]");
  if(b){const changed=selectTeam(Number(b.dataset.team));if(changed){closeGeneric()}return}
  b=e.target.closest("button[data-skill-slot]");
  if(b){showLearnSkills(Number(b.dataset.skillSlot));return}
  b=e.target.closest("button[data-learn]");
  if(b){
   if(B.changeMove(E.activeCreature(save),b.dataset.learn,Number(b.dataset.slot))){
    persist();setToast("새 기술을 배웠어!");
   }
   openSkills();return;
  }
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
  b=e.target.closest("button[data-stone-evolve]");if(b){
   if(E.useEvolutionStone(save,b.dataset.stoneEvolve,b.dataset.stone)){
    persist();updateAll();beep("win");setToast("결정 진화에 성공했어!");
   }else setToast("진화 조건과 결정 수량을 확인해 봐.");
   openParty();return;
  }
  b=e.target.closest("button[data-trainer]");
  if(b){openTrainerSelection(b.dataset.trainer);return}
  b=e.target.closest("button[data-trainer-slot]");
  if(b&&trainerSelection){
   const index=Number(b.dataset.trainerSlot),selected=trainerSelection.slots;
   if(selected.includes(index))trainerSelection.slots=selected.filter(i=>i!==index);
   else if(save.party[index]?.hp>0&&selected.length<3)trainerSelection.slots=[...selected,index];
   else setToast("세 명이 모두 정해졌어. 다른 친구를 고르려면 먼저 한 명을 해제해.");
   renderTrainerSelection();return;
  }
  b=e.target.closest("button[data-trainer-start]");
  if(b&&trainerSelection&&T.validateSelection(save,trainerSelection.slots)){
   enterTrainer(b.dataset.trainerStart,trainerSelection.slots);return;
  }
  b=e.target.closest("button[data-village-heal]");if(b){
   E.healAll(save);updateAll();persist();beep("win");
   setToast("마을 연구원이 모든 키즈몬의 HP와 PP를 회복해 줬어!");closeGeneric();return;
  }
  b=e.target.closest("button[data-travel]");if(b){
   if(E.fastTravel(save,b.dataset.travel)){
    updateAll();persist();closeGeneric();setToast(E.ZONES.find(z=>z.key===b.dataset.travel).name+"에 도착!");
   }else setToast("아직 발견하지 않은 마을이야. 직접 걸어서 방문해 봐.");return;
  }
  b=e.target.closest("button[data-buy]");if(b){buy(b.dataset.buy);return}
  b=e.target.closest("button[data-swap]");if(b){const choice=Number(b.dataset.swap);closeGeneric();resolveBattleTurn({type:"switch",index:choice});return}
  b=e.target.closest("button[data-dex-tab]");
  if(b){if(b.dataset.dexTab==="moves")openMoveDex();else openDex();return}
  b=e.target.closest("button[data-move]");
  if(b&&MD.detail(b.dataset.move)){
   moveDexUi.selectedId=b.dataset.move;moveDexUi.expanded=false;
   $("moveDexList").querySelectorAll("[data-move]").forEach(card=>{
    const selected=card.dataset.move===moveDexUi.selectedId;
    card.classList.toggle("is-selected",selected);card.setAttribute("aria-pressed",String(selected));
   });
   renderMoveDexDetail();$("moveDexDetail")?.scrollIntoView({behavior:"smooth",block:"nearest"});return;
  }
  b=e.target.closest("button[data-move-close]");
  if(b){moveDexUi.selectedId=null;moveDexUi.expanded=false;renderMoveDexList();return}
  b=e.target.closest("button[data-move-next]");
  if(b){moveDexUi.limit+=36;renderMoveDexList();return}
  b=e.target.closest("button[data-move-more]");
  if(b&&b.dataset.moveMore===moveDexUi.selectedId){moveDexUi.expanded=!moveDexUi.expanded;renderMoveDexDetail();return}
  b=e.target.closest("button[data-dex]");if(b){openDexDetail(b.dataset.dex);return}
  b=e.target.closest("button[data-evolve]");if(b){
    if(E.maybeEvolve(save,b.dataset.evolve)){
      beep("win");
      const newMove=E.activeCreature(save).lastEvolutionTechnique;
      setToast(newMove?"진화 성공! "+B.moves[newMove].name+" 기술도 배웠어!":"진화 성공! 파티의 기술 관리에서 새 기술을 배워 보자.");
      persist();updateAll();
    }
    closeGeneric();return}
 });
 $("genericBody").addEventListener("input",e=>{
  if(e.target.id==="moveDexSearch"){moveDexUi.query=e.target.value;moveDexUi.limit=36;renderMoveDexList()}
 });
 $("genericBody").addEventListener("change",e=>{
  if(e.target.id==="moveDexType")moveDexUi.type=e.target.value;
  else if(e.target.id==="moveDexCategory")moveDexUi.category=e.target.value;
  else if(e.target.id==="moveDexOwner")moveDexUi.owner=e.target.value;
  else if(e.target.id==="moveDexFamily")moveDexUi.family=e.target.value;
  else return;
  moveDexUi.limit=36;renderMoveDexList();
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
if(save){for(const mon of [...save.party,...save.box])B.normalize(mon);if(!save.party.some(p=>p.hp>0)){E.healAll(save);save.active=0}updateAll();setToast("저장된 탐험을 불러왔어. 계속 이동해 보자.")}
else showStarter();
requestAnimationFrame(render);
window.OPENMON_EXPEDITION_DEBUG={getState:()=>save,getBattle:()=>battle,engine:E,begin:id=>startNew(id),move:(dx,dy)=>E.move(save,dx,dy,()=>.5)};
})();