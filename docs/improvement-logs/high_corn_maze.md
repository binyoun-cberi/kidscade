# 옥수수밭 탈출 — 개선 이력

- 게임 ID: `high_corn_maze` (2026-11-10 신규 등록)
- 주요 코드 위치: `games/high-corn-maze/`
- 마지막 확인 기준: `main`에서 분기한 `feat/high-corn-maze-escape-20261110`
- 최신 상태: **부분 검증**
- 마지막 갱신일: 2026-11-10
- 확정된 사용자 요구: 저장소의 Three.js와 3D 에셋 재사용. 빽빽한 옥수수밭의 1인칭 탐험, 길목 지도에서 현재 위치를 추리, 가끔 등장해 약 2~3분 추격하는 플레이어보다 조금 느린 괴물. 코드 변경은 별도 브랜치·PR, 2026-11-10의 사용자 명시 요청으로 PR 병합 승인. 배포는 별도 승인 필요.
- 다음 시작점: PR #754 최신 CI에서 실제 Chromium 자동 탐험·지도·탈출 검증을 통과시키고, 실패 시 HTTP/모듈 오류 로그를 진단. 태블릿 실기기는 별도 검증.

## 현재 남은 문제

| 우선순위 | 문제·재현 단계 | 검증 근거/상태 | 다음 행동 |
| --- | --- | --- | --- |
| 높음 | PC 및 태블릿 브라우저에서 실제 3D 옥수수 렌더링·조준·이동·지도 확대·괴물 GLB 연출은 아직 플레이 미검증 | JS 코드 읽기/문법 및 순수 미로 엔진 검사만 시행 | 실제 Chromium/WebGL 및 실기기 플레이·스크린샷 확보 |
| 중간 | OBJ 모델 수천 인스턴스의 모바일 FPS와 로딩 시간 미측정 | Corn_4 OBJ는 약 535 정점/529면임을 파일 내용으로 확인, 렌더링 실제 성능 미측정 | 21×21 미로를 저사양 모바일에서 측정 후 LOD 필요성 판단 |
| 중간 | 실제 사람의 초회 완주시간·지도 판독 난도는 미측정 | 자동 최단 경로 범위만 측정, 사용자 테스트 없음 | 초회 사용자 5명 이상 완주 시간·길 잃는 빈도 기록 |
| 중간 | monster pursuit 경로와 포획 복귀를 브라우저에서 장시간 재현하지 않음 | V8 상태 전이 검사는 수행 | 실제 2~3분 추격과 재등장 시간, 복귀 UI 검증 |

## 작업 기록 (오래된 순서로 누적)

### 2026-11-10 — 신규 게임 1차 구현

- 사용자 요청: “키즈케이드에 만들어줘”; 이전 기획의 1인칭 옥수수밭·지형지물·지도판·느린 괴물 구현.
- 시작 상태 및 근거: `data/games.json`에 해당 신규 게임 ID 없음(기존 게임 167개). `games/high_ota_typographic_horror/maze.js`는 DFS, 순환 경로, BFS 추격 참고 구현. 저장소의 `assets/game/crops/OBJ/Corn_4.obj`, `assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost.glb` 등 실존 파일/목록 확인.
- 수용 기준: 동일 시드 재현, 모든 칸 연결·벽 충돌 일치, 지도와 실제 통로 동기화, 지도 없는 현재 위치 추리, 두 모드, 150초가량 추격, PC·태블릿 입력, 등록된 게임 진입점.
- 작업 브랜치: `feat/high-corn-maze-escape-20261110`
- 관련 PR: https://github.com/binyoun-cberi/kidscade/pull/754

| 회차 | 계획과 근거 | 실제 변경 파일 | 테스트 명령/환경 | 실제 결과 및 실패/수정 근거 |
| --- | --- | --- | --- | --- |
| 1 | 독립 엔진으로 무작위 미로·지형지물·지도판 위치를 일관되게 생성 | `games/high-corn-maze/maze.js` | 연결된 GitHub에서 실제 JS 소스 읽어 V8 isolate에서 300 시드 생성·경로·벽 일관성 검사 | 300개 모두 연결됨; 최단 경로 69~145셀 이동, 셀 벽·통로 불일치 0건, 동일 시드 재현 확인 |
| 2 | 3D 월드·지도판·몬스터·터치 조작 연결 | `games/high-corn-maze/index.html`, `style.css`, `game.js`, `assets/gate-image/high_corn_maze_cover.svg` | V8에서 ESM import 문 제거 후 JS 전체 문법 파싱 | 문법 파싱 성공. 브라우저/WebGL 렌더링은 미실행 |
| 3 | 회귀 검사 및 카탈로그 통합 | `tests/high-corn-maze.test.cjs`, `data/games.json`, `scripts/run-ci-tests.cjs`, `docs/improvement-logs/INDEX.md` | V8에서 300 시드 × 각 셀의 경계 및 개방 통로 검사, 몬스터 경고→추격→포획·탐험 비활성 검사 | 300개 시드의 경계·통로 검사 오류 0, 경고/추격/포획/비활성 전이 성공. `node --test`와 전체 빌드 명령은 현 환경에서 미실행 |

- 최종 검증 상태: **부분 검증**
- 확인된 개선: 신규 독립 게임 코드와 등록, 1인칭 입력 처리, 4개 지도판, 4개 랜드마크, 두 모드, 씨앗별 재현 가능한 경로·벽 판정, 추격 상태 머신 구현. 외부 에셋/유료 API 추가 없음.
- 남은 문제와 미실행 검증: 브라우저 시각 검수, 스마트폰·태블릿 조작, 실제 사용자 완주시간·FPS 측정, PR CI 결과 미확인. 로컬 저장소 직접 클론 불가(네트워크 이름 해석 실패)로 Node 명령과 빌드 미실행.
- 게임 플레이·모바일 화면 검증: **미실행**, 추정 성공으로 표시하지 않음.
- GitHub: 브랜치 생성 및 코드 커밋. PR: https://github.com/binyoun-cberi/kidscade/pull/754 (열림; 생성 직후 CI 진행 중). **main 미병합, Cloudflare 미배포**. Secret/학생 정보/결제/원격 D1 미접근.
- 다음 계획: PR CI 확인 후 실제 Chrome·터치 브라우저에서 1회 이상 완주 및 몬스터 추격 재현, 화면과 성능 개선.

### 2026-11-10 — 병합 요청, 난도 검토 및 실행 오류 수정

- 사용자 요청: “병합해봐 그리고 난이도를 플레이로 점검해”. 병합은 이 PR에 한하여 사용자 승인, 원격 배포는 승인하지 않음.
- 시작 상태: PR #754 열림, 1차 GitHub Actions 전체 회귀 검사 실패. 신규 게임의 업적 정의·결과 프로필 누락, 기존 주사위 게임 저장소 키 누락 및 Chromium 종료 레이스 발견.
- 목표: 실제 3D 브라우저 자동 탐험에서 지도 보기/위치 표시/길 따라 이동/출구 완료 검증, 원본 에셋 연결, 난도 수치 비교 후 병합.

| 회차 | 계획/수정 | 실제 실행 검증 | 결과 |
| --- | --- | --- | --- |
| 1 | 난도 분석: 랜덤 탐색의 첫 지도판 지연 제거. `maze.js`의 첫 지도판을 입구(0번 셀)로 이동하고 나머지 3개를 이격; `game.js`의 지도판을 통로 가운데에서 모서리로 이동 | GitHub에서 실제 미로 엔진을 V8에서 실행한 150시드 BFS 최단 경로·기억 기반 DFS 탐색 시뮬레이션 | 최단 경로 69~145칸, 최단 주행 중앙값 약 2.8분, 기억 기반 탐색 중앙값 약 12.1분·90분위 약 20.5분. 기존 첫 지도판 발견 대기 90분위 약 16.4분(지형 그래프 모델); 입구 지도판으로 해소. 실제 인간 플레이 시간은 아님 |
| 2 | CI 연결: `achievement-catalog.js`, `game-outcome-profiles.js`, `kidscade-storage.js`에 누락된 게임 정보 추가. 주사위 브라우저 테스트 임시 디렉터리 종료 레이스 완화. 신규 `tests/high-corn-maze-browser-audit.cjs`를 기존 회귀 실행에 연결 | PR GitHub Actions: 기존 실패했던 주사위 단독 브라우저 smoke 성공; 품질 점검·Chibi 검사 성공. 신규 게임 Chromium 자동 테스트 실패 | 첫 Chromium 실행에서 `OBJLoader.js`가 실제 저장소에 없는 것을 확인. 첫 GUI 자동 검증은 아직 실패 |
| 3 | FBX 렌더링 경로 교정: 실제 저장소에 있는 `FBXLoader.js` 및 `Corn_4.fbx` 사용, 파일 존재 검사 추가. 첫 지도판 안내 및 통로 이동 테스트와 브라우저 진단 로그 보강 | V8에서 업데이트된 미로 엔진 200시드 검증: 모든 칸 연결·지도판 간격·진입 지도·JS 구문 통과. 35시드 최단 경로 + 실제 추격 상태 머신 가상 주행: 9회 포획(게임 코드, 실제 1인칭 아님) | 첫 렌더러 실패 후 재실행 CI도 Chromium 준비 타임아웃 발생. 최신 진단 계측을 넣은 브라우저 CI 결과 대기 중; 통과 전까지 플레이 완료로 표시하지 않음 |

- 변경 파일: `games/high-corn-maze/{maze.js,game.js}`, `tests/{high-corn-maze.test.cjs,high-corn-maze-browser-audit.cjs,probability-dice-browser-audit.cjs}`, `scripts/run-ci-tests.cjs`, `achievement-catalog.js`, `app/features/achievements/game-outcome-profiles.js`, `kidscade-storage.js`, 이 개선 로그.
- 최종 검증 상태(로그 작성 시): **부분 검증**. 정적/미로 시뮬레이션 통과. 실제 Chromium 자동 완주 아직 실패이며 진단 중. 사람 직접 플레이와 태블릿 실기기 FPS는 미실행.
- GitHub: PR https://github.com/binyoun-cberi/kidscade/pull/754, 작업 브랜치 `feat/high-corn-maze-escape-20261110`. 이 시점 **main 미병합, Cloudflare 미배포**.
- 남은 문제: 브라우저 실행 실패 원인 진단/수정, 자동 완주 통과, 장시간 몬스터 추격과 시각성, 실기기 로딩/FPS 측정.
- 다음 계획: 최신 CI 타임아웃 상세 진단 로그 확인 후 하나의 원인에 집중하여 수정하고, 수용 기준을 만족하면 PR 병합. 실제 배포·원격 DB 변경은 실행하지 않음.
