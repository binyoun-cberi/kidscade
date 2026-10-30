(()=>{
'use strict';
const C=window.AquariumCore,$=id=>document.getElementById(id),tank=$('tank'),ctx=tank.getContext('2d'),paper=$('drawing'),pen=paper.getContext('2d',{willReadFrequently:true});
let w=C.world(),creatures=[],theme='lagoon',castleUnlocked=false,paused=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,mode='watch',selected=null,placing=null,drag=null,pointer=null,keyboard={x:500,y:280},keyboardActive=false;
let editorKind='fish',editing=null,tool='pen',color='#ffad76',history=[],historyIndex=-1,drawing=false,lastPoint=null,dirty=false,strokeBefore=null;
let db=null,saveTimer,saveQueue=Promise.resolve(),toastTimer,ready=false,draftTimer;
const textures=new Map(),decorTextures=new Map(),art={};
const asset='../../assets/game/2d/fish/';
for(const [key,file] of Object.entries({plant:'seaweed_green_a.png',rock:'background_rock_a.png'})){const img=new Image();img.src=asset+file;art[key]=img;}
const id=()=>globalThis.crypto?.randomUUID?.()||'fish-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function showDialog(name){pointer=null;$(name).showModal();}
function updateUI(){
 $('count').textContent=creatures.length;$('pearls').textContent=w.pearls;$('welcome').hidden=creatures.length>0;
 $('tankTitle').textContent=w.fish.length?'내 작은 바다 · '+w.fish.length+'명의 친구':(creatures.length?'친구들이 보관함에서 쉬고 있어요':'첫 번째 작은 바다');
 if(selected){const f=w.fish.find(f=>f.id===selected);const c=creatures.find(c=>c.id===selected);if(c&&f){$('fishName').textContent=c.name;$('fishStatus').textContent=f.state+' · 먹이 '+f.meals+'번';}else{$('fishCard').hidden=true;selected=null;}}
}
function data(){return{version:1,creatures:creatures.map(c=>{const f=w.fish.find(f=>f.id===c.id);return{...c,meals:f?.meals??c.meals,x:f?.x??c.x,y:f?.y??c.y,active:!!f};}),decor:w.decor.map(d=>({...d})),theme,pearls:w.pearls,meals:w.meals,castleUnlocked};}
function openDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open('kidscade-doodle-aquarium',1);request.onupgradeneeded=()=>request.result.createObjectStore('saves');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function read(key){return new Promise((resolve,reject)=>{const r=db.transaction('saves').objectStore('saves').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function write(key,value){return new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
function persist(){clearTimeout(saveTimer);if(!ready)return Promise.resolve();if(!db){$('saveStatus').textContent='자동 저장 불가 · 설정에서 수조 파일을 저장해 주세요';return Promise.resolve();}const snapshot=data();saveQueue=write('aquarium',snapshot).then(()=>{$('saveStatus').textContent='✓ 이 브라우저에 저장했어요';}).catch(()=>{$('saveStatus').textContent='저장 공간 부족 · 수조 파일을 저장해 주세요';});return saveQueue;}
function scheduleSave(){persist();}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('그림을 읽지 못했어요.'));img.src=src;});}
async function applyData(raw){
 const checked=C.validateSave(raw);const images=await Promise.all(checked.creatures.map(c=>loadImage(c.image)));const deco=await Promise.all(checked.decor.map(d=>d.kind==='drawing'?loadImage(d.image):null));
 // All validation and decoding finish before replacing the current aquarium.
 creatures=checked.creatures;w=C.world();theme=checked.theme;w.pearls=checked.pearls;w.meals=checked.meals;castleUnlocked=checked.castleUnlocked;w.decor=checked.decor;textures.clear();decorTextures.clear();
 creatures.forEach((c,i)=>{textures.set(c.id,images[i]);if(c.active!==false){const f=C.fish(c.id,c.personality);Object.assign(f,{x:c.x,y:c.y,meals:c.meals});w.fish.push(f);}});w.decor.forEach((d,i)=>{if(deco[i])decorTextures.set(d,deco[i]);});
 $('theme').value=theme;selected=null;$('fishCard').hidden=true;updateUI();
}
const palettes={lagoon:['#0b4a59','#166c78','#082b42','#b4d9bf'],night:['#12283f','#243b62','#0b162d','#9ea7c0'],sunset:['#654d69','#b27e81','#214258','#e6c5a4']};
function aspect(){return tank.clientWidth*600/Math.max(1,tank.clientHeight*1000);}
function rock(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s*aspect());if(art.rock?.complete&&art.rock.naturalWidth)ctx.drawImage(art.rock,-74,-60,148,80);else{ctx.fillStyle='#587b7e';ctx.beginPath();ctx.ellipse(0,0,70,40,0,0,7);ctx.fill();}ctx.restore();}
function plant(x,y,s,t){ctx.save();ctx.translate(x,y);ctx.scale(s,s*aspect());ctx.rotate(reduced?0:Math.sin(t*1.3+x)*.025);if(art.plant?.complete&&art.plant.naturalWidth)ctx.drawImage(art.plant,-37,-145,74,155);else{for(let i=-2;i<=2;i++){ctx.strokeStyle=i%2?'#6bbaa2':'#a6d1ad';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(i*9,0);ctx.bezierCurveTo(i*18,-50,i*25,-80,i*19,-130+Math.abs(i)*20);ctx.stroke();for(let j=1;j<4;j++){ctx.beginPath();ctx.ellipse(i*17+(j%2?10:-10),-j*27,14,5,(j%2?-1:1)*.5,0,7);ctx.fillStyle='#75b59b';ctx.fill();}}}ctx.restore();}
function drawDecor(d,t){if(d.kind==='rock')rock(d.x,d.y,d.scale);else if(d.kind==='plant')plant(d.x,d.y,d.scale,t);else if(d.kind==='castle'){ctx.save();ctx.translate(d.x,d.y);ctx.scale(d.scale,d.scale*aspect());ctx.fillStyle='#93b6b4';ctx.fillRect(-40,-80,80,80);for(let i=-1;i<=1;i+=2){ctx.fillRect(i*40-15,-110,30,110);for(let j=0;j<3;j++)ctx.fillRect(i*40-17+j*12,-120,9,15);}ctx.fillStyle='#174b56';ctx.beginPath();ctx.arc(0,-24,17,Math.PI,0);ctx.lineTo(17,0);ctx.lineTo(-17,0);ctx.fill();ctx.restore();}else{const img=decorTextures.get(d);if(img){const width=140*d.scale,height=width*img.height/img.width*aspect();ctx.save();ctx.translate(d.x,d.y);ctx.rotate(reduced?0:Math.sin(t+d.x)*.02);ctx.drawImage(img,-width/2,-height,width,height);ctx.restore();}}}
function drawFish(f,t){
 const c=creatures.find(c=>c.id===f.id),img=textures.get(f.id);if(!c||!img)return;
 const growth=.72+Math.min(f.meals,15)*.018;const width=135*growth*Math.max(1,650/Math.max(320,tank.clientWidth)),height=width*img.height/img.width*aspect();const facing=(c.head==='right'?1:-1)*f.heading;
 ctx.save();ctx.translate(f.x,f.y+(c.swim==='float'?Math.sin(t*1.5+f.phase)*7:0));ctx.rotate(C.clamp(f.vy/200,-.15,.15));ctx.scale(Math.abs(facing)<.12?.12:facing,1);
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 // Texture strips flex toward the tail; head remains legible.
 const strips=24;
 for(let i=0;i<strips;i++){const u=i/strips;const tail=c.head==='right'?1-u:u;const wave=reduced?0:Math.sin(t*(c.swim==='eel'?6:4)+f.phase-tail*4)*tail*tail*(c.swim==='eel'?11:c.swim==='float'?2:6);ctx.drawImage(img,i*img.width/strips,0,img.width/strips,img.height,-width/2+i*width/strips,-height/2+wave,width/strips+.5,height);}
 ctx.restore();
 if(selected===f.id){ctx.save();ctx.strokeStyle='#d6f6b9';ctx.setLineDash([3,6]);ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(f.x,f.y,width*.65,height*.65+8,0,0,7);ctx.stroke();ctx.restore();}
}
function render(){
 const t=w.time,[top,mid,bottom,sand]=palettes[theme],g=ctx.createLinearGradient(0,0,0,600);g.addColorStop(0,top);g.addColorStop(.5,mid);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,1000,600);
 ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<6;i++){ctx.fillStyle='#c8ffe005';ctx.beginPath();ctx.moveTo(150+i*180,0);ctx.lineTo(40+i*170+Math.sin(t*.1)*20,550);ctx.lineTo(170+i*170,550);ctx.lineTo(220+i*180,0);ctx.fill();}ctx.restore();
 ctx.fillStyle='#b3e9d43b';for(let i=0;i<70;i++){const x=(i*157.31)%1000,y=(i*81.1-(reduced?0:t*(2+i%3))+60000)%600;ctx.beginPath();ctx.arc(x,y,.6+i%3*.3,0,7);ctx.fill();}
 rock(70,550,1.7);rock(910,560,2.2);plant(110,565,1.1,t);plant(860,560,.85,t);
 const floor=ctx.createLinearGradient(0,535,0,600);floor.addColorStop(0,sand);floor.addColorStop(1,'#507e7e');ctx.fillStyle=floor;ctx.beginPath();ctx.moveTo(0,555);for(let x=0;x<=1000;x+=10)ctx.lineTo(x,557+Math.sin(x*.008)*9+Math.sin(x*.027)*3);ctx.lineTo(1000,600);ctx.lineTo(0,600);ctx.fill();
 for(let i=0;i<120;i++){ctx.fillStyle=i%2?'#204e4930':'#efffe425';ctx.fillRect((i*83.83)%1000,567+(i*17)%31,1.6,1.3);}
 for(const d of w.decor)drawDecor(d,t);
 for(const p of w.food){ctx.fillStyle='#f6bc78';ctx.beginPath();ctx.arc(p.x,p.y,3.6,0,7);ctx.fill();}
 for(const f of [...w.fish].sort((a,b)=>a.y-b.y))drawFish(f,t);
 for(const p of w.bubbles){ctx.strokeStyle='#cbfff67a';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.stroke();ctx.fillStyle='#efffff88';ctx.beginPath();ctx.arc(p.x-p.r*.3,p.y-p.r*.3,1,0,7);ctx.fill();}
 if(keyboardActive){ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(keyboard.x,keyboard.y,12,0,7);ctx.stroke();}
 if(placing&&pointer){ctx.save();ctx.globalAlpha=.6;drawDecor({kind:placing,x:pointer.x,y:pointer.y,scale:1},t);ctx.restore();}
}
function coords(e,canvas=tank){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
function setMode(value){mode=value;placing=null;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));$('hint').textContent=mode==='watch'?'친구를 눌러 관찰해요 · 장식은 끌어서 옮겨요':mode==='feed'?'수조를 톡 눌러 먹이를 주세요':'수조를 톡 눌러 거품을 만들어요';}
function act(p){if(paused){toast('일시정지를 풀면 함께 놀 수 있어요.');return;}
 if(placing){if(w.decor.length>=50){toast('장식은 50개까지 놓을 수 있어요.');return;}w.decor.push({kind:placing,x:C.clamp(p.x,50,950),y:C.clamp(p.y,130,550),scale:1});placing=null;setMode('watch');scheduleSave();return;}
 if(mode==='feed'){if(C.feed(w,p.x,p.y))$('hint').textContent='누가 먼저 먹이를 발견할까요?';else toast('친구들이 먼저 먹을 시간을 주세요.');}
 else if(mode==='bubble')C.bubble(w,p.x,p.y);
 else{const f=[...w.fish].reverse().find(f=>Math.hypot(f.x-p.x,f.y-p.y)<65);if(f)selectFish(f.id);else{$('fishCard').hidden=true;selected=null;}}
}
function selectFish(id){selected=id;$('fishCard').hidden=false;updateUI();}
let pressPoint=null;
tank.addEventListener('pointerdown',e=>{tank.setPointerCapture(e.pointerId);pressPoint=coords(e);pointer=pressPoint;keyboardActive=false;if(mode==='watch'&&!placing)drag=[...w.decor].reverse().find(d=>Math.abs(d.x-pointer.x)<65&&Math.abs(d.y-65-pointer.y)<90);});
tank.addEventListener('pointermove',e=>{pointer=coords(e);if(drag){drag.x=C.clamp(pointer.x,40,960);drag.y=C.clamp(pointer.y+65,90,550);}});
tank.addEventListener('pointerup',e=>{const p=coords(e);if(drag){drag=null;scheduleSave();}else if(pressPoint&&Math.hypot(p.x-pressPoint.x,p.y-pressPoint.y)<20)act(p);pressPoint=null;});
tank.addEventListener('pointercancel',()=>{drag=null;pressPoint=null;pointer=null;});tank.addEventListener('pointerleave',()=>{if(!drag)pointer=null;});
tank.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();keyboardActive=true;if(e.key==='ArrowLeft')keyboard.x-=25;if(e.key==='ArrowRight')keyboard.x+=25;if(e.key==='ArrowUp')keyboard.y-=25;if(e.key==='ArrowDown')keyboard.y+=25;keyboard.x=C.clamp(keyboard.x,45,955);keyboard.y=C.clamp(keyboard.y,45,530);pointer={...keyboard};if(e.key==='Enter'||e.key===' ')act(keyboard);}});
function setPaused(value){paused=value;$('pauseBtn').textContent=paused?'▶':'Ⅱ';$('pauseBtn').setAttribute('aria-label',paused?'수조 계속하기':'수조 일시정지');}
$('pauseBtn').onclick=()=>{if(window.KidscadeGame)window.KidscadeGame.togglePause();else setPaused(!paused);};
$('homeBtn').onclick=()=>{persist();if(!window.KidscadeGame?.exit())window.location.assign('../../');};
window.KidscadeGame?.registerPauseHandlers({pause:()=>setPaused(true),resume:()=>setPaused(false)});
let disposed=false;window.KidscadeGame?.registerCleanup(()=>{disposed=true;persist();});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('closeFish').onclick=()=>{selected=null;$('fishCard').hidden=true;};$('removeFish').onclick=()=>{const f=w.fish.find(f=>f.id===selected),c=creatures.find(c=>c.id===selected);if(!f||!c)return;Object.assign(c,{meals:f.meals,x:f.x,y:f.y,active:false});w.fish=w.fish.filter(f=>f.id!==selected);selected=null;$('fishCard').hidden=true;updateUI();scheduleSave();toast('친구를 보관했어요. 내 친구들에서 다시 만나요.');};
$('editFish').onclick=()=>openEditor('fish',selected);
function openCollection(){const list=$('friendList');list.replaceChildren();for(const c of creatures){const tile=document.createElement('div');tile.className='friend-tile';const img=document.createElement('img');img.src=c.image;img.alt=c.name;const name=document.createElement('b');name.textContent=c.name;const info=document.createElement('small'),f=w.fish.find(f=>f.id===c.id);info.textContent=f?'바다에서 헤엄치는 중':'보관함에서 쉬는 중';const b=document.createElement('button');b.textContent=f?'친구 만나기':'바다에 놓아주기';b.onclick=()=>{if(f){$('collection').close();selectFish(c.id);}else{const next=C.fish(c.id,c.personality);next.meals=c.meals||0;w.fish.push(next);c.active=true;updateUI();scheduleSave();$('collection').close();toast('다시 만나 반가워!');}};const edit=document.createElement('button');edit.textContent='그림 고치기';edit.onclick=()=>{$('collection').close();openEditor('fish',c.id);};tile.append(img,name,info,b,edit);list.append(tile);}if(!creatures.length){const p=document.createElement('p');p.textContent='아직 친구가 없어요. 첫 친구를 그려 주세요.';list.append(p);}showDialog('collection');}
$('collectionBtn').onclick=openCollection;
// Painting: full-resolution snapshots keep erasing, filling and imported art undoable.
function snapshot(){history=history.slice(0,historyIndex+1);history.push(pen.getImageData(0,0,640,480));if(history.length>20)history.shift();historyIndex=history.length-1;historyButtons();draft();}
function historyButtons(){$('undoBtn').disabled=historyIndex<=0;$('redoBtn').disabled=historyIndex>=history.length-1;}
function draft(){dirty=true;clearTimeout(draftTimer);draftTimer=setTimeout(()=>{if(db)write('draft',{image:paper.toDataURL(),kind:editorKind,name:$('creatureName').value,editing,personality:$('personality').value,head:$('headDirection').value,swim:$('swimType').value}).catch(()=>{});},600);}
function restoreHistory(i){if(i<0||i>=history.length)return;historyIndex=i;pen.putImageData(history[i],0,0);historyButtons();draft();}
$('undoBtn').onclick=()=>restoreHistory(historyIndex-1);$('redoBtn').onclick=()=>restoreHistory(historyIndex+1);
function setKind(kind){editorKind=kind;document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.kind===kind));$('fishOptions').hidden=kind!=='fish';$('directionHint').hidden=kind!=='fish';$('releaseBtn').textContent=kind==='fish'?'바다에 놓아주기 ↗':'수조에 놓아주기 ↗';}
async function openEditor(kind='fish',editId=null){
 if(!ready)return;clearTimeout(draftTimer);
 editing=editId;setKind(kind);history=[];historyIndex=-1;pen.clearRect(0,0,640,480);$('creatureName').value='';$('personality').value='curious';$('headDirection').value='left';$('swimType').value='fish';$('editorTitle').textContent=editId?'친구 그림 고치기':'새 친구 그리기';$('editorMessage').textContent='작은 점 하나부터 시작해도 좋아요.';
 const c=creatures.find(c=>c.id===editId);
 if(c){const img=textures.get(c.id);fitImage(img);$('creatureName').value=c.name;$('personality').value=c.personality;$('headDirection').value=c.head;$('swimType').value=c.swim;}
 else if(db){try{const saved=await read('draft');if(saved&&saved.kind===kind&&!saved.editing&&saved.image){fitImage(await loadImage(saved.image),true);$('creatureName').value=saved.name||'';$('personality').value=saved.personality||'curious';$('headDirection').value=saved.head||'left';$('swimType').value=saved.swim||'fish';$('editorMessage').textContent='그리던 그림을 이어서 그릴 수 있어요.';}}catch{}}
 snapshot();dirty=false;$('directionHint').textContent=$('headDirection').value==='left'?'← 머리 · 꼬리 →':'← 꼬리 · 머리 →';showDialog('editor');
}
$('drawBtn').onclick=()=>openEditor();$('firstBtn').onclick=()=>openEditor();document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{setKind(b.dataset.kind);draft();});
function fitImage(img,full=false){if(!img)return;const scale=Math.min((full?640:540)/img.width,(full?480:370)/img.height);pen.clearRect(0,0,640,480);pen.drawImage(img,(640-img.width*scale)/2,(480-img.height*scale)/2,img.width*scale,img.height*scale);}
function setTool(t){tool=t;document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
const colors=['#ffad76','#ffd976','#c6edba','#74c6ba','#81b8dc','#b4a2e1','#ef9db5','#f4f1de','#e16d5c','#b99c6b','#5d966d','#2b7781','#46628d','#766091','#344958','#152d3d'];
function setColor(value){color=value;$('colorPicker').value=value;document.querySelectorAll('#palette button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.color===value));}
for(const value of colors){const b=document.createElement('button');b.style.background=value;b.dataset.color=value;b.setAttribute('aria-label','색 '+value);b.setAttribute('aria-pressed',String(value===color));b.onclick=()=>setColor(value);$('palette').append(b);}$('colorPicker').oninput=e=>setColor(e.target.value);
function template(name){pen.save();pen.globalCompositeOperation='source-over';pen.fillStyle=color;pen.beginPath();
 if(name==='round'){pen.ellipse(290,235,155,105,0,0,7);pen.fill();pen.beginPath();pen.moveTo(410,235);pen.lineTo(540,150);pen.quadraticCurveTo(510,235,540,320);pen.closePath();pen.fill();pen.beginPath();pen.moveTo(230,145);pen.quadraticCurveTo(335,65,350,150);pen.fill();}
 else if(name==='long'){pen.ellipse(290,230,205,60,0,0,7);pen.fill();pen.beginPath();pen.moveTo(450,230);pen.lineTo(560,175);pen.lineTo(540,280);pen.closePath();pen.fill();}
 else if(name==='jelly'){pen.arc(320,210,115,Math.PI,0);pen.quadraticCurveTo(320,265,205,210);pen.fill();pen.strokeStyle=color;pen.lineWidth=15;pen.lineCap='round';for(let i=0;i<5;i++){pen.beginPath();pen.moveTo(235+i*43,220);pen.bezierCurveTo(210+i*43,290,265+i*43,305,235+i*43,380);pen.stroke();}$('swimType').value='float';}
 else{setKind('drawing');pen.strokeStyle=color;pen.lineWidth=12;pen.lineCap='round';for(let i=-1;i<=1;i++){pen.beginPath();pen.moveTo(320,410);pen.quadraticCurveTo(320+i*100,220,320+i*120,80+Math.abs(i)*70);pen.stroke();for(let j=1;j<5;j++){pen.beginPath();pen.ellipse(320+i*j*24+(j%2?24:-24),410-j*60,36,14,(j%2?-1:1)*.5,0,7);pen.fill();}}}pen.restore();snapshot();}
document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>template(b.dataset.template));
$('clearBtn').onclick=()=>{pen.clearRect(0,0,640,480);snapshot();};
function fill(x,y){
 const img=pen.getImageData(0,0,640,480),a=img.data,at=(y*640+x)*4,target=Array.from(a.slice(at,at+4)),replacement=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16),255];if(target.every((v,i)=>v===replacement[i]))return;
 const seen=new Uint8Array(640*480),stack=[y*640+x];while(stack.length){const n=stack.pop();if(seen[n])continue;seen[n]=1;const p=n*4;if(!target.every((v,i)=>Math.abs(a[p+i]-v)<=25))continue;for(let j=0;j<4;j++)a[p+j]=replacement[j];const cx=n%640;if(cx>0)stack.push(n-1);if(cx<639)stack.push(n+1);if(n>=640)stack.push(n-640);if(n<640*479)stack.push(n+640);}pen.putImageData(img,0,0);
}
function stroke(p){pen.save();pen.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';pen.strokeStyle=color;pen.fillStyle=color;pen.lineWidth=Number($('brushSize').value);pen.lineCap='round';pen.lineJoin='round';if(lastPoint){pen.beginPath();pen.moveTo(lastPoint.x,lastPoint.y);pen.lineTo(p.x,p.y);pen.stroke();}else{pen.beginPath();pen.arc(p.x,p.y,pen.lineWidth/2,0,7);pen.fill();}pen.restore();lastPoint=p;}
paper.addEventListener('pointerdown',e=>{e.preventDefault();paper.setPointerCapture(e.pointerId);const p=coords(e,paper);p.x=C.clamp(p.x,0,639);p.y=C.clamp(p.y,0,479);strokeBefore=pen.getImageData(0,0,640,480);if(tool==='fill'){fill(Math.floor(p.x),Math.floor(p.y));snapshot();return;}if(tool==='eye'){pen.save();pen.fillStyle='#fff9ea';pen.beginPath();pen.arc(p.x,p.y,18,0,7);pen.fill();pen.fillStyle='#163741';pen.beginPath();pen.arc(p.x-3,p.y,10,0,7);pen.fill();pen.fillStyle='#fff';pen.beginPath();pen.arc(p.x-6,p.y-4,3,0,7);pen.fill();pen.restore();snapshot();return;}drawing=true;lastPoint=null;stroke(p);});
paper.addEventListener('pointermove',e=>{if(drawing){const points=e.getCoalescedEvents?.();for(const point of points?.length?points:[e])stroke(coords(point,paper));}});
paper.addEventListener('pointerup',()=>{if(drawing){drawing=false;lastPoint=null;snapshot();}});paper.addEventListener('pointercancel',()=>{if(drawing){drawing=false;if(strokeBefore)pen.putImageData(strokeBefore,0,0);lastPoint=null;}});
$('creatureName').oninput=draft;['personality','headDirection','swimType'].forEach(key=>$(key).onchange=()=>{draft();if(key==='headDirection')$('directionHint').textContent=$('headDirection').value==='left'?'← 머리 · 꼬리 →':'← 꼬리 · 머리 →';});
$('imageInput').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.type!=='image/png'||file.size>8*1024*1024){$('editorMessage').textContent='8MB 이하 PNG 그림을 골라 주세요.';return;}try{const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});const img=await loadImage(src);if(img.width>4096||img.height>4096)throw Error('가로·세로 4096px 이하 그림을 골라 주세요.');fitImage(img);snapshot();$('editorMessage').textContent='그림을 가져왔어요. 지우개로 배경을 지울 수 있어요.';}catch(err){$('editorMessage').textContent=err.message||'그림을 읽지 못했어요.';}};
function crop(){const a=pen.getImageData(0,0,640,480).data;let minX=640,minY=480,maxX=-1,maxY=-1;for(let y=0;y<480;y++)for(let x=0;x<640;x++)if(a[(y*640+x)*4+3]>15){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}if(maxX<minX)return null;const out=document.createElement('canvas');out.width=Math.max(8,maxX-minX+9);out.height=Math.max(8,maxY-minY+9);out.getContext('2d').drawImage(paper,minX,minY,maxX-minX+1,maxY-minY+1,4,4,maxX-minX+1,maxY-minY+1);return out.toDataURL('image/png');}
$('releaseBtn').onclick=async()=>{
 const image=crop();if(!image){$('editorMessage').textContent='그림을 조금 그린 뒤 놓아 주세요.';return;}
 if(editorKind==='fish'&&!editing&&creatures.length>=30){$('editorMessage').textContent='친구는 보관함을 포함해 30명까지 함께할 수 있어요.';return;}if(editorKind!=='fish'&&w.decor.length>=50){$('editorMessage').textContent='장식은 50개까지 놓을 수 있어요.';return;}
 const isNewCreation=!editing||editorKind!=='fish';
 $('releaseBtn').disabled=true;try{const img=await loadImage(image);if(editorKind==='fish'){let c=creatures.find(c=>c.id===editing);if(!c){c={id:id(),meals:0,active:true};creatures.push(c);w.fish.push(C.fish(c.id,$('personality').value));}Object.assign(c,{name:$('creatureName').value.trim()||'작은 친구 '+creatures.length,image,personality:$('personality').value,head:$('headDirection').value,swim:$('swimType').value});textures.set(c.id,img);const f=w.fish.find(f=>f.id===c.id);if(f){f.personality=c.personality;C.bubble(w,f.x,f.y);}}else{const d={kind:'drawing',image,x:500,y:545,scale:1};w.decor.push(d);decorTextures.set(d,img);}
 clearTimeout(draftTimer);if(db)await write('draft',null).catch(()=>{});dirty=false;$('editor').close();setMode('watch');updateUI();await persist();if(isNewCreation)window.KidscadeGame?.result({scope:'creation',status:'completed',outcome:'clear',completed:true,creationSaved:true,endsSession:false});toast(editorKind==='fish'?'안녕! 내 작은 바다에 온 걸 환영해.':'새 장식을 놓았어요. 끌어서 옮겨 보세요.');
 }catch{$('editorMessage').textContent='그림을 놓지 못했어요. 다시 시도해 주세요.';}finally{$('releaseBtn').disabled=false;}
};
$('editor').addEventListener('close',()=>{drawing=false;lastPoint=null;if(dirty){clearTimeout(draftTimer);if(db)write('draft',{image:paper.toDataURL(),kind:editorKind,name:$('creatureName').value,editing,personality:$('personality').value,head:$('headDirection').value,swim:$('swimType').value}).catch(()=>{});}});
$('exampleBtn').onclick=async()=>{await openEditor();setColor('#ffad76');template('round');pen.fillStyle='#173c49';pen.beginPath();pen.arc(210,220,14,0,7);pen.fill();pen.fillStyle='#fff';pen.beginPath();pen.arc(206,215,4,0,7);pen.fill();snapshot();$('creatureName').value='살구';$('releaseBtn').click();};
$('decorateBtn').onclick=()=>showDialog('decorations');$('drawDecor').onclick=()=>{$('decorations').close();openEditor('drawing');};
document.querySelectorAll('[data-decor]').forEach(b=>b.onclick=()=>{const kind=b.dataset.decor;if(kind==='castle'&&!castleUnlocked){if(w.pearls<3){$('decorMessage').textContent='작은 성은 진주 3개로 해금해요. 먹이를 먹으면 진주를 발견해요.';return;}w.pearls-=3;castleUnlocked=true;updateUI();scheduleSave();}placing=kind;mode='watch';$('decorations').close();$('hint').textContent='마음에 드는 자리를 눌러 장식을 놓아 주세요';});
$('settingsBtn').onclick=()=>showDialog('settings');$('theme').onchange=e=>{theme=e.target.value;scheduleSave();};$('motion').checked=reduced;$('motion').onchange=e=>reduced=e.target.checked;
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
$('exportBtn').onclick=()=>download(new Blob([JSON.stringify(data())],{type:'application/json'}),'낙서바다_수조.json');
$('photoBtn').onclick=()=>{render();tank.toBlob(blob=>{if(blob)download(blob,'낙서바다_사진.png');});};
$('importInput').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>45*1024*1024)throw Error('45MB 이하 수조 파일을 골라 주세요.');const raw=JSON.parse(await file.text());C.validateSave(raw);if(creatures.length&&!confirm('현재 수조를 이 파일로 바꿀까요? 보관할 수조는 먼저 수조 파일로 저장해 주세요.'))return;await applyData(raw);await persist();$('settingsMessage').textContent='수조를 불러왔어요.';}catch(err){$('settingsMessage').textContent=err.message||'수조 파일을 읽지 못했어요.';}};
let last=performance.now(),lastUI=0;function loop(now){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;if(!paused&&!document.hidden&&!$('editor').open){const before=w.meals;C.step(w,dt,Math.random,pointer);if(before!==w.meals){scheduleSave();if(w.meals%3===0)toast('친구가 진주를 발견했어요! 꾸미기에 써 보세요.');}}render();if(now-lastUI>300){updateUI();lastUI=now;}requestAnimationFrame(loop);}
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden)persist();});window.addEventListener('pagehide',()=>persist());
(async()=>{try{db=await openDB();const saved=await read('aquarium');if(saved)await applyData(saved);$('saveStatus').textContent='✓ 이 브라우저에 자동 저장해요';}catch{$('saveStatus').textContent='자동 저장 불가 · 설정에서 수조 파일을 저장해 주세요';}ready=true;window.KidscadeGame?.start();if(creatures.length)setMode('watch');updateUI();requestAnimationFrame(loop);})();
})();
