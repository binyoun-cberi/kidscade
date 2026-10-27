'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../games/high_ota_typographic_horror/maze.js');

const bits=[1,2,4,8];

test('9×9 maze stays connected, varied and comfortably solvable across 200 seeds',()=>{
  const layouts=new Set();
  for(let seed=0;seed<200;seed++){
    const maze=M.create(seed),again=M.create(seed);
    assert.deepEqual(maze,again);
    assert.equal(maze.links.length,81);
    assert.equal(new Set(maze.stations).size,3);
    assert.ok(maze.minSteps>=35&&maze.minSteps<=65,'three spelling stations and exit must take a manageable route');
    assert.ok(M.distances(maze.links,0).every(distance=>distance>=0));
    assert.ok(M.distances(maze.links,0)[maze.exit]>=12);
    layouts.add(maze.links.join(','));
  }
  assert.ok(layouts.size===200,'a fresh run must change actual wall connectivity');
});

test('visible walls and collision passages agree on all edges and all start cells',()=>{
  for(let seed=0;seed<45;seed++){
    const maze=M.create(seed);
    for(let i=0;i<M.COUNT;i++){
      const from=M.center(i);
      assert.equal(M.canMove(maze,from.x,from.z),true);
      for(let dir=0;dir<4;dir++){
        const next=M.neighbor(i,dir);
        if(next<0)continue;
        const to=M.center(next);
        const isOpen=Boolean(maze.links[i]&bits[dir]);
        const midX=(from.x+to.x)/2,midZ=(from.z+to.z)/2;
        assert.equal(M.canMove(maze,midX,midZ),isOpen,
          'the physical wall must match the topology at '+i+' / '+dir);
        assert.equal(Boolean(maze.links[next]&bits[(dir+2)%4]),isOpen,
          'both sides of one wall agree');
      }
    }
  }
  assert.equal(M.canMove(M.create(1),1000,-1000),false);
});

test('old 13×13 checkpoints preserve solved words without carrying over explored cells',()=>{
  const maze=M.create(42);
  const explored=Array(169).fill(true);
  const legacy={v:1,seed:42,solved:[true,false,true],visited:explored,wrong:2};
  assert.equal(M.restore(maze,legacy),true);
  assert.deepEqual(maze.solved,[true,false,true]);
  assert.equal(maze.wrong,2);
  assert.equal(maze.visited.filter(Boolean).length,1);
  assert.equal(M.snapshot(maze).v,2);
});

test('three distant spelling stations unlock the exit, checkpoint keeps progress',()=>{
  const maze=M.create(42),clone=M.create(42);
  assert.equal(M.action(maze,M.center(maze.exit)).type,'mazeLocked');
  for(let i=0;i<3;i++){
    const where=M.center(maze.stations[i]);
    assert.equal(M.action(maze,where).type,'mazeWord');
    assert.equal(M.solve(maze,i,maze.words[i].wrong),false);
    assert.equal(M.solve(maze,i,maze.words[i].answer),true);
    M.enter(maze,where);
  }
  assert.equal(M.action(maze,M.center(maze.exit)).type,'mazeExit');
  const progress=M.snapshot(maze);
  assert.equal(M.restore(clone,progress),true);
  assert.deepEqual(M.snapshot(clone),progress);
  assert.equal(M.action(clone,M.center(clone.exit)).type,'mazeExit');
  assert.equal(M.restore(M.create(43),progress),false);
});

test('maze is wired to game startup, movement, hints and the existing completion flow',()=>{
  const dir=path.join(__dirname,'../games/high_ota_typographic_horror');
  const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert.match(html,/<script src="maze\.js"><\/script>/);
  assert.match(html,/id="mazeMap"/);
  assert.match(game,/M\.canMove\(maze,x,z\)/);
  assert.match(game,/state\.stage='maze'/);
  assert.match(game,/M\.action\(maze,player\)/);
  assert.match(game,/type==='maze'\?M\.solve/);
  assert.match(game,/type==='mazeExit'/);
  assert.match(game,/state\.stage==='maze'\?M\.hint/);
  assert.match(game,/M\.stepHunter\(maze,mazeHunter,dt,player\)/);
});
test('maze entry faces an open corridor; hints consistently distinguish north and south',()=>{
  for(let seed=0;seed<320;seed++){
    const maze=M.create(seed),start=M.center(0),yaw=M.entryYaw(maze);
    assert.ok(M.canMove(maze,start.x-Math.sin(yaw)*M.CELL*.6,
      start.z-Math.cos(yaw)*M.CELL*.6),'entry must not look at a sealed wall');
    for(let station=0;station<3;station++){
      const goal=M.center(maze.stations[station]),dx=goal.x-start.x,dz=goal.z-start.z;
      const direction=Math.abs(dx)>Math.abs(dz)?(dx>0?'동쪽':'서쪽'):(dz>0?'북쪽':'남쪽');
      assert.match(M.hint(maze,start,2),new RegExp(direction),'2nd hint must use world-z orientation');
      maze.solved[station]=true;
    }
  }
});

test('pathfinding hunter enters only through open maze walls, catches fairly, preserves solved stations',()=>{
  let collisions=0,catches=0,warnings=0;
  for(let seed=0;seed<90;seed++){
    const maze=M.create(seed),hunter=M.createHunter(maze),player=M.center(0);
    assert.equal(hunter.phase,'quiet');
    maze.solved[0]=true;
    const saved=M.snapshot(maze);
    for(let frame=0;frame<480;frame++){
      const report=M.stepHunter(maze,hunter,.1,player);
      if(report.phase==='warning')warnings++;
      if(!M.canMove(maze,hunter.x,hunter.z))collisions++;
      if(report.caught){
        catches++;
        const shelter=M.nearestSafeCell(maze,player);
        assert.ok(shelter===0||maze.stations.includes(shelter));
        assert.equal(maze.solved[0],true,'capture never undoes a corrected word');
        assert.deepEqual(M.snapshot(maze),saved,'capture never erases explored rooms');
        break;
      }
    }
  }
  assert.equal(collisions,0);
  assert.equal(catches,90,'stationary player should eventually be caught');
  assert.ok(warnings>=90,'every hunt has an audible warning phase');
});
