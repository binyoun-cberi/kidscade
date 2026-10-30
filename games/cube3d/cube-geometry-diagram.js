/* Scene-linked labels, pickable topology, hinged nets and curved dimension marks. */
(()=>{
'use strict';
const Q=window.CubeGeometryQuiz;
const V=p=>new THREE.Vector3(...p);
const palette={plain:0x73634e,fill:0xffdfa6,reference:0xf39a21,correct:0x14946d,wrong:0xd33d51};
function faceGeometry(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,1,2,0,2,3].flatMap(i=>points[i]),3));g.computeVertexNormals();return g}
function create({parent,dims,question,labels,onPick}){
const root=new THREE.Group();parent.add(root);const topology=Q.topology(...dims),targets=[],items=new Map(),labelItems=[],hinges=[];
let foldValue=0;const netSemantic=new Map();const leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');leaders.setAttribute('class','gs-label-leaders');labels.append(leaders);
function mark(object,id,type){object.userData.quizId=id;object.userData.quizType=type;targets.push(object);items.set(id,object);return object}
function color(id){return question?.selected?.includes(id)?palette.correct:question?.wrongId===id?palette.wrong:question?.reference===id?palette.reference:palette.plain}
function faceColor(id){const chosen=color(id);return chosen===palette.plain?palette.fill:chosen}
function faceOpacity(id){return id===question?.reference||question?.selected?.includes(id)||id===question?.wrongId ? .48 : question?.net ? .12 : .045}
function label(text,object,point,id,className='gs-vertex-label',aria){const node=document.createElement(id?'button':'span');node.className=className;node.textContent=text;if(id){node.type='button';node.dataset.quizElement=id;node.setAttribute('aria-label',aria||'점 '+text);node.onclick=e=>{e.stopPropagation();onPick(id)};const enabled=question?.targetType===(id.startsWith('nv')?'netVertex':'vertex');node.disabled=!enabled;if(!enabled)node.style.pointerEvents='none'}labels.append(node);const leader=document.createElementNS('http://www.w3.org/2000/svg','line');leaders.append(leader);labelItems.push({node,object,point:V(point),id,leader});return node}
function dot(group,point,id,type,name){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.105,16,12),new THREE.MeshBasicMaterial({color:color(id),depthTest:false}));mesh.position.copy(V(point));mesh.renderOrder=10;group.add(mesh);mark(mesh,id,type);if(name)label(name,mesh,[0,0,0],id,'gs-vertex-label',type==='netVertex'?'전개도 꼭짓점 '+id.slice(2):'점 '+name);return mesh}
function line(group,a,b,id,type){const start=V(a),end=V(b),length=start.distanceTo(end);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.042,.042,length,10),new THREE.MeshBasicMaterial({color:color(id),transparent:true,opacity:.95,depthTest:false}));mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());mesh.renderOrder=8;const dash=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-length/2,0),new THREE.Vector3(0,length/2,0)]),new THREE.LineDashedMaterial({color:color(id),dashSize:.12,gapSize:.10,depthTest:false}));dash.computeLineDistances();dash.visible=false;mesh.add(dash);mesh.userData.hiddenLine=dash;group.add(mesh);mark(mesh,id,type);return mesh}
function face(group,points,id,type){const mesh=new THREE.Mesh(faceGeometry(points),new THREE.MeshBasicMaterial({color:faceColor(id),side:THREE.DoubleSide,transparent:true,opacity:faceOpacity(id),depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));group.add(mesh);mark(mesh,id,type);return mesh}
if(question?.net){const data=Q.netElements(...dims),groups=[];
data.panels.forEach(p=>{const g=new THREE.Group();g.position.copy(V(p.position));(p.parent<0?root:groups[p.parent]).add(g);groups.push(g);hinges.push({group:g,axis:p.axis,sign:p.sign});face(g,p.points,'nf'+p.face,'netFace')});
for(const e of data.edges)line(groups[e.panel],e.a,e.b,e.id,'netEdge');
for(const p of data.vertices){netSemantic.set(p.id,p.vertex);const text=question.reference===p.id?'★':'●';dot(groups[p.panel],p.local,p.id,'netVertex',question.targetType==='netVertex'?text:null)}
}else{
Q.FACES.forEach((f,i)=>face(root,f.map(v=>topology.vertices[v]),'f'+i,'face'));
Q.EDGES.forEach((e,i)=>line(root,topology.vertices[e[0]],topology.vertices[e[1]],'e'+i,'edge'));
topology.vertices.forEach((p,i)=>dot(root,p,'v'+i,'vertex',Q.LETTERS[i]));
if(question?.dimensions)addDimensions();
}
function dashed(points,material){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);line.computeLineDistances();root.add(line);return line}
function addDimensions(){const [w,h,d]=dims,mat=()=>new THREE.LineDashedMaterial({color:0x7952c4,dashSize:.16,gapSize:.10,depthTest:false});
const marks=[
{a:[-w/2,0,d/2],b:[w/2,0,d/2],offset:[0,-.48,.65],bend:[0,-.45,.3],value:w},
{a:[w/2,0,d/2],b:[w/2,0,-d/2],offset:[.7,-.38,0],bend:[.55,-.2,0],value:d},
{a:[w/2,0,-d/2],b:[w/2,h,-d/2],offset:[.85,0,-.55],bend:[.55,0,-.3],value:h}];
for(const m of marks){const a=V(m.a),b=V(m.b),offset=V(m.offset),start=a.clone().add(offset),end=b.clone().add(offset),control=start.clone().add(end).multiplyScalar(.5).add(V(m.bend));dashed([a,start],mat());dashed([b,end],mat());const curve=new THREE.QuadraticBezierCurve3(start,control,end);dashed(curve.getPoints(40),mat());label(m.value+' cm',root,curve.getPoint(.5).toArray(),null,'gs-dimension-label');
for(const p of [start,end]){const tick=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:0x7952c4}));tick.position.copy(p);root.add(tick)}}
}
function updateColors(){for(const [id,m] of items){const isFace=m.userData.quizType==='face'||m.userData.quizType==='netFace';m.material.color.setHex(isFace?faceColor(id):color(id));if(isFace)m.material.opacity=faceOpacity(id)}
for(const l of labelItems){if(l.id){l.node.classList.toggle('is-reference',l.id===question?.reference);l.node.classList.toggle('is-correct',!!question?.selected?.includes(l.id));l.node.classList.toggle('is-wrong',l.id===question?.wrongId)}}}
function layout(camera,canvas){root.updateWorldMatrix(true,true);const rect=canvas.getBoundingClientRect(),placed=[],foldedSeen=new Set();
for(const l of labelItems){const world=l.object.localToWorld(l.point.clone()),p=world.clone().project(camera),x=(p.x+1)*rect.width/2,y=(1-p.y)*rect.height/2;l.node.hidden=p.z< -1||p.z>1;
if(question?.net&&foldValue>.98&&l.id){const semantic=netSemantic.get(l.id);if(foldedSeen.has(semantic))l.node.hidden=true;foldedSeen.add(semantic);l.node.textContent=Q.LETTERS[semantic]}else if(question?.net&&l.id)l.node.textContent=question.reference===l.id?'★':'●';
l.node.dataset.screenX=x;l.node.dataset.screenY=y;placed.push({l,x,y,lx:x,ly:y-(l.id?25:0)});
}
// Separate overlapping names, with a leader back to each exact 3D point.
const named=placed.filter(p=>p.l.id&&!p.l.node.hidden);for(let n=0;n<12;n++)for(let i=0;i<named.length;i++)for(let j=i+1;j<named.length;j++){const a=named[i],b=named[j],dx=b.lx-a.lx,dy=b.ly-a.ly,dist=Math.hypot(dx,dy);if(dist<35){const nx=dist?dx/dist:1,ny=dist?dy/dist:0,shift=(35-dist)/2;a.lx-=nx*shift;a.ly-=ny*shift;b.lx+=nx*shift;b.ly+=ny*shift}}
for(const p of placed){p.l.node.style.left=p.lx+'px';p.l.node.style.top=p.ly+'px';p.l.leader.setAttribute('x1',p.x);p.l.leader.setAttribute('y1',p.y);p.l.leader.setAttribute('x2',p.lx);p.l.leader.setAttribute('y2',p.ly);p.l.leader.style.display=p.l.node.hidden||!p.l.id?'none':''}
for(const [id,m] of items){const pos=m.getWorldPosition(new THREE.Vector3());if(m.userData.quizType==='face')new THREE.Box3().setFromObject(m).getCenter(pos);pos.project(camera);m.userData.screen=[(pos.x+1)*rect.width/2,(1-pos.y)*rect.height/2];
if(!question?.net&&m.userData.quizType==='edge'){const edge=Q.EDGES[Number(id.slice(1))],toCamera=camera.position.clone().sub(new THREE.Vector3(0,dims[1]/2,0)),hidden=Q.FACES.map((f,i)=>edge.every(v=>f.includes(v))?i:-1).filter(i=>i>=0).every(i=>V(Q.NORMALS[i]).dot(toCamera)<0),highlight=id===question?.reference||question?.selected?.includes(id)||id===question?.wrongId;m.material.opacity=hidden&&!highlight ? .08 : .95;m.userData.hiddenLine.visible=hidden&&!highlight;m.userData.hiddenLine.material.color.setHex(color(id));if(highlight)m.material.opacity=.95}}
}
function pickAt(x,y,camera,canvas){if(!question?.targetType||question.revealed)return null;const rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);const matches=targets.filter(m=>m.userData.quizType===question.targetType),hit=ray.intersectObjects(matches,false)[0];if(hit){onPick(hit.object.userData.quizId);return hit.object.userData.quizId}return null}
function fold(value){foldValue=Math.max(0,Math.min(1,value));hinges.forEach(h=>h.group.rotation[h.axis]=h.sign*foldValue*Math.PI/2)}
function choices(){return [...items.entries()].filter(([,m])=>m.userData.quizType===question?.targetType).map(([id,m])=>({id,label:id[0]==='v'?'점 '+Q.vertexName(Number(id.slice(1))):id[0]==='e'?'모서리 '+Q.edgeName(Number(id.slice(1))):id[0]==='f'?'면 '+Q.faceName(Number(id.slice(1))):'전개도 '+(question.targetType==='netVertex'?'꼭짓점 ':'모서리 ')+id.slice(2),screen:m.userData.screen}))}
function dispose(){parent.remove(root);root.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.filter(Boolean).forEach(m=>m.dispose())});labelItems.forEach(l=>l.node.remove());leaders.remove()}
updateColors();return {layout,pickAt,updateColors,fold,choices,dispose,root};
}
window.CubeGeometryDiagram={create};
})();
