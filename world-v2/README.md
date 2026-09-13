# Kidscade World v2

Kidscade의 `나의 정원`과 `생활 월드`를 하나의 싱글플레이 월드로 합치기 위한 호환 엔진입니다.

## 현재 단계

World v2 코어와 BrowserQuest 3 기반 디자인 규칙을 고정한 뒤, 첫 실제 생활 공간인 **집 내부 서브맵**까지 연결했습니다.

### 엔진
- Canvas 월드 루프
- WASD / 방향키 이동
- 카메라 추적과 월드 경계 제한
- AABB 충돌
- Y축 기반 깊이 정렬
- 근접 상호작용(E / Space)
- Entity / EntityManager 구조
- `visible`, `active`, `tags`를 이용한 가벼운 서브맵 전환
- 기존 Kidscade 저장값을 변경하지 않고 읽는 Bridge
- `kidscade_world_v2` 전용 저장 공간
- 현재 장면(`outdoor` / `home-interior`) 저장

### 연속 야외 월드
- 집 앞 → 나의 정원 → 농장을 장면 전환 없는 하나의 야외 맵으로 구성
- 기존 정원 시설/보유 동물을 실제 World Entity로 변환
- BrowserQuest 3x 환경 아트 어댑터 분리
- BQ3-Kidscade v1 고정 디자인 프로필

### 디자인 규칙
- 원본 그리드: 16px
- 표시: nearest-neighbor 3배 → 48px
- 야외 지형/기본 건물/환경 오브젝트: BQ3 계열
- UI: 둥근 모바일 카드보다 네모난 픽셀 패널 계열
- 큰 오브젝트의 그림 크기와 실제 충돌 박스를 분리

### 집 내부
`kidscade-world-life-demo.html`에서 집 문에 접근해 E/Space를 누르면 실내 서브맵으로 들어갑니다.

실내에서는 야외 Entity를 `visible=false`, `active=false`로 전환하고 실내 Entity만 활성화합니다. 현재 코어를 복잡하게 만들지 않으면서도 이동/충돌/상호작용/카메라가 그대로 재사용됩니다.

### Kidscade 전용 생활 가구 v1
`kidscade-world-furniture-bq.js`의 가구는 BrowserQuest 원본 자산을 복제한 것이 아니라 **Kidscade용으로 새로 그린 Canvas 픽셀 아트**입니다. BQ3 월드와 어울리도록 3px 단위 픽셀, 제한된 팔레트, 단단한 형태를 사용합니다.

현재 포함:
- 침대
- 소파
- 책상
- 식탁
- 냉장고
- 싱크대
- 조리대
- 가스레인지
- 책장
- 러그

각 가구는 독립 렌더러와 크기/충돌 메타데이터를 가지고 있어 집 외에도 학교, 상점, 마을 건물에 재사용할 수 있습니다.

## 주요 파일
- `kidscade-world-core.js` : 월드/카메라/엔티티/충돌/입력/상호작용 코어
- `kidscade-world-storage.js` : v2 저장 및 기존 데이터 스냅샷
- `kidscade-world-bridge.js` : Kidscade 메인 읽기 전용 브리지
- `kidscade-world-art-browserquest.js` : BrowserQuest 3x 아트/타일시트 어댑터
- `kidscade-world-design-bq3.js` : BQ3-Kidscade v1 고정 디자인 프로필
- `kidscade-world-furniture-bq.js` : Kidscade 전용 생활 가구 세트
- `kidscade-world-demo.html` : 초기 자동 지형 분석 데모
- `kidscade-world-design-demo.html` : 디자인 확정 데모
- `kidscade-world-life-demo.html` : **집 입장 + 실내 생활 공간 데모**
- `browserquest-atlas-inspector.html` : 전체 BQ3 타일 검사기
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 자산 출처/라이선스

## 기존 데이터 안전 원칙
`kidscade_garden_v1`, `kidscade_life_world_v1`, 메인 씨앗 잔액은 수정하지 않습니다. 새 엔진이 쓰는 저장 공간은 `kidscade_world_v2`뿐입니다.

## 다음 단계
1. 현재 Kidscade 아바타를 월드용 4방향 픽셀 캐릭터/걷기 애니메이션으로 연결
2. 소파 앉기, 침대 눕기, 냉장고 열기, 싱크대 사용 등 가구별 실제 행동 애니메이션 추가
3. 실내 가구 배치/구매 시스템과 씨앗 지출 Bridge 연결
4. 정원 동물을 Kidscade 전용 4방향 픽셀 스프라이트로 교체
5. 농사 → 벌목 → 낚시 → 제작 순으로 기존 생활 시스템 이전

## BrowserQuest 아트 정책
BrowserQuest 콘텐츠/아트는 CC BY-SA 3.0 조건을 따릅니다. 엔진 코드와 Kidscade 자체 제작 가구는 BrowserQuest 원본 아트 레이어와 분리되어 있습니다.
