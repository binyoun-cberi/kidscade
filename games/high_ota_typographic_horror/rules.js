/* O T A — deterministic world rules. No DOM/Three.js dependency. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.OtaRules = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  const LOCKERS = Object.freeze([{ x: 2.36, z: -22.4 }, { x: -2.36, z: -11.0 }]);
  const CONSOLE = Object.freeze({ x: -2.1, z: 2.0 });
  const CORRIDOR = Object.freeze({ x: 0, z: -25.0 });
  const DOOR = Object.freeze({ x: 0, z: -29.0 });
  const ECHO_PERIOD = 9.5;
  function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  function initialState() {
    return { stage: 'console', corridorFixed: false, doorFixed: false,
      hidden: false, hidingSeconds: 0,
      monster: { x: 0, z: -7.5, active: false },
      echo: { timer: 0, active: false, alert: 0 },
      mistakes: 0, hideCount: 0, finished: false, losses: 0, time: 0 };
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
    if (!s.hidden || s.stage !== 'distortion') return false;
    s.hidden = false; return true;
  }
  function stepEnemy(s, dt, p) {
    dt = Math.min(.1, Math.max(0, dt));
    if (s.stage === 'hiding') {
      s.hidingSeconds += dt;
      const target = { x: p.x, z: p.z - 5.2 };
      const dx = target.x - s.monster.x, dz = target.z - s.monster.z;
      const d = Math.hypot(dx, dz);
      if (d > .01) {
        const step = Math.min(d, 4.0 * dt);
        s.monster.x += dx / d * step; s.monster.z += dz / d * step;
      }
      if (s.hidingSeconds >= 4.5) {
        s.stage = 'distortion'; s.monster.active = false;
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
  function repairCorridor(s, word, p) {
    if (s.stage !== 'distortion' || s.hidden || distance(p, CORRIDOR) > 2.4) return false;
    if (word !== '통로') { s.mistakes++; return false; }
    s.corridorFixed = true;
    s.echo.timer = 0;
    s.echo.active = false;
    s.stage = 'door'; return true;
  }
  // A separate threat: the word "뒤" listens for running, not for footsteps while walking.
  // Unlike the pursuer, this threat can be survived by slowing down or standing still.
  function stepEcho(s, dt, movement) {
    dt = Math.min(.1, Math.max(0, dt));
    if (s.stage !== 'door' && s.stage !== 'exit') return false;
    s.echo.timer += dt;
    const cycle = s.echo.timer % ECHO_PERIOD;
    s.echo.active = cycle >= .65 && cycle < 4.35;
    const sprinting = Boolean(movement && movement.moving && movement.running);
    const change = s.echo.active && sprinting ? 38 * dt : -29 * dt;
    s.echo.alert = Math.max(0, Math.min(100, s.echo.alert + change));
    if (s.echo.alert >= 100) {
      s.echo.active = false; s.stage = 'lost'; s.losses++; return true;
    }
    return s.echo.active;
  }
  function repairDoor(s, word, p) {
    if (s.stage !== 'door' || s.hidden || distance(p, DOOR) > 2.45) return false;
    if (word !== '문') {
      s.mistakes++;
      s.echo.alert = Math.min(96, s.echo.alert + 12);
      return false;
    }
    s.doorFixed = true; s.stage = 'exit'; return true;
  }
  function canMove(s, x, z) {
    if (x < -3.03 || x > 3.03 || z > 6.45 || z < -37.4) return false;
    if (Math.abs(x + 2.15) < 1.12 && Math.abs(z - 2.04) < .94) return false;
    if (LOCKERS.some(loc => Math.abs(z - loc.z) < .72 &&
        (loc.x > 0 ? x > 2.67 : x < -2.67))) return false;
    if (Math.abs(z + 25.85) < .37 && (!s.corridorFixed || Math.abs(x) > 1.22)) return false;
    if (Math.abs(z + 30.15) < .36 && (!s.doorFixed || Math.abs(x) > 1.18)) return false;
    return true;
  }
  function tryFinish(s, p) {
    if (s.stage !== 'exit' || !s.corridorFixed || !s.doorFixed || p.z > -35.0) return false;
    s.stage = 'won'; s.finished = true; s.echo.active = false; return true;
  }
  function getInteraction(s, p) {
    if (s.stage === 'console' && distance(p, CONSOLE) <= 2.3)
      return { type: 'console', label: '기록 읽기' };
    if (s.hidden && s.stage === 'distortion')
      return { type: 'leave', label: '사물함에서 나오기' };
    if (s.stage === 'chase' && nearestLocker(p).distance <= 1.65)
      return { type: 'hide', label: '사물함에 숨기' };
    if (s.stage === 'distortion' && !s.hidden && distance(p, CORRIDOR) <= 2.4)
      return { type: 'corridor', label: '무너진 통로 고치기' };
    if (s.stage === 'door' && !s.hidden && distance(p, DOOR) <= 2.45)
      return { type: 'repair', label: '출구 이름 고치기' };
    return null;
  }
  function objective(s) {
    return ({
      console: '관리실 컴퓨터의 기록을 확인하세요',
      anomaly: '복도 안쪽으로 이동해 이상한 「사람」을 확인하세요',
      chase: '달려서 사물함 안에 숨으세요',
      hiding: '소리가 사라질 때까지 기다리세요',
      distortion: s.hidden ? '밖이 조용해졌어요. 사물함에서 나오세요'
        : '복도의 틀린 이름을 고쳐 통로를 여세요',
      door: '빨간 「뒤」가 보이면 달리지 말고 출구로 가세요',
      exit: '뒤에서 부르면 멈추고, 출구를 통과하세요',
      won: '이름을 지켰습니다',
      lost: '이름을 빼앗겼습니다'
    })[s.stage] || '';
  }
  return Object.freeze({ LOCKERS, CONSOLE, CORRIDOR, DOOR, ECHO_PERIOD,
    initialState, distance, inspectConsole, triggerMonster, nearestLocker,
    enterLocker, leaveLocker, stepEnemy, stepEcho, repairCorridor, repairDoor,
    canMove, tryFinish, getInteraction, objective });
});
