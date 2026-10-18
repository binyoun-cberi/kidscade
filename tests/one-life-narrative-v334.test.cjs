'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
function runtime(){const c={console};c.window=c;vm.createContext(c);for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),c);return c;}
function fixture(){const c=runtime(),l=new c.OneLifeSim.Life(17,{birthYear:1580,countryName:'대한민국',birthSetup:{gender:'남자'}});l.age=25;l.year=1605;const j=c.OneLifeJoseon.ensure(l),v=c.OneLifeJoseon2.ensure(l),s=c.OneLifeJoseon4.ensure(l),p=s.people.find(x=>x.role==='mother');p.alive=true;s.queue=[];s.active={id:'1605-care',kind:'elders',personId:p.id,year:1605};l.pending='joseon4:1605-care';return {c,l,j,v,s,p};}
test('sending household support spends available provisions and records exactly what was sent across restore',()=>{
 const {c,l,j,v,s}=fixture();j.capital=10;v.grain=3;a.ok(c.OneLifeJoseon4.choose(l,1));a.equal(v.grain,0);a.equal(j.capital,1);
 const record=l.log.find(e=>e.causeId==='joseon4:1605-care');a.match(record.text,/곡식/);a.doesNotMatch(record.text,/ — /);
 const restored=c.OneLifeSim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));a.equal(restored.joseon4.followups.find(f=>f.id==='1605-care').evidence.grainSent,3);
});
test('no provisions offers a visit, while hands-on help has the stated missed-income cost',()=>{
 let f=fixture();f.j.capital=-10;f.v.grain=0;a.equal(f.c.OneLifeJoseon4.prompt(f.l).options[1].action,'visit');a.ok(f.c.OneLifeJoseon4.choose(f.l,1));a.equal(f.j.capital,-10);a.doesNotMatch(f.l.log.at(-1).text,/돈을 보냈|곡식을 덜어/);
 f=fixture();f.j.capital=20;a.ok(f.c.OneLifeJoseon4.choose(f.l,0));a.equal(f.j.capital,17);a.match(f.l.log.find(e=>e.kind==='joseon4-choice').text,/벌이는 줄었다/);
});
test('a parent without literacy seeks teaching rather than claiming to teach letters',()=>{
 const f=fixture();f.j.literacy=0;f.s.active.kind='child-school';f.p.role='child';const q=f.c.OneLifeJoseon4.prompt(f.l);a.equal(q.options[0].action,'arrangeSchool');a.ok(f.c.OneLifeJoseon4.choose(f.l,0));a.equal(f.p.learning,3);a.match(f.l.log.find(e=>e.kind==='joseon4-choice').text,/도울 사람/);
});
test('ending orders actual events and omits stock inventories, placeholder choices and duplicate causes',()=>{
 const B=require(path.join(root,'biography-v328.js'));const l={birthYear:1580,log:[{age:40,kind:'joseon4-choice',causeId:'a',text:'동생에게 곡식을 보냈다.'},{age:8,kind:'joseon-life',text:'집안에서 글을 배웠다.'},{age:40,kind:'joseon4-memory',causeId:'a',text:'같은 일을 다시 적었다.'},{age:20,kind:'joseon6-choice',text:'첫 장시 — 시세를 알아본다'},{age:30,kind:'event',text:'작은 흔적을 남겼다.'}]};
 const result=B.chapters(l,{place:'조선'}).join(' ');a.ok(result.indexOf('8세')<result.indexOf('40세'));a.doesNotMatch(result,/ — |작은 흔적|같은 일을 다시|서책 6/);a.equal((result.match(/곡식을 보냈다/g)||[]).length,1);
});
