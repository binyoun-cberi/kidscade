# 논두렁 너머 — PR 1: 한국 3D 테스트 농장

이 디렉터리는 한국 농촌 농사 시뮬레이터의 **첫 번째 플레이 가능한 시각 검수판**입니다.

## 이번 PR에서 가능한 것

- 48×48 논리 지형에 농가, 축사, 우물, 논 네 구획, 당근밭, 옥수수밭, 농수로를 3D로 표현
- PC WASD/방향키, 바닥 클릭 이동, 모바일 화면 조이스틱과 손가락 선택
- 휠/핀치 확대·축소, Q/E 및 화면 버튼으로 시점 회전
- 벼의 **Rice_1~4.fbx** 원본을 단계별로 로드. 실패하면 Quaternius rice GLB, 마지막으로 임시 지오메트리로 표시
- 선택한 논의 시각적 성장 단계를 변경하고, 원본/대체 사용 여부를 '에셋 검수'에서 확인
- 키즈케이드 Game SDK와 브라우저 저장 사용. 방문한 논과 시점, 캐릭터 위치 기억

## 아직 구현되지 않은 것

- 파종·모내기·물꼬 조작·수분 물리·토양·실제 생장 시간 경과
- 수확·인벤토리·판매, 주민 대화, 계절 진행
- 한국식 농가 건물 신규 디자인, 농부 작업 애니메이션, 실환경 오디오
- 모든 모델의 외형 검수 완료: **네트워크 로딩 성공은 시각적 승인과 다릅니다.**

위 기능은 PR 2 이후 별도로 다룹니다. UI에서도 '성장 미리보기'라고 표기합니다.

## 로컬 실행

정적 서버로 저장소 루트를 서비스하고 `/games/korean-farm/index.html`로 이동합니다.
파일 열기(`file://`)는 ES 모듈·GLB/FBX 보안 제한 때문에 지원하지 않습니다.

- `node --test tests/korean-farm-prototype.test.mjs`: 농장 상태, 모델 경로, SDK 연결 검사
- `npm run build:cloudflare`: 기존 Cloudflare 정적 산출물 확인

이 PR에서는 `data/games.json`에 정식 게임을 노출하지 않습니다. 그래픽 실사와 디바이스 검수 후 별도 PR에서 정식 출시합니다.

## 기존 에셋과 라이선스

- `assets/game/crops/FBX/Rice_1~4.fbx`: Quaternius, `assets/game/crops/License.txt`에 CC0 근거
- `assets/game/3d/nature/kenney-nature-kit/`: Kenney, CC0
- `assets/game/characters/people/`: 기존 Kidscade 공용 GLB
- `assets/more assets/cozyfarmbystyloo new/GLB/`: 기존 Styloo 농장 GLB
- `assets/quaternius_cc0-*.glb`: 기존 공용 Quaternius 농장 에셋

3D 모델 파일을 복제하지 않고 기존 저장소 자산 경로를 참조합니다. Lofi Valley/Seasons Gone의 소스는 **아직 이 PR에 복사하지 않았으며**, 이후 도입 시 별도의 MIT 저작권 고지를 포함해야 합니다.

## 눈으로 확인할 항목

1. 벼 4단계가 서로 다른 형태인지(성장 순서/색/비율)
2. 농가·축사·캐릭터가 흰색으로 깨지지 않는지, 땅에 잘 서 있는지
3. 모바일 입력에서 카메라·선택·이동이 충돌하지 않는지
4. 텍스처 로드 실패 또는 에셋 대체 발생 여부('에셋 검수' 버튼)
5. 저장·새로고침 후 위치와 방문한 논 기록이 복구되는지
6. 저사양 모바일 성능과 초기 로딩 시간
