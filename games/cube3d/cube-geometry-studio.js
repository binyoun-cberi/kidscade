(()=>{
'use strict';
const L=window.CubeGeometryLogic,Q=window.CubeGeometryQuiz,KEY='cubeArchitectGeometryStudio_v1';
let root,canvas,renderer,scene,camera,group,plane,grid,edges,vertices,drag=null;
let active=false,activity='studio',theta=.65,phi=.95,radius=19,history=[],future=[],quiz=null,score={correct:0,total:0};
const pointers=new Map();let pinchDistance=0,viewZoom=1;
let studentMode=false,settingsOpen=false,diagram=null,questionNumber=0,markerTimer=null;
let state={grade:6,tab:'stack',shape:'cuboid',w:3,h:2,d:2,cells:L.box(3,2,2),tool:'add',measure:true,structure:'solid'};
const $=id=>document.getElementById(id),show=(id,on)=>{$(id).hidden=!on};
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('gsSave').textContent='자동 저장됨'}catch(_){$('gsSave').textContent='저장 공간을 사용할 수 없어요'}}
function restore(){try{const p=JSON.parse(localStorage.getItem(KEY));if(!p||!Array.isArray(p.cells))return;
state={...state,grade:L.gradeLevel(p.grade),tab:p.tab==='solid'?'solid':'stack',shape:L.SHAPES[p.shape]?p.shape:'cuboid',w:validSize(p.w),h:validSize(p.h),d:validSize(p.d),cells:L.normalize(p.cells),tool:['add','remove','rotate'].includes(p.tool)?p.tool:'add',measure:p.measure!==false,structure:['solid','edges','vertices'].includes(p.structure)?p.structure:'solid'}
}catch(_){}}
function validSize(n){return Number.isInteger(n)&&n>=1&&n<=8?n:2}
function buildUI(){
if(root)return;
root=document.createElement('section');root.id='geometryStudio';root.hidden=true;
root.innerHTML=`<canvas id="gsCanvas" class="gs-canvas" aria-label="입체도형 작업 공간. 드래그로 회전, 클릭으로 쌓거나 지우기" tabindex="0"></canvas>
<header class="gs-bar"><button id="gsHome" aria-label="큐브 아키텍트 시작 화면">⌂</button><div class="gs-brand"><b>입체도형 스튜디오</b><small>만들기 · 관찰하기 · 문제 풀기</small></div><button id="gsQuizToggle">퀴즈 풀기</button><button id="gsExploreToggle">자유 탐구</button><button id="gsQuizSettings" hidden aria-expanded="false">설정</button><label><span class="sr-only">활동</span><select id="gsActivity" aria-label="스튜디오 활동"><option value="studio">도형 만들기 · 퀴즈</option><option value="net">전개도 탐구</option><option value="challenge">설계도 복원</option><option value="cuboidPuzzle">중력 퍼즐</option><option value="creative">자유 건축 월드</option></select></label><button id="gsReturn" hidden>작업대로</button></header>
<aside id="gsPanel" class="gs-panel"><label>학년 수준<select id="gsGrade" aria-label="문제의 초등학교 학년 수준">${[1,2,3,4,5,6].map(n=>`<option value="${n}">초등 ${n}학년 수준</option>`).join('')}</select></label><p id="gsGradeNote" class="gs-notice"></p><p class="gs-level-help">학년군 교육과정에 따른 권장 수준이에요. 3~4학년은 복습·확장 활동으로 활용해요.</p><button id="gsSample">학년에 맞는 새 예시</button><h2>내 도형 작업대</h2><div class="gs-row"><button data-gs-tab="stack">쌓기나무</button><button data-gs-tab="solid">입체도형</button></div>
<div id="gsStackTools"><div class="gs-row"><button data-gs-tool="add">쌓기</button><button data-gs-tool="remove">지우기</button><button data-gs-tool="rotate">관찰</button></div><p>바닥이나 블록의 면을 눌러 쌓아요. 드래그하면 도형이 돌아가요. 한 칸은 1 cm예요.</p></div>
<div id="gsSolidTools" hidden><label id="gsShapePicker">도형<select id="gsShape">${Object.entries(L.SHAPES).map(([key,v])=>`<option value="${key}">${v.name}</option>`).join('')}</select></label><p id="gsShapeNote"></p></div>
<h2>크기 설정</h2>${[['w','가로'],['h','높이'],['d','세로']].map(([k,t])=>`<label id="gsSizeLabel${k}"><span id="gsSizeName${k}">${t}</span> <b id="gsSizeValue${k}"></b> cm<input id="gsSize${k}" type="range" min="1" max="8" step="1" aria-label="${t}"></label>`).join('')}
<button id="gsBox">이 크기로 새 직육면체 만들기</button>
<div class="gs-row"><button id="gsUndo">↶ 되돌리기</button><button id="gsRedo">↷ 다시 실행</button></div><button id="gsClear">작업대 비우기</button><p id="gsSave" class="gs-notice" role="status">작품 자동 저장</p>
<h2>관찰 도구</h2><div id="gsStructureTools" class="gs-row"><button data-gs-structure="solid">면</button><button data-gs-structure="edges">모서리</button><button data-gs-structure="vertices">꼭짓점</button></div><p id="gsStructureNote"></p><button id="gsMeasure" aria-pressed="true">측정값 보기</button><div id="gsStats" class="gs-stats"></div>
<h2>학년별 도형 퀴즈</h2><label>문제 종류<select id="gsQuizKind"></select></label><button id="gsQuestion">문제 내기</button><div id="gsQuizWorkbench"><p id="gsScore">0 / 0 정답</p><p id="gsPrompt">도형을 만들고 문제를 풀어 보세요.</p><div id="gsChoices" class="gs-row" role="group" aria-label="모양 정답 선택" hidden></div><div id="gsBuildTarget" hidden><canvas id="gsTargetIso" width="240" height="190" aria-label="따라 만들 목표 쌓기나무"></canvas><canvas id="gsTargetHeights" width="160" height="160" aria-label="목표를 위에서 본 칸별 층 수"></canvas><p id="gsBuildHint"></p><button id="gsBuildCheck">만든 모양 확인</button></div><form id="gsAnswerForm" class="gs-answer" hidden><input id="gsAnswer" type="number" step="any" min="0" inputmode="decimal" aria-label="퀴즈 정답" required><button type="submit">확인</button></form><p id="gsFeedback" class="gs-feedback" aria-live="polite">관찰한 도형의 크기와 모양으로 문제가 만들어져요.</p><button id="gsReveal" hidden>풀이 보기</button></div></aside>
<aside id="gsOrientation" class="gs-orientation" aria-label="XYZ 방향 안내: X 가로, Y 높이, Z 깊이"><svg viewBox="0 0 112 82" aria-label="현재 시점의 좌표축"><circle cx="56" cy="40" r="32" fill="#ffffff" fill-opacity=".7" stroke="#e1e7ef"/>${['X','Y','Z'].map((a,i)=>`<line id="gsAxis${a}Back" class="gs-axis-back" x1="56" y1="40" x2="56" y2="40" stroke="${['#cf6255','#3d9373','#597fbb'][i]}"/><g><line id="gsAxis${a}" x1="56" y1="40" x2="56" y2="40" stroke="${['#cf6255','#3d9373','#597fbb'][i]}"/><circle id="gsAxis${a}Tip" cx="56" cy="40" r="3" fill="${['#cf6255','#3d9373','#597fbb'][i]}"/><text id="gsAxis${a}Label" x="56" y="40" fill="${['#ad4539','#277253','#38629b'][i]}">${a}</text></g>`).join('')}<circle cx="56" cy="40" r="2.5" fill="#64758b"/></svg><p>X 가로 · Y 높이 · Z 깊이</p><button id="gsResetView" type="button">시점 복귀</button></aside>
<div id="gsLabels" class="gs-labels" aria-label="도형의 점과 길이 표기"></div>
<section id="gsQuizBoard" class="gs-quiz-board" hidden aria-label="도형 퀴즈 문제"><div class="gs-question-card"><div class="gs-question-meta"><span id="gsRoundLabel"></span><span id="gsPickProgress"></span></div><h2 id="gsQuestionText"></h2><p id="gsQuestionHelp"></p></div><div id="gsAnswerDock" class="gs-answer-dock"><div id="gsSelectionFeedback" aria-live="polite"></div><details id="gsNamedAnswers"><summary>이름으로 답 고르기</summary><div id="gsElementChoices" class="gs-element-choices"></div></details><label id="gsFoldControl" hidden>전개도 접기 <input id="gsFold" type="range" min="0" max="100" value="0" aria-label="전개도 접는 정도"></label><button id="gsNextQuestion" class="gs-next-question">다음 문제 →</button></div></section><div id="gsAnswerMarker" class="gs-answer-marker" hidden aria-live="polite"></div>
<div id="gsViews" class="gs-views">${[['top','위'],['front','앞'],['side','오른쪽']].map(([k,t])=>`<figure><figcaption>${t}에서 본 모습</figcaption><canvas id="gsView${k}" width="160" height="160" aria-label="${t}에서 본 쌓기나무 그림"></canvas></figure>`).join('')}</div>
<p id="gsBanner" class="gs-banner">한 손가락으로 회전 · 두 손가락으로 확대·축소 · 위·앞·오른쪽 모습도 함께 관찰해요.</p>
<nav id="gsViewButtons" class="gs-bottom" aria-label="도형 시점"><button data-gs-view="iso">입체</button><button data-gs-view="top">위</button><button data-gs-view="front">앞</button><button data-gs-view="bottom">아래</button><button data-gs-view="side">오른쪽</button><button id="gsZoomIn" aria-label="확대">＋</button><button id="gsZoomOut" aria-label="축소">－</button></nav>`;
document.getElementById('app').append(root);canvas=$('gsCanvas');
$('gsQuizToggle').onclick=()=>setStudentMode(true);$('gsExploreToggle').onclick=()=>setStudentMode(false);$('gsQuizSettings').onclick=()=>{settingsOpen=!settingsOpen;root.classList.toggle('gs-settings-open',settingsOpen);$('gsQuizSettings').setAttribute('aria-expanded',String(settingsOpen));resize()};$('gsNextQuestion').onclick=nextRound;$('gsFold').oninput=e=>{diagram?.fold(Number(e.target.value)/100);positionCamera()};
$('gsGrade').onchange=e=>setGrade(Number(e.target.value));$('gsSample').onclick=newSample;
$('gsHome').onclick=exit;$('gsReturn').onclick=()=>switchActivity('studio');$('gsActivity').onchange=e=>switchActivity(e.target.value);
root.querySelectorAll('[data-gs-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.gsTab;cancelQuiz();syncUI();renderModel();save()});
root.querySelectorAll('[data-gs-tool]').forEach(b=>b.onclick=()=>{state.tool=b.dataset.gsTool;syncUI();save()});
root.querySelectorAll('[data-gs-structure]').forEach(b=>b.onclick=()=>{state.structure=b.dataset.gsStructure;renderModel();syncUI();save()});
$('gsShape').onchange=e=>{state.shape=e.target.value;cancelQuiz();syncUI();renderModel();save()};
for(const k of ['w','h','d'])$('gsSize'+k).oninput=e=>{state[k]=Number(e.target.value);if(state.tab==='solid')cancelQuiz();syncUI();if(state.tab==='solid')renderModel();save()};
$('gsBox').onclick=()=>editCells(L.box(state.w,state.h,state.d));$('gsClear').onclick=()=>editCells([]);
$('gsUndo').onclick=()=>{if(!history.length)return;future.push(state.cells);state.cells=history.pop();changed()};
$('gsRedo').onclick=()=>{if(!future.length)return;history.push(state.cells);state.cells=future.pop();changed()};
$('gsMeasure').onclick=()=>{state.measure=!state.measure;syncUI();save()};
$('gsBuildCheck').onclick=checkBuild;$('gsQuestion').onclick=()=>{askQuestion();if(studentMode){settingsOpen=false;root.classList.remove('gs-settings-open');resize()}};$('gsReveal').onclick=()=>reveal(false);
$('gsAnswerForm').onsubmit=e=>{e.preventDefault();checkAnswer()};
root.querySelectorAll('[data-gs-view]').forEach(b=>b.onclick=()=>{const v=b.dataset.gsView;theta=v==='side'?Math.PI/2:v==='iso'?.65:0;phi=v==='top'?.001:v==='bottom'?Math.PI-.001:v==='iso'?.95:Math.PI/2;positionCamera()});
$('gsResetView').onclick=()=>{theta=.65;phi=.95;radius=state.grade>=5?15:12;viewZoom=1;positionCamera(true)};
$('gsZoomIn').onclick=()=>{viewZoom=Math.min(2.5,viewZoom*1.18);positionCamera()};$('gsZoomOut').onclick=()=>{viewZoom=Math.max(.5,viewZoom/1.18);positionCamera()};
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const distance=()=>{const [a,b]=[...pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0};
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
if(pointers.size>1){drag=null;pinchDistance=distance();return}drag={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
if(pointers.size>1){const next=distance();if(pinchDistance>0&&next>0){viewZoom=Math.max(.5,Math.min(2.5,viewZoom*next/pinchDistance));positionCamera()}pinchDistance=next;return}
if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.lx,dy=e.clientY-drag.ly;drag.lx=e.clientX;drag.ly=e.clientY;
if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(drag.moved){theta-=dx*.0055;phi=Math.max(.001,Math.min(state.tab==='solid'?Math.PI-.001:Math.PI/2,phi+dy*.0055));positionCamera()}});
const endPointer=(e,cancelled=false)=>{const click=!cancelled&&pointers.size===1&&drag?.id===e.pointerId&&!drag.moved;pointers.delete(e.pointerId);drag=null;pinchDistance=0;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
if(click){if(quiz?.visual&&quiz.targetType)diagram?.pickAt(e.clientX,e.clientY,camera,canvas);else if(!studentMode||quiz?.construction)editAt(e)}};
canvas.addEventListener('pointerup',e=>endPointer(e));canvas.addEventListener('pointercancel',e=>endPointer(e,true));canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);drag=null;pinchDistance=0});
canvas.addEventListener('wheel',e=>{e.preventDefault();viewZoom=Math.max(.5,Math.min(2.5,viewZoom*Math.exp(-e.deltaY*.001)));positionCamera()},{passive:false});
window.addEventListener('resize',resize);
// Older activities keep their own controls, with the studio bar remaining above them.
$('homeBtn').addEventListener('click',()=>{if(active&&activity!=='studio')exit()});
restore();enforceGrade();syncUI();
}
function enforceGrade(){if(state.grade<5)state.structure='solid';const p=L.profile(state.grade);if(!p.shapes.includes(state.shape))state.shape=p.shapes[0];for(const k of ['w','h','d'])state[k]=Math.min(state[k],p.maxSize)}
function setGrade(grade){state.grade=L.gradeLevel(grade);radius=8+L.profile(state.grade).maxSize*1.5;cancelQuiz();enforceGrade();score={correct:0,total:0};$('gsScore').textContent='0 / 0 정답';syncUI();renderModel();save();if(studentMode)nextRound()}
function newSample(){if(state.tab==='stack')editCells(L.sample(state.grade));else{cancelQuiz();const p=L.profile(state.grade);state.shape=p.shapes[Math.floor(Math.random()*p.shapes.length)];for(const k of ['w','h','d'])state[k]=1+Math.floor(Math.random()*p.maxSize);enforceGrade();syncUI();renderModel();save()}}
function syncUI(){
const level=L.profile(state.grade);$('gsGrade').value=state.grade;$('gsGradeNote').textContent=level.note;
const available=level.shapes;$('gsShape').replaceChildren(...available.map(k=>{const o=document.createElement('option');o.value=k;o.textContent=L.shapeLabel(k,state.grade);return o}));
for(const k of ['w','h','d'])$('gsSize'+k).max=level.maxSize;
root.querySelectorAll('[data-gs-tab]').forEach(b=>b.setAttribute('aria-pressed',String(state.tab===b.dataset.gsTab)));
root.querySelectorAll('[data-gs-tool]').forEach(b=>b.setAttribute('aria-pressed',String(state.tool===b.dataset.gsTool)));
root.querySelectorAll('[data-gs-structure]').forEach(b=>b.setAttribute('aria-pressed',String(state.structure===b.dataset.gsStructure)));
show('gsStackTools',state.tab==='stack');show('gsSolidTools',state.tab==='solid');show('gsBox',state.tab==='stack');show('gsUndo',state.tab==='stack');show('gsRedo',state.tab==='stack');show('gsClear',state.tab==='stack');
$('gsUndo').disabled=!history.length;$('gsRedo').disabled=!future.length;$('gsShape').value=state.shape;
const round=['cylinder','cone','sphere'].includes(state.shape),cube=state.shape==='cube';
for(const k of ['w','h','d']){$('gsSize'+k).value=state[k];$('gsSizeValue'+k).textContent=state[k];show('gsSizeLabel'+k,state.tab==='stack'||(k==='w'||(!cube&&state.shape!=='sphere'&&(k!=='d'||!round))))}
$('gsSizeNamew').textContent=state.tab==='solid'?(round?'직경':cube?'한 모서리':'가로'):'가로';
$('gsShapeNote').textContent=state.shape==='prism'?'밑면이 직각삼각형인 기둥이에요. 가로·세로는 밑면의 직각을 이루는 두 변이에요.':state.shape==='pyramid'?'직사각형 밑면의 중심 위에 꼭짓점이 있는 각뿔이에요.':round?'직경은 원의 중심을 지나는 지름이에요. 곡면의 선은 화면 표현용이에요.':'모서리 길이를 바꾸며 입체도형을 관찰해요.';
$('gsMeasure').setAttribute('aria-pressed',String(state.measure));$('gsMeasure').textContent=state.measure?'측정값 숨기기':'측정값 보기';
const hidden=!!quiz&&!quiz.revealed;show('gsShapePicker',!(hidden&&quiz.kind==='name'));show('gsStructureTools',state.grade>=5);show('gsStats',state.measure&&!hidden);show('gsViews',state.tab==='stack'&&(!hidden||quiz?.kind==='buildViews')&&activity==='studio');
const m=state.tab==='stack'?L.metrics(state.cells):L.solidMetrics(state.shape,state.w,state.h,state.d);
const vals=state.tab==='stack'?[['쌓기나무',m.volume+'개'],['높이',m.height+'층']]:[...(state.grade===6&&['cube','cuboid'].includes(state.shape)?[['부피',format(m.volume)+' cm³'],['겉넓이',format(m.area)+' cm²']]:[]),...(state.grade>=5&&m.faces?[['면',m.faces+'개'],['모서리 / 꼭짓점',m.edges+' / '+m.vertices+'개']]:[])];
show('gsMeasure',vals.length>0);$('gsStats').innerHTML=vals.map(([label,value])=>`<div class="gs-stat">${label}<b>${value}</b></div>`).join('');
$('gsStructureNote').textContent=state.grade<5?'위·앞·옆에서 돌려 보며 모양과 층을 관찰해요.':state.tab==='stack'?'붙어 있는 블록 사이의 면은 겉넓이에 포함하지 않아요.':round?'곡면 도형은 모서리·꼭짓점 활동 대신 면으로 관찰해요.':'면을 옅게 하여 모서리 또는 꼭짓점을 강조할 수 있어요.';
root.querySelectorAll('[data-gs-structure]').forEach(b=>{b.disabled=state.tab==='solid'&&round&&b.dataset.gsStructure!=='solid'});
const labels={mixed:'여러 유형 섞기',pickVertex:'꼭짓점 찾기',pickEdge:'모서리 찾기',pickFace:'면 찾기',parallelFace:'평행한 면 찾기',incidentEdge:'한 점에서 만나는 모서리',incidentFace:'한 모서리에서 만나는 면',edgeVertex:'모서리 양 끝 꼭짓점',netVertex:'접으면 겹치는 꼭짓점',netEdge:'접으면 겹치는 모서리',faceArea:'색칠한 면의 넓이',name:'모양 이름 찾기',volume:state.tab==='stack'?'쌓기나무 개수':'부피',height:'층 수',area:'겉넓이',faces:'면 수',edges:'모서리 수',vertices:'꼭짓점 수',top:'위에서 본 칸 수',front:'앞에서 본 칸 수',side:'오른쪽에서 본 칸 수',buildCopy:'모양 따라 만들기',buildViews:'세 방향 모습 보고 만들기',sameVolume:'같은 부피 · 다른 겉넓이 만들기'};
const kinds=Object.fromEntries((studentMode?['mixed',...L.quizKinds(state.grade,state.tab,state.shape)]:L.quizKinds(state.grade,state.tab,state.shape)).map(k=>[k,labels[k]]));
const prev=$('gsQuizKind').value;$('gsQuizKind').replaceChildren(...Object.entries(kinds).map(([k,t])=>{const o=document.createElement('option');o.value=k;o.textContent=t;return o}));if(kinds[prev])$('gsQuizKind').value=prev;
syncQuizHud();
}
function format(n){return Number(n.toFixed(2)).toLocaleString('ko-KR')}
function cancelQuiz(){if(diagram){diagram.dispose();diagram=null}quiz=null;show('gsAnswerMarker',false);show('gsFoldControl',false);$('gsElementChoices').replaceChildren();show('gsChoices',false);show('gsBuildTarget',false);$('gsAnswerForm').querySelector('button').textContent='확인';show('gsAnswerForm',false);show('gsReveal',false);$('gsPrompt').textContent='도형을 만들고 문제를 풀어 보세요.';$('gsFeedback').textContent='도형을 바꾸면 새 문제를 낼 수 있어요.'}
function changed(){if(!quiz?.construction||quiz.revealed)cancelQuiz();renderModel();syncUI();save()}
function editCells(cells){if(!L.fitsGrade(cells,state.grade)&&L.normalize(cells).length>=state.cells.length){notify('현재 학년의 권장 크기를 넘었어요. 블록을 줄이거나 학년 수준을 바꿔 주세요.');return}history.push(state.cells);if(history.length>50)history.shift();future=[];state.cells=L.normalize(cells);changed()}
function initScene(){
if(renderer)return;
renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
scene=new THREE.Scene();scene.background=new THREE.Color('#eaf1f9');scene.add(new THREE.HemisphereLight(0xffffff,0x7b8fa8,2));
const light=new THREE.DirectionalLight(0xffffff,2.1);light.position.set(8,15,10);scene.add(light);
camera=new THREE.PerspectiveCamera(38,1,.1,120);grid=new THREE.GridHelper(8,8,0x6584b7,0xc0cedf);grid.position.set(0,.001,0);scene.add(grid);
plane=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5,side:THREE.DoubleSide}));plane.rotation.x=-Math.PI/2;scene.add(plane);resize();
}
function disposeGroup(){if(!group)return;scene.remove(group);group.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.filter(Boolean).forEach(m=>m.dispose())})}
function prismGeometry(){// Right triangular base lies in XZ, extrusion is vertical.
const s=new THREE.Shape();s.moveTo(-state.w/2,-state.d/2);s.lineTo(state.w/2,-state.d/2);s.lineTo(-state.w/2,state.d/2);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:state.h,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);g.translate(0,0,0);return g}
function pyramidGeometry(){const w=state.w/2,d=state.d/2,h=state.h;const p=[[-w,0,-d],[w,0,-d],[w,0,d],[-w,0,d],[0,h,0]],indices=[0,1,2,0,2,3,0,4,1,1,4,2,2,4,3,3,4,0];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(indices.flatMap(i=>p[i]),3));g.computeVertexNormals();return g}
function renderModel(){
if(!renderer)return;
if(diagram){diagram.dispose();diagram=null}
const extent=L.profile(state.grade).maxSize;
if(grid.userData.extent!==extent){scene.remove(grid);grid.geometry.dispose();grid.material.dispose();grid=new THREE.GridHelper(extent,extent,0x6584b7,0xc0cedf);grid.userData.extent=extent;grid.position.set(extent/2-4,.001,extent/2-4);scene.add(grid);plane.geometry.dispose();plane.geometry=new THREE.PlaneGeometry(extent,extent);plane.position.set(extent/2-4,0,extent/2-4)}
disposeGroup();group=new THREE.Group();scene.add(group);grid.visible=plane.visible=state.tab==='stack';
const round=state.tab==='solid'&&['cylinder','cone','sphere'].includes(state.shape),structure=state.tab==='solid'&&round?'solid':state.structure;
const add=(geo,pos)=>{const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffdba6,roughness:.6,transparent:true,opacity:structure==='solid'?.16:.07,depthWrite:false,side:THREE.DoubleSide}));mesh.position.copy(pos);group.add(mesh);
const wire=new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),new THREE.LineBasicMaterial({color:structure==='edges'?0xd24937:0x806746,transparent:true,opacity:.9}));mesh.add(wire);
if(structure==='vertices'&&!round){const a=geo.attributes.position,points=[],seen=new Set();for(let i=0;i<a.count;i++){const p=[a.getX(i),a.getY(i),a.getZ(i)],k=p.map(v=>v.toFixed(3)).join(',');if(!seen.has(k)){seen.add(k);points.push(...p)}}const dots=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),new THREE.PointsMaterial({color:0xc72b6a,size:.22,depthTest:false}));mesh.add(dots)}return mesh};
if(state.tab==='stack'){for(const p of state.cells){const mesh=add(new THREE.BoxGeometry(.98,.98,.98),new THREE.Vector3(p[0]-3.5,p[1]+.5,p[2]-3.5));mesh.userData.cell=p.slice()}}
else if(!quiz?.net){let g,y=state.h/2;const r=state.w/2;switch(state.shape){case 'cube':g=new THREE.BoxGeometry(state.w,state.w,state.w);y=r;break;case 'cuboid':g=new THREE.BoxGeometry(state.w,state.h,state.d);break;case 'prism':g=prismGeometry();y=0;break;case 'pyramid':g=pyramidGeometry();y=0;break;case 'cylinder':g=new THREE.CylinderGeometry(r,r,state.h,64);break;case 'cone':g=new THREE.ConeGeometry(r,state.h,64);break;case 'sphere':g=new THREE.SphereGeometry(r,48,32);y=r;break}add(g,new THREE.Vector3(0,y,0))}
if(state.tab==='solid'&&['cube','cuboid'].includes(state.shape)&&Q&&window.CubeGeometryDiagram){
if(quiz?.visual&&!quiz.net){const base=group.children.find(c=>c.isMesh);if(base){base.material.transparent=true;base.material.opacity=.07;base.material.depthWrite=false}}
const dims=state.shape==='cube'?[state.w,state.w,state.w]:[state.w,state.h,state.d];
diagram=window.CubeGeometryDiagram.create({parent:group,dims,question:quiz?.visual?quiz:null,labels:$('gsLabels'),onPick:pickDiagram});
if(quiz?.net)diagram.fold(Number($('gsFold').value||0)/100);
}
positionCamera(true);drawProjections();syncQuizHud();
}
function positionCamera(autoFit=false){if(!renderer||!camera)return;
const extent=L.profile(state.grade).maxSize;let box=group&&group.children.length?new THREE.Box3().setFromObject(group):null;
// Dimension curves are annotations, not part of the solid's fitted size.
if(studentMode&&state.tab==='solid'&&!quiz?.net&&['cube','cuboid'].includes(state.shape)){const w=state.w,h=state.shape==='cube'?w:state.h,d=state.shape==='cube'?w:state.d;box=new THREE.Box3(new THREE.Vector3(-w/2,0,-d/2),new THREE.Vector3(w/2,h,d/2))}
const focus=state.tab==='stack'?new THREE.Vector3(extent/2-4,extent/3,extent/2-4):box?box.getCenter(new THREE.Vector3()):new THREE.Vector3(0,1,0);
const rect=canvas.getBoundingClientRect(),panel=$('gsPanel').getBoundingClientRect();let left=0,right=rect.width,top=0,bottom=rect.height;
if(studentMode&&!settingsOpen){const card=$('gsQuizBoard').querySelector('.gs-question-card').getBoundingClientRect(),dock=$('gsAnswerDock').getBoundingClientRect();left=22;right=rect.width-22;top=card.bottom+18;bottom=dock.top-18}
else left=panel.right+16;
const cx=(left+right)/2,cy=(top+bottom)/2;
camera.setViewOffset(rect.width,rect.height,rect.width/2-cx,rect.height/2-cy,rect.width,rect.height);
camera.zoom=1;
const pose=()=>{camera.position.set(focus.x+radius*Math.sin(phi)*Math.sin(theta),focus.y+radius*Math.cos(phi),focus.z+radius*Math.sin(phi)*Math.cos(theta));camera.lookAt(focus);camera.updateMatrixWorld(true);camera.updateProjectionMatrix()};pose();
if(studentMode&&!settingsOpen&&box){const corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z));
for(let n=0;n<8;n++){const points=corners.map(p=>p.clone().project(camera)),width=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*rect.width/2,height=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*rect.height/2,ratio=Math.max(width/Math.max(80,(right-left)*.62-20),height/Math.max(80,(bottom-top)*.72-20));if(!autoFit&&ratio<=1.01)break;if(autoFit&&Math.abs(ratio-1)<.025)break;radius=Math.max(2,radius*ratio*1.02);pose()}}
camera.zoom=viewZoom;camera.updateProjectionMatrix();render();
}
function render(){if(active&&activity==='studio'&&renderer){renderer.render(scene,camera);updateOrientation();diagram?.layout(camera,canvas);for(const c of diagram?.choices()||[]){const b=$('gsElementChoices').querySelector('[data-quiz-choice="'+c.id+'"]');if(b&&c.screen){b.dataset.screenX=c.screen[0];b.dataset.screenY=c.screen[1]}}}}
function updateOrientation(){
const hud=$('gsOrientation');if(!hud||!camera)return;
if(studentMode){const card=$('gsQuizBoard').querySelector('.gs-question-card');hud.style.top=(card.getBoundingClientRect().bottom+10)+'px'}else hud.style.top=state.tab==='stack'?'230px':'94px';
const inverse=camera.quaternion.clone().invert();
for(const [i,a] of ['X','Y','Z'].entries()){const vector=new THREE.Vector3(i===0?1:0,i===1?1:0,i===2?1:0).applyQuaternion(inverse),dx=vector.x*27,dy=-vector.y*27,x=56+dx,y=40+dy;
for(const [id,px,py] of [['gsAxis'+a,x,y],['gsAxis'+a+'Back',56-dx,40-dy]]){const line=$(id);line.setAttribute('x2',String(px));line.setAttribute('y2',String(py))}
$('gsAxis'+a+'Tip').setAttribute('cx',String(x));$('gsAxis'+a+'Tip').setAttribute('cy',String(y));
const length=Math.hypot(dx,dy),tx=length>4?x+dx/length*10:x+11,ty=length>4?y+dy/length*10:y-9;
$('gsAxis'+a+'Label').setAttribute('x',String(tx));$('gsAxis'+a+'Label').setAttribute('y',String(ty));
}
}
function resize(){if(!renderer)return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;positionCamera(true)}
function editAt(e){if(state.tab!=='stack'||state.tool==='rotate')return;const rect=canvas.getBoundingClientRect(),v=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(v,camera);const hit=ray.intersectObjects([...group.children,plane],false)[0];if(!hit)return;
if(state.tool==='remove'){if(hit.object.userData.cell)editCells(state.cells.filter(p=>p.join(',')!==hit.object.userData.cell.join(',')));return}
const pos=hit.point.clone();if(hit.object!==plane)pos.addScaledVector(hit.face.normal,.05);const p=[Math.floor(pos.x+4),Math.floor(pos.y+.001),Math.floor(pos.z+4)];if(p.some(v=>v<0||v>=L.profile(state.grade).maxSize)){notify('현재 학년에서는 가로·세로·높이 각각 '+L.profile(state.grade).maxSize+'칸까지 쌓아요.');return}if(state.cells.some(c=>c.join(',')===p.join(',')))return;editCells([...state.cells,p])}
function drawProjections(){const source=quiz?.kind==='buildViews'&&!quiz.revealed?quiz.target:state.cells;for(const kind of ['top','front','side']){const c=$('gsView'+kind),ctx=c.getContext('2d');ctx.clearRect(0,0,160,160);ctx.fillStyle='#f4f7fc';ctx.fillRect(0,0,160,160);const cells=new Set(source.map(p=>kind==='top'?p[0]+','+p[2]:kind==='front'?p[0]+','+p[1]:p[2]+','+p[1]));
for(let x=0;x<8;x++)for(let y=0;y<8;y++){const px=8+x*18,py=8+(kind==='top'?y:7-y)*18;ctx.fillStyle=cells.has(x+','+y)?'#628fdb':'#fff';ctx.fillRect(px,py,17,17);ctx.strokeStyle='#d5dfed';ctx.strokeRect(px,py,17,17)}}}
function notify(s){$('gsFeedback').textContent=s;if($('gsSelectionFeedback'))$('gsSelectionFeedback').textContent=s}
function askQuestion(){cancelQuiz();viewZoom=1;theta=.65;phi=.95;radius=state.grade>=5?15:12;syncUI();renderModel();drawProjections();resetAnswerControls();if(state.tab==='stack'&&!state.cells.length){notify('쌓기나무를 하나 이상 만든 뒤 문제를 내 주세요.');return}
const selected=$('gsQuizKind').value,pool=L.quizKinds(state.grade,state.tab,state.shape),kind=selected==='mixed'?pool[Math.floor(Math.random()*pool.length)]:selected;if(!L.quizKinds(state.grade,state.tab,state.shape).includes(kind))return;
if(state.tab==='stack'&&!L.fitsGrade(state.cells,state.grade)){notify('저장된 작품은 그대로 두었어요. 학년에 맞는 새 예시를 선택하거나 블록 수를 줄여 주세요.');return}
if(Q&&['pickVertex','pickEdge','pickFace','parallelFace','incidentEdge','incidentFace','edgeVertex','netVertex','netEdge','faceArea'].includes(kind)){startVisual(kind);return}
if(['buildCopy','buildViews','sameVolume'].includes(kind)){startBuild(kind);return}
if(kind==='name'){quiz={kind,answer:state.shape,revealed:false,counted:false};$('gsPrompt').textContent=state.grade<=4?'어떤 모양과 닮았나요?':'이 입체도형의 이름은 무엇인가요?';$('gsChoices').replaceChildren(...L.profile(state.grade).shapes.map(k=>{const b=document.createElement('button');b.type='button';b.textContent=L.shapeLabel(k,state.grade);b.onclick=()=>answerName(k);return b}));show('gsChoices',true);show('gsReveal',true);syncUI();return}
if(state.tab==='stack')quiz={...L.question(state.cells,kind),kind,tab:'stack'};
else{const m=L.solidMetrics(state.shape,state.w,state.h,state.d),label={volume:'부피',area:'겉넓이',faces:'면의 수',edges:'모서리의 수',vertices:'꼭짓점의 수'}[kind];quiz={prompt:m.name+'의 '+label+'는 얼마일까요?',answer:['volume','area'].includes(kind)?Math.round(m[kind]*100)/100:m[kind],unit:kind==='volume'?'cm³':kind==='area'?'cm²':'개',kind,tab:'solid'}}
quiz.revealed=false;quiz.counted=false;quiz.correct=false;if(state.tab==='solid'&&['cube','cuboid'].includes(state.shape)&&['volume','area'].includes(kind)){quiz.visual=true;quiz.dimensions=true;quiz.targetType=null;quiz.instruction='도형에 연결된 곡선 점선의 길이를 보고 구하세요.'}$('gsPrompt').textContent=quiz.prompt;
$('gsAnswer').value='';show('gsAnswerForm',true);show('gsReveal',true);notify('도형을 돌려서 살펴보고 답을 적어 보세요.');syncUI();renderModel();$('gsAnswer').focus();
}
function checkAnswer(){if(!quiz||quiz.revealed)return;const v=$('gsAnswer').value;if(!v.trim()||!Number.isFinite(Number(v))||Number(v)<0){notify('0 이상의 수로 답을 적어 주세요.');return}
if(!quiz.counted){quiz.counted=true;score.total++}quiz.correct=Math.abs(Number(v)-quiz.answer)<.005;if(quiz.correct){score.correct++;reveal(true)}else {notify('다시 관찰해 보세요. 풀이 보기에서 확인한 뒤 새 문제에 도전할 수 있어요.');answerMark(false)}
updateScore();
}
function reveal(correct){if(!quiz)return;if(quiz.visual&&quiz.targetType){revealVisual(correct);return}if(correct)answerMark(true);if(quiz.construction){revealBuild();return}if(quiz.kind==='name'){quiz.revealed=true;show('gsChoices',false);show('gsReveal',false);notify((correct?'정답이에요! ':'풀이 · ')+L.shapeLabel(quiz.answer,state.grade)+'이에요.');syncUI();return}quiz.revealed=true;show('gsAnswerForm',false);show('gsReveal',false);let detail='';if(quiz.tab==='stack'){detail=quiz.kind==='area'?'블록 6면에서 서로 붙은 면을 빼서 세었어요.':quiz.kind==='volume'?'보이지 않는 블록도 포함한 전체 개수예요.':quiz.kind==='height'?'바닥부터 가장 높은 블록까지의 층 수예요.':'같은 방향으로 겹쳐 보이는 블록은 한 칸으로 세어요.'}else detail={faceArea:'색칠'+'한 면의 서로 수직인 두 모서리 길이를 곱해요.',volume:solidFormula('volume'),area:solidFormula('area'),faces:'평평한 면을 하나씩 세어 보세요.',edges:'두 면이 만나는 선을 하나씩 세어요.',vertices:'모서리들이 만나는 점을 하나씩 세어요.'}[quiz.kind];notify((correct?'정답이에요! ':'풀이 · ')+quiz.answer+' '+quiz.unit+'. '+detail);syncUI()}
function answerName(answer){if(!quiz||quiz.kind!=='name'||quiz.revealed)return;if(!quiz.counted){quiz.counted=true;score.total++}if(answer===quiz.answer){score.correct++;reveal(true)}else {notify('도형을 돌려 보며 다시 찾아보세요.');answerMark(false)}updateScore()}
function updateScore(){$('gsScore').textContent=score.correct+' / '+score.total+' 정답';syncQuizHud()}
function startBuild(kind){
// A 12-cube cuboid always has another connected solution with a different area.
const target=kind==='sameVolume'?L.box(3,2,2):state.cells.map(p=>p.slice());
if(!L.grounded(target)){notify('바닥부터 빈틈없이 쌓인 모양으로 문제를 만들어 주세요.');return}
state.tool='add';theta=.65;phi=.95;
quiz={kind,construction:true,target,revealed:false,counted:false};history.push(state.cells);future=[];state.cells=[];
$('gsPrompt').textContent=kind==='sameVolume'?'부피가 12 cm³이면서 목표와 겉넓이가 다른 모양을 만들어 보세요.':kind==='buildViews'?'위·앞·오른쪽 모습이 목표 그림과 같은 쌓기나무를 만들어 보세요.':'목표 그림과 같은 모양을 만들어 보세요.';
$('gsBuildHint').textContent=kind==='sameVolume'?'목표: 가로 3 · 높이 2 · 세로 2 cm인 직육면체. 블록 12개를 사용해요.':kind==='buildViews'?'세 방향 모습이 모두 같으면 다른 모양도 정답이에요. 바닥부터 빈틈없이 쌓아요.':'작업대 왼쪽 뒤 모서리부터 시작해요. 아래 그림의 숫자는 각 칸의 층 수예요.';
show('gsBuildTarget',true);show('gsTargetIso',kind!=='buildViews');show('gsTargetHeights',kind==='buildCopy');show('gsReveal',true);notify('쌓기·지우기 도구로 직접 만들고 확인해 보세요.');renderModel();drawTargetIso(target);drawTargetHeights(target);syncUI();save();
}
function checkBuild(){if(!quiz?.construction||quiz.revealed)return;if(!quiz.counted){quiz.counted=true;score.total++}
if(L.matchesBuild(state.cells,quiz.target,quiz.kind)){score.correct++;quiz.revealed=true;notify('정답이에요! '+(quiz.kind==='sameVolume'?'부피는 같고 겉넓이는 '+L.metrics(state.cells).area+' cm²로 달라졌어요.':'목표 조건에 맞는 모양을 만들었어요.'));show('gsReveal',false);show('gsBuildTarget',false);syncUI();drawProjections()}else notify(!L.grounded(state.cells)?'떠 있는 블록이 있어요. 바닥부터 빈틈없이 쌓아 보세요.':'아직 목표와 달라요. 블록의 위치와 높이를 다시 살펴보세요.');updateScore()}
function revealBuild(){quiz.revealed=true;show('gsReveal',false);show('gsBuildTarget',false);history.push(state.cells);future=[];state.cells=quiz.kind==='sameVolume'?L.box(4,1,3):quiz.target.map(p=>p.slice());notify(quiz.kind==='sameVolume'?'예시: 4 × 1 × 3은 부피 12 cm³, 겉넓이 38 cm²예요. 목표의 겉넓이는 32 cm²예요.':'목표 모양을 작업대에 놓았어요. 돌려 보며 내 모양과 비교해 보세요.');renderModel();syncUI();save()}
function drawTargetHeights(points){const c=$('gsTargetHeights'),ctx=c.getContext('2d'),size=L.profile(state.grade).maxSize,cell=144/size;ctx.clearRect(0,0,160,160);ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';for(let x=0;x<size;x++)for(let z=0;z<size;z++){const n=points.filter(p=>p[0]===x&&p[2]===z).length;ctx.fillStyle=n?'#d4e4ff':'#f4f7fc';ctx.fillRect(8+x*cell,8+z*cell,cell-1,cell-1);if(n){ctx.fillStyle='#20324b';ctx.fillText(n,8+(x+.5)*cell,8+(z+.5)*cell)}}}
function drawTargetIso(points){const c=$('gsTargetIso'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(!points.length)return;const size=12,project=([x,y,z])=>[120+(x-z)*size,150+(x+z)*size*.5-y*size];
const faces=[{color:'#fff0cb',v:[[0,1,0],[1,1,0],[1,1,1],[0,1,1]]},{color:'#f5d79f',v:[[1,0,0],[1,0,1],[1,1,1],[1,1,0]]},{color:'#e9bc7b',v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]}];
const raw=points.flatMap(p=>[[p[0],p[1],p[2]],[p[0]+1,p[1]+1,p[2]+1]]).map(project),minY=Math.min(...raw.map(p=>p[1])),maxY=Math.max(...raw.map(p=>p[1]));
ctx.save();ctx.translate(0,(c.height-minY-maxY)/2);for(const p of points.slice().sort((a,b)=>(a[0]+a[2])-(b[0]+b[2])||a[1]-b[1]))for(const f of faces){ctx.beginPath();f.v.map(v=>project(v.map((n,i)=>n+p[i]))).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle='#29496d';ctx.stroke()}ctx.restore();
}
function setStudentMode(on){studentMode=on;settingsOpen=false;root.classList.toggle('gs-quiz-mode',on);root.classList.remove('gs-settings-open');$('gsQuizToggle').setAttribute('aria-pressed',String(on));$('gsExploreToggle').setAttribute('aria-pressed',String(!on));show('gsQuizSettings',on);show('gsQuizBoard',on&&activity==='studio');
if(on){if(state.grade>=5)state.tab='solid';$('gsAnswerDock').prepend($('gsQuizWorkbench'));syncUI();$('gsQuizKind').value='mixed';nextRound()}else{$('gsPanel').append($('gsQuizWorkbench'));cancelQuiz();syncUI();renderModel()}resize()}
function nextRound(){
const previous=$('gsQuizKind').value,requested=previous||'mixed';
if(state.grade>=5&&state.tab==='solid'){state.shape='cuboid';state.w=2+Math.floor(Math.random()*(L.profile(state.grade).maxSize-1));state.h=2+Math.floor(Math.random()*(L.profile(state.grade).maxSize-1));state.d=2+Math.floor(Math.random()*(L.profile(state.grade).maxSize-1))}
else{state.tab=state.tab==='stack'||requested==='height'||requested==='buildCopy'?'stack':'solid';if(state.tab==='stack')state.cells=L.sample(state.grade);else state.shape=L.profile(state.grade).shapes[Math.floor(Math.random()*L.profile(state.grade).shapes.length)]}
quiz=null;questionNumber++;$('gsFold').value=0;theta=.65;phi=.95;radius=state.grade>=5?15:12;syncUI();const allowed=Array.from($('gsQuizKind').options).map(o=>o.value);$('gsQuizKind').value=allowed.includes(requested)?requested:studentMode?'mixed':allowed[0];askQuestion();settingsOpen=false;root.classList.remove('gs-settings-open');resize();
}
function startVisual(kind){
const dims=state.shape==='cube'?[state.w,state.w,state.w]:[state.w,state.h,state.d];quiz=Q.makeQuestion(kind,dims);quiz.tab='solid';quiz.selected=[];quiz.revealed=false;quiz.counted=false;
$('gsPrompt').textContent=quiz.prompt;show('gsAnswerForm',quiz.answer!==undefined);$('gsAnswer').value='';show('gsReveal',true);$('gsFold').value=0;
if(quiz.net){theta=.15;phi=.28;const size=Math.max(state.w+2*state.h,2*(state.d+state.h));radius=Math.max(24,size*1.7/Math.min(1,camera?.aspect||1))}
notify(quiz.instruction);renderModel();syncUI();
}
function pickDiagram(id){if(!quiz?.visual||!quiz.targetType||quiz.revealed)return;
const expected={vertex:'v',edge:'e',face:'f',netVertex:'nv',netEdge:'ne'}[quiz.targetType];if(!id.startsWith(expected))return;
const verdict=Q.classify(quiz,id,quiz.selected);if(verdict==='reference'){notify('주황색은 기준이에요. 조건에 맞는 다른 곳을 골라 보세요.');return}if(verdict==='selected')return;
if(!quiz.counted){quiz.counted=true;score.total++}
if(verdict==='correct'){quiz.selected.push(id);quiz.wrongId=null;answerMark(true,id);if(quiz.selected.length===quiz.answers.length){score.correct++;quiz.revealed=true;show('gsReveal',false);notify('정답이에요! '+(quiz.net?'이제 전개도를 접어 겹치는 위치를 확인해 보세요.':'조건에 맞는 곳을 모두 찾았어요.'))}else notify('맞았어요! 나머지 '+(quiz.answers.length-quiz.selected.length)+'곳도 찾아보세요.')}
else{quiz.wrongId=id;answerMark(false,id);notify('× 이곳은 조건과 달라요. 주황색 기준과 꼭짓점 이름을 다시 살펴보세요.')}
diagram?.updateColors();updateScore();syncQuizHud();positionCamera();
}
function revealVisual(correct){quiz.revealed=true;quiz.selected=quiz.answers.slice();quiz.wrongId=null;show('gsReveal',false);notify(correct?'정답이에요!':'초록색으로 표시한 곳이 정답이에요. 기준 요소와 어떤 관계인지 확인해 보세요.');diagram?.updateColors();syncQuizHud();positionCamera()}
function answerMark(ok,id){const el=$('gsAnswerMarker');if(!el)return;clearTimeout(markerTimer);const at=id?diagram?.choices().find(c=>c.id===id)?.screen:null;el.style.left=at?at[0]+'px':'50%';el.style.top=at?at[1]+'px':'50%';el.textContent=ok?'○':'×';el.classList.toggle('is-wrong',!ok);el.hidden=false;markerTimer=setTimeout(()=>{el.hidden=true},950)}
function syncQuizHud(){if(!$('gsQuizBoard'))return;
$('gsQuestionText').textContent=$('gsPrompt').textContent;$('gsRoundLabel').textContent='초등 '+state.grade+'학년 수준 · 문제 '+Math.max(1,questionNumber);$('gsQuestionHelp').textContent=quiz?.instruction||'도형을 돌려 관찰하고 답해 보세요.';
const found=quiz?.selected?.length||0,total=quiz?.answers?.length||0;$('gsPickProgress').textContent=total?'찾은 곳 '+found+' / '+total:$('gsScore').textContent;
show('gsNamedAnswers',!!quiz?.visual&&!!quiz.targetType&&!quiz.revealed);show('gsFoldControl',!!quiz?.net&&!!quiz.revealed);
if(diagram&&quiz?.visual&&quiz.targetType){const choices=diagram.choices();$('gsElementChoices').replaceChildren(...choices.map(c=>{const b=document.createElement('button');b.type='button';b.textContent=c.label;b.dataset.quizChoice=c.id;if(c.screen){b.dataset.screenX=c.screen[0];b.dataset.screenY=c.screen[1]}b.disabled=c.id===quiz.reference||quiz.selected.includes(c.id);b.onclick=()=>pickDiagram(c.id);return b}))}
if(studentMode){show('gsViews',quiz?.kind==='buildViews');show('gsBanner',false);show('gsStats',false)}
}
function solidFormula(kind){
const w=state.w,h=state.h,d=state.d,r=w/2;
const formula={
cube:{volume:`${w} × ${w} × ${w}`,area:`6 × ${w} × ${w}`},
cuboid:{volume:`${w} × ${h} × ${d}`,area:`2 × (${w} × ${h} + ${h} × ${d} + ${w} × ${d})`},
prism:{volume:`(${w} × ${d} ÷ 2) × ${h}`,area:`${w} × ${d} + ${h} × (${w} + ${d} + √(${w}² + ${d}²))`},
pyramid:{volume:`${w} × ${d} × ${h} ÷ 3`,area:'밑면의 넓이 + 옆면 삼각형 4개의 넓이'},
cylinder:{volume:`π × ${r}² × ${h}`,area:`2π × ${r} × (${r} + ${h})`},
cone:{volume:`π × ${r}² × ${h} ÷ 3`,area:`π × ${r} × (${r} + √(${r}² + ${h}²))`},
sphere:{volume:`4π × ${r}³ ÷ 3`,area:`4π × ${r}²`}};
return formula[state.shape][kind]+'로 구해요.';
}
function resetAnswerControls(){$('gsAnswer').disabled=false;$('gsAnswerForm').querySelector('button').disabled=false}
function stopLegacy(){if(activity==='cuboidPuzzle')window.CubeArchitectCuboidPuzzle?.exit();if(activity!=='studio')window.CubeArchitect.showHome()}
function switchActivity(next){if(!['studio','net','challenge','cuboidPuzzle','creative'].includes(next))return;
stopLegacy();activity=next;const studio=next==='studio';document.body.classList.toggle('geometry-legacy',!studio);
for(const id of ['gsCanvas','gsPanel','gsViewButtons','gsBanner'])show(id,studio);show('gsViews',studio&&state.tab==='stack'&&(!quiz||quiz.revealed||quiz.kind==='buildViews'));show('gsReturn',!studio);$('gsActivity').value=next;
window.CubeArchitectExternalPause=studio;show('gsQuizBoard',studio&&studentMode);show('gsLabels',studio);show('gsOrientation',studio);
try{if(studio){$('homeScreen').classList.add('hidden');$('topbar').classList.add('hidden');resize();syncUI();render()}
else if(next==='cuboidPuzzle'){window.CubeArchitectCuboidPuzzle.enter();const home=$('cuboidPuzzleHome');if(home)home.onclick=()=>switchActivity('studio')}
else window.CubeArchitect.enterMode(next)}catch(err){notify('활동을 시작하지 못했어요. 작업대로 돌아왔어요.');if(next!=='studio')switchActivity('studio');console.error(err)}
}
function enter(){buildUI();root.hidden=false;active=true;try{window.CubeArchitect.showHome();initScene();renderModel();switchActivity('studio');if(!studentMode)setStudentMode(true)}catch(err){try{exit()}catch(_){}throw err}}
function exit(){stopLegacy();active=false;root.hidden=true;window.CubeArchitectExternalPause=false;document.body.classList.remove('geometry-legacy');window.CubeArchitect.showHome()}
window.CubeGeometryStudio={enter,exit};
})();
