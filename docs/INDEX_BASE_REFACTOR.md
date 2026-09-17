# index_base.html 정리 계획

`index_base.html`은 아직 Kidscade의 레이아웃, 레거시 카드 마크업, 상점·펫·프로필 관련 인라인 로직이 함께 남아 있는 전환기 파일입니다.

## 완료된 단계

### 1단계 — CSS 분리

- 거대한 인라인 `<style>` 블록을 `main-shell.css`로 이동했습니다.
- `index_base.html`은 화면 골격과 아직 분리하지 않은 레거시 동작 위주로 남겼습니다.
- `main-bootstrap.js`가 런타임 버전을 CSS URL에도 붙여 캐시 불일치를 막습니다.
- `tests/index-base-shell.test.cjs`로 링크, 핵심 셀렉터, 캐시 버전 연결을 검증합니다.

### 2단계 — 플레이시간 상태 분리

- 초 단위 누적시간, 예전 분 단위 저장 키 호환, 화면 표시, 다중 탭 동기화를 `playtime-state.js`로 이동했습니다.
- `index_base.html`에는 현재 게임 세션의 체크포인트 계산만 남기고 실제 누적 저장은 공통 모듈에 위임합니다.
- 기존 `kidscade_playtime_sec`, `kidscade_playtime` 키를 그대로 사용해 이전 저장값을 보존합니다.
- `tests/playtime-state.test.cjs`, `tests/index-base-playtime.test.cjs`를 정식 CI에 포함했습니다.

### 3단계 — 씨앗 지갑 분리

- 씨앗 잔액 읽기·쓰기·증감·잔액 부족 검사를 `seed-wallet.js`로 이동했습니다.
- `kidscade_coins` 물리 키는 그대로 유지해 기존 학생의 저장값과 생활월드/정원 호환을 보존합니다.
- 다른 탭/iframe의 `storage` 변경과 `KidscadeStorage`의 같은 탭 변경 이벤트를 지갑이 중앙에서 동기화합니다.
- `index_base.html`의 `changeSeeds()`/`addCoins()`는 기존 호출부를 깨지 않도록 공통 지갑을 호출하는 호환 래퍼로 남겼습니다.
- 상점·아바타·펫이 참조하는 `coins`는 현재 단계에서 읽기 미러로 유지하고, 이후 각 도메인 분리 과정에서 제거합니다.
- `tests/seed-wallet.test.cjs`, `tests/index-base-seed-wallet.test.cjs`를 정식 CI에 포함했습니다.

### 4단계 — 출석·오늘의 미션·일일 보상 상태 분리

- 오늘 날짜 키, 미션 생성·저장·진행도·완료 판정을 `daily-progress.js`로 이동했습니다.
- 일일 보상 수령 여부와 출석 완료 날짜도 공통 모듈에서 판정·저장합니다.
- 기존 `kidscade_daily_missions`, `kidscade_daily_reward_claimed`, `kidscade_attendance` 키는 그대로 유지합니다.
- 과거 브라우저 기본 로케일 형식으로 저장된 출석 날짜도 오늘 출석으로 인정해 중복 보상을 막습니다.
- 씨앗 지급, 펫 경험치, 토스트와 같은 UI/보상 효과는 `index_base.html`에 남겨 상태와 화면 책임을 분리했습니다.
- `tests/daily-progress.test.cjs`, `tests/index-base-daily-progress.test.cjs`를 정식 CI에 포함했습니다.

### 5단계 — 게임 성취·랭크 상태 분리

- 게임별 랭크 해석, 최고점 표시용 값 변환, 최고등급 판정을 `achievement-state.js`로 이동했습니다.
- 역사 맞추기의 인물/사건 복합 저장값을 기존과 동일한 랭크·점수로 해석합니다.
- 최고등급 1,000씨앗 보상 수령 여부는 기존 `kidscade_claimed_ranks` 키를 유지하면서 매 판정 시 최신 저장값을 다시 읽습니다.
- `index_base.html`은 랭크·점수 배지와 상장 버튼을 그리는 UI 역할만 유지합니다.
- `tests/achievement-state.test.cjs`, `tests/index-base-achievement.test.cjs`를 정식 CI에 포함했습니다.

### 6단계 — 상점 보유·장착 상태 분리

- `kidscade_inventory`와 `kidscade_equipped`의 정규화·저장·보유 판정·장착 변경을 `shop-state.js`로 이동했습니다.
- 과거 `emoji/title_p/title_n/theme` 기본 항목과 현재 `land/card/badge` 기본 항목을 모두 보존합니다.
- 구매와 장착은 공통 상태 API를 거치며, `index_base.html`의 `inventory/equipped` 변수는 기존 화면 코드 호환용 미러로만 남겼습니다.
- 프로필 칭호 배지, 게임 카드 스킨, 쑥쑥랜드 배경도 공통 장착 상태를 읽습니다.
- 다른 탭의 `storage` 변경과 `KidscadeStorage`의 같은 탭 변경 이벤트를 감지해 화면 미러를 동기화합니다.
- `tests/shop-state.test.cjs`, `tests/index-base-shop-state.test.cjs`를 정식 CI에 포함했습니다.

## 다음 단계

1. 쑥쑥랜드/펫 저장과 돌봄 로직을 별도 도메인 모듈로 분리합니다.
2. 아바타 옷장 상태와 구매 로직을 별도 모듈로 분리합니다.
3. 플레이 제한 상태를 별도 모듈로 옮겨 `index_base.html`의 게임 세션 외 상태를 더 줄입니다.
4. bootstrap 문자열 치환에 의존하는 레거시 컨트롤러를 제거합니다.
5. 마지막에 레거시 게임 카드 마크업을 `index_base.html`에서 물리적으로 삭제합니다.

각 단계는 기존 회귀 테스트와 Cloudflare 빌드를 통과한 뒤 병합합니다.
