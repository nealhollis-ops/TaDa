-- ============================================================================
-- Fix: members could not update their own profile.
-- The original profiles_update_own policy read from profiles inside a policy
-- on profiles, which Postgres rejects as infinite recursion (42P17).
-- Protected columns (role, banned_at, email) are now guarded by a trigger.
-- ============================================================================

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Only admins (or the service role, which has no auth.uid) may change these.
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
  return new;
end $$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();
