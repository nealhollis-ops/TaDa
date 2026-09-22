# TaDa admin guide

For Deb and Neal. Everything an admin can do, where it lives, and what it touches. Last updated September 22, 2026.

The admin panel is at **app.gettada.me/admin**. It is only reachable by accounts whose profile role is `admin`. Members never see it, and the "Open the admin panel" button on Account only appears for admins.

## Who is an admin

- Admin is a role on the profile, not a plan. Both founders were seeded as admins with permanent Boss access.
- Nobody can change their own role from the app, including admins. A database trigger blocks it. To make someone an admin, add their email to `SEED_ADMIN_EMAILS` and run `npm run seed:admins`, or set `role = 'admin'` on their profile row in the Supabase SQL editor.
- Admins bypass the paywall. An admin with no plan still gets in.
- Admins get one extra field in Account: a **profile link** (your bio page, website or product). It shows as a button on your profile card when members open it, even if your profile is private. Members never see the field and a database trigger stops them setting one. Paste a full URL or just `mysite.com`; anything that is not a web address is dropped on save.

## The pages

### Numbers (`/admin`)

The dashboard. Counts for members, paying, trials running, past due, cancels in the last 30 days, comped, active today, and open reports. Read-only. If a number looks wrong, the underlying tables are `profiles`, `entitlements` and `reports`.

### Members (`/admin/members`)

Everyone with an account: name, plan, status and join date, searchable. Click a member to open their detail page.

The detail page shows their profile, plan and where it comes from (Stripe, comp or admin), streak and totals, teams, and any reports about them. Four cards of actions:

- **Comp grant**: give the member Standard, Teams or Boss for free, with an optional expiry date. This writes a `comp` row in `entitlements`. It never touches their Stripe subscription; if they are also paying, the higher of the two wins and the Stripe row keeps billing until they cancel. **Remove comp** deletes the comp row.
- **Subscription**: shows their live Stripe subscription and its status. **Cancel at period end** lets them keep what they paid for until the current month or year runs out; **Cancel now** stops it immediately with no proration. Either way Stripe confirms through the webhook and their access updates within a minute; nothing is written to the entitlement row by hand. Refunds are still done in Stripe, via the "Refund or manage in Stripe" link on the same page.
- **Ban this member**: locks them out at their next request, shows them the "account closed" screen, and hides every post and reply they wrote. Their subscription is not changed; use the Subscription card if it should stop. The same button becomes **Lift ban** on a banned member; lifting it lets them sign in again but their earlier posts stay hidden. Admins cannot be banned from the panel. Bans are not visible to other members.
- **Delete this member**: the permanent one. Type `delete` to enable the button. It cancels any live Stripe subscription first, then removes their sign-in, profile, tasks, stats, messages, posts, replies and team memberships. The Stripe customer and invoices stay in Stripe for your records. No undo, so reach for Ban when you might want them back. Admins cannot be deleted from the panel; you and Deb are safe from each other.

### Comp grants (`/admin/comp`)

The Faith Hub Unleashed flow. Paste a list of emails, pick a level, an optional expiry and a note, and press Grant.

- People who already have an account are comped immediately.
- Everyone else gets a **comp invite**: a row in `comp_invites`. The moment they sign up with that email they land at their level and never see a checkout page. The page lists invites waiting for signup.
- With "Email a signup link" ticked, each new invitee gets an email with a link to the sign-in page pre-filled with their address. Emails go out from `hello@gettada.me` through Resend. If the result line reports "email failed", the invite is still saved; fix the cause and re-run the same addresses, which re-sends without duplicating.
- Re-running an address that already has a waiting invite updates its level and expiry.

### Moderation (`/admin/moderation`)

Open reports first, then recent posts. For each report: **Mark reviewed** or **Dismiss**. For any post or reply: **Remove**, which soft-deletes it (it vanishes for members but stays in the database). Reports about a member, rather than a post, link to that member's detail page where you can ban.

Recent posts also carry **Pin to the top** / **Unpin**. This works on anyone's post, including a member's, so a good win or question can be promoted without you rewriting it. Pinning is also available without leaving the app: see Pinning, below.

Members can also block each other without involving you. Blocks are private and permanent until the member undoes them.

### Announcements (`/admin/announcements`)

Two tools:

- **Post and pin**: writes a post as you into the room you pick (Encourage is the one everyone reads) and pins it to the top until you unpin it. Pinned posts are listed below with Unpin and Remove. This is for announcements you are writing now; to pin a post that already exists, use the pin in the community or in Moderation.
- **Push to everyone**: a phone or desktop notification to every member with device alerts on, plus a bell entry for every active member whether or not their alerts are on. Title, a message of up to 160 characters, and which screen opens when tapped. The result line tells you how many inboxes and devices it reached. Every send is written to the admin log with the text and counts. There is no undo, so read it twice.

## Pinning a post

A pinned post sorts to the top of its own room in the community, with a gold border and a "Pinned" chip. There is no limit on how many can be pinned, and a pin stays until someone unpins it.

Three places do it, all the same flag on the same post:

- **In the app.** On Community, admins see a small pin icon in the header of every post. Tap it to pin, tap the crossed-out pin to unpin. This is the quickest route and works on any post, including a member's. Members never see the icon.
- **Admin → Moderation.** The Recent posts list has **Pin to the top** / **Unpin** on each of the last 30 posts.
- **Admin → Announcements.** **Post and pin** writes a new post as you and pins it in one step; the "Pinned now" list below unpins.

Every pin and unpin is written to the admin log as `post.pin` or `post.unpin`.

## Notifications, in one paragraph

Every push the app sends also lands in the member's bell. The app sends them for messages, partner requests, team invites, assigned work, past-due assignments (one reminder per task, sent by the morning cron), badges and levels, replies and mentions. Members control device alerts with the Notifications switch in Account and can separately silence community replies and mentions with the "From the community" switch. Banned members and members who have blocked the sender never receive a notification from that person. Your announcement pushes ignore the community switch but respect bans and the device-alert switch.

## Billing, what you can and cannot do here

- The app decides who gets in from the `entitlements` table only. Stripe writes rows with `source = 'stripe'` through the webhook; comp and admin rows are yours. Stripe code never touches your rows and you should never edit a Stripe row by hand.
- Cancellations can be done from the member's page (Subscription card). Refunds, card problems and receipts are done in the Stripe dashboard. Search Stripe by the member's email.
- Stripe is **live** as of September 21, 2026. Preview/staging deployments and `.env.local` still use test mode.
- Boss seat counts sync once a day at 05:30 UTC. Removing a member from a boss team changes the next invoice, not today's.
- The `stripe:setup` script is idempotent and mode-aware; re-run it against `.env.live` if a live price or the webhook ever needs recreating.

## Scheduled jobs (Vercel crons, production only)

| Time (UTC) | Path | What it does |
|---|---|---|
| 05:00 | `/api/cron/digest` | Rolls the day's automatic milestone posts into one Wins digest once there are five or more. |
| 05:30 | `/api/cron/seats` | Recounts boss seats and updates the Stripe extra-seat quantity. |
| 13:00 (8am Central) | `/api/cron/overdue` | Finds assigned work still open the day after its deadline and sends the assignee one Past due notice, bell plus push. Stamps `assignments.overdue_notified_at` so it never repeats. |

To run one by hand (for example on staging, where crons do not fire): `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/overdue`. Each returns a small JSON summary.

## The admin log

Every admin action is written to `admin_log` with who did it, what, to whom, and the details. Read it in the Supabase table editor if you ever need to know who changed what.

## Scripts (run from the project folder)

| Command | What it does |
|---|---|
| `npm run seed:admins` | Creates or updates the founder accounts as admins with permanent Boss access. Safe to re-run. |
| `npm run test:rls` | Creates throwaway members and proves the privacy rules hold: tasks, stats, partner and boss-line messages, the admin-only profile link, role changes, entitlements. Run after any change to database policies. |
| `npm run stripe:setup` | Creates the TaDa products, prices and webhook in whichever Stripe mode the key in `.env.local` points at. |
| `npm run test:stripe` | End-to-end checkout and webhook check against a running dev server. |
| `npm run migrate:staging` | Applies `supabase/migrations` to the staging database (refuses to touch production). Add a file prefix to run one. |
| `npm run seed:demo:staging` / `seed:admins:staging` | The seed scripts, pointed at staging via `.env.staging`. |

## Where things live

- Database and sign-in: Supabase project `tada-prod`. Migrations are in `supabase/migrations` and are applied by pasting into the SQL editor. Keep the files in git; they are the source of truth. Applied through `0018` as of this update: `0014` past-due reminders, `0015` boss direct messages, `0016` admin profile link, `0017` team room read marks, `0018` stops a member pinning their own post.
- Hosting: Vercel project `ta-da`. Every push to `main` deploys. Environment variables live in Vercel's project settings; `/api/health` shows which ones are present and which email domain is in use.
- Staging: see the next section. It is a separate Supabase project and a Vercel preview, so nothing you do there touches members.
- Email: Resend, sending from `hello@gettada.me`. Sign-in emails go through Supabase's SMTP, also via Resend.
- Payments: Stripe. Products are keyed `tada_<plan>_<monthly|yearly>` and `tada_boss_seat_*`.
- AI: Anthropic, for the brain dump and the talking calendar. Each member gets 30 calls a day.

## Staging, for trying changes before members see them

There is a full copy of TaDa that is safe to break.

- **Site**: https://ta-da-git-staging-nealhollis-ops-projects.vercel.app (Vercel preview of the `staging` branch; no Vercel login needed).
- **Database and sign-in**: Supabase project `tada-staging` in the free "TaDa Staging" organization. Same schema as production, seeded with the demo members and both founders as admins. Sign-in emails on staging go through Supabase's built-in mailer, which allows only a few per hour, so use a password rather than magic links.
- **Shared with production**: Stripe (test mode), Anthropic, Resend and the push keys. A checkout on staging creates a test-mode Stripe subscription like production would; the webhook only reaches production, so entitlements on staging are granted with the admin comp tool instead.
- **Secrets**: `.env.staging` in the project folder (never committed). It holds the staging Supabase keys, the database connection string and the deploy hook URL.

**The workflow for a change (Boss mode, for example)**

1. Branch off `main`: `git checkout -b boss-mode`. Build and commit there.
2. Put it on staging: `git checkout staging && git merge boss-mode && git push`, then `curl -X POST "$STAGING_DEPLOY_HOOK"` (the URL is in `.env.staging`). Two minutes later the staging site is running the branch. `vercel deploy --yes` from the branch also works and gives a one-off URL.
3. New migrations go to the staging database first: `npm run migrate:staging` replays every file (they are all idempotent), or `npm run migrate:staging -- 0014` for just one. `npm run seed:demo:staging` resets the demo data if it needs a fresh start.
4. Try it on the staging site. Break things. Nobody notices.
5. When it is approved: apply the same migration to production in the Supabase SQL editor, then `git checkout main && git merge boss-mode && git push`. Production deploys from `main` as usual.

Staging costs nothing (free Supabase tier, Vercel previews are included). Supabase pauses free projects after a week without traffic; open the project in the dashboard to wake it.

## If something is wrong

- **A member says their name shows as their email or the admin button vanished**: a profile column was added without a grant. See `supabase/migrations/0010_notif_community_grants.sql` for the fix pattern.
- **Invite emails fail**: check `/api/health` for `emailFromDomain`, then Resend's domains page. Only `gettada.me` is verified.
- **A push never arrives**: the member must have alerts on, a registered device, and on iPhone the app installed to the home screen. The bell entry arrives regardless.
- **Realtime looks dead** (messages not appearing live): test in real Chrome, not an embedded browser, and ask the member to tap Refresh.
- **A boss says they cannot message a member**: the boss line only works between the team owner and people on that boss team, in either direction. Two members of the same team cannot message each other privately, and nobody can message a stranger. Partner chat is separate.
- **A past-due reminder never came**: the cron runs once a day at 13:00 UTC on production only, reminds each task once, and skips banned members. Check `assignments.overdue_notified_at` for the row.
- **"Row-level security" errors while testing**: almost always two tabs in one browser signed in as different members. The newer sign-in replaces the cookie for the whole browser, so the older tab writes as the wrong person and the database refuses. The app now reloads a tab when that happens; if you see it anyway, reload the page. Use a private window for the second account.
- **Anything else**: clientcare@gettada.me reaches you both, and the admin log tells you what happened last.
