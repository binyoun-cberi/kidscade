const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../games/high-corn-maze/maze.js');

test('300 seeds produce deterministic, fully reachable mazes with consistent walls',()=>{
 let min=Infinity,max=0;
 for(let seed=1;seed<=300;seed++){
   const maze=M.generate(seed),duplicate=M.generate(seed);
   assert.deepEqual(maze,duplicate,'same seed must yield identical map');
   assert.equal(maze.links.length,maze.size*maze.size);
   const distances=M.distances(maze,maze.start);
   assert.ok(distances.every(v=>v>=0),'all cells must be connected: '+seed);
   const path=M.route(maze,maze.start,maze.exit);
   min=Math.min(min,path.length-1);max=Math.max(max,path.length-1);
   assert.ok(path.length-1>=85&&path.length-1<=145,'balanced shortest path: '+seed);
   const er=Math.floor(maze.exit/maze.size),ec=maze.exit%maze.size;
   assert.ok(er===maze.size-1||ec===maze.size-1,'exit must be on opposite perimeter: '+seed);
   assert.ok(er+ec>=maze.size-1,'exit cannot be beside entrance: '+seed);
   assert.notEqual(maze.exit,maze.size*maze.size-1,'two-way corner exits are ambiguous');
   assert.ok(maze.metrics.turnRatio<=.68,'too many rapid turns: '+seed);
   assert.ok(maze.metrics.maxTurnStreak<=12,'uninterrupted zigzag: '+seed);
   assert.ok(maze.metrics.generationAttempts>=1&&maze.metrics.generationAttempts<=192);
   const onRoute=new Set(path);
   assert.equal(maze.stations.filter(cell=>!onRoute.has(cell)).length,1,'one map requires a detour: '+seed);
   assert.equal(maze.landmarks.filter(place=>!onRoute.has(place.cell)).length,2,'some clues must reward exploration: '+seed);
   assert.equal(new Set(maze.stations).size,maze.stations.length);
   assert.equal(new Set(maze.landmarks.map(place=>place.cell)).size,maze.landmarks.length);
   assert.ok(maze.stations.every(cell=>cell>=0&&cell<maze.links.length));
   assert.ok(maze.landmarks.every(place=>place.cell>=0&&place.cell<maze.links.length));
   for(let i=0;i<maze.links.length;i++)for(let dir=0;dir<4;dir++)if(maze.links[i]&(1<<dir)){
     const other=M.neighbor(i,dir,maze.size);
     assert.ok(other>=0);
     assert.ok(maze.links[other]&(1<<((dir+2)%4)),'all openings reciprocal');
   }
 }
 assert.ok(min>=45&&max<400);
});
test('open corridors are traversable and closed edges are solid',()=>{
 for(let seed=1;seed<=20;seed++){
   const maze=M.generate(seed);
   for(let i=0;i<maze.links.length;i++){
     const p=M.center(maze,i);
     assert.equal(M.current(maze,p.x,p.z),i);
     assert.equal(M.canStand(maze,p.x,p.z),true);
     for(let dir=0;dir<4;dir++){
       const other=M.neighbor(i,dir,maze.size);
       if(other<0)continue;
       const q=M.center(maze,other),dx=q.x-p.x,dz=q.z-p.z;
       if(maze.links[i]&(1<<dir)){
         for(let s=0;s<=15;s++){const f=s/15;assert.equal(M.canStand(maze,p.x+dx*f,p.z+dz*f),true,'open passage '+seed+' '+i+' '+dir);}
       }else{
         assert.equal(M.canStand(maze,p.x+dx*.49,p.z+dz*.49),false,'closed wall '+seed+' '+i+' '+dir);
       }
     }
   }
 }
});
test('explore mode never spawns a monster',()=>{
 const m=M.generate(73),player=M.center(m,0),h=M.createHunter(m,'explore');
 for(let i=0;i<1000;i++)assert.equal(M.stepHunter(m,h,.08,player).phase,'disabled');
 assert.equal(h.encounters,0);
});
test('hunter warns, chases, moves through corridors, and catches only when close',()=>{
 const m=M.generate(84),p=M.center(m,0),h=M.createHunter(m);
 h.timer=.01;M.stepHunter(m,h,.05,p);
 assert.equal(h.phase,'warning');assert.ok(h.encounters>0);
 for(let i=0;i<45;i++)M.stepHunter(m,h,.08,p);
 assert.equal(h.phase,'chase');
 assert.ok(M.current(m,h.x,h.z)>=0);
 assert.equal(M.canStand(m,h.x,h.z,.34),true);
 h.x=p.x;h.z=p.z;h.elapsed=3;
 const last=M.stepHunter(m,h,.04,p);
 assert.equal(last.caught,true);assert.equal(h.phase,'waiting');assert.equal(h.caught,1);
});
test('map interaction can be derived from the same geometry as world collision',()=>{
 const m=M.generate(130),east=M.neighbor(0,1,m.size),south=M.neighbor(0,2,m.size);
 for(const i of [east,south].filter(i=>i>=0)){
   const a=M.center(m,0),b=M.center(m,i);
   const open=!!(m.links[0]&(a.x!==b.x?2:4));
   assert.equal(M.canStand(m,a.x+(b.x-a.x)*.49,a.z+(b.z-a.z)*.49),open);
 }
});

test('first map is at the entrance; later maps are meaningfully separated but findable',()=>{
 for(let seed=1;seed<=100;seed++){
  const maze=M.generate(seed),main=M.route(maze,maze.start,maze.exit);
  assert.equal(maze.stations[0],maze.start);
  assert.equal(maze.stations.length,4);
  const positions=[0,1,3].map(i=>main.indexOf(maze.stations[i]));
  assert.ok(positions[1]>8&&positions[2]>positions[1]+8,'maps on main route must be spaced apart');
  assert.equal(main.includes(maze.stations[2]),false,'one side-branch map');
  const sideAnchor=main[Math.floor((main.length-1)*.60)];
  const hop=M.distances(maze,sideAnchor)[maze.stations[2]];
  assert.ok(hop>=2&&hop<=4,'detour map must remain nearby');
  for(const index of [1,3]){
    const anchor=main[Math.floor((main.length-1)*[.14,.38,.64,.77][index])];
    const d=M.distances(maze,anchor)[maze.landmarks[index].cell];
    assert.ok(d>=2&&d<=4,'landmark detour must be fair');
  }
 }
});
test('known nonsensical mazes are rejected and regenerated deterministically',()=>{
 for(const seed of [139,304,394,447,626,832,1013,1246,20261110]){
  const maze=M.generate(seed),repeat=M.generate(seed);
  assert.deepEqual(maze,repeat,'seed '+seed+' must be repeatable');
  const row=Math.floor(maze.exit/maze.size),col=maze.exit%maze.size;
  assert.ok(row===maze.size-1||col===maze.size-1,'opposite edge for '+seed);
  assert.ok(M.route(maze,maze.start,maze.exit).length-1>=85,'nontrivial route for '+seed);
  assert.ok(maze.metrics.turnRatio<=.68,'no unreasonable wiggle route for '+seed);
 }
});
test('cornfield exit opening is kept clear in the actual Three.js renderer',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const game=fs.readFileSync(path.join(__dirname,'../games/high-corn-maze/game.js'),'utf8');
 assert.match(game,/i===m\.exit&&col===S-1/);
 assert.match(game,/i===m\.exit&&row===S-1/);
 assert.match(game,/gate\.rotation\.y=/);
});

test('First-person renderer imports only available vendored loaders and existing corn assets',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const game=fs.readFileSync(path.join(root,'games/high-corn-maze/game.js'),'utf8');
 assert.match(game,/FBXLoader/);
 assert.doesNotMatch(game,/OBJLoader/);
 for(const rel of ['assets/vendor/three-r160/addons/loaders/FBXLoader.js','assets/vendor/three-r160/addons/loaders/GLTFLoader.js','assets/game/crops/FBX/Corn_4.fbx','assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost.glb']){
  assert.ok(fs.existsSync(path.join(root,rel)),'missing dependency '+rel);
 }
});
