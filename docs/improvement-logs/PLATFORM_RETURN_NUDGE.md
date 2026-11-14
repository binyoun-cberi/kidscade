# 키즈케이드 공통 기능 — 20분 이내 복귀 안내

- 적용 범위: 공통 로비와 로비 안의 게임 iframe (특정 게임 ID 없음)
- 2026-11-14 기준: `main`에서 시작한 별도 브랜치 `feat/student-return-nudge-20min`
- 사용자 요구: 갤럭시탭의 Chrome / 삼성 인터넷에서 다른 화면으로 나갔다가 약 20분 안에 돌아왔을 때 학생 기기에서 재미있는 문구 및 음성 재생. 서버나 교사 화면으로 전송하지 않음.
- 상태: **부분 검증** — 현행 GitHub 코드와 동일한 파일로 Node 8개 테스트 통과, 갤럭시탭 실기기 미검증

## 변경 및 검토 (2026-11-14)

1. 분석: 일반 웹 페이지는 다른 탭/앱의 주소나 이름을 확인할 수 없음. `visibilitychange`와 페이지 복원을 통해 복귀 시점만 알 수 있으며 백그라운드 음성 재생은 신뢰할 수 없음.
2. 계획/비평: 타 사이트를 보았다고 단정하거나 감시 로그를 서버로 보내지 않음. 3초 미만의 짧은 이탈은 무시하고 20분 초과도 안내하지 않음. 45초 이내 중복 안내 방지. 음성 차단에 대비해 학생이 누를 수 있는 '다시 듣기' 버튼 제공.
3. 구현: `return-nudge.js` 공통 브라우저 런타임, `main-bootstrap.js` 로비 주입, `tests/return-nudge.test.cjs` 검증, `scripts/run-ci-tests.cjs` 회귀 목록 등록. 같은 탭에서 이전 페이지로 돌아올 때 `sessionStorage`는 해당 탭 안에서만 사용하며 안내 내용을 외부로 전송하지 않음.

## 검증 실적

- 로컬 Node: `node --check /mnt/data/kc-return-nudge/return-nudge.js` — 통과 (핵심 스크립트 초안 문법 검사).
- 로컬 Node: `node --test /mnt/data/tests/return-nudge.test.cjs` — **6개 통과 / 0개 실패** (시간 범위, 중복 방지, 뒤로 가기/새로고침, 음성 API 부재, iframe).
- 기존 저장소 전체 `npm run test:ci`, `npm run build`, `npm run health:strict` — **미실행** (GitHub 연결로 변경하고 전체 저장소를 로컬 실행할 수 없는 환경).
- 2026-11-14 GitHub PR head 상태 조회: Vercel 상태 **failure**. 결과의 target URL에 `upgradeToPro=build-rate-limit`이 표시됨. 현재는 배포 빌드 제한으로 추정되며 코드 테스트 결과로 해석하지 않음.
- 실제 갤럭시탭 Chrome 및 삼성 인터넷 터치/음성 플레이 — **미실행**. 브라우저 정책에 따라 자동 음성이 나오지 않을 수 있으므로 다시 듣기 버튼 제공.
- 회귀 가설: 화면 꺼짐/앱 전환도 탭 변경과 구별되지 않고, 내부에서 같은 탭 페이지를 오간 경우 복귀 안내가 발생할 수 있음.

## 다음 시작점

1. PR CI의 실제 결과 확인 (미검증인 상태를 성공으로 표기하지 말 것).
2. 물리적 갤럭시탭 Chrome/삼성 인터넷에서 짧은 전환, 3초~20분 복귀, 20분 초과, 오디오 권한/볼륨, 전체화면 게임 확인.
3. 필요하면 교사용 설정과 게임 단독 URL 적용 범위를 별도 요청에서 확장.

- PR: https://github.com/binyoun-cberi/kidscade/pull/763 (2026-11-14 생성, CI와 실기기 검증 대기)
- `main` 병합: **하지 않음**
- Cloudflare 실제 배포 / 원격 D1 변경 / 유료 서비스 / 학생 기록 저장: **하지 않음**

## 추가 개선 (2026-11-14) — 복귀 후 직접 재생 버튼 누르기

- 사용자 피드백: '다시 듣기' 버튼은 부자연스러우므로, 복귀할 때 학생이 '▶ 게임 계속하기'를 눌러야 하며 바로 그 터치에 음성을 연결해 재생 제한을 완화하고 싶음.
- 분석: Chrome autoplay 정책상 클릭/터치는 오디오 사용을 허용하는 상호작용이다. 그러나 영구 권한을 자동 부여하는 것은 아님. 삼성 인터넷 실기기 검증 필요.
- 비평: 자동 음성 시도는 실패할 수 있고, 기존 12초 후 사라지는 토스트는 필수 재진입 UX와 충돌. 게임 내부 시뮬레이션 타이머까지 중단한다고 약속할 수 없음.
- 1회 수정: `return-nudge.js` 토스트와 '다시 듣기/닫기' 버튼, 자동 음성/자동 닫기 제거. 화면 전체를 덮는 대화상자와 '▶ 게임 계속하기' 버튼 하나로 변경. 버튼 클릭 핸들러 **내부에서 동기적으로** 한국어 TTS를 호출하고 대화상자를 해제. 음성 지원이 없어도 진행 가능.
- 검증: `node --check /mnt/data/kc-return-nudge/return-nudge.js`, `node --check /mnt/data/kc-return-nudge/tests/return-nudge.test.cjs` **성공**.
- 검증: `node --test /mnt/data/kc-return-nudge/tests/return-nudge.test.cjs` **8개 통과/0개 실패**. 복귀 시 자동 음성 재생 금지, 클릭 시 재생과 가림막 해제, 시간 범위, 쿨다운, 중복 이벤트, 히스토리 복원, 음성 API 없음, 게임 iframe 제외.
- 파일 동일성: `git hash-object` 결과 `return-nudge.js` = `f367e4b6948c680f5b1fd839db437d8f1da4c912`, `tests/return-nudge.test.cjs` = `d956432142d4746676538d9f40af26c0f9a52888`; GitHub 브랜치 blob SHA와 일치.
- 미검증: 갤럭시탭 Chrome/삼성 인터넷에서 실제 음성 출력·전체화면 z-index·장시간 복귀, 전체 저장소 `npm run build`, `npm run test:ci`, `npm run health:strict`.
- 한계: 가림막은 클릭·터치 입력을 막지만 개별 게임의 내부 시계나 애니메이션을 일괄 일시정지하지 않음. 음성 출력은 기기 음량/브라우저 정책을 따르며 영구적인 권한을 보장하지 않음.
- 코드 변경: `return-nudge.js`, `tests/return-nudge.test.cjs`; 기존 `main-bootstrap.js` 연결 및 기존 CI 목록 유지.
- PR: https://github.com/binyoun-cberi/kidscade/pull/763 (기존 PR 브랜치에 추가 커밋, 병합 미실시).
- 배포 / 원격 DB / 학생 기록 / 비밀정보 / 유료 API: 수정·접근하지 않음.
- 다음 시작점: Chrome과 삼성 인터넷 실기기에서 터치에 따른 음성 출력·모달 위계·타이머가 있는 게임의 복귀 UX 점검. 필요 시 게임별 일시정지 지원 범위를 정의.
