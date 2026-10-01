-- 0023: put comp-invite redemption back into the signup trigger.
--
-- 0006 taught handle_new_user to redeem a pending comp invite: an admin pastes
-- a list of emails, those become comp_invites rows, and the person gets their
-- free access the moment they sign up.
--
-- 0022 added the referral slug by rewriting the whole function from the 0001
-- version, and in doing so dropped the comp block. Nothing failed loudly: the
-- invited person simply signed up and met the paywall, with the comp_invites
-- row still sitting there unredeemed.
--
-- This is both halves in one function. Any further edit to it should start
-- from this file, not from an older one.
--
-- Idempotent: safe to replay. Already-redeemed invites are skipped by the
-- `redeemed_at is null` filter, so replaying cannot double-grant.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_slug text;
  final_slug text;
  n int := 0;
  display_name text;
  came_from text;
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

  -- A comp invite waiting on this email becomes their entitlement right away.
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

-- Anyone who signed up while 0022 was live and had an invite waiting still has
-- an unredeemed row. Redeem those now, once, for accounts that exist.
insert into public.entitlements (user_id, plan, source, status, expires_at, granted_by, note)
select p.id, ci.plan, 'comp', 'active', ci.expires_at, ci.invited_by, coalesce(ci.note, 'Comp invite')
from public.comp_invites ci
join public.profiles p on lower(p.email) = lower(ci.email)
where ci.redeemed_at is null
on conflict (user_id, source) do nothing;

update public.comp_invites ci
set redeemed_at = now(), redeemed_by = p.id
from public.profiles p
where lower(p.email) = lower(ci.email) and ci.redeemed_at is null;
