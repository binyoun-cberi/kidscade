# Kidscade Asset Library v3

기존 v2를 그대로 보존하면서, 이번 업로드의 Kenney 2D 팩들을 **경로 충돌과 의존성 꼬임 없이** 추가한 런타임 에셋 라이브러리입니다.

## 이번 버전의 가장 중요한 규칙

1. **기존 v2 경로는 하나도 바꾸지 않았습니다.** 이미 연결된 게임을 깨지 않기 위한 원칙입니다.
2. 새 파일은 모두 URL에 안전한 **소문자 kebab-case** 경로로 정리했습니다.
3. 개별 PNG는 `assets/game/2d/` 아래에, 스프라이트시트/타일맵 같은 묶음은 `assets/game/atlases/` 아래에 분리했습니다.
4. XML/TXT가 필요한 atlas는 `assets/game/compound-assets.json`에 **의존성 그룹**으로 선언했습니다. 이 그룹은 파일 하나만 떼어 옮기면 안 됩니다.
5. 모든 원본 ZIP 내부 경로와 새 런타임 경로는 `assets/game/import-map.json`에서 1:1로 추적할 수 있습니다.
6. 전체 신규 파일은 `assets/game/asset-catalog.json`에 크기, 이미지 해상도, SHA-256, 원본 팩/원본 경로까지 기록했습니다.
7. `kenney_platformer-art-extended-enemies`는 Deluxe 안의 동일 섹션과 **바이트 단위로 중복**되어, 라이선스와 출처만 보존하고 런타임 파일은 두 번 넣지 않았습니다.

## 신규 런타임 루트

- `assets/game/2d/platformer-art/` — Platformer Art Deluxe 개별 PNG
- `assets/game/2d/flags/` — 128px 국기 PNG
- `assets/game/2d/vehicles/pixel/` — 픽셀 자동차/캐릭터/소품
- `assets/game/2d/urban/rpg/` — 16px 도시 RPG 타일
- `assets/game/2d/pirate/` — 해적/선박/타일/이펙트 (Retina 선택)
- `assets/game/2d/tower-defense/top-down/` — 탑다운 TD (Retina 선택)
- `assets/game/2d/letters/` — 8종 재질 글자 타일
- `assets/game/2d/tower-defense/isometric/` — 아이소메트릭 TD
- `assets/game/atlases/` — 스프라이트시트 + XML/TXT 등 복합 에셋

## 복합 에셋 사용 규칙

예를 들어 차량 스프라이트시트는 PNG 하나가 완성품이 아닙니다.

```text
assets/game/atlases/vehicles/pixel/spritesheet-complete.png
assets/game/atlases/vehicles/pixel/spritesheet-complete.xml
```

둘을 함께 배포해야 합니다. 정확한 그룹 목록은 `assets/game/compound-assets.json`을 기준으로 합니다.

## 신규 메타데이터

- `assets/game/asset-catalog.json` — 실제 런타임 에셋 카탈로그
- `assets/game/import-map.json` — 원본 ZIP 경로 → 새 경로
- `assets/game/compound-assets.json` — 같이 움직여야 하는 파일 묶음
- `SOURCE_PACKS.json` — 팩별 라이선스/선별 정책
- `DUPLICATE_CONTENT_REPORT.json` — 신규 라이브러리 내부 동일 바이트 파일 검사 결과

## 수량

이번 v3에서 새로 인덱싱한 런타임 파일: **2718개**  
복합 에셋 그룹: **18개**

원본 라이선스는 모두 `assets/game/licenses/`에 보존했습니다.
