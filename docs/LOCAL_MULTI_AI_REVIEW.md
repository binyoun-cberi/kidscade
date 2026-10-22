# 키즈케이드 — 실제 독립 AI 검토 사용법

이 기능은 한 ChatGPT가 개발자·비평가 역할을 번갈아 말하는 방식과 다릅니다.
서로 다른 로컬 AI 모델을 개별 대화로 호출하여 각 모델이 처음에는
다른 모델의 결과를 모른 채 같은 게임을 검토합니다.

## 절차

1. 개발 AI: 코드 구성, 최소한의 수정 방향 제안.
2. 게임성 AI: 선택, 결과, 몰입, UI, 다시 플레이할 이유 평가.
3. 픽셀 AI: 시대별 캐릭터와 화면. 실제 이미지가 없으면 미적 품질은 미검증으로 표시.
4. QA AI: 버그 재현, 게임 상태, 저장 호환, 회귀 테스트 범위 검수.

첫 단계의 네 AI는 **서로의 답을 보지 않습니다**.
두 번째 단계에서 각 AI는 나머지 AI의 의견을 보고 오류와 누락을 비평합니다.
기본 설정은 모델 4종과 총 8회 호출입니다.

각 AI의 결론은 검증이 필요한 주장이지 자동 승인 조건이 아닙니다.
이 도구는 게임 코드를 수정하거나 PR을 병합하지 않습니다.

## Windows PowerShell 실행

먼저 PC에 Ollama를 설치하여 실행합니다. 앱이 동작 중이라면 별도로
ollama serve 명령을 실행할 필요가 없습니다.

다음 모델을 로컬 컴퓨터에 설치합니다.

    ollama pull qwen2.5-coder:3b
    ollama pull llama3.2:3b
    ollama pull gemma3:4b
    ollama pull phi3.5:3.8b

키즈케이드 저장소의 루트 폴더에서 구조 검사:

    node scripts/local-multi-ai-review.cjs --dry-run

실제 모델 4개에 대한 독립 검토 및 상호 비평:

    node scripts/local-multi-ai-review.cjs --focus "단 하나의 인생: 고려 가족과 선택 결과"

픽셀 스크린샷까지 분석하려면:

    node scripts/local-multi-ai-review.cjs --image "C:\Users\USER\Pictures\one-life.png" --focus "고려·조선 픽셀 화면과 가족·직업 묘사"

빠르게 1단계만 시험하려면:

    node scripts/local-multi-ai-review.cjs --rounds 1

모델 이름이 설치된 태그와 다른 경우 --models 인수로 역할별 모델을
설정할 수 있습니다. --help 로 옵션을 확인하세요.

## 결과와 안전

완료된 보고서는 로컬의 다음 파일에만 저장됩니다.

- .local-ai-reviews/one-life-review.md
- .local-ai-reviews/one-life-review.json

해당 폴더는 GitHub 커밋에서 제외됩니다.

- 모든 AI 요청은 로컬 PC의 127.0.0.1:11434 로만 전송됩니다.
- GitHub Secrets, 별도 API 키, 외부 유료 모델을 이용하지 않습니다.
- 모델 설치/다운로드는 사용자가 직접 합니다.
- Node.js 기본 기능만 사용하며 새 npm 패키지를 설치하지 않습니다.
- 읽는 코드의 범위는 《단 하나의 인생》에서 미리 정한 파일로 제한됩니다.
- 파일명과 행 번호를 확인하지만, 코드 위치 확인은 주장 사실 여부의 입증이 아닙니다.
- 스크린샷이 없으면 실제 화면 디자인은 검수 완료로 표시하지 않습니다.
- 실제 플레이를 수행하거나 교실에서 학생 반응을 측정하는 도구는 아닙니다.
- 게임의 코드, 저장 데이터, 출생 확률, 비용 설정, 배포 및 PR은 변경되지 않습니다.

단위 테스트는 모의 AI 응답으로 검토 단계가 분리되는지만 확인합니다.
실제 AI들이 대화했다는 증거는 Ollama에서 모델 추론을 성공적으로
실행한 뒤 기록한 로컬 보고서입니다.

## 테스트

    node --test tests/local-multi-ai-review.test.cjs

생성한 보고서를 이 대화로 보내면 내용을 기준으로 수정안을 구현하고
기존 CI 검증을 거쳐 PR을 작성하는 다음 단계로 이어갈 수 있습니다.
