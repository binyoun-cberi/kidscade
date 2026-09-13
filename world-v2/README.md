# Kidscade World v2

Kidscade의 `나의 정원`과 `생활 월드`를 하나의 싱글플레이 월드로 합치기 위한 호환 엔진입니다.

## 1차 목표

이 단계에서는 디자인을 옮기지 않습니다. 먼저 아래 기반이 Kidscade 안에서 안정적으로 작동하는지 확인합니다.

- Canvas 기반 월드 루프
- WASD / 방향키 이동
- 카메라 추적과 월드 경계 제한
- AABB 충돌
- Y축 기반 깊이 정렬
- 근접 상호작용(E / Space)
- Entity / EntityManager 구조
- 기존 Kidscade 저장값을 변경하지 않고 읽는 Bridge
- `kidscade_world_v2` 전용 저장 공간
- 기존 정원 시설/동물 데이터를 임시 월드 좌표로 표시하는 데모

## 기존 데이터 안전 원칙

`kidscade_garden_v1`, `kidscade_life_world_v1`, `kidscade_coins`는 이 단계에서 수정하지 않습니다.
새 엔진이 저장하는 값은 `kidscade_world_v2`뿐입니다.

## 파일

- `kidscade-world-core.js` : 월드/카메라/엔티티/충돌/입력/상호작용 코어
- `kidscade-world-storage.js` : v2 저장 및 기존 데이터 스냅샷
- `kidscade-world-bridge.js` : Kidscade 메인과 연결하기 위한 읽기 전용 브리지
- `kidscade-world-demo.html` : 디자인 이식 전 엔진 검증용 페이지

## 다음 단계

1. 엔진 MVP 검증
2. 현재 생활 월드의 플레이어/카메라/충돌 코드를 v2 엔진 위로 이식
3. 현재 나의 정원 시설과 동물을 실제 Entity로 이식
4. 집-정원-농장을 하나의 연속 맵으로 구성
5. 숲/강/광산 및 각종 생활 콘텐츠 이동
6. 마지막에 현재 생활 월드 디자인과 애니메이션을 새 엔진 렌더러로 이식
