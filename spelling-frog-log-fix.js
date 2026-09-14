(() => {
  'use strict';

  // This script is loaded after Spelling Frog's original game script.
  // The game already moves logs every frame, but originally left the frog
  // behind. Wrap the existing object updater and carry the frog by the same
  // per-frame delta while it is standing on a log.
  if (typeof animateObjects !== 'function') return;

  const originalAnimateObjects = animateObjects;

  animateObjects = function patchedAnimateObjects(dt, time) {
    try {
      const river = running && !deathLock && !hopping && frog && world.get(frogRow)?.type === 'river';
      if (river) {
        const ridingLog = logs.find(log =>
          log.row === frogRow &&
          Math.abs(log.mesh.position.x - frog.position.x) < log.width / 2 + 0.32
        );

        if (ridingLog) {
          const dx = ridingLog.speed * dt * 60;
          const nextLogX = ridingLog.mesh.position.x + dx;
          const willWrap = nextLogX > ridingLog.wrap / 2 || nextLogX < -ridingLog.wrap / 2;

          // Normal riding: preserve the frog's relative position on the log.
          // When the log wraps off-screen, do not teleport the frog with it;
          // the original water check will correctly make the frog fall in.
          if (!willWrap) {
            frog.position.x += dx;
            frogCol = clamp(Math.round(frog.position.x / TILE + HALF), 0, COLS - 1);
            if (shadowDisc) shadowDisc.position.x = frog.position.x;
          }
        }
      }
    } catch (error) {
      console.warn('[Spelling Frog] moving-log rider patch skipped a frame:', error);
    }

    return originalAnimateObjects(dt, time);
  };
})();
