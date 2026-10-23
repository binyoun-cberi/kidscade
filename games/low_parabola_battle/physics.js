/* Shared deterministic projectile physics. Coordinates: canvas pixels, +y downward. */
((root, factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ParabolaPhysics = api;
})(typeof window !== 'undefined' ? window : null, () => {
  'use strict';
  const WIDTH = 1200, HEIGHT = 650, GRAVITY = 330, STEP = 1 / 120;
  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
  const speedForPower = power => 170 + clamp(power, 10, 100) * 4.4;
  function terrainY(knots, x) {
    if (!Array.isArray(knots) || knots.length < 2) throw new Error('Terrain requires knots');
    if (x <= knots[0][0]) return knots[0][1];
    for (let i = 1; i < knots.length; i += 1) {
      if (x <= knots[i][0]) {
        const [ax, ay] = knots[i - 1], [bx, by] = knots[i];
        return ay + (by - ay) * (x - ax) / (bx - ax);
      }
    }
    return knots[knots.length - 1][1];
  }
  function launch(origin, angle, power, direction = 1, wind = 0) {
    const radians = clamp(angle, 5, 85) * Math.PI / 180;
    const speed = speedForPower(power);
    return { x: origin.x, y: origin.y, vx: direction * Math.cos(radians) * speed, vy: -Math.sin(radians) * speed, wind };
  }
  function at(shot, t) {
    return { x: shot.x + shot.vx * t + 0.5 * shot.wind * t * t,
      y: shot.y + shot.vy * t + 0.5 * GRAVITY * t * t };
  }
  function nearestHit(point, targets, radius = 19) {
    return targets.findIndex(target => !target.disabled &&
      Math.hypot(point.x - target.x, point.y - target.y) <= radius + (target.radius || 18));
  }
  function trace({ shot, knots, targets = [], maxTime = 12, step = STEP, onStep }) {
    const points = [{ x: shot.x, y: shot.y }];
    let previous = points[0];
    const total = Math.ceil(maxTime / step);
    for (let i = 1; i <= total; i += 1) {
      const t = i * step;
      const point = at(shot, t);
      points.push(point);
      if (onStep) onStep(point, t);
      const targetIndex = nearestHit(point, targets);
      if (targetIndex !== -1) return { kind: 'target', targetIndex, point, points, time: t };
      if (point.y >= terrainY(knots, point.x) - 3) {
        /* Linear interpolation approximates the impact inside the time step. */
        const lastGap = previous.y - terrainY(knots, previous.x) + 3;
        const gap = point.y - terrainY(knots, point.x) + 3;
        const ratio = clamp(-lastGap / Math.max(0.000001, gap - lastGap), 0, 1);
        const impact = { x: previous.x + (point.x - previous.x) * ratio,
          y: previous.y + (point.y - previous.y) * ratio };
        points[points.length - 1] = impact;
        return { kind: 'ground', point: impact, points, time: t };
      }
      if (point.x < -30 || point.x > WIDTH + 30 || point.y > HEIGHT + 30) {
        return { kind: 'out', point, points, time: t };
      }
      previous = point;
    }
    return { kind: 'timeout', point: points[points.length - 1], points, time: maxTime };
  }
  function shortestLandingDistance(shot, knots, target) {
    const hit = trace({ shot, knots, targets: [target] });
    return { ...hit, distance: hit.kind === 'target' ? 0 :
      Math.hypot(hit.point.x - target.x, hit.point.y - target.y) };
  }
  function chooseAiShot({ origin, direction, wind, knots, target, difficulty = 'easy' }) {
    let best = null;
    for (let angle = 10; angle <= 80; angle += 2) {
      for (let power = 25; power <= 100; power += 2) {
        const shot = launch(origin, angle, power, direction, wind);
        const result = shortestLandingDistance(shot, knots, target);
        const score = result.distance + (result.kind === 'target' ? -60 : 0);
        if (!best || score < best.score) best = { angle, power, score };
      }
    }
    if (!best) return { angle: 45, power: 75 };
    const inaccuracy = difficulty === 'hard' ? 1 : difficulty === 'normal' ? 3 : 5;
    return {
      angle: clamp(Math.round(best.angle + (Math.random() - 0.5) * inaccuracy), 5, 85),
      power: clamp(Math.round(best.power + (Math.random() - 0.5) * inaccuracy * 2), 10, 100)
    };
  }
  return { WIDTH, HEIGHT, GRAVITY, STEP, clamp, terrainY, speedForPower, launch, at,
    nearestHit, trace, shortestLandingDistance, chooseAiShot };
});
