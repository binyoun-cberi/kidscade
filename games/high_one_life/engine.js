/* 단 하나의 인생 — 독립적인 시뮬레이션 엔진. 수치는 게임용 모델이며 현실 통계 예측이 아닙니다. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.OneLifeSim = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
  // 세계 인구 규모를 대략 참고한 게임용 가중치. 실제 '출생 확률' 자료가 아니다.
  const COUNTRIES = [
    ['인도','🇮🇳',1460,0.51,0.56],['중국','🇨🇳',1410,0.65,0.69],
    ['미국','🇺🇸',342,0.79,0.76],['인도네시아','🇮🇩',285,0.55,0.60],
    ['파키스탄','🇵🇰',255,0.35,0.46],['나이지리아','🇳🇬',235,0.36,0.43],
    ['브라질','🇧🇷',216,0.61,0.63],['방글라데시','🇧🇩',175,0.43,0.53],
    ['러시아','🇷🇺',144,0.62,0.63],['에티오피아','🇪🇹',132,0.30,0.43],
    ['멕시코','🇲🇽',131,0.60,0.61],['일본','🇯🇵',123,0.83,0.87],
    ['이집트','🇪🇬',118,0.49,0.56],['필리핀','🇵🇭',117,0.53,0.60],
    ['콩고민주공화국','🇨🇩',110,0.28,0.39],['베트남','🇻🇳',101,0.60,0.68],
    ['이란','🇮🇷',92,0.55,0.62],['튀르키예','🇹🇷',87,0.63,0.68],
    ['독일','🇩🇪',84,0.86,0.86],['태국','🇹🇭',72,0.66,0.70],
    ['영국','🇬🇧',69,0.83,0.83],['프랑스','🇫🇷',67,0.84,0.85],
    ['대한민국','🇰🇷',52,0.83,0.85],['남아프리카공화국','🇿🇦',63,0.53,0.57],
    ['케냐','🇰🇪',57,0.42,0.49],['스페인','🇪🇸',49,0.80,0.84],
    ['아르헨티나','🇦🇷',46,0.65,0.69],['캐나다','🇨🇦',41,0.88,0.86],
    ['우간다','🇺🇬',50,0.34,0.44],['폴란드','🇵🇱',37,0.75,0.77],
    ['탄자니아','🇹🇿',70,0.38,0.47],['이탈리아','🇮🇹',59,0.81,0.83],
    ['미얀마','🇲🇲',55,0.43,0.52],['콜롬비아','🇨🇴',53,0.62,0.65],
    ['수단','🇸🇩',51,0.34,0.41],['이라크','🇮🇶',46,0.50,0.56],
    ['아프가니스탄','🇦🇫',44,0.30,0.40],['예멘','🇾🇪',42,0.31,0.41],
    ['우크라이나','🇺🇦',38,0.60,0.62],['앙골라','🇦🇴',39,0.36,0.44],
    ['우즈베키스탄','🇺🇿',37,0.53,0.60],['말레이시아','🇲🇾',35,0.69,0.71],
    ['모로코','🇲🇦',38,0.57,0.63],['가나','🇬🇭',35,0.44,0.52],
    ['네팔','🇳🇵',31,0.45,0.54],['모잠비크','🇲🇿',35,0.34,0.41],
    ['사우디아라비아','🇸🇦',35,0.72,0.74],['페루','🇵🇪',34,0.61,0.63],
    ['니제르','🇳🇪',28,0.28,0.39],['코트디부아르','🇨🇮',33,0.41,0.49],
    ['마다가스카르','🇲🇬',32,0.38,0.46],['카메룬','🇨🇲',30,0.40,0.48],
    ['말리','🇲🇱',25,0.33,0.42],['호주','🇦🇺',27,0.89,0.86],
    ['북한','🇰🇵',26,0.36,0.50],['시리아','🇸🇾',25,0.38,0.47],
    ['부르키나파소','🇧🇫',24,0.33,0.41],['스리랑카','🇱🇰',22,0.58,0.66],
    ['대만','🇹🇼',23,0.83,0.84],['잠비아','🇿🇲',21,0.41,0.49],
    ['말라위','🇲🇼',22,0.34,0.45],['칠레','🇨🇱',20,0.71,0.74],
    ['차드','🇹🇩',19,0.30,0.40],['카자흐스탄','🇰🇿',21,0.65,0.68],
    ['소말리아','🇸🇴',19,0.30,0.38],['루마니아','🇷🇴',19,0.71,0.75],
    ['과테말라','🇬🇹',19,0.50,0.57],['에콰도르','🇪🇨',18,0.63,0.65],
    ['네덜란드','🇳🇱',18,0.88,0.88],['세네갈','🇸🇳',19,0.43,0.51],
    ['캄보디아','🇰🇭',17,0.50,0.55],['짐바브웨','🇿🇼',17,0.41,0.49],
    ['르완다','🇷🇼',14,0.42,0.50],['베냉','🇧🇯',14,0.40,0.49],
    ['부룬디','🇧🇮',13,0.31,0.39],['볼리비아','🇧🇴',12,0.58,0.62],
    ['튀니지','🇹🇳',12,0.62,0.66],['벨기에','🇧🇪',12,0.86,0.86],
    ['아이티','🇭🇹',12,0.32,0.42],['쿠바','🇨🇺',11,0.60,0.70],
    ['체코','🇨🇿',11,0.80,0.82],['스웨덴','🇸🇪',11,0.90,0.89],
    ['포르투갈','🇵🇹',10,0.81,0.84],['그리스','🇬🇷',10,0.78,0.81],
    ['헝가리','🇭🇺',9,0.75,0.78],['오스트리아','🇦🇹',9,0.89,0.89],
    ['이스라엘','🇮🇱',10,0.80,0.83],['아랍에미리트','🇦🇪',11,0.84,0.82],
    ['요르단','🇯🇴',11,0.58,0.64],['파푸아뉴기니','🇵🇬',11,0.34,0.44],
    ['타지키스탄','🇹🇯',11,0.47,0.54],['기니','🇬🇳',15,0.37,0.44],
    ['도미니카공화국','🇩🇴',11,0.61,0.64],['아제르바이잔','🇦🇿',10,0.65,0.69],
    ['벨라루스','🇧🇾',9,0.65,0.71],['스위스','🇨🇭',9,0.91,0.90],
    ['온두라스','🇭🇳',11,0.52,0.58],['리비아','🇱🇾',7,0.52,0.58],
    ['파라과이','🇵🇾',7,0.58,0.62],['라오스','🇱🇦',8,0.46,0.55],
    ['니카라과','🇳🇮',7,0.48,0.55],['키르기스스탄','🇰🇬',7,0.53,0.61]
  ];
  const CHOICES = [
    {age:10,title:'학교가 끝난 오후',description:'가족과 친구들, 그리고 혼자만의 시간이 기다립니다.',options:[
      {label:'궁금한 것을 배운다',note:'공부와 새로운 발견',effects:{knowledge:12,happiness:2,bonds:-2},text:'책과 새로운 질문이 어린 시절을 채웠다.'},
      {label:'친구들과 마음껏 논다',note:'관계와 즐거움',effects:{bonds:13,happiness:8,knowledge:-3},text:'함께 웃던 장면들이 기억에 남았다.'},
      {label:'가족을 도우며 지낸다',note:'책임감과 유대',effects:{bonds:11,wealth:2,knowledge:2},text:'가족을 돕는 시간이 자연스러운 일상이 되었다.'}
    ]},
    {age:16,title:'내가 좋아하는 일',description:'앞으로 어떤 시간을 더 많이 보내고 싶나요?',options:[
      {label:'배움에 집중한다',note:'지식 상승',effects:{knowledge:13,happiness:-3},text:'어려운 공부를 한 번 더 붙잡아 보았다.'},
      {label:'운동과 취미에 뛰어든다',note:'건강과 행복',effects:{health:10,happiness:9},text:'내가 좋아하는 세계가 조금 더 넓어졌다.'},
      {label:'사람들과 어울린다',note:'관계와 소통',effects:{bonds:12,happiness:5,knowledge:2},text:'새로운 사람을 만나며 세상을 배웠다.'}
    ]},
    {age:20,title:'세상으로 나아갈 시간',description:'모든 사람에게 똑같은 기회가 주어지지는 않습니다.',options:[
      {label:'더 공부하기를 선택한다',note:'비용과 지식, 진로의 기회',effects:{knowledge:17,wealth:-9,happiness:-3},career:'학생',text:'배움의 시간을 조금 더 갖기로 했다.'},
      {label:'일을 시작한다',note:'자립과 경험',effects:{wealth:12,knowledge:5,health:-3},career:'일하는 사람',text:'직접 돈을 벌며 세상을 경험하기 시작했다.'},
      {label:'여러 일을 탐색한다',note:'행복과 가능성',effects:{happiness:11,knowledge:9,wealth:-5},career:'진로 탐색 중',text:'서두르지 않고 나에게 맞는 길을 찾아보았다.'}
    ]},
    {age:29,title:'인생의 방향이 달라지는 순간',description:'지금 무엇에 더 많은 에너지를 쓰고 싶나요?',options:[
      {label:'일에 집중한다',note:'경제와 지식, 건강 부담',effects:{wealth:17,knowledge:8,health:-7,bonds:-4},career:'직장인',text:'일이 삶의 중요한 부분이 되었다.'},
      {label:'소중한 사람과 시간을 보낸다',note:'관계와 행복',effects:{bonds:16,happiness:11,wealth:-3},text:'가까운 사람들과 일상을 꾸렸다.'},
      {label:'새로운 꿈에 도전한다',note:'높은 변동성과 가능성',effects:{knowledge:12,happiness:8,wealth:-8},career:'새로운 길에 도전 중',text:'익숙한 길을 벗어나 새로운 도전을 시작했다.'}
    ]},
    {age:42,title:'지금의 나를 돌볼 시간',description:'일과 관계, 몸과 마음 사이에서 균형을 찾아야 합니다.',options:[
      {label:'몸과 마음을 챙긴다',note:'건강과 행복',effects:{health:16,happiness:7,wealth:-4},text:'바쁘더라도 스스로를 돌보는 시간을 만들었다.'},
      {label:'경력을 더 쌓는다',note:'경제와 지식',effects:{wealth:15,knowledge:8,health:-9},text:'해오던 일에 더욱 깊이 몰두했다.'},
      {label:'가족과 이웃에게 힘을 쓴다',note:'관계와 행복',effects:{bonds:15,happiness:10,wealth:-3},text:'혼자보다 함께하는 일에 더 많은 시간을 썼다.'}
    ]},
    {age:58,title:'앞으로의 삶은',description:'시간을 보내는 방식이 또 한 번 달라집니다.',options:[
      {label:'조금 느리게 살아간다',note:'건강과 휴식',effects:{health:14,happiness:8,wealth:-7},career:'삶의 속도를 조절하는 중',text:'숨을 고르고 삶의 속도를 조절했다.'},
      {label:'경험을 다른 사람에게 나눈다',note:'관계와 지식',effects:{bonds:14,knowledge:8,happiness:4},text:'쌓아 온 경험을 누군가에게 전했다.'},
      {label:'새로운 일에 다시 도전한다',note:'도전과 변동성',effects:{knowledge:10,happiness:8,health:-5,wealth:7},career:'새로운 일에 도전 중',text:'나이는 새로운 도전을 막지 못했다.'}
    ]},
    {age:73,title:'남은 날들을 어떻게 보낼까요?',description:'더 많은 것을 이루는 것 말고도 삶을 채우는 방법이 있습니다.',options:[
      {label:'사람들과 시간을 보낸다',note:'관계와 행복',effects:{bonds:15,happiness:9},text:'오래된 인연과 새로운 친구들이 곁에 있었다.'},
      {label:'좋아하는 취미를 이어 간다',note:'행복과 건강',effects:{happiness:14,health:8},text:'하루하루 좋아하는 것을 놓지 않았다.'},
      {label:'나의 이야기를 기록한다',note:'지식과 성찰',effects:{knowledge:10,happiness:8},text:'살아온 시간을 천천히 글로 남겼다.'}
    ]}
  ];
  const EVENTS = [
    [1,12,'처음으로 친구와 마음을 나누었다.',{bonds:7,happiness:4}],
    [3,15,'새로운 놀이를 배우며 신나는 하루를 보냈다.',{happiness:7,knowledge:3}],
    [6,19,'어려웠던 문제를 스스로 해결했다.',{knowledge:8,happiness:4}],
    [8,23,'믿었던 친구와 다투고 다시 화해했다.',{bonds:4,happiness:-3}],
    [13,28,'뜻밖의 기회를 만나 세상을 넓게 보았다.',{knowledge:7,happiness:5}],
    [16,35,'계획했던 일이 잘되지 않아 잠시 주저앉았다.',{happiness:-8,knowledge:4}],
    [17,45,'오랫동안 연락하지 못한 사람과 다시 만났다.',{bonds:9,happiness:4}],
    [20,52,'새로운 일을 배워 조금씩 실력이 늘었다.',{knowledge:8,wealth:3}],
    [21,65,'생활비가 올라 살림을 조심스럽게 꾸렸다.',{wealth:-8,happiness:-3}],
    [22,55,'꾸준히 노력한 일이 좋은 결과를 가져왔다.',{wealth:8,happiness:6}],
    [23,60,'몸이 좋지 않아 한동안 충분히 쉬어야 했다.',{health:-11,happiness:-3}],
    [25,70,'몸을 돌보는 새로운 습관을 시작했다.',{health:9,happiness:3}],
    [26,64,'동료에게 도움을 주고 고맙다는 말을 들었다.',{bonds:8,happiness:6}],
    [28,80,'가까운 사람의 따뜻한 격려가 힘이 되었다.',{bonds:6,happiness:9}],
    [32,90,'새로운 동네를 거닐며 작은 즐거움을 찾았다.',{happiness:6,health:3}],
    [34,72,'오랫동안 고민한 문제에 나름의 답을 찾았다.',{knowledge:7,happiness:5}],
    [37,83,'예상하지 못한 지출로 생활이 빠듯해졌다.',{wealth:-9,happiness:-4}],
    [40,98,'좋아하던 일을 다시 시작할 여유가 생겼다.',{happiness:9,knowledge:3}],
    [45,105,'계절이 바뀌는 풍경이 새삼 소중하게 느껴졌다.',{happiness:6}],
    [55,105,'먼저 살아본 경험으로 누군가에게 조언했다.',{bonds:7,knowledge:4}],
    [65,105,'오랜 벗과 지난날을 이야기했다.',{bonds:7,happiness:7}],
    [58,104,'한동안 잊고 지낸 노래를 다시 들으며 웃음 지었다.',{happiness:6}],
    [60,102,'새로운 취미에 서툴렀지만 조금씩 익숙해졌다.',{knowledge:5,happiness:6}],
    [61,101,'주변 사람들과 함께 작은 모임을 만들었다.',{bonds:7,happiness:4}],
    [62,103,'계절마다 걷는 길에서 친숙한 풍경을 발견했다.',{health:4,happiness:5}],
    [63,105,'배운 것을 젊은 이웃에게 나누었다.',{bonds:6,knowledge:5}],
    [66,104,'오래된 사진첩을 보며 잊었던 일을 떠올렸다.',{happiness:5,bonds:4}],
    [67,104,'친구의 응원으로 바깥활동을 다시 시작했다.',{health:5,bonds:6}],
    [69,105,'조용한 오후에 한 권의 책을 끝까지 읽었다.',{knowledge:5,happiness:4}],
    [71,104,'무리했던 날 이후 건강을 더 소중히 여기게 되었다.',{health:-5,knowledge:3}],
    [73,105,'오래된 친구를 다시 만나 밤늦도록 이야기했다.',{bonds:8,happiness:6}],
    [75,105,'도움이 필요할 때 주변의 따뜻한 손길을 받았다.',{health:3,bonds:6}],
    [77,105,'다른 세대의 생각을 배우며 즐거운 시간을 보냈다.',{knowledge:6,bonds:5}],
    [80,105,'평범한 하루가 참 고맙다는 생각이 들었다.',{happiness:7}]
  ];
  const stages = age => age < 7 ? '유년기' : age < 19 ? '성장기' : age < 31 ? '청년기' : age < 61 ? '성인기' : '노년기';
  class Life {
    constructor(seed) {
      this.seed = Number.isFinite(seed) ? (seed >>> 0) : (((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0));
      this.rng = this.seed || 0x9e3779b9;
      this.age = 0;
      this.year = 2026;
      let pick = this.rand() * COUNTRIES.reduce((a,c) => a+c[2],0);
      this.country = COUNTRIES[COUNTRIES.length-1];
      for (const c of COUNTRIES) { pick -= c[2]; if (pick < 0) { this.country = c; break; } }
      this.gender = this.rand() < 0.49 ? '여자' : '남자';
      this.familyLevel = this.rand() < 0.24 ? '빠듯한 형편' : this.rand() < 0.32 ? '여유 있는 형편' : '평범한 형편';
      const wealthBase = this.familyLevel === '여유 있는 형편' ? 65 : this.familyLevel === '빠듯한 형편' ? 28 : 46;
      this.stats = {health:clamp(55+this.country[4]*22+this.rand()*16-10),
        happiness:clamp(48+this.rand()*28),knowledge:clamp(30+this.rand()*22),
        bonds:clamp(40+this.rand()*30),wealth:clamp(wealthBase+(this.country[3]-.55)*25)};
      this.career = '아직 정해지지 않음';
      this.log = [];
      this.seen = [];
      this.pending = null;
      this.alive = true;
      this.deathReason = '';
      this.logEvent('세상에 태어났다. 모든 이야기가 여기서 시작된다.', 'birth');
    }
    rand() { this.rng = (Math.imul(1664525,this.rng)+1013904223)>>>0; return this.rng/4294967296; }
    change(delta) { for(const [key,value] of Object.entries(delta)) if(key in this.stats) this.stats[key]=clamp(this.stats[key]+value); }
    logEvent(text,kind='life') {
      this.log.push({age:this.age,year:this.year,text,kind});
      if(this.log.length>100) this.log.shift();
    }
    tick() {
      if(!this.alive || this.pending) return false;
      this.age++; this.year++;
      if(this.age < 16) this.change({knowledge:1,health:this.rand()<.25?-1:0});
      if(this.age>=50) this.change({health:this.age>=78?-2:-1});
      if(this.age>=70 && this.rand()<.30) this.change({bonds:-1});
      if(this.age>=19 && this.age<=67 && this.rand()<.24) this.change({wealth:this.stats.knowledge>=60?2:1});
      if(this.age>=30 && this.rand()<.2) this.change({happiness:-1});
      if(this.age===7) this.logEvent('학교와 친구들 사이에서 더 넓은 세상을 알아가기 시작했다.','milestone');
      if(this.age===19) this.logEvent('어른이 되어 스스로의 방향을 생각하기 시작했다.','milestone');
      if(this.age===65) this.logEvent('오랜 시간이 지나고 삶의 속도가 조금씩 바뀌었다.','milestone');
      if(this.age >= 2 && this.rand() < .36) {
        const choices = EVENTS.map((e,i)=>({e,i})).filter(({e,i})=>this.age>=e[0] && this.age<=e[1] && !this.seen.includes(i));
        if(choices.length) {
          const {e,i}=choices[Math.floor(this.rand()*choices.length)];
          this.seen.push(i); this.change(e[3]); this.logEvent(e[2], 'event');
        }
      }
      // 사망 가능성은 게임을 위한 추상적인 난수 모델이다.
      const ageRisk = this.age < 4 ? .001 : this.age < 58 ? .0004 : this.age < 70 ? .003
        : this.age < 80 ? .017 : this.age < 90 ? .048 : this.age < 100 ? .13 : .32;
      const healthRisk = this.stats.health<20?.035:this.stats.health<36?.009:0;
      if(this.age>=108 || this.stats.health===0 || this.rand()<ageRisk+healthRisk) {
        this.finish(this.age>=108?'긴 세월 끝에 삶을 마쳤다.':'한 사람의 삶이 조용히 끝났다.');
        return true;
      }
      const moment = CHOICES.find(c=>c.age===this.age);
      if(moment) this.pending = moment.age;
      return true;
    }
    choose(optionIndex) {
      const choice = CHOICES.find(c=>c.age===this.pending);
      if(!this.alive || !choice || !Number.isInteger(optionIndex) || !choice.options[optionIndex]) return false;
      const option=choice.options[optionIndex];
      this.change(option.effects);
      if(option.career) this.career=option.career;
      if(this.age===29 && this.career==='학생') this.career='전문 분야 종사자';
      this.logEvent(option.text,'decision');
      const chance = this.rand();
      if(option.effects.wealth < -4 && chance < Math.max(.12,.38-this.country[3]*.24)) {
        this.change({wealth:-5,happiness:-4});
        this.logEvent('바라는 일에 다가가려면 생각보다 많은 시간이 필요했다.','event');
      } else if(chance < .24) {
        this.change({happiness:5,bonds:3});
        this.logEvent('예상하지 못한 응원을 만나 힘을 얻었다.','event');
      }
      this.pending=null;
      return true;
    }
    getChoice() { return CHOICES.find(c=>c.age===this.pending)||null; }
    finish(reason) {
      if(!this.alive) return;
      this.alive=false; this.pending=null; this.deathReason=reason;
      this.logEvent(reason,'death');
    }
    summary() {
      const s=this.stats;
      const top=Object.entries({건강:s.health,행복:s.happiness,배움:s.knowledge,인연:s.bonds}).sort((a,b)=>b[1]-a[1])[0][0];
      return {age:this.age,country:this.country[0],gender:this.gender,year:this.year,
        highlights:this.log.filter(e=>e.kind==='decision'||e.kind==='milestone'),
        story:'태어나서 '+this.age+'년을 살아온 당신의 삶에는 '+top+'의 순간들이 남았다. 정해진 정답은 없다. 그 모든 순간이 하나의 인생이다.'};
    }
    snapshot() {
      return {version:1,seed:this.seed,rng:this.rng,age:this.age,year:this.year,country:this.country[0],
        gender:this.gender,familyLevel:this.familyLevel,stats:{...this.stats},career:this.career,
        log:this.log.map(e=>({...e})),seen:[...this.seen],pending:this.pending,
        alive:this.alive,deathReason:this.deathReason};
    }
    static restore(data) {
      if(!data||data.version!==1 || !Number.isInteger(data.age) || data.age<0 || data.age>108) return null;
      const life=new Life(data.seed);
      const country=COUNTRIES.find(c=>c[0]===data.country);
      if(!country || !data.stats || !Array.isArray(data.log) || !Array.isArray(data.seen)) return null;
      life.rng = Number(data.rng)>>>0;
      life.age=data.age; life.year=2026+data.age; life.country=country;
      life.gender=data.gender==='여자'?'여자':'남자';
      life.familyLevel=String(data.familyLevel||'평범한 형편');
      life.stats=Object.fromEntries(['health','happiness','knowledge','bonds','wealth'].map(k=>[k,clamp(Number(data.stats[k])||0)]));
      life.career=String(data.career||'아직 정해지지 않음');
      life.log=data.log.slice(-100).filter(e=>Number.isInteger(e.age)&&typeof e.text==='string')
        .map(e=>({age:e.age,year:2026+e.age,text:e.text.slice(0,160),kind:String(e.kind||'life')}));
      life.seen=data.seen.filter(i=>Number.isInteger(i)&&i>=0&&i<EVENTS.length);
      life.pending=CHOICES.some(c=>c.age===data.pending)&&data.alive?data.pending:null;
      life.alive=data.alive===true; life.deathReason=String(data.deathReason||'');
      return life;
    }
  }
  return Object.freeze({Life,COUNTRIES,CHOICES,EVENTS,stages});
});
