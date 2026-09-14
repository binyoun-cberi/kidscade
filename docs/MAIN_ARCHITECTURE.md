# Kidscade 메인 구조

## 현재 진입 흐름

1. `index.html`
   - 로딩 화면과 `main-bootstrap.js` 호출만 담당한다.
2. `main-bootstrap.js`
   - `index_base.html`과 `data/games.json`을 병렬로 읽는다.
   - 카탈로그 형식을 검증하고 관리 게임 카드를 한 번에 주입한다.
   - 이미 `index_base.html`에 있는 게임도 카탈로그의 대문/기록 메타데이터로 보강한다.
   - 같은 카탈로그 객체를 `window.KidscadeCatalog`로 런타임에 전달한다.
   - 레거시 `applyFilters`, `renderDashboards`, `trackRecent`는 런타임 모듈이 준비되면 새 모듈에 위임하도록 변환한다.
3. `data/games.json`
   - `schemaVersion`과 `games` 배열을 사용한다.
   - 새 게임의 제목, 링크, 학년, 과목, 설명, 아이콘, 대문 이미지, 점수 키를 관리한다.
   - 교실전쟁 3D, 네온 리프트, 멜로디 공방, 벽란도 상행기, 한자 수호전 8급, 숫자 타워, 역사 로얄부터 중앙 카탈로그로 이관했다.
4. `game-registry.js`
   - 현재 화면의 모든 게임 카드를 읽고 카탈로그 데이터와 합쳐 하나의 런타임 게임 레지스트리를 만든다.
   - 아직 JSON으로 이관되지 않은 레거시 게임도 `window.KidscadeGames` API로 동일하게 조회할 수 있다.
   - `KidscadeGames.all()`, `get(id)`, `query(...)`, `getCard(id)`를 제공한다.
5. `game-filter.js`
   - 학년, 카테고리, 검색어에 따른 게임 노출을 전담한다.
   - `KidscadeGames` 레지스트리를 기준으로 필터링하며 카드 DOM을 직접 데이터 원본으로 사용하지 않는다.
   - 기존 `index_base.html`의 `applyFilters()`는 초기 로딩 fallback만 유지하고, 런타임 이후에는 이 모듈로 위임한다.
6. `game-cover-placeholders.js`
   - `window.KidscadeCatalog`를 재사용해 대문만 렌더링한다.
   - 메인 게임 목록만 관찰한다.
   - 최근 플레이/즐겨찾기 DOM은 관찰하거나 수정하지 않는다.
7. `dashboard-recent.js`
   - `kidscade_favs`, `kidscade_recents` 저장값과 `KidscadeGames` 레지스트리로 최근 플레이/즐겨찾기를 직접 렌더링한다.
   - 메인 카드를 `cloneNode(true)`로 복사하지 않는다.
   - 별도의 MutationObserver 없이 필요한 시점에 명시적으로 다시 렌더링한다.
   - 기존 `renderDashboards()`와 `trackRecent()`는 런타임 이후 이 모듈로 위임한다.

## 새 게임 추가 원칙

새 게임 카드 때문에 `index.html`이나 `main-bootstrap.js`에 개별 카드 문자열을 추가하지 않는다.
`data/games.json`의 `games` 배열에 항목 하나를 추가한다.
이미 레거시 카드가 있는 게임도 같은 ID로 JSON에 등록하면 중복 생성하지 않고 메타데이터만 보강한다.

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

## 지금까지 제거한 결합

- 대문 스크립트의 `games.json` 중복 요청을 기본 경로에서 제거했다.
- 최근 플레이/즐겨찾기가 메인 카드 전체 DOM 복제에 의존하던 구조를 제거했다.
- 게임 데이터 스키마를 `managedCards`에서 `games`로 정리했다.
- 런타임 스크립트가 공통 카탈로그를 공유하도록 했다.
- 중앙 카탈로그에 아직 옮기지 않은 게임도 `game-registry.js`를 통해 하나의 조회 API로 묶었다.
- 대문 이미지 경로를 여러 JS 파일에 중복 하드코딩하던 구조를 줄였다.
- 검색/학년/카테고리 필터 계산을 `index_base.html`에서 `game-filter.js`로 분리했다.
- 최근 플레이 기록과 즐겨찾기 미니 카드 렌더링을 `dashboard-recent.js`가 직접 담당하도록 전환했다.
- 런타임 이후에는 레거시 `cloneNode(true)` 대시보드 경로를 사용하지 않는다.

## 당분간 유지하는 레거시 영역

`index_base.html`에는 아직 기존 게임 카드 원본과 프로필, 상점, 모달, 플레이 시간, 씨앗, 펫 등의 큰 기능이 함께 들어 있다.
기능 손실을 막기 위해 한 번에 제거하지 않는다.

다음 순서는 다음과 같다.

1. `index_base.html`의 기존 게임 카드 전체를 `data/games.json`으로 단계적으로 이관한다.
2. 게임 실행 모달과 플레이 세션/보상 로직을 `game-launcher.js` 계열 모듈로 분리한다.
3. 즐겨찾기 별 클릭 처리까지 대시보드/게임 상태 모듈로 옮겨 레거시 배열 상태를 제거한다.
4. 프로필·상점·씨앗·플레이 시간 모듈을 순차적으로 분리한다.
5. 마지막에 `index_base.html` 의존성을 제거한다.

## 금지할 패턴

- 새 게임마다 `index.html`에 별도 카드 문자열을 추가하지 않는다.
- 같은 데이터 파일을 각 기능 스크립트가 반복해서 fetch하지 않는다.
- 같은 UI 요소를 여러 스크립트에서 각각 `MutationObserver`로 보정하지 않는다.
- 최근 플레이 카드를 메인 카드의 전체 DOM 복사본으로 관리하지 않는다.
- 이미지 경로를 여러 파일에 중복해서 하드코딩하지 않는다.
- `index_base.html`을 게임 하나 추가할 때마다 개별 `slice()`/`replace()`로 수정하지 않는다.
- 새로운 기능은 가능하면 `KidscadeGames`/공통 상태 API를 통해 게임 정보를 읽는다.
