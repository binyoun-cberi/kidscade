'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','games','high_one_life');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=fs.readFileSync(path.join(root,'game.js'),'utf8');
const Sim=require(path.join(root,'engine.js'));
const Identity=require(path.join(root,'identity-v20.js'));
global.window={OneLifeSim:Sim};
const World=require(path.join(root,'world-v2.js'));
const Scene=require(path.join(root,'pixel-scene.js'));
global.window.OneLifeWorld2=World;
const World3=require(path.join(root,'world-v3.js'));
global.window.OneLifeWorld3=World3;
const World4=require(path.join(root,'world-v4.js'));
global.window.OneLifeWorld4=World4;
const World5=require(path.join(root,'world-v5.js'));
global.window.OneLifeWorld5=World5;
const Careers6=require(path.join(root,'careers-v6.js'));
global.window.OneLifeCareers6=Careers6;
const Events6=require(path.join(root,'events-v6.js'));
global.window.OneLifeEvents6=Events6;
const World6=require(path.join(root,'world-v6.js'));
global.window.OneLifeWorld6=World6;
const World7=require(path.join(root,'world-v7.js'));
global.window.OneLifeWorld7=World7;
const World8=require(path.join(root,'world-v8.js'));
global.window.OneLifeWorld8=World8;
global.window.OneLifeScene=Scene;
const Scenes6=require(path.join(root,'scenes-v6.js'));
global.window.OneLifeScenes6=Scenes6;
const Scenes8=require(path.join(root,'scenes-v8.js'));
const History=require(path.join(root,'history.js'));
const World9=require(path.join(root,'world-v9.js'));
global.window.OneLifeWorld9=World9;
const HistoryData10=require(path.join(root,'history-data-v10.js'));
global.window.OneLifeHistoryData10=HistoryData10;
const HistoryStories10=require(path.join(root,'history-stories-v10.js'));
global.window.OneLifeHistoryStories10=HistoryStories10;
const HistoryEffects10=require(path.join(root,'history-effects-v10.js'));
global.window.OneLifeHistoryEffects10=HistoryEffects10;
const World10=require(path.join(root,'world-v10.js'));
global.window.OneLifeWorld10=World10;
const HistoryChoices11=require(path.join(root,'history-choices-v11.js'));
global.window.OneLifeHistoryChoices11=HistoryChoices11;
const EraPolicy12=require(path.join(root,'era-policy-v12.js'));
global.window.OneLifeEraPolicy12=EraPolicy12;
const World12=require(path.join(root,'world-v12.js'));
global.window.OneLifeWorld12=World12;
const World13=require(path.join(root,'world-v13.js'));
global.window.OneLifeWorld13=World13;
const Joseon=require(path.join(root,'joseon-v1.js'));
global.window.OneLifeJoseon=Joseon;
const Joseon2=require(path.join(root,'joseon-v2.js'));
global.window.OneLifeJoseon2=Joseon2;
const Joseon3=require(path.join(root,'joseon-v3.js'));
global.window.OneLifeJoseon3=Joseon3;
const Joseon4=require(path.join(root,'joseon-v4.js'));
global.window.OneLifeJoseon4=Joseon4;
const Joseon5=require(path.join(root,'joseon-v5.js'));
global.window.OneLifeJoseon5=Joseon5;
const Joseon6=require(path.join(root,'joseon-v6.js'));
delete global.window;
const makeElement=(tag='div')=>{
 const listeners={}; const classes=new Set();
 const elem={tagName:tag.toUpperCase(),textContent:'',innerText:'',value:'',disabled:false,style:{},
  children:[],dataset:{},attributes:{},scrollTop:0,scrollHeight:2000,clientHeight:200,
  classList:{add:(key)=>classes.add(key),remove:(key)=>classes.delete(key),
    contains:(key)=>classes.has(key),toggle:(key,on)=>{if(on===undefined)on=!classes.has(key);if(on)classes.add(key);else classes.delete(key);return on;}},
  addEventListener:(key,fn)=>{listeners[key]=fn;},
  setAttribute:(key,val)=>{elem.attributes[key]=val;},
  append:(...nodes)=>{elem.children.push(...nodes);},
  replaceChildren:(...nodes)=>{elem.children=[...nodes];},
  scrollIntoView:()=>{},focus:()=>{},click:()=>listeners.click?.(),
  getContext:()=>({fillRect(){},fillText(){},set fillStyle(value){},set font(value){},set textAlign(value){},set imageSmoothingEnabled(value){}})};
 return elem;
};
test('full controller smoke simulation displays birth registry, economy, canvas and death recap',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const nodes=new Map(ids.map(id=>[id,makeElement()]));
 const get=id=>{assert.ok(nodes.has(id),'missing DOM node '+id);return nodes.get(id);};
 const focusButtons=[...html.matchAll(/\bdata-focus="([^"]+)"/g)].map(x=>{const e=makeElement('button');e.dataset.focus=x[1];return e;});
 const storyButtons=[...html.matchAll(/\bdata-story-tab="([^"]+)"/g)].map(x=>{const e=makeElement('button');e.dataset.storyTab=x[1];return e;});
 const peerButtons=[...html.matchAll(/\bdata-peer-age="([^"]+)"/g)].map(x=>{const e=makeElement('button');e.dataset.peerAge=x[1];return e;});
 const backdrop=makeElement();
 let now=0,intervalIndex=0;
 const intervals=new Map(),saved=new Map();
 const document={hidden:false,body:makeElement('body'),getElementById:get,
  querySelector:(q)=>q==='[data-close="rules"]'?backdrop:null,
  querySelectorAll:q=>q==='[data-focus]'?focusButtons:q==='[data-story-tab]'?storyButtons:q==='[data-peer-age]'?peerButtons:[],
  createElement:makeElement,addEventListener:()=>{}};
 const localStorage={getItem:key=>saved.get(key)||null,setItem:(key,val)=>{saved.set(key,val);},removeItem:key=>saved.delete(key)};
 const sdk={start:()=>{},result:(payload)=>{document.result=payload;},registerPauseHandlers:()=>{},registerCleanup:()=>{}};
 // Use a reproducible full-length life to test adult UI without early-death flakiness.
 const StableSim={...Sim,Life:class extends Sim.Life{
  constructor(seed,options){super(seed===undefined?911:seed,options);}
 }};
 const window={OneLifeSim:StableSim,OneLifeIdentity20:Identity,OneLifeWorld2:World,OneLifeWorld3:World3,OneLifeWorld4:World4,OneLifeWorld5:World5,OneLifeWorld6:World6,OneLifeWorld7:World7,OneLifeWorld8:World8,OneLifeCareers6:Careers6,OneLifeEvents6:Events6,OneLifeScene:Scene,OneLifeScenes6:Scenes6,OneLifeScenes8:Scenes8,OneLifeHistory:History,OneLifeWorld9:World9,OneLifeWorld10:World10,OneLifeWorld12:World12,OneLifeWorld13:World13,OneLifeJoseon:Joseon,OneLifeJoseon2:Joseon2,OneLifeJoseon3:Joseon3,OneLifeJoseon4:Joseon4,OneLifeJoseon5:Joseon5,OneLifeJoseon6:Joseon6,KidscadeGame:sdk,
  scrollTo(){},addEventListener(){}};
 new Function('window','document','localStorage','performance','setInterval','clearInterval',
  code)(window,document,localStorage,{now:()=>now},
    fn=>{intervals.set(++intervalIndex,fn);return intervalIndex;},
    id=>intervals.delete(id));
 const beat=[...intervals.values()][0];
 get('drawBtn').click();
 assert.ok(intervals.size===2);
 const draw=[...intervals.values()][1];
 for(let i=0;i<19;i++)draw();
 assert.ok(!get('birthCertificate').classList.contains('hidden'));
 assert.ok(get('birthName').textContent.length>0);
 assert.ok(get('birthMother').textContent.includes('세'));
 assert.ok(get('birthPlace').textContent.length>0);
 assert.ok(get('birthHome').textContent.length>0);
 assert.ok(get('birthContext').textContent.length>0);
 get('lifeStartBtn').click();
 assert.ok(!get('play').classList.contains('hidden'));
 assert.ok(get('profileName').textContent.length>0);
 const ageBeforePause=Number(get('currentAge').textContent);
 get('pauseBtn').click();
 now+=2000;beat();
 assert.equal(Number(get('currentAge').textContent),ageBeforePause,'pause must freeze age progression');
 assert.match(get('pauseBtn').textContent,/이어가기/);
 get('pauseBtn').click();
 assert.match(get('pauseBtn').textContent,/일시정지/);
 assert.equal(get('lifeScene').width,600);
 assert.equal(get('peers').children.length,4);
 storyButtons.find(b=>b.dataset.storyTab==='stats').click();
 assert.ok(!get('storyStats').classList.contains('hidden'));
 assert.match(get('survivalActual').attributes.d,/^M/);
 assert.match(get('survivalSummary').textContent,/참고용 생존 곡선/);
 storyButtons.find(b=>b.dataset.storyTab==='years').click();
 assert.equal(get('ageMap').children.length,108);
 assert.equal(get('ageMap').children[107].disabled,true,'future map cells should not be interactive');
 assert.equal(get('ageMap').children[0].disabled,false,'birth-year map cell should be interactive');
 get('ageMap').children[0].click();
 assert.match(get('yearDetail').textContent,/0세/);
 storyButtons.find(b=>b.dataset.storyTab==='peers').click();
 peerButtons.find(b=>b.dataset.peerAge==='0').click();
 assert.equal(get('peers').children.length,4);
 storyButtons.find(b=>b.dataset.storyTab==='peers').click();
 let sawMoney=false,sawDecision=false,sawChildhood=false,sawWork=false;
 for(let n=0;n<1600&&!document.result;n++){
  now+=100;
  beat();
  if(!get('newbornModal').classList.contains('hidden'))get('newbornNameRandom').click();
  const age=Number(get('currentAge').textContent);
  if(age<18)sawChildhood=true;
  if(age>=25)sawWork=true;
  if(age>=30 && get('annualIncome').textContent!=='0')sawMoney=true;
  const decision=get('decision');
  if(!decision.classList.contains('hidden')){
   sawDecision=true;
   const buttons=get('choiceOptions').children.filter(x=>x.tagName==='BUTTON');
   assert.ok(buttons.length);
   buttons[0].click();
  }
 }
 assert.ok(document.result,'game never reached ending');
 assert.ok(sawChildhood&&sawWork&&sawMoney&&sawDecision);
 assert.equal(document.result.status,'completed');
 assert.ok(!get('end').classList.contains('hidden'));
 assert.match(get('endNetWorth').textContent,/점/);
 assert.ok(get('endHighlights').children.length>0);
 assert.ok(get('endCountry').textContent.length>0);
 assert.ok(get('arcCount').textContent.includes('선택'));
 assert.match(get('careerChangeCount').textContent,/직업 이력/);
 assert.ok(get('careerJourney').children.length>=1);
 assert.ok(get('traitAptitude').textContent.includes('관심'));
 assert.ok(get('traitQualification').textContent.length>0);
 assert.ok(get('worldEventCount').textContent.includes('사건'));
 assert.ok(get('worldRegionLabel').textContent.length>0);
 assert.ok(get('arcMilestones').children.length>0);
 const firstName=get('birthName').textContent;
 document.result=null;
 get('sameBirthBtn').click();
 assert.equal(get('birthName').textContent,firstName,'same birth should use same generated identity');
 assert.ok(!get('birth').classList.contains('hidden'));
 assert.ok(!get('birthCertificate').classList.contains('hidden'));
 get('lifeStartBtn').click();
 let changedDecisions=0;
 for(let n=0;n<1800&&!document.result;n++){
   now+=100;beat();
   if(!get('newbornModal').classList.contains('hidden'))get('newbornNameRandom').click();
   if(!get('decision').classList.contains('hidden')){
     const choices=get('choiceOptions').children.filter(x=>x.tagName==='BUTTON');
     assert.ok(choices.length>0);
     choices[choices.length-1].click();
     changedDecisions++;
   }
 }
 assert.ok(document.result,'same birth replay never reached ending');
 assert.ok(changedDecisions>2,'replay choices did not display');
 assert.ok(!get('endComparison').classList.contains('hidden'));
 assert.ok(get('endComparisonRows').children.length>=7);
 assert.ok(get('endComparisonRows').children.some(node=>node.classList.contains('changed')),'no changed outcome or choices');
 // The exact same controller must also support a birth in colonial-era Korea.
 get('birthYearInput').value='1919';
 get('birthLocation').value='korea';
 get('drawBtn').click();
 const historicDraw=[...intervals.values()].at(-1);
 for(let i=0;i<19;i++)historicDraw();
 assert.match(get('birthDate').textContent,/^1919년/);
 assert.match(get('birthPlace').textContent,/한반도/);
 assert.match(get('birthEraNote').textContent,/그 시대의 한반도/);
 get('lifeStartBtn').click();
 assert.equal(get('currentYear').textContent,'1919년');
 assert.match(get('historyContext').textContent,/일제강점기/);
 assert.ok(get('sceneLabel').textContent.includes('의 풍경'));
 assert.match(get('countrySourceNote').textContent,/이 시기의 생활환경/);
 // Joseon births must open their own historical scene instead of modern stock scenery.
 get('birthYearInput').value='1580';
 get('birthLocation').value='korea';
 get('drawBtn').click();
 const joseonDraw=[...intervals.values()].at(-1);
 for(let i=0;i<19;i++)joseonDraw();
 assert.match(get('birthDate').textContent,/^1580년/);
 get('lifeStartBtn').click();
 assert.equal(get('currentYear').textContent,'1580년');
 assert.match(get('historyContext').textContent,/조선/);
 assert.match(get('sceneLabel').textContent,/봄|여름|가을|겨울/);
 assert.match(get('v12EconomyEra').textContent,/논밭|농사|살림/);
 assert.doesNotMatch(get('v12EconomyEra').textContent,/몫|게임용|설정/);
 assert.match(get('v13FamilyStatus').textContent,/식구|자녀|배우자/);
 assert.ok(get('v9PeopleList').children.length>=2);
 assert.match(get('countryContextText').textContent,/태어났다/);
 assert.equal(get('certificateTitle').textContent,'집안의 첫 기록');
 assert.equal(get('birthFlag').textContent,'生');
 assert.equal(get('hopaHolder').textContent.length>0,true);
 assert.equal(get('hopaDisplay').classList.contains('hidden'),false);
 assert.equal(document.body.classList.contains('joseon-book'),true);
 assert.doesNotMatch(get('birthHome').textContent,/몫|게임용|설정/);
 assert.match(get('birthHome').textContent,/전답|논밭/);
 assert.match(get('v12EconomyEra').textContent,/전답|살림/);
 assert.doesNotMatch(get('v12ChoicesCount').textContent,/\d+번|\d+단계|\d+점/);
 assert.doesNotMatch(get('v12EducationEra').textContent,/\d+단계/);
 assert.doesNotMatch(get('birthEraNote').textContent,/게임용|설정/);
 assert.equal(get('birthDate').textContent.includes('월'),false,'조선 출생 장면에는 양력식 생일을 덧씌우지 않는다');
});
