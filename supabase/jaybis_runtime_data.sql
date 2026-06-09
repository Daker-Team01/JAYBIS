create table if not exists public.jaybis_runtime_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jaybis_runtime_data enable row level security;

drop policy if exists "Allow anon read jaybis runtime data" on public.jaybis_runtime_data;
create policy "Allow anon read jaybis runtime data"
  on public.jaybis_runtime_data
  for select
  to anon
  using (true);

drop policy if exists "Allow anon upsert jaybis runtime data" on public.jaybis_runtime_data;
create policy "Allow anon upsert jaybis runtime data"
  on public.jaybis_runtime_data
  for insert
  to anon
  with check (true);

drop policy if exists "Allow anon update jaybis runtime data" on public.jaybis_runtime_data;
create policy "Allow anon update jaybis runtime data"
  on public.jaybis_runtime_data
  for update
  to anon
  using (true)
  with check (true);

insert into public.jaybis_runtime_data (id, data)
values (
  'default',
  '{
    "user": {
      "name": "사용자",
      "age": 0,
      "job": "",
      "track": ""
    },
    "assets": {
      "totalAssets": 0,
      "totalDebt": 0,
      "cashflow": {
        "income": 0,
        "spend": 0
      }
    },
    "budget": {
      "salary": 0,
      "categories": [],
      "alerts": [],
      "peers": []
    },
    "transactions": [],
    "products": []
  }'::jsonb
)
on conflict (id) do nothing;
