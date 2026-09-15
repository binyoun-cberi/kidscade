# Kidscade Cloudflare 연결 전 정리

이 문서는 Cloudflare 무료 배포 전에 진행하는 안전한 정리 순서를 기록한다. 현재 사이트는 `index.html` → `main-bootstrap.js` → `index_base.html` + `data/games.json` 구조이며, 게임 카탈로그와 일부 런타임 기능은 이미 모듈화되어 있다.

## 1. 배포 가능한 main 만들기

먼저 기능 추가보다 회귀 방지를 우선한다.

- `node --test tests/*.test.cjs` 계열 회귀 테스트를 유지한다.
- `scripts/deployment-audit.cjs`로 로컬 전용 경로와 깨진 정적 링크를 검사한다.
- 게임 진행 불가, 메인 카드 클릭 불가, 상점/모달 상태 꼬임처럼 사용을 막는 오류를 우선 수정한다.
- 사소한 밸런스와 미술 개선은 배포 이후에도 계속할 수 있다.

현재 배포 감사에서 확인하는 항목:

- `file://` 경로
- `C:\...` 또는 `C:/...` 같은 Windows 절대 경로
- `localhost` / `127.0.0.1` 주소
- 존재하지 않는 로컬 `src` / `href`
- 저장소 밖을 가리키는 상대 경로
- 외부 HTTP(S) 의존성 목록
- Vercel 전용 `/_vercel/` 경로 경고

초기 전환 기간에는 `node scripts/deployment-audit.cjs`를 보고서 모드로 사용한다. 경고와 기존 문제를 정리한 뒤 `node scripts/deployment-audit.cjs --strict`를 배포 차단 검사로 전환한다.

## 2. 파일 구조 정리 원칙

현재 게임 링크가 대부분 루트 HTML 파일을 직접 가리키므로 한 번에 파일을 이동하지 않는다. 대규모 이동은 95개 게임의 카탈로그 링크와 게임 내부 상대 경로를 동시에 깨뜨릴 위험이 있다.

현재 유지할 구조:

- `assets/` : 이미지와 정적 리소스
- `assets/gate-image/` : 게임 대문 이미지
- `data/` : 게임 카탈로그 등 정적 데이터
- `docs/` : 구조 문서
- `scripts/` : 유지보수/감사 도구
- `tests/` : 회귀 테스트
- 루트 런타임 JS : 메인 화면에서 공통으로 쓰는 모듈
- 루트 게임 HTML : 당장은 유지

향후 목표 구조:

- `games/<game-id>/index.html`
- `assets/images/`
- `assets/audio/`
- `assets/fonts/`
- `js/` 또는 기능별 런타임 디렉터리
- `css/`
- `data/`

게임 파일 이동은 다음 순서로 한다.

1. `data/games.json`의 `href`만으로 게임을 찾는 구조를 유지한다.
2. 게임 하나를 `games/<id>/`로 옮긴다.
3. 해당 게임의 이미지/오디오 상대 경로를 검사한다.
4. 배포 감사와 회귀 테스트를 통과한다.
5. 문제가 없을 때 다음 게임으로 반복한다.

## 3. 서버 환경 경로 규칙

Cloudflare/Linux 환경에서는 파일명 대소문자를 정확히 구분한다.

- `Image.PNG`와 `image.png`를 같은 파일로 가정하지 않는다.
- `C:\...`, `file://...`를 사용하지 않는다.
- 게임 파일에서 저장소 밖으로 빠져나가는 `../../..` 경로를 만들지 않는다.
- 외부 CDN은 필요한 경우 유지할 수 있지만 배포 감사에서 목록을 확인한다.
- Vercel 전용 `/_vercel/insights/script.js`는 Cloudflare 전환 전에 제거 대상이다.

## 4. localStorage 표준화

`kidscade-storage.js`가 공통 저장 키와 타입별 읽기/쓰기를 관리하는 첫 단계다.

중요: 기존 학생의 저장 데이터를 잃지 않기 위해 실제 저장 키를 즉시 바꾸지 않는다. 예를 들어 UI에서는 "씨앗"을 사용하지만 현재 실제 저장 키는 `kidscade_coins`다. 공통 API의 논리 이름 `seeds`가 기존 키를 가리키게 하여 호환성을 유지한다.

현재 공통 키 예시:

- `saveVersion` → `kidscade_save_version`
- `seeds` → `kidscade_coins`
- `favorites` → `kidscade_favs`
- `recents` → `kidscade_recents`
- `age` → `kidscade_age`
- `inventory` → `kidscade_inventory`
- `equipped` → `kidscade_equipped`
- `avatarInventory` → `kidscade_avatar_inventory`
- `avatarEquipped` → `kidscade_avatar_equipped`
- `playtimeSeconds` → `kidscade_playtime_sec`

새로운 메인 기능은 가능하면 `window.KidscadeStorage`를 통해 저장한다. 기존 인라인 코드와 개별 게임은 회귀 위험을 줄이기 위해 단계적으로 이관한다.

## D1 연결을 위한 다음 단계

Cloudflare 연결 후에는 `KidscadeStorage` 위에 서버 동기화 계층을 추가한다. 게임이 직접 D1을 호출하지 않고 공통 저장 API만 사용하게 만들면 다음과 같이 전환할 수 있다.

- 비로그인: localStorage만 사용
- 로그인: localStorage를 즉시 사용하고 중요한 상태를 Worker/D1과 동기화
- 오프라인/서버 오류: localStorage 상태로 계속 플레이

D1에 처음 동기화할 우선 데이터는 씨앗, 프로필/아바타, 최고점수, 보유 아이템, 플레이 기록이다.
