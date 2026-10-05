-- 0027: a star on assigned work, meaning do this one first.
--
-- A deadline already says when something is due, but not which of two things
-- due the same week actually matters. One bit answers that without asking a
-- boss to grade every task: starred work rises to the top of its group and the
-- deadline order is kept underneath.
--
-- One bit rather than High/Normal/Low on purpose. A three-level scheme turns
-- into everything-is-High within a month, and then costs a dropdown at the
-- moment of assigning to say what a star says at a glance. TaDa already uses a
-- gold star for a personal Big win, so the vocabulary is not new either.
--
-- Idempotent: safe to replay.

alter table public.assignments add column if not exists starred boolean not null default false;

comment on column public.assignments.starred is
  'The boss marked this do-this-first. Sorts above its group, deadline order kept within.';

create index if not exists assignments_starred_idx on public.assignments (team_id, starred) where starred;

-- 0025 added a trigger so the member a task went to could not re-file it into
-- another category, because assignments_update legitimately lets them update
-- their own row to tick it off and RLS cannot guard one column. The star is the
-- boss's call for exactly the same reason, so the two are guarded together and
-- the narrow category-only version is retired.
create or replace function public.assignment_boss_fields_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the service role, the SQL editor and the seed
  -- scripts, which are trusted; an anon caller never reaches here because the
  -- row policy turns them away first.
  if auth.uid() is not null
     and (new.category_id is distinct from old.category_id or new.starred is distinct from old.starred)
     and not public.is_team_owner(new.team_id) then
    raise exception 'Only the team owner can change a task category or star.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

drop trigger if exists assignment_category_owner_only_trg on public.assignments;
drop trigger if exists assignment_boss_fields_only_trg on public.assignments;
create trigger assignment_boss_fields_only_trg
  before update on public.assignments
  for each row execute function public.assignment_boss_fields_only();

drop function if exists public.assignment_category_owner_only();
