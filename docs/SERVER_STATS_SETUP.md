# Kidscade 서버 통계 1단계

목표는 개인정보를 수집하지 않고 다음 값을 서버에서 집계하는 것이다.

- 이번 주 익명 방문자 수
- 누적 익명 방문자 수
- 게임별 이번 주 유효 플레이 수
- 게임별 누적 유효 플레이 수
- 이후 `popular` 응답을 이용한 이번 주 인기 게임

## 개인정보 최소화

브라우저는 최초 접속 시 임의 UUID를 localStorage에 만든다. Worker는 이 UUID를 SHA-256으로 해시한 값만 D1에 저장한다.

저장하지 않는 값:

- 이름
- 학교/학급
- IP 주소
- User-Agent
- 이메일
- 계정 ID

방문자 수는 실제 사람 수가 아니라 `익명 브라우저 설치 단위`의 근사치다. 다른 브라우저/기기를 쓰거나 localStorage를 지우면 새로운 방문자로 계산될 수 있다.

## 무료 한도 절약 설계

- 정적 HTML/JS/이미지는 기존처럼 Static Assets에서 직접 제공한다.
- Worker는 `/api/*` 경로에만 실행된다.
- 방문 등록 POST는 브라우저당 주 1회만 시도한다.
- 통계 GET은 브라우저에서 5분 캐시한다.
- 게임 플레이는 기존 Kidscade 기준과 동일하게 30초 이상 플레이했을 때만 서버에 기록한다.
- 게임 플레이 1회당 D1의 `game_counters` 한 행만 갱신한다.
- 주간 플레이와 누적 플레이를 같은 행에 저장해 별도 이벤트 로그를 만들지 않는다.
- 방문자 DB도 브라우저당 한 행만 유지하고 `last_week_key`만 갱신한다.

현재 Free 플랜 기준 Worker 요청은 100,000회/일, D1은 5,000,000 rows read/일, 100,000 rows written/일이다. 이 설계에서는 50,000회의 유효 게임 플레이가 하루에 발생해야 플레이 기록만으로 100,000 writes에 접근하는 구조가 아니라, 플레이 1회당 기본적으로 한 행 write이므로 여유가 크다. 방문자 쓰기도 주 1회 수준이다.

## D1 생성

Cloudflare Dashboard에서:

1. `Storage & databases`
2. `D1 SQL database`
3. `Create database`
4. 이름: `kidscade-stats`
5. 생성 후 Database ID를 복사한다.

그 ID를 `wrangler.jsonc`에 다음 형태로 추가한다.

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "kidscade-stats",
    "database_id": "<CLOUDFLARE에서 발급된 UUID>"
  }
]
```

Worker 코드는 `env.DB` 이름으로 이 바인딩을 사용한다.

## 최초 스키마 적용

저장소의 `migrations/0001_server_stats.sql`을 D1에 한 번 적용한다.

Wrangler를 사용할 경우:

```bash
npx wrangler d1 migrations apply kidscade-stats --remote
```

또는 Cloudflare D1 콘솔에서 해당 SQL 파일의 내용을 실행해도 된다.

## API

### GET `/api/stats`

사이트 통계와 모든 기록된 게임 카운터를 한 번에 반환한다.

```json
{
  "site": {
    "weeklyVisitors": 123,
    "totalVisitors": 812
  },
  "games": {
    "high_classroom_war_3d": {
      "weeklyPlays": 47,
      "totalPlays": 928
    }
  },
  "popular": []
}
```

`popular`은 이미 이번 주 플레이 수 기준 상위 10개를 계산해 반환한다. UI는 다음 단계에서 바로 사용할 수 있다.

### POST `/api/stats/visit`

익명 브라우저 UUID를 받아 주간/누적 방문자를 중복 없이 계산한다.

### POST `/api/stats/play`

`gameId`와 플레이 시간을 받는다. 30초 미만은 기록하지 않는다.

## UI

D1 연결 후 메인 화면에 다음 정보가 표시된다.

- `KIDSCADE 이용 현황 · 이번 주 방문자 N명 · 누적 방문자 N명`
- 각 게임 카드: `이번 주 N회 · 누적 N회`

API가 아직 연결되지 않았거나 장애가 발생하면 기존 Kidscade 게임 이용에는 영향을 주지 않는다. 통계 UI만 표시되지 않거나 마지막 캐시를 사용한다.
