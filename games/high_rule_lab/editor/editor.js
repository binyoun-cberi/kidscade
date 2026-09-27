(function(){
'use strict';
const DATA=window.RuleLabData,E=window.RuleLabEngine,UI=window.RuleLabUI,$=id=>document.getElementById(id);
Object.assign(DATA.P,{PULL:'따라옴',FALL:'떨어짐'});
const LABELS={hero:'아이',wall:'벽',rock:'돌',flag:'깃발',water:'물',lava:'용암',key:'열쇠',door:'문',ice:'얼음',fire:'불'};
let draft=newDraft(),selected={kind:'object',type:'hero'},playState=null,playHistory=null,playRenderer=null;
function clone(v){return JSON.parse(JSON.stringify(v))}
function newDraft(){return {title:'새 실험',chapter:'확장 연구동',w:12,h:10,objects:[],words:[],hints:[''],note:'문장을 움직여 새로운 법칙을 만들어 보세요.'}}
function allEntities(){return [].concat(draft.objects,draft.words)}
function at(x,y){return allEntities().filter(e=>e.x===x&&e.y===y)}
function syncMeta(){draft.title=$('titleInput').value||'새 실험';draft.chapter=$('chapterInput').value||'확장 연구동';draft.note=$('noteInput').value||'';draft.hints=[$('hint1').value,$('hint2').value,$('hint3').value].map(s=>s.trim()).filter(Boolean)}
function loadMeta(){ $('titleInput').value=draft.title||'';$('chapterInput').value=draft.chapter||'';$('noteInput').value=draft.note||'';const h=draft.hints||[];$('hint1').value=h[0]||'';$('hint2').value=h[1]||'';$('hint3').value=h[2]||''}
function setSelected(tool,label,button){selected=tool;$('selectedLabel').textContent=label;document.querySelectorAll('.palette-grid button,[data-tool]').forEach(b=>b.classList.remove('selected'));if(button)button.classList.add('selected')}
function paletteButton(parent,label,tool,cls){const b=document.createElement('button');b.type='button';b.textContent=label;if(cls)b.className=cls;b.onclick=()=>setSelected(tool,label,b);parent.appendChild(b);return b}
function buildPalettes(){
 const op=$('objectPalette'),np=$('nounPalette'),pp=$('propPalette'),xp=$('operatorPalette');
 Object.keys(DATA.N).forEach(k=>paletteButton(op,DATA.N[k],{kind:'object',type:k}));
 Object.keys(DATA.N).forEach(k=>paletteButton(np,DATA.N[k],{kind:'word',token:'N:'+k},'noun'));
 Object.keys(DATA.P).forEach(k=>paletteButton(pp,DATA.P[k],{kind:'word',token:'P:'+k},'property'));
 [['=','EQ'],['≠','NEQ'],['그리고','AND']].forEach(x=>paletteButton(xp,x[0],{kind:'word',token:x[1]},'operator'));
 document.querySelector('[data-tool="erase"]').onclick=e=>setSelected({kind:'erase'},'지우개',e.currentTarget);
}
function place(x,y){
 if(selected.kind==='erase'){draft.objects=draft.objects.filter(e=>e.x!==x||e.y!==y);draft.words=draft.words.filter(e=>e.x!==x||e.y!==y);return update()}
 draft.objects=draft.objects.filter(e=>e.x!==x||e.y!==y);draft.words=draft.words.filter(e=>e.x!==x||e.y!==y);
 if(selected.kind==='object')draft.objects.push({kind:'object',type:selected.type,x,y});
 else draft.words.push({kind:'word',token:selected.token,x,y});
 update();
}
function remove(x,y){draft.objects=draft.objects.filter(e=>e.x!==x||e.y!==y);draft.words=draft.words.filter(e=>e.x!==x||e.y!==y);update()}
function wordLabel(token){if(token==='EQ')return '=';if(token==='NEQ')return '≠';if(token==='AND')return '그리고';if(token.startsWith('N:'))return DATA.N[token.slice(2)]||token;if(token.startsWith('P:'))return DATA.P[token.slice(2)]||token;return token}
function renderBoard(){
 const board=$('editorBoard');board.style.setProperty('--editor-cols',draft.w);board.style.setProperty('--editor-rows',draft.h);board.style.gridTemplateColumns='repeat('+draft.w+',1fr)';board.style.gridTemplateRows='repeat('+draft.h+',1fr)';board.innerHTML='';
 const by=new Map(allEntities().map(e=>[e.x+','+e.y,e]));
 for(let y=0;y<draft.h;y++)for(let x=0;x<draft.w;x++){
  const cell=document.createElement('div');cell.className='edit-cell';cell.dataset.x=x;cell.dataset.y=y;const e=by.get(x+','+y);
  if(e){if(e.kind==='word'){const w=document.createElement('div');w.className='word-chip '+E.Rules.tokenKind(e.token);w.textContent=wordLabel(e.token);cell.appendChild(w)}else{const o=document.createElement('div');o.className='object-chip';o.textContent=LABELS[e.type]||DATA.N[e.type]||e.type;cell.appendChild(o)}}
  cell.onclick=()=>place(x,y);cell.oncontextmenu=ev=>{ev.preventDefault();remove(x,y)};board.appendChild(cell);
 }
 $('sizeLabel').textContent=draft.w+' × '+draft.h;
}
function renderRulesAndValidation(){
 syncMeta();const state=E.State.fromLevel(draft),rules=E.Rules.parse(state),box=$('rulePreview');box.innerHTML='';
 if(!rules.rules.length)box.innerHTML='<div class="validation-warning">아직 연결된 법칙이 없습니다.</div>';
 for(const r of rules.rules){const line=document.createElement('div');line.className='rule-line';const right=r.predicates.map(p=>p.kind==='property'?(DATA.P[p.value]||p.value):(DATA.N[p.value]||p.value)).join(' 그리고 ');line.textContent=(DATA.N[r.subject]||r.subject)+' '+(r.operator==='NEQ'?'≠':'=')+' '+right;box.appendChild(line)}
 const v=E.Validator.validateLevel(draft,DATA,0),list=$('validationList');list.innerHTML='';
 if(!v.errors.length&&!v.warnings.length){list.innerHTML='<div class="validation-ok">✓ 구조 오류 없음</div>';$('validationBadge').textContent='정상'}
 else{$('validationBadge').textContent=v.errors.length?'오류 '+v.errors.length:'경고 '+v.warnings.length;v.errors.forEach(s=>{const d=document.createElement('div');d.className='validation-error';d.textContent='오류 · '+s;list.appendChild(d)});v.warnings.forEach(s=>{const d=document.createElement('div');d.className='validation-warning';d.textContent='경고 · '+s;list.appendChild(d)})}
 $('jsonBox').value=JSON.stringify(draft,null,2);
 return v;
}
function update(){renderBoard();renderRulesAndValidation()}
function resize(dw,dh){const nw=Math.max(5,Math.min(18,draft.w+dw)),nh=Math.max(5,Math.min(14,draft.h+dh));draft.w=nw;draft.h=nh;draft.objects=draft.objects.filter(e=>e.x<nw&&e.y<nh);draft.words=draft.words.filter(e=>e.x<nw&&e.y<nh);update()}
function loadLevel(i){draft=clone(DATA.levels[i]);loadMeta();update()}
function importJson(){try{const p=JSON.parse($('jsonBox').value);if(!p||!Array.isArray(p.objects)||!Array.isArray(p.words))throw new Error('objects/words 배열이 필요합니다.');draft=p;loadMeta();update()}catch(err){alert('JSON을 읽을 수 없습니다.\n'+err.message)}}
function copyJson(){navigator.clipboard&&navigator.clipboard.writeText($('jsonBox').value).then(()=>{$('copyBtn').textContent='복사됨';setTimeout(()=>$('copyBtn').textContent='복사',900)}).catch(()=>{})}
function startPlay(){
 const v=renderRulesAndValidation();if(v.errors.length){alert('Validator 오류를 먼저 고쳐 주세요.');return}
 playState=E.State.fromLevel(draft);playHistory=new E.History(playState);document.documentElement.style.setProperty('--cols',draft.w);document.documentElement.style.setProperty('--rows',draft.h);
 const pb=$('playBoard');pb.innerHTML='';playRenderer=new UI.Renderer(pb,$('playRules'),DATA,{hero:'../../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',rock:'../../../assets/game/2d/racing/kenney-racing-pack/objects/rock3.png'});
 $('playTitle').textContent=draft.title||'플레이테스트';$('playStatus').textContent='방향키로 움직이세요.';playRenderer.render(playState,E.Rules.parse(playState),{added:[],removed:[]});if(!$('playDialog').open)$('playDialog').showModal();setTimeout(()=>pb.focus(),0);
}
function playMove(dx,dy){if(!playState)return;const r=E.Turn.step(playState,{dx,dy});if(!r.moved)return;playState=r.state;playHistory.push(playState);playRenderer.render(playState,r.rules,r.diff);$('playStatus').textContent=r.won?'✓ 해결됨 · '+playState.moves+'수':playState.moves+'수'}
function playUndo(){const s=playHistory&&playHistory.undo();if(!s)return;playState=s;playRenderer.render(playState,E.Rules.parse(playState),{added:[],removed:[]});$('playStatus').textContent=playState.moves+'수'}
function bind(){
 ['titleInput','chapterInput','noteInput','hint1','hint2','hint3'].forEach(id=>$(id).addEventListener('input',renderRulesAndValidation));
 $('wMinus').onclick=()=>resize(-1,0);$('wPlus').onclick=()=>resize(1,0);$('hMinus').onclick=()=>resize(0,-1);$('hPlus').onclick=()=>resize(0,1);
 $('clearBoard').onclick=()=>{draft.objects=[];draft.words=[];update()};$('newLevel').onclick=()=>{draft=newDraft();loadMeta();update()};
 $('exportBtn').onclick=renderRulesAndValidation;$('copyBtn').onclick=copyJson;$('importBtn').onclick=importJson;$('playBtn').onclick=startPlay;$('closePlay').onclick=()=>$('playDialog').close();$('playUndo').onclick=playUndo;$('playRestart').onclick=startPlay;
 document.querySelectorAll('[data-play-dir]').forEach(b=>b.onclick=()=>{const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.playDir];playMove(d[0],d[1])});
 addEventListener('keydown',e=>{if(!$('playDialog').open)return;const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(d){e.preventDefault();playMove(d[0],d[1])}else if(e.key.toLowerCase()==='z'){e.preventDefault();playUndo()}else if(e.key==='Escape')$('playDialog').close()});
 const select=$('loadLevel');select.innerHTML='<option value="">기존 단계 불러오기</option>'+DATA.levels.map((l,i)=>'<option value="'+i+'">'+(i+1)+'. '+l.title+'</option>').join('');select.onchange=()=>{if(select.value!=='')loadLevel(Number(select.value))};
}
buildPalettes();loadMeta();bind();update();
})();
