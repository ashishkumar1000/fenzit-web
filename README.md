# fenzit-web

[![Deploy to Cloudflare](https://github.com/ashishkumar1000/fenzit-web/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/ashishkumar1000/fenzit-web/actions/workflows/deploy.yml)

Web app for Fenzit, served from Cloudflare Workers at https://fenzit.com.

Every push to `main` builds the app and deploys it through `.github/workflows/deploy.yml`. The badge above shows whether the latest deploy passed.

## Local development

```sh
bun install
cp .env.example .env.local   # set VITE_API_BASE_URL to the fenzit-be URL
bun run dev
```

## Scripts

- `bun run build`: typecheck and production build into `dist/`
- `bun run deploy`: build, then `wrangler deploy` (CI runs this on `main`)

## Deploy setup

The workflow runs in the `Fenzit-web` GitHub environment and needs two secrets there:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
