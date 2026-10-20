'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../games/high_ota_typographic_horror/maze.js');

const bits=[1,2,4,8];

test('13×13 maze is reproducible, connected and materially longer than the old corridor',()=>{
  const layouts=new Set();
  for(let seed=0;seed<200;seed++){
    const maze=M.create(seed),again=M.create(seed);
    assert.deepEqual(maze,again);
    assert.equal(maze.links.length,169);
    assert.equal(new Set(maze.stations).size,3);
    assert.ok(maze.minSteps>=105,'even the optimal collection order must be a real journey');
    assert.ok(M.distances(maze.links,0).every(distance=>distance>=0));
    assert.ok(M.distances(maze.links,0)[maze.exit]>=25);
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
});