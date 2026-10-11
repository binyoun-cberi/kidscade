'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','games','high_one_life');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=fs.readFileSync(path.join(root,'game.js'),'utf8');
const Sim=require(path.join(root,'engine.js'));
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
global.window.OneLifeScene=Scene;
const Scenes6=require(path.join(root,'scenes-v6.js'));
delete global.window;
const makeElement=(tag='div')=>{
 const listeners={}; const classes=new Set();
 const elem={tagName:tag.toUpperCase(),textContent:'',innerText:'',disabled:false,style:{},
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
 const backdrop=makeElement();
 let now=0,intervalIndex=0;
 const intervals=new Map(),saved=new Map();
 const document={hidden:false,body:makeElement('body'),getElementById:get,
  querySelector:(q)=>q==='[data-close="rules"]'?backdrop:null,
  querySelectorAll:q=>q==='[data-focus]'?focusButtons:[],
  createElement:makeElement,addEventListener:()=>{}};
 const localStorage={getItem:key=>saved.get(key)||null,setItem:(key,val)=>{saved.set(key,val);},removeItem:key=>saved.delete(key)};
 const sdk={start:()=>{},result:(payload)=>{document.result=payload;},registerPauseHandlers:()=>{},registerCleanup:()=>{}};
 const window={OneLifeSim:Sim,OneLifeWorld2:World,OneLifeWorld3:World3,OneLifeWorld4:World4,OneLifeWorld5:World5,OneLifeWorld6:World6,OneLifeCareers6:Careers6,OneLifeEvents6:Events6,OneLifeScene:Scene,OneLifeScenes6:Scenes6,KidscadeGame:sdk,
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
 get('lifeStartBtn').click();
 assert.ok(!get('play').classList.contains('hidden'));
 assert.ok(get('profileName').textContent.length>0);
 assert.equal(get('lifeScene').width,600);
 assert.equal(get('peers').children.length,4);
 let sawMoney=false,sawDecision=false,sawChildhood=false,sawWork=false;
 for(let n=0;n<1600&&!document.result;n++){
  now+=100;
  beat();
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
});
