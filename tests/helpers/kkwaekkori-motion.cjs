'use strict';
// Compare one resident across frames. A different resident, a pose change or
// simulation-only movement must never count as movement in the rendered world.
function findWalkingDelivery(before, after) {
  if (!before || !after || !(after.time > before.time)) return null;
  const initial = new Map(before.residents.map(person => [person.id, person]));
  return after.residents.find(person => {
    const start = initial.get(person.id);
    if (!start || person.state !== 'walking') return false;
    const points = [start.rendered, person.rendered, person.simulated];
    if (!points.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) return false;
    return Math.hypot(person.rendered[0] - start.rendered[0], person.rendered[1] - start.rendered[1]) > .03 &&
      Math.hypot(person.rendered[0] - person.simulated[0], person.rendered[1] - person.simulated[1]) < .001;
  }) || null;
}
module.exports = { findWalkingDelivery };
