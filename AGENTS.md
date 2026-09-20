<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TaDa project notes

- Product spec lives in `docs/tada-launch-checklist.md`; the UI prototype to port is `docs/prototype/well-done.jsx` (reference only, not compiled). Admin how-to is `docs/admin-guide.md`; member help is the `HELP` array in `src/lib/planner/content.ts`, rendered in Account and at `/help`.
- Production URL is `https://app.gettada.me` (Vercel). Supabase project is named TaDa.
- Staging: Vercel preview of the `staging` branch at `https://ta-da-git-staging-nealhollis-ops-projects.vercel.app`, backed by Supabase project `tada-staging`; secrets in `.env.staging` (gitignored). Try risky changes there first: `npm run migrate:staging`, then merge to `main` and apply the migration to prod. Details in `docs/admin-guide.md` under Staging.
- Next 16: use `src/proxy.ts` (not middleware.ts) for request-time logic.
- Env vars: read through `src/lib/env.ts`. Secrets only via `serverEnv()` in server code.
- Supabase clients: `@/lib/supabase/client` in Client Components, `@/lib/supabase/server` in server code, `@/lib/supabase/admin` only for trusted server code (webhooks, admin, seeds). Never import admin from the browser.
- Paywall rule: features gate off the `entitlements` table, never off Stripe directly. Stripe webhooks may only touch entitlement rows where `source = 'stripe'`.
- Brand colors are Tailwind tokens in `src/app/globals.css` (navy, coral, teal, gold, cream, ink, fade, line).
- Bump `CACHE_VERSION` in `public/sw.js` when the service worker changes.
- Database schema lives in `supabase/migrations/` (idempotent SQL). Apply new migrations in the Supabase SQL Editor; keep the files in git as the source of truth.
- Auth: server actions in `src/app/login/actions.ts`; email links land on `/auth/callback` or `/auth/confirm` (both use `src/lib/supabase/verify.ts`). Signed-in screens go under `src/app/(app)/` and use `getMe()`.
- Members must never be able to change `profiles.role`; a trigger enforces it. Run `npm run test:rls` after touching policies.
- Planner state lives in `src/components/planner/store.tsx` (PlannerProvider); screens under `screens/` only render and call actions. Pure rules go in `src/lib/planner/`, Supabase access in `src/lib/data/`.
- The Browser pane cannot open websockets, so Realtime never fires there; verify live updates in real Chrome against production.
- RLS reminders: SELECT policies need a direct ownership column (INSERT...RETURNING), client upserts need an INSERT policy, timestamps go in bigint columns.
