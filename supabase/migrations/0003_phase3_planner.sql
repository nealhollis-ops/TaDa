-- ============================================================================
-- Phase 3: planner port support
--  * progress: the monthly progress summary each member publishes (what partners see)
--  * assignments.to_user nullable (the boss holding tank)
--  * profile columns locked down: email and bio never leak through plain selects
--  * profile_card(), can_view_card(), can_view_progress(): privacy decided server side
--  * team invite accept/decline by token
--  * ai_usage + bump_ai_usage(): per-member daily cap for the AI routes
--  * messages only between partners
-- Safe to re-run.
-- ============================================================================

-- ------------------------------------------------------------ holding tank --
alter table public.assignments alter column to_user drop not null;

-- --------------------------------------------------------------- progress --
create table if not exists public.progress (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  month      text not null,                       -- 'YYYY-MM'
  total      int not null default 0,
  done       int not null default 0,
  weeks      jsonb not null default '{}'::jsonb,  -- {"1":{"done":2,"total":5}, ...}
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.progress enable row level security;

-- ------------------------------------------------------- privacy helpers --
create or replace function public.is_partner(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partnerships p
    where (p.a_user = auth.uid() and p.b_user = other) or (p.b_user = auth.uid() and p.a_user = other)
  )
$$;

-- May I open this member's profile card (bio, badges, streaks)?
create or replace function public.can_view_card(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target = auth.uid()
      or public.is_admin()
      or (
        not public.is_blocked_between(auth.uid(), target)
        and (
          public.shares_boss_team(target)
          or public.is_partner(target)
          or not exists (select 1 from public.profiles p where p.id = target and p.private)
        )
      )
$$;

-- May I see this member's progress numbers? Hidden mode keeps them off lists,
-- but partners and boss teammates still see them.
create or replace function public.can_view_progress(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target = auth.uid()
      or public.is_admin()
      or (
        not public.is_blocked_between(auth.uid(), target)
        and (
          public.shares_boss_team(target)
          or public.is_partner(target)
          or not exists (select 1 from public.profiles p where p.id = target and (p.private or p.hidden))
        )
      )
$$;

-- ------------------------------------------------------- profiles access --
-- Names and avatars are visible to every signed-in member (posts, messages,
-- rosters). Email and bio are NOT selectable columns; bio comes back through
-- profile_card() only when allowed, email only through boss_seat_roster().
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.is_admin()
  or (banned_at is null and not public.is_blocked_between(auth.uid(), id))
);

revoke select, update, insert, delete on public.profiles from authenticated;
grant select (id, name, slug, avatar_url, role, hidden, private, seeking, muted, notif_on, onboarding, banned_at, created_at, updated_at)
  on public.profiles to authenticated;
grant update (name, avatar_url, bio, hidden, private, seeking, muted, notif_on, onboarding)
  on public.profiles to authenticated;

-- Everything a profile modal needs, privacy applied server side. Null when the
-- viewer may not open the card. Stats fields are null when progress is off limits.
create or replace function public.profile_card(target uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  s public.stats%rowtype;
  pr public.progress%rowtype;
  cur_month text := to_char(now(), 'YYYY-MM');
  see_card boolean;
  see_prog boolean;
begin
  select * into p from public.profiles where id = target;
  if not found then return null; end if;
  see_card := public.can_view_card(target);
  see_prog := public.can_view_progress(target);
  select * into s from public.stats where user_id = target;
  select * into pr from public.progress where user_id = target and month = cur_month;
  return jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'slug', p.slug,
    'avatar_url', p.avatar_url,
    'seeking', p.seeking and not p.hidden,
    'private', p.private,
    'can_view', see_card,
    'bio', case when see_card then p.bio else null end,
    'has_partner', exists (select 1 from public.partnerships x where x.a_user = target or x.b_user = target),
    'stats', case when see_card and see_prog and s.user_id is not null then jsonb_build_object(
        'streak', s.streak, 'best_streak', s.best_streak, 'total_done', s.total_done,
        'big_done', s.big_done, 'morning_done', s.morning_done, 'perfect_weeks', s.perfect_weeks,
        'comebacks', s.comebacks, 'encourages', s.encourages
      ) else null end,
    'progress', case when see_prog and pr.user_id is not null then jsonb_build_object(
        'total', pr.total, 'done', pr.done, 'weeks', pr.weeks, 'updated_at', pr.updated_at
      ) else null end
  );
end $$;

-- Boss roster: every seat holder across the caller's boss teams, with signup email.
create or replace function public.boss_seat_roster()
returns table (user_id uuid, name text, avatar_url text, email text, team_names text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar_url, p.email, array_agg(t.name order by t.name)
  from public.teams t
  join public.team_members m on m.team_id = t.id
  join public.profiles p on p.id = m.user_id
  where t.kind = 'boss' and t.owner_id = auth.uid() and m.user_id <> auth.uid()
  group by p.id, p.name, p.avatar_url, p.email
$$;

-- ----------------------------------------------------- stats and progress --
drop policy if exists stats_select on public.stats;
create policy stats_select on public.stats for select to authenticated
  using (public.can_view_progress(user_id));

drop policy if exists progress_select on public.progress;
create policy progress_select on public.progress for select to authenticated
  using (public.can_view_progress(user_id));
drop policy if exists progress_own_write on public.progress;
create policy progress_own_write on public.progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------- messages --
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (from_user = auth.uid() and public.is_partner(to_user) and not public.is_blocked_between(auth.uid(), to_user));

-- ------------------------------------------------------- team invites --
create or replace function public.accept_team_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv public.team_invites%rowtype;
  n int;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into inv from public.team_invites where token = p_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'This invitation has expired or was already used.' using errcode = 'P0002'; end if;
  select count(*) into n from public.team_members where team_id = inv.team_id;
  if n >= 50 then raise exception 'This team is full.' using errcode = 'P0003'; end if;
  insert into public.team_members (team_id, user_id) values (inv.team_id, auth.uid()) on conflict do nothing;
  update public.team_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.team_id;
end $$;

create or replace function public.decline_team_invite(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.team_invites
  where id = p_id and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
end $$;


-- Invites waiting for the signed-in member (matched by signup email), with team details.
create or replace function public.my_team_invites()
returns table (id uuid, team_id uuid, team_name text, team_kind public.team_kind_t, invited_by uuid, inviter_name text, token text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, t.id, t.name, t.kind, i.invited_by, p.name, i.token, i.created_at
  from public.team_invites i
  join public.teams t on t.id = i.team_id
  join public.profiles p on p.id = i.invited_by
  where lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and i.accepted_at is null and i.expires_at > now()
$$;

-- What the /invite/<token> page shows before the member taps Join.
create or replace function public.team_invite_preview(p_token text)
returns table (team_id uuid, team_name text, team_kind public.team_kind_t, inviter_name text, email text, expired boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.kind, p.name, i.email, (i.accepted_at is not null or i.expires_at <= now())
  from public.team_invites i
  join public.teams t on t.id = i.team_id
  join public.profiles p on p.id = i.invited_by
  where i.token = p_token
$$;

-- ------------------------------------------------------------- AI cap --
create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day     date not null default current_date,
  count   int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage for select to authenticated using (user_id = auth.uid());

-- Returns true when this call is within today's cap, and counts it.
create or replace function public.bump_ai_usage(p_cap int default 30)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.ai_usage (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into c;
  return c <= p_cap;
end $$;

-- ------------------------------------------------------------ grants --
grant select, insert, update, delete on public.progress, public.ai_usage to authenticated, service_role;
grant execute on function public.is_partner(uuid), public.can_view_card(uuid), public.can_view_progress(uuid),
  public.profile_card(uuid), public.boss_seat_roster(), public.accept_team_invite(text),
  public.decline_team_invite(uuid), public.bump_ai_usage(int), public.my_team_invites(), public.team_invite_preview(text) to authenticated, service_role;
