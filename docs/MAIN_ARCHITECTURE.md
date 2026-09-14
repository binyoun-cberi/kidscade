# Kidscade 메인 구조

## 현재 진입 흐름

1. `index.html`
   - 로딩 화면과 `main-bootstrap.js` 호출만 담당한다.
   - bootstrap의 쿼리 버전 하나가 `index_base.html`, `games.json`, 런타임 JS의 캐시 버전을 함께 결정한다.
2. `main-bootstrap.js`
   - `index_base.html`과 `data/games.json`을 병렬로 읽는다.
   - 카탈로그 형식을 검증한다.
   - 아직 `index_base.html`에 남아 있는 카드에는 카탈로그 메타데이터를 보강하고, JSON에만 있는 게임은 카드로 생성한다.
   - 같은 카탈로그 객체를 `window.KidscadeCatalog`로 런타임에 전달한다.
   - 레거시 `applyFilters`, `renderDashboards`, `trackRecent`는 런타임 모듈이 준비되면 새 모듈에 위임한다.
3. `data/games.json`
   - 게임 정보의 중앙 원본이다.
   - 현재 게임 95개를 모두 포함한다. 이 중 91개는 기존 `index_base.html` 카드에서 이관했고 4개는 JSON 전용으로 먼저 추가된 게임이다.
   - 제목, 링크, 학년/모드, 과목, 설명, 아이콘, 대문 이미지, 점수/랭크 키를 관리한다.
4. `game-registry.js`
   - `window.KidscadeCatalog.games`만 읽어 런타임 레지스트리를 만든다.
   - 카드 DOM은 더 이상 게임 데이터 원본으로 사용하지 않는다.
   - `KidscadeGames.all()`, `get(id)`, `query(...)`를 제공한다.
   - `getCard(id)`는 렌더링된 카드 DOM을 찾는 view helper일 뿐이다.
5. `game-filter.js`
   - 학년, 카테고리, 검색어에 따른 게임 노출을 전담한다.
   - `KidscadeGames` 레지스트리를 기준으로 필터링한다.
6. `game-cover-placeholders.js`
   - 공통 카탈로그/레지스트리의 `cover` 값을 사용해 대문만 렌더링한다.
   - `games.json`을 별도로 다시 fetch하지 않는다.
7. `dashboard-recent.js`
   - `kidscade_favs`, `kidscade_recents`와 `KidscadeGames`로 최근 플레이/즐겨찾기를 렌더링한다.
   - 메인 카드를 복제하지 않고 미니 카드를 별도로 만든다.
   - Quick Hub의 탭, 빈 상태, 표시 여부를 단독으로 관리한다.

## 게임 카탈로그 이관 도구

`scripts/migrate-game-catalog.cjs`는 `index_base.html`에 남아 있는 기존 게임 카드를 읽어 `data/games.json` 형식으로 변환하는 유지보수 도구다.

```bash
node scripts/migrate-game-catalog.cjs --write
```

현재 전환 기간 동안 레거시 카드와 카탈로그가 어긋나는 것을 막기 위해 `tests/main-architecture.test.cjs`가 모든 레거시 게임 ID가 중앙 카탈로그에 존재하는지 검사한다. 이관 도구는 여러 번 실행해도 같은 결과가 나오도록 설계한다.

## 새 게임 추가 원칙

새 게임 때문에 `index.html`, `main-bootstrap.js`, `index_base.html`에 카드 문자열을 추가하지 않는다. `data/games.json`에 항목 하나를 추가한다.

```json
{
  "id": "high_example_game",
  "title": "예시 게임",
  "href": "example.html",
  "category": "math",
  "age": "high",
  "icon": "🎮",
  "cover": "assets/gate-image/example.png",
  "description": "게임 설명"
}
```

`age`는 현재 `toddler`, `low`, `high`, `job`, `all`을 사용한다. 카테고리는 `math`, `korean`, `lang`, `trivia`, `music`, `job`, `all` 범위에서 관리한다.

## 지금까지 제거한 결합

- `index.html`의 전역 `fetch` monkeypatch를 제거했다.
- 대문 스크립트의 `games.json` 중복 요청과 `coverById` 중복 원본을 제거했다.
- 최근 플레이/즐겨찾기의 메인 카드 `cloneNode(true)` 의존을 제거했다.
- 검색/학년/카테고리 필터 계산을 `game-filter.js`로 분리했다.
- Quick Hub 상태와 렌더링을 `dashboard-recent.js` 한 곳으로 모았다.
- 같은 UI를 여러 MutationObserver가 동시에 보정하던 경로를 줄였다.
- 기존 91개 카드의 메타데이터를 포함해 현재 95개 게임을 중앙 카탈로그에 등록했다.
- `game-registry.js`가 DOM에서 게임 데이터를 역추출하던 구조를 제거했다.

## 아직 남은 레거시 영역

`index_base.html`에는 기존 게임 카드 마크업이 물리적으로 남아 있으며 프로필, 상점, 게임 실행 모달, 플레이 시간, 씨앗, 펫 기능도 함께 들어 있다. 중앙 카탈로그 이관은 완료됐지만 화면 렌더링과 플레이 세션 일부가 아직 이 파일에 의존한다.

다음 순서는 다음과 같다.

1. 메인 게임 카드 렌더링을 `data/games.json` 기준으로 완전히 전환하고 bootstrap에서 레거시 카드 마크업 의존을 끊는다.
2. 즐겨찾기 별 클릭 처리를 상태 모듈로 옮겨 레거시 `favorites` 배열과 이벤트 바인딩을 제거한다.
3. 게임 실행 iframe, 세션 시간 측정, 최근 플레이, 보상 처리를 `game-launcher.js` 계열로 분리한다.
4. 프로필·상점·씨앗·플레이 시간·펫을 순차적으로 모듈화한다.
5. 마지막에 `index_base.html`을 작은 레이아웃 템플릿으로 축소하거나 제거한다.

## 금지할 패턴

- 새 게임마다 `index.html`이나 `index_base.html`에 별도 카드 문자열을 추가하지 않는다.
- 같은 데이터 파일을 각 기능 스크립트가 반복해서 fetch하지 않는다.
- 같은 UI 요소를 여러 스크립트에서 각각 MutationObserver로 보정하지 않는다.
- 최근 플레이 카드를 메인 카드 전체 DOM 복사본으로 관리하지 않는다.
- 이미지 경로를 여러 파일에 중복해서 하드코딩하지 않는다.
- 런타임 게임 정보의 원본으로 카드 DOM을 사용하지 않는다.
- 새로운 기능은 `KidscadeGames`와 공통 상태 API를 통해 게임 정보를 읽는다.
