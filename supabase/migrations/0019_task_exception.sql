-- 0019: let one day of a repeating task go its own way.
--
-- Editing a single row of a series used to be all or nothing: the title and
-- big-win flag were rewritten across every copy, while the time of day and the
-- day only ever changed on the row in front of you. With the edit sheet now
-- asking "just this one" or "the whole series", a row edited on its own is
-- marked an exception and later series edits leave it alone - the same way a
-- calendar treats one moved occurrence of a recurring event.
--
-- Idempotent: safe to replay.

alter table public.tasks add column if not exists exception boolean not null default false;

comment on column public.tasks.exception is
  'True once this occurrence was edited on its own; series-wide edits skip it.';
