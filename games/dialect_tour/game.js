(() => {
  'use strict';
  const data = window.DialectTourData;
  if (!data) return;
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'dialect_tour_progress_v1';
  const SCORE_KEY = 'dialectTourBestScore';
  const allRegions = new Map(data.REGIONS.map(region => [region.id, region]));
  const emotes = new Map([
    ['감자','🥔'],['고구마','🍠'],['당근','🥕'],['무','🥬'],['배추','🥬'],['호박','🎃'],['옥수수','🌽'],['수박','🍉'],['토마토','🍅'],['바다','🌊'],['산','⛰️'],['강','🏞️'],['들판','🌾'],['학교','🏫'],['병원','🏥'],['도서관','📚'],['시장','🏪'],['식당','🍽️'],['운동장','⚽'],['공원','🌳'],['마트','🛒'],['나무','🌳'],['돌','🪨'],['구름','☁️'],['바람','🍃'],['아이','🧒'],['어른','🧑'],['어머니','👩'],['아버지','👨'],['할머니','👵'],['할아버지','👴'],['언니','👩'],['오빠','👦'],['고둥','🐚'],['소라','🐚'],['조개','🦪'],['게','🦀'],['해파리','🪼'],['문어','🐙'],['오징어','🦑'],['새우','🦐'],['미역','🌿'],['고등어','🐟'],['많이','✨'],['조금','🤏'],['모두','👫'],['지금','🕒'],['어제','🌙'],['내일','🌅'],['나중에','⏭️'],['며칠','📅'],['몇 시','⏱️'],['몇 개','🧮'],['몇 명','👥'],['어머나!','😲'],['안녕히 가세요!','👋'],['잘 먹겠습니다!','🍚'],['어서 오세요!','🙌']
  ]);
  const state = { mode:'explore', region:'all', deck:[], index:0, correct:0, correctRegions:new Set(), score:0, answered:false, choices:[], correctValue:'', questionType:'meaning', running:false, finishing:false, timer:null, deadline:0, pausedAt:0, sound:true, progress:readProgress() };

  function readProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { best:Number.isFinite(+raw.best) ? Math.max(0,+raw.best) : 0, plays:Number.isFinite(+raw.plays) ? Math.max(0,+raw.plays) : 0, stamps:Array.isArray(raw.stamps) ? [...new Set(raw.stamps.filter(id => allRegions.has(id)))] : [], known:Array.isArray(raw.known) ? [...new Set(raw.known)] : [] };
    } catch (_) { return { best:0,plays:0,stamps:[],known:[] }; }
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); } catch (_) {}
  }
  function showScreen(which) {
    ['start','play','result'].forEach(name => { $(name+'-screen').hidden = name !== which; });
    window.scrollTo?.({ top:0, behavior:'instant' });
  }
  function updatePassport() {
    const n = state.progress.stamps.length;
    $('passport-summary').querySelector('small').textContent = n ? `${n}개 지역의 여행 도장을 모았어요 · ${state.progress.plays}번 여행` : '첫 도장을 기다리고 있어요';
    renderRegions();
  }
  function renderRegions() {
    const fragment = document.createDocumentFragment();
    const regions = [{id:'all',name:'전국',emoji:'🗺️',place:'모든 지역'}, ...data.REGIONS];
    regions.forEach(region => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'region-option'+(state.region === region.id ? ' selected' : '');
      button.dataset.region = region.id;
      button.setAttribute('aria-pressed', String(state.region === region.id));
      const emoji = document.createElement('span'); emoji.className = 'region-emoji'; emoji.textContent = region.emoji;
      const name = document.createElement('strong'); name.textContent = region.name;
      const note = document.createElement('small'); note.textContent = region.id === 'all' ? '골고루 만나기' : state.progress.stamps.includes(region.id) ? '✓ 도장 받음' : region.place;
      button.append(emoji,name,note);
      button.addEventListener('click', () => {
        state.region = region.id;
        $('start-button').textContent = `${region.name} 여행 출발 ➜`;
        renderRegions();
      });
      fragment.append(button);
    });
    $('region-grid').replaceChildren(fragment);
  }
  function chooseMode(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-mode]').forEach(button => {
      const chosen = button.dataset.mode === mode;
      button.classList.toggle('selected',chosen);
      button.setAttribute('aria-pressed',String(chosen));
    });
  }
  function stopTimer() { if (state.timer) clearInterval(state.timer); state.timer = null; }
  function updateTimer() {
    if (!state.running || state.answered || state.mode !== 'challenge' || document.hidden) return;
    const left = Math.max(0, (state.deadline - performance.now()) / 1000);
    $('timer-label').textContent = `${Math.ceil(left)}초`;
    $('timer-label').classList.toggle('urgent',left <= 6);
    if (left <= 0) answerQuestion(null);
  }
  function startTimer() {
    stopTimer();
    const el = $('timer-label');
    el.hidden = state.mode !== 'challenge';
    el.classList.remove('urgent');
    if (state.mode !== 'challenge') return;
    state.pausedAt = 0;
    state.deadline = performance.now() + 20000;
    state.timer = setInterval(updateTimer, 150);
    updateTimer();
  }
  function makeQuestionType(entry) {
    if (state.mode === 'picture') return ['🥔','🍠','🌽','🐚','🐙','🦀'].includes(entry.emoji) ? 'market' : 'picture';
    if (state.region === 'all' && state.index % 4 === 3 && entry.regionQuiz) return 'region';
    if (['🥔','🍠','🌽','🐚','🐙'].includes(entry.emoji) && state.index % 3 === 1) return 'market';
    return state.index % 3 === 2 ? 'listen' : 'meaning';
  }
  function makeChoices(entry, type) {
    if (type === 'region') {
      const correct = allRegions.get(entry.region).name;
      const wrong = data.shuffle(data.REGIONS.filter(region => region.id !== entry.region)).slice(0,3).map(region => region.name);
      return { correct, choices:data.shuffle([correct,...wrong]) };
    }
    const size = state.mode === 'picture' ? 3 : 4;
    return { correct:entry.meaning, choices:data.makeOptions(entry,size) };
  }
  function startRun() {
    cancelSpeaking();
    stopTimer();
    state.deck = data.makeDeck(state.region,10);
    if (!state.deck.length) return;
    state.index = 0; state.correct = 0; state.correctRegions = new Set(); state.score = 0; state.running = true; state.finishing = false;
    window.KidscadeGame?.start?.({ mode:state.mode, region:state.region, questionCount:state.deck.length });
    state.progress.plays += 1;
    saveProgress();
    showScreen('play');
    renderQuestion();
  }
  function sceneEmoji(entry) {
    if (entry.region === 'jeju') return '👵';
    if (entry.region === 'gyeongsang') return '👨‍🍳';
    if (entry.region === 'gangwon') return '🧑‍🌾';
    if (entry.region === 'jeolla') return '👩‍🍳';
    return '👨‍🌾';
  }
  function renderQuestion() {
    const entry = state.deck[state.index];
    if (!entry) return finishRun();
    state.answered = false;
    state.questionType = makeQuestionType(entry);
    const pick = makeChoices(entry,state.questionType);
    state.correctValue = pick.correct;
    state.choices = pick.choices;
    const region = allRegions.get(entry.region);
    const regionQuiz = state.questionType === 'region';
    $('region-emblem').textContent = regionQuiz ? '🗺️' : region.emoji;
    $('region-place').textContent = regionQuiz ? '어느 지역에서 온 말일까요?' : `${region.name} · ${region.place}`;
    $('kind-label').textContent = regionQuiz ? '말의 고향 찾기' : state.questionType === 'market' ? '시장 심부름' : state.questionType === 'picture' ? '그림으로 말 알아보기' : state.questionType === 'listen' ? '귀 쫑긋 듣기' : '말맛 해독';
    $('character-emoji').textContent = sceneEmoji(entry);
    $('game-scene').style.setProperty('--scene-color',region.color);
    $('speaker-label').textContent = regionQuiz ? '전국 여행에서 만난 말' : `${region.name}에서 만난 친구`;
    $('question-word').textContent = entry.word;
    $('question-type').textContent = regionQuiz ? '🗺️ 지역 찾기' : state.questionType === 'market' ? '🧺 물건 찾기' : state.questionType === 'picture' ? '🧩 그림 고르기' : state.questionType === 'listen' ? '🔊 듣고 맞히기' : '💬 뜻 찾기';
    $('question-prompt').textContent = regionQuiz ? '이 말로 만나 볼 여행 지역은?' : state.questionType === 'market' ? '어떤 물건을 바구니에 담을까요?' : state.questionType === 'picture' ? '어울리는 그림과 뜻을 골라요!' : state.questionType === 'listen' ? '말을 듣고 뜻을 골라 보세요!' : '이 말은 어떤 뜻일까요?';
    $('answer-hint').textContent = state.mode === 'challenge' ? '빠르게 골라요!' : '정답을 눌러요';
    $('round-label').textContent = `${state.index+1} / ${state.deck.length} 문제`;
    $('progress-bar').setAttribute('aria-valuemax',String(state.deck.length));
    $('progress-bar').setAttribute('aria-valuenow',String(state.index));
    $('progress-fill').style.width = `${state.index/state.deck.length*100}%`;
    $('score-value').textContent = state.score.toLocaleString('ko-KR');
    $('feedback').hidden = true;
    $('feedback').classList.remove('is-wrong');
    $('basket').hidden = state.questionType !== 'market';
    $('basket').querySelector('span').textContent = '장바구니가 비어 있어요';
    $('next-button').textContent = state.index === state.deck.length-1 ? '여행 결과 보기 →' : '다음 문제 →';
    $('speak-button').disabled = !('speechSynthesis' in window) || !state.sound;
    $('speak-button').textContent = state.sound ? '🔊 말 들어보기' : '🔇 소리 꺼짐';
    const fragment = document.createDocumentFragment();
    state.choices.forEach((choice,index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer';
      button.dataset.answer = choice;
      const no = document.createElement('span'); no.className = 'option-no'; no.textContent = String(index+1);
      button.append(no);
      if (state.mode === 'picture' || state.questionType === 'market') {
        const pic = document.createElement('span'); pic.className = 'option-emoji'; pic.textContent = emotes.get(choice) || (choice === entry.meaning ? entry.emoji : '💭');
        pic.setAttribute('aria-hidden','true'); button.append(pic);
      }
      const text = document.createElement('span'); text.textContent = choice; button.append(text);
      button.addEventListener('click', () => answerQuestion(choice));
      fragment.append(button);
    });
    $('answers').replaceChildren(fragment);
    startTimer();
    if (state.questionType === 'listen' && state.sound) window.setTimeout(() => {
      if (state.running && !state.answered && state.deck[state.index] === entry) speak(entry.word);
    }, 350);
  }
  function answerQuestion(choice) {
    if (!state.running || state.answered) return false;
    state.answered = true;
    stopTimer(); cancelSpeaking();
    const entry = state.deck[state.index];
    const correct = choice === state.correctValue;
    const timedOut = choice === null;
    const bonus = state.mode === 'challenge' ? Math.max(0,Math.ceil((state.deadline-performance.now())/1000))*5 : 0;
    if (correct) {
      state.correct += 1;
      state.correctRegions.add(entry.region);
      state.score += 100+bonus;
      if (!state.progress.known.includes(entry.id)) state.progress.known.push(entry.id);
      saveProgress();
    }
    $('score-value').textContent = state.score.toLocaleString('ko-KR');
    document.querySelectorAll('.answer').forEach(button => {
      button.disabled = true;
      if (button.dataset.answer === state.correctValue) button.classList.add('correct');
      else if (choice !== null && button.dataset.answer === choice) button.classList.add('wrong');
    });
    if (state.questionType === 'market' && correct) $('basket').querySelector('span').textContent = `쏙! ${entry.emoji} 바구니에 담았어요!`;
    const region = allRegions.get(entry.region);
    $('feedback').hidden = false;
    $('feedback').classList.toggle('is-wrong',!correct);
    $('feedback-icon').textContent = correct ? '🌟' : timedOut ? '⌛' : '💡';
    $('feedback-title').textContent = correct ? '정답! 여행 도장이 반짝!' : timedOut ? '시간이 끝났어요!' : '괜찮아요. 하나 배웠네요!';
    $('feedback-text').textContent = state.questionType === 'region'
      ? `이 표현은 ${region.name} 여행에서 소개했어요. 뜻은 ‘${entry.meaning}’이에요. ${entry.shared ? '다른 지역에서도 쓰일 수 있어요.' : '그 지역에서 찾아볼 수 있는 표현이에요.'}`
      : `‘${entry.word}’는 ‘${entry.meaning}’${/[.!?]$/.test(entry.meaning) ? '라는 말이에요.' : '이라는 뜻이에요.'} ${entry.shared ? '다른 지역에서도 쓰이는 표현일 수 있어요.' : ''}`;
    $('source-link').href = entry.source;
    $('next-button').focus({ preventScroll:true });
    $('progress-bar').setAttribute('aria-valuenow',String(state.index+1));
    $('progress-fill').style.width = `${(state.index+1)/state.deck.length*100}%`;
    return correct;
  }
  function nextQuestion() {
    if (!state.answered || !state.running) return;
    state.index += 1;
    if (state.index >= state.deck.length) finishRun();
    else renderQuestion();
  }
  function finishRun() {
    if (state.finishing || !state.running) return;
    state.finishing = true; state.running = false;
    stopTimer(); cancelSpeaking();
    const previousBest = state.progress.best;
    state.progress.best = Math.max(state.progress.best,state.score);
    if (state.region !== 'all' && state.correct >= Math.ceil(state.deck.length*.6) && !state.progress.stamps.includes(state.region)) state.progress.stamps.push(state.region);
    if (state.region === 'all') {
      state.correctRegions.forEach(region => { if (!state.progress.stamps.includes(region)) state.progress.stamps.push(region); });
    }
    saveProgress();
    try { window.localStorage.setItem(SCORE_KEY,String(state.progress.best)); } catch (_) {}
    window.KidscadeGame?.result?.({ scope:'run', status:'completed', outcome:state.correct >= Math.ceil(state.deck.length*.6) ? 'clear':'fail', score:state.score, correct:state.correct, total:state.deck.length, mode:state.mode, region:state.region, cleared:state.correct >= Math.ceil(state.deck.length*.6), newBest:state.score > previousBest });
    $('result-region').textContent = `${state.region === 'all' ? '전국' : allRegions.get(state.region).name} 여행 완료`;
    $('result-title').textContent = state.correct === state.deck.length ? '와! 말맛 박사님!' : state.correct >= Math.ceil(state.deck.length*.6) ? '멋진 말맛 여행!' : '오늘도 한 걸음 배웠어요!';
    $('result-message').textContent = state.correct === state.deck.length ? '모든 문제를 맞혔어요. 다음 여행도 기대해요!' : '틀린 문제는 다음 여행에서 다시 만날 수 있어요.';
    $('result-medal').textContent = state.correct === state.deck.length ? '🏆' : state.correct >= Math.ceil(state.deck.length*.6) ? '🏅':'🎒';
    $('final-score').textContent = state.score.toLocaleString('ko-KR');
    $('correct-count').textContent = `${state.correct} / ${state.deck.length}`;
    $('best-score').textContent = state.progress.best.toLocaleString('ko-KR');
    $('stamp-count').textContent = String(state.progress.stamps.length);
    showScreen('result');
  }
  function cancelSpeaking() { try { window.speechSynthesis?.cancel(); } catch (_) {} }
  function speak(value) {
    if (!state.sound || !('speechSynthesis' in window)) return;
    try {
      cancelSpeaking();
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = 'ko-KR'; utterance.rate = state.mode === 'picture' ? .8 : .88;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }
  function abandonRun() {
    if (!state.running) return;
    state.running = false;
    stopTimer(); cancelSpeaking();
    window.KidscadeGame?.result?.({ scope:'run', status:'abandoned', outcome:'fail', endsSession:true, correct:state.correct, total:state.deck.length, mode:state.mode, region:state.region });
  }
  function backToStart() { abandonRun(); showScreen('start'); updatePassport(); }

  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click',() => chooseMode(button.dataset.mode)));
  $('start-button').addEventListener('click',startRun);
  $('next-button').addEventListener('click',nextQuestion);
  $('again-button').addEventListener('click',startRun);
  $('change-button').addEventListener('click',backToStart);
  $('home-button').addEventListener('click',backToStart);
  $('speak-button').addEventListener('click',() => speak(state.deck[state.index]?.word || ''));
  $('sound-toggle').addEventListener('click', () => {
    state.sound = !state.sound;
    $('sound-toggle').textContent = state.sound ? '🔊' : '🔇';
    $('sound-toggle').setAttribute('aria-label',state.sound ? '소리 끄기':'소리 켜기');
    $('speak-button').disabled = !state.sound || !('speechSynthesis' in window);
    $('speak-button').textContent = state.sound ? '🔊 말 들어보기':'🔇 소리 꺼짐';
    if (!state.sound) cancelSpeaking();
  });
  document.addEventListener('keydown',event => {
    if ($('play-screen').hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    // 다음 버튼에 초점이 있을 때는 브라우저의 기본 Enter 클릭만 처리해 중복 진행을 막습니다.
    if (event.key === 'Enter' && state.answered && document.activeElement?.tagName !== 'BUTTON') { event.preventDefault(); nextQuestion(); return; }
    if (!state.answered && /^[1-4]$/.test(event.key) && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
      const choice = state.choices[Number(event.key)-1];
      if (choice) { event.preventDefault(); answerQuestion(choice); }
    }
  });
  document.addEventListener('visibilitychange',() => {
    if (state.mode !== 'challenge' || !state.running || state.answered) return;
    if (document.hidden) state.pausedAt = performance.now();
    else if (state.pausedAt) { state.deadline += performance.now()-state.pausedAt; state.pausedAt = 0; updateTimer(); }
  });
  window.KidscadeGame?.registerCleanup?.(() => { stopTimer(); cancelSpeaking(); state.running = false; });
  updatePassport();
})();
