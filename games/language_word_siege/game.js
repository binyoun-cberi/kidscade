(function(){
'use strict';

const D=window.WordSiegeData;
if(!D) throw new Error('WordSiegeData missing');
const KS=window.KidscadeStorage||null;

const $=id=>document.getElementById(id);
const canvas=$('game'), ctx=canvas.getContext('2d');
const boardWrap=$('boardWrap'), rackEl=$('rack'), currentWordEl=$('currentWord'), wordMetaEl=$('wordMeta');
const waveBtn=$('waveBtn'), buildBtn=$('buildBtn'), clearBtn=$('clearBtn'), hintBtn=$('hintBtn'), swapBtn=$('swapBtn');
const coreText=$('coreText'), waveText=$('waveText'), inkText=$('inkText'), scoreText=$('scoreText');
const statusBox=$('statusBox'), inspectBox=$('inspectBox'), toastEl=$('toast'), freeWord=$('freeWord');
const startOverlay=$('startOverlay'), dictOverlay=$('dictOverlay'), resultOverlay=$('resultOverlay');
const STORAGE_DISC='kidscade_word_siege_discovered_v1', STORAGE_BEST='kidscade_word_siege_best_v1';
const STORAGE_STAGE='kidscade_word_siege_stage_v1';
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
  $('stageDetail').textContent=STAGES[selectedStage].description;
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
    core:100,wave:0,ink:20,score:0,inWave:false,waveTimer:0,spawnQueue:[],
    enemies:[],towers:[],shots:[],effects:[],rack:D.startRack.slice(0,D.maxRack),
    selected:[],placing:null,hover:null,uid:1,unique:new Set(),builtWords:[],elapsed:0,
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
  const legendary={NUKE:38,BLACKHOLE:30,SUPERNOVA:31,SINGULARITY:32,VOLCANO:18};
  const powerCost=legendary[word]||0;
  const direct=free?Math.max(3,Math.ceil(word.length/3)+Math.ceil(def.difficulty*.7)+1):0;
  return Math.max(baseline,powerCost)+direct;
}
function updateComposer(){
  const w=tileWord(),free=!!typedWord();currentWordEl.textContent=w||'_';
  const def=D.words[w];
  if(!w){const n=availableWords().length;wordMetaEl.textContent=n?'현재 만들 수 있는 단어 '+n+'개':'글자를 골라보세요'}
  else if(def){
    const cost=towerCost(def,w,free),sig=D.signatures?.[w],affordable=state.ink>=cost;
    wordMetaEl.textContent=def.meaning+' · '+def.roleLabel+' · INK '+cost+
      (affordable?'':' (부족)')+(sig?.flavor?' · '+sig.flavor:'');
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
  const towerHalfWidth=Math.max(19,unit*.034)*.55;
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
  if(word==='NUKE'){stats.damage*=2.6;stats.area=.22;stats.rate=.12}
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
  return stats;
}
function rolePlacementValid(p,def,word){
  const s=makeTowerStats(word||def.word,def);
  if(def.role==='resource')return state.resources.some(r=>r.amount>0&&dist(p,r)<=s.range);
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
  const tower={id:state.uid++,x:p.x,y:p.y,word,def,stats,cool:Math.random()*.3,harvestClock:0,links:[],pulse:0};
  state.towers.push(tower); state.unique.add(word); state.builtWords.push(word);
  ringEffect(p.x,p.y,.05,def.color,.36);
  if(V)particleEffect(p.x,p.y,def.color,9,.05);
  const newly=!state.discovered.has(word);state.discovered.add(word);saveDiscovered();
  consumeSelected(fromTyping);state.placing=null;if(freeWord)freeWord.disabled=false;
  applyLinks();setStatus('배치 완료 · '+word,(newly?'새 단어 발견! ':'')+def.meaning+' · '+def.roleLabel);
  if(newly){state.score+=80+def.difficulty*20;state.ink+=2;toast('NEW WORD · '+word+' · '+def.meaning+' · INK +2');beep(880,.12,'triangle',.05)} else beep(640,.08,'square');
  updateHud();updateComposer();
}

function effectiveStats(t){
  // Links and duplicates change only when a tower is constructed.
  if(t._effectiveRevision===state.towerRevision)return t._effectiveStats;
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
  const duplicates=state.towers.filter(o=>o!==t&&o.word===t.word).length;
  if(s.damage)s.damage*=Math.max(.65,Math.pow(.93,duplicates));
  t._effectiveStats=s;t._effectiveRevision=state.towerRevision;
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
  const count=7+n*4+Math.floor(activeStage/3)*2;
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
    arr.push({delay:i*(Math.max(.30,.78-n*.045)-(focus==='swarm'?.09:0)),type});
  }
  if(n===8)arr.push({delay:Math.max(arr[arr.length-1]?.delay||0, count*.42)+1.1,type:'boss'});
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
  state.effects.push({type:'banner',text:'WAVE '+state.wave,x:.5,y:.38,color:currentStage().colors.accent,life:1.1,max:1.1});
  waveBtn.disabled=true;waveBtn.textContent='WAVE '+state.wave+' 진행 중';setStatus('WAVE '+state.wave,'적이 CORE를 향해 이동합니다. 전투 중에도 타워를 만들 수 있어요.');
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
  const hp=Math.round(a.hp*hpScale*currentStage().multiplier);
  const e={id:state.uid++,type,hp,maxHp:hp,speed:a.speed*(1+stage*balance.speedGrowth),
    r:a.r,damage:Math.round(a.damage*(1+stage*.065)),color:a.color,
    shield:Math.round((a.shield||0)*hpScale),armor:a.armor||0,regen:a.regen||0,
    split:a.split||false,boss:a.boss||false,pathIndex:0,pathT:0,x:pathPts[0][0],y:pathPts[0][1],
    burn:0,burnDps:0,poison:0,poisonDps:0,slow:1,pushBack:0,dead:false};
  state.enemies.push(e);
}
function enemyProgress(e){return e.pathIndex+e.pathT}
function moveEnemy(e,dt){
  if(e.dead)return;
  e.slow+=(1-e.slow)*Math.min(1,dt*1.7);
  let step=e.speed*e.slow*dt;
  if(e.pushBack>0){step-=e.pushBack;e.pushBack=0}
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
    const multiplier=tower?.stats.shieldBreak||1;
    const used=Math.min(e.shield,amount*multiplier);
    e.shield-=used;amount-=used/multiplier;
  }
  const effectiveArmor=e.armor*(tower?.def.role==='pierce'?.28:1);
  e.hp-=Math.max(0,amount)*(1-effectiveArmor);
  if(kind==='burn'){e.burn=2.8;e.burnDps=Math.max(e.burnDps,(tower?.stats.burn||7)+(tower?.def.difficulty||1))}
  if(kind==='poison'){e.poison=4.5;e.poisonDps=Math.max(e.poisonDps,(tower?.stats.poison||6)+(tower?.def.difficulty||1))}
  if(kind==='slow')e.slow=Math.min(e.slow,tower?.stats.slow||.52);
  if(kind==='push')e.pushBack=Math.max(e.pushBack,(tower?.stats.push||.045)*.75);
  if(e.hp<=0)killEnemy(e);
}
function killEnemy(e){
  if(e.dead)return;e.dead=true;state.score+=e.boss?800:18+state.wave*2;state.ink+=e.boss?20:((e.armor||e.regen||e.shield)?2:1);
  flashEffect(e.x,e.y,e.color,e.boss ? .09 : .045);
  particleEffect(e.x,e.y,e.color,e.boss?14:4,e.boss?.10:.032);
  if(e.split&&!e.boss){for(let i=0;i<2;i++){const c={...e,id:state.uid++,type:'normal',hp:20,maxHp:20,speed:.095,r:.008,damage:3,color:'#2f3035',split:false,dead:false,pathT:Math.max(0,e.pathT-i*.025)};state.enemies.push(c)}}
}

function towerUpdate(t,dt){
  const s=effectiveStats(t);t.pulse=Math.max(0,t.pulse-dt);
  if(t.def.role==='resource'){
    if(!state.inWave)return;
    t.harvestClock+=dt; if(t.harvestClock>=2.3){t.harvestClock=0;const node=state.resources.filter(r=>r.amount>0&&dist(t,r)<=s.range).sort((a,b)=>dist(t,a)-dist(t,b))[0];if(node){const amt=Math.min(node.amount,Math.max(1,Math.round((s.harvest||3)*(1+t.def.difficulty*.08))));node.amount-=amt;state.ink+=amt;state.score+=amt*2;t.pulse=.35;floatEffect(t.x,t.y,'+'+amt+' INK','#4b9f38')}}
    return;
  }
  if(t.def.role==='repair'){if(!state.inWave)return;t.harvestClock+=dt;if(t.harvestClock>2.5){t.harvestClock=0;state.core=Math.min(100,state.core+(s.heal||2));t.pulse=.3}return}
  if(t.def.role==='modifier'||s.rate<=0)return;
  t.cool-=dt;if(t.cool>0)return;
  const targets=state.enemies.filter(e=>!e.dead&&dist(t,e)<=s.range).sort((a,b)=>enemyProgress(b)-enemyProgress(a));
  if(!targets.length)return;
  const target=targets[0];t.cool=1/s.rate;t.pulse=.24;
  if(t.def.role==='explosive'||t.def.role==='burst')ringEffect(t.x,t.y,.025,t.def.color,.13);
  const linkedElement=s.element||(t.links.find(m=>['burn','slow','poison'].includes(m.def.role))||{}).def?.role||'';
  if(s.beam||t.def.role==='pierce'||t.def.role==='push'||t.def.role==='gravity'){
    if(t.def.role==='pierce'){
      const ang=Math.atan2(target.y-t.y,target.x-t.x);let hit=0;
      for(const e of targets){const dx=e.x-t.x,dy=e.y-t.y;const along=dx*Math.cos(ang)+dy*Math.sin(ang),perp=Math.abs(-dx*Math.sin(ang)+dy*Math.cos(ang));if(along>0&&perp<.025){damageEnemy(e,s.damage,linkedElement,t);hit++;if(hit>=4)break}}
      lineEffect(t.x,t.y,target.x,target.y,t.def.color,.12,2);
    }else if(t.def.role==='push'){
      const impacted=s.area?targets.filter(e=>dist(e,target)<=s.area):[target];
      for(const e of impacted){damageEnemy(e,s.damage,e===target?'push':(linkedElement||'push'),t);if(linkedElement&&linkedElement!=='push')damageEnemy(e,0,linkedElement,t)}
      lineEffect(t.x,t.y,target.x,target.y,t.def.color,.14,2);
      if(s.area)ringEffect(target.x,target.y,s.area,t.def.color,.2);
    }else if(t.def.role==='gravity'){
      for(const e of targets.filter(e=>dist(t,e)<=s.area)) {damageEnemy(e,s.damage,linkedElement,t);e.pushBack=Math.max(e.pushBack,(s.pull||.032)*.55)}
      ringEffect(t.x,t.y,s.area,t.def.color,.18);
    }else{
      damageEnemy(target,s.damage,linkedElement||(['burn','slow','poison'].includes(t.def.role)?t.def.role:''),t);lineEffect(t.x,t.y,target.x,target.y,t.def.color,.09,3);
      const chained=targets.slice(1,1+Math.min(4,s.chain||0));
      let previous=target;
      chained.forEach((next,i)=>{damageEnemy(next,s.damage*Math.pow(.58,i+1),linkedElement,t);lineEffect(previous.x,previous.y,next.x,next.y,t.def.color,.08,2);previous=next});
    }
  }else{
    state.shots.push({x:t.x,y:t.y,target,damage:s.damage,speed:s.projectileSpeed||.55,color:t.def.color,area:s.area||0,kind:(linkedElement||t.def.role),source:t,dead:false});
  }
}
function shotUpdate(s,dt){
  if(s.dead||!s.target||s.target.dead){s.dead=true;return}
  const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy),mv=s.speed*dt;
  if(d<=mv+.008){
    if(s.area>0){
      for(const e of state.enemies)if(!e.dead&&dist(e,s.target)<=s.area)damageEnemy(e,s.damage*(e===s.target?1:.72),s.kind,s.source);
      ringEffect(s.target.x,s.target.y,s.area,s.color,.28);
      particleEffect(s.target.x,s.target.y,s.color,Math.min(15,5+Math.round(s.area*25)),s.area*.65);
    }
    else{
      damageEnemy(s.target,s.damage,s.kind,s.source);
      particleEffect(s.target.x,s.target.y,s.color,3,.025);
    }
    s.dead=true;return;
  }
  s.x+=dx/d*mv;s.y+=dy/d*mv;
}

function barrierEffects(){
  const barriers=state.towers.filter(t=>t.def.role==='barrier').map(t=>({t,s:effectiveStats(t)}));
  if(!barriers.length)return;
  for(const e of state.enemies){if(e.dead)continue;for(const {t,s} of barriers){if(dist(e,t)<s.range*.84){e.slow=Math.min(e.slow,s.barrierSlow||.62);break}}}
}
function statusEffects(e,dt){
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
    state.inWave=false;state.ink+=8+state.wave*2;state.score+=100*state.wave;waveBtn.disabled=false;
    $('waveProgress').style.width='100%';
    if(state.wave>=8){endGame(true)}else{
      const bonusWord=giveNextWaveWord();
      waveBtn.textContent='WAVE '+(state.wave+1)+' 시작';
      setStatus('WAVE '+state.wave+' 완료 · INK 획득',bonusWord
        ?'새 단어 기회! '+D.words[bonusWord].meaning+' · '+bonusWord[0]+'로 시작하는 '+bonusWord.length+'글자를 찾아보세요.'
        :'INK 보너스를 받았습니다. 다음 웨이브 전까지 단어를 준비하세요.');
      beep(780,.16,'triangle',.045);
    }
  }
}

let previousInk=-1;
function update(dt){
  if(!running||state.ended)return;
  state.elapsed+=dt;
  waveUpdate(dt);barrierEffects();
  for(const e of state.enemies){if(!e.dead){statusEffects(e,dt);moveEnemy(e,dt)}}
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
  drawGrid();drawPath();drawResources();drawLinks();drawTowers();
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
function towerRadius(t){return Math.max(19,Math.min(W,H)*(.029+t.def.difficulty*.0015))}
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
    if(e.shield>0){ctx.strokeStyle='#4ca7e8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*1.35,0,Math.PI*2);ctx.stroke()}
    if(e.armor){ctx.strokeStyle='#b6bdc9';ctx.lineWidth=3;ctx.strokeRect(x-r*1.12,y-r*1.12,r*2.24,r*2.24)}
    if(e.regen){ctx.fillStyle='#b2ffd6';ctx.font='900 11px sans-serif';ctx.fillText('+',x,y+3)}
  }
}
function drawShots(){
  for(const shot of state.shots){
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

function inspectAt(p){
  const t=state.towers.map(t=>({t,d:dist(p,t)})).sort((a,b)=>a.d-b.d)[0];
  if(!t||t.d>.06){inspectBox.classList.remove('show');return}
  const s=effectiveStats(t.t),signature=D.signatures?.[t.t.word];inspectBox.innerHTML='<strong>'+escapeHtml(t.t.word)+'</strong><small>'+escapeHtml(t.t.def.meaning)+' · '+escapeHtml(t.t.def.roleLabel)+(signature?.flavor?' · '+escapeHtml(signature.flavor):'')+'</small><div class="meter">난도 '+('★'.repeat(t.t.def.difficulty))+' · INK '+towerCost(t.t.def)+(s.damage?' · DMG '+Math.round(s.damage):'')+(s.range?' · RANGE '+Math.round(s.range*100):'')+(t.t.links.length?' · LINK '+t.t.links.map(x=>x.word).join(', '):'')+(t.t.combos?.length?' · COMBO '+t.t.combos.map(x=>x.name).join(', '):'')+'</div>';inspectBox.classList.add('show');
}
canvas.addEventListener('pointermove',e=>{if(!state)return;state.hover=boardPos(e)});
canvas.addEventListener('pointerleave',()=>{if(state)state.hover=null});
canvas.addEventListener('pointerdown',e=>{if(!state||state.ended)return;const p=boardPos(e);if(state.placing)buildTower(p);else inspectAt(p)});

function openDictionary(){
  const list=[...state.discovered].filter(w=>D.words[w]).sort();
  $('dictStats').textContent=list.length.toLocaleString()+' / '+(D.totalWords||D.wordList.length).toLocaleString()+' 단어 발견';
  $('dictList').innerHTML=list.length?list.map(w=>{const d=D.words[w],sig=D.signatures?.[w];return '<div class="dict-item" style="--c:'+d.color+'"><b>'+escapeHtml(w)+'</b><span>'+escapeHtml(d.meaning)+' · '+escapeHtml(d.roleLabel)+' · INK '+towerCost(d)+(sig?.flavor?' · '+escapeHtml(sig.flavor):'')+'</span></div>'}).join(''):'<div class="empty">아직 발견한 단어가 없습니다.</div>';
  dictOverlay.classList.remove('hidden');
}
function restart(){
  prepareStage(selectedStage);
  state=freshState();previousInk=-1;if(freeWord){freeWord.value='';freeWord.disabled=false}renderRack();updateComposer();updateHud();
  waveBtn.textContent='WAVE 1 시작';waveBtn.disabled=false;
  $('waveProgress').style.width='0%';
  inspectBox.classList.remove('show');resultOverlay.classList.add('hidden');
  startOverlay.classList.add('hidden');
  setStatus('STAGE '+currentStage().number+' · '+currentStage().name,
    '시작 글자에는 MINER와 ARROW가 있어요. '+currentStage().description);
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
