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
