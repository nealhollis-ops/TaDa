-- ============================================================================
-- 0008: in-app notification inbox
-- Every push the server sends also lands here, so the bell in the top bar can
-- show an unread count and the member can read what they missed.
-- Rows are written by the server (service role). Members can read and mark
-- their own rows read; they cannot insert or delete.
-- ============================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text not null default '',
  url         text not null default '/today',
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Members may only flip read_at; everything else is frozen once written.
create or replace function public.protect_notification_fields()
returns trigger language plpgsql as $$
begin
  if new.user_id <> old.user_id or new.kind <> old.kind or new.title <> old.title
     or new.body <> old.body or new.url <> old.url or new.created_at <> old.created_at then
    raise exception 'only read_at may change';
  end if;
  return new;
end $$;

drop trigger if exists notifications_protect on public.notifications;
create trigger notifications_protect before update on public.notifications
  for each row execute function public.protect_notification_fields();

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
