(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Polyhedron3D = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PHI = (1 + Math.sqrt(5)) / 2;
  const inv = 1 / PHI;
  const add = (a,b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
  const sub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const mul = (a,s) => a.map(v => v*s);
  const normalize = a => mul(a, 1 / (Math.hypot(...a) || 1));
  const sum = vectors => vectors.reduce(add,[0,0,0]);
  const quat = (axis, angle) => { const n=normalize(axis), s=Math.sin(angle/2); return [n[0]*s,n[1]*s,n[2]*s,Math.cos(angle/2)]; };
  const qmul = (a,b) => [
    a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
    a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
    a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
    a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
  ];
  const rotate = (q,v) => {
    const u=[q[0],q[1],q[2]], t=mul(cross(u,v),2);
    return add(v,add(mul(t,q[3]),cross(u,t)));
  };
  const align = (from,to) => {
    const a=normalize(from), b=normalize(to), d=dot(a,b);
    if(d>0.999999) return [0,0,0,1];
    if(d< -0.999999) return quat(Math.abs(a[0])<.9?cross(a,[1,0,0]):cross(a,[0,1,0]),Math.PI);
    const c=cross(a,b), q=[c[0],c[1],c[2],1+d];
    return mul(q, 1 / Math.hypot(...q));
  };
  const mixQuat = (a,b,t) => {
    let end=b;
    if(dot(a,b)<0) end=mul(b,-1);
    const x=a.map((v,i)=>v*(1-t)+end[i]*t);
    return mul(x,1/Math.hypot(...x));
  };

  function verticesFor(sides) {
    const v=[];
    if(sides===4) return [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]];
    if(sides===6) { for(const x of [-1,1]) for(const y of [-1,1]) for(const z of [-1,1]) v.push([x,y,z]); return v; }
    if(sides===8) return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    if(sides===12) {
      for(const x of [-1,1]) for(const y of [-1,1]) for(const z of [-1,1]) v.push([x,y,z]);
      for(const x of [-1,1]) for(const y of [-1,1]) { v.push([0,x*inv,y*PHI], [x*inv,y*PHI,0],[x*PHI,0,y*inv]); }
      return v;
    }
    if(sides===20) {
      for(const x of [-1,1]) for(const y of [-1,1]) { v.push([0,x,y*PHI],[x,y*PHI,0],[x*PHI,0,y]); }
      return v;
    }
    throw new RangeError('Unsupported number of faces');
  }

  function geometryFor(sides) {
    const raw=verticesFor(sides);
    const maxRadius=Math.max(...raw.map(v=>Math.hypot(...v)));
    const vertices=raw.map(v=>mul(v,1.55/maxRadius));
    const faces=[],seen=new Set(),epsilon=1e-5;
    for(let i=0;i<vertices.length;i++) for(let j=i+1;j<vertices.length;j++) for(let k=j+1;k<vertices.length;k++){
      let n=cross(sub(vertices[j],vertices[i]),sub(vertices[k],vertices[i]));
      if(Math.hypot(...n)<epsilon) continue;
      n=normalize(n);
      let d=dot(n,vertices[i]);
      if(d<0){n=mul(n,-1);d=-d;}
      if(vertices.some(v=>dot(n,v)-d>epsilon)) continue;
      const indices=vertices.map((v,idx)=>Math.abs(dot(n,v)-d)<epsilon?idx:-1).filter(v=>v>=0);
      const key=[...indices].sort((a,b)=>a-b).join(',');
      if(indices.length<3||seen.has(key)) continue;
      seen.add(key);
      const center=mul(sum(indices.map(idx=>vertices[idx])),1/indices.length);
      const tangent=normalize(sub(vertices[indices[0]],center));
      const bitangent=cross(n,tangent);
      indices.sort((a,b)=>{
        const da=sub(vertices[a],center),db=sub(vertices[b],center);
        return Math.atan2(dot(da,bitangent),dot(da,tangent))-Math.atan2(dot(db,bitangent),dot(db,tangent));
      });
      faces.push({indices, normal:n,center});
    }
    if(faces.length!==sides) throw new Error('Invalid polyhedron: '+sides+' / '+faces.length);
    // Stable face numbering: one actual polygon is assigned to each number.
    return { vertices, faces:faces.map((face,i)=>({...face,number:i+1})), sides };
  }

  class DiceRenderer {
    constructor(canvas) {
      this.canvas=canvas; this.ctx=canvas.getContext('2d');
      this.geometry=geometryFor(6); this.orientation=[0,0,0,1];
      this.fallen=null; this.result=null; this.busy=false; this.motion=null;
      this.reduceMotion=typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(typeof ResizeObserver!=='undefined') new ResizeObserver(()=>this.draw()).observe(canvas);
      if(typeof window!=='undefined') window.addEventListener('resize',()=>this.draw());
      this.draw();
    }
    setFaces(n){
      if(this.busy) return;
      this.geometry=geometryFor(n); this.result=null; this.orientation=quat([1,.35,.2],-.45);
      this.draw();
    }
    roll(result) {
      if(this.busy) return Promise.reject(new Error('Already rolling'));
      if(!Number.isInteger(result)||result<1||result>this.geometry.sides) return Promise.reject(new Error('Invalid face'));
      this.busy=true;this.result=null;
      const face=this.geometry.faces[result-1];
      const goal=align(face.normal,normalize([.05,.40,1]));
      const start=this.orientation;
      const duration=this.reduceMotion?550:2350;
      const t0=performance.now();
      return new Promise(resolve=>{
        const frame=now=>{
          const p=Math.min(1,(now-t0)/duration);
          const spin=quat(normalize([.77,1,.42]),(this.reduceMotion?1.0:7.5)*Math.PI*p);
          const transient=qmul(spin,start);
          const settle=Math.max(0,Math.min(1,(p-.64)/.36));
          const smooth=settle*settle*(3-2*settle);
          this.orientation=mixQuat(transient,goal,smooth);
          const bounce=Math.abs(Math.sin((this.reduceMotion?1:3.3)*Math.PI*p))*(1-p)*.83;
          const approach=(1-Math.pow(1-p,2));
          this.motion={height:bounce+((1-p)*(this.reduceMotion?.25:.55)),x:(approach-1)*.75,tilt:p};
          this.draw();
          if(p<1) requestAnimationFrame(frame);
          else {
            this.orientation=goal;this.motion=null;this.result=result;this.busy=false;this.draw();resolve(result);
          }
        };
        requestAnimationFrame(frame);
      });
    }
    draw() {
      if(!this.ctx) return;
      const canvas=this.canvas,rect=canvas.getBoundingClientRect();
      const w=Math.max(250,rect.width||520),h=Math.max(210,rect.height||360);
      const dpr=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2);
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
        canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
      }
      const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      const scale=Math.min(w/5.2,h/4.4,125), x=w/2+(this.motion?.x||0)*scale;
      const floor=h*.78,drop=(this.motion?.height||0)*scale;
      const cy=floor-scale*1.43-drop;
      const glow=ctx.createRadialGradient(w*.5,h*.58,5,w*.5,h*.58,Math.max(w,h)*.6);
      glow.addColorStop(0,'rgba(125,160,255,.13)');glow.addColorStop(1,'rgba(125,160,255,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
      ctx.beginPath();ctx.ellipse(x,floor+9,scale*(1.24+drop/scale*.15),scale*.21,0,0,Math.PI*2);
      ctx.fillStyle='rgba(2,9,28,.35)';ctx.fill();
      ctx.beginPath();ctx.ellipse(x,floor+7,scale*.85,scale*.12,0,0,Math.PI*2);
      ctx.fillStyle='rgba(2,9,28,.18)';ctx.fill();
      const projected=this.geometry.vertices.map(v=>{
        const [px,py,pz]=rotate(this.orientation,v);
        const factor=4.8/(4.8-pz);
        return {x:x+px*scale*factor,y:cy-py*scale*factor,z:pz};
      });
      const light=normalize([-.45,.85,1.1]);
      const faces=this.geometry.faces.map(face=>{
        const pts=face.indices.map(i=>projected[i]);
        const norm=rotate(this.orientation,face.normal);
        const depth=pts.reduce((sum,p)=>sum+p.z,0)/pts.length;
        return {face,pts,norm,depth};
      }).filter(f=>f.norm[2]>.015).sort((a,b)=>a.depth-b.depth);
      for(const {face,pts,norm} of faces){
        const brightness=Math.max(.1,dot(norm,light));
        const hue=this.geometry.sides===6?219:this.geometry.sides===20?277:205;
        ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
        for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
        ctx.closePath();
        ctx.fillStyle='hsl('+hue+' 74% '+(27+brightness*34)+'%)';ctx.fill();
        ctx.lineWidth=Math.max(1.4,scale*.032);ctx.strokeStyle='rgba(229,246,255,.8)';ctx.stroke();
        const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length;
        const cY=pts.reduce((s,p)=>s+p.y,0)/pts.length;
        const radius=Math.min(...pts.map(p=>Math.hypot(p.x-cx,p.y-cY)));
        const fontSize=Math.max(12,Math.min(scale*.50,radius*1.15));
        ctx.font='900 '+fontSize+'px system-ui, sans-serif';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.lineJoin='round';ctx.lineWidth=Math.max(2,fontSize*.105);
        ctx.strokeStyle='rgba(11,26,65,.85)';ctx.strokeText(String(face.number),cx,cY+1);
        ctx.fillStyle='#faffff';ctx.fillText(String(face.number),cx,cY+1);
      }
      if(this.result!==null&&!this.busy) {
        ctx.font='700 12px system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(232,243,255,.82)';
        ctx.fillText('나온 면: '+this.result,x,floor+scale*.48);
      }
    }
  }
  return Object.freeze({verticesFor,geometryFor,rotate,align,DiceRenderer});
});
