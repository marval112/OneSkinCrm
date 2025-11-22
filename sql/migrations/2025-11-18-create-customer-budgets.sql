-- customer_budgets: expected budget per customer and year
create table if not exists public.customer_budgets (
  id bigserial primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  year int not null,
  amount numeric not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (customer_id, year)
);

-- simple RLS for development (allow authenticated)
alter table public.customer_budgets enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'customer_budgets' and policyname = 'allow_all_authenticated') then
    create policy allow_all_authenticated on public.customer_budgets for all using (true) with check (true);
  end if;
end $$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customer_budgets_updated_at on public.customer_budgets;
create trigger trg_customer_budgets_updated_at
before update on public.customer_budgets
for each row execute function public.set_updated_at();


