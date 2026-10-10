const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/high_ota_typographic_horror/chapter3.js');
const R=require('../games/high_ota_typographic_horror/rules.js');
function start(){
 const s=R.initialState();
 R.inspectConsole(s,R.CONSOLE);R.triggerMonster(s,{x:0,z:-16});R.enterLocker(s,R.LOCKERS[0]);
 for(let i=0;i<100;i++)R.stepEnemy(s,.05,R.LOCKERS[0]);
 assert.equal(R.leaveLocker(s),true);
 assert.equal(R.repairCorridor(s,'통로',R.CORRIDOR),true);
 assert.equal(R.repairDoor(s,'문',R.DOOR),true);
 assert.equal(C.startChapter(s,{x:0,z:-35.3}),true);
 assert.equal(s.stage,'explore');
 return s;
}
test('chapter opens after first escape and provides a checkpoint',()=>{
 const s=start();
 assert.equal(C.objective(s),'사무실과 서고에서 기록을 찾으세요 (0/2)');
 assert.equal(C.makeCheckpoint(s).version,3);
 assert.equal(C.startChapter(s,{x:0,z:-36}),false);
});
test('the left office and right archive are distinct walkable rooms with physically bounded entrances',()=>{
 const s=start();
 assert.equal(C.canMove(s,0,-46),true);
 assert.equal(C.canMove(s,-6,-46),true);
 assert.equal(C.canMove(s,6,-46),true);
 assert.equal(C.canMove(s,3.5,-39.1),false); // around the entrance is a solid side wall
 assert.equal(C.canMove(s,-6,-53),true);
 assert.equal(C.canMove(s,-16,-46),false);
 assert.equal(C.canMove(s,16,-46),false);
 assert.equal(C.canMove(s,0,-65),true);
 assert.equal(C.canMove(s,0,-67),false);
});
test('every rendered word-furniture piece blocks walking through it',()=>{
 const s=start();
 for(const [x,z] of [[-5.8,-42.2],[-8.4,-52.7],[-13.4,-43.4],[-13.5,-52],
                      [6,-42],[6,-53],[14,-42],[14,-53]]){
   assert.equal(C.canMove(s,x,z),false,'solid word-furniture at '+x+','+z);
 }
 assert.equal(C.canMove(s,-8,-47.8),true,'main office aisle remains open');
 assert.equal(C.canMove(s,12.8,-50.9),true,'archive record is still accessible');
});
test('office word changes a real solid divider and guards its record',()=>{
 const s=start();
 assert.equal(C.canMove(s,-11,-48.5),false);
 assert.equal(C.collect(s,'office',C.OFFICE_RECORD),false);
 assert.equal(C.repairOffice(s,'문',C.OFFICE_SEAL),false);
 assert.equal(s.mistakes,1);
 assert.equal(C.repairOffice(s,'책상',{x:0,z:-46}),false);
 assert.equal(C.repairOffice(s,'책상',C.OFFICE_SEAL),true);
 assert.equal(C.canMove(s,-11,-48.5),true);
 assert.equal(C.canMove(s,-11,-51),false);
 assert.equal(C.collect(s,'office',C.OFFICE_RECORD),true);
 assert.equal(C.collect(s,'office',C.OFFICE_RECORD),false);
 assert.equal(C.objective(s),'사무실과 서고에서 기록을 찾으세요 (1/2)');
});
test('archive record is guarded by location rather than answer guessing, room order remains flexible',()=>{
 const s=start();
 assert.equal(C.collect(s,'archive',{x:0,z:-51}),false);
 assert.equal(C.collect(s,'archive',C.ARCHIVE_RECORD),true);
 assert.equal(C.interaction(s,C.ARCHIVE_RECORD),null);
 assert.equal(C.repairOffice(s,'책상',C.OFFICE_SEAL),true);
 assert.equal(C.collect(s,'office',C.OFFICE_RECORD),true);
 assert.equal(C.both(s),true);
 assert.equal(C.objective(s),'두 기록을 모았습니다. 복도 끝 중앙 기록실로 가세요');
});
test('gaze increases only when watching the figure; looking away safely reduces it',()=>{
 const s=start();const p={x:10.5,z:-51};
 // yaw=pi makes camera look positive z toward the monster at -44.5
 for(let i=0;i<45;i++)C.stepWatcher(s,.05,p,Math.PI,0);
 const peak=C.ensure(s).watcher.focus;
 assert.ok(peak>45&&peak<90,'focus '+peak);
 for(let i=0;i<95;i++)C.stepWatcher(s,.05,p,0,0);
 assert.equal(C.ensure(s).watcher.focus,0);
 assert.equal(s.stage,'explore');
});
test('four seconds of uninterrupted staring wakes the watcher but allows escape by leaving the room',()=>{
 const s=start(),p={x:10.5,z:-51};
 for(let i=0;i<82;i++)C.stepWatcher(s,.05,p,Math.PI,0);
 assert.equal(C.ensure(s).watcher.awake,true);
 assert.equal(s.stage,'explore');
 for(let i=0;i<15;i++)C.stepWatcher(s,.05,{x:1,z:-47},0,0);
 assert.equal(s.stage,'explore');
 assert.equal(C.ensure(s).watcher.awake,false);
});
test('watcher can catch a player who keeps looking, but not after archive record collection',()=>{
 const s=start(),p={x:10.5,z:-51};
 for(let i=0;i<260&&s.stage==='explore';i++)C.stepWatcher(s,.05,p,Math.PI,0);
 assert.equal(s.stage,'lost');
 assert.equal(s.lossReason,'watcher');
 const safe=start();
 assert.equal(C.collect(safe,'archive',C.ARCHIVE_RECORD),true);
 for(let i=0;i<250;i++)C.stepWatcher(safe,.05,p,Math.PI,0);
 assert.equal(safe.stage,'explore');
});
test('the final door is physical and requires both records plus the correct name',()=>{
 const s=start();
 assert.equal(C.canMove(s,0,-58.65),false);
 assert.equal(C.repairFinal(s,'기억',C.FINAL_GATE),false);
 C.repairOffice(s,'책상',C.OFFICE_SEAL);C.collect(s,'office',C.OFFICE_RECORD);
 assert.equal(C.repairFinal(s,'기억',C.FINAL_GATE),false);
 C.collect(s,'archive',C.ARCHIVE_RECORD);
 assert.equal(C.interaction(s,C.FINAL_GATE).type,'final');
 assert.equal(C.repairFinal(s,'공백',C.FINAL_GATE),false);
 assert.equal(C.repairFinal(s,'기억',C.FINAL_GATE),true);
 assert.equal(C.canMove(s,0,-58.65),true);
 assert.equal(C.canMove(s,2.5,-58.65),false);
 assert.equal(C.finish(s,{x:0,z:-60}),false);
 assert.equal(C.finish(s,{x:0,z:-63.5}),true);
 assert.equal(s.stage,'won');
});
test('checkpoint restores the actual geometry and records without skipping the final puzzle',()=>{
 const s=start();
 C.repairOffice(s,'책상',C.OFFICE_SEAL);C.collect(s,'office',C.OFFICE_RECORD);
 const data=JSON.parse(JSON.stringify(C.makeCheckpoint(s)));
 const restart=R.initialState();
 assert.equal(C.restore(restart,null),false);
 assert.equal(C.restore(restart,data),true);
 assert.equal(restart.stage,'explore');
 assert.equal(restart.corridorFixed,true);
 assert.equal(restart.doorFixed,true);
 assert.equal(C.ensure(restart).records.office,true);
 assert.equal(C.ensure(restart).records.archive,false);
 assert.equal(C.canMove(restart,-11,-48.5),true);
 assert.equal(C.canMove(restart,0,-58.65),false);
 const forged={version:3,officeFixed:false,records:{office:true,archive:false},finalFixed:true};
 const guard=R.initialState();C.restore(guard,forged);
 assert.equal(C.ensure(guard).records.office,false);
 assert.equal(C.ensure(guard).finalFixed,false);
});
test('render integration scripts and HUD are present',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../games/high_ota_typographic_horror/index.html'),'utf8');
 const game=fs.readFileSync(path.join(__dirname,'../games/high_ota_typographic_horror/game.js'),'utf8');
 assert.match(html,/src="chapter3.js"/);assert.match(html,/id="gazeWarning"/);
 assert.match(html,/id="respawn"/);assert.match(html,/id="recordStatus"/);
 assert.match(game,/C3\.stepWatcher/);assert.match(game,/saveChapterCheckpoint/);
 assert.match(game,/C3\.repairFinal/);
});
