/* One Life procedural pixel diorama. No external asset or animation dependency. */
(function(root,factory){
  const lib=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=lib;
  if(root)root.OneLifeScene=lib;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const W=600,H=258;
  const Composer=typeof window!=='undefined'?window.OneLifeSpriteComposerV1:null;
  const c={ink:'#283941',cloud:'#f0f1dd',sun:'#ffe09c',roof:'#cb796a',wall:'#e8d5b7',forest:'#548c77',road:'#677c80',accent:'#a46d50'};
  function paint(canvas,life){
    if(!canvas||!life)return '';
    if(canvas.width!==W)canvas.width=W;
    if(canvas.height!==H)canvas.height=H;
    const ctx=canvas.getContext('2d');
    if(!ctx)return '';
    ctx.imageSmoothingEnabled=false;
    const fill=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const line=(x,y,w,h,color)=>fill(x,y,w,h,color);
    const p=life.profile||{settlement:'도시',partner:false,child:false};
    const age=life.age,night=age%9===7,season=age%4;
    const sky=night?'#b5bfd8':season===3?'#e2d3cc':'#b5d9dc';
    const floor=season===3?'#d3cbb5':'#81b69b';
    const isRural=p.settlement==='농촌';
    // A workplace is shown only when the player's recorded occupation
    // supports it. An illustrated garden does not add crops or income.
    const farming=age>=16&&age<75&&/농사|농업|농부|농민|경작|소작/.test(life.career||'');
    const stage=age<7?'가정':age<19?(life.world?.educationYears===0&&age>=10?'지역과 생활':'학교')
      :age<27&&(life.career==='학생'||life.world?.educationLevel==='고등 교육·훈련 중')?'대학교'
      :age<65&&life.arc?.business?'가게와 사업장'
      :age<65&&/기술|수리|제조|훈련/.test(life.career)?'기술 작업장'
      :age<65?'일터와 일상':'노년의 일상';
    fill(0,0,W,H,sky);
    // Hand-placed pixel clouds; all drawing is aligned to the same 2px grid.
    for(const [x,y] of [[65,32],[360,24],[490,46]]){
      fill(x+12,y,36,8,night?'#e1e5ef':c.cloud);
      fill(x,y+8,67,10,night?'#d3dced':c.cloud);
    }
    fill(495,19,season===3?21:28,season===3?21:28,night?'#fff6de':c.sun);
    if(Composer)Composer.distant(ctx,{rural:isRural,seed:life.seed,season});
    else for(let x=0;x<W;x+=30){
      const h=21+(x*7%22);
      fill(x,138-h,33,h,isRural?'#9cbaa8':'#91abb3');
      fill(x+4,135-h,16,5,night?'#f4e8c9':'#c4d1d1');
    }
    const tree=(x,y)=>{
      fill(x-2,y-11,8,42,'#6e6a53');
      fill(x-18,y-46,40,30,season===3?'#aa8e69':'#4f977b');
      fill(x-9,y-57,22,18,season===3?'#beaa7c':'#6faf90');
      fill(x-11,y-41,12,6,'#d5c6a0');
    };
    const windowGrid=(x,y,cols,rows,shade)=>{
      for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
        fill(x+i*17,y+j*19,11,12,shade);
        fill(x+i*17+2,y+j*19+3,7,4,night?'#f2ce9d':'#bed5d4');
      }
    };
    const building=(x,y,w,h,kind)=>{
      const wall=kind==='school'?'#d4d4c8':kind==='work'?'#bec9ce':kind==='clinic'?'#d4ded7':c.wall;
      fill(x-5,y-5,w+10,h+5,c.ink);fill(x,y,w,h,wall);
      fill(x-12,y-12,w+24,13,kind==='home'?'#b57460':'#697b89');
      windowGrid(x+11,y+15,Math.max(1,Math.floor((w-16)/18)),Math.max(1,Math.floor((h-20)/19)),c.ink);
      fill(x+w/2-12,y+h-32,24,32,c.ink);fill(x+w/2-8,y+h-28,16,28,'#a6b9b3');
      if(kind==='school'){fill(x+w/2-32,y-18,64,12,'#f2e3c0');fill(x+w/2-26,y-16,52,8,c.ink);}
      if(kind==='work'){fill(x+w/2-18,y-18,36,12,'#c79f7d');}
      if(kind==='clinic'){fill(x+w/2-6,y-18,12,13,'#ecf1e7');fill(x+w/2-3,y-18,6,13,'#bd776c');}
    };
    // Scene variation: home/school/work/community, plus a stylized rural possibility.
    if(isRural){
      fill(0,156,600,58,'#a7bfa1');
      for(let x=0;x<600;x+=58){fill(x,160,36,10,'#85a888');fill(x+5,171,26,9,'#7aa383');}
      tree(73,156);tree(515,157);
      building(177,95,190,68,stage==='학교'||stage==='대학교'?'school':'home');
    }else{
      building(55,84,104,95,age<19?'home':'work');
      building(202,55,169,126,stage==='학교'||stage==='대학교'?'school':age>=65?'clinic':'work');
      if(stage==='가게와 사업장'){
        fill(210,65,154,20,'#f4d3a3');fill(215,70,144,10,'#b87652');
        fill(228,105,114,42,'#b8d9c9');
        for(let q=0;q<6;q++)fill(230+q*19,151,11,16,'#9b7064');
      }
      if(stage==='기술 작업장'){
        fill(230,138,110,14,'#bb916d');fill(243,153,6,15,'#7e776e');
        fill(325,153,6,15,'#7e776e');
      }
      building(434,93,120,91,'home');
      tree(179,166);tree(413,171);
    }
    fill(0,185,W,31,floor);
    fill(0,216,W,42,c.road);
    for(let x=14;x<W;x+=82)fill(x,232,42,4,'#ecedd6');
    fill(0,212,W,4,'#d9d5ba');
    if(isRural&&farming){
      // Show a small worked patch by the protagonist, not an invented harvest.
      fill(343,191,172,20,'#846a4a');
      for(let i=0;i<6;i++){
        const x=351+i*27;
        fill(x,192,3,14,'#496d45');
        fill(x-5,188,8,6,'#64915c');
        fill(x+2,184,8,7,'#79a46a');
      }
    }
    // Pixel people share basic geometry but vary by life stage.
    const person=(x,y,scale,color,headColor)=>{
      const u=scale;
      fill(x-u*6,y-u*38,u*14,u*14,c.ink);
      fill(x-u*4,y-u*36,u*10,u*11,headColor||'#d6a886');
      fill(x-u*5,y-u*39,u*12,u*5,c.ink);
      fill(x-u*5,y-u*22,u*12,u*15,color);
      fill(x-u*8,y-u*19,u*3,u*12,color);fill(x+u*7,y-u*19,u*3,u*12,color);
      fill(x-u*5,y-u*7,u*4,u*8,c.ink);fill(x+u*3,y-u*7,u*4,u*8,c.ink);
      fill(x-u*2,y-u*31,u*2,u*2,c.ink);fill(x+u*4,y-u*31,u*2,u*2,c.ink);
    };
    const baseX=292,baseY=217;
    const scale=age<6?1:age<13?1.25:1.55;
    if(Composer)Composer.character(ctx,{x:baseX,feet:baseY,age,scale,identity:life.seed,
      pose:isRural&&farming?'work':age>=65?'idle':life.career==='학생'?'walk':'idle',frame:life.year%2});
    else person(baseX,baseY,scale,age<20?'#4a818b':age>=65?'#856a8f':'#cb816c');
    if(isRural&&farming&&!Composer){
      // Keep the fallback art functional; composer tools follow the wrist.
      fill(baseX+scale*8,baseY-scale*19,4,30,'#73583d');
      fill(baseX+scale*7,baseY-scale*19,17,4,'#6b7370');
    }
    if(age<16){
      // Do not invent two parents just because the protagonist is a child.
      // Decorate the age-appropriate place instead of adding unknown people.
      if(stage==='학교'){
        fill(baseX-66,baseY-34,36,30,'#5a7d8a');
        fill(baseX-61,baseY-30,26,21,'#e2c595');
        fill(baseX-51,baseY-30,5,21,'#ab805b');
      }else{
        fill(baseX-64,baseY-15,36,10,'#8e765b');
        fill(baseX-59,baseY-23,8,8,'#cf9c71');
        fill(baseX-45,baseY-27,11,12,'#77a49a');
      }
    }else{
      if(p.partner && age>=33 && age<90)person(baseX+65,baseY,1.45,'#5d8e85');
      if(p.child && age>=37 && age<=59)person(baseX-61,baseY,age<=45?1:1.25,'#d5b66b');
      // A spouse, child, or friend must not be drawn from a guessed relationship.
      if(!p.partner&&!p.child){
        fill(baseX-72,baseY-16,27,12,'#987b58');
        fill(baseX-66,baseY-28,15,14,'#6d9d78');
        fill(baseX-60,baseY-37,4,10,'#536f53');
      }
    }
    if(Composer)Composer.foreground(ctx,{rural:isRural,seed:life.seed});
    fill(8,8,190,24,'#19323cc9');
    ctx.fillStyle='#f9f0df';
    ctx.font='bold 13px sans-serif';
    ctx.fillText(stage+' · '+(p.city||'어느 도시'),18,25);
    fill(424,8,166,24,'#19323cc9');
    ctx.textAlign='right';ctx.fillStyle='#f9f0df';ctx.fillText(life.year+'년 · '+age+'세',581,25);ctx.textAlign='left';
    return stage;
  }
  return Object.freeze({paint,W,H});
});