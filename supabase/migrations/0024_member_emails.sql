-- 0024: marks for the two emails TaDa sends a member.
--
-- Both are once-only, and both are sent from code that can run more than once
-- for the same person: the welcome is reached from every magic-link sign-in,
-- and the trial reminder from a cron that runs every day. A stamp on the row
-- is what stops a second copy, the same way assignments.overdue_notified_at
-- stops a second past-due notice.
--
-- Claiming is done with `update ... where <col> is null returning id`, so two
-- requests racing each other cannot both win.
--
-- Idempotent: safe to replay.

alter table public.profiles add column if not exists welcomed_at timestamptz;

comment on column public.profiles.welcomed_at is
  'When the welcome email went out. Null means it has not; set it to null to send again.';

alter table public.entitlements add column if not exists trial_reminder_sent_at timestamptz;

comment on column public.entitlements.trial_reminder_sent_at is
  'When the trial-ending email went out for this subscription. Null means it has not.';

-- Members never read or write either one; only the service role touches them,
-- and the column grants on profiles list columns explicitly, so nothing is
-- exposed by adding these.

-- Everyone who already had an account when this shipped has been welcomed by
-- arriving. Without this, the next magic link any of them opened would have
-- sent a "Welcome to TaDa" to a member of several weeks.
update public.profiles set welcomed_at = coalesce(welcomed_at, created_at, now()) where welcomed_at is null;
