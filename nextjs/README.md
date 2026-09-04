# JS&C — Next.js App (Marketing + AI Platform Demo)

Jonathan Simpson & Co. — the marketing site and the live private-markets AI
demo, in one Next.js 14 App Router application (TypeScript + Tailwind).

> The Python backend lives in the separate
> [`jsnc-demo-automation-python`](https://github.com/jonathan-simpson-it/jsnc-demo-automation-python)
> repository. Deployment topology is documented in the combined repo's
> `docs/deploy.md`.

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local    # optional; defaults cover local dev
npm run dev
```

Open http://localhost:3000. The app proxies `/api/*` and `/health` to the
backend via Next.js rewrites; when `BACKEND_URL` is unset it targets
`http://127.0.0.1:8000` (a locally running backend).

## What lives here

- **Marketing pages** (static, editorial look): `/services`, `/work` (+ case
  studies), `/blog` (+ posts), `/products`, `/applications`, `/contact`,
  `/support`, plus `robots.txt` and `sitemap.xml`.
- **Demo pages**: `/` (home/launchpad), `/chat`, `/documents`, `/eval`,
  `/summary`, `/config`, `/mailbox`, `/review-hub`, `/radar`, `/telemetry`,
  `/workbench/*`.
- Header/footer switch between marketing and demo navigation based on the
  route; marketing pages link to the demo via a "Live demo" button.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://127.0.0.1:8000` | Backend origin for the `/api/*` and `/health` rewrites |
| `NEXT_PUBLIC_SITE_URL` | `https://jonathansimpson.co` | Metadata/canonical/sitemap origin |

## Verification

```bash
cd frontend && npx tsc --noEmit && npm run build
```

## Deployment

Import this repo into Vercel with Root Directory `frontend`, and set
`BACKEND_URL` to the deployed Python backend URL. See the combined repo's
`docs/deploy.md` for the full runbook.
