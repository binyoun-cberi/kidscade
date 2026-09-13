/* ---------- cooking ---------- */
const cookRecipes={
 '감자수프':{req:{'감자':2,'우유':1},chops:4,heat:[52,68],energy:35},
 '채소볶음':{req:{'당근':1,'양배추':1,'달걀':1},chops:6,heat:[58,74],energy:30},
 '버섯스튜':{req:{'버섯':2,'우유':1,'약초':1},chops:5,heat:[55,72],energy:42},
 '생선구이':{req:{'물고기':1,'약초':1},chops:3,heat:[62,78],energy:48}
};
let cook={recipe:'감자수프',step:0,chops:0,temp:20,timer:null,quality:''};
function openKitchen(){cook={recipe:'감자수프',step:0,chops:0,temp:20,timer:null,quality:''};kitchenScreen();}
function kitchenScreen(){
  const r=cookRecipes[cook.recipe];
  const req=Object.entries(r.req).map(([k,v])=>`${itemEmoji(k)} ${k} ${v}`).join(' · ');
  const stepNames=['재료 준비','썰기','가열 준비','끓이기','완성'];
  openModal(`${topRow('주방')}
    <div class="grid">${Object.keys(cookRecipes).map(n=>`<button class="recipeBtn ${cook.recipe===n?'selected':''}" onclick="selectCook('${n}')"><b>${n}</b><span class="small">${Object.entries(cookRecipes[n].req).map(([k,v])=>`${k} ${v}`).join(', ')}</span></button>`).join('')}</div>
    <div class="kitchenTopbar"><div><b>필요 재료</b> ${req}</div><div class="kitchenSteps">${stepNames.map((s,idx)=>`<span class="kStep ${cook.step===idx?'active':''}">${idx+1}. ${s}</span>`).join('')}</div></div>
    <div class="kitchenStage" id="kstage">${renderCookStage()}</div>
    <div id="cookActions">${renderCookActions()}</div>
    <div class="log" id="cookLog">눌러서 재료를 꺼내고, 직접 썰고, 냄비를 보고 적정 온도에서 끄는 방식입니다.</div>`);
}
function selectCook(n){cook={recipe:n,step:0,chops:0,temp:20,timer:null,quality:''};kitchenScreen()}
function renderCookStage(){
  const r=cookRecipes[cook.recipe];
  if(cook.step===0)return `<div class="shelf"><div class="jar" style="left:30px"></div><div class="jar" style="left:90px;background:#e8d6a8"></div><div class="jar" style="left:150px;background:#e6b882"></div></div><div style="text-align:center;padding:70px 10px 0"><div style="font-size:22px;font-weight:900">${cook.recipe}</div><p>재료 바구니에서 꺼내어 조리를 시작하세요.</p></div><div class="counterBack"></div>`;
  if(cook.step===1){
    const cls=cook.recipe==='감자수프'?'potato':(cook.recipe==='채소볶음'?'carrot':'potato');
    const pcs=Array.from({length:Math.max(1,cook.chops)},(_,i)=>`<div class="chopPiece ${cls}" style="left:${150+(i%4)*28}px;top:${120+Math.floor(i/4)*18}px;transform:rotate(${(i%2?14:-12)}deg)"></div>`).join('');
    return `<div class="shelf"><div class="jar" style="left:30px"></div><div class="jar" style="left:92px"></div></div><div class="cuttingBoard"><div class="chopTarget">${cook.recipe==='감자수프'?'🥔':'🥕'}</div></div>${pcs}<div style="text-align:center"><b>${cook.chops}/${r.chops}번 썰기</b></div><div class="counterBack"></div>`;
  }
  if(cook.step===2||cook.step===3){
    const hot=cook.step===3;
    return `<div class="shelf"><div class="jar" style="left:32px"></div><div class="jar" style="left:96px;background:#e3d29c"></div><div class="jar" style="left:160px;background:#f0d4b0"></div></div><div class="pot"></div>${hot?`<div class="boilFx"><div class="bubble" style="left:14px"></div><div class="bubble"></div><div class="bubble"></div><div class="bubble"></div><div class="bubble"></div><div class="steam" style="left:18px"></div><div class="steam s2"></div><div class="steam s3"></div></div>`:''}<div class="thermo"><div class="needle" id="needle" style="left:${cook.temp}%"></div></div><div style="text-align:center;margin-top:8px"><b id="tempText">현재 온도 ${Math.round(cook.temp)}℃</b> · 적정 ${r.heat[0]}~${r.heat[1]}℃</div><div class="counterBack"></div>`;
  }
  return `<div class="plateScene"><div class="plate"></div><div class="soup"></div><div style="position:absolute;left:50%;top:60px;transform:translateX(-50%);font-size:18px;font-weight:900">${cook.quality} ${cook.recipe}</div><div style="position:absolute;left:50%;top:88px;transform:translateX(-50%);font-size:13px">완성!</div></div><div class="counterBack"></div>`;
}
function renderCookActions(){if(cook.step===0)return `<button class="actionBtn good" onclick="startPrep()">재료 꺼내기</button>`;if(cook.step===1)return `<button class="actionBtn good" onclick="chop()">🔪 탭해서 썰기</button>`;if(cook.step===2)return `<button class="actionBtn good" onclick="startHeat()">🔥 불 켜기</button>`;if(cook.step===3)return `<button class="actionBtn warn" onclick="stopHeat()">🧯 불 끄기</button>`;return `<button class="actionBtn good" onclick="finishCook()">🥣 음식 챙기기</button>`;}
function rerenderCook(){const s=$('#kstage'),a=$('#cookActions');if(!s||!a)return;s.innerHTML=renderCookStage();a.innerHTML=renderCookActions();}
function startPrep(){const r=cookRecipes[cook.recipe];if(!hasItems(r.req))return toast('요리 재료가 부족해요.');if(!spendEnergy(2))return;consumeItems(r.req);cook.step=1;rerenderCook();}
function chop(){const r=cookRecipes[cook.recipe];cook.chops++;if(cook.chops>=r.chops)cook.step=2;rerenderCook()}
function startHeat(){cook.step=3;cook.temp=20;rerenderCook();clearInterval(cook.timer);cook.timer=setInterval(()=>{cook.temp=Math.min(100,cook.temp+2.2);const n=$('#needle');if(n)n.style.left=Math.min(96,cook.temp)+'%';const tt=$('#tempText');if(tt)tt.textContent=`현재 온도 ${Math.round(cook.temp)}℃`;if(cook.temp>=100)stopHeat();},180);}
function stopHeat(){clearInterval(cook.timer);const r=cookRecipes[cook.recipe];if(cook.temp>=r.heat[0]&&cook.temp<=r.heat[1])cook.quality='완벽한';else if(cook.temp<r.heat[0])cook.quality='살짝 덜 익은';else cook.quality='조금 탄';cook.step=4;rerenderCook();}
function finishCook(){const bonus=cook.quality==='완벽한'?1:0;addItem(cook.recipe,1);if(bonus){state.energy=Math.min(100,state.energy+3);saveState()}toast(`${cook.quality} ${cook.recipe} 완성!`);closeModal();}

/* ---------- fishing ---------- */
let fishGame=null;
function openFishing(){
  if((state.inv['낚싯대']||0)<=0)return toast('낚싯대가 필요해요.');if(!spendEnergy(4))return;
  const tx=W*.56,ty=H*.50;
  playAction('harvest',520,tx,ty,()=>{sfx('fish');burst(tx,ty,'water',7);},()=>{
    openModal(`${topRow('🎣 낚시')}<div class="card" style="text-align:center;background:#dff1ed"><canvas id="fishCanvas" width="520" height="210" style="width:100%;max-width:520px;border:2px solid #24211e;border-radius:16px;background:#9fd6df"></canvas><h3 id="fishMsg">찌를 바라보며 기다려요…</h3><button class="actionBtn good" id="fishTap" onclick="fishTap()">낚싯줄 당기기!</button></div><div class="log">물고기가 찌를 물면 물결이 크게 퍼집니다. 그때 한 번 눌러 주세요.</div>`);
    fishGame={ready:false,done:false,start:performance.now(),raf:0};animateFishingCanvas();setTimeout(()=>{if(!fishGame||fishGame.done)return;fishGame.ready=true;const m=$('#fishMsg');if(m)m.textContent='지금! 물고기가 물었어요!';},1100+Math.random()*2200);
  });
}
function animateFishingCanvas(){
  const c=$('#fishCanvas');if(!c||!fishGame||fishGame.done)return;
  const q=c.getContext('2d'),w=c.width,h=c.height,t=performance.now()/500;q.clearRect(0,0,w,h);const grad=q.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#bfe8e9');grad.addColorStop(1,'#5caabd');q.fillStyle=grad;q.fillRect(0,0,w,h);
  q.globalAlpha=.25;q.strokeStyle='#fff';q.lineWidth=3;for(let i=0;i<6;i++){q.beginPath();q.moveTo(-20+i*100+(t*18)%70,70+i*20);q.quadraticCurveTo(90+i*70,55+i*20,190+i*70,72+i*20);q.stroke();}q.globalAlpha=1;
  const bx=w*.54,by=92+Math.sin(t*2)*3;q.strokeStyle='#2b2721';q.lineWidth=2;q.beginPath();q.moveTo(w*.18,8);q.lineTo(bx,by);q.stroke();q.fillStyle='#d85b4f';q.strokeStyle='#24211e';q.lineWidth=3;q.beginPath();q.ellipse(bx,by,8,15,0,0,7);q.fill();q.stroke();
  if(fishGame.ready){const pulse=(performance.now()%500)/500;q.strokeStyle=`rgba(255,255,255,${1-pulse})`;q.lineWidth=4;q.beginPath();q.arc(bx,by,18+pulse*46,0,7);q.stroke();q.beginPath();q.arc(bx,by,8+pulse*28,0,7);q.stroke();q.fillStyle='#315b68';q.beginPath();q.ellipse(bx+30,by+32,28,10,-.2,0,7);q.fill();q.beginPath();q.moveTo(bx+8,by+32);q.lineTo(bx-10,by+20);q.lineTo(bx-9,by+43);q.closePath();q.fill();}else{q.globalAlpha=.22;q.fillStyle='#315b68';q.beginPath();q.ellipse(w*.73,h*.72,25,8,0,0,7);q.fill();q.globalAlpha=1;}
  fishGame.raf=requestAnimationFrame(animateFishingCanvas);
}
function fishTap(){if(!fishGame||fishGame.done)return;fishGame.done=true;if(fishGame.raf)cancelAnimationFrame(fishGame.raf);if(fishGame.ready){addItem('물고기',1);sfx('fish');toast('물고기를 잡았어요!');const m=$('#fishMsg');if(m)m.textContent='잡았다! 물고기 +1';}else{const m=$('#fishMsg');if(m)m.textContent='너무 일찍 당겼어요!';toast('아직 물고기가 물지 않았어요.');}}
function openFishWatching(){if(!spendEnergy(3))return;const fish=['피라미','붕어','메기','쏘가리'];const f=fish[Math.floor(Math.random()*fish.length)];state.fishDex[f]=true;saveState();openModal(`${topRow('🔍 탐어')}<div style="text-align:center;font-size:80px">🐟</div><h2 style="text-align:center">${f} 발견!</h2><p style="text-align:center">물속 움직임을 관찰해 도감에 기록했어요. 잡지 않아도 발견만으로 등록됩니다.</p><div class="card"><b>물고기 도감</b><div class="slotRow">${fish.map(n=>`<span class="slot">${state.fishDex[n]?'🐟 '+n:'❔ ???'}</span>`).join('')}</div></div>`);}

applyWorldSize(scene,false);
setZoom(sceneZooms[scene]||1,true);
snapCameraToPlayer();
setSceneLabels();
updateHUD();
refreshAvatarBridge(false);
refreshGardenWorld(true);

window.addEventListener('message',e=>{
  if(e.data?.type==='kidscade-life-world-refresh'){
    refreshAvatarBridge(false);
    refreshGardenWorld(true);
    updateHUD();
  }
});
window.addEventListener('storage',e=>{if(e.key==='kidscade_coins')updateHUD();});
