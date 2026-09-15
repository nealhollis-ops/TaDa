-- ============================================================================
-- Phase 4: billing
--  * billing_customers: member <-> Stripe customer map. Service role only.
-- ============================================================================
create table if not exists public.billing_customers (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at         timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
-- No policies on purpose: only the service role (webhooks, checkout) reads or writes this table.
revoke all on public.billing_customers from authenticated, anon;
grant all on public.billing_customers to service_role;
