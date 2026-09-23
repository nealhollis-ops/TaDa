-- 0020: notes on a boss assignment.
--
-- Assigned work used to be a title and a deadline with nowhere to say anything
-- about it: a member could not report a blocker and a boss could not add
-- context without opening a direct message and losing the link to the task.
-- Notes live on the assignment, so the conversation stays with the work.
--
-- Only the two people the assignment concerns can read or write them: the
-- member it is assigned to, and the owner of the boss team it belongs to.
-- Personal tasks are untouched; this is boss mode only.
--
-- Idempotent: safe to replay.

create table if not exists public.assignment_notes (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  text          text not null check (char_length(text) between 1 and 1000),
  created_at    timestamptz not null default now()
);

create index if not exists assignment_notes_assignment_idx on public.assignment_notes (assignment_id, created_at);

alter table public.assignment_notes enable row level security;

-- The same reach as the assignment itself: the member it went to, or the boss.
create or replace function public.can_see_assignment(a_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assignments a
    where a.id = a_id
      and (a.to_user = auth.uid() or public.is_team_owner(a.team_id))
  )
$$;
grant execute on function public.can_see_assignment(uuid) to authenticated, service_role;

drop policy if exists assignment_notes_select on public.assignment_notes;
create policy assignment_notes_select on public.assignment_notes for select to authenticated
  using (public.can_see_assignment(assignment_id));

-- You write as yourself, on work you are part of. Notes are not edited or
-- deleted afterwards; the record of what was said stays put.
drop policy if exists assignment_notes_insert on public.assignment_notes;
create policy assignment_notes_insert on public.assignment_notes for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_assignment(assignment_id));

grant select, insert on public.assignment_notes to authenticated, service_role;

do $$ begin
  alter publication supabase_realtime add table public.assignment_notes;
exception when duplicate_object then null; end $$;
