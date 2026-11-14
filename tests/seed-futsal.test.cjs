const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const gameDir=path.join(root,'games','high_seed_fc_manager');
const enginePath=path.join(gameDir,'futsal-history-match.js');
const dataPath=path.join(gameDir,'data.js');
const indexPath=path.join(gameDir,'index.html');
const gamePath=path.join(gameDir,'game.js');
const stylePath=path.join(gameDir,'style.css');

test('Seed Futsal is absorbed into Futsal History League',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const games=Array.isArray(catalog)?catalog:catalog.games;
  assert.equal(games.some(item=>item.id==='high_seed_futsal'),false);
  const game=games.find(item=>item.id==='high_seed_fc_manager');
  assert.ok(game);
  assert.equal(game.title,'풋살 히스토리그');
  assert.equal(game.genre,'sports');
  assert.deepEqual(game.input,['touch','keyboard']);
  assert.equal(fs.existsSync(path.join(root,'games','high_seed_futsal')),false);
});

test('Futsal History League uses a physical 5v5 match engine',()=>{
  const source=fs.readFileSync(enginePath,'utf8');
  const data=fs.readFileSync(dataPath,'utf8');
  assert.doesNotThrow(()=>new vm.Script(source));
  assert.match(source,/FIELD_W=1500,FIELD_H=840/);
  assert.match(source,/ball:\{x:FIELD_W\/2,y:FIELD_H\/2,z:0,vx:0,vy:0,vz:0/);
  assert.match(source,/function tendencies\(/);
  assert.match(source,/function aiCarrier\(/);
  assert.match(source,/function tackle\(/);
  assert.match(source,/function render\(canvas\)/);
  assert.match(source,/kenney-platformer-characters/);
  assert.match(source,/ball_soccer1\.png/);
  assert.match(data,/'1-2-1':\['GK','CB','WG','WG','ST'\]/);
  assert.match(data,/'4-0':\['GK','CM','CM','WG','WG'\]/);
});

test('Futsal History League exposes direct keyboard and touch controls',()=>{
  const html=fs.readFileSync(indexPath,'utf8');
  assert.match(html,/data-game-id="high_seed_fc_manager"/);
  assert.match(html,/data-fh-action="switch"/);
  assert.match(html,/data-fh-action="pass"/);
  assert.match(html,/data-fh-action="through"/);
  assert.match(html,/data-fh-action="lob"/);
  assert.match(html,/data-fh-action="shoot"/);
  assert.match(html,/futsal-history-match\.js\?v=17/);
});


test('Futsal History League lets children switch between watch and direct control',()=>{
  const engine=fs.readFileSync(enginePath,'utf8');
  const game=fs.readFileSync(gamePath,'utf8');
  const html=fs.readFileSync(indexPath,'utf8');
  assert.doesNotThrow(()=>new vm.Script(game));
  assert.match(engine,/directControl:false/);
  assert.match(engine,/m\.setDirectControl=function\(on\)/);
  assert.match(engine,/m\.getControlState=function\(\)/);
  assert.match(engine,/if\(m\.directControl\)userPlayer\(m\.controlled,dt\)/);
  assert.match(game,/function toggleDirectControl\(\)/);
  assert.match(game,/match\.setDirectControl\(false\)/);
  assert.match(html,/id="directControlBtn"/);
  assert.match(html,/🎮 직접 조종 켜기/);
  assert.doesNotMatch(html,/data-fh-hold="jockey"/);
});

test('Futsal History League teaches tackle timing instead of hiding the success window',()=>{
  const engine=fs.readFileSync(enginePath,'utf8');
  const game=fs.readFileSync(gamePath,'utf8');
  const html=fs.readFileSync(indexPath,'utf8');
  const css=fs.readFileSync(stylePath,'utf8');
  assert.match(engine,/function tackleGuide\(/);
  assert.match(engine,/d<=48/);
  assert.match(engine,/d<=72/);
  assert.match(engine,/지금! 초록 표시에서 D를 누르면 태클 성공률이 높아요/);
  assert.match(engine,/emit\('foul'/);
  assert.match(game,/function updateControlCoach\(\)/);
  assert.match(game,/초록 표시 \+ “지금! D 태클”/);
  assert.match(html,/id="controlHint"/);
  assert.match(html,/초록 표시에서 D 태클/);
  assert.match(css,/tackle-ready/);
  assert.match(css,/tackle-near/);
});

test('Futsal History League has stadium-style audio feedback',()=>{
  const engine=fs.readFileSync(enginePath,'utf8');
  const game=fs.readFileSync(gamePath,'utf8');
  assert.match(engine,/emit\('call'/);
  assert.match(game,/function startStadiumAmbience\(\)/);
  assert.match(game,/function crowdSwell\(/);
  assert.match(game,/function whistleSfx\(/);
  assert.match(game,/function passThump\(/);
  assert.match(game,/function teammateVoice\(/);
  assert.match(game,/e\.type==='pass'\|\|e\.type==='cross'/);
  assert.match(game,/e\.type==='tackle'/);
  assert.match(game,/e\.type==='foul'/);
  assert.match(game,/e\.type==='call'/);
});


test('first league match is a live action tutorial and only auto-runs once',()=>{
  const engine=fs.readFileSync(enginePath,'utf8');
  const game=fs.readFileSync(gamePath,'utf8');
  const html=fs.readFileSync(indexPath,'utf8');
  assert.match(game,/matchTutorialDone:false/);
  assert.match(game,/state\.matchTutorialDone===undefined/);
  assert.match(game,/var MATCH_TUTORIAL_STEPS=\[/);
  for(const key of ['direct_on','move','pass','switch','tackle','shoot','tactic','direct_off'])assert.match(game,new RegExp("key:'"+key+"'"));
  assert.match(game,/function beginFirstMatchTutorial\(\)/);
  assert.match(game,/function matchTutorialAction\(kind,extra\)/);
  assert.match(game,/firstMatchTutorial=!state\.matchTutorialDone&&state\.matchHistory\.length===0/);
  assert.match(engine,/opts\.onUserAction/);
  assert.match(engine,/notifyUserAction\('move'/);
  assert.match(engine,/notifyUserAction\('switch'/);
  assert.match(engine,/notifyUserAction\('tackle'/);
  assert.match(html,/id="matchTutorial"/);
  assert.match(html,/id="matchTutorialSkipStep"/);
  assert.match(html,/id="matchTutorialSkipAll"/);
});


test('Futsal History League analysis room has dashboard metrics and direct replay modes',()=>{
  const game=fs.readFileSync(gamePath,'utf8');
  assert.match(game,/function replayTeamTotals\(r,side\)/);
  assert.match(game,/function replayOutcome\(r\)/);
  assert.match(game,/팀 흐름 한눈에 보기/);
  assert.match(game,/경기당 슈팅/);
  assert.match(game,/최근 경기 활약 선수/);
  assert.match(game,/data-replay-mode="replay"/);
  assert.match(game,/data-replay-mode="heat"/);
  assert.match(game,/data-replay-mode="pass"/);
  assert.match(game,/function openReplay\(index,mode,focus\)/);
});


// Runtime checks: unlike string-only assertions, these run the actual futsal update loop.
function buildPhysicalMatch(tactics={}){
  const context={window:{},Image:class{constructor(){this.complete=false;this.naturalWidth=0;}set src(value){this.source=value;}},performance:{now:()=>0}};
  vm.createContext(context);
  for(const file of ['data.js','sim.js','futsal-history-match.js']){
    vm.runInContext(fs.readFileSync(path.join(gameDir,file),'utf8'),context,{filename:file});
  }
  const D=context.window.SeedFCData,H=context.window.SeedFutsalHistory;
  const home=D.clubs[0],away=D.clubs[1];
  const match=H.create({
    homeClub:home,awayClub:away,
    homeRoster:JSON.parse(JSON.stringify(home.players)),
    awayRoster:JSON.parse(JSON.stringify(away.players)),
    homeLineup:home.players.slice(0,5).map(p=>p.id),
    awayLineup:away.players.slice(0,5).map(p=>p.id),
    homeFormation:'1-2-1',awayFormation:'1-2-1',
    homeTactics:{attack:'short',press:'shape',mindset:'balanced',line:'standard',tempo:'normal',width:'normal',...tactics},
    awayTactics:{attack:'short',press:'shape',mindset:'balanced',line:'standard',tempo:'normal',width:'normal'},
    formations:D.formations,seed:'fixed-futsal-regression'
  });
  return match;
}

test('physical match uses seeded decisions and completes reproducibly',()=>{
  const a=buildPhysicalMatch(),b=buildPhysicalMatch();
  a.runToEnd();b.runToEnd();
  assert.equal(a.finished,true);
  assert.equal(b.finished,true);
  assert.equal(a.minute,90);
  assert.deepEqual(Array.from(a.score),Array.from(b.score));
  assert.deepEqual(
    Array.from(a.events,e=>[e.minute,e.type,e.actorId||null]),
    Array.from(b.events,e=>[e.minute,e.type,e.actorId||null])
  );
  const ra=a.exportReplay(),rb=b.exportReplay();
  assert.deepEqual(JSON.parse(JSON.stringify(ra.frames)),JSON.parse(JSON.stringify(rb.frames)));
});

test('changing the defensive line and mentality moves the on-field players',()=>{
  const normal=buildPhysicalMatch();
  const forward=buildPhysicalMatch({line:'high',mindset:'attack',attack:'direct',tempo:'fast'});
  const advance=match=>{
    const striker=match.teams[0].actors.find(a=>a.slot==='ST');
    const defender=match.teams[0].actors.find(a=>a.slot==='CB');
    striker.x=670;striker.y=420;
    match.ball.owner=striker;match.ball.x=striker.x;match.ball.y=striker.y;match.possession=0;
    // Keep the attacker controlled so they do not independently shoot during this positioning comparison.
    match.setDirectControl(true);match.controlled=striker;
    for(let i=0;i<20;i++)match.update(.05,1);
    return defender.x;
  };
  const x1=advance(normal),x2=advance(forward);
  assert.ok(x2>x1+10,`expected high line to advance defenders: ${x1} vs ${x2}`);
});

test('cross favors an open striker and shooting responds to horizontal aim',()=>{
  const cross=buildPhysicalMatch();
  const players=cross.teams[0].actors;
  const carrier=players.find(a=>a.slot==='WG'),striker=players.find(a=>a.slot==='ST');
  const otherWinger=players.find(a=>a.slot==='WG'&&a!==carrier);
  carrier.x=960;carrier.y=125;striker.x=1250;striker.y=410;
  otherWinger.x=1130;otherWinger.y=400;
  cross.ball.owner=carrier;cross.ball.x=carrier.x;cross.ball.y=carrier.y;
  cross.setDirectControl(true);cross.controlled=carrier;cross.handleAction('lob');
  const event=cross.events.find(e=>e.type==='cross');
  assert.ok(event);
  assert.equal(event.toId,striker.id);

  function shootDirection(side){
    const match=buildPhysicalMatch();
    const attacker=match.teams[0].actors.find(a=>a.slot==='ST');
    attacker.x=980;attacker.y=420;
    match.ball.owner=attacker;match.ball.x=attacker.x;match.ball.y=attacker.y;
    match.setDirectControl(true);match.controlled=attacker;
    match.setHold(side,true);match.handleAction('shoot');
    assert.ok(match.events.some(e=>e.type==='shot'));
    return match.ball.vy;
  }
  assert.ok(shootDirection('right')>shootDirection('left'));
});

test('rival growth and history-card quiz reward are guarded',()=>{
  const game=fs.readFileSync(gamePath,'utf8');
  assert.match(game,/function rivalDevelopment\(clubId\)/);
  assert.match(game,/return Math\.min\(12,growth\)/);
  assert.match(game,/전력 성장/);
  assert.match(game,/firstConnection=!hp\.connected\[p\.id\]/);
  assert.match(game,/if\(firstConnection\)\{state\.budget\+=25/);
  const quiz=game.slice(game.indexOf('function historyCardModal('),game.indexOf('function tacticImpactHtml('));
  assert.match(quiz,/<h2>이 인물은 누구일까요\?<\/h2>/);
  assert.doesNotMatch(quiz,/<h2>'\+esc\(p\.name\)/);
});


test('kick hold/release exposes power, and stronger shots are faster',()=>{
  const html=fs.readFileSync(indexPath,'utf8'),game=fs.readFileSync(gamePath,'utf8');
  assert.match(html,/id="kickPowerHud"/);
  assert.match(game,/st\.chargeLevel/);
  function fire(power){
    const match=buildPhysicalMatch();
    const p=match.teams[0].actors.find(a=>a.slot==='ST');
    p.x=720;p.y=420;match.ball.owner=p;match.ball.x=p.x;match.ball.y=p.y;
    match.setDirectControl(true);match.controlled=p;
    match.handleAction('shoot',power);
    return Math.hypot(match.ball.vx,match.ball.vy);
  }
  assert.ok(fire(1)>fire(.12)+150);
  const match=buildPhysicalMatch(),p=match.teams[0].actors.find(a=>a.slot==='ST');
  p.x=750;p.y=420;match.teams[1].actors.forEach(a=>{a.x=1350;a.y=75;});
  match.ball.owner=p;match.ball.x=p.x;match.ball.y=p.y;
  match.setDirectControl(true);match.controlled=p;
  assert.equal(match.beginKick('shoot'),true);
  for(let i=0;i<55;i++)match.update(.016,1);
  assert.ok(match.getControlState().chargeLevel>.9);
  assert.equal(match.releaseKick('shoot',true),true);
  assert.equal(match.getControlState().chargeKind,null);
  assert.ok(match.events.some(e=>e.type==='shot'));
});

test('real touches, not coaching or control messages, determine ball ownership',()=>{
  const match=buildPhysicalMatch(),last=match.lastTouchId;
  match.setDirectControl(true);
  assert.equal(match.lastTouchId,last);
  const owner=match.ball.owner;
  match.setInstruction(owner.side,owner.id,'forward');
  assert.equal(match.lastTouchId,last);
  const attacker=match.teams[0].actors.find(a=>a.slot==='ST');
  attacker.x=680;attacker.y=420;
  match.teams[0].actors.filter(a=>a!==attacker).forEach((a,i)=>{a.x=80;a.y=120+i*85;});
  match.teams[1].actors.forEach((a,i)=>{a.x=1350;a.y=80+i*85;});
  match.ball.owner=attacker;match.ball.x=attacker.x;match.ball.y=attacker.y;
  match.controlled=attacker;match.handleAction('pass');
  // Simulate a slow ball coming to rest at its kicker's feet. Kick lockout
  // prevents an implausible instant re-capture.
  match.ball.x=attacker.x;match.ball.y=attacker.y;
  match.ball.vx=0;match.ball.vy=0;match.ball.vz=0;match.ball.z=0;
  match.update(.16,1);
  assert.notEqual(match.ball.owner,attacker);
});

test('touchline and goal-line exits use correct kick-in corner or goal clearance',()=>{
  for(const kind of ['kickin','corner','clearance']){
    const match=buildPhysicalMatch();
    match.ball.owner=null;
    match.ball.x=kind==='kickin'?780:1505;
    match.ball.y=kind==='kickin'?-4:105;
    match.ball.vx=kind==='kickin'?0:120;
    match.ball.vy=kind==='kickin'?-100:0;match.ball.vz=0;match.ball.z=0;
    match.lastTouchId=match.teams[kind==='corner'?1:0].actors[1].id;
    match.update(.017,1);
    const incident=match.events.find(e=>e.type===kind);
    assert.ok(incident,'missing restart event: '+kind);
    const expectedSide=kind==='corner'?0:1;
    assert.equal(incident.side,expectedSide);
    for(let i=0;i<80;i++)match.update(.016,1);
    const played=match.events.find(e=>e.type==='restart');
    assert.ok(played,'restart never taken: '+kind);
    assert.equal(played.side,expectedSide);
  }
});

test('powerful shot is parried rather than glued to the keeper',()=>{
  const match=buildPhysicalMatch();
  const shooter=match.teams[0].actors.find(a=>a.slot==='ST');
  const keeper=match.teams[1].actors.find(a=>a.slot==='GK');
  shooter.x=820;shooter.y=420;
  match.teams[0].actors.filter(a=>a!==shooter).forEach((a,i)=>{a.x=90;a.y=100+i*60;});
  match.teams[1].actors.filter(a=>a!==keeper).forEach((a,i)=>{a.x=1100;a.y=80+i*60;});
  keeper.x=1360;keeper.y=420;
  match.ball.owner=shooter;match.ball.x=shooter.x;match.ball.y=shooter.y;
  match.setDirectControl(true);match.controlled=shooter;match.handleAction('shoot',1);
  for(let i=0;i<13;i++)match.update(.01,1);
  match.ball.owner=null;match.ball.x=keeper.x-12;match.ball.y=keeper.y;
  match.ball.z=0;match.ball.vx=750;match.ball.vy=0;match.ball.vz=0;
  match.update(.02,1);
  assert.ok(match.events.some(e=>e.type==='save'));
  assert.notEqual(match.ball.owner,keeper);
});

test('rival signings are unique, persisted and applied to opponents',()=>{
  const source=fs.readFileSync(gamePath,'utf8');
  assert.match(source,/function runRivalTransfers\(\)/);
  assert.match(source,/state\.rivalSignings=state\.rivalSignings\|\|\{\}/);
  assert.match(source,/state\.season\+\+;state\.round=0;[\s\S]*?runRivalTransfers\(\)/);
  assert.match(source,/roster\.push\(recruited\);signings\.push\(recruited\)/);
  assert.match(source,/if\(!original\|\|rivalSignedIds\(\)\[original\.id\]\)return/);
});


test('held manual shot never fires before release, even past the idle AI timeout',()=>{
  for(let seed=0;seed<12;seed++){
    const m=buildPhysicalMatch();
    const attacker=m.teams[0].actors.find(a=>a.slot==='ST');
    attacker.x=1240;attacker.y=420;
    m.teams[1].actors.forEach(a=>{a.x=200;a.y=80;});
    m.ball.owner=attacker;m.ball.x=attacker.x;m.ball.y=attacker.y;m.possession=0;
    m.setDirectControl(true);m.controlled=attacker;
    assert.equal(m.beginKick('shoot'),true);
    for(let i=0;i<115;i++)m.update(.016,1); // 1.84 seconds, beyond 1.15s idle AI
    assert.equal(m.getControlState().chargeLevel,1,'charge lost on seed '+seed);
    assert.equal(m.events.filter(e=>e.type==='shot').length,0,'AI kicked early on seed '+seed);
    assert.equal(m.releaseKick('shoot',true),true);
    assert.equal(m.events.filter(e=>e.type==='shot').length,1,'release did not shoot once');
  }
});

test('manual player switching cancels a held kick without firing it',()=>{
  const m=buildPhysicalMatch();
  const attacker=m.teams[0].actors.find(a=>a.slot==='ST');
  m.ball.owner=attacker;m.ball.x=attacker.x;m.ball.y=attacker.y;
  m.setDirectControl(true);m.controlled=attacker;
  assert.equal(m.beginKick('shoot'),true);
  m.handleAction('switch');
  assert.equal(m.getControlState().chargeKind,null);
  assert.equal(m.releaseKick('shoot',true),false);
  assert.equal(m.events.filter(e=>e.type==='shot').length,0);
});

test('tablet coach drawer is accessible and closed before play to protect touch pad',()=>{
  const html=fs.readFileSync(indexPath,'utf8');
  const game=fs.readFileSync(gamePath,'utf8');
  const css=fs.readFileSync(stylePath,'utf8');
  assert.match(html,/id="matchCoachToggle"[^>]+aria-controls="matchCoachPanel"/);
  assert.match(html,/id="matchCoachPanel" class="match-side"/);
  assert.match(html,/style\.css\?v=17/);
  assert.match(html,/game\.js\?v=17/);
  assert.match(game,/function setCoachPanelOpen\(open\)/);
  assert.match(game,/setCoachPanelOpen\(false\);if\(match\.setDirectControl\)/);
  assert.match(game,/step\.key==='tactic'\)setCoachPanelOpen\(true\)/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/\.match-layer\.coach-open \.match-side\{display:flex\}/);
  assert.match(css,/\.match-side\{display:none;position:absolute;top:72px/);
});


test('offscreen manager scoring tracks the physical five-a-side league scale',()=>{
  const context={window:{},Image:class{set src(value){this.source=value;}},performance:{now:()=>0}};
  vm.createContext(context);
  for(const file of ['data.js','sim.js','futsal-history-match.js']){
    vm.runInContext(fs.readFileSync(path.join(gameDir,file),'utf8'),context,{filename:file});
  }
  const D=context.window.SeedFCData,Sim=context.window.SeedFCSim,Physical=context.window.SeedFutsalHistory;
  let physicalGoals=0,managerGoals=0;
  for(let i=0;i<28;i++){
    const home=D.clubs[(i+2)%8],away=D.clubs[(i+5)%8];
    const formations=['1-2-1','2-2','3-1','4-0'],attacks=['short','direct','wide'];
    const opts={homeClub:home,awayClub:away,
      homeRoster:JSON.parse(JSON.stringify(home.players)),
      awayRoster:JSON.parse(JSON.stringify(away.players)),
      homeLineup:home.players.slice(0,5).map(p=>p.id),
      awayLineup:away.players.slice(0,5).map(p=>p.id),
      homeFormation:formations[(i+2)%4],awayFormation:formations[i%4],
      homeTactics:{attack:attacks[(i+1)%3],press:i%2?'press':'shape',
        mindset:i%3===0?'attack':'balanced',line:i%2?'high':'standard',
        tempo:i%2?'fast':'normal',width:i%2?'wide':'normal'},
      awayTactics:{attack:'short',press:'shape',mindset:'balanced',
        line:'standard',tempo:'normal',width:'normal'},
      formations:D.formations,seed:'validation-seed-'+i};
    const a=Physical.create(opts),b=Sim.create(opts);
    a.runToEnd();b.runToEnd();
    assert.ok(a.finished&&b.finished,'match did not end');
    physicalGoals+=a.score[0]+a.score[1];managerGoals+=b.score[0]+b.score[1];
  }
  // Cohort-level guard, not a claim that each match should have the same score.
  const ratio=managerGoals/Math.max(1,physicalGoals);
  assert.ok(ratio>.63&&ratio<1.5,
    'offscreen scoring diverged: '+managerGoals+' vs '+physicalGoals+' ('+ratio.toFixed(2)+')');
});
