'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const L=c.OneLifeSim.Life,H=c.OneLifePaths339,J=c.OneLifeJoseon,S=c.OneLifeJoseon5;
const copy=x=>JSON.parse(JSON.stringify(x));
function life(y=1750,gender='여자',seed=7){const l=new L(seed,{birthYear:y-35,countryName:'대한민국',birthSetup:{gender}});c.OneLifeWorld8.ensure(l);l.year=y;l.age=35;l.pending=null;l.alive=true;l.stats.health=90;l.stats.knowledge=65;c.OneLifeJoseon325.ensure(l);if(y<1900){J.ensure(l).capital=40;S.ensure(l).origin='관청 장인';J.ensure(l).region='경상도';}else{l.money.netWorth=4000;}return l;}
function artisan(l){J.ensure(l).occupation='대장장이';S.ensure(l).role='쇠붙이 장인';l.joseon6={career:{code:'smith',started:l.year-6,practice:12},pending:[],active:null,history:[],memories:[],seen:[],followups:[],decisions:0,processedYear:l.year};return l;}
function force(l,key){const s=H.ensure(l);assert.ok(H.candidates(l).includes(key),key);const p={id:key+'-'+l.year,key,started:l.year,stage:0,due:l.year,status:'open',region:l.year<1900?J.ensure(l).region:l.profile.city,job:l.year<1900?J.ensure(l).occupation+' '+S.ensure(l).role:l.world6.profession,topic:'실제로 하던 일',contactId:null};s.projects.push(p);s.seen.push(key);H.promote(l);return p;}
function advance(l,p){l.year=p.due;l.age=l.year-l.birthYear;l.pending=null;H.year(l);l.pending=null;H.ensure(l).active=p.id;H.promote(l);}
test('craft is earned through actual practice; bondage and fabricated qualifications are excluded',()=>{
 const l=artisan(life());assert.ok(H.candidates(l).includes('craft'));l.joseon6.career.practice=0;assert.ok(!H.candidates(l).includes('craft'));l.joseon6.career.practice=12;S.ensure(l).origin='공노비';S.ensure(l).freed=false;assert.ok(!H.candidates(l).includes('craft'));S.ensure(l).freed=true;assert.ok(H.candidates(l).includes('craft'));
 const p=force(l,'craft'),cash=J.ensure(l).capital;assert.equal(l.choose(0),true);assert.equal(J.ensure(l).capital,cash-2);assert.equal(H.ensure(l).contacts.length,1);assert.equal(p.stage,1);assert.equal(p.status,'open');assert.equal(J.ensure(l).office,false);
 advance(l,p);assert.ok(l.getChoice());l.choose(0);advance(l,p);l.choose(0);assert.equal(p.status,'completed');assert.equal(J.ensure(l).office,false);assert.ok(l.log.filter(e=>e.causeId==='joseon339:'+p.id).length>=4);
});
test('moving cancels a joint workshop without erasing records or inventing revenue',()=>{
 const l=artisan(life()),p=force(l,'craft');l.choose(0);const cash=J.ensure(l).capital;J.ensure(l).region='함경도';l.year++;l.age++;H.year(l);assert.equal(p.status,'archived');assert.equal(J.ensure(l).capital,cash);assert.equal(H.ensure(l).contacts[0].present,false);
});
test('writing can continue in exile, requires literacy, and leaves an actual completed manuscript',()=>{
 const l=life();J.ensure(l).literacy=1;for(let i=0;i<5;i++)l.log.push({kind:'joseon6-choice',age:20+i,year:l.birthYear+20+i,text:'직접 익힌 일을 적었다.'});
 const b=c.OneLifeJoseon325.ensure(l);b.law.kind='exile';const p=force(l,'writing');assert.equal(l.choose(0),true);advance(l,p);l.choose(0);assert.equal(H.ensure(l).works.length,0);advance(l,p);l.choose(0);assert.equal(H.ensure(l).works.length,1);assert.equal(H.ensure(l).works[0].copies,2);assert.equal(b.law.kind,'exile');
 const unread=life();J.ensure(unread).literacy=0;H.ensure(unread);assert.ok(!H.candidates(unread).includes('writing'));
});
test('an unaffordable project can be deferred without contacts, costs or invented progress',()=>{
 const l=artisan(life()),p=force(l,'craft');J.ensure(l).capital=0;const before=copy(l.stats);assert.equal(l.choose(-1),false);assert.deepEqual(copy(l.stats),before);assert.equal(l.choose(0),true);assert.equal(p.status,'open');assert.equal(p.stage,0);assert.equal(p.due,l.year+1);assert.equal(l.pending,null);assert.equal(H.ensure(l).contacts.length,0);assert.equal(J.ensure(l).capital,0);
 const restored=L.restore(copy(l.snapshot())),saved=H.ensure(restored).projects[0];assert.equal(saved.due,p.due);assert.equal(saved.status,'open');
 J.ensure(restored).capital=4;advance(restored,saved);assert.equal(restored.getChoice().options[0].action,'start');assert.equal(restored.choose(0),true);assert.equal(saved.stage,1);assert.equal(J.ensure(restored).capital,2);
});
test('pending work, contacts and causal IDs restore identically at each stage',()=>{
 let l=artisan(life()),p=force(l,'craft');
 for(let i=0;i<3;i++){
  const state=copy(H.ensure(l)),q=copy(l.getChoice()),id=l.pending;l=L.restore(copy(l.snapshot()));assert.equal(l.pending,id);assert.deepEqual(copy(H.ensure(l)),state);assert.deepEqual(copy(l.getChoice()),q);p=H.ensure(l).projects[0];l.choose(0);if(i<2)advance(l,p);
 }
 const r=L.restore(copy(l.snapshot()));assert.ok(r.log.some(e=>e.causeId==='joseon339:'+p.id));assert.equal(H.ensure(r).projects[0].status,'completed');
});
test('nineteenth-century work remains recorded after legal and political transitions',()=>{
 const l=artisan(life(1892)),p=force(l,'craft');l.choose(0);l.year=1894;l.age+=2;H.year(l);assert.ok(H.ensure(l).transitions.includes(1894));
 l.pending=null;l.year=1910;l.age=l.year-l.birthYear;H.year(l);assert.equal(p.status,'archived');assert.ok(H.ensure(l).transitions.includes(1910));assert.equal(H.ensure(l).contacts.length,1);
 const r=L.restore(copy(l.snapshot()));assert.equal(H.ensure(r).projects[0].started,1892);
});
function worker(y,seed=7){const l=life(y,'여자',seed);c.OneLifeWorld6.career(l,'trades',0,'일감을 구해');l.world6.history[0].age=25;return l;}
test('modern retraining takes years and changes work only through the existing career owner',()=>{
 let jobs=0,misses=0;
 for(let seed=1;seed<=10;seed++){
  let l=worker(1965,seed),p=force(l,'training');l.choose(0);advance(l,p);l.choose(0);advance(l,p);const before=l.world6.roleChanges;l.choose(0);
  if(p.status==='completed'){jobs++;assert.ok(l.world6.roleChanges>=before);assert.equal(l.world6.sector,'trades');assert.equal(l.world.occupation,l.career);}else misses++;
 }
 assert.ok(jobs>0&&misses>0);
});
test('war prevents a promised new job even after completed retraining',()=>{
 const l=worker(1949),p=force(l,'training');l.choose(0);advance(l,p);l.choose(0);advance(l,p);const before=l.world6.roleChanges;l.choose(0);assert.equal(p.status,'archived');assert.equal(l.world6.roleChanges,before);assert.match(l.log.at(-1).text,/전쟁/);
});
test('coworkers can request changes but neither an arrest nor an improvement is predetermined',()=>{
 let accepted=0,refused=0;
 for(let seed=1;seed<=10;seed++){
  const l=worker(1930,seed),p=force(l,'workgroup');l.choose(0);advance(l,p);l.choose(0);advance(l,p);l.choose(0);if(p.agreed)accepted++;else refused++;assert.equal(c.OneLifeJoseon325.ensure(l).law.kind,'free');
 }
 assert.ok(accepted>0&&refused>0);
});
test('projects do not proceed abroad, in captivity or after death; legacy saves gain no invented history',()=>{
 const l=artisan(life());l.travel22={residence:{abroad:true}};assert.equal(H.candidates(l).length,0);delete l.travel22;l.joseon14={captivity:{status:'held'}};assert.equal(H.candidates(l).length,0);delete l.joseon14;l.alive=false;const before=l.log.length;H.year(l);assert.equal(l.log.length,before);
 const old=artisan(life());const d=copy(old.snapshot());delete d.paths339;const r=L.restore(d);assert.equal(H.ensure(r).projects.length,0);assert.equal(H.ensure(r).processedYear,r.year);
});
test('unfinished work cannot claim a successful delivery during scarcity, and ending remembers the completed book',()=>{
 const l=artisan(life()),p=force(l,'craft');l.choose(0);advance(l,p);l.choose(0);advance(l,p);c.OneLifeJoseon2.ensure(l).scarcityUntil=l.year;l.choose(0);assert.equal(p.status,'archived');assert.match(l.log.at(-1).text,/마치지 못했다/);
 const w=life();J.ensure(w).literacy=1;for(let i=0;i<5;i++)w.log.push({kind:'joseon6-choice',age:20+i,year:w.birthYear+20+i,text:'익힌 일을 적었다.'});const book=force(w,'writing');w.choose(0);advance(w,book);w.choose(0);advance(w,book);w.choose(0);
 const recap=c.OneLifeBiography328.chapters(w);assert.ok(recap.some(t=>/원고를 한 권/.test(t)));
});
test('a career change at the year boundary clears an already promoted workplace prompt',()=>{
 const l=worker(1932),p=force(l,'workgroup');l.choose(0);advance(l,p);l.choose(0);advance(l,p);
 assert.equal(l.pending,'joseon339:'+p.id);c.OneLifeWorld6.career(l,'business',0,'가게를 시작해');H.ensure(l).processedYear=l.year-1;H.year(l);
 assert.equal(p.status,'archived');assert.notEqual(l.pending,'joseon339:'+p.id);assert.notEqual(H.ensure(l).active,p.id);
});
test('a named trading partner keeps natural Korean particles through prompts and saved records',()=>{
 let l=life(1750,'남자');J.ensure(l).occupation='상인';S.ensure(l).role='장사';l.joseon6={career:{code:'merchant',started:l.year-6},pending:[],active:null,history:[],memories:[],seen:[],followups:[],decisions:0,processedYear:l.year};
 let p=force(l,'trade');l.choose(0);assert.ok(l.log.some(e=>e.text.includes('만복과')));assert.ok(l.log.every(e=>!e.text.includes('만복와')));advance(l,p);assert.match(l.getChoice().description,/만복과/);
 const q=copy(l.getChoice());l=L.restore(copy(l.snapshot()));assert.deepEqual(copy(l.getChoice()),q);
});

test('declining closes an unaffordable project while deferring an unfinished one preserves its stage',()=>{
 const l=artisan(life()),p=force(l,'craft');J.ensure(l).capital=0;l.choose(1);assert.equal(p.status,'archived');
 const active=artisan(life()),work=force(active,'craft');active.choose(0);advance(active,work);J.ensure(active).capital=0;
 const q=active.getChoice();assert.equal(q.options[0].action,'defer');assert.match(q.options[1].note,/이미 쓴 비용은 돌아오지/);active.choose(0);assert.equal(work.stage,1);assert.equal(work.status,'open');
 advance(active,work);active.choose(1);assert.equal(work.status,'archived');
});
