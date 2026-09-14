# Kidscade 메인 구조

## 현재 진입 흐름

1. `index.html`
   - 로딩 화면만 담당한다.
   - 실제 조립 로직은 `main-bootstrap.js`에 위임한다.
2. `main-bootstrap.js`
   - `index_base.html`을 읽는다.
   - `data/games.json`의 관리 게임 카드를 한 번에 주입한다.
   - 호환성 패치와 런타임 스크립트를 연결한다.
3. `data/games.json`
   - 앞으로 새로 추가하는 게임 카드의 제목, 링크, 학년, 과목, 설명, 아이콘, 대문 이미지를 관리한다.
4. `game-cover-placeholders.js`
   - 대문 이미지만 담당한다.
   - 최근 플레이/즐겨찾기 상태는 건드리지 않는다.
5. `dashboard-recent.js`
   - 최근 플레이/즐겨찾기 미니 카드 정리와 실제 플레이 기록 검증만 담당한다.

## 새 게임 추가 원칙

새 게임 카드 때문에 `index.html`을 수정하지 않는다.
`data/games.json`의 `managedCards`에 한 항목을 추가한다.
대문 이미지만 기존 카드에 연결할 경우 `coverById`만 추가한다.

예시:

```json
{
  "id": "high_example_game",
  "title": "예시 게임",
  "href": "example.html",
  "category": "math",
  "age": "high",
  "icon": "🎮",
  "cover": "예시 게임.png",
  "description": "게임 설명"
}
```

## 당분간 유지하는 레거시 영역

`index_base.html`에는 아직 기존 게임 카드와 프로필, 상점, 모달, 플레이 시간, 씨앗 등의 큰 기능이 함께 들어 있다.
이번 단계에서는 기능 손실 위험을 줄이기 위해 이를 유지한다.
앞으로는 카드 카탈로그 → 대시보드 → 프로필/상점 순으로 별도 모듈로 옮긴 뒤 마지막에 `index_base.html` 의존성을 제거한다.

## 금지할 패턴

- 새 게임마다 `index.html`에 별도의 카드 문자열을 추가하지 않는다.
- 같은 UI 요소를 여러 스크립트에서 각각 `MutationObserver`로 보정하지 않는다.
- 최근 플레이 카드를 메인 카드의 전체 DOM 복사본으로 장기 관리하지 않는다.
- 이미지 경로를 여러 파일에 중복해서 하드코딩하지 않는다.
