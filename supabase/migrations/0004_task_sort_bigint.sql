-- tasks.sort holds a millisecond timestamp for stable ordering; int4 overflowed.
alter table public.tasks alter column sort type bigint;

-- stats: members may create their own row (the trigger normally does, but upserts need this too).
drop policy if exists stats_insert_own on public.stats;
create policy stats_insert_own on public.stats for insert to authenticated with check (user_id = auth.uid());

-- teams: INSERT ... RETURNING must also pass the SELECT policy, and a security
-- definer lookup cannot see the row being inserted. Check ownership on the row itself.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (owner_id = auth.uid() or public.is_team_member(id) or public.is_admin());
