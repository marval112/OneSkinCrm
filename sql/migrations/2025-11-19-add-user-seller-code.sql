-- Add 'seller_code' to users: unique 3-digit code assigned by Admin
alter table if exists public.users
add column if not exists seller_code varchar(3);

-- Enforce 3 numeric digits when present
alter table public.users
    add constraint users_seller_code_format_chk
    check (seller_code is null or seller_code ~ '^[0-9]{3}$');

-- Enforce uniqueness across all users (ignoring nulls)
create unique index if not exists users_seller_code_unique_idx
on public.users (seller_code)
where seller_code is not null;


