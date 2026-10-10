/* Ota chapter 3 — deterministic exploration, gaze enemy and checkpoints */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.OtaChapter3 = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  const OFFICE_SEAL = Object.freeze({ x:-8.8, z:-47.5 });
  const OFFICE_RECORD = Object.freeze({ x:-13.0, z:-51.0 });
  const ARCHIVE_RECORD = Object.freeze({ x:12.8, z:-51.0 });
  const FINAL_GATE = Object.freeze({ x:0, z:-57.2 });
  const WATCHER = Object.freeze({ x:10.5, z:-44.5 });
  const START = Object.freeze({ x:0, z:-40.0 });
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function ensure(s){
    if(s.chapter3)return s.chapter3;
    s.chapter3={officeFixed:false,records:{office:false,archive:false},finalFixed:false,
      watcher:{focus:0,awake:false,awakeTime:0,cooldown:0,x:WATCHER.x,z:WATCHER.z}, checkpoint:false};
    return s.chapter3;
  }
  function both(s){const c=ensure(s);return c.records.office&&c.records.archive;}
  function inArchive(p){return p.x>=3.5 && p.x<=15.3 && p.z<=-39 && p.z>=-55.6;}
  function canMove(s,x,z){
    if(z>-37.4)return true; // The v2 rule owns the initial corridor.
    if(z<-65.7)return false;
    const c=ensure(s);
    if(Math.abs(x)>15.25)return false;
    if(Math.abs(x)>3.03) {
      if(z < -55.5 || z > -39.0)return false;
      if(Math.abs(x)<4.3 && (z<-49.0 || z>-44.2))return false;
    }
    if(x < -10.8 && x > -11.2 && z>=-55.5 && z<=-39.0) {
      if(!c.officeFixed || z<-50.15 || z>-47.0) return false;
    }
    // The last door must remain a real physical obstacle, even with both records.
    if(Math.abs(z+58.65)<.42 && (!c.finalFixed || Math.abs(x)>1.21))return false;
    return true;
  }
  function startChapter(s,p){
    if(s.stage!=='exit'||p.z> -35)return false;
    s.stage='explore';ensure(s).checkpoint=true;return true;
  }
  function repairOffice(s,word,p){
    const c=ensure(s);
    if(s.stage!=='explore'||c.officeFixed||dist(p,OFFICE_SEAL)>2.4)return false;
    if(word!=='책상'){s.mistakes++;return false;}
    c.officeFixed=true;return true;
  }
  function collect(s,which,p){
    const c=ensure(s);
    if(s.stage!=='explore'||c.records[which]!==false)return false;
    if(which==='office' && (!c.officeFixed||dist(p,OFFICE_RECORD)>2.1))return false;
    if(which==='archive' && (!inArchive(p)||dist(p,ARCHIVE_RECORD)>2.1))return false;
    c.records[which]=true;c.checkpoint=true;
    if(which==='archive'){c.watcher.focus=0;c.watcher.awake=false;c.watcher.cooldown=1000;}
    return true;
  }
  function repairFinal(s,word,p){
    const c=ensure(s);
    if(s.stage!=='explore'||!both(s)||c.finalFixed||dist(p,FINAL_GATE)>2.6)return false;
    if(word!=='기억'){s.mistakes++;return false;}
    c.finalFixed=true;c.checkpoint=true;s.stage='final';return true;
  }
  function finish(s,p){
    const c=ensure(s);
    if(s.stage!=='final'||!c.finalFixed||p.z>-63.3)return false;
    s.stage='won';s.finished=true;return true;
  }
  function interaction(s,p){
    if(s.stage!=='explore')return null;
    const c=ensure(s);
    if(!c.officeFixed&&dist(p,OFFICE_SEAL)<2.4)return {type:'office',label:'사물의 이름 바로잡기'};
    if(!c.records.office&&c.officeFixed&&dist(p,OFFICE_RECORD)<2.1)return {type:'officeRecord',label:'사무실 기록 확보'};
    if(!c.records.archive&&inArchive(p)&&dist(p,ARCHIVE_RECORD)<2.1)return {type:'archiveRecord',label:'서고 기록 확보'};
    if(both(s)&&!c.finalFixed&&dist(p,FINAL_GATE)<2.6)return {type:'final',label:'중앙 기록실 봉인 풀기'};
    return null;
  }
  function objective(s){
    const c=ensure(s);
    if(s.stage==='final')return '열린 기록실 안으로 들어가 자신의 이름을 지키세요';
    if(s.stage!=='explore')return '';
    if(!both(s))return '사무실과 서고에서 기록을 찾으세요 ('+(+c.records.office+ +c.records.archive)+'/2)';
    return '두 기록을 모았습니다. 복도 끝 중앙 기록실로 가세요';
  }
  function stepWatcher(s,dt,p,yaw,pitch){
    const c=ensure(s), w=c.watcher;
    dt=Math.min(.1,Math.max(0,dt));
    if(s.stage!=='explore'||c.records.archive)return {looking:false,awake:false,focus:w.focus};
    w.cooldown=Math.max(0,w.cooldown-dt);
    const d=dist(p,{x:w.x,z:w.z});
    const vx=(w.x-p.x)/Math.max(.001,d),vz=(w.z-p.z)/Math.max(.001,d);
    const looking=!w.awake && w.cooldown===0 && inArchive(p)&&d<8
      &&(-Math.sin(yaw)*vx-Math.cos(yaw)*vz)>.94&&Math.abs(pitch)<.37;
    if(w.awake){
      w.awakeTime-=dt;
      const dTo=dist(w,p);
      const travel=Math.min(dTo,2.15*dt);
      if(dTo>.001){w.x+=(p.x-w.x)*travel/dTo;w.z+=(p.z-w.z)*travel/dTo;}
      if(dTo<.86){s.stage='lost';s.losses++;s.lossReason='watcher';w.awake=false;}
      else if(w.awakeTime<=0 || !inArchive(p)){w.awake=false;w.cooldown=7.5;w.focus=0;w.x=WATCHER.x;w.z=WATCHER.z;}
    } else if(looking){w.focus=Math.min(100,w.focus+27*dt);}
    else w.focus=Math.max(0,w.focus-38*dt);
    if(w.focus>=100 && !w.awake){w.awake=true;w.awakeTime=7.5;w.x=WATCHER.x;w.z=WATCHER.z;}
    return {looking,awake:w.awake,focus:w.focus};
  }
  function makeCheckpoint(s){
    const c=ensure(s);
    if(!c.checkpoint)return null;
    return {version:3,officeFixed:c.officeFixed,records:{...c.records},finalFixed:c.finalFixed};
  }
  function restore(s,data){
    if(!data||data.version!==3)return false;
    const c=ensure(s);
    s.corridorFixed=true;s.doorFixed=true;s.hidden=false;s.finished=false;
    s.stage='explore';s.monster.active=false;
    s.echo.active=false;s.echo.alert=0;s.echo.timer=0;
    c.officeFixed=data.officeFixed===true;
    c.records.office=c.officeFixed && data.records?.office===true;
    c.records.archive=data.records?.archive===true;
    c.finalFixed=false; // The last puzzle must still be completed on retry.
    c.checkpoint=true;
    c.watcher={focus:0,awake:false,awakeTime:0,cooldown:0,x:WATCHER.x,z:WATCHER.z};
    s.lossReason=null;return true;
  }
  return Object.freeze({OFFICE_SEAL,OFFICE_RECORD,ARCHIVE_RECORD,FINAL_GATE,WATCHER,START,
    ensure,both,inArchive,canMove,startChapter,repairOffice,collect,repairFinal,finish,
    interaction,objective,stepWatcher,makeCheckpoint,restore});
});
