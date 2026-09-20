역사 로얄 카드 이미지 분리본

- 원본 HTML 내 data:image/webp;base64 카드 이미지 68개 참조를 외부 WebP 경로로 변경했습니다.
- 실제 최종 사용 카드 아트: 67개
- hill_fort는 원본 코드에서 2번 정의되어 뒤 정의가 최종값이므로, 앞 이미지는 hill_fort_legacy1.webp로 보존했습니다.
- b_watchtower는 원본부터 내장 카드 이미지가 없으며 portraitHTML의 SVG fallback을 계속 사용합니다.
- GitHub 저장소 루트에 이 ZIP 내용을 그대로 덮어놓으면 됩니다.
- HTML 위치: games/high_history_royale/역사 로얄.html
- 카드 이미지 위치: assets/game/history_royale/cards/<faction>/<type>/*.webp
