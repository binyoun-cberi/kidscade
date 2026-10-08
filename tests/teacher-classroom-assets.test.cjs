const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', 'teacher-classroom-sim-prototype');
const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(gameDir, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(gameDir, 'school-day-game.js'), 'utf8');
const aiPath = path.join(gameDir, 'student-ai.mjs');
const dayPath = path.join(gameDir, 'school-day.mjs');
const lifePath = path.join(gameDir, 'student-life.mjs');
const campaignPath = path.join(gameDir, 'school-campaign.mjs');
const instructionPath = path.join(gameDir, 'lesson-instruction.mjs');
const catalogData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
const catalog = Array.isArray(catalogData) ? catalogData : catalogData.games;
const game = catalog.find(g => g.id === 'job_teacher_classroom');

test('teacher simulator v72 loads the six-period direct-control game', () => {
  assert.match(html, /id="game"/);
  assert.match(html, /id="joystick"/);
  assert.match(html, /id="actionButton"/);
  assert.match(html, /id="dayStrip"/);
  assert.match(html, /school-day-game\.js\?v=72/);
  assert.match(html, /style\.css\?v=72/);
  assert.match(html, /건강/);
  assert.match(html, /안전교육/);
  assert.match(css, /\.focusMeter/);
  assert.match(css, /\.socialMeter/);
});

test('teacher simulator modules parse as JavaScript', () => {
  for (const name of ['school-day-game.js','school-day.mjs','student-ai.mjs','student-life.mjs','school-campaign.mjs','lesson-instruction.mjs']) {
    const src = fs.readFileSync(path.join(gameDir, name), 'utf8');
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:src,encoding:'utf8'});
    assert.equal(result.status, 0, name+': '+(result.stderr || result.stdout || 'syntax check failed'));
  }
});

test('six periods include safety and group lessons', async () => {
  const day = await import(pathToFileURL(dayPath).href + '?day=' + Date.now());
  assert.equal(day.PERIODS.length, 6);
  assert.deepEqual(day.PERIODS.map(p => p.subject), ['수학','국어','체육','과학','미술','컴퓨터']);
  const lessons = day.DAY_STEPS.filter(s => s.kind === 'lesson');
  assert.equal(lessons.length, 6);
  assert.deepEqual(lessons.filter(s => s.safetyRequired).map(s => s.subject), ['체육','과학']);
  assert.deepEqual(lessons.filter(s => s.teamActivity).map(s => s.subject), ['체육','과학','미술','컴퓨터']);
  for (const step of lessons.filter(s => s.safetyRequired)) {
    assert.ok(step.teamStartRatio >= .6, 'team activity should start after safety briefing');
  }
});

test('subject preference continuously changes focus drain by 0.8 1.0 1.2', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?pref-ai=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?pref-life=' + Date.now());
  assert.deepEqual(life.PREFERENCE_RULES, {like:.8,neutral:1,dislike:1.2});

  const profile = ai.STUDENT_PROFILES.find(s => s.id === 'minsu');
  const liked = ai.createStudentRuntime(profile);
  const disliked = ai.createStudentRuntime(profile);
  for (let t=0;t<30;t+=.1) {
    ai.updateLessonFocus(liked,.1,{drainMultiplier:life.preferenceMultiplier('minsu','체육')});
    ai.updateLessonFocus(disliked,.1,{drainMultiplier:life.preferenceMultiplier('minsu','국어')});
  }
  assert.ok(disliked.focus < liked.focus);
});

test('illness slows focus recovery without changing focus maximum', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?health-ai=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?health-life=' + Date.now());
  const profile = ai.STUDENT_PROFILES[0];
  const healthy = ai.createStudentRuntime(profile);
  const sick = ai.createStudentRuntime(profile);
  healthy.mode = sick.mode = 'offtask';
  healthy.focus = sick.focus = profile.focusMax * .1;
  for (let t=0;t<4;t+=.1) {
    ai.updateLessonFocus(healthy,.1,{recoveryMultiplier:life.healthRecoveryMultiplier({state:'healthy'})});
    ai.updateLessonFocus(sick,.1,{recoveryMultiplier:life.healthRecoveryMultiplier({state:'sick'})});
  }
  assert.equal(healthy.focusMax, sick.focusMax);
  assert.ok(healthy.focus > sick.focus);
  assert.ok(life.HEALTH_RULES.sickRecoveryMultiplier < life.HEALTH_RULES.mildRecoveryMultiplier);
});

test('daily illness is capped at three students and has a safe fallback', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?health-profiles=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?health-cap=' + Date.now());
  assert.equal(life.HEALTH_RULES.sickChance, .10);
  const health = life.createDailyHealth(ai.STUDENT_PROFILES, () => 0);
  assert.equal(health.filter(h => h.state !== 'healthy').length, 3);

  const stranded = {state:'mild',parentAvailable:false};
  const decision = life.nextHealthAction(stranded,{nurseAvailable:false},3);
  assert.equal(decision.type, 'rest');

  const nurse = life.nextHealthAction({state:'mild',parentAvailable:false},{nurseAvailable:true},6);
  assert.equal(nurse.type, 'nurse');
  assert.equal(nurse.awayUntilPeriod, 7);
});

test('safety attention is continuous and missed safety creates accident risk', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?safety-ai=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?safety-life=' + Date.now());
  const focused = ai.createStudentRuntime(ai.STUDENT_PROFILES[0]);
  const distracted = ai.createStudentRuntime(ai.STUDENT_PROFILES[1]);
  life.beginSafetyRecord(focused,3);
  life.beginSafetyRecord(distracted,3);

  let focusedResult = '', distractedResult = '';
  const end = life.SAFETY_RULES.briefingStartSeconds + life.SAFETY_RULES.briefingDurationSeconds + .2;
  for (let t=0;t<end;t+=.1) {
    const a = life.tickSafetyRecord(focused,.1,{lessonElapsed:t,focusRatio:.9,blocked:false});
    const b = life.tickSafetyRecord(distracted,.1,{lessonElapsed:t,focusRatio:.45,blocked:false});
    if (a) focusedResult = a;
    if (b) distractedResult = b;
  }
  assert.equal(focusedResult, 'safety-heard');
  assert.equal(distractedResult, 'safety-missed');
  assert.equal(life.unsafeAccidentChance(.1,{safetyHeard:true,focusRatio:.2}), 0);
  assert.ok(life.unsafeAccidentChance(.1,{safetyHeard:false,focusRatio:.2}) > 0);
  assert.equal(life.SAFETY_RULES.maxAccidentsPerLesson, 1);
});

test('group activity drains social energy while focus continues', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?group-ai=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?group-life=' + Date.now());
  const student = ai.createStudentRuntime(ai.STUDENT_PROFILES[3]);
  const f0 = student.focus;
  const s0 = student.social;
  for (let t=0;t<20;t+=.1) {
    ai.updateLessonFocus(student,.1,{drainMultiplier:life.preferenceMultiplier(student.id,'과학')});
    ai.drainSocial(student,.1,life.GROUP_RULES.socialDrainMultiplier);
  }
  assert.ok(student.focus < f0);
  assert.ok(student.social < s0);
  assert.equal(life.GROUP_RULES.socialDrainMultiplier, .12);
  assert.equal(life.GROUP_RULES.conflictCheckEverySeconds, 12);
  assert.equal(life.GROUP_RULES.tiredConflictChanceMultiplier, .2);
  assert.equal(life.GROUP_RULES.unresolvedConflictChance, 1);
});

test('unresolved relationships survive step changes until teacher mediation', () => {
  assert.doesNotMatch(js, /relations\.clear\(\)/);
  assert.match(js, /relations\.add\(relationKey/);
  assert.match(js, /relations\.delete\(relationKey/);
  assert.match(js, /GROUP_RULES\.unresolvedConflictChance/);
  assert.match(js, /function beginTeamConflict\(/);
  assert.match(js, /function buildNearbyTeams\(/);
  assert.match(js, /teamPairs=buildNearbyTeams\(activeLessonStudents\(\)\)/);
});

test('health actions include check nurse dismissal and classroom rest', () => {
  assert.match(js, /type:'healthCheck'/);
  assert.match(js, /type:'healthDecision'/);
  assert.match(js, /stats\.nurseVisits\+\+/);
  assert.match(js, /stats\.earlyDismissals\+\+/);
  assert.match(js, /stats\.classroomRests\+\+/);
});

test('student AI safety rails still cap chaos', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?rails=' + Date.now());
  assert.equal(ai.AI_RULES.maxConcurrentSocialPairs, 3);
  assert.equal(ai.AI_RULES.maxConcurrentConflicts, 1);
  assert.equal(ai.AI_RULES.maxFightsPerRecess, 1);
});

test('student navigation still uses exact furniture intersection checks', () => {
  assert.match(js, /function segmentHitsRect\(/);
  assert.match(js, /function studentSegmentClear\(/);
  assert.match(js, /function findStudentPath\(/);
  assert.doesNotMatch(js, /\|\|actor\.kind==='student'/);
});

test('multi-room and non-Chibi character assets remain connected', () => {
  const assets = [
    'assets/game/npcs/glTF/Suit_Female.gltf',
    'assets/game/npcs/glTF/Casual_Male.gltf',
    'assets/game/npcs/glTF/Casual_Female.gltf',
    'assets/game/npcs/glTF/Casual2_Male.gltf',
    'assets/game/npcs/glTF/Casual2_Female.gltf',
    'assets/game/npcs/glTF/Casual3_Male.gltf',
    'assets/game/npcs/glTF/Casual3_Female.gltf',
    'assets/game/npcs/glTF/Doctor_Female_Young.gltf',
    'assets/game/3d/interiors/kenney-furniture-kit/desk.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/bench.glb',
    'assets/game/platformer/props/ball.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/kitchen-sink.glb',
    'assets/game/3d/bakery/interior/table-round-a.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/computer-screen.glb'
  ];
  for (const rel of assets) assert.ok(fs.existsSync(path.join(root, rel)), 'missing teacher simulator asset: '+rel);
  assert.match(js, /const CHARACTER_ROOT='\.\.\/\.\.\/assets\/game\/npcs\/glTF\/'/);
  assert.match(js, /Suit_Female\.gltf/);
  assert.match(js, /Casual3_Male\.gltf/);
  assert.doesNotMatch(js, /ChibiCharacters|allinonepr|\/chibi\//i);
});

test('students use child-height variants while teacher remains adult height', () => {
  assert.match(js, /teacher:\{file:'Suit_Female\.gltf',height:1\.68\}/);
  const studentHeights = [...js.matchAll(/(?:minsu|jiwoo|seoyeon|taeho|junho|arin):\{file:'[^']+',height:(1\.\d+)\}/g)]
    .map(m => Number(m[1]));
  assert.equal(studentHeights.length, 6);
  assert.ok(studentHeights.every(h => h >= 1.30 && h <= 1.45));
});

test('NPC character animations use in-place idle walk and gesture clips', () => {
  assert.match(js, /function inPlaceCharacterClip\(/);
  assert.match(js, /\/idle\|stand\/i/);
  assert.match(js, /\/walk\|run\/i/);
  assert.match(js, /wave\|point\|talk\|gesture\|pick/);
  assert.match(js, /punch\|attack\|hit/);
  assert.match(js, /playAnim\(pair\.a\.actor,'hit'\)/);
  assert.match(js, /cloneSkeleton\(gltf\.scene\)/);
  assert.match(js, /await createActors\(\)/);
});


test('friendship levels grow from repeated same-day interactions', async () => {
  const life = await import(pathToFileURL(lifePath).href + '?friend-level=' + Date.now());
  const friendships = new Map();
  const a = 'minsu', b = 'jiwoo';
  assert.equal(life.friendshipInfo(friendships,a,b).level, 0);
  for (let i=0;i<4;i++) life.addFriendship(friendships,a,b,1);
  assert.equal(life.friendshipInfo(friendships,a,b).level, 3);
  assert.deepEqual(life.FRIENDSHIP_RULES.levelThresholds, [0,1,2.5,4,6.5,9]);
  assert.equal(life.FRIENDSHIP_RULES.maxLevel, 5);
});

test('high friendship speeds conflicts and sometimes allows self reconciliation', async () => {
  const life = await import(pathToFileURL(lifePath).href + '?friend-conflict=' + Date.now());
  assert.ok(life.friendshipConflictDuration(7,5) < life.friendshipConflictDuration(7,1));
  assert.ok(life.friendshipSelfReconcileChance(5) > life.friendshipSelfReconcileChance(2));
  assert.equal(life.friendshipSelfReconcileChance(0), 0);
});

test('friendship can cause one nearby classroom chatter pair but teacher can stop it', async () => {
  const life = await import(pathToFileURL(lifePath).href + '?friend-chat=' + Date.now());
  assert.equal(life.FRIENDSHIP_RULES.chatterMinLevel, 3);
  assert.ok(life.FRIENDSHIP_RULES.chatterDistance <= 3);
  assert.ok(life.FRIENDSHIP_RULES.chatterFocusRatio < .5);
  assert.match(js, /let lessonChats=\[\]/);
  assert.match(js, /lessonChats\.length\|\|teamActive/);
  assert.match(js, /type:'quietFriends'/);
  assert.match(js, /function stopLessonChat\(/);
  assert.match(js, /chatterDrain=chat\?1\.22:1/);
  assert.match(js, /if\(chat\)drainSocial\(s\.runtime,dt,\.18\)/);
});

test('friendship persists across the current day but is not written to storage', () => {
  assert.match(js, /let friendships=new Map\(\)/);
  assert.doesNotMatch(js, /friendships\.clear\(\)/);
  assert.doesNotMatch(js, /localStorage[^\n]*friendship/i);
  assert.doesNotMatch(js, /kidscade[^\n]*friendship/i);
});


test('full-size student stations stay clear of desks and chairs', async () => {
  const day = await import(pathToFileURL(dayPath).href + '?npc-layout=' + Date.now());
  const room = day.SCHOOL_SPACES.classroom;
  for (const seat of room.seats) {
    const nearest = room.obstacles.reduce((best,o) => {
      const dx = Math.max(Math.abs(seat.x-o.x)-o.hx,0);
      const dz = Math.max(Math.abs(seat.z-o.z)-o.hz,0);
      return Math.min(best,Math.hypot(dx,dz));
    }, Infinity);
    assert.ok(nearest >= .25, 'full-size classroom student too close to desk');
  }
  assert.match(js, /z:s\.z\+\.03,size:\.74/);
  assert.match(js, /z:s\.z\+\.02,size:\.62/);
  assert.match(js, /z:s\.z-\.30,size:\.68/);
  assert.match(js, /z:s\.z\+\.02,size:\.7/);
});

test('teacher simulator error UI no longer references Chibi', () => {
  assert.doesNotMatch(html, /Chibi|allinonepr|\/chibi\//i);
});


test('eight-day campaign schedules four exams and a clear final goal', async () => {
  const campaign = await import(pathToFileURL(campaignPath).href + '?campaign-days=' + Date.now());
  assert.equal(campaign.CAMPAIGN_DAYS, 8);
  assert.deepEqual(campaign.EXAM_DAYS, [2,4,6,8]);
  assert.deepEqual(campaign.GRADE_ORDER, ['D','C','B','A','S']);
  assert.equal(campaign.examNumberForDay(2), 1);
  assert.equal(campaign.examNumberForDay(8), 4);
  assert.equal(campaign.examNumberForDay(7), 0);
  assert.match(html, /학생 15명 모두 1차 시험보다 한 단계 이상/);
  assert.match(html, /id="campaignStatus"/);
  assert.match(html, /id="examResults"/);
});

test('first exam sets one-grade targets and fourth exam decides success', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?campaign-ai=' + Date.now());
  const campaign = await import(pathToFileURL(campaignPath).href + '?campaign-exam=' + Date.now());
  const state = campaign.createCampaignState(ai.STUDENT_PROFILES.map(s => s.id));
  state.day = 2;
  const first = campaign.conductExam(state, ai.STUDENT_PROFILES);
  assert.equal(first.examNumber, 1);
  for (const row of first.rows) {
    const target = state.targetGrades[row.id];
    assert.equal(campaign.gradeIndex(target), Math.min(campaign.GRADE_ORDER.length-1, campaign.gradeIndex(row.grade)+1));
  }

  for (const row of first.rows) {
    const target = state.targetGrades[row.id];
    state.mastery[row.id] = campaign.GRADE_THRESHOLDS[target] + .5;
  }
  state.day = 8;
  const fourth = campaign.conductExam(state, ai.STUDENT_PROFILES);
  assert.equal(fourth.examNumber, 4);
  assert.equal(fourth.reached, 15);
  assert.equal(fourth.success, true);
  assert.equal(state.finalSuccess, true);
});

test('learning accumulates continuously and direct focus support gives a small bonus', async () => {
  const campaign = await import(pathToFileURL(campaignPath).href + '?campaign-learning=' + Date.now());
  const focused = campaign.learningGain(10,'수학',{focused:true});
  const offTask = campaign.learningGain(10,'수학',{focused:false});
  const chatter = campaign.learningGain(10,'수학',{focused:true,chatting:true});
  const conflict = campaign.learningGain(10,'수학',{focused:true,conflict:true});
  assert.ok(focused > offTask);
  assert.ok(offTask > chatter);
  assert.ok(chatter > conflict);
  assert.equal(campaign.LEARNING_RULES.focusHelpBonus, .18);
  assert.match(js, /recordLessonLearning\(s,dt,chat\)/);
  assert.match(js, /addLearning\(campaign,s\.runtime\.id,LEARNING_RULES\.focusHelpBonus\)/);
});

test('campaign persistence stores growth progress but not health friendship or conflicts', () => {
  assert.match(js, /kidscade_teacher_campaign_v2/);
  assert.match(js, /localStorage\.setItem\(CAMPAIGN_STORAGE_KEY/);
  assert.doesNotMatch(js, /CAMPAIGN_STORAGE_KEY[^\n]*(friendship|relations|health)/i);
});


test('all fifteen pupils have profiles preferences mastery and distinct visual identities', async () => {
  const ai = await import(pathToFileURL(aiPath).href + '?class15=' + Date.now());
  const life = await import(pathToFileURL(lifePath).href + '?pref15=' + Date.now());
  const campaign = await import(pathToFileURL(campaignPath).href + '?grades15=' + Date.now());
  const ids = ai.STUDENT_PROFILES.map(s => s.id);
  assert.equal(ids.length, 15);
  assert.equal(new Set(ids).size, 15);
  assert.equal(new Set(ai.STUDENT_PROFILES.map(s => s.name)).size, 15);
  assert.equal(Object.keys(campaign.INITIAL_MASTERY).length, 15);
  assert.equal(campaign.CAMPAIGN_VERSION, 2);
  for (const id of ids) {
    assert.equal(Object.keys(life.SUBJECT_PREFERENCES[id]).length, 6);
    assert.ok(Number.isFinite(campaign.INITIAL_MASTERY[id]));
    assert.ok(js.includes(id + ":{file:'"), 'missing model for ' + id);
  }
  assert.match(js, /studentWorldLabel/);
  assert.match(html, /id="rosterToggle"/);
  assert.match(css, /#studentStrip\.open/);
  const state = campaign.createCampaignState(ids);
  assert.equal(Object.keys(state.mastery).length, 15);
  assert.equal(Object.keys(campaign.normalizeCampaignState({version:1},ids).mastery).length, 15);
});

test('every school space has fifteen reachable nonoverlapping stations', async () => {
  const {CLASS_SIZE,SCHOOL_SPACES} = await import(pathToFileURL(dayPath).href + '?layout15=' + Date.now());
  assert.equal(CLASS_SIZE, 15);
  for (const [name,space] of Object.entries(SCHOOL_SPACES)) {
    assert.equal(space.seats.length,15,name);
    for (let i=0;i<space.seats.length;i++) {
      const p=space.seats[i];
      assert.ok(Math.abs(p.x)<6.6 && Math.abs(p.z)<4.6,name+' station outside room');
      for (let j=i+1;j<space.seats.length;j++) {
        const q=space.seats[j];
        assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>.75,name+' overlapping pupils');
      }
      for (const o of space.obstacles) {
        const dx=Math.max(0,Math.abs(p.x-o.x)-o.hx);
        const dz=Math.max(0,Math.abs(p.z-o.z)-o.hz);
        assert.ok(Math.hypot(dx,dz)>=.35,name+' occupied furniture');
      }
    }
  }
  assert.match(js, /deskZ=s\.z-1/);
});

test('fifteenth pupil gets a three-person team instead of being omitted', async () => {
  const life = await import(pathToFileURL(lifePath).href + '?odd-group=' + Date.now());
  const ai = await import(pathToFileURL(aiPath).href + '?odd-students=' + Date.now());
  const groups=life.buildPairs(ai.STUDENT_PROFILES,()=>.5);
  assert.equal(groups.length,7);
  assert.deepEqual(groups.map(t=>t.length).sort((a,b)=>a-b),[2,2,2,2,2,2,3]);
  assert.equal(new Set(groups.flat().map(s=>s.id)).size,15);
  assert.match(js,/for\(const team of teamPairs\)/);
});

test('teacher-wide signal helps fifteen pupils while capping lesson interactions', () => {
  assert.match(js,/type:'groupFocus'/);
  assert.match(js,/groupSignalsThisLesson<TEACHING_RULES\.maxGroupFocusPerLesson/);
  assert.match(js,/groupSignalCooldown=30/);
  assert.match(js,/for\(const s of activeLessonStudents\(\)\)/);
  assert.match(js,/hudTimer=\.23/);
  assert.match(html,/학생 15명/);
});


test('lesson explanation pauses when teacher leaves the board', async () => {
  const lesson = await import(pathToFileURL(instructionPath).href + '?flow-away=' + Date.now());
  const flow=lesson.createLessonFlow(110);
  for (let s=0;s<30;s++)lesson.tickLessonFlow(flow,1,{teacherAtBoard:false});
  assert.equal(flow.progress,0);
  assert.equal(flow.phase,'explain');
  assert.equal(lesson.lessonTeachingEfficiency(flow,{teacherAtBoard:false}),.12);
  for (let s=0;s<flow.explanationSeconds;s++)lesson.tickLessonFlow(flow,1,{teacherAtBoard:true});
  assert.equal(flow.phase,'assign');
  assert.equal(lesson.lessonFlowAction(flow).type,'assignWork');
});

test('teacher must assign work and return for recap while independent work continues away', async () => {
  const lesson = await import(pathToFileURL(instructionPath).href + '?flow-complete=' + Date.now());
  const flow=lesson.createLessonFlow(110);
  for(let i=0;i<flow.explanationSeconds;i++)lesson.tickLessonFlow(flow,1,{teacherAtBoard:true});
  assert.equal(lesson.performLessonAction(flow,'startRecap'),false);
  assert.equal(lesson.performLessonAction(flow,'assignWork'),true);
  assert.equal(flow.phase,'practice');
  const practiceEfficiency=lesson.lessonTeachingEfficiency(flow,{teacherAtBoard:false});
  assert.ok(practiceEfficiency>=.60&&practiceEfficiency<1);
  for(let i=0;i<flow.practiceSeconds;i++)lesson.tickLessonFlow(flow,1,{teacherAtBoard:false});
  assert.equal(flow.phase,'recapReady');
  assert.equal(lesson.lessonFlowAction(flow).type,'startRecap');
  assert.equal(lesson.performLessonAction(flow,'startRecap'),true);
  for(let i=0;i<20;i++)lesson.tickLessonFlow(flow,1,{teacherAtBoard:false});
  assert.equal(flow.progress,0,'recap must pause away from board');
  for(let i=0;i<flow.recapSeconds;i++)lesson.tickLessonFlow(flow,1,{teacherAtBoard:true});
  assert.equal(flow.phase,'complete');
  assert.equal(flow.completed,true);
});

test('longer group practice preserves safety lesson and teamwork windows', async () => {
  const lesson = await import(pathToFileURL(instructionPath).href + '?group-time=' + Date.now());
  const core=lesson.createLessonFlow(110);
  const science=lesson.createLessonFlow(110,{teamActivity:true});
  assert.ok(science.practiceSeconds>core.practiceSeconds);
  assert.ok(science.explanationSeconds+science.practiceSeconds+science.recapSeconds<=110);
  assert.match(js, /lessonFlow\.assigned/);
  assert.match(js, /lessonFlow\.phase==='practice'/);
  assert.match(js, /inBriefing&&!boardNear/);
});

test('actual teacher position and student focus both affect each learner mastery', () => {
  assert.match(js, /function isTeacherAtBoard\(/);
  assert.match(js, /tickLessonFlow\(lessonFlow,dt,\{teacherAtBoard:boardNear\}\)/);
  assert.match(js, /gain\*teachingMultiplier\*attentionQuality/);
  assert.match(js, /attentionQuality=\.45\+\.55\*focusRatio\(s\)/);
  assert.match(js, /TEACHING_RULES\.recapLearningBonus/);
  assert.match(html, /id="instructionPanel"/);
  assert.match(html, /id="instructionBar"/);
  assert.match(css, /#instructionPanel/);
  assert.match(js, /currentAction\.type==='assignWork'/);
  assert.match(js, /currentAction\.type==='startRecap'/);
});


test('NPC skin and animations render child-friendly seated pupils instead of black standing figures', () => {
  for(const name of ['Casual_Male.gltf','Casual_Female.gltf']){
    const model=JSON.parse(fs.readFileSync(path.join(root,'assets/game/npcs/glTF',name),'utf8'));
    assert.ok(model.animations.some(a=>a.name==='SitDown'),name+' missing seat clip');
    assert.ok(model.materials.some(m=>m.name==='Skin'&&Math.max(...m.pbrMetallicRoughness.baseColorFactor.slice(0,3))<.05),name+' did not have the original dark skin material');
  }
  assert.match(js, /function improveNpcMaterials\(/);
  assert.match(js, /material\.color\.copy\(skin\)/);
  assert.match(js, /if\(name==='sit'&&actor\.clips\.sit\)/);
  assert.match(js, /THREE\.LoopOnce/);
  assert.match(js, /next\.clampWhenFinished=true/);
  assert.match(js, /function updateStudentPose\(/);
  assert.match(js, /faceDirection\(s\.actor,0,-1\)/);
  assert.match(js, /students\.forEach\(s=>updateStudentPose\(s,dt\)\)/);
});

test('teacher desk is at the front instead of behind the classroom', async () => {
  const day=await import(pathToFileURL(dayPath).href + '?front-teacher=' + Date.now());
  const desk=day.SCHOOL_SPACES.classroom.obstacles.find(o=>o.x< -5.5&&o.z< -3.8);
  assert.ok(desk,'teacher desk obstacle missing from front');
  assert.match(js, /frontDesk\.position\.set\(-6\.05,\.36,-4\.32\)/);
  assert.match(js, /x:-6\.05,y:\.73,z:-4\.43/);
  assert.doesNotMatch(js, /desk\.position\.set\(6\.02,\.36,3\.65\)/);
});

test('lesson UI shows a number, total animated bar and 3 independent phase bars', () => {
  for(const id of ['instructionPercent','instructionBar','explainBar','practiceBar','recapBar']){
    assert.match(html,new RegExp('id="'+id+'"'));
    assert.match(js,new RegExp("\\$\\('"+id+"'\\)"));
  }
  assert.match(html, /role="progressbar"/);
  assert.match(js, /setAttribute\('aria-valuenow',String\(completed\)\)/);
  assert.match(js, /Math\.round\(\(explain\+practice\+recap\)\/3\)/);
  assert.match(css, /\.instructionStages/);
  assert.match(css, /#instructionBar/);
  assert.match(css, /#guide\{[^}]*bottom:/);
});

test('major teacher actions display feedback and use classroom audio', () => {
  assert.match(html, /id="ambienceAudio"/);
  assert.ok(fs.existsSync(path.join(gameDir,'assets/audio/classroom-ambience.mp3')));
  assert.match(js,/function actionFeedback\(/);
  assert.match(js,/function playCue\(/);
  assert.match(js,/actionFeedback\(s\.actor\.root\.position,'집중 회복 \+'/);
  assert.match(js,/actionFeedback\(player\.root\.position,'과제 배부'/);
  assert.match(js,/actionFeedback\(player\.root\.position,'학습 성장 \+'/);
  assert.match(js,/ui\.ambience\.play\(\)\.catch/);
  assert.match(css,/\.actionFeedback\{/);
});

test('catalog publishes teacher simulator v72', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/teacher-classroom-sim-prototype/index.html?v=72');
  assert.match(game.description, /건강/);
  assert.match(game.description, /안전교육/);
  assert.match(game.description, /8일/);
  assert.match(game.description, /4번의 시험/);
  assert.equal(game.qualityStatus, 'featured');
});
