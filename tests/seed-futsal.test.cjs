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
  assert.match(html,/futsal-history-match\.js\?v=16/);
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
    a.events.map(e=>[e.minute,e.type,e.actorId||null]),
    b.events.map(e=>[e.minute,e.type,e.actorId||null])
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
    match.ball.owner=striker;match.possession=0;
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
