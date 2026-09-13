# Kidscade World v2

Kidscade의 `나의 정원`과 `생활 월드`를 하나의 싱글플레이 월드로 합치기 위한 호환 엔진입니다.

## 현재 단계

현재는 엔진 기반을 유지하면서 BrowserQuest 3x 픽셀 아트를 실제 연속 월드에 연결하는 단계입니다.

- Canvas 기반 월드 루프
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
- 실제 BrowserQuest 상자/목재/NPC 스프라이트 연결
- BrowserQuest `tilesheet.png`를 런타임 분석해 잔디/길/흙/물/돌 후보 타일 자동 선택
- 타일시트에서 나무/덤불/바위 후보 영역 자동 선택 및 Entity 렌더링
- 48×48 타일 ID를 확인하는 `browserquest-atlas-inspector.html` 추가

## 기존 데이터 안전 원칙

`kidscade_garden_v1`, `kidscade_life_world_v1`, `kidscade_coins`는 이 단계에서 수정하지 않습니다.
새 엔진이 저장하는 값은 `kidscade_world_v2`뿐입니다.

## 주요 파일

- `kidscade-world-core.js` : 월드/카메라/엔티티/충돌/입력/상호작용 코어
- `kidscade-world-storage.js` : v2 저장 및 기존 데이터 스냅샷
- `kidscade-world-bridge.js` : Kidscade 메인과 연결하기 위한 읽기 전용 브리지
- `kidscade-world-art-browserquest.js` : BrowserQuest 3x 아트/타일시트 어댑터와 자동 팔레트 분석
- `kidscade-world-demo.html` : 연속 월드 + BQ3 지형/환경 검증 데모
- `browserquest-atlas-inspector.html` : 전체 48px 타일 ID 및 자동 선택 결과 검사기
- `THIRD_PARTY_BROWSERQUEST.md` : BrowserQuest 자산 출처 및 라이선스 안내

## BrowserQuest 아트 정책

BrowserQuest 콘텐츠/아트는 CC BY-SA 3.0 조건을 따릅니다. 엔진 코드는 아트 레이어와 분리하여, 향후 Kidscade 자체 아트로 교체할 수 있도록 유지합니다.

현재 자동 타일 선택은 빠른 디자인 검증을 위한 임시 단계입니다. 화면을 확인한 뒤 검사기에서 적절한 타일 ID를 골라 `grass`, `path`, `soil`, `water`, `stone` 및 집/나무/환경 조각을 수동 고정할 예정입니다.

## 다음 단계

1. 아틀라스 검사 결과를 바탕으로 사용할 BrowserQuest 타일 ID를 수동 고정
2. 집 외벽/지붕/문/울타리를 BQ3 타일 조합으로 정식 구성
3. 집 내부를 별도 서브맵으로 만들고 같은 48px 타일 규칙 적용
4. BrowserQuest에 없는 침대/소파/책상/주방 등은 16px 원본 → 3x 확대 규칙으로 Kidscade 전용 픽셀 가구 제작
5. 정원 동물을 임시 도형에서 Kidscade 전용 픽셀 스프라이트 + 애니메이션으로 교체
6. 농사/벌목/낚시/제작 등 기존 생활 콘텐츠를 World v2 시스템으로 순차 이전
