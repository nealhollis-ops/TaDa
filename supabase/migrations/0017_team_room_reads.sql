-- 0017: where each member has read up to in each team room, so the room can
-- roll replies up with an unread count. One row per member per team.
create table if not exists public.team_room_reads (
  team_id  uuid not null references public.teams(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_room_reads enable row level security;
drop policy if exists team_room_reads_own on public.team_room_reads;
create policy team_room_reads_own on public.team_room_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_team_member(team_id));
grant select, insert, update, delete on public.team_room_reads to authenticated;
notify pgrst, 'reload schema';
