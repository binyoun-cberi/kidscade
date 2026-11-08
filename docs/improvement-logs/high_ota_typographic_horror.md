# 오타 — 이름을 잃어버린 밤 — 개선 이력

- 게임 ID: `high_ota_typographic_horror`
- 주요 코드 위치: `games/high_ota_typographic_horror/game.js`, `rewrite.js`, `index.html`
- 마지막 확인 기준: GitHub `main` (2026-11-08 확인, 대상 파일 원본 blob `game.js: f115c140` — 최종 커밋은 PR 참조)
- 최신 상태: **부분 검증**
- 마지막 갱신일: 2026-11-08
- 확정된 사용자 요구: 기존 3D 공포·맞춤법·추격·태블릿 조작과 기록을 유지하면서 공간을 바꾸는 단어 기능, 진행 안정성, 긴 미로의 선택 가능성을 강화
- 다음 시작점: PR의 `Kidscade architecture checks`에서 `node --test`, 정식 빌드 및 `tests/ota-visual-browser-audit.cjs` 결과를 확인하고, 실패 또는 PC/모바일 렌더링 오류를 수정

## 현재 남은 문제

| 우선순위 | 문제·재현 단계 | 검증 근거/상태 | 다음 행동 |
| --- | --- | --- | --- |
| 높음 | 창문 유리·틀·안쪽 기록이 실제 3D 화면에서 충분히 구분되는지 미확인 | V8 정적/상태 검사만 수행, Chrome 화면 미검증 | CI Chrome 캡처와 실제 브라우저에서 확인 |
| 높음 | 이야기 결말에서 미로 선택/일반 탈출 후 실제 SDK 결과와 기록 저장 확인 필요 | 코드 분기 및 정적 테스트만 수행 | 정상 플레이·클리어 경로를 Chrome에서 직접 확인 |
| 중간 | 체크포인트는 이제 로컬 저장소에도 저장되지만 탭 종료/새 세션에서 실제 복원은 미검증 | 읽기/쓰기 코드 및 V8 정적 검사 | 새 탭에서 이어하기 실행·저장 차단 환경 확인 |
| 중간 | 13×13 미로의 긴 경로는 스피드런과 선택 탐험에서 유지 | 기존 `maze.js`는 변경 없음 | 학생 피드백과 실제 완료 시간 측정 후 최적화 |

## 작업 기록 (오래된 순서로 누적)

### 2026-11-08 — 글자 현실 변화·기록 지속성·선택형 미로

- 사용자 요청: 앞서 검토한 《오타》 게임 개선안을 실제로 적용
- 시작 상태 및 근거: 카탈로그 게임 ID와 `AGENTS.md`, `docs/CHAT_AGENT_WORKFLOW.md` 확인. 이전 게임별 개선 로그는 GitHub `main`에 존재하지 않음. `rewrite.js`는 문/벽과 조명/천장만 쓰기 가능, `game.js` 체크포인트는 `sessionStorage`에만 저장, 이야기 모드는 마지막 13×13 미로 진입이 필수였음. 반면 기존 `animate()`는 교정·문장 퍼즐을 열면 위협 갱신을 이미 일시 정지하므로 그 부분은 중복 구현하지 않음.
- 수용 기준: 창문은 안쪽이 보이고 막힌 통로를 뚫지 않아야 하며, 기존 문/조명과 v1 체크포인트도 유지; 새 세션에 진행 저장을 남기며, 이야기 결말에 선택권을 추가하고 스피드런·QA 경로는 유지.
- 작업 브랜치: `improve/ota-20261108-reality-continuity-v2`
- 관련 PR: 생성 후 URL 기록 예정

| 회차 | 계획과 근거 | 실제 변경 파일 | 테스트 명령/환경 | 실제 결과 및 실패/수정 근거 |
| --- | --- | --- | --- | --- |
| 1 | 물리적 현실 수정 확장; 창문은 통과 불가, 기존 문은 통과 가능 | `rewrite.js`, `tests/ota-rewrite-reality.test.cjs` | GitHub 커넥터에서 읽은 모듈을 V8에서 실행, 창문 충돌·v2 복원·레거시 v1 복원 검사 | 세 항목 PASS. Node 명령이나 실제 Chrome 실행 아님 |
| 2 | 이야기 결말에서 최종 미로 선택, 세션+로컬 이중 저장, 창문 3D 표시 | `game.js`, `index.html`, `tests/ota-story-continuity.test.cjs` | V8 `new Function`으로 game.js 모듈 import 제외 문법 검사 및 mock fs/require 기반 동기 테스트 하네스 | 정적 문법 검사 PASS, 3개 테스트 파일 19개 동기 검사 PASS, 실패 0. 실제 `node --test` 아님 |
| 3 | 비평 결과: 저장소 getter 예외 처리, 모달을 띄운 해당 프레임의 추격자 이동 중단, 실제 CI 연결 | `game.js`, `scripts/run-ci-tests.cjs`, `.github/workflows/architecture-tests.yml` | 수정 후 V8 파싱 및 19개 검사 재확인; GitHub 워크플로 파일 등록 | V8 확인 통과. GitHub Actions 실행 결과는 PR 생성 후 확인 필요 |

- 최종 검증 상태: **부분 검증** (실제 Chrome 플레이 및 Node CI 결과 미확인)
- 확인된 개선: 창문/문/벽 중 하나로 현실을 수정하는 상태·충돌 구분, 창문 가시화 코드, 오래 남는 체크포인트 백업, 이야기 모드 결말의 미로 선택, 기존 테스트 3개를 CI 테스트 목록에 추가하고 기존 Chrome 게임 감사 스크립트를 PR 체크에 연결
- 남은 문제와 미실행 검증: 이 환경의 컨테이너에서 `git ls-remote https://github.com/binyoun-cberi/kidscade.git refs/heads/main` 실행 시 DNS 해석 실패. 따라서 로컬 clone, `npm run build`, `node --test`, 실제 브라우저는 실행하지 못함. PR의 GitHub Actions 결과로 추후 검증 필요.
- 게임 플레이·모바일 화면 검증: **실행하지 않음**; GitHub Actions에 등록된 Chrome desktop+touch 감사는 실행 여부/결과 확인 필요
- GitHub: 별도 브랜치에 변경함. `main` 병합 **안 함**, 실제 Cloudflare 배포 **안 함**, 원격 D1/결제/Secrets/학생 기록 **미접근**
- 다음 계획: PR CI의 19개 테스트, 실제 Chrome 캡처, 체크포인트 재시작, 창문 가독성을 검토하고 필요한 범위만 재수정
