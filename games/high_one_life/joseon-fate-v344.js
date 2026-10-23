/* One Life 3.44 — optional, consequence-driven Joseon life arcs.
 * Historical institutions are grounded; probability and characters are fictional.
 * Existing events, exile, hardship, and ordinary birth probabilities remain intact.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,
   root?.OneLifeJoseon5,root?.OneLifeJoseon325);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeFate344=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V5,Paths){
 'use strict';
 const names=Object.freeze(['scholar','magistrate','slave','harvest','fortune','prodigal']);
 const steps=Object.freeze(['scholarAfter','magistrateAfter','slaveAfter','fortuneAfter','prodigalAfter']);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function dice(seed,salt){let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
  x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
  return ((x^(x>>>16))>>>0)/4294967296;}
 const age=l=>l.age;
 function eligible(l){
  if(!l?.alive||!J?.isJoseon(l)||!J.inOldEra(l)||l.year<1500||l.year>=1894||
   l.joseon14?.captivity?.status==='held'||l.travel22?.residence?.abroad)return [];
  const j=J.ensure(l),social=V5.ensure(l),prev=Paths?.ensure(l);
  if(prev?.law?.kind!=='free')return [];
  const bound=['사노비','공노비'].includes(social.origin)&&!social.freed;
  const open= !bound&&social.origin!=='왕실 종친'&&!social.monastic;
  const options=[];
  if(age(l)>=17&&age(l)<=34&&l.gender==='남자'&&l.stats.knowledge>=38&&open&&
    !j.office&&['양반','상민','중인'].includes(j.birthStatus))options.push('scholar');
  if(age(l)>=27&&age(l)<=65&&j.office&&open&&social.rank>=1)options.push('magistrate');
  if(age(l)>=16&&age(l)<=60&&bound)options.push('slave');
  if(age(l)>=23&&age(l)<=65&&open&&(/농가|농민/.test(social.origin)||/농사|소작/.test(j.occupation)))options.push('harvest');
  if(age(l)>=30&&age(l)<=68&&open&&j.capital>=120&&
    ['상민','중인'].includes(j.birthStatus))options.push('fortune');
  if(age(l)>=19&&age(l)<=48&&!bound&&j.birthStatus==='양반'&&j.capital>=45)options.push('prodigal');
  return options;
 }
 function ensure(l){
  if(!J?.isJoseon(l))return null;
  if(!l.joseon344)l.joseon344={version:1,started:[],seen:[],active:null,follow:null,
   lastYear:l.year,choices:[],scenes:[],reputation:0,integrity:0,shame:0,
   examination:'not_taken',magistrate:'none',memorial:'none',fugitive:'none',lineage:'none'};
  return l.joseon344;
 }
 function remember(l,s,text){
  l.logEvent(text,'joseon344-life');
  s.scenes.push({year:l.year,text});s.scenes=s.scenes.slice(-55);
 }
 function costs(l,amount){const j=J.ensure(l);j.capital=clamp(j.capital+amount,-120,600);
  if(l.money)l.money.netWorth=j.capital*100;}
 function career(l,name){J.ensure(l).occupation=name;l.career=name;V5.ensure(l).role=name;
  if(l.money)l.money.employment=name;}
 function plan(l,key){
  const s=ensure(l);if(!s)return null;
  const ordinary={
   scholar:{title:'글공부를 계속할까?',description:'글은 제법 익혔지만 과거 시험 앞에 서자 마음이 떨린다.',
    options:[['소과 시험을 치러 본다','그동안 익힌 글을 시험해 본다. 급제하면 진사라 불리겠지만 곧바로 벼슬을 받는 것은 아니다.'],
     ['마을에서 글을 가르친다','과거에 응시하지 않고 아이들과 이웃에게 글을 가르친다.'],
     ['농사와 글공부를 함께한다','당장의 생계를 지키면서 틈틈이 공부한다.']]},
   magistrate:{title:'고을을 맡아 어떤 수령으로 남을까?',description:'관직을 얻어도 사람들의 삶은 수령의 결정과 관아 장부에 따라 달라진다.',
    options:[['억울한 세금과 어려운 집부터 살핀다','구휼과 장부 확인에는 돈과 시간이 든다.'],
     ['거둔 곡식 일부를 사사로이 쓴다','살림은 잠시 나아질 수 있으나 백성에게 피해가 생기고 감사의 대상이 된다.'],
     ['관아의 장부와 재판을 꼼꼼히 살핀다','당장 인기를 얻지는 못해도 잘못을 바로잡을 근거를 남긴다.']]},
   slave:{title:'예속된 집안에서 다른 삶을 찾다',description:'노비도 가족과 생업이 있었지만 거처와 일의 자유에는 큰 제약이 있었다.',
    options:[['속량 문서를 얻을 길을 찾아본다','돈과 주인의 동의가 필요하며 성공을 보장할 수 없다.'],
     ['밤중에 다른 고을로 도망친다','사람을 피해 살아야 하며 추쇄에 붙잡힐 위험이 생긴다.'],
     ['가족을 지키며 기술을 익힌다','힘든 노동 속에서 훗날 도움이 될 솜씨를 쌓는다.']]},
   harvest:{title:'흉년이 들고 살림이 기울다',description:'곡식이 모자라 빚이 늘었다. 고향에 남을지 새로운 곳을 찾을지 결정해야 한다.',
    options:[['이웃과 품앗이하며 농사를 이어 간다','남은 곡식과 일손을 모으지만 풍년은 보장되지 않는다.'],
     ['관아와 지주에게 갚을 때를 늦춰 달라 청한다','부채가 사라지지는 않지만 시간을 벌 수 있다.'],
     ['밤을 틈타 가족과 산골로 떠난다','빚은 남고 땅을 잃는다. 산골에서 새 살림을 꾸려야 한다.']]},
   fortune:{title:'돈을 모으자 집안의 앞날이 달라지다',description:'부유해져도 가문의 기록과 관직이 저절로 바뀌지는 않는다.',
    options:[['나라에 곡식을 내고 포상을 청한다','납속은 시대와 형편에 따라 포상이 달라진다. 양반 신분을 보장하지 않는다.'],
     ['양반 집안의 족보에 이름을 올리려 한다','돈을 들여 족보를 거짓으로 꾸미면 신뢰와 처벌 문제가 뒤따른다.'],
     ['장사와 이웃 돕기를 이어 간다','신분을 꾸미지 않아도 유력한 상인으로 살 수 있다.']]},
   prodigal:{title:'재산을 물려받은 뒤 어떤 삶을 살까?',description:'넉넉한 집안이라도 낭비와 무리한 약속이 겹치면 재산을 잃는다.',
    options:[['잔치를 잇고 돈을 크게 쓴다','사람들은 모이지만 쌓인 빚은 남는다.'],
     ['땅과 곳간을 살피며 살림을 지킨다','큰 명성을 얻지는 못해도 집안 살림을 지킨다.'],
     ['글을 가르치고 이웃의 어려움을 돕는다','살림을 나누어 쓰며 새로운 관계를 만든다.']]}
  };
  const later={
   scholarAfter:{title:s.examination==='passed'?'진사로서 마을에 남는 길':s.examination==='failed'?'시험에 떨어진 뒤의 길':'글공부 뒤의 갈림길',
    description:s.examination==='passed'?'소과에 급제해 진사라 불리게 되었다. 하지만 진사가 곧 수령이나 고위 관료가 되는 것은 아니다.':
      s.examination==='failed'?'소과에서 낙방했다. 다시 응시할지 배운 글로 생업을 꾸릴지 골라야 한다.':'소과에는 응시하지 않았다. 먼저 글을 가르쳤거나 집안일과 공부를 병행해 왔다.',
    options:[['동네에서 글을 가르치며 살아간다','벼슬하지 않고 제자와 이웃을 만나며 지낸다.'],
     [s.examination==='passed'?'대과를 준비한다':s.examination==='failed'?'다음 소과를 준비한다':'처음 소과를 준비한다','합격을 보장할 수 없고 살림의 부담도 생긴다.'],
     ['집안의 농사와 생업을 맡는다','글을 읽는 시간을 줄이고 살림을 꾸린다.']]},
   magistrateAfter:{title:s.magistrate==='abusive'?'수령을 둘러싼 탄원과 조사':'수령이 떠나는 날',
    description:s.magistrate==='abusive'?'세금과 장부를 둘러싼 억울한 사연이 감사에게 전달되었다.':'부임 기간이 끝나자 주민들은 지난 일을 서로 다르게 기억한다.',
    options:[['기록과 증언을 정리해 조사에 응한다','불리한 사실도 숨기지 않고 해명한다.'],
     ['백성의 구휼과 잘못된 징수를 바로잡는다','뒤늦게라도 고칠 수 있는 일을 한다.'],
     ['공적을 과장해 칭송을 바라본다','송덕비를 강요할 수는 없다. 사람들의 평가와 실제 행실이 다를 수 있다.']]},
   slaveAfter:{title:'도망 노비를 찾는 사람들이 오다',description:'다른 고을에 숨어 살지만 법적 신분은 달라지지 않았다. 추노객과 관아의 수색이 이어질 수 있다.',
    options:[['새로 알게 된 이웃에게 도움을 구한다','믿을 사람을 만나도 수색의 위험은 남는다.'],
     ['돈을 모아 정식 속량을 청한다','문서와 주인 측의 확인을 받을 길을 찾는다.'],
     ['다시 먼 고을로 옮겨 간다','고향과의 연락이 끊기고 먹고살 길을 새로 찾아야 한다.']]},
   fortuneAfter:{title:'가문의 문서를 살피는 사람이 오다',description:'족보를 꾸민 뒤 마을 사람들의 인정과 관아의 검토가 엇갈린다.',
    options:[['거짓 기록을 바로잡는다','체면은 손상되지만 더 큰 문제를 막을 수 있다.'],
     ['사람들의 인정을 얻으려 잔치를 연다','잔치가 실제 가문 기록의 근거가 되지는 않는다.'],
     ['문서의 출처를 숨긴다','당장의 체면을 지키려다 조사를 받으면 불리해질 수 있다.']]},
   prodigalAfter:{title:'잔치 뒤 남은 빚',description:'돈을 많이 쓰던 날들은 지나갔다. 빚과 맡아야 할 살림이 남았다.',
    options:[['잔치를 멈추고 빚을 갚는다','품팔이와 재산 정리가 필요하다.'],
     ['가족의 도움을 청해 살림을 다시 세운다','체면을 내려놓고 함께 의논한다.'],
     ['밤중에 고향을 떠나 새 삶을 찾는다','빚은 저절로 없어지지 않고 낯선 곳에서 일을 구해야 한다.']]}
  };
  const d=ordinary[key]||later[key];
  return d?{title:d.title,description:d.description,options:d.options.map(([label,note])=>({label,note}))}:null;
 }
 function queue(l,key){
  const s=ensure(l);
  if(!s||!plan(l,key)||s.active===key||s.seen.includes(key))return false;
  if(l.pending||s.active){
   if(!s.follow&&steps.includes(key)){s.follow={key,due:l.year};return true;}
   return false;
  }
  s.seen.push(key);s.seen=s.seen.slice(-24);
  if(key==='harvest'){
   const store=V2.ensure(l);store.grain=Math.max(0,store.grain-4);
   costs(l,-12);remember(l,s,'비바람과 흉년으로 수확이 줄었다. 곳간의 곡식과 살림돈이 줄어 앞으로를 의논해야 했다.');
  }
  s.active=key;l.pending='joseon344:'+key;return true;
 }
 function advance(l){
  const s=ensure(l);if(!s||!l.alive||!J.inOldEra(l)||s.lastYear>=l.year)return;
  s.lastYear=l.year;
  if(l.year>=1894)return;
  if(s.follow&&l.year>=s.follow.due&&!l.pending&&!s.active){const key=s.follow.key;s.follow=null;queue(l,key);return;}
  if(l.pending||s.active||l.age<16||l.age>68)return;
  const possible=eligible(l).filter(k=>!s.started.includes(k));
  if(!possible.length)return;
  const pick=possible[Math.floor(dice(l.seed,l.year*17+344)*possible.length)];
  if(dice(l.seed,l.year*29+845)<.22){
   s.started.push(pick);queue(l,pick);
  }
 }
 function goForest(l,s){
  const old=Paths?.ensure(l),j=J.ensure(l);
  if(!old||old.law.kind!=='free')return;
  old.stage='forest';old.stageDue=l.year+3;old.originalRegion=j.region;
  old.residence='산골 화전';j.region='강원도';j.land=0;j.relocations++;
  career(l,'산골에서 일거리를 찾는 사람');
 }
 function resolve(l,index){
  const s=ensure(l),key=s?.active,p=key&&plan(l,key);
  if(!s||!l.alive||!p||!Number.isInteger(index)||index<0||index>2)return false;
  const j=J.ensure(l),soc=V5.ensure(l),chosen=p.options[index].label;
  if(key==='scholar'){
   if(index===0){const score=clamp(.13+j.studyYears*.035+j.literacy*.04+(l.stats.knowledge-40)*.004,.09,.72);
    s.examination=dice(l.seed,l.year*83+index+344)<score?'passed':'failed';
    if(s.examination==='passed')remember(l,s,'소과 진사시에 급제했다. 벼슬은 없지만 사람들은 이제 진사라 불렀다.');
    else remember(l,s,'소과를 준비했으나 이번 시험에는 합격하지 못했다.');costs(l,-8);}
   else{ s.examination='not_taken';remember(l,s,index===1?'동네에서 아이와 이웃에게 글을 가르쳤다.':'집안의 생업과 글공부를 함께 이어 갔다.');}
   s.follow={key:'scholarAfter',due:l.year+2};
  }else if(key==='scholarAfter'){
   if(index===0){career(l,s.examination==='passed'?'향촌에서 글을 가르치는 진사':'마을의 글 선생');s.reputation+=5;}
   else if(index===1){costs(l,-10);l.change({knowledge:4});career(l,'계속 과거를 준비하는 사람');}
   else {career(l,'농사와 글공부를 잇는 사람');costs(l,3);}
   remember(l,s,index===0?'제자를 가르치며 마을에 머물렀다.':
      index===1?(s.examination==='passed'?'대과에 도전하려고 책을 다시 펼쳤다.':s.examination==='failed'?'낙방한 소과에 다시 응시하려고 준비했다.':'처음으로 소과에 응시하려고 공부를 시작했다.'):'글공부를 줄이고 집안의 생업을 맡았다.');
  }else if(key==='magistrate'){
   s.magistrate=index===1?'abusive':index===0?'benevolent':'careful';
   if(index===1){costs(l,24);s.integrity-=5;s.shame+=9;remember(l,s,'거둔 곡식을 사사로이 써 백성의 부담을 키웠다.');}
   else if(index===0){costs(l,-12);s.integrity+=7;s.reputation+=5;remember(l,s,'굶는 집에 곡식을 나누고 잘못 매긴 세금을 바로잡도록 지시했다.');}
   else{s.integrity+=5;s.reputation+=2;remember(l,s,'양쪽의 진술과 세금 장부를 대조하라고 아전에게 지시했다. 판결을 기다리는 집이 아직 남아 있었다.');}
   s.follow={key:'magistrateAfter',due:l.year+3};
  }else if(key==='magistrateAfter'){
   const hit=dice(l.seed,l.year*13+index+122);
   if(s.magistrate==='abusive'){
    if(index===1){costs(l,-18);s.shame-=3;remember(l,s,'피해를 입은 집의 징수를 고치려 했지만 이미 잃은 신뢰는 돌아오지 않았다.');}
    if(index===2){costs(l,-6);s.shame+=5;remember(l,s,'자신을 칭송하는 말을 퍼뜨렸지만 조사 기록은 남았다.');}
    if(hit<clamp(.28+s.shame*.018-(index===0?.08:0),.05,.8)){
     if(Paths?.lockup(l,Paths.ensure(l),'exile',2+Math.floor(dice(l.seed,l.year+99)*3),'강원도'))remember(l,s,'감찰 끝에 파직되어 유배지로 떠났다.');
    }else{j.office=false;career(l,'파직 후 고향에 돌아온 전직 수령');remember(l,s,'비리를 둘러싼 논란 끝에 관직에서 물러났다.');}
   }else if(s.magistrate==='benevolent'&&index!==2&&hit<.65){
    s.reputation+=8;s.memorial='raised';
    remember(l,s,'수령이 떠난 뒤 고을 사람들이 뜻을 모아 실제로 송덕비를 세웠다.');
   }else remember(l,s,'임기를 마쳤다. 고을 사람들의 평가는 서로 달랐고 송덕비가 자동으로 세워지지는 않았다.');
  }else if(key==='slave'){
   if(index===0){costs(l,-8);
    if(dice(l.seed,l.year*61+21)<.28){soc.freed=true;soc.legal='양인';s.fugitive='freed';career(l,'속량 뒤 생업을 찾는 사람');remember(l,s,'상전 측에서 속량을 인정해 문서를 받았다. 생업은 다시 구해야 했다.');}
    else remember(l,s,'속량을 청했지만 허락을 받지 못했다.');}
   if(index===1){s.fugitive='escaped';s.follow={key:'slaveAfter',due:l.year+2};costs(l,-4);
    career(l,'신분을 숨기고 떠돌며 일하는 사람');
    remember(l,s,'밤길을 걸어 홀로 다른 고을로 떠났다. 남은 식구를 데려올 수는 없었고 노비 신분도 여전했다.');}
   if(index===2){l.change({knowledge:4,bonds:2});remember(l,s,'식구를 도우며 생업에 필요한 솜씨를 익혔다.');}
  }else if(key==='slaveAfter'){
   const danger=dice(l.seed,l.year*37+index*19+120);
   if(index===1){costs(l,-12);
    if(danger<.48){soc.freed=true;soc.legal='양인';s.fugitive='freed';career(l,'속량 뒤 생업을 찾는 사람');remember(l,s,'상전 측의 확인을 거쳐 속량 문서를 받았다. 관아 장부에 새 신분을 올린 뒤에도 생업은 다시 구해야 했다.');}
    else remember(l,s,'속량을 청했지만 상전 측이 동의하지 않아 문서를 받지 못했다. 여전히 수색을 피해 지냈다.');}
   else if(danger<(index===0?.20:.43)){s.fugitive='recaptured';career(l,soc.trade);costs(l,-5);
    remember(l,s,'추쇄에 붙잡혀 다시 예속된 노동을 하게 되었다.');}
   else {s.fugitive='hiding';career(l,'신분을 숨기고 품을 파는 사람');remember(l,s,'이번에는 수색을 피했지만 법적 신분은 여전히 바뀌지 않았다.');}
  }else if(key==='harvest'){
   if(index===0){costs(l,-9);l.change({bonds:4,health:-2});remember(l,s,'이웃과 일손을 나누며 남은 밭을 돌봤다.');}
   if(index===1){costs(l,-4);l.change({knowledge:2});remember(l,s,'갚을 때를 다시 의논했다. 곡식 빚과 남은 세금은 그대로였다.');}
   if(index===2){costs(l,-15);goForest(l,s);remember(l,s,'식구들과 고향을 떠날지 의논한 뒤 산골로 향했다. 땅은 잃었고 갚을 빚도 남아 있었다.');}
  }else if(key==='fortune'){
   if(index===0){costs(l,-40);s.reputation+=5;remember(l,s,'거둔 곡식 일부를 나라에 바치고 포상을 청했다. 곡식은 이미 낸 뒤였지만 관직이나 신분은 약속받지 못했다.');}
   if(index===1){costs(l,-34);s.lineage='questioned';s.follow={key:'fortuneAfter',due:l.year+2};
    remember(l,s,'돈을 건네고 다른 가문의 족보에 이름을 올렸다. 그러나 그 집안 사람들까지 모두 인정한 것은 아니었다.');}
   if(index===2){costs(l,-10);s.reputation+=6;career(l,'고을에서 알려진 상인');remember(l,s,'장사를 이어 가며 주변의 어려운 집을 도왔다. 신분을 꾸미지는 않았다.');}
  }else if(key==='fortuneAfter'){
   if(index===0){s.lineage='withdrawn';costs(l,-6);remember(l,s,'거짓 기록을 바로잡았다. 돈은 잃었지만 더 큰 법적 문제를 피하려 했다.');}
   else if(index===1){costs(l,-13);s.lineage='disputed';remember(l,s,'잔치를 베풀었지만 출신 문서를 인정받은 것은 아니었다.');}
   else {s.lineage='investigated';costs(l,-17);remember(l,s,'족보의 출처가 조사 대상이 되었다. 돈이 많아도 출생 사실 자체를 바꿀 수는 없었다.');}
  }else if(key==='prodigal'){
   if(index===0){costs(l,-45);s.shame+=4;s.follow={key:'prodigalAfter',due:l.year+2};remember(l,s,'잔치와 호사에 돈을 쓰며 살림이 기울었다.');}
   else if(index===1){costs(l,5);remember(l,s,'땅과 곳간을 지키며 가족의 생활을 이어 갔다.');}
   else{costs(l,-12);s.reputation+=5;remember(l,s,'여윳돈으로 아이들에게 글을 가르치고 이웃을 도왔다.');}
  }else if(key==='prodigalAfter'){
   if(index===0){costs(l,4);career(l,'빚을 갚으며 살림을 꾸리는 사람');}
   else if(index===1){costs(l,8);l.change({bonds:3});career(l,'가족과 살림을 다시 꾸리는 사람');}
   else{costs(l,-8);goForest(l,s);remember(l,s,'빚 독촉을 피해 산골로 떠났다. 살던 집과 일은 뒤로했지만 갚을 빚은 그대로였다.');}
  }
  s.choices.push({year:l.year,key,index,label:chosen});s.choices=s.choices.slice(-64);
  l.logEvent(p.title+' — '+chosen,'joseon344-choice');
  l.log.at(-1).causeId='joseon344:'+l.year+'-'+key;
  s.active=null;l.pending=null;
  if(s.follow&&l.year>=s.follow.due){const next=s.follow.key;s.follow=null;queue(l,next);}
  return true;
 }
 function hydrate(l,data){
  const s=ensure(l),o=data?.joseon344;if(!s||!o||o.version!==1)return s;
  s.started=Array.isArray(o.started)?o.started.filter(x=>names.includes(x)).slice(-6):[];
  s.seen=Array.isArray(o.seen)?o.seen.filter(x=>names.includes(x)||steps.includes(x)).slice(-24):[];
  s.lastYear=Number.isInteger(o.lastYear)?clamp(o.lastYear,l.birthYear,l.year):l.year;
  s.reputation=clamp(Number(o.reputation)||0,-50,100);
  s.integrity=clamp(Number(o.integrity)||0,-50,100);
  s.shame=clamp(Number(o.shame)||0,0,100);
  s.examination=['not_taken','passed','failed'].includes(o.examination)?o.examination:'not_taken';
  s.magistrate=['none','abusive','benevolent','careful'].includes(o.magistrate)?o.magistrate:'none';
  s.memorial=o.memorial==='raised'?'raised':'none';
  s.fugitive=['none','escaped','freed','recaptured','hiding'].includes(o.fugitive)?o.fugitive:'none';
  s.lineage=['none','questioned','withdrawn','disputed','investigated'].includes(o.lineage)?o.lineage:'none';
  s.choices=Array.isArray(o.choices)?o.choices.filter(x=>x&&names.concat(steps).includes(x.key)&&
   Number.isInteger(x.year)&&x.year<=l.year&&x.year>=l.birthYear&&[0,1,2].includes(x.index)).slice(-64)
   .map(x=>({year:x.year,key:x.key,index:x.index,label:String(x.label||'').slice(0,100)})):[];
  s.scenes=Array.isArray(o.scenes)?o.scenes.filter(x=>x&&Number.isInteger(x.year)&&
   x.year<=l.year&&x.year>=l.birthYear&&typeof x.text==='string').slice(-55)
   .map(x=>({year:x.year,text:x.text.slice(0,250)})):[];
  const follow=o.follow;
  s.follow=follow&&steps.includes(follow.key)&&Number.isInteger(follow.due)&&
    follow.due<=l.year+15?{key:follow.key,due:clamp(follow.due,l.birthYear,l.year+15)}:null;
  if(names.concat(steps).includes(o.active)&&data?.pending==='joseon344:'+o.active&&l.alive){
   s.active=o.active;l.pending='joseon344:'+s.active;
  }else s.active=null;
  return s;
 }
 function summary(l){
  const s=ensure(l);if(!s)return null;
  const old=Paths?.ensure(l);
  const lifeStage=old?.law?.kind==='exile'?'유배 중인 인생':
   old?.stage==='outlaw'?'산적 무리에 가담한 삶':
   ['escaped','hiding'].includes(s.fugitive)?'도망 노비로 숨어 지내는 삶':
   s.fugitive==='freed'?'속량을 거쳐 새 길을 찾는 삶':
   s.magistrate==='abusive'?'탐관오리로 남은 수령 시절':
   s.magistrate==='benevolent'&&s.memorial==='raised'?'송덕비가 세워진 수령':
   s.magistrate==='benevolent'?'백성을 돌본 수령':
   s.examination==='passed'?'진사의 향촌 생활':
   s.lineage!=='none'?'족보를 둘러싼 신분의 갈등':'';
  return {title:lifeStage,decisions:s.choices.length,latest:s.scenes.at(-1)?.text||'',
   examination:s.examination,magistrate:s.magistrate,fugitive:s.fugitive,lineage:s.lineage};
 }
 function install(){
  if(!Sim?.Life||!J?.isJoseon||!V5?.ensure||!Paths?.ensure||
   Sim.Life.prototype.__joseon344)return false;
  const L=Sim.Life,oldTick=L.prototype.tick,oldPrompt=L.prototype.getChoice,
   oldChoose=L.prototype.choose,oldReflect=L.prototype.reflect,
   oldSnap=L.prototype.snapshot,oldRestore=L.restore;
  L.prototype.tick=function(){const y=this.year,ok=oldTick.call(this);
   if(ok&&this.alive&&this.year!==y)advance(this);return ok;};
  L.prototype.getChoice=function(){if(typeof this.pending==='string'&&
   this.pending.startsWith('joseon344:'))return plan(this,this.pending.slice(10));
   return oldPrompt.call(this);};
  L.prototype.choose=function(i){if(typeof this.pending==='string'&&
   this.pending.startsWith('joseon344:'))return resolve(this,i);
   const ok=oldChoose.call(this,i);if(ok&&this.alive&&J.isJoseon(this)){
    const s=ensure(this);
    if(s.follow&&s.follow.due<=this.year&&!this.pending&&!s.active){const next=s.follow.key;s.follow=null;queue(this,next);}
   }return ok;};
  L.prototype.reflect=function(t){const ok=oldReflect.call(this,t);
   if(ok&&this.alive&&J.isJoseon(this)){const s=ensure(this);
    if(s.follow&&s.follow.due<=this.year&&!this.pending&&!s.active){const next=s.follow.key;s.follow=null;queue(this,next);}}
   return ok;};
  L.prototype.snapshot=function(){const d=oldSnap.call(this);if(this.joseon344)d.joseon344=JSON.parse(JSON.stringify(this.joseon344));return d;};
  L.restore=function(d){const l=oldRestore.call(this,d);if(l&&J.isJoseon(l)&&d?.joseon344)hydrate(l,d);return l;};
  Object.defineProperty(L.prototype,'__joseon344',{value:true});return true;
 }
 install();
 return Object.freeze({ensure,eligible,plan,queue,advance,resolve,hydrate,summary,install,names,steps,dice});
});