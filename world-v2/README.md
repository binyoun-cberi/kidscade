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
새 플레이어 캐릭터를 만들지 않습니다.

`kidscade-world-bridge.js`의 `AvatarActor`가 현재 Kidscade Deluxe 아바타를 그대로 월드 플레이어로 사용합니다.

- 현재 헤어 / 얼굴 / 눈 / 옷 / 피부 등 외형 유지
- `renderAvatarSVG()` / 저장된 `kidscade-avatar-studio-preview` 사용
- 가능하면 기존 `renderPreviewFrame(idle / walk / jump / smile)` 활용
- 좌우 반전
- 걷기 바운스 / idle 호흡
- jump lift / squash / stretch
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

현재 Deluxe 아바타의 손 기준점에서 도구가 시작되고 몸 기울기와 도구 궤적이 같은 타임라인으로 움직입니다.

- 도끼질: 나무 흔들림, 목재 파편, 효과음, 화면 흔들림. 3회 타격 후 그루터기
- 곡괭이질: 바위 흔들림, 돌 파편, 강한 화면 흔들림. 2회 타격 후 잔해
- 물주기: 물뿌리개를 손에 부착하고 실제 물줄기 렌더링
- 수확: 몸을 숙이고 손 동작 + 수확 파티클
- 채집망: 손 기준점에서 채집망을 휘두르고 곤충 포획
- 타격 시점은 행동 진행률 약 40~56% 구간에 맞춰 실제 판정과 시각 효과가 동시에 발생
- 작업 중 이동 잠금 / ESC 취소
- 작업용 FX 엔티티가 도구, 파티클, 떠오르는 텍스트를 월드 공간에 렌더링

농장에는 현재 애니메이션 검증용 작물 3곳이 있으며 `물주기 → 수확 → 재생성` 흐름으로 반복 테스트할 수 있습니다.

### 운반 / 보관 / 낚시
`kidscade-world-carry-fishing.js`

작업 결과를 단순 숫자로 바로 지급하지 않고 월드 오브젝트로 이어지게 합니다.

- 나무 파괴 → 목재 드롭
- 바위 파괴 → 돌 드롭
- 작물 수확 → 수확물 드롭
- 곤충 포획 → 곤충 드롭
- E / Space로 드롭을 들어 현재 Deluxe 아바타 앞에 표시
- 물건을 든 상태에서도 이동 가능
- Q로 내려놓기
- 농장 보관 상자에 넣으면 `kidscade_world_v2.inventory`에 저장
- 보관 상자가 비어 있지 않으면 목재 / 돌 / 수확물 / 물고기 / 곤충 수량 확인 가능

낚시는 집 앞 연못 가장자리의 낚시 포인트에서 시작합니다.

1. E / Space로 낚싯대 캐스팅
2. 찌와 낚싯줄이 월드에 렌더링
3. 랜덤한 시간 동안 입질 대기
4. 입질 표시가 나오면 제한 시간 안에 E / Space
5. 너무 일찍 당기거나 늦으면 실패
6. 성공하면 물고기를 바로 손에 든 상태가 됨
7. 보관 상자까지 직접 운반하여 저장

낚시 중 ESC는 낚시만 취소하고 월드를 닫지 않습니다. 기본 조작은 `WASD/방향키 이동`, `E/Space 상호작용`, `Q 내려놓기`, `ESC 현재 행동 취소`입니다.

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
- `kidscade-world-furniture-bq.js` : Kidscade 전용 생활 가구
- `kidscade-world-art-browserquest.js` : BrowserQuest 3x 아트 어댑터
- `kidscade-world-design-bq3.js` : BQ3-Kidscade 디자인 프로필
- `kidscade-world-storage.js` : v2 저장 + 보관 상자 재고
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 아트 출처 / 라이선스

## 데이터 안전 원칙
`kidscade_garden_v1`, 기존 Life World v1 저장값, 메인 씨앗 잔액은 수정하지 않습니다. World v2 자체 저장은 `kidscade_world_v2`만 사용하며, 현재 보관 상자 재고도 이 저장값 안에만 기록합니다.

## 다음 단계
1. 보관한 목재 / 돌 / 수확물을 실제 제작 시스템과 연결
2. 체력 / 작업 소모량 / 도구 내구도 연결
3. 작물 종류 / 성장 시간 / 씨앗 심기 등 실제 농사 시스템 이관
4. 물고기 종류 / 희귀도 / 도감 / 낚시 장비 확장
5. 운반 물건 크기에 따른 양손 들기 / 느린 이동 등 확장
6. 기능 이관이 끝나면 `life-world.html`, `life-world-core-*` 레거시 삭제

## BrowserQuest 아트 정책
BrowserQuest 콘텐츠/아트는 CC BY-SA 3.0 조건을 따릅니다. World v2 엔진 코드와 Kidscade 자체 제작 가구/행동 시스템은 BrowserQuest 원본 아트 레이어와 분리되어 있습니다.