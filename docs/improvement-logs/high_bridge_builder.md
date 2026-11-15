# 다리야 버텨줘! — 개선 이력

- 게임 ID: `high_bridge_builder`
- 주요 코드 위치: `games/high_bridge_builder/index.html`, `bridge-builder.js`, `bridge-builder.css`
- 확인 기준: 2026-11-14 `main`에서 분석 후 별도 브랜치 수정
- 최신 상태: **부분 검증** (새 실제 브라우저 플레이 검증 추가 진행 중)
- 마지막 갱신일: 2026-11-15
- 확정 요구: 구조공학/하중 시뮬레이션 추가하지 않기. 기존 자동차 그리기 게임을 유지하면서 학생 발견 오류, 태블릿 조작, 스테이지 다양성 개선
- 다음 시작점: 새 Chrome 실제 플레이 검증 결과와 스크린샷을 판독하고, 실패한 레벨의 터치 조작을 수정한다. iPad Safari/Android 실기기 검증은 별도로 진행한다

## 현재 남은 문제

| 우선순위 | 문제 | 검증 근거/상태 | 다음 행동 |
| --- | --- | --- | --- |
| 높음 | iPad Safari/Android 태블릿 실제 터치 입력, 확대 배치, 기기 회전 | 브라우저 및 실기기 미실행. V8 모의 DOM 동작 테스트만 실행 | 실기기로 16:10 및 16:9 화면에서 여러 단계 플레이·캡처 |
| 중간 | 40단계 난이도와 실제 학생의 좌절도 | 각 단계의 통과 가능한 경로 1개는 코드 시뮬레이션으로 확인, 재미/난이도는 미검증 | 1·8·16·24·32·40단계 초등학생 소수 관찰 |
| 중간 | 새 테스트의 GitHub Actions 결과 | PR CI 실행 전 | `node --test tests/bridge-builder.test.cjs tests/bridge-builder-interaction.test.cjs`, `npm run health:strict`, `npm run test:ci`, `npm run build` 실행 결과 확인 |

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
- PR: 작성 중 (실제 생성 후 반영)
- 작성 파일: `tests/bridge-builder-real-browser-play.cjs`, `.github/workflows/bridge-builder-browser-audit.yml`. 게임 코드 변경 없음.
- 현재 검사: 테스트 파일의 JavaScript 구문을 GitHub 도구 내 V8 `new Function`으로 확인함(통과). Chromium 실행 결과 및 이미지 판정은 **아직 미실행**.
- 주의: CI의 Chromium 터치 에뮬레이션은 iPad Safari/갤럭시탭 실제 손가락 입력을 대신하지 않음.
- `main` 병합: 이 작업 PR은 미병합. 실제 배포: 수행하지 않음.
