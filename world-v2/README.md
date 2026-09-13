# Kidscade World v2

Kidscade의 `나의 정원`과 기존 `생활 월드`를 하나의 싱글플레이 생활 월드로 합치는 새 엔진입니다.

## 현재 기본 진입점

Kidscade의 `생활 월드` 버튼은 이제 기존 `life-world.html`이 아니라 아래 파일을 직접 엽니다.

- `world-v2/kidscade-world.html`

기존 Life World v1 파일은 아직 비교/기능 이관용으로 저장소에 남아 있지만 기본 진입 경로에서는 사용하지 않습니다.

## 현재 구현

### World v2 엔진
- Canvas 월드 루프
- WASD / 방향키 이동
- 카메라 추적과 월드 경계 제한
- AABB 충돌
- Y축 기반 깊이 정렬
- E / Space 근접 상호작용
- Entity / EntityManager 구조
- `visible`, `active`, `tags` 기반 야외/실내 서브맵 전환
- `kidscade_world_v2` 전용 저장
- 현재 장면 `outdoor / home-interior` 저장

### 현재 Kidscade Deluxe 아바타
아바타를 새 픽셀 캐릭터로 교체하지 않습니다.

`kidscade-world-bridge.js`의 `AvatarActor`가 현재 아바타를 그대로 World v2 플레이어로 사용합니다.

- `renderAvatarSVG()`와 `kidscade-avatar-studio-preview` 사용
- 가능한 경우 아틀리에 `renderPreviewFrame()`의 `idle / walk / jump / smile` 프레임 활용
- 좌우 반전
- 걷기 바운스
- idle 호흡
- jump lift / squash / stretch
- 높이에 따라 변하는 그림자
- live frame API가 없어도 저장된 현재 아바타 외형 유지

### AvatarActor 포즈 시스템
현재 아바타의 머리/옷/얼굴을 다시 그리지 않고 전체 transform으로 생활 동작을 만듭니다.

현재 포즈 프리셋:
- `sit`
- `sleep`
- `use`
- `wash`
- `read`
- `cook`
- `carry`

각 포즈는 회전, 세로/가로 압축, 위치 오프셋, 방향, 그림자, 렌더 기준 좌표를 독립적으로 가질 수 있습니다.

`handAnchor()`도 추가되어 다음 단계의 도끼/곡괭이/물뿌리개/낚싯대 연결 기반을 마련했습니다.

### 생활 행동 애니메이션
`kidscade-world-life-animation.js`가 가구와 현재 Deluxe 아바타의 행동을 연결합니다.

현재:
- 침대: 눕기 + 이불 앞 레이어
- 소파: 앉기 + 앞 쿠션/팔걸이 마스킹
- 책상: 앉기
- 식탁: 앉기
- 냉장고: 접근 + 문 열림
- 싱크대: 사용 포즈 + 흐르는 물
- 조리대: 요리 준비 포즈 + 작은 조리 FX
- 가스레인지: 요리 포즈 + 조리 FX
- 책장: 읽기 포즈 + 책 꺼내기
- 러그: 짧은 반응 동작

행동 중에는 이동 입력을 잠그고 종료 후 원래 위치로 복귀합니다. ESC로 현재 행동을 먼저 취소할 수 있습니다.

### 연속 월드
- 집 앞 → 나의 정원 → 농장은 장면 전환 없는 하나의 야외 월드
- 집 문에서 E/Space → 집 내부
- 기존 정원 시설을 World Entity로 변환
- BQ3-Kidscade v1 환경 디자인 적용

### Kidscade 전용 생활 가구
`kidscade-world-furniture-bq.js`의 가구는 Kidscade 자체 Canvas 픽셀 아트입니다.

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

## 주요 파일
- `kidscade-world.html` : **현재 실제 생활 월드 v2 진입 파일**
- `kidscade-world-core.js` : 월드/카메라/엔티티/충돌/입력/상호작용
- `kidscade-world-storage.js` : v2 저장
- `kidscade-world-bridge.js` : Kidscade 브리지 + 현재 Deluxe `AvatarActor`
- `kidscade-world-life-animation.js` : 생활 포즈/가구 애니메이션
- `kidscade-world-art-browserquest.js` : BrowserQuest 3x 아트 어댑터
- `kidscade-world-design-bq3.js` : BQ3-Kidscade 디자인 프로필
- `kidscade-world-furniture-bq.js` : Kidscade 생활 가구
- `kidscade-world-life-demo.html` : 이전 집 내부 데모
- `kidscade-world-design-demo.html` : 디자인 비교 데모
- `browserquest-atlas-inspector.html` : BQ3 타일 검사기
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 자산 출처/라이선스
- `../life-world-integration.js` : 메인 Kidscade → World v2 진입 브리지

## 기존 데이터 안전 원칙
현재 `kidscade_garden_v1`, 기존 Life World v1 저장값, 메인 씨앗 잔액은 수정하지 않습니다. World v2 자체 저장은 `kidscade_world_v2`를 사용합니다.

## 다음 애니메이션 단계
1. `handAnchor()`에 도끼 / 곡괭이 / 물뿌리개 / 채집망을 붙이고 몸 기울기와 타격 프레임 동기화
2. 벌목 / 채광 / 물주기 / 수확에 impact, 파티클, 화면 흔들림 연결
3. 물건 들기 / 내려놓기 / 운반 포즈
4. 낚싯대 캐스팅 / 당기기
5. 농사 → 벌목 → 낚시 → 제작 순으로 v1 기능을 v2에 직접 이관
6. 이관 완료 후 `life-world.html`, `life-world-core-*` 레거시 삭제

## BrowserQuest 아트 정책
BrowserQuest 콘텐츠/아트는 CC BY-SA 3.0 조건을 따릅니다. Kidscade 엔진과 자체 제작 가구/애니메이션 코드는 BrowserQuest 원본 아트 레이어와 분리되어 있습니다.
