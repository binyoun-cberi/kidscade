(() => {
  'use strict';
  const C=window.DailyEnglishContent,E=window.DailyEnglishEngine,$=id=>document.getElementById(id);
  const KEY='kidscade_game_v1:daily_english:progress',SOUND_KEY=KEY+':sound';
  const souvenirs=['🥐','🎀','📚','🎒','🌼','🧺'];
  let state,selection=[],sound=true,view='home',busy=false;
  function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
  function read(){try{return E.load(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(_){notice('저장 공간에 접근할 수 없어요. 이 화면에서는 학습할 수 있지만, 기록은 남지 않을 수 있어요.');return state||E.fresh();}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){notice('학습 기록을 저장하지 못했어요. 브라우저의 저장 공간을 확인해 주세요.');}}
  state=read();try{sound=localStorage.getItem(SOUND_KEY)!=='off';}catch(_){}
  function screen(name){view=name;['home','lesson','result'].forEach(v=>$(v).hidden=v!==name);window.scrollTo({top:0,behavior:'instant'});}
  function stopSpeech(){try{window.speechSynthesis?.cancel();}catch(_){}}
  function speak(text){
    if(!sound){notice('소리가 꺼져 있어요. 위쪽 소리 버튼으로 켤 수 있어요.');return;}
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){notice('이 브라우저에서는 음성을 재생할 수 없어요. 듣기 문제의 「글자로 보기」를 사용해 주세요.');return;}
    stopSpeech();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.78;
    const voice=speechSynthesis.getVoices().find(v=>v.lang==='en-US')||speechSynthesis.getVoices().find(v=>/^en/.test(v.lang));if(voice)u.voice=voice;
    u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))notice('음성이 재생되지 않았어요. 「글자로 보기」로 풀어도 괜찮아요.');};
    speechSynthesis.speak(u);
  }
  function button(text,cls,fn){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=fn;return b;}
  function node(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
  function home(){
    stopSpeech();E.roll(state);save();screen('home');
    $('energy').textContent=`${state.energy} / 30`;$('energy-fill').style.width=`${state.energy/30*100}%`;
    $('streak').textContent=`${state.streak}일`;$('streak-note').textContent=state.lastStudy===state.day?'오늘의 발자국 완료 ✓':'오늘 첫 발자국을 남겨요';
    $('combo').textContent=state.today?`×${state.today}`:'0';$('progress-note').textContent=`${state.completed.length} / 18 레슨`;
    $('continue').textContent=state.active?'하던 레슨 이어하기 →':state.completed.length===18?'마을 전체 복습하기 ↻':state.energy<5||state.started>=6?'에너지 없이 연습하기 →':'오늘의 레슨 시작 →';
    $('zones').replaceChildren();
    C.zones.forEach((z,zi)=>{
      const section=node('section','','zone'),head=node('div','','zone-head');
      head.append(node('b',z.icon));const title=node('div','');title.append(node('h3',`${String(zi+1).padStart(2,'0')} · ${z.name}`),node('p',z.story));head.append(title);section.append(head);
      const list=node('div','','lesson-list');
      C.lessons.filter(l=>l.zone===zi).forEach(l=>{
        const done=state.completed.includes(l.index),locked=l.index>state.completed.length;
        const b=button('','lesson-button'+(done?' done':locked?'':' next'),()=>openLesson(l.index));
        b.disabled=locked;b.append(node('span',done?'✓':locked?'🔒':String(l.index+1),'number'));
        const info=node('span','');info.append(node('strong',l.title),node('small',done?'무료 복습':locked?'앞 레슨을 마치면 열려요':state.energy<5||state.started>=6?'무료 연습 가능':'새 레슨 · ⚡ 5'));b.append(info,node('span',done?'↻':'→','arrow'));list.append(b);
      });section.append(list);$('zones').append(section);
    });
    $('souvenirs').replaceChildren(...souvenirs.map((s,i)=>{const owned=state.stickers.includes((i+1)*3),n=node('span',owned?s:'?',owned?'owned':'');n.title=`${(i+1)*3}개 새 레슨 완료${owned?' · 받았어요':''}`;n.setAttribute('aria-label',n.title);return n;}));
  }
  async function change(fn){
    if(busy)return;busy=true;
    const expected=JSON.stringify(state.active);
    const action=()=>{
      const latest=read();
      if(JSON.stringify(latest.active)!==expected){state=latest;notice('다른 창에서 학습 기록이 바뀌었어요. 최신 진행을 불러왔어요.');if(state.active)renderQuestion();else home();return;}
      state=latest;fn();save();
    };
    try{if(navigator.locks)await navigator.locks.request(KEY,action);else action();}
    finally{busy=false;}
  }
  function openLesson(index,forcePractice=false){change(()=>{
    if(state.active){showActive();return;}
    const deck=C.questions(index);
    const practice=forcePractice||index<state.completed.length||state.energy<5||state.started>=6;
    if(!(practice?E.practice(state,index,deck):E.start(state,index,deck)))return;
    window.KidscadeGame?.start?.();showActive(true);
  });}
  function showActive(intro=false){
    const a=state.active;if(!a){home();return;}
    const l=C.lessons[a.lesson],z=C.zones[l.zone];screen('lesson');
    $('lesson-location').textContent=z.icon+' '+z.name;$('lesson-energy').textContent=a.mode==='new'?`⚡ ${state.energy} / 30`:'무료 연습';
    $('friend-image').src=`../../assets/game/2d/animals/round/${z.animal}.png`;$('friend-image').alt=z.friend;
    $('friend-name').textContent=z.friend;$('friend-message').textContent=a.exhausted?'에너지는 다 썼지만, 무료로 끝까지 연습해요!':'틀려도 괜찮아요. 다시 만나면 더 잘할 수 있어요!';
    $('intro').hidden=!intro;$('exercise').hidden=intro;
    updateBar();
    if(intro){
      $('lesson-title').textContent=l.title;$('expression-en').textContent=l.sentence;$('expression-ko').textContent=l.translation;
      $('word-cards').replaceChildren(...l.words.map(w=>{const b=button('','word-card',()=>speak(w.en));b.append(node('span',w.icon),node('strong',w.en),node('small',w.ko+' ♪'));b.setAttribute('aria-label',`${w.en}, ${w.ko}, 발음 듣기`);return b;}));
      $('expression-listen').onclick=()=>speak(l.sentence);
    }else renderQuestion();
  }
  function updateBar(){const a=state.active;if(!a)return;$('bar').setAttribute('aria-valuemax',a.deck.length);$('bar').setAttribute('aria-valuenow',a.index);$('bar').firstElementChild.style.width=`${a.index/a.deck.length*100}%`;$('counter').textContent=`${Math.min(a.index+1,a.deck.length)} / ${a.deck.length}`;}
  function renderQuestion(){
    const a=state.active;if(!a){home();return;}
    if(view!=='lesson'){showActive(false);return;}
    const q=a.deck[a.index];if(!q){notice('진행 기록을 복구했어요. 산책길에서 다시 시작해 주세요.');state.active=null;home();return;}
    stopSpeech();selection=[];screen('lesson');$('intro').hidden=true;$('exercise').hidden=false;
    $('lesson-energy').textContent=a.mode==='new'?`⚡ ${state.energy} / 30`:'무료 연습';
    $('kind').textContent=q.recovery?'ONE MORE TRY · 다시 만나는 표현':({choice:'WORD MATCH · 단어 찾기',listen:'LISTEN · 듣고 고르기',spell:'SPELL IT · 철자 만들기',order:'MAKE A SENTENCE · 문장 만들기',dialogue:'LET’S TALK · 대화하기'})[q.kind];
    $('prompt').textContent=q.prompt;$('question-icon').textContent=q.icon||'';$('question-icon').hidden=!q.icon;
    $('display').textContent=q.display||'';$('display').hidden=!q.display;
    $('listen').hidden=q.kind!=='listen';$('transcript-button').hidden=q.kind!=='listen';$('transcript').hidden=true;$('transcript').textContent=q.speech||'';
    $('answers').replaceChildren();$('assembly').replaceChildren();
    const tokens=['spell','order'].includes(q.kind);$('assembly').hidden=!tokens;$('answers').className=tokens?'tokens':'';$('check').hidden=!tokens;$('check').disabled=true;
    (q.options||q.tokens).forEach((text,i)=>{
      const b=button('','',()=>tokens?chooseToken(i):submit(text));
      if(!tokens)b.append(node('b',String(i+1)));b.append(node('span',text));b.disabled=a.feedback!==null;$('answers').append(b);
    });
    $('feedback').hidden=a.feedback===null;
    if(a.feedback!==null)renderFeedback();
    updateBar();$('prompt').focus({preventScroll:true});
  }
  function chooseToken(i){const a=state.active;if(!a||a.feedback!==null)return;selection.push(i);renderAssembly();}
  function renderAssembly(){const q=state.active.deck[state.active.index];$('assembly').replaceChildren(...selection.map((i,pos)=>button(q.tokens[i],'',()=>{selection.splice(pos,1);renderAssembly();})));[...$('answers').children].forEach((b,i)=>b.disabled=selection.includes(i));$('check').disabled=selection.length!==q.tokens.length;}
  function submit(value){change(()=>{if(E.answer(state,value)===null)return;stopSpeech();[...$('answers').children,...$('assembly').children].forEach(b=>b.disabled=true);$('check').disabled=true;renderFeedback();});}
  function renderFeedback(){
    const a=state.active,q=a.deck[a.index];$('feedback').hidden=false;$('feedback').className=a.feedback?'':'wrong';
    $('feedback-title').textContent=a.feedback?'✓ 잘했어요! 한 입 배웠어요.':a.mode==='new'?'다시 만나면 돼요. ⚡ −2':'괜찮아요. 함께 한 번 더 배워요.';
    $('feedback-copy').textContent=`${q.explain||q.answer}${a.feedback?'':' · 이 표현을 기억해 두세요.'}${a.exhausted?' 에너지를 다 써서 무료 연습으로 이어가요. 새 레슨 도장은 다음 도전에서 받아요.':''}`;
    $('lesson-energy').textContent=a.mode==='new'?`⚡ ${state.energy} / 30`:'무료 연습';
    $('friend-message').textContent=a.feedback?'좋아요! 다음 표현도 만나 볼까요?':'정답을 보고 다시 익혀 봐요.';
    $('next').textContent=a.index===a.deck.length-1?'오늘의 한 입 마무리 ✦':'다음으로 →';$('next').focus({preventScroll:true});
  }
  function finish(result){
    stopSpeech();screen('result');$('result-title').textContent=result.unlocked?'새로운 한 입, 잘 먹었습니다!':'오늘의 연습, 잘했어요!';
    $('result-copy').textContent=result.exhausted?'무료 연습으로 끝까지 해냈어요. 연속 학습은 이어지고, 새 레슨 도장은 에너지가 있을 때 다시 도전해요.':result.unlocked?`${C.lessons[result.lesson].title} 레슨 도장을 받았어요. ${state.completed.length===18?'모든 산책길을 완주했어요!':'다음 산책길이 열렸어요.'}`:'알던 표현을 다시 익혔어요. 오늘의 발자국도 남겼어요.';
    $('result-stats').replaceChildren(...[[`${result.correct}/${result.total}`,'맞힌 문제'],[`${result.streak}일`,'연속 학습'],[`×${result.combo}`,'오늘의 레슨 콤보']].map(([n,label])=>{const d=node('div','');d.append(node('strong',n),node('small',label));return d;}));
    $('earned').hidden=!result.sticker;$('earned').textContent=result.sticker?`${souvenirs[result.sticker/3-1]} 새 기념품을 받았어요! ${result.sticker}개 레슨의 추억` :'';
    window.KidscadeGame?.result?.({scope:'stage',status:'completed',outcome:'clear',id:C.lessons[result.lesson].id,mode:result.practice?'practice':'lesson',correct:result.correct,total:result.total,score:result.correct*10,streak:result.streak});
    if(result.sticker)window.KidscadeGame?.milestone?.('souvenir_earned',{value:result.sticker,uniqueKey:'souvenir-'+result.sticker});
    $('result-title').focus({preventScroll:true});
  }
  $('continue').onclick=()=>{if(state.active)showActive(state.active.index===0&&state.active.feedback===null);else openLesson(Math.min(17,state.completed.length));};
  $('review').onclick=()=>openLesson(state.mistakes[0]??Math.max(0,state.completed.length-1),true);
  $('begin').onclick=()=>renderQuestion();
  $('back').onclick=()=>{home();notice('하던 레슨을 저장했어요. 「이어하기」로 다시 돌아올 수 있어요.');};
  $('listen').onclick=()=>speak(state.active.deck[state.active.index].speech);
  $('transcript-button').onclick=()=>{$('transcript').hidden=false;};
  $('check').onclick=()=>{const q=state.active.deck[state.active.index];submit(selection.map(i=>q.tokens[i]).join(q.kind==='spell'?'':' '));};
  $('next').onclick=()=>change(()=>{const result=E.advance(state);if(result)finish(result);else renderQuestion();});
  $('result-home').onclick=()=>{notice('');home();};
  $('brand-home').onclick=()=>{if(!window.KidscadeGame?.exit?.())window.location.assign('../../index.html');};
  function updateSound(){$('sound').textContent=sound?'소리 켜짐 ♪':'소리 꺼짐';$('sound').setAttribute('aria-pressed',sound);}
  $('sound').onclick=()=>{sound=!sound;stopSpeech();try{localStorage.setItem(SOUND_KEY,sound?'on':'off');}catch(_){}updateSound();};
  document.addEventListener('keydown',e=>{if(e.repeat||view!=='lesson'||!state.active||!$('intro').hidden)return;if(e.key==='Enter'){e.preventDefault();if(state.active.feedback!==null)$('next').click();else if(!$('check').hidden&&!$('check').disabled)$('check').click();}else if(/^[1-9]$/.test(e.key)&&!['spell','order'].includes(state.active.deck[state.active.index].kind)){const b=$('answers').children[Number(e.key)-1];if(b&&!b.disabled)b.click();}});
  window.addEventListener('storage',e=>{if(e.key!==KEY)return;state=read();notice('다른 창에서 바뀐 학습 기록을 불러왔어요.');if(state.active)showActive();else home();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSpeech();else{state=read();if(view==='home')home();else if(view==='lesson')showActive();}});
  window.addEventListener('pagehide',stopSpeech);
  updateSound();home();
})();
