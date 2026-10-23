const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),dir=root+'/games/high_one_life';
const baselineRef=process.argv[2];
if(!baselineRef){console.error('Usage: node scripts/audit-one-life-live-prose-v1.cjs <pre-edit-git-ref> [report.json]');process.exit(2);}
const reportPath=process.argv[3]||'/tmp/live-prose-report.json';
const changed=['goryeo-v343.js','joseon-v6.js','joseon-women-v327.js','history-choices-v11.js','world-v12.js','world-v9.js'];
function context(baseline){const c={console};c.window=c;vm.createContext(c);
 for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g)){
  if(['game.js','goryeo-view-v343.js'].includes(m[1]))continue;
  const source=baseline&&changed.includes(m[1])?cp.execFileSync('git',['show',baselineRef+':games/high_one_life/'+m[1]],{cwd:root,encoding:'utf8',maxBuffer:1024*1024}):fs.readFileSync(dir+'/'+m[1],'utf8');
  vm.runInContext(source,c,{filename:m[1]});
 }return c;
}
const prior=context(true),current=context(false),years=[1210,1270,1350,1580,1740,1880,1919,1950,1980,2026];
function normalize(x,key=''){
 if(key==='text'||key==='message')return '<prose>';
 if(typeof x==='string'&&key==='memories')return '<memory>';
 if(Array.isArray(x))return x.map(e=>normalize(e,key));
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,normalize(v,k)]));return x;
}
function firstDifference(a,b,p=''){
 if(JSON.stringify(a)===JSON.stringify(b))return null;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return {path:p,before:a,after:b};
 for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const d=firstDifference(a[k],b[k],p+'.'+k);if(d)return d;}
}
function play(c,seed,birthYear,countryName){
 const l=new c.OneLifeSim.Life(seed,{birthYear,countryName,birthSetup:{gender:seed%2?'여자':'남자'}});let steps=0,choices=0;
 while(l.alive&&steps++<650){const q=l.getChoice();if(q){l.choose((seed+l.age+choices)%q.options.length);choices++;}else if(l.getReflection())l.reflect('');else l.tick();}
 assert.equal(l.alive,false);return {life:l,snapshot:JSON.parse(JSON.stringify(l.snapshot())),choices};
}
let lives=0,choices=0,events=0,edited=0;const examples=[];const issues=[];
for(const year of years)for(let seed=1;seed<=12;seed++){
 const country=year>=1950&&seed%4===0?'인도':'대한민국',a=play(prior,seed,year,country),b=play(current,seed,year,country);
 const diff=firstDifference(normalize(a.snapshot),normalize(b.snapshot));if(diff){console.log(JSON.stringify({seed,year,diff}));process.exit(1);}
 const log=b.life.log;events+=log.length;edited+=log.filter((e,i)=>e.text!==a.life.log[i]?.text).length;
 for(const e of log)if(/아버지이|어머니이|삼베 짜기과|그때 겪은 ‘|의 경험이 지금의 삶|배운 방법을 확인하고 경험을 쌓았다|일을 마쳤다\. 어려움을 돌아보며/.test(e.text))issues.push({year,seed,text:e.text});
 if(seed===11&&[1270,1580,1919,2026].includes(year))examples.push({year,seed,age:b.life.age,name:b.life.profile.name,lines:log.filter(e=>['goryeo-choice','goryeo-life','joseon6-followup','joseonWomen327-memory','era-choice','era-followup'].includes(e.kind)).slice(0,15)});
 lives++;choices+=b.choices;
}
fs.writeFileSync(reportPath,JSON.stringify({lives,choices,events,edited,issues,examples},null,2));
assert.ok(edited>0,'The comparison ref must precede the prose edits');assert.equal(issues.length,0,JSON.stringify(issues.slice(0,4)));console.log(JSON.stringify({lives,choices,events,edited,state:'all non-prose snapshot fields identical',issues:issues.length}));
