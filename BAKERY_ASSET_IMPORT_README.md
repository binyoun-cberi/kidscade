# KIDSCade Bakery Asset Import Pack

GitHub Desktop용으로 정리된 빵집 타이쿤 에셋 묶음입니다.

## 넣는 방법
1. 이 ZIP의 내용물을 KIDSCade 저장소 **루트**에 그대로 복사합니다.
2. 기존 파일을 덮어쓰는 구조는 없습니다. 새 경로만 추가됩니다.
3. GitHub Desktop에서 변경 파일을 확인한 뒤 커밋합니다.

권장 커밋 메시지: `Add bakery tycoon asset pack`

## 경로
- `assets/game/3d/bakery/interior/` — Tiny Treats Bakery Interior, GLB 변환본
- `assets/game/3d/bakery/baked-goods/` — Tiny Treats Baked Goods, GLB 변환본
- `assets/game/3d/bakery/restaurant-bits/` — KayKit Restaurant Bits, GLB 변환본
- `assets/audio/sfx/bakery/` — 게임용 짧은 효과음
- `assets/audio/sfx/bakery/source/` — 사용자가 올린 원본 효과음 보존
- `assets/game/licenses/bakery/` — 원본 라이선스
- `assets/game/manifest/bakery-asset-pack.json` — 전체 파일/해시/출처 목록
- `assets/game/manifest/bakery-assets.js` — 핵심 에셋 별칭

## 핵심 에셋
`stand-mixer.glb`, `scale.glb`, `bread-oven.glb`, `dough-ball.glb`, `dough-rolled-a.glb`, `dough-roller.glb`, `flour-sack-open.glb`, `display-case-long.glb`, `cash-register.glb`, `pricing-card.glb`가 빵집 기본 루프에 바로 쓰기 좋습니다.

Baked Goods에는 `bread`, `bread-slice`, `baguette`, `croissant`, `cinnamon-roll`, `muffin`, `cupcake`, `donut`, `pie`, `waffle` 등이 들어 있습니다.

## 주의
기존 `assets/game/food/`의 Kenney 음식 에셋과 이름이 겹쳐도 폴더가 분리되어 충돌하지 않습니다. 게임 코드에서는 `bakery-assets.js`의 경로를 우선 사용하면 됩니다.
