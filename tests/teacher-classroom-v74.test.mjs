import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CLASS_SIZE,SCHOOL_SPACES,ROW_DESK_FORWARD,ROW_CHAIR_OFFSET,SEAT_SURFACE_HEIGHT,seatHeightAdjustment
} from '../games/teacher-classroom-sim-prototype/school-day.mjs';

const source=(name)=>readFileSync(new URL('../games/teacher-classroom-sim-prototype/'+name,import.meta.url),'utf8');
const hit=(a,b)=>Math.abs(a.x-b.x)<a.hx+b.hx&&Math.abs(a.z-b.z)<a.hz+b.hz;

test('all fifteen pupils have distinct aligned desks and chairs',()=>{
  const {seats,obstacles}=SCHOOL_SPACES.classroom;
  assert.equal(CLASS_SIZE,15);
  assert.equal(seats.length,15);
  assert.equal(new Set(seats.map(s=>s.x+','+s.z)).size,15);
  assert.equal(obstacles.length>=15,true);
  for(let i=0;i<15;i++){
    const seat=seats[i],desk=obstacles[i];
    assert.equal(desk.x,seat.x);
    assert.equal(desk.z,seat.z-ROW_DESK_FORWARD);
    // Actual normalized Kenney GLB desk is .737m deep, chair .383m.
    const edgeGap=ROW_DESK_FORWARD+ROW_CHAIR_OFFSET-(.737+.383)/2;
    assert.ok(edgeGap>.12&&edgeGap<.33,'desk/chair edge gap should be practical: '+edgeGap);
    // The character's station must remain outside the desk collision rectangle.
    assert.ok(Math.abs(seat.z-desk.z)>desk.hz+.08);
  }
  for(let i=0;i<15;i++)for(let j=i+1;j<15;j++){
    assert.equal(hit(obstacles[i],obstacles[j]),false,'two desks overlap');
    assert.ok(Math.hypot(seats[i].x-seats[j].x,seats[i].z-seats[j].z)>1.5);
  }
});

test('seat surfaces are defined per room so student pelvis offsets can adapt',()=>{
  for(const room of ['classroom','computer','science','art','cafeteria']){
    assert.ok(Number.isFinite(SEAT_SURFACE_HEIGHT[room]));
    assert.ok(SEAT_SURFACE_HEIGHT[room]>.15&&SEAT_SURFACE_HEIGHT[room]<.8);
  }
  assert.ok(SEAT_SURFACE_HEIGHT.science>SEAT_SURFACE_HEIGHT.classroom);
  assert.ok(SEAT_SURFACE_HEIGHT.art>SEAT_SURFACE_HEIGHT.computer);
});

test('visual animation and answerable questions stay coupled to student state',()=>{
  const js=source('school-day-game.js');
  assert.match(js,/gestureBones:collectGestureBones/);
  assert.match(js,/const writing=canSit&&currentStep\.kind==='lesson'/);
  assert.match(js,/const chatting=canSit&&!!chatForStudent\(s\)/);
  assert.match(js,/currentAction=\{type:'answerQuestion',student:question\}/);
  assert.match(js,/if\(currentAction\.type==='answerQuestion'\)/);
  assert.match(js,/s\.answeredWindow=questionWindow|s\.answeredWindow=Math\.floor\(lessonElapsed\/24\)/);
  assert.match(js,/ROW_DESK_FORWARD/);
  assert.match(js,/seatFurnitureRects=seatFurnitureForSpace\(space\)/);
  assert.match(js,/const allowedChair=actor\.kind==='student'/);
  assert.match(js,/studentSegmentClear\(curPoint,p,allowChair\)/);
  assert.match(js,/findStudentPath\(actor\.root\.position,target,allowedChair\)/);
});

test('compact UI hides conflicting panels when the roster opens',()=>{
  const css=source('style.css'),js=source('school-day-game.js');
  assert.match(css,/#app\.roster-open #instructionPanel/);
  assert.match(css,/@media\(max-height:520px\)/);
  assert.match(css,/top:139px/);
  assert.match(js,/ui\.app\.classList\.toggle\('roster-open',isOpen\)/);
});

test('the teacher game catalog entry does not reintroduce legacy version pins',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../data/games.json',import.meta.url),'utf8'));
  const teacher=catalog.games.find(game=>game.id==='job_teacher_classroom');
  assert.ok(teacher,'teacher simulator remains registered');
  assert.equal(teacher.href,'games/teacher-classroom-sim-prototype/index.html');
});

test('animated pelvis correction handles tall laboratory stools as well as low chairs',()=>{
  assert.equal(seatHeightAdjustment(.62,.34),.28);
  assert.ok(Math.abs(seatHeightAdjustment(.25,.34)+.09)<1e-8);
  assert.equal(seatHeightAdjustment(.90,.10),.5);
  assert.equal(seatHeightAdjustment(.10,1.10),-.5);
  const game=source('school-day-game.js');
  assert.match(game,/actor\.hipBone\?\.getWorldPosition/);
  assert.match(game,/model\.scale\.x\*=spread/);
  assert.match(game,/spread:1\.65/);
});
test('landscape tablet controls no longer overlap the roster or teaching panel',()=>{
  const css=source('style.css');
  assert.match(css, /#instructionPanel\{top:160px;left:160px/);
  assert.match(css, /#studentStrip\{top:157px;left:160px/);
  assert.match(css, /#dayStrip\{left:calc\(50% - 10px\)/);
});

test('seated characters track the 3D stool center and face their activity table',()=>{
  const game=source('school-day-game.js');
  assert.match(game,/chair\.x-\(pelvisWorld\.x-pelvisShiftWorld\.x\)/);
  assert.match(game,/chair\.z-\(pelvisWorld\.z-pelvisShiftWorld\.z\)/);
  assert.match(game,/actor\.model\.position\.x=actor\.restX/);
  assert.match(game,/activeSpace\.id==='cafeteria'\?3:4/);
  assert.match(game,/faceDirection\(s\.actor,closest\.t\.x-s\.seat\.x,closest\.t\.z-s\.seat\.z\)/);
});
