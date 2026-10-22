'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const auto=require(path.join(root,'auto-choice-v1.js'));
const file=n=>fs.readFileSync(path.join(root,n),'utf8');
test('automatic choice is consistent and never consumes the simulated random stream',()=>{
 const life={seed:1717,year:1600,age:24,pending:'joseon-choice',rng:124567,alive:true,
  log:[{age:24,text:'an event'}],getReflection(){return null},
  getChoice(){return {title:'새로운 길',options:[{label:'가'},{label:'나'},{label:'다'}]};}};
 const start=JSON.stringify({rng:life.rng,log:life.log,pending:life.pending});
 const first=auto.decide(life),second=auto.decide(life);
 assert.deepEqual(first,second);
 assert.ok(first.index>=0&&first.index<3);
 assert.equal(JSON.stringify({rng:life.rng,log:life.log,pending:life.pending}),start);
});
test('linked options are processed exactly one step per call; reflections need no typed answer',()=>{
 let calls=0;
 const life={seed:15,year:1450,age:25,pending:'chain:1',alive:true,
  log:[],getReflection(){return null},getChoice(){return {options:[{},{}],title:'첫 갈림길'};},
  choose(i){assert.ok(i===0||i===1);calls++;this.pending=calls===1?'chain:2':null;return true;}};
 assert.equal(auto.tick(life),true);assert.equal(calls,1);
 assert.equal(life.pending,'chain:2');
 assert.equal(auto.tick(life),true);assert.equal(calls,2);
 assert.equal(auto.tick(life),false);
 const reflection={pending:'reflection:30',alive:true,getReflection(){return 30;},
  reflect(text){assert.equal(text,'');this.pending=null;return true;}};
 assert.equal(auto.tick(reflection),true);
 assert.equal(reflection.pending,null);
});
test('automatic decisions stop safely when dead, missing, or unsupported',()=>{
 assert.equal(auto.decide(null),null);
 assert.equal(auto.decide({alive:false,pending:1}),null);
 assert.equal(auto.tick({alive:true,pending:'other',getReflection(){return null},getChoice(){return null}}),false);
});
test('automatic choice is optional, restored only from explicit opt-in, available on both play screens',()=>{
 const game=file('game.js'),html=file('index.html'),goryeo=file('goryeo-view-v343.js');
 assert.match(game,/let autoChoiceMode=false/);
 assert.match(game,/autoChoiceMode=safeGet\(SAVE_KEY\)\?\.autoChoiceMode===true/);
 assert.match(game,/if\(autoChoiceMode&&now-lastAutoChoiceAt>=650&&!namingChild\)/);
 assert.match(game,/if\(stage!=='play'\|\|!life\|\|!life\.alive\|\|paused\|\|document\.hidden\)return/);
 assert.match(game,/OneLifeAutoChoiceV1\.tick\(life\)/);
 assert.match(html,/id="autoChoiceBtn"[^>]*aria-pressed="false"/);
 assert.match(html,/auto-choice-v1\.js\?v=2/);
 assert.match(goryeo,/handlers\.toggleAuto/);
});

test('historical autopilot prefers possible grain, market and capital choices',()=>{
 const before={rng:928283,log:[{age:25,text:'해가 바뀌었다'}]};
 const goryeo={seed:23,age:25,year:1325,alive:true,pending:'goryeo343:supplies',
  ...before,goryeo343:{grain:2,pocket:1},
  getReflection(){return null},
  getChoice(){return {title:'곡식 나눔',options:[
   {label:'곡식 열 말을 내놓기',delta:{grain:-10}},
   {label:'그만큼은 어렵다',delta:{grain:0}},
   {label:'지금은 도와줄 만큼 내기',delta:{grain:-1}}]};}};
 const snapshot=JSON.stringify(goryeo.goryeo343);
 for(let i=0;i<6;i++){const selected=auto.decide(goryeo);assert.ok([1,2].includes(selected.index));}
 assert.equal(JSON.stringify(goryeo.goryeo343),snapshot);
 assert.equal(goryeo.rng,before.rng);
 const joseon={seed:23,age:25,year:1625,alive:true,pending:'joseon:market',
  joseon:{capital:3},joseon2:{grain:1},log:[],
  getReflection(){return null},
  getChoice(){return {title:'장터',options:[
   {label:'많이 사기',cost:10,grain:0},
   {label:'곡식 많이 나누기',grain:5,cost:0},
   {label:'그대로 돌아가기',cost:0,grain:0}]};}};
 assert.equal(auto.decide(joseon).index,2);
});
test('historical costs do not break choices when resources are unknown or none affordable',()=>{
 const life={seed:777,age:24,year:1380,alive:true,pending:'goryeo343:hard',
  goryeo343:{grain:0,pocket:0},log:[],
  getReflection(){return null},
  getChoice(){return {title:'어려운 시절',options:[
   {delta:{grain:-1}},{delta:{pocket:-5}}]};}};
 const x=auto.decide(life);
 assert.ok(x.index===0||x.index===1,'legacy no-affordable choice still resolves by ordinary rules');
 assert.equal(auto.canAfford(life,{delta:{grain:-2}}),false);
 assert.deepEqual(auto.eligibleIndices(life,[{delta:{pocket:-1}},{delta:{grain:0}}]),[1]);
});

test('a paused pending choice can be resumed after the app becomes visible',()=>{
 const game=file('game.js');
 assert.match(game,/\$\('pauseBtn'\)\.disabled = !life\?\.alive;/);
 assert.match(game,/function togglePause\(\) \{\s*if\(stage!=='play'\|\|!life\?\.alive\) return;/);
 assert.match(game,/resume:\(\)=>\{if\(stage!=='play'\|\|!life\?\.alive\)return;paused=false;/);
 assert.match(game,/\$\('playStatus'\)\.textContent = paused \? '일시정지'/);
 assert.match(game,/if\(document\.hidden && stage==='play'\)\{paused=true;updatePause\(\);save\(\);\}/);
});

test('auto decisions favor the explicitly chosen direction without inventing effects',()=>{
 const choice={title:'앞으로의 길',options:[
  {label:'더 공부하기',effects:{knowledge:12,health:-2}},
  {label:'몸을 돌보기',effects:{health:14,knowledge:1}},
  {label:'일 시작하기',effects:{wealth:10,health:-5}}]};
 const life={seed:2026,year:2046,age:20,pending:20,alive:true,focus:'health',log:[],
  getReflection(){return null},getChoice(){return choice}};
 const before=JSON.stringify(choice);
 assert.equal(auto.decide(life).index,1);
 life.focus='learning';assert.equal(auto.decide(life).index,0);
 life.focus='work';assert.equal(auto.decide(life).index,2);
 life.focus='balance';assert.ok([0,1,2].includes(auto.decide(life).index));
 life.focus='people';assert.deepEqual(auto.preferredIndices(life,choice.options,[0,1,2]),[0,1,2]);
 assert.equal(JSON.stringify(choice),before);
});
test('affordability stays ahead of life focus; unknown effect data is not guessed',()=>{
 const options=[
  {delta:{grain:-9},effects:{knowledge:20}},
  {delta:{grain:0},effects:{knowledge:1}},
  {delta:{grain:0},effects:{health:3}}];
 const life={seed:3,year:1320,age:20,pending:'goryeo343:work',alive:true,focus:'learning',
  log:[],goryeo343:{grain:1,pocket:0},getReflection(){return null},
  getChoice(){return {title:'곡식을 나누는 일',options}}};
 assert.deepEqual(auto.eligibleIndices(life,options),[1,2]);
 assert.deepEqual(auto.preferredIndices(life,options,[1,2]),[1,2],
  'one known effect cannot be compared with a missing effect');
 assert.ok([1,2].includes(auto.decide(life).index));
});
