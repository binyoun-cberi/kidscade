'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function runtime(){const c={OneLifeJoseon:{ensure:l=>l.joseon},OneLifeJoseon4:{ensure:l=>l.joseon4},OneLifeJoseon3:{zone:l=>l.zone||'farm',season:()=> '봄'}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../games/high_one_life/joseon-pixel-v2.js'),'utf8'),c);return c.OneLifeJoseonPixel2;}
function life(){return {year:1588,birthYear:1580,age:8,gender:'남자',profile:{name:'복동'},joseon:{birthStatus:'상민'},joseon4:{people:[{id:'mother',name:'어머니',birthYear:1550,sex:'여자',alive:true,atHome:true},{id:'father',birthYear:1545,sex:'남자',alive:false,atHome:true},{id:'future',birthYear:1590,alive:true,atHome:true},{id:'away',birthYear:1560,alive:true,atHome:false}]}};}
test('pixel household uses living present people and their recorded age, never invented parents or children',()=>{
 const api=runtime(),l=life(),plan=api.scene(l);assert.equal(plan.people.length,2);assert.equal(plan.people[1].age,38);assert.equal(plan.people[1].sex,'여자');
 l.joseon13={missing:[{personId:'mother',status:'missing'}]};assert.equal(api.scene(l).people.length,1);
 l.joseon14={captivity:{status:'held'}};assert.equal(api.scene(l).kind,'away');assert.equal(api.scene(l).people.length,1);
});
test('drawing is crisp and caption reports the actual household and main-character marker',()=>{
 const api=runtime(),l=life(),rects=[],attributes={};
 const ctx={fillStyle:'',clearRect(){},fillRect(...r){assert.ok(r.every(Number.isInteger));assert.ok(r[2]>0&&r[3]>0);rects.push([...r,this.fillStyle]);}};
 const canvas={getContext:()=>ctx,setAttribute:(k,v)=>attributes[k]=v};assert.ok(api.paint(canvas,l));assert.equal(canvas.width,600);assert.equal(canvas.height,258);assert.equal(ctx.imageSmoothingEnabled,false);
 assert.match(attributes['aria-label'],/2명의 식구/);assert.match(attributes['aria-label'],/금빛 표식/);assert.ok(rects.length>80);
 // The central yard must not receive full-width crop furrows.
 assert.ok(!rects.some(r=>r[1]>=222&&r[1]<250&&r[3]===3&&r[2]===600));
});

test('costume distinguishes family background, actual service and historical silhouette',()=>{
 const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../games/high_one_life/joseon-culture-v1.js'),'utf8'),c);
 const wear=c.OneLifeJoseonCulture.wardrobe;
 assert.equal(wear(1588,'문반 양반','남자','',8,{duty:true}).headwear,'none');
 assert.equal(wear(1588,'문반 양반','남자','글공부',30,{duty:true}).style,'hanbok');
 assert.equal(wear(1588,'문반 양반','남자','관직 생활',30,{duty:true}).headwear,'samo');
 assert.equal(wear(1588,'문반 양반','남자','관직 생활',30).style,'hanbok');
 assert.equal(wear(1588,'수군 가계','여자','군역 가족의 살림',30,{duty:true}).style,'hanbok');
 assert.equal(wear(1592,'상민','남자','수군',30,{duty:true}).style,'cheollik');
 assert.equal(wear(1850,'상민','남자','수군',30,{duty:true}).style,'late-military');
 assert.equal(wear(1900,'상민','남자','수군',30,{duty:true}).style,'hanbok');
 assert.ok(wear(1500,'상민','여자','',30).jeogori>wear(1800,'상민','여자','',30).jeogori);
});
