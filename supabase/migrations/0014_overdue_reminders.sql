-- 0014: one-time past-due reminders for assigned work.
-- The nightly cron (/api/cron/overdue) stamps the row when it has told the
-- assignee, so a task is reminded once, not every day it stays open.
alter table public.assignments add column if not exists overdue_notified_at timestamptz;
create index if not exists assignments_overdue_idx on public.assignments (date) where done = false and overdue_notified_at is null;
