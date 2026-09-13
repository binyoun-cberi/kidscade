# Kidscade World v2

Kidscade의 `나의 정원`과 `생활 월드`를 하나의 싱글플레이 월드로 합치기 위한 호환 엔진입니다.

## 현재 단계

엔진 MVP 위에 `집 앞 → 나의 정원 → 농장`을 장면 전환 없이 걸어갈 수 있는 첫 연속 월드를 구성했습니다.

- Canvas 월드 루프
- WASD / 방향키 이동
- 카메라 추적
- AABB 충돌
- Y축 기반 깊이 정렬
- 근접 상호작용(E / Space)
- Entity / EntityManager 구조
- 기존 Kidscade 저장값을 변경하지 않고 읽는 Bridge
- `kidscade_world_v2` 전용 저장 공간
- 기존 정원 시설/동물 데이터를 실제 월드 엔티티로 표시
- 집/정원/농장 연속 야외 맵
- BrowserQuest `img/3`용 선택적 아트 어댑터

## 디자인 방향

기존 `life-world`의 나무/가구 그림은 World v2로 이식하지 않습니다.

BrowserQuest의 `client/img/3`는 16×16 원본 픽셀 자산을 3배로 확대한 48×48 기준 자산입니다. World v2의 픽셀 아트 기준도 48px 타일로 맞춥니다.

- 나무, 풀, 바위, 길, 울타리, 건물 외부 등: BrowserQuest 3 아트를 우선 검토
- 상자, 목재, NPC 등 독립 스프라이트: BrowserQuest 3 어댑터에서 바로 시험 적용
- 침대, 소파, 주방, 생활 가구: BrowserQuest에 충분한 세트가 없으므로 동일한 16px → 48px 픽셀 규칙으로 Kidscade 전용 신규 제작
- 엔진과 아트 레이어는 분리하여 나중에 전체 아트팩 교체 가능

BrowserQuest 자산 관련 라이선스는 `THIRD_PARTY_BROWSERQUEST.md`를 확인합니다.

## 기존 데이터 안전 원칙

`kidscade_garden_v1`, `kidscade_life_world_v1`, `kidscade_coins`는 현재 단계에서 수정하지 않습니다.
새 엔진이 저장하는 값은 `kidscade_world_v2`뿐입니다.

## 파일

- `kidscade-world-core.js` : 월드/카메라/엔티티/충돌/입력/상호작용 코어
- `kidscade-world-storage.js` : v2 저장 및 기존 데이터 스냅샷
- `kidscade-world-bridge.js` : Kidscade 메인과 연결하기 위한 읽기 전용 브리지
- `kidscade-world-art-browserquest.js` : BrowserQuest scale-3 아트 어댑터
- `kidscade-world-demo.html` : 집-정원-농장 연속 월드 검증 페이지
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 출처/라이선스 고지

## 다음 단계

1. BrowserQuest `tilesheet.png`의 환경 타일 ID를 선별해 나무/길/울타리/건물 외부를 실제 픽셀 타일로 교체
2. 현재 Kidscade 아바타를 플레이어 엔티티 렌더러에 연결
3. 집 내부를 별도 서브맵으로 구현하고 문 출입 전환 추가
4. 농사 상태를 기존 생활 저장값과 읽기 전용으로 연결
5. 동물 AI를 시설 선호/따라오기/먹기/놀기 상태 머신으로 확장
6. 안정화 후 숲·강·광산을 같은 엔진으로 이식
