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

1. Run `supabase/migrations/*.sql` in order in the SQL Editor (or `supabase db push`).
   Migrations are idempotent; re-running is safe.
2. Authentication > URL Configuration:
   - Site URL: `https://app.gettada.me`
   - Redirect URLs: `https://app.gettada.me/auth/callback`, `https://app.gettada.me/auth/confirm`,
     `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`
3. Authentication > Emails > Templates: paste the branded templates from `supabase/templates/` (see its README).
4. Seed the founders as admins with permanent Boss access:

```bash
npm run seed:admins
```

5. Optional: prove the privacy rules hold with two throwaway users:

```bash
npm run test:rls
```

## Accounts and the paywall

- Sign in at `/login`: email + password, magic link, or password reset. New accounts confirm by email.
- Every signed-in screen lives under `src/app/(app)/` and is protected by `src/proxy.ts` plus `getMe()` in `src/lib/auth.ts`.
- Access is decided by the `entitlements` table (`effective_plan(uid)`), never by Stripe directly.
  Rows with `source = 'comp'` or `'admin'` are never touched by billing; Stripe may only call `apply_stripe_entitlement()`.
- Admins are `profiles.role = 'admin'`. Members cannot change their own role (database trigger).

## Project layout

```
src/app/              routes (App Router)
  manifest.ts         PWA manifest (served at /manifest.webmanifest)
  auth/callback/      magic link + email confirmation handler
  api/health/         deploy check
  offline/            page shown by the service worker when offline
src/lib/env.ts        typed access to env vars (public vs server-only)
src/lib/supabase/     client.ts (browser), server.ts (RSC/routes), admin.ts (service role), proxy.ts (session + route guard), verify.ts (email links)
src/lib/auth.ts       requireUser / getMe / requireAdmin helpers
src/app/login/        sign-in screen and its server action
src/app/(app)/        signed-in screens (today, account/password)
supabase/migrations/  schema, RLS policies, storage buckets, realtime
supabase/templates/   branded auth emails
scripts/              seed-admins.mjs, rls-smoke-test.mjs
src/proxy.ts          Next 16 proxy (formerly middleware): refreshes the Supabase session
src/components/pwa/   service worker registration + install prompt
public/sw.js          service worker: offline fallback + push handlers
public/icons/         PWA icons
docs/                 launch checklist and the well-done.jsx prototype (spec for porting)
```

## Deploy

Push to `main`. Vercel builds and deploys to app.gettada.me.
