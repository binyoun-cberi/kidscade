from pathlib import Path
import re

p=Path('outbreak_korea_v3.html')
s=p.read_text(encoding='utf-8')

css=r'''

/* v3.6 · grouped Plague-style transmission tree */
.transmissionCanvas{width:880px!important;min-width:880px!important;height:720px!important;min-height:720px!important;margin:0 auto}
.transmissionCore,.transmissionGroup{position:absolute;transform:translate(-50%,-50%);z-index:1;pointer-events:none;text-align:center;box-shadow:0 8px 22px rgba(0,0,0,.28)}
.transmissionCore{width:188px;padding:10px 14px;border-radius:18px;border:2px solid #5df0b5;background:linear-gradient(180deg,#153b30,#0a211a);color:#effff9;font-weight:1000}
.transmissionCore small{display:block;margin-top:3px;font-size:9px;color:#9fd1bf;font-weight:700}
.transmissionGroup{width:164px;padding:8px 10px;border-radius:15px;background:#0d201b;border:2px solid #36564c;color:#eff9f5}
.transmissionGroup b{display:block;font-size:12px}.transmissionGroup small{display:block;margin-top:2px;font-size:9px;color:#9eb5ad}
.transmissionGroup.human{border-color:#65b8ff;background:#102536}.transmissionGroup.environment{border-color:#61d8d0;background:#0d2927}.transmissionGroup.animal{border-color:#8bd36a;background:#162718}.transmissionGroup.vector{border-color:#d89ce8;background:#2a1930}
.treeEdge.groupLink{stroke-width:3;opacity:.58;stroke-dasharray:5 6}.treeEdge.groupLink.human{stroke:#65b8ff}.treeEdge.groupLink.environment{stroke:#61d8d0}.treeEdge.groupLink.animal{stroke:#8bd36a}.treeEdge.groupLink.vector{stroke:#d89ce8}
.transmissionCanvas .skillNode{width:138px;min-height:76px;padding:8px 7px;border-radius:14px}
.transmissionCanvas .skillNode .skillIcon{font-size:20px}.transmissionCanvas .skillNode .skillName{font-size:11px}.transmissionCanvas .skillNode .skillCost{font-size:10px}.transmissionCanvas .skillNode .skillState{font-size:9px}
.transmissionCanvas .skillNode.route-human{border-top:4px solid #65b8ff}.transmissionCanvas .skillNode.route-environment{border-top:4px solid #61d8d0}.transmissionCanvas .skillNode.route-animal{border-top:4px solid #8bd36a}.transmissionCanvas .skillNode.route-vector{border-top:4px solid #d89ce8}
.transmissionLegend{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.transmissionLegend .groupKey{padding:3px 7px;border-radius:999px;border:1px solid #37574d;background:#0a1714}.transmissionLegend .human{color:#8fcaff}.transmissionLegend .environment{color:#83e4de}.transmissionLegend .animal{color:#a8e58d}.transmissionLegend .vector{color:#e2b4ef}
@media(max-width:780px){.transmissionCanvas{width:880px!important;min-width:880px!important;height:720px!important;min-height:720px!important}.transmissionCore{width:172px}.transmissionGroup{width:150px}.transmissionCanvas .skillNode{width:136px;min-height:78px}}
'''
if 'v3.6 · grouped Plague-style transmission tree' not in s:
    s=s.replace('</style>',css+'\n</style>',1)

new_render=r'''function renderTree(){
 const trees=state.phase===1?P1:P2,tabs=$('#treeTabs'),grid=$('#treeGrid');const oldViewport=grid.querySelector('.skillViewport'),oldBranch=grid.dataset.branch;if(oldViewport&&oldBranch){renderTree.scrollByBranch=renderTree.scrollByBranch||{};renderTree.scrollByBranch[oldBranch]={left:oldViewport.scrollLeft,top:oldViewport.scrollTop}}if(!renderTree.tab||!trees[renderTree.tab])renderTree.tab=Object.keys(trees)[0];
 tabs.innerHTML=Object.keys(trees).map(k=>`<button type="button" class="tab ${k===renderTree.tab?'active':''}" data-tab="${k}">${treeIcons[k]||'◆'} ${k}</button>`).join('');
 tabs.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{renderTree.tab=b.dataset.tab;renderTree.selected=null;renderTree()}));
 const branch=renderTree.tab,nodes=trees[branch],set=state.phase===1?state.bought:state.phase2Bought,index=Object.fromEntries(nodes.map(n=>[n.id,n])),memo={},isTransmission=state.phase===1&&branch==='전파 방식';
 let W,H,positions={},decor='',extraEdges='';
 const routeIcons={air:'🌬️',water:'💧',saliva:'🤝',blood:'🩸',animal:'🐄',bird:'🕊️',rodent:'🐀',insect:'🦟'};
 const routeGroup=id=>id.startsWith('air')||id.startsWith('saliva')?'human':id.startsWith('water')?'environment':id.startsWith('animal')||id.startsWith('bird')||id.startsWith('rodent')?'animal':'vector';
 const routeIcon=id=>{const k=Object.keys(routeIcons).find(x=>id.startsWith(x));return k?routeIcons[k]:'🦠'};
 if(isTransmission){
   W=880;H=720;
   Object.assign(positions,{air1:{x:115,y:255},air2:{x:115,y:350},saliva1:{x:300,y:255},saliva2:{x:300,y:350},water1:{x:675,y:255},water2:{x:675,y:350},animal1:{x:90,y:535},animal2:{x:90,y:640},bird1:{x:240,y:535},bird2:{x:240,y:640},rodent1:{x:390,y:535},rodent2:{x:390,y:640},blood1:{x:605,y:535},blood2:{x:605,y:640},insect1:{x:765,y:535},insect2:{x:765,y:640}});
   const core={x:440,y:72},groups={human:{x:205,y:155,icon:'👥',name:'사람 간 전파',desc:'호흡 · 밀접접촉'},environment:{x:675,y:155,icon:'🌊',name:'환경·수계',desc:'물 · 항만 · 도서'},animal:{x:240,y:430,icon:'🐾',name:'동물 숙주',desc:'가축 · 조류 · 설치류'},vector:{x:685,y:430,icon:'🩸',name:'체액·매개체',desc:'체액 · 곤충 매개'}};
   decor=`<div class="transmissionCore" style="left:${core.x}px;top:${core.y}px">🧬 전파 방식<small>어떤 경로로 퍼질 것인가?</small></div>`+Object.entries(groups).map(([k,g])=>`<div class="transmissionGroup ${k}" style="left:${g.x}px;top:${g.y}px"><b>${g.icon} ${g.name}</b><small>${g.desc}</small></div>`).join('');
   const link=(a,b,cls)=>`<path class="treeEdge groupLink ${cls}" d="M ${a.x} ${a.y+28} C ${a.x} ${a.y+62}, ${b.x} ${b.y-62}, ${b.x} ${b.y-28}"/>`;
   for(const [k,g] of Object.entries(groups))extraEdges+=link(core,g,k);
   const groupRoots={human:['air1','saliva1'],environment:['water1'],animal:['animal1','bird1','rodent1'],vector:['blood1','insect1']};
   for(const [k,ids] of Object.entries(groupRoots))for(const id of ids)extraEdges+=link(groups[k],positions[id],k);
 }else{
   const depths=nodes.map(n=>nodeDepth(n,index,memo)),maxDepth=Math.max(...depths,0),layers=Array.from({length:maxDepth+1},()=>[]);nodes.forEach((n,i)=>layers[depths[i]].push(n));
   const maxLayerSize=Math.max(...layers.map(l=>l.length),1),layerGap=132,top=74;W=Math.max(820,maxLayerSize*190);H=Math.max(510,top*2+maxDepth*layerGap+40);
   layers.forEach((layer,d)=>layer.forEach((n,i)=>{positions[n.id]={x:W*(i+1)/(layer.length+1),y:top+d*layerGap}}));
 }
 if(!renderTree.selected||!index[renderTree.selected])renderTree.selected=(nodes.find(n=>!set.has(n.id)&&(!n.req||set.has(n.req)))||nodes[0]).id;
 const selected=index[renderTree.selected],selBought=set.has(selected.id),selLocked=selected.req&&!set.has(selected.req),selCost=costFor(selected,branch),resource=state.phase===1?state.dna:state.research;
 let edges=extraEdges;for(const n of nodes){if(!n.req||!positions[n.req])continue;const a=positions[n.req],b=positions[n.id],childBought=set.has(n.id),avail=!childBought&&set.has(n.req);edges+=`<path class="treeEdge ${childBought?'bought':avail?'available':''}" d="M ${a.x} ${a.y+38} C ${a.x} ${a.y+66}, ${b.x} ${b.y-66}, ${b.x} ${b.y-38}"/>`}
 const nodeHtml=nodes.map(n=>{const pos=positions[n.id],locked=n.req&&!set.has(n.req),bought=set.has(n.id),available=!locked&&!bought,cost=costFor(n,branch),groupClass=isTransmission?` route-${routeGroup(n.id)}`:'',icon=isTransmission?routeIcon(n.id):(treeIcons[branch]||'◆');return`<button type="button" class="skillNode${groupClass} ${locked?'locked':available?'available':'bought'} ${n.id===renderTree.selected?'selected':''}" data-node="${n.id}" style="left:${pos.x}px;top:${pos.y}px" aria-label="${n.n}"><div class="skillIcon">${icon}</div><div class="skillName">${bought?'✓ ':''}${n.n}</div><div class="skillCost">${state.phase===1?'🧬':'🔬'} ${cost}</div><div class="skillState">${bought?'획득 완료':locked?'잠김':'선택 가능'}</div></button>`}).join('');
 const reqName=selected.req?(getNode(selected.req,state.phase)?.n||selected.req):'없음',selectedIcon=isTransmission?routeIcon(selected.id):(treeIcons[branch]||'◆');
 const hint=isTransmission?`<div class="treeHint transmissionLegend"><span><i class="stateDot"></i> 잠김</span><span><i class="stateDot available"></i> 선택 가능</span><span><i class="stateDot bought"></i> 획득</span><span class="groupKey human">👥 사람 간</span><span class="groupKey environment">🌊 환경·수계</span><span class="groupKey animal">🐾 동물 숙주</span><span class="groupKey vector">🩸 체액·매개체</span></div>`:`<div class="treeHint"><span><i class="stateDot"></i> 잠김</span><span><i class="stateDot available"></i> 선택 가능</span><span><i class="stateDot bought"></i> 획득</span><span>노드를 선택하면 오른쪽에서 효과를 확인합니다.</span></div>`;
 grid.innerHTML=`${hint}<div class="skillTreeLayout"><div class="skillViewColumn"><div class="treePanControls"><button type="button" data-tree-pan="-1" aria-label="트리 왼쪽으로 이동">◀</button><span>${isTransmission?'4개 전파군을 한 화면에 배치했습니다.':'빈 공간을 드래그 · Shift+휠'}</span><button type="button" data-tree-center>◎ 중앙</button><button type="button" data-tree-pan="1" aria-label="트리 오른쪽으로 이동">▶</button></div><div class="skillViewport"><div class="skillCanvas ${isTransmission?'transmissionCanvas':''}" style="width:${W}px;height:${H}px"><svg class="treeLinks" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${edges}</svg>${decor}${nodeHtml}</div></div></div><aside class="treeDetail"><div class="detailIcon">${selectedIcon}</div><div class="detailBranch">${branch}</div><h3>${selected.n}</h3><p>${selected.d}</p><div class="effectChips">${formatEffects(selected.e)}</div><div class="requireBox">선행 노드: <b>${reqName}</b><br>비용: <b>${state.phase===1?'🧬':'🔬'} ${selCost}</b></div><button type="button" class="unlockBtn" id="unlockTreeNode" ${selBought||selLocked||resource<selCost?'disabled':''}>${selBought?'이미 획득함':selLocked?'선행 노드 필요':resource<selCost?'자원 부족':state.phase===1?'이 특성 진화':'이 대응 연구'}</button></aside></div>`;
 grid.dataset.branch=branch;setupTreeViewport(grid.querySelector('.skillViewport'),branch,grid);
 grid.querySelectorAll('[data-node]').forEach(b=>b.addEventListener('click',()=>{renderTree.selected=b.dataset.node;renderTree()}));const unlock=$('#unlockTreeNode');if(unlock&&!unlock.disabled)unlock.addEventListener('click',()=>buyNode(selected.id,branch));
 $('#treeTitle').textContent=state.phase===1?'병원체 진화 네트워크':'인간 대응 네트워크';$('#treeSubtitle').textContent=isTransmission?'중심 전파핵에서 4개 전파군으로 갈라집니다. 각 경로의 I → II를 따라 전문화하세요.':state.phase===1?'연결선을 따라 빌드를 발전시키세요. 강한 진화가 항상 좋은 선택은 아닙니다.':'진단·방역·의료·연구·사회를 연결해 상황에 맞는 대응망을 구축하세요.';$('#modalResource').textContent=state.phase===1?`🧬 ${Math.floor(state.dna)}`:`🔬 ${Math.floor(state.research)}`;
}'''

pattern=r"function renderTree\(\)\{.*?\n\}\nfunction openTree\(\)"
m=re.search(pattern,s,re.S)
if not m:
    raise SystemExit('renderTree block not found')
s=s[:m.start()]+new_render+'\nfunction openTree()'+s[m.end():]

p.write_text(s,encoding='utf-8')
print('grouped transmission tree patched')
