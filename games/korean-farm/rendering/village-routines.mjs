// NPC schedules follow in-game farm minutes, not wall-clock time.
// Each stop remains close to its original invisible interaction target so
// talking to a villager still works from the familiar location.
export const DAILY_ROUTINES=Object.freeze({
  market:Object.freeze([
    {until:600,phase:'morning',label:'장터에 물건을 꺼내는 중',x:9.28,z:15.1,gesture:'stock'},
    {until:840,phase:'noon',label:'가판대에서 손님을 맞는 중',x:9.8,z:15.3,gesture:'sell'},
    {until:1080,phase:'afternoon',label:'작물을 정리하는 중',x:9.35,z:15.55,gesture:'stock'},
    {until:1321,phase:'evening',label:'장터를 정돈하는 중',x:9.65,z:15.1,gesture:'rest'}
  ]),
  neighbor:Object.freeze([
    {until:600,phase:'morning',label:'마을길을 쓰는 중',x:2.32,z:12.95,gesture:'sweep'},
    {until:840,phase:'noon',label:'그늘에서 쉬는 중',x:3.18,z:13.5,gesture:'rest'},
    {until:1080,phase:'afternoon',label:'텃밭을 돌보는 중',x:2.14,z:13.9,gesture:'tend'},
    {until:1321,phase:'evening',label:'이웃을 만나 이야기하는 중',x:2.8,z:13.4,gesture:'wave'}
  ]),
  festival:Object.freeze([
    {until:600,phase:'morning',label:'행사장을 청소하는 중',x:-1.5,z:15.0,gesture:'sweep'},
    {until:840,phase:'noon',label:'마을 소식을 전하는 중',x:-1.1,z:15.4,gesture:'wave'},
    {until:1080,phase:'afternoon',label:'행사 물품을 준비하는 중',x:-.65,z:15.7,gesture:'stock'},
    {until:1321,phase:'evening',label:'가판대를 정돈하는 중',x:-1.1,z:15.25,gesture:'rest'}
  ])
});
export function villageRoutine(role,minute){
  const timetable=DAILY_ROUTINES[role];
  if(!timetable)return null;
  const m=Number.isFinite(minute)?Math.max(420,Math.min(1320,minute)):420;
  return timetable.find(stop=>m<stop.until)||timetable[timetable.length-1];
}
export function villageClock(minute){
  const safe=Number.isFinite(minute)?Math.max(420,Math.min(1320,Math.floor(minute))):420;
  return String(Math.floor(safe/60)).padStart(2,'0')+':'+String(safe%60).padStart(2,'0');
}
