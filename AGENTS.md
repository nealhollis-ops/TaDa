<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TaDa project notes

- Product spec lives in `docs/tada-launch-checklist.md`; the UI prototype to port is `docs/prototype/well-done.jsx` (reference only, not compiled).
- Production URL is `https://app.gettada.me` (Vercel). Supabase project is named TaDa.
- Next 16: use `src/proxy.ts` (not middleware.ts) for request-time logic.
- Env vars: read through `src/lib/env.ts`. Secrets only via `serverEnv()` in server code.
- Supabase clients: `@/lib/supabase/client` in Client Components, `@/lib/supabase/server` in server code, `@/lib/supabase/admin` only for trusted server code (webhooks, admin, seeds). Never import admin from the browser.
- Paywall rule: features gate off the `entitlements` table, never off Stripe directly. Stripe webhooks may only touch entitlement rows where `source = 'stripe'`.
- Brand colors are Tailwind tokens in `src/app/globals.css` (navy, coral, teal, gold, cream, ink, fade, line).
- Bump `CACHE_VERSION` in `public/sw.js` when the service worker changes.
