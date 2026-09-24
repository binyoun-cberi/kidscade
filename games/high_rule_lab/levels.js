(function(){
'use strict';
const N={
 hero:'아이', wall:'벽', rock:'돌', flag:'깃발', water:'물', lava:'용암',
 key:'열쇠', door:'문', ice:'얼음', fire:'불'
};
const P={
 YOU:'나', STOP:'막힘', PUSH:'밀림', WIN:'목표', DEFEAT:'위험',
 SINK:'가라앉음', HOT:'뜨거움', MELT:'녹음', OPEN:'열림', SHUT:'잠김', MOVE:'이동'
};
const o=(type,x,y,extra)=>Object.assign({kind:'object',type,x,y},extra||{});
const n=(type,x,y)=>({kind:'word',token:'N:'+type,x,y});
const p=(prop,x,y)=>({kind:'word',token:'P:'+prop,x,y});
const eq=(x,y)=>({kind:'word',token:'EQ',x,y});
const rule=(subject,predicate,x,y,vertical)=>{
  const a=n(subject,x,y),b=eq(x+(vertical?0:1),y+(vertical?1:0));
  const c=(P[predicate]?p(predicate,x+(vertical?0:2),y+(vertical?2:0)):n(predicate,x+(vertical?0:2),y+(vertical?2:0)));
  return [a,b,c];
};
const line=(type,x1,y1,x2,y2)=>{
  const out=[];const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);
  let x=x1,y=y1;while(true){out.push(o(type,x,y));if(x===x2&&y===y2)break;x+=dx;y+=dy}return out;
};
const box=(type,x1,y1,x2,y2)=>{
  const out=[];for(let x=x1;x<=x2;x++){out.push(o(type,x,y1));if(y2!==y1)out.push(o(type,x,y2))}
  for(let y=y1+1;y<y2;y++){out.push(o(type,x1,y));if(x2!==x1)out.push(o(type,x2,y))}return out;
};
const L=(title,chapter,objects,words,hints,note,w=10,h=9)=>({title,chapter,w,h,objects,words,hints,note});

const levels=[
L('깃발까지 가요','규칙의 문',
 [o('hero',2,5),o('flag',7,5)],
 [...rule('hero','YOU',1,1),...rule('flag','WIN',6,1)],
 ['방향키로 아이를 움직여 보세요.','깃발에 닿으면 실험 성공이에요.'],
 '문장에 적힌 내용이 정말 세상의 법칙인지 확인해 봐요.'),

L('돌을 밀어요','규칙의 문',
 [o('hero',1,5),o('rock',4,5),o('flag',8,5),...line('wall',0,4,9,4),...line('wall',0,6,9,6)],
 [...rule('hero','YOU',1,1),...rule('rock','PUSH',4,1),...rule('flag','WIN',7,2)],
 ['돌도 규칙이 있으면 움직일 수 있어요.','돌 = 밀림 문장을 확인해 보세요.'],
 '단어뿐 아니라 물건에도 여러 성질을 붙일 수 있어요.'),

L('벽의 법칙을 끊어라','법칙을 깨라',
 [o('hero',1,5),o('flag',8,5),...line('wall',5,3,5,7)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',4,1),n('wall',1,7),eq(2,7),p('STOP',3,7)],
 ['막힌 길만 보고 있지 말고 아래쪽 문장을 살펴보세요.','벽 = 막힘의 마지막 단어를 옆으로 밀 수 있어요.','문장이 끊기면 벽은 더 이상 막지 못해요.'],
 '규칙은 세 칸이 이어져 있을 때만 작동해요.'),

L('깃발도 밀 수 있어','법칙을 깨라',
 [o('hero',1,5),o('flag',7,5),o('wall',8,5),o('wall',7,4),o('wall',7,6)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',4,1),...rule('flag','PUSH',4,7)],
 ['목표도 밀리는 성질을 가질 수 있어요.','깃발을 벽에서 꺼내 보세요.'],
 '한 물체에 목표와 밀림이 동시에 붙을 수도 있어요.'),

L('나는 돌이다','나는 누구?',
 [o('hero',2,6),o('rock',7,5),o('flag',8,2),...box('wall',1,5,3,7)],
 [...rule('hero','YOU',0,1),n('rock',4,6),eq(5,6),p('YOU',6,6),...rule('flag','WIN',6,1)],
 ['아이만 조종해야 한다는 생각을 버려 보세요.','돌 = 나 문장을 완성하면 바깥의 돌을 움직일 수 있어요.'],
 '나라는 성질도 다른 물체에게 넘길 수 있어요.'),

L('둘 다 나','나는 누구?',
 [o('hero',2,6),o('rock',7,6),o('flag',8,3)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('rock','YOU',3,4)],
 ['한 번에 여러 물체가 움직여도 괜찮아요.','아이와 돌이 동시에 움직입니다.'],
 '같은 성질을 여러 종류가 함께 가질 수 있어요.'),

L('목표를 바꿔라','나는 누구?',
 [o('hero',2,5),o('rock',4,5),o('flag',8,5),...line('wall',6,3,6,7)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),n('rock',2,7),eq(3,7),p('WIN',5,7)],
 ['깃발에 꼭 갈 필요가 있을까요?','아래쪽 단어를 한 칸 밀어 돌 = 목표를 완성해 보세요.'],
 '게임의 목표 자체도 규칙일 뿐이에요.'),

L('벽이 내가 된다','나는 누구?',
 [o('hero',1,6),...line('wall',5,2,5,7),o('flag',8,3)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),n('wall',2,7),eq(3,7),p('YOU',4,7)],
 ['벽 전체를 움직일 수도 있어요.','벽 = 나를 완성한 뒤 통로를 만들어 보세요.'],
 '같은 종류의 물체는 규칙이 바뀌면 모두 함께 영향을 받아요.'),

L('돌을 물로','세상을 바꿔라',
 [o('hero',1,5),o('rock',4,5),o('rock',5,5),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),n('rock',2,7),eq(3,7),n('water',5,7)],
 ['속성 말고 다른 이름을 뒤에 붙일 수도 있어요.','돌 = 물 문장을 완성해 보세요.'],
 '이름 = 이름 문장은 물체 자체를 다른 것으로 바꿔요.'),

L('물길을 돌길로','세상을 바꿔라',
 [o('hero',1,5),...line('water',4,3,4,7),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),n('water',1,7),eq(2,7),n('rock',4,7),...rule('rock','PUSH',5,2)],
 ['물을 그대로 건널 방법만 찾지 않아도 돼요.','물 = 돌을 완성하면 물길 자체가 바뀝니다.'],
 '세상의 재료를 바꾸는 것도 하나의 해결법이에요.'),

L('불은 위험해','두 법칙',
 [o('hero',1,5),o('fire',5,5),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('fire','DEFEAT',3,2)],
 ['불을 밟으면 아이가 사라져요.','다른 길을 찾거나 위험 규칙을 끊어 보세요.'],
 '위험과 같은 규칙은 만났을 때 결과가 바로 나타나요.'),

L('돌다리 하나','두 법칙',
 [o('hero',1,5),...line('water',4,3,4,7),o('rock',2,5),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('rock','PUSH',1,7),...rule('water','SINK',4,7)],
 ['가라앉음은 다른 물체와 만나면 둘 다 사라져요.','돌을 물에 밀어 넣어 한 칸을 없애 보세요.'],
 '어떤 규칙은 없애는 것이 아니라 이용하는 편이 더 쉬워요.'),

L('얼음과 불','두 법칙',
 [o('hero',1,5),o('ice',5,5),o('fire',5,3),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('ice','MELT',0,7),...rule('fire','HOT',5,7),...rule('fire','PUSH',5,2)],
 ['녹는 것과 뜨거운 것이 만나면 하나가 사라져요.','불 = 밀림도 이용해 보세요.'],
 '두 규칙이 만날 때 생기는 반응도 퍼즐의 도구예요.'),

L('열쇠와 문','두 법칙',
 [o('hero',1,5),o('key',3,5),o('door',6,5),o('flag',8,5),...line('wall',6,3,6,4),...line('wall',6,6,6,7)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('key','OPEN',0,7),...rule('key','PUSH',4,2),...rule('door','SHUT',5,7)],
 ['열림과 잠김이 만나면 둘 다 사라져요.','열쇠를 문까지 밀어 보세요.'],
 '물건을 직접 여는 버튼 대신 규칙끼리 반응합니다.'),

L('위험도 밀어내기','규칙 연구소',
 [o('hero',1,5),o('lava',4,5),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('lava','DEFEAT',3,2),...rule('lava','PUSH',3,7)],
 ['위험한 물체도 밀림을 동시에 가질 수 있어요.','용암을 옆으로 밀어 길을 만드세요.'],
 '서로 모순처럼 보이는 성질도 함께 존재할 수 있어요.'),

L('문이 목표다','규칙 연구소',
 [o('hero',1,5),o('door',7,5),o('flag',8,2)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),n('door',2,7),eq(3,7),p('WIN',4,7)],
 ['보이는 깃발을 잊어도 돼요.','문 = 목표를 완성하세요.'],
 '눈에 보이는 목적지보다 현재의 법칙을 먼저 읽어 보세요.'),

L('돌이 아이가 되고','규칙 연구소',
 [o('hero',1,6),o('rock',7,6),o('flag',8,2),...box('wall',0,5,3,8)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),n('rock',4,6),eq(5,6),p('YOU',6,6),...rule('rock','PUSH',4,3)],
 ['갇힌 아이를 꼭 꺼낼 필요는 없어요.','돌 = 나를 완성하면 바깥에서 새 주인공이 생겨요.'],
 '풀 수 없는 캐릭터 대신 다른 물체를 플레이어로 만들 수 있어요.'),

L('목표가 나','규칙 연구소',
 [o('hero',1,5),o('flag',7,5)],
 [...rule('hero','YOU',0,1),n('flag',4,1),eq(5,1),p('WIN',6,1),n('flag',2,7),eq(3,7),p('YOU',4,7)],
 ['깃발에 나를 붙이면 무슨 일이 생길까요?','깃발 = 나를 완성한 뒤 두 플레이어를 만나게 해 보세요.'],
 '나와 목표는 같은 종류에 동시에 붙을 수도 있어요.'),

L('규칙 세탁기','금지된 실험',
 [o('hero',1,5),o('rock',4,5),o('water',6,5),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('rock','PUSH',0,7),n('rock',4,7),eq(5,7),n('water',7,7)],
 ['돌을 그냥 밀기만 할 필요는 없어요.','돌 = 물을 만들면 길의 상태가 달라집니다.'],
 '한 퍼즐 안에서 속성 규칙과 변환 규칙을 함께 써 보세요.'),

L('법칙 없는 벽','금지된 실험',
 [o('hero',1,5),...line('wall',5,2,5,7),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),n('wall',1,7),eq(2,7),p('STOP',3,7),...rule('wall','PUSH',6,7)],
 ['벽은 막힘이면서 밀림이에요.','막힘 문장을 먼저 끊으면 거대한 벽도 밀 수 있어요.'],
 '어떤 규칙을 남기고 어떤 규칙을 없앨지 순서가 중요해져요.'),

L('불을 물로','금지된 실험',
 [o('hero',1,5),...line('fire',5,3,5,7),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('fire','DEFEAT',0,7),n('fire',4,7),eq(5,7),n('water',7,7)],
 ['위험 규칙을 끊는 것 말고 더 큰 변화도 가능해요.','불 = 물을 완성해 보세요.'],
 '물체의 정체성을 바꾸면 붙어 있던 속성 규칙도 달라져요.'),

L('열쇠가 목표','금지된 실험',
 [o('hero',1,6),o('key',4,6),o('door',7,6),o('flag',8,2)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('key','PUSH',0,7),n('key',4,7),eq(5,7),p('WIN',6,7),...rule('door','STOP',4,3)],
 ['문을 꼭 열 필요는 없습니다.','열쇠 = 목표를 완성하고 열쇠에 닿아 보세요.'],
 '문제가 요구하는 것처럼 보이는 행동도 규칙을 바꾸면 필요 없어져요.'),

L('세상의 주인은 누구','금지된 실험',
 [o('hero',1,6),o('rock',4,6),o('water',7,6),o('flag',8,2)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),n('rock',2,7),eq(3,7),p('YOU',4,7),n('water',6,7),eq(7,7),p('YOU',8,7)],
 ['하나의 주인공만 고집하지 마세요.','돌과 물 모두 나로 만들 수 있어요.'],
 '규칙이 허용하면 세상 전체가 플레이어가 될 수도 있어요.'),

L('마지막 실험','금지된 실험',
 [o('hero',1,6),o('rock',3,6),...line('wall',5,2,5,7),o('flag',8,5)],
 [...rule('hero','YOU',0,1),...rule('flag','WIN',6,1),...rule('rock','PUSH',0,7),n('wall',4,7),eq(5,7),p('STOP',6,7),n('rock',2,3),eq(3,3),p('WIN',4,3)],
 ['깃발이 벽 너머에 있어도 다른 목표를 만들 수 있어요.','돌 = 목표를 이용하면 벽을 넘지 않아도 됩니다.','마지막에는 무엇이 목표인지부터 의심해 보세요.'],
 '규칙을 읽고, 부수고, 새로 만드는 것이 이 연구소의 진짜 이동 방법이에요.')
];

window.RuleLabData={levels,N,P};
})();