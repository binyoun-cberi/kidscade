/* Historical anchors inform fictional encounters. Wages, selection, injuries,
 * surveillance and return chances are game rules, never historical statistics.
 * Travel22 alone owns residence; ordinary domestic work does not run abroad. */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.OneLifeDiaspora340=api;})(typeof window!=='undefined'?window:null,function(root){
'use strict';
const T=root?.OneLifeTravel22,Sim=root?.OneLifeSim;
const clip=(n,a,b)=>Math.max(a,Math.min(b,n));
const roll=(l,key)=>{let h=l.seed>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h/4294967296;};
const SOURCE={labor:'https://theme.archives.go.kr/next/koreaOfRecord/manpower.do',mexico:'https://contents.history.go.kr/mobile/nh/view.do?levelId=nh_047_0030_0020_0040_0030_0020',gulf:'https://archives.go.kr/next/newsearch/listSubjectDescription.do?id=000274&pageFlag=C&sitePage=1-2-2',provisional:'https://encykorea.aks.ac.kr/Article/E0079752',domestic:'https://encykorea.aks.ac.kr/Article/E0009065',diaspora:'https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_135_0030',school:'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n402200',kwangbok:'https://encykorea.aks.ac.kr/Article/E0005134'};
const ROUTES=Object.freeze({
 mexico:{start:1905,end:1905,min:18,max:48,place:'멕시코 유카탄의 에네켄 농장',region:'멕시코',name:'멕시코 농장 노동',source:SOURCE.mexico},
 germanyMine:{start:1963,end:1977,min:20,max:40,place:'서독의 탄광과 기숙사',region:'서독',name:'서독 광산 취업',source:SOURCE.labor},
 germanyNurse:{start:1966,end:1976,min:20,max:40,place:'서독의 병원과 기숙사',region:'서독',name:'서독 간호 취업',source:SOURCE.labor},
 gulf:{start:1973,end:1988,min:20,max:50,place:'중동의 건설 현장과 숙소',region:'중동',name:'중동 건설 취업',source:SOURCE.gulf},
 china:{start:1919,end:1944,min:18,max:55,place:'중국의 임시정부 활동지',region:'중국',name:'중국으로 건너가 독립운동에 참여',source:SOURCE.provisional}
});
const ORGS=Object.freeze({domestic:{name:'국내의 독립운동 지원 모임',start:1919,end:1936},provisional:{name:'임시정부를 돕는 사람들',start:1919,end:1945},diaspora:{name:'미주 한인들의 독립운동 후원 모임',start:1909,end:1945},school:{name:'독립운동 계열의 교육 모임',start:1911,end:1937},kwangbok:{name:'한국광복군',start:1940,end:1945}});
const ownsRoute=r=>Object.hasOwn(ROUTES,r);
const base=l=>!!l?.alive&&l.country?.[0]==='대한민국'&&l.age>=18&&l.age<=85&&l.joseon14?.captivity?.status!=='held'&&(!l.joseon325||l.joseon325.law.kind==='free');
const home=l=>!T.ensure(l).residence.abroad;
const literate=l=>(l.world?.educationYears||0)>=4||(l.joseon?.literacy||0)>0||(l.historyLife338?.hangul||0)>0||(l.joseonWomen326?.letters||0)>=2||(l.diaspora340?.org?.literacy||0)>=2;
function ensure(l){if(!l||l.country?.[0]!=='대한민국')return null;return l.diaspora340||(l.diaspora340={version:1,processedYear:l.year-1,seen:[],active:null,application:null,homeDue:null,journeys:[],org:null,orgArchive:[],history:[],lastOffer:l.birthYear-4});}
function eligible(l,key){if(!base(l)||!home(l)||!ownsRoute(key))return false;const r=ROUTES[key];if(l.year<r.start||l.year>r.end||l.age<r.min||l.age>r.max)return false;
 if(key==='germanyMine')return l.gender==='남자'&&l.stats.health>=45;
 if(key==='germanyNurse')return l.gender==='여자'&&((l.world7?.qualification||[]).includes('nursing')||l.world7?.grandfatheredOccupation==='간호사');
 if(key==='gulf')return ['trades','technology'].includes(l.world6?.sector)&&l.world6.history.some(h=>l.age-h.age>=2)&&l.stats.health>=40;
 if(key==='china')return l.year>=1919&&l.stats.health>=30;
 return true;
}
function orgEligible(l,key){if(!base(l)||!ORGS[key]||ensure(l).org?.status==='active'||l.collaboration341?.role?.status==='active')return false;const o=ORGS[key],r=T.ensure(l).residence;
 if(l.year<o.start||l.year>o.end||l.age>65)return false;
 if(key==='domestic')return !r.abroad;
 if(key==='diaspora')return r.abroad&&['hawaii','mexico'].includes(r.route);
 return r.abroad&&r.route==='china'&&(key!=='school'||literate(l));
}
function record(l,text,kind='life'){const s=ensure(l);l.logEvent(text,'joseon340-'+kind);l.log.at(-1).causeId='joseon340:'+l.year+'-'+(s.active?.type||'life');s.history.push({year:l.year,text,source:s.recordSource||SOURCE[s.org?.key]||journey(l)?.source||SOURCE.labor});s.history=s.history.slice(-60);}
function open(l,type,key){if(l.pending||!base(l))return false;const s=ensure(l);s.active={type,key,year:l.year};l.pending='joseon340:'+type+'-'+l.year;return true;}
const opt=(label,note,action)=>({label,note,action});
function journey(l){const r=T.ensure(l).residence;return ensure(l).journeys.findLast(j=>j.route===r.route&&j.departed===r.since&&j.status!=='returned');}
function money(l,n){if(l.money)l.money.netWorth=clip((l.money.netWorth||0)+n,-2e7,2e7);}
function workResult(key,year){
 const lines={
  mexico:['에네켄 잎을 베고 섬유를 추리며 번 돈은 생활비를 빼고 나니 조금밖에 남지 않았다.','농장에서 고되게 일해도 손에 쥐는 돈은 적어, 돌아갈 여비가 좀처럼 모이지 않았다.'],
  germanyMine:['교대 시간을 맞춰 탄광에 나가 일했다. 먹고 지내는 데 쓴 돈을 제하고 나머지를 모아 두었다.','탄광 일을 마치고 지친 몸으로 숙소에 돌아오는 날이 이어졌다. 생활비를 아끼며 돈을 조금씩 모았다.'],
  germanyNurse:['병동을 오가며 교대 근무를 마쳤다. 월급에서 생활비를 덜고 남은 돈을 모아 두었다.','환자를 돌보고 다음 근무자에게 일을 넘기며 지냈다. 생활비를 빼고 저축을 이어 갔다.'],
  gulf:['더운 현장에서 일을 마치고 숙소로 돌아오곤 했다. 임금을 받아 생활비를 빼고 남은 돈을 모았다.','현장과 숙소를 오가며 일한 대금을 받았다. 먹고 지내는 비용을 제하고 나머지는 따로 두었다.']
 };return lines[key][Math.abs(year)%2];
}
function prompt(l){const s=ensure(l),q=s?.active;if(!q)return null;const r=ROUTES[q.key],j=journey(l),o=s.org;
 if(q.type==='invite')return {title:({mexico:'멕시코 농장으로 떠날까',germanyMine:'서독 광산에 지원할까',germanyNurse:'서독 병원에 지원할까',gulf:'중동 공사 현장으로 갈까',china:'중국으로 건너갈까'})[q.key],description:q.key==='mexico'?'신문에 멕시코 농장에서 일할 사람을 구한다는 광고가 실렸다. 돈을 벌 수 있다지만 실제로 어떤 대우를 받을지, 돌아올 뱃삯은 얼마나 들지 알기 어렵다.':q.key==='china'?'중국으로 건너가 독립운동에 힘을 보태는 사람들이 있다는 소식을 들었다. 함께할 사람을 찾아볼 수는 있겠지만, 낯선 곳에서 먹고 지낼 일부터 걱정이다.':'해외에서 일할 사람을 뽑는다는 소식을 들었다. 계약 기간과 임금, 숙소 사정을 알아보고 지원할지 정하려 한다.',source:r.source,options:[opt('조건을 확인하고 지원한다','계약 내용을 알아본 뒤 지원서를 낸다.','apply'),opt('지금은 고향에 남는다','지금 하던 일을 계속한다.','decline')]};
 if(q.type==='review')return {title:'떠나기 전에 확인할 일',description:q.key==='mexico'?'계약을 맺으면 유카탄의 농장에서 일하게 된다고 한다. 광고와 다른 대우를 받아도 도움을 청하거나 돌아오기 어려울 수 있다.':q.key==='china'?'함께 갈 사람에게 거처와 생활비 사정을 물었다. 낯선 땅에서 생계를 꾸릴 준비가 필요하다.':'자격과 몸 상태를 확인받고 계약서를 다시 읽었다. 선발되면 익숙한 일터를 떠나 말도 일하는 방식도 다른 곳에서 지내야 한다.',source:r.source,options:[opt('확인한 조건으로 출발을 준비한다','선발되지 않으면 국내에 남는다.','depart'),opt('지원을 거두고 생업을 이어 간다','지금은 떠나지 않는다.','decline')]};
 if(q.type==='work')return {title:({mexico:'농장에서 보낸 한 해',germanyMine:'탄광에서 보낸 한 해',germanyNurse:'병동에서 보낸 한 해',gulf:'공사 현장에서 보낸 한 해'})[q.key],description:q.key==='mexico'?(l.year<1909?'에네켄 잎을 베고 섬유를 추리느라 몸이 고되다. 듣고 온 조건과 대우가 달라, 생활비를 제하고 나면 돈이 얼마 남지 않는다.':'농장 계약이 끝난 뒤에도 돌아갈 여비가 부족하다. 다른 일감을 찾고 한인들과 살 길을 의논한다.'):q.key==='germanyMine'?'탄광에서 교대로 일하며 낯선 말로 내려오는 지시를 익힌다. 일을 마치고 돌아오면 몸은 지치지만, 고향에 보낼 돈을 떠올리며 다음 근무를 준비한다.':q.key==='germanyNurse'?'병동에서 자주 쓰는 말을 익히며 교대 근무를 한다. 한국에서 해 본 일도 여기서는 방식이 달라, 동료에게 묻고 다시 배우는 날이 많다.':'더운 공사 현장에서 긴 근무를 마치고 숙소로 돌아온다. 몸을 쉬어야 하는데도, 약속한 날에 임금을 받을 수 있을지 신경이 쓰인다.',source:r?.source,options:[opt('안전에 주의하며 일을 계속한다','생활비를 빼고 돈을 모으지만, 일을 계속하면 몸이 지친다.','work'),opt('일을 줄이고 말과 기술을 배운다','이번에는 돈을 모으지 않고 공부와 휴식에 시간을 쓴다.','learn'),opt('모은 돈에서 고향에 보낼 돈을 따로 떼어 둔다','보낼 돈과 받을 사람의 주소를 확인한다.','remit')]};
 if(q.type==='contract')return {title:'계약 뒤의 삶을 정할 때',description:q.key==='china'?'해방 뒤 돌아갈 길과 생활비를 마련하며, 중국에 남아 있을지 귀국할지 생각한다.':q.key==='mexico'?'계약이 끝났지만 귀국 배편과 여비를 마련하기는 쉽지 않다. 현지의 다른 생업도 알아봐야 한다.':q.key==='gulf'?'공사가 끝나거나 줄어들면서 다음 계약을 고민한다. 임금 정산과 돌아갈 비용을 확인해야 한다.':'계약이 끝나 돌아갈지 더 머무를지 정해야 한다. 여기서 다시 일하거나 공부하려면 체류 허가와 생활비를 갖춰야 한다.',source:r?.source,options:[opt('여비와 서류를 갖추어 귀국을 준비한다','모은 돈으로 돌아갈 여비를 댈 수 있는지 본다.','return'),opt(q.key==='gulf'?'새 공사 계약을 알아본다':'체류와 새 일자리의 허가를 알아본다','허가나 일자리를 얻지 못하면 돌아갈 준비를 한다.','stay'),opt('모아 둔 돈으로 말과 기술 공부를 준비한다','생활비를 쓰며 공부하고, 이후 계약을 다시 살핀다.','study')]};
 if(q.type==='chinaLife')return {title:'낯선 땅에서의 생계와 독립운동',description:'중국에서 일감을 찾아 끼니와 잠자리를 해결하며 지낸다. 독립운동에 참여하는 사람을 만나면 무슨 일을 하는지, 내가 도울 일은 없는지 묻게 된다.',source:SOURCE.provisional,options:[opt('일손을 보태 생활비를 마련한다','하루하루 먹고 지낼 돈을 번다.','chinaWork'),opt('함께 공부하며 참여할 모임을 알아본다','교육·살림·문서 등 할 수 있는 일을 묻는다.','findOrg'),opt('몸을 쉬고 고향에 소식을 전한다','귀국은 별도로 준비해야 한다.','rest')]};
 if(q.type==='orgInvite')return {title:q.key==='kwangbok'?'광복군에서 할 일':'모임에서 함께할 일',description:'아는 사람이 '+ORGS[q.key].name+' 이야기를 꺼냈다. 뜻을 함께하고 싶지만 생업을 비울 수 있을지, 단속을 받지는 않을지 마음이 복잡하다.',source:SOURCE[q.key],options:[opt('할 수 있는 일을 의논하고 참여한다','처음에는 곁에서 배우며 맡을 일을 찾는다.','join'),opt('이번에는 생업을 이어 가며 지켜본다','가족과 하던 일을 살피며 소식을 기다린다.','decline')]};
 if(q.type==='orgRole')return {title:'모임에서 맡을 일을 나누다',description:'함께 일할 사람들이 모여 맡을 일을 의논한다. 끼니를 챙기고 회비를 걷는 일부터 글을 가르치는 일까지 할 일이 많다.',source:SOURCE[o.key],options:[opt('끼니를 챙기고 아픈 동료를 돌본다','일손과 생활비가 든다.','care'),opt(literate(l)?'회비와 문서를 대조하고 정리한다':'일손을 보태 모임의 살림 비용을 마련한다','받은 돈과 쓴 곳을 적거나, 모임에 보탤 돈을 번다.',literate(l)?'records':'support'),opt(o.key==='kwangbok'?'훈련과 부대의 일과를 익힌다':literate(l)?'아이와 동료들의 글공부를 돕는다':'배우는 모임에서 글과 말을 익힌다','생업을 마친 뒤에도 배움과 연습을 이어 간다.',o.key==='kwangbok'?'training':literate(l)?'teaching':'learning')]};
 if(q.type==='orgYear')return {title:'맡은 일을 이어 가는 나날',description:({care:'함께 지내는 사람들의 끼니를 챙기고 아픈 동료를 돌본다. 식량도 일손도 넉넉하지 않아 서로 맡을 일을 바꿔 가며 지낸다.',records:'회비를 받은 날짜와 쓴 곳을 장부에 적는다. 맞지 않는 금액이 있으면 돈을 건넨 사람에게 다시 물어야 한다.',support:'일감을 마친 뒤 모임에 보탤 수 있는 돈과 시간을 헤아린다.',teaching:'글공부할 종이와 시간을 마련했다. 가르치는 일과 자신의 생업을 함께 꾸려야 한다.',learning:'생업을 마친 뒤 글과 말을 배운다. 배운 내용을 실제로 읽어 보기까지 시간이 걸린다.',training:'부대의 일과에 맞춰 움직이고 훈련을 받는다. 하루를 마칠 때면 지친 몸을 쉬게 하고 다음 훈련을 준비한다.'})[o.role],source:SOURCE[o.key],options:[opt('맡은 일을 이어 간다','시간과 생활비를 들여 하던 일을 계속한다.','serve'),opt('몸을 돌보며 맡은 일을 줄인다','맡을 일을 줄여 쉴 시간을 낸다.','reduce'),opt('모임을 떠나 생계를 다시 꾸린다','지금 하던 일은 그만둔다.','leave'),opt('할 수 있는 다른 일을 의논한다','배운 것과 몸 상태에 맞춰 역할을 바꾼다.','changeRole')]};
 if(q.type==='orgPrison')return {title:'옥 안에서 보낸 나날',description:'옥에 갇힌 뒤로 하던 일도 모임 사람들의 소식도 끊겼다. 몸을 추스르며 하루를 보내지만 바깥이 어떻게 돌아가는지 알 길이 없다.',source:SOURCE.domestic,options:[opt('몸을 쉬며 하루를 견딘다','옥 안에서 쉴 수 있을 때 몸을 쉰다.','prisonRest'),opt('기억하는 일을 마음속으로 정리한다','적을 수 없는 일도 잊지 않으려 한다.','prisonRemember')]};
 if(q.type==='orgRecovery')return {title:'풀려난 뒤 다시 꾸리는 생활',description:'옥에서 나왔지만 몸과 생업이 전 같지 않았다. 함께했던 사람들의 소식을 물으며 당장 먹고살 일을 다시 생각했다.',source:SOURCE.domestic,options:[opt('몸을 돌보며 생계를 다시 살핀다','급한 일부터 찾되 무리하지 않으려 한다.','recover')]};
 if(q.type==='orgRisk')return {title:'모임이 흩어진 뒤',description:o.detained?'단속 중 붙잡혀 모임 일을 손에서 놓았다. 바깥 소식도 끊긴 채, 옥 안에서 하루하루를 버텨야 한다.':'단속으로 사람들이 흩어졌다. 누가 어디로 갔는지 알 수 없어 모임의 일을 더 이어 가기 어렵다.',source:SOURCE[o.key],options:[opt('활동을 멈추고 몸과 생계를 돌본다','당장은 모임의 일을 이어 가지 못한다.','suspend'),opt('연락이 닿는 동료의 안부부터 묻는다','소식을 알아보는 데 시간이 들고 답을 듣지 못할 수도 있다.','inquire')]};
 if(q.type==='liberation')return {title:'해방 뒤에도 남은 삶의 일',description:T.ensure(l).residence.abroad?'해방 소식이 전해졌다. 고향으로 돌아가고 싶지만 뱃길과 여비를 알아봐야 하고, 돌아간 뒤 머물 곳도 걱정이다.':'해방 소식이 전해졌다. 함께하던 사람들과 앞으로 할 일을 의논하며, 그동안 미뤄 둔 생업도 다시 생각한다.',source:SOURCE.provisional,options:[opt(T.ensure(l).residence.abroad?'귀국할 비용과 길을 알아본다':'모임의 일을 정리하고 생업으로 돌아간다',T.ensure(l).residence.abroad?'돌아갈 여비와 교통편부터 알아본다.':'당장 먹고살 일부터 찾는다.','libReturn'),opt('지금 사는 곳에서 생계를 이어 간다','맡았던 일을 마무리하고 할 일을 찾는다.','libStay')]};
 if(q.type==='homeAfter')return {title:'돌아온 뒤 다시 꾸리는 생활',description:'돌아와 보니 고향의 일자리도 사람들의 사정도 달라졌다. 모은 돈을 아껴 쓰며 전에 하던 일이나 해외에서 배운 기술을 쓸 곳을 찾아야 한다.',source:j?.source||s.journeys.at(-1)?.source,options:[opt('전에 쌓은 기술로 국내 일감을 알아본다','국내 일터에서 요구하는 조건도 함께 살핀다.','homeWork'),opt('모아 둔 기록과 배운 것을 정리한다','외국에서 쓰던 장부와 익힌 말을 다시 들춰 본다.','homeRecord')]};
 return null;
}
function depart(l,key){const r=ROUTES[key],s=ensure(l),t=T.ensure(l);if(!eligible(l,key))return false;
 const since=l.year;t.residence={abroad:true,place:r.place,region:r.region,reason:r.name,route:key,since,until:null};t.source=r.source;t.yearsAbroad=0;
 t.movements.push({year:since,place:r.place,reason:r.name,route:key,action:'출발'});t.movements=t.movements.slice(-24);
 s.journeys.push({route:key,departed:since,status:'working',due:key==='mexico'?1909:since+(key==='gulf'?2:3),savings:0,remitted:0,language:0,injury:0,study:0,source:r.source,settled:false,returned:null});s.journeys=s.journeys.slice(-8);
 record(l,r.place+'에서 생활을 시작했다. 고향의 생업과 떨어져 먹고 지낼 곳을 새로 마련했다.','depart');return true;}
function back(l,j){if(!j||!T.ensure(l).residence.abroad)return false;j.status='returned';j.returned=l.year;T.homecoming(l,'여비와 귀국 길을 마련함');money(l,j.savings*100);j.savings=0;ensure(l).homeDue=l.year+1;return true;}
function choose(l,index){const s=ensure(l),q=s?.active,p=prompt(l);if(!base(l)||!q||!p||l.pending!=='joseon340:'+q.type+'-'+q.year||!Number.isInteger(index)||index<0||index>=p.options.length)return false;
 const action=p.options[index].action,j=journey(l);if(action==='join'&&!orgEligible(l,q.key))return false;if(['work','learn','study','remit','return','stay','chinaWork'].includes(action)&&!j)return false;s.recordSource=p.source||SOURCE.labor;s.active=null;l.pending=null;
 if(action==='apply'){s.application={route:q.key,year:l.year};open(l,'review',q.key);record(l,'계약 내용을 알아본 뒤 필요한 서류를 모아 지원했다.','choice');}
 else if(action==='depart'){
  const selected=['mexico','china'].includes(q.key)||roll(l,q.key+'select'+l.year)<.65;
  if(selected&&depart(l,q.key))record(l,'고향을 떠나기로 하고 출발 준비를 마쳤다.','choice');else record(l,'지원했지만 이번에는 선발되지 않았다. 고향에서 생업을 이어 갔다.','choice');s.application=null;
 }else if(action==='decline'){record(l,'이번에는 제안을 거절하고 하던 일을 계속했다.','choice');s.application=null;}
 else if(action==='work'&&j){const low=q.key==='mexico',delay=q.key==='gulf'&&l.year>=1983&&roll(l,'pay'+l.year)<.4;
  if(delay)record(l,'임금이 밀려 생활비만 나갔다. 받을 돈을 적어 두었지만 저축은 늘지 않았다.','choice');else{j.savings=clip(j.savings+(low?1:5),0,500);record(l,workResult(q.key,l.year),'choice');}
  l.change({health:-2-(j.injury>0?1:0)});if(!low&&roll(l,'injury'+l.year)<.08){j.injury=clip(j.injury+1,0,3);l.change({health:-3});record(l,'작업 중 다쳐 쉬며 치료를 받았다. 그 뒤로도 무리한 일을 줄여야 했다.','followup');}
 }else if(['learn','study'].includes(action)&&j){if(action==='study'&&j.savings<2)record(l,'공부에 쓸 생활비가 부족해 계획을 미뤘다.','choice');else{j.savings=Math.max(0,j.savings-(action==='study'?2:0));j.language=clip(j.language+1,0,8);j.study=clip(j.study+1,0,8);l.change({knowledge:2,health:1});record(l,'일터에서 자주 듣던 말을 적어 두고 뜻을 물으며, 익숙하지 않은 기술도 연습했다.','choice');}if(action==='study')j.due=l.year+2;
 }else if(action==='remit'&&j){const sent=Math.min(2,j.savings);j.savings-=sent;j.remitted+=sent;const family=(l.joseon4?.people?.length?l.joseon4.people:l.world9?.people||[]).find(p=>p.alive&&p.birthYear<=l.year-16&&l.year-p.birthYear<=95&&['mother','father','spouse','child','sibling','어머니','아버지','배우자','자녀','형제자매'].includes(p.role));if(sent&&family){family.relation=clip((family.relation||50)+1,0,100);j.transfers=j.transfers||[];j.transfers.push({year:l.year,personId:family.id,name:family.name,amount:sent});j.transfers=j.transfers.slice(-30);record(l,family.name+'에게 모은 돈의 일부를 부치고 안부 편지를 썼다.','choice');}else if(sent){j.savings+=sent;j.remitted-=sent;record(l,'받을 사람과 주소를 확인하지 못해 돈은 현지에 보관하고 소식을 전할 길을 알아봤다.','choice');}else record(l,'송금할 여유가 없어 안부를 적고 다음 벌이를 기다렸다.','choice');}
 else if(action==='return'&&j){const cost=q.key==='mexico'?8:4;if(j.savings>=cost){j.savings-=cost;back(l,j);}else{j.due=l.year+2;record(l,'돌아갈 여비가 모자라 더 일하며 돈을 모으기로 했다.','choice');}}
 else if(action==='stay'&&j){const permit=q.key!=='gulf'&&j.language>=2&&roll(l,'permit'+l.year)<.65;const renewed=q.key==='gulf'&&roll(l,'contract'+l.year)<(l.year>=1983?.3:.7);if(permit||renewed){j.settled=permit;j.due=l.year+(permit?5:2);record(l,permit?'체류 허가를 받고 새로 일할 곳도 정해, 당분간 더 머무르기로 했다.':'새 공사에서 일할 계약을 맺고 임금과 숙소 조건을 확인했다.','choice');}else{j.due=l.year+2;record(l,'체류 허가나 다음 일자리를 얻지 못해 돌아갈 여비부터 다시 헤아렸다.','choice');}}
 else if(action==='chinaWork'&&j){j.savings=clip(j.savings+2,0,500);l.change({health:-1});record(l,'일감을 맡아 받은 돈을 먹고 지내는 데 보탰다.','choice');}
 else if(action==='findOrg'){const key=l.year>=1940?'kwangbok':literate(l)&&l.year<=1937?'school':'provisional';if(orgEligible(l,key))open(l,'orgInvite',key);else record(l,'모임에 참여할 길을 물었지만 이번에는 함께할 사람을 만나지 못했다.','choice');}
 else if(action==='rest'){l.change({health:2});record(l,'쉬는 동안 고향에 보낼 편지를 썼지만, 누구 편에 부쳐야 할지 몰라 곁에 두었다.','choice');}
 else if(action==='join'){if(!orgEligible(l,q.key))return false;if(s.org){s.orgArchive.push({...s.org});s.orgArchive=s.orgArchive.slice(-6);}s.org={key:q.key,joined:l.year,role:'',status:'active',service:0,contribution:0,release:null,liberated:false,contacts:[{id:'org-'+l.year,name:l.gender==='여자'?'정숙':'영수',met:l.year}]};record(l,'모임에서 함께 일할 사람들을 만나 무엇을 도울 수 있을지 의논했다.','choice');open(l,'orgRole',q.key);}
 else if(['care','records','support','teaching','learning','training'].includes(action)){s.org.role=action;s.org.lastYear=l.year;record(l,({care:'끼니를 챙기고 아픈 동료를 돌보는 일을 맡았다.',records:'회비 장부와 모임의 문서를 정리하기로 했다.',support:'생업을 이어 가며 모임의 살림에 힘을 보태기로 했다.',teaching:'아이와 동료들의 글공부를 돕기로 했다.',learning:'모임의 배움터에서 글과 말을 익히기 시작했다.',training:'광복군의 일과와 훈련을 익히기 시작했다.'})[action],'choice');}
 else if(action==='changeRole'){open(l,'orgRole',s.org.key);}
 else if(action==='serve'){const o=s.org;o.lastYear=l.year;o.service++;if(o.role==='learning'){o.literacy=clip((o.literacy||0)+1,0,4);if(j)j.language=clip(j.language+1,0,8);}l.change({health:-1});if(o.role==='support'){const available=j?j.savings:Math.max(0,l.money?.netWorth||0)/100,amount=Math.min(2,Math.floor(available));if(j)j.savings-=amount;else money(l,-amount*100);o.contribution+=amount;record(l,amount?'생업에서 남긴 돈 중 형편에 맞게 모임 살림에 보탰다.':'보탤 돈이 없어 모임에서 필요한 일손을 도왔다.','choice');}else{const available=j?j.savings:Math.max(0,l.money?.netWorth||0)/100;if(available>=1){if(j)j.savings--;else money(l,-100);}l.change({knowledge:['records','teaching','learning'].includes(o.role)?2:1});record(l,({care:'끼니를 마련하고 아픈 동료 곁을 지키며 한 해를 보냈다.',records:'회비를 받은 날짜와 쓴 곳을 장부에 적고 남은 돈과 맞춰 보았다.',teaching:'일을 마친 뒤 모여 글을 읽고 모르는 대목을 함께 살폈다.',learning:'배운 글자와 말을 여러 번 적고 소리 내어 읽었다.',training:'부대 일과에 맞춰 훈련을 받고 몸에 익지 않은 동작을 거듭 연습했다.'})[o.role],'choice');}if(o.key==='domestic'&&roll(l,'repression'+l.year)<.16){o.status='disrupted';o.detained=roll(l,'detention'+l.year)<.4;o.release=o.detained?l.year+1:null;open(l,'orgRisk',o.key);}}
 else if(action==='reduce'){l.change({health:2});record(l,'맡은 일을 줄여 쉴 틈을 내고, 밀린 생업을 돌봤다.','choice');}
 else if(action==='leave'){s.org.status='left';record(l,'모임의 일을 내려놓고 먹고살 일을 다시 찾았다.','choice');}
 else if(['suspend','inquire'].includes(action)){s.org.status=s.org.detained?'detained':'suspended';if(action==='inquire')l.change({health:-1});record(l,s.org.detained?'단속에 붙잡혀 바깥의 생업과 떨어진 채 수감 생활을 하게 되었다.':action==='inquire'?'연락이 닿는 사람에게 동료의 안부를 물었다. 흩어진 사람들의 소식을 모두 듣지는 못했다.':'모임의 일을 멈추고 몸을 추스르며 당장 할 수 있는 생업부터 찾았다.','choice');}
 else if(action==='prisonRest'){l.change({health:1});record(l,'옥 안에서 몸을 쉬며 하루를 견뎠다. 바깥에서 하던 일을 돌볼 수는 없었다.','choice');}
 else if(action==='prisonRemember'){l.change({knowledge:1});record(l,'밖에서 함께했던 사람들과 맡았던 일을 떠올렸다. 소식을 전할 길은 없었다.','choice');}
 else if(action==='recover'){l.change({health:1});record(l,'쉬면서 할 수 있는 일감을 찾았다. 아직 몸이 좋지 않고 연락이 끊긴 사람도 있어, 예전처럼 지내기는 어려웠다.','choice');}
 else if(['libReturn','libStay'].includes(action)){s.org.liberated=true;s.org.status='finished';if(j)j.due=l.year+2;if(action==='libReturn'&&j){if(j.savings>=3){j.savings-=3;back(l,j);}else record(l,'해방 소식은 들었지만 귀국할 여비와 길을 마련하지 못했다. 당분간 현지에서 생계를 이어 갔다.','choice');}else record(l,'모임에서 맡았던 일을 마무리하고, 지금 사는 곳에서 먹고살 일을 찾기로 했다.','choice');}
 else if(action==='homeWork'){const past=s.journeys.at(-1);const found=roll(l,'homeWork'+l.year)<.6&&root?.OneLifeWorld6?.career(l,past?.route==='germanyNurse'?'health':'trades',0,'국내 일감을 구해');record(l,found?'해외에서 익힌 일과 전에 하던 기술로 국내 일감을 구했다. 새 일터의 방식은 다시 배워야 했다.':'하던 일과 해외에서 배운 기술을 내세워 일자리를 구했지만 이번에는 자리를 얻지 못했다.','choice');s.homeDue=null;}
 else if(action==='homeRecord'){record(l,'외국에서 쓴 장부를 들춰 보고 익힌 말을 적어 두며, 돌아온 뒤 무슨 일에 쓸 수 있을지 생각했다.','choice');s.homeDue=null;}
 delete s.recordSource;return true;
}
function abroadYear(l,t){const s=ensure(l),j=journey(l);t.yearsAbroad=l.year-t.residence.since;if(!j)return;
 if(s.org&&l.year>=1945&&!s.org.liberated&&['active','disrupted','suspended'].includes(s.org.status)){open(l,'liberation',s.org.key);return;}
 if(t.residence.route==='china'){
  if(s.org?.status==='active'&&l.year<=ORGS[s.org.key].end){open(l,s.org.role?'orgYear':'orgRole',s.org.key);return;}
  if(l.year>=1945&&l.year>=j.due){open(l,'contract','china');return;}
  open(l,'chinaLife','china');return;
 }
 if(s.org?.key==='diaspora'&&s.org.status==='active'&&l.year%2===0&&l.year<=1945){open(l,s.org.role?'orgYear':'orgRole',s.org.key);return;}
 if(['mexico'].includes(j.route)&&l.year>=1909&&!s.seen.includes('org-diaspora')&&orgEligible(l,'diaspora')){s.seen.push('org-diaspora');open(l,'orgInvite','diaspora');return;}
 if(l.age>65||l.year>=j.due){open(l,'contract',j.route);return;}
 open(l,'work',j.route);
}
function year(l,retry=false){const s=ensure(l);if(!s||!l.alive||(s.processedYear>=l.year&&!retry))return;s.processedYear=l.year;
 if(s.org&&l.year>=1945&&!s.org.liberated&&['active','disrupted','suspended'].includes(s.org.status)&&!l.pending){open(l,'liberation',s.org.key);return;}
 if(!base(l)||l.pending)return;
 if(s.homeDue&&l.year>=s.homeDue&&home(l)){open(l,'homeAfter',s.journeys.at(-1)?.route);return;}
 const residence=T.ensure(l).residence;
 if(residence.abroad){if(residence.route==='hawaii'&&orgEligible(l,'diaspora')&&!s.seen.includes('org-diaspora')){s.seen.push('org-diaspora');open(l,'orgInvite','diaspora');}return;}
 if(s.org?.status==='active'){if(l.year>ORGS[s.org.key].end){s.org.status='finished';record(l,'모임의 일을 이어 갈 여건이 달라졌다. 그동안의 활동 기록을 보관하고 생업을 살폈다.');}else if(s.org.lastYear!==l.year){open(l,s.org.role?'orgYear':'orgRole',s.org.key);return;}}
 if(l.year-s.lastOffer<4)return;
 const key=Object.keys(ROUTES).find(k=>eligible(l,k)&&!s.seen.includes(k)&&roll(l,k+l.year)<.25);
 if(key){s.seen.push(key);s.lastOffer=l.year;open(l,'invite',key);return;}
 if(orgEligible(l,'domestic')&&!s.seen.includes('org-domestic')&&roll(l,'org'+l.year)<.22){s.seen.push('org-domestic');s.lastOffer=l.year;open(l,'orgInvite','domestic');}
}
function restoreResidence(l,t,saved,data){const r=ROUTES[saved.residence?.route],y=saved.residence?.since,j=data?.diaspora340?.journeys?.find(j=>j.route===saved.residence.route&&j.departed===y&&j.status!=='returned');
 const valid=r&&saved.residence.abroad===true&&Number.isInteger(y)&&y>=l.birthYear&&y<=l.year&&y>=r.start&&y<=r.end&&y-l.birthYear>=r.min&&y-l.birthYear<=r.max&&j&&(saved.residence.route!=='germanyMine'||l.gender==='남자')&&(saved.residence.route!=='germanyNurse'||l.gender==='여자');
 if(valid){t.residence={abroad:true,place:r.place,region:r.region,reason:r.name,route:saved.residence.route,since:y,until:null};t.source=r.source;}
 else{t.residence={abroad:false,place:'고향',region:'한반도',reason:'',route:'home',since:l.year,until:null};t.source=null;}
}
function hydrate(l,d){const s=ensure(l),o=d?.diaspora340;if(!s)return;if(!o||o.version!==1){s.processedYear=l.year;if(String(l.pending).startsWith('joseon340:'))l.pending=null;return;}
 s.processedYear=clip(Number(o.processedYear)||l.year,l.birthYear,l.year);s.lastOffer=clip(Number(o.lastOffer)||l.birthYear-4,l.birthYear-4,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(k=>ownsRoute(k)||/^org-(domestic|diaspora)$/.test(k)).slice(-12):[];
 s.journeys=Array.isArray(o.journeys)?o.journeys.filter(j=>j&&ownsRoute(j.route)&&Number.isInteger(j.departed)&&j.departed>=l.birthYear&&j.departed>=ROUTES[j.route].start&&j.departed<=ROUTES[j.route].end&&j.departed<=l.year&&['working','returned'].includes(j.status)).slice(-8).map(j=>({...j,source:ROUTES[j.route].source,...Object.fromEntries(['savings','remitted','language','injury','study'].map(k=>[k,clip(Number(j[k])||0,0,k==='savings'||k==='remitted'?500:k==='injury'?3:8)]))})):[];
 s.org=o.org&&ORGS[o.org.key]&&Number.isInteger(o.org.joined)&&o.org.joined>=l.birthYear&&o.org.joined>=ORGS[o.org.key].start&&o.org.joined<=ORGS[o.org.key].end&&o.org.joined<=l.year&&['active','left','suspended','disrupted','detained','finished'].includes(o.org.status)&&['','care','records','support','teaching','learning','training'].includes(o.org.role)?{...o.org,service:clip(Number(o.org.service)||0,0,100),contribution:clip(Number(o.org.contribution)||0,0,500),contacts:Array.isArray(o.org.contacts)?o.org.contacts.slice(0,1).map(p=>({id:String(p.id).slice(0,60),name:String(p.name).slice(0,20),met:o.org.joined})):[]}:null;
 s.orgArchive=Array.isArray(o.orgArchive)?o.orgArchive.filter(a=>a&&ORGS[a.key]&&Number.isInteger(a.joined)&&a.joined>=l.birthYear&&a.joined<=l.year&&a.joined>=ORGS[a.key].start&&a.joined<=ORGS[a.key].end).slice(-6).map(a=>({...a})):[];
 s.homeDue=Number.isInteger(o.homeDue)&&o.homeDue<=l.year+1?o.homeDue:null;
 s.application=o.application&&ownsRoute(o.application.route)&&o.application.year===l.year?{...o.application}:null;
 s.history=Array.isArray(o.history)?o.history.filter(h=>h&&Number.isInteger(h.year)&&h.year>=l.birthYear&&h.year<=l.year&&typeof h.text==='string').slice(-60).map(h=>({year:h.year,text:h.text.slice(0,220),source:Object.values(SOURCE).includes(h.source)?h.source:SOURCE.labor})):[];
 const q=o.active,types=['invite','review','work','contract','chinaLife','orgInvite','orgRole','orgYear','orgRisk','orgPrison','orgRecovery','liberation','homeAfter'];
 s.active=q&&types.includes(q.type)&&q.year===l.year&&(ownsRoute(q.key)||ORGS[q.key])&&d.pending==='joseon340:'+q.type+'-'+q.year&&base(l)&&(['orgRole','orgYear','orgRisk','orgPrison','orgRecovery','liberation'].includes(q.type)?!!s.org:['work','contract','chinaLife'].includes(q.type)?!!journey(l)&&journey(l).route===q.key:['invite','review'].includes(q.type)?eligible(l,q.key):q.type==='orgInvite'?orgEligible(l,q.key):q.type==='homeAfter'?home(l):false)?{type:q.type,key:q.key,year:q.year}:null;
 if(s.active)l.pending='joseon340:'+q.type+'-'+q.year;else if(String(l.pending).startsWith('joseon340:'))l.pending=null;
}
function matchEntry(l,e){if(!String(e?.kind).startsWith('joseon340-'))return null;const h=ensure(l)?.history.find(h=>h.year===e.year&&h.text===e.text);return h?{title:'해외의 삶과 독립운동',source:h.source,year:h.year}:null;}
function describe(l){const s=ensure(l),j=journey(l);return j?'현지에 남긴 돈 '+j.savings+' · 보낸 돈 '+j.remitted+' · 현지 말 익히기 '+j.language+(j.injury?' · 일하다 다친 기록이 있음':''):'';}
function install(){const L=Sim?.Life;if(!L||L.prototype.__diaspora340)return false;const tick=L.prototype.tick,get=L.prototype.getChoice,oldChoose=L.prototype.choose,reflect=L.prototype.reflect,snap=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){const o=this.diaspora340?.org;if(o?.status==='detained'){if(!this.alive||this.pending)return false;const n=this.log.length,r=Sim.advanceCoreYear(this);if(r){this.log=this.log.filter((e,i)=>i<n||e.kind==='death');this.pending=null;if(this.alive){this.change({health:-1});if(this.year>=o.release||this.year>=1945){o.status='suspended';o.detained=false;record(this,'구금에서 풀려났지만 몸과 생업을 다시 추슬러야 했다.','followup');open(this,'orgRecovery',o.key);}else open(this,'orgPrison',o.key);}}return r;}if(this.alive&&!this.pending){year(this);if(this.pending)return true;}const y=this.year,r=tick.call(this);if(r&&this.alive&&this.year!==y)year(this);return r;};
 L.prototype.getChoice=function(){return String(this.pending).startsWith('joseon340:')?prompt(this):get.call(this);};
 L.prototype.choose=function(i){if(String(this.pending).startsWith('joseon340:'))return choose(this,i);const r=oldChoose.call(this,i);if(r&&this.alive&&!this.pending)year(this,true);return r;};
 L.prototype.reflect=function(t){return reflect.call(this,t);};
 L.prototype.snapshot=function(){const d=snap.call(this);if(this.country?.[0]==='대한민국')d.diaspora340=JSON.parse(JSON.stringify(ensure(this)));return d;};
 L.restore=function(d){const l=restore.call(this,d);if(l?.country?.[0]==='대한민국')hydrate(l,d);return l;};Object.defineProperty(L.prototype,'__diaspora340',{value:true});return true;}
install();return Object.freeze({ROUTES,ORGS,SOURCE,ownsRoute,ensure,eligible,orgEligible,open,prompt,choose,depart,abroadYear,year,restoreResidence,hydrate,matchEntry,describe,install});
});
