# Kidscade 메인 구조

## 현재 진입 흐름

1. `index.html`
   - 로딩 화면과 `main-bootstrap.js` 호출만 담당한다.
2. `main-bootstrap.js`
   - `index_base.html`과 `data/games.json`을 병렬로 읽는다.
   - 카탈로그 형식을 검증하고 관리 게임 카드를 한 번에 주입한다.
   - 같은 카탈로그 객체를 `window.KidscadeCatalog`로 런타임에 전달한다.
   - 호환성 패치와 런타임 스크립트 연결만 담당한다.
3. `data/games.json`
   - `schemaVersion`과 `games` 배열을 사용한다.
   - 새 게임의 제목, 링크, 학년, 과목, 설명, 아이콘, 대문 이미지를 관리한다.
   - 아직 `index_base.html`에 남아 있는 기존 게임의 대문은 `coverById`로 연결할 수 있다.
4. `game-cover-placeholders.js`
   - `window.KidscadeCatalog`를 재사용해 대문만 렌더링한다.
   - 메인 게임 목록만 관찰한다.
   - 최근 플레이/즐겨찾기 DOM은 관찰하거나 수정하지 않는다.
5. `dashboard-recent.js`
   - 실제 플레이 기록 검증과 최근 플레이/즐겨찾기 미니 카드만 담당한다.
   - 메인 카드를 `cloneNode(true)`로 복사하지 않고 필요한 정보만으로 작은 카드를 새로 만든다.
   - 미니 카드 클릭 시 원본 게임 카드를 통해 기존 게임 모달을 연다.

## 새 게임 추가 원칙

새 게임 카드 때문에 `index.html`이나 `main-bootstrap.js`에 개별 카드 문자열을 추가하지 않는다.
`data/games.json`의 `games` 배열에 항목 하나를 추가한다.
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

## 이번 단계에서 제거한 결합

- 대문 스크립트가 `games.json`을 별도로 다시 내려받던 중복 요청을 기본 경로에서 제거했다.
- 최근 플레이/즐겨찾기 카드가 메인 카드 전체 DOM 구조에 의존하던 방식을 제거했다.
- 게임 데이터 스키마를 `managedCards`에서 `games`로 정리했다.
- 런타임 스크립트가 공통 카탈로그를 공유하도록 했다.

## 당분간 유지하는 레거시 영역

`index_base.html`에는 아직 기존 게임 카드와 프로필, 상점, 모달, 플레이 시간, 씨앗 등의 큰 기능이 함께 들어 있다.
기능 손실을 막기 위해 한 번에 제거하지 않는다.

다음 순서는 다음과 같다.

1. `index_base.html`의 기존 게임 카드 전체를 `data/games.json`으로 이관한다.
2. 필터/검색이 카탈로그 데이터와 DOM 렌더러를 기준으로 동작하도록 전환한다.
3. 즐겨찾기/최근 플레이를 기존 인라인 함수와 완전히 분리한다.
4. 프로필·상점·씨앗·플레이 시간 모듈을 순차적으로 분리한다.
5. 마지막에 `index_base.html` 의존성을 제거한다.

## 금지할 패턴

- 새 게임마다 `index.html`에 별도 카드 문자열을 추가하지 않는다.
- 같은 데이터 파일을 각 기능 스크립트가 반복해서 fetch하지 않는다.
- 같은 UI 요소를 여러 스크립트에서 각각 `MutationObserver`로 보정하지 않는다.
- 최근 플레이 카드를 메인 카드의 전체 DOM 복사본으로 관리하지 않는다.
- 이미지 경로를 여러 파일에 중복해서 하드코딩하지 않는다.
- `index_base.html`을 문자열 위치에 의존해 게임별로 `slice()`/`replace()`하는 코드를 다시 추가하지 않는다.
