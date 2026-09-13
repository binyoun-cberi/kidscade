# Kidscade World v2

Kidscade의 `나의 정원`과 기존 `생활 월드`를 하나의 싱글플레이 월드로 합치는 새 생활 월드입니다. 기존 생활 월드 v1은 기본 진입점에서 제외했고, Kidscade의 `생활 월드` 버튼은 `world-v2/kidscade-world.html`을 엽니다.

## 현재 기준

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
- 현재 활성 World 인스턴스를 `KidscadeWorldV2.activeWorld`로 노출하여 기능 모듈을 분리 가능

### 현재 Kidscade Deluxe 아바타
새 플레이어 캐릭터를 만들지 않습니다. `kidscade-world-bridge.js`의 `AvatarActor`가 현재 Kidscade Deluxe 아바타를 그대로 월드 플레이어로 사용합니다.

- 현재 헤어 / 얼굴 / 눈 / 옷 / 피부 등 외형 유지
- `renderAvatarSVG()` / 저장된 `kidscade-avatar-studio-preview` 사용
- 가능하면 기존 `renderPreviewFrame(idle / walk / jump / smile)` 활용
- 좌우 반전 / 걷기 바운스 / idle 호흡 / jump lift / squash / stretch
- 행동 포즈: sit / sleep / use / wash / read / cook / carry
- 도구 연결용 `handAnchor()` 제공

### 집 생활 애니메이션
`kidscade-world-life-animation.js`

- 침대 눕기 + 이불 앞 레이어
- 소파 앉기 + 앞 쿠션 마스킹
- 책상 / 식탁 앉기
- 냉장고 문 열기
- 싱크대 물 흐르기
- 조리대 / 가스레인지 사용 포즈
- 책장 책 꺼내기 / 읽기
- 행동 중 이동 잠금
- ESC 행동 취소

### 야외 작업 애니메이션
`kidscade-world-work-animation.js`

- 도끼질: 나무 흔들림, 목재 파편, 효과음, 화면 흔들림. 3회 타격 후 그루터기
- 곡괭이질: 바위 흔들림, 돌 파편, 강한 화면 흔들림. 2회 타격 후 잔해
- 물주기: 물뿌리개를 손에 부착하고 실제 물줄기 렌더링
- 수확: 몸을 숙이고 손 동작 + 수확 파티클
- 채집망: 손 기준점에서 채집망을 휘두르고 곤충 포획
- 타격 시점과 판정 / 효과음 / 파티클 / 대상 흔들림 / 화면 흔들림 동기화
- 작업 중 이동 잠금 / ESC 취소

### 운반 / 보관 / 낚시
`kidscade-world-carry-fishing.js`

- 나무 파괴 → 목재 드롭
- 바위 파괴 → 돌 드롭
- 작물 수확 → 작물별 드롭
- 곤충 포획 → 곤충 드롭
- E / Space로 들기 / Q로 내려놓기
- 현재 Deluxe 아바타 앞에 든 물건 표시
- 농장 보관 상자에 넣으면 `kidscade_world_v2.inventory`에 저장
- 감자 / 당근 / 토마토를 서로 다른 픽셀 오브젝트로 운반

낚시는 집 앞 연못에서 `캐스팅 → 찌 대기 → 입질 → 제한 시간 내 E/Space → 릴 감기 → 물고기 운반` 순서로 진행합니다. 너무 일찍 당기거나 늦으면 실패합니다.

### 제작 / 체력 / 내구도 / 실제 농사
`kidscade-world-progression.js`

보관한 재료가 실제 플레이 루프에 사용됩니다.

#### 제작대
농장 제작대에서 보관 상자 재고를 소비해 제작합니다.

- 돌도끼: 목재 3 + 돌 2 / 내구도 18
- 돌곡괭이: 목재 2 + 돌 3 / 내구도 18
- 곤충채집망: 목재 2 + 돌 1 / 내구도 14
- 낚싯대: 목재 3 + 돌 1 / 내구도 16

같은 도구를 다시 제작하면 내구도를 최대치로 회복하는 수리/재제작 방식으로 동작합니다. 새 세이브가 제작 전 작업에 막히지 않도록 농장 주변에 시작용 목재/돌 드롭을 소량 배치합니다.

#### 체력
- 최대 체력 100
- 도끼질 4
- 채광 5
- 물주기 2
- 수확 2
- 채집 3
- 낚시 시작 3
- 작업하지 않을 때 천천히 자연 회복
- 집 침대에서 쉬면 체력 전부 회복

제작한 도구가 없거나 내구도가 0이면 해당 작업을 시작할 수 없습니다. 우측 상태 패널에서 체력과 각 도구 내구도를 확인할 수 있습니다.

#### 실제 작물
기존 애니메이션 검증용 3개 밭을 실제 작물 슬롯으로 승격했습니다.

- 감자: 성장 35초 / 수확 2개
- 당근: 성장 50초 / 수확 3개
- 토마토: 성장 70초 / 수확 3개

흐름은 `씨앗 심기 → 물주기 → 실제 시간 성장 → 익음 → 수확 → 작물 드롭 → 직접 운반 → 보관`입니다. 성장 시각은 `Date.now()` 기준으로 저장되므로 월드를 닫았다 다시 열어도 진행 시간이 이어집니다. 수확하면 해당 작물 씨앗 1개를 되돌려 다음 재배를 이어갈 수 있습니다.

## 월드 구성
- 집 앞 → 나의 정원 → 농장: 하나의 연속 야외 월드
- 집 문 E / Space → 집 내부
- 기존 정원 시설을 World Entity로 표시
- BQ3-Kidscade 48px 환경 디자인
- Kidscade 전용 생활 가구 10종

## 주요 파일
- `kidscade-world.html` : **현재 생활 월드 v2 기준 파일**
- `kidscade-world-core.js` : 월드 / 카메라 / 엔티티 / 충돌 / 입력 / 상호작용
- `kidscade-world-bridge.js` : 기존 Kidscade 데이터 브리지 + Deluxe AvatarActor
- `kidscade-world-life-animation.js` : 실내 생활 행동 + 기능 모듈 로더
- `kidscade-world-work-animation.js` : 야외 작업 / 도구 / 타격 FX
- `kidscade-world-carry-fishing.js` : 드롭 / 들기 / 보관 / 낚시
- `kidscade-world-progression.js` : 제작 / 체력 / 도구 내구도 / 작물 성장
- `kidscade-world-furniture-bq.js` : Kidscade 전용 생활 가구
- `kidscade-world-art-browserquest.js` : BrowserQuest 3x 아트 어댑터
- `kidscade-world-design-bq3.js` : BQ3-Kidscade 디자인 프로필
- `kidscade-world-storage.js` : v2 저장 + 재고 + 진행 상태
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 아트 출처 / 라이선스

## 데이터 안전 원칙
`kidscade_garden_v1`, 기존 Life World v1 저장값, 메인 씨앗 잔액은 수정하지 않습니다. World v2 자체 저장은 `kidscade_world_v2`만 사용합니다. 재고, 체력, 도구, 씨앗, 작물 성장 상태도 모두 이 저장값 안에만 기록합니다.

## 다음 단계
1. 제작 도구를 돌 → 철 단계로 업그레이드하고 작업 속도/수확량 차이 추가
2. 보관 작물과 물고기를 요리 시스템에 연결
3. 물고기 종류 / 희귀도 / 도감 확장
4. 큰 물건 양손 들기 / 운반 중 이동속도 감소
5. 나무 / 광맥 리스폰과 맵별 자원 밀도 설계
6. 기능 이관이 끝나면 `life-world.html`, `life-world-core-*` 레거시 삭제

## BrowserQuest 아트 정책
BrowserQuest 콘텐츠/아트는 CC BY-SA 3.0 조건을 따릅니다. World v2 엔진 코드와 Kidscade 자체 제작 가구/행동/진행 시스템은 BrowserQuest 원본 아트 레이어와 분리되어 있습니다.