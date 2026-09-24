# Kidscade games directory

새로 만드는 게임은 원칙적으로 이 디렉터리 아래에 둡니다.

권장 구조:

```text
games/
  <game-id>/
    index.html
    game.js        # 필요한 경우
    style.css      # 필요한 경우
```

공용 이미지·음원·폰트는 게임 폴더에 중복 저장하지 않고 `assets/` 아래 공용 자산을 우선 사용합니다. 게임 전용 소규모 자산은 해당 게임 폴더 안에 둘 수 있습니다.

기존 루트 게임 HTML은 한 번에 이동하지 않습니다. `data/games.json`의 링크, 게임 내부 상대 경로, 저장 키 호환성을 확인하면서 게임별로 하나씩 이동합니다.

새 게임을 등록할 때는 다음을 지킵니다.

1. 안정적인 영문/숫자/하이픈 기반 `game-id`를 사용합니다.
2. 진입 파일은 `games/<game-id>/index.html`을 기본으로 합니다.
3. `data/games.json`의 `href`는 위 진입 파일을 가리킵니다.
4. `file://`, Windows 절대경로, `localhost` 경로를 사용하지 않습니다.
5. 공용 저장이 필요하면 `window.KidscadeStorage`를 우선 사용합니다.
6. PR에서 배포 경로 검사와 회귀 테스트가 통과해야 합니다.

현재 루트 HTML 수를 기준선으로 잡아 새 게임이 다시 루트에 쌓이지 않게 하고, 기존 파일은 향후 리워크 시점에 단계적으로 이 디렉터리로 이동합니다.

## 게임 HTML 파일 이름

- 새 게임과 대규모 리워크 게임의 표준 진입점은 `games/<game-id>/index.html`입니다.
- 기존에 카드 제목을 파일명으로 사용하는 게임은 즉시 이름을 바꾸지 않습니다. 리워크 또는 폴더 이관 시 `index.html`로 정리합니다.
- 벽란도 상행기처럼 별도 launcher가 필요한 검토된 예외는 유지할 수 있습니다.
- 이전 주소는 `data/game-path-aliases.json`에 기록하고, 이전 HTML에는 검색 매개변수와 해시를 유지하는 이동 코드만 둡니다.
- 게임 ID와 저장 키는 파일 이동과 별개로 유지하여 기존 즐겨찾기·기록과 호환합니다.
- 루트 HTML 수는 증가시키지 않습니다. 새 게임은 루트에 진입 HTML을 만들지 않습니다.
- `node --test tests/game-filenames.test.cjs`로 표준 진입점과 호환 경로를 확인합니다.


## 카탈로그 메타데이터 v7

새 게임과 대규모 리워크 게임은 `data/games.json`에 다음 탐색 정보를 반드시 명시합니다.

- `subject`: math / korean / language / social / science / arts / career / thinking
- `genre`: action / puzzle / strategy / simulation / management / quiz / rhythm / sports / sandbox
- `difficulty`: easy / medium / hard
- `sessionMinutes`: 한 판 또는 대표 세션 플레이 시간
- `players`: solo / local2 / localMulti / online / classroom 중 하나 이상
- `input`: touch / keyboard 중 지원 입력
- `qualityStatus`: featured / standard / rework
- `classroom`: 교사가 함께 운영하기 좋은 게임인지 여부

기존 `category`는 저장·미션·레거시 호환을 위해 남겨 두지만, 새 메인 탐색 UI의 1차 기준으로 사용하지 않습니다.


## Game SDK v1

새 게임과 대규모 리워크 게임은 가능하면 공통 SDK를 직접 로드합니다.

```html
<script
  src="../../kidscade-game-sdk.js"
  data-game-id="high_example_game"
  data-title="예시 게임"
  data-shell="true"
  data-orientation="landscape">
</script>
```

게임 코드에서는 공통 생명주기를 사용합니다.

```js
KidscadeGame.start();
KidscadeGame.sound('correct');
KidscadeGame.score(1200);
KidscadeGame.gameOver({ score: 1200 });
KidscadeGame.exit();
```

- 공통 메뉴는 다시 시작 / 게임 나가기 / 지원 게임의 음소거 / 연결된 게임의 일시정지를 제공합니다.
- 자체 음향 엔진을 유지하는 게임은 `data-mute="false"`로 공통 음소거 버튼을 숨기고, 추후 `KidscadeAudio`로 옮긴 뒤 켭니다.
- iframe 종료를 위해 게임이 직접 `postMessage('*')`를 보내지 않습니다.
- 저장이 필요한 새 SDK 기록은 `kidscade_game_v1:` namespace를 사용합니다.
