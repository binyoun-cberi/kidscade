/* O T A — deterministic world rules. No DOM/Three.js dependency. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.OtaRules = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  const LOCKERS = Object.freeze([{ x: 2.36, z: -22.4 }, { x: -2.36, z: -11.0 }]);
  const CONSOLE = Object.freeze({ x: -2.1, z: 2.0 });
  const DOOR = Object.freeze({ x: 0, z: -29.0 });
  function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  function initialState() {
    return { stage: 'console', doorFixed: false, hidden: false, hidingSeconds: 0,
      monster: { x: 0, z: -7.5, active: false }, mistakes: 0, hideCount: 0,
      finished: false, losses: 0, time: 0 };
  }
  function inspectConsole(s, p) {
    if (s.stage !== 'console' || distance(p, CONSOLE) > 2.3) return false;
    s.stage = 'anomaly'; return true;
  }
  function triggerMonster(s, p) {
    if (s.stage !== 'anomaly' || p.z > -15.3) return false;
    s.stage = 'chase'; s.monster.active = true;
    s.monster.x = 0; s.monster.z = -7.5; return true;
  }
  function nearestLocker(p) {
    let best = null, d = Infinity;
    LOCKERS.forEach((locker, index) => {
      const next = distance(locker, p);
      if (next < d) { best = { ...locker, index, distance: next }; d = next; }
    });
    return best;
  }
  function enterLocker(s, p) {
    const locker = nearestLocker(p);
    if (s.stage !== 'chase' || s.hidden || locker.distance > 1.65) return false;
    s.hidden = true; s.hidingSeconds = 0; s.stage = 'hiding'; s.hideCount += 1;
    return true;
  }
  function leaveLocker(s) {
    if (!s.hidden || s.stage !== 'door') return false;
    s.hidden = false; return true;
  }
  function stepEnemy(s, dt, p) {
    dt = Math.min(.1, Math.max(0, dt));
    if (s.stage === 'hiding') {
      s.hidingSeconds += dt;
      if (s.hidingSeconds >= 4.5) {
        s.stage = 'door'; s.monster.active = false;
      }
    } else if (s.stage === 'chase' && s.monster.active) {
      const dx = p.x - s.monster.x, dz = p.z - s.monster.z, d = Math.hypot(dx, dz);
      if (d > .01) {
        const step = Math.min(d, 3.0 * dt);
        s.monster.x += dx / d * step;
        s.monster.z += dz / d * step;
      }
      if (distance(p, s.monster) < 1.0) {
        s.stage = 'lost'; s.monster.active = false; s.losses += 1;
      }
    }
    s.time += dt;
    return s.stage;
  }
  function repairDoor(s, word, p) {
    if (s.stage !== 'door' || s.hidden || distance(p, DOOR) > 2.45) return false;
    if (word !== '문') { s.mistakes += 1; return false; }
    s.doorFixed = true; s.stage = 'exit'; return true;
  }
  function canMove(s, x, z) {
    if (x < -3.03 || x > 3.03 || z > 6.45 || z < -37.4) return false;
    if (Math.abs(z + 30.15) < .36 && (!s.doorFixed || Math.abs(x) > 1.18)) return false;
    return true;
  }
  function tryFinish(s, p) {
    if (s.stage !== 'exit' || !s.doorFixed || p.z > -35.0) return false;
    s.stage = 'won'; s.finished = true; return true;
  }
  function getInteraction(s, p) {
    if (s.stage === 'console' && distance(p, CONSOLE) <= 2.3)
      return { type: 'console', label: '기록 읽기' };
    if (s.hidden && s.stage === 'door') return { type: 'leave', label: '사물함에서 나오기' };
    if (s.stage === 'chase' && nearestLocker(p).distance <= 1.65)
      return { type: 'hide', label: '사물함에 숨기' };
    if (s.stage === 'door' && !s.hidden && distance(p, DOOR) <= 2.45)
      return { type: 'repair', label: '이름 수정하기' };
    return null;
  }
  function objective(s) {
    return ({
      console: '관리실 컴퓨터의 기록을 확인하세요',
      anomaly: '복도에서 이상한 글자를 조사하세요',
      chase: '달려서 사물함 안에 숨으세요',
      hiding: '소리가 사라질 때까지 기다리세요',
      door: s.hidden ? '밖이 조용해졌어요. 사물함에서 나오세요' : '끝의 잘못된 문을 복구하세요',
      exit: '열린 문을 지나 기록보관소를 탈출하세요',
      won: '이름을 지켰습니다',
      lost: '이름을 빼앗겼습니다'
    })[s.stage] || '';
  }
  return Object.freeze({ LOCKERS, CONSOLE, DOOR, initialState, distance, inspectConsole,
    triggerMonster, nearestLocker, enterLocker, leaveLocker, stepEnemy, repairDoor,
    canMove, tryFinish, getInteraction, objective });
});
