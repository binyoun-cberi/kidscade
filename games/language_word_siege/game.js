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
const statusBox=$('statusBox'), inspectBox=$('inspectBox'), toastEl=$('toast');
const startOverlay=$('startOverlay'), dictOverlay=$('dictOverlay'), resultOverlay=$('resultOverlay');
const STORAGE_DISC='kidscade_word_siege_discovered_v1', STORAGE_BEST='kidscade_word_siege_best_v1';

let W=1000,H=600,dpr=1,last=performance.now(),running=false,muted=false;
let state=null, audioCtx=null;

const pathPts=[
  [0.02,.28],[.16,.28],[.16,.61],[.31,.61],[.31,.40],[.47,.40],[.47,.72],[.64,.72],[.64,.31],[.80,.31],[.80,.57],[.98,.57]
];
const resourceSpots=[{x:.22,y:.18,r:.045},{x:.54,y:.18,r:.046},{x:.72,y:.78,r:.05}];

function freshState(){
  return {
    core:100,wave:0,ink:20,score:0,inWave:false,waveTimer:0,spawnQueue:[],
    enemies:[],towers:[],shots:[],effects:[],rack:D.startRack.slice(0,D.maxRack),
    selected:[],placing:null,hover:null,uid:1,unique:new Set(),builtWords:[],
    resources:resourceSpots.map((s,i)=>({...s,amount:70+i*20})),
    discovered:new Set(loadDiscovered()), discoveredCombos:new Set(), ended:false
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
  W=Math.max(320,r.width); H=Math.max(260,r.height);
  canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize);

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
function setStatus(title,text){statusBox.innerHTML='<b>'+title+'</b><div>'+text+'</div>'}

function tileWord(){
  return state.selected.map(i=>state.rack[i]).join('');
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
function towerCost(def){
  return (def.role==='resource'?5:def.role==='modifier'?6:def.role==='repair'?7:6)
    +Math.ceil(def.difficulty*.75)+(def.role==='special'?3:0);
}
function updateComposer(){
  const w=tileWord();currentWordEl.textContent=w||'_';
  const def=D.words[w];
  if(!w){const n=availableWords().length;wordMetaEl.textContent=n?'현재 만들 수 있는 단어 '+n+'개':'글자를 골라보세요'}
  else if(def){
    const cost=towerCost(def),sig=D.signatures?.[w],affordable=state.ink>=cost;
    wordMetaEl.innerHTML=def.meaning+' · '+def.roleLabel+'<br>INK '+cost+(affordable?'':' · 부족')+(sig?.flavor?' · '+sig.flavor:'');
  }else wordMetaEl.textContent='등록되지 않은 단어';
  buildBtn.disabled=!def||!!state.placing||state.ink<towerCost(def);
}
function clearSelection(){state.selected=[];renderRack();updateComposer()}

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
function consumeSelected(){
  const sorted=state.selected.slice().sort((a,b)=>b-a);
  sorted.forEach(i=>state.rack.splice(i,1));state.selected=[];refillRack();renderRack();updateComposer();
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
  const w=tileWord(),def=D.words[w]; if(!def)return;
  if(state.ink<towerCost(def)){toast('건설할 INK가 부족해요');return}
  state.placing={word:w,def,indices:state.selected.slice()};
  setStatus('배치 중 · '+w,'건설 비용 INK '+towerCost(def)+' · '+(def.role==='resource'?'녹색 INK 광석 가까운 빈 공간을 누르세요.':'길 위가 아닌 빈 공간을 누르세요.'));
  buildBtn.disabled=true;beep(700,.07,'square');
}
function cancelPlacement(){state.placing=null;setStatus(state.inWave?'전투 중':'준비','글자를 눌러 단어를 만든 뒤 타워를 배치하세요.');updateComposer()}

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
function validPlacement(p){
  if(p.x<.045||p.x>.955||p.y<.06||p.y>.94)return false;
  if(minPathDistance(p)<.055)return false;
  if(state.towers.some(t=>dist(p,t)<.07))return false;
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
  const {word,def}=state.placing;
  if(!rolePlacementValid(p,def,word)){
    if(def.role==='resource'){toast('채굴 타워는 녹색 INK 광석 가까이에 놓아야 해요');setStatus('배치 위치 다시 선택','MINER·DRILL 같은 채굴 타워는 INK 광석이 범위 안에 있어야 합니다.')}
    else{toast('공격 범위가 적의 길에 닿아야 해요');setStatus('배치 위치 다시 선택','사거리 원이 적의 이동 경로에 닿도록 놓아주세요.')}
    return;
  }
  const cost=towerCost(def);
  if(state.ink<cost){toast('INK가 부족해요');return}
  const stats=makeTowerStats(word,def);
  state.ink-=cost;
  const tower={id:state.uid++,x:p.x,y:p.y,word,def,stats,cool:Math.random()*.3,harvestClock:0,links:[],pulse:0};
  state.towers.push(tower); state.unique.add(word); state.builtWords.push(word);
  const newly=!state.discovered.has(word);state.discovered.add(word);saveDiscovered();
  consumeSelected();state.placing=null;applyLinks();setStatus('배치 완료 · '+word,(newly?'새 단어 발견! ':'')+def.meaning+' · '+def.roleLabel);
  if(newly){state.score+=80+def.difficulty*20;state.ink+=2;toast('NEW WORD · '+word+' · '+def.meaning+' · INK +2');beep(880,.12,'triangle',.05)} else beep(640,.08,'square');
  updateHud();updateComposer();
}

function effectiveStats(t){
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
      if(a.combos.length<3)a.combos.push({with:b.word,name:combo.name,bonus:combo.bonus});
      if(b.combos.length<3)b.combos.push({with:a.word,name:combo.name,bonus:combo.bonus});
    }}
    if(paired&&!state.discoveredCombos.has(combo.name)){
      state.discoveredCombos.add(combo.name);state.score+=60;state.ink+=3;discovered.push(combo.name);
    }
  }
  if(discovered.length)toast('WORD COMBO · '+discovered.join(' / ')+' · INK +3');
  return discovered;
}

function createWave(n){
  const arr=[];const count=7+n*4;
  for(let i=0;i<count;i++){
    let type='normal';
    if(n>=2&&i%5===3)type='fast';
    if(n>=3&&i%7===5)type='heavy';
    if(n>=4&&i%9===6)type='armored';
    if(n>=5&&i%9===7)type='shield';
    if(n>=6&&i%11===9)type='split';
    if(n>=6&&i%13===11)type='regen';
    arr.push({delay:i*(Math.max(.34,.78-n*.045)),type});
  }
  if(n===8)arr.push({delay:count*.42+.7,type:'boss'});
  return arr;
}
function startWave(){
  if(state.inWave||state.ended)return;
  if(state.wave>=8)return;
  state.wave++;state.inWave=true;state.waveTimer=0;state.spawnQueue=createWave(state.wave);
  waveBtn.disabled=true;setStatus('WAVE '+state.wave,'적이 CORE를 향해 이동합니다. 전투 중에도 타워를 만들 수 있어요.');
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
  const hp=Math.round(a.hp*hpScale);
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
function reachCore(e){e.dead=true;state.core=Math.max(0,state.core-e.damage);flashEffect(.94,.57,'#ef5d67',.12);beep(120,.12,'sawtooth',.06);if(state.core<=0)endGame(false)}
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
  const target=targets[0];t.cool=1/s.rate;t.pulse=.12;
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
    if(s.area>0){for(const e of state.enemies)if(!e.dead&&dist(e,s.target)<=s.area)damageEnemy(e,s.damage*(e===s.target?1:.72),s.kind,s.source);ringEffect(s.target.x,s.target.y,s.area,s.color,.14)}
    else damageEnemy(s.target,s.damage,s.kind,s.source);
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
  waveUpdate(dt);barrierEffects();
  for(const e of state.enemies){if(!e.dead){statusEffects(e,dt);moveEnemy(e,dt)}}
  for(const t of state.towers)towerUpdate(t,dt);
  for(const s of state.shots)shotUpdate(s,dt);
  state.enemies=state.enemies.filter(e=>!e.dead);
  state.shots=state.shots.filter(s=>!s.dead);
  for(const ef of state.effects)ef.life-=dt;state.effects=state.effects.filter(e=>e.life>0);
  updateHud();
  if(previousInk!==Math.floor(state.ink)){previousInk=Math.floor(state.ink);if(!state.placing)updateComposer()}
}
function updateHud(){coreText.textContent=Math.ceil(state.core);waveText.textContent=state.wave+' / 8';inkText.textContent=Math.floor(state.ink);scoreText.textContent=Math.floor(state.score)}
function endGame(win){
  state.ended=true;running=false;saveBest();$('resultTitle').textContent=win?'SIEGE CLEARED!':'CORE LOST';
  $('resultLead').textContent=win?'8개의 웨이브를 모두 막았습니다.':'이번에는 '+state.wave+' 웨이브까지 버텼습니다.';
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

function draw(){
  ctx.clearRect(0,0,W,H);drawGrid();drawPath();drawResources();drawLinks();drawTowers();drawEnemies();drawShots();drawEffects();drawPlacement();
}
function px(x){return x*W}function py(y){return y*H}
function drawGrid(){
  ctx.fillStyle='#f2ecd2';ctx.fillRect(0,0,W,H);
  const s=Math.max(24,Math.min(W,H)/18);ctx.strokeStyle='rgba(90,79,49,.11)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=0;y<H;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
}
function drawPath(){
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#d8ccb1';ctx.lineWidth=Math.max(30,Math.min(W,H)*.065);
  ctx.beginPath();ctx.moveTo(px(pathPts[0][0]),py(pathPts[0][1]));for(let i=1;i<pathPts.length;i++)ctx.lineTo(px(pathPts[i][0]),py(pathPts[i][1]));ctx.stroke();
  ctx.strokeStyle='#b7aa8a';ctx.lineWidth=2;ctx.setLineDash([6,7]);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#263039';ctx.beginPath();ctx.arc(px(.985),py(.57),Math.max(10,H*.025),0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 10px sans-serif';ctx.textAlign='center';ctx.fillText('CORE',px(.955),py(.57)-H*.035)
}
function drawResources(){
  for(const r of state.resources){if(r.amount<=0)continue;const x=px(r.x),y=py(r.y),rr=Math.max(12,Math.min(W,H)*r.r);
    ctx.fillStyle='#62a83e';for(let i=0;i<8;i++){const a=i*.78,rad=rr*(.35+.35*((i*37)%10)/10);ctx.beginPath();ctx.arc(x+Math.cos(a)*rr*.45,y+Math.sin(a)*rr*.35,rad*.28,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle='#315d28';ctx.font='900 10px sans-serif';ctx.textAlign='center';ctx.fillText(Math.ceil(r.amount),x,y+4);
  }
}
function drawLinks(){
  ctx.save();ctx.lineWidth=2;ctx.setLineDash([4,5]);
  for(const t of state.towers){
    for(const m of t.links){ctx.strokeStyle=m.def.color+'99';ctx.beginPath();ctx.moveTo(px(m.x),py(m.y));ctx.lineTo(px(t.x),py(t.y));ctx.stroke()}
    for(const combo of t.combos||[]){
      const other=state.towers.find(b=>b.word===combo.with&&dist(t,b)<=.18);
      if(!other||t.id>other.id)continue;
      ctx.save();ctx.setLineDash([]);ctx.strokeStyle='#f0a52e';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(px(other.x),py(other.y));ctx.lineTo(px(t.x),py(t.y));ctx.stroke();ctx.restore();
    }
  }
  ctx.restore();
}
function towerRadius(t){return Math.max(19,Math.min(W,H)*(.029+t.def.difficulty*.0015))}
function drawTowers(){
  for(const t of state.towers){const x=px(t.x),y=py(t.y),r=towerRadius(t);ctx.save();ctx.translate(x,y);
    ctx.shadowColor='rgba(0,0,0,.22)';ctx.shadowBlur=8;ctx.shadowOffsetY=5;ctx.fillStyle=t.def.color;ctx.fillRect(-r*.55,-r*.76,r*1.1,r*1.34);ctx.shadowColor='transparent';
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(-r*.40,-r*.62,r*.28,r*.95);
    ctx.fillStyle='#1e2228';ctx.font='1000 '+Math.max(15,r*.72)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.word[0],0,-r*.12);
    ctx.fillStyle='#fffdf2';ctx.strokeStyle='rgba(30,34,40,.22)';ctx.lineWidth=1;const tw=Math.max(r*1.45,ctx.measureText(t.word).width*.65+12);roundRect(ctx,-tw/2,r*.48,tw,r*.55,4,true,true);
    ctx.fillStyle='#25272c';ctx.font='900 '+Math.max(8,r*.28)+'px ui-monospace,monospace';ctx.fillText(t.word,0,r*.75);
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
function drawShots(){for(const s of state.shots){ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(px(s.x),py(s.y),4,0,Math.PI*2);ctx.fill()}}
function drawEffects(){
  for(const e of state.effects){const a=e.life/e.max;ctx.save();ctx.globalAlpha=Math.min(1,a*1.4);
    if(e.type==='flash'){ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(px(e.x),py(e.y),Math.max(8,Math.min(W,H)*e.r*(1.2-a*.2)),0,Math.PI*2);ctx.fill()}
    if(e.type==='ring'){ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(px(e.x),py(e.y),Math.min(W,H)*e.r*(1+(1-a)*.25),0,Math.PI*2);ctx.stroke()}
    if(e.type==='line'){ctx.strokeStyle=e.color;ctx.lineWidth=e.w||2;ctx.beginPath();ctx.moveTo(px(e.x1),py(e.y1));ctx.lineTo(px(e.x2),py(e.y2));ctx.stroke()}
    if(e.type==='text'){ctx.fillStyle=e.color;ctx.font='900 12px sans-serif';ctx.textAlign='center';ctx.fillText(e.text,px(e.x),py(e.y)-(1-a)*28)}
    ctx.restore();
  }
}
function drawPlacement(){
  if(!state.placing||!state.hover)return;const p=state.hover,ok=validPlacement(p)&&rolePlacementValid(p,state.placing.def,state.placing.word),r=Math.max(20,Math.min(W,H)*.034);
  ctx.save();ctx.globalAlpha=.72;ctx.fillStyle=ok?state.placing.def.color:'#d34f58';ctx.fillRect(px(p.x)-r*.55,py(p.y)-r*.7,r*1.1,r*1.3);
  ctx.strokeStyle=ok?'#1aa59f':'#c33445';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px(p.x),py(p.y),Math.min(W,H)*makeTowerStats(state.placing.word,state.placing.def).range,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function roundRect(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):(c.rect(x,y,w,h));if(fill)c.fill();if(stroke)c.stroke()}

function inspectAt(p){
  const t=state.towers.map(t=>({t,d:dist(p,t)})).sort((a,b)=>a.d-b.d)[0];
  if(!t||t.d>.06){inspectBox.classList.remove('show');return}
  const s=effectiveStats(t.t),signature=D.signatures?.[t.t.word];inspectBox.innerHTML='<strong>'+t.t.word+'</strong><small>'+t.t.def.meaning+' · '+t.t.def.roleLabel+(signature?.flavor?' · '+signature.flavor:'')+'</small><div class="meter">난도 '+('★'.repeat(t.t.def.difficulty))+' · INK '+towerCost(t.t.def)+(s.damage?' · DMG '+Math.round(s.damage):'')+(s.range?' · RANGE '+Math.round(s.range*100):'')+(t.t.links.length?' · LINK '+t.t.links.map(x=>x.word).join(', '):'')+(t.t.combos?.length?' · COMBO '+t.t.combos.map(x=>x.name).join(', '):'')+'</div>';inspectBox.classList.add('show');
}
canvas.addEventListener('pointermove',e=>{if(!state)return;state.hover=boardPos(e)});
canvas.addEventListener('pointerleave',()=>{if(state)state.hover=null});
canvas.addEventListener('pointerdown',e=>{if(!state||state.ended)return;const p=boardPos(e);if(state.placing)buildTower(p);else inspectAt(p)});

function openDictionary(){
  const list=[...state.discovered].filter(w=>D.words[w]).sort();
  $('dictStats').textContent=list.length+' / '+D.wordList.length+' 단어 발견';
  $('dictList').innerHTML=list.length?list.map(w=>{const d=D.words[w],sig=D.signatures?.[w];return '<div class="dict-item" style="--c:'+d.color+'"><b>'+w+'</b><span>'+d.meaning+' · '+d.roleLabel+' · INK '+towerCost(d)+(sig?.flavor?' · '+sig.flavor:'')+'</span></div>'}).join(''):'<div class="empty">아직 발견한 단어가 없습니다.</div>';
  dictOverlay.classList.remove('hidden');
}
function restart(){
  state=freshState();previousInk=-1;renderRack();updateComposer();updateHud();waveBtn.textContent='WAVE 1 시작';waveBtn.disabled=false;inspectBox.classList.remove('show');resultOverlay.classList.add('hidden');setStatus('첫 배치','시작 글자에는 MINER와 ARROW가 숨어 있어요. 둘 중 하나부터 만들어 보세요.');running=true;last=performance.now();
}

$('startBtn').addEventListener('click',()=>{startOverlay.classList.add('hidden');restart();beep(660,.1,'triangle')});
$('retryBtn').addEventListener('click',restart);
waveBtn.addEventListener('click',startWave);buildBtn.addEventListener('click',beginPlacement);clearBtn.addEventListener('click',()=>{if(state.placing)cancelPlacement();clearSelection()});hintBtn.addEventListener('click',showHint);swapBtn.addEventListener('click',swapOne);
$('dictBtn').addEventListener('click',openDictionary);$('dictClose').addEventListener('click',()=>dictOverlay.classList.add('hidden'));
$('soundBtn').addEventListener('click',()=>{muted=!muted;$('soundBtn').textContent=muted?'🔇':'🔊';if(!muted)beep(520)});
window.addEventListener('keydown',e=>{
  if(!state||state.ended)return;
  const k=e.key.toUpperCase();
  if(/^[A-Z]$/.test(k)&&!state.placing){const idx=state.rack.findIndex((c,i)=>c===k&&!state.selected.includes(i));if(idx>=0){state.selected.push(idx);renderRack();updateComposer()}}
  else if(e.key==='Backspace'){state.selected.pop();renderRack();updateComposer();e.preventDefault()}
  else if(e.key==='Enter'){if(state.placing)cancelPlacement();else if(!buildBtn.disabled)beginPlacement()}
  else if(e.key==='Escape'){cancelPlacement();clearSelection()}
});

function loop(now){
  const dt=Math.min(.04,(now-last)/1000||0);last=now;if(state){update(dt);draw()}requestAnimationFrame(loop)
}
$('dictionaryTotal').textContent=D.wordList.length;
resize();requestAnimationFrame(loop);
})();
