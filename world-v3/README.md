# Kidscade World v3

생활 월드의 새 기본 렌더러입니다. World v2의 저장 구조를 그대로 읽고 쓰되, 화면은 **2D Deluxe 아바타 + 실제 3D Kenney 환경**으로 구성합니다.

## 비주얼 원칙
- 플레이어 아바타만 2D Sprite/CanvasTexture로 유지
- 집, 자연, 농장, 자원, 제작대, 상자, 실내 가구는 Three.js 3D
- 고정 3/4 Orthographic 카메라가 플레이어를 부드럽게 추적
- 2D 아바타는 항상 카메라를 향하는 billboard이며 3D 오브젝트 깊이 판정에 참여
- v2처럼 3D 모델을 2D 스프라이트로 굽지 않음
- Tiny Farm/Town 반복 타일은 v3에서 사용하지 않음

## 저장 호환
- `../world-v2/kidscade-world-storage.js`
- `../world-v2/kidscade-world-bridge.js`

`kidscade_world_v2` 저장값의 체력, 인벤토리, 도구, 씨앗, 작물 상태를 그대로 사용합니다. Deluxe 아바타도 기존 `kidscade-avatar-studio-preview` 또는 live avatar API를 읽습니다.

## 현재 연결된 생활 행동
- 3D 집 출입
- 3D 실내 침대 휴식 / 체력 회복
- 3D 냉장고·상자 인벤토리 확인
- 3D 제작대 돌도끼·돌곡괭이 제작
- 3D 나무 벌목 / 바위 채광
- 3D 연못 낚시
- 감자 / 당근 / 토마토 밭 심기 → 물주기 → 성장 → 수확
- PC WASD/방향키 + E/Space
- 모바일 방향패드 + 행동 버튼

## 안정판
v2는 삭제하지 않습니다. v3 화면의 **2D 안정판** 버튼으로 `../world-v2/kidscade-world.html?v=8`에 바로 돌아갈 수 있습니다.

## 주요 파일
- `kidscade-world.html` : v3 화면/UI
- `kidscade-world-v3.js` : Three.js 씬, 2D 아바타 billboard, 이동/충돌/상호작용


## v3.1 배치·아바타 애니메이션
- v3 내부에 숨김 `avatar-studio.html` 런타임을 두고 `renderPreviewFrame(idle/walk/smile)`을 직접 호출
- 프레임 API가 늦거나 잠시 unavailable이어도 billboard 자체의 보폭 바운스 / squash / 그림자 변화가 동작
- 좌우 이동 시 캐릭터 이미지 즉시 반전
- 야외를 집 앞 마당 → 마을길 → 연못 휴식 구역 → 농장 작물 구역 → 작업장 제작 구역으로 재배치
- 나무는 외곽 숲, 바위는 동쪽 채광 구역 중심으로 묶어 랜덤 테스트맵 인상을 줄임
- 실내를 침실 / 거실 / 주방·식탁으로 구획하고 중앙 이동 통로를 비움
- 기존 v3 좌표와 충돌하지 않도록 `LAYOUT_VERSION=2`에서 이전 v3 위치 저장을 안전하게 재설정
