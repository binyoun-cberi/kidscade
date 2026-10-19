/* O T A — reproducible wings, sentence assembly and weekly speedrun course.
 * Pure rules, shared by desktop, touch and node tests. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaExpansion=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const WINGS=Object.freeze({
    west:Object.freeze({x:-9.35,z:-64.9,entranceZ:-55.6,record:'office'}),
    east:Object.freeze({x:9.35,z:-64.9,entranceZ:-55.6,record:'archive'})
  });
  const SENTENCES=Object.freeze([
    {id:'light',title:'빛이 사라진 열람실',clue:'조명을 되찾으면 어둠 속에 묻힌 글자가 보입니다.',parts:['꺼진','조명이','다시','빛을','밝힌다'],effect:'light'},
    {id:'door',title:'반납되지 않은 문',clue:'잘못 보관한 문장을 순서대로 읽어 문을 깨우세요.',parts:['흩어진','글자가','모이면','문이','열린다'],effect:'door'},
    {id:'stairs',title:'지워진 계단',clue:'없어진 층계는 문장의 끝에서 모습을 드러냅니다.',parts:['잊힌','이름을','부르면','계단이','나타난다'],effect:'stairs'},
    {id:'trace',title:'바닥 아래의 발자국',clue:'눈에 보이지 않는 길은 기록을 복구해야 나타납니다.',parts:['사라진','발자국이','숨겨진','길을','가리킨다'],effect:'trace'},
    {id:'mirror',title:'거꾸로 쓰인 서고',clue:'비친 것과 실제의 것이 서로 다릅니다.',parts:['거울에','비친','글자는','진실을','숨긴다'],effect:'mirror'},
    {id:'name',title:'이름을 잃은 서류',clue:'이름과 기억의 순서를 맞추세요.',parts:['기억을','찾은','사람은','이름을','되찾는다'],effect:'name'},
    {id:'window',title:'창문 없는 방',clue:'닫힌 공간에서도 문장은 바깥을 보여 줍니다.',parts:['닫힌','창문에','새로운','빛이','스며든다'],effect:'window'},
    {id:'ink',title:'번지는 잉크',clue:'종이의 자국이 물체가 되는 순서를 읽으세요.',parts:['번진','잉크가','모여','지도를','그린다'],effect:'ink'},
    {id:'silence',title:'소리를 삼킨 복도',clue:'목소리가 사라진 이유가 문장에 남아 있습니다.',parts:['잠든','방에서는','모든','소리가','사라진다'],effect:'silence'},
    {id:'book',title:'펼쳐지지 않는 책',clue:'책장을 여는 일부터 기록이 시작됩니다.',parts:['오래된','책을','열자','글자가','깨어난다'],effect:'book'},
    {id:'clock',title:'멈춰 버린 시계',clue:'시간을 묘사하는 문장을 조립하세요.',parts:['멈춘','시계가','다시','시간을','세기 시작한다'],effect:'clock'},
    {id:'map',title:'찢어진 색인',clue:'순서대로 모인 조각들이 지도를 만듭니다.',parts:['찢어진','기록을','이어','길을','찾는다'],effect:'map'}
  ]);
  function hash(value){
    let h=2166136261;
    for(const char of String(value)){h^=char.codePointAt(0);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function random(seed){
    let x=seed>>>0;
    return ()=>{
      x=(x+0x6D2B79F5)>>>0;
      let t=Math.imul(x^(x>>>15),x|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function shuffle(values,seed){
    const copy=[...values],next=random(seed);
    for(let i=copy.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
    return copy;
  }
  function weeklyCourse(now=Date.now()){
    const kst=new Date(now+9*60*60*1000);
    const day=(kst.getUTCDay()+6)%7;
    const monday=new Date(Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),kst.getUTCDate()-day));
    const week=monday.toISOString().slice(0,10);
    return {week,seed:hash('ota-speedrun-'+week)};
  }
  function create(seed=1){
    seed=(Number(seed)||0)>>>0;
    const order=shuffle(['west','east'],seed^0x3a77c9);
    const picks=shuffle(SENTENCES.map(s=>s.id),seed^0x5b91e3);
    const layouts={west:shuffle(['left','right','open'],seed^0x7abc3e)[0],
      east:shuffle(['left','right','open'],seed^0x82f36b)[0]};
    return {v:1,seed,required:order[0],order,rooms:{west:picks[0],east:picks[1]},layouts,
      solved:{west:false,east:false},fragments:{west:false,east:false},
      attempts:0,assembled:{west:[],east:[]},bonus:false};
  }
  function sentence(s,side){return SENTENCES.find(p=>p.id===s.rooms[side]);}
  function hasRecord(s,side){
    return Boolean(s.chapter3?.records?.[WINGS[side].record]);
  }
  function canEnter(s,side){return hasRecord(s,side);}
  function passable(s,x,z){
    // s is the full game state; Chapter 3 owns the surrounding old rooms.
    if(z>=-55.5||Math.abs(x)<=3.52)return null; // Old rooms / central corridor own these cells.
    const side=x<0?'west':'east',room=WINGS[side];
    if(z<-70.55||Math.abs(x)>15.23||Math.abs(x)<3.52)return false;
    if(z>-56.03&&(Math.abs(x-room.x)>1.62||!canEnter(s,side)))return false;
    const layout=s.expansion?.layouts?.[side],relative=x-room.x;
    if(Math.abs(z+62.1)<.36&&((layout==='left'&&relative>-1.99)||
      (layout==='right'&&relative<1.99)))return false;
    if(Math.abs(z+67.18)<.36&&(Math.abs(relative)>1.28||!s.expansion?.solved?.[side]))return false;
    return true;
  }
  function near(s,p,reach=2.65){
    if(!s||!p)return null;
    for(const side of s.order){
      const spot=WINGS[side];
      // The player can reach this spot only after passing Chapter 3's record-locked
      // rear door. `s` is the expansion state, not the outer chapter state.
      if(!s.solved[side]&&Math.hypot(p.x-spot.x,p.z-spot.z)<reach)return side;
    }
    return null;
  }
  function interaction(s,p){
    const side=near(s,p);
    if(side)return {type:'sentence',side,label:'흩어진 문장 다시 조립하기'};
    for(const wing of s.order){
      const spot=WINGS[wing];
      if(s.solved[wing]&&!s.fragments[wing]&&Math.hypot(p.x-spot.x,p.z+69.0)<2.0)
        return {type:'fragment',side:wing,label:'복구된 기록 조각 읽기'};
    }
    return null;
  }
  function tiles(s,side){
    const puzzle=sentence(s,side);
    // A unique tile index is used in the event of repeated words.
    return shuffle(puzzle.parts.map((value,id)=>({id,value})),s.seed^hash(side+'-'+puzzle.id));
  }
  function append(s,side,tileId){
    const current=s.assembled[side],puzzle=sentence(s,side);
    if(!puzzle||s.solved[side]||!Number.isInteger(tileId)||tileId<0||tileId>=puzzle.parts.length||current.includes(tileId))return false;
    current.push(tileId);return true;
  }
  function undo(s,side){return s.assembled[side].pop();}
  function clear(s,side){s.assembled[side]=[];}
  function submit(s,side){
    if(s.solved[side])return {ok:false,reason:'solved'};
    const puzzle=sentence(s,side),indices=s.assembled[side];
    if(indices.length!==puzzle.parts.length)return {ok:false,reason:'incomplete'};
    if(indices.some((value,i)=>value!==i)){
      s.attempts++;return {ok:false,reason:'order',hint:s.attempts%2===0?'첫 단어는 「'+puzzle.parts[0]+'」입니다.':'문장이 자연스럽게 이어지는지 다시 읽어 보세요.'};
    }
    s.solved[side]=true;
    return {ok:true,effect:puzzle.effect,required:side===s.required,bonus:s.bonus};
  }
  function collect(s,side){
    if(!s.solved[side]||s.fragments[side])return false;
    s.fragments[side]=true;s.bonus=s.fragments.west&&s.fragments.east;
    return true;
  }
  function complete(s){return Boolean(s.fragments[s.required]);}
  function checkpoint(s){return {v:1,seed:s.seed,required:s.required,rooms:{...s.rooms},
    solved:{...s.solved},fragments:{...s.fragments},attempts:s.attempts};}
  function restore(s,data){
    if(!data||data.v!==1||!Number.isFinite(data.seed))return false;
    const fresh=create(data.seed);
    Object.assign(s,fresh);
    for(const side of ['west','east'])s.solved[side]=data.solved?.[side]===true;
    for(const side of ['west','east'])s.fragments[side]=s.solved[side]&&data.fragments?.[side]===true;
    s.bonus=s.fragments.west&&s.fragments.east;
    s.attempts=Math.max(0,Math.min(9999,Number(data.attempts)||0));
    return true;
  }
  return Object.freeze({WINGS,SENTENCES,hash,shuffle,weeklyCourse,create,sentence,hasRecord,canEnter,
    passable,near,interaction,tiles,append,undo,clear,submit,collect,complete,checkpoint,restore});
});
