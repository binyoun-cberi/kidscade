(function(root){
'use strict';
var S=root.SeedFCSim;
if(!S)return;

var FIELD_W=1500,FIELD_H=840,GOAL_HALF=125,GOAL_Y1=FIELD_H/2-GOAL_HALF,GOAL_Y2=FIELD_H/2+GOAL_HALF;
var PLAYER_R=24,BALL_R=10,GRAVITY=980,BALL_DRAG=.985;
var CHARACTER_ROOT='../../assets/game/characters/people/kenney-platformer-characters/';
var BALL_SRC='../../assets/game/2d/sports/equipment/ball_soccer1.png';
var FORMATION_COORDS={
  '1-2-1':[[.07,.50],[.31,.50],[.52,.23],[.52,.77],[.79,.50]],
  '2-2':[[.07,.50],[.32,.31],[.32,.69],[.67,.29],[.67,.71]],
  '3-1':[[.07,.50],[.28,.50],[.38,.22],[.38,.78],[.77,.50]],
  '4-0':[[.07,.50],[.47,.20],[.44,.40],[.44,.60],[.47,.80]]
};
var active=null,keys={},touch={up:false,down:false,left:false,right:false,sprint:false,jockey:false};

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function hypot(x,y){return Math.hypot(x,y);}
function norm(x,y){var l=hypot(x,y)||1;return{x:x/l,y:y/l};}
function hash(s){s=String(s||'');var h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function teamDir(side){return side===0?1:-1;}
function ownGoalX(side){return side===0?0:FIELD_W;}
function oppGoalX(side){return side===0?FIELD_W:0;}
function stat(p,k){return Number(p&&p.stats&&p.stats[k]||50);}
function role(p){return p&&p.footballRole||'balanced';}
function display(a){return a&&a.p?a.p.name:'선수';}
function round(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function dist(a,b){return hypot(a.x-b.x,a.y-b.y);}
function between(v,a,b){return v>=Math.min(a,b)&&v<=Math.max(a,b);}

function tendencies(p){
  var maps={
    playmaker:{pass:96,through:86,dribble:28,cross:22,shoot:36,tackle:38,press:45,forward:32,roam:78,hold:58,risk:68},
    creator:{pass:82,through:84,dribble:74,cross:54,shoot:59,tackle:30,press:42,forward:63,roam:91,hold:28,risk:86},
    explorer:{pass:64,through:58,dribble:80,cross:94,shoot:52,tackle:46,press:55,forward:91,roam:82,hold:18,risk:75},
    finisher:{pass:40,through:28,dribble:62,cross:18,shoot:98,tackle:24,press:62,forward:99,roam:55,hold:8,risk:72},
    anchor:{pass:70,through:34,dribble:24,cross:25,shoot:25,tackle:96,press:62,forward:12,roam:15,hold:99,risk:22},
    commander:{pass:62,through:44,dribble:38,cross:34,shoot:48,tackle:90,press:96,forward:55,roam:40,hold:70,risk:45},
    support:{pass:86,through:66,dribble:42,cross:55,shoot:38,tackle:59,press:70,forward:44,roam:60,hold:65,risk:45},
    balanced:{pass:68,through:55,dribble:55,cross:50,shoot:58,tackle:55,press:58,forward:55,roam:50,hold:50,risk:50}
  };
  var t=Object.assign({},maps[role(p)]||maps.balanced);
  t.pass=clamp(t.pass+(stat(p,'pass')-70)*.45,5,100);
  t.through=clamp(t.through+(stat(p,'pass')-70)*.35,5,100);
  t.cross=clamp(t.cross+(stat(p,'pass')-70)*.35,5,100);
  t.shoot=clamp(t.shoot+(stat(p,'shot')-70)*.45,5,100);
  t.tackle=clamp(t.tackle+(stat(p,'defense')-70)*.45,5,100);
  t.dribble=clamp(t.dribble+(stat(p,'speed')-70)*.25,5,100);
  return t;
}
function actorSpeed(a,sprint){var base=175+stat(a.p,'speed')*1.05;return base*(sprint?1.20:1)*(0.72+0.28*a.energy/100);}
function teamColor(t,side){return t.club&&t.club.accent?t.club.accent:(side===0?'#22c55e':'#3b82f6');}

function create(opts){
  var userSide=Number(opts.userSide||0);
  var homeAssign=S.assignSlots(opts.homeRoster,opts.homeLineup,opts.homeFormation,opts.formations);
  var awayAssign=S.assignSlots(opts.awayRoster,opts.awayLineup,opts.awayFormation,opts.formations);

  function makeActors(assign,side,formation){
    var coords=FORMATION_COORDS[formation]||FORMATION_COORDS['1-2-1'];
    return assign.map(function(a,i){
      var c=coords[i]||[.5,.5],x=side===0?c[0]*FIELD_W:(1-c[0])*FIELD_W,y=c[1]*FIELD_H;
      return {id:a.player.id,p:a.player,slot:a.slot,side:side,x:x,y:y,vx:0,vy:0,baseX:x,baseY:y,energy:100,instruction:'auto',decision:.05+(hash(a.player.id)%120)/1000,tackleCooldown:0,tackleTimer:0,kickTimer:0,recover:0,protect:0,trail:[],tend:tendencies(a.player),sprite:null};
    });
  }
  var teams=[
    {club:opts.homeClub,actors:makeActors(homeAssign,0,opts.homeFormation),assign:homeAssign,formation:opts.homeFormation,tactics:Object.assign({},opts.homeTactics||{})},
    {club:opts.awayClub,actors:makeActors(awayAssign,1,opts.awayFormation),assign:awayAssign,formation:opts.awayFormation,tactics:Object.assign({},opts.awayTactics||{})}
  ];
  var stats={},heat={},allActors=teams[0].actors.concat(teams[1].actors);
  allActors.forEach(function(a){stats[a.id]={touches:0,shots:0,goals:0,saves:0,distance:0,xg:0,passesAttempted:0,passesCompleted:0,progressivePasses:0,keyPasses:0,assists:0,tackles:0,crosses:0};heat[a.id]=Array(60).fill(0);});

  var m={
    isPhysicalFutsal:true,minute:0,score:[0,0],teams:teams,userSide:userSide,finished:false,events:[],effects:[],passVisuals:[],
    possession:0,ball:{x:FIELD_W/2,y:FIELD_H/2,z:0,vx:0,vy:0,vz:0,owner:null,trail:[]},
    userSubs:0,controlled:null,lastTouchId:null,replay:{step:.75,next:0,frames:[],heat:heat,stats:stats,tacticChanges:[]},
    seed:opts.seed||null
  };
  var pendingPass=null,lastCompletedPass=null,ballFree=0,restart=0,lastNow=performance.now(),camera=FIELD_W/2;
  var ballImg=new Image();ballImg.src=BALL_SRC;
  var spriteCache={};

  m.replay.tacticChanges.push({minute:0,side:0,source:'start',tactics:Object.assign({},teams[0].tactics)});
  m.replay.tacticChanges.push({minute:0,side:1,source:'start',tactics:Object.assign({},teams[1].tactics)});

  function actorById(id){for(var s=0;s<2;s++){var a=teams[s].actors.find(function(x){return x.id===id;});if(a)return a;}return null;}
  function emit(type,text,side,a,extra){
    var e=Object.assign({minute:Math.max(1,Math.min(90,Math.floor(m.minute))),type:type,text:text,side:side,actor:a?a.p:null,actorId:a?a.id:null,x:a?Math.round(a.x/FIELD_W*1000)/10:null,y:a?Math.round(a.y/FIELD_H*1000)/10:null},extra||{});
    m.events.push(e);if(opts.onEvent)opts.onEvent(e);
    if(a){a.kickTimer=type==='shot'||type==='goal'||type==='pass'||type==='cross'?.18:a.kickTimer;m.lastTouchId=a.id;}
    return e;
  }
  function touchActor(a){if(!a)return;m.lastTouchId=a.id;var st=stats[a.id];if(st)st.touches++;}
  function resetPositions(){
    teams.forEach(function(t,side){var coords=FORMATION_COORDS[t.formation]||FORMATION_COORDS['1-2-1'];t.actors.forEach(function(a,i){var c=coords[i]||[.5,.5];a.baseX=side===0?c[0]*FIELD_W:(1-c[0])*FIELD_W;a.baseY=c[1]*FIELD_H;a.x=a.baseX;a.y=a.baseY;a.vx=0;a.vy=0;});});
  }
  function kickoff(side){
    resetPositions();m.possession=side;m.ball.x=FIELD_W/2;m.ball.y=FIELD_H/2;m.ball.z=0;m.ball.vx=m.ball.vy=m.ball.vz=0;
    var k=teams[side].actors.find(function(a){return a.slot==='ST';})||teams[side].actors.find(function(a){return a.slot!=='GK';})||teams[side].actors[0];
    m.ball.owner=k;touchActor(k);ballFree=.35;if(side===userSide)chooseControl(k);
  }
  function recordFrame(){
    var flat=[];teams.forEach(function(t){t.actors.forEach(function(a){flat.push([a.id,Math.round(a.x/FIELD_W*1000)/10,Math.round(a.y/FIELD_H*1000)/10,Math.round(a.energy)]);var hx=clamp(Math.floor(a.x/FIELD_W*10),0,9),hy=clamp(Math.floor(a.y/FIELD_H*6),0,5);heat[a.id][hy*10+hx]++;});});
    m.replay.frames.push([Math.round(m.minute*10)/10,Math.round(m.ball.x/FIELD_W*1000)/10,Math.round(m.ball.y/FIELD_H*1000)/10,m.ball.owner?m.ball.owner.id:null,m.score[0],m.score[1],flat]);
  }
  function outfield(side){return teams[side].actors.filter(function(a){return a.slot!=='GK';});}
  function nearest(list,target){var best=null,bd=1e9;list.forEach(function(a){var d=dist(a,target);if(d<bd){bd=d;best=a;}});return best;}
  function nearestOpponentDistance(a){var o=nearest(teams[1-a.side].actors,a);return o?dist(a,o):999;}
  function chooseControl(preferred){
    if(preferred&&preferred.side===userSide&&preferred.slot!=='GK'){m.controlled=preferred;return preferred;}
    var list=outfield(userSide),target=m.ball.owner&&m.ball.owner.side!==userSide?m.ball.owner:m.ball;
    m.controlled=nearest(list,target)||list[0]||teams[userSide].actors[0];return m.controlled;
  }
  function cycleControl(){
    var list=outfield(userSide);if(!list.length)return;var i=list.indexOf(m.controlled);m.controlled=list[(i+1+list.length)%list.length];
  }
  function givePossession(a){
    if(!a)return;m.ball.owner=a;m.ball.x=a.x;m.ball.y=a.y;m.ball.z=0;m.ball.vx=a.vx;m.ball.vy=a.vy;m.ball.vz=0;m.possession=a.side;touchActor(a);a.protect=.3;
    if(pendingPass){
      if(a.side===pendingPass.side&&(!pendingPass.receiver||a.id===pendingPass.receiver.id)){
        pendingPass.event.completed=true;stats[pendingPass.passer.id].passesCompleted++;
        var dir=teamDir(a.side),prog=(a.x-pendingPass.passer.x)*dir;if(prog>120){pendingPass.event.progressive=true;stats[pendingPass.passer.id].progressivePasses++;}
        lastCompletedPass={event:pendingPass.event,passer:pendingPass.passer,receiver:a,age:0};
      }
      pendingPass=null;
    }
    if(a.side===userSide&&a.slot!=='GK'&&(!m.controlled||m.ball.owner===a))chooseControl(a);
    if(a.side!==userSide&&m.controlled&&dist(m.controlled,a)>330)chooseControl();
  }
  function passTarget(p,kind){
    var dir=teamDir(p.side),aim={x:dir,y:0};
    if(p===m.controlled){
      var ix=(keys.ArrowUp||touch.up?1:0)-(keys.ArrowDown||touch.down?1:0),iy=(keys.ArrowRight||touch.right?1:0)-(keys.ArrowLeft||touch.left?1:0);
      if(ix||iy)aim=norm(ix*dir,iy);
    }
    var list=outfield(p.side).filter(function(a){return a!==p;}),best=null,bs=-1e9;
    list.forEach(function(a){
      var dx=a.x-p.x,dy=a.y-p.y,d=hypot(dx,dy),n=norm(dx,dy),align=n.x*aim.x+n.y*aim.y,progress=dx*dir,open=clamp(nearestOpponentDistance(a)/210,0,1);
      var score=align*90+progress*.15+open*45-d*.035+a.tend.forward*.16;
      if(kind==='through')score+=progress*.22+a.tend.forward*.25;
      if(kind==='cross')score+=(a.slot==='ST'?70:0)+Math.abs(a.y-FIELD_H/2)<220?15:0;
      if(role(a.p)==='finisher')score+=kind==='cross'||kind==='through'?35:10;
      if(score>bs){bs=score;best=a;}
    });
    return best;
  }
  function kickBall(p,target,speed,vz,kind,receiver){
    var d=norm(target.x-p.x,target.y-p.y);m.ball.owner=null;m.ball.x=p.x+d.x*30;m.ball.y=p.y+d.y*30;m.ball.z=8;m.ball.vx=d.x*speed;m.ball.vy=d.y*speed;m.ball.vz=vz||0;ballFree=.12;p.kickTimer=.18;m.lastTouchId=p.id;
    if(kind==='pass'||kind==='through'||kind==='cross'){
      var st=stats[p.id];st.passesAttempted++;if(kind==='cross')st.crosses++;
      var ev=emit(kind==='cross'?'cross':'pass',kind==='cross'?display(p)+'의 크로스!':display(p)+'의 패스',p.side,p,{toId:receiver&&receiver.id,toX:receiver?Math.round(receiver.x/FIELD_W*1000)/10:null,toY:receiver?Math.round(receiver.y/FIELD_H*1000)/10:null,completed:false,progressive:false,keyPass:false,assist:false});
      pendingPass={side:p.side,passer:p,receiver:receiver,event:ev,life:2.6};
      m.passVisuals.push({x:ev.x,y:ev.y,toX:ev.toX,toY:ev.toY,side:p.side,completed:true,progressive:kind==='through',life:.6});
    }else pendingPass=null;
  }
  function doPass(p,kind){
    if(!p||m.ball.owner!==p)return false;var rec=passTarget(p,kind),dir=teamDir(p.side),target;
    if(rec){target={x:rec.x+(kind==='through'?dir*(100+rec.tend.forward):0),y:rec.y};}
    else target={x:p.x+dir*420,y:p.y};
    target.x=clamp(target.x,10,FIELD_W-10);target.y=clamp(target.y,20,FIELD_H-20);
    var speed=kind==='through'?720:kind==='cross'?635:570,vz=kind==='cross'?310:kind==='through'?35:10;
    kickBall(p,target,speed,vz,kind,rec);
    if(p.side===userSide&&rec&&rec.slot!=='GK')chooseControl(rec);
    return true;
  }
  function shoot(p){
    if(!p||m.ball.owner!==p)return false;var goalX=oppGoalX(p.side),err=(50-stat(p.p,'shot'))*2.2+(Math.random()-.5)*110,targetY=clamp(FIELD_H/2+err,GOAL_Y1+12,GOAL_Y2-12),distance=Math.abs(goalX-p.x);
    var xg=clamp(.42-distance/FIELD_W*.34+(stat(p.p,'shot')-70)/260,.06,.48),st=stats[p.id];st.shots++;st.xg+=xg;
    kickBall(p,{x:goalX+teamDir(p.side)*30,y:targetY},850+stat(p.p,'shot')*2.6,65+Math.random()*85,'shot',null);
    emit('shot',display(p)+'의 슛!',p.side,p);return true;
  }
  function tackle(p){
    if(!p||p.tackleCooldown>0||p.recover>0)return false;var target=m.ball.owner;if(!target||target.side===p.side)return false;
    p.tackleCooldown=.68;p.tackleTimer=.22;var d=dist(p,target);if(d>58)return false;
    var chance=clamp(.40+(stat(p.p,'defense')-stat(target.p,'speed'))/180+p.tend.tackle/420+(58-d)/125,.18,.92);
    if(Math.random()<chance){target.recover=.25;p.protect=.35;givePossession(p);stats[p.id].tackles++;emit('tackle',display(p)+'이(가) 공을 빼앗았습니다!',p.side,p);return true;}
    p.recover=.30;return false;
  }
  function goal(side,shooter){
    m.score[side]++;if(shooter&&stats[shooter.id])stats[shooter.id].goals++;
    if(lastCompletedPass&&lastCompletedPass.receiver===shooter&&lastCompletedPass.passer!==shooter&&lastCompletedPass.age<3){lastCompletedPass.event.assist=true;stats[lastCompletedPass.passer.id].assists++;}
    emit('goal','골! '+display(shooter)+'의 마무리!',side,shooter);m.ball.owner=null;m.ball.vx=m.ball.vy=m.ball.vz=0;restart=1.05;pendingPass=null;
  }
  function updateKeeper(gk,dt){
    var dir=teamDir(gk.side),gx=ownGoalX(gk.side),tx=gx+dir*70,ty=clamp(m.ball.y,GOAL_Y1+24,GOAL_Y2-24),inBox=gk.side===0?m.ball.x<245:m.ball.x>FIELD_W-245;
    if(m.ball.owner===gk){gk.decision-=dt;if(gk.decision<=0){gk.decision=.4;var r=passTarget(gk,'pass')||outfield(gk.side)[0];if(r)doPass(gk,'pass');}return;}
    if(m.ball.owner&&m.ball.owner.side!==gk.side&&inBox){tx=m.ball.owner.x;ty=m.ball.owner.y;}else if(!m.ball.owner&&inBox){tx=m.ball.x;ty=m.ball.y;}
    move(gk,tx,ty,dt,false);
    if(!m.ball.owner&&ballFree<=0&&m.ball.z<75&&dist(gk,m.ball)<46){
      var speed=hypot(m.ball.vx,m.ball.vy);if(speed>510){stats[gk.id].saves++;m.ball.vx=dir*(260+Math.random()*130);m.ball.vy+=(m.ball.y-gk.y)*3.2+(Math.random()-.5)*100;m.ball.vz=Math.max(110,m.ball.vz);ballFree=.16;emit('save',display(gk)+'의 선방!',gk.side,gk);}else givePossession(gk);
    }
  }
  function move(a,tx,ty,dt,sprint){
    var dx=tx-a.x,dy=ty-a.y,n=norm(dx,dy),sp=actorSpeed(a,sprint),acc=690+stat(a.p,'speed')*3;
    a.vx+=(n.x*sp-a.vx)*Math.min(1,dt*acc/Math.max(1,sp));a.vy+=(n.y*sp-a.vy)*Math.min(1,dt*acc/Math.max(1,sp));
    if(hypot(dx,dy)<18){a.vx*=Math.pow(.15,dt);a.vy*=Math.pow(.15,dt);}
    var ox=a.x,oy=a.y;a.x=clamp(a.x+a.vx*dt,35,FIELD_W-35);a.y=clamp(a.y+a.vy*dt,28,FIELD_H-28);
    stats[a.id].distance+=hypot(a.x-ox,a.y-oy)/1000;
  }
  function baseTarget(a,attacking){
    var bx=m.ball.owner?m.ball.owner.x:m.ball.x,by=m.ball.owner?m.ball.owner.y:m.ball.y,dir=teamDir(a.side),r=role(a.p),x=a.baseX,y=a.baseY,t=a.tend;
    var team=teams[a.side],width=team.tactics.width||'normal';
    if(attacking){
      if(r==='finisher'){x=clamp(bx+dir*(220+t.forward*1.7),65,FIELD_W-65);y=lerp(FIELD_H/2,by,.18);}
      else if(r==='explorer'){x=clamp(bx+dir*(80+t.forward*.8),65,FIELD_W-65);y=a.baseY<FIELD_H/2?110:FIELD_H-110;}
      else if(r==='playmaker'){x=clamp(bx-dir*125,70,FIELD_W-70);y=lerp(FIELD_H/2,by,.50);}
      else if(r==='creator'){x=clamp(bx+dir*85,70,FIELD_W-70);y=lerp(a.baseY,by,.35)+(a.baseY<FIELD_H/2?-35:35);}
      else if(r==='anchor'){x=clamp(bx-dir*310,70,FIELD_W-70);y=lerp(FIELD_H/2,by,.20);}
      else if(r==='support'){x=clamp(bx-dir*85,70,FIELD_W-70);y=clamp(by+(a.baseY<FIELD_H/2?-130:130),80,FIELD_H-80);}
      else{x=lerp(a.baseX,bx+dir*70,.38);y=lerp(a.baseY,by,.22);}
    }else{
      var own=ownGoalX(a.side);x=lerp(a.baseX,own+dir*(r==='anchor'?300:r==='commander'?380:440),.35);y=lerp(a.baseY,by,r==='commander'?.38:.18);
    }
    if(width==='wide')y=FIELD_H/2+(y-FIELD_H/2)*1.14;if(width==='narrow')y=FIELD_H/2+(y-FIELD_H/2)*.78;
    if(a.instruction==='forward')x+=dir*130;if(a.instruction==='hold')x-=dir*130;
    return{x:clamp(x,45,FIELD_W-45),y:clamp(y,45,FIELD_H-45)};
  }
  function safePassTarget(p){var list=outfield(p.side).filter(function(a){return a!==p;});return list.sort(function(a,b){return nearestOpponentDistance(b)-nearestOpponentDistance(a);})[0]||null;}
  function aiCarrier(a,dt){
    a.decision-=dt;var dir=teamDir(a.side),goalDist=Math.abs(oppGoalX(a.side)-a.x),pressure=nearestOpponentDistance(a),wide=a.y<180||a.y>FIELD_H-180,finalThird=goalDist<FIELD_W*.43;
    if(a.decision<=0){
      a.decision=.12+Math.random()*.19;
      if(goalDist<390&&Math.random()*100<a.tend.shoot){shoot(a);return;}
      if(wide&&finalThird&&Math.random()*100<a.tend.cross){doPass(a,'cross');return;}
      if(pressure<120&&Math.random()*100<a.tend.pass){doPass(a,Math.random()*100<a.tend.through?'through':'pass');return;}
      if(Math.random()*100<a.tend.through*.22&&goalDist<760){if(doPass(a,'through'))return;}
      if((role(a.p)==='playmaker'||role(a.p)==='support'||role(a.p)==='anchor')&&Math.random()*100<a.tend.pass*.35){if(doPass(a,'pass'))return;}
    }
    var lane=(role(a.p)==='creator'?Math.sin(m.minute*.22+hash(a.id)%7)*120:0),targetY=clamp(a.y+lane+(FIELD_H/2-a.y)*(role(a.p)==='finisher'?.22:.05),45,FIELD_H-45);
    move(a,clamp(a.x+dir*(170+a.tend.dribble*1.3),45,FIELD_W-45),targetY,dt,a.tend.forward>75);
  }
  function aiPlayer(a,dt){
    if(a.slot==='GK'){updateKeeper(a,dt);return;}
    if(a.side===userSide&&a===m.controlled)return;
    if(a.recover>0)return;
    if(m.ball.owner===a){aiCarrier(a,dt);return;}
    if(!m.ball.owner){
      var chaser=nearest(outfield(a.side),m.ball);if(chaser===a&&m.ball.z<85){move(a,m.ball.x,m.ball.y,dt,true);return;}
    }
    if(m.ball.owner&&m.ball.owner.side!==a.side){
      var owner=m.ball.owner,presser=nearest(outfield(a.side),owner),shouldPress=presser===a||a.tend.press>88&&dist(a,owner)<190;
      if(shouldPress&&!(role(a.p)==='anchor'&&dist(a,owner)>145)){move(a,owner.x,owner.y,dt,a.tend.press>75);if(dist(a,owner)<54&&a.tackleCooldown<=0&&Math.random()*100<a.tend.tackle*.65)tackle(a);return;}
    }
    var target=baseTarget(a,m.ball.owner&&m.ball.owner.side===a.side);move(a,target.x,target.y,dt,a.tend.forward>88&&m.ball.owner&&m.ball.owner.side===a.side);
  }
  function userPlayer(a,dt){
    if(!a||a.recover>0)return;
    var up=(keys.ArrowUp||touch.up?1:0)-(keys.ArrowDown||touch.down?1:0),side=(keys.ArrowRight||touch.right?1:0)-(keys.ArrowLeft||touch.left?1:0);
    if(up||side){var dir=teamDir(userSide),v=norm(up*dir,side),sp=actorSpeed(a,keys.ShiftLeft||keys.ShiftRight||touch.sprint);a.vx+=(v.x*sp-a.vx)*Math.min(1,dt*7);a.vy+=(v.y*sp-a.vy)*Math.min(1,dt*7);var ox=a.x,oy=a.y;a.x=clamp(a.x+a.vx*dt,35,FIELD_W-35);a.y=clamp(a.y+a.vy*dt,28,FIELD_H-28);stats[a.id].distance+=hypot(a.x-ox,a.y-oy)/1000;}else{a.vx*=Math.pow(.04,dt);a.vy*=Math.pow(.04,dt);}
  }
  function updateOwnedBall(dt){
    var a=m.ball.owner;if(!a)return;var sp=hypot(a.vx,a.vy),lead=23+clamp(sp/300,0,1)*11,n=sp>22?norm(a.vx,a.vy):{x:teamDir(a.side),y:0};m.ball.x=lerp(m.ball.x,a.x+n.x*lead,clamp(dt*16,0,1));m.ball.y=lerp(m.ball.y,a.y+n.y*lead,clamp(dt*16,0,1));m.ball.z=0;m.ball.vx=a.vx;m.ball.vy=a.vy;m.ball.vz=0;
  }
  function gather(){
    if(ballFree>0||m.ball.owner||m.ball.z>58)return;var candidates=allActors.filter(function(a){return a.recover<=0&&dist(a,m.ball)<42;});if(!candidates.length)return;
    candidates.sort(function(a,b){var sa=dist(a,m.ball)-(pendingPass&&pendingPass.receiver===a?12:0),sb=dist(b,m.ball)-(pendingPass&&pendingPass.receiver===b?12:0);return sa-sb;});givePossession(candidates[0]);
  }
  function updateLooseBall(dt){
    m.ball.x+=m.ball.vx*dt;m.ball.y+=m.ball.vy*dt;m.ball.z+=m.ball.vz*dt;m.ball.vz-=GRAVITY*dt;var drag=Math.pow(BALL_DRAG,dt*60);m.ball.vx*=drag;m.ball.vy*=drag;
    if(m.ball.z<=0){m.ball.z=0;if(m.ball.vz<0){m.ball.vz=-m.ball.vz*.38;if(Math.abs(m.ball.vz)<45)m.ball.vz=0;}m.ball.vx*=Math.pow(.975,dt*60);m.ball.vy*=Math.pow(.975,dt*60);}
    if(m.ball.y<12){m.ball.y=12;m.ball.vy=Math.abs(m.ball.vy)*.72;}if(m.ball.y>FIELD_H-12){m.ball.y=FIELD_H-12;m.ball.vy=-Math.abs(m.ball.vy)*.72;}
    var lastShooter=actorById(m.lastTouchId);
    if(m.ball.x<=0||m.ball.x>=FIELD_W){
      var scoringSide=m.ball.x>=FIELD_W?0:1,inside=m.ball.y>=GOAL_Y1&&m.ball.y<=GOAL_Y2&&m.ball.z<150;
      if(inside){goal(scoringSide,lastShooter&&lastShooter.side===scoringSide?lastShooter:null);return;}
      m.ball.x=clamp(m.ball.x,10,FIELD_W-10);m.ball.vx*=-.55;
    }
    gather();
  }
  function separate(){
    for(var i=0;i<allActors.length;i++)for(var j=i+1;j<allActors.length;j++){var a=allActors[i],b=allActors[j],dx=b.x-a.x,dy=b.y-a.y,d=hypot(dx,dy),min=PLAYER_R*1.55;if(d>0&&d<min){var n=norm(dx,dy),push=(min-d)*.18;a.x-=n.x*push;a.y-=n.y*push;b.x+=n.x*push;b.y+=n.y*push;}}
  }
  function step(dt){
    if(restart>0){restart-=dt;if(restart<=0)kickoff(1-m.possession);return;}
    ballFree=Math.max(0,ballFree-dt);if(pendingPass){pendingPass.life-=dt;if(pendingPass.life<=0)pendingPass=null;}if(lastCompletedPass)lastCompletedPass.age+=dt;
    allActors.forEach(function(a){a.tackleCooldown=Math.max(0,a.tackleCooldown-dt);a.tackleTimer=Math.max(0,a.tackleTimer-dt);a.kickTimer=Math.max(0,a.kickTimer-dt);a.recover=Math.max(0,a.recover-dt);a.protect=Math.max(0,a.protect-dt);});
    userPlayer(m.controlled,dt);allActors.forEach(function(a){aiPlayer(a,dt);});separate();
    if(m.ball.owner)updateOwnedBall(dt);else updateLooseBall(dt);
    allActors.forEach(function(a){var fatigue=(teams[a.side].tactics.press==='press'?1.25:1)*(keys.ShiftLeft||keys.ShiftRight||touch.sprint&&a===m.controlled?1.18:1);a.energy=clamp(a.energy-dt*.22*fatigue,25,100);a.trail.push({x:a.x,y:a.y});if(a.trail.length>6)a.trail.shift();});
    m.ball.trail.push({x:m.ball.x,y:m.ball.y});if(m.ball.trail.length>12)m.ball.trail.shift();
  }

  function userAction(kind){
    if(m.finished||restart>0)return;var a=m.controlled;if(kind==='switch'){cycleControl();return;}if(!a)return;
    if(kind==='shoot'){if(m.ball.owner===a)shoot(a);else tackle(a);return;}
    if(m.ball.owner!==a)return;
    if(kind==='pass')doPass(a,'pass');else if(kind==='through')doPass(a,'through');else if(kind==='lob')doPass(a,'cross');
  }
  m.handleAction=userAction;
  m.setHold=function(name,on){touch[name]=!!on;};
  m.update=function(dt,speed){
    if(m.finished)return;var simDt=dt*(speed||1),steps=Math.max(1,Math.ceil(simDt/(1/90))),h=simDt/steps;
    for(var i=0;i<steps;i++)step(h);
    m.minute+=simDt*.52;
    while(m.minute>=m.replay.next+m.replay.step&&m.replay.frames.length<180){m.replay.next+=m.replay.step;recordFrame();}
    m.effects=m.effects.filter(function(e){e.life-=simDt*1.7;return e.life>0;});m.passVisuals=m.passVisuals.filter(function(e){e.life-=simDt*1.7;return e.life>0;});
    if(m.minute>=90){m.minute=90;m.finished=true;recordFrame();emit('end','경기 종료!',-1,null);allActors.forEach(function(a){a.p.fitness=clamp(Math.round((a.p.fitness==null?100:a.p.fitness)-(100-a.energy)*.28-3),45,100);});if(opts.onFinish)opts.onFinish(m);}
  };
  m.setTactics=function(side,t,source){teams[side].tactics=Object.assign({},teams[side].tactics,t||{});m.replay.tacticChanges.push({minute:Math.floor(m.minute),side:side,source:source||'manual',tactics:Object.assign({},teams[side].tactics)});return teams[side].tactics;};
  m.getActors=function(side){return teams[side].actors.map(function(a){return{id:a.id,p:a.p,slot:a.slot,energy:a.energy,instruction:a.instruction};});};
  m.setInstruction=function(side,id,instruction){var a=actorById(id);if(!a||a.side!==side)return false;a.instruction=instruction;emit('coach',a.p.name+'에게 개인 지시를 전달했습니다.',side,a);return true;};
  m.substitute=function(side,outId,inPlayer){
    var t=teams[side],idx=t.actors.findIndex(function(a){return a.id===outId;});if(idx<0||!inPlayer)return false;var old=t.actors[idx],fresh={id:inPlayer.id,p:inPlayer,slot:old.slot,side:side,x:old.x,y:old.y,vx:0,vy:0,baseX:old.baseX,baseY:old.baseY,energy:100,instruction:'auto',decision:.1,tackleCooldown:0,tackleTimer:0,kickTimer:0,recover:0,protect:0,trail:[],tend:tendencies(inPlayer),sprite:null};t.actors[idx]=fresh;allActors=teams[0].actors.concat(teams[1].actors);stats[fresh.id]=stats[fresh.id]||{touches:0,shots:0,goals:0,saves:0,distance:0,xg:0,passesAttempted:0,passesCompleted:0,progressivePasses:0,keyPasses:0,assists:0,tackles:0,crosses:0};heat[fresh.id]=heat[fresh.id]||Array(60).fill(0);if(m.ball.owner===old)givePossession(fresh);if(m.controlled===old)chooseControl(fresh);emit('sub',old.p.name+' 대신 '+inPlayer.name+'이(가) 들어갑니다.',side,fresh);return true;
  };
  m.exportReplay=function(){
    if(!m.replay.frames.length||m.replay.frames[m.replay.frames.length-1][0]<89.9)recordFrame();
    var pools=(opts.homeRoster||[]).map(function(p){return{p:p,side:0};}).concat((opts.awayRoster||[]).map(function(p){return{p:p,side:1};}));
    var players=Object.keys(stats).map(function(id){var q=pools.find(function(x){return x.p.id===id;});if(!q)return null;var p=q.p;return{id:p.id,name:p.name,pos:p.pos,side:q.side,era:p.era,memory:p.memory,footballStyle:p.footballStyle,footballRole:p.footballRole};}).filter(Boolean);
    return{homeClubId:teams[0].club.id,awayClubId:teams[1].club.id,seed:String(opts.seed||''),score:m.score.slice(),frames:m.replay.frames.slice(),heat:m.replay.heat,stats:m.replay.stats,events:m.events.slice(),players:players,tacticChanges:m.replay.tacticChanges.slice()};
  };
  m.runToEnd=function(){var guard=0;while(!m.finished&&guard<3000){m.update(.05,4);guard++;}return m;};

  function spriteSet(a){
    if(spriteCache[a.id])return spriteCache[a.id];var name=hash(a.id)%2?'player':'female',rootPath=CHARACTER_ROOT+name+'/poses/'+name+'-',set={};
    ['stand','walk1','walk2','action1','hurt'].forEach(function(pose){var im=new Image();im.src=rootPath+pose+'.png';set[pose]=im;});spriteCache[a.id]=set;return set;
  }
  function viewDepth(x){return userSide===0?FIELD_W-x:x;}
  function render(canvas){
    var ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,sidePad=Math.max(62,W*.07),pitchW=W-sidePad*2,visible=FIELD_W*.66,scaleY=(H-28)/visible,ballDepth=viewDepth(m.ball.x),attackV=m.ball.vx*teamDir(userSide),target=clamp(ballDepth+(attackV>40?-135:attackV<-40?105:0),visible/2,FIELD_W-visible/2),now=performance.now(),dt=Math.min(.05,(now-lastNow)/1000||.016);lastNow=now;camera=lerp(camera,target,Math.min(.14,dt*4.5));
    function sx(y){return sidePad+y/FIELD_H*pitchW;}function sy(x){return H*.52+(viewDepth(x)-camera)*scaleY;}
    function wx(depth){return userSide===0?FIELD_W-depth:depth;}
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#07131e';ctx.fillRect(0,0,W,H);
    var top=H*.52+(0-camera)*scaleY,bottom=H*.52+(FIELD_W-camera)*scaleY;ctx.save();ctx.beginPath();ctx.rect(sidePad,0,pitchW,H);ctx.clip();ctx.fillStyle='#2b9857';ctx.fillRect(sidePad,top,pitchW,bottom-top);
    for(var d=0;d<FIELD_W;d+=120){var y1=H*.52+(d-camera)*scaleY,y2=H*.52+(Math.min(FIELD_W,d+120)-camera)*scaleY;ctx.fillStyle=(Math.floor(d/120)%2)?'rgba(0,0,0,.035)':'rgba(255,255,255,.035)';ctx.fillRect(sidePad,y1,pitchW,y2-y1);}ctx.restore();
    ctx.strokeStyle='rgba(245,255,248,.92)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sidePad,top);ctx.lineTo(sidePad,bottom);ctx.moveTo(W-sidePad,top);ctx.lineTo(W-sidePad,bottom);ctx.stroke();
    function hline(depth){var yy=H*.52+(depth-camera)*scaleY;ctx.beginPath();ctx.moveTo(sidePad,yy);ctx.lineTo(W-sidePad,yy);ctx.stroke();}
    hline(0);hline(FIELD_W/2);hline(FIELD_W);
    var cy=H*.52+(FIELD_W/2-camera)*scaleY;ctx.beginPath();ctx.ellipse(W/2,cy,pitchW*.10,72*scaleY,0,0,Math.PI*2);ctx.stroke();
    function goalAt(depth,label,dir){var gy=H*.52+(depth-camera)*scaleY,gw=pitchW*.25,gd=42*scaleY;ctx.strokeStyle='rgba(235,245,255,.82)';ctx.strokeRect(W/2-gw/2,Math.min(gy,gy-dir*gd),gw,Math.abs(gd));if(gy>-30&&gy<H+30){ctx.fillStyle='rgba(4,17,31,.75)';round(ctx,W/2-43,gy-dir*gd-dir*27,86,20,8);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,W/2,gy-dir*gd-dir*17);}}
    goalAt(0,'상대 골대',1);goalAt(FIELD_W,'우리 골대',-1);
    ctx.fillStyle='rgba(5,15,25,.72)';ctx.fillRect(0,0,sidePad-5,H);ctx.fillRect(W-sidePad+5,0,sidePad,H);

    var list=[];teams.forEach(function(t,side){t.actors.forEach(function(a){list.push({a:a,t:t,side:side,y:sy(a.x)});});});list.sort(function(a,b){return a.y-b.y;});
    list.forEach(function(o){var a=o.a,x=sx(a.y),y=o.y;if(y<-65||y>H+70)return;var sc=clamp(.82+(y/H)*.28,.76,1.16),set=spriteSet(a),moving=hypot(a.vx,a.vy)>38,pose=a.tackleTimer>0?'hurt':a.kickTimer>0?'action1':moving?((Math.floor(now/150)+hash(a.id))%2?'walk1':'walk2'):'stand',img=set[pose],color=teamColor(o.t,o.side);
      ctx.save();ctx.fillStyle='rgba(2,8,16,.26)';ctx.beginPath();ctx.ellipse(x,y+5,18*sc,5*sc,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=color;ctx.lineWidth=a===m.controlled?4:2;ctx.beginPath();ctx.ellipse(x,y+2,24*sc,10*sc,0,0,Math.PI*2);ctx.stroke();
      if(a===m.controlled){ctx.fillStyle='#fde047';ctx.beginPath();ctx.moveTo(x,y-73*sc);ctx.lineTo(x-9,y-88*sc);ctx.lineTo(x+9,y-88*sc);ctx.closePath();ctx.fill();}
      if(img&&img.complete&&img.naturalWidth){var dh=72*sc,dw=dh*(img.naturalWidth/Math.max(1,img.naturalHeight));ctx.drawImage(img,x-dw/2,y-dh*.91,dw,dh);}else{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y-26*sc,17*sc,0,Math.PI*2);ctx.fill();}
      var label=a.p.name+' · '+(a.p.footballStyle||a.slot);ctx.font='900 '+Math.max(9,Math.round(10*sc))+'px system-ui';ctx.textAlign='center';var tw=Math.min(150,Math.max(46,ctx.measureText(label).width+10));ctx.fillStyle='rgba(3,12,22,.83)';round(ctx,x-tw/2,y+9*sc,tw,18,7);ctx.fill();ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.fillText(label,x,y+18*sc);
      if(o.side===userSide){ctx.fillStyle='rgba(3,10,18,.7)';ctx.fillRect(x-18*sc,y+31*sc,36*sc,3);ctx.fillStyle=a.energy>55?'#34d399':a.energy>35?'#facc15':'#fb7185';ctx.fillRect(x-18*sc,y+31*sc,36*sc*clamp(a.energy/100,0,1),3);}ctx.restore();
    });
    var bx=sx(m.ball.y),by=sy(m.ball.x),lift=m.ball.z*.12;ctx.save();ctx.fillStyle='rgba(2,8,16,.3)';ctx.beginPath();ctx.ellipse(bx,by+4,8,3,0,0,Math.PI*2);ctx.fill();if(ballImg.complete&&ballImg.naturalWidth)ctx.drawImage(ballImg,bx-9,by-lift-9,18,18);else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx,by-lift,8,0,Math.PI*2);ctx.fill();}ctx.restore();
    var c=m.controlled;if(c){ctx.fillStyle='rgba(5,16,28,.84)';round(ctx,18,15,245,42,11);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 13px system-ui';ctx.textAlign='left';ctx.fillText('조작 중 · '+c.p.name,30,32);ctx.font='700 10px system-ui';ctx.fillStyle='#c9d8e8';ctx.fillText((c.p.footballStyle||c.slot)+' · Q 전환 · S 패스 · D 슛/태클',30,47);}
  }
  m.render=render;

  kickoff(hash(String(opts.seed||''))%2);
  chooseControl();
  active=m;
  return m;
}

function held(name,on){touch[name]=!!on;if(active&&active.setHold)active.setHold(name,on);}
function action(name){if(active&&active.handleAction)active.handleAction(name);}
if(root.addEventListener){
  root.addEventListener('keydown',function(e){keys[e.code]=true;if(!active||active.finished)return;if(e.repeat)return;var map={KeyQ:'switch',KeyS:'pass',KeyW:'through',KeyA:'lob',KeyD:'shoot'};if(map[e.code]){e.preventDefault();action(map[e.code]);}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].indexOf(e.code)>=0)e.preventDefault();});
  root.addEventListener('keyup',function(e){keys[e.code]=false;});
}
function bindTouch(){
  if(typeof document==='undefined')return;
  document.querySelectorAll('[data-fh-hold]').forEach(function(b){var k=b.getAttribute('data-fh-hold');['pointerdown','touchstart'].forEach(function(ev){b.addEventListener(ev,function(e){e.preventDefault();held(k,true);},{passive:false});});['pointerup','pointercancel','pointerleave','touchend'].forEach(function(ev){b.addEventListener(ev,function(e){e.preventDefault();held(k,false);},{passive:false});});});
  document.querySelectorAll('[data-fh-action]').forEach(function(b){b.addEventListener('pointerdown',function(e){e.preventDefault();action(b.getAttribute('data-fh-action'));});});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindTouch);else bindTouch();}

root.SeedFutsalHistory=Object.freeze({create:create});
})(window);
