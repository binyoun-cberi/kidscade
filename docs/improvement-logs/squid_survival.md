# 꼴뚜기 게임 — 개선 이력

- 게임 ID: `squid_survival` (`data/games.json` 확인)
- 주요 코드 위치: `games/squid-survival/`, `tests/squid-survival*.test.cjs`
- 마지막 확인 기준 브랜치: `main` (2026-11-08 코드 조회), 작업 브랜치 `chat/squid-survival-ready-and-pause-20261108`
- 최신 상태: **부분 검증** (실제 소스 기반 V8 오케스트레이션/미니게임 모형 검증 통과, Node CI 및 브라우저 미검증)
- 마지막 갱신일: 2026-11-08
- 확정된 사용자 요구: 기존 6개 관문, 1인/2인 모드, 모바일 조작, 기록, Cloudflare/GitHub 배포 흐름을 유지하면서 게임을 개선한다. 무단 병합/배포는 하지 않는다.
- 다음 시작점: 이 PR의 실제 CI 결과 및 모바일 브라우저에서 6개 관문의 플레이를 확인한 뒤 미해결 문제를 재현하고 다음 개선을 설계한다.

## 현재 남은 문제

| 우선순위 | 문제·재현 단계 | 검증 근거/상태 | 다음 행동 |
| --- | --- | --- | --- |
| 높음 | 미니게임 4종의 백그라운드 일시정지 로직이 실기기(특히 iframe 포함 iOS)에서 기대대로 작동하는지 미확인 | 새 정적 코드 및 테스트 작성, 실기기 미실행 | 실제 iOS/태블릿 Safari/Chrome에서 10초 이상 이탈 후 복귀 검증 |
| 높음 | 달고나/기억의 다리 별도 페이지의 백그라운드 시간 처리는 이번 수정 범위 밖 | 실제 게임 코드 재검증 미실행 | 자식 게임의 시계/포커스 처리를 따로 분석, 통일 |
| 중간 | 대회 총 플레이 시간에 경기 도중 백그라운드에 있던 시간이 포함될 수 있음 | 부모 화면은 라운드 활성 시간만 계산하며 자식의 일시정지 시간을 알지 못함 | 부모-자식 일시정지 상태 동기화 검토 |
| 중간 | 2인 대전의 신호 패턴 공정성, 결승전 연출, 구슬 선택의 게임성, 줄다리기 타격감 | 기존 소스 비평, 실제 플레이 미검증 | 난이도/공정성 시뮬레이션과 브라우저 플레이 |
| 중간 | 대회 포기 버튼은 현재 관문 탈락으로 처리됨 | 기존 동작 유지(의도적) | 학생 사용성 검증 후 로비 즉시 복귀와 구분 여부 검토 |

## 작업 기록 (오래된 순서로 누적)

### 2026-11-08 — 시작 준비·안전 복귀·미니게임 시간 흐름 개선

- 사용자 요청: 이전 `꼴뚜기 게임` 검토 결과를 토대로 개선.
- 시작 상태 및 근거: `main`의 `squid_survival`은 6개 관문, 개별 연습, 2인 번갈아 대전 및 기록 저장을 구현함. 1인 관문 설명 후 3초 자동 출발, 명시적 로비 복귀 부재, 미니게임에서 `Date.now()` 기반 제한시간이 화면 이탈 중 경과하는 문제를 코드로 확인. 기존 게임별 개선 로그는 없었음.
- 수용 기준: (1) 플레이어가 준비 버튼을 눌러야 3초 카운트다운 시작 (2) 관문 준비/결과에서 로비 복귀 가능 (3) 이전 iframe은 관문 종료 시 제거 (4) 미니게임 4종에서 비활성화된 시간을 제외하고 누르고 있던 조작 해제 (5) 대회 통계 `elapsedMs`가 준비/인터미션 시간을 포함하지 않음 (6) 기존 6관문/모드/기록 방식 보존.
- 작업 브랜치: `chat/squid-survival-ready-and-pause-20261108`
- 관련 PR: https://github.com/binyoun-cberi/kidscade/pull/747

| 회차 | 계획과 근거 | 실제 변경 파일 | 테스트 명령/환경 | 실제 결과 및 실패/수정 근거 |
| --- | --- | --- | --- | --- |
| 1 | 3초 강제 자동시작 및 탈출 경로 개선 | `games/squid-survival/{index.html,style.css,game.js,rules.js}`, `tests/squid-survival.test.cjs` | Chat의 격리 V8에서 실제 `rules.js` 및 `game.js` 실행 + 모형 DOM/시계 | 6관문 계약, 준비 전 자동 시작 방지, 로비 RESET, iframe 정리, 최고 기록 보존 통과 |
| 2 | 브라우저 비활성화 시 시계가 계속 흐르는 문제 및 노란불 움직임 시각 불일치 | `games/squid-survival/mini.js`, `games/squid-survival/{redlight,tug,marbles,final}/index.html`, `tests/squid-survival-{mini,design}.test.cjs` | 실제 `mini.js`+`mini-rules.js`를 격리 V8에서 DOM/canvas 모형으로 실행 | 4종 모두 화면 숨김 30초와 포커스 상실 20초 후 타이머 동일. 신호등 hold 해제도 확인. 최초 모형은 URLSearchParams 미제공/blur 리스너 덮어쓰기 문제로 실패, 모형 보완 후 통과; 디자인 테스트의 다중 리스너 모형도 수정 |
| 3 | 직접 시작을 도입하면서 준비 시간이 전체 기록에 합산되는 위험 검토 | `games/squid-survival/game.js`, `tests/squid-survival.test.cjs` | 격리 V8 실제 대회 JS 실행 + 가짜 시계 | 규칙 읽기 60초, 실제 게임 700ms 후 포기 시 결과 `elapsedMs=700` 확인 |

- 최종 검증 상태: **부분 검증** (두 개의 별도 V8 모형 검증 실행·통과, Node/브라우저 미검증)
- 확인된 개선: 브랜치 구현에 더해 실제 대회 및 4종 미니게임 JS를 격리 V8에서 실행한 모형 테스트 통과. 해당 검증은 브라우저 실플레이/Node 회귀 테스트를 대체하지 않음.
- 남은 문제와 미실행 검증: `node --test tests/squid-survival.test.cjs tests/squid-survival-mini.test.cjs tests/squid-survival-design.test.cjs tests/squid-survival-versus.test.cjs`, `npm run health:strict`, `npm run test:ci`, `npm run build` **미실행**. 전체 저장소의 로컬 체크아웃에 접근하지 못함. 6관문 실제 브라우저 플레이·모바일 기기 검증 미실행. 소스 기반 모형 테스트는 관문 로직에만 적용됨.
- 게임 플레이·모바일 화면 검증: **미실행**; 테스트 코드 작성 및 GitHub 원격 파일 조회만 실시.
- GitHub: PR #747 개설(https://github.com/binyoun-cberi/kidscade/pull/747). 최초 조회 시 PR 커밋의 GitHub Actions 실행 목록은 비어 있었으며, Vercel 상태 컨텍스트는 failure로 표시됨(원인/게임 영향 미확인). **main 병합 안 함, Cloudflare 배포 안 함, 원격 D1/Secrets/유료 API 작업 없음.**
- 다음 계획: CI 실패가 확인되면 해당 테스트를 수정하고, 이어서 실제 모바일 서바이벌 전관문 플레이 및 난이도/타격감 개선.
