# 다리야 버텨줘! — 개선 이력

- 게임 ID: `high_bridge_builder`
- 주요 코드 위치: `games/high_bridge_builder/index.html`, `bridge-builder.js`, `bridge-builder.css`
- 확인 기준: 2026-11-14 `main`에서 분석 후 별도 브랜치 수정
- 최신 상태: **부분 검증** — 실제 Chromium 터치/마우스 플레이 통과, iPad/Android 실기기 미검증
- 마지막 갱신일: 2026-11-15
- 확정 요구: 구조공학/하중 시뮬레이션 추가하지 않기. 기존 자동차 그리기 게임을 유지하면서 학생 발견 오류, 태블릿 조작, 스테이지 다양성 개선
- 다음 시작점: 갤럭시탭 Chrome/삼성 인터넷 및 iPad Safari에서 1·8·16·40단계 손그리기/점 찍기를 직접 플레이하고 세로→가로 회전·실제 터치 안정성을 확인한다

## 현재 남은 문제

| 우선순위 | 문제 | 검증 근거/상태 | 다음 행동 |
| --- | --- | --- | --- |
| 높음 | iPad Safari/Android 태블릿 실제 터치 입력, 확대 배치, 기기 회전 | Chromium 가로 태블릿 에뮬레이션 통과, 실제 기기는 미실행 | 갤럭시탭/아이패드 실기기로 16:10 및 16:9 화면에서 플레이·캡처 |
| 중간 | 40단계 난이도와 실제 학생의 좌절도 | Chrome 실제 플레이에서 1, 2, 3, 8, 16, 24, 32, 40 통과; 나머지는 기존 로직 시뮬레이션. 학생 난이도 미검증 | 학생 대상으로 대표 레벨 8개 플레이 관찰 |
| 중간 | 세로 화면에서 캔버스가 작고 UI가 분리되어 보임 | Chromium 390×844 스크린샷에서 확인, 가로 모드 지시를 제공하는 실제 SDK 동작은 미검증 | 갤럭시탭 세로 진입 시 회전 안내와 실제 가로 전환 후 레이아웃 확인 |

## 작업 기록

### 2026-11-14 — 태블릿 손그리기 판정 및 40스테이지

- 사용자 요청: 비슷한 선그리기 게임을 찾아 참고하고, 학생 발견 버그/패드 그리기/단계 부족 문제 수정
- 시작 상태: `data/games.json`에 16단계 카탈로그로 등록. 손가락 다중 입력 구분 없음, 포인터 취소에서도 선 완성, 정해진 캔버스에 CSS 강제 크기 지정, 선 프로파일은 X축 표본화 후 렌더는 원본 선
- 참고: Google Play/App Store의 Draw Bridge, Draw 2 Bridge 시리즈의 단순 그리기·자동주행·반복하기 패턴; 외부 코드나 에셋을 복사하지 않음
- 수용 기준: 기존 선 하나 자동 출발 유지, 별도 점 찍기 조작 지원, 실수로 터치가 끊겨도 출발하지 않음, 그려진 선과 차량 경로 통일, 40단계 이상, 기존 SDK/배포 흐름 불변
- 작업 브랜치: `fix/bridge-builder-tablet-controls-40-stages-20261114`
- 관련 PR: https://github.com/binyoun-cberi/kidscade/pull/762

| 회차 | 계획과 근거 | 변경 파일 | 실행된 검사와 결과 |
| --- | --- | --- | --- |
| 1 | 포인터 취소·두 번째 손가락·X 표본 누락 해결 및 자동 끝점 연결 | `bridge-builder.js` | 현재 게임 소스 로드 후 V8 모의 DOM으로 한 번에 그리기→자동주행 성공, 두 번째 손가락 무시, pointercancel 주행 취소 확인 |
| 2 | iPad용 점 찍기 모드와 수동 출발·한 점 취소, 넓은 화면 확대·왜곡 방지. 사후 검토에서 CSS `max-height:100%`가 가로 화면 확대 시 세로 왜곡을 일으킬 수 있음을 발견해 제한 제거 | `index.html`, `bridge-builder.css`, `bridge-builder.js` | V8 모의 DOM에서 2단계 바위를 점 1개로 피하고 주행 성공. 캔버스 종횡비는 코드/CSS 정적 검토만 완료했고 실제 화면 시각 검수 미실행 |
| 3 | 16→40개 지형·장애물 배치 및 회귀 테스트 보강 | `bridge-builder.js`, `data/games.json`, `tests/bridge-builder.test.cjs`, `tests/bridge-builder-interaction.test.cjs`, `scripts/run-ci-tests.cjs` | V8에서 각 40개 단계에 대해 장애물별 목표 좌표로 구성한 경로를 주입해 주행: **40/40 통과**. 새 Node 테스트 파일을 기존 CI 러너에 등록했으나 GitHub Actions/Node 명령 직접 실행 전 |

- 최종 검증 상태: **부분 검증** — 모의 DOM 기반 동작 및 40단계 주행 시뮬레이션, 실제 브라우저 플레이 미실행
- 확인된 개선: 코드에 40단계, 점 찍기 모드, 포인터 취소 방어, 합성 경로와 주행 경로 통일을 구현
- 미실행 검사: iOS Safari·Android 실제 패드 플레이, Chrome 시각 스크린샷, Node 테스트·건강 검사·빌드 (GitHub Actions 검사는 진행 중)
- 개인정보/Secrets/API 비용: 접근·변경 없음
- GitHub: PR #762 열림 (병합·배포 전), `main` 직접 푸시/병합/배포/원격 D1 실행 없음
- 다음 계획: PR CI를 확인한 뒤 태블릿 실기기와 학생 피드백으로 실패·지연·화면 겹침 재현하여 추가 수정

### 2026-11-15 — 실제 Chromium 플레이 검수

- 사용자 요청: "플레이 검수해"
- 기준: `main` 커밋 `4d2c6d76d47d3f60be2c468a5b60b435e8a99f08`, PR #762는 이미 병합되었고 변경된 게임 ID는 `high_bridge_builder`.
- 이전 CI 근거: PR #762의 architecture `node-tests` 및 kkwaekkori 검사는 GitHub Actions에서 완료/성공을 확인함. 이 검사는 `high_bridge_builder` 실제 Chrome 브라우저 플레이를 포함하지 않았음.
- 계획: 새로운 로컬 정적 서버에서 **기존 파일 그대로** Chromium으로 열고 실제 DevTools 마우스/터치 이벤트로 플레이. 진입·성공·충돌·재도전·점 찍기·태블릿 1024×768 및 932×430·세로 화면·1, 2, 3, 8, 16, 24, 32, 40단계를 점검. 스크린샷/JSON 아티팩트는 CI에서 수집하고 로그인 및 개인정보 사용 금지.
- 작업 브랜치: `test/bridge-builder-real-browser-play-20261115`
- PR: https://github.com/binyoun-cberi/kidscade/pull/765
- 최종 변경 파일: `games/high_bridge_builder/bridge-builder.js`(좁은 경로의 점 찍기 판정), `games/high_bridge_builder/index.html`, `data/games.json`, `tests/bridge-builder.test.cjs`, `tests/bridge-builder-interaction.test.cjs`, `tests/bridge-builder-real-browser-play.cjs`, `.github/workflows/bridge-builder-browser-audit.yml`, `docs/improvement-logs/high_bridge_builder.md`, `docs/improvement-logs/INDEX.md`. 버전 캐시 식별자 v14→v15.
- **1차 테스트 실패 (검수 코드 오류)**: Actions `43662664856`에서 `ReferenceError: Cannot access 'start' before initialization`. 브라우저 실행 전 변수명 충돌; `startPoint`로 수정하고 충돌 대기도 실제 차량 출발 후 판정하도록 수정.
- **2차 테스트 실패 (실제 게임 버그)**: Actions `43662780434`에서 데스크톱 1단계 및 2단계 충돌/재시도, 태블릿 점 찍기 2단계 성공. 8단계에서 8회 실제 터치 중 점 5개만 수락. 원인: `addWaypoint`의 `p.x<last.x+22`이 3~20px 간격으로 오른쪽에 찍힌 올바른 점까지 버림. `p.x<=last.x+1`로 수정해 x가 증가하는 촘촘한 점을 허용하고 역방향만 거부. 별도 Node 회귀 테스트 추가.
- **3차 실제 브라우저 플레이 통과**: Chrome Actions `43662978911`, `43663245619`의 `browser-playthrough` 성공. PC 1280×800 마우스 드래그 1단계 성공, 2단계 바위 충돌 메시지·재도전, 태블릿 1024×768 실제 CDP 터치 입력으로 2·8·16·24·32·40단계 점 찍기 성공, 가로 932×430에서 3단계 점 찍기와 1단계 손그리기 성공. 화면 폭 넘침/캔버스 왜곡/화면 아래 조작 잘림 없음. 390×844 세로 화면 스크린샷을 캡처하고 실제 작은 캔버스 문제 확인. JS uncaught exceptions 0건.
- **스크린샷 직접 확인**: `43663245619` 성공 아티팩트에서 한글 Noto CJK를 포함한 1·2·3·8·16·24·32·40단계 결과 화면과 도로 미리보기 이미지 검토. 도로·차량·관문·버튼 표시 확인. 후반부는 수직 장애물 반복으로 다양성 부족. 세로 화면은 매우 작아 가로 모드 권장.
- 테스트: GitHub Actions 공개 ubuntu-latest, Node 22 + 실제 Google Chrome headless. `node tests/bridge-builder-real-browser-play.cjs` 실행 성공, 스크린샷/JSON 결과 업로드. `tests/bridge-builder-interaction.test.cjs`에 촘촘한 x좌표 수락 테스트 추가. 단독 Node 명령은 직접 실행하지 않았으며 PR 종합 CI 결과는 별도 확인 필요.
- 한계: 브라우저의 CDP 터치 에뮬레이션일 뿐 물리적 갤럭시탭·아이패드, Safari/삼성 인터넷, 실제 학생의 재미 및 조작 성공률 미검증. 하중 물리나 외부 유료 API 사용 없음.
- 변경 보호: 학생 기록/Cloudflare Workers/D1/배포/자격정보 변경 없음.
- `main` 병합: **새 PR #765 미병합**. 실제 배포: **실행 안 함**. 다음 계획: PR CI 상태 확인 후 실기기 플레이 및 실제 학생 피드백 확보.
