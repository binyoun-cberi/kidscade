# 운명의 주사위 — 개선 이력

- 게임 ID: `probability_dice_survival` (`data/games.json` 확인)
- 주요 코드 위치: `games/probability_dice_survival/`, `tests/probability-dice-browser-audit.cjs`
- 마지막 확인 기준: 2026-11-14 `main`, 별도 브랜치 `chat/fix-ci-dice-browser-profile-20261114`
- 최신 상태: **부분 검증** (실제 Chromium 종료·프로필 제거 모형 3/3 통과; 저장소 전체 CI 검증 대기)
- 마지막 갱신일: 2026-11-14
- 확정된 요구: 기존 주사위 1인/대전, 확률·기록, 3D 연출, 모바일 조작을 변경하지 않고 PR #750 병합 후 CI 실패를 해결한다.
- 다음 시작점: PR #764의 두 번째 전체 CI에서 120초 시간 초과를 방지한 분리 도시 시뮬레이션 그룹과 전체 회귀 검사의 결과를 확인한다.

## 현재 남은 문제

| 우선순위 | 문제·재현 단계 | 검증 근거/상태 | 다음 행동 |
| --- | --- | --- | --- |
| 높음 | 전체 `npm run test:ci`가 정상 종료되는지 | 이번 PR의 GitHub Actions 미완료, 이전 PR #750 실패 | GitHub Actions 결과 확인 |
| 중간 | Chrome 자식 프로세스가 4초 내 종료하지 않거나 별도 손자 프로세스가 프로필에 쓰는 예외 상황 | 종료 대기 및 비동기 재시도 구현, 임시 Chromium 로컬 검증 3/3 | CI 실제 브라우저 검증, 필요 시 종료 절차 추가 보완 |
| 중간 | 다른 게임의 카탈로그·성취/프로필·저장 키가 추가되면서 검사가 다시 실패할 가능성 | 최신 main 카탈로그 168종을 대상으로 목록 대조, 당시 누락 0종 | 향후 카탈로그 PR에 동기화 검사 유지 |

## 작업 기록 (오래된 순서로 누적)

### 2026-11-14 — PR #750 후속 CI 오류 해결: Chrome 프로필 정리 경쟁 상태

- 사용자 요청: “고쳐봐” — 꼴뚜기 게임 병합 PR #750의 CI 실패를 후속 처리.
- 시작 근거: 2026-11-09 PR #750의 GitHub Actions 로그에서 운명의 주사위 브라우저 검사는 데스크톱·1인·2인·모바일·20면체 3D 시나리오를 모두 통과한 뒤 `fs.rmSync`의 `ENOTEMPTY`로 실패했음. 다른 실패는 성취 계획 2건·게임 결과 프로필 1건·저장 키 1건. 2026-11-14 `main`에서 성취 계획 및 결과 프로필은 168개 활성 게임 모두 조회 가능, `kidscade_dice_survival_best_v1` 저장 키도 등록된 상태임을 소스 실행으로 확인했으므로 동일 수정 중복 적용 금지.
- 수용 기준: Chrome이 닫힌 뒤 임시 프로필을 삭제하며, 실제 플레이가 통과한 후 종료 과정의 일시적인 디렉터리 경쟁 상태로 테스트가 실패하지 않는다. 기존 게임 로직·기록·배포 파이프라인 변경 없음.
- 작업 브랜치: `chat/fix-ci-dice-browser-profile-20261114`
- 관련 PR: https://github.com/binyoun-cberi/kidscade/pull/764

| 회차 | 계획과 근거 | 실제 변경 파일 | 테스트 명령/환경 | 실제 결과 및 실패/수정 근거 |
| --- | --- | --- | --- | --- |
| 1 | 기존 고정 220ms 대기는 Chrome이 비동기 종료하는 속도를 보장하지 않음 | `tests/probability-dice-browser-audit.cjs` | 실제 수정 소스를 V8 `new Function` 문법 검사. Node v22 / Chromium `--headless=new`에서 임시 프로필 생성→종료→삭제 스모크 3회 | 소스 문법 검사 통과, 종료·삭제 스모크 3/3 통과. `child.close` 대기·SIGKILL 제한 시간·`fs.promises.rm` 재시도 적용. 해당 스모크는 키즈케이드 게임 전체 브라우저 플레이가 아님 |

- 최종 검증 상태: **부분 검증**
- 변경 및 확인 사항: 실제 디스크를 가진 로컬 Chromium 헤드리스 실행의 프로필 정리 3회 성공. `main`의 활성 168개 게임에 대해 성취 계획/결과 프로필 누락 0개, 주사위 기록 키 등록 확인.
- 미실행 검증: 본 Chat에서는 전체 저장소 내려받기가 불가해 `node --test` 및 `npm run test:ci`를 직접 실행하지 못함. 새 PR GitHub Actions가 완료되어야 통합 결과 판단 가능.
- 실제 게임 플레이 및 모바일 기기: 미실행. 이전 PR #750의 GitHub Actions 주사위 브라우저 플레이 통과 기록만 확인.
- GitHub: PR #764 생성 (https://github.com/binyoun-cberi/kidscade/pull/764); `main` 직접 수정/병합 및 Cloudflare 배포, 원격 D1 마이그레이션 없음. 기존 저장 데이터와 키, 비밀정보, 유료 API 접근 없음.
- 다음 계획: PR CI 결과와 Chrome 임시 프로필 정리의 재발 여부 확인, 필요한 경우 3회 이내 근거 기반 재수정.

#### 2026-11-14 — PR #764 실제 CI 1차 판정 및 후속 조정

- GitHub Actions `Destiny Dice standalone smoke` 실행 #43572034549: **성공**. 실제 Chrome에서 desktop/solo/duel/mobile/20면체 주사위 모두 PASS, 정리 단계의 `ENOTEMPTY` 재발 없음.
- GitHub Actions `Kidscade architecture checks` 실행 #43572034543: **실패**. 보안·구문·빌드 및 별도 꾀꼬리 Chrome 감사 통과; 통합 회귀 테스트에서 `tests/mot-chatgetda-kkwaekkori.test.cjs` 파일이 전체 `120000ms` 시간 제한을 초과함. 그 외 개별 검사 실패 0건; 저장 키/성취 프로필의 과거 오류는 이번 실행에서 재발하지 않음.
- 후속 조정: `scripts/run-ci-tests.cjs`에서 긴 시뮬레이션만 별도 프로세스/240초 제한으로 옮기고, 기존 검사 항목·난이도·게임 로직을 그대로 보존. 상세 내용은 [못 찾겠다 꾀꼬리 로그](./tod_mot_chatgetda_kkwaekkori.md)에 기재.
- 검증 상태: **부분 검증**. 주사위 실제 Chrome 감사 통과, 전체 CI는 최초 실패 후 분리 수정의 재검사 결과 대기. `main` 병합/배포 없음.
