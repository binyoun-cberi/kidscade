# Kidscade Asset Library v2

Kidscade에서 바로 쓰기 위한 **정리된 런타임 에셋 묶음**입니다.

v2는 기존 v1(Mini Market + Food Kit + Mini Characters)을 그대로 포함하고,
추가로 Cube Pets, KayKit Platformer FREE, Animal Pack Remastered, Fish Pack,
Boardgame Pack, Puzzle Pack II, Sports Pack, Planets를 정리했습니다.

## 핵심 원칙

- 원본 ZIP / FBX / OBJ / SVG / SWF / 미리보기 파일은 넣지 않았습니다.
- 3D는 가능하면 **단일 GLB**로 통일했습니다.
- KayKit Platformer는 원래 GLTF + BIN + PNG 구조지만, Kidscade에서 경로 관리가 쉽도록 선별 모델을 GLB로 패킹했습니다.
- 2D 팩은 개별 게임에서 바로 `<img>` / Canvas / CSS background로 쓸 수 있는 PNG 위주로 남겼습니다.
- 모든 동봉 팩은 업로드된 License.txt 기준 **CC0**입니다.
- 원본 라이선스 문서는 `assets/game/licenses/`에 보존했습니다.

## 새 폴더

- `assets/game/characters/pets/` — Cube Pets 3D 동물 24종
- `assets/game/platformer/gates/` — 정답 관문/아치
- `assets/game/platformer/platforms/` — 바닥, 경사로, 홀, 화살표 발판
- `assets/game/platformer/obstacles/` — 장벽, 폭탄, 콘, 난간
- `assets/game/platformer/pickups/` — 별, 하트, 다이아몬드, 파워
- `assets/game/platformer/mechanics/` — 스프링 패드, 후프 등
- `assets/game/platformer/signs/` — 방향 표지, 깃발, 결승선
- `assets/game/platformer/structures/` — 구조물/기둥
- `assets/game/2d/animals/` — Round/Square 동물 PNG
- `assets/game/2d/fish/` — 물고기/수초/바위/버블 PNG
- `assets/game/2d/boardgame/` — 카드/칩/주사위/말
- `assets/game/2d/puzzle/` — 파이프/볼/코인/패들/파티클
- `assets/game/2d/sports/` — 장비/경기장 요소/캐릭터
- `assets/game/space/planets/` — 완성형 행성 PNG 10종
- `assets/game/audio/boardgame/` — 카드/칩/주사위 OGG 효과음

## 바로 다음 리워크: 멍멍 곱셈 러너

추천 시작 조합:

```js
const dog = KIDSCADE_ASSETS.aliases.runner_dog;
const road = KIDSCADE_ASSETS.aliases.runner_platform;
const redGate = KIDSCADE_ASSETS.aliases.runner_gate_red;
const greenGate = KIDSCADE_ASSETS.aliases.runner_gate_green;
const star = KIDSCADE_ASSETS.aliases.runner_star;
const finish = KIDSCADE_ASSETS.aliases.runner_finish;
```

Cube Pets 공통 애니메이션:
`dance, eat, gesture-negative, gesture-positive, idle, run, static, walk`

## 파일 수

정리된 런타임 에셋: **1605개**

- 기존 v1 3D: 246
- Cube Pets GLB: 24
- Platformer GLB: 198
- 2D Animals: 60
- Fish: 126
- Boardgame PNG/OGG: 535
- Puzzle: 219
- Sports: 187
- Planets: 10

`CURRENT_GAME_SHORTLIST.json`에는 현재 Kidscade에서 바로 활용하기 좋은 게임별 추천 경로를 넣었습니다.
`PACK_INDEX.json`에는 어떤 원본을 무엇 때문에 남기거나 제외했는지 적었습니다.
