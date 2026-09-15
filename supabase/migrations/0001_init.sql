-- ============================================================================
-- TaDa: initial schema (Phase 2)
-- Run in Supabase SQL Editor or via `supabase db push`. Safe to re-run.
-- Privacy promises are enforced here with Row Level Security, not in the app.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums ----
do $$ begin
  create type public.plan_t as enum ('standard', 'teams', 'boss');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.entitlement_source_t as enum ('stripe', 'comp', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.role_t as enum ('member', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.block_t as enum ('auto', 'morning', 'afternoon', 'evening');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.repeat_t as enum ('none', 'weekly', 'monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.post_type_t as enum ('question', 'win', 'boost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.team_kind_t as enum ('standard', 'boss');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status_t as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status_t as enum ('open', 'reviewed', 'dismissed');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ utilities ----
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------- profiles ----
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  slug        text not null unique,
  avatar_url  text,
  bio         text not null default '' check (char_length(bio) <= 150),
  role        public.role_t not null default 'member',
  hidden      boolean not null default false,   -- hide progress from partner lists
  private     boolean not null default false,   -- private profile
  seeking     boolean not null default false,   -- looking for an accountability partner
  muted       boolean not null default false,   -- ta-da sound off
  notif_on    boolean not null default true,
  onboarding  jsonb not null default '{"tour":false,"posted":false,"done":false}'::jsonb,
  banned_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (lower(email));

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile (and stats row) when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_slug text;
  final_slug text;
  n int := 0;
  display_name text;
begin
  display_name := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));
  base_slug := coalesce(nullif(regexp_replace(lower(display_name), '[^a-z0-9]', '', 'g'), ''), 'friend');
  base_slug := left(base_slug, 24);
  final_slug := base_slug;
  while exists (select 1 from public.profiles where slug = final_slug) loop
    n := n + 1;
    final_slug := base_slug || n::text;
  end loop;

  insert into public.profiles (id, email, name, slug)
  values (new.id, new.email, display_name, final_slug)
  on conflict (id) do nothing;

  insert into public.stats (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;

-- ---------------------------------------------------------------- stats ----
create table if not exists public.stats (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  streak        int not null default 0,
  best_streak   int not null default 0,
  last_done_day date,
  total_done    int not null default 0,
  big_done      int not null default 0,
  morning_done  int not null default 0,
  perfect_weeks int not null default 0,
  perfect_keys  text[] not null default '{}',
  comebacks     int not null default 0,
  encourages    int not null default 0,
  badges        text[] not null default '{}',
  updated_at    timestamptz not null default now()
);
drop trigger if exists stats_updated_at on public.stats;
create trigger stats_updated_at before update on public.stats
  for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------- entitlements ----
-- The paywall's brain. The app gates features off this table, never off Stripe.
-- RULE: billing code may only touch rows where source = 'stripe'.
-- Rows with source 'comp' or 'admin' are untouchable by Stripe webhooks.
create table if not exists public.entitlements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  plan               public.plan_t not null default 'standard',
  source             public.entitlement_source_t not null,
  stripe_customer_id text,
  stripe_sub_id      text,
  status             text not null default 'active',   -- stripe status: trialing, active, past_due, canceled
  seats_included     int not null default 7,
  expires_at         timestamptz,
  granted_by         uuid references public.profiles(id) on delete set null,
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, source)
);
create unique index if not exists entitlements_stripe_sub_idx on public.entitlements (stripe_sub_id) where stripe_sub_id is not null;
drop trigger if exists entitlements_updated_at on public.entitlements;
create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function public.set_updated_at();

-- Highest active plan for a user, or null when they have none.
create or replace function public.effective_plan(uid uuid)
returns public.plan_t language sql stable security definer set search_path = public as $$
  select e.plan
  from public.entitlements e
  where e.user_id = uid
    and (e.expires_at is null or e.expires_at > now())
    and (e.source <> 'stripe' or e.status in ('trialing', 'active', 'past_due'))
  order by case e.plan when 'boss' then 3 when 'teams' then 2 else 1 end desc
  limit 1
$$;

-- The ONLY function billing code should call. It cannot reach comp/admin rows.
create or replace function public.apply_stripe_entitlement(
  p_user_id uuid,
  p_plan public.plan_t,
  p_status text,
  p_stripe_customer_id text,
  p_stripe_sub_id text,
  p_seats_included int default 7,
  p_expires_at timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.entitlements (user_id, plan, source, status, stripe_customer_id, stripe_sub_id, seats_included, expires_at)
  values (p_user_id, p_plan, 'stripe', p_status, p_stripe_customer_id, p_stripe_sub_id, p_seats_included, p_expires_at)
  on conflict (user_id, source) do update
    set plan = excluded.plan,
        status = excluded.status,
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_sub_id = excluded.stripe_sub_id,
        seats_included = excluded.seats_included,
        expires_at = excluded.expires_at
    where public.entitlements.source = 'stripe';
end $$;

-- ------------------------------------------------------------ role helpers --
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------------------------------------------------------------- tasks ----
-- History is kept forever. The month flip is a query filter on `month`.
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  root_id    uuid,                                   -- groups the copies of a repeating task
  title      text not null check (char_length(title) between 1 and 120),
  big        boolean not null default false,
  month      text not null,                          -- 'YYYY-MM'
  week       int not null default 1,                 -- week number within the month (Mon-Sun weeks)
  date       date,                                   -- null = floating within the week
  block      public.block_t not null default 'auto',
  repeat     public.repeat_t not null default 'none',
  anchor     int,                                    -- pinned weekday (0-6) or day-of-month for repeats
  done       boolean not null default false,
  done_at    timestamptz,
  sort       int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_month_idx on public.tasks (user_id, month);
create index if not exists tasks_user_date_idx on public.tasks (user_id, date);
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- teams ----
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  kind       public.team_kind_t not null default 'standard',
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists teams_owner_idx on public.teams (owner_id);

create table if not exists public.team_members (
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index if not exists team_members_user_idx on public.team_members (user_id);

create table if not exists public.team_invites (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  email       text not null,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at  timestamptz not null default now() + interval '14 days',
  created_at  timestamptz not null default now()
);
create index if not exists team_invites_email_idx on public.team_invites (lower(email));

create or replace function public.is_team_member(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = t and user_id = auth.uid())
      or exists (select 1 from public.teams where id = t and owner_id = auth.uid())
$$;

create or replace function public.is_team_owner(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams where id = t and owner_id = auth.uid())
$$;

-- True when the current user and `other` sit in the same boss-run team.
-- Inside a shared boss team, hidden/private settings do not apply.
create or replace function public.shares_boss_team(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.teams t
    join public.team_members a on a.team_id = t.id and (a.user_id = auth.uid() or t.owner_id = auth.uid())
    join public.team_members b on b.team_id = t.id and (b.user_id = other or t.owner_id = other)
    where t.kind = 'boss'
  )
$$;

-- ---------------------------------------------------------- assignments ----
create table if not exists public.assignments (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  date       date,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists assignments_to_idx on public.assignments (to_user);
create index if not exists assignments_team_idx on public.assignments (team_id);

-- ------------------------------------------------------------- partners ----
create table if not exists public.partner_requests (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  status     public.request_status_t not null default 'pending',
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index if not exists partner_requests_to_idx on public.partner_requests (to_user, status);

create table if not exists public.partnerships (
  id         uuid primary key default gen_random_uuid(),
  a_user     uuid not null references public.profiles(id) on delete cascade,
  b_user     uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (a_user < b_user)          -- store each pair once, smallest id first
);
create unique index if not exists partnerships_pair_idx on public.partnerships (a_user, b_user);
create index if not exists partnerships_b_idx on public.partnerships (b_user);

-- --------------------------------------------------------------- blocks ----
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- ------------------------------------------------------------- messages ----
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 2000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_pair_idx on public.messages (from_user, to_user, created_at);
create index if not exists messages_to_idx on public.messages (to_user, read_at);

create table if not exists public.team_messages (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists team_messages_team_idx on public.team_messages (team_id, created_at);

-- ------------------------------------------------------------ community ----
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       public.post_type_t not null default 'win',   -- also the room: Questions, Wins, Boosts
  text       text not null check (char_length(text) between 1 and 2000),
  milestone  boolean not null default false,
  pinned     boolean not null default false,              -- admin announcements
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists posts_type_idx on public.posts (type, created_at desc);

create table if not exists public.replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 2000),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists replies_post_idx on public.replies (post_id, created_at);

create table if not exists public.reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('heart', 'fire', 'up', 'pray', 'smile')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create table if not exists public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade,
  post_id        uuid references public.posts(id) on delete cascade,
  reply_id       uuid references public.replies(id) on delete cascade,
  reason         text not null default '',
  status         public.report_status_t not null default 'open',
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------- push (Phase 3) --
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.stats              enable row level security;
alter table public.entitlements       enable row level security;
alter table public.tasks              enable row level security;
alter table public.teams              enable row level security;
alter table public.team_members       enable row level security;
alter table public.team_invites       enable row level security;
alter table public.assignments        enable row level security;
alter table public.partner_requests   enable row level security;
alter table public.partnerships       enable row level security;
alter table public.blocks             enable row level security;
alter table public.messages           enable row level security;
alter table public.team_messages      enable row level security;
alter table public.posts              enable row level security;
alter table public.replies            enable row level security;
alter table public.reactions          enable row level security;
alter table public.reports            enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: everyone signed in can see public profiles; private ones only to
-- partners, shared boss teammates, admins, and the owner. Blocked users never see each other.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.is_admin()
  or (
    not public.is_blocked_between(auth.uid(), id)
    and (
      not private
      or public.shares_boss_team(id)
      or exists (select 1 from public.partnerships p
                 where (p.a_user = auth.uid() and p.b_user = id) or (p.b_user = auth.uid() and p.a_user = id))
    )
  )
);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- stats: visible to owner, partners, teammates, admins; hidden mode respected outside boss teams.
drop policy if exists stats_select on public.stats;
create policy stats_select on public.stats for select to authenticated using (
  user_id = auth.uid()
  or public.is_admin()
  or public.shares_boss_team(user_id)
  or (
    not public.is_blocked_between(auth.uid(), user_id)
    and not exists (select 1 from public.profiles pr where pr.id = user_id and pr.hidden)
  )
);
drop policy if exists stats_update_own on public.stats;
create policy stats_update_own on public.stats for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- entitlements: read your own; only admins (and the service role) may write.
drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own on public.entitlements for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists entitlements_admin_write on public.entitlements;
create policy entitlements_admin_write on public.entitlements for all to authenticated
  using (public.is_admin()) with check (public.is_admin() and source <> 'stripe');

-- tasks: owner only. Nobody else, ever.
drop policy if exists tasks_owner on public.tasks;
create policy tasks_owner on public.tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- teams: members and owner can see; owner manages.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (public.is_team_member(id) or public.is_admin());
drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists teams_owner_manage on public.teams;
create policy teams_owner_manage on public.teams for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists teams_owner_delete on public.teams;
create policy teams_owner_delete on public.teams for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select to authenticated
  using (public.is_team_member(team_id) or public.is_admin());
drop policy if exists team_members_owner_manage on public.team_members;
create policy team_members_owner_manage on public.team_members for all to authenticated
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));
drop policy if exists team_members_leave on public.team_members;
create policy team_members_leave on public.team_members for delete to authenticated
  using (user_id = auth.uid());

-- team_invites: owner creates and sees; invitee sees their own by email.
drop policy if exists team_invites_owner on public.team_invites;
create policy team_invites_owner on public.team_invites for all to authenticated
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id) and invited_by = auth.uid());
drop policy if exists team_invites_invitee_select on public.team_invites;
create policy team_invites_invitee_select on public.team_invites for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- assignments: visible to the boss (team owner) and the assignee only.
drop policy if exists assignments_select on public.assignments;
create policy assignments_select on public.assignments for select to authenticated
  using (to_user = auth.uid() or public.is_team_owner(team_id));
drop policy if exists assignments_owner_insert on public.assignments;
create policy assignments_owner_insert on public.assignments for insert to authenticated
  with check (from_user = auth.uid() and public.is_team_owner(team_id));
drop policy if exists assignments_update on public.assignments;
create policy assignments_update on public.assignments for update to authenticated
  using (to_user = auth.uid() or public.is_team_owner(team_id))
  with check (to_user = auth.uid() or public.is_team_owner(team_id));
drop policy if exists assignments_owner_delete on public.assignments;
create policy assignments_owner_delete on public.assignments for delete to authenticated
  using (public.is_team_owner(team_id));

-- partner requests: sender and recipient only.
drop policy if exists partner_requests_select on public.partner_requests;
create policy partner_requests_select on public.partner_requests for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists partner_requests_insert on public.partner_requests;
create policy partner_requests_insert on public.partner_requests for insert to authenticated
  with check (from_user = auth.uid() and not public.is_blocked_between(auth.uid(), to_user));
drop policy if exists partner_requests_update on public.partner_requests;
create policy partner_requests_update on public.partner_requests for update to authenticated
  using (to_user = auth.uid() or from_user = auth.uid());
drop policy if exists partner_requests_delete on public.partner_requests;
create policy partner_requests_delete on public.partner_requests for delete to authenticated
  using (to_user = auth.uid() or from_user = auth.uid());

-- partnerships: the two partners only.
drop policy if exists partnerships_select on public.partnerships;
create policy partnerships_select on public.partnerships for select to authenticated
  using (a_user = auth.uid() or b_user = auth.uid());
drop policy if exists partnerships_insert on public.partnerships;
create policy partnerships_insert on public.partnerships for insert to authenticated
  with check (
    (a_user = auth.uid() or b_user = auth.uid())
    and exists (select 1 from public.partner_requests r
                where r.status = 'accepted'
                  and ((r.from_user = a_user and r.to_user = b_user) or (r.from_user = b_user and r.to_user = a_user)))
  );
drop policy if exists partnerships_delete on public.partnerships;
create policy partnerships_delete on public.partnerships for delete to authenticated
  using (a_user = auth.uid() or b_user = auth.uid());

-- blocks: yours only.
drop policy if exists blocks_own on public.blocks;
create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- messages: sender and recipient only; cannot message someone who blocked you.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (from_user = auth.uid() and not public.is_blocked_between(auth.uid(), to_user));
drop policy if exists messages_mark_read on public.messages;
create policy messages_mark_read on public.messages for update to authenticated
  using (to_user = auth.uid()) with check (to_user = auth.uid());

-- team messages: members of that team.
drop policy if exists team_messages_select on public.team_messages;
create policy team_messages_select on public.team_messages for select to authenticated
  using (public.is_team_member(team_id));
drop policy if exists team_messages_insert on public.team_messages;
create policy team_messages_insert on public.team_messages for insert to authenticated
  with check (user_id = auth.uid() and public.is_team_member(team_id));

-- community: every member reads; authors edit their own; admins moderate.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated
  using ((deleted_at is null and not public.is_blocked_between(auth.uid(), user_id)) or public.is_admin());
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (user_id = auth.uid() and (not pinned or public.is_admin()));
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists replies_select on public.replies;
create policy replies_select on public.replies for select to authenticated
  using ((deleted_at is null and not public.is_blocked_between(auth.uid(), user_id)) or public.is_admin());
drop policy if exists replies_insert on public.replies;
create policy replies_insert on public.replies for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists replies_update on public.replies;
create policy replies_update on public.replies for update to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists replies_delete on public.replies;
create policy replies_delete on public.replies for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions for select to authenticated using (true);
drop policy if exists reactions_own on public.reactions;
create policy reactions_own on public.reactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: anyone can file; only admins read the queue.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists reports_admin on public.reports;
create policy reports_admin on public.reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- push subscriptions: yours only.
drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- Realtime: live chat and notifications with no refresh button
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.team_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.partner_requests;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.assignments;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.team_invites;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Storage buckets: avatars, audio (the ta-da mp3), assets (tour video etc.)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('audio',   'audio',   true, 10485760, array['audio/mpeg','audio/mp4','audio/wav','audio/ogg']),
  ('assets',  'assets',  true, 104857600, null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- avatars: anyone can view; members manage files inside their own folder (<user_id>/...)
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars own write" on storage.objects;
create policy "avatars own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars own update" on storage.objects;
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- audio and assets: public read, admin-only writes
drop policy if exists "audio public read" on storage.objects;
create policy "audio public read" on storage.objects for select using (bucket_id = 'audio');
drop policy if exists "audio admin write" on storage.objects;
create policy "audio admin write" on storage.objects for all to authenticated
  using (bucket_id = 'audio' and public.is_admin()) with check (bucket_id = 'audio' and public.is_admin());
drop policy if exists "assets public read" on storage.objects;
create policy "assets public read" on storage.objects for select using (bucket_id = 'assets');
drop policy if exists "assets admin write" on storage.objects;
create policy "assets admin write" on storage.objects for all to authenticated
  using (bucket_id = 'assets' and public.is_admin()) with check (bucket_id = 'assets' and public.is_admin());

-- ============================================================================
-- Grants (PostgREST roles)
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on function public.apply_stripe_entitlement(uuid, public.plan_t, text, text, text, int, timestamptz) from public, authenticated, anon;
