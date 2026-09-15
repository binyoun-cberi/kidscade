# Kidscade Cloudflare Workers 배포

## Cloudflare 대시보드에서 선택할 값

- Repository: `binyoun-cberi/kidscade`
- Production branch: `main`
- Root directory: `/` (기본값)
- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`

`wrangler.jsonc`는 `./dist`를 Workers Static Assets 디렉터리로 지정한다.

## 빌드 동작

`scripts/build-cloudflare.cjs`는 Git에 추적된 실제 런타임 파일만 `dist/`로 복사한다.

배포물에서 제외되는 항목:

- `.github/`
- `docs/`
- `scripts/`
- `tests/`
- `.env*`, `.dev.vars*`
- `.gitignore`
- `package*.json`
- `wrangler.jsonc`
- Vercel/Netlify 설정 파일

또한 Cloudflare 빌드 산출물의 `index_base.html`에서 `/_vercel/insights/script.js`를 제거한다.

## 성능 최적화

Cloudflare 빌드 시 `assets/gate-image/`의 게임 대문 PNG/JPEG를 960×540 WebP로 별도 생성하고, 배포용 `data/games.json`만 WebP 경로로 바꾼다. 원본 저장소의 이미지와 카탈로그는 손대지 않는다.

대문 URL에는 원본 이미지 내용의 짧은 해시가 쿼리 문자열로 붙는다. 따라서 대문 이미지는 브라우저에서 1년 `immutable` 캐시를 사용할 수 있고, 원본 이미지가 바뀌면 URL도 자동으로 달라져 오래된 대문이 남지 않는다.

`dist/_headers`도 빌드에서 자동 생성한다.

- 일반 `assets/*`: 1일 브라우저 캐시 + stale-while-revalidate
- 생성된 `assets/gate-image/*.webp`: 1년 immutable 캐시
- HTML, JSON, 주요 JS: 기본 ETag 재검증 유지

메인 화면의 게임 대문은 `IntersectionObserver`를 사용하여 화면 근처 약 320px 안으로 들어오기 전에는 실제 이미지 요청을 시작하지 않는다. 첫 화면 아래쪽의 수십 개 대문을 한꺼번에 받지 않기 위한 설정이다.

## 무료 플랜 보호 원칙

현재 `wrangler.jsonc`에는 Worker 실행 코드나 `assets.run_worker_first`가 없고 Static Assets만 사용한다. 이 구조에서는 정적 파일 요청이 Worker 호출로 계산되지 않는다.

향후에도 단순 사이트/게임 파일을 빠르게 제공하려는 목적으로 다음 설정을 켜지 않는다.

- `assets.run_worker_first`
- Worker 코드에서 모든 정적 요청을 가로채는 라우팅
- 단순 정적 파일을 위해 Workers Caching을 별도로 활성화하는 구성

서버 API가 필요해질 때만 `/api/*` 같은 제한된 경로에 Worker 코드를 추가한다.

## 로컬 확인

```bash
npm install
npm run build:cloudflare
npm run dev:cloudflare
```

## 실제 배포

```bash
npm install
npm run deploy:cloudflare
```

Cloudflare Workers Builds를 GitHub에 연결하면 로컬 배포 명령을 직접 사용할 필요 없이 `main`에 병합될 때 자동 배포할 수 있다.

## 비밀정보

API 키, DB 비밀번호, 관리자 토큰 등은 정적 HTML/JS나 GitHub 저장소에 넣지 않는다. 이후 서버 기능을 추가할 때 Cloudflare Worker Secrets / 환경 변수와 D1 binding을 사용한다.
