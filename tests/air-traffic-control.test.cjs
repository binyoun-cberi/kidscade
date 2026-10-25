'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../games/high_air_traffic_control/simulation-core.js');

function active(seed=12, map='practice') {return C.create(map,seed);}
function stepUntilDone(s, limit=7000) {
  for(let i=0;i<limit&&s.phase==='running';i++)C.step(s,1/30);
  return s;
}

test('세 관제구역에 유효한 공항과 진입 항로가 있다', () => {
  assert.equal(Object.keys(C.MAPS).length,3);
  assert.equal(C.GATES.length,4);
  for(const name of Object.keys(C.MAPS)) {
    const s=active(37,name);
    assert.equal(s.phase,'running');
    assert.ok(s.airports.length>=1);
    assert.ok(s.planes.length>=1);
    assert.ok(s.map.duration>60);
  }
});
test('터치 목표점은 안전한 지도 영역으로 제한된다', () => {
  const s=active(),p=s.planes[0];
  assert.equal(C.route(s,p.id,-1000,9999),true);
  assert.deepEqual(p.waypoint,{x:34,y:C.HEIGHT-34});
  assert.equal(C.route(s,p.id,Infinity,1),false);
  assert.equal(C.route(s,99999,50,60),false);
  assert.equal(C.direct(s,p.id),true);
  assert.equal(p.waypoint,null);
});
test('고도 명령은 즉시 순간이동하지 않고 점진적으로 적용된다', () => {
  const s=active(),p=s.planes[0];
  p.altitude=2;p.targetAltitude=2;
  assert.equal(C.altitude(s,p.id,1),true);
  C.step(s,1/30);
  assert.ok(p.altitude<2&&p.altitude>1);
  for(let i=0;i<90;i++)C.step(s,1/30);
  assert.ok(p.altitude<1.2);
});
test('공항과 올바른 고도를 통과하면 착륙해 기록된다', () => {
  const s=active(),p=s.planes[0],a=s.airports[0];
  p.isExit=false;p.destId=a.id;p.altitude=1;p.targetAltitude=1;
  p.x=a.x-5;p.y=a.y-5;
  C.step(s,1/30);
  assert.equal(s.delivered,1);
  assert.ok(s.score>=100);
  assert.ok(a.busyUntil>s.elapsed);
  assert.equal(C.findPlane(s,p.id),null);
});
test('활주로가 사용 중이면 자동 대기 후 재진입한다', () => {
  const s=active(),p=s.planes[0],a=s.airports[0];
  p.isExit=false;p.destId=a.id;p.altitude=1;p.targetAltitude=1;
  p.x=a.x-4;p.y=a.y-4;a.busyUntil=90;
  C.step(s,1/30);
  assert.equal(p.holding,true);
  assert.equal(s.delivered,0);
  a.busyUntil=0;
  C.step(s,1/30);
  assert.equal(s.delivered,1);
});
test('높은 고도에서는 착륙하지 않으며 낮은 고도 지시가 필요하다', () => {
  const s=active(),p=s.planes[0],a=s.airports[0];
  p.isExit=false;p.destId=a.id;p.altitude=2;p.targetAltitude=2;
  p.x=a.x-7;p.y=a.y-7;
  C.step(s,1/30);
  assert.equal(s.delivered,0);
  assert.ok(C.findPlane(s,p.id));
  assert.equal(p.holding,true);
});
test('동일 고도의 접근에는 경고, 서로 다른 고도에는 경고가 없다', () => {
  const a=active(23),p=a.planes[0],q={...p,id:9999,callSign:'TEST-99',trail:[],warnedZone:{}};
  p.x=100;p.y=100;p.heading=0;p.safeFrom=0;
  q.x=149;q.y=100;q.heading=0;q.safeFrom=0;
  a.planes.push(q);
  C.step(a,1/30);
  assert.equal(a.warnings,1);
  assert.equal(a.incidents,0);
  const b=active(23),p2=b.planes[0],q2={...p2,id:9999,callSign:'TEST-99',trail:[],warnedZone:{}};
  p2.x=100;p2.y=100;p2.heading=0;p2.safeFrom=0;p2.altitude=1;p2.targetAltitude=1;
  q2.x=149;q2.y=100;q2.heading=0;q2.safeFrom=0;q2.altitude=2;q2.targetAltitude=2;
  b.planes.push(q2);
  C.step(b,1/30);
  assert.equal(b.warnings,0);
});
test('위험한 근접은 자동 관제가 개입하고 심각 상황이 반복되면 근무를 종료한다', () => {
  const s=active(11),p=s.planes[0];
  p.x=100;p.y=100;p.safeFrom=0;p.altitude=1;p.targetAltitude=1;
  s.incidents=2;
  s.planes.push({...p,id:999,callSign:'TEST-999',x:101,y:101,safeFrom:0,trail:[],warnedZone:{}});
  C.step(s,1/30);
  assert.equal(s.incidents,3);
  assert.equal(s.phase,'failed');
  assert.ok(s.messages.some(m=>m.text.includes('자동 관제')));
});
test('근무 완료에 필요한 기본 실적을 점검한다', () => {
  const ok=active(30);
  ok.delivered=ok.map.required;
  for(let id=1;id<=ok.map.requiredCommands;id++)ok.managedIds.push(id);
  ok.controlled=ok.map.requiredCommands;
  ok.elapsed=ok.duration-.01;C.step(ok,.05);
  assert.equal(ok.phase,'completed');
  const passive=active(30);passive.delivered=passive.map.required;passive.elapsed=passive.duration-.01;C.step(passive,.05);
  assert.equal(passive.phase,'failed');
  assert.match(passive.endReason,/직접 안내/);
  const no=active(30);
  no.elapsed=no.duration-.01;C.step(no,.05);
  assert.equal(no.phase,'failed');
});
test('여러 시드에서 무조작 전체 근무를 안정적으로 시뮬레이션한다', () => {
  for(const map of Object.keys(C.MAPS)){
    for(let seed=1;seed<=8;seed++){
      const s=stepUntilDone(active(seed*137,map));
      assert.ok(['completed','failed'].includes(s.phase));
      assert.ok(s.elapsed<=s.duration);
      assert.ok(Number.isFinite(s.score)&&s.score>=0);
      assert.ok(s.warnings>=s.incidents);
      assert.ok(s.planes.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.heading)));
    }
  }
});
test('서로 다른 비행기를 실제로 조종해야 근무 실적으로 인정된다', () => {
  const s=active(8),p=s.planes[0];
  assert.equal(s.controlled,0);
  C.route(s,p.id,p.x+100,p.y+90);
  assert.equal(s.controlled,1);
  C.route(s,p.id,p.x+140,p.y+110);
  assert.equal(s.controlled,1);
  C.altitude(s,p.id,p.targetAltitude===1?2:1);
  assert.equal(s.controlled,1);
  C.spawn(s);const second=s.planes.find(x=>x.id!==p.id);
  assert.ok(second);
  C.hold(s,second.id);
  assert.equal(s.controlled,2);
  assert.equal(s.issuedInstructions,4);
});
test('관제 도중 빈 경유점과 누락된 항공기는 잘못된 지시를 기록하지 않는다', () => {
  const s=active(9),p=s.planes[0];
  const before=s.controlled;
  assert.equal(C.route(s,p.id,p.x,p.y),true);
  assert.equal(s.controlled,before);
  assert.equal(C.route(s,876123,50,50),false);
  assert.equal(C.altitude(s,p.id,3),false);
  assert.equal(s.controlled,before);
});
