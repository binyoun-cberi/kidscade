# Restaurant Engine v1

Kidscade의 요리·식당·타이쿤 게임이 공통으로 사용할 브라우저 런타임이다.

## 담당 범위

- 레시피 데이터와 정확 일치/부분 일치 판정
- 손님 주문 생성, 슬롯, 인내심, 만료
- 서빙 검증과 매출/서빙/퍼펙트/이탈 통계
- 영업 시간과 목표 매출
- 격자 기반 장비 배치
- 공급기, 가공기, 컨베이어류의 고정 tick 자동화
- 목적지 충돌을 intent 단계에서 해결해 아이템 복제 방지

렌더링, DOM, Three.js, 사운드는 엔진 밖에 둔다. 각 게임은 화면과 조작만 담당하고 규칙은 이 엔진을 사용한다.

## 기본 사용

```js
import { RestaurantEngine } from '../shared/restaurant-engine.js';

const restaurant = new RestaurantEngine({
  items: [
    { id: 'bread', name: '빵' },
    { id: 'cheese', name: '치즈' }
  ],
  recipes: [
    { id: 'cheese_toast', ingredients: ['bread', 'cheese'], price: 800 }
  ],
  order: { maxOrders: 4, basePatience: 100, decayPerSecond: 1 },
  shift: { duration: 120, targetRevenue: 6000 }
});

restaurant.startShift();
restaurant.spawnOrder('cheese_toast', { customer: '👧' });
restaurant.tick(0.05);
```

## 자동화

장비는 source, process, transport 규칙을 조합한다.

```js
const engine = new RestaurantEngine({
  automation: {
    width: 6,
    height: 4,
    applianceTypes: [
      { id: 'meat_box', source: { item: 'raw_meat', interval: 1 }, outputDirection: 'east' },
      { id: 'hob', accepts: ['raw_meat'], process: { input: 'raw_meat', output: 'cooked_meat', seconds: 4 }, outputDirection: 'east' },
      { id: 'conveyor', transport: true, transportSeconds: 0.35 }
    ]
  }
});
```

현재 첫 실제 적용 게임은 보글보글 분식집이다. 3D 렌더링과 조작은 기존 코드를 유지하고, 레시피 판정·주문·인내심·서빙 보상·영업 상태를 Restaurant Engine이 담당한다.

## 다음 이관 순서

1. 빙글빙글 타코야키집의 주문/매출/Day 시스템 이관
2. 공용 레시피/아이템 manifest 도입
3. 장비 구매·배치 UI와 Blueprint/Upgrade 계층 추가
4. 타이쿤 게임의 직원 AI를 Grid/Order API 위에 추가
