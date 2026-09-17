(() => {
'use strict';

const ASSET_BASE='../../assets/game/2d/animals/round/';
const ANIMALS={
  bear:['곰','bear.png'], buffalo:['물소','buffalo.png'], chick:['병아리','chick.png'],
  cow:['소','cow.png'], crocodile:['악어','crocodile.png'], dog:['강아지','dog.png'],
  duck:['오리','duck.png'], elephant:['코끼리','elephant.png'], frog:['개구리','frog.png'],
  giraffe:['기린','giraffe.png'], goat:['염소','goat.png'], gorilla:['고릴라','gorilla.png'],
  hippo:['하마','hippo.png'], horse:['말','horse.png'], monkey:['원숭이','monkey.png'],
  moose:['무스','moose.png'], narwhal:['일각고래','narwhal.png'], owl:['부엉이','owl.png'],
  panda:['판다','panda.png'], parrot:['앵무새','parrot.png'], penguin:['펭귄','penguin.png'],
  pig:['돼지','pig.png'], rabbit:['토끼','rabbit.png'], rhino:['코뿔소','rhino.png'],
  sloth:['나무늘보','sloth.png'], snake:['뱀','snake.png'], walrus:['바다코끼리','walrus.png'],
  whale:['고래','whale.png'], zebra:['얼룩말','zebra.png']
};

const STAGES=[
  {name:'초원 친구들',theme:'meadow',targets:['dog','rabbit','chick']},
  {name:'연못 주변',theme:'pond',targets:['frog','duck','crocodile']},
  {name:'넓은 들판',theme:'savanna',targets:['giraffe','zebra','elephant','rhino']},
  {name:'깊은 숲',theme:'forest',targets:['bear','owl','moose','sloth']},
  {name:'차가운 바다',theme:'arctic',targets:['penguin','walrus','narwhal','whale']},
  {name:'농장 친구들',theme:'farm',targets:['cow','pig','goat','horse']},
  {name:'정글 탐험',theme:'jungle',targets:['monkey','gorilla','parrot','snake']},
  {name:'동물 대모험',theme:'mountain',targets:['panda','buffalo','dog','elephant']},
  {name:'강가의 친구들',theme:'river',targets:['crocodile','frog','duck','hippo','parrot']},
  {name:'저녁 숲',theme:'dusk',targets:['owl','bear','rabbit','fox'].filter(id=>ANIMALS[id])},
  {name:'사파리 도전',theme:'savanna',targets:['giraffe','zebra','rhino','elephant','gorilla']},
  {name:'마지막 동물 찾기',theme:'forest',targets:['panda','monkey','penguin','sloth','tiger'].filter(id=>ANIMALS[id])}
];

// Fill unavailable optional IDs with guaranteed tracked assets so every stage stays playable.
const FALLBACKS=['dog','cow','pig','goat','horse','panda','owl'];
for(const stage of STAGES){
  while(stage.targets.length<4 && STAGES.indexOf(stage)>1){
    const next=FALLBACKS.find(id=>!stage.targets.includes(id));
    if(!next) break;
    stage.targets.push(next);
  }
}

const $=s=>document.querySelector(s);
const els={
  scene:$('#scene'),decor:$('#decorLayer'),animals:$('#animalLayer'),targets:$('#targetList'),
  stageLabel:$('#stageLabel'),time:$('#timeLabel'),miss:$('#missLabel'),stageName:$('#stageName'),
  found:$('#foundCount'),targetCount:$('#targetCount'),message:$('#sceneMessage'),
  next:$('#nextBtn'),restart:$('#restartBtn'),hint:$('#hintBtn'),sound:$('#soundBtn'),
  startOverlay:$('#startOverlay'),start:$('#startBtn'),sample:$('#sampleFaces'),
  result:$('#resultOverlay'),finalTime:$('#finalTime'),finalMisses:$('#finalMisses'),
  again:$('#playAgainBtn'),toast:$('#toast')
};

let stageIndex=0, found=new Set(), misses=0, totalMisses=0, stageStart=0, totalStart=0, timer=0, soundEnabled=true;

function src(id){return ASSET_BASE+ANIMALS[id][1]}
function label(id){return ANIMALS[id][0]}
function play(key,options={}){if(!soundEnabled)return;try{window.KidscadeAudio?.play?.(key,options)}catch(_){}}
function rand(min,max){return min+Math.random()*(max-min)}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function toast(text){els.toast.textContent=text;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),1300)}

function preload(){
  const ids=[...new Set(STAGES.flatMap(s=>s.targets))];
  return Promise.all(ids.map(id=>new Promise(resolve=>{
    const im=new Image();im.onload=im.onerror=resolve;im.src=src(id);
  })));
}

function renderSamples(){
  els.sample.innerHTML='';
  ['dog','panda','frog','giraffe'].forEach(id=>{
    const im=document.createElement('img');im.src=src(id);im.alt='';els.sample.appendChild(im);
  });
}

function makeDecor(theme){
  els.decor.innerHTML='';
  const types=theme==='arctic'?['rock','cloud']:theme==='pond'||theme==='river'?['reed','rock','cloud']:['tree','bush','rock','cloud'];
  const count=11;
  for(let i=0;i<count;i++){
    const d=document.createElement('div');
    const type=types[i%types.length];
    d.className='decor '+type;
    d.style.left=rand(2,92)+'%';
    d.style.top=(type==='cloud'?rand(5,35):rand(36,86))+'%';
    d.style.transform=`scale(${rand(.62,1.2).toFixed(2)}) rotate(${rand(-9,9).toFixed(1)}deg)`;
    d.style.zIndex=String(Math.floor(rand(1,4)));
    els.decor.appendChild(d);
  }
}

function positionTargets(count){
  const positions=[];
  const minDist=count>=5?17:21;
  for(let i=0;i<count;i++){
    let best={x:rand(10,90),y:rand(13,87)};
    for(let tries=0;tries<80;tries++){
      const p={x:rand(9,91),y:rand(13,87)};
      const ok=positions.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=minDist);
      if(ok){best=p;break}
    }
    positions.push(best);
  }
  return positions;
}

function renderTargets(stage){
  els.targets.innerHTML='';
  stage.targets.forEach(id=>{
    const card=document.createElement('div');
    card.className='target-card';
    card.id='target-'+id;
    card.innerHTML=`<img src="${src(id)}" alt=""><b>${label(id)}</b>`;
    els.targets.appendChild(card);
  });
}

function renderHidden(stage){
  els.animals.innerHTML='';
  const positions=positionTargets(stage.targets.length);
  const difficulty=stageIndex/(STAGES.length-1);
  stage.targets.forEach((id,i)=>{
    const b=document.createElement('button');
    b.type='button';b.className='hidden-animal';b.dataset.id=id;
    b.setAttribute('aria-label',label(id));
    b.style.left=positions[i].x+'%';b.style.top=positions[i].y+'%';
    b.style.setProperty('--turn',rand(-22,22).toFixed(1)+'deg');
    b.style.setProperty('--scale',rand(.82-difficulty*.08,1.08-difficulty*.12).toFixed(2));
    b.style.setProperty('--hide-opacity',(0.74-difficulty*.18).toFixed(2));
    b.innerHTML=`<img src="${src(id)}" alt="${label(id)}">`;
    b.addEventListener('click',e=>{e.stopPropagation();findAnimal(id,b)});
    els.animals.appendChild(b);
  });
}

function findAnimal(id,button){
  if(found.has(id))return;
  found.add(id);button.classList.add('found');
  $('#target-'+id)?.classList.add('found');
  els.found.textContent=found.size;
  play('collect.coin_pickup',{volume:.28,rate:1.08,cooldownMs:80});
  toast(label(id)+' 찾았어요');
  if(found.size===STAGES[stageIndex].targets.length)completeStage();
}

function completeStage(){
  clearInterval(timer);
  const t=((Date.now()-stageStart)/1000).toFixed(1);
  els.message.textContent=`단계 완료 · ${t}초 · 실수 ${misses}회`;
  play('success.cheer_yay',{volume:.36,cooldownMs:200});
  if(stageIndex<STAGES.length-1){
    els.next.hidden=false;
  }else{
    setTimeout(finishGame,500);
  }
}

function startTimer(){
  clearInterval(timer);
  stageStart=Date.now();
  els.time.textContent='0.0초';
  timer=setInterval(()=>{els.time.textContent=((Date.now()-stageStart)/1000).toFixed(1)+'초'},100);
}

function loadStage(index){
  stageIndex=index;
  found=new Set();misses=0;
  const stage=STAGES[index];
  els.scene.className='scene theme-'+stage.theme;
  els.stageLabel.textContent=`${index+1} / ${STAGES.length}`;
  els.stageName.textContent=stage.name;
  els.miss.textContent='0';
  els.found.textContent='0';els.targetCount.textContent=stage.targets.length;
  els.next.hidden=true;
  els.message.textContent='동물 얼굴을 찾아 눌러보세요.';
  makeDecor(stage.theme);renderTargets(stage);renderHidden(stage);startTimer();
}

function missClick(){
  misses++;totalMisses++;els.miss.textContent=misses;
  els.scene.classList.remove('miss');void els.scene.offsetWidth;els.scene.classList.add('miss');
  play('failure.fail_sting',{volume:.12,cooldownMs:350});
}

function hint(){
  const left=[...els.animals.querySelectorAll('.hidden-animal:not(.found)')];
  if(!left.length)return;
  const b=left[Math.floor(Math.random()*left.length)];
  b.classList.remove('hint');void b.offsetWidth;b.classList.add('hint');
  els.message.textContent='한 동물의 위치가 잠깐 반짝여요.';
  setTimeout(()=>{if(found.size<STAGES[stageIndex].targets.length)els.message.textContent='동물 얼굴을 찾아 눌러보세요.'},2100);
}

function finishGame(){
  clearInterval(timer);
  const total=((Date.now()-totalStart)/1000).toFixed(1);
  els.finalTime.textContent=total+'초';
  els.finalMisses.textContent=totalMisses+'회';
  els.result.classList.add('show');
  play('success.victory_fanfare',{volume:.42,cooldownMs:1000});
}

function begin(){
  stageIndex=0;totalMisses=0;totalStart=Date.now();
  els.result.classList.remove('show');els.startOverlay.classList.remove('show');
  loadStage(0);
}

els.scene.addEventListener('click',e=>{if(e.target.closest('.hidden-animal,.hint-btn'))return;missClick()});
els.next.addEventListener('click',()=>loadStage(stageIndex+1));
els.restart.addEventListener('click',()=>loadStage(stageIndex));
els.hint.addEventListener('click',hint);
els.sound.addEventListener('click',()=>{soundEnabled=!soundEnabled;els.sound.textContent=soundEnabled?'소리 켜짐':'소리 꺼짐'});
els.again.addEventListener('click',begin);
els.start.addEventListener('click',begin);

renderSamples();
preload().then(()=>{els.start.disabled=false}).catch(()=>{});
})();