# 씨앗 랭킹 서버 설정

씨앗 랭킹 v1은 로그인한 학생의 **현재 보유 씨앗**과 **KST 기준 이번 주(월요일 시작) 획득 씨앗**을 같은 학급 안에서 비교합니다.

## 1. D1 migration 적용

Cloudflare Dashboard → D1 → `kidscade-stats` → Console에서 `migrations/0003_seed_rankings.sql`의 SQL을 한 번 실행합니다.

생성되는 테이블:

- `student_seed_weekly`

확인은 D1 Console에서 `/tables`를 실행하면 됩니다.

## 2. 집계 기준

- 보유 씨앗: 학생 계정의 최신 클라우드 상태에 저장된 현재 씨앗 수
- 이번 주 획득 씨앗: 로그인 상태에서 씨앗 잔액이 증가한 양을 누적
- 주간 기준: 대한민국 시간(KST) 월요일 00:00부터
- 게스트 상태에서 번 씨앗은 주간 획득 랭킹에 소급 집계하지 않음
- 학생 ID는 랭킹에 공개하지 않고 닉네임만 표시
- 사용 중지된 계정은 랭킹에서 제외

기존 학생 계정·통계 테이블과 Worker Secrets는 그대로 사용하며 추가 Secret은 필요하지 않습니다.
