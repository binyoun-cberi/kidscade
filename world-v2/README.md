# Kidscade World v2

Kidscade의 `나의 정원`과 기존 `생활 월드`를 하나의 싱글플레이 월드로 합치는 새 생활 월드입니다. 기존 생활 월드 v1은 기본 진입점에서 제외했고, Kidscade의 `생활 월드` 버튼은 `world-v2/kidscade-world.html`을 엽니다.

## 현재 기준

World v2는 이제 단순 애니메이션 데모가 아니라 아래 순환이 실제로 연결된 생활 게임 상태입니다.

`채집/벌목/채광 → 운반/보관 → 도구 제작/업그레이드 → 농사/낚시 → 집에서 요리 → 식사/회복 → 다시 야외 활동`

### 월드 엔진
- Canvas 월드 루프
- WASD / 방향키 이동
- 카메라 추적
- AABB 충돌
- Y축 깊이 정렬
- E / Space 근접 상호작용
- Entity / EntityManager
- 야외와 집 내부를 `visible / active / tags`로 전환
- `kidscade_world_v2` 독립 저장
- 활성 World를 `KidscadeWorldV2.activeWorld`로 노출

### 현재 Kidscade Deluxe 아바타
새 플레이어 캐릭터를 만들지 않습니다.

`kidscade-world-bridge.js`의 `AvatarActor`가 현재 Kidscade Deluxe 아바타를 그대로 월드 플레이어로 사용합니다.

- 현재 헤어 / 얼굴 / 눈 / 옷 / 피부 등 외형 유지
- `renderAvatarSVG()` / 저장된 `kidscade-avatar-studio-preview` 사용
- 가능하면 기존 `renderPreviewFrame(idle / walk / jump / smile)` 활용
- 좌우 반전, 걷기 바운스, idle 호흡, jump squash/stretch
- sit / sleep / use / wash / read / cook / carry 포즈
- 도구 연결용 `handAnchor()`

### 실내 생활 애니메이션
`kidscade-world-life-animation.js`

- 침대 눕기 + 이불 앞 레이어
- 소파 앉기 + 앞 쿠션 마스킹
- 책상 / 식탁 앉기
- 냉장고 문 열기
- 싱크대 물 흐르기
- 조리대 / 가스레인지 사용
- 책장 읽기
- 행동 중 이동 잠금 / ESC 취소

### 야외 작업
`kidscade-world-work-animation.js`

- 도끼질: 몸 준비 → 스윙 → 실제 타격 → 나무 흔들림 / 파편 / 효과음 / 화면 흔들림
- 곡괭이질: 강한 타격 / 돌 파편 / 화면 흔들림
- 물주기: 손의 물뿌리개 + 물줄기
- 수확: 몸 숙임 + 수확 파티클
- 채집망: 손 anchor 기반 스윙 + 곤충 포획
- 작업 중 이동 잠금 / ESC 취소

### 운반 / 보관 / 낚시
`kidscade-world-carry-fishing.js`

- 나무 / 돌 / 작물 / 곤충 작업 결과가 월드 드롭으로 생성
- E / Space로 직접 들기
- Q로 내려놓기
- 들고 있는 양이 많으면 이동 속도 감소
- 농장 보관 상자에 넣으면 `kidscade_world_v2.inventory`에 저장
- 낚시: 캐스팅 → 찌 대기 → 입질 → 타이밍 입력 → 릴 감기 → 물고기 운반

### 제작 / 체력 / 도구 / 농사 / 요리
`kidscade-world-progression.js`

#### 체력
- 최대 100
- 벌목 4 / 채광 5 / 물주기 2 / 수확 2 / 채집 3 / 낚시 3 소모
- 쉬는 동안 천천히 회복
- 침대에서 쉬면 전부 회복
- 음식으로도 회복 가능

#### 기본 도구
- 돌도끼: 목재 3 + 돌 2 / 내구도 18
- 돌곡괭이: 목재 2 + 돌 3 / 내구도 18
- 곤충채집망: 목재 2 + 돌 1 / 내구도 14
- 낚싯대: 목재 3 + 돌 1 / 내구도 16

#### 철도구
농장 외곽에 철광맥 3개가 생성됩니다.

- 철도끼: 목재 2 + 철광석 3 / 내구도 40
- 철곡괭이: 목재 2 + 철광석 4 / 내구도 42
- 철도끼/철곡괭이는 돌도구보다 작업 애니메이션이 빨라짐
- 철도구로 나무/바위를 마무리하면 일반 도구보다 추가 자원 드롭
- 철곡괭이로 철광맥을 마무리하면 철광석 획득량 증가
- 나무 / 바위 / 철광맥은 일정 시간이 지나면 다시 생성

#### 농사
기존 테스트 밭 3개를 실제 작물 슬롯으로 사용합니다.

- 감자: 35초 / 2개 수확
- 당근: 50초 / 3개 수확
- 토마토: 70초 / 3개 수확
- 씨앗 심기 → 물주기 → 실제 시간 성장 → 익음 → 수확 → 운반 → 보관
- 성장 완료 시각 저장. 월드를 닫아도 성장 진행
- 수확 시 같은 작물 씨앗 1개 환급

#### 물고기 도감
낚시 성공 시 일반 `물고기` 재료와 별개로 종을 기록합니다.

- 피라미 · 흔함
- 붕어 · 보통
- 메기 · 희귀
- 쏘가리 · 매우 희귀

냉장고에서 발견 횟수를 확인할 수 있습니다.

#### 주방
기존 집 가구를 실제 기능으로 연결했습니다.

- 냉장고: 재료 / 완성 음식 / 물고기 도감 확인
- 조리대: 메뉴 선택 → 재료 소비 → 반복 칼질
- 가스레인지: 온도 상승 → 적정 온도에 맞춰 불 끄기
- 식탁: 완성된 음식 선택 → 먹기 → 체력 회복

요리:
- 감자수프: 감자 2 + 당근 1
- 농장 채소구이: 감자 1 + 당근 1 + 토마토 1
- 토마토 생선스튜: 토마토 2 + 물고기 1 + 감자 1
- 생선구이: 물고기 1 + 토마토 1

온도에 따라 `완벽한 / 잘 익은 / 덜 익은 / 조금 탄` 품질이 정해지며 체력 회복량도 달라집니다.

### 초반 진행 막힘 방지
도구가 하나도 없는 첫 플레이에서는 농장 근처에 첫 제작용 목재와 돌이 배치됩니다.

1. 재료를 주워 보관 상자에 넣기
2. 돌도끼 / 돌곡괭이 제작
3. 자원 채취
4. 철광맥 채굴
5. 철도구 업그레이드
6. 농사 / 낚시
7. 집에서 요리 / 식사

우측 상태 패널이 현재 체력, 도구 내구도와 다음 목표를 표시합니다.

## 월드 구성
- 집 앞 → 나의 정원 → 농장: 하나의 연속 야외 월드
- 집 문 E / Space → 집 내부
- 기존 정원 시설을 World Entity로 표시
- BQ3-Kidscade 48px 환경 디자인
- Kidscade 전용 생활 가구 10종

## 주요 파일
- `kidscade-world.html` : 현재 생활 월드 v2 기준 파일
- `kidscade-world-core.js` : 월드 / 카메라 / 엔티티 / 충돌 / 입력 / 상호작용
- `kidscade-world-bridge.js` : 기존 Kidscade 데이터 브리지 + Deluxe AvatarActor
- `kidscade-world-life-animation.js` : 실내 생활 행동 + 기능 모듈 로더
- `kidscade-world-work-animation.js` : 야외 작업 / 도구 / 타격 FX
- `kidscade-world-carry-fishing.js` : 드롭 / 들기 / 보관 / 낚시
- `kidscade-world-progression.js` : 체력 / 제작 / 철도구 / 농사 / 리스폰 / 물고기 도감 / 요리
- `kidscade-world-furniture-bq.js` : Kidscade 전용 생활 가구
- `kidscade-world-art-browserquest.js` : BrowserQuest 3x 아트 어댑터
- `kidscade-world-design-bq3.js` : BQ3-Kidscade 디자인 프로필
- `kidscade-world-storage.js` : v2 저장
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 아트 출처 / 라이선스

## 저장
`kidscade_world_v2`에 다음이 저장됩니다.

- 플레이어 위치 / 장면
- 목재 / 돌 / 철광석 / 작물 / 물고기 / 곤충 재고
- 체력
- 도구 종류 / 티어 / 내구도
- 작물별 씨앗
- 밭별 성장 상태 / 완료 시각
- 완성 음식 / 품질
- 물고기 도감 / 발견 횟수
- 진행 중인 요리 상태

`kidscade_garden_v1`, 기존 Life World v1 저장값, Kidscade 메인 씨앗 잔액은 수정하지 않습니다.

## 남은 확장 후보
현재 핵심 생활 루프는 연결되었습니다. 이후는 필수 이관보다 확장 콘텐츠에 가깝습니다.

- 동물별 4방향 이동 / 시설 사용 애니메이션
- 가구 구매 / 배치 / 씨앗 재화 소비
- 광산 / 숲 별도 서브맵 확대
- 요리 레시피 / 물고기 / 작물 종류 추가
- 계절 / 날씨 / 퀘스트 / NPC 관계

## BrowserQuest 아트 정책
BrowserQuest 콘텐츠/아트는 CC BY-SA 3.0 조건을 따릅니다. World v2 엔진 코드와 Kidscade 자체 제작 가구/행동 시스템은 BrowserQuest 원본 아트 레이어와 분리되어 있습니다.
