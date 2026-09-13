# Kidscade World v2

Kidscade의 `나의 정원`과 `생활 월드`를 하나의 싱글플레이 월드로 합치기 위한 호환 엔진입니다.

## 현재 단계: 디자인 프로필 확정

엔진 검증과 BrowserQuest 3x 아트 자동 탐색 단계를 지나, 이제 `BQ3-Kidscade v1` 디자인 프로필을 별도 모듈로 고정했습니다.

- Canvas 월드 루프
- WASD / 방향키 이동
- 카메라 추적과 월드 경계 제한
- AABB 충돌
- Y축 기반 깊이 정렬
- 근접 상호작용(E / Space)
- Entity / EntityManager 구조
- 기존 Kidscade 저장값을 변경하지 않고 읽는 Bridge
- `kidscade_world_v2` 전용 저장 공간
- 기존 정원 시설/동물을 실제 월드 Entity로 변환
- 집 앞 → 나의 정원 → 농장을 장면 전환 없는 연속 야외 맵으로 구성
- BrowserQuest `client/img/3` 아트 어댑터 분리
- BrowserQuest 원본 상자/목재/NPC 스프라이트 연결
- BrowserQuest 3x 타일시트 구조 확인: 20열 × 98행, 960×4704px, 48px 타일
- `BQ3-Kidscade v1`에서 사용할 지형 탐색 구역과 환경 오브젝트 crop을 버전 고정
- 집/나무/덤불/바위가 동일한 디자인 프로필을 사용하도록 통일
- 자동 분석 데모와 확정 디자인 데모를 분리해 비교 가능

## 기존 데이터 안전 원칙

`kidscade_garden_v1`, `kidscade_life_world_v1`, `kidscade_coins`는 수정하지 않습니다.
새 엔진이 저장하는 값은 `kidscade_world_v2`뿐입니다.

## 주요 파일

- `kidscade-world-core.js` : 월드/카메라/엔티티/충돌/입력/상호작용 코어
- `kidscade-world-storage.js` : v2 저장 및 기존 데이터 스냅샷
- `kidscade-world-bridge.js` : Kidscade 메인과 연결하기 위한 읽기 전용 브리지
- `kidscade-world-art-browserquest.js` : BrowserQuest 3x 아트/타일시트 어댑터와 원본 분석기
- `kidscade-world-design-bq3.js` : **확정 디자인 프로필 `bq3-kidscade-v1`**
- `kidscade-world-demo.html` : 자동 아트 탐색 기반 3단계 비교 데모
- `kidscade-world-design-demo.html` : **확정 디자인 프로필을 사용하는 4단계 데모**
- `browserquest-atlas-inspector.html` : 전체 48px 타일 ID 확인용 검사기
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 자산 출처 및 라이선스 안내

## BQ3-Kidscade v1 디자인 규칙

### 크기 체계

BrowserQuest 원본의 16px 타일을 기준으로 하고 게임에서는 3배인 48px 단위로 표시합니다.

- 기본 월드 타일: 48×48px
- 신규 Kidscade 생활 가구 원본: 16px 그리드에서 제작
- 화면 표시: nearest-neighbor 방식으로 정확히 3배 확대
- 캐릭터/동물의 충돌 박스와 실제 그림 크기는 분리
- 나무/건물처럼 큰 물체는 발밑 충돌 박스만 작게 두고 그림은 위로 렌더링

### 확정 방향

- 야외 잔디/길/밭/물: BrowserQuest 3 타일시트 계열
- 집/창고: BrowserQuest 마을 건물 계열 crop
- 나무/덤불/바위: BrowserQuest 환경 계열 crop
- 상자/목재/NPC: BrowserQuest 독립 스프라이트
- 침대/소파/책상/주방/놀이시설: BrowserQuest에 없는 만큼 **Kidscade 전용 BQ풍 신규 픽셀 아트**로 제작
- 정원 동물: 기존 도형을 버리고 같은 16px→3x 규칙의 Kidscade 전용 스프라이트로 제작
- UI: 둥근 모바일 카드 스타일보다 네모난 픽셀 패널과 얇은 테두리를 기본으로 사용

### 프로필 안정성

이전 단계에서는 전체 타일시트를 색상으로 분석해 가장 높은 점수의 타일을 골랐습니다. `bq3-kidscade-v1`에서는 전체 시트를 무작정 탐색하지 않고, 실제 BrowserQuest 아틀라스에서 확인한 환경/마을 구역 안에서만 지형을 결정합니다. 건물과 주요 환경 오브젝트의 crop 영역은 프로필에 고정되어 있어 향후 엔진 기능 변경 때문에 디자인이 갑자기 다른 타일로 바뀌지 않습니다.

## BrowserQuest 아트 정책

BrowserQuest 콘텐츠/아트는 CC BY-SA 3.0 조건을 따릅니다. 엔진 코드는 아트 레이어와 분리하여 향후 Kidscade 자체 아트로 교체할 수 있도록 유지합니다. BrowserQuest 자산을 수정하거나 파생한 아트는 관련 라이선스 조건을 지켜야 합니다.

## 다음 단계

1. 확정된 `BQ3-Kidscade v1`을 기존 `kidscade-world-demo.html`의 기본 렌더러로 승격
2. 집 문 상호작용 → 집 내부 서브맵 구현
3. 침대/소파/책상/식탁/냉장고/싱크대/가스레인지 등 첫 Kidscade 전용 생활 가구 세트 제작
4. 기존 Kidscade 아바타를 월드용 4방향 픽셀 스프라이트로 연결
5. 정원 동물을 종별 4방향/대기/걷기 애니메이션으로 교체
6. 농사 → 벌목 → 낚시 → 제작 순서로 생활 콘텐츠를 World v2 시스템에 이식
