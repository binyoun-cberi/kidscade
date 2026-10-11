/* Ota literacy contamination: reviewed fixed-answer Korean exercises.
 * Pure deterministic rules; no user-generated corrections or network calls. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaLiteracy=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const BANK=Object.freeze([{"id":"record-001","kind":"받침","wrong":"갓어요","correct":"갔어요","choices":["갔어요","갓어요","갇어요","같어요"],"context":"어제 학교에 ___","explain":"'가다'의 과거형은 '갔어요'예요."},{"id":"record-002","kind":"받침","wrong":"먹엇다","correct":"먹었다","choices":["먹었다","먹엇다","먹엏다","먹었따"],"context":"어제 사과를 ___","explain":"'먹다'의 과거형은 '먹었다'예요."},{"id":"record-003","kind":"받침","wrong":"잇어요","correct":"있어요","choices":["있어요","잇어요","이써요","있서요"],"context":"책상 위에 연필이 ___","explain":"'있다'의 어간에는 ㅆ받침이 있어요."},{"id":"record-004","kind":"받침","wrong":"업어요","correct":"없어요","choices":["없어요","업어요","업써요","없서요"],"context":"오늘 준비물이 ___","explain":"'없다'는 ㅄ받침을 사용해요."},{"id":"record-005","kind":"받침","wrong":"안잣다","correct":"앉았다","choices":["앉았다","안잣다","안았다","앉앗다"],"context":"의자에 바르게 ___","explain":"'앉다'는 ㄵ받침을 사용해요."},{"id":"record-006","kind":"받침","wrong":"읽엇다","correct":"읽었다","choices":["읽었다","읽엇다","일겄다","읽었따"],"context":"재미있는 책을 ___","explain":"'읽다'는 ㄺ받침을 쓰고, 과거형은 '읽었다'예요."},{"id":"record-007","kind":"받침","wrong":"달렷다","correct":"달렸다","choices":["달렸다","달렷다","달렸다아","달려따"],"context":"운동장을 힘차게 ___","explain":"'달리다'의 과거형은 '달렸다'예요."},{"id":"record-008","kind":"받침","wrong":"꽃이 피엇다","correct":"꽃이 피었다","choices":["꽃이 피었다","꽃이 피엇다","꼳이 피었다","꽃이 피엤다"],"context":"봄이 오자 ___","explain":"'피다'의 과거형은 '피었다'예요."},{"id":"record-009","kind":"받침","wrong":"밥을 머것다","correct":"밥을 먹었다","choices":["밥을 먹었다","밥을 머것다","밥을 먹엇다","밥을 머겄다"],"context":"저녁에 ___","explain":"'먹었다'의 받침과 어미를 살펴보세요."},{"id":"record-010","kind":"받침","wrong":"문을 열엇다","correct":"문을 열었다","choices":["문을 열었다","문을 열엇다","문을 열었따","문을 여렀다"],"context":"집에 들어가며 ___","explain":"'열다'의 과거형은 '열었다'예요."},{"id":"record-011","kind":"받침","wrong":"손을 씨섯다","correct":"손을 씻었다","choices":["손을 씻었다","손을 씨섯다","손을 씻엇다","손을 씯었다"],"context":"밥 먹기 전에 ___","explain":"'씻다'는 ㅆ받침을 쓰고 '씻었다'가 돼요."},{"id":"record-012","kind":"받침","wrong":"눈이 내렷다","correct":"눈이 내렸다","choices":["눈이 내렸다","눈이 내렷다","눈이 내렸따","눈이 내려다"],"context":"어젯밤 ___","explain":"'내리다'의 과거형은 '내렸다'예요."},{"id":"record-013","kind":"맞춤법","wrong":"됬어요","correct":"됐어요","choices":["됐어요","됬어요","됫어요","됬서요"],"context":"이제 준비가 ___","explain":"'되었어요'를 줄이면 '됐어요'예요."},{"id":"record-014","kind":"맞춤법","wrong":"안되요","correct":"안 돼요","choices":["안 돼요","안되요","않되요","안 대요"],"context":"여기서 뛰면 ___","explain":"'되어요'를 줄인 말은 '돼요'이고 '안'은 띄어 써요."},{"id":"record-015","kind":"맞춤법","wrong":"어떻해","correct":"어떡해","choices":["어떡해","어떻해","어떻개","어떡헤"],"context":"숙제를 깜빡했어! ___","explain":"'어떻게 해'를 줄이면 '어떡해'예요."},{"id":"record-016","kind":"맞춤법","wrong":"웬지 피곤하다","correct":"왠지 피곤하다","choices":["왠지 피곤하다","웬지 피곤하다","왠지 피곤해다","웬지 피곤해다"],"context":"어제 많이 자도 ___","explain":"'왜인지'를 줄인 말은 '왠지'예요."},{"id":"record-017","kind":"맞춤법","wrong":"오랫만에","correct":"오랜만에","choices":["오랜만에","오랫만에","오랜만애","오렛만에"],"context":"친구를 ___ 만났다","explain":"'오랜만'이 올바른 표기예요."},{"id":"record-018","kind":"맞춤법","wrong":"몇일","correct":"며칠","choices":["며칠","몇일","몇칠","몃일"],"context":"오늘은 몇 월 ___이에요?","explain":"날짜를 뜻하는 말은 '며칠'이에요."},{"id":"record-019","kind":"맞춤법","wrong":"금새 끝났다","correct":"금세 끝났다","choices":["금세 끝났다","금새 끝났다","금새 끗났다","금세 끗났다"],"context":"숙제를 ___","explain":"'금세'는 '금시에'가 줄어든 말이에요."},{"id":"record-020","kind":"맞춤법","wrong":"깨끗히","correct":"깨끗이","choices":["깨끗이","깨끗히","깨끗이이","깨끗하게이"],"context":"손을 ___ 씻었다","explain":"'깨끗하다'의 부사형은 '깨끗이'예요."},{"id":"record-021","kind":"맞춤법","wrong":"설겆이","correct":"설거지","choices":["설거지","설겆이","설거찌","설겇이"],"context":"식사 뒤에는 ___를 한다","explain":"표준어는 '설거지'예요."},{"id":"record-022","kind":"맞춤법","wrong":"할께요","correct":"할게요","choices":["할게요","할께요","할깨요","할께여"],"context":"제가 정리 ___","explain":"약속이나 의지를 말할 때 '-ㄹ게요'로 적어요."},{"id":"record-023","kind":"맞춤법","wrong":"저희가 할께","correct":"저희가 할게","choices":["저희가 할게","저희가 할께","저희가 할깨","저희가 할겟"],"context":"이번 일은 ___","explain":"의지를 나타내는 어미는 '-ㄹ게'예요."},{"id":"record-024","kind":"띄어쓰기","wrong":"할수 있다","correct":"할 수 있다","choices":["할 수 있다","할수 있다","할수있다","할 수있다"],"context":"나는 혼자서 ___","explain":"의존 명사 '수'는 앞뒤를 띄어 써요."},{"id":"record-025","kind":"띄어쓰기","wrong":"갈수 있다","correct":"갈 수 있다","choices":["갈 수 있다","갈수 있다","갈수있다","갈 수있다"],"context":"지금 출발하면 ___","explain":"'갈 수 있다'에서 '수'는 띄어 써요."},{"id":"record-026","kind":"띄어쓰기","wrong":"먹을수 있다","correct":"먹을 수 있다","choices":["먹을 수 있다","먹을수 있다","먹을수있다","먹을 수있다"],"context":"매운 음식을 ___","explain":"의존 명사 '수'는 띄어 써요."},{"id":"record-027","kind":"띄어쓰기","wrong":"볼수 없다","correct":"볼 수 없다","choices":["볼 수 없다","볼수 없다","볼수없다","볼 수없다"],"context":"어두워서 앞을 ___","explain":"'볼 수 없다'는 세 부분을 나누어 써요."},{"id":"record-028","kind":"띄어쓰기","wrong":"할것이다","correct":"할 것이다","choices":["할 것이다","할것이다","할것 이다","할 것 이다"],"context":"내일은 숙제를 ___","explain":"의존 명사 '것'은 앞말과 띄어 써요."},{"id":"record-029","kind":"띄어쓰기","wrong":"아는것","correct":"아는 것","choices":["아는 것","아는것","아는것 ","아는 껏"],"context":"내가 ___을 설명해 줄게","explain":"의존 명사 '것'은 띄어 써요."},{"id":"record-030","kind":"띄어쓰기","wrong":"나도할래","correct":"나도 할래","choices":["나도 할래","나도할래","나 도 할래","나도할 래"],"context":"친구가 한다면 ___","explain":"'나도' 다음에 서술어를 띄어 써요."},{"id":"record-031","kind":"띄어쓰기","wrong":"책을읽었다","correct":"책을 읽었다","choices":["책을 읽었다","책을읽었다","책 을읽었다","책을읽 었다"],"context":"어제 도서관에서 ___","explain":"목적격 조사 '을' 뒤에 서술어를 띄어 써요."},{"id":"record-032","kind":"띄어쓰기","wrong":"학교에갔다","correct":"학교에 갔다","choices":["학교에 갔다","학교에갔다","학교 에갔다","학교에갓다"],"context":"아침에 ___","explain":"조사가 붙은 말 다음에 서술어를 띄어 써요."},{"id":"record-033","kind":"띄어쓰기","wrong":"집에가자","correct":"집에 가자","choices":["집에 가자","집에가자","집 에가자","집에갖자"],"context":"수업이 끝났으니 ___","explain":"'집에' 다음에 동사 '가자'를 띄어 써요."},{"id":"record-034","kind":"띄어쓰기","wrong":"오늘은맑다","correct":"오늘은 맑다","choices":["오늘은 맑다","오늘은맑다","오늘 은맑다","오늘은 말다"],"context":"하늘을 보니 ___","explain":"'오늘은' 다음에 서술어를 띄어 써요."},{"id":"record-035","kind":"띄어쓰기","wrong":"다시한번","correct":"다시 한번","choices":["다시 한번","다시한번","다 시 한번","다시 한 번만"],"context":"그 문제를 ___ 풀어 봐","explain":"'다시 한번'은 띄어 써요."},{"id":"record-036","kind":"문맥","wrong":"책을 익어요","correct":"책을 읽어요","choices":["책을 읽어요","책을 익어요","책을 일어요","책을 읽어여"],"context":"도서관에서 ___","explain":"책을 보는 동작은 '읽어요'예요."},{"id":"record-037","kind":"문맥","wrong":"연필을 깍아요","correct":"연필을 깎아요","choices":["연필을 깎아요","연필을 깍아요","연필을 깍꺼요","연필을 깎어여"],"context":"뭉툭한 ___","explain":"'깎다'는 ㄲ받침이 있어요."},{"id":"record-038","kind":"문맥","wrong":"휴지를 버리요","correct":"휴지를 버려요","choices":["휴지를 버려요","휴지를 버리요","휴지를 버리여요","휴지를 버료요"],"context":"쓰레기통에 ___","explain":"'버리다'의 활용형은 '버려요'예요."},{"id":"record-039","kind":"문맥","wrong":"손을 싰어요","correct":"손을 씻었어요","choices":["손을 씻었어요","손을 싰어요","손을 시섰어요","손을 씻엇어요"],"context":"비누로 ___","explain":"'씻다'의 과거형은 '씻었어요'예요."},{"id":"record-040","kind":"문맥","wrong":"창문을 다다","correct":"창문을 닫아","choices":["창문을 닫아","창문을 다다","창문을 닷아","창문을 닻아"],"context":"추우니까 ___","explain":"'닫다'의 활용형은 '닫아'예요."},{"id":"record-041","kind":"문맥","wrong":"사과를 깍다","correct":"사과를 깎다","choices":["사과를 깎다","사과를 깍다","사과를 깍따","사과를 깎따"],"context":"칼로 ___","explain":"껍질을 벗길 때는 '깎다'라고 적어요."},{"id":"record-042","kind":"문맥","wrong":"공을 던저요","correct":"공을 던져요","choices":["공을 던져요","공을 던저요","공을 던지요","공을 던져여"],"context":"멀리 ___","explain":"'던지다'의 활용형은 '던져요'예요."},{"id":"record-043","kind":"문맥","wrong":"바닥에 안자요","correct":"바닥에 앉아요","choices":["바닥에 앉아요","바닥에 안자요","바닥에 안아요","바닥에 앉아여"],"context":"돗자리 위에 ___","explain":"'앉다'는 ㄵ받침을 쓰는 동사예요."},{"id":"record-044","kind":"문맥","wrong":"별을 보앗다","correct":"별을 보았다","choices":["별을 보았다","별을 보앗다","별을 봐았다","별을 보안다"],"context":"밤하늘의 ___","explain":"'보다'의 과거형은 '보았다'예요."},{"id":"record-045","kind":"문맥","wrong":"감자를 삶앗다","correct":"감자를 삶았다","choices":["감자를 삶았다","감자를 삶앗다","감자를 살맜다","감자를 삶아따"],"context":"저녁에 ___","explain":"'삶다'의 과거형은 '삶았다'예요."},{"id":"record-046","kind":"문맥","wrong":"꽃을 심엇다","correct":"꽃을 심었다","choices":["꽃을 심었다","꽃을 심엇다","꽃을 시멌다","꽃을 심었따"],"context":"화단에 ___","explain":"'심다'의 과거형은 '심었다'예요."},{"id":"record-047","kind":"맞춤법","wrong":"곰곰히","correct":"곰곰이","choices":["곰곰이","곰곰히","곰곰이이","곰곰희"],"context":"문제를 ___ 생각하자","explain":"'곰곰이'가 올바른 표기예요."},{"id":"record-048","kind":"맞춤법","wrong":"일부로","correct":"일부러","choices":["일부러","일부로","일부래","일부로러"],"context":"___ 그런 건 아니야","explain":"일부러 하는 행동에는 '일부러'를 사용해요."},{"id":"record-049","kind":"맞춤법","wrong":"반듯이 해야 해","correct":"반드시 해야 해","choices":["반드시 해야 해","반듯이 해야 해","반드이 해야 해","반듣이 해야 해"],"context":"약속은 ___","explain":"꼭 해야 한다는 뜻은 '반드시'예요."},{"id":"record-050","kind":"맞춤법","wrong":"바램","correct":"바람","choices":["바람","바램","바렘","발암"],"context":"소원이 이루어지길 ___","explain":"소망을 뜻하는 명사는 '바람'이에요."},{"id":"record-051","kind":"맞춤법","wrong":"어의없다","correct":"어이없다","choices":["어이없다","어의없다","어이업다","어의업다"],"context":"너무 황당해서 ___","explain":"뜻밖이라 기가 막힐 때 '어이없다'라고 해요."},{"id":"record-052","kind":"맞춤법","wrong":"희안하다","correct":"희한하다","choices":["희한하다","희안하다","히안하다","희헌하다"],"context":"참 ___ 일이야","explain":"드물거나 신기하다는 뜻은 '희한하다'예요."},{"id":"record-053","kind":"맞춤법","wrong":"가르키다","correct":"가리키다","choices":["가리키다","가르키다","가리키여다","가르치키다"],"context":"손가락으로 방향을 ___","explain":"방향을 손으로 짚어 보이는 건 '가리키다'예요."},{"id":"record-054","kind":"맞춤법","wrong":"낳아요","correct":"나아요","choices":["나아요","낳아요","낫아요","나어여"],"context":"감기가 이제 ___","explain":"병이 좋아질 때는 '낫다'가 활용된 '나아요'예요."},{"id":"record-055","kind":"맞춤법","wrong":"뵈요","correct":"봬요","choices":["봬요","뵈요","봬여","뵈여"],"context":"내일 선생님을 ___","explain":"'뵈어요'를 줄이면 '봬요'예요."},{"id":"record-056","kind":"맞춤법","wrong":"에요","correct":"예요","choices":["예요","에요","이예요","에예요"],"context":"제 이름은 민수___","explain":"모음으로 끝나는 이름 뒤에는 '예요'가 와요."},{"id":"record-057","kind":"받침","wrong":"있엇다","correct":"있었다","choices":["있었다","있엇다","잇었다","있었따"],"context":"책상 아래에 공이 ___","explain":"'있다'의 과거형은 '있었다'예요."},{"id":"record-058","kind":"받침","wrong":"놀앗다","correct":"놀았다","choices":["놀았다","놀앗다","노랐다","놀았따"],"context":"운동장에서 신나게 ___","explain":"'놀다'의 과거형은 '놀았다'예요."}]);
  const CORE_POINTS=Object.freeze([
    {x:0,z:-40.8},{x:-6.9,z:-41.5},{x:-8.8,z:-51.2},
    {x:9.2,z:-53.1},{x:1.7,z:-54.1}
  ]);
  const SPAWN_POINTS=Object.freeze([
    {x:-1.8,z:-43.2},{x:1.75,z:-49.7},{x:-6.1,z:-45.3},
    {x:-8.7,z:-53.8},{x:5.1,z:-50.5},{x:11.8,z:-49.3},
    {x:-1.5,z:-55.5},{x:0.0,z:-46.4}
  ]);
  const CORE_BANK_IDS=Object.freeze([0,3,12,24,36]);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function create(){
    const state={time:0,contamination:0,nextSpawn:15,serial:5,cursor:0,
      coreDone:0,corrected:0,mistakes:0,awakened:false,items:[]};
    for(let i=0;i<CORE_POINTS.length;i++)
      state.items.push({uid:'core-'+i,bankIndex:CORE_BANK_IDS[i],kind:'core',
        x:CORE_POINTS[i].x,z:CORE_POINTS[i].z,age:0});
    return state;
  }
  function question(item){return BANK[item.bankIndex];}
  function level(s){return s.contamination>=85?5:s.contamination>=65?4:
    s.contamination>=40?3:s.contamination>=20?2:s.contamination>=8?1:0;}
  function nearest(s,p,maxDist=2.35){
    let result=null,best=maxDist;
    for(const item of s.items){
      const d=Math.hypot(item.x-p.x,item.z-p.z);
      if(d<best){best=d;result=item;}
    }
    return result;
  }
  function spawn(s){
    if(s.items.filter(i=>i.kind==='transient').length>=3)return null;
    let idx;
    do{idx=(s.cursor++ * 7 + 2)%BANK.length;}
    while(CORE_BANK_IDS.includes(idx)&&s.cursor<BANK.length*2);
    const p=SPAWN_POINTS[s.serial%SPAWN_POINTS.length];
    const item={uid:'error-'+s.serial++,kind:'transient',bankIndex:idx,x:p.x,z:p.z,age:0};
    s.items.push(item);
    s.contamination=clamp(s.contamination+9,0,100);
    return item;
  }
  function step(s,dt){
    dt=clamp(Number(dt)||0,0,.1);
    s.time+=dt;
    for(const item of s.items)item.age+=dt;
    let spawned=false,awakened=false,calmed=false;
    if(s.time>=s.nextSpawn){
      if(spawn(s))spawned=true;
      s.nextSpawn=s.time+18;
    }
    const neglected=s.items.filter(i=>i.kind==='transient').length;
    s.contamination=clamp(s.contamination+
      (neglected ? (.08+.17*neglected)*dt : -.13*dt),0,100);
    if(!s.awakened&&s.contamination>=65){s.awakened=true;awakened=true;}
    if(s.awakened&&s.contamination<=34){s.awakened=false;calmed=true;}
    return {spawned,awakened,calmed,level:level(s)};
  }
  function correct(s,uid,answer){
    const at=s.items.findIndex(i=>i.uid===uid);
    if(at<0)return {ok:false,reason:'missing'};
    const item=s.items[at],q=question(item);
    if(answer!==q.correct){
      s.mistakes++;
      // Wrong choices offer a retry, not instant punishment or chase.
      s.contamination=clamp(s.contamination+Math.min(2,s.mistakes%3===0?2:1),0,100);
      return {ok:false,reason:'wrong',hint:'문장을 다시 읽고 글자와 받침을 살펴보세요.',item};
    }
    s.items.splice(at,1);
    s.corrected++;
    if(item.kind==='core')s.coreDone++;
    s.contamination=clamp(s.contamination-(item.kind==='core'?14:23),0,100);
    if(s.awakened&&s.contamination<=34)s.awakened=false;
    return {ok:true,item,question:q,coreDone:s.coreDone,completed:s.coreDone>=5};
  }
  function checkpoint(s){
    return {v:1,coreDone:s.coreDone,
      remainingCore:s.items.filter(i=>i.kind==='core').map(i=>i.uid),
      corrected:s.corrected,mistakes:s.mistakes};
  }
  function restore(s,data){
    const fresh=create();
    Object.assign(s,fresh);
    if(!data||data.v!==1||!Array.isArray(data.remainingCore))return false;
    const remaining=new Set(data.remainingCore.filter(x=>/^core-[0-4]$/.test(x)));
    s.items=s.items.filter(i=>remaining.has(i.uid));
    s.coreDone=5-s.items.length;
    s.corrected=clamp(Number(data.corrected)||s.coreDone,s.coreDone,9999);
    s.mistakes=clamp(Number(data.mistakes)||0,0,9999);
    return true;
  }
  return Object.freeze({BANK,CORE_POINTS,SPAWN_POINTS,create,question,level,
    nearest,spawn,step,correct,checkpoint,restore});
});
