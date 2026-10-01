(() => {
  'use strict';
  const rows = [
    ['ant','개미'],['ape','유인원'],['arm','팔'],['art','미술'],['bag','가방'],['bat','박쥐'],['bed','침대'],['bee','벌'],['big','큰'],
    ['box','상자'],['boy','소년'],['bus','버스'],['car','자동차'],['cat','고양이'],['cow','소'],['cup','컵'],['dad','아빠'],['day','낮/하루'],['dog','개'],
    ['ear','귀'],['egg','달걀'],['eye','눈'],['fan','선풍기/팬'],['far','먼'],['fat','뚱뚱한'],['fox','여우'],['fun','재미'],['hat','모자'],['hen','암탉'],
    ['hot','뜨거운'],['ice','얼음'],['jar','병'],['jet','제트기'],['leg','다리'],['lip','입술'],['map','지도'],['mom','엄마'],['mud','진흙'],['net','그물'],
    ['new','새로운'],['nut','견과류'],['old','오래된'],['one','하나'],['owl','올빼미'],['pen','펜'],['pig','돼지'],['pot','냄비'],['red','빨간색'],
    ['run','달리다'],['sea','바다'],['sit','앉다'],['six','여섯'],['sky','하늘'],['son','아들'],['sun','태양'],['tea','차'],['ten','열'],['top','위/정상'],
    ['toy','장난감'],['two','둘'],['vet','수의사'],['web','거미줄'],['wet','젖은'],['win','이기다'],['yes','네'],['zoo','동물원'],
    ['baby','아기'],['back','뒤'],['ball','공'],['bear','곰'],['bird','새'],['blue','파란색'],['book','책'],['cake','케이크'],['cold','추운'],['cook','요리하다'],
    ['desk','책상'],['door','문'],['duck','오리'],['fast','빠른'],['fire','불'],['fish','물고기'],['food','음식'],['foot','발'],['frog','개구리'],
    ['game','게임'],['girl','소녀'],['goat','염소'],['good','좋은'],['hand','손'],['head','머리'],['home','집'],['jump','점프하다'],['king','왕'],
    ['lion','사자'],['milk','우유'],['moon','달'],['nose','코'],['play','놀다'],['rain','비'],['read','읽다'],['room','방'],['ship','배'],
    ['shoe','신발'],['shop','가게'],['sing','노래하다'],['snow','눈'],['star','별'],['swim','수영하다'],['tree','나무'],['walk','걷다'],['wall','벽'],
    ['wind','바람'],['wolf','늑대'],['apple','사과'],['beach','해변'],['black','검은색'],['bread','빵'],['chair','의자'],['class','학급'],['clock','시계'],
    ['cloud','구름'],['dance','춤추다'],['drink','마시다'],['earth','지구'],['green','초록색'],['happy','행복한'],['horse','말'],['house','집'],
    ['juice','주스'],['light','빛'],['mouse','생쥐'],['music','음악'],['night','밤'],['panda','판다'],['paper','종이'],['plant','식물'],['queen','여왕'],
    ['river','강'],['robot','로봇'],['sheep','양'],['smile','미소 짓다'],['snake','뱀'],['space','우주'],['table','탁자'],['tiger','호랑이'],['train','기차'],
    ['water','물'],['white','흰색'],['brown','갈색'],['brush','붓/솔'],['candy','사탕'],['chess','체스'],['dream','꿈'],['fruit','과일'],['grape','포도'],
    ['grass','풀'],['heart','심장/마음'],['honey','꿀'],['laugh','웃다'],['lemon','레몬'],['lunch','점심'],['ocean','바다'],['pizza','피자'],['plane','비행기'],
    ['shirt','셔츠'],['short','짧은'],['sleep','자다'],['small','작은'],['sport','운동'],['stone','돌'],['story','이야기'],['sweet','달콤한'],['watch','시계/보다'],
    ['young','어린'],['answer','대답'],['banana','바나나'],['basket','바구니'],['camera','카메라'],['chicken','닭'],['circle','원'],['family','가족'],
    ['flower','꽃'],['garden','정원'],['guitar','기타'],['hamster','햄스터'],['library','도서관'],['monkey','원숭이'],['morning','아침'],['orange','주황색/오렌지'],
    ['pencil','연필'],['rabbit','토끼'],['school','학교'],['student','학생'],['teacher','선생님'],['turtle','거북이'],['window','창문'],['winter','겨울'],
    ['summer','여름'],['spring','봄'],['autumn','가을'],['friend','친구'],['yellow','노란색'],['purple','보라색'],['planet','행성'],['rocket','로켓'],
    ['bridge','다리'],['castle','성'],['market','시장'],['doctor','의사'],['nurse','간호사'],['police','경찰'],['eraser','지우개'],['ruler','자'],
    ['lesson','수업'],['science','과학'],['history','역사'],['computer','컴퓨터'],['keyboard','키보드'],['screen','화면'],['crayon','크레용'],['glue','풀'],
    ['backpack','책가방'],['notebook','공책'],['question','질문'],['dolphin','돌고래'],['whale','고래'],['shark','상어'],['penguin','펭귄'],['giraffe','기린'],
    ['zebra','얼룩말'],['koala','코알라'],['squirrel','다람쥐']
  ];
  const unique = new Map();
  rows.forEach(([word, ko]) => {
    const w = String(word).toUpperCase();
    if (w.length >= 3 && w.length <= 8 && /^[A-Z]+$/.test(w) && !unique.has(w)) unique.set(w, ko);
  });
  window.WORDRIS_WORDS = Object.freeze(Object.fromEntries(unique));
})();