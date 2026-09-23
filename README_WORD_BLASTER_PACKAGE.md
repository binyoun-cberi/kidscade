# Kidscade 워드 블라스터 — GitHub Desktop용 패키지

이 ZIP은 **Kidscade 저장소 루트에 그대로 합쳐 넣도록** 폴더 구조를 맞췄습니다.

## 넣는 방법
1. ZIP을 풉니다.
2. `word_blaster_kidscade_pack` 안의 폴더/파일을 Kidscade 저장소 루트에 복사합니다.
3. Windows의 폴더 병합은 허용합니다.
4. GitHub Desktop에서 새 파일들을 확인합니다.
5. 커밋 예시: `Add Word Blaster FPS prototype and assets`
6. Push origin 합니다.

이번 패키지는 기존 핵심 파일을 덮어쓰지 않도록 만들었습니다. `data/games.json`도 자동으로 바꾸지 않았습니다.
메인 화면 연결용 카탈로그 한 줄은 `WORD_BLASTER_CATALOG_ENTRY.json`에 준비해 두었습니다. Push 후 ChatGPT에 "워드 블라스터 커밋했어, 키즈케이드에 연결해줘"라고 하면 현재 저장소 상태를 기준으로 안전하게 연결할 수 있습니다.

## 바로 확인할 파일
- 게임: `games/low_word_blaster/index.html`
- 3D 자산: `assets/game/3d/word-blaster/`
- UI: `assets/game/ui/word-blaster/`
- 효과음: `assets/audio/sfx/word-blaster/`
- 라이선스 기록: `assets/game/licenses/word-blaster-pack-license.txt`
- 임시 대문: `assets/gate-image/워드 블라스터.png`

## 포함하지 않은 것
Godot 원본 프로젝트의 `.gd`, `.tscn`, `.tres`, `.import`, 프로젝트 설정은 Kidscade 웹 런타임에 필요하지 않아 제외했습니다.
