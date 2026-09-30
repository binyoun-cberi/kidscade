const parts=[
 './topdown-game.part1.txt?v=3',
 './topdown-game.part2.txt?v=3',
 './topdown-game.part3.txt?v=3',
 './topdown-game.part4.txt?v=3',
 './topdown-game.part5.txt?v=3',
 './topdown-game.part6.txt?v=3'
];
document.body.classList.add('topdown-code-quest');
try{
 const nextKey='kidscade_game_v1:high_code_quest:topdown_v1';
 const oldKey='kidscade_game_v1:high_code_quest:progress_v3';
 if(!localStorage.getItem(nextKey)){
  const old=JSON.parse(localStorage.getItem(oldKey)||'{}');
  if(old&&Object.keys(old).length){
   localStorage.setItem(nextKey,JSON.stringify({
    current:Number(old.current)||0,
    unlocked:Math.max(1,Number(old.unlocked)||1),
    completed:old.completed||{},
    programs:{},best:{},attempts:{},wins:0
   }));
  }
 }
}catch(_){}
Promise.all(parts.map(src=>fetch(src,{cache:'no-store'}).then(r=>{
 if(!r.ok)throw new Error('Top-view engine part failed: '+src);
 return r.text();
}))).then(chunks=>{
 let source=chunks.join('');
 source=source.replace(
  "enemyCount:boss?Math.min(3,1+Math.floor(i/18)):clamp(1+Math.floor(i/8),1,5),",
  "enemyCount:i<2?0:boss?Math.min(3,1+Math.floor(i/18)):clamp(1+Math.floor(i/8),1,5),"
 );
 const missionRenderer=`function renderMission(){
  const p=stageProfile(missionIndex),n=missionIndex+1;
  const arcNames={prologue:'코드 캠프',forest:'버그 숲',mine:'수정 광산',city:'기계 도시',desert:'데이터 사막',citadel:'버그 성채',null:'NULL CORE'};
  const arc=arcNames[mission.arc]||'버그 월드';
  $('chapterName').textContent=arc;
  $('missionName').textContent=n+'. '+(p.boss?'코어 보스전':'탑뷰 코드 작전');
  $('missionKicker').textContent=(mission.concept||'알고리즘')+' · '+arc;
  $('missionTitle').textContent=p.boss?'AI 코어를 분석하라':'전장을 코드로 돌파하라';
  $('missionText').textContent=p.boss?'보스의 현재 AI 규칙과 공격 예고를 읽고 기술을 조합하세요.':'장애물과 적 배치를 보고 사방 이동, 조건, 반복을 조합해 같은 코드가 여러 상황에서 작동하게 만드세요.';
  $('objectiveText').textContent=p.objective;
}`;
 source=source.replace(/function renderMission\(\)\{.*?\}\nfunction loadMission/s,missionRenderer+'\nfunction loadMission');
 const gridRenderer=`function renderMissionGrid(){
  const r=$('missionGrid'),arcNames={prologue:'코드 캠프',forest:'버그 숲',mine:'수정 광산',city:'기계 도시',desert:'데이터 사막',citadel:'버그 성채',null:'NULL CORE'};r.replaceChildren();
  missions.forEach((m,i)=>{const p=stageProfile(i),b=document.createElement('button');b.className='mission-item'+(i>=progress.unlocked?' locked':'')+(progress.completed[i]?' done':'');b.disabled=i>=progress.unlocked;b.innerHTML='<b>'+(progress.completed[i]?'✓ ':'')+(i+1)+'. '+(p.boss?'코어 보스전':'탑뷰 코드 작전')+'</b><span>'+(arcNames[m.arc]||'버그 월드')+' · '+(m.concept||'알고리즘')+'</span>';b.onclick=()=>loadMission(i);r.append(b)});
}`;
 source=source.replace(/function renderMissionGrid\(\)\{.*?\}\nfunction renderMap/s,gridRenderer+'\nfunction renderMap');
 source=source.replace("world.guard=Math.max(0,world.guard);world.evade=Math.max(0,world.evade);","world.guard=Math.max(0,world.guard);world.evade=0;");
 source=source.replace("e.rule&&e.rule.includes(c.split(' ')[0])","e.rule&&e.rule.includes(c)");
 const blob=new Blob([source],{type:'text/javascript'});
 const url=URL.createObjectURL(blob);
 return import(url).finally(()=>URL.revokeObjectURL(url));
}).catch(err=>{
 console.error('[Code Quest top-view loader]',err);
 const title=document.getElementById('execTitle');
 const detail=document.getElementById('execDetail');
 if(title)title.textContent='탑뷰 엔진을 불러오지 못했어요.';
 if(detail)detail.textContent='새로고침 후 다시 시도해 주세요.';
});
