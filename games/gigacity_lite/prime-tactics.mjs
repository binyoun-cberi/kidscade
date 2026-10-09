// Pure tactical geometry used by enemy movement, HUD and regression tests.
export const FIGHTER_TYPES = Object.freeze({
  scout: Object.freeze({ name: '정찰기', speed: 57, flank: 25, sweep: 39, sweepHz: .62, damage: 5, attackCycle: 11.5, warning: 2.1, hull: 1.0 }),
  armor: Object.freeze({ name: '장갑기', speed: 33, flank: 21, sweep: 16, sweepHz: .22, damage: 6, attackCycle: 12.5, warning: 2.4, hull: 1.25 }),
  interceptor: Object.freeze({ name: '요격기', speed: 66, flank: 47, sweep: 65, sweepHz: .90, damage: 7, attackCycle: 9.8, warning: 2.0, hull: .92 }),
  command: Object.freeze({ name: '지휘 전함', speed: 28, flank: 34, sweep: 25, sweepHz: .20, damage: 9, attackCycle: 14.0, warning: 2.8, hull: 1.6 })
});
export function fighterType(number) {
  if ([84,105].includes(number)) return 'command';
  if ([8,12,49,64].includes(number)) return 'armor';
  if ([21,35,30].includes(number)) return 'interceptor';
  return 'scout';
}
export function fighterSpec(number) { return FIGHTER_TYPES[fighterType(number)]; }

// Local -Z is forward; positive screen X is to the pilot's right.
export function relativeContact(player, heading, enemy, range = 180) {
  const dx = enemy.x - player.x, dz = enemy.z - player.z;
  const c = Math.cos(heading), s = Math.sin(heading);
  const right = dx * c - dz * s;
  const forward = -dx * s - dz * c;
  const distance = Math.hypot(dx, dz);
  const bearing = Math.atan2(right, forward);
  return {
    x: Math.max(-1, Math.min(1, right / range)),
    y: Math.max(-1, Math.min(1, -forward / range)),
    bearing, distance,
    behind: forward < -5,
    close: distance < 80
  };
}
// Keep an enemy behind or on a flanking route. This is not a hardcoded
// obstacle-ignoring teleport: Three.js moves the ship via collisions.
export function pursuitSlot(player, heading, elapsed, id, order, type, pilotSpeed = 34) {
  const spec = FIGHTER_TYPES[type] || FIGHTER_TYPES.scout;
  const sine = Math.sin(elapsed * spec.sweepHz + id * 1.37);
  const right = (order % 2 ? -1 : 1) * (spec.flank + order * 7);
  const behind = -(42 + order * 10) + spec.sweep * sine;
  return {
    x: player.x + Math.cos(heading) * right - Math.sin(heading) * behind,
    z: player.z - Math.sin(heading) * right - Math.cos(heading) * behind,
    y: player.y + 5 + Math.sin(elapsed * 1.2 + id) * 3,
    // Even a heavy gunship can close the gap at cruising speed. Boost may outrun it.
    speed: Math.max(spec.speed, Math.min(88, Math.max(0, pilotSpeed) + 12))
  };
}
export function damageStage(divisions, total) {
  return Math.max(0, Math.min(1, divisions / Math.max(1, total)));
}
