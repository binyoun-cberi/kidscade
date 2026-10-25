# 빙글빙글 타코야키집 — 원본 플레이 개선 참고 기록

> 새로운 게임 모드를 만들지 않는다. 기존 1~12구 팬과 순차 해금, 어린이의 직접 눌러 굽는 동작을 유지한다.

## 직접 확인한 참고 원본

- [OrangoMango/LetHimCook](https://github.com/OrangoMango/LetHimCook) — Java/JavaFX
- [Order.java](https://github.com/OrangoMango/LetHimCook/blob/main/src/main/java/com/orangomango/lethimcook/core/Order.java)
- [MainApplication.java](https://github.com/OrangoMango/LetHimCook/blob/main/src/main/java/com/orangomango/lethimcook/MainApplication.java)
- [Food.java](https://github.com/OrangoMango/LetHimCook/blob/main/src/main/java/com/orangomango/lethimcook/core/Food.java), [FoodType.java](https://github.com/OrangoMango/LetHimCook/blob/main/src/main/java/com/orangomango/lethimcook/core/FoodType.java), [Indicator.java](https://github.com/OrangoMango/LetHimCook/blob/main/src/main/java/com/orangomango/lethimcook/core/Indicator.java)
- [MIT 라이선스](https://github.com/OrangoMango/LetHimCook/blob/main/LICENSE), © 2026 Orango Mango.

모든 수치를 그대로 복제하지 않는다. 코드상 동작 원리를 분석해 타코야키에 맞춰 다시 구현하며, 원본 Java 코드/에셋은 가져오지 않는다.

## 원본 구조에서 확인한 사실

1. **주문 생성:** `Order(int items)`에서 빵 포함 여부, 조리 재료 1~2개, 추가 식재료를 선택하고 중복 종류를 제거한다. 주문 품목은 2~4개 수준으로 생성된다.
2. **실제 제출 품목 평가:** `calculateScore(Food)`는 음식 객체의 `getFoodChain()`을 순회하여 제공한 **서로 다른 식재료 종류**를 얻는다. 맞는 종류당 +150, 빠진 종류당 -30, 불필요하게 추가한 종류당 -30이다. 접시 없이 제출하면 -10이다.
3. **익힘 상태 감점:** 각 주문 식재료의 `progressStatus`가 이상적인 1.0에서 0.1 멀어질 때마다 약 15점 감점한다. 목표보다 덜 조리한 상태도 감점할 수 있다.
4. **속도:** 주문당 기준 시간은 식재료 개수 × 11초. 점수에 시간 보정이 들어가며, 원본 구현에서는 불필요한 식재료가 있을 때 속도 가점을 주지 않는다.
5. **주문 대기열:** `MainApplication`은 `Order[4]`를 사용한다. 빈 칸에 새로운 주문을 받고, 시간이 지나면 미처리 주문을 삭제하고 점수를 깎는다. 빈 주문 칸에 서빙하면 별도 감점한다.
6. **조리 진행:** `Indicator`가 준비 진행도를 `Food.progressStatus`에 연결해 완성 알림을 울린다. `Food`는 조리·손질 가능한 음식과 즉시 준비된 음식으로 구분된다.

## 키즈케이드 원본에서 실제 발견한 문제

- 주문별 속재료·토핑과 `scoreBall`의 품질 계산은 존재했으나 `tapSlot`이 주문 정답 재료를 자동 삽입했다.
- 완성 순간 토핑 4종을 `s[k]=o[k]`로 직접 덮어써 **잘못된 재료를 선택할 가능성이 거의 없었다**.
- 수동 재료 버튼은 DOM에 존재하지만 최종 UI CSS에서 하단 조리 영역 전체가 숨겨졌다.
- 모든 단계가 주문 한 건만 대기할 수 있어 후반부의 여러 주문 처리 판단이 없었다.
- 완성 알을 다른 주문에 잘못 제공하지 않게 연결하는 식별자가 없었다.

## 반영된 원본 플레이 개선

| 단계 | 입력 | 판단·보상 |
| --- | --- | --- |
| 1~3구 | 기존처럼 팬을 누르며 자동 속재료·토핑 사용 | 성공 경험/조작 숙달, 단계별 1구 해금 |
| 4~6구 | 팬에서 굽고 완성된 알을 선택해 토핑을 직접 올림/제거 | 주문의 토핑 종류/누락/초과를 구분하여 평가 |
| 7~12구 | 속재료도 직접 선택, 필요하면 문어 추가 | 채움 재료까지 점수에 실제 반영 |
| 5~12구 | 주문 카드 선택으로 2→3→4개의 주문 관리 | 각 알을 주문 ID에 묶어 잘못 혼합되는 일 방지 |
| 전체 | 겉·속 익힘/모양/탄 정도/기다린 시간 반영 | 품질 점수와 구체적 개선 사유 제시 |

속도 보너스는 필요한 재료를 맞춰 제공한 경우에만 지급하도록 조정했다. 유아 대상 기본 게임이므로 **기다린 손님이 퇴장하거나 진행을 완전히 막는 실패 시스템**은 옮기지 않는다. 순차 해금 저장 키도 유지한다.

## 앞으로 확인할 내용

- 휴대전화 화면에서 팬 클릭 영역과 하단 토핑 버튼이 겹치지 않는가?
- 7구부터 속재료 선택 후 세 번 굴리기가 자연스럽게 이어지는가?
- 4개의 대기 주문이 생길 때 복잡해서 손을 놓는 플레이가 나오지 않는가?
- 12구에서 다 구운 알을 선택해 토핑을 수정하고 정확한 주문으로 제공할 수 있는가?
- 과도한 가점/감점 때문에 시간 보너스만 노리거나 불필요하게 기다리는 플레이가 유리하지 않은가?

테스트 파일: `tests/takoyaki-preschool-progression.test.cjs`, `tests/takoyaki-v2-stability.test.cjs`, `tests/takoyaki-orders-quality.test.cjs`.

게임 개발 시에는 이 문서의 **원본 플레이 개선 원칙과 유아 접근성**을 함께 확인한다.
