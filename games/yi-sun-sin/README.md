# 이순신 — 옥포 해전 (1차 플레이 버전)

독립적으로 실행되는 HTML5 Canvas 기반 2D 해전 게임. `games/yi-sun-sin/index.html`에서 시작한다.

## 플레이 흐름

1. 판옥선을 방향키 또는 WASD로 항해한다. 모바일에서는 왼쪽의 조이스틱을 원하는 방향으로 끌어 조종한다.
2. 적 함선이 좌현 또는 우현 사거리 안으로 들어오면 자동으로 포격한다.
3. 아군 협선의 도움을 받아 3차례의 적선 공세를 막는다.
4. 교전 사이 화포, 장전, 선체, 조타, 사거리 중 하나를 강화한다.
5. 전투 신호(Space/버튼)는 8초 동안 아군 협선의 재장전을 단축한다(재사용 대기 24초).

## 파일

- `sim.mjs`: 결정론적 함선 이동, 적 AI, 좌우 함포 판정, 충돌, 웨이브·강화·승패 처리. DOM과 독립.
- `game.js`: Canvas 묘화, 화면 정보, 키보드·터치 조작, 소리, 기록.
- `style.css` 및 `index.html`: PC와 모바일 레이아웃.
- `../../tests/yi-sun-sin-sim.test.cjs`: Node 기본 테스트 러너로 실행하는 단위 테스트.

## 역사 범위

1592년 옥포 해전을 바탕으로 만든 **재구성된 게임**이다. 정확한 함선 수, 적선 등장 순서, 전투의 세부 시간은 게임 규칙에 맞게 각색했다. 거북선은 옥포 단계에서 운용하지 않는다. 사천 해전 이후 해금 및 학익진, 명량의 조류 등은 후속 개발 범위다.

## 참고 및 저작권

자체 작성한 HTML/CSS/JavaScript 코드와 SVG 아트로 구성된다. 설계 시 다음 공개 프로젝트의 방식을 참고했다. 해당 프로젝트의 코드를 직접 복사하지 않았다.

- [PirateShipGame](https://github.com/CuriousCrow123/PirateShipGame) (MIT): 측면 함포, 함선의 구성요소, 진행형 웨이브, 효과 분리 설계.
- [Vampire Survivors Clone](https://github.com/migalvalm/vampire-survivors-clone) (MIT): 자동 전투 및 강화 선택의 구성.
- [Survivors Starter Kit](https://github.com/DarkRewar/SurvivorsStarterKit) (MIT): 전투 중 적 성장·플레이어 강화의 기획 참고. Godot 4 C# 코드는 브라우저용으로 사용하지 않음.

원작 `GUNBOAT-8`의 코드·그래픽·음향은 포함하지 않았다.
