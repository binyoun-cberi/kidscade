(function(root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.DailyEnglishEngine=api;
})(typeof window==='undefined'?null:window,()=>{
  'use strict';
  const MAX_ENERGY=30, ENTRY=5, WRONG=2;
  const LESSON_COUNT=typeof window==='undefined'?require('./content.js').lessons.length:window.DailyEnglishContent.lessons.length;
  const day=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
  const previous=d=>new Date(Date.parse(d+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  const integer=(n,min,max,fallback=0)=>Number.isFinite(n)?Math.min(max,Math.max(min,Math.floor(n))):fallback;
  function fresh(now=Date.now()){return {version:1,day:day(now),energy:MAX_ENERGY,started:0,today:0,streak:0,lastStudy:'',completed:[],mistakes:[],stickers:[],active:null};}
  function load(raw,now=Date.now()){
    const s=fresh(now);
    if(!raw||raw.version!==1) return s;
    const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d));
    if(validDate(raw.day)) s.day=raw.day;
    s.energy=integer(raw.energy,0,30,30);s.started=integer(raw.started,0,6);s.today=integer(raw.today,0,1000);s.streak=integer(raw.streak,0,100000);
    s.lastStudy=validDate(raw.lastStudy)?raw.lastStudy:'';
    // Campaign unlocks must remain contiguous even if an old save was truncated.
    const completed=new Set(Array.isArray(raw.completed)?raw.completed:[]);
    for(let i=0;i<LESSON_COUNT&&completed.has(i);i++) s.completed.push(i);
    s.mistakes=Array.isArray(raw.mistakes)?[...new Set(raw.mistakes.filter(i=>Number.isInteger(i)&&i>=0&&i<LESSON_COUNT))]:[];
    s.stickers=[3,6,9,12,15,18].filter(n=>s.completed.length>=n);
    if(raw.active&&Number.isInteger(raw.active.lesson)&&raw.active.lesson>=0&&raw.active.lesson<=Math.min(LESSON_COUNT-1,s.completed.length)&&Array.isArray(raw.active.deck)&&raw.active.deck.length>=8&&raw.active.deck.length<=16&&raw.active.deck.every(validQuestion)){
      const a=raw.active;
      s.active={lesson:a.lesson,mode:a.mode==='new'&&a.lesson===s.completed.length?'new':'practice',deck:a.deck,index:integer(a.index,0,a.deck.length),correct:integer(a.correct,0,16),errors:integer(a.errors,0,1000),feedback:typeof a.feedback==='boolean'?a.feedback:null,exhausted:!!a.exhausted,date:validDate(a.date)?a.date:s.day};
    }
    roll(s,now);return s;
  }
  function validQuestion(q){return q&&['choice','listen','spell','order','dialogue'].includes(q.kind)&&typeof q.answer==='string'&&q.answer.length<200&&typeof q.prompt==='string'&&q.prompt.length<300&&(q.options?Array.isArray(q.options)&&q.options.every(x=>typeof x==='string'&&x.length<200)&&q.options.includes(q.answer):Array.isArray(q.tokens)&&q.tokens.every(x=>typeof x==='string'&&x.length<100));}
  function roll(s,now=Date.now()){
    const d=day(now);
    if(d>s.day){s.day=d;s.energy=30;s.started=0;s.today=0;if(s.active){s.active.mode='practice';s.active.exhausted=true;}}
    if(s.lastStudy&&s.lastStudy!==s.day&&s.lastStudy!==previous(s.day)) s.streak=0;
    return s;
  }
  function start(s,lesson,deck,now=Date.now()){
    roll(s,now);
    if(s.active||!Number.isInteger(lesson)||lesson<0||lesson>Math.min(LESSON_COUNT-1,s.completed.length)||deck.length!==8||!deck.every(validQuestion)) return false;
    const isNew=lesson===s.completed.length;
    if(isNew&&(s.energy<ENTRY||s.started>=6)) return false;
    if(isNew){s.energy-=ENTRY;s.started++;}
    s.active={lesson,mode:isNew?'new':'practice',deck:JSON.parse(JSON.stringify(deck)),index:0,correct:0,errors:0,feedback:null,exhausted:false,date:s.day};return true;
  }
  function practice(s,lesson,deck,now=Date.now()){
    roll(s,now);
    if(s.active||!Number.isInteger(lesson)||lesson<0||lesson>Math.min(LESSON_COUNT-1,s.completed.length)||deck.length!==8||!deck.every(validQuestion)) return false;
    s.active={lesson,mode:'practice',deck:JSON.parse(JSON.stringify(deck)),index:0,correct:0,errors:0,feedback:null,exhausted:false,date:s.day};return true;
  }
  function answer(s,value,now=Date.now()){
    roll(s,now);const a=s.active;
    if(!a||a.feedback!==null||a.index>=a.deck.length) return null;
    const q=a.deck[a.index],correct=value===q.answer;
    a.feedback=correct;
    if(correct){a.correct++;}
    else{
      a.errors++;if(!s.mistakes.includes(a.lesson))s.mistakes.push(a.lesson);
      if(a.mode==='new'){
        s.energy=Math.max(0,s.energy-WRONG);
        if(s.energy===0){a.mode='practice';a.exhausted=true;}
      }
      // One easier recovery per original question; recovery mistakes do not grow an infinite queue.
      if(!q.recovery){
        const recovery={kind:'choice',prompt:'다시 만나니 반갑죠? 알맞은 답을 골라요.',display:q.display||q.speech||q.prompt,answer:q.answer,options:[q.answer,(q.options||[]).find(x=>x!==q.answer)||'다시 생각해 볼게요'],explain:q.explain,...(q.legacyKey?{legacyKey:q.legacyKey}:{}),recovery:true};
        a.deck.splice(Math.min(a.deck.length,a.index+3),0,recovery);
      }
    }
    return correct;
  }
  function advance(s,now=Date.now()){
    roll(s,now);const a=s.active;if(!a||a.feedback===null)return null;
    a.index++;a.feedback=null;
    if(a.index<a.deck.length) return null;
    const unlocked=a.mode==='new'&&a.lesson===s.completed.length;
    if(unlocked)s.completed.push(a.lesson);
    if(a.errors===0)s.mistakes=s.mistakes.filter(i=>i!==a.lesson);
    if(s.lastStudy!==s.day){s.streak=s.lastStudy===previous(s.day)?s.streak+1:1;s.lastStudy=s.day;}
    s.today++;
    const sticker=unlocked&&s.completed.length<=18&&s.completed.length%3===0?s.completed.length:null;
    if(sticker&&!s.stickers.includes(sticker))s.stickers.push(sticker);
    const result={lesson:a.lesson,unlocked,practice:a.mode==='practice',exhausted:a.exhausted,correct:a.correct,total:a.deck.length,errors:a.errors,streak:s.streak,combo:s.today,sticker};
    s.active=null;return result;
  }
  return {MAX_ENERGY,ENTRY,WRONG,LESSON_COUNT,day,fresh,load,roll,start,practice,answer,advance};
});
