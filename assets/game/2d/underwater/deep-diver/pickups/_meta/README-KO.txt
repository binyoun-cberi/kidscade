Deep Diver Asset Add-on Pack v2
=================================

이 ZIP은 Kidscade 저장소 루트에 그대로 풀어넣도록 구성되어 있습니다.

1. 픽업 아이콘
assets/game/2d/underwater/deep-diver/pickups/icons_128/
- 실제 게임 플레이 렌더링용 권장 크기
- bucket, fishingrod, gold, key, ruby, saphire, seashell,
  silvercup, silverplate, telescope, tincan, trout

assets/game/2d/underwater/deep-diver/pickups/hires_512/
- 도감/확대 UI/추후 재가공용 고해상도 원본

2. 수중 식생
assets/game/2d/underwater/deep-diver/vegetation/
- water-plant-02.png
- grass-clump-01.png

권장 배치:
- water-plant-02: reefShelf, reefMaze, kelpEdge
- grass-clump-01: kelpEdge, ruinGate, wreckOuter

3. 수중 앰비언스
assets/audio/incoming/newmusical/
- dragon-studio-underwater-ambience-376890.mp3

오디오 기술 메모:
- 약 22.07초
- Stereo
- 44.1 kHz
- Deep Diver 배경 수중 앰비언스 후보

중요:
- 오디오는 기존 Kidscade의 incoming/newmusical 구조에 맞춰 원본 파일명을 유지했습니다.
- 실제 게임 연결 시 audio-catalog.json 또는 Deep Diver 런타임에서 경로를 등록해야 합니다.
- 원본 다운로드 페이지/라이선스 정보는 이 파일만으로 확정하지 않았으므로,
  실제 배포 전 출처 기록을 보존하는 것을 권장합니다.

픽업 ID 권장값:
bucket, fishingrod, gold, key, ruby, saphire, seashell,
silvercup, silverplate, telescope, tincan, trout
