# Kidscade 3D Asset Library v4 — GitHub Desktop merge add-on

Kidscade의 기존 `assets/game/` 라이브러리에 **덮어쓰기/병합**하기 위한 3D GLB 전용 확장팩입니다.

## 설치

1. 이 ZIP을 풉니다.
2. 안의 `assets` 폴더를 Kidscade 저장소 **루트**에 복사합니다.
3. Windows에서 폴더 병합을 허용합니다.
4. GitHub Desktop에서 변경 파일을 확인합니다.
5. 예: `Add 3D asset library v4` 로 커밋한 뒤 Push origin 합니다.

기존 파일을 삭제하도록 설계하지 않았습니다. 새 경로와 새 manifest/license 파일을 추가하는 방식입니다.

## 규모

- GLB 모델: **960개**
- GLB 총 크기: **54.1 MiB**
- 애니메이션이 들어있는 GLB: **65개**
- 새로 합친 팩: **6개**
- 기존 Spelling Frog 3D 기반팩(Kenney + Frog)도 함께 포함

## 폴더

- `assets/game/3d/food/ultimate-food-pack/`
- `assets/game/3d/interiors/modular-sushi-restaurant-kit/`
- `assets/game/3d/interiors/charming-kitchen-set/`
- `assets/game/3d/characters/monsters/ultimate-monsters-bundle/`
- `assets/game/3d/weapons/scifi-turrets/`
- `assets/game/3d/city/poly-pizza-city-pack/`
- 기존 `nature / vehicles / rail / buildings / kenney-city-kit-roads / frog`도 포함

파일명은 웹 경로에 안전하도록 lowercase kebab-case로 정리했습니다. 원본 파일명은
`assets/game/manifest/3d-library-v4-source-map.json`에서 역추적할 수 있습니다.

## 라이선스 중요

**전부 CC0는 아닙니다.**

- Quaternius Ultimate Food Pack: CC0
- Quaternius Modular Sushi Restaurant Kit: CC0
- Quaternius Ultimate Monsters Bundle: CC0
- 기존 Kenney 팩 + Frog 기반팩: CC0
- Zsky Scifi Turrets: CC-BY
- Charming Kitchen set: CC0 + CC-BY 혼합
- City Pack: CC0 + CC-BY 3.0 혼합

CC-BY 모델을 실제 게임에서 사용할 때 필요한 크레딧은
`assets/game/licenses/ATTRIBUTION_REQUIRED_3D_V4.md`에 정리했습니다. 사이트 전체 중앙 크레딧은 `CREDITS.md` / `credits.html`에서 관리합니다.

## 개발용 인덱스

- `assets/game/manifest/3d-library-v4-catalog.json`
  - 런타임 경로
  - 원본 팩
  - 저자
  - 라이선스
  - SHA-256
  - GLB mesh/material/animation 개수
- `assets/game/manifest/3d-library-v4-source-map.json`
  - 원본 ZIP/파일명 → Kidscade 경로
- `assets/game/manifest/3d-library-v4-game-shortlist.json`
  - 게임 종류별 추천 폴더

## 팩별 모델 수

- `charming-kitchen-set`: 55개
- `modular-sushi-restaurant-kit`: 86개
- `poly-pizza-city-pack`: 57개
- `scifi-turrets`: 10개
- `spelling-frog-3d-base`: 657개
- `ultimate-food-pack`: 50개
- `ultimate-monsters-bundle`: 45개
