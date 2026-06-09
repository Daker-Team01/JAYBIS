alter table public.financial_products enable row level security;

drop policy if exists "financial_products_public_read" on public.financial_products;

create policy "financial_products_public_read"
on public.financial_products
for select
to anon
using (
  coalesce(status, 'active') <> 'archived'
);
