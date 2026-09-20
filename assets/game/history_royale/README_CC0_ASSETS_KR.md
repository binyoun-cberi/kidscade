# 역사 로얄 CC0 에셋 정리팩 v1

이 압축파일은 저장소 루트에 그대로 풀 수 있도록
`assets/game/history_royale/` 기준으로 정리했습니다.

## 포함 내용

### Quaternius Fantasy Props MegaKit (CC0)
- 역사 로얄에서 쓸 가능성이 높은 전장/보급/캠프/교역/방어 소품만 선별
- glTF + BIN 형식만 유지
- glTF가 참조하는 텍스처를 같은 폴더에 배치하여 경로가 바로 맞도록 정리
- 선택 모델: 45개
- 실제 필요한 공용 텍스처: 12개

경로:
`source_cc0/quaternius_fantasy_props/gltf/`

### Quaternius Ultimate Modular Males (CC0)
- 중복 FBX/Blend는 제외
- 애니메이션/스킨이 포함된 Individual Character glTF만 유지
- 모델: 11개

경로:
`source_cc0/quaternius_modular_males/gltf/`

주의:
King / Adventurer / Farmer 등은 병사 렌더링용 베이스로 활용할 수 있지만,
복식 자체를 삼국시대 한국 복식으로 설명하면 안 됩니다.

### Quaternius Medieval Weapons (CC0)
- FBX 버전만 유지하여 OBJ/Blend 중복 제거
- 무기: 24개

경로:
`source_cc0/quaternius_medieval_weapons/fbx/`

역사 로얄 우선 사용 후보:
Spear, Bow_Wooden, Arrow, Sword, Shield_Round 계열.

서양 판타지/중세 인상이 강한 Claymore, Celtic/Golden 계열은
삼국시대 핵심 비주얼에는 사용하지 않는 것을 권장합니다.

### Kenney Interface Sounds (CC0)
- OGG 100개 전체 유지
- 즉시 브라우저 게임 UI 효과음으로 사용 가능

경로:
`audio/ui/kenney_interface/`

추천 매핑은 `history_royale_asset_map.json` 참고.

## 라이선스

원본 라이선스 파일은 전부 `_licenses/`에 보존했습니다.
네 팩 모두 원본 라이선스 기준 CC0 1.0입니다.

- Quaternius Fantasy Props MegaKit
- Quaternius Ultimate Modular Males
- Quaternius Medieval Weapons
- Kenney Interface Sounds

CC0라 표기는 의무가 아니지만, 프로젝트 credits에 출처를 남겨두는 것을 권장합니다.

## 중요한 사용 방향

현재 역사 로얄은 Canvas 2D 게임이므로 이 3D 파일을 전부 실시간 로딩하지 않는 것이 좋습니다.
병사/소품은 필요 시 Blender 등에서 고정 시점 PNG/WebP 또는 스프라이트시트로 렌더링해서
`assets/game/history_royale/units/`, `buildings/`, `props/` 쪽에 런타임 에셋으로 두는 방식이 가장 안정적입니다.

국내성, 위례성, 금성, 첨성대 등 역사 고유 건물은 범용 서양 중세 에셋으로 교체하지 말고
기존 전용 아트를 유지하는 것이 좋습니다.
