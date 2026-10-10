/* 꼴뚜기 게임: deterministic, self-avoiding path generation (browser + node tests). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SquidPath = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const FIRST_TEN = [
    [9,5,12,15,5],[11,5,16,20,7],[13,6,21,25,9],
    [15,6,25,30,11],[18,7,30,36,14],[21,7,35,42,16],
    [24,8,42,50,19],[28,8,50,60,23],[32,9,59,70,27],
    [36,9,68,80,31]
  ];
  const DIRS = [[1,0],[0,-1],[0,1],[-1,0]];
  function specs(stage) {
    stage = Math.max(1, Math.floor(Number(stage) || 1));
    if (stage <= 10) {
      const [width,height,minCells,maxCells,minTurns] = FIRST_TEN[stage - 1];
      return { stage,width,height,minCells,maxCells,minTurns,maxStraight:stage <= 3 ? 4 : 5,requireLeft:stage >= 3 };
    }
    const beyond = stage - 10;
    return {
      stage,width:36 + beyond * 4,height:9 + Math.min(3,Math.floor(beyond / 5)),
      minCells:68 + beyond * 8,maxCells:80 + beyond * 9,
      minTurns:31 + beyond * 4,maxStraight:5,requireLeft:true
    };
  }
  function rngFor(seed) {
    let value = (Number(seed) || 1) >>> 0;
    return function () {
      value = (Math.imul(value,1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }
  function countTurns(path,width) {
    let previous = null, turns = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = (path[i] % width) - (path[i - 1] % width);
      const dy = Math.floor(path[i] / width) - Math.floor(path[i - 1] / width);
      const direction = dx ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      if (previous !== null && previous !== direction) turns++;
      previous = direction;
    }
    return turns;
  }
  function validate(map) {
    const s = specs(map.stage), path = map.path;
    if (!Array.isArray(path) || path.length < s.minCells || path.length > s.maxCells) return {ok:false,reason:'length'};
    if (map.width !== s.width || map.height !== s.height || path[0] % s.width !== 0 || path.at(-1) % s.width !== s.width - 1) return {ok:false,reason:'bounds'};
    const seen = new Set(); let maxRun = 0, run = 0, last = '', wentUp = false, wentDown = false, wentLeft = false;
    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      if (!Number.isInteger(cell) || cell < 0 || cell >= s.width * s.height || seen.has(cell)) return {ok:false,reason:'repeat'};
      seen.add(cell);
      if (i > 0) {
        const dx = cell % s.width - path[i - 1] % s.width;
        const dy = Math.floor(cell / s.width) - Math.floor(path[i - 1] / s.width);
        if (Math.abs(dx) + Math.abs(dy) !== 1) return {ok:false,reason:'nonadjacent'};
        const dir = dx ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
        if (dir === 'U') wentUp = true;
        if (dir === 'D') wentDown = true;
        if (dir === 'L') wentLeft = true;
        run = dir === last ? run + 1 : 1; maxRun = Math.max(maxRun,run); last = dir;
      }
    }
    const turns = countTurns(path,s.width);
    if (turns < s.minTurns || maxRun > s.maxStraight || !wentUp || !wentDown || (s.requireLeft && !wentLeft)) return {ok:false,reason:'complexity'};
    return {ok:true,turns,length:path.length,maxRun,wentLeft};
  }
  function generate(stage,seed) {
    const s = specs(stage), rand = rngFor(seed), total = s.width * s.height;
    for (let attempt = 0; attempt < 50; attempt++) {
      const startY = Math.max(0,Math.min(s.height - 1,Math.floor(s.height/2) + Math.floor(rand() * 3) - 1));
      const visited = new Uint8Array(total), path = [startY * s.width], directions = [];
      const target = s.minCells + Math.floor(rand() * (s.maxCells - s.minCells + 1));
      let operations = 0;
      visited[path[0]] = 1;
      function search(x,y,turns,wentLeft,straight) {
        operations++;
        const left = target - path.length;
        if (x === s.width - 1 && path.length >= s.minCells && turns >= s.minTurns &&
            (!s.requireLeft || wentLeft) && directions.includes(1) && directions.includes(2)) return true;
        if (!left || operations > 100000 || x + left < s.width - 1 || turns + left < s.minTurns) return false;
        const prev = directions.length ? directions[directions.length - 1] : -1;
        const choices = [];
        for (let d = 0; d < DIRS.length; d++) {
          const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (nx < 0 || nx >= s.width || ny < 0 || ny >= s.height) continue;
          const at = ny * s.width + nx, newTurns = turns + (prev >= 0 && d !== prev ? 1 : 0);
          if (visited[at] || (d === prev && straight >= s.maxStraight)) continue;
          if (nx === s.width - 1 && (path.length + 1 < s.minCells || newTurns < s.minTurns ||
              (s.requireLeft && !wentLeft && d !== 3))) continue;
          if (nx + left - 1 < s.width - 1 || newTurns + left - 1 < s.minTurns) continue;
          let weight = (d === 0 ? 3 : d === 3 ? -5 : 1) + (prev !== d ? 2 : -.5) +
                       (nx === s.width - 1 ? 6 : 0) + rand() * 6;
          if (s.requireLeft && !wentLeft && d === 3) weight += 12;
          if (s.requireLeft && !wentLeft && d === 0 && x > s.width / 2) weight -= 3;
          if (d === 0 && x > s.width - Math.max(4,Math.floor((left - 1) * 1.3))) weight -= 2;
          choices.push({d,nx,ny,at,newTurns,weight});
        }
        choices.sort((a,b) => b.weight - a.weight);
        for (const c of choices) {
          visited[c.at] = 1; path.push(c.at); directions.push(c.d);
          if (search(c.nx,c.ny,c.newTurns,wentLeft || c.d === 3,c.d === prev ? straight + 1 : 1)) return true;
          directions.pop(); path.pop(); visited[c.at] = 0;
          if (operations > 100000) return false;
        }
        return false;
      }
      if (search(0,startY,0,false,0)) {
        const map = {stage:s.stage,width:s.width,height:s.height,path:path.slice(),seed:seed >>> 0};
        if (validate(map).ok) return map;
      }
    }
    // A caller may retry with a fresh seed. Never return an easier invalid level.
    throw new Error('Failed to generate a path satisfying stage ' + stage);
  }
  return {specs,generate,validate,countTurns};
});
