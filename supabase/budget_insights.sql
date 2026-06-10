create table if not exists public.budget_insights (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  insight_month text not null,
  type text not null default 'saving_opportunity',
  severity text not null default 'info',
  title text not null,
  body text not null,
  category text,
  category_label text,
  budget_bucket text,
  current_amount numeric default 0,
  suggested_limit numeric,
  expected_saving numeric default 0,
  action_label text default '한도 적용하기',
  action_payload jsonb default '{}'::jsonb,
  status text not null default 'active',
  source text not null default 'jaybis_agent',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists budget_insights_user_month_idx
on public.budget_insights (user_id, insight_month, status);

alter table public.budget_insights enable row level security;

drop policy if exists "budget_insights_public_read" on public.budget_insights;
drop policy if exists "budget_insights_public_update" on public.budget_insights;

create policy "budget_insights_public_read"
on public.budget_insights
for select
to anon
using (true);

create policy "budget_insights_public_update"
on public.budget_insights
for update
to anon
using (true)
with check (true);
