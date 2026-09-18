-- 0012: unfinished one-time tasks carry into the new month.
-- carried_from records the month a task came from ('YYYY-MM') so the app can
-- show a small "from September" chip and never carry the same task twice.
-- The original row stays in its month; history is never deleted.
alter table public.tasks add column if not exists carried_from text;
grant select (carried_from), insert (carried_from), update (carried_from) on public.tasks to authenticated;
