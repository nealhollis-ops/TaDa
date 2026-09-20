-- 0015: direct messages between a boss and the members of their boss teams.
-- Partner chat stays partner-only; this adds the boss line on top. Two members
-- of the same boss team still cannot message each other privately.
create or replace function public.boss_line(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t
    join public.team_members m on m.team_id = t.id
    where t.kind = 'boss'
      and ((t.owner_id = auth.uid() and m.user_id = other) or (t.owner_id = other and m.user_id = auth.uid()))
  )
$$;
grant execute on function public.boss_line(uuid) to authenticated, service_role;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    from_user = auth.uid()
    and (public.is_partner(to_user) or public.boss_line(to_user))
    and not public.is_blocked_between(auth.uid(), to_user)
  );
