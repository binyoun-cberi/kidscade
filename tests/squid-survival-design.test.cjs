'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games/squid-survival');
const source=fs.readFileSync(path.join(dir,'mini.js'),'utf8');
const engine=require(path.join(dir,'mini-rules.js'));
const modes=['redlight','tug','marbles','final'];

function renderMock(mode,width,height){
 const nodes=new Map(),draw={count:0,texts:[],progress:null},listeners=new Map(),frames=[];
 const ctx={};
 for(const name of ['beginPath','roundRect','fill','stroke','fillRect','clearRect','ellipse','arc','strokeRect','moveTo','lineTo','setTransform','fillText','save','restore','translate','scale','closePath']){
   ctx[name]=(...args)=>{draw.count++;if(name==='fillText')draw.texts.push(String(args[0]));};
 }
 ctx.createLinearGradient=ctx.createRadialGradient=()=>({addColorStop(){}});
 const node=id=>{
   if(nodes.has(id))return nodes.get(id);
   const events=new Map();
   const el={
     id,hidden:false,disabled:false,textContent:'',innerHTML:'',style:{},dataset:{},parentElement:{setAttribute:(key,value)=>{if(key==='aria-valuenow')draw.progress=+value;}},
     addEventListener:(name,fn)=>events.set(name,fn),setAttribute(){},appendChild(){},
     click(){events.get('click')?.({})},
     classList:{add(){},remove(){},toggle(){}},
     getBoundingClientRect:()=>({width,height,left:0,top:0}),
     getContext:()=>ctx,setPointerCapture(){},width:0,height:0
   };nodes.set(id,el);return el;
 };
 const document={
   currentScript:{dataset:{mode},src:'https://example.com/games/squid-survival/mini.js'},
   body:{dataset:{}},
   getElementById:node,createElement:id=>node('generated-'+nodes.size),
   addEventListener:(name,fn)=>listeners.set(name,fn)
 };
 const window={
   SquidMiniRules:engine,devicePixelRatio:1,
   addEventListener:(name,fn)=>listeners.set(name,fn)
 };
 window.parent=window;
 const fakeLocation={search:''};
 const storage={getItem:()=>null,setItem:()=>{}};
 vm.runInNewContext(source,{
   window,document,location:fakeLocation,localStorage:storage,URLSearchParams,Date,Math,
   requestAnimationFrame:fn=>frames.push(fn),Image:undefined
 });
 assert.equal(document.body.dataset.mode,mode);
 node('start').click();
 assert.ok(frames.length,'animation scheduled for '+mode);
 const frame=frames.shift();frame(1000);
 return {draw,nodes,document};
}
test('all six tournament gates get a cinematic briefing and result position',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 for(let i=0;i<6;i++){
   assert.match(html,new RegExp('id="pill'+i+'"'));
   assert.match(html,new RegExp('id="endRound'+i+'"'));
 }
 assert.match(html,/class="hero-panel"/);
 assert.match(html,/class="route-panel"/);
 assert.match(html,/id="roundWatermark"/);
 assert.match(html,/id="startButton"/);
 const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
 assert.match(css,/\.lobby-content\{[^}]*grid-template-columns:/);
 assert.match(css,/@media\(max-width:550px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/@import url/);
});
test('four challenge scenes draw real visual content in phone portrait, landscape and desktop',()=>{
 for(const mode of modes)for(const [w,h] of [[390,844],[844,390],[1280,720]]){
   const {draw,nodes}=renderMock(mode,w,h);
   assert.ok(draw.count>50,mode+' '+w+'x'+h+' only '+draw.count+' canvas draw calls');
   assert.ok(draw.texts.length>=2,mode+' '+w+'x'+h+' canvas text missing');
   assert.ok(draw.progress!==null,mode+' missing accessible progress');
   assert.equal(nodes.get('time').textContent.length,5);
   if(mode==='redlight'||mode==='tug')assert.ok(nodes.get('action').textContent.length>0);
   else assert.equal(nodes.get('action').hidden,true,'choice-based stages do not show a duplicate action button');
 }
});
test('every practice page uses upgraded game design, accessible progress and correct entry mode',()=>{
 for(const mode of modes){
   const html=fs.readFileSync(path.join(dir,mode,'index.html'),'utf8');
   assert.match(html,new RegExp('data-mode="'+mode+'"'));
   assert.match(html,/mini\.css\?v=3/);
   assert.match(html,/mini\.js\?v=3/);
   assert.match(html,/role="progressbar"/);
   assert.match(html,/class="personal-best"/);
 }
 const css=fs.readFileSync(path.join(dir,'mini.css'),'utf8');
 assert.match(css,/body\[data-mode="redlight"\]/);
 assert.match(css,/body\[data-mode="marbles"\]/);
 assert.match(css,/body\[data-mode="tug"\]/);
 assert.match(css,/body\[data-mode="final"\]/);
 assert.match(css,/body\[data-survival="true"\] \.personal-best/);
 assert.match(css,/@media\(max-height:500px\)/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
