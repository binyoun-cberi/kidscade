(function(){
'use strict';

function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function avg(arr){return arr.length?arr.reduce(function(a,b){return a+b;},0)/arr.length:0;}
function stat(p,k){return (p.stats&&p.stats[k])||50;}
function fitnessFactor(p){return .76+.24*clamp(p.fitness==null?100:p.fitness,0,100)/100;}
function playerScore(p,slot){
  var s=p.stats||{},fit=fitnessFactor(p),v=0;
  if(slot==='GK')v=s.defense*.55+s.pass*.15+s.stamina*.2+s.speed*.05+s.shot*.05;
  else if(slot==='CB')v=s.defense*.45+s.stamina*.2+s.pass*.16+s.speed*.11+s.shot*.08;
  else if(slot==='FB')v=s.defense*.27+s.speed*.25+s.stamina*.2+s.pass*.2+s.shot*.08;
  else if(slot==='CM')v=s.pass*.38+s.stamina*.2+s.defense*.16+s.shot*.14+s.speed*.12;
  else if(slot==='WG')v=s.speed*.28+s.shot*.28+s.pass*.24+s.stamina*.14+s.defense*.06;
  else v=s.shot*.46+s.speed*.22+s.pass*.14+s.stamina*.13+s.defense*.05;
  if(p.pos===slot)v+=7;
  return v*fit;
}
function assignSlots(roster,lineup,formation,formations){
  var selected=lineup.map(function(id){return roster.find(function(p){return p.id===id;});}).filter(Boolean);
  var used={};
  return (formations[formation]||formations['4-3-3']).map(function(slot){
    var best=null,bestScore=-1e9;
    selected.forEach(function(p){
      if(used[p.id])return;
      var sc=playerScore(p,slot);
      if(sc>bestScore){bestScore=sc;best=p;}
    });
    if(best)used[best.id]=true;
    return {slot:slot,player:best};
  }).filter(function(x){return !!x.player;});
}
var slotCoords={
  '4-4-2':[[7,50],[24,31],[24,69],[31,12],[31,88],[48,34],[48,66],[55,12],[55,88],[76,38],[76,62]],
  '4-3-3':[[7,50],[24,32],[24,68],[31,12],[31,88],[49,28],[46,50],[49,72],[70,14],[70,86],[79,50]],
  '4-2-3-1':[[7,50],[24,32],[24,68],[31,12],[31,88],[45,36],[45,64],[64,17],[62,50],[64,83],[79,50]],
  '5-3-2':[[7,50],[22,26],[20,50],[22,74],[34,10],[34,90],[49,28],[48,50],[49,72],[76,38],[76,62]]
};
function tacticsBonus(t){
  var b={attack:0,defense:0,mid:0,tempo:1,fatigue:1};
  if(t.attack==='short'){b.mid+=4;b.attack+=1;b.tempo=.93;}
  if(t.attack==='direct'){b.attack+=4;b.mid-=1;b.tempo=1.08;}
  if(t.attack==='wide'){b.attack+=2;b.mid+=1;b.tempo=1.04;}
  if(t.press==='press'){b.mid+=3;b.defense+=1;b.fatigue=1.35;}
  else{b.defense+=3;b.fatigue=.86;}
  if(t.mindset==='attack'){b.attack+=5;b.defense-=3;b.tempo*=1.08;}
  if(t.mindset==='defend'){b.defense+=5;b.attack-=3;b.tempo*=.91;}
  return b;
}
function teamRating(assignments,tactics){
  var ps=assignments.map(function(a){return a.player;}),b=tacticsBonus(tactics);
  var attack=avg(ps.map(function(p){return stat(p,'shot')*.48+stat(p,'speed')*.28+stat(p,'pass')*.24;}))+b.attack;
  var mid=avg(ps.map(function(p){return stat(p,'pass')*.48+stat(p,'stamina')*.25+stat(p,'defense')*.14+stat(p,'speed')*.13;}))+b.mid;
  var defense=avg(ps.map(function(p){return stat(p,'defense')*.55+stat(p,'stamina')*.22+stat(p,'speed')*.13+stat(p,'pass')*.10;}))+b.defense;
  return {attack:attack,mid:mid,defense:defense,bonus:b};
}
function makeActors(assignments,side,formation){
  var coords=slotCoords[formation]||slotCoords['4-3-3'];
  return assignments.map(function(a,i){
    var c=coords[i]||[50,50],x=side===0?c[0]:100-c[0],y=c[1];
    return {
      id:a.player.id,p:a.player,slot:a.slot,side:side,
      x:x,y:y,baseX:x,baseY:y,vx:0,vy:0,energy:100,
      trail:[],flash:0,pulse:0
    };
  });
}
function pick(arr,fn){
  var sum=0,weights=arr.map(function(x){var w=Math.max(.1,fn(x));sum+=w;return w;});
  var r=Math.random()*sum;
  for(var i=0;i<arr.length;i++){r-=weights[i];if(r<=0)return arr[i];}
  return arr[arr.length-1];
}
function displayName(a){return a&&a.p?a.p.name:'선수';}
function create(opts){
  var homeAssign=assignSlots(opts.homeRoster,opts.homeLineup,opts.homeFormation,opts.formations);
  var awayAssign=assignSlots(opts.awayRoster,opts.awayLineup,opts.awayFormation,opts.formations);
  var teams=[
    {club:opts.homeClub,assign:homeAssign,actors:makeActors(homeAssign,0,opts.homeFormation),tactics:opts.homeTactics,formation:opts.homeFormation},
    {club:opts.awayClub,assign:awayAssign,actors:makeActors(awayAssign,1,opts.awayFormation),tactics:opts.awayTactics,formation:opts.awayFormation}
  ];
  teams.forEach(function(t){t.rating=teamRating(t.assign,t.tactics);});
  var m={
    minute:0,score:[0,0],teams:teams,finished:false,half:false,nextEvent:.8+Math.random()*1.2,
    possession:Math.random()<.5?0:1,ball:{x:50,y:50,owner:null,trail:[]},events:[],effects:[],passVisuals:[],lastFactAt:-99,lastTouchId:null
  };
  var starters=teams[0].actors.concat(teams[1].actors);
  m.ball.owner=starters[Math.floor(Math.random()*starters.length)]||null;
  m.lastTouchId=m.ball.owner?m.ball.owner.id:null;
  if(m.ball.owner)m.ball.owner.pulse=1;

  m.replay={step:.75,next:0,frames:[],heat:{},stats:{}};
  starters.forEach(function(a){
    m.replay.heat[a.id]=Array(60).fill(0);
    m.replay.stats[a.id]={touches:0,shots:0,goals:0,saves:0,distance:0,xg:0,passesAttempted:0,passesCompleted:0,progressivePasses:0,keyPasses:0,assists:0};
  });
  function touchActor(a){
    if(!a||!a.p)return;
    m.lastTouchId=a.id;a.pulse=1;
    var st=m.replay.stats[a.id];if(st)st.touches++;
  }
  function recordReplayFrame(){
    var flat=[];
    teams.forEach(function(t){
      t.actors.forEach(function(a){
        flat.push([a.id,Math.round(a.x*10)/10,Math.round(a.y*10)/10,Math.round(a.energy)]);
        var heat=m.replay.heat[a.id];
        if(heat){
          var hx=clamp(Math.floor(a.x/100*10),0,9),hy=clamp(Math.floor(a.y/100*6),0,5);
          heat[hy*10+hx]++;
        }
      });
    });
    m.replay.frames.push([
      Math.round(m.minute*10)/10,
      Math.round(m.ball.x*10)/10,Math.round(m.ball.y*10)/10,
      m.ball.owner?m.ball.owner.id:null,m.score[0],m.score[1],flat
    ]);
  }
  recordReplayFrame();


  function emit(type,text,side,actor){
    var e={minute:Math.min(90,Math.max(1,Math.floor(m.minute))),type:type,text:text,side:side,actor:actor&&actor.p?actor.p:null,x:actor&&actor.p?Math.round(actor.x*10)/10:null,y:actor&&actor.p?Math.round(actor.y*10)/10:null};
    m.events.push(e);if(opts.onEvent)opts.onEvent(e);
    if(actor&&actor.p){
      actor.flash=1;actor.pulse=1;m.lastTouchId=actor.id;
      m.effects.push({kind:type,x:actor.x,y:actor.y,side:side,life:1});
    }
    if(actor&&actor.p&&actor.p.historical&&m.minute-m.lastFactAt>8&&Math.random()<.46){
      m.lastFactAt=m.minute;
      var f={minute:e.minute,type:'fact',text:actor.p.name+' · '+actor.p.memory,side:side,actor:actor.p};
      m.events.push(f);if(opts.onEvent)opts.onEvent(f);
    }
  }
  function recordPass(side,from,to,completed){
    var fs=m.replay.stats[from.id],dir=side===0?1:-1;
    var progress=(to.x-from.x)*dir;
    if(fs){
      fs.passesAttempted++;
      if(completed){fs.passesCompleted++;if(progress>=7)fs.progressivePasses++;}
    }
    var e={
      minute:Math.min(90,Math.max(1,Math.floor(m.minute))),type:'pass',side:side,
      actor:from.p,actorId:from.id,toId:to.id,
      x:Math.round(from.x*10)/10,y:Math.round(from.y*10)/10,
      toX:Math.round(to.x*10)/10,toY:Math.round(to.y*10)/10,
      completed:!!completed,progressive:!!(completed&&progress>=7),keyPass:false,assist:false
    };
    m.events.push(e);
    m.passVisuals.push({x:e.x,y:e.y,toX:e.toX,toY:e.toY,side:side,completed:!!completed,progressive:e.progressive,life:1});
    if(completed){m.ball.owner=to;touchActor(to);}
    return e;
  }
  function chooseReceiver(team,from){
    var candidates=team.actors.filter(function(x){return x.id!==from.id;});
    return pick(candidates,function(x){
      var dir=team===teams[0]?1:-1,advance=(x.x-from.x)*dir;
      var distance=Math.hypot(x.x-from.x,x.y-from.y);
      var role=x.slot==='ST'?18:x.slot==='WG'?15:x.slot==='CM'?12:x.slot==='FB'?7:3;
      var tactical=0;
      if(team.tactics.attack==='short')tactical+=Math.max(0,20-distance*.55);
      if(team.tactics.attack==='direct')tactical+=Math.max(0,advance)*1.1+(x.slot==='ST'?18:0);
      if(team.tactics.attack==='wide')tactical+=(x.slot==='WG'||x.slot==='FB')?20:0;
      return 18+stat(x.p,'pass')*.18+stat(x.p,'speed')*.12+role+tactical;
    });
  }
  function recalc(t){
    t.rating=teamRating(t.assign,t.tactics);
  }
  function attackEvent(){
    var h=teams[0],a=teams[1];
    var midChance=clamp(.5+(h.rating.mid-a.rating.mid)/110,0.29,.71);
    m.possession=Math.random()<midChance?0:1;
    var atk=teams[m.possession],def=teams[1-m.possession];
    var carrier=pick(atk.actors,function(x){
      var bonus=x.slot==='ST'?14:x.slot==='WG'?15:x.slot==='CM'?18:x.slot==='FB'?9:3;
      return stat(x.p,'pass')*.45+stat(x.p,'speed')*.18+bonus;
    });
    m.ball.owner=carrier;touchActor(carrier);

    var passCount=atk.tactics.attack==='short'?(2+Math.floor(Math.random()*3)):
      atk.tactics.attack==='wide'?(1+Math.floor(Math.random()*3)):Math.floor(Math.random()*3);
    var lastPassEvent=null;
    for(var pi=0;pi<passCount;pi++){
      var receiver=chooseReceiver(atk,carrier);if(!receiver)break;
      var dist=Math.hypot(receiver.x-carrier.x,receiver.y-carrier.y);
      var distancePenalty=dist>40 ? .07 : (dist>28 ? .035 : 0);
      var passP=.76+(stat(carrier.p,'pass')-70)/170-distancePenalty;
      if(atk.tactics.attack==='short')passP+=.07;
      if(atk.tactics.attack==='direct')passP-=.045;
      if(def.tactics.press==='press')passP-=.045;
      passP=clamp(passP,.56,.94);
      var completed=Math.random()<passP;
      lastPassEvent=recordPass(m.possession,carrier,receiver,completed);
      if(!completed){
        var interceptor=pick(def.actors,function(x){return stat(x.p,'defense')*.7+stat(x.p,'speed')*.2+10;});
        if(interceptor){m.ball.owner=interceptor;touchActor(interceptor);}
        if(Math.random()<.22)emit('chance',displayName(carrier)+'의 패스가 끊겼어요.',m.possession,carrier);
        return;
      }
      carrier=receiver;
    }

    var build=clamp(.58+(atk.rating.mid-def.rating.mid)/190,0.39,.79);
    if(Math.random()>build){
      if(Math.random()<.25)emit('chance',displayName(carrier)+'의 전진이 막혔어요.',m.possession,carrier);
      return;
    }

    var shooter=pick(atk.actors,function(x){
      var bonus=x.slot==='ST'?32:x.slot==='WG'?23:x.slot==='CM'?11:2;
      if(x.id===carrier.id)bonus+=8;
      return stat(x.p,'shot')*.55+stat(x.p,'speed')*.18+bonus;
    });
    if(shooter.id!==carrier.id){
      var finalPassP=clamp(.78+(stat(carrier.p,'pass')-70)/180-(def.tactics.press==='press' ? .035 : 0)+(atk.tactics.attack==='short' ? .035 : 0),.59,.94);
      lastPassEvent=recordPass(m.possession,carrier,shooter,Math.random()<finalPassP);
      if(!lastPassEvent.completed){
        var cut=pick(def.actors,function(x){return stat(x.p,'defense')*.72+stat(x.p,'speed')*.18+10;});
        if(cut){m.ball.owner=cut;touchActor(cut);}
        return;
      }
      carrier=shooter;
    }else{
      m.ball.owner=shooter;touchActor(shooter);
    }

    var quality=atk.rating.attack-def.rating.defense+(stat(shooter.p,'shot')-70)*.28;
    var shotChance=clamp(.66+quality/210,.48,.83);
    if(Math.random()>shotChance){emit('chance',displayName(shooter)+'의 공격이 수비에 막혔어요.',m.possession,shooter);return;}

    if(lastPassEvent&&lastPassEvent.completed){
      lastPassEvent.keyPass=true;
      var kp=m.replay.stats[lastPassEvent.actorId];if(kp)kp.keyPasses++;
    }

    var goalP=clamp(.145+quality/650,0.075,.27);
    var shooterStat=m.replay.stats[shooter.id];if(shooterStat)shooterStat.shots++;
    if(atk.tactics.mindset==='attack')goalP+=.012;
    if(def.tactics.mindset==='defend')goalP-=.009;
    goalP=clamp(goalP,.03,.32);
    if(shooterStat)shooterStat.xg+=goalP;
    if(Math.random()<goalP){
      m.score[m.possession]++;
      if(shooterStat)shooterStat.goals++;
      if(lastPassEvent&&lastPassEvent.completed&&lastPassEvent.actorId!==shooter.id){
        lastPassEvent.assist=true;
        var ast=m.replay.stats[lastPassEvent.actorId];if(ast)ast.assists++;
      }
      emit('goal','골! '+displayName(shooter)+'의 슛이 들어갔어요!',m.possession,shooter);
      m.possession=1-m.possession;
    }else if(Math.random()<.37){
      var keeper=def.actors.find(function(x){return x.slot==='GK';})||def.actors[0];
      m.ball.owner=keeper;touchActor(keeper);var keeperStat=m.replay.stats[keeper.id];if(keeperStat)keeperStat.saves++;emit('save',displayName(keeper)+'이(가) 슛을 막아 냈어요.',1-m.possession,keeper);
    }else emit('shot',displayName(shooter)+'의 슛이 골문을 벗어났어요.',m.possession,shooter);
  }
  function updateActors(dt){
    var bx=m.ball.owner?m.ball.owner.x:50,by=m.ball.owner?m.ball.owner.y:50;
    teams.forEach(function(t,side){
      var b=t.rating.bonus;
      t.actors.forEach(function(a){
        var push=(side===0?1:-1)*(m.possession===side?8:-5);
        if(t.tactics.mindset==='attack')push+=(side===0?1:-1)*4;
        if(t.tactics.mindset==='defend')push-=(side===0?1:-1)*4;
        var tx=clamp(a.baseX+push+(bx-50)*.08,4,96);
        var ty=clamp(a.baseY+(by-a.baseY)*.08,5,95);
        if(a===m.ball.owner)tx+=(side===0?1:-1)*3;
        var ox=a.x,oy=a.y;
        var sp=(stat(a.p,'speed')/100)*(1.8+1.1*a.energy/100);
        a.x+=(tx-a.x)*Math.min(1,dt*sp*.55);
        a.y+=(ty-a.y)*Math.min(1,dt*sp*.55);
        a.energy=clamp(a.energy-dt*.048*b.fatigue,28,100);
        var ast=m.replay.stats[a.id];
        if(ast){
          var distanceScale=a.slot==='GK'?14:a.slot==='CB'?20:a.slot==='FB'?22:a.slot==='CM'?23:a.slot==='WG'?22:a.slot==='ST'?21:21;
          ast.distance+=Math.hypot((a.x-ox)*1.05,(a.y-oy)*.68)/1000*distanceScale;
        }
        if(Math.hypot(a.x-ox,a.y-oy)>.015){
          a.trail.push({x:a.x,y:a.y});
          if(a.trail.length>7)a.trail.shift();
        }
        a.flash=Math.max(0,a.flash-dt*2.4);
        a.pulse=Math.max(0,a.pulse-dt*1.55);
      });
    });
    if(m.ball.owner){
      m.ball.x+=(m.ball.owner.x-m.ball.x)*Math.min(1,dt*8);
      m.ball.y+=(m.ball.owner.y-m.ball.y)*Math.min(1,dt*8);
    }
    m.ball.trail.push({x:m.ball.x,y:m.ball.y});
    if(m.ball.trail.length>10)m.ball.trail.shift();
  }
  m.update=function(dt,speed){
    if(m.finished)return;
    var simDt=dt*(speed||1),gameMinutes=simDt*.52;
    m.minute+=gameMinutes;
    updateActors(simDt);
    while(m.minute>=m.replay.next+m.replay.step&&m.replay.frames.length<180){m.replay.next+=m.replay.step;recordReplayFrame();}
    m.effects=m.effects.filter(function(fx){fx.life-=simDt*1.7;return fx.life>0;});
    m.passVisuals=m.passVisuals.filter(function(pv){pv.life-=simDt*1.8;return pv.life>0;});
    if(!m.half&&m.minute>=45){m.half=true;emit('half','전반 종료! 잠깐 숨을 고릅니다.',-1,null);}
    while(m.minute>=m.nextEvent&&m.nextEvent<90){
      attackEvent();
      var tempo=(teams[0].rating.bonus.tempo+teams[1].rating.bonus.tempo)/2;
      m.nextEvent+=clamp((1.35+Math.random()*1.15)/tempo,.9,2.8);
    }
    if(m.minute>=90){
      m.minute=90;m.finished=true;emit('end','경기 종료!',-1,null);
      teams.forEach(function(t){t.actors.forEach(function(a){a.p.fitness=clamp(Math.round((a.p.fitness==null?100:a.p.fitness)-(100-a.energy)*.34-3),45,100);});});
      if(opts.onFinish)opts.onFinish(m);
    }
  };
  m.setTactics=function(side,t){teams[side].tactics=t;recalc(teams[side]);};
  m.substitute=function(side,outId,inPlayer){
    var t=teams[side],idx=t.actors.findIndex(function(a){return a.id===outId;});
    if(idx<0||!inPlayer)return false;
    var old=t.actors[idx],fresh={id:inPlayer.id,p:inPlayer,slot:old.slot,side:side,x:old.x,y:old.y,baseX:old.baseX,baseY:old.baseY,vx:0,vy:0,energy:100,trail:[],flash:0,pulse:1};
    old.p.fitness=clamp(Math.round((old.p.fitness==null?100:old.p.fitness)-(100-old.energy)*.34-2),45,100);
    t.actors[idx]=fresh;t.assign[idx]={slot:old.slot,player:inPlayer};
    if(!m.replay.heat[fresh.id])m.replay.heat[fresh.id]=Array(60).fill(0);
    if(!m.replay.stats[fresh.id])m.replay.stats[fresh.id]={touches:0,shots:0,goals:0,saves:0,distance:0,xg:0,passesAttempted:0,passesCompleted:0,progressivePasses:0,keyPasses:0,assists:0};
    recalc(t);
    if(m.ball.owner===old){m.ball.owner=fresh;m.lastTouchId=fresh.id;}
    emit('sub',old.p.name+' 대신 '+inPlayer.name+'이(가) 들어갑니다.',side,fresh);return true;
  };
  m.exportReplay=function(){
    if(!m.replay.frames.length||m.replay.frames[m.replay.frames.length-1][0]<89.9)recordReplayFrame();
    var players=[],homePool=opts.homeRoster||[],awayPool=opts.awayRoster||[];
    Object.keys(m.replay.stats).forEach(function(id){
      var p=homePool.find(function(x){return x.id===id;}),side=0;
      if(!p){p=awayPool.find(function(x){return x.id===id;});side=1;}
      if(p)players.push({id:p.id,name:p.name,pos:p.pos,side:side,era:p.era||'',memory:p.memory||''});
    });
    return {
      homeClubId:teams[0].club.id,awayClubId:teams[1].club.id,
      score:[m.score[0],m.score[1]],frames:m.replay.frames,
      heat:m.replay.heat,stats:m.replay.stats,players:players,
      events:m.events.map(function(e){return {minute:e.minute,type:e.type,text:e.text||'',side:e.side,actorId:e.actorId||(e.actor?e.actor.id:null),toId:e.toId||null,x:e.x,y:e.y,toX:e.toX,toY:e.toY,completed:e.completed,progressive:e.progressive,keyPass:e.keyPass,assist:e.assist};})
    };
  };
  return m;
}
window.SeedFCSim={create:create,assignSlots:assignSlots,teamRating:teamRating,playerScore:playerScore};
})();