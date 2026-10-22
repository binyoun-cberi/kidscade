# 키즈케이드 Chat 기반 개발·검수 작업법

## 목표와 실제 범위

ChatGPT의 **일반 Chat + 연결된 GitHub 도구**를 이용해 과제를 분석하고,
코드를 고치고, 별도의 검수 관점으로 재평가한 뒤 PR을 제출합니다.
이 구성은 Codex/Work 사용량을 요구하는 별도 실행 시스템을 도입하지 않습니다.
다만 Chat에 적용되는 일반 사용량 제한은 여전히 있으며, Chat에서 사용하는
모델/도구의 계정별 과금 규칙을 변경해 주는 설정은 아닙니다.

**중요:** 이 워크플로는 단일 Chat이 역할을 순차 수행합니다.
여러 AI 모델이 독립적으로 동시에 대화하거나 사용자가 떠난 뒤 밤새 코딩하는
자율 에이전트 서비스는 포함하지 않습니다. 주 1회 GitHub 점검만 자동 실행됩니다.

## 시작하는 방법

Chat에서 다음처럼 요청합니다.

> 키즈케이드 `binyoun-cberi/kidscade`의 [게임명]을 개선해 줘.
> 저장소의 AGENTS.md 규칙을 읽고, 분석·기획·구현·비평·검수 역할을 순차 수행해.
> 재개선은 최대 3회로 제한하고, 오류와 실제 테스트 결과를 비교해.
> 유료 AI API·Secrets·배포·자동 병합 없이 별도 브랜치에 PR을 만들어 줘.

추가 지시가 없다면 한 번에 **게임 하나, 핵심 문제 하나**를 우선 수정합니다.
기능 변경이 게임 기록이나 교실 사용에 영향을 주면 해당 회귀 테스트를 포함합니다.
현재 예시는 **논두렁 너머** (`korean_farm`): 수정 대상은
`games/korean-farm/**`와 해당 전용 테스트로 제한합니다.
다음에는 사용자가 다른 게임을 지목하면 그때 대상 게임을 바꿉니다.

## 기존 도구 재사용

- `npm run test:ci`: 기존 종합 회귀 테스트
- `npm run health:strict`: 카탈로그 및 실행 파일 상태 검사
- `npm run build`: 배포용 산출물 생성(배포 자체는 실행하지 않음)
- `node scripts/chat-quality-report.cjs`: 공개된 게임 목록과 파일 존재 여부만 읽는 품질 점검
- `node scripts/chat-quality-report.cjs --json`: 동일 점검의 기계 판독 결과
- `node scripts/chat-quality-report.cjs --game korean_farm`: 논두렁 너머 **한 게임만** 검사
- `node scripts/chat-quality-report.cjs --game korean_farm --json`: 단일 게임 JSON 보고서
- `node --test tests/chat-quality-report.test.cjs`: 점검 스크립트 자체 테스트

기존 `.github/workflows/architecture-tests.yml`과 게임별 브라우저 워크플로가
최종 코드 변경에 대한 자동 검증을 수행할 수 있습니다.

## 정기 보고서 확인

`.github/workflows/chat-quality-audit.yml`은 **공개 저장소에서만**
매주 월요일 오전 9:23(한국 시간) 및 관련 PR 변경 시 작동합니다.
Actions 실행 목록에서 **Chat-assisted game quality audit**를 열고
`offline-audit`의 **Summary**를 확인하세요.
워크플로를 수동 실행할 때는 **Run workflow → game_id**에
`korean_farm`을 입력하면 논두렁 너머만 검사합니다.
빈칸이면 전체 게임을 확인합니다. 이 선택은 자동 코딩을 시작하는 버튼이
아니라, 정적 품질 보고서의 대상을 제한하는 옵션입니다.

추가 스토리지와 네트워크 비용을 피하기 위해 보고서 아티팩트를 업로드하지 않고,
Actions의 요약에만 기록합니다. 외부 API와 원격 D1에는 접근하지 않습니다.
GitHub 표준 호스팅 실행기는 공개 저장소에서 무료이지만, 저장소가 비공개로
전환되면 과금 조건이 달라집니다. 이 워크플로는 비공개에서 작업을 건너뜁니다.

## 보고서의 한계

보고서는 카탈로그에 등록된 게임 진입 파일·대문 이미지 경로·품질 상태만 검사합니다.
`rework` 표시는 카탈로그의 기존 분류를 반영하며, 점수는 결함 확인의 우선순위일 뿐
게임의 재미나 플레이 완성도를 측정하지 않습니다. 외부 이미지 URL은 다운로드하지 않고
미검증으로 표시합니다. 진짜 플레이 경험은 브라우저 테스트와 학생 피드백이 필요합니다.

## 안전을 위한 중단 조건

API 키, 토큰, 개인 데이터, 외부 모델 API 연동, 유료 GitHub 러너, 새로운 결제 설정,
Cloudflare 실제 배포 또는 자동 병합이 필요해지면 즉시 중단하고 별도 승인을 받습니다.
