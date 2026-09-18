-- 0013: reactions on replies, and the community tables go live.
-- Members could already soft-delete their own posts and replies through the
-- update policies; this adds emoji reactions on replies and puts posts,
-- replies and both reaction tables on the realtime publication so a reply
-- appears for everyone without a refresh.

create table if not exists public.reply_reactions (
  reply_id   uuid not null references public.replies(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('heart', 'fire', 'up', 'pray', 'smile')),
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id, kind)
);
create index if not exists reply_reactions_reply_idx on public.reply_reactions (reply_id);

alter table public.reply_reactions enable row level security;
drop policy if exists reply_reactions_select on public.reply_reactions;
create policy reply_reactions_select on public.reply_reactions for select to authenticated using (true);
drop policy if exists reply_reactions_own on public.reply_reactions;
create policy reply_reactions_own on public.reply_reactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.reply_reactions to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.replies;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.reactions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.reply_reactions;
exception when duplicate_object then null; end $$;

-- Members can edit their own posts and replies; edited_at marks them as changed.
alter table public.posts add column if not exists edited_at timestamptz;
alter table public.replies add column if not exists edited_at timestamptz;
