-- 0016: admins get one link on their profile (bio page, website, product).
-- Members can read it; only admins can set it. It shows on the profile card
-- even when the card is private, since it is there to be found.
alter table public.profiles add column if not exists link text check (link is null or char_length(link) <= 200);
grant select (link) on public.profiles to authenticated;
grant update (link) on public.profiles to authenticated;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.banned_at is distinct from old.banned_at
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'You cannot change role, email, or ban status on a profile.' using errcode = '42501';
  end if;
  if new.link is distinct from old.link then
    raise exception 'Only admins can add a profile link.' using errcode = '42501';
  end if;
  return new;
end $$;

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
    'link', case when p.role = 'admin' then p.link else null end,
    'is_admin', p.role = 'admin',
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

notify pgrst, 'reload schema';
