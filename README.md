# TaDa

Plan your day, check it off, and hear the TaDa.

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

## The planner (Phase 3)

- One client-side app shell (`src/components/planner/`) mirrors the prototype: the store owns all state,
  the tab routes under `src/app/(app)/` render the screens, and `src/lib/planner/` holds the pure rules
  (calendar weeks, repeats, Organize, streaks with the Saturday/Sunday rules, calendar-bar ops, month rollover).
- The brain dump and the calendar bar call `POST /api/ai` (Anthropic key stays on the server; 30 calls per member per day).
  The dump reply is pinned to a JSON schema, so every item carries a day, a time block and a repeat, and
  `addDumped` runs them through `buildNewTasks` like any other task. Dates in later months are parsed the
  same way the calendar bar parses them; `addDumped` splits the result by month and routes anything past this
  one into the `later` list rather than the month's `tasks`.
- The store holds one month. A task dated in a later month is stamped for that month and kept in a separate
  `later` list, shown under Later on Plan, so Organize, progress and streak maths stay month-scoped.
- Plan carries month tabs for the current month and the next two (`ahead` in `plan.tsx`). A later tab reads
  from the `later` list that is already loaded, so no extra queries; it hides the dump, Organize and the
  Active/Completed tabs, all of which are defined against the month in `p.month`. `LaterGroup` takes a `first`
  prop so it starts after the tabbed months and nothing is listed twice.
- A boss can assign work to themselves: the Assign work dropdown lists the owner marked "(you)", as the
  task editor's reassign list and the holding tank always did. No schema change - `assignments_owner_insert`
  and `assignments_select` are both satisfied when `from_user` and `to_user` are the same person - and no
  notification, since the `assignment` notify copy is `self: false`.
- Assignments carry `starred` (migration 0027). The owner-only trigger from 0025 was widened to guard the
  category and the star together; the narrow category-only function is dropped. The tracker's sort toggle lives
  in `AssignmentTracker` and is kept per team in `localStorage` under `tada-assign-sort-<teamId>`, every read
  and write guarded so blocked storage just means the default.
- Notes on assigned work are editable by their author (migration 0026, `edited_at`). The policy carries
  WITH CHECK as well as USING, so a note cannot be moved to another assignment; posts and replies predate that
  habit and still lack it.
- A task with no day is in neither a day nor a week, so it gets its own `NoDayGroup` section at the foot of
  Today and of Plan. Plan's week groups hold dated tasks only; Today leaves these out of the day's total and
  counts one finished today into "Done today" on `doneAt`, not on a date it never had.
- The gold bar at the top of Today opens the same share sheet as Account (`share-card.tsx`). It hands
  `navigator.share` a single `text` with the link inside it: passing `url` as well lets a target keep the
  link and drop the message, which is what Messenger does. Copy is the fallback for anything that lives in a
  browser tab. The link carries `?from=<slug>`, which the marketing site forwards to signup and
  `handle_new_user` records in `profiles.referred_from`.
- A repeat lays down one row per day, tied together by `rootId`. An edit reaches `"one"` or `"series"`
  (`applyEdit`); a day edited on its own carries `exception` and later series edits skip it.
- Live updates come from Supabase Realtime; push notifications go through `/api/notify` and the service worker.
  Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in Vercel or pushes are silently skipped.
- Team invitations go out by email from `/api/invites/send`; the link lands on `/invite/<token>`.
- `/api/cron/digest` (nightly, Vercel cron) rolls a busy day's milestone posts into one digest. Needs `CRON_SECRET`.
- Member email lives in `src/lib/email.ts` (one Resend call, one branded shell) and `src/lib/member-emails.ts`:
  a welcome on first confirmation, and a trial-ending notice three days out from `/api/cron/trial`. Both claim
  their row (`update ... where <stamp> is null`) before sending and release the claim if the send fails, so a
  double sign-in or a cron run twice cannot send twice and a failure is retried. The trial cron reads Stripe's
  `trial_end` rather than the entitlement's `expires_at`, which carries a day of grace, and compares calendar
  days in one timezone so a second of clock skew cannot skip a day.
- `NEXT_PUBLIC_TADA_URL` is Deb's recorded TaDa. `NEXT_PUBLIC_TOUR_URL` is the Voomly embed URL for the welcome tour (the `embed.html?videoId=...` link, not the share page); the Tour modal shows it in a 16:9 player. Leave it empty and the modal shows a placeholder instead.

## Billing (Phase 4)

- `npm run stripe:setup` creates the TaDa products, prices (lookup keys `tada_<plan>_<interval>`), a TaDa-only
  Customer Portal configuration, and the webhook endpoint for `/api/stripe`. Run it once per Stripe mode
  (test now, live at launch). It writes the new webhook signing secret to `.env.local`; copy it to Vercel.
- The Stripe account is shared with other products. Everything TaDa creates carries `metadata.app = tada`,
  and the webhook ignores subscriptions whose prices are not `tada_*`.
- Members with no active entitlement see the paywall; checkout gives 14 days free with a card up front.
- The founders are emailed when someone starts a subscription and when someone moves between plans
  (`src/lib/founder-alert.ts`, sent with Resend). The signup notice comes from the webhook's
  `checkout.session.completed` branch, which fires once per checkout; the plan-change notice comes from
  `applySubscription`, which compares the entitlement row on file against the one it is about to write.
  Test-mode Stripe keys send nothing, so `npm run test:stripe` stays quiet. Addresses default to the two
  founders and can be overridden with `FOUNDER_ALERT_EMAILS`.
- Boss seats: `/api/stripe/seats` runs after roster changes and `/api/cron/seats` re-syncs nightly.
- Boss categories (`team_categories`, `assignments.category_id`, migration 0025): up to 10 per team, owner-only.
  The cap and the owner-only rule are both in the database - a trigger for the cap, and a second trigger that
  rejects a `category_id` change from anyone but the team owner, since `assignments_update` legitimately lets
  the assignee update their own row. Deleting a category is `on delete set null`, so the work survives it.
  The card offers three suggestions at a time out of a list of five, topped up as each is kept and trimmed by
  `10 - cats.length`, so suggestions plus real categories can never exceed the cap.
- `npm run test:stripe` (dev server running, test keys) replays real Stripe events into the local webhook
  and checks trial start, seat sync, plan change, cancel, and that comp rows are untouched.

## Admin panel (Phase 5)

- `/admin` is gated by `requireAdmin()` (profiles.role = admin) and reads through the service-role client.
- Numbers, member search (name/email/plan/status), member page with comp grant, ban, and a Stripe deep link
  for refunds; bulk comp by pasted emails (existing members granted at once, unknown emails become comp
  invites that the signup trigger redeems automatically, optionally emailed a signup link); moderation with
  the reports queue and recent posts; pinned announcements.
- Every admin action is written to `admin_log`. Banned members see a closed-account screen on sign-in.

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
src/lib/founder-alert.ts  emails the founders on a new subscription or a plan change
src/components/planner/   the planner shell; categories-card.tsx and no-day.tsx are the boss
                          category editor and the undated-task section used by Today and Plan
scripts/              seed-admins.mjs, rls-smoke-test.mjs
src/proxy.ts          Next 16 proxy (formerly middleware): refreshes the Supabase session
src/components/pwa/   service worker registration + install prompt
public/sw.js          service worker: offline fallback + push handlers
public/icons/         PWA icons
docs/                 launch checklist and the well-done.jsx prototype (spec for porting)
```

## Deploy

Push to `main`. Vercel builds and deploys to app.gettada.me.
