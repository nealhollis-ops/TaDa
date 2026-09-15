# TaDa Launch Checklist
### From prototype to paid product on Vercel + Supabase
Work top to bottom. Each phase depends on the one before it. Hand this file and well-done.jsx to Claude Code together.

---

## Phase 0: Accounts and the URL come first

- [ ] Confirm you can log into the registrar that holds gettada.me (buy it now if you haven't yet, and grab clientcare@gettada.me email at the same time)
- [ ] Decide the structure: gettada.me IS the product, and your ClickFunnels sales pages simply link to it
- [ ] Create the Vercel account (or team) and create an EMPTY project named "tada" with no deploy yet
- [ ] In that Vercel project, open Domains and add gettada.me, plus www.gettada.me set to redirect to the bare domain, then copy the DNS records Vercel shows you
- [ ] At the registrar, add the A record Vercel gives you for the bare domain and the www record. A root domain uses an A record instead of a CNAME, and Vercel shows the exact values on screen
- [ ] Wait for Vercel to show the domain as verified with SSL. Now the very first deploy will answer at the real address, and everything after this (Stripe, webhooks, emails) gets configured against the final URL exactly once
- [ ] Create the Supabase project, name it tada-prod, and save the project URL, anon key, and service role key in your password manager
- [ ] Create the Stripe account and grab the TEST keys (live keys come in Phase 7)
- [ ] Create an Anthropic API key at console.anthropic.com for the brain dump and the talk-to-the-calendar bar
- [ ] Create a Resend account for app emails and verify a sending domain like mail.gettada.me (it gives you DNS records to add)
- [ ] Record two assets while it's easy: Deb saying "Ta-Da!" as a one second mp3, and the welcome tour video

## Phase 1: Scaffold the project with Claude Code

- [x] Install Claude Code on the desktop
- [x] Make an empty folder, open Claude Code in it, and give it well-done.jsx plus this checklist as the spec
- [x] Have it scaffold a Next.js app with Tailwind, the Supabase client, and a PWA manifest so the app installs to phone home screens
- [x] Create a private GitHub repo and connect it to the Vercel project from Phase 0
- [x] Add environment variables in both Vercel and the local .env: Supabase URL, anon key, service role key, Stripe secret key, Stripe webhook secret, Anthropic key, Resend key, and NEXT_PUBLIC_APP_URL set to https://gettada.me

## Phase 2: Database, accounts, and the two founders

- [x] Auth on: email magic link plus password, with branded email templates
- [x] Tables: profiles, tasks, teams, team_members, team_invites, assignments, partnerships, partner_requests, messages, team_messages, posts, replies, reactions, stats, blocks, entitlements
- [x] The entitlements table is the paywall's brain: user_id, plan (standard, teams, boss), source (stripe, comp, admin), stripe_sub_id, seats_included, optional expires_at
- [x] Rule carved in stone: Stripe webhooks may only touch rows where source is stripe. Rows with source comp or admin are untouchable by billing. This is what protects the free Faith Hub Unleashed accounts
- [x] Add a role column on profiles: member or admin
- [x] Row level security on every table, enforcing the privacy promises server side: tasks visible to their owner only, assignments visible to boss and assignee, messages visible to sender and recipient only, hidden and private profile respected everywhere except inside a shared boss team
- [x] Seed script: create Deb and Neal, set role to admin, and give each an entitlement of plan boss with source admin, no expiry. Admins ride at the top level free, forever
- [x] Keep history: no monthly data deletion. The month flip becomes a query filter, and repeaters regenerate by rule
- [x] Storage buckets: avatars, audio (the ta-da mp3), assets (tour video if self-hosted)

## Phase 3: Port the app screen by screen

- [x] Planner core: Today, Plan, Timeline, the Organize button, repeats with pinned days, calendar weeks Monday through Sunday
- [x] Brain dump and the voice command bar call a server route that holds your Anthropic key, with a per-member daily cap of about 30 calls so costs stay at pennies
- [x] Celebrations, the ta-da voice, streaks with the Saturday and Sunday rules, badges, Mountain Levels, and ceremonies port as they are
- [x] Partners: seeking, requests, accepts, and direct messages running on Supabase Realtime so chat is live with no refresh button
- [x] Teams and Boss: rosters, invitations sent BY EMAIL with a magic link, assignments with deadlines, the holding tank, member removal with confirmation, and the seat counter
- [x] Community: three rooms, Active and New and Top sorting, collapsed reply counts, @tags, reactions, milestone auto-posts, and a nightly digest job that rolls the day's milestones into one post once volume grows
- [x] Blocking, reporting (add a report button beside block), hidden mode, private profiles
- [x] Push notifications: service worker plus Web Push, per-device subscriptions saved, fired on new message, partner request, team invite, and assigned work, honoring each member's toggle. iPhone push works once the app is installed to the home screen
- [x] Profile photos upload to Storage, the Help section ships as written, mute persists

## Phase 4: Stripe paywall

- [ ] Create products and prices: Standard 17 monthly and 170 yearly, Teams 27 and 270, Boss 97 and 970, plus a Boss extra seat price at 9 monthly and 90 yearly
- [ ] Checkout: 14 day trial, card required up front, trial rolls into Standard unless a higher plan was chosen
- [ ] Webhook endpoint at gettada.me/api/stripe: on checkout completed and subscription updated or deleted, write the entitlement (source stripe rows only)
- [ ] Proration on upgrades left at Stripe's default, which credits unused time automatically
- [ ] Seat sync function: whenever a boss team roster changes, recount unique members across that boss's teams and set the extra-seat quantity to anything above 7
- [ ] Turn on the Stripe Customer Portal so members change cards, switch plans, and cancel without you building billing screens
- [ ] The app gates every feature off the entitlements table, never off Stripe directly
- [ ] Test in test mode with Stripe's test cards: trial start, roll to Standard, upgrade with proration, boss seat added past 7, seat removed, cancel

## Phase 5: Admin panel at /admin, role gated

- [ ] Member search by name, email, plan, and status
- [ ] Comp grants: set any member to any level free with source comp and an optional expiry date. This is the Faith Hub Unleashed flow
- [ ] Bulk comp: paste a list of emails, pick a level, grant them all at once for package members
- [ ] Invite with a plan attached: send a signup link that lands the person already at their comped level so they never see a checkout page
- [ ] Moderation: delete any post or reply, ban an account, and a reports queue fed by the report button
- [ ] Refund button that deep-links to the member's Stripe record
- [ ] Announcements: write and pin a post to the top of the community
- [ ] Simple numbers: signups, trials running, conversions, cancels, daily actives
- [ ] Verify Deb and Neal can log in, reach /admin, and hold Boss-level access everywhere in the app

## Phase 6: Content, legal, and email

- [ ] Terms of service, privacy policy, and refund policy pages linked in the app footer, with a 13 and older line
- [ ] Transactional emails wired: welcome, trial reminder on day 11, receipt on conversion, payment failed, partner request received, work assigned
- [ ] Upload the ta-da mp3 and point the app at it so every check-off plays Deb's actual voice
- [ ] Drop the tour video link into the welcome checklist
- [ ] Read every daily power line and Help topic out loud once and adjust anything that doesn't sound like Deb

## Phase 7: Deploy, verify, launch

- [ ] Push to GitHub. Vercel builds and the app answers at https://gettada.me with SSL, because the domain was attached back in Phase 0
- [ ] Swap Stripe to LIVE keys in Vercel, point the live webhook at the live URL, then run one real 17 dollar purchase on your own card and refund it
- [ ] Install the app to one Android phone and one iPhone home screen, then send a test push to each
- [ ] Private beta: comp 10 to 20 Faith Hub Unleashed members through the admin invite, run two weeks, fix what they find
- [ ] Build the ClickFunnels sales page for the three tiers with checkout links, and add TaDa to the Faith Hub Unleashed package page as an included benefit
- [ ] Confirm Supabase backups are on and clientcare@gettada.me reaches a real inbox
- [ ] Launch, and check something off the list one last time just to hear the ta-da
