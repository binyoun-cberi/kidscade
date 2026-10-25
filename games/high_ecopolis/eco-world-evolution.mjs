// Living landscape timing inspired by Hexkingdom's evolution/construction systems.
// Hexkingdom: Copyright (c) 2026 Aleksandr (Leks2000), MIT License.
// Original Ecopolis implementation; no Hexkingdom source is copied into this file.
const GROWABLE = new Set(['forest', 'wetland', 'meadow']);
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function habitatMaturity(tile) {
  if (!GROWABLE.has(tile?.biome)) return 1;
  // Pre-v11 save files did not track maturity. Treat old restored land as established.
  return tile.growth == null ? 1 : clamp(tile.growth);
}

export function habitatTier(tile, vigor = 1) {
  const score = habitatMaturity(tile) * clamp(vigor);
  return score >= .75 ? 2 : score >= .32 ? 1 : 0;
}

export function effectiveHabitatArea(tiles, biome) {
  return tiles.reduce((sum, tile) => {
    if (tile.kind !== 'land' || tile.biome !== biome || tile.pollution >= .55) return sum;
    // Seedlings offer some shelter without instantly providing mature-habitat benefits.
    return sum + .12 + .88 * habitatMaturity(tile);
  }, 0);
}

export function advanceHabitatGrowth(tile, habitatStress = 0, waterStress = 0) {
  if (!GROWABLE.has(tile?.biome)) return false;
  const before = habitatMaturity(tile);
  const pressure = clamp((tile.biome === 'wetland' ? waterStress : habitatStress) / 125);
  const polluted = tile.pollution > .4;
  const delta = polluted ? -.065 * (1 + pressure) : .11 * (1 - pressure * .7) * (1 - clamp(tile.pollution) * .55);
  tile.growth = clamp(before + delta);
  return Math.abs(tile.growth - before) > .0001;
}

export function constructionVisualAt(elapsed) {
  const t = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const done = t >= 1.8;
  const phase = t < .35 ? 0 : t < .85 ? 1 : t < 1.5 ? 2 : 3;
  const progress = clamp((t - .32) / 1.25);
  const eased = 1 - Math.pow(1 - progress, 3);
  const pop = .04 * Math.sin(Math.PI * progress);
  return {
    phase,
    scaleY: phase === 0 ? .015 : Math.max(.025, eased + pop),
    scaleXZ: phase === 0 ? .015 : .78 + .22 * eased + pop,
    foundationOpacity: phase === 0 ? .8 : Math.max(0, .8 * (1 - progress)),
    done
  };
}

export function findArrivalRoutes(entries, goals, centerAccess, neighbors, pickIndex = () => 0) {
  const centers = new Set(centerAccess),routes = [];
  if(!centers.size) return routes;
  for (const entry of entries) {
    const queue=[entry],previous=new Map([[entry,null]]);
    for(let i=0;i<queue.length;i++){
      for(const next of neighbors(queue[i])){
        if(previous.has(next))continue;
        previous.set(next,queue[i]);queue.push(next);
      }
    }
    if(![...centers].some(tile=>previous.has(tile)))continue;
    const targets=goals.filter(tile=>tile!==entry&&previous.has(tile));
    if(!targets.length)continue;
    const selected=Math.min(targets.length-1,Math.max(0,Math.floor(pickIndex(targets.length))));
    const route=[];
    for(let tile=targets[selected];tile&&tile!==entry;tile=previous.get(tile))route.push(tile);
    route.reverse();routes.push({start:entry,path:route});
  }
  return routes;
}
