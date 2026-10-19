# fenzit-web

[![Deploy to Cloudflare](https://github.com/ashishkumar1000/fenzit-web/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/ashishkumar1000/fenzit-web/actions/workflows/deploy.yml)

Web app for Fenzit, served from Cloudflare Workers at https://fenzit.com.

Every push to `main` builds the app and deploys it through `.github/workflows/deploy.yml`. The badge above shows whether the latest deploy passed.

## Local development

```sh
bun install
cp .env.example .env.local   # set VITE_API_BASE_URL to the fenzit-be origin
bun run dev
```

Local API calls need fenzit-be to allow this dev origin. Add `http://localhost:5173` to `CORS_ALLOWED_ORIGINS` in fenzit-be's `.env`.

## Scripts

- `bun run dev`: Vite dev server
- `bun run typecheck`: `tsc` (TypeScript 7) with no emit
- `bun run build`: typecheck and production build into `dist/`
- `bun run lint`: ESLint, including the import-direction and no-string-className rules
- `bun run format` / `bun run format:check`: Prettier
- `bun run check:styles`: every component has its paired `.module.css`
- `bun run test` / `bun run test:watch`: Bun's test runner
- `bun run deploy`: build, then `wrangler deploy` (CI runs this on `main`)

CI runs lint, format check, styles check, and tests before it deploys. Any failure stops the deploy.

## Deploy setup

The workflow runs in the `Fenzit-web` GitHub environment and needs two secrets there:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
