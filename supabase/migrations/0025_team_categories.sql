-- 0025: categories a boss can sort assigned work into.
--
-- A boss team accumulates a flat list of tasks across several strands of work,
-- and by a few dozen rows the tracker stops telling anyone anything. Up to ten
-- named buckets per team, set by the owner, make the list readable without
-- asking anyone to retype what they already said in the task title.
--
-- The cap lives here rather than only in the UI: a count check in the app is a
-- suggestion, and this one should hold whoever is calling.
--
-- Idempotent: safe to replay.

create table if not exists public.team_categories (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 32),
  -- Position in the brand palette, so a category keeps its colour as others
  -- come and go. The app maps it; the number is all that is stored.
  tint       smallint not null default 0 check (tint between 0 and 9),
  sort       smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists team_categories_team_idx on public.team_categories (team_id, sort);

-- One name per team, however it is cased or spaced.
create unique index if not exists team_categories_name_idx
  on public.team_categories (team_id, lower(trim(name)));

-- Ten per team, enforced where it cannot be talked out of.
create or replace function public.team_categories_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.team_categories where team_id = new.team_id) >= 10 then
    raise exception 'A team can have at most 10 categories.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists team_categories_cap_trg on public.team_categories;
create trigger team_categories_cap_trg
  before insert on public.team_categories
  for each row execute function public.team_categories_cap();

-- The category a piece of assigned work belongs to. Null is "No category",
-- which is the default and stays valid forever. Deleting a category must not
-- take the work with it, so this is set null rather than cascade.
alter table public.assignments
  add column if not exists category_id uuid references public.team_categories(id) on delete set null;

create index if not exists assignments_category_idx on public.assignments (category_id);

alter table public.team_categories enable row level security;

-- Everyone on the team reads them, because the member sees the category on
-- their own task. Only the owner writes.
drop policy if exists team_categories_select on public.team_categories;
create policy team_categories_select on public.team_categories for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists team_categories_write on public.team_categories;
create policy team_categories_write on public.team_categories for all to authenticated
  using (public.is_team_owner(team_id))
  with check (public.is_team_owner(team_id));

grant select on public.team_categories to authenticated, service_role;
grant insert, update, delete on public.team_categories to authenticated, service_role;

do $$ begin
  alter publication supabase_realtime add table public.team_categories;
exception when duplicate_object then null; end $$;

-- assignments_update lets the member it was assigned to update their own row,
-- which is how they tick it off. That same policy would let them re-file the
-- task under another category, and the category is the boss's tool. RLS works
-- per row, not per column, so the rule goes in a trigger.
create or replace function public.assignment_category_owner_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the service role, the SQL editor and the seed
  -- scripts. Those are already trusted, and an anon caller is turned away by
  -- the row policy before it gets here, so this only has to answer for a
  -- signed-in member.
  if auth.uid() is not null
     and new.category_id is distinct from old.category_id
     and not public.is_team_owner(new.team_id) then
    raise exception 'Only the team owner can change a task category.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

drop trigger if exists assignment_category_owner_only_trg on public.assignments;
create trigger assignment_category_owner_only_trg
  before update on public.assignments
  for each row execute function public.assignment_category_owner_only();
