// 도시는 스스로 움직이고, 플레이어는 길을 설계합니다.
// 순수 시뮬레이션 모듈: 브라우저 DOM/외부 서비스 의존성 없음.
export const TOWN_TYPES = [
  {id:'home',name:'햇살마을',type:'베드타운',x:164,y:378,color:'#5b9ec2'},
  {id:'office',name:'중앙업무지구',type:'사무지구',x:915,y:354,color:'#9c7bbd'},
  {id:'factory',name:'은하산업단지',type:'공업지구',x:550,y:122,color:'#be8b64'},
  {id:'mall',name:'하늘상업지구',type:'상업지구',x:575,y:614,color:'#cc9b53'},
  {id:'farm',name:'푸른들 농업지구',type:'농업지구',x:155,y:120,color:'#92a65a'},
  {id:'tourism',name:'바람산 관광지구',type:'관광지구',x:914,y:115,color:'#55a5a1'},
  {id:'market',name:'큰별 대형마트',type:'대형마트',x:915,y:614,color:'#ce7b74'}
];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const len=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const key=p=>Math.round(p.x*10)/10+','+Math.round(p.y*10)/10;
const nodeKey=(p,level=0)=>key(p)+'@'+level;
const levelAt=(road,atStart)=>road.kind==='bridge'?1:road.kind==='ramp'?(atStart?0:1):0;
const isSurface=road=>road.kind==='ground'||!road.kind;
function circleHits(a,b,circle){
  const dx=b.x-a.x,dy=b.y-a.y,fx=a.x-circle.x,fy=a.y-circle.y;
  const A=dx*dx+dy*dy,B=2*(fx*dx+fy*dy),C=fx*fx+fy*fy-circle.radius*circle.radius;
  const disc=B*B-4*A*C;if(A<.001||disc<=0)return [];
  return [(-B-Math.sqrt(disc))/(2*A),(-B+Math.sqrt(disc))/(2*A)]
    .filter(t=>t>.00001&&t<.99999).map(t=>({t,p:mix(a,b,t)}));
}
const insideCircle=(p,c)=>len(p,c)<c.radius-.15;
const angleAround=(p,c)=>{const v=Math.atan2(p.y-c.y,p.x-c.x);return v<0?v+Math.PI*2:v;};
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
// 1일차는 월요일, 6·7일차는 주말이다. 숫자 데이터는 내부에서만 사용한다.
export function isWeekend(day=1){return ((Math.max(1,Math.floor(day))-1)%7)>=5;}
function within(h,start,end){return h>=start&&h<end;}
export function getDemandRate(from,to,hour,day=1){
  const weekend=isWeekend(day);
  const am=within(hour,7,9.5),pm=within(hour,16.5,19.5);
  const toWork=(from==='home'&&to==='office'),toHome=(from==='office'&&to==='home');
  if(toWork)return 1.22*(am?3.7:pm?.32:.72)*(weekend?.28:1);
  if(toHome)return 1.22*(pm?3.7:am?.32:.72)*(weekend?.28:1);
  if(from==='home'&&to==='factory')return .72*(within(hour,5.5,8.5)?2.6:.55)*(weekend?.55:1);
  if(from==='factory'&&to==='home')return .72*(within(hour,16,19)?2.4:.55)*(weekend?.55:1);
  if(from==='home'&&to==='mall')return .7*(within(hour,16,21)?2.0:.55)*(weekend?1.4:1);
  if(from==='mall'&&to==='home')return .7*(within(hour,17,22)?2.0:.55)*(weekend?1.4:1);

  // 농업지구: 이른 새벽 트랙터 이동과 납품 트럭. 낮에는 통행량이 적다.
  if(from==='farm'||to==='farm'){
    if(from==='farm'&&['factory','mall','market'].includes(to))
      return .56*(within(hour,4.5,8.5)?3.4:within(hour,9,14)?1.1:.15);
    if(to==='farm'&&['factory','mall','market'].includes(from))
      return .35*(within(hour,12,16)?1.5:.4);
    if(from==='home'&&to==='farm')return .5*(within(hour,5,8)?2.4:.22);
    if(to==='home'&&from==='farm')return .5*(within(hour,16,19)?2:.23);
    return .065;
  }
  // 관광지구: 평일은 소규모, 주말 오전 유입·저녁 복귀가 집중된다.
  if(from==='tourism'||to==='tourism'){
    if(to==='tourism')return .53*(weekend?3.15:.72)*(within(hour,8.5,14)?2.1:.24);
    return .53*(weekend?3.0:.68)*(within(hour,16,21)?2.25:.22);
  }
  // 대형마트: 퇴근 이후, 그리고 주말 낮에 쇼핑 차량과 배송차량이 집중된다.
  if(from==='market'||to==='market'){
    const delivery=from==='factory'||from==='farm'||to==='factory';
    if(delivery)return .43*(within(hour,5.5,11)?1.8:.3);
    const peak=weekend?within(hour,10,20):within(hour,16,21);
    return .62*(peak?(weekend?2.8:2.2):.2);
  }
  if(from==='factory'||to==='factory')return .28*(within(hour,6,18)?1.7:.32);
  return .11*(within(hour,8,21)?1.5:.35);
}
export class RoadWeaver {
  constructor(){
    this.roads=[];this.nodes=new Map();this.edges=[];this.adj=new Map();
    this.cars=[];this.oldRoads=[];this.lights=new Set();this.roundabouts=[];this.history=[];
    this.openTowns=2;this.budget=420;this.day=1;this.minutes=5*60+30;
    this.delivered=0;this.waiting=0;this.attempted=0;this.serial=0;
    this.tickTime=0;this.spawnFraction=new Map();this.pending=new Map();this.announcements=[];
    this.growthClock=0;this.dispatchClock=0;
    this.rebuild();
  }
  get towns(){return TOWN_TYPES.slice(0,this.openTowns);}
  get hour(){return this.minutes/60;}
  get peak(){const h=this.hour;return h>=7&&h<9.5?'출근':h>=16.5&&h<19.5?'퇴근':'일상';}
  snap(p,level=0){
    if(level===0)for(const t of this.towns){if(len(p,t)<82)return {x:t.x,y:t.y};}
    let best=null;
    for(const road of this.roads){
      const roadLevel=road.kind==='bridge'?1:road.kind==='ramp'?-1:0;
      if(roadLevel!==level)continue;
      for(let i=1;i<road.points.length;i++){
        const q=nearestOnSegment(p,road.points[i-1],road.points[i]);
        if(q.d<23&&(!best||q.d<best.d))best=q;
      }
    }
    return best?{x:best.x,y:best.y}:p;
  }
  addRoad(raw,lanes=2,kind='ground'){
    if(![2,4,6].includes(lanes))return {ok:false,reason:'차로 수를 선택해 주세요.'};
    if(!['ground','bridge','ramp'].includes(kind))return {ok:false,reason:'도로 종류를 확인해 주세요.'};
    if(kind==='ramp'&&lanes!==2)return {ok:false,reason:'진출입로는 2차로로 건설해 주세요.'};
    const pts=simplify(raw||[]);
    if(pts.length<2)return {ok:false,reason:'조금 더 길게 그려 주세요.'};
    pts[0]=this.snap(pts[0],kind==='bridge'?1:0);
    pts[pts.length-1]=this.snap(pts.at(-1),kind==='ground'?0:1);
    if(kind==='ramp'){
      const grounded=this.roads.some(r=>isSurface(r)&&r.points.slice(1).some((end,i)=>nearestOnSegment(pts[0],r.points[i],end).d<.25));
      const elevated=this.roads.some(r=>r.kind==='bridge'&&r.points.slice(1).some((end,i)=>nearestOnSegment(pts.at(-1),r.points[i],end).d<.25));
      if(!grounded||!elevated)return {ok:false,reason:'진출입로는 지상 도로에서 시작해 고가도로에 닿아야 해요.'};
    }
    const distance=roadLength(pts),cost=Math.ceil(costOfRoad(pts,lanes)*(kind==='bridge'?1.75:kind==='ramp'?1.4:1));
    if(distance<32)return {ok:false,reason:'도로가 너무 짧아요.'};
    if(cost>this.budget)return {ok:false,reason:'도로 자재가 부족해요.'};
    const r={id:'r'+(++this.serial),points:pts,lanes,kind};
    this.roads.push(r);this.budget-=cost;this.history.push({kind:'road',id:r.id,cost});
    this.rebuild();return {ok:true,cost};
  }
  addRoundabout(p){
    if(this.roundabouts.length>=8)return {ok:false,reason:'이 지도에는 회전교차로를 더 놓을 수 없어요.'};
    let near=null,d=38;
    for(const n of this.nodes.values()){
      if(n.level!==0)continue;
      if(this.roundabouts.some(c=>len(n,c)<c.radius+8))continue;
      if((this.adj.get(n.id)||[]).length<3)continue;
      const delta=len(p,n);if(delta<d){near=n;d=delta;}
    }
    if(!near)return {ok:false,reason:'지상 도로가 만나는 교차로를 눌러 주세요.'};
    if(this.towns.some(t=>len(t,near)<120)||this.roundabouts.some(c=>len(c,near)<120))
      return {ok:false,reason:'도시나 다른 회전교차로에서 조금 떨어진 곳을 골라 주세요.'};
    const radius=37,cost=75;
    if(this.budget<cost)return {ok:false,reason:'회전교차로 건설 자재가 부족해요.'};
    const circle={id:'o'+(++this.serial),x:near.x,y:near.y,radius};
    this.roundabouts.push(circle);this.budget-=cost;this.history.push({kind:'roundabout',id:circle.id,cost});
    this.rebuild();return {ok:true,cost};
  }
  addTrafficIsland(p){
    let nearest=null,d=55;
    for(const n of this.nodes.values()){
      if(n.level!==0||this.roundabouts.some(c=>len(c,n)<c.radius+10))continue;
      const arms=(this.adj.get(n.id)||[]).filter(x=>x.edge.kind==='ground');
      if(arms.length<3)continue;
      const delta=len(p,n);if(delta<d){nearest=n;d=delta;}
    }
    if(!nearest)return {ok:false,reason:'지상 교차로의 모퉁이를 눌러 주세요.'};
    const arms=(this.adj.get(nearest.id)||[]).filter(x=>x.edge.kind==='ground')
      .map(a=>{
        const travel=Math.min(48,a.edge.length*.65);
        const point=pointOnPath(a.edge.points,a.edge.a===nearest.id?travel:a.edge.length-travel);
        return {...a,point,angle:angleAround(point,nearest)};
      }).sort((a,b)=>a.angle-b.angle);
    const choices=[];
    for(let i=0;i<arms.length;i++){
      const from=arms[i],to=arms[(i+arms.length-1)%arms.length];
      const gap=(from.angle-to.angle+Math.PI*2)%(Math.PI*2);
      if(gap<.28||gap>2.17)continue; // 직진·급커브는 교통섬으로 만들지 않는다.
      const mx=from.point.x+to.point.x-2*nearest.x,my=from.point.y+to.point.y-2*nearest.y;
      const size=Math.hypot(mx,my)||1;
      const point={x:nearest.x+mx/size*38,y:nearest.y+my/size*38};
      choices.push({from,to,point,d:len(point,p)});
    }
    if(!choices.length)return {ok:false,reason:'우회전 전용도로를 만들 공간이 부족해요.'};
    choices.sort((a,b)=>a.d-b.d);
    const chosen=choices[0],a=chosen.from.point,b=chosen.to.point;
    if(this.roads.some(r=>r.kind==='slip'&&len(r.points[1],chosen.point)<6))
      return {ok:false,reason:'이 모퉁이에는 이미 우회전 전용도로가 있어요.'};
    const points=[{x:a.x,y:a.y},chosen.point,{x:b.x,y:b.y}];
    const cost=Math.ceil(costOfRoad(points,2)*1.3);
    if(this.budget<cost)return {ok:false,reason:'교통섬 건설 자재가 부족해요.'};
    const road={id:'r'+(++this.serial),points,lanes:2,kind:'slip'};
    this.roads.push(road);this.budget-=cost;this.history.push({kind:'road',id:road.id,cost});
    this.rebuild();return {ok:true,cost};
  }
  widenRoad(p){
    const road=this.findRoad(p,24);if(!road)return {ok:false,reason:'도로를 눌러 주세요.'};
    if(road.kind==='slip'||road.kind==='ramp')return {ok:false,reason:'이 도로는 차선을 넓힐 수 없어요.'};
    if(road.lanes>=6)return {ok:false,reason:'이미 가장 넓은 도로예요.'};
    const lanes=road.lanes+2;
    const factor=road.kind==='bridge'?1.75:1;
    const cost=Math.ceil(costOfRoad(road.points,lanes)*factor)-Math.ceil(costOfRoad(road.points,road.lanes)*factor);
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
      if(n.level!==0||this.roundabouts.some(c=>len(n,c)<c.radius+8))continue;
      if(count<3)continue;
      const near=len(p,n);if(near<d){d=near;nearest=n;}
    }
    if(!nearest)return {ok:false,reason:'교차로 가까이에서 선택해 주세요.'};
    const k=nearest.id;const enabled=!this.lights.has(k);
    if(enabled&&this.budget<20)return {ok:false,reason:'신호등 자재가 부족해요.'};
    if(enabled){this.budget-=20;this.lights.add(k);}else{this.budget+=20;this.lights.delete(k);}
    this.history.push({kind:'light',key:k,enabled});
    return {ok:true,enabled};
  }
  undo(){
    const item=this.history.pop();if(!item)return {ok:false,reason:'되돌릴 작업이 없어요.'};
    if(item.kind==='road')this.roads=this.roads.filter(r=>r.id!==item.id);
    if(item.kind==='roundabout')this.roundabouts=this.roundabouts.filter(r=>r.id!==item.id);
    if(item.kind==='widen'){const road=this.roads.find(r=>r.id===item.id);if(road)road.lanes=item.old;}
    if(item.kind==='light'){if(item.enabled)this.lights.delete(item.key);else this.lights.add(item.key);}
    this.budget+=item.kind==='light'?(item.enabled?20:-20):item.cost;
    this.rebuild();return {ok:true};
  }
  rebuild(){
    // 기존 이동 중 차량은 이전 그래프 참조를 유지하여 편집해도 순간이동하지 않는다.
    if(this.cars.length&&this.edges.length)this.oldRoads.push({edges:this.edges,cars:new Set(this.cars.map(c=>c.id))});
    const cuts=this.roads.map(r=>[{d:0,p:r.points[0]},{d:roadLength(r.points),p:r.points.at(-1)}]);
    const ports=this.roundabouts.map(()=>[]);
    const mark=(idx,d,p)=>cuts[idx].push({d,p});
    for(let i=0;i<this.roads.length;i++){
      const a=this.roads[i],aa=a.points;let da=0;
      for(let x=1;x<aa.length;x++){
        let db=0;
        for(let j=i+1;j<this.roads.length;j++){
          const b=this.roads[j],bb=b.points;db=0;
          // 램프는 도로에 닿은 끝점에서만 연결되고, 고가/지면 간 단순 교차는 연결되지 않는다.
          if((a.kind||'ground')===(b.kind||'ground')&&!['ramp','slip'].includes(a.kind)){
            for(let y=1;y<bb.length;y++){
              const hit=crossing(aa[x-1],aa[x],bb[y-1],bb[y]);
              if(hit&&!this.roundabouts.some(c=>insideCircle(hit.p,c))){
                mark(i,da+hit.t*len(aa[x-1],aa[x]),hit.p);
                mark(j,db+hit.u*len(bb[y-1],bb[y]),hit.p);
              }
              db+=len(bb[y-1],bb[y]);
            }
          }
        }
        // 지상 도로는 원형 교차로 경계에서 끊기고 안쪽은 자동차가 지나갈 수 없다.
        if(isSurface(a))for(let ci=0;ci<this.roundabouts.length;ci++){
          const circle=this.roundabouts[ci];
          for(const hit of circleHits(aa[x-1],aa[x],circle)){
            mark(i,da+hit.t*len(aa[x-1],aa[x]),hit.p);
            ports[ci].push({p:hit.p,angle:angleAround(hit.p,circle)});
          }
        }
        da+=len(aa[x-1],aa[x]);
      }
    }
    // 램프 양 끝점에서 기존 지상 도로/고가도로를 분할해 명시적인 환승 노드를 만든다.
    for(let i=0;i<this.roads.length;i++){
      const ramp=this.roads[i];if(!['ramp','slip'].includes(ramp.kind))continue;
      for(const [level,p] of [[0,ramp.points[0]],[ramp.kind==='slip'?0:1,ramp.points.at(-1)]]){
        for(let j=0;j<this.roads.length;j++){
          if(i===j)continue;
          const road=this.roads[j];
          if((road.kind==='bridge'?1:road.kind==='ground'||!road.kind?0:-1)!==level)continue;
          let d=0;
          for(let k=1;k<road.points.length;k++){
            const q=nearestOnSegment(p,road.points[k-1],road.points[k]);
            if(q.d<.16)mark(j,d+len(road.points[k-1],q),p);
            d+=len(road.points[k-1],road.points[k]);
          }
        }
      }
    }
    const nodes=new Map(),edges=[],adj=new Map();
    const addNode=(p,level=0)=>{
      const id=nodeKey(p,level);
      if(!nodes.has(id)){nodes.set(id,{id,x:p.x,y:p.y,level});adj.set(id,[]);}
      return id;
    };
    const addEdge=(id,a,b,points,lanes,kind='ground',startLevel=0,endLevel=startLevel,oneWay=false)=>{
      const n0=addNode(a,startLevel),n1=addNode(b,endLevel);
      if(n0===n1)return;
      const e={id,roadId:id.split(':')[0],a:n0,b:n1,points,length:roadLength(points),lanes,kind};
      edges.push(e);
      adj.get(n0).push({to:n1,edge:e,dir:1});
      if(!oneWay)adj.get(n1).push({to:n0,edge:e,dir:-1});
    };
    for(let i=0;i<this.roads.length;i++){
      const r=this.roads[i],marks=cuts[i].sort((a,b)=>a.d-b.d);
      for(let j=1;j<marks.length;j++){
        const a=marks[j-1],b=marks[j];
        if(b.d-a.d<.1)continue;
        const path=slicePath(r.points,a.d,b.d);
        if(isSurface(r)&&this.roundabouts.some(c=>insideCircle(pointOnPath(path,roadLength(path)/2),c)))continue;
        const start=levelAt(r,true),end=levelAt(r,false);
        // 램프의 끝점 이외에서는 높이가 바뀌지 않는다.
        const l0=r.kind==='ramp'?(j===1?0:1):start;
        const l1=r.kind==='ramp'?1:end;
        addEdge(r.id+':'+j,a.p,b.p,path,r.lanes,r.kind||'ground',l0,l1,r.kind==='slip');
      }
    }
    for(let ci=0;ci<this.roundabouts.length;ci++){
      const c=this.roundabouts[ci],all=ports[ci];
      // 빈 원형 차로에서 생길 수 있는 자기 순환을 피하기 위해 네 개의 기준점을 보존한다.
      for(let n=0;n<8;n++){
        const angle=n*Math.PI/4;
        all.push({angle,p:{x:c.x+Math.cos(angle)*c.radius,y:c.y+Math.sin(angle)*c.radius}});
      }
      all.sort((a,b)=>a.angle-b.angle);
      const unique=[];
      for(const mark of all){if(!unique.length||len(unique.at(-1).p,mark.p)>.18)unique.push(mark);}
      for(let i=0;i<unique.length;i++){
        const a=unique[i],b=unique[(i+1)%unique.length];
        const end=b.angle+(i===unique.length-1?Math.PI*2:0);
        if(end-a.angle<.00001)continue;
        const pts=[a.p];
        const steps=Math.max(2,Math.ceil((end-a.angle)/.15));
        for(let n=1;n<steps;n++){
          const theta=a.angle+(end-a.angle)*n/steps;
          pts.push({x:c.x+Math.cos(theta)*c.radius,y:c.y+Math.sin(theta)*c.radius});
        }
        pts.push(b.p);
        addEdge(c.id+':'+i,a.p,b.p,pts,2,'roundabout',0,0,true);
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
    const a=nodeKey(from,0),b=nodeKey(to,0);
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
    if(!path||!path.length)return false;
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
    // 진입 차량은 로터리 안을 먼저 달리고 있는 차에 양보한다.
    if(next.edge.kind==='roundabout'&&car.edge.kind!=='roundabout'){
      if(this.cars.some(other=>other!==car&&other.edge.kind==='roundabout'&&other.dir===1&&(
        (other.edge===next.edge&&other.s<27)||(other.edge.b===node&&other.edge.length-other.s<26)
      )))return false;
    }
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
    this.growthClock+=dt;
    if(this.growthClock>=2){
      this.growthClock=0;
      const expansions=[
        {count:3,day:2,arrivals:35,bonus:180,message:'새 공업지구가 생겼어요! 화물차를 위한 길을 만들어 보세요.'},
        {count:4,day:3,arrivals:90,bonus:200,message:'상업지구가 문을 열었어요! 퇴근 후에도 자동차가 오갑니다.'},
        {count:5,day:4,arrivals:150,bonus:170,message:'농업지구가 생겼어요! 아침 일찍 농기계와 납품차가 출발해요.'},
        {count:6,day:5,arrivals:235,bonus:190,message:'관광지구가 문을 열었어요! 주말에는 방문객이 몰려요.'},
        {count:7,day:6,arrivals:330,bonus:200,message:'대형마트가 들어섰어요! 퇴근길과 주말 쇼핑길을 살펴보세요.'}
      ];
      const next=expansions.find(x=>x.count===this.openTowns+1);
      if(next&&this.day>=next.day&&this.delivered>=next.arrivals&&this.towns.every(t=>this.route(TOWN_TYPES[0],t))){
        this.openTowns++;this.budget+=next.bonus;this.announcements.push(next.message);
      }
    }
    for(const a of this.towns)for(const b of this.towns){
      if(a===b)continue;
      const pair=a.id+'>'+b.id;
      let carry=(this.spawnFraction.get(pair)||0)+getDemandRate(a.id,b.id,this.hour,this.day)*dt*.85;
      while(carry>=1){this.pending.set(pair,Math.min(75,(this.pending.get(pair)||0)+1));carry--;}
      this.spawnFraction.set(pair,carry);
      if((this.pending.get(pair)||0)>0&&this.spawn(a.id,b.id)){
        this.pending.set(pair,this.pending.get(pair)-1);
      }
    }
    this.waiting=[...this.pending.values()].reduce((sum,n)=>sum+n,0);
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
    return {version:2,roads:this.roads.map(r=>({id:r.id,lanes:r.lanes,points:r.points,kind:r.kind||'ground'})),
      roundabouts:this.roundabouts.map(c=>({...c})),
      openTowns:this.openTowns,budget:this.budget,day:this.day,minutes:this.minutes,
      delivered:this.delivered,waiting:this.waiting,attempted:this.attempted,lights:[...this.lights],serial:this.serial,
      queues:[...this.pending].map(([pair,count])=>[pair,count])};
  }
  restore(data){
    if(!data||![1,2].includes(data.version)||!Array.isArray(data.roads))return false;
    const roads=data.roads.filter(r=>r&&[2,4,6].includes(r.lanes)&&['ground','bridge','ramp','slip',undefined].includes(r.kind)
      &&(!['ramp','slip'].includes(r.kind)||r.lanes===2)&&Array.isArray(r.points)&&r.points.length>=2&&r.points.length<350
      &&r.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1080&&p.y>=0&&p.y<=720));
    const circles=(Array.isArray(data.roundabouts)?data.roundabouts:[]).filter(c=>c&&typeof c.id==='string'
      &&Number.isFinite(c.x)&&Number.isFinite(c.y)&&Number.isFinite(c.radius)
      &&c.x>=0&&c.x<=1080&&c.y>=0&&c.y<=720&&c.radius>=15&&c.radius<=90);
    if(circles.length>8||circles.length!==(data.roundabouts||[]).length)return false;
    if(roads.length!==data.roads.length||roads.length>120)return false;
    this.roads=roads;this.roundabouts=circles;this.openTowns=clamp(Math.round(data.openTowns)||2,2,TOWN_TYPES.length);
    this.budget=clamp(data.budget||0,0,10000);this.day=clamp(data.day||1,1,9999);
    this.minutes=clamp(data.minutes||330,0,1439);this.delivered=Math.max(0,Math.round(data.delivered||0));
    this.waiting=Math.max(0,Math.round(data.waiting||0));this.attempted=Math.max(0,Math.round(data.attempted||0));
    this.serial=Math.max(0,Math.round(data.serial||0));
    this.lights=new Set(Array.isArray(data.lights)?data.lights.filter(k=>typeof k==='string').map(k=>/@[01]$/.test(k)?k:k+'@0'):[]);
    this.cars=[];this.oldRoads=[];this.history=[];this.spawnFraction.clear();
    this.pending=new Map(Array.isArray(data.queues)?data.queues.filter(row=>Array.isArray(row)&&typeof row[0]==='string'&&Number.isFinite(row[1])&&row[1]>=0&&row[1]<=75):[]);
    this.waiting=[...this.pending.values()].reduce((sum,n)=>sum+n,0);
    this.rebuild();return true;
  }
}
