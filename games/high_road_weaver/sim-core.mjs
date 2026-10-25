// 도시는 스스로 움직이고, 플레이어는 길을 설계합니다.
// 순수 시뮬레이션 모듈: 브라우저 DOM/외부 서비스 의존성 없음.
export const TOWN_TYPES = [
  {id:'home',name:'햇살마을',type:'베드타운',x:164,y:378,color:'#5b9ec2'},
  {id:'office',name:'중앙업무지구',type:'사무지구',x:915,y:354,color:'#9c7bbd'},
  {id:'factory',name:'은하산업단지',type:'공업지구',x:550,y:122,color:'#be8b64'},
  {id:'mall',name:'하늘상업지구',type:'상업지구',x:575,y:614,color:'#cc9b53'}
];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const len=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const key=p=>Math.round(p.x*10)/10+','+Math.round(p.y*10)/10;
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const roadLength=points=>points.slice(1).reduce((s,p,i)=>s+len(p,points[i]),0);
const LANE_COST={2:1,4:1.85,6:2.8};
export function costOfRoad(points,lanes=2){return Math.max(3,Math.ceil(roadLength(points)*(LANE_COST[lanes]||1)/5));}
export function pointOnPath(points,d){
  let remain=clamp(d,0,roadLength(points));
  for(let i=1;i<points.length;i++){
    const seg=len(points[i-1],points[i]);
    if(remain<=seg || i===points.length-1){
      const t=seg?clamp(remain/seg,0,1):0;
      const p=mix(points[i-1],points[i],t);
      return {...p,angle:Math.atan2(points[i].y-points[i-1].y,points[i].x-points[i-1].x)};
    }
    remain-=seg;
  }
  return {...points[0],angle:0};
}
function slicePath(points,a,b){
  const out=[pointOnPath(points,a)];let d=0;
  for(let i=1;i<points.length;i++){
    d+=len(points[i-1],points[i]);
    if(d>a+.001 && d<b-.001)out.push({...points[i]});
  }
  out.push(pointOnPath(points,b));
  return out.map(({x,y})=>({x,y}));
}
function crossing(a,b,c,d){
  const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y;
  const denom=rx*sy-ry*sx;
  if(Math.abs(denom)<.0001)return null;
  const dx=c.x-a.x,dy=c.y-a.y;
  const t=(dx*sy-dy*sx)/denom,u=(dx*ry-dy*rx)/denom;
  if(t<-.0001||t>1.0001||u<-.0001||u>1.0001)return null;
  return {t:clamp(t,0,1),u:clamp(u,0,1),p:mix(a,b,clamp(t,0,1))};
}
function nearestOnSegment(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,dd=dx*dx+dy*dy;
  const t=dd?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/dd,0,1):0;
  const q=mix(a,b,t);return {...q,d:len(p,q)};
}
function simplify(raw){
  const out=[];
  for(const p of raw){
    const q={x:clamp(Number(p.x),10,1070),y:clamp(Number(p.y),10,710)};
    if(!Number.isFinite(q.x)||!Number.isFinite(q.y))continue;
    if(!out.length||len(out[out.length-1],q)>9)out.push(q);
  }
  if(out.length>1&&len(out.at(-1),raw.at(-1))>1){
    const p=raw.at(-1);out.push({x:clamp(p.x,10,1070),y:clamp(p.y,10,710)});
  }
  return out;
}
function hourMultiplier(hour,kind){
  const am=hour>=7&&hour<9.5,pm=hour>=16.5&&hour<19.5;
  if(kind==='home>office')return am?3.7:pm?.32:.72;
  if(kind==='office>home')return pm?3.7:am?.32:.72;
  if(kind==='home>factory')return (hour>=5.5&&hour<8.5)?2.5:.62;
  if(kind==='factory>home')return (hour>=16&&hour<19)?2.5:.62;
  if(kind==='home>mall')return (hour>=16&&hour<21)?2.1:.6;
  if(kind==='mall>home')return (hour>=17&&hour<22)?2.1:.6;
  return .35;
}
export function getDemandRate(from,to,hour){
  const id=from+'>'+to;
  const base=(from==='home'&&to==='office'||from==='office'&&to==='home')?1.22:
    (from==='home'||to==='home')?.65:.18;
  return base*hourMultiplier(hour,id);
}
export class RoadWeaver {
  constructor(){
    this.roads=[];this.nodes=new Map();this.edges=[];this.adj=new Map();
    this.cars=[];this.oldRoads=[];this.lights=new Set();this.history=[];
    this.openTowns=2;this.budget=420;this.day=1;this.minutes=5*60+30;
    this.delivered=0;this.waiting=0;this.attempted=0;this.serial=0;
    this.tickTime=0;this.spawnFraction=new Map();this.announcements=[];
    this.rebuild();
  }
  get towns(){return TOWN_TYPES.slice(0,this.openTowns);}
  get hour(){return this.minutes/60;}
  get peak(){const h=this.hour;return h>=7&&h<9.5?'출근':h>=16.5&&h<19.5?'퇴근':'일상';}
  snap(p){
    for(const t of this.towns){if(len(p,t)<55)return {x:t.x,y:t.y};}
    let best=null;
    for(const road of this.roads)for(let i=1;i<road.points.length;i++){
      const q=nearestOnSegment(p,road.points[i-1],road.points[i]);
      if(q.d<23&&(!best||q.d<best.d))best=q;
    }
    return best?{x:best.x,y:best.y}:p;
  }
  addRoad(raw,lanes=2){
    if(![2,4,6].includes(lanes))return {ok:false,reason:'차로 수를 선택해 주세요.'};
    const pts=simplify(raw||[]);
    if(pts.length<2)return {ok:false,reason:'조금 더 길게 그려 주세요.'};
    pts[0]=this.snap(pts[0]);pts[pts.length-1]=this.snap(pts.at(-1));
    const distance=roadLength(pts),cost=costOfRoad(pts,lanes);
    if(distance<32)return {ok:false,reason:'도로가 너무 짧아요.'};
    if(cost>this.budget)return {ok:false,reason:'도로 자재가 부족해요.'};
    const r={id:'r'+(++this.serial),points:pts,lanes};
    this.roads.push(r);this.budget-=cost;this.history.push({kind:'road',id:r.id,cost});
    this.rebuild();return {ok:true,cost};
  }
  widenRoad(p){
    const road=this.findRoad(p,24);if(!road)return {ok:false,reason:'도로를 눌러 주세요.'};
    if(road.lanes>=6)return {ok:false,reason:'이미 가장 넓은 도로예요.'};
    const lanes=road.lanes+2;
    const cost=costOfRoad(road.points,lanes)-costOfRoad(road.points,road.lanes);
    if(cost>this.budget)return {ok:false,reason:'차로를 늘릴 자재가 부족해요.'};
    const old=road.lanes;road.lanes=lanes;this.budget-=cost;
    this.history.push({kind:'widen',id:road.id,old,cost});this.rebuild();
    return {ok:true,lanes,cost};
  }
  findRoad(p,radius=25){
    let best=null,d=radius;
    for(const road of this.roads)for(let j=1;j<road.points.length;j++){
      const q=nearestOnSegment(p,road.points[j-1],road.points[j]);
      if(q.d<d){best=road;d=q.d;}
    }
    return best;
  }
  toggleLight(p){
    let nearest=null,d=39;
    for(const n of this.nodes.values()){
      const count=(this.adj.get(n.id)||[]).length;
      if(count<3)continue;
      const near=len(p,n);if(near<d){d=near;nearest=n;}
    }
    if(!nearest)return {ok:false,reason:'교차로 가까이에서 선택해 주세요.'};
    const k=key(nearest);const enabled=!this.lights.has(k);
    if(enabled&&this.budget<20)return {ok:false,reason:'신호등 자재가 부족해요.'};
    if(enabled){this.budget-=20;this.lights.add(k);}else{this.budget+=20;this.lights.delete(k);}
    this.history.push({kind:'light',key:k,enabled});
    return {ok:true,enabled};
  }
  undo(){
    const item=this.history.pop();if(!item)return {ok:false,reason:'되돌릴 작업이 없어요.'};
    if(item.kind==='road')this.roads=this.roads.filter(r=>r.id!==item.id);
    if(item.kind==='widen'){const road=this.roads.find(r=>r.id===item.id);if(road)road.lanes=item.old;}
    if(item.kind==='light'){if(item.enabled)this.lights.delete(item.key);else this.lights.add(item.key);}
    this.budget+=item.kind==='light'?(item.enabled?20:-20):item.cost;
    this.rebuild();return {ok:true};
  }
  rebuild(){
    // 편집 이전에 운행 중이던 차량은 이전 도로망 위에서 목적지까지 이동한다.
    if(this.cars.length&&this.edges.length)this.oldRoads.push({edges:this.edges,cars:new Set(this.cars.map(c=>c.id))});
    const cuts=this.roads.map(r=>[{d:0,p:r.points[0]},{d:roadLength(r.points),p:r.points.at(-1)}]);
    for(let i=0;i<this.roads.length;i++){
      const a=this.roads[i],aa=a.points;let da=0;
      for(let x=1;x<aa.length;x++){
        let db=0;
        for(let j=i+1;j<this.roads.length;j++){
          const b=this.roads[j],bb=b.points;db=0;
          for(let y=1;y<bb.length;y++){
            const cross=crossing(aa[x-1],aa[x],bb[y-1],bb[y]);
            if(cross){
              cuts[i].push({d:da+cross.t*len(aa[x-1],aa[x]),p:cross.p});
              cuts[j].push({d:db+cross.u*len(bb[y-1],bb[y]),p:cross.p});
            }
            db+=len(bb[y-1],bb[y]);
          }
        }
        da+=len(aa[x-1],aa[x]);
      }
    }
    const nodes=new Map(),edges=[],adj=new Map();
    const addNode=p=>{const id=key(p);if(!nodes.has(id)){nodes.set(id,{id,x:p.x,y:p.y});adj.set(id,[]);}return id;};
    for(let i=0;i<this.roads.length;i++){
      const r=this.roads[i],marks=cuts[i].sort((a,b)=>a.d-b.d);
      for(let j=1;j<marks.length;j++){
        const a=marks[j-1],b=marks[j];if(b.d-a.d<.1)continue;
        const path=slicePath(r.points,a.d,b.d),n0=addNode(a.p),n1=addNode(b.p);
        if(n0===n1)continue;
        const e={id:r.id+':'+j,roadId:r.id,a:n0,b:n1,points:path,length:roadLength(path),lanes:r.lanes};
        edges.push(e);adj.get(n0).push({to:n1,edge:e,dir:1});adj.get(n1).push({to:n0,edge:e,dir:-1});
      }
    }
    this.nodes=nodes;this.edges=edges;this.adj=adj;
    this.retireEmpty();
  }
  retireEmpty(){
    const ids=new Set(this.cars.map(c=>c.id));
    this.oldRoads=this.oldRoads.filter(n=>[...n.cars].some(id=>ids.has(id)));
  }
  route(from,to){
    const a=key(from),b=key(to);
    if(!this.adj.has(a)||!this.adj.has(b))return null;
    const q=[{id:a,cost:0}],best=new Map([[a,0]]),prev=new Map();
    while(q.length){
      q.sort((x,y)=>x.cost-y.cost);const cur=q.shift();
      if(cur.cost!==best.get(cur.id))continue;
      if(cur.id===b)break;
      for(const next of this.adj.get(cur.id)||[]){
        const edge=next.edge,occupied=this.cars.filter(c=>c.edge===edge).length;
        const weight=edge.length*(1+Math.min(2,occupied/(edge.lanes/2*12)))*1.0;
        const newCost=cur.cost+weight;
        if(newCost<(best.get(next.to)??Infinity)){
          best.set(next.to,newCost);prev.set(next.to,{from:cur.id,...next});
          q.push({id:next.to,cost:newCost});
        }
      }
    }
    if(!best.has(b))return null;
    const steps=[];let node=b;
    while(node!==a){const p=prev.get(node);if(!p)return null;steps.push({edge:p.edge,dir:p.dir});node=p.from;}
    return steps.reverse();
  }
  spawn(from,to){
    const start=TOWN_TYPES.find(t=>t.id===from),end=TOWN_TYPES.find(t=>t.id===to),path=this.route(start,end);
    this.attempted++;
    if(!path||!path.length){this.waiting++;return false;}
    if(this.cars.length>=180)return false;
    const edge=path[0].edge,dir=path[0].dir;
    const same=this.cars.filter(c=>c.edge===edge&&c.dir===dir&&c.s<25);
    const lane=(this.serial++)%Math.max(1,Math.floor(edge.lanes/2));
    if(same.some(c=>c.lane===lane))return false;
    this.cars.push({id:'c'+this.serial,from,to,path,step:0,edge,dir,s:0,
      lane,speed:0,maxSpeed:42+(this.serial%6)*3,kind:this.serial%9===0?'truck':'car'});
    return true;
  }
  canGo(car){
    const next=car.path[car.step+1];if(!next)return true;
    const node=car.dir===1?car.edge.b:car.edge.a;
    if(this.lights.has(node)){
      const angle=pointOnPath(car.edge.points,car.dir===1?car.edge.length:0).angle;
      const horizontal=Math.abs(Math.cos(angle))>=Math.abs(Math.sin(angle));
      const phase=Math.floor(this.tickTime/6)%2;
      if((horizontal?0:1)!==phase)return false;
    }
    const lane=car.lane%Math.max(1,next.edge.lanes/2);
    return !this.cars.some(other=>other!==car&&other.edge===next.edge&&other.dir===next.dir&&other.lane===lane&&other.s<18);
  }
  advance(dt){
    const groups=new Map();
    for(const c of this.cars){
      const k=c.edge.id+':'+c.dir+':'+c.lane;
      if(!groups.has(k))groups.set(k,[]);
      groups.get(k).push(c);
    }
    for(const cs of groups.values()){
      cs.sort((a,b)=>b.s-a.s);
      for(let i=0;i<cs.length;i++){
        const c=cs[i],ahead=cs[i-1];
        let target=c.maxSpeed*Math.min(1,0.85+0.15*Math.max(1,c.edge.lanes/2));
        if(c.kind==='truck')target*=.73;
        if(ahead){const gap=ahead.s-c.s-19;target=Math.min(target,Math.max(0,gap*2.8));}
        const left=c.edge.length-c.s;
        if(left<23&&!this.canGo(c))target=Math.min(target,Math.max(0,(left-11)*2.3));
        c.speed=clamp(c.speed+(target>c.speed?38:-85)*dt,0,target);
        c.s+=Math.min(Math.max(0,left),c.speed*dt);
      }
    }
    const arrived=[];
    for(const c of this.cars){
      if(c.s<c.edge.length-.001)continue;
      const next=c.path[c.step+1];
      if(!next){arrived.push(c);continue;}
      if(!this.canGo(c)){c.s=c.edge.length-1;c.speed=0;continue;}
      c.step++;c.edge=next.edge;c.dir=next.dir;c.lane%=Math.max(1,Math.floor(c.edge.lanes/2));c.s=0;
    }
    if(arrived.length){const gone=new Set(arrived.map(c=>c.id));this.cars=this.cars.filter(c=>!gone.has(c.id));this.delivered+=arrived.length;}
    this.retireEmpty();
  }
  update(dt){
    dt=clamp(dt,0,.1);this.tickTime+=dt;this.minutes+=dt*12;
    if(this.minutes>=1440){this.minutes-=1440;this.day++;this.budget+=70;this.announcements.push('새로운 하루가 시작됐어요. 도로 자재 70을 받았어요.');}
    if(this.openTowns===2&&this.day>=2&&this.delivered>=35){
      this.openTowns=3;this.budget+=180;this.announcements.push('공업지구가 생겼어요! 화물차를 위한 길을 만들어 보세요.');
    }
    if(this.openTowns===3&&this.day>=3&&this.delivered>=90){
      this.openTowns=4;this.budget+=200;this.announcements.push('상업지구가 문을 열었어요! 퇴근 뒤에도 차량이 몰립니다.');
    }
    if(this.openTowns>2){
      // 새 도시가 직전에 그린 도로 위에 등장해도 기존 연결은 유지한다.
    }
    if(this.roads.length){
      for(const a of this.towns)for(const b of this.towns){
        if(a===b)continue;
        const pair=a.id+'>'+b.id;
        let carry=(this.spawnFraction.get(pair)||0)+getDemandRate(a.id,b.id,this.hour)*dt*.85;
        while(carry>=1){this.spawn(a.id,b.id);carry--;}
        this.spawnFraction.set(pair,carry);
      }
    }
    this.advance(dt);
  }
  sampleCar(c){
    const d=c.dir===1?c.s:c.edge.length-c.s;
    const p=pointOnPath(c.edge.points,d);
    const angle=p.angle+(c.dir===1?0:Math.PI);
    const count=Math.max(1,Math.floor(c.edge.lanes/2));
    const side=c.dir===1?1:-1;
    const offset=side*(5+(c.lane+.5)*10);
    return {x:p.x-Math.sin(p.angle)*offset,y:p.y+Math.cos(p.angle)*offset,angle};
  }
  snapshot(){
    return {version:1,roads:this.roads.map(r=>({id:r.id,lanes:r.lanes,points:r.points})),
      openTowns:this.openTowns,budget:this.budget,day:this.day,minutes:this.minutes,
      delivered:this.delivered,waiting:this.waiting,attempted:this.attempted,lights:[...this.lights],serial:this.serial};
  }
  restore(data){
    if(!data||data.version!==1||!Array.isArray(data.roads))return false;
    const roads=data.roads.filter(r=>r&&[2,4,6].includes(r.lanes)&&Array.isArray(r.points)&&r.points.length>=2&&r.points.length<350&&r.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
    if(roads.length!==data.roads.length||roads.length>120)return false;
    this.roads=roads;this.openTowns=clamp(Math.round(data.openTowns)||2,2,4);
    this.budget=clamp(data.budget||0,0,10000);this.day=clamp(data.day||1,1,9999);
    this.minutes=clamp(data.minutes||330,0,1439);this.delivered=Math.max(0,Math.round(data.delivered||0));
    this.waiting=Math.max(0,Math.round(data.waiting||0));this.attempted=Math.max(0,Math.round(data.attempted||0));
    this.serial=Math.max(0,Math.round(data.serial||0));this.lights=new Set(Array.isArray(data.lights)?data.lights:[]);
    this.cars=[];this.oldRoads=[];this.history=[];this.spawnFraction.clear();this.rebuild();return true;
  }
}
