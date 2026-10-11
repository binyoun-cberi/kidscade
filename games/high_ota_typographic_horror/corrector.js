/* The Corrector — deterministic horror pursuit. No rendering or browser APIs. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaCorrector=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const SHELTER=Object.freeze({x:-5.65,z:-53.6});
  const PATROL=Object.freeze([
    {x:0,z:-42.2},{x:-5.2,z:-46.5},{x:-8.7,z:-43.8},
    {x:-6.2,z:-52.0},{x:0,z:-54.6},{x:-1.5,z:-45.2}
  ]);
  const DIST=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const cell=.5,gridX=-15,gridZ=-65.5,NX=37,NZ=56;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const copy=p=>({x:p.x,z:p.z});
  function create(){
    return {x:-7.7,z:-43.5,heading:0,phase:'dormant',hidden:false,
      target:null,lastKnown:null,path:[],patrolIndex:0,repath:0,search:0,
      grace:16,noiseTimer:0,finalTimer:0,exposed:false};
  }
  function reset(s){
    Object.assign(s,create());return s;
  }
  function lineClear(a,b,passable){
    const dist=DIST(a,b);
    for(let i=1,n=Math.max(1,Math.ceil(dist/.20));i<=n;i++){
      const t=i/n;
      if(!passable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;
    }
    return true;
  }
  function nearestCell(p,passable){
    let index=-1,best=Infinity;
    const px=clamp(Math.round((p.x-gridX)/cell),0,NX-1);
    const pz=clamp(Math.round((p.z-gridZ)/cell),0,NZ-1);
    for(let dz=-6;dz<=6;dz++)for(let dx=-6;dx<=6;dx++){
      const ix=px+dx,iz=pz+dz;
      if(ix<0||iz<0||ix>=NX||iz>=NZ)continue;
      const x=gridX+ix*cell,z=gridZ+iz*cell;
      if(!passable(x,z))continue;
      const d=(x-p.x)**2+(z-p.z)**2;
      if(d<best){best=d;index=iz*NX+ix;}
    }
    return index;
  }
  function route(start,end,passable){
    if(lineClear(start,end,passable))return [copy(end)];
    const src=nearestCell(start,passable),dst=nearestCell(end,passable);
    if(src<0||dst<0)return [];
    const prev=new Int32Array(NX*NZ).fill(-1),queue=new Int32Array(NX*NZ);
    let head=0,tail=0;
    queue[tail++]=src;prev[src]=src;
    while(head<tail){
      const here=queue[head++];if(here===dst)break;
      const ix=here%NX,iz=(here/NX)|0;
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=ix+dx,nz=iz+dz;
        if(nx<0||nz<0||nx>=NX||nz>=NZ)continue;
        const next=nz*NX+nx;
        if(prev[next]!==-1)continue;
        if(!passable(gridX+nx*cell,gridZ+nz*cell))continue;
        prev[next]=here;queue[tail++]=next;
      }
    }
    if(prev[dst]===-1)return [];
    const path=[];
    let n=dst;
    while(n!==src&&path.length<NX*NZ){
      const ix=n%NX,iz=(n/NX)|0;
      path.push({x:gridX+ix*cell,z:gridZ+iz*cell});n=prev[n];
    }
    path.reverse();
    // Path compression retains real collision checks between points.
    const result=[],nodes=[copy(start),...path];
    let at=0;
    while(at<nodes.length-1){
      let next=at+1;
      for(let j=nodes.length-1;j>at+1;j--){
        if(lineClear(nodes[at],nodes[j],passable)){next=j;break;}
      }
      result.push(nodes[next]);at=next;
    }
    if(lineClear(result[result.length-1]||start,end,passable))result.push(copy(end));
    return result;
  }
  function enter(s,p){
    if(s.phase==='dormant'||s.phase==='final'||s.hidden||DIST(p,SHELTER)>1.7)return false;
    // The shelter is not a magical escape if the Corrector has already reached it.
    if(s.phase==='chase'&&DIST(s,p)<2.6)return false;
    s.hidden=true;s.exposed=false;s.lastKnown=copy(p);
    if(s.phase==='chase'){s.phase='search';s.search=6.5;}
    return true;
  }
  function leave(s){if(!s.hidden)return false;s.hidden=false;s.grace=Math.max(s.grace,1.2);return true;}
  function beginFinal(s){
    s.hidden=false;s.x=0;s.z=-52.9;s.phase='final';s.path=[];
    s.target=null;s.finalTimer=0;s.grace=1.5;s.exposed=false;
  }
  function step(s,dt,p,env){
    dt=clamp(dt||0,0,.1);
    const stage=env.stage;
    if(stage==='final'){
      if(s.phase!=='final')beginFinal(s);
      s.finalTimer+=dt;s.grace=Math.max(0,s.grace-dt);
      if(s.grace<=0){
        const dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz);
        // No teleporting across the final seal; it was opened by the player.
        const advance=Math.min(d,3.55*dt);
        if(d>.001){s.x+=dx/d*advance;s.z+=dz/d*advance;s.heading=Math.atan2(dx,dz);}
      }
      return {caught:s.grace<=0&&DIST(s,p)<.9&&!s.hidden,phase:s.phase,distance:DIST(s,p)};
    }
    if(stage!=='explore'){
      s.phase='dormant';s.hidden=false;s.exposed=false;
      return {caught:false,phase:s.phase,distance:Infinity};
    }
    // During exploration the Corrector materializes only when unread errors pile up.
    // Absent flag preserves isolated legacy encounter simulations.
    if(env.awakened===false){
      if(s.phase!=='dormant')reset(s);
      return {caught:false,phase:s.phase,distance:Infinity};
    }
    if(s.phase==='dormant'){s.phase='patrol';s.grace=16;}
    const passable=env.passable;
    const safe=env.safe===true;
    const d=DIST(s,p);
    const sight= !safe&&!s.hidden&&s.grace<=0&&d<9.5
      &&Math.cos(s.heading)*(p.z-s.z)/Math.max(.01,d)
       +Math.sin(s.heading)*(p.x-s.x)/Math.max(.01,d)>-.24
      &&lineClear(s,p,passable);
    const heard=!safe&&!s.hidden&&s.grace<=0&&
      (env.running&&d<9.0 || env.moving&&d<2.5 || env.noise&&d<11.5);
    s.grace=Math.max(0,s.grace-dt);
    if(sight){
      s.phase='chase';s.lastKnown=copy(p);s.target=copy(p);
      s.search=7.0;s.exposed=true;
    }else if(heard&&s.phase!=='chase'){
      s.phase='investigate';s.target=copy(p);s.lastKnown=copy(p);s.exposed=true;
    }else if(s.phase==='chase'&&!sight){
      s.phase='search';s.target=s.lastKnown&&copy(s.lastKnown);s.search=7.0;
    }
    if(s.phase==='search'){
      s.search-=dt;
      if(s.search<=0){s.phase='patrol';s.target=null;s.exposed=false;}
    }
    if(s.phase==='patrol'&&!s.target){
      s.target=copy(PATROL[s.patrolIndex%PATROL.length]);s.patrolIndex++;
    }
    const target=s.phase==='chase'?copy(p):s.target;
    if(target){
      s.repath-=dt;
      if(s.repath<=0||!s.path.length){
        s.path=route(s,target,passable);
        s.repath=s.phase==='chase'?.62:1.15;
      }
      if(s.path.length){
        const node=s.path[0],dx=node.x-s.x,dz=node.z-s.z,len=Math.hypot(dx,dz);
        const speed=s.phase==='chase'?3.45:s.phase==='investigate'?2.5:1.65;
        const length=Math.min(len,speed*dt);
        if(len>.001&&lineClear(s,{x:s.x+dx/len*length,z:s.z+dz/len*length},passable)){
          s.x+=dx/len*length;s.z+=dz/len*length;s.heading=Math.atan2(dx,dz);
        }
        if(DIST(s,node)<.21)s.path.shift();
      }
      if(DIST(s,target)<.7){
        if(s.phase==='investigate'){s.phase='search';s.search=5.5;s.target=copy(target);}
        else if(s.phase==='patrol'){s.target=null;s.path=[];}
      }
    }
    // Archive is protected by its separate "look away" encounter.
    const caught=!safe&&!s.hidden&&s.grace<=0&&s.phase==='chase'&&DIST(s,p)<.92;
    return {caught,phase:s.phase,distance:DIST(s,p),heard,sight};
  }
  return Object.freeze({SHELTER,PATROL,create,reset,route,lineClear,enter,leave,beginFinal,step});
});
