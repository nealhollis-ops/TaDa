-- 0022: remember who sent someone here.
--
-- A member sharing TaDa passes ?from=<their slug>. The marketing site carries
-- it through to signup, and it is stored once, on the new profile, so we can
-- see who actually brings people in and thank them.
--
-- It is a slug, not a foreign key: the person who shared may later change their
-- name or close their account, and neither should rewrite or block the record
-- of where someone came from.
--
-- Idempotent: safe to replay.

alter table public.profiles add column if not exists referred_from text;

comment on column public.profiles.referred_from is
  'The slug of the member whose share link brought this person in, if any.';

-- The profile is built by this trigger at signup, so the slug has to be picked
-- up here; nothing else ever writes it.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_slug text;
  final_slug text;
  n int := 0;
  display_name text;
  came_from text;
begin
  display_name := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));
  base_slug := coalesce(nullif(regexp_replace(lower(display_name), '[^a-z0-9]', '', 'g'), ''), 'friend');
  base_slug := left(base_slug, 24);
  final_slug := base_slug;
  while exists (select 1 from public.profiles where slug = final_slug) loop
    n := n + 1;
    final_slug := base_slug || n::text;
  end loop;

  -- Same shape as a slug, and only kept when it belongs to a real member.
  came_from := left(regexp_replace(lower(coalesce(new.raw_user_meta_data->>'referred_from', '')), '[^a-z0-9]', '', 'g'), 24);
  if came_from = '' or not exists (select 1 from public.profiles where slug = came_from) then
    came_from := null;
  end if;

  insert into public.profiles (id, email, name, slug, referred_from)
  values (new.id, new.email, display_name, final_slug, came_from)
  on conflict (id) do nothing;

  insert into public.stats (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;
