# Kidscade 메인 구조

## 현재 진입 흐름

1. `index.html`
   - 로딩 화면과 `main-bootstrap.js` 호출만 담당한다.
   - bootstrap의 쿼리 버전 하나가 `index_base.html`, `games.json`, 런타임 JS의 캐시 버전을 함께 결정한다.
2. `main-bootstrap.js`
   - `index_base.html`과 `data/games.json`을 병렬로 읽는다.
   - 카탈로그 형식을 검증한다.
   - `index_base.html`에 남아 있는 레거시 게임 카드 마크업은 실행 전에 제거하고, 현재 화면의 게임 카드를 `data/games.json`에서 전부 다시 렌더링한다.
   - 레거시 카드에서 쓰던 SVG 아이콘은 카탈로그의 `iconHtml`로 보존하며 안전한 SVG만 렌더링한다.
   - 같은 카탈로그 객체를 `window.KidscadeCatalog`로 런타임에 전달한다.
   - 레거시 필터/대시보드/추천/게임 실행 컨트롤러는 런타임 모듈이 준비되면 각 전용 모듈로 위임한다.
   - 아직 인라인 스코프에 남은 펫·씨앗·미션·플레이시간 기능은 `gameLauncherBridge`를 통해 런처에 필요한 최소 콜백만 제공한다.
3. `data/games.json`
   - 게임 정보와 게임 카드 표시 정보의 중앙 원본이다.
   - 현재 게임 95개를 모두 포함한다.
   - 제목, 링크, 학년/모드, 과목, 설명, 아이콘, 선택적 SVG 아이콘, 대문 이미지, 점수/랭크 키를 관리한다.
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
   - 즐겨찾기 추가/해제와 별 상태를 전담하며 `KidscadeDashboard.toggleFavorite()`, `favorites()`, `isFavorite()` API를 제공한다.
   - 최근 플레이도 `KidscadeDashboard.remember()`, `recents()`, `isRecent()` API로 한 곳에서 관리한다.
   - 즐겨찾기/최근 플레이 변경 시 각각 `kidscade:favorites-changed`, `kidscade:recents-changed` 이벤트를 보낸다.
   - 별 클릭은 `#game-list`에서 캡처 단계 이벤트 위임으로 처리해 카드의 게임 실행 click과 충돌하지 않는다.
   - 메인 카드를 복제하지 않고 미니 카드를 별도로 만든다.
   - Quick Hub의 탭, 빈 상태, 표시 여부를 단독으로 관리한다.
8. `game-recommendations.js`
   - 쑥쑥이 추천 점수 계산을 전담한다.
   - 게임 정보는 `KidscadeGames`에서 받고 즐겨찾기/최근 플레이는 `KidscadeDashboard` 상태 API를 사용한다.
   - 카테고리 선호, 대표 학습 성향, 즐겨찾기, 최근 플레이 여부, 기록형 게임 여부, 설명 길이, 플레이 이력을 점수로 합산한다.
   - 카드 DOM을 직접 읽지 않으며 Node에서도 같은 점수 함수를 테스트할 수 있다.
9. `game-launcher.js`
   - 게임 카드 클릭부터 iframe 열기, 세션 시작/종료, 추천 에너지 사용, 최근 플레이 기록, 보상 계산 흐름을 담당한다.
   - 30초 보상 기준, 플레이 시간별 씨앗/경험치, 추천 에너지 2배 보상 계산을 `calculateReward()` 한 곳에 둔다.
   - 종료 시 플레이시간 체크포인트, 씨앗 지급, 펫 경험치, 미션, 정원 세션 기록을 하나의 순서로 처리한다.
   - 인라인 레거시 상태를 직접 참조하지 않고 bootstrap이 제공하는 bridge 콜백을 사용한다.
   - 보상 계산과 세션 흐름은 Node 회귀 테스트로 검증한다.

## 게임 카탈로그 이관 도구

`scripts/migrate-game-catalog.cjs`는 `index_base.html`에 남아 있는 기존 게임 카드를 읽어 `data/games.json` 형식으로 변환하는 유지보수 도구다.

```bash
node scripts/migrate-game-catalog.cjs --write
```

현재 전환 기간 동안 레거시 카드와 카탈로그가 어긋나는 것을 막기 위해 `tests/main-architecture.test.cjs`가 모든 레거시 게임 ID가 중앙 카탈로그에 존재하는지 검사한다. 이관 도구는 여러 번 실행해도 같은 결과가 나오도록 설계한다. 레거시 카드의 `game-icon`이 SVG인 경우 안전한 SVG 마크업을 `iconHtml`로 보존한다.

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

기본 아이콘은 `icon` 문자열을 사용한다. 꼭 필요한 기존 커스텀 SVG 카드만 `iconHtml`을 유지한다. `iconHtml`에는 이벤트 속성, script, iframe, object, embed, javascript URL을 허용하지 않는다.

`age`는 현재 `toddler`, `low`, `high`, `job`, `all`을 사용한다. 카테고리는 `math`, `korean`, `lang`, `trivia`, `music`, `job`, `all` 범위에서 관리한다.

## 지금까지 제거한 결합

- `index.html`의 전역 `fetch` monkeypatch를 제거했다.
- 대문 스크립트의 `games.json` 중복 요청과 `coverById` 중복 원본을 제거했다.
- 최근 플레이/즐겨찾기의 메인 카드 `cloneNode(true)` 의존을 제거했다.
- 검색/학년/카테고리 필터 계산을 `game-filter.js`로 분리했다.
- Quick Hub 상태와 렌더링을 `dashboard-recent.js` 한 곳으로 모았다.
- 같은 UI를 여러 MutationObserver가 동시에 보정하던 경로를 줄였다.
- 현재 95개 게임을 중앙 카탈로그에 등록했다.
- `game-registry.js`가 DOM에서 게임 데이터를 역추출하던 구조를 제거했다.
- 개별 `.fav-star`에 직접 listener를 붙이던 레거시 경로를 제거하고 즐겨찾기 상태 변경을 `dashboard-recent.js`로 모았다.
- 최근 플레이 상태 조회/변경도 `dashboard-recent.js`의 공통 API로 모았다.
- 메인 화면의 게임 카드 자체도 더 이상 `index_base.html`의 레거시 카드 데이터를 사용하지 않고 카탈로그에서 생성한다.
- 쑥쑥이 추천 점수 계산이 카드 DOM과 레거시 `favorites`/`recents` 배열을 직접 읽던 정상 런타임 경로를 제거하고 `game-recommendations.js` + 공통 상태 API로 전환했다.
- 게임 iframe 실행과 세션 보상 계산의 정상 런타임 경로를 `game-launcher.js`로 분리했다.

## 아직 남은 레거시 영역

`index_base.html`에는 이관 검증과 안전한 롤백을 위해 기존 게임 카드 마크업이 물리적으로 남아 있지만, 정상 진입 경로에서는 bootstrap이 이를 제거한 뒤 카탈로그 카드로 대체한다. 프로필, 씨앗 지갑, 플레이시간 저장, 상점, 펫 UI, 미션과 랭크/배지 기능은 아직 큰 인라인 스크립트에 남아 있다. 게임 런처는 이 기능들을 직접 소유하지 않고 bridge를 통해 호출하는 전환 단계다.

다음 순서는 다음과 같다.

1. 플레이 시간 저장과 씨앗 지갑을 공통 상태 모듈로 분리해 `gameLauncherBridge`의 콜백 수를 줄인다.
2. 프로필·랭크/배지·미션 상태를 각 모듈로 분리한다.
3. 상점과 펫 기능을 각 도메인 모듈로 분리한다.
4. 위 모듈화가 충분히 진행되면 `index_base.html`의 레거시 카드 마크업과 fallback 컨트롤러를 실제 파일에서도 삭제한다.
5. 마지막에 `index_base.html`을 작은 레이아웃 템플릿으로 축소하거나 제거한다.

## 금지할 패턴

- 새 게임마다 `index.html`이나 `index_base.html`에 별도 카드 문자열을 추가하지 않는다.
- 같은 데이터 파일을 각 기능 스크립트가 반복해서 fetch하지 않는다.
- 같은 UI 요소를 여러 스크립트에서 각각 MutationObserver로 보정하지 않는다.
- 최근 플레이 카드를 메인 카드 전체 DOM 복사본으로 관리하지 않는다.
- 이미지 경로를 여러 파일에 중복해서 하드코딩하지 않는다.
- 런타임 게임 정보의 원본으로 카드 DOM을 사용하지 않는다.
- 즐겨찾기/최근 플레이 상태를 개별 카드 이벤트 핸들러가 직접 관리하지 않는다.
- 추천 점수 계산에서 카드 DOM을 데이터 원본으로 사용하지 않는다.
- 게임 보상 계산을 여러 UI 이벤트 핸들러에 중복 구현하지 않는다.
- 메인 게임 카드 마크업을 `index_base.html`에 새로 추가하지 않는다.
- 새로운 기능은 `KidscadeGames`와 공통 상태 API를 통해 게임 정보를 읽는다.
