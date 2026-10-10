/* Dalgona tracing simulation — pure geometry and explicit clock, reusable in tests. */
(function(root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.DalgonaTrace=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const SIZE=400, TAU=Math.PI*2;
  const SHAPES=[
    {id:'circle',name:'동그라미',description:'부드럽게 한 바퀴',label:'첫 달고나'},
    {id:'triangle',name:'세모',description:'세 꼭짓점에서 천천히 꺾어요',label:'뾰족한 도전'},
    {id:'star',name:'별',description:'날카로운 꼭짓점을 조심해요',label:'별 따기'},
    {id:'heart',name:'하트',description:'굴곡을 따라 살금살금',label:'사랑의 달고나'},
    {id:'flower',name:'꽃',description:'작은 굴곡들이 이어져요',label:'꽃잎 장인'},
    {id:'umbrella',name:'우산',description:'아치와 물결을 완성해요',label:'마지막 과제'}
  ];
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  function shapePath(id,stage=1){
    const pts=[], add=(x,y)=>pts.push({x,y});
    if(id==='circle'){
      for(let i=0;i<=360;i++) {const a=-Math.PI/2+TAU*i/360;add(200+121*Math.cos(a),205+121*Math.sin(a));}
    }else if(id==='triangle'){
      add(200,74);add(326,294);add(74,294);add(200,74);
    }else if(id==='star'){
      for(let i=0;i<=10;i++){const a=-Math.PI/2+Math.PI*i/5,r=i%2?55:129;add(200+r*Math.cos(a),205+r*Math.sin(a));}
    }else if(id==='heart'){
      for(let i=0;i<=400;i++){
        const t=TAU*i/400;
        add(200+8.1*16*Math.pow(Math.sin(t),3),191-8.3*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)));
      }
    }else if(id==='flower'){
      const petals=stage>=11?7:6;
      for(let i=0;i<=600;i++){
        const t=-Math.PI/2+TAU*i/600,r=100+22*Math.cos(petals*(t+Math.PI/2));
        add(200+r*Math.cos(t),205+r*Math.sin(t));
      }
    }else if(id==='umbrella'){
      for(let i=0;i<=240;i++){
        const t=Math.PI- Math.PI*i/240;add(200+120*Math.cos(t),221-120*Math.sin(t));
      }
      // Return along a wavy scalloped hem; close the outline.
      for(let i=0;i<=240;i++){
        const t=i/240,x=320-240*t;
        add(x,221+17*Math.abs(Math.sin(4*Math.PI*t)));
      }
    }else throw new Error('Unknown dalgona shape: '+id);
    return pts;
  }
  function buildTrace(stage=1){
    stage=Math.max(1,Math.floor(Number(stage)||1));
    const shape=SHAPES[(stage-1)%SHAPES.length],raw=shapePath(shape.id,stage);
    // Resample evenly by arc length so pointer sampling does not favor one curve.
    const cumulative=[0];
    for(let i=1;i<raw.length;i++)cumulative.push(cumulative[i-1]+length(raw[i-1],raw[i]));
    const total=cumulative[cumulative.length-1],spacing=2.5;
    const pts=[];
    let index=0;
    for(let distance=0;distance<total;distance+=spacing){
      while(index+1<cumulative.length-1&&cumulative[index+1]<distance)index++;
      const span=cumulative[index+1]-cumulative[index]||1,t=clamp((distance-cumulative[index])/span,0,1);
      pts.push({x:raw[index].x+(raw[index+1].x-raw[index].x)*t,y:raw[index].y+(raw[index+1].y-raw[index].y)*t,distance});
    }
    pts.push({x:raw.at(-1).x,y:raw.at(-1).y,distance:total});
    const cycle=Math.floor((stage-1)/6);
    return {
      stage,shape:shape.id,name:shape.name,description:shape.description,label:shape.label,
      path:pts,total,viewSize:SIZE,
      tolerance:Math.max(8,15-cycle*1.4),minSpeed:Math.min(72,43+cycle*4),
      maxSpeed:Math.max(165,225-cycle*8),
      timeLimitMs:Math.min(85000,55000+Math.max(0,stage-1)*4000)
    };
  }
  function createState(trace){
    return {active:false,startedAt:null,lastMs:null,lastTickMs:null,lastMotionMs:null,lastPoint:null,
      progress:0,crack:0,stuck:0,speed:0,good:0,readings:0,offPath:0,releases:0,
      complete:false,failed:false,reason:'',elapsedMs:0};
  }
  function sampleAt(trace,distance){
    const pos=clamp(distance,0,trace.total);
    const index=clamp(Math.floor(pos/2.5),0,trace.path.length-2);
    const a=trace.path[index],b=trace.path[index+1],t=clamp((pos-a.distance)/(b.distance-a.distance||1),0,1);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  function nearest(trace,point,progress,range=45){
    // Only check the upcoming segment: crossing over an earlier path is not a shortcut.
    let best={distance:Infinity,progress};
    const min=clamp(Math.floor((progress-5)/2.5),0,trace.path.length-2);
    const max=clamp(Math.ceil((progress+range)/2.5),min,trace.path.length-2);
    for(let i=min;i<=max;i++){
      const a=trace.path[i],b=trace.path[i+1],vx=b.x-a.x,vy=b.y-a.y,len2=vx*vx+vy*vy;
      const t=clamp(((point.x-a.x)*vx+(point.y-a.y)*vy)/(len2||1),0,1);
      const px=a.x+vx*t,py=a.y+vy*t;
      const d=Math.hypot(point.x-px,point.y-py);
      if(d<best.distance)best={distance:d,progress:a.distance+(b.distance-a.distance)*t};
    }
    return best;
  }
  function status(s){
    if(s.crack>=100) {s.failed=true;s.active=false;s.reason='금이 가서 부서졌어요';}
    if(s.stuck>=100) {s.failed=true;s.active=false;s.reason='너무 천천히 움직였어요';}
    return s;
  }
  function begin(trace,state,point,now){
    const s={...state},expected=sampleAt(trace,s.progress);
    if(s.complete||s.failed||length(expected,point)>trace.tolerance+12)return {accepted:false,state:s};
    if(s.startedAt===null) s.startedAt=now;
    s.active=true;s.lastPoint={...point};s.lastMs=now;s.lastTickMs=now;s.lastMotionMs=now;
    return {accepted:true,state:s};
  }
  function tick(trace,state,now){
    const s={...state};
    if(s.startedAt===null||s.complete||s.failed)return s;
    const elapsed=Math.max(0,now-s.startedAt);
    s.elapsedMs=elapsed;
    if(elapsed>=trace.timeLimitMs){s.failed=true;s.active=false;s.reason='시간이 다 됐어요';return s;}
    const dt=clamp(now-(s.lastTickMs??now),0,1000)/1000;
    if(now-(s.lastMotionMs??now)>850){
      s.stuck+=dt*(s.active?31:20);
    }
    s.lastTickMs=now;
    return status(s);
  }
  function move(trace,state,point,now){
    let s=tick(trace,state,now);
    if(!s.active||s.failed||s.complete)return s;
    const prev=s.lastPoint||point;
    const traveled=length(prev,point),dt=Math.max(8,now-(s.lastMs??now));
    const instantSpeed=traveled*1000/dt;
    s.speed=s.readings===0?instantSpeed:s.speed*.55+instantSpeed*.45;
    s.lastMs=now;
    s.lastPoint={...point};
    if(traveled<.5)return s;
    s.lastMotionMs=now;
    const next=nearest(trace,point,s.progress,Math.min(90,Math.max(28,traveled+18)));
    if(instantSpeed>trace.maxSpeed){
      // A speed violation costs crack even when direction/accuracy is perfect.
      s.crack+=Math.min(22,2.2+(instantSpeed-trace.maxSpeed)*.029);
    }else if(instantSpeed<trace.minSpeed){
      s.stuck+=Math.min(8,.4+(trace.minSpeed-instantSpeed)*.033);
    }else {
      s.stuck=Math.max(0,s.stuck-1.6);
    }
    const excess=Math.max(0,next.distance-trace.tolerance);
    if(excess>0){
      s.crack+=Math.min(32,2.2+excess*.75);
      s.offPath++;
    }else{
      s.progress=Math.max(s.progress,next.progress);
      s.good+=Math.max(0,1-next.distance/Math.max(1,trace.tolerance));
      s.readings++;
    }
    s=status(s);
    if(!s.failed && s.progress>=trace.total-6 && length(point,trace.path.at(-1))<=trace.tolerance+2){
      s.complete=true;s.active=false;
    }
    return s;
  }
  function release(trace,state,now){
    const s=tick(trace,state,now);
    if(!s.active||s.failed||s.complete)return s;
    s.active=false;s.releases++;
    s.crack=Math.min(100,s.crack+7);
    return status(s);
  }
  function grade(trace,state){
    const accuracy=state.readings>0?state.good/state.readings:0;
    const score=Math.max(0,Math.round((accuracy*.6+(1-state.crack/100)*.25+(1-state.stuck/100)*.15)*100));
    return {score,stars:score>=85?3:score>=65?2:1,
      accuracy:Math.round(accuracy*100),timeLeft:Math.max(0,trace.timeLimitMs-state.elapsedMs)};
  }
  return Object.freeze({SIZE,SHAPES,shapePath,buildTrace,createState,sampleAt,nearest,begin,tick,move,release,grade});
});
