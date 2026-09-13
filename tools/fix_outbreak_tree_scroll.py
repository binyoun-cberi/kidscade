from pathlib import Path
import re

p=Path('outbreak_korea_v3.html')
s=p.read_text(encoding='utf-8')

# 1) Stop rebuilding the whole tree every simulation tick while the overlay is open.
old="renderChart();if($('#treeOverlay').classList.contains('show'))renderTree()}"
new="renderChart();if($('#treeOverlay').classList.contains('show')){$('#modalResource').textContent=state.phase===1?`🧬 ${Math.floor(state.dna)}`:`🔬 ${Math.floor(state.research)}`}}"
if old not in s:
    raise SystemExit('renderAll tree rerender pattern missing')
s=s.replace(old,new,1)

# 2) Add persistent viewport controls and drag scrolling helper.
helper=r'''function setupTreeViewport(viewport,branch,grid){
 if(!viewport)return;renderTree.scrollByBranch=renderTree.scrollByBranch||{};const saved=renderTree.scrollByBranch[branch];
 requestAnimationFrame(()=>{if(saved){viewport.scrollLeft=Math.min(saved.left||0,Math.max(0,viewport.scrollWidth-viewport.clientWidth));viewport.scrollTop=Math.min(saved.top||0,Math.max(0,viewport.scrollHeight-viewport.clientHeight))}renderTree.scrollByBranch[branch]={left:viewport.scrollLeft,top:viewport.scrollTop}});
 viewport.addEventListener('scroll',()=>{renderTree.scrollByBranch[branch]={left:viewport.scrollLeft,top:viewport.scrollTop}},{passive:true});
 let dragging=false,startX=0,startY=0,startLeft=0,startTop=0,moved=false;
 viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.target.closest('.skillNode'))return;dragging=true;moved=false;startX=e.clientX;startY=e.clientY;startLeft=viewport.scrollLeft;startTop=viewport.scrollTop;viewport.classList.add('dragging');try{viewport.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
 viewport.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;viewport.scrollLeft=startLeft-dx;viewport.scrollTop=startTop-dy;e.preventDefault()});
 const stop=e=>{if(!dragging)return;dragging=false;viewport.classList.remove('dragging');try{viewport.releasePointerCapture(e.pointerId)}catch(_){}};viewport.addEventListener('pointerup',stop);viewport.addEventListener('pointercancel',stop);
 viewport.addEventListener('wheel',e=>{if(e.shiftKey&&viewport.scrollWidth>viewport.clientWidth){e.preventDefault();viewport.scrollLeft+=e.deltaY||e.deltaX}},{passive:false});
 grid.querySelectorAll('[data-tree-pan]').forEach(b=>b.addEventListener('click',()=>{const dir=Number(b.dataset.treePan)||0;viewport.scrollBy({left:dir*Math.max(260,viewport.clientWidth*.72),behavior:'smooth'})}));
 grid.querySelector('[data-tree-center]')?.addEventListener('click',()=>viewport.scrollTo({left:Math.max(0,(viewport.scrollWidth-viewport.clientWidth)/2),top:0,behavior:'smooth'}));
}
'''
if 'function setupTreeViewport(' not in s:
    s=s.replace('function renderTree(){',helper+'function renderTree(){',1)

# 3) Save the outgoing tab/viewport before rebuilding.
needle=" const trees=state.phase===1?P1:P2,tabs=$('#treeTabs'),grid=$('#treeGrid');if(!renderTree.tab||!trees[renderTree.tab])renderTree.tab=Object.keys(trees)[0];"
replace=" const trees=state.phase===1?P1:P2,tabs=$('#treeTabs'),grid=$('#treeGrid');const oldViewport=grid.querySelector('.skillViewport'),oldBranch=grid.dataset.branch;if(oldViewport&&oldBranch){renderTree.scrollByBranch=renderTree.scrollByBranch||{};renderTree.scrollByBranch[oldBranch]={left:oldViewport.scrollLeft,top:oldViewport.scrollTop}}if(!renderTree.tab||!trees[renderTree.tab])renderTree.tab=Object.keys(trees)[0];"
if needle not in s:
    raise SystemExit('renderTree header pattern missing')
s=s.replace(needle,replace,1)

# 4) Wrap the viewport with always-visible pan controls.
oldfrag='<div class="skillTreeLayout"><div class="skillViewport"><div class="skillCanvas"'
newfrag='<div class="skillTreeLayout"><div class="skillViewColumn"><div class="treePanControls"><button type="button" data-tree-pan="-1" aria-label="트리 왼쪽으로 이동">◀</button><span>빈 공간을 드래그 · Shift+휠</span><button type="button" data-tree-center>◎ 중앙</button><button type="button" data-tree-pan="1" aria-label="트리 오른쪽으로 이동">▶</button></div><div class="skillViewport"><div class="skillCanvas"'
if oldfrag not in s:
    raise SystemExit('skillTreeLayout fragment missing')
s=s.replace(oldfrag,newfrag,1)
closefrag='</svg>${nodeHtml}</div></div><aside class="treeDetail">'
closefix='</svg>${nodeHtml}</div></div></div><aside class="treeDetail">'
if closefrag not in s:
    raise SystemExit('skill viewport closing fragment missing')
s=s.replace(closefrag,closefix,1)

# 5) Bind controls after each deliberate tree rebuild and remember branch identity.
needle=" grid.querySelectorAll('[data-node]').forEach(b=>b.addEventListener('click',()=>{renderTree.selected=b.dataset.node;renderTree()}));const unlock=$('#unlockTreeNode');"
replace=" grid.dataset.branch=branch;setupTreeViewport(grid.querySelector('.skillViewport'),branch,grid);\n grid.querySelectorAll('[data-node]').forEach(b=>b.addEventListener('click',()=>{renderTree.selected=b.dataset.node;renderTree()}));const unlock=$('#unlockTreeNode');"
if needle not in s:
    raise SystemExit('node listener pattern missing')
s=s.replace(needle,replace,1)

# 6) Make the scrollbar and desktop navigation visibly usable.
css=r'''
/* v3.5 · persistent/pannable evolution viewport */
.skillViewColumn{min-width:0}
.treePanControls{display:flex;align-items:center;gap:7px;margin:0 0 7px;padding:6px 7px;border:1px solid #29483f;border-radius:11px;background:#0a1714;color:#8fa69e;font-size:11px}
.treePanControls span{flex:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.treePanControls button{border:1px solid #355e51;background:#10251f;color:#eaf8f3;border-radius:8px;min-width:40px;min-height:32px;padding:5px 9px;cursor:pointer;font-weight:900}
.treePanControls button:hover{background:#17362e;border-color:#5e9f88}
.skillViewport{cursor:grab;scrollbar-width:auto;scrollbar-color:#6acfab #10241e;overscroll-behavior:contain}
.skillViewport.dragging{cursor:grabbing;user-select:none}
.skillViewport::-webkit-scrollbar{height:14px;width:12px}.skillViewport::-webkit-scrollbar-track{background:#10241e;border-radius:999px}.skillViewport::-webkit-scrollbar-thumb{background:#6acfab;border:3px solid #10241e;border-radius:999px}.skillViewport::-webkit-scrollbar-thumb:hover{background:#91efcf}
@media(max-width:780px){.treePanControls{position:sticky;top:0;z-index:8;margin-bottom:5px;font-size:10px}.treePanControls span{display:none}.treePanControls button{min-width:46px;min-height:38px}.skillViewport{height:calc(100dvh - 157px)!important}}
'''
if 'v3.5 · persistent/pannable evolution viewport' not in s:
    s=s.replace('\n</style>',css+'\n</style>',1)

p.write_text(s,encoding='utf-8')

# Extract inline scripts for syntax verification.
scripts=re.findall(r'<script>(.*?)</script>',s,re.S)
if len(scripts)<2: raise SystemExit(f'unexpected script count: {len(scripts)}')
for i,src in enumerate(scripts): Path(f'/tmp/outbreak_tree_{i}.js').write_text(src,encoding='utf-8')
print('patched tree scrolling; scripts',len(scripts))
