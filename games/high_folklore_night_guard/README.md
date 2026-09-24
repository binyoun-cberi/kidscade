# 괴담 야간경비

학교 야간 경비실을 배경으로 한 고정 관리실/CCTV 생존 공포 구조와 세계 괴담 학습을 결합한 2D 게임입니다.

- 연습 근무: 도깨비, 유키온나, 처녀귀신
- 할로윈 근무: 위 3종 + 달걀귀신, 저승사자, 늑대인간
- 공통 조작: CCTV / 좌우 조명 / 좌우 문 / 상황별 특수장치
- 전승 정보와 게임용 대응 규칙을 도감에서 명확히 분리
- 도감 열람 중 게임 시간 일시정지
- 고어 없이 실루엣, 조명, CRT 노이즈, WebAudio 효과음으로 공포 연출
- 모바일 터치 대응
- 서버/외부 CDN/외부 에셋 의존 없음
- iframe 종료는 `kidscade:close-game` postMessage 사용

## 핵심 규칙

- 도깨비: 흔들리는 전시물을 찾아 클릭
- 유키온나: 성에가 차기 전에 난방 사용
- 처녀귀신: CCTV로 자주 확인, 문 앞에서는 서쪽 문을 잠깐 닫기
- 달걀귀신: CCTV에서 발견하면 오래 보지 말고 다른 카메라로 이동
- 저승사자: 문을 열어 두어 지나가게 하기
- 늑대인간: 해당 문을 닫아 막기

저장 키: `kidscade_folklore_night_v1`
진입점: `games/high_folklore_night_guard/index.html`


## v2 학교 아트 연결

사용 자산:
- `../../assets/game/2d/office.png` — 야간 경비실 메인 배경
- `../../assets/game/2d/classroom.png` — 6-1 교실 CCTV
- `../../assets/game/2d/science classroom.png` — 과학실 CCTV
- `../../assets/game/2d/hallway.png` — 중앙/서쪽/동쪽 복도 CCTV
- `../../assets/game/2d/ghosts.png` — 6종 귀신 투명 PNG 시트, CSS 6분할 크롭
- `../../assets/game/2d/instruments.png` — 야간 경비 장비/UI 안내 시트

CCTV 장면은 실제 배경 이미지를 사용하고, 귀신은 한 장의 투명 시트를 6등분하여 각 상태 위치에 독립적으로 배치합니다.
