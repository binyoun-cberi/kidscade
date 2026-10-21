(()=>{'use strict';
const E=window.FractionSmithMath,P=window.FractionSmithPuzzles,A=window.FractionSmithAvatar,O=window.FractionSmithOrders,F=window.FractionSmithForge,S=window.FractionSmithProgress,M=window.FractionSmithMetal,V=window.FractionSmithArt;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const el={order:$('#orderCount'),score:$('#score'),gold:$('#gold'),heat:$('#heat'),timer:$('#timer'),target:$('#targetValue'),targetBar:$('#targetBar'),orderArt:$('#orderArt'),meta:$('#orderMeta'),customer:$('#customerName'),customerIcon:$('#customerIcon'),item:$('#itemName'),request:$('#requestText'),chainLabel:$('#chainLabel'),chainFill:$('#chainFill'),material:$('#materialName'),tray:$('#materialTray'),slotA:$('#slotA'),slotB:$('#slotB'),anvil:$('#anvil'),op:$('#opBadge'),equation:$('#equationLine'),result:$('#resultPop'),toast:$('#toast'),ghost:$('#toolGhost'),fx:$('#fxLayer'),avatar:$('#avatarImg'),avatarFallback:$('#avatarFallback'),stageTool:$('#stageTool'),sound:$('#soundBtn'),hint:$('#hintBtn'),undo:$('#undoBtn'),restart:$('#restartBtn'),shopBtn:$('#shopBtn'),shop:$('#shopModal'),shopClose:$('#shopCloseBtn'),shopGold:$('#shopGold'),upgradeGrid:$('#upgradeGrid'),collectionGrid:$('#collectionGrid'),collectionCount:$('#collectionCount'),start:$('#startModal'),finish:$('#finishModal'),finishTitle:$('#finishTitle'),finishText:$('#finishText'),finishScore:$('#finishScore'),craft:$('#craftModal'),craftStep:$('#craftStep'),craftName:$('#craftOrderName'),craftTitle:$('#craftTitle'),craftInstruction:$('#craftInstruction'),craftScene:$('#craftScene'),craftProduct:$('#craftProduct'),craftGrade:$('#craftGrade'),craftBurst:$('#craftBurst'),craftMeter:$('#craftMeter'),craftFill:$('#craftMeterFill'),craftMarker:$('#craftTimingMarker'),hammerHits:$('#hammerHits'),craftStatus:$('#craftStatus'),craftAction:$('#craftActionBtn'),craftTip:$('#craftTip'),savedProgress:$('#savedProgress'),partCaption:$('#partCaption'),partName:$('#partName'),partInstruction:$('#partInstruction'),blueprintParts:$('#blueprintParts'),cutStatus:$('#cutStatus'),cutPreview:$('#cutPreview'),customerBay:$('#customerBay'),customerSpeech:$('#customerSpeech'),visitorSprite:$('#visitorSprite'),deliveryArt:$('#deliveryArt'),deliverBtn:$('#deliverBtn')};
const AUDIO={
 select:'../../assets/audio/ui/kenney_interface/select_002.ogg',
 confirm:'../../assets/audio/ui/kenney_interface/confirmation_001.ogg',
 error:'../../assets/audio/ui/kenney_interface/error_002.ogg',
 whoosh:'../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',
 impact:'../../assets/audio/sfx/combat/impact-heavy-01.mp3',
 drop:'../../assets/audio/sfx/collect/coin-drop-01.mp3',
 pickup:'../../assets/audio/sfx/collect/coin-pickup-01.mp3',
 yay:'../../assets/audio/sfx/success/cheer-yay-01.mp3',
 woo:'../../assets/audio/sfx/success/cheer-woohoo-01.mp3',
 fanfare:'../../assets/audio/sfx/success/victory-fanfare-01.mp3'
};
const TOOL={'+':{kind:'add',emoji:'🔨',hit:.55,duration:720},'-':{kind:'sub',emoji:'🔧',hit:.62,duration:760},'×':{kind:'mul',emoji:'⚒️',hit:.64,duration:900},'÷':{kind:'div',emoji:'🪓',hit:.57,duration:790}};
const UPGRADES=[
 {id:'furnace',icon:'🔥',name:'고급 화로',benefit:'풀무질 횟수가 단계별로 줄어듭니다'},
 {id:'hammer',icon:'🔨',name:'정밀 망치',benefit:'망치질 황금 구간이 넓어집니다'},
 {id:'counter',icon:'💰',name:'거래 진열대',benefit:'주문 골드 보상 +15% → +30%'}
];
const SPARKS=[1,2,3,4,5,6,7].map(n=>'../../assets/game/effects/particles/kenney-particle-pack/spark-0'+n+'.png');
let sound=true,avatar=null,sequence=0,progress=S.load(),state={mode:'practice',phase:'menu',puzzle:null,commission:null,craft:null,parts:[],partIndex:0,partQuality:[],partLengths:[],orderStrikes:0,bestTotal:0,allPerfect:true,pieces:new Map(),slots:[null,null],score:0,combo:0,heat:1,orders:0,strikes:0,time:0,running:false,busy:false,history:[],resultSeq:0,timerId:0};
function play(key,vol=.45){if(!sound)return;try{const a=new Audio(AUDIO[key]);a.volume=vol;a.play().catch(()=>{})}catch(_){}}
function toast(msg,ms=1350){el.toast.textContent=msg;el.toast.classList.add('show');clearTimeout(el.toast._t);el.toast._t=setTimeout(()=>el.toast.classList.remove('show'),ms)}
function pieceDisplay(p){return E.display(p.value,p.prefer)}
function pieceHTML(p){return '<span class="piece-value">'+pieceDisplay(p)+'</span>'+M.markup(p.value)}
function snapshot(){return {pieces:[...state.pieces.values()].map(p=>({id:p.id,value:E.make(p.value.n,p.value.d),prefer:p.prefer})),slots:[...state.slots],strikes:state.strikes}}
function restore(s){state.pieces=new Map(s.pieces.map(p=>[p.id,p]));state.slots=[...s.slots];state.strikes=s.strikes;render()}
function drawBlueprint(){
 const parts=state.parts;
 el.blueprintParts.innerHTML=parts.map((part,i)=>'<span class="'+(i<state.partIndex?'done':i===state.partIndex?'active':'')+'">'+(i<state.partIndex?'✓ ':i===state.partIndex?'▸ ':'')+(i+1)+'. '+part.name+' · '+(state.partLengths[i]?'완료 '+E.toFraction(state.partLengths[i]):state.mode==='master'?(part.measure||'맞춤 주문'):'목표 '+part.metal)+'</span>').join('');
 const part=parts[state.partIndex]||parts[0];
 el.partCaption.textContent='부품 '+(state.partIndex+1)+' / '+parts.length;
 el.partName.textContent=part.name;
 el.partInstruction.textContent=part.instruction+' · 목표 금속 '+(part.measure||part.metal);
}
function newPuzzle(nextPart=false){
 sequence++;
 if(!nextPart){
   state.commission=O.create(state.orders,state.mode,progress.crafted);
   state.parts=V.parts(state.commission.item.id).slice(0,state.mode==='rush'?1:2);
   state.partIndex=0;state.partQuality=[];state.partLengths=[];state.orderStrikes=0;state.bestTotal=0;state.allPerfect=true;
   el.customer.textContent=state.commission.customer.name;el.customerIcon.textContent='';
   el.item.textContent=state.commission.item.name;el.request.textContent=state.commission.item.request;
   el.visitorSprite.src=V.customer(state.commission.item.customer);
   el.orderArt.innerHTML=V.model(state.commission.item.id,2);
   el.customerSpeech.textContent=state.commission.item.request;
   el.customerBay.classList.remove('ready','pleased');el.deliveryArt.innerHTML='';el.deliverBtn.disabled=true;
 }
 const part=state.parts[state.partIndex];
 state.puzzle=P.createFor(state.mode,part);part.measure=E.toFraction(state.puzzle.target);
 state.pieces=new Map(state.puzzle.materials.map(p=>[p.id,{...p}]));state.slots=[null,null];state.strikes=0;state.history=[];state.busy=false;
 state.phase='math';state.craft=null;el.craft.classList.remove('open');
 el.material.textContent=part.name+' · '+state.commission.item.material+' '+part.measure;
 el.target.textContent=state.puzzle.targetDisplay;el.targetBar.innerHTML=M.markup(state.puzzle.target);
 el.meta.textContent='재단 포함 최단 '+state.puzzle.bestStrikes+'번 가공';el.op.textContent='?';el.equation.textContent='금속 두 개를 모루에 올려요';drawBlueprint();render();
 if(state.orders===0&&state.partIndex===0&&state.mode==='practice')toast('금속을 모루에 올려 붙이거나, 재단대에서 잘라 보세요!',2700)
}
function render(){
 document.body.dataset.phase=state.phase;
 document.body.dataset.heat=String(Math.max(1,state.heat));
 document.body.dataset.mode=state.mode;
 for(const id of Object.keys(progress.upgrades))document.body.dataset[id]=String(progress.upgrades[id]);
 el.order.textContent=state.orders;el.score.textContent=state.score;el.gold.textContent=progress.gold+' G';el.heat.textContent='🔥'.repeat(Math.max(1,state.heat));renderTimer();
 el.chainLabel.textContent='🔥 연속 '+state.combo+'회 · '+(3-state.combo%3)+'회 뒤 +25 G';
 el.chainFill.style.width=(state.combo%3/3*100)+'%';
 el.tray.innerHTML='';
 for(const p of state.pieces.values()){
   if(state.slots.includes(p.id))continue;
   const b=document.createElement('button');b.className='piece '+(p.prefer==='decimal'?'decimal':'');b.dataset.id=p.id;b.innerHTML=pieceHTML(p);bindPiece(b,p.id);el.tray.appendChild(b)
 }
 [el.slotA,el.slotB].forEach((slot,i)=>{
   const id=state.slots[i],p=id?state.pieces.get(id):null;slot.classList.toggle('filled',!!p);slot.innerHTML=p?'<span class="piece '+(p.prefer==='decimal'?'decimal':'')+'">'+pieceHTML(p)+'</span>':'<span>'+(i+1)+'</span>';
 });
 if(state.slots[0]&&state.slots[1]){const a=state.pieces.get(state.slots[0]),b=state.pieces.get(state.slots[1]);el.equation.textContent=pieceDisplay(a)+'  ?  '+pieceDisplay(b)+'  =  ?'}else el.equation.textContent='금속 두 개를 모루에 올려요';
 const selected=state.slots[0]?state.pieces.get(state.slots[0]):null;
 el.cutStatus.textContent=selected?'선택한 금속 '+pieceDisplay(selected)+'을 원하는 비율로 잘라 보세요.':'첫 번째 모루 칸에 금속을 올려 재단하세요.';
 el.cutPreview.innerHTML=selected?M.markup(selected.value):'';
 $$('[data-cut]').forEach(btn=>btn.disabled=state.phase!=='math'||state.busy||!selected||!M.cut(selected.value,Number(btn.dataset.cut)).ok);
 el.undo.disabled=state.phase!=='math'||state.history.length===0;el.restart.disabled=state.phase!=='math';el.hint.disabled=state.phase!=='math';
 el.shopBtn.disabled=state.phase!=='math'||state.mode==='rush';
}
function shopCard(parent,className,title,subtitle){
 const card=document.createElement('div');card.className=className;
 const heading=document.createElement('strong');heading.textContent=title;card.appendChild(heading);
 const caption=document.createElement('small');caption.textContent=subtitle;card.appendChild(caption);
 parent.appendChild(card);return card;
}
function renderShop(){
 el.shopGold.textContent=progress.gold+' G';el.upgradeGrid.innerHTML='';
 for(const upgrade of UPGRADES){
   const level=progress.upgrades[upgrade.id],cost=S.upgradeCost(progress,upgrade.id);
   const card=shopCard(el.upgradeGrid,'upgrade-card',upgrade.icon+' '+upgrade.name,'Lv.'+level+'/2 · '+upgrade.benefit);
   const button=document.createElement('button');button.className='upgrade-buy';
   button.textContent=cost===null?'최대 강화 완료':cost+' G · 강화하기';
   button.disabled=cost===null||progress.gold<cost;
   button.addEventListener('click',()=>buyUpgrade(upgrade.id));card.appendChild(button);
 }
 el.collectionGrid.innerHTML='';
 const unlocked=O.unlockedItems(progress.crafted);el.collectionCount.textContent=unlocked.length+'/'+O.ITEMS.length+'종 해금';
 for(const item of O.ITEMS){
   const open=progress.crafted>=item.unlockAt,count=progress.collection[item.id]||0;
   const card=shopCard(el.collectionGrid,'collection-card'+(open?'':' locked'),
     open?item.name:'미발견 제작품',open?'제작 '+count+'개':'누적 '+item.unlockAt+'개 제작 시 해금');
   if(open){
     const picture=document.createElement('div');picture.className='shop-product-art';
     const src=V.sprite(item.id);
     picture.innerHTML=src?'<img class="shop-sprite" src="'+src+'" alt="'+item.name+' 제작품 그림">':V.model(item.id,2);
     card.appendChild(picture);
   }
   if(count){const mark=document.createElement('span');mark.className='collection-made';mark.textContent='완성 ✓';card.appendChild(mark)}
 }
}
function openShop(){
 if(!state.running||state.busy||state.phase!=='math'||state.mode==='rush')return;
 state.phase='shop';render();renderShop();el.shop.classList.add('open');el.shopClose.focus();play('select',.25);
}
function closeShop(){
 if(state.phase!=='shop')return;
 state.phase='math';el.shop.classList.remove('open');render();el.shopBtn.focus();
}
function buyUpgrade(id){
 if(state.phase!=='shop')return;
 const result=S.purchase(progress,id);
 if(!result.ok){toast(result.reason==='gold'?'골드가 부족해요. 주문을 더 완성해 보세요!':'이미 최고 단계예요.');return}
 progress=result.progress;play('pickup',.35);renderShop();render();
 toast(UPGRADES.find(x=>x.id===id).name+' Lv.'+progress.upgrades[id]+' 강화 완료!',2000);
}
function renderTimer(){
 el.timer.textContent=state.mode==='rush'?Math.max(0,Math.ceil(state.time)):'∞';
 el.timer.classList.toggle('danger',state.mode==='rush'&&state.time<=10);
 el.timer.style.setProperty('--rushRemain',state.mode==='rush'?Math.max(0,Math.min(100,state.time/90*100))+'%':'100%');
}
function putInSlot(id,index=null){
 if(state.busy||state.phase!=='math'||!state.pieces.has(id))return;
 const old=state.slots.indexOf(id);if(old>=0)state.slots[old]=null;
 if(index==null)index=state.slots[0]?1:0;
 if(state.slots[index]&&state.slots[index]!==id){const other=index?0:1;if(!state.slots[other])state.slots[other]=state.slots[index];else state.slots[index]=null}
 state.slots[index]=id;play('confirm',.24);render()
}
function cutPiece(parts){
 if(state.busy||state.phase!=='math'||!state.slots[0])return;
 const id=state.slots[0],piece=state.pieces.get(id);if(!piece)return;
 const result=M.cut(piece.value,parts);
 if(!result.ok){toast('더 작은 금속으로는 나눌 수 없어요. 다른 조각을 선택해 보세요.');return}
 state.history.push(snapshot());state.pieces.delete(id);state.slots[0]=null;state.strikes++;
 for(const value of [result.left,result.right]){
   const next={id:'cut'+(++state.resultSeq),value,prefer:'fraction'};
   state.pieces.set(next.id,next);
 }
 play('whoosh',.27);play('impact',.3);render();
 const station=$('#cutStation');station.classList.remove('cutting');void station.offsetWidth;station.classList.add('cutting');
 setTimeout(()=>station.classList.remove('cutting'),480);
 toast(pieceDisplay(piece)+' → '+E.display(result.left,'fraction')+' + '+E.display(result.right,'fraction')+'로 재단했어요!',2200);
 if(E.eq(result.left,state.puzzle.target)||E.eq(result.right,state.puzzle.target)){
   const token=sequence;state.busy=true;
   setTimeout(()=>{if(token===sequence&&state.running&&state.phase==='math')beginCraft()},760);
 }
}
$$('[data-cut]').forEach(button=>button.addEventListener('click',()=>cutPiece(Number(button.dataset.cut))));
function bindPiece(node,id){
 let moved=false,startX=0,startY=0,ghost=null;
 node.addEventListener('pointerdown',ev=>{
   if(state.busy||state.phase!=='math')return;node.setPointerCapture?.(ev.pointerId);startX=ev.clientX;startY=ev.clientY;moved=false;
   ghost=node.cloneNode(true);ghost.style.cssText='position:fixed;z-index:1200;pointer-events:none;width:92px;opacity:.92;transform:translate(-50%,-50%) rotate(-3deg);left:'+ev.clientX+'px;top:'+ev.clientY+'px';document.body.appendChild(ghost);play('select',.2)
 });
 node.addEventListener('pointermove',ev=>{if(!ghost)return;const dx=ev.clientX-startX,dy=ev.clientY-startY;if(Math.hypot(dx,dy)>7)moved=true;ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px'});
 node.addEventListener('pointerup',ev=>{if(!ghost)return;ghost.remove();ghost=null;node._pointerAt=Date.now();const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.slot');if(target)putInSlot(id,Number(target.dataset.slot));else if(!moved)putInSlot(id)});
 node.addEventListener('pointercancel',()=>{ghost?.remove();ghost=null})
 node.addEventListener('click',()=>{if(Date.now()-(node._pointerAt||0)>350)putInSlot(id)});
}
$$('.slot').forEach(slot=>slot.addEventListener('click',()=>{if(state.phase!=='math'||state.busy)return;const i=Number(slot.dataset.slot);if(state.slots[i]){state.slots[i]=null;play('select',.2);render()}}));
function bindTools(){
 $$('.tool').forEach(btn=>{
   let active=false,moved=false,sx=0,sy=0;
   btn.addEventListener('pointerdown',ev=>{
     if(state.busy||state.phase!=='math')return;active=true;moved=false;sx=ev.clientX;sy=ev.clientY;btn.setPointerCapture?.(ev.pointerId);el.ghost.innerHTML=V.tool(btn.dataset.op);el.ghost.style.left=ev.clientX+'px';el.ghost.style.top=ev.clientY+'px';el.ghost.classList.add('show');btn.classList.add('active');play('select',.2)
   });
   btn.addEventListener('pointermove',ev=>{if(!active)return;if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>8)moved=true;el.ghost.style.left=ev.clientX+'px';el.ghost.style.top=ev.clientY+'px'});
   const finish=ev=>{if(!active)return;active=false;btn._pointerAt=Date.now();el.ghost.classList.remove('show');btn.classList.remove('active');const r=el.anvil.getBoundingClientRect(),inside=ev.clientX>=r.left-30&&ev.clientX<=r.right+30&&ev.clientY>=r.top-30&&ev.clientY<=r.bottom+30;if(inside||!moved)forge(btn.dataset.op)};
   btn.addEventListener('pointerup',finish);btn.addEventListener('pointercancel',()=>{active=false;el.ghost.classList.remove('show');btn.classList.remove('active')})
   btn.addEventListener('click',()=>{if(Date.now()-(btn._pointerAt||0)>350)forge(btn.dataset.op)});
 })
}
function impactFx(){
 const r=el.anvil.getBoundingClientRect(),x=r.left+r.width*.54,y=r.top+r.height*.55;el.anvil.classList.remove('strike');void el.anvil.offsetWidth;el.anvil.classList.add('strike');
 document.body.classList.add('forge-hit');clearTimeout(impactFx._flash);impactFx._flash=setTimeout(()=>document.body.classList.remove('forge-hit'),150);
 for(let i=0;i<11;i++){const img=document.createElement('img');img.className='spark';img.src=SPARKS[i%SPARKS.length];img.style.left=x+'px';img.style.top=y+'px';img.style.setProperty('--dx',(Math.random()*180-90)+'px');img.style.setProperty('--dy',(-30-Math.random()*120)+'px');el.fx.appendChild(img);setTimeout(()=>img.remove(),700)}
}
function showResult(p,op){el.result.textContent=E.display(p.value,p.prefer);el.result.classList.remove('show');void el.result.offsetWidth;el.result.classList.add('show');el.op.textContent=op}
function forge(op){
 if(state.busy||!state.running||state.phase!=='math')return;
 const [aId,bId]=state.slots;if(!aId||!bId){play('error',.28);toast('숫자 재료 두 개를 먼저 올려 주세요.');return}
 const a=state.pieces.get(aId),b=state.pieces.get(bId);if(!a||!b)return;
 let value;try{value=E.apply(op,a.value,b.value)}catch(err){state.combo=0;state.heat=1;play('error',.32);toast('0으로는 나눌 수 없어요!');render();return}
 if(!E.nice(value,{maxAbs:8,maxDen:40,allowZero:true})||value.n<0){state.combo=0;state.heat=1;play('error',.3);toast('이 대장간에서는 너무 복잡한 조각은 만들지 않아요.');render();return}
 const cfg=TOOL[op];state.busy=true;state.history.push(snapshot());state.strikes++;el.op.textContent=op;el.equation.textContent=pieceDisplay(a)+' '+op+' '+pieceDisplay(b)+' = ?';avatar?.playForge(cfg.kind,cfg.duration);el.stageTool.innerHTML=V.tool(op);play('whoosh',.34);
 const token=sequence;
 setTimeout(()=>{
   if(token!==sequence||!state.running||state.phase!=='math')return;
   impactFx();play('impact',.48);
   state.pieces.delete(aId);state.pieces.delete(bId);state.slots=[null,null];
   const prefer=(a.prefer==='decimal'&&b.prefer==='decimal'&&E.isTerminating(value))?'decimal':'fraction';
   const p={id:'r'+(++state.resultSeq),value,prefer};state.pieces.set(p.id,p);showResult(p,op);play('drop',.28);render();
   if(E.eq(value,state.puzzle.target))setTimeout(()=>{if(token===sequence&&state.running)beginCraft()},320);else {toast('새 재료 '+pieceDisplay(p)+' 제작!');setTimeout(()=>{if(token===sequence)state.busy=false},220)}
 },cfg.duration*cfg.hit);
 setTimeout(()=>{if(token===sequence&&!E.eq(value,state.puzzle.target))state.busy=false},cfg.duration+100)
}
function beginCraft(){
 const part=state.parts[state.partIndex];
 state.phase='craft';state.craft=F.create({furnaceLevel:progress.upgrades.furnace,hammerLevel:progress.upgrades.hammer,
   basePumps:part.pumps,hammerCount:part.hits,technique:part.technique});state.busy=false;state.craftStart=performance.now();
 el.craftName.textContent=part.name+' · '+state.commission.item.name;
 el.craftProduct.innerHTML=V.model(state.commission.item.id,state.partIndex,[...state.partLengths,state.puzzle.target]);
 el.craftScene.dataset.family=state.commission.item.family;el.craftScene.dataset.technique=part.technique;el.craftScene.dataset.grade='';
 el.craftGrade.textContent='';el.craftGrade.className='craft-grade';
 el.craftBurst.textContent='';el.craftTip.textContent='공방 장비를 직접 누르거나 Space 키로 작업할 수 있어요.';
 el.craft.classList.add('open');updateCraft();render();el.craftAction.focus();
}
function renderHammerHits(){
 el.hammerHits.innerHTML='';
 const grades=state.craft?.hitGrades||[];
 for(let i=0;i<(state.craft?.requiredHits||3);i++){
   const pip=document.createElement('span'),grade=grades[i]||'empty';
   pip.className='hammer-hit-dot '+grade;
   pip.textContent=grade==='perfect'?'★':grade==='good'?'✦':grade==='miss'?'·':'○';
   el.hammerHits.appendChild(pip);
 }
 el.hammerHits.classList.toggle('visible',state.craft?.stage==='hammer'||state.craft?.stage==='quench');
}
let markerFrame=0;
function stopMarker(){cancelAnimationFrame(markerFrame);markerFrame=0}
function tickMarker(){
 if(state.phase!=='craft'||state.craft?.stage!=='hammer')return;
 const timing=((performance.now()-state.craftStart)/state.craft.hammerDuration)%1;
 el.craftMarker.style.left=(timing*100)+'%';
 markerFrame=requestAnimationFrame(tickMarker);
}
function updateCraft(){
 const c=state.craft;if(!c)return;
 el.craftScene.dataset.stage=c.stage;el.craftMeter.classList.toggle('timing',c.stage==='hammer');
 el.craftScene.style.setProperty('--forgeHeat',String(c.pumps/c.requiredPumps));
 el.craftScene.style.setProperty('--forgeReveal',c.stage==='heat'?'100%':c.stage==='hammer'?(100-c.hits/c.requiredHits*100)+'%':'0%');
 el.craftMeter.style.setProperty('--hammerStart',String((c.timingCenter-c.timingWindow/2)*100)+'%');
 el.craftMeter.style.setProperty('--hammerWidth',String(c.timingWindow*100)+'%');
 renderHammerHits();
 stopMarker();
 $$('[data-station]').forEach(button=>{
   const active=button.dataset.station===c.stage;
   button.disabled=!active;button.classList.toggle('active',active);
 });
 if(c.stage==='heat'){
   el.craftStep.textContent='제작 1/3 · 가열';el.craftTitle.textContent='쇠에 뜨거운 생명을 불어넣어요';
   el.craftInstruction.textContent='왼쪽 화로 장비를 '+c.requiredPumps+'번 눌러 금속을 붉게 달궈요.';
   el.craftFill.style.width=(c.pumps/c.requiredPumps*100)+'%';el.craftStatus.textContent='🔥 가열 '+c.pumps+'/'+c.requiredPumps;el.craftAction.textContent='화로 달구기';
 }else if(c.stage==='hammer'){
   el.craftStep.textContent='제작 2/3 · '+state.parts[state.partIndex].action;el.craftTitle.textContent=state.parts[state.partIndex].action;
   el.craftInstruction.textContent='움직이는 표식이 노란 구간에 왔을 때 망치를 내려치세요.';
   el.craftFill.style.width='0%';el.craftStatus.textContent='🔨 망치질 '+c.hits+'/'+c.requiredHits;el.craftAction.textContent='망치 내려치기';
   if(!markerFrame)markerFrame=requestAnimationFrame(tickMarker);
 }else if(c.stage==='quench'){
   el.craftStep.textContent='제작 3/3 · 담금질';el.craftTitle.textContent='마지막으로 물에 담가 단단하게!';
   el.craftInstruction.textContent='금속을 물에 담그면 멋진 작품이 완성됩니다.';
   el.craftFill.style.width='100%';el.craftStatus.textContent='💧 담금질 준비 완료';el.craftAction.textContent='물통에 담그기';
 }
}
function craftAction(){
 if(!state.running)return;
 if(state.phase==='award'){advanceOrder();return}
 if(state.phase==='part-reveal'){state.partIndex++;newPuzzle(true);return}
 if(state.phase==='deliver'){awardOrder();return}
 if(state.phase!=='craft')return;
 const before=state.craft.stage,timing=((performance.now()-state.craftStart)/state.craft.hammerDuration)%1;
 F.act(state.craft,timing);
 if(before==='heat'){
   play('whoosh',.25+state.craft.pumps*.06);
   el.craftBurst.textContent=state.craft.stage==='hammer'?'🔥 가열 성공!':state.craft.pumps===1?'🔥 불씨가 살아나요!':'🔥 더 뜨겁게!';
   el.craftScene.classList.remove('pumped');void el.craftScene.offsetWidth;el.craftScene.classList.add('pumped');
 }
 if(before==='hammer'){
   const grade=state.craft.lastHit.grade;
   play('impact',grade==='perfect'?.65:grade==='good'?.48:.31);if(grade==='perfect')play('confirm',.2);
   avatar?.playForge('add',600);
   el.craftBurst.textContent=grade==='perfect'?'완벽! ★':grade==='good'?'좋아요! ✨':'조금 빗나갔어요!';
   el.craftScene.classList.remove('hammer-hit','hammer-perfect','hammer-good','hammer-miss');void el.craftScene.offsetWidth;
   el.craftScene.classList.add('hammer-hit','hammer-'+grade);
   el.craftScene.style.setProperty('--forgeShape',String(state.craft.hits/state.craft.requiredHits));
   try{if(typeof navigator!=='undefined')navigator.vibrate?.(grade==='perfect'?35:grade==='good'?18:8)}catch(_){}
 }
 if(before==='quench'){play('confirm',.45);completePart();return}
 if(before!==state.craft.stage){state.craftStart=performance.now();if(before==='heat')el.craftBurst.textContent='망치질 준비!'}
 updateCraft();
}
function completePart(){
 if(state.phase!=='craft'||!state.craft.done)return;
 state.partQuality.push(state.craft.quality);
 state.partLengths.push(E.make(state.puzzle.target.n,state.puzzle.target.d));
 state.orderStrikes+=state.strikes;state.bestTotal+=state.puzzle.bestStrikes;
 state.allPerfect=state.allPerfect&&state.strikes===state.puzzle.bestStrikes;
 stopMarker();el.craftScene.dataset.stage='done';el.craftProduct.innerHTML=V.model(state.commission.item.id,state.partIndex+1,state.partLengths);
 $$('[data-station]').forEach(button=>{button.disabled=true;button.classList.remove('active')});
 if(state.partIndex<state.parts.length-1){
   state.phase='part-reveal';render();
   el.craftStep.textContent='부품 제작 완료';el.craftTitle.textContent=state.parts[state.partIndex].name+' 부품을 만들었어요!';
   el.craftInstruction.textContent='다음 부품까지 만들면 '+state.commission.item.name+' 조립이 끝나요.';
   el.craftStatus.textContent='첫 번째 금속 가공 성공 · 정밀도 '+state.craft.quality+'점';
   el.craftAction.textContent='다음 부품 만들기 →';el.craftTip.textContent='금속 보관함에 새 재료가 준비됩니다.';
   play('confirm',.4);return;
 }
 state.phase='deliver';render();
 el.customerBay.classList.add('ready');el.deliveryArt.innerHTML=V.model(state.commission.item.id,2,state.partLengths);
 el.deliverBtn.disabled=false;el.customerSpeech.textContent='오! 완성됐구나. 내게 건네줘!';
 el.craftStep.textContent='최종 조립 완료';el.craftTitle.textContent=state.commission.item.name+' 제작 완료!';
 el.craftInstruction.textContent='완성품을 납품대에서 손님에게 건네주세요.';
 el.craftStatus.textContent='금속 '+state.partLengths.map(E.toFraction).join(' + ')+' · '+state.parts.length+'개 부품 결합';
 el.craftAction.textContent='손님에게 납품하기 →';el.craftTip.textContent='오른쪽 납품대를 눌러도 물건을 전달할 수 있어요.';
 play('confirm',.45);
}
function awardOrder(){
 if(state.phase!=='deliver')return;
 const perfect=state.allPerfect,quality=Math.round(state.partQuality.reduce((a,b)=>a+b,0)/Math.max(1,state.partQuality.length)),rank=F.qualityRank(quality);
 state.phase='award';state.orders++;state.combo++;state.heat=Math.min(5,1+Math.floor(state.combo/2));
 el.deliverBtn.disabled=true;el.customerBay.classList.add('pleased');el.customerSpeech.textContent=state.commission.item.reaction;
 const streakBonus=state.combo%3===0?25:0,streakScore=streakBonus?120:0;
 const bonusTime=state.mode==='rush'&&perfect&&rank.id==='masterpiece'?Math.min(3,Math.max(0,90-state.time)):0;
 if(bonusTime)state.time+=bonusTime;
 const speed=state.mode==='rush'?Math.max(0,Math.round(state.time)):0;
 const gain=100+state.heat*15+(perfect?90:0)+Math.round(quality*.2)+(state.mode==='rush'?Math.min(50,speed):0)+streakScore+Math.max(0,state.parts.length-1)*30;
 const baseEarned=30+state.bestTotal*10+Math.round(quality/5)+rank.goldBonus;
 const earned=Math.round(baseEarned*(1+progress.upgrades.counter*.15))+streakBonus,priorCrafted=progress.crafted;
 state.score+=gain;progress=S.reward(progress,state.commission.item.id,earned);
 const newlyUnlocked=O.ITEMS.filter(item=>item.unlockAt>priorCrafted&&item.unlockAt<=progress.crafted);
 avatar?.celebrate();play(rank.id==='masterpiece'?'fanfare':perfect?'woo':'yay',.45);saveBest();render();
 el.craftScene.dataset.stage='done';el.craftScene.dataset.grade=rank.id;el.craftStep.textContent='주문 완성!';
 el.craftBurst.textContent='';
 el.craftGrade.textContent=rank.icon+' '+rank.label+' 제작품';el.craftGrade.className='craft-grade visible '+rank.id;
 el.craftTitle.textContent=rank.icon+' '+rank.label+' · '+state.commission.item.name+' 완성!';
 el.craftInstruction.textContent=state.commission.customer.name+' 님: “'+state.commission.item.reaction+'” · 정밀도 '+quality+'점 · 총 '+state.orderStrikes+'번 가공';
 el.craftStatus.textContent='+'+earned+' G · +'+gain+'점'+(perfect?' · 최단 가공!':'')+(rank.goldBonus?' · '+rank.label+' 보너스!':'');
 el.craftFill.style.width='100%';el.craftMeter.classList.remove('timing');el.craftAction.textContent=state.mode==='master'?'제작 결과 보기':'다음 주문 받기';
 const events=[];
 if(newlyUnlocked.length)events.push('🔓 새 제작품: '+newlyUnlocked.map(item=>item.icon+' '+item.name).join(', '));
 if(streakBonus)events.push('🔥 '+state.combo+'연속 납품! 추가 +25 G');
 if(bonusTime)events.push('⏱️ 완벽한 러시 제작! +'+Math.round(bonusTime*10)/10+'초');
 el.craftTip.textContent=events.length?events.join(' · '):'공방 총 제작품 '+progress.crafted+'개 · 보유 '+progress.gold+' G';
 stopMarker();
 if(state.mode==='rush'){
   const token=sequence;setTimeout(()=>{if(token===sequence&&state.phase==='award'&&state.running)advanceOrder()},1600);
 }
}
function advanceOrder(){
 if(state.phase!=='award'||!state.running)return;
 el.craft.classList.remove('open');
 if(state.mode==='master')finish('마스터 주문 성공!','정밀 주문 완성 · 총 '+state.orderStrikes+'번 가공','👑');
 else newPuzzle();
}
function hint(){
 if(state.phase!=='math')return;
 const pieces=[...state.pieces.values()];
 const step=state.puzzle?.recipe?.find(s=>pieces.some((a,i)=>pieces.some((b,j)=>i!==j&&E.eq(a.value,s.a)&&E.eq(b.value,s.b))));
 if(step)toast('힌트: '+E.display(step.a,'fraction')+' '+step.op+' '+E.display(step.b,'fraction')+' 재료를 사용해 보세요.',2600);
 else toast('재료가 많이 바뀌었어요. 되돌리거나 주문 다시를 눌러 보세요.',2800)
}
function undo(){if(state.busy||state.phase!=='math'||!state.history.length)return;sequence++;restore(state.history.pop());state.combo=0;state.heat=1;play('select',.2);toast('되돌렸어요. 천천히 다시 만들어 보세요!')}
function restartOrder(){
 if(state.busy||state.phase!=='math'||!state.puzzle)return;
 sequence++;state.pieces=new Map(state.puzzle.materials.map(p=>[p.id,{...p}]));state.slots=[null,null];state.history=[];state.strikes=0;state.combo=0;state.heat=1;
 el.op.textContent='?';render();toast('같은 주문을 처음부터 다시 시작해요.');
}
function saveBest(){if(state.mode!=='rush')return;try{const k='kidscade_fraction_smith_best_v1',prev=Number(localStorage.getItem(k)||0);if(state.score>prev)localStorage.setItem(k,String(state.score))}catch(_){}}
function start(mode){
 sequence++;stopMarker();clearInterval(state.timerId);
 state={...state,mode,phase:'math',puzzle:null,commission:null,craft:null,parts:[],partIndex:0,partQuality:[],partLengths:[],orderStrikes:0,bestTotal:0,allPerfect:true,pieces:new Map(),slots:[null,null],score:0,combo:0,heat:1,orders:0,strikes:0,time:mode==='rush'?90:0,running:true,busy:false,history:[],resultSeq:0,timerId:0};
 el.start.classList.remove('open');el.finish.classList.remove('open');el.craft.classList.remove('open');el.shop.classList.remove('open');newPuzzle();
 if(mode==='rush'){let last=performance.now();state.timerId=setInterval(()=>{const now=performance.now();state.time-=Math.max(0,(now-last)/1000);last=now;if(state.time<=0){state.time=0;renderTimer();finish('러시 종료!','완성한 주문 '+state.orders+'개 · 최고 HEAT '+state.heat,'🔥')}else renderTimer()},200)}
}
function finish(title,text,icon='⚒️'){if(!state.running)return;sequence++;state.phase='finish';state.running=false;state.busy=false;stopMarker();clearInterval(state.timerId);el.craft.classList.remove('open');saveBest();play('fanfare',.42);$('#finishIcon').textContent=icon;el.finishTitle.textContent=title;el.finishText.textContent=text;el.finishScore.textContent=state.score+'점 · '+progress.gold+' G 보유';el.finish.classList.add('open')}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));el.hint.addEventListener('click',hint);el.undo.addEventListener('click',undo);el.restart.addEventListener('click',restartOrder);el.shopBtn.addEventListener('click',openShop);el.shopClose.addEventListener('click',closeShop);el.craftAction.addEventListener('click',craftAction);
$$('[data-station]').forEach(button=>button.addEventListener('click',()=>{if(state.phase==='craft'&&button.dataset.station===state.craft?.stage)craftAction()}));
el.deliverBtn.addEventListener('click',()=>{if(state.phase==='deliver')awardOrder()});
let deliverDrag=null;
el.deliveryArt.addEventListener('pointerdown',ev=>{
 if(state.phase!=='deliver')return;
 deliverDrag={x:ev.clientX,y:ev.clientY};el.deliveryArt.setPointerCapture?.(ev.pointerId);
});
el.deliveryArt.addEventListener('pointerup',ev=>{
 if(!deliverDrag||state.phase!=='deliver')return;
 const from=deliverDrag;deliverDrag=null;
 const customer=el.visitorSprite.getBoundingClientRect();
 const reachesCustomer=ev.clientX>=customer.left-45&&ev.clientX<=customer.right+45&&ev.clientY>=customer.top-45&&ev.clientY<=customer.bottom+50;
 if(reachesCustomer){play('pickup',.35);awardOrder()}
 else if(Math.hypot(ev.clientX-from.x,ev.clientY-from.y)<12)toast('완성품을 손님에게 끌어다 놓거나 납품하기를 눌러 주세요.',2400);
});
el.deliveryArt.addEventListener('pointercancel',()=>{deliverDrag=null});
$('#againBtn').addEventListener('click',()=>start(state.mode));$('#modeBtn').addEventListener('click',()=>{el.finish.classList.remove('open');el.savedProgress.textContent='지금까지 완성한 제품 '+progress.crafted+'개 · 보유 골드 '+progress.gold+' G';el.start.classList.add('open')});
el.sound.addEventListener('click',()=>{sound=!sound;el.sound.textContent=sound?'🔊':'🔇';if(sound)play('confirm',.2)});
addEventListener('keydown',ev=>{
 if(!state.running||state.busy||ev.repeat)return;
 if(state.phase==='shop'&&ev.key==='Escape'){ev.preventDefault();closeShop();return}
 if((state.phase==='craft'||state.phase==='deliver'||state.phase==='part-reveal'||state.phase==='award')&&ev.code==='Space'){
   if(document.activeElement?.tagName==='BUTTON')return;
   ev.preventDefault();craftAction();return;
 }
 if(state.phase!=='math')return;
 if(ev.key==='1')forge('+');else if(ev.key==='2')forge('-');else if(ev.key==='3')forge('×');else if(ev.key==='4')forge('÷');
 else if(ev.key.toLowerCase()==='z')undo();else if(ev.key.toLowerCase()==='r')restartOrder();
});
el.savedProgress.textContent='지금까지 완성한 제품 '+progress.crafted+'개 · 보유 골드 '+progress.gold+' G';
$$('.tool').forEach(button=>{button.querySelector('.tool-art').innerHTML=V.tool(button.dataset.op)});
bindTools();
try{avatar=new A.ForgeAvatar(el.avatar);el.avatar.addEventListener('load',()=>{el.avatarFallback.style.opacity='0'});el.avatar.addEventListener('error',()=>{el.avatarFallback.style.opacity='1'})}catch(_){el.avatarFallback.style.opacity='1'}
})();
