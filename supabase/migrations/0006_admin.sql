-- ============================================================================
-- Phase 5: admin panel
--  * comp_invites: a plan attached to an email before the account exists.
--    When that email signs up, the signup trigger grants the comp entitlement,
--    so the person never sees a checkout page. Service role only.
--  * admin_log: who did what in the admin panel.
-- Safe to re-run.
-- ============================================================================

create table if not exists public.comp_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  plan        public.plan_t not null default 'standard',
  expires_at  timestamptz,                      -- when the comp itself ends (null = forever)
  note        text,
  invited_by  uuid references public.profiles(id) on delete set null,
  redeemed_by uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  created_at  timestamptz not null default now()
);
create unique index if not exists comp_invites_email_open_idx on public.comp_invites (lower(email)) where redeemed_at is null;
alter table public.comp_invites enable row level security;
revoke all on public.comp_invites from authenticated, anon;
grant all on public.comp_invites to service_role;

create table if not exists public.admin_log (
  id         bigserial primary key,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  target     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_log enable row level security;
revoke all on public.admin_log from authenticated, anon;
grant all on public.admin_log to service_role;

-- Signup trigger: create profile + stats, then redeem any waiting comp invite.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_slug text;
  final_slug text;
  n int := 0;
  display_name text;
  inv public.comp_invites%rowtype;
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

  select * into inv from public.comp_invites
  where lower(email) = lower(new.email) and redeemed_at is null
  order by created_at desc limit 1;
  if found then
    insert into public.entitlements (user_id, plan, source, status, expires_at, granted_by, note)
    values (new.id, inv.plan, 'comp', 'active', inv.expires_at, inv.invited_by, coalesce(inv.note, 'Comp invite'))
    on conflict (user_id, source) do update
      set plan = excluded.plan, expires_at = excluded.expires_at, granted_by = excluded.granted_by, note = excluded.note;
    update public.comp_invites set redeemed_at = now(), redeemed_by = new.id where id = inv.id;
  end if;

  return new;
end $$;
