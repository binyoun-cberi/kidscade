# Kidscade World v2

Kidscade의 `나의 정원`과 기존 `생활 월드`를 하나의 싱글플레이 월드로 합치는 새 생활 월드입니다.

## 현재 단계

World v2 코어, BrowserQuest 3 기반 디자인 규칙, 집 내부 서브맵을 구성했고 **기존 생활 월드 v1의 진입 경로를 World v2로 교체했습니다.** 이제 Kidscade에서 `생활 월드`를 누르면 `world-v2/kidscade-world-life-demo.html`이 바로 열립니다.

기존 v1 파일은 아직 저장소에 남아 있지만 기본 진입점에서는 사용하지 않습니다. v2 기능 이관을 확인한 뒤 레거시 파일을 삭제할 수 있습니다.

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

### 현재 Kidscade 아바타 연결 · 1단계
`kidscade-world-bridge.js`에 `AvatarActor`를 추가했습니다.

- 아바타 디자인은 새로 만들지 않고 현재 Deluxe 아바타를 그대로 사용
- 기존 `renderAvatarSVG()` / `kidscade-avatar-studio-preview` 저장 프리뷰 사용
- 아틀리에의 `renderPreviewFrame()` API가 살아 있으면 `idle / walk / jump / smile` 프레임 사용
- live frame API가 없을 때도 현재 아바타 외형을 유지한 채 이동 애니메이션 적용
- 좌우 이동에 따른 방향 반전
- 걷기 상하 바운스
- idle 호흡 움직임
- 점프용 lift / squash / stretch 구조
- 캐릭터 높이에 맞춰 움직이는 그림자
- World v2 `setPlayer()`에 자동 연결되어 기존 네모 플레이어 렌더러는 fallback으로만 사용

아바타 외형과 World v2 애니메이션을 분리했기 때문에 이후 앉기, 눕기, 도구 사용, 들기 등의 행동을 아바타 디자인을 손대지 않고 추가할 수 있습니다.

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
- `kidscade-world-bridge.js` : Kidscade 메인 읽기 전용 브리지 + 현재 Deluxe 아바타 Actor
- `kidscade-world-art-browserquest.js` : BrowserQuest 3x 아트/타일시트 어댑터
- `kidscade-world-design-bq3.js` : BQ3-Kidscade v1 고정 디자인 프로필
- `kidscade-world-furniture-bq.js` : Kidscade 전용 생활 가구 세트
- `kidscade-world-demo.html` : 초기 자동 지형 분석 데모
- `kidscade-world-design-demo.html` : 디자인 확정 데모
- `kidscade-world-life-demo.html` : **현재 Kidscade 생활 월드 v2 진입점**
- `browserquest-atlas-inspector.html` : 전체 BQ3 타일 검사기
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 자산 출처/라이선스
- `../life-world-integration.js` : 기존 v1 대신 World v2를 여는 메인 사이트 진입 브리지

## 기존 데이터 안전 원칙
`kidscade_garden_v1`, `kidscade_life_world_v1`, 메인 씨앗 잔액은 현재 수정하지 않습니다. 새 엔진이 쓰는 저장 공간은 `kidscade_world_v2`뿐입니다.

## 다음 단계
1. 소파 앉기 / 침대 눕기용 가구 앞·뒤 레이어와 아바타 포즈 구현
2. 손 기준점(anchor)을 추가해 벌목 / 채광 / 물주기 / 수확 도구를 몸에 연결
3. 실내 가구 배치/구매 시스템과 씨앗 지출 Bridge 연결
4. 정원 동물 행동 AI와 시설 상호작용 확대
5. 농사 → 벌목 → 낚시 → 제작 순으로 기존 생활 시스템 이전
6. v2에서 필요한 기능 이관이 끝나면 기존 `life-world.html`, `life-world-core-*` 레거시 삭제

## BrowserQuest 아트 정책
BrowserQuest 콘텐츠/아트는 CC BY-SA 3.0 조건을 따릅니다. 엔진 코드와 Kidscade 자체 제작 가구는 BrowserQuest 원본 아트 레이어와 분리되어 있습니다.
