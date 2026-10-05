const ROUTINES={
  minji:{wake:6.5,sleep:22.4,personality:'bright',slots:[[7,8,'market'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,18,'market'],[18,21,'cafeFront'],[21,22.4,'plazaWest']]},
  junho:{wake:7,sleep:21.5,personality:'calm',slots:[[7.5,8,'hardware'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,18,'hardware'],[18,20.5,'plazaEast']]},
  haneul:{wake:5.5,sleep:23.2,personality:'cheerful',slots:[[6,7.5,'cafe'],[7.5,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,20,'cafe'],[20,22.5,'riverLook'],[22.5,23.2,'cafeFront']]},
  taeho:{wake:7,sleep:23.5,personality:'playful',slots:[[7.3,8,'schoolGate'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,18,'arcade'],[18,22,'arcade'],[22,23.5,'plazaEast']]},
  doyun:{wake:7,sleep:21.5,personality:'busy',slots:[[7.4,8,'schoolGarden'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,17.5,'schoolGarden'],[17.5,20,'plazaCenter'],[20,21.5,'civicGarden']]},
  sora:{wake:7,sleep:22,personality:'quiet',slots:[[7.4,8,'library'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,19,'library'],[19,21,'cafeFront'],[21,22,'library']]},
  nari:{wake:6.8,sleep:21.5,personality:'kind',slots:[[7.2,8,'clinic'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,18,'clinic'],[18,20.5,'civicGarden']]},
  minseok:{wake:6.5,sleep:22,personality:'steady',slots:[[7,8,'schoolYard'],[8,10,'schoolYard'],[10,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolYard'],[15.5,18,'busStop'],[18,21,'plazaCenter']]},
  yuna:{wake:6.5,sleep:21.5,personality:'bright',slots:[[7.2,8,'schoolGate'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,17,'schoolGarden'],[17,20.5,'plazaCenter']]},
  woojin:{wake:7,sleep:23,personality:'calm',slots:[[7.3,8,'schoolGate'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,19,'civicGarden'],[19,22,'riverLook']]},
  seoyeon:{wake:7,sleep:21.8,personality:'cheerful',slots:[[7.3,8,'schoolGate'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,18,'plazaCenter'],[18,21,'civicGarden']]},
  hyunwoo:{wake:6.5,sleep:22.5,personality:'busy',slots:[[7.2,8,'schoolGate'],[8,12,'schoolGate'],[12,13,'schoolYard'],[13,15.5,'schoolGate'],[15.5,18,'cafeFront'],[18,21.5,'marketFront']]}
};
const CHAT_LINES=[
  '오늘 수업 끝나고 뭐 할 거야?','아까 광장에서 선생님을 만났어.','오늘 동아리 활동 재미있겠다!',
  '마트에서도 배울 게 은근히 많더라.','요즘 학교 사람들이랑 자주 마주치네!','내일 학교에서도 보자!'
];

function routineTarget(id,hour,weather,pois){
  const r=ROUTINES[id];if(!r)return null;
  const goHomeAt=Math.max(r.wake+1,r.sleep-1.15);
  if(hour<r.wake||hour>=goHomeAt)return {key:'home-'+id,home:true,...(pois['home-'+id]||pois.homeFallback)};
  let key='';
  for(const slot of r.slots){if(hour>=slot[0]&&hour<slot[1]){key=slot[2];break}}
  if(!key)key='plazaCenter';
  if(weather==='rain'||weather==='fog'){
    if(key==='schoolYard'||key==='schoolGarden')key='schoolGate';
    else if(!['market','hardware','cafe','arcade','civic','library','clinic','busStop','schoolGate'].includes(key)){
      key=id==='haneul'||id==='seoyeon'?'cafeFront':id==='sora'?'library':'coveredPlaza';
    }
  }
  return {key,...(pois[key]||pois.plazaCenter)};
}

export function createResidentLife(ctx){
  const {npcs,pois,getMinutes,getPlayer,getDailyState,isBlocked}=ctx;
  const byId=Object.fromEntries(npcs.map(n=>[n.id,n]));
  let chatSerial=0;

  function setVisible(n,visible){
    n.object.visible=visible;
    if(n.interaction)n.interaction.enabled=visible;
    if(n.label&&!visible)n.label.visible=false;
    if(n.chatMarker&&!visible)n.chatMarker.visible=false;
  }
  function startMove(n,target,now){
    n.lifeState=target.home?'GO_HOME':'GO_TO_POI';
    n.activity=target.key;n.anchorX=target.x;n.anchorZ=target.z;
    const spread=target.r??.45,seed=(n.id.length*31+Math.floor(now/5000))%17;
    n.targetX=target.x+(((seed*7)%13)/12-.5)*spread*2;
    n.targetZ=target.z+(((seed*11)%13)/12-.5)*spread*1.3;
    n.moving=true;n.nextDecision=now+6500;
  }
  function stopAt(n,now){
    n.moving=false;n.lifeState=n.lifeState==='GO_HOME'?'HOME':'USE_POI';
    n.nextDecision=now+2800+((n.id.length*733)%2800);
    if(n.lifeState==='HOME')setVisible(n,false);
  }
  function tryChat(n,now){
    if(n.lifeState!=='USE_POI'||now<(n.chatCooldown||0))return false;
    let best=null,bestD=2.2;
    for(const other of npcs){
      if(other===n||other.lifeState!=='USE_POI'||other.partnerId||now<(other.chatCooldown||0)||!other.object.visible)continue;
      const d=Math.hypot(n.object.position.x-other.object.position.x,n.object.position.z-other.object.position.z);
      if(d<bestD){best=other;bestD=d;}
    }
    if(!best)return false;
    const serial=++chatSerial,until=now+3600+(serial%3)*550;
    n.lifeState=best.lifeState='CHATTING';n.partnerId=best.id;best.partnerId=n.id;
    n.chatUntil=best.chatUntil=until;n.moving=best.moving=false;
    const first=CHAT_LINES[serial%CHAT_LINES.length],second=CHAT_LINES[(serial+2)%CHAT_LINES.length];
    if(n.chatMarker){n.chatMarker.userData?.setText?.(first);n.chatMarker.visible=true;}
    if(best.chatMarker){best.chatMarker.userData?.setText?.(second);best.chatMarker.visible=true;}
    return true;
  }
  function endChat(n,now){
    const other=byId[n.partnerId];
    for(const a of [n,other].filter(Boolean)){
      a.partnerId='';a.chatUntil=0;a.lifeState='USE_POI';a.chatCooldown=now+10000+((a.id.length*509)%7000);a.nextDecision=now+2000;
      if(a.chatMarker){a.chatMarker.visible=false;a.chatMarker.userData?.setText?.('💬');}
    }
  }

  for(const n of npcs){
    n.lifeState='IDLE';n.activity='';n.partnerId='';n.chatUntil=0;n.chatCooldown=0;
  }

  function update(now,dt){
    const minutes=Number(getMinutes?.()??720),hour=minutes/60,player=getPlayer?.()||null,daily=getDailyState?.()||{},weather=daily.weather||'clear';
    for(const n of npcs){
      const target=routineTarget(n.id,hour,weather,pois);if(!target)continue;
      if(n.lifeState==='HOME'){
        if(!target.home){
          const home=pois['home-'+n.id]||pois.homeFallback;
          setVisible(n,true);n.object.position.set(home.x,n.groundY,home.z);startMove(n,target,now);
        }
        continue;
      }
      if(target.home&&n.lifeState!=='GO_HOME'){startMove(n,target,now);}
      else if(!target.home&&n.activity!==target.key&&n.lifeState!=='CHATTING'){startMove(n,target,now);}
      if(n.lifeState==='CHATTING'){
        const other=byId[n.partnerId];
        if(!other||now>=n.chatUntil){endChat(n,now);}
        else{
          const dx=other.object.position.x-n.object.position.x,dz=other.object.position.z-n.object.position.z;
          n.object.rotation.y=Math.atan2(dx,dz);n.playAnim?.('idle');n.mixer?.update(dt);
          if(n.label){n.label.position.set(n.object.position.x,2.22,n.object.position.z);n.label.visible=!!player&&Math.hypot(player.x-n.object.position.x,player.z-n.object.position.z)<5.6;}
          if(n.chatMarker)n.chatMarker.position.set(n.object.position.x,2.82,n.object.position.z);
          if(n.interaction){n.interaction.x=n.object.position.x;n.interaction.z=n.object.position.z;}
          continue;
        }
      }
      if(n.lifeState==='USE_POI'&&now>=n.nextDecision){
        if(tryChat(n,now))continue;
        const waitBias=weather==='rain'?.86:.64;
        if(Math.random()<waitBias){n.nextDecision=now+2200+Math.random()*3600;}
        else startMove(n,{...target,r:(target.r??.45)*1.35},now);
      }
      let walking=false;
      if(n.moving){
        const dx=n.targetX-n.object.position.x,dz=n.targetZ-n.object.position.z,d=Math.hypot(dx,dz);
        if(d<.07)stopAt(n,now);
        else{
          const speed=(n.role==='resident'||n.role==='delivery') ? 1.00 : .82,step=Math.min(d,speed*dt);
          const ux=dx/d,uz=dz/d,nx=n.object.position.x+ux*step,nz=n.object.position.z+uz*step;
          if(!isBlocked?.(nx,nz)){
            n.object.position.x=nx;n.object.position.z=nz;n.detourSign=0;walking=true;
          }else{
            const signs=n.detourSign?[n.detourSign,-n.detourSign]:[1,-1];
            for(const sign of signs){
              const sx=-uz*sign,sz=ux*sign,tx=n.object.position.x+sx*step*.9,tz=n.object.position.z+sz*step*.9;
              if(isBlocked?.(tx,tz))continue;
              n.object.position.x=tx;n.object.position.z=tz;n.detourSign=sign;walking=true;break;
            }
            if(!walking){n.moving=false;n.nextDecision=now+700;n.detourSign=0;}
          }
          n.object.rotation.y=Math.atan2(walking?(n.object.position.x-(n.lastX??n.object.position.x)):dx,walking?(n.object.position.z-(n.lastZ??n.object.position.z)):dz);
        }
      }else if(n.lifeState==='IDLE'){startMove(n,target,now);}
      n.lastX=n.object.position.x;n.lastZ=n.object.position.z;
      n.playAnim?.(walking?'walk':'idle');n.mixer?.update(dt);
      n.object.position.y=n.groundY+(walking?Math.abs(Math.sin(now/170+n.phase))*.010:0);
      if(n.label){n.label.position.set(n.object.position.x,2.22,n.object.position.z);n.label.visible=!!player&&Math.hypot(player.x-n.object.position.x,player.z-n.object.position.z)<5.6;}
      if(n.chatMarker){n.chatMarker.position.set(n.object.position.x,2.82,n.object.position.z);if(n.lifeState!=='CHATTING')n.chatMarker.visible=false;}
      if(n.interaction){n.interaction.x=n.object.position.x;n.interaction.z=n.object.position.z;}
    }
  }
  function snapshot(){
    return npcs.map(n=>({id:n.id,state:n.lifeState,activity:n.activity,partner:n.partnerId||'',visible:n.object.visible!==false}));
  }
  return {update,snapshot,ROUTINES,CHAT_LINES};
}
