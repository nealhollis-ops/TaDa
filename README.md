# TaDa

Plan your day, check it off, and hear the ta-da.

Live at **https://app.gettada.me** (Vercel). Backend on Supabase.

## Stack

- Next.js 16 (App Router, TypeScript) + Tailwind CSS v4
- Supabase (auth, Postgres, storage, realtime) via `@supabase/ssr`
- Stripe (subscriptions), Anthropic (brain dump + calendar bar), Resend (email)
- PWA: `src/app/manifest.ts` + `public/sw.js` so the app installs to phone home screens

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

Open http://localhost:3000. `GET /api/health` shows which env vars are present.

## Environment variables

All keys are listed with comments in `.env.example`. Add the same set in
Vercel > Project > Settings > Environment Variables. `NEXT_PUBLIC_APP_URL` is
`https://app.gettada.me` in production and `http://localhost:3000` locally.

## Supabase setup (one time)

In Supabase > Authentication > URL Configuration:

- Site URL: `https://app.gettada.me`
- Redirect URLs: `https://app.gettada.me/auth/callback` and `http://localhost:3000/auth/callback`

## Project layout

```
src/app/              routes (App Router)
  manifest.ts         PWA manifest (served at /manifest.webmanifest)
  auth/callback/      magic link + email confirmation handler
  api/health/         deploy check
  offline/            page shown by the service worker when offline
src/lib/env.ts        typed access to env vars (public vs server-only)
src/lib/supabase/     client.ts (browser), server.ts (RSC/routes), admin.ts (service role), proxy.ts (session refresh)
src/proxy.ts          Next 16 proxy (formerly middleware): refreshes the Supabase session
src/components/pwa/   service worker registration + install prompt
public/sw.js          service worker: offline fallback + push handlers
public/icons/         PWA icons
docs/                 launch checklist and the well-done.jsx prototype (spec for porting)
```

## Deploy

Push to `main`. Vercel builds and deploys to app.gettada.me.
