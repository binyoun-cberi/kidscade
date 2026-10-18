/* Joseon wartime household v13.
 * Historical years and regional frontlines from National Institute of Korean History.
 * Personal casualties, separations and resources are fictional simulations, not counts.
 * A missing family member remains ALIVE and missing, never presumed dead or "dishonored".
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon4,root?.OneLifeJoseon5,root?.OneLifeJoseon9,root?.OneLifeJoseon12);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon13=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4,V5,V9,V12){
'use strict';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function roll(seed,salt){let n=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;}
const SOUTH=['경상도','전라도','충청도'];
const CENTER=['경기도','한양','충청도','황해도'];
const NORTHWEST=['평안도','황해도'];
const SIEGE=['경기도','한양','황해도'];
const SOURCES=Object.freeze({
 imjin:'https://contents.history.go.kr/front/ta/view.do?levelId=ta_h51_0060_0020_0040',
 jeongyu:'https://contents.history.go.kr/mobile/eh/view.do?levelId=eh_r0294_0010',
 imjinAfter:'https://contents.history.go.kr/front/nh/view.do?levelId=nh_029_0020_0040',
 jeongmyo:'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_30&levelId=kc_i305600',
 byeongja:'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_30&levelId=kc_i302800',
 ransom:'https://encykorea.aks.ac.kr/Article/E0076452'
});
const O=(label,note,after,change={},special=null,risk=0)=>({label,note,after,change,special,risk});
const E=(id,years,where,title,scene,source,options,requires=null)=>({
 id,from:years[0],until:years[1],where,title,scene,source,options,requires
});
const EVENTS=[
 E('imjinAlarm',[1592,1592],['경상도','충청도'],'왜군이 북으로 올라온다는 소식',
 '부산과 동래에서 싸움이 벌어졌다. 큰길에는 아이를 업고 떠나는 사람들이 지나간다.',SOURCES.imjin,[
  O('식구를 데리고 피란길에 오른다','목숨을 먼저 지킨다','떠난 길에서 돌아온 뒤에도 집터를 다시 손봐야 했다.',{capital:-5,grain:-3,trust:2,damage:2,moves:1},'evacuate'),
  O('이웃과 마을의 먹을 것을 챙긴다','늙은 사람과 어린이를 돌본다','서로 나누었던 곡식과 일손으로 몇 해를 버텼다.',{grain:-5,bonds:5,trust:5,damage:1},'aid'),
  O('군영에 물자를 옮긴다','혼란한 길이 위험할 수 있다','짐을 나르던 날의 고생이 전쟁 뒤에도 기억났다.',{health:-4,knowledge:2,capital:2,damage:1},null,.025)]),
 E('imjinCapital',[1592,1592],['한양','경기도'],'도성에서 사람들이 떠나다',
 '도성의 길에 피란 짐이 늘었다. 누구는 함께 떠나자 하고 누구는 살림을 지키자 한다.',SOURCES.imjin,[
  O('가족과 먼 친척집으로 떠난다','돌아올 길을 기약하기 어렵다','먼 친척집에서 머물던 시간이 오래 기억됐다.',{capital:-5,bonds:3,moves:1,damage:2},'evacuate'),
  O('이웃의 짐을 나누어 짊어진다','서로 돌보며 피란한다','이웃과 피란길을 함께 했던 인연이 남았다.',{health:-3,trust:5,damage:2},'aid'),
  O('집안의 문서와 씨앗부터 챙긴다','남길 살림이 걱정된다','잃어버리지 않은 작은 문서와 씨앗이 재건에 도움이 됐다.',{grain:-2,knowledge:3,damage:3},'secure')]),
 E('imjinNorth',[1592,1593],['평안도','황해도','함경도'],'전쟁 소식이 북쪽까지 오다',
 '왜군이 북으로 올라왔고 관군과 백성의 길이 어수선하다. 식구들의 행방을 수소문한다.',SOURCES.imjin,[
  O('가족을 모아 안전한 곳으로 피한다','멀리 돌아갈 길을 찾는다','안전한 마을을 찾아 이동했던 날이 남았다.',{capital:-4,moves:1,bonds:4,damage:2},'evacuate'),
  O('병든 피란민에게 곡식을 나눈다','남은 식량도 줄어든다','먼 곳에서 온 피란민이 나중에 안부를 전했다.',{grain:-5,trust:5,health:-1,damage:1},'aid'),
  O('지나가는 장정의 소식을 살핀다','전쟁터에 간 친척의 행방을 묻는다','전쟁 중 떠났던 이들의 이름을 오래 기억했다.',{knowledge:4,damage:1},'search')]),
 E('militia1593',[1592,1595],['경상도','전라도','충청도'],'의병을 돕는 마을 사람들',
 '고을 사람들이 의병을 돕기 위해 밥과 짚신, 화살을 모은다. 싸우러 갈 사람도 필요하다.',SOURCES.imjin,[
  O('곡식과 짚신을 모아 건넨다','마을이 함께 군량을 모은다','전쟁 뒤 돌아온 의병의 식구와 오래도록 인사를 나누었다.',{grain:-5,trust:5,bonds:3},'aid'),
  O('식구가 쓸 곡식부터 챙긴다','모든 사람이 싸움에 나설 수는 없다','전쟁 동안 집을 지키던 손길이 이어졌다.',{grain:1,health:1},'secure'),
  O('의병을 따라 나선다','싸움에서는 돌아오지 못할 수도 있다','함께 나섰던 사람과 전쟁 뒤 고향을 찾았다.',{health:-8,knowledge:3,damage:1},'militia',.045)]),
 E('supply1593',[1593,1596],['전라도','충청도','경상도'],'전란에 군량을 마련하는 고을',
 '군사가 지나간 뒤에도 먹을 곡식은 부족하다. 수레와 지게로 곡식을 옮길 사람을 찾는다.',SOURCES.imjin,[
  O('군영으로 곡식을 나른다','몸은 고되지만 도움이 된다','군량을 나르던 길에서 함께했던 사람들을 다시 만났다.',{grain:-4,health:-3,bonds:3},'aid'),
  O('마을의 아이와 노인을 먼저 먹인다','살림의 곡식부터 남긴다','늙은 이웃과 아이를 돌보던 날이 남았다.',{grain:-3,trust:4},'care'),
  O('관아에 곡식 부족을 알린다','다른 고을의 사정을 함께 전한다','곡식 사정을 알리던 사람과 편지를 주고받았다.',{knowledge:3,trust:2},'petition')]),
 E('missing1593',[1592,1598],['경상도','전라도','충청도','경기도','한양','평안도','황해도','함경도'],'피란길에서 식구의 소식이 끊기다',
 '전란 속에 가족 한 사람과 연락이 끊겼다. 길이 끊겨 멀리 간 사람의 안부를 알기 어렵다.',SOURCES.imjin,[
  O('함께 다니던 사람에게 안부를 묻는다','여러 마을을 거쳐 소식을 찾는다','여러 해가 지난 뒤에도 그 사람의 안부를 알아보려 했다.',{capital:-3,bonds:3,knowledge:2},'separate'),
  O('가족이 돌아올 자리를 남겨 둔다','집을 지키고 기다린다','돌아올지 모르는 식구의 자리를 오래 지켰다.',{grain:-2,bonds:4},'separate'),
  O('고을과 절을 찾아 소식을 남긴다','사람을 통해 이야기를 전한다','떠난 사람을 찾기 위해 이름을 적고 소식을 남겼다.',{capital:-4,trust:2,knowledge:2},'separate')
 ],(l,j,s)=>availableKin(l).length>0&&!hasMissing(s)),
 E('jeongyu1597',[1597,1597],SOUTH,'다시 전란이 닥친 남쪽 고을',
 '남부 고을에 다시 싸움이 퍼졌다. 지난 전쟁에서 겨우 고친 집을 또 잃을지 모른다.',SOURCES.jeongyu,[
  O('가족을 이끌고 산길로 피한다','집을 떠나는 위험을 감수한다','두 번째 피란 뒤 돌아왔을 때 살림은 많이 바뀌어 있었다.',{capital:-6,grain:-3,moves:1,damage:3},'evacuate'),
  O('미리 모은 곡식과 문서를 챙긴다','남길 것을 가려 담는다','잃어버리지 않은 장부가 전쟁 뒤 살림에 도움이 되었다.',{knowledge:3,grain:-3,damage:2},'secure'),
  O('이웃과 마을 입구를 지킨다','위험하지만 함께 버틴다','밤을 지키던 사람들이 다시 집을 고쳐 세웠다.',{health:-6,trust:4,damage:2},'defend',.04)]),
 E('jeongyuPort',[1597,1598],['경상도','전라도'],'바닷가에 다시 닿은 전쟁',
 '포구마다 피란한 배와 군영에서 온 사람들이 섞인다. 뱃사람의 소식을 기다리는 집도 있다.',SOURCES.jeongyu,[
  O('남쪽 포구의 배를 고치는 일을 돕는다','선박과 그물에 힘을 보탠다','전쟁 뒤 바닷일을 다시 시작하는 데 배를 고친 솜씨가 도움이 됐다.',{health:-3,repair:2,bonds:2,damage:1},'aid'),
  O('어린 식구와 떨어지지 않게 지낸다','사람의 안전을 먼저 챙긴다','돌아온 뒤에도 피란길을 가족끼리 오래 이야기했다.',{capital:-4,bonds:5,moves:1},'evacuate'),
  O('해안의 군영에 군량을 보내 준다','곡식과 짐 나르는 품이 든다','전쟁터에서 돌아온 사람에게서 바다의 소식을 들었다.',{grain:-5,trust:3,health:-2},'aid')]),
 E('withdraw1598',[1598,1598],['전라도','경상도','충청도'],'왜군이 물러간 뒤의 포구',
 '왜군이 물러간다는 소식이 들린다. 싸움이 그쳤어도 돌아오지 않은 사람과 잃은 살림이 많다.',SOURCES.jeongyu,[
  O('고향의 집터를 먼저 살핀다','복구할 일을 헤아린다','돌아온 집터에서 남은 기둥을 다시 세웠다.',{capital:-3,damage:1,repair:2},'rebuild'),
  O('잃어버린 사람을 찾아다닌다','먼 고을과 포구를 수소문한다','함께 찾던 사람이 다음에도 안부를 물었다.',{knowledge:2,trust:3,capital:-2},'search'),
  O('이웃과 남은 배와 그물을 손본다','바닷일을 되찾는다','그물을 다시 손보며 생업을 이어 나갔다.',{repair:2,trust:3,health:-2},'rebuild')]),
 E('imjinRepair',[1599,1610],null,'전쟁으로 무너진 집터를 고치다',
 '집의 기둥과 담장을 고치려면 나무와 일손이 필요하다. 전쟁이 끝났어도 집안은 아직 평온하지 않다.',SOURCES.imjinAfter,[
  O('이웃과 집을 고쳐 세운다','서로 품을 갚으며 일한다','집을 고치던 이웃이 다음에도 우리 일을 도우러 왔다.',{capital:-3,repair:4,trust:5,health:-2},'rebuild'),
  O('남은 재목으로 작은 집부터 짓는다','넉넉하지 않아도 시작한다','작은 집이 오랜 세월 가족의 보금자리가 되었다.',{repair:3,firewood:-2,capital:-1},'rebuild'),
  O('먼 장에서 목재와 기와를 구한다','돈이 더 필요하다','장길에서 만난 목수와 오래도록 거래했다.',{capital:-6,repair:6,contacts:2},'rebuild')
 ],(l,j,s)=>s.damage>0),
 E('imjinFields',[1599,1612],null,'묵은 밭에 씨앗을 다시 뿌리다',
 '몇 해 동안 돌보지 못한 밭에 풀이 무성하다. 소와 씨앗, 일손이 모두 부족하다.',SOURCES.imjinAfter,[
  O('씨앗을 나눠 심는다','이웃과 곡식을 나누어 마련한다','되살린 밭에서 곡식을 조금씩 거두었다.',{grain:-3,fields:4,trust:3,health:-3},'rebuild'),
  O('일손을 얻어 땅을 고른다','일할 도구와 품삯이 든다','여러 해 버려 두었던 밭을 다시 부칠 수 있게 됐다.',{capital:-4,fields:6,health:-2},'rebuild'),
  O('우선 남의 땅을 부쳐 먹는다','내 땅이 회복될 때까지 버틴다','소작으로 마련한 곡식이 가족의 끼니를 이었다.',{grain:2,capital:-2,fields:2},'tenant')
 ],(l,j,s)=>s.fields>0||s.damage>0),
 E('imjinOrphans',[1599,1610],null,'집안이 끊긴 이웃의 어린이',
 '전쟁 뒤 가족을 잃은 아이들이 친척과 이웃의 집을 오간다. 우리 살림도 넉넉하지 않다.',SOURCES.imjinAfter,[
  O('아이에게 먹을 것을 나눈다','식구가 한 사람 늘어난 듯 돌본다','힘든 날 서로 나눴던 밥이 기억에 남았다.',{grain:-4,bonds:5,trust:3},'care'),
  O('친척을 찾아볼 수 있게 돕는다','아는 사람에게 편지를 전한다','아이의 친척을 찾아 주기 위해 마을을 돌아다녔다.',{knowledge:3,trust:3,capital:-2},'search'),
  O('마을에서 돌봄을 나누자고 한다','여러 집이 함께 품을 모은다','함께 아이를 살피던 집안들이 이웃으로 남았다.',{trust:6,bonds:2},'aid')
 ],(l,j,s)=>s.damage>0),
 E('imjinMissingReturn',[1599,1620],null,'전란 때 소식 끊긴 가족을 다시 찾다',
 '먼 길에 떠났던 가족의 흔적이 있다는 말이 들린다. 다시 만날 수 있을지 아직 확실하지 않다.',SOURCES.imjinAfter,[
  O('인편을 보내 만나 볼 길을 찾는다','여비와 시간이 필요하다','가족을 찾으려 했던 마음은 훗날에도 남았다.',{capital:-4,knowledge:2},'trace'),
  O('친척과 함께 먼 고을을 알아본다','위험한 길을 나누어 간다','함께 안부를 묻던 친척이 후일에도 도왔다.',{capital:-3,bonds:4},'trace'),
  O('고향의 집과 농사부터 지킨다','돌아올 자리를 남겨 둔다','돌아오기를 기다리며 집터를 지켜 냈다.',{repair:1,bonds:2},'wait')
 ],(l,j,s)=>hasMissing(s)&&s.missing.some(x=>x.year<=l.year-2&&x.status==='missing'&&x.era==='imjin')),
 E('jeongmyo1627',[1627,1627],NORTHWEST,'후금 군사가 서북으로 들어오다',
 '서북의 고을에 군사가 들이닥쳤다는 소식이 전해진다. 식구를 피신시킬 곳을 찾는다.',SOURCES.jeongmyo,[
  O('식구를 데리고 피란한다','먼 친척에게 맡길 짐을 정한다','그때 피란길에서 머문 집의 사람들과 인연이 이어졌다.',{capital:-5,damage:2,moves:1,bonds:3},'evacuate'),
  O('마을의 곡식과 짐을 지킨다','노인과 아이를 먼저 살핀다','그해 지켜 낸 곡식이 여러 식구를 먹였다.',{grain:-4,trust:3,damage:1},'secure'),
  O('관군에게 길과 물자를 알려 준다','위험한 길에 나설 수 있다','전란을 겪은 뒤에도 북쪽 길을 조심했다.',{health:-5,knowledge:2,damage:1},'aid',.03)]),
 E('jeongmyoNews',[1627,1627],['한양','경기도','충청도','전라도','경상도'],'서북 고을의 전쟁 소식',
 '서북 지방에서 전란이 났다는 소식이 들린다. 먼 친척이 무사한지 묻는 사람이 많다.',SOURCES.jeongmyo,[
  O('전란을 피한 사람에게 먹을 것을 나눈다','긴 길에서 온 사람을 돕는다','피란민에게 먹을 것을 건넨 인연이 남았다.',{grain:-3,trust:4,bonds:2},'aid'),
  O('먼 친척에게 안부를 전한다','다녀오는 사람에게 편지를 부탁한다','먼 고을에서 소식이 돌아올 때까지 기다렸다.',{capital:-2,bonds:3},'search'),
  O('집안의 곡식과 씨앗을 아낀다','혹시 모를 혼란에 대비한다','전란의 소식 속에서도 집안의 일을 이어 갔다.',{grain:2,knowledge:1},'secure')]),
 E('jeongmyoMissing',[1627,1628],NORTHWEST,'피란길에 흩어진 식구',
 '서북의 전란 중에 가족의 소식이 끊겼다. 누가 어디에 있는지 알기 어려운 날이 이어진다.',SOURCES.jeongmyo,[
  O('멀리 간 식구의 이름을 수소문한다','전란 속 소식을 찾는다','잃어버린 사람을 찾으려고 여러 길을 살폈다.',{capital:-3,bonds:3},'separate'),
  O('피란민들의 말을 모아 듣는다','돌아갈 길을 찾는다','피란민이 전하는 소식이 가족의 기억으로 남았다.',{trust:3,knowledge:3},'separate'),
  O('집터를 지키며 편지를 기다린다','돌아올 자리를 남긴다','소식을 기다리며 한동안 저녁마다 문밖을 바라보았다.',{grain:-1,bonds:4},'separate')
 ],(l,j,s)=>availableKin(l).length>0&&!hasMissing(s)),
 E('ransom1628',[1628,1638],null,'서북 전란 뒤 사라진 가족의 소식',
 '서북의 전란 중 소식이 끊긴 사람이 포로가 되었다는 소문이 들려온다. 살아 있는지부터 알아보아야 한다.',SOURCES.ransom,[
  O('장시를 오가는 사람에게 안부를 부탁한다','인편과 소식에 비용이 든다','실종된 식구의 이름을 여러 사람에게 전해 주었다.',{capital:-3,knowledge:3},'trace'),
  O('친척들과 몸값을 마련할 방법을 찾는다','가족에게 큰 부담이 될 수 있다','식구들은 오랫동안 돈과 곡식 마련을 의논했다.',{capital:-6,bonds:3},'ransom'),
  O('돌아올 집터와 먹을 것을 챙겨 둔다','돌아오기를 기다린다','오랜 기다림 속에서도 집을 지키며 지냈다.',{grain:-2,repair:1},'wait')
 ],(l,j,s)=>s.missing.some(x=>x.status==='missing'&&x.era==='hiran'&&x.year<=l.year-1)),
 E('byeongja1636',[1636,1636],SIEGE,'청군이 한양을 향해 내려오다',
 '한양과 경기도의 길이 급해졌다. 산성으로 피하는 사람과 집에 남는 사람이 뒤섞인다.',SOURCES.byeongja,[
  O('식구와 피란할 길을 찾는다','남겨 두고 가는 살림이 걱정된다','피란했다가 돌아와 잃어버린 살림을 헤아렸다.',{capital:-6,grain:-3,damage:3,moves:1},'evacuate'),
  O('이웃과 산성 주변에 곡식을 나른다','군량을 보태지만 위험하다','곡식을 함께 나르던 이웃과 다시 만나 안부를 나눴다.',{grain:-5,health:-4,bonds:3,damage:1},'aid',.018),
  O('집안을 지키고 소식을 기다린다','도성 가까이에 머문다','전란 뒤 집터에서 돌아올 사람들을 기다렸다.',{damage:3,bonds:2,grain:-2},'secure')]),
 E('byeongjaProvince',[1636,1637],['충청도','전라도','경상도','강원도'],'한양 쪽으로 길이 막히다',
 '청군이 도성 근처까지 들어왔다는 소식이다. 군량을 구하거나 고을의 피란민을 돕는 사람이 있다.',SOURCES.byeongja,[
  O('피란 온 가족에게 먹을 것을 나눈다','멀리서 온 사람을 맞는다','피란민과 함께 지내던 날이 오래 기억났다.',{grain:-4,trust:4,bonds:2},'aid'),
  O('산성에 보낼 군량을 모은다','짐을 옮기며 품을 보탠다','군량을 마련하던 고을 사람과 나중에도 안부를 나눴다.',{grain:-5,health:-3,trust:2},'supply'),
  O('가족과 고을을 지키며 기다린다','직접 전투에 나가지는 않는다','먼 고을의 싸움 소식을 기다리며 농사를 이어 갔다.',{capital:-2,bonds:2},'wait')]),
 E('ganghwa1637',[1637,1637],['경기도','한양'],'강화도가 함락되었다는 소식',
 '강화도에서 많은 사람이 끌려갔다는 소식이 들려온다. 사라진 식구의 행방을 찾기 어렵다.',SOURCES.byeongja,[
  O('피란길에 함께 있던 식구를 찾는다','멀리 떠난 사람을 수소문한다','이웃과 함께 실종자의 이름을 알아보던 날이 남았다.',{capital:-3,bonds:3,damage:1},'separateIfKin'),
  O('남겨진 사람의 끼니를 마련한다','돌아온 피란민부터 돌본다','힘겨운 날에 도왔던 사람들이 훗날 찾아왔다.',{grain:-4,trust:5,damage:1},'aid'),
  O('가족의 집터와 곡식을 지킨다','앞으로 살아갈 살림부터 생각한다','무너진 집터를 다시 일으킬 날을 기다렸다.',{grain:-2,repair:1,damage:2},'secure')]),
 E('ransom1638',[1638,1662],null,'포로로 잡혔을지도 모르는 가족의 속환 소식',
 '행방을 알 수 없는 가족이 포로가 됐을 수도 있다는 말을 들었다. 속환할 길을 알아보지만 실제로 붙잡혔는지조차 분명치 않다.',SOURCES.ransom,[
  O('몸값을 마련할 길을 알아본다','집안의 돈과 이웃의 도움을 모은다','돌아올 가족을 위해 살림을 모았던 날을 잊지 못했다.',{capital:-8,trust:1},'ransom'),
  O('먼 고을의 친척에게 힘을 빌린다','인편과 상인을 통해 안부를 알아본다','친척과 소식을 나누며 오랫동안 기다렸다.',{capital:-4,bonds:3},'trace'),
  O('편지와 고향의 소식을 전한다','당장은 큰돈을 마련하기 어렵다','고향의 집터를 지키며 다시 만나기를 기다렸다.',{bonds:3,repair:1},'wait')
 ],(l,j,s)=>hasMissing(s)&&s.missing.some(x=>x.status==='missing'&&x.era==='hiran')),
 E('hiranFields',[1638,1650],null,'돌아온 뒤 논밭을 다시 부치다',
 '전란 뒤 집안의 농지는 돌보지 못한 곳이 있다. 씨앗과 일손을 다시 모아야 한다.',SOURCES.byeongja,[
  O('농사할 땅을 조금씩 되찾는다','씨앗과 일손을 들여 살린다','묵은 밭에 다시 곡식이 여물었다.',{fields:5,grain:-3,health:-2},'rebuild'),
  O('품을 빌려 논두렁을 고친다','이웃과 일손을 나눈다','논두렁을 함께 고치던 이웃과 오래 인연을 이어 갔다.',{fields:3,trust:4,health:-2},'rebuild'),
  O('집안의 먹을 것을 우선 마련한다','농사를 넓히는 일은 미룬다','일단 식구들의 끼니를 지키며 다음 수확을 기다렸다.',{grain:3,fields:1,capital:-2},'wait')
 ],(l,j,s)=>s.fields>0||s.damage>0),
 E('hiranHouse',[1638,1650],null,'불탄 집의 기둥을 다시 세우다',
 '집을 고치려면 볏짚과 재목을 마련해야 한다. 돌아와도 예전 살림을 바로 찾을 수 없다.',SOURCES.byeongja,[
  O('이웃과 기둥을 고쳐 세운다','품을 주고받는다','집을 고치던 이웃이 다시 찾아와 서로의 살림을 물었다.',{repair:4,capital:-3,trust:4},'rebuild'),
  O('작은 방부터 지어 식구를 들인다','지낼 공간부터 마련한다','작은 방에서 다시 한집 살림을 꾸렸다.',{repair:3,firewood:-1,bonds:3},'rebuild'),
  O('먼 친척집에서 조금 더 머문다','재목을 모으는 시간을 번다','오랫동안 머물렀던 친척집과 자주 안부를 나누었다.',{capital:2,damage:-1,bonds:2,moves:1},'evacuate')
 ],(l,j,s)=>s.damage>0),
 E('hiranReturn',[1638,1658],null,'돌아온 사람을 어떻게 맞을까',
 '먼 고을에서 끌려갔던 사람 가운데 돌아오는 이가 있다. 한 가족을 다시 이루는 일이 쉽지만은 않다.',SOURCES.ransom,[
  O('돌아온 가족을 따뜻하게 맞는다','살아 돌아온 일이 가장 중요하다','오랫동안 떨어져 있던 식구와 다시 밥상을 함께했다.',{bonds:6,trust:2},'welcome'),
  O('고생한 가족이 쉴 자리를 마련한다','서둘러 일터로 보내지 않는다','몸과 마음을 추스를 시간을 서로 주었다.',{capital:-3,bonds:5,health:2},'welcome'),
  O('가족의 뜻을 듣고 앞날을 정한다','돌아온 사람이 원하는 일을 묻는다','다시 만난 가족과 새로운 살림을 꾸렸다.',{knowledge:2,bonds:4},'welcome')
 ],(l,j,s)=>s.missing.some(x=>x.status==='returned'&&x.returnYear>=l.year-2&&!x.welcomed)),
 E('hiranStigma',[1638,1658],null,'전란 뒤 돌아온 이에게 향하는 말들',
 '포로 생활을 끝내고 돌아온 사람에게 험한 말을 하는 이가 있다. 겪은 고통과 잘못은 구별되어야 한다.',SOURCES.ransom,[
  O('그 사람의 잘못이 아니라 말한다','어려움을 겪은 이의 편에 선다','오래도록 그 말을 기억하며 이웃과 함께 지냈다.',{trust:3,bonds:4,knowledge:2},'care'),
  O('집안의 생계를 먼저 돕는다','생활을 다시 꾸릴 일손을 보탠다','돌아온 사람이 일터를 찾을 때 도움을 주었다.',{grain:-2,bonds:4,trust:2},'aid'),
  O('험담을 멈춰 달라 부탁한다','마을 사람과 부딪힐 수 있다','이웃과 긴 이야기를 나누며 그동안의 상처를 알게 됐다.',{trust:-1,bonds:5},'care')
 ],(l,j,s)=>s.missing.some(x=>x.status==='returned')),
 E('hiranWarTax',[1638,1648],null,'전란 뒤 줄어든 일손과 세금',
 '전란이 지나도 관아에 내는 곡식과 부역은 남았다. 집안에는 밭일할 사람마저 부족하다.',SOURCES.byeongja,[
  O('집안 형편을 관아에 알린다','전란에 사라진 일손을 설명한다','문서를 가지고 관아에 갔던 일을 오래 기억했다.',{knowledge:3,capital:-1},'petition'),
  O('이웃과 번갈아 품을 낸다','땅을 함께 돌본다','이웃과 함께 농사짓던 날이 다음 계절에도 도움이 됐다.',{trust:5,health:-2,fields:2},'aid'),
  O('장터에 일을 구하러 간다','농사 밖에서 벌이를 찾는다','먼 장에서 벌어 온 돈으로 집안을 도왔다.',{capital:4,health:-3},'work')
 ],(l,j,s)=>s.damage>0||s.fields>0)
];
const byId=new Map(EVENTS.map(e=>[e.id,e]));
function eligibleFamily(l){
 const people=V4.summary(l)?.people||[];
 return people.filter(p=>p.alive&&p.atHome&&p.age>=2&&p.role!=='child'&&(p.role==='spouse'||p.role==='sibling'||p.role==='father'||p.role==='mother'));
}
function availableKin(l){return eligibleFamily(l).filter(p=>!(l.joseon13?.missing||[]).some(m=>m.personId===p.id&&m.status==='missing'));}
function hasMissing(s){return !!s?.missing?.some(x=>x.status==='missing');}
function isActive(l){return J?.inOldEra(l)&&l.alive&&l.year>=1592&&l.year<=1662;}
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon13)l.joseon13={version:1,processedYear:l.year,seen:[],queue:[],active:null,
  decisions:[],followups:[],missing:[],damage:0,fields:0,repair:0,moves:0,
  hardship:0,scar:0,helped:0,warCount:0,memories:[],lastSource:null};
 return l.joseon13;
}
function allowed(l,e,s=ensure(l)){
 if(!s||!isActive(l)||l.age<9||l.age>78||l.year<e.from||l.year>e.until)return false;
 if(e.where&&!e.where.includes(J.summary(l).region))return false;
 return !e.requires||e.requires(l,J.summary(l),s);
}
function pick(l,s){
 const pool=EVENTS.filter(e=>!s.seen.includes(e.id)&&allowed(l,e,s));
 if(!pool.length)return null;
 const priority=e=>(e.from===e.until?-.5:0)+((e.id==='ransom1638'||e.id==='imjinMissingReturn')&&hasMissing(s)?-.7:0);
 const score=e=>roll(l.seed,l.year*17+e.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0))+priority(e);
 pool.sort((a,b)=>score(a)-score(b));
 return pool[0];
}
function offer(l,s,e){
 s.seen.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});s.queue=s.queue.slice(-4);
}
function promote(l,s){
 if(!s||!s.queue.length||s.active||l.pending||!l.alive||!J.inOldEra(l))return;
 s.active=s.queue.shift();l.pending='joseon13:'+s.active.id;
}
function prompt(l){
 const s=ensure(l),e=byId.get(s?.active?.eventId);if(!e)return null;
 let scene=e.scene;
 if(['ransom1638','imjinMissingReturn','hiranReturn'].includes(e.id)){
  const relative=e.id==='hiranReturn'?s.missing.find(m=>m.status==='returned'&&!m.welcomed):s.missing.find(m=>m.status==='missing');
  if(relative)scene=relative.name+'의 소식이 전해졌다. '+e.scene;
 }
 if(e.id==='imjinRepair'||e.id==='hiranHouse')scene+=s.damage>=8?' 무너진 곳이 많아 한 번에 손보기 어렵다.':s.damage>0?' 아직 손보지 못한 곳이 남아 있다.':' 집은 지낼 수 있을 만큼 손본 상태다.';
 return {title:e.title,description:scene,options:e.options.map(o=>(o.change?.grain<0&&V2.ensure(l).grain<=0&&['aid','care','supply'].includes(o.special))?{label:'곡식 대신 짐 나르는 일손을 보탠다',note:'나눌 곡식이 없어 몸으로 돕는다.',action:o.label}:({label:o.label,note:o.note,action:o.label}))};
}
function relatives(l,s){
 // No synthetic extra spouse/children. Choose actual adult relatives from the family module.
 const kin=availableKin(l);if(!kin.length)return null;
 const p=kin[Math.floor(roll(l.seed,l.year*13+778)*kin.length)];
 const raw=V4.ensure(l).people.find(x=>x.id===p.id);
 const entry={personId:p.id,name:p.name,role:p.role,era:l.year<=1620?'imjin':'hiran',year:l.year,
  status:'missing',returnYear:null,welcomed:false,atHome:raw?.atHome!==false};
 if(raw)raw.atHome=false;
 s.missing.push(entry);s.missing=s.missing.slice(-8);
 l.logEvent(p.name+'의 소식이 피란길에서 끊겼다. 살아 돌아올지 알 수 없어 집안이 기다렸다.','joseon13-family');
 return entry;
}
function reunite(l,s,entry){
 if(!entry||entry.status!=='missing')return false;
 const raw=V4.ensure(l).people.find(p=>p.id===entry.personId);
 if(!raw?.alive){entry.status='unresolved';return false;}
 entry.status='returned';entry.returnYear=l.year;entry.welcomed=false;
 raw.atHome=entry.atHome;
 l.logEvent(V4.particle(entry.name,'이','가')+' 오랜 이별 끝에 살아 돌아왔다.','joseon13-family');
 return true;
}
function yearly(l,s){
 if(!s||!l.alive||!J.inOldEra(l)||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 if(l.joseon14?.captivity?.status==='held')return;
 const j=J.ensure(l),v=V2.ensure(l),village=V9.ensure(l);
 for(const m of s.missing){
  const raw=V4.ensure(l).people.find(p=>p.id===m.personId);
  if(m.status==='missing'&&!raw?.alive){m.status='unresolved';
   l.logEvent(m.name+'의 생사를 확인하지 못한 채, 집안에 슬픔과 걱정이 남았다.','joseon13-family');
  }
 }
 // Old pending prose is not evidence of a return or another meeting.
 s.followups=s.followups.filter(x=>x.year>l.year);s.memories=s.memories.slice(-22);
 // Scarred households gradually recover, or suffer persistent yearly costs.
 // These are fictional economy units, NOT measured reconstruction of damage.
 if((s.damage>0||s.fields>0)&&l.year<=1652&&l.year%3===0){
  const labor=V4.summary(l).atHome;
  j.capital=clamp(j.capital-(labor>=3?1:2),-120,600);
  v.grain=clamp(v.grain-1,0,200);
  s.hardship++;
  l.logEvent('전쟁 뒤 남은 집과 밭의 상처 때문에 곡식과 일손을 더 아껴야 했다.','joseon13-memory');
 }
 if(s.repair>=3&&s.damage>0&&l.year%3===1){
  s.damage=clamp(s.damage-1,0,20);
  l.logEvent('그동안 손본 집의 피해가 조금 줄었다.','joseon13-followup');
 }
 if(l.age>=10&&l.age<=74&&(l.year%3===0||[1592,1593,1597,1598,1599,1627,1636,1637,1638].includes(l.year))&&s.queue.length<2){
  const e=pick(l,s);if(e)offer(l,s,e);
 }
 promote(l,s);
}
const RESULTS={
 "식구를 데리고 피란길에 오른다": "식구들과 짐을 꾸려 피란길에 올랐다.",
 "이웃과 마을의 먹을 것을 챙긴다": "이웃과 피란 중에 먹을 것을 챙겼다.",
 "군영에 물자를 옮긴다": "군영으로 물자를 날랐다. 짐을 지고 오가느라 몸이 고단했다.",
 "가족과 먼 친척집으로 떠난다": "가족과 함께 먼 친척집을 향해 떠났다.",
 "이웃의 짐을 나누어 짊어진다": "이웃의 피란 짐을 나누어 짊어졌다.",
 "집안의 문서와 씨앗부터 챙긴다": "흩어질 살림 속에서 집안 문서와 씨앗을 골라 챙겼다.",
 "가족을 모아 안전한 곳으로 피한다": "가족을 모아 싸움이 벌어진 곳에서 벗어났다.",
 "병든 피란민에게 곡식을 나눈다": "병든 피란민에게 먹을 것을 건넸다.",
 "지나가는 장정의 소식을 살핀다": "길을 지나가는 장정들에게 전쟁터로 간 친척의 행방을 물었다.",
 "곡식과 짚신을 모아 건넨다": "마을에서 의병에게 보낼 곡식과 짚신을 모았다.",
 "식구가 쓸 곡식부터 챙긴다": "남은 곡식을 헤아려 식구들이 먹을 몫부터 따로 두었다.",
 "의병을 따라 나선다": "고을에서 모인 의병을 따라 나섰다.",
 "군영으로 곡식을 나른다": "곡식을 짊어지고 군영까지 다녀왔다.",
 "마을의 아이와 노인을 먼저 먹인다": "아이와 노인에게 줄 먹을 것을 먼저 마련했다.",
 "관아에 곡식 부족을 알린다": "관아에 찾아가 고을의 곡식이 모자란 사정을 전했다. 구휼을 받았다는 답은 아직 없었다.",
 "함께 다니던 사람에게 안부를 묻는다": "피란길에 함께 다니던 사람에게 식구의 행방을 물었다.",
 "가족이 돌아올 자리를 남겨 둔다": "흩어진 가족이 찾아올 수 있도록 집에 자리를 남겨 두었다.",
 "고을과 절을 찾아 소식을 남긴다": "고을과 절을 찾아다니며 식구의 이름과 머물 곳을 전했다.",
 "가족을 이끌고 산길로 피한다": "가족과 산길로 몸을 피했다. 남겨 둔 살림까지 챙기지는 못했다.",
 "미리 모은 곡식과 문서를 챙긴다": "가져갈 수 있는 곡식과 문서를 추려 묶었다.",
 "이웃과 마을 입구를 지킨다": "이웃과 마을 입구에서 밤을 지켰다.",
 "남쪽 포구의 배를 고치는 일을 돕는다": "남쪽 포구에서 망가진 배를 고치는 일손을 보탰다.",
 "어린 식구와 떨어지지 않게 지낸다": "어린 식구를 곁에 두고 함께 피란길을 갔다.",
 "해안의 군영에 군량을 보내 준다": "해안의 군영에 보낼 곡식을 마련하고 짐을 날랐다.",
 "고향의 집터를 먼저 살핀다": "고향의 집터로 가서 무너진 곳과 남은 살림을 살폈다.",
 "잃어버린 사람을 찾아다닌다": "사람들이 모인 곳을 돌며 헤어진 이의 행방을 물었다.",
 "이웃과 남은 배와 그물을 손본다": "이웃과 남은 배와 그물을 펼쳐 놓고 고칠 곳부터 손봤다.",
 "이웃과 집을 고쳐 세운다": "이웃과 품을 나누어 무너진 집을 손봤다.",
 "남은 재목으로 작은 집부터 짓는다": "남은 재목을 모아 지낼 곳부터 고쳤다.",
 "먼 장에서 목재와 기와를 구한다": "집을 고치는 데 쓸 목재와 기와를 구하러 먼 장까지 다녀왔다.",
 "씨앗을 나눠 심는다": "이웃과 씨앗을 나누어 묵은 밭에 심었다.",
 "일손을 얻어 땅을 고른다": "일손을 얻어 풀이 무성한 밭을 고르고 다시 부칠 준비를 했다.",
 "우선 남의 땅을 부쳐 먹는다": "당장 부칠 수 있는 남의 땅을 구해 농사를 지었다.",
 "아이에게 먹을 것을 나눈다": "전쟁으로 식구를 잃은 아이에게 먹을 것을 나누었다.",
 "친척을 찾아볼 수 있게 돕는다": "아이의 친척을 찾으려고 고을 사람들에게 물었다.",
 "마을에서 돌봄을 나누자고 한다": "아이를 번갈아 돌볼 수 있는지 이웃집들과 의논했다.",
 "인편을 보내 만나 볼 길을 찾는다": "헤어진 가족의 행방을 알아보려고 인편을 보냈다.",
 "친척과 함께 먼 고을을 알아본다": "친척과 함께 먼 고을에 식구의 소식을 물었다.",
 "고향의 집과 농사부터 지킨다": "돌아올 가족을 기다리며 고향의 집과 농사를 돌봤다.",
 "식구를 데리고 피란한다": "식구들과 짐을 꾸려 싸움이 난 고을을 떠났다.",
 "마을의 곡식과 짐을 지킨다": "마을에 남은 곡식과 짐을 챙기며 이웃을 살폈다.",
 "관군에게 길과 물자를 알려 준다": "관군에게 고을의 길과 물자를 구할 곳을 알려 주었다.",
 "전란을 피한 사람에게 먹을 것을 나눈다": "전란을 피해 온 사람들에게 먹을 것을 건넸다.",
 "먼 친척에게 안부를 전한다": "길을 오가는 사람에게 먼 친척의 안부를 묻는 편지를 맡겼다.",
 "집안의 곡식과 씨앗을 아낀다": "집안에 남은 곡식과 씨앗을 헤아려 쓸 몫을 줄였다.",
 "멀리 간 식구의 이름을 수소문한다": "멀리 흩어진 식구의 이름을 대며 행방을 물었다.",
 "피란민들의 말을 모아 듣는다": "피란민들이 지나온 길과 본 사람들의 이야기를 들었다.",
 "집터를 지키며 편지를 기다린다": "집터에 머물며 흩어진 식구의 소식을 기다렸다.",
 "장시를 오가는 사람에게 안부를 부탁한다": "장시를 오가는 사람들에게 식구의 이름을 전하고 소식을 부탁했다.",
 "친척들과 몸값을 마련할 방법을 찾는다": "친척들과 모을 수 있는 돈을 헤아리며 몸값을 마련할 길을 찾았다.",
 "돌아올 집터와 먹을 것을 챙겨 둔다": "가족이 돌아오면 머물 집터와 먹을 것을 챙겼다.",
 "식구와 피란할 길을 찾는다": "가져갈 짐을 추려 식구들과 피란길에 올랐다.",
 "이웃과 산성 주변에 곡식을 나른다": "이웃과 산성 주변으로 곡식을 날랐다.",
 "집안을 지키고 소식을 기다린다": "집에 남아 살림을 지키며 전쟁 소식을 기다렸다.",
 "피란 온 가족에게 먹을 것을 나눈다": "고을로 피란 온 사람들에게 먹을 것을 나누었다.",
 "산성에 보낼 군량을 모은다": "산성에 보낼 군량을 모으고 짐 나르는 일을 보탰다.",
 "가족과 고을을 지키며 기다린다": "가족과 고을에 남아 하던 일을 이어 갔다.",
 "피란길에 함께 있던 식구를 찾는다": "피란길에 함께 있던 식구를 찾아 수소문했다.",
 "남겨진 사람의 끼니를 마련한다": "피란 뒤 남겨진 사람들에게 줄 끼니를 마련했다.",
 "가족의 집터와 곡식을 지킨다": "식구가 돌아올 집터와 남은 곡식을 지켰다.",
 "몸값을 마련할 길을 알아본다": "몸값을 모을 길을 찾으며 사람들에게 식구의 소식을 물었다.",
 "먼 고을의 친척에게 힘을 빌린다": "먼 고을의 친척에게 식구를 찾는 일을 도와 달라고 청했다.",
 "편지와 고향의 소식을 전한다": "인편에 편지와 고향의 소식을 맡겼다.",
 "농사할 땅을 조금씩 되찾는다": "버려 두었던 땅을 조금씩 고르고 농사를 다시 준비했다.",
 "품을 빌려 논두렁을 고친다": "이웃의 품을 얻어 무너진 논두렁을 손봤다.",
 "집안의 먹을 것을 우선 마련한다": "농사 넓히는 일은 미루고 식구들이 먹을 곡식부터 구했다.",
 "이웃과 기둥을 고쳐 세운다": "이웃과 무너진 기둥을 고쳐 세웠다.",
 "작은 방부터 지어 식구를 들인다": "식구들이 머물 작은 방부터 손봤다.",
 "먼 친척집에서 조금 더 머문다": "집을 고칠 재목을 모으는 동안 먼 친척집에 더 머물렀다.",
 "돌아온 가족을 따뜻하게 맞는다": "살아 돌아온 식구를 맞고 함께 앉아 이야기를 들었다.",
 "고생한 가족이 쉴 자리를 마련한다": "돌아온 가족이 당장 일을 나가지 않고 쉴 자리를 마련했다.",
 "가족의 뜻을 듣고 앞날을 정한다": "돌아온 가족에게 앞으로 어떻게 지내고 싶은지 물었다.",
 "그 사람의 잘못이 아니라 말한다": "끌려갔다 돌아온 일을 그 사람의 잘못으로 돌리지 말라고 했다.",
 "집안의 생계를 먼저 돕는다": "돌아온 식구의 집안일과 끼니를 보탰다.",
 "험담을 멈춰 달라 부탁한다": "돌아온 이를 두고 험담하던 사람들에게 그만해 달라고 말했다.",
 "집안 형편을 관아에 알린다": "관아에 찾아가 전란으로 줄어든 일손과 집안 형편을 알렸다.",
 "이웃과 번갈아 품을 낸다": "이웃과 번갈아 품을 내며 땅을 돌봤다.",
 "장터에 일을 구하러 간다": "장터에서 품일을 구해 집안에 쓸 돈을 벌었다."
};
function choose(l,index){
 const s=ensure(l),e=byId.get(s?.active?.eventId);
 if(!e||!l.alive||!Number.isInteger(index)||index<0||index>=e.options.length)return false;
 const op=e.options[index],d={...(op.change||{})},j=J.ensure(l),v=V2.ensure(l),village=V9.ensure(l),regional=V12?.ensure(l),id=s.active.id;
 const before={grain:v.grain,capital:j.capital,damage:s.damage,fields:s.fields};
 const emptyDonation=d.grain<0&&v.grain<=0&&['aid','care','supply'].includes(op.special);
 if(op.special==='secure'&&d.grain>0)d.grain=0;
 if(emptyDonation){d.grain=0;d.health=(d.health||0)-2;}
 const stats={};for(const k of ['health','happiness','bonds','knowledge','wealth'])if(Number.isFinite(d[k]))stats[k]=d[k];
 l.change(stats);
 if(Number.isFinite(d.capital))j.capital=clamp(j.capital+d.capital,-120,600);
 if(Number.isFinite(d.grain))v.grain=clamp(v.grain+d.grain,0,200);
 if(Number.isFinite(d.trust)){
  village.trust=clamp(village.trust+d.trust,0,100);
  if(village.homes[0])village.homes[0].trust=clamp(village.homes[0].trust+d.trust,0,100);
 }
 if(Number.isFinite(d.firewood)&&regional)regional.firewood=clamp(regional.firewood+d.firewood,0,40);
 if(Number.isFinite(d.contacts)&&regional)regional.customers=clamp(regional.customers+d.contacts,0,40);
 for(const k of ['damage','repair','moves'])if(Number.isFinite(d[k]))
  s[k]=clamp(s[k]+d[k],0,k==='damage'||k==='fields'?20:100);
 if(d.damage>0)s.fields=clamp(s.fields+d.damage,0,20);
 if(d.fields>0)s.fields=clamp(s.fields-d.fields,0,20);
 if(d.repair>0&&op.special==='rebuild')s.damage=clamp(s.damage-Math.max(1,Math.floor(d.repair/2)),0,20);
 if(s.damage>0||s.fields>0)s.scar++;
 if(Number.isFinite(d.moves)&&d.moves>0)j.relocations+=d.moves;
 if(op.special==='separate'||op.special==='separateIfKin'){
  if(availableKin(l).length){
   relatives(l,s);s.damage=clamp(s.damage+1,0,20);
  }else l.logEvent('피란 중 가족들의 안부를 서로 살피며 지냈다.','joseon13-family');
 }
 if(op.special==='ransom'||op.special==='trace'){
  const entry=s.missing.find(m=>m.status==='missing');
  const chance=op.special==='ransom'?.7:.48;
  if(entry&&roll(l.seed,l.year*89+index*37+entry.personId.length)<chance)reunite(l,s,entry);
  else if(entry)l.logEvent(entry.name+'의 소식을 기다렸지만 아직 확실한 소식은 들리지 않았다.','joseon13-family');
 }
 if(op.special==='welcome'){
  const relative=s.missing.find(m=>m.status==='returned'&&!m.welcomed);
  if(relative)relative.welcomed=true;
 }
 if(['aid','care','rebuild','tenant','supply'].includes(op.special))s.helped++;
 if(l.money&&l.year<1900)l.money.netWorth=j.capital*100;
 const fatal=!!(op.risk&&roll(l.seed,l.year*223+e.id.length*61+index*199)<op.risk);
 const parts=[emptyDonation?'나눌 곡식이 없어 대신 짐을 나르고 일손을 보탰다.':RESULTS[op.label]];
 if(fatal)parts.splice(0,parts.length,'그 일을 하던 중 전란에 휩쓸려 목숨을 잃었다.');
 if(v.grain<before.grain)parts.push('그만큼 집안에 남은 곡식이 줄었다.');
 if(j.capital<before.capital)parts.push('여비와 살림에 돈이 들었다.');
 if(s.damage<before.damage)parts.push('무너진 집에서 고쳐 쓸 수 있는 부분이 늘었다.');
 if(s.fields<before.fields)parts.push('묵었던 논밭을 다시 부칠 수 있게 되었다. 아직 수확을 거둔 것은 아니었다.');
 l.logEvent(parts.filter(Boolean).join(' '),'joseon13-choice');
 const logged=l.log.at(-1);logged.causeId='joseon13:'+id;logged.sourceUrl=e.source;logged.eventTitle=e.title;logged.choiceLabel=op.label;
 s.decisions.push({id,eventId:e.id,year:l.year,choice:index});
 s.decisions=s.decisions.slice(-80);
 // Later returns and reconstruction are recorded when their state changes, not promised here.
 s.followups=s.followups.slice(-75);
 s.lastSource=e.source;
 const wartime=[1592,1597,1627,1636,1637].includes(l.year);
 if(wartime)s.warCount++;
 s.active=null;l.pending=null;
 if(fatal){
  l.finish('전란 중 사람들을 돕거나 싸움에 나섰다가 목숨을 잃었다.');
 }else promote(l,s);
 return true;
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 const missing=s.missing.filter(m=>m.status==='missing');
 return {damage:s.damage,fields:s.fields,repair:s.repair,moves:s.moves,hardship:s.hardship,
  missing:missing.map(m=>({name:m.name,role:m.role,year:m.year})),
  returned:s.missing.filter(m=>m.status==='returned').map(m=>({name:m.name,year:m.returnYear})),
  helped:s.helped,decisions:s.decisions.length,warCount:s.warCount,memory:s.memories.at(-1)||null,source:s.lastSource};
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseon13;if(!s||!o||o.version!==1)return s;
 const valid=q=>q&&byId.has(q.eventId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year;
 const asQ=q=>({id:q.id.slice(0,80),eventId:q.eventId,year:q.year});
 s.processedYear=clamp(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(x=>byId.has(x)).slice(-EVENTS.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.filter(valid).slice(-4).map(asQ):[];
 s.active=valid(o.active)?asQ(o.active):null;
 if(!l.alive||!J.inOldEra(l)||data?.pending!=='joseon13:'+s.active?.id)s.active=null;
 if(s.active)l.pending='joseon13:'+s.active.id;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(q=>valid(q)&&Number.isInteger(q.choice)&&q.choice>=0&&q.choice<=2).slice(-80)
  .map(q=>({...asQ(q),choice:q.choice})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(f=>f&&typeof f.id==='string'&&typeof f.text==='string'&&Number.isInteger(f.year)&&f.year>l.year&&f.year<=l.year+5)
  .slice(-75).map(f=>({id:f.id.slice(0,80),year:f.year,text:f.text.slice(0,280)})):[];
 const people=V4.ensure(l).people;
 s.missing=Array.isArray(o.missing)?o.missing.filter(m=>m&&typeof m.personId==='string'&&people.some(p=>p.id===m.personId)&&
  ['missing','returned','unresolved'].includes(m.status)&&Number.isInteger(m.year)&&m.year<=l.year).slice(-8).map(m=>({
   personId:m.personId,name:String(m.name||'가족').slice(0,25),
   role:String(m.role||'sibling').slice(0,15),era:m.era==='imjin'?'imjin':'hiran',
   year:m.year,status:m.status,returnYear:Number.isInteger(m.returnYear)?clamp(m.returnYear,m.year,l.year):null,
   welcomed:!!m.welcomed,atHome:m.atHome!==false})):[];
 for(const m of s.missing){
  const raw=people.find(p=>p.id===m.personId);
  if(raw&&m.status==='missing')raw.atHome=false;
 }
 for(const k of ['damage','fields','repair','moves','hardship','scar','helped','warCount'])
  if(Number.isFinite(o[k]))s[k]=clamp(o[k],0,100);
 s.memories=Array.isArray(o.memories)?o.memories.filter(x=>typeof x==='string').slice(-22).map(x=>x.slice(0,280)):[];
 s.lastSource=typeof o.lastSource==='string'&&Object.values(SOURCES).includes(o.lastSource)?o.lastSource:null;
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V4?.ensure||!V5?.summary||!V9?.ensure||!V12?.ensure||Sim.Life.prototype.__joseon13)return false;
 const L=Sim.Life,pt=L.prototype.tick,pc=L.prototype.choose,pg=L.prototype.getChoice,pr=L.prototype.reflect,ps=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this)||this.year>1662)return pt.call(this);
  const before=this.year,ok=pt.call(this);
  if(ok&&this.alive&&this.year!==before)yearly(this,ensure(this));
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon13:'))return prompt(this);
  return pg.call(this);
 };
 L.prototype.choose=function(index){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon13:'))return choose(this,index);
  const ok=pc.call(this,index);
  if(ok&&isActive(this))promote(this,ensure(this));
  return ok;
 };
 L.prototype.reflect=function(t){const ok=pr.call(this,t);if(ok&&isActive(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const v=ps.call(this);if(J.isJoseon(this))v.joseon13=JSON.parse(JSON.stringify(ensure(this)));return v;};
 L.restore=function(data){const l=restore.call(this,data);if(l&&J.isJoseon(l))hydrate(l,data);return l;};
 Object.defineProperty(L.prototype,'__joseon13',{value:true});return true;
}
install();
return Object.freeze({EVENTS,RESULTS,SOURCES,ensure,allowed,yearly,choose,prompt,summary,hydrate,install});
});
