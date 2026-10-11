/* O T A — beginner guidance with contextual, non-spoiler hints.
   Pure rules: no timers, DOM, or rendering dependency. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaGuide=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const defaultHints=Object.freeze({
    console:[
      '관리실 가까이에 노란 글씨의 「컴퓨터」가 있습니다.',
      '컴퓨터 앞에 다가가 조사(E 또는 조사 버튼)를 누르세요.',
      '시작 지점 왼쪽의 책상에 있는 컴퓨터를 먼저 조사해야 진행됩니다.'
    ],
    anomaly:[
      '복도 안쪽에 평범하지 않은 글자가 보입니다.',
      '이상한 「사람」을 확인하려면 복도 안쪽으로 걸어가세요.',
      '앞으로 이동하면 사건이 시작됩니다. 달리기와 숨기를 준비하세요.'
    ],
    chase:[
      '복도의 존재는 달려오는 당신을 쫓습니다.',
      '달리기(Shift 또는 달리기 버튼)로 거리를 벌린 뒤 사물함으로 가세요.',
      '복도 오른쪽, 깊숙한 곳에 「사물함」이 있습니다. 가까이 가서 조사하세요.'
    ],
    hiding:[
      '사물함 안에서는 움직이지 않아도 됩니다.',
      '발소리가 멀어질 때까지 기다리세요.',
      '주변이 조용해지면 조사(E 또는 조사 버튼)로 사물함에서 나오세요.'
    ],
    distortion:[
      '길을 막은 글자가 실제 공간과 맞지 않습니다.',
      '붉은 「막힘」을 조사해 바른 이름을 찾아보세요.',
      '두 장소를 이어 주는 길의 이름은 「통로」입니다.'
    ],
    door:[
      '빨간 「뒤」가 나타날 때 달리면 위험합니다.',
      '걷거나 멈추면 위험도가 내려갑니다. 복도의 막힌 출구를 조사하세요.',
      '붉은 「벽」이 사실은 열고 닫을 수 있는 「문」입니다.'
    ],
    exit:[
      '복도를 계속 지나면 다음 기록보관 구역이 나타납니다.',
      '빨간 「뒤」가 보이면 달리지 말고 걸으세요.',
      '앞쪽의 「제2구역」으로 이동하면 사무실과 서고가 나옵니다.'
    ],
    hub:[
      '사무실과 서고에는 서로 다른 기록이 있습니다.',
      '왼쪽의 「사무실」에서 기록 A, 오른쪽의 「서고」에서 기록 B를 찾으세요.',
      '떠 있는 「핵심 오타」를 조사해 5개를 고치세요. 방치하면 교정자가 나타납니다.'
    ],
    office:[
      '사무실에는 이름을 잘못 붙인 사물이 있습니다.',
      '방 안쪽 붉은 「벽」을 조사하고, 벽 근처의 기록을 비교하세요.',
      '이름이 틀린 사물은 「책상」입니다. 바꾼 뒤 열린 공간으로 들어가세요.'
    ],
    officeRecord:[
      '사무실에서 잘못된 이름을 고쳤습니다.',
      '열린 공간 안쪽에서 빛나는 「기록 A」를 찾으세요.',
      '사무실의 안쪽 왼편에 있는 기록 A에 다가가 조사하면 됩니다.'
    ],
    archive:[
      '서고의 기록 B는 아직 봉인되어 있습니다.',
      '「사람」이라는 글자를 잠깐 본 다음 시선을 돌리세요. 글자가 하나씩 드러납니다.',
      '「사람」을 약 1초 바라본 뒤 약 1초간 고개를 돌리는 일을 세 번 반복하세요. 계속 보면 위험합니다.'
    ],
    archiveDeciphered:[
      '서고의 글자 세 조각을 모두 읽었습니다.',
      '서고 안쪽의 「기록 B」를 찾으세요.',
      '서고 오른쪽 뒤편에서 반짝이는 기록 B에 다가가 조사하세요.'
    ],
    finalGate:[
      '기록 A·B와 핵심 오타 5개를 모두 복구해야 합니다.',
      '사무실과 서고 사이의 중앙 복도 끝으로 가세요.',
      '붉은 「봉인」을 조사하세요. 사라진 이름의 답은 「기억」입니다.'
    ],
    final:[
      '중앙 기록실의 문이 열렸습니다.',
      '더 깊이 들어가 「나」라고 적힌 글자를 찾으세요.',
      '열린 중앙 통로를 따라 끝까지 앞으로 이동하면 탈출합니다.'
    ]
  });
  const firstCues=Object.freeze({
    chase:'도망쳐! 달려서 「사물함」 안에 숨으세요.',
    hiding:'잘했어요. 움직이지 말고 발소리가 멀어질 때까지 기다리세요.',
    distortion:'사라진 길을 되찾으세요. 붉은 글자의 이름이 틀렸습니다.',
    door:'빨간 「뒤」가 보이면 뛰지 마세요. 걷거나 멈추세요.',
    explore:'잘못된 기록을 조사해 맞춤법을 고치세요. 오타가 쌓이면 교정자가 나타납니다.',
    final:'교정자가 뒤따라옵니다. 안쪽의 「나」로 달리세요.'
  });
  function scope(s,p){
    if(s.stage==='final')return 'final';
    if(s.stage!=='explore')return defaultHints[s.stage]?s.stage:'console';
    const c=s.chapter3||{officeFixed:false,records:{office:false,archive:false},cipher:{fragments:0}};
    if(c.records.office&&c.records.archive)return 'finalGate';
    if(p&&p.x>3.5&&p.x<15.3&&p.z< -39&&p.z> -55.6&&!c.records.archive)
      return c.cipher.fragments>=3?'archiveDeciphered':'archive';
    if(p&&p.x< -3.5&&p.x> -15.3&&p.z< -39&&p.z> -55.6&&!c.records.office)
      return c.officeFixed?'officeRecord':'office';
    return 'hub';
  }
  function hints(s,p){
    if(scope(s,p)==='finalGate'&&s.literacy&&s.literacy.coreDone<5)return [
      '기록 A·B는 찾았지만 핵심 오타 '+(5-s.literacy.coreDone)+'개가 남았습니다.',
      '복도·사무실·서고에서 「핵심 오타 · 조사」를 찾아 글자를 고치세요.',
      '중앙 복도 2곳, 사무실 2곳, 서고 1곳의 잘못된 기록을 모두 고쳐야 봉인이 열립니다.'
    ];
    return defaultHints[scope(s,p)]||defaultHints.hub;
  }
  function hint(s,p,level){const h=hints(s,p);return h[Math.min(Math.max(0,(level|0)-1),h.length-1)];}
  function cue(stage){return firstCues[stage]||null;}
  function failure(s){
    if(s.lossReason==='corrector')return {
      title:'교정자가 당신의 이름을 찾아냈습니다.',
      detail:'붉은 단어가 가까워지면 시선을 끊고 은신처로 이동하세요. 마지막 기록실에서는 「나」까지 달려야 합니다.'
    };
    if(s.lossReason==='watcher')return {
      title:'오래 바라보면 따라옵니다.',
      detail:'「사람」을 짧게 읽고 시선을 돌리세요. 세 번 반복하면 기록을 해독할 수 있습니다.'
    };
    if(s.echo?.alert>=100)return {
      title:'빨간 「뒤」가 뛰는 소리를 들었습니다.',
      detail:'붉은 글자가 나타나면 걷거나 멈추세요. 위험도가 줄어든 뒤 이동하면 됩니다.'
    };
    return {
      title:'사물함에 숨기 전에 붙잡혔습니다.',
      detail:'추격을 시작하면 달려서 거리를 벌리고, 「사물함」 가까이에서 조사 버튼을 누르세요.'
    };
  }
  return Object.freeze({scope,hints,hint,cue,failure});
});
