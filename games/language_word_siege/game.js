(function(){
'use strict';

const D=window.WordSiegeData;
if(!D) throw new Error('WordSiegeData missing');
const KS=window.KidscadeStorage||null;

const $=id=>document.getElementById(id);
const canvas=$('game'), ctx=canvas.getContext('2d');
const boardWrap=$('boardWrap'), rackEl=$('rack'), currentWordEl=$('currentWord'), wordMetaEl=$('wordMeta');
const waveBtn=$('waveBtn'), rushBtn=$('rushBtn'), buildBtn=$('buildBtn'), clearBtn=$('clearBtn'), hintBtn=$('hintBtn'), swapBtn=$('swapBtn');
const coreText=$('coreText'), waveText=$('waveText'), inkText=$('inkText'), scoreText=$('scoreText');
const statusBox=$('statusBox'), inspectBox=$('inspectBox'), toastEl=$('toast'), freeWord=$('freeWord');
const startOverlay=$('startOverlay'), dictOverlay=$('dictOverlay'), resultOverlay=$('resultOverlay');
const STORAGE_DISC='kidscade_word_siege_discovered_v1', STORAGE_BEST='kidscade_word_siege_best_v1';
const STORAGE_STAGE='kidscade_word_siege_stage_v1';
// Ordinary lexicon towers also have distinct team colors by their word pattern.
const WORD_STYLE_COLORS={
  volley:'#eab351',pinball:'#ec996e',boomerang:'#65c8b8',snowball:'#84bddf',
  shootingstars:'#b794ed',spring:'#90c874',rainbow:'#9984ec',
  splat:'#eaa46a',firework:'#e985bd',snap:'#96b46b',
  echo:'#83b7de',hailstorm:'#90cbe2',ricochet:'#dfab63',
  rail:'#dc8f7e',shotgun:'#bd8b5e'
};
// Familiar starter words remain useful when players invest in them.
const FOUNDATION_WORDS=new Set(['ARROW','BOOK','FIRE','ICE','APPLE','BOMB','BALL','COW']);
const RUSH_DURATION=9,RUSH_COOLDOWN=24,RUSH_LIMIT=2;
function rushCost(){return 24+Math.min(24,state.wave*3)}
const FOCUS_TIPS={
  normal:'ARROW로 시작하고 ICE나 FIRE를 더해 보세요.',
  fast:'ICE·FREEZE로 빠른 적을 늦추고 ARROW로 마무리하세요.',
  armored:'SPEAR·RAILGUN·ACID로 장갑을 돌파하세요.',
  heavy:'RAILGUN·ACID·ICE가 중장갑 적에게 효과적입니다.',
  split:'BOMB·SHOTGUN처럼 여러 적을 공격하는 타워를 준비하세요.',
  regen:'POISON·VIRUS로 적의 재생을 막으세요.',
  shield:'HAMMER·SPIKE·ACID로 보호막을 먼저 무너뜨리세요.',
  swarm:'SHOTGUN·FIREBALL·GRENADE로 밀집한 적을 처리하세요.',
  mixed:'ICE·ACID·광역 타워를 함께 배치해 역할을 나누세요.',
  carnival:'BUBBLE·BOUNCE·MUSIC로 빠른 분열 적들을 재미있게 막아 보세요.',
  fortress:'RAILGUN·ACID·HAMMER로 강철 보호막을 깨세요.',
  phantom:'POISON·VIRUS·FREEZE로 재생·속도 혼합 행진을 저지하세요.',
  cascade:'SHOTGUN·FIREBALL·BOOMERANG의 다중 공격이 핵심입니다.',
  tempest:'ICE·MAGNET과 관통 타워를 함께 사용하세요.',
  goldrush:'MINER·DRILL로 자원을 확보하고 WORD RUSH로 반격하세요.',
  duet:'빠른 적과 무거운 적의 출현 박자에 맞춰 역할을 나누세요.',
  echo:'다섯 마리씩 몰려오는 적을 ECHO·LANDMINE·GRENADE로 처리하세요.',
  siege:'ACID·RAILGUN·MACHINEGUN로 장갑과 보호막을 돌파하세요.',
  finale:'마지막 두 보스까지! 다양한 역할의 타워를 강화하고 WORD RUSH를 활용하세요.'
};
const STAGES=window.WordSiegeStages||[{
  id:'stage-01',number:1,name:'GRID ZERO',subtitle:'기본 작전',description:'기본 방어',
  colors:{background:'#f4ecd7',lane:'#d6c8ad',accent:'#c2b089',paper:'#fdf7e7'},multiplier:1,focus:'normal',waves:8,
  path:[[.02,.28],[.16,.28],[.16,.61],[.31,.61],[.31,.40],[.47,.40],[.47,.72],[.64,.72],[.64,.31],[.80,.31],[.80,.57],[.96,.57]],
  resources:[{x:.22,y:.18,amount:100},{x:.54,y:.18,amount:115},{x:.72,y:.78,amount:120}]
}];
let activeStage=0,selectedStage=0;
function getUnlocked(){
  try{return Math.min(STAGES.length,Math.max(1,KS?KS.getInt(STORAGE_STAGE,1):1))}catch{return 1}
}
function saveUnlocked(level){
  try{if(KS)KS.setRaw(STORAGE_STAGE,String(Math.max(level,getUnlocked())))}catch{}
}
function currentStage(){return STAGES[activeStage]}


let W=1000,H=600,dpr=1,last=performance.now(),running=false,muted=false;
let state=null, audioCtx=null;
const V=window.WordSiegeVisuals||null;

let pathPts=STAGES[0].path;
let resourceSpots=STAGES[0].resources;
function selectStage(index){
  if(index<0||index>=getUnlocked()||index>=STAGES.length)return false;
  selectedStage=index;
  renderStages();
  return true;
}
function renderStages(){
  const list=$('stageList');
  if(!list)return;
  const unlocked=getUnlocked();
  $('stageProgressText').textContent=unlocked+' / '+STAGES.length+' 해금';
  list.innerHTML='';
  STAGES.forEach((stage,index)=>{
    if(index===0||index===10){
      const chapter=document.createElement('div');
      chapter.className='stage-chapter';
      chapter.textContent=index===0?'PART I · 단어 방어 훈련 (01–10)':'PART II · 단어 전술 원정 (11–20)';
      list.appendChild(chapter);
    }
    const accessible=index<unlocked;
    const button=document.createElement('button');
    button.type='button';button.className='stage-choice'+(index===selectedStage?' selected':'');
    button.disabled=!accessible;
    button.style.setProperty('--stage-paper',stage.colors.background);
    button.style.setProperty('--stage-accent',stage.colors.accent);
    button.innerHTML='<span class="stage-number">'+String(stage.number).padStart(2,'0')+'</span><span><b>'+stage.name+'</b><small>'+stage.subtitle+' · 8 WAVES</small></span>';
    if(!accessible){const lock=document.createElement('span');lock.className='complete';lock.textContent='LOCKED';button.appendChild(lock)}
    button.addEventListener('click',()=>selectStage(index));
    list.appendChild(button);
  });
  $('stageDetail').textContent=STAGES[selectedStage].description+'  추천: '+(FOCUS_TIPS[STAGES[selectedStage].focus]||FOCUS_TIPS.normal);
  $('startBtn').textContent='STAGE '+String(STAGES[selectedStage].number).padStart(2,'0')+' 시작';
}
function prepareStage(index){
  activeStage=index;
  pathPts=currentStage().path;
  resourceSpots=currentStage().resources;
  $('stageText').textContent=String(currentStage().number).padStart(2,'0');
}


function freshState(){
  return {
    // Part II opens with a few more placement choices; later waves, not the
    // first minute, are where the advanced campaign increases the pressure.
    core:100,wave:0,ink:activeStage>=10?28+Math.floor((activeStage-10)/3)*3:20,score:0,inWave:false,waveTimer:0,spawnQueue:[],
    rushTime:0,rushCooldown:0,rushUses:0,
    enemies:[],towers:[],shots:[],traps:[],fields:[],effects:[],rack:D.startRack.slice(0,D.maxRack),
    selected:[],placing:null,hover:null,inspectedTowerId:null,uid:1,unique:new Set(),builtWords:[],elapsed:0,
    resources:resourceSpots.map((s,i)=>({...s,r:.045,amount:s.amount??(70+i*20)})),
    discovered:new Set(loadDiscovered()), discoveredCombos:new Set(), ended:false,towerRevision:0,totalSpawns:0
  };
}
function loadDiscovered(){
  try{return KS?KS.getJson(STORAGE_DISC,[]):[]}catch{return []}
}
function saveDiscovered(){
  try{if(KS)KS.setJson(STORAGE_DISC,[...state.discovered])}catch{}
}
function saveBest(){
  try{if(!KS)return;const prev=KS.getInt(STORAGE_BEST,0);if(state.score>prev)KS.setRaw(STORAGE_BEST,String(state.score))}catch{}
}

function resize(){
  const r=boardWrap.getBoundingClientRect(); dpr=Math.min(2,window.devicePixelRatio||1);
  // The board may be shorter than 260px on a tablet in landscape mode.
  // Never draw a larger canvas than its hit-tested viewport.
  W=Math.max(1,r.width); H=Math.max(1,r.height);
  canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize);
// Game shells, mobile toolbars and font loading can change board height without
// emitting a window resize event. Keep draw size and pointer hit area synchronized.
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(boardWrap);

function beep(freq=440,dur=.07,type='sine',gain=.035){
  if(muted)return; try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(audioCtx.destination);
    const t=audioCtx.currentTime;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.start(t);o.stop(t+dur+.01);
  }catch{}
}
function toast(msg){
  toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);
  toast._t=setTimeout(()=>toastEl.classList.remove('show'),1100);
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function setStatus(title,text){
  statusBox.innerHTML='<b>'+escapeHtml(title)+'</b><div>'+escapeHtml(text)+'</div>';
}

function typedWord(){return String(freeWord?.value||'').toUpperCase().trim()}
function tileWord(){
  return typedWord()||state.selected.map(i=>state.rack[i]).join('');
}
function renderRack(){
  rackEl.innerHTML='';
  state.rack.forEach((ch,i)=>{
    const b=document.createElement('button');b.className='tile'+(state.selected.includes(i)?' sel':'');b.type='button';b.textContent=ch;
    const n=state.selected.indexOf(i); if(n>=0)b.dataset.order=n+1;
    b.addEventListener('click',()=>{
      if(state.placing)return;
      const at=state.selected.indexOf(i);
      if(at>=0)state.selected.splice(at,1); else state.selected.push(i);
      renderRack();updateComposer();beep(520,.04,'square',.02);
    });
    rackEl.appendChild(b);
  });
}
function towerCost(def,word=def?.word,free=false){
  if(!def)return Infinity;
  const baseline=(def.role==='resource'?5:def.role==='modifier'?6:def.role==='repair'?7:6)
    +Math.ceil(def.difficulty*.75)+(def.role==='special'?3:0);
  // Mass destruction must be an earned strategic decision, not a cheap 4-letter exploit.
  const legendary={NUKE:39,BLACKHOLE:30,SUPERNOVA:31,SINGULARITY:32,VOLCANO:18};
  const premium={MACHINEGUN:14,GATLING:14,RAILGUN:13,BALLISTA:13,FIREBALL:11,GRENADE:11,SHOTGUN:10};
  const powerCost=legendary[word]||0;
  const direct=free?Math.max(3,Math.ceil(word.length/3)+Math.ceil(def.difficulty*.7)+1):0;
  return Math.max(baseline,powerCost,premium[word]||0)+direct;
}
function updateComposer(){
  const w=tileWord(),free=!!typedWord();currentWordEl.textContent=w||'_';
  const def=D.words[w];
  if(!w){const n=availableWords().length;wordMetaEl.textContent=n?'현재 만들 수 있는 단어 '+n+'개':'글자를 골라보세요'}
  else if(def){
    const cost=towerCost(def,w,free),sig=D.signatures?.[w],behavior=D.behaviorFor(w),affordable=state.ink>=cost;
    wordMetaEl.textContent=def.meaning+' · '+D.displayRole(w,def)+' · INK '+cost+
      (affordable?'':' (부족)')+(behavior?.description?' · '+behavior.description:(sig?.flavor?' · '+sig.flavor:''));
  }else wordMetaEl.textContent=w?'사전에 없는 단어 · 철자를 확인하세요':'글자를 골라보세요';
  buildBtn.disabled=!def||!!state.placing||state.ink<towerCost(def,w,free);
}
function clearSelection(){state.selected=[];if(freeWord)freeWord.value='';renderRack();updateComposer()}

function randomLetter(){
  return D.fillerFrequency[(Math.random()*D.fillerFrequency.length)|0];
}
function refillRack(){
  while(state.rack.length<D.maxRack) state.rack.push(randomLetter());
  ensurePlayableRack();
}
function canSpell(word){
  const counts={}; for(const c of state.rack)counts[c]=(counts[c]||0)+1;
  for(const c of word){if(!counts[c])return false;counts[c]--}
  return true;
}
function availableWords(){
  if(!state)return [];
  return D.wordList.filter(w=>w.length<=D.maxRack&&canSpell(w));
}
function showHint(){
  if(state.placing)return;
  if(state.ink<1){toast('HINT에는 INK가 1 필요해요');return}
  let list=availableWords();
  if(!list.length){ensurePlayableRack();renderRack();updateComposer();list=availableWords()}
  if(!list.length){toast('단어를 찾지 못했어요. SWAP을 해보세요');return}
  list=list.filter(w=>towerCost(D.words[w])<=state.ink);
  if(!list.length){toast('INK가 부족해요. 웨이브를 방어하면 INK를 얻어요.');return}
  list.sort((a,b)=>{
    const ad=state.discovered.has(a)?1:0,bd=state.discovered.has(b)?1:0;
    if(ad!==bd)return ad-bd;
    const da=D.words[a].difficulty,db=D.words[b].difficulty;
    if(da!==db)return da-db;
    return a.length-b.length;
  });
  const w=list[0],def=D.words[w];state.ink-=1;updateHud();
  const pattern=w[0]+' '+Array(Math.max(0,w.length-1)).fill('_').join(' ');
  setStatus('HINT · '+def.meaning,pattern+' · '+w.length+'글자');toast(def.meaning+' · '+pattern);beep(760,.08,'triangle',.025)
}
function ensurePlayableRack(){
  const has=D.wordList.some(w=>w.length<=7&&canSpell(w));
  if(has)return;
  const safety=['FIRE','ICE','WALL','ARROW','BOMB','FAST'];
  const w=safety[(Math.random()*safety.length)|0];
  for(let i=0;i<w.length&&i<state.rack.length;i++)state.rack[state.rack.length-1-i]=w[i];
}
function consumeSelected(fromTyping=false){
  if(fromTyping){
    if(freeWord)freeWord.value='';
    state.selected=[];renderRack();updateComposer();return;
  }
  const sorted=state.selected.slice().sort((a,b)=>b-a);
  sorted.forEach(i=>state.rack.splice(i,1));
  state.selected=[];refillRack();renderRack();updateComposer();
}
function swapOne(){
  if(state.placing)return;
  if(state.ink<2){toast('INK가 2 필요해요');return}
  state.ink-=2;
  const indices=Array.from({length:state.rack.length},(_,i)=>i)
    .sort(()=>Math.random()-.5).slice(0,3);
  indices.forEach(i=>{state.rack[i]=randomLetter()});
  state.selected=[];ensurePlayableRack();renderRack();updateComposer();updateHud();toast('글자 3개 교환!');beep(320,.06,'triangle');
}

function beginPlacement(){
  const w=tileWord(),def=D.words[w],fromTyping=!!typedWord();if(!def)return;
  const cost=towerCost(def,w,fromTyping);
  if(state.ink<cost){toast('건설할 INK가 부족해요 · '+cost);return}
  state.placing={word:w,def,fromTyping,cost,indices:state.selected.slice()};
  if(freeWord)freeWord.disabled=true;
  setStatus('배치 중 · '+w,'건설 비용 INK '+cost+' · '+
    (def.role==='resource'?'녹색 INK 광석 가까운 빈 공간을 누르세요.':'길 위가 아닌 빈 공간을 누르세요.'));
  buildBtn.disabled=true;beep(700,.07,'square');
}
function cancelPlacement(){
  state.placing=null;if(freeWord)freeWord.disabled=false;
  setStatus(state.inWave?'전투 중':'준비','글자를 조합하거나 영어 단어를 입력한 뒤 타워를 배치하세요.');
  updateComposer();
}

function boardPos(ev){
  const r=canvas.getBoundingClientRect();
  const p=ev.touches?ev.touches[0]:ev;
  return {x:(p.clientX-r.left)/r.width,y:(p.clientY-r.top)/r.height};
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function segDist(p,a,b){
  const vx=b.x-a.x,vy=b.y-a.y, wx=p.x-a.x,wy=p.y-a.y;
  const c1=vx*wx+vy*wy,c2=vx*vx+vy*vy,t=Math.max(0,Math.min(1,c1/c2));
  return Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t));
}
function minPathDistance(p){
  let best=Infinity;
  for(let i=0;i<pathPts.length-1;i++) best=Math.min(best,segDist(p,{x:pathPts[i][0],y:pathPts[i][1]},{x:pathPts[i+1][0],y:pathPts[i+1][1]}));
  return best;
}
function minPathPixels(p){
  const point={x:px(p.x),y:py(p.y)};
  let closest=Infinity;
  for(let i=0;i<pathPts.length-1;i++){
    const a=pathPts[i],b=pathPts[i+1];
    closest=Math.min(closest,segDist(point,{x:px(a[0]),y:py(a[1])},{x:px(b[0]),y:py(b[1])}));
  }
  return closest;
}
function validPlacement(p){
  if(p.x<.045||p.x>.955||p.y<.06||p.y>.94)return false;
  // Keep the actual tower body clear of the visibly stroked enemy lane.
  const unit=Math.min(W,H);
  const laneHalfWidth=Math.max(30,unit*.065)/2;
  const towerHalfWidth=Math.max(21,unit*.036)*.58;
  if(minPathPixels(p)<laneHalfWidth+towerHalfWidth+3)return false;
  const minSpacing=towerHalfWidth*2+7;
  if(state.towers.some(t=>Math.hypot((p.x-t.x)*W,(p.y-t.y)*H)<minSpacing))return false;
  return true;
}
function makeTowerStats(word,def){
  const stats={...D.roleStats[def.role]};
  const scale=1+(def.difficulty-1)*.085;
  stats.damage=(stats.damage||0)*scale;stats.range=(stats.range||.16)*(1+Math.min(.18,(def.difficulty-1)*.02));
  if(stats.area)stats.area*=1+Math.min(.22,(def.difficulty-1)*.022);
  if(word==='NUKE'){stats.area=.22;stats.rate=.12}
  if(word==='BLACKHOLE'){stats.range=.24;stats.pull=.075;stats.damage=11}
  if(word==='TORNADO'){stats.push=.095;stats.area=.18}
  if(word==='VOLCANO'){stats.damage*=1.55;stats.area=.14;stats.burn=12}
  if(word==='DRAGON'){stats.damage*=1.45;stats.burn=11}
  if(word==='JUGGERNAUT'){stats.damage*=1.65;stats.area=.13}
  const signature=D.signatures?.[word];
  if(signature){
    for(const key of ['damage','range','rate','area','burn','slow','poison','push','pull','harvest','heal','barrierSlow']){
      if(typeof signature[key]==='number'){
        const baseline=stats[key]??({burn:7,poison:6,slow:.58,push:.045,pull:.032,area:.09}[key]||1);
        stats[key]=baseline*signature[key];
      }
    }
    if(signature.chain!==undefined){stats.chain=signature.chain;stats.beam=true}
    if(signature.shieldBreak)stats.shieldBreak=signature.shieldBreak;
    if(signature.element)stats.element=signature.element;
  }
  stats.mode=D.behaviorFor(word)?.mode||'';
  if(def.role==='rapid'&&WORD_STYLE_COLORS[stats.mode])def.color=WORD_STYLE_COLORS[stats.mode];
  if(['disco','spellbook','rainbow','boomerang','pinball','spring','boo','sleep','shootingstars','snowball','slimepool','raincloud','spores','bubble','sunray','magnet','vacuum','mirror','splat','firework','snap','echo','hailstorm'].includes(stats.mode)){
    stats.rate=Math.min(1.35,Math.max(.55,stats.rate||.65));
  }
  if(def.role==='rapid'&&['rail','shotgun','firework','hailstorm','echo'].includes(stats.mode))
    stats.rate=Math.min(stats.rate,stats.mode==='rail'?.92:1.18);
  if(['gatling','shotgun','rail'].includes(stats.mode))stats.area=0;
  if(word==='NUKE'){stats.damage=Math.max(355,stats.damage);stats.area=Math.max(.255,stats.area);stats.rate=.135}
  return stats;
}
function rolePlacementValid(p,def,word){
  const s=makeTowerStats(word||def.word,def);
  if(def.role==='resource')return s.mode==='interest'||state.resources.some(r=>r.amount>0&&dist(p,r)<=s.range);
  if((s.damage||0)>0||def.role==='barrier')return minPathDistance(p)<=s.range;
  return true;
}
function buildTower(p){
  if(!state.placing||!validPlacement(p)){if(state.placing)toast('여기에는 놓을 수 없어요');return}
  const {word,def,fromTyping,cost}=state.placing;
  if(!rolePlacementValid(p,def,word)){
    if(def.role==='resource'){toast('채굴 타워는 녹색 INK 광석 가까이에 놓아야 해요');setStatus('배치 위치 다시 선택','MINER·DRILL 같은 채굴 타워는 INK 광석이 범위 안에 있어야 합니다.')}
    else{toast('공격 범위가 적의 길에 닿아야 해요');setStatus('배치 위치 다시 선택','사거리 원이 적의 이동 경로에 닿도록 놓아주세요.')}
    return;
  }
  if(state.ink<cost){toast('INK가 부족해요');return}
  const stats=makeTowerStats(word,def);
  state.ink-=cost;
  const tower={id:state.uid++,x:p.x,y:p.y,word,def,stats,level:1,cool:Math.random()*.3,harvestClock:0,links:[],pulse:0};
  state.towers.push(tower); state.unique.add(word); state.builtWords.push(word);
  ringEffect(p.x,p.y,.05,def.color,.36);
  if(V)particleEffect(p.x,p.y,def.color,9,.05);
  const newly=!state.discovered.has(word);state.discovered.add(word);saveDiscovered();
  consumeSelected(fromTyping);state.placing=null;if(freeWord)freeWord.disabled=false;
  applyLinks();setStatus('배치 완료 · '+word,(newly?'새 단어 발견! ':'')+def.meaning+' · '+D.displayRole(word,def));
  if(newly){state.score+=80+def.difficulty*20;state.ink+=2;toast('NEW WORD · '+word+' · '+def.meaning+' · INK +2');beep(880,.12,'triangle',.05)} else beep(640,.08,'square');
  updateHud();updateComposer();
}

function effectiveStats(t){
  // Links and duplicates change only when a tower is constructed.
  if(t._effectiveRevision===state.towerRevision&&t._effectiveWave===state.wave)return t._effectiveStats;
  const s={...t.stats}; let rateMul=1,damageMul=1,rangeMul=1,areaMul=1,pushMul=1;
  for(const m of t.links){
    const mod=D.modifiers[m.word]; if(!mod)continue;
    if(mod.rate)rateMul*=mod.rate;if(mod.damage)damageMul*=mod.damage;if(mod.range)rangeMul*=mod.range;if(mod.area)areaMul*=mod.area;if(mod.push)pushMul*=mod.push;
  }
  for(const combo of t.combos||[]){
    const bonus=combo.bonus;
    for(const key of ['damage','rate','range','area','push','pull','harvest','heal','burn','poison','slow','barrierSlow']){
      if(typeof bonus[key]==='number'&&s[key]!==undefined)s[key]*=bonus[key];
    }
    if(bonus.chain)s.chain=(s.chain||0)+bonus.chain;
  }
  if(s.rate)s.rate*=Math.min(2.4,rateMul);if(s.damage)s.damage*=Math.min(2.5,damageMul);if(s.range)s.range*=Math.min(1.85,rangeMul);if(s.area)s.area*=Math.min(1.9,areaMul);if(s.push)s.push*=Math.min(2,pushMul);
  // Level upgrades make scarce tower slots more valuable and absorb surplus INK.
  const level=Math.max(1,Math.min(3,t.level||1));
  if(level>1){
    if(s.damage)s.damage*=1+(FOUNDATION_WORDS.has(t.word)?.39:.27)*(level-1);
    if(s.rate)s.rate*=1+(FOUNDATION_WORDS.has(t.word)?.18:.12)*(level-1);
    if(s.range)s.range*=1+.05*(level-1);
    if(s.area)s.area*=1+.05*(level-1);
    if(s.harvest)s.harvest*=1+.16*(level-1);
    if(s.heal)s.heal*=1+.28*(level-1);
    if(s.barrierSlow)s.barrierSlow*=Math.pow(.87,level-1);
    if(s.slow)s.slow*=Math.pow(.93,level-1);
  }
  // Early vocabulary has its own progression: short, accessible words remain
  // worth using in waves 5–8 without trivializing expensive specialty towers.
  if(FOUNDATION_WORDS.has(t.word)){
    if(s.damage)s.damage*=1+Math.min(.42,Math.max(0,state.wave-1)*.06);
    if(s.rate)s.rate*=1+Math.min(.21,Math.max(0,state.wave-1)*.03);
  }
  if(state.rushTime>0){
    const starter=FOUNDATION_WORDS.has(t.word);
    if(s.damage)s.damage*=starter?1.40:1.10;
    if(s.rate)s.rate*=starter?1.30:1.12;
  }
  const duplicates=state.towers.filter(o=>o!==t&&o.word===t.word).length;
  if(s.damage)s.damage*=Math.max(.65,Math.pow(.93,duplicates));
  t._effectiveStats=s;t._effectiveWave=state.wave;t._effectiveRevision=state.towerRevision;
  return s;
}
function applyLinks(){
  for(const t of state.towers){t.links=[];t.combos=[]}
  const mods=state.towers.filter(t=>t.def.role==='modifier'||['burn','slow','poison'].includes(t.def.role));
  for(const m of mods){
    const candidates=state.towers.filter(t=>t.id!==m.id&&t.def.role!=='modifier'&&dist(t,m)<=.17).sort((a,b)=>dist(a,m)-dist(b,m));
    for(const t of candidates.slice(0,3))t.links.push(m);
  }
  const discovered=[];
  for(const combo of D.combos||[]){
    const left=state.towers.filter(t=>t.word===combo.a);
    const right=state.towers.filter(t=>t.word===combo.b);
    let paired=false;
    for(const a of left){for(const b of right){
      if(dist(a,b)>.18)continue;
      paired=true;
      if(a.combos.length<3)a.combos.push({with:b.word,peer:b,name:combo.name,bonus:combo.bonus});
      if(b.combos.length<3)b.combos.push({with:a.word,peer:a,name:combo.name,bonus:combo.bonus});
    }}
    if(paired&&!state.discoveredCombos.has(combo.name)){
      state.discoveredCombos.add(combo.name);state.score+=60;state.ink+=3;discovered.push(combo.name);
    }
  }
  state.towerRevision++;
  if(discovered.length)toast('WORD COMBO · '+discovered.join(' / ')+' · INK +3');
  return discovered;
}

function createWave(n){
  const arr=[];const stage=currentStage(),focus=stage.focus;
  const earlyStageCount=7+n*4+Math.floor(Math.min(activeStage,9)/3)*2;
  const latePressure=activeStage>=10?Math.floor((activeStage-9)/4)*Math.min(3,Math.max(0,n-2)):0;
  const count=earlyStageCount+latePressure+(n>=3?(stage.countBonus||0):0);
  for(let i=0;i<count;i++){
    let type='normal';
    if(n>=2&&i%5===3)type='fast';
    if(n>=3&&i%7===5)type='heavy';
    if(n>=4&&i%9===6)type='armored';
    if(n>=5&&i%9===7)type='shield';
    if(n>=6&&i%11===9)type='split';
    if(n>=6&&i%13===11)type='regen';
    if(focus==='fast'&&n>=2&&i%3===0)type='fast';
    if(focus==='armored'&&n>=2&&i%4===0)type='armored';
    if(focus==='heavy'&&n>=2&&i%4===0)type='heavy';
    if(focus==='split'&&n>=2&&i%4===0)type='split';
    if(focus==='regen'&&n>=2&&i%4===0)type='regen';
    if(focus==='shield'&&n>=2&&i%4===0)type='shield';
    if(focus==='swarm'&&n>=2&&i%4===0)type='fast';
    if(focus==='mixed'&&n>=2&&i%5===0)type=['fast','armored','shield','regen','split'][(i/5)%5];
    if(n>=2){
      if(focus==='carnival')type=i%4===0?'split':i%4===2?'fast':type;
      if(focus==='fortress')type=n>=3&&i%4===0?'armored':i%4===2?'shield':type;
      if(focus==='phantom')type=i%5===0?'regen':i%5===2?'fast':type;
      if(focus==='cascade')type=i%3===0?'split':i%3===1?'fast':type;
      if(focus==='tempest')type=i%4===0?'shield':i%4===1||i%4===3?'fast':type;
      if(focus==='goldrush')type=i%5===0?'heavy':i%5===3?'fast':type;
      if(focus==='duet')type=n%2===0?(i%3===0?'fast':i%3===1?'heavy':type):
        (i%3===0?'heavy':i%3===1?'shield':type);
      if(focus==='echo')type=n>=4&&i%5===0?'shield':i%5===1?'fast':i%5===4?'split':type;
      if(focus==='siege')type=n>=4&&i%4===0?'heavy':n>=3&&i%4===1?'armored':n>=4&&i%4===3?'shield':type;
      if(focus==='finale'){
        const lineup=['fast',n>=4?'armored':'normal','split',n>=5?'regen':'normal',
          n>=5?'shield':'normal',n>=4?'heavy':'fast','normal'];
        type=lineup[i%7];
      }
    }
    const gap=Math.max(.30,.78-n*.045)*(stage.spawnGap||1)-(focus==='swarm'?.09:0);
    const delay=focus==='echo'?Math.floor(i/5)*Math.max(.96,gap*3.6)+(i%5)*.13:
      i*Math.max(.22,gap);
    arr.push({delay,type});
  }
  if(n===8){
    const firstBoss=Math.max(arr[arr.length-1]?.delay||0,count*.42)+1.1;
    for(let j=0;j<Math.min(2,stage.bosses||1);j++)
      arr.push({delay:firstBoss+j*5,type:'boss'});
  }
  return arr;
}
function startWave(){
  if(state.inWave||state.ended)return;
  if(state.wave>=8)return;
  if(state.wave===0&&!state.towers.some(t=>(t.stats.damage||0)>0)){
    setStatus('공격 타워를 먼저 지어주세요','ARROW, FIRE, ICE처럼 적을 공격할 단어 타워가 필요해요.');
    toast('첫 웨이브 전에 공격 타워가 필요해요');return;
  }
  state.wave++;state.inWave=true;state.waveTimer=0;state.spawnQueue=createWave(state.wave);state.totalSpawns=state.spawnQueue.length;
  state.rushUses=0;state.rushTime=0;state.rushCooldown=0;state.towerRevision++;
  state.effects.push({type:'banner',text:'WAVE '+state.wave,x:.5,y:.38,color:currentStage().colors.accent,life:1.1,max:1.1});
  waveBtn.disabled=true;waveBtn.textContent='WAVE '+state.wave+' 진행 중';setStatus('WAVE '+state.wave,'전투 중에도 타워를 지을 수 있어요. '+(FOCUS_TIPS[currentStage().focus]||FOCUS_TIPS.normal));
  beep(250,.12,'sawtooth',.05);updateHud();
}
const ENEMY={
 normal:{hp:52,speed:.070,r:.013,damage:6,color:'#23252a'},
 fast:{hp:34,speed:.120,r:.010,damage:5,color:'#b92c45'},
 heavy:{hp:145,speed:.046,r:.018,damage:12,color:'#553d34'},
 shield:{hp:78,speed:.064,r:.014,damage:7,color:'#355f7a',shield:30},
 armored:{hp:126,speed:.052,r:.018,damage:11,color:'#5a6576',armor:.32},
 regen:{hp:110,speed:.067,r:.015,damage:9,color:'#3e906d',regen:4},
 split:{hp:68,speed:.060,r:.014,damage:6,color:'#6c3d82',split:true},
 boss:{hp:650,speed:.035,r:.028,damage:28,color:'#971f31',boss:true}
};
function spawnEnemy(type){
  const a=ENEMY[type]||ENEMY.normal;
  const stage=state.wave-1,balance=D.waveBalance;
  const hpScale=1+balance.hpLinear*stage+balance.hpQuadratic*stage*stage;
  // Early waves teach the counter-strategy before full stage difficulty arrives.
  // Wave 8 still uses the stage's intended enemy HP multiplier.
  const difficultyBlend=Math.min(1,(balance.openingPressure||.28)+(state.wave-1)*(balance.pressurePerWave||.14));
  const stageMultiplier=1+(currentStage().multiplier-1)*difficultyBlend;
  const hp=Math.round(a.hp*hpScale*stageMultiplier);
  const e={id:state.uid++,type,hp,maxHp:hp,speed:a.speed*(1+stage*balance.speedGrowth),
    r:a.r,damage:Math.round(a.damage*(1+stage*.065)),color:a.color,
    shield:Math.round((a.shield||0)*hpScale),armor:a.armor||0,regen:a.regen||0,
    split:a.split||false,boss:a.boss||false,pathIndex:0,pathT:0,x:pathPts[0][0],y:pathPts[0][1],
    burn:0,burnDps:0,poison:0,poisonDps:0,slow:1,pushBack:0,dead:false,
    corrosion:0,corrosionTime:0,chillStacks:0,freezeTime:0,stunTime:0,infected:false,
    bubbleTime:0,bubblePower:0,bubbleSource:null,bubbleCombo:false,danceTime:0,sleepTime:0,
    controlPressure:0,unstoppableTime:0,exposedTime:0};
  state.enemies.push(e);
}
function enemyProgress(e){return e.pathIndex+e.pathT}
function moveEnemy(e,dt){
  if(e.dead)return;
  if(e.boss){
    // Boss resolve: crowd control still buys time, but cannot pin the final
    // enemy forever. Breaking resolve gives players a short damage window.
    e.unstoppableTime=Math.max(0,(e.unstoppableTime||0)-dt);
    e.exposedTime=Math.max(0,(e.exposedTime||0)-dt);
    const pinned=e.freezeTime>0||e.stunTime>0||e.bubbleTime>0;
    const controlled=pinned||e.slow<.85||e.pushBack>.001;
    if(e.unstoppableTime<=0){
      e.controlPressure=Math.max(0,(e.controlPressure||0)+(controlled?dt*(pinned?1.25:.75):-dt*.65));
      if(e.controlPressure>=1.85){
        e.unstoppableTime=4.6;e.exposedTime=3.4;e.controlPressure=0;
        e.stunTime=0;e.freezeTime=0;e.bubbleTime=0;e.pushBack=0;
        ringEffect(e.x,e.y,.085,'#ffcd78',.58);
        floatEffect(e.x,e.y,'BREAK! +DMG','#f6ad58');
        beep(340,.13,'sawtooth',.028);
      }
    }
  }
  e.slow+=(1-e.slow)*Math.min(1,dt*1.7);
  const pinned=e.freezeTime>0||e.stunTime>0||e.bubbleTime>0;
  // Even during ordinary resistance the boss has a guaranteed minimum
  // forward pace. Regular enemies retain full snare/knockback behavior.
  let step=e.boss
    ?e.speed*(e.unstoppableTime>0?1.25:pinned?.47:Math.max(.57,e.slow))*dt
    :e.speed*(pinned?0:e.slow)*dt;
  if(e.pushBack>0){
    const push=e.boss?Math.min(e.pushBack,e.unstoppableTime>0?0:e.speed*dt*.35):e.pushBack;
    step-=push;e.pushBack=0;
  }
  while(Math.abs(step)>.00001){
    if(step>=0){
      if(e.pathIndex>=pathPts.length-1){reachCore(e);return}
      const a=pathPts[e.pathIndex],b=pathPts[e.pathIndex+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),remain=(1-e.pathT)*len;
      if(step<remain){e.pathT+=step/len;step=0}else{step-=remain;e.pathIndex++;e.pathT=0}
    }else{
      if(e.pathIndex<=0&&e.pathT<=0){step=0;break}
      const a=pathPts[e.pathIndex],b=pathPts[Math.min(pathPts.length-1,e.pathIndex+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1]),back=e.pathT*len;
      const mag=-step;if(mag<=back){e.pathT-=mag/len;step=0}else{step+=(back||.0001);e.pathIndex=Math.max(0,e.pathIndex-1);e.pathT=.999}
    }
  }
  const a=pathPts[Math.min(e.pathIndex,pathPts.length-2)],b=pathPts[Math.min(e.pathIndex+1,pathPts.length-1)];
  e.x=a[0]+(b[0]-a[0])*e.pathT;e.y=a[1]+(b[1]-a[1])*e.pathT;
}
function reachCore(e){
  e.dead=true;state.core=Math.max(0,state.core-e.damage);
  const last=pathPts[pathPts.length-1];flashEffect(last[0],last[1],'#ef5d67',.12);
  beep(120,.12,'sawtooth',.06);
  if(state.core<=0)endGame(false)
}
function damageEnemy(e,amount,kind,tower){
  if(e.dead)return;
  if(e.shield>0){
    const multiplier=tower?(effectiveStats(tower).shieldBreak||1):1;
    const used=Math.min(e.shield,amount*multiplier);
    e.shield-=used;amount-=used/multiplier;
  }
  const effectiveArmor=Math.max(0,e.armor-(e.corrosion||0))*(tower?.def.role==='pierce'?.28:1);
  e.hp-=Math.max(0,amount)*(1-effectiveArmor)*(e.boss&&e.exposedTime>0?1.38:1);
  if(kind==='burn'){e.burn=2.8;e.burnDps=Math.max(e.burnDps,(tower?effectiveStats(tower).burn:0)||7)}
  if(kind==='poison'){e.poison=4.5;e.poisonDps=Math.max(e.poisonDps,(tower?effectiveStats(tower).poison:0)||6)}
  if(kind==='slow')e.slow=Math.min(e.slow,(tower?effectiveStats(tower).slow:0)||.52);
  if(kind==='push')e.pushBack=Math.max(e.pushBack,((tower?effectiveStats(tower).push:0)||.045)*.75);
  if(e.hp<=0)killEnemy(e);
}
// Primary and linked elemental effects are additive, not mutually exclusive.
// In particular FIRE + ICE retains burn and slow, and SPIDER applies both effects.
function attackEnemy(t,e,damage,extra=''){
  if(!e||e.dead)return;
  // Mixed-element setups have a payoff beyond raw damage stacking.
  const chilled=(e.slow||1)<.87||(e.freezeTime||0)>0;
  const corroded=(e.corrosion||0)>.01;
  const synergy=chilled&&t.def.role==='pierce'?1.16:corroded&&['burst','explosive'].includes(t.def.role)?1.12:1;
  damageEnemy(e,damage*synergy,'',t);
  if(e.dead)return;
  const s=effectiveStats(t);
  const kinds=new Set();
  if(['burn','slow','poison','push'].includes(t.def.role))kinds.add(t.def.role);
  if(['burn','slow','poison','push'].includes(s.element))kinds.add(s.element);
  if(['burn','slow','poison'].includes(extra))kinds.add(extra);
  for(const m of t.links||[])if(['burn','slow','poison'].includes(m.def.role))kinds.add(m.def.role);
  for(const kind of kinds)damageEnemy(e,0,kind,t);
  if(s.mode==='webpoison'){damageEnemy(e,0,'slow',t);e.slow=Math.min(e.slow,.60)}
  if(s.mode==='corrosion'){e.corrosion=Math.min(.30,(e.corrosion||0)+.075);e.corrosionTime=4}
  if(s.mode==='infection')e.infected=true;
  if(s.mode==='freeze'){
    e.chillStacks=(e.chillStacks||0)+1;
    if(e.chillStacks>=3){e.chillStacks=0;e.freezeTime=Math.max(e.freezeTime||0,.85);ringEffect(e.x,e.y,.025,'#a8efff',.25)}
  }
  if(s.mode==='stun')e.stunTime=Math.max(e.stunTime||0,.42);
}
function killEnemy(e){
  if(e.dead)return;e.dead=true;state.score+=e.boss?800:18+state.wave*2;state.ink+=e.boss?20:((e.armor||e.regen||e.shield)?2:1);
  flashEffect(e.x,e.y,e.color,e.boss ? .09 : .045);
  particleEffect(e.x,e.y,e.color,e.boss?14:4,e.boss?.10:.032);
  if(e.infected){
    for(const other of state.enemies){
      if(other.dead||other===e||dist(e,other)>.12)continue;
      other.poison=Math.max(other.poison,3);other.poisonDps=Math.max(other.poisonDps,e.poisonDps*.75||5);
      other.infected=true;
    }
    ringEffect(e.x,e.y,.12,'#86c959',.30);
  }
  if(e.split&&!e.boss){for(let i=0;i<2;i++){const c={...e,id:state.uid++,type:'normal',hp:20,maxHp:20,speed:.095,r:.008,damage:3,color:'#2f3035',split:false,dead:false,pathT:Math.max(0,e.pathT-i*.025)};state.enemies.push(c)}}
}

// Route projection lets deployed mines sit on the enemy lane, never inside the tower.
function closestLanePoint(p){
  let closest={x:p.x,y:p.y,d:Infinity};
  for(let i=0;i<pathPts.length-1;i++){
    const a=pathPts[i],b=pathPts[i+1],vx=b[0]-a[0],vy=b[1]-a[1];
    const frac=Math.max(0,Math.min(1,((p.x-a[0])*vx+(p.y-a[1])*vy)/(vx*vx+vy*vy||1)));
    const x=a[0]+vx*frac,y=a[1]+vy*frac,d=Math.hypot(p.x-x,p.y-y);
    if(d<closest.d)closest={x,y,d};
  }
  return closest;
}
function updateTraps(dt){
  for(const mine of state.traps){
    mine.life-=dt;
    if(mine.life<=0)continue;
    const nearby=state.enemies.find(e=>!e.dead&&dist(mine,e)<mine.trigger);
    if(!nearby)continue;
    mine.life=0;
    for(const e of state.enemies)if(!e.dead&&dist(mine,e)<=mine.radius)attackEnemy(mine.source,e,mine.damage);
    ringEffect(mine.x,mine.y,mine.radius,mine.source.def.color,.35);
    particleEffect(mine.x,mine.y,mine.source.def.color,12,mine.radius*.8);
    beep(110,.13,'sawtooth',.02);
  }
  state.traps=state.traps.filter(m=>m.life>0);
}
function updateFields(dt){
  for(const f of state.fields){
    f.life-=dt;f.clock-=dt;
    if(f.clock>0)continue;
    f.clock=f.interval||.62;
    if(f.echo)f.life=Math.min(f.life,.025);
    for(const e of state.enemies){
      if(e.dead||dist(e,f)>f.radius)continue;
      attackEnemy(f.source,e,f.damage,f.kind||'burn');
      if(f.kind==='slow')e.slow=Math.min(e.slow,f.slow||.58);
    }
  }
  state.fields=state.fields.filter(f=>f.life>0);
}
function projectile(t,target,s,opts={}){
  state.shots.push({
    x:t.x,y:t.y,target,damage:opts.damage??s.damage,
    speed:s.projectileSpeed||.55,color:t.def.color,area:opts.area??(s.area||0),
    kind:t.def.role,mode:opts.mode||s.mode||'',source:t,dead:false,
    delay:opts.delay||0,point:{x:target.x,y:target.y},travel:0
  });
}
// Short, legible spectacle: each existing English word performs its meaning.
// Uses the standard enemy, cooldown, INK and field systems (no summoned NPCs).
function playfulTowerAttack(t,s,targets,target){
  const mode=s.mode;
  const combo=name=>(t.combos||[]).some(entry=>entry.name===name);
  const hit=(e,power=.6,element='')=>attackEnemy(t,e,s.damage*power,element);
  const nearby=(x,y,r,max=6)=>targets.filter(e=>dist(e,{x,y})<=r).slice(0,max);
  const label=(value,color=t.def.color)=>floatEffect(target.x,target.y,value,color);
  const field=(kind,radius,life,damage,slow=1)=>{
    if(state.fields.filter(f=>f.source.id===t.id).length>=3)return;
    state.fields.push({x:target.x,y:target.y,radius,life,clock:.05,interval:.60,
      damage,kind,slow,source:t});
    ringEffect(target.x,target.y,radius,t.def.color,.35);
  };
  if(mode==='disco'){
    for(const e of targets.slice(0,7)){
      hit(e,.24);e.slow=Math.min(e.slow,.45);
      e.danceTime=.75;e.stunTime=Math.max(e.stunTime||0,.25);
      if(combo('무지개 디스코'))damageEnemy(e,0,'burn',t);
    }
    ringEffect(t.x,t.y,s.range,t.def.color,.42);
    label('♫ DANCE!','#d789e9');beep(440+(t.castCount||0)%4*110,.12,'triangle',.025);
    t.castCount=(t.castCount||0)+1;return true;
  }
  if(mode==='pinball'){
    const used=new Set();let previous={x:t.x,y:t.y},current=target;
    for(let n=0;n<(combo('별똥별 핀볼')?6:5)&&current;n++){
      used.add(current.id);hit(current,Math.pow(.73,n)*.80);
      lineEffect(previous.x,previous.y,current.x,current.y,n%2?'#fff3a0':'#ff9b63',.18,2);
      ringEffect(current.x,current.y,.022,t.def.color,.20);previous=current;
      current=targets.filter(e=>!used.has(e.id)&&dist(e,previous)<.14)
        .sort((a,b)=>dist(a,previous)-dist(b,previous))[0];
    }
    label('PING!','#ee9c47');beep(620,.09,'square',.02);return true;
  }
  if(mode==='spring'){
    for(const e of nearby(target.x,target.y,.085,3)){
      hit(e,.45);e.pushBack=Math.max(e.pushBack,e.boss?.016:.048);
      e.stunTime=Math.max(e.stunTime||0,.22);
    }
    ringEffect(target.x,target.y,.087,'#e0fc91',.25);
    label('BOING!','#a6dc51');beep(330,.13,'sine',.03);return true;
  }
  if(mode==='bubble'){
    const e=targets.find(e=>(e.bubbleTime||0)<=0)||target;
    if(e.bubbleTime>0){hit(e,.25);return true}
    hit(e,.27);if(e.dead)return true;
    e.bubbleTime=e.boss?.55:1.35;e.bubblePower=Math.min(55,s.damage*.72);
    e.bubbleSource=t;e.bubbleCombo=combo('거품 트램펄린');
    ringEffect(e.x,e.y,.046,'#b5f8f5',.45);
    floatEffect(e.x,e.y,'BUBBLE!','#67c8c5');beep(880,.07,'sine',.02);return true;
  }
  if(mode==='mirror'){
    const peer=state.towers.filter(other=>other!==t&&other.stats.damage>0&&other.stats.mode!=='mirror'&&dist(t,other)<.20)
      .sort((a,b)=>dist(t,a)-dist(t,b))[0];
    const source=peer||t;
    const borrowed=peer?effectiveStats(peer):s;
    // The mirror borrows elemental utility without being punished for a low-DPS neighbor.
    const damage=Math.min(74,Math.max(s.damage*.38,borrowed.damage*.62));
    const count=combo('매직 미러')?3:peer&&(borrowed.area||borrowed.beam)?3:1;
    const victims=nearby(target.x,target.y,peer?Math.max(.065,borrowed.area||.09):.02,count);
    for(const e of victims){
      attackEnemy(source,e,damage);
      if(borrowed.burn||source.def.role==='burn')damageEnemy(e,0,'burn',source);
      if(borrowed.slow||source.def.role==='slow')damageEnemy(e,0,'slow',source);
      if(borrowed.poison||source.def.role==='poison')damageEnemy(e,0,'poison',source);
      if(combo('매직 미러')&&source.stats.mode==='spellbook')damageEnemy(e,0,(t.castCount||0)%2?'slow':'burn',source);
    }
    if(peer)lineEffect(t.x,t.y,peer.x,peer.y,'#faf3ff',.28,3);
    lineEffect(peer?.x??t.x,peer?.y??t.y,target.x,target.y,'#f6d5ff',.21,3);
    t.castCount=(t.castCount||0)+1;
    label(peer?'COPY '+peer.word:'REFLECT','#c99cf2');return true;
  }
  if(mode==='boo'){
    for(const e of nearby(target.x,target.y,.11,4)){
      hit(e,.36);e.pushBack=Math.max(e.pushBack,e.boss?.018:.047);
      e.stunTime=Math.max(e.stunTime||0,combo('유령의 악몽')?.85:.35);
      if(combo('유령의 악몽'))e.sleepTime=Math.max(e.sleepTime||0,.85);
    }
    ringEffect(target.x,target.y,.11,'#b8b1f3',.40);
    label('BOO!','#b8b1f3');beep(240,.16,'sine',.03);return true;
  }
  if(mode==='spellbook'){
    const spells=['burn','slow','poison','push'];
    const cast=spells[(t.castCount||0)%spells.length];t.castCount=(t.castCount||0)+1;
    const victims=targets.slice(0,t.word==='WIZARD'?2:1);
    for(const e of victims){
      hit(e,.58,cast);
      if(cast==='push')e.pushBack=Math.max(e.pushBack,.033);
      if(cast==='slow')e.freezeTime=Math.max(e.freezeTime||0,.20);
      ringEffect(e.x,e.y,.035,cast==='burn'?'#ff9350':cast==='slow'?'#9bdcff':cast==='poison'?'#a6e77a':'#c4aaf2',.24);
    }
    label(['FIRE!','ICE!','POISON!','WIND!'][(t.castCount-1)%4]);
    beep(460+(t.castCount%4)*130,.08,'triangle',.022);return true;
  }
  if(mode==='rainbow'){
    let last={x:t.x,y:t.y};
    for(const [i,e] of targets.slice(0,4).entries()){
      const color=['#ee6b85','#ffb554','#77d3c7','#9686ec'][i];
      hit(e,.43,['burn','slow','poison','slow'][i]);
      lineEffect(last.x,last.y,e.x,e.y,color,.23,3);last=e;
    }
    ringEffect(target.x,target.y,.05,'#ffcb74',.22);return true;
  }
  if(mode==='boomerang'){
    const along=targets.filter(e=>{
      const dx=target.x-t.x,dy=target.y-t.y,m=dx*dx+dy*dy||1;
      const fraction=((e.x-t.x)*dx+(e.y-t.y)*dy)/m;
      return fraction>=0&&fraction<=1&&Math.hypot(e.x-(t.x+dx*fraction),e.y-(t.y+dy*fraction))<.033;
    }).slice(0,5);
    for(const e of along){hit(e,.63);hit(e,.42)}
    lineEffect(t.x,t.y,target.x,target.y,'#fff6a4',.23,3);
    lineEffect(target.x,target.y,t.x,t.y,'#68ceba',.37,2);
    label('RETURN!','#61c9bc');beep(540,.09,'triangle',.025);return true;
  }
  if(mode==='spores'){
    hit(target,.32,'poison');field('poison',.11,3.35,s.damage*.115);
    particleEffect(target.x,target.y,'#b4e77a',12,.12);
    label('SPORES!','#81ba55');return true;
  }
  if(mode==='slimepool'){
    hit(target,.24,'poison');field('slow',.10,4,s.damage*.09,.44);
    label('SPLAT!','#8bc75f');return true;
  }
  if(mode==='vacuum'){
    for(const e of nearby(target.x,target.y,.135,6)){
      hit(e,.29);e.pushBack=Math.max(e.pushBack,e.boss?.016:.036);
      e.slow=Math.min(e.slow,.63);
    }
    ringEffect(target.x,target.y,.14,'#d5a8ef',.40);
    label('WHOOOSH!','#c9a2e9');return true;
  }
  if(mode==='magnet'){
    const pulled=targets.slice().sort((a,b)=>
      ((b.shield>0?2:0)+(b.armor>0?1:0))-((a.shield>0?2:0)+(a.armor>0?1:0))).slice(0,3);
    for(const e of pulled){
      e.shield=Math.max(0,e.shield-s.damage*.65);
      hit(e,.49);e.pushBack=Math.max(e.pushBack,e.boss?.012:.032);
    }
    lineEffect(t.x,t.y,pulled[0].x,pulled[0].y,'#8fd4ea',.22,3);
    label('CLANK!','#85cce2');return true;
  }
  if(mode==='sleep'){
    const e=targets.find(e=>(e.sleepTime||0)<=0)||target;
    hit(e,.24);
    e.sleepTime=e.boss?.55:1.7;
    e.stunTime=Math.max(e.stunTime||0,e.sleepTime);
    ringEffect(e.x,e.y,.048,'#a4a0e5',.36);
    floatEffect(e.x,e.y,'Zzz...','#8f87db');return true;
  }
  if(mode==='shootingstars'){
    for(const [i,e] of targets.slice(0,4).entries()){
      projectile(t,e,s,{area:0,damage:s.damage*.42,mode:'shootingstars'});
      ringEffect(e.x,e.y,.022,i%2?'#e2bcff':'#ffe399',.15);
    }
    if(targets.length===1)projectile(t,target,s,{area:0,damage:s.damage*.32,mode:'shootingstars'});
    label('★ ★ ★','#f3d075');return true;
  }
  if(mode==='snowball'){
    projectile(t,target,s,{area:.055,damage:s.damage*.83,mode:'snowball'});
    label('ROLL!','#90cbe7');return true;
  }
  if(mode==='raincloud'){
    hit(target,.32,'slow');field('slow',.13,3.8,s.damage*.07,.46);
    label('DRIZZLE','#76b7e7');return true;
  }
  if(mode==='sunray'){
    const victims=nearby(target.x,target.y,.065,4);
    for(const e of victims)hit(e,.76,'burn');
    lineEffect(t.x,t.y,target.x,target.y,'#f8c24e',.28,5);
    ringEffect(target.x,target.y,.065,'#fff0a7',.28);
    label('SUNSHINE!','#e6a748');return true;
  }
  if(mode==='splat'){
    const list=nearby(target.x,target.y,.088,7);
    for(const e of list){hit(e,e===target?.72:.40);e.slow=Math.min(e.slow,.60)}
    ringEffect(target.x,target.y,.085,'#f5c35b',.28);
    particleEffect(target.x,target.y,'#f7a957',9,.085);
    label('SPLAT!','#dc9860');return true;
  }
  if(mode==='firework'){
    for(const [i,e] of targets.slice(0,3).entries()){
      const shade=['#ffa465','#dd8cff','#94dec9'][i];
      for(const victim of nearby(e.x,e.y,.044,4))hit(victim,.36,i===0?'burn':'');
      ringEffect(e.x,e.y,.047,shade,.30);
      particleEffect(e.x,e.y,shade,6,.046);
    }
    label('POP! POP!','#d87bb5');beep(680,.085,'square',.025);return true;
  }
  if(mode==='snap'){
    for(const e of nearby(target.x,target.y,.075,5)){
      hit(e,.43);e.stunTime=Math.max(e.stunTime||0,.42);
      e.pushBack=Math.max(e.pushBack,e.boss?.008:.023);
    }
    ringEffect(target.x,target.y,.075,'#b2cc69',.33);
    label('SNAP!','#789c50');return true;
  }
  if(mode==='echo'){
    hit(target,.49);
    if(state.fields.filter(f=>f.source.id===t.id&&f.echo).length<3)
      state.fields.push({x:target.x,y:target.y,radius:.10,life:.75,clock:.38,interval:99,
        damage:s.damage*.54,kind:'',slow:1,source:t,echo:true});
    lineEffect(t.x,t.y,target.x,target.y,'#9bd8ef',.16,2);
    ringEffect(target.x,target.y,.033,'#99cfe9',.37);
    label('ECHO!','#75b6db');return true;
  }
  if(mode==='hailstorm'){
    for(const e of nearby(target.x,target.y,.12,6)){
      hit(e,.43,'slow');e.slow=Math.min(e.slow,.54);
      e.freezeTime=Math.max(e.freezeTime||0,.22);
      particleEffect(e.x,e.y,'#d5f4fc',3,.035);
    }
    ringEffect(target.x,target.y,.12,'#88c7e3',.35);
    label('HAIL!','#77b7d6');return true;
  }
  return false;
}
function towerUpdate(t,dt){
  const s=effectiveStats(t),mode=s.mode;
  t.pulse=Math.max(0,(t.pulse||0)-dt);
  if(t.def.role==='resource'){
    if(mode==='interest'||!state.inWave)return;
    t.harvestClock+=dt;
    const interval=mode==='drill'?2.05:3.25;
    if(t.harvestClock>=interval){
      t.harvestClock=0;
      const node=state.resources.filter(r=>r.amount>0&&dist(t,r)<=s.range).sort((a,b)=>dist(t,a)-dist(t,b))[0];
      if(node){
        const base=Math.max(1,Math.round((s.harvest||3)*.64*(1+t.def.difficulty*.07)));
        const amt=Math.min(node.amount,mode==='drill'?Math.ceil(base*1.35):base);
        node.amount-=amt;state.ink+=amt;state.score+=amt*2;t.pulse=.35;
        floatEffect(t.x,t.y,'+'+amt+' INK','#4b9f38');
      }
    }
    return;
  }
  if(t.def.role==='repair'){
    if(!state.inWave||state.core>=100)return;
    t.harvestClock+=dt;
    const interval=mode==='bandage'?1.25:mode==='hospital'?4.2:2.5;
    if(t.harvestClock>=interval){
      t.harvestClock=0;
      const heal=(s.heal||2)*(mode==='hospital'?2.2:1);
      state.core=Math.min(100,state.core+heal);t.pulse=.3;
      floatEffect(t.x,t.y,'+'+Math.round(heal)+' CORE','#51c79b');
    }
    return;
  }
  if(t.def.role==='modifier'||s.rate<=0)return;
  t.cool-=dt;
  if(mode==='mine'){
    if(!state.inWave||t.cool>0)return;
    const place=closestLanePoint(t);
    if(place.d>s.range)return;
    const deployed=state.traps.filter(m=>m.source.id===t.id).length;
    if(deployed>=3)return;
    t.cool=1/s.rate;t.pulse=.3;
    state.traps.push({x:place.x,y:place.y,trigger:.023,radius:Math.min(.125,s.area||.09),
      damage:s.damage*1.25,source:t,life:18});
    ringEffect(place.x,place.y,.035,t.def.color,.24);
    return;
  }
  const targets=state.enemies.filter(e=>!e.dead&&dist(t,e)<=s.range)
    .sort((a,b)=>enemyProgress(b)-enemyProgress(a));
  if(!targets.length){
    if(mode==='gatling')t.spin=Math.max(0,(t.spin||0)-dt*1.2);
    return;
  }
  if(t.cool>0)return;
  const target=mode==='assassin'
    ?targets.slice().sort((a,b)=>(b.type==='fast'?1:0)-(a.type==='fast'?1:0)||enemyProgress(b)-enemyProgress(a))[0]
    :targets[0];
  if(mode==='gatling')t.spin=Math.min(2,(t.spin||0)+.32);
  t.cool=1/(s.rate*(mode==='gatling'?1+(t.spin||0)*.7:1));
  t.pulse=.24;
  const hit=(e,scale=1)=>attackEnemy(t,e,s.damage*scale);
  const coneTargets=(angle,width,limit)=>targets.filter(e=>{
    const a=Math.atan2(e.y-t.y,e.x-t.x);
    return Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)))<width;
  }).slice(0,limit);
  const angle=Math.atan2(target.y-t.y,target.x-t.x);
  if(playfulTowerAttack(t,s,targets,target))return;
  if(mode==='rail'||mode==='cleave'||t.def.role==='pierce'){
    if(mode==='cleave'){
      for(const e of coneTargets(angle,1.1,6))hit(e,.85);
      ringEffect(t.x,t.y,Math.min(.12,s.range),t.def.color,.15);
    }else{
      const hits=targets.filter(e=>{
        const dx=e.x-t.x,dy=e.y-t.y;
        return dx*Math.cos(angle)+dy*Math.sin(angle)>0&&Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle))<(mode==='rail'?.017:.025);
      }).slice(0,mode==='rail'?9:4);
      for(const e of hits)hit(e,mode==='rail'?1.28:1);
      lineEffect(t.x,t.y,t.x+Math.cos(angle)*s.range,t.y+Math.sin(angle)*s.range,
        t.def.color,mode==='rail'?.20:.12,mode==='rail'?4:2);
    }
  }else if(mode==='shotgun'||mode==='flamethrower'){
    for(const e of coneTargets(angle,mode==='shotgun'?.65:.48,8)){
      const proximity=Math.max(.3,1-dist(t,e)/s.range);
      hit(e,mode==='shotgun'?.45+proximity*1.25:.38);
    }
    for(const delta of [-.45,0,.45]){
      lineEffect(t.x,t.y,t.x+Math.cos(angle+delta)*s.range*.65,
        t.y+Math.sin(angle+delta)*s.range*.65,t.def.color,.12,mode==='shotgun'?2:4);
    }
  }else if(mode==='stun'||mode==='assassin'){
    hit(target,mode==='assassin'&&target.type==='fast'?1.65:1);
    lineEffect(t.x,t.y,target.x,target.y,t.def.color,.15,2);
  }else if(mode==='blizzard'||mode==='tidal'||mode==='vortex'||mode==='teleport'){
    const radius=Math.max(.065,s.area||.10);
    const group=targets.filter(e=>dist(e,target)<=radius);
    for(const e of group){
      hit(e,mode==='blizzard'?.64:1);
      if(mode==='tidal')e.pushBack=Math.max(e.pushBack,(s.push||.045)*1.3);
      if(mode==='vortex'){e.pushBack=Math.max(e.pushBack,(s.pull||.032)*1.1);e.slow=Math.min(e.slow,.46)}
      if(mode==='teleport'){e.pushBack=Math.max(e.pushBack,.115);e.stunTime=.20}
    }
    ringEffect(mode==='vortex'?t.x:target.x,mode==='vortex'?t.y:target.y,radius,t.def.color,.28);
  }else if(s.beam||t.def.role==='push'||t.def.role==='gravity'){
    if(t.def.role==='push'||t.def.role==='gravity'){
      const group=targets.filter(e=>dist(e,target)<=Math.max(.04,s.area||.04));
      for(const e of group){
        hit(e,1);
        if(t.def.role==='gravity'){e.pushBack=Math.max(e.pushBack,(s.pull||.032)*.55)}
      }
      ringEffect(target.x,target.y,Math.max(.04,s.area||.04),t.def.color,.2);
    }else{
      hit(target,1);lineEffect(t.x,t.y,target.x,target.y,t.def.color,.10,3);
      let previous=target;
      targets.slice(1,1+Math.min(4,s.chain||0)).forEach((e,i)=>{
        hit(e,Math.pow(.58,i+1));lineEffect(previous.x,previous.y,e.x,e.y,t.def.color,.1,2);previous=e;
      });
    }
  }else{
    if(mode==='nuke'||mode==='meteor') {
      projectile(t,target,s,{delay:mode==='nuke'?1.8:1.05,mode});
      ringEffect(target.x,target.y,s.area,t.def.color,mode==='nuke'?1.65:.75);
      beep(mode==='nuke'?150:320,.16,'sawtooth',.04);
    }else if(mode==='volley'){
      projectile(t,target,s,{damage:s.damage*.60});
      projectile(t,targets[1]||target,s,{damage:s.damage*.60});
    }else{
      projectile(t,target,s);
    }
  }
}
function shotUpdate(s,dt){
  if(s.dead)return;
  if(s.mode==='nuke'||s.mode==='meteor'){
    s.delay-=dt;
    if(s.delay>0)return;
    const center=s.point;
    for(const e of state.enemies)if(!e.dead&&dist(e,center)<=s.area)
      attackEnemy(s.source,e,s.damage*(s.mode==='nuke'?1:0.9));
    ringEffect(center.x,center.y,s.area,s.color,.50);
    particleEffect(center.x,center.y,s.color,18,s.area*.9);
    flashEffect(center.x,center.y,s.color,s.area*.62);
    beep(s.mode==='nuke'?85:140,.28,'sawtooth',s.mode==='nuke'?.065:.045);
    s.dead=true;return;
  }
  if(!s.target||s.target.dead){
    if(s.mode==='homing'){
      const next=state.enemies.filter(e=>!e.dead&&dist(s,e)<.20)
        .sort((a,b)=>dist(s,a)-dist(s,b))[0];
      if(next)s.target=next;
    }
    if(!s.target||s.target.dead){
      if(!s.area){s.dead=true;return}
      s.target={x:s.point.x,y:s.point.y,dead:false};
    }
  }
  s.point={x:s.target.x,y:s.target.y};
  const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy),mv=s.speed*dt;
  if(s.mode==='snowball')s.area=Math.min(.12,.055+(s.travel||0)*.14);
  if(d<=mv+.008){
    const impact=s.target;
    if(s.area>0){
      for(const e of state.enemies)if(!e.dead&&dist(e,impact)<=s.area)
        attackEnemy(s.source,e,s.damage*(e===impact?1:.72));
      ringEffect(impact.x,impact.y,s.area,s.color,.28);
      particleEffect(impact.x,impact.y,s.color,Math.min(15,5+Math.round(s.area*25)),s.area*.65);
    }else if(!impact.dead&&state.enemies.includes(impact)){
      attackEnemy(s.source,impact,s.damage);
      particleEffect(impact.x,impact.y,s.color,3,.025);
    }
    if(s.mode==='cluster'){
      for(const dir of [-1,1]){
        const p={x:impact.x+dir*.035,y:impact.y+dir*.025};
        for(const e of state.enemies)if(!e.dead&&dist(e,p)<=Math.min(.08,s.area*.6))
          attackEnemy(s.source,e,s.damage*.35);
        ringEffect(p.x,p.y,Math.min(.08,s.area*.6),s.color,.20);
      }
    }
    if(s.mode==='ricochet'||s.mode==='milk'){
      const next=state.enemies.filter(e=>!e.dead&&e!==impact&&dist(e,impact)<.14)
        .sort((a,b)=>dist(a,impact)-dist(b,impact))[0];
      if(next){attackEnemy(s.source,next,s.damage*.55);lineEffect(impact.x,impact.y,next.x,next.y,s.color,.12,2)}
    }
    if(s.mode==='firefield'||s.mode==='lavafield'){
      state.fields.push({x:impact.x,y:impact.y,radius:Math.min(.14,s.area||.085),life:s.mode==='lavafield'?5.4:3.5,
        clock:.2,damage:s.damage*.13,source:s.source});
    }
    s.dead=true;return;
  }
  s.x+=dx/d*mv;s.y+=dy/d*mv;
  s.travel=(s.travel||0)+mv;
}

function barrierEffects(){
  const barriers=state.towers.filter(t=>t.def.role==='barrier').map(t=>({t,s:effectiveStats(t)}));
  if(!barriers.length)return;
  for(const e of state.enemies){if(e.dead)continue;for(const {t,s} of barriers){if(dist(e,t)<s.range*.84){e.slow=Math.min(e.slow,s.barrierSlow||.62);break}}}
}
function statusEffects(e,dt){
  e.freezeTime=Math.max(0,(e.freezeTime||0)-dt);
  e.stunTime=Math.max(0,(e.stunTime||0)-dt);
  e.danceTime=Math.max(0,(e.danceTime||0)-dt);
  e.sleepTime=Math.max(0,(e.sleepTime||0)-dt);
  if(e.bubbleTime>0){
    e.bubbleTime-=dt;
    if(e.bubbleTime<=0&&!e.dead){
      const damage=e.bubblePower||8;
      const radius=e.bubbleCombo?.10:.065;
      for(const other of state.enemies)if(!other.dead&&dist(e,other)<radius){
        if(e.bubbleSource)attackEnemy(e.bubbleSource,other,other===e?damage:damage*.45);
        if(e.bubbleCombo)other.pushBack=Math.max(other.pushBack,other.boss?.015:.035);
      }
      ringEffect(e.x,e.y,radius,'#b5f8f5',.40);
      floatEffect(e.x,e.y,'POP!','#59bdb2');
      e.bubbleSource=null;e.bubblePower=0;e.bubbleCombo=false;
    }
  }
  e.corrosionTime=Math.max(0,(e.corrosionTime||0)-dt);
  if(!e.corrosionTime)e.corrosion=0;
  if(e.burn>0){e.burn-=dt;e.hp-=e.burnDps*dt}
  if(e.poison>0){e.poison-=dt;e.hp-=e.poisonDps*dt}
  if(e.regen&&!e.dead&&e.poison<=0&&e.hp>0)e.hp=Math.min(e.maxHp,e.hp+e.regen*dt);
  if(e.hp<=0&&!e.dead)killEnemy(e);
}
function giveNextWaveWord(){
  // Preserve a word the player is already spelling instead of discarding it.
  if(state.selected.length||typedWord())return '';
  const maxLen=Math.min(9,5+state.wave);
  const pool=D.wordList.filter(w=>w.length>=5&&w.length<=maxLen&&!state.discovered.has(w)
    &&D.words[w].difficulty<=Math.min(9,4+Math.floor(state.wave/2))
    &&towerCost(D.words[w])<=state.ink);
  if(!pool.length)return '';
  const word=pool[(Math.random()*pool.length)|0];
  const letters=state.rack.slice();
  for(let i=0;i<word.length;i++)letters[i]=word[i];
  state.rack=letters.sort(()=>Math.random()-.5);
  state.selected=[];
  renderRack();updateComposer();
  return word;
}
function waveUpdate(dt){
  if(!state.inWave)return;
  state.waveTimer+=dt;
  while(state.spawnQueue.length&&state.spawnQueue[0].delay<=state.waveTimer){spawnEnemy(state.spawnQueue.shift().type)}
  if(!state.spawnQueue.length&&!state.enemies.some(e=>!e.dead)){
    state.inWave=false;state.ink+=8+state.wave*2;state.score+=100*state.wave;
    const banks=state.towers.filter(t=>t.stats.mode==='interest').length;
    if(banks){const interest=Math.min(10,Math.floor(state.ink*.025*Math.min(2,banks)));state.ink+=interest;if(interest)floatEffect(.5,.14,'BANK +'+interest+' INK','#83c962')}
    waveBtn.disabled=false;
    $('waveProgress').style.width='100%';
    if(state.wave>=8){endGame(true)}else{
      const bonusWord=giveNextWaveWord();
      waveBtn.textContent='WAVE '+(state.wave+1)+' 시작';
      const tip=state.ink>=80?'INK가 넉넉해요! 공격·제어 타워를 추가하세요. ':
        state.core<55?'CORE가 위험해요! HEAL·ICE로 방어선을 보강하세요. ':'';
      setStatus('WAVE '+state.wave+' 완료 · 다음 작전',tip+(bonusWord
        ?'새 단어 기회: '+bonusWord+' · '+D.words[bonusWord].meaning
        :(FOCUS_TIPS[currentStage().focus]||FOCUS_TIPS.normal)));
      beep(780,.16,'triangle',.045);
    }
  }
}

let previousInk=-1;
function useWordRush(){
  if(!state||!state.inWave||state.ended)return;
  const cost=rushCost();
  if(state.rushTime>0||state.rushCooldown>0||state.rushUses>=RUSH_LIMIT||state.ink<cost)return;
  state.ink-=cost;state.rushUses++;state.rushTime=RUSH_DURATION;state.rushCooldown=RUSH_COOLDOWN;
  state.towerRevision++;
  for(const t of state.towers)if((t.stats.damage||0)>0)t.pulse=.52;
  ringEffect(.5,.5,.34,'#ffd564',.62);
  floatEffect(.5,.29,'WORD RUSH!','#e9b34c');
  setStatus('WORD RUSH · '+RUSH_DURATION+'초','기본 단어 타워가 특히 강해져요. INK -'+cost);
  beep(690,.19,'triangle',.055);updateHud();updateComposer();
}
rushBtn.addEventListener('click',useWordRush);
function update(dt){
  if(!running||state.ended)return;
  const rushWasActive=state.rushTime>0;
  state.rushTime=Math.max(0,state.rushTime-dt);
  state.rushCooldown=Math.max(0,state.rushCooldown-dt);
  if(rushWasActive&&state.rushTime<=0)state.towerRevision++;
  state.elapsed+=dt;
  waveUpdate(dt);barrierEffects();
  for(const e of state.enemies){if(!e.dead){statusEffects(e,dt);moveEnemy(e,dt)}}
  updateTraps(dt);updateFields(dt);
  for(const t of state.towers)towerUpdate(t,dt);
  for(const s of state.shots)shotUpdate(s,dt);
  state.enemies=state.enemies.filter(e=>!e.dead);
  state.shots=state.shots.filter(s=>!s.dead);
  for(const ef of state.effects)ef.life-=dt;state.effects=state.effects.filter(e=>e.life>0);
  updateHud();
  if(state.inWave){
    const remaining=state.spawnQueue.length+state.enemies.length;
    const done=Math.max(0,state.totalSpawns-remaining);
    $('waveProgress').style.width=Math.round(done/Math.max(1,state.totalSpawns)*100)+'%';
  }
  if(previousInk!==Math.floor(state.ink)){previousInk=Math.floor(state.ink);if(!state.placing)updateComposer()}
}
function updateHud(){
  if(rushBtn){
    const active=state.inWave&&!state.ended;
    const label=state.rushTime>0?'WORD RUSH '+Math.ceil(state.rushTime)+'초':
      state.rushUses>=RUSH_LIMIT?'RUSH 사용 완료':
      state.rushCooldown>0?'RUSH 대기 '+Math.ceil(state.rushCooldown)+'초':
      'WORD RUSH · '+rushCost()+' INK';
    if(rushBtn.textContent!==label)rushBtn.textContent=label;
    rushBtn.disabled=!active||state.rushTime>0||state.rushCooldown>0||
      state.rushUses>=RUSH_LIMIT||state.ink<rushCost();
    if(state.rushTime>0)rushBtn.classList.add('active');else rushBtn.classList.remove('active');
  }
  const updates=[[coreText,Math.ceil(state.core)],[waveText,state.wave+' / 8'],
    [inkText,Math.floor(state.ink)],[scoreText,Math.floor(state.score)]];
  for(const [el,value] of updates)if(el.textContent!==String(value))el.textContent=String(value);
}
function endGame(win){
  state.ended=true;running=false;saveBest();
  if(win)saveUnlocked(Math.min(STAGES.length,activeStage+2));
  $('nextBtn').hidden=!win||activeStage>=STAGES.length-1;
  $('resultTitle').textContent=win?'SIEGE CLEARED!':'CORE LOST';
  $('resultLead').textContent=(win?'STAGE '+currentStage().number+' · '+currentStage().name+' 완료! 다음 스테이지가 열렸습니다.':'STAGE '+currentStage().number+' · '+currentStage().name+' · '+state.wave+' 웨이브까지 버텼습니다.');
  $('resultScore').textContent=Math.floor(state.score);$('resultUnique').textContent=state.unique.size;
  const longest=state.builtWords.slice().sort((a,b)=>b.length-a.length)[0]||'-';
  const hardest=state.builtWords.slice().sort((a,b)=>(D.words[b]?.difficulty||0)-(D.words[a]?.difficulty||0))[0]||'-';
  const hardestDifficulty=hardest==='-'?0:(D.words[hardest]?.difficulty||0);
  try{
    if(window.KidscadeGame?.result) KidscadeGame.result({
      scope:'run',
      status:'completed',
      outcome:win?'clear':'failed',
      score:Math.floor(state.score),
      scoreOptions:{unit:'points'},
      wave:state.wave,
      uniqueWords:state.unique.size,
      combosFound:state.discoveredCombos.size,
      longestWord:longest==='-'?'':longest,
      hardestWord:hardest==='-'?'':hardest,
      hardestDifficulty,
      core:Math.max(0,Math.ceil(state.core))
    });
  }catch(e){}
  $('resultLongest').textContent=longest;$('resultHardest').textContent=hardest;$('resultCombos').textContent=state.discoveredCombos.size;resultOverlay.classList.remove('hidden');beep(win?900:130,.35,win?'triangle':'sawtooth',.06)
}

function flashEffect(x,y,color,r){state.effects.push({type:'flash',x,y,color,r,life:.25,max:.25})}
function ringEffect(x,y,r,color,life=.2){state.effects.push({type:'ring',x,y,r,color,life,max:life})}
function lineEffect(x1,y1,x2,y2,color,life=.1,w=2){state.effects.push({type:'line',x1,y1,x2,y2,color,w,life,max:life})}
function floatEffect(x,y,text,color){state.effects.push({type:'text',x,y,text,color,life:.8,max:.8})}
function particleEffect(x,y,color,count=6,radius=.04){
  for(let i=0;i<count&&state.effects.length<180;i++){
    const a=i*Math.PI*2/count+state.elapsed*.3,energy=radius*(.62+(i%4)*.17);
    state.effects.push({type:'particle',x,y,dx:Math.cos(a)*energy,dy:Math.sin(a)*energy,
      color,life:.36+(i%3)*.08,max:.36+(i%3)*.08,size:2+i%3});
  }
}

function draw(){
  ctx.clearRect(0,0,W,H);
  drawGrid();drawPath();drawResources();drawFields();drawLinks();drawTowers();drawTraps();
  drawEnemies();drawShots();drawEffects();drawPlacement();
}
function px(x){return x*W}function py(y){return y*H}
function drawGrid(){
  const stage=currentStage(),colors=stage.colors;
  ctx.fillStyle=colors.background;ctx.fillRect(0,0,W,H);
  const s=Math.max(24,Math.min(W,H)/18);ctx.strokeStyle='rgba(60,60,65,.095)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=0;y<H;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.save();
  // Stage identity without characters or buildings: numeric markers and quiet geometry.
  ctx.strokeStyle=colors.accent;ctx.globalAlpha=.18;ctx.lineWidth=2;
  for(let i=0;i<9;i++){
    const x=((i*67+stage.number*31)%93)/100*W,y=((i*53+stage.number*19)%88)/100*H;
    const r=11+(i%3)*5;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    if(i%2){ctx.beginPath();ctx.moveTo(x-r*.6,y);ctx.lineTo(x+r*.6,y);ctx.stroke()}
  }
  ctx.globalAlpha=.24;ctx.fillStyle=colors.accent;ctx.textAlign='right';
  ctx.font='900 '+Math.min(54,Math.max(28,H*.10))+'px ui-monospace,monospace';
  ctx.fillText(String(stage.number).padStart(2,'0'),W-15,H-24);
  ctx.font='900 11px ui-monospace,monospace';ctx.fillText(stage.name,W-15,H-10);
  ctx.restore();
}
function drawPath(){
  const colors=currentStage().colors, lane=Math.max(30,Math.min(W,H)*.065);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  const trace=()=>{
    ctx.beginPath();ctx.moveTo(px(pathPts[0][0]),py(pathPts[0][1]));
    for(let i=1;i<pathPts.length;i++)ctx.lineTo(px(pathPts[i][0]),py(pathPts[i][1]));
  };
  ctx.strokeStyle='rgba(30,33,39,.14)';ctx.lineWidth=lane+6;trace();ctx.stroke();
  ctx.strokeStyle=colors.lane;ctx.lineWidth=lane;trace();ctx.stroke();
  ctx.strokeStyle=colors.accent;ctx.globalAlpha=.24;ctx.lineWidth=lane*.12;trace();ctx.stroke();
  ctx.globalAlpha=.9;ctx.strokeStyle='rgba(70,75,82,.35)';ctx.lineWidth=1.8;ctx.setLineDash([6,10]);trace();ctx.stroke();
  ctx.setLineDash([]);
  const end=pathPts[pathPts.length-1];const r=Math.max(10,Math.min(W,H)*.025);
  ctx.fillStyle='#263039';ctx.beginPath();ctx.arc(px(end[0]),py(end[1]),r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=colors.accent;ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#242932';ctx.font='900 10px sans-serif';ctx.textAlign='center';
  ctx.fillText('CORE',px(end[0])-r-17,py(end[1])-r-8);
  ctx.restore();
}
function drawResources(){
  for(const ore of state.resources){
    if(ore.amount<=0)continue;
    const x=px(ore.x),y=py(ore.y),r=Math.max(12,Math.min(W,H)*ore.r),phase=state.elapsed;
    ctx.save();ctx.translate(x,y);
    ctx.shadowColor='rgba(34,93,48,.20)';ctx.shadowBlur=8;
    for(let i=0;i<5;i++){
      const a=i*2.4,rad=r*(i===0?.05:.45),xx=Math.cos(a)*rad,yy=Math.sin(a)*rad;
      const size=r*(i===0?.42:.23);
      ctx.fillStyle=i%2?'#67b962':'#85d78f';ctx.beginPath();
      ctx.moveTo(xx,yy-size);ctx.lineTo(xx+size*.65,yy);ctx.lineTo(xx,yy+size);ctx.lineTo(xx-size*.65,yy);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#3a8756';ctx.lineWidth=1;ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.globalAlpha=.55+.4*Math.sin(phase*1.7+ore.x*13);
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-r*.22,-r*.48,1.8,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle='#1e4c34';ctx.font='900 10px sans-serif';
    ctx.textAlign='center';ctx.fillText(Math.ceil(ore.amount),0,r*.85);ctx.restore();
  }
}
function drawLinks(){
  ctx.save();ctx.lineWidth=2;ctx.setLineDash([4,5]);
  for(const t of state.towers){
    for(const m of t.links){ctx.strokeStyle=m.def.color+'99';ctx.beginPath();ctx.moveTo(px(m.x),py(m.y));ctx.lineTo(px(t.x),py(t.y));ctx.stroke()}
    for(const combo of t.combos||[]){
      const other=combo.peer;
      if(!other||t.id>other.id)continue;
      ctx.save();ctx.setLineDash([]);ctx.strokeStyle='#f0a52e';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(px(other.x),py(other.y));ctx.lineTo(px(t.x),py(t.y));ctx.stroke();
      const pulse=(state.elapsed*.6+t.id*.17)%1;
      ctx.fillStyle='#fff9ce';ctx.beginPath();
      ctx.arc(px(other.x+(t.x-other.x)*pulse),py(other.y+(t.y-other.y)*pulse),3.2,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
function towerRadius(t){return Math.max(21,Math.min(W,H)*(.0305+t.def.difficulty*.00165))}
function drawFields(){
  for(const field of state.fields){
    const color=field.kind==='poison'?'#96c94b':field.kind==='slow'?
      (field.source.stats.mode==='raincloud'?'#7fb1db':'#71b998'):'#f36c32';
    const x=px(field.x),y=py(field.y);
    ctx.save();ctx.globalAlpha=.16;ctx.fillStyle=color;
    ctx.beginPath();ctx.ellipse(x,y,field.radius*W,field.radius*H,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.46;ctx.strokeStyle=color;ctx.lineWidth=2.5;
    ctx.setLineDash(field.kind==='poison'?[2,7]:field.kind==='slow'?[5,5]:[]);
    ctx.beginPath();ctx.ellipse(x,y,field.radius*W,field.radius*H,0,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
    if(field.kind==='poison'){
      ctx.fillStyle=color;ctx.globalAlpha=.57;
      for(let i=0;i<5;i++){const a=i*2.4+state.elapsed*.8;
        ctx.beginPath();ctx.arc(x+Math.cos(a)*field.radius*W*.65,y+Math.sin(a)*field.radius*H*.65,2.6,0,Math.PI*2);ctx.fill()}
    }
    ctx.restore();
  }
}
function drawTraps(){
  for(const trap of state.traps){
    const x=px(trap.x),y=py(trap.y),r=Math.max(5,Math.min(W,H)*.012);
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#43414a';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffdc77';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r*.65,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=Math.sin(state.elapsed*5)>0?'#f26947':'#e5b347';
    ctx.fillRect(-2,-2,4,4);ctx.restore();
  }
}
function drawTowers(){
  const drawnLabels=[];
  for(const t of state.towers){
    const x=px(t.x),y=py(t.y),r=towerRadius(t);ctx.save();ctx.translate(x,y);
    if(V)V.drawTower(ctx,t,r,state.elapsed);
    else{
      ctx.shadowColor='rgba(0,0,0,.22)';ctx.shadowBlur=8;ctx.shadowOffsetY=5;
      ctx.fillStyle=t.def.color;ctx.fillRect(-r*.55,-r*.76,r*1.1,r*1.34);
      ctx.shadowColor='transparent';ctx.fillStyle='#1e2228';ctx.font='1000 '+Math.max(15,r*.72)+'px sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.word[0],0,-r*.12);
    }
    // Full tower names are visible in the inspector. On compact screens the
    // field label must not conceal neighboring towers and enemies.
    const compact=W<710||H<295;
    const label=compact&&t.word.length>6?t.word.slice(0,5)+'…':t.word;
    const fontSize=compact?9:Math.max(10,Math.min(12,r*.36));
    ctx.font='900 '+fontSize+'px ui-monospace,monospace';
    const tw=Math.max(r*1.45,ctx.measureText(label).width+11),th=fontSize+8;
    let labelY=r*.48;
    const collisionAt=ly=>drawnLabels.some(v=>
      Math.abs(v.cx-x)<(v.w+tw)*.5+2&&Math.abs(v.cy-(y+ly+th*.5))<(v.h+th)*.5+2);
    if(collisionAt(labelY))labelY=-r*.85-th;
    if(!collisionAt(labelY)&&y+labelY>0&&y+labelY+th<H){
      ctx.fillStyle='#fffdf2';ctx.strokeStyle='rgba(30,34,40,.22)';ctx.lineWidth=1;
      roundRect(ctx,-tw/2,labelY,tw,th,4,true,true);
      ctx.fillStyle='#25272c';ctx.fillText(label,0,labelY+th*.52);
      drawnLabels.push({cx:x,cy:y+labelY+th*.5,w:tw,h:th});
    }
    if(t.pulse>0){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*(1.05+t.pulse),0,Math.PI*2);ctx.stroke()}
    ctx.restore();
  }
}
function drawEnemies(){
  for(const e of state.enemies){const x=px(e.x),y=py(e.y),r=Math.max(6,Math.min(W,H)*e.r);ctx.save();ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,.16)';ctx.beginPath();ctx.ellipse(2,r*.65,r*1.15,r*.45,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=e.color;ctx.rotate(enemyProgress(e)*.12);ctx.fillRect(-r,-r,r*2,r*2);ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(-r*.65,-r*.65,r*.55,r*.55);ctx.restore();
    const bw=Math.max(18,r*2.1);ctx.fillStyle='#5f504c';ctx.fillRect(x-bw/2,y-r-7,bw,3);ctx.fillStyle=e.boss?'#ff4c5e':'#53bd64';ctx.fillRect(x-bw/2,y-r-7,bw*Math.max(0,e.hp/e.maxHp),3);
    if(e.boss){
      ctx.save();ctx.font='900 '+Math.max(9,r*.55)+'px system-ui,sans-serif';
      ctx.textAlign='center';
      const open=e.unstoppableTime>0;
      ctx.fillStyle=open?'#ffd073':'#c8d5e3';
      ctx.fillText(open?'BREAK! +38%':'RESOLVE '+Math.round(Math.min(100,(e.controlPressure||0)/1.85*100))+'%',x,y-r-14);
      ctx.restore();
    }
    if(e.shield>0){ctx.strokeStyle='#4ca7e8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*1.35,0,Math.PI*2);ctx.stroke()}
    if(e.armor){ctx.strokeStyle='#b6bdc9';ctx.lineWidth=3;ctx.strokeRect(x-r*1.12,y-r*1.12,r*2.24,r*2.24)}
    if(e.regen){ctx.fillStyle='#b2ffd6';ctx.font='900 11px sans-serif';ctx.fillText('+',x,y+3)}
    // Small, consistent combat-status pips make elemental combinations visible
    // without covering the route with floating text.
    const statuses=[
      e.freezeTime>0?'#c0f4ff':e.slow<.79?'#7cd4ff':null,
      e.burn>0?'#ff8d43':null,
      e.poison>0?'#98d65d':null,
      e.corrosion>0?'#e7d36b':null
    ].filter(Boolean);
    if(statuses.length){
      ctx.save();
      statuses.forEach((color,index)=>{
        const xx=x+(index-(statuses.length-1)/2)*6;
        ctx.fillStyle='#25303b';ctx.beginPath();ctx.arc(xx,y+r+6,3.6,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(xx,y+r+6,2.6,0,Math.PI*2);ctx.fill();
      });
      ctx.restore();
    }
    if(e.bubbleTime>0){
      ctx.save();ctx.strokeStyle='#9ae9e9';ctx.fillStyle='rgba(190,255,252,.17)';
      ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,r*1.8,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-r*.58,y-r*.60,Math.max(2,r*.21),0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    if(e.danceTime>0||e.sleepTime>0){
      ctx.save();ctx.fillStyle=e.danceTime>0?'#bf64d9':'#9b91df';
      ctx.font='900 '+Math.max(13,r*1.2)+'px system-ui,sans-serif';
      ctx.textAlign='center';ctx.fillText(e.danceTime>0?'♫':'Z',x+r*1.3,y-r*1.1);ctx.restore();
    }
    if(e.freezeTime>0){
      ctx.save();ctx.strokeStyle='#b4f0ff';ctx.lineWidth=2.2;
      ctx.strokeRect(x-r*1.42,y-r*1.42,r*2.84,r*2.84);ctx.restore();
    }
  }
}
function drawShots(){
  for(const shot of state.shots){
    if((shot.mode==='nuke'||shot.mode==='meteor')&&shot.delay>0){
      const x=px(shot.point.x),y=py(shot.point.y),r=Math.max(12,shot.area*Math.min(W,H));
      ctx.save();
      ctx.strokeStyle=shot.mode==='nuke'?'#fb5f47':'#ec9955';ctx.lineWidth=3;
      ctx.globalAlpha=.45+.35*Math.sin(state.elapsed*9);
      ctx.beginPath();ctx.ellipse(x,y,shot.area*W,shot.area*H,0,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-r*.5,y);ctx.lineTo(x+r*.5,y);
      ctx.moveTo(x,y-r*.5);ctx.lineTo(x,y+r*.5);ctx.stroke();
      if(shot.mode==='meteor'){
        ctx.fillStyle='#f7b451';ctx.beginPath();
        ctx.arc(x+shot.delay*25,y-shot.delay*100,Math.max(6,r*.11),0,Math.PI*2);ctx.fill();
      }
      ctx.restore();continue;
    }
    if(V)V.drawShot(ctx,shot,W,H,state.elapsed);
    else{ctx.fillStyle=shot.color;ctx.beginPath();ctx.arc(px(shot.x),py(shot.y),4,0,Math.PI*2);ctx.fill()}
  }
}
function drawEffects(){
  for(const e of state.effects){
    const a=e.life/e.max;ctx.save();ctx.globalAlpha=Math.min(1,a*1.25);
    if(e.type==='flash'){
      ctx.shadowColor=e.color;ctx.shadowBlur=8;ctx.fillStyle=e.color;ctx.beginPath();
      ctx.arc(px(e.x),py(e.y),Math.max(5,Math.min(W,H)*e.r*(1.2-a*.2)),0,Math.PI*2);ctx.fill();
    }
    if(e.type==='ring'){
      ctx.strokeStyle=e.color;ctx.lineWidth=2+a*3;ctx.shadowColor=e.color;ctx.shadowBlur=9;
      ctx.beginPath();ctx.ellipse(px(e.x),py(e.y),W*e.r*(1+(1-a)*.25),H*e.r*(1+(1-a)*.25),0,0,Math.PI*2);ctx.stroke();
    }
    if(e.type==='line'){
      ctx.strokeStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=10;ctx.lineWidth=(e.w||2)*3;
      ctx.beginPath();ctx.moveTo(px(e.x1),py(e.y1));ctx.lineTo(px(e.x2),py(e.y2));ctx.stroke();
      ctx.shadowBlur=0;ctx.lineWidth=Math.max(1,(e.w||2)*.72);ctx.strokeStyle='#fff4d1';ctx.stroke();
    }
    if(e.type==='particle'){
      const d=1-a,xx=px(e.x+e.dx*d),yy=py(e.y+e.dy*d);
      ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(xx,yy,Math.max(.5,e.size*a),0,Math.PI*2);ctx.fill();
    }
    if(e.type==='banner'){
      const font=Math.min(58,Math.max(24,H*.13));
      ctx.globalAlpha=Math.min(1,a*3);
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='1000 '+font+'px system-ui,sans-serif';
      ctx.lineWidth=5;ctx.strokeStyle='rgba(25,29,38,.55)';
      ctx.strokeText(e.text,W*.5,H*.40-14*(1-a));
      ctx.fillStyle=e.color;ctx.fillText(e.text,W*.5,H*.40-14*(1-a));
    }
    if(e.type==='text'){
      ctx.fillStyle=e.color;ctx.font='900 12px sans-serif';ctx.textAlign='center';
      ctx.fillText(e.text,px(e.x),py(e.y)-(1-a)*28);
    }
    ctx.restore();
  }
}
function drawPlacement(){
  if(!state.placing||!state.hover)return;const p=state.hover,ok=validPlacement(p)&&rolePlacementValid(p,state.placing.def,state.placing.word),r=Math.max(20,Math.min(W,H)*.034);
  ctx.save();ctx.globalAlpha=.72;ctx.fillStyle=ok?state.placing.def.color:'#d34f58';ctx.fillRect(px(p.x)-r*.55,py(p.y)-r*.7,r*1.1,r*1.3);
  ctx.strokeStyle=ok?'#1aa59f':'#c33445';ctx.lineWidth=2;ctx.beginPath();{const range=makeTowerStats(state.placing.word,state.placing.def).range;ctx.ellipse(px(p.x),py(p.y),W*range,H*range,0,0,Math.PI*2)}ctx.stroke();ctx.restore();
}
function roundRect(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):(c.rect(x,y,w,h));if(fill)c.fill();if(stroke)c.stroke()}

function upgradeCost(t){
  if(!t||(t.level||1)>=3)return Infinity;
  return Math.ceil(towerCost(t.def,t.word)*((t.level||1)===2?2.1:1.45));
}
function upgradeInspectedTower(){
  if(!state||state.ended)return;
  const t=state.towers.find(t=>t.id===state.inspectedTowerId);
  const price=upgradeCost(t);
  if(!t||state.ink<price){toast(t&&(t.level||1)>=3?'최대 레벨입니다':'강화할 INK가 부족해요');return}
  state.ink-=price;t.level=(t.level||1)+1;t.pulse=.55;
  state.towerRevision++;
  ringEffect(t.x,t.y,.06,'#ffdc76',.55);
  particleEffect(t.x,t.y,'#fff2a6',12,.09);
  floatEffect(t.x,t.y,'LEVEL '+t.level,'#ead04c');
  beep(850,.16,'triangle',.045);
  toast(t.word+' LV.'+t.level+' 강화!');
  inspectAt({x:t.x,y:t.y});updateHud();updateComposer();
}
inspectBox.addEventListener('click',event=>{
  if(event.target?.id==='towerUpgradeBtn')upgradeInspectedTower();
});
function inspectAt(p){
  const t=state.towers.map(t=>({t,d:dist(p,t)})).sort((a,b)=>a.d-b.d)[0];
  if(!t||t.d>.06){state.inspectedTowerId=null;inspectBox.classList.remove('show');return}
  state.inspectedTowerId=t.t.id;
  const s=effectiveStats(t.t),signature=D.signatures?.[t.t.word],behavior=D.behaviorFor(t.t.word);
  const price=upgradeCost(t.t);
  const detail='난도 '+('★'.repeat(t.t.def.difficulty))+' · INK '+towerCost(t.t.def)+
    (s.damage?' · DMG '+Math.round(s.damage):'')+(s.range?' · RANGE '+Math.round(s.range*100):'')+
    (t.t.links.length?' · LINK '+t.t.links.map(x=>x.word).join(', '):'')+
    (t.t.combos?.length?' · COMBO '+t.t.combos.map(x=>x.name).join(', '):'');
  inspectBox.innerHTML='<strong>'+escapeHtml(t.t.word)+' <span class="tower-level">LV.'+(t.t.level||1)+'</span></strong>'+
    '<small>'+escapeHtml(t.t.def.meaning)+' · '+escapeHtml(D.displayRole(t.t.word,t.t.def))+
    (behavior?.description?' · '+escapeHtml(behavior.description):(signature?.flavor?' · '+escapeHtml(signature.flavor):''))+
    '</small><div class="meter">'+escapeHtml(detail)+'</div>'+
    '<button type="button" class="tower-upgrade" id="towerUpgradeBtn" '+(!Number.isFinite(price)||state.ink<price?'disabled':'')+'>'+
    (Number.isFinite(price)?'타워 강화 · INK '+price:'최대 강화 완료')+'</button>';
  inspectBox.classList.add('show');
}
canvas.addEventListener('pointermove',e=>{if(!state)return;state.hover=boardPos(e)});
canvas.addEventListener('pointerleave',()=>{if(state)state.hover=null});
canvas.addEventListener('pointerdown',e=>{if(!state||state.ended)return;const p=boardPos(e);if(state.placing)buildTower(p);else inspectAt(p)});

function openDictionary(){
  const list=[...state.discovered].filter(w=>D.words[w]).sort();
  $('dictStats').textContent=list.length.toLocaleString()+' / '+(D.totalWords||D.wordList.length).toLocaleString()+' 단어 발견';
  $('dictList').innerHTML=list.length?list.map(w=>{const d=D.words[w],sig=D.signatures?.[w],behavior=D.behaviorFor(w);return '<div class="dict-item" style="--c:'+d.color+'"><b>'+escapeHtml(w)+'</b><span>'+escapeHtml(d.meaning)+' · '+escapeHtml(D.displayRole(w,d))+' · INK '+towerCost(d)+(behavior?.description?' · '+escapeHtml(behavior.description):(sig?.flavor?' · '+escapeHtml(sig.flavor):''))+'</span></div>'}).join(''):'<div class="empty">아직 발견한 단어가 없습니다.</div>';
  dictOverlay.classList.remove('hidden');
}
function restart(){
  prepareStage(selectedStage);
  state=freshState();previousInk=-1;if(freeWord){freeWord.value='';freeWord.disabled=false}renderRack();updateComposer();updateHud();
  waveBtn.textContent='WAVE 1 시작';waveBtn.disabled=false;updateHud();
  $('waveProgress').style.width='0%';
  inspectBox.classList.remove('show');resultOverlay.classList.add('hidden');
  startOverlay.classList.add('hidden');
  setStatus('STAGE '+currentStage().number+' · '+currentStage().name,
    'MINER와 ARROW로 시작하세요. 타워를 눌러 강화할 수 있어요. '+(FOCUS_TIPS[currentStage().focus]||FOCUS_TIPS.normal));
  running=true;last=performance.now();
}
function openStageSelect(){
  if(state?.inWave){toast('웨이브가 끝난 뒤 스테이지를 바꿀 수 있어요');return}
  running=false;selectedStage=activeStage;renderStages();
  $('stageClose').hidden=!state||state.ended;
  startOverlay.classList.remove('hidden');
}

if(freeWord)freeWord.addEventListener('input',()=>{
  const sanitized=String(freeWord.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,12);
  if(freeWord.value!==sanitized)freeWord.value=sanitized;
  if(sanitized&&state?.selected?.length){state.selected=[];renderRack()}
  if(state)updateComposer();
});
$('startBtn').addEventListener('click',()=>{restart();beep(660,.1,'triangle')});
$('stageBtn').addEventListener('click',openStageSelect);
$('stageClose').addEventListener('click',()=>{startOverlay.classList.add('hidden');running=!!state&&!state.ended;});
$('chooseBtn').addEventListener('click',()=>{resultOverlay.classList.add('hidden');openStageSelect()});
$('nextBtn').addEventListener('click',()=>{
  if(activeStage>=STAGES.length-1)return;
  selectedStage=activeStage+1;renderStages();restart();
});
$('retryBtn').addEventListener('click',restart);
waveBtn.addEventListener('click',startWave);buildBtn.addEventListener('click',beginPlacement);clearBtn.addEventListener('click',()=>{if(state.placing)cancelPlacement();clearSelection()});hintBtn.addEventListener('click',showHint);swapBtn.addEventListener('click',swapOne);
$('dictBtn').addEventListener('click',openDictionary);$('dictClose').addEventListener('click',()=>dictOverlay.classList.add('hidden'));
$('soundBtn').addEventListener('click',()=>{muted=!muted;$('soundBtn').textContent=muted?'🔇':'🔊';if(!muted)beep(520)});
window.addEventListener('keydown',e=>{
  if(!state||state.ended||e.target===freeWord||!dictOverlay.classList.contains('hidden')||!startOverlay.classList.contains('hidden'))return;
  const k=e.key.toUpperCase();
  if(/^[A-Z]$/.test(k)&&!state.placing){const idx=state.rack.findIndex((c,i)=>c===k&&!state.selected.includes(i));if(idx>=0){state.selected.push(idx);renderRack();updateComposer()}}
  else if(e.key==='Backspace'){state.selected.pop();renderRack();updateComposer();e.preventDefault()}
  else if(e.key==='Enter'){if(state.placing)cancelPlacement();else if(!buildBtn.disabled)beginPlacement()}
  else if(e.key==='Escape'){cancelPlacement();clearSelection()}
});

function loop(now){
  const dt=Math.min(.04,(now-last)/1000||0);last=now;if(state){update(dt);draw()}requestAnimationFrame(loop)
}
$('dictionaryTotal').textContent=(D.totalWords||D.wordList.length).toLocaleString();
renderStages();
resize();requestAnimationFrame(loop);
})();
