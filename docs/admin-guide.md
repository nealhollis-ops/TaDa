# TaDa admin guide

For Deb and Neal. Everything an admin can do, where it lives, and what it touches. Last updated September 18, 2026.

The admin panel is at **app.gettada.me/admin**. It is only reachable by accounts whose profile role is `admin`. Members never see it, and the "Open the admin panel" button on Account only appears for admins.

## Who is an admin

- Admin is a role on the profile, not a plan. Both founders were seeded as admins with permanent Boss access.
- Nobody can change their own role from the app, including admins. A database trigger blocks it. To make someone an admin, add their email to `SEED_ADMIN_EMAILS` and run `npm run seed:admins`, or set `role = 'admin'` on their profile row in the Supabase SQL editor.
- Admins bypass the paywall. An admin with no plan still gets in.

## The pages

### Numbers (`/admin`)

The dashboard. Counts for members, paying, trials running, past due, cancels in the last 30 days, comped, active today, and open reports. Read-only. If a number looks wrong, the underlying tables are `profiles`, `entitlements` and `reports`.

### Members (`/admin/members`)

Everyone with an account: name, plan, status and join date, searchable. Click a member to open their detail page.

The detail page shows their profile, plan and where it comes from (Stripe, comp or admin), streak and totals, teams, and any reports about them. Two actions:

- **Comp grant**: give the member Standard, Teams or Boss for free, with an optional expiry date. This writes a `comp` row in `entitlements`. It never touches their Stripe subscription; if they are also paying, the higher of the two wins and the Stripe row keeps billing until they cancel. **Remove comp** deletes the comp row.
- **Ban this member**: locks them out at their next request, shows them the "account closed" screen, and hides every post and reply they wrote. Their subscription is not changed, so if they are paying, cancel it in Stripe as well. The same button becomes **Lift ban** on a banned member; lifting it lets them sign in again but their earlier posts stay hidden. Admins cannot be banned from the panel. Bans are not visible to other members.

### Comp grants (`/admin/comp`)

The Faith Hub Unleashed flow. Paste a list of emails, pick a level, an optional expiry and a note, and press Grant.

- People who already have an account are comped immediately.
- Everyone else gets a **comp invite**: a row in `comp_invites`. The moment they sign up with that email they land at their level and never see a checkout page. The page lists invites waiting for signup.
- With "Email a signup link" ticked, each new invitee gets an email with a link to the sign-in page pre-filled with their address. Emails go out from `hello@gettada.me` through Resend. If the result line reports "email failed", the invite is still saved; fix the cause and re-run the same addresses, which re-sends without duplicating.
- Re-running an address that already has a waiting invite updates its level and expiry.

### Moderation (`/admin/moderation`)

Open reports first, then recent posts. For each report: **Mark reviewed** or **Dismiss**. For any post or reply: **Remove**, which soft-deletes it (it vanishes for members but stays in the database). Reports about a member, rather than a post, link to that member's detail page where you can ban.

Members can also block each other without involving you. Blocks are private and permanent until the member undoes them.

### Announcements (`/admin/announcements`)

Two tools:

- **Post and pin**: writes a post as you into the room you pick (Encourage is the one everyone reads) and pins it to the top until you unpin it. Pinned posts are listed below with Unpin and Remove.
- **Push to everyone**: a phone or desktop notification to every member with device alerts on, plus a bell entry for every active member whether or not their alerts are on. Title, a message of up to 160 characters, and which screen opens when tapped. The result line tells you how many inboxes and devices it reached. Every send is written to the admin log with the text and counts. There is no undo, so read it twice.

## Notifications, in one paragraph

Every push the app sends also lands in the member's bell. Members control device alerts with the Notifications switch in Account and can separately silence community replies and mentions with the "From the community" switch. Banned members and members who have blocked the sender never receive a notification from that person. Your announcement pushes ignore the community switch but respect bans and the device-alert switch.

## Billing, what you can and cannot do here

- The app decides who gets in from the `entitlements` table only. Stripe writes rows with `source = 'stripe'` through the webhook; comp and admin rows are yours. Stripe code never touches your rows and you should never edit a Stripe row by hand.
- Refunds, cancellations on a member's behalf, card problems and receipts are done in the Stripe dashboard, not in the admin panel. Search Stripe by the member's email.
- Boss seat counts sync once a day at 05:30 UTC. Removing a member from a boss team changes the next invoice, not today's.
- Until launch, Stripe is in test mode. The `stripe:setup` script creates the live products, prices and webhook when you are ready.

## The admin log

Every admin action is written to `admin_log` with who did it, what, to whom, and the details. Read it in the Supabase table editor if you ever need to know who changed what.

## Scripts (run from the project folder)

| Command | What it does |
|---|---|
| `npm run seed:admins` | Creates or updates the founder accounts as admins with permanent Boss access. Safe to re-run. |
| `npm run test:rls` | Creates throwaway members and proves the privacy rules hold: tasks, stats, messages, role changes, entitlements. Run after any change to database policies. |
| `npm run stripe:setup` | Creates the TaDa products, prices and webhook in whichever Stripe mode the key in `.env.local` points at. |
| `npm run test:stripe` | End-to-end checkout and webhook check against a running dev server. |
| `npm run migrate:staging` | Applies `supabase/migrations` to the staging database (refuses to touch production). Add a file prefix to run one. |
| `npm run seed:demo:staging` / `seed:admins:staging` | The seed scripts, pointed at staging via `.env.staging`. |

## Where things live

- Database and sign-in: Supabase project `tada-prod`. Migrations are in `supabase/migrations` and are applied by pasting into the SQL editor. Keep the files in git; they are the source of truth.
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
- **Realtime looks dead** (messages not appearing live): test in real Chrome, not an embedded browser, and ask the member to tap the refresh arrow.
- **Anything else**: clientcare@gettada.me reaches you both, and the admin log tells you what happened last.
