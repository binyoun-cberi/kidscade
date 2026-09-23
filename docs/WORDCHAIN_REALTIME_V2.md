# Wordchain realtime v2

## Scope

끝말잇기 온라인 대결은 이제 `WordchainRoom` Durable Object를 실시간 권한으로 사용합니다.
신규 방은 항상 `0xxxxx` 코드로 생성되며, 구형 D1 방 엔진은 production 라우트에서
더 이상 호출되지 않습니다.

## D1 사용 원칙

D1은 학생 로그인 세션을 확인하는 방 생성/입장 시점에만 사용합니다. 방에 들어간 뒤의
준비 상태, 목숨, 현재 턴, 사용 단어, 중복 제출 방지, 시간초과, 승패는 모두 Durable
Object에 저장됩니다. 따라서 WebSocket 연결 중에는 반복 D1 조회가 발생하지 않습니다.

기존 `wordchain_match_state`, `wordchain_used_words`, `wordchain_actions`,
`wordchain_turn_claims` 테이블은 과거 마이그레이션 기록으로 남을 수 있지만 새 런타임의
필수 스키마도 아니고 요청 경로에서도 읽거나 쓰지 않습니다.

## Transport

방에 들어오면 64자리 방 토큰을 발급합니다. 이후 HTTP 명령은 Bearer 토큰으로 인증하고,
WebSocket 업그레이드는 60초짜리 1회용 티켓을 사용합니다. 연결 중에는 서버 push가
상태 갱신을 담당합니다. WebSocket이 끊겼을 때만 동일한 Durable Object 방을 향해 느린
HTTP fallback 조회가 동작합니다.

Cloudflare WebSocket hibernation과 자동 ping/pong을 사용하며 서버 setInterval은 없습니다.
12초 턴 마감과 방 만료는 Durable Object alarm이 처리합니다.

## Game authority

서버가 다음 항목을 최종 판정합니다.

- 참가자와 슬롯
- 준비/시작 조건
- 현재 단어와 턴
- 두음법칙 시작 글자
- 이미 사용한 단어
- 사전 등재/차단 단어
- 한방단어와 목숨 감소
- 12초 시간초과
- 중복 actionId 제출
- 승자와 경기 종료

클라이언트 타이머는 서버 deadline을 표시할 뿐 판정 권한이 없습니다.

## Reconnect

브라우저에는 방 코드와 방 토큰을 저장합니다. 새로고침 후에는 계정 D1 재조회 없이
그 토큰으로 같은 Durable Object 상태를 복구할 수 있습니다. 토큰을 잃어도 같은 로그인
계정으로 다시 join하면 서버가 계정 ID를 확인해 방 토큰을 회전시키고 기존 참가자 슬롯을
복구합니다.

## Validation

Run:

`node --test tests/wordchain-room.test.mjs tests/wordchain-realtime-client.test.mjs tests/multiplayer.test.mjs tests/server-cost.test.mjs`

Production config requires the `WORDCHAIN_ROOMS` Durable Object binding and the
`wordchain-room-v1` SQLite Durable Object migration.
