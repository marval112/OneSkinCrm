-- Add closed year column to deals to persist the year a deal was closed
alter table if exists public.deals
add column if not exists "año_closed" integer null;

-- Optional: backfill from updated_at for already closed deals
update public.deals
set "año_closed" = extract(year from updated_at)::int
where "año_closed" is null and status in ('Closed Won','Closed Lost');


