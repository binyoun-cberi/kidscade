/* ---------- forest & mine ---------- */
function chopTree(id,x,y,s=1){
  if((state.inv['돌도끼']||0)<=0&&(state.inv['철도끼']||0)<=0)return toast('도끼가 필요해요.');
  const n=nodeState(id,3);
  if(n.destroyed)return toast('이미 벤 나무예요.');
  if(!spendEnergy(4))return;
  playAction('chop',590,x,y,()=>{
    markNodeHit(id);sfx('chop');impact(6,.16);burst(x,y-18,'wood',8);burst(x,y-55,'leaf',8);
    floatText(x,y-90,'퍽!','#fff0ac',16);
  },()=>{
    const after=damageWorldNode(id,3);
    if(after.destroyed){
      markNodeDeath(id);sfx('thud');impact(12,.25);
      const qty=(state.inv['철도끼']||0)>0?5:4;
      addItem('나무',qty);burst(x,y-30,'wood',18);burst(x,y-70,'leaf',14);
      floatText(x,y-100,`나무 +${qty}`,'#e3bd79',19);toast('나무가 쓰러졌어요!');
    }else{
      floatText(x,y-85,`${after.hp}/3`,'#f8e0aa',15);toast(`도끼질! ${after.hp}/3 남음`);
    }
  });
}
function gather(item,energy){
  if(!spendEnergy(energy))return;
  const q=1+(Math.random()<.25?1:0);addItem(item,q);toast(`${item} ${q}개 채집!`);
}
function mineNode(id,item,x,y){
  if((state.inv['돌곡괭이']||0)<=0)return toast('곡괭이가 필요해요.');
  const n=nodeState(id,3);
  if(n.destroyed)return toast('이미 캔 광맥이에요.');
  if(!spendEnergy(5))return;
  playAction('mine',610,x,y,()=>{
    markNodeHit(id);sfx('mine');impact(8,.18);burst(x,y,'stone',12);floatText(x,y-50,'쾅!','#eef1ea',16);
  },()=>{
    const after=damageWorldNode(id,3);
    if(after.destroyed){
      sfx('thud');impact(13,.26);addItem(item,1);if(Math.random()<.4)addItem('돌',1);
      burst(x,y,'stone',20);burst(x,y-10,'sparkle',7);
      floatText(x,y-60,`${item} +1`,'#fff0ac',18);toast(`${item} 광맥을 깼어요!`);
    }else{
      floatText(x,y-55,`${after.hp}/3`,'#e8e4d9',15);toast(`채굴 중… ${after.hp}/3 남음`);
    }
  });
}

/* ---------- crafting ---------- */
const craftRecipes={
 '돌도끼':{req:{'나무':3,'돌':2},out:'돌도끼'},
 '돌곡괭이':{req:{'나무':2,'돌':3},out:'돌곡괭이'},
 '나무의자':{req:{'나무':6},furniture:true},
 '작은탁자':{req:{'나무':8,'철광석':1},furniture:true},
 '화분':{req:{'나무':2,'돌':2},furniture:true},
 '철도끼':{req:{'나무':3,'철광석':3},out:'철도끼'},
 '철곡괭이':{req:{'나무':2,'철광석':4},out:'철곡괭이'},
 '곤충채집망':{req:{'나무':2,'잡초':3},out:'곤충채집망'},
 '보석장식':{req:{'보석원석':1,'나무':2},furniture:true}
};
function openCrafting(){
  const toolNames=Object.keys(craftRecipes).filter(n=>!craftRecipes[n].furniture);
  const furnitureNames=Object.keys(craftRecipes).filter(n=>craftRecipes[n].furniture);
  const chips=Object.entries(state.inv).filter(([,v])=>v>0).slice(0,12).map(([k,v])=>`<span class="resourceChip">${k} ${v}</span>`).join('');
  openModal(`${topRow('제작대')}
    <p>집 안 작업대에서 도구와 가구를 제작합니다. 재료가 연결되어 보이도록 구성을 다듬었습니다.</p>
    <div class="resourceRow">${chips}</div>

    <div class="craftGroupTitle">도구</div>
    <div class="grid">${toolNames.map(name=>{
      const r=craftRecipes[name];
      const req=Object.entries(r.req).map(([k,v])=>`${k} ${v}`).join(' · ');
      return `<div class="card"><b>${name}</b><div class="small">${req}</div>
      <button class="actionBtn good" onclick="craft('${name}')">제작하기</button></div>`;
    }).join('')}</div>

    <div class="craftGroupTitle">가구</div>
    <div class="grid">${furnitureNames.map(name=>{
      const r=craftRecipes[name];
      const req=Object.entries(r.req).map(([k,v])=>`${k} ${v}`).join(' · ');
      return `<div class="card">
        <div class="furnPreview">${furnitureMarkup(name,true)}</div>
        <b>${name}</b><div class="small">${req}</div>
        <button class="actionBtn good" onclick="craft('${name}')">제작하기</button></div>`;
    }).join('')}</div>
    <div class="log">레시피를 누적하면서 “집을 채우는 재미”가 보이도록 정리했습니다.</div>`);
}
function craft(name){
  const r=craftRecipes[name];if(!hasItems(r.req))return toast('재료가 부족해요.');
  consumeItems(r.req);
  if(r.furniture){if(!state.furniture.includes(name))state.furniture.push(name);}
  else addItem(r.out,1);
  if(!state.recipes.includes(name))state.recipes.push(name);
  saveState();toast(`🔨 ${name} 완성!`);openCrafting();
}

/* ---------- wardrobe ---------- */
function openWardrobe(){
  refreshAvatarBridge(false);
  openModal(`${topRow('캐릭터 옷장')}
    <div class="wardrobeCanvasWrap"><canvas id="wardrobeCanvas" width="680" height="360"></canvas></div>
    <div class="section">
      <b>Kidscade 캐릭터 그대로 사용</b>
      <p class="small">생활 월드는 별도의 캐릭터 외형을 만들지 않습니다. 현재 아틀리에에서 착용한 Deluxe 아바타를 그대로 사용합니다.</p>
      <button class="actionBtn good" onclick="openKidscadeAtelier()">캐릭터 아틀리에 열기</button>
      <button class="actionBtn" onclick="refreshAvatarBridge(true);drawWardrobePreview()">현재 외형 다시 불러오기</button>
    </div>`);
  requestAnimationFrame(drawWardrobePreview);
}

function drawWardrobePreview(){
  const cv=$('#wardrobeCanvas');if(!cv)return;
  const q=cv.getContext('2d'),w=cv.width,h=cv.height;
  q.clearRect(0,0,w,h);

  q.fillStyle='#dbe9d8';q.fillRect(0,0,w,h);
  q.fillStyle='#f4ead3';q.fillRect(0,0,w,h*.46);
  q.fillStyle='#d3ae7e';q.fillRect(0,h*.46,w,h*.54);
  q.strokeStyle='#8d775d';q.lineWidth=4;q.beginPath();q.moveTo(0,h*.46);q.lineTo(w,h*.46);q.stroke();

  q.fillStyle='#8a6a52';q.strokeStyle='#5b4d43';q.lineWidth=4;
  q.fillRect(60,62,158,214);q.strokeRect(60,62,158,214);
  q.fillStyle='#c8e7ee';q.fillRect(82,82,114,170);q.strokeRect(82,82,114,170);

  q.fillStyle='#947052';q.fillRect(500,72,122,212);q.strokeRect(500,72,122,212);
  q.beginPath();q.moveTo(561,72);q.lineTo(561,284);q.stroke();
  q.fillStyle='#e0bd67';q.beginPath();q.arc(545,180,5,0,7);q.arc(577,180,5,0,7);q.fill();

  q.save();
  q.translate(340,250);
  q.globalAlpha=.18;q.fillStyle='#37433c';q.beginPath();q.ellipse(0,35,38,10,0,0,7);q.fill();q.globalAlpha=1;

  if(avatarBridge.ready&&avatarBridge.img.naturalWidth){
    const img=avatarBridge.img,th=190,tw=th*(img.naturalWidth/Math.max(1,img.naturalHeight));
    q.drawImage(img,-tw/2,-155,tw,th);
  }else{
    q.globalAlpha=.45;q.fillStyle='#9ca9a0';q.strokeStyle='#5b4d43';q.lineWidth=3;
    q.beginPath();q.arc(0,-85,34,0,7);q.fill();q.stroke();
    q.beginPath();q.roundRect(-34,-48,68,78,24);q.fill();q.stroke();
    q.globalAlpha=1;
    q.fillStyle='#5b4d43';q.font='900 16px sans-serif';q.textAlign='center';
    q.fillText('Deluxe 아바타 연결 대기',0,64);
  }
  q.restore();

  q.fillStyle='#435047';q.font='900 20px sans-serif';q.textAlign='center';
  q.fillText(avatarBridge.ready?'현재 Kidscade 아바타':'standalone 연결 대기',w/2,32);
}
function drawWardrobeAvatar(q,x,y,s,outfitName){
  const outfit=outfitName==='빨간멜빵'?'#b9574f':outfitName==='파란후드'?'#557fa8':outfitName==='노란우비'?'#d6b742':'#62a05a';
  q.save();q.translate(x,y);q.globalAlpha=.18;q.beginPath();q.ellipse(0,48,36,10,0,0,7);q.fillStyle='#111';q.fill();q.globalAlpha=1;q.strokeStyle='#3d403b';q.lineWidth=10;q.lineCap='round';q.beginPath();q.moveTo(-12,10);q.lineTo(-16,42);q.moveTo(12,10);q.lineTo(16,42);q.stroke();q.fillStyle='#4d4034';q.strokeStyle='#24211e';q.lineWidth=3;q.beginPath();q.ellipse(-18,45,12,6,0,0,7);q.fill();q.stroke();q.beginPath();q.ellipse(18,45,12,6,0,0,7);q.fill();q.stroke();q.beginPath();q.moveTo(-25,-22);q.quadraticCurveTo(0,-36,25,-22);q.lineTo(22,15);q.quadraticCurveTo(0,28,-22,15);q.closePath();q.fillStyle=outfit;q.fill();q.strokeStyle='#24211e';q.stroke();q.strokeStyle='#efc294';q.lineWidth=10;q.beginPath();q.moveTo(-20,-7);q.lineTo(-34,16);q.moveTo(20,-7);q.lineTo(34,12);q.stroke();q.fillStyle='#efc294';q.strokeStyle='#24211e';q.lineWidth=3;q.beginPath();q.ellipse(0,-56,28,30,0,0,7);q.fill();q.stroke();q.fillStyle='#4d3423';q.beginPath();q.moveTo(-28,-60);q.quadraticCurveTo(-16,-88,6,-82);q.quadraticCurveTo(28,-80,28,-56);q.quadraticCurveTo(14,-68,8,-60);q.quadraticCurveTo(0,-69,-8,-60);q.quadraticCurveTo(-17,-69,-28,-51);q.closePath();q.fill();q.stroke();q.fillStyle='#24211e';q.beginPath();q.arc(-9,-56,3,0,7);q.arc(9,-56,3,0,7);q.fill();q.restore();
}

function wear(){toast('생활 월드의 외형은 Kidscade 아틀리에에서 변경합니다.');}
function buyOutfit(){openKidscadeAtelier();}

/* ---------- furniture ---------- */
const furnCatalog={
  '낡은침대':{type:'bed'},'작은상자':{type:'crate'},'나무의자':{type:'chair'},'작은탁자':{type:'table'},'화분':{type:'plant'},'옷장':{type:'wardrobe'},'보석장식':{type:'gemdecor'}
};
function furnitureMarkup(type, small=false){
  const cls=(furnCatalog[type]?.type)||'crate';
  const size=small?' small':'';
  if(cls==='bed')return `<div class="furnSprite bed${size}"><div class="frame"></div><div class="pillow"></div><div class="blanket"></div><div class="leg l1"></div><div class="leg l2"></div></div>`;
  if(cls==='crate')return `<div class="furnSprite crate${size}"><div class="box"></div><div class="slat s1"></div><div class="slat s2"></div></div>`;
  if(cls==='chair')return `<div class="furnSprite chair${size}"><div class="back"></div><div class="seat"></div><div class="leg l1"></div><div class="leg l2"></div></div>`;
  if(cls==='table')return `<div class="furnSprite table${size}"><div class="top"></div><div class="leg l1"></div><div class="leg l2"></div></div>`;
  if(cls==='plant')return `<div class="furnSprite plant${size}"><div class="leaf1"></div><div class="leaf2"></div><div class="leaf3"></div><div class="soil"></div><div class="pot"></div></div>`;
  if(cls==='gemdecor')return `<div class="furnSprite plant${size}" style="height:70px"><div style="position:absolute;left:12px;right:12px;bottom:4px;height:18px;background:#7b5c43;border:3px solid #24211e;border-radius:7px"></div><div style="position:absolute;left:21px;top:8px;width:20px;height:28px;background:#76c3c8;border:3px solid #24211e;transform:rotate(45deg);border-radius:4px"></div></div>`;
  return `<div class="furnSprite wardrobe${size}"><div class="body"></div><div class="split"></div><div class="knob1"></div><div class="knob2"></div></div>`;
}
function openFurniture(){
  openModal(`${topRow('가구 배치')}<div class="furnitureArea" id="furnArea"></div><p class="small">가구를 끌어서 위치를 바꿔 보세요. 아래에서 배치할 가구를 선택할 수 있습니다.</p><div class="furnPalette">${state.furniture.map(f=>`<button class="furnBtn" onclick="addFurniture('${f}')"><div class="furnPreview">${furnitureMarkup(f,true)}</div><div class="furnLabel">${f}</div></button>`).join('')}</div>`);
  requestAnimationFrame(renderFurnitureArea);
}
function renderFurnitureArea(){
  const area=$('#furnArea');if(!area)return;area.innerHTML='';
  state.placed.forEach((f,i)=>{
    const el=document.createElement('div');el.className='furnitureObj';el.innerHTML=furnitureMarkup(f.type,false);el.style.left=(f.x*90)+'%';el.style.top=(f.y*75)+'%';el.dataset.i=i;area.appendChild(el);
    let drag=false;el.onpointerdown=e=>{drag=true;el.setPointerCapture(e.pointerId)};el.onpointermove=e=>{if(!drag)return;const r=area.getBoundingClientRect();f.x=Math.max(0,Math.min(.92,(e.clientX-r.left)/r.width));f.y=Math.max(.08,Math.min(.82,(e.clientY-r.top)/r.height));el.style.left=(f.x*90)+'%';el.style.top=(f.y*75)+'%';};el.onpointerup=()=>{drag=false;saveState();};
  });
}
function addFurniture(f){state.placed.push({type:f,x:.45+Math.random()*.15,y:.42+Math.random()*.16});saveState();renderFurnitureArea();}
