(function(root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  if (root) root.DailyEnglishContent = data;
})(typeof window === 'undefined' ? null : window, () => {
  'use strict';
  const zones = [
    { name:'햇살 빵집', icon:'🥐', color:'#eeb451', friend:'토리', animal:'rabbit', story:'빵집의 새 친구 토리와 첫 주문을 준비해요.' },
    { name:'두근두근 학교', icon:'🏫', color:'#75b7bc', friend:'베니', animal:'bear', story:'베니의 가방을 챙기고 교실 친구들과 이야기해요.' },
    { name:'초록빛 공원', icon:'🌳', color:'#99bd7c', friend:'코코', animal:'dog', story:'코코와 동물들을 만나고 작은 소풍을 떠나요.' }
  ];
  // Each lesson introduces three words and one useful, complete expression.
  const rows = [
    ['첫 인사', [['hello','안녕','👋'],['goodbye','잘 가','🙋'],['thanks','고마워','💛']], 'Hello, Tori!', '안녕, 토리!', '친구가 Hello! 하고 인사했어요.', 'Hello!', ['Goodbye!','Good night!']],
    ['빵집 진열대', [['bread','빵','🍞'],['cake','케이크','🍰'],['cookie','쿠키','🍪']], 'I want bread.', '나는 빵을 원해요.', '토리가 What do you want? 하고 물어요.', 'I want bread.', ['I am Tori.','Goodbye!']],
    ['마실 것 고르기', [['milk','우유','🥛'],['water','물','💧'],['juice','주스','🧃']], 'Water, please.', '물 주세요.', '물을 정중하게 주문해요.', 'Water, please.', ['I am happy.','Hello, Tori!']],
    ['알록달록 포장', [['red','빨간색','🔴'],['blue','파란색','🔵'],['yellow','노란색','🟡']], 'It is red.', '그것은 빨간색이에요.', 'What color is it? 빨간 포장을 보며 답해요.', 'It is red.', ['It is blue.','It is yellow.']],
    ['하나 둘 셋', [['one','하나','1️⃣'],['two','둘','2️⃣'],['three','셋','3️⃣']], 'Two cookies, please.', '쿠키 두 개 주세요.', '쿠키 두 개를 주문해요.', 'Two cookies, please.', ['One cookie, please.','Three cookies, please.']],
    ['오늘의 기분', [['happy','행복한','😊'],['sad','슬픈','😢'],['hungry','배고픈','😋']], 'I am happy.', '나는 행복해요.', 'How are you? 기분이 좋아요!', 'I am happy.', ['I am sad.','I am hungry.']],
    ['가방 챙기기', [['book','책','📕'],['pencil','연필','✏️'],['bag','가방','🎒']], 'This is my bag.', '이것은 내 가방이에요.', '네 가방을 친구에게 소개해요.', 'This is my bag.', ['This is my book.','This is my pencil.']],
    ['우리 교실', [['desk','책상','🪑'],['door','문','🚪'],['clock','시계','🕒']], 'Open the door.', '문을 열어요.', '친구에게 문을 열어 달라고 말해요.', 'Open the door.', ['Close the door.','Look at the clock.']],
    ['몸을 움직여요', [['hand','손','✋'],['eye','눈','👁️'],['ear','귀','👂']], 'Raise your hand.', '손을 들어요.', '발표하려고 손을 들어요. 어떤 말일까요?', 'Raise your hand.', ['Close your eyes.','Touch your ear.']],
    ['함께 해 봐요', [['run','달리다','🏃'],['jump','뛰어오르다','🦘'],['sit','앉다','🧘']], 'I can jump.', '나는 뛰어오를 수 있어요.', 'Can you jump? 할 수 있다고 답해요.', 'Yes, I can.', ['No, I cannot.','I want milk.']],
    ['가족 소개', [['mother','어머니','👩'],['father','아버지','👨'],['sister','자매','👧']], 'This is my mother.', '이분은 우리 어머니예요.', '어머니를 친구에게 소개해요.', 'This is my mother.', ['This is my father.','This is my sister.']],
    ['간식 시간', [['apple','사과','🍎'],['banana','바나나','🍌'],['orange','오렌지','🍊']], 'I like apples.', '나는 사과를 좋아해요.', 'Do you like apples? 좋아한다고 답해요.', 'Yes, I do.', ['No, I do not.','I am a banana.']],
    ['동물 친구들', [['dog','개','🐶'],['cat','고양이','🐱'],['bird','새','🐦']], 'It is a dog.', '그것은 개예요.', 'What is it? 강아지를 보고 답해요.', 'It is a dog.', ['It is a cat.','It is a bird.']],
    ['오늘 날씨는', [['sunny','맑은','☀️'],['rainy','비 오는','🌧️'],['cloudy','흐린','☁️']], 'It is sunny.', '날씨가 맑아요.', 'How is the weather? 해가 반짝여요.', 'It is sunny.', ['It is rainy.','It is cloudy.']],
    ['소풍 바구니', [['rice','밥','🍚'],['egg','달걀','🥚'],['cheese','치즈','🧀']], 'I want cheese.', '나는 치즈를 원해요.', 'What do you want? 치즈를 먹고 싶어요.', 'I want cheese.', ['I want rice.','I want an egg.']],
    ['어디에 있을까', [['tree','나무','🌳'],['flower','꽃','🌷'],['bench','벤치','🪑']], 'Look at the tree.', '나무를 보세요.', '코코에게 꽃을 보라고 말해요.', 'Look at the flower.', ['Look at the tree.','Look at the bench.']],
    ['작은 발견', [['big','큰','🐘'],['small','작은','🐜'],['long','긴','🦒']], 'It is small.', '그것은 작아요.', '작은 개미를 설명해요.', 'It is small.', ['It is big.','It is long.']],
    ['다음에 또 만나', [['morning','아침','🌅'],['night','밤','🌙'],['tomorrow','내일','📅']], 'See you tomorrow.', '내일 만나요.', '친구와 내일 다시 만나기로 했어요.', 'See you tomorrow.', ['Good morning!','Good night!']]
  ];
  const lessons = rows.map((r,i) => ({ id:'lesson-'+(i+1), index:i, zone:Math.floor(i/6), title:r[0], words:r[1].map(([en,ko,icon])=>({en,ko,icon})), sentence:r[2], translation:r[3], dialogue:r[4], response:r[5], distractors:r[6] }));
  const bank=typeof window==='undefined'?require('./arcade-bank.js'):window.DailyEnglishArcadeBank;
  if(!bank||!Array.isArray(bank.engWords)||!Array.isArray(bank.engSentences)) throw new Error('English arcade bank is missing');
  const expanded=[
    ['engWords',0,.18,'사람과 생활','👨‍👩‍👧','사람과 일상을 이야기해요.'],
    ['engWords',.18,.36,'먹고 마시기','🍎','맛있는 것들을 영어로 표현해요.'],
    ['engWords',.36,.56,'세상과 자연','🌿','주변의 자연과 사물을 발견해요.'],
    ['engWords',.56,.78,'학교와 하루','🏫','학교와 하루의 활동을 알아봐요.'],
    ['engWords',.78,1,'시간·날씨·표현','🌤️','시간과 기분을 영어로 전해요.'],
    ['engSentences',0,.52,'문장 첫걸음','💬','단어를 이어서 한 문장을 완성해요.'],
    ['engSentences',.52,1,'문장 탐험','🚀','더 긴 문장도 자신 있게 이야기해요.']
  ];
  expanded.forEach(([source,from,to,name,icon,story],zi)=>{
    const items=bank[source],start=Math.round(items.length*from),end=Math.round(items.length*to);
    const zoneIndex=zones.length;
    zones.push({name,icon,color:'#75a8d0',friend:'토리',animal:'rabbit',story,advanced:true});
    for(let offset=start;offset<end;offset+=8){
      // Short final packs reuse a few expressions from the previous pack so
      // every lesson still has eight questions and remains compatible with saves.
      const upper=Math.min(end,offset+8),lower=Math.max(start,upper-8);
      const entries=items.slice(lower,upper).map((item,i)=>({en:item.word,ko:item.desc,icon:source==='engWords'?'📘':'💬',key:`${source}:${lower+i}`,source}));
      const index=lessons.length;
      lessons.push({id:'lesson-'+(index+1),index,zone:zoneIndex,title:`${name} ${Math.floor((offset-start)/8)+1}`,words:entries.slice(0,3),sentence:entries[0].en,translation:entries[0].ko,entries,advanced:true});
    }
  });
  const shuffle = (a, random=Math.random) => { const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; };
  const allWords=[...bank.engWords,...bank.engSentences];
  function expansionQuestions(lesson,random){
    const pickOptions=(answer,field,source)=>{
      const choices=[answer],pool=shuffle(bank[source].map(x=>x[field]),random);
      for(const value of pool){if(choices.length>=4)break;if(value!==answer&&!choices.includes(value))choices.push(value);}
      return shuffle(choices,random);
    };
    return lesson.entries.map((item,i)=>{
      const sentence=item.source==='engSentences';
      const explain=`${item.en} · ${item.ko}`;
      const base={legacyKey:item.key,explain};
      if(sentence&&i%2===0){
        const answer=item.en.replace(/[.,!?]/g,'').trim();
        return {...base,kind:'order',prompt:'단어를 눌러 영어 문장을 완성해요.',display:item.ko,answer,tokens:shuffle(answer.split(/\s+/),random)};
      }
      if(!sentence&&i%4===2&&/^[a-z]+$/i.test(item.en))return {...base,kind:'spell',prompt:'글자를 눌러 영어 단어를 완성해요.',display:item.ko,answer:item.en,tokens:shuffle(item.en.split(''),random)};
      if(i%3===1)return {...base,kind:'listen',prompt:'소리를 듣고 알맞은 뜻을 골라요.',speech:item.en,answer:item.ko,options:pickOptions(item.ko,'desc',item.source)};
      if(i%3===0)return {...base,kind:'choice',prompt:'영어 표현의 뜻을 찾아요.',display:item.en,answer:item.ko,options:pickOptions(item.ko,'desc',item.source)};
      return {...base,kind:'choice',prompt:'알맞은 영어 표현을 골라요.',display:item.ko,answer:item.en,options:pickOptions(item.en,'word',item.source)};
    });
  }
  function questions(index, random=Math.random) {
    const l=lessons[index];
    if(!l) return [];
    if(l.advanced)return expansionQuestions(l,random);
    const [a,b,c]=l.words;
    const pick=(word,reverse=false)=>({kind:'choice',prompt:reverse?'이 영어는 무슨 뜻일까요?':'알맞은 영어를 골라요.',display:reverse?word.en:word.ko,icon:word.icon,answer:reverse?word.ko:word.en,options:shuffle(l.words.map(w=>reverse?w.ko:w.en),random),explain:`${word.en} · ${word.ko}`});
    return [
      pick(a), pick(b), pick(c,true),
      {kind:'listen',prompt:'소리를 듣고 알맞은 뜻을 골라요.',speech:b.en,answer:b.ko,options:shuffle(l.words.map(w=>w.ko),random),explain:`${b.en} · ${b.ko}`},
      {kind:'spell',prompt:'글자를 눌러 단어를 완성해요.',display:c.ko,icon:c.icon,answer:c.en,tokens:shuffle(c.en.split(''),random),explain:`${c.en} · ${c.ko}`},
      {kind:'order',prompt:'단어를 눌러 문장을 만들어요.',display:l.translation,answer:l.sentence.replace(/[.,!]/g,''),tokens:shuffle(l.sentence.replace(/[.,!]/g,'').split(' '),random),explain:`${l.sentence} · ${l.translation}`},
      {kind:'dialogue',prompt:l.dialogue,display:'친구에게 뭐라고 말할까요?',answer:l.response,options:shuffle([l.response,...l.distractors],random),explain:l.response},
      {...pick(c),prompt:'마지막 심부름! 이 물건이나 표현을 찾아요.'}
    ];
  }
  function itemFromKey(key){
    const match=/^(engWords|engSentences):(\d+)$/.exec(key||'');
    if(!match)return null;
    const raw=bank[match[1]][Number(match[2])];
    return raw?{en:raw.word,ko:raw.desc,key,source:match[1]}:null;
  }
  function reviewQuestions(keys,random=Math.random){
    const entries=[...new Set(keys)].map(itemFromKey).filter(Boolean).slice(0,8);
    return entries.length===8?expansionQuestions({entries},random):[];
  }
  return {zones,lessons,questions,shuffle,reviewQuestions,itemFromKey,originalLessonCount:rows.length,arcadeItemCount:allWords.length};
});
