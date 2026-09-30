'use strict';
window.EMERGENCY_SCENARIOS=[
  {
    "id": 1,
    "title": "교실에 연기가 난다!",
    "prompt": "지금 가장 먼저 할 행동은?",
    "domain": "화재",
    "scene": "classroomFire",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "몸을 낮추고 안전한 비상구로 대피한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "책가방부터 챙긴다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "창문을 열고 연기를 구경한다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "엘리베이터를 찾는다.",
        "correct": false
      }
    ],
    "rationale": "연기가 있는 화재에서는 자세를 낮추고 안전한 피난 경로로 대피하는 것이 우선이다."
  },
  {
    "id": 2,
    "title": "복도에 짙은 연기!",
    "prompt": "앞쪽 복도가 연기로 가득하다. 어떻게 할까?",
    "domain": "화재",
    "scene": "schoolFire",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "연기 속으로 들어가지 않고 다른 안전한 피난 경로를 찾거나 도움을 요청한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "숨을 참고 그대로 뛰어간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "친구를 따라 연기 속으로 들어간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "물건을 챙기러 교실로 돌아간다.",
        "correct": false
      }
    ],
    "rationale": "짙은 연기 속으로 무리하게 진입하지 말고 안전한 피난 경로를 이용해야 한다."
  },
  {
    "id": 3,
    "title": "화재 중 엘리베이터",
    "prompt": "아래층으로 내려가야 한다.",
    "domain": "화재",
    "scene": "stairs",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "비상계단을 이용한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "엘리베이터를 탄다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "화장실에 숨는다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "교실에 앉아 기다린다.",
        "correct": false
      }
    ],
    "rationale": "화재 때 승강기는 정전이나 연기 유입 위험이 있어 일반 대피에 사용하지 않는다."
  },
  {
    "id": 4,
    "title": "가방을 두고 왔다!",
    "prompt": "대피 중 가방이 생각났다.",
    "domain": "화재",
    "scene": "schoolFire",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "돌아가지 않고 계속 대피한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "교실로 뛰어가 가방을 가져온다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "친구에게 대신 가져오라고 한다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "불이 작아 보이면 잠깐 들어간다.",
        "correct": false
      }
    ],
    "rationale": "화재 대피에서는 물건보다 생명이 우선이며 안전한 곳으로 나온 뒤 다시 들어가지 않는다."
  },
  {
    "id": 5,
    "title": "옷에 불이 붙었다!",
    "prompt": "친구 옷에 불이 붙었다.",
    "domain": "화재",
    "scene": "personFire",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "멈추고 바닥에 엎드린 뒤 몸을 굴려 불을 끈다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "불이 붙은 채로 빨리 달린다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "엘리베이터로 뛰어간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "옷 위에 종이를 덮는다.",
        "correct": false
      }
    ],
    "rationale": "달리면 불길이 커질 수 있다. 멈추고 엎드려 구르며 불을 끄는 행동을 익힌다."
  },
  {
    "id": 6,
    "title": "화재경보가 울린다",
    "prompt": "연기 냄새가 나고 경보가 울렸다.",
    "domain": "화재",
    "scene": "homeFire",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "안전한 피난 경로로 즉시 대피하고 119에 알린다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "침대 밑에 숨는다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "불이 보일 때까지 기다린다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "휴대폰으로 영상을 찍는다.",
        "correct": false
      }
    ],
    "rationale": "화재를 인지하면 숨거나 구경하지 말고 안전한 장소로 대피한 뒤 신고한다."
  },
  {
    "id": 7,
    "title": "프라이팬에 불!",
    "prompt": "기름이 있는 프라이팬에서 불길이 올라온다.",
    "domain": "화재",
    "scene": "kitchenFire",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "물을 붓지 말고 멀어져 어른에게 알리며 필요하면 대피한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "찬물을 한 컵 붓는다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "팬을 들고 밖으로 뛰어간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "수건으로 세게 휘젓는다.",
        "correct": false
      }
    ],
    "rationale": "기름 화재에 물을 붓는 행동은 불길을 크게 튀게 할 수 있다. 학생은 직접 진압보다 안전거리와 도움 요청이 우선이다."
  },
  {
    "id": 8,
    "title": "콘센트에서 불꽃!",
    "prompt": "콘센트에서 타는 냄새와 불꽃이 난다.",
    "domain": "전기",
    "scene": "electric",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "손대지 않고 어른에게 알려 전원을 차단하게 하고 안전거리로 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "젖은 손으로 플러그를 뽑는다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "물을 뿌린다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "금속 물건으로 콘센트를 건드린다.",
        "correct": false
      }
    ],
    "rationale": "전기 위험에는 물이나 젖은 손으로 접근하지 말고 전원 차단과 도움 요청이 우선이다."
  },
  {
    "id": 9,
    "title": "가스 냄새가 난다",
    "prompt": "주방에서 강한 가스 냄새가 난다.",
    "domain": "생활안전",
    "scene": "kitchen",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "전기 스위치를 조작하지 말고 밖으로 이동해 어른에게 알린다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "불을 켜 어디서 새는지 찾는다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "전등을 켰다 껐다 해 본다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "냄새가 사라지는지 계속 안에서 기다린다.",
        "correct": false
      }
    ],
    "rationale": "가스가 의심될 때 불꽃과 전기 스위치 조작은 피하고 안전한 곳으로 이동해 도움을 요청한다."
  },
  {
    "id": 10,
    "title": "전기제품에 불이 났다",
    "prompt": "전기제품에서 연기와 불꽃이 난다.",
    "domain": "전기",
    "scene": "electricFire",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "물을 붓지 말고 떨어져서 어른에게 알리고 대피한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "물통을 가져와 붓는다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "맨손으로 코드를 잡아 뽑는다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "가까이에서 냄새를 맡는다.",
        "correct": false
      }
    ],
    "rationale": "전기가 연결된 화재에 물을 사용하는 것은 감전 위험이 있다."
  },
  {
    "id": 11,
    "title": "지진! 교실이 흔들린다",
    "prompt": "흔들림이 시작됐다.",
    "domain": "지진",
    "scene": "earthquakeClass",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "튼튼한 책상 아래로 들어가 몸과 머리를 보호한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "바로 계단으로 전력질주한다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "창가에 서서 밖을 본다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "책장을 붙잡는다.",
        "correct": false
      }
    ],
    "rationale": "강한 흔들림 동안에는 낙하물과 유리창을 피해 몸과 머리를 보호한다."
  },
  {
    "id": 12,
    "title": "지진 중 창가",
    "prompt": "유리창이 크게 흔들리고 있다.",
    "domain": "지진",
    "scene": "earthquakeWindow",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "유리창에서 떨어져 몸을 보호한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "창문을 열어 본다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "유리창을 손으로 붙잡는다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "창가에 서서 밖을 촬영한다.",
        "correct": false
      }
    ],
    "rationale": "지진 때 유리창과 넘어질 수 있는 가구 주변은 위험하다."
  },
  {
    "id": 13,
    "title": "지진 중 대피문이 보인다",
    "prompt": "아직 강하게 흔들리고 있다.",
    "domain": "지진",
    "scene": "earthquakeClass",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "흔들림 동안 몸을 보호하고, 흔들림이 멈춘 뒤 안전하게 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "사람들을 밀치며 바로 뛰어나간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "엘리베이터를 부른다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "창문으로 뛰어내린다.",
        "correct": false
      }
    ],
    "rationale": "흔들림 중 무리한 이동은 낙상과 낙하물 위험을 키울 수 있다."
  },
  {
    "id": 14,
    "title": "밖에서 지진!",
    "prompt": "간판과 유리창이 흔들린다.",
    "domain": "지진",
    "scene": "earthquakeStreet",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "건물·담장·간판에서 떨어진 넓은 곳으로 이동해 머리를 보호한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "건물 벽 바로 아래에 붙는다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "유리창 아래에 숨는다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "전봇대를 붙잡는다.",
        "correct": false
      }
    ],
    "rationale": "옥외에서는 낙하물과 무너질 수 있는 구조물에서 떨어지는 것이 중요하다."
  },
  {
    "id": 15,
    "title": "지진 뒤 이동",
    "prompt": "흔들림이 멈췄고 아래층으로 내려가야 한다.",
    "domain": "지진",
    "scene": "stairs",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "엘리베이터 대신 계단으로 침착하게 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "엘리베이터를 탄다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "난간을 타고 내려간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "혼자 뛰어내려간다.",
        "correct": false
      }
    ],
    "rationale": "지진 뒤 승강기는 정전이나 고장 위험이 있어 계단을 이용하는 것이 안전하다."
  },
  {
    "id": 16,
    "title": "태풍이 온다",
    "prompt": "창문이 심하게 흔들린다.",
    "domain": "기상",
    "scene": "stormHome",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "창문에서 떨어진 안전한 실내에 머문다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "창문에 얼굴을 가까이 댄다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "밖에 나가 바람을 확인한다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "베란다 난간을 붙잡는다.",
        "correct": false
      }
    ],
    "rationale": "강풍 때는 창문 파손과 비산물 위험이 있으므로 창문에서 떨어진다."
  },
  {
    "id": 17,
    "title": "운동장에서 번개!",
    "prompt": "천둥과 번개가 가까워진다.",
    "domain": "기상",
    "scene": "lightning",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "운동을 멈추고 안전한 건물 안으로 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "큰 나무 바로 밑에 선다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "우산을 높이 들고 계속 걷는다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "철제 골대 옆에 숨는다.",
        "correct": false
      }
    ],
    "rationale": "낙뢰 때는 개방된 장소와 큰 나무·금속 구조물 주변을 피하고 건물 안으로 이동한다."
  },
  {
    "id": 18,
    "title": "계곡물이 갑자기 불어난다",
    "prompt": "비가 오며 물살이 빨라진다.",
    "domain": "호우",
    "scene": "river",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "계곡과 하천에서 즉시 벗어나 높은 안전한 곳으로 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "물이 얼마나 깊은지 들어가 본다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "돌 위를 뛰어 건넌다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "사진을 찍으며 가까이 간다.",
        "correct": false
      }
    ],
    "rationale": "호우 때 하천·계곡은 급류 위험이 있으므로 가까이 가지 않고 안전한 곳으로 대피한다."
  },
  {
    "id": 19,
    "title": "도로가 물에 잠겼다",
    "prompt": "앞 도로에 물이 흐르고 깊이를 알 수 없다.",
    "domain": "호우",
    "scene": "floodRoad",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "건너지 않고 다른 안전한 길을 찾거나 도움을 요청한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "발목 정도로 보여서 걸어간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "자전거로 빠르게 통과한다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "친구 손을 잡고 시험 삼아 들어간다.",
        "correct": false
      }
    ],
    "rationale": "침수 도로는 깊이와 파손 여부를 알기 어렵기 때문에 무리하게 건너지 않는다."
  },
  {
    "id": 20,
    "title": "지하주차장에 물이 들어온다",
    "prompt": "물이 빠르게 차오르기 시작했다.",
    "domain": "호우",
    "scene": "floodGarage",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "차나 물건을 챙기기보다 즉시 지상 안전한 곳으로 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "차를 먼저 옮기러 들어간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "물높이를 재러 내려간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "지하에서 기다린다.",
        "correct": false
      }
    ],
    "rationale": "지하 공간 침수는 빠르게 위험해질 수 있어 조기 대피가 중요하다."
  },
  {
    "id": 21,
    "title": "친구가 더위에 어지럽다",
    "prompt": "더운 날 친구가 어지럽고 힘들어한다.",
    "domain": "온열질환",
    "scene": "heat",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "시원한 곳으로 옮기고 주변 어른에게 즉시 알린다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "계속 뛰게 해 땀을 더 낸다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "두꺼운 옷을 입힌다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "햇볕 아래 눕힌다.",
        "correct": false
      }
    ],
    "rationale": "온열질환이 의심되면 더위를 피하고 빠르게 도움을 요청해야 한다."
  },
  {
    "id": 22,
    "title": "젖은 옷에 몸을 떤다",
    "prompt": "추운 날 물에 젖은 친구가 심하게 떤다.",
    "domain": "저체온",
    "scene": "cold",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "바람을 피하고 젖은 옷을 벗길 수 있으면 마른 옷·담요로 따뜻하게 하며 도움을 요청한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "찬물로 씻긴다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "계속 밖에서 걷게 한다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "젖은 옷 그대로 바람을 맞힌다.",
        "correct": false
      }
    ],
    "rationale": "저체온 위험에서는 추가 열손실을 줄이고 안전하게 보온하며 도움을 요청한다."
  },
  {
    "id": 23,
    "title": "빨간불 횡단보도",
    "prompt": "차가 안 보이지만 신호가 빨간색이다.",
    "domain": "교통",
    "scene": "crosswalk",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "보도에서 기다린다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "차가 없으니 뛰어간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "친구가 가면 따라간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "도로 중간까지 나가 본다.",
        "correct": false
      }
    ],
    "rationale": "차가 안 보이더라도 보행신호와 안전 확인을 지킨다."
  },
  {
    "id": 24,
    "title": "초록불인데 차가 돈다",
    "prompt": "보행신호는 초록색인데 우회전 차량이 다가온다.",
    "domain": "교통",
    "scene": "crosswalkCar",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "멈춰 차량이 서는지 확인한 뒤 건넌다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "초록불이니 차를 보지 않고 뛴다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "차 앞을 가로막는다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "휴대폰만 보며 걷는다.",
        "correct": false
      }
    ],
    "rationale": "보행신호가 켜져도 차량 움직임을 확인하고 안전하게 건넌다."
  },
  {
    "id": 25,
    "title": "공이 도로로 굴러갔다",
    "prompt": "공이 차도로 굴러갔다.",
    "domain": "교통",
    "scene": "roadBall",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "도로로 뛰어들지 않고 어른에게 도움을 요청한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "공부터 빨리 잡으러 뛴다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "주차된 차 사이로 들어간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "친구를 도로로 보낸다.",
        "correct": false
      }
    ],
    "rationale": "물건보다 사람이 우선이다. 갑자기 차도로 뛰어드는 행동을 피한다."
  },
  {
    "id": 26,
    "title": "주차된 차 사이",
    "prompt": "길을 건너려는데 양옆에 큰 차가 서 있다.",
    "domain": "교통",
    "scene": "parkedCars",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "운전자에게 잘 보이는 횡단보도나 안전한 곳으로 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "차 사이에서 바로 튀어나간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "차 밑으로 도로를 확인한다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "눈을 감고 빨리 뛴다.",
        "correct": false
      }
    ],
    "rationale": "주차 차량 사이에서는 보행자와 운전자가 서로 보기 어렵다."
  },
  {
    "id": 27,
    "title": "자전거를 타자!",
    "prompt": "친구가 헬멧 없이 출발하려 한다.",
    "domain": "교통",
    "scene": "bike",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "헬멧을 제대로 착용한 뒤 탄다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "가까운 거리라 그냥 탄다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "헬멧을 손에 들고 탄다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "후드만 뒤집어쓴다.",
        "correct": false
      }
    ],
    "rationale": "자전거에서는 머리 보호를 위해 헬멧을 올바르게 착용한다."
  },
  {
    "id": 28,
    "title": "버스가 들어온다",
    "prompt": "버스가 정류장에 아직 완전히 멈추지 않았다.",
    "domain": "교통",
    "scene": "busStop",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "인도 안전선 안쪽에서 완전히 정차할 때까지 기다린다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "움직이는 버스로 뛰어간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "차도로 내려가 손을 흔든다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "버스 옆을 따라 달린다.",
        "correct": false
      }
    ],
    "rationale": "버스가 완전히 멈추기 전 차도로 접근하지 않는다."
  },
  {
    "id": 29,
    "title": "차 문을 열기 전",
    "prompt": "도로 쪽 문으로 내리려는데 뒤에서 자전거가 온다.",
    "domain": "교통",
    "scene": "carDoor",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "뒤를 확인하고 자전거가 지나간 뒤 안전하게 문을 연다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "확인 없이 바로 문을 연다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "문을 조금 열어 자전거를 멈춘다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "갑자기 차도로 뛰어내린다.",
        "correct": false
      }
    ],
    "rationale": "차 문을 열기 전 뒤에서 오는 자전거·오토바이·차량을 확인한다."
  },
  {
    "id": 30,
    "title": "철도 건널목",
    "prompt": "차단기가 내려가고 경보음이 울린다.",
    "domain": "교통",
    "scene": "rail",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "정지선 밖에서 열차가 지나갈 때까지 기다린다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "차단기 밑으로 숙여 건넌다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "열차보다 빨리 뛰어간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "선로 위에서 사진을 찍는다.",
        "correct": false
      }
    ],
    "rationale": "차단기가 내려간 철도 건널목에는 절대로 진입하지 않는다."
  },
  {
    "id": 31,
    "title": "주차장에서 후진차",
    "prompt": "후진등이 켜진 차가 움직이기 시작한다.",
    "domain": "교통",
    "scene": "parking",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "차의 진행 방향에서 벗어나 안전한 곳으로 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "차 뒤를 빠르게 지나간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "차 바로 뒤에 서서 손을 흔든다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "운전자가 알아서 멈출 거라 생각하고 걷는다.",
        "correct": false
      }
    ],
    "rationale": "주차장에서는 후진 차량의 사각지대를 피하고 충분히 떨어진다."
  },
  {
    "id": 32,
    "title": "자동차 출발 전",
    "prompt": "짧은 거리라며 안전벨트를 안 하려 한다.",
    "domain": "교통",
    "scene": "carSeat",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "출발 전에 안전벨트를 착용한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "뒷자리면 안 해도 된다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "천천히 가면 안 해도 된다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "손으로 의자를 잡으면 된다.",
        "correct": false
      }
    ],
    "rationale": "짧은 거리와 좌석 위치에 관계없이 안전벨트를 착용한다."
  },
  {
    "id": 33,
    "title": "친구가 물에 빠졌다!",
    "prompt": "나는 수영을 조금 할 줄 안다.",
    "domain": "물놀이",
    "scene": "waterRescue",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "직접 뛰어들지 말고 큰 소리로 도움을 요청하고 119 신고를 부탁한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "바로 물속으로 뛰어든다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "혼자 헤엄쳐 구조한다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "친구를 보며 기다리기만 한다.",
        "correct": false
      }
    ],
    "rationale": "훈련받지 않은 사람이 직접 물에 들어가면 함께 위험해질 수 있다. 먼저 구조 요청을 한다."
  },
  {
    "id": 34,
    "title": "뜰 수 있는 물건이 있다",
    "prompt": "물에 빠진 사람 가까이에 구명환이 있다.",
    "domain": "물놀이",
    "scene": "waterRescue",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "안전한 곳에서 구명환처럼 뜨는 물건을 던져 준다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "구명환을 들고 물에 뛰어든다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "돌을 던져 위치를 알려준다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "물건을 멀리 치운다.",
        "correct": false
      }
    ],
    "rationale": "자신의 안전을 확보한 상태에서 뜨는 구조물품을 전달한다."
  },
  {
    "id": 35,
    "title": "깊은 물로 가자!",
    "prompt": "친구가 안전구역 밖 깊은 곳으로 가자고 한다.",
    "domain": "물놀이",
    "scene": "water",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "정해진 안전구역 안에 머문다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "친구를 따라간다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "몰래 잠수해서 넘어간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "안전요원 몰래 먼 곳까지 헤엄친다.",
        "correct": false
      }
    ],
    "rationale": "물놀이는 지정된 안전구역과 안전요원의 안내를 지킨다."
  },
  {
    "id": 36,
    "title": "계곡물이 빨라졌다",
    "prompt": "비가 오지 않는 것 같은데 물이 갑자기 불어난다.",
    "domain": "물놀이",
    "scene": "river",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "즉시 물가에서 벗어나 높은 안전한 곳으로 이동한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "조금 더 놀다가 나온다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "물살을 건너 반대편으로 간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "신발을 찾으러 다시 물가로 간다.",
        "correct": false
      }
    ],
    "rationale": "상류의 비로 계곡물이 갑자기 불어날 수 있어 즉시 벗어나는 것이 중요하다."
  },
  {
    "id": 37,
    "title": "얼어붙은 하천",
    "prompt": "친구가 얼음 위로 올라가 보자고 한다.",
    "domain": "겨울",
    "scene": "ice",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "얼음 위에 올라가지 않고 안전한 곳에 머문다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "두꺼워 보이는 곳만 밟는다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "친구가 먼저 가면 따라간다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "돌을 던져 안 깨지면 올라간다.",
        "correct": false
      }
    ],
    "rationale": "자연 상태의 얼음은 두께와 강도를 눈으로 확실히 판단하기 어렵다."
  },
  {
    "id": 38,
    "title": "사람이 쓰러졌다!",
    "prompt": "반응이 없고 숨을 쉬지 않거나 비정상적인 호흡을 한다.",
    "domain": "응급처치",
    "scene": "cpr",
    "mode": "sequence",
    "seconds": 18,
    "steps": [
      {
        "prompt": "첫 행동은?",
        "options": [
          {
            "label": "주변 사람에게 119 신고와 AED를 요청한다.",
            "correct": true
          },
          {
            "label": "물을 마시게 한다.",
            "correct": false
          },
          {
            "label": "일으켜 세워 걷게 한다.",
            "correct": false
          },
          {
            "label": "10분 동안 그냥 지켜본다.",
            "correct": false
          }
        ]
      },
      {
        "prompt": "신고와 AED 요청 뒤에는?",
        "options": [
          {
            "label": "즉시 가슴압박을 시작한다.",
            "correct": true
          },
          {
            "label": "맥박을 오래 찾는다.",
            "correct": false
          },
          {
            "label": "배를 눌러 본다.",
            "correct": false
          },
          {
            "label": "얼굴에 물을 뿌린다.",
            "correct": false
          }
        ]
      },
      {
        "prompt": "가슴압박 위치는?",
        "options": [
          {
            "label": "가슴 중앙, 흉골 아래쪽 절반",
            "correct": true
          },
          {
            "label": "배꼽 바로 위",
            "correct": false
          },
          {
            "label": "왼쪽 갈비뼈 끝",
            "correct": false
          },
          {
            "label": "목 아래",
            "correct": false
          }
        ]
      }
    ],
    "rationale": "반응이 없고 호흡이 없거나 비정상적이면 119와 AED를 요청하고 지체 없이 가슴압박을 시작한다.",
    "source": "질병관리청 2025 한국 심폐소생술 가이드라인"
  },
  {
    "id": 39,
    "title": "CPR 손 위치",
    "prompt": "가슴압박을 어디에 해야 할까?",
    "domain": "응급처치",
    "scene": "cpr",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "가슴 중앙의 흉골 아래쪽 절반",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "왼쪽 가슴 끝",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "명치 아래 배",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "목과 어깨 사이",
        "correct": false
      }
    ],
    "rationale": "성인 가슴압박은 가슴 중앙의 흉골 아래쪽 절반에 손을 둔다.",
    "source": "질병관리청 2025 한국 심폐소생술 가이드라인"
  },
  {
    "id": 40,
    "title": "CPR 리듬!",
    "prompt": "가슴압박 속도를 맞춰라.",
    "domain": "응급처치",
    "scene": "cpr",
    "mode": "rhythm",
    "seconds": 14,
    "targetBpm": [
      100,
      120
    ],
    "presses": 16,
    "rationale": "성인 가슴압박 권장 속도는 분당 100~120회이며 약 5cm 깊이로 충분히 이완되게 시행한다.",
    "source": "질병관리청 2025 한국 심폐소생술 가이드라인"
  },
  {
    "id": 41,
    "title": "AED가 도착했다",
    "prompt": "자동심장충격기를 가져왔다.",
    "domain": "응급처치",
    "scene": "aed",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "전원을 켜고 기기의 음성 지시를 따른다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "환자 머리맡에 놓고 기다린다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "패드를 옷 위에 붙인다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "전원을 켜지 않고 충격 버튼부터 누른다.",
        "correct": false
      }
    ],
    "rationale": "AED는 전원을 켜고 음성 안내에 따라 패드를 부착하고 사용한다.",
    "source": "질병관리청 국가건강정보포털"
  },
  {
    "id": 42,
    "title": "AED 패드 위치",
    "prompt": "성인에게 패드를 붙인다.",
    "domain": "응급처치",
    "scene": "aed",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "오른쪽 빗장뼈 아래와 왼쪽 가슴 아래 옆쪽",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "두 패드를 배에 나란히 붙인다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "두 패드를 같은 쪽 가슴에 붙인다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "두 패드를 옷 위에 붙인다.",
        "correct": false
      }
    ],
    "rationale": "AED 패드는 서로 겹치지 않도록 안내된 위치에 피부에 직접 부착한다.",
    "source": "질병관리청 국가건강정보포털"
  },
  {
    "id": 43,
    "title": "AED가 분석 중!",
    "prompt": "기계가 '환자에게서 떨어지세요'라고 말한다.",
    "domain": "응급처치",
    "scene": "aed",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "모두 환자에게서 손을 뗀다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "가슴압박을 계속한다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "환자를 흔든다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "패드를 떼어 낸다.",
        "correct": false
      }
    ],
    "rationale": "심장리듬 분석과 충격 시에는 누구도 환자에게 접촉하지 않아야 한다.",
    "source": "질병관리청 국가건강정보포털"
  },
  {
    "id": 44,
    "title": "AED 충격 직후",
    "prompt": "AED가 충격을 시행했다.",
    "domain": "응급처치",
    "scene": "aed",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "즉시 가슴압박을 다시 시작한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "5분 동안 기다린다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "패드를 바로 떼어 낸다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "환자를 일으켜 세운다.",
        "correct": false
      }
    ],
    "rationale": "충격 직후에는 지체하지 말고 가슴압박을 재개한다.",
    "source": "질병관리청 국가건강정보포털"
  },
  {
    "id": 45,
    "title": "음식 먹다 기침!",
    "prompt": "친구가 크게 기침할 수 있고 말도 할 수 있다.",
    "domain": "기도폐쇄",
    "scene": "choking",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "스스로 강하게 기침하도록 격려하며 상태를 살핀다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "바로 복부를 세게 누른다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "물을 억지로 마시게 한다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "입 안을 손가락으로 훑는다.",
        "correct": false
      }
    ],
    "rationale": "효과적으로 기침할 수 있는 가벼운 기도폐쇄에서는 자발적인 기침을 방해하지 않는다.",
    "source": "질병관리청 국가건강정보포털"
  },
  {
    "id": 46,
    "title": "숨을 못 쉬는 친구",
    "prompt": "말하거나 기침을 제대로 못 하는 1세 이상 친구다.",
    "domain": "기도폐쇄",
    "scene": "choking",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "119 신고를 부탁하고 등 두드리기 5회를 시행한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "물을 억지로 먹인다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "입 안을 보지 않고 손가락으로 훑는다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "바닥에 눕혀 기다린다.",
        "correct": false
      }
    ],
    "rationale": "심한 기도폐쇄에서 효과적인 기침을 못 하면 성인·1세 이상 소아는 등 두드리기 5회를 우선 시행한다.",
    "source": "질병관리청 2025 한국 심폐소생술 가이드라인"
  },
  {
    "id": 47,
    "title": "등 두드려도 안 나왔다",
    "prompt": "1세 이상 환자에게 등 두드리기 5회를 했지만 효과가 없다.",
    "domain": "기도폐쇄",
    "scene": "choking",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "복부 밀어내기 5회를 시행한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "물을 마시게 한다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "등을 마사지하며 기다린다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "입 안을 보지 않고 손가락으로 훑는다.",
        "correct": false
      }
    ],
    "rationale": "등 두드리기 5회가 효과 없으면 복부 밀어내기 5회를 시행하고 필요하면 반복한다.",
    "source": "질병관리청 2025 한국 심폐소생술 가이드라인"
  },
  {
    "id": 48,
    "title": "영아의 기도폐쇄",
    "prompt": "1세 미만 영아가 심한 기도폐쇄를 보인다.",
    "domain": "기도폐쇄",
    "scene": "infant",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "등 두드리기 5회와 가슴 밀어내기 5회를 번갈아 시행한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "성인처럼 복부 밀어내기를 한다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "다리를 잡고 거꾸로 흔든다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "물을 먹인다.",
        "correct": false
      }
    ],
    "rationale": "1세 미만 영아에게 복부 밀어내기는 권고되지 않으며 등 두드리기 5회와 가슴 밀어내기 5회를 반복한다.",
    "source": "질병관리청 2025 한국 심폐소생술 가이드라인"
  },
  {
    "id": 49,
    "title": "뜨거운 물에 데였다",
    "prompt": "팔에 뜨거운 물이 쏟아졌다.",
    "domain": "화상",
    "scene": "burn",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "안전한 곳으로 옮긴 뒤 흐르는 찬물로 20분 이상 식힌다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "얼음을 피부에 직접 오래 댄다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "치약을 바른다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "물집을 터뜨린다.",
        "correct": false
      }
    ],
    "rationale": "화상은 추가 손상을 막고 흐르는 찬물로 20분 이상 식히며 물집을 터뜨리지 않는다.",
    "source": "질병관리청 국가건강정보포털"
  },
  {
    "id": 50,
    "title": "감전된 사람이 있다",
    "prompt": "사람이 전기기구에 접촉한 채 쓰러져 있다.",
    "domain": "감전",
    "scene": "electricShock",
    "mode": "choice",
    "seconds": 10,
    "options": [
      {
        "id": "correct",
        "label": "직접 만지지 말고 전기 공급을 먼저 차단하고 119에 도움을 요청한다.",
        "correct": true
      },
      {
        "id": "wrong1",
        "label": "맨손으로 사람을 잡아당긴다.",
        "correct": false
      },
      {
        "id": "wrong2",
        "label": "물을 뿌려 깨운다.",
        "correct": false
      },
      {
        "id": "wrong3",
        "label": "금속 막대로 전선을 밀어낸다.",
        "correct": false
      }
    ],
    "rationale": "감전 환자를 직접 만지면 구조자도 감전될 수 있다. 먼저 전기 공급을 차단하고 도움을 요청한다."
  }
];
