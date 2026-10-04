# KIDSCADE 학교 탐험가 v3 기본 세트

## 적용
1. 현재 프로젝트 JSON을 저장해 백업합니다.
2. 관리자 아바타 제작실의 전체/파츠 JSON 적용에서는 `school-starter.json`을 사용합니다.
3. 공개 꾸미기 화면은 `manifest.json`과 검수된 파츠 카탈로그만 읽으며 JSON 가져오기/내보내기는 노출하지 않습니다.

- 128×128, 좌상단 원점, ROOT_X=64, GROUND_Y=118.
- maple-lite-body-v3의 23프레임(STAND 2, WALK 4, JUMP 1, ATTACK 5, HURT 2, DEAD 4, SIT 2, PICKUP 3)을 사용합니다.
- 피부색은 BODY 팔레트 런타임 리맵으로 자유롭게 바꿀 수 있고 원본 명암을 유지합니다.
- 기본 헤어·입·귀걸이·교복 상하의·운동화·자·교과서는 기존 school-starter 세트를 유지합니다.

## 눈 파츠
- `eyes/catalog.json`이 공개 눈 카탈로그입니다.
- `basic-eyes-01` 기본형에 JSON 픽셀 파츠 10종을 추가해 총 11종입니다.
- 각 눈은 PNG가 아니라 128×128 좌표 픽셀 JSON이며, 기본 눈을 지운 뒤 BODY 피부색을 복원하고 새 눈을 합성합니다.
- `frameTransforms`는 현재 제작실의 파생 동작 규칙과 동일합니다. STAND/WALK/JUMP 기준 눈을 ATTACK/HURT/DEAD/SIT/PICKUP에 변환하므로 동작마다 별도 PNG를 중복 저장하지 않습니다.
- 피부색을 바꾼 뒤에도 눈 아래 복원색은 현재 프레임에서 샘플링하므로 얼굴에 원래 피부색 사각형이 남지 않습니다.

## 사이트 연결
- 공개 `avatar-studio.html`의 눈 탭에서 11종을 바로 선택할 수 있습니다.
- 선택값은 `kidscade-avatar-v3` 상태의 `assetIds.eyes`에 저장되고 로비 미리보기 API에도 그대로 전달됩니다.
- 눈 썸네일은 얼굴 부분을 확대해 비교할 수 있습니다.
- JSON 편집 기능은 공개 꾸미기에 추가하지 않았습니다.

## 검증
- 카탈로그 항목 수, 10개 추가 JSON의 좌표/RGBA 범위, 23프레임 변환 규칙, 공개 UI 연결, 상태 저장 및 기존 피부색 기능 보존을 테스트합니다.
