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
