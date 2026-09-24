-- 0021: a banner the founders can put across Today and Plan for a while.
--
-- The existing announcement tools either post into the community, where it
-- scrolls away, or push a notification, which is gone the moment it is read.
-- Neither can say "this is true for the next four days" to everyone who opens
-- the app. A banner sits on the two screens members live on, for a window the
-- admin sets, and disappears on its own when the window closes.
--
-- Every member reads the banners; only admins write them.
--
-- Idempotent: safe to replay.

create table if not exists public.banners (
  id         uuid primary key default gen_random_uuid(),
  text       text not null check (char_length(text) between 1 and 400),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists banners_window_idx on public.banners (starts_at, ends_at);

alter table public.banners enable row level security;

-- Anyone signed in reads the ones that are live right now; the window is
-- enforced here so an early or expired banner never reaches the client.
drop policy if exists banners_select on public.banners;
create policy banners_select on public.banners for select to authenticated
  using (public.is_admin() or (now() >= starts_at and now() < ends_at));

drop policy if exists banners_admin_write on public.banners;
create policy banners_admin_write on public.banners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.banners to authenticated, service_role;
grant insert, update, delete on public.banners to authenticated, service_role;

do $blk$ begin
  alter publication supabase_realtime add table public.banners;
exception when duplicate_object then null; end $blk$;
