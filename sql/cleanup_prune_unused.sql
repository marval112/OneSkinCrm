-- Cleanup script for pruning unused tables and columns in Supabase (PostgreSQL)
-- Safe to run multiple times. Uses IF EXISTS and avoids touching used entities.

BEGIN;

-- 1) Drop unused tables
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.deal_lines CASCADE;
DROP TABLE IF EXISTS public.price_history CASCADE;

-- 2) Remove product_families and its dependencies (not used by the app)
ALTER TABLE IF EXISTS public.product_categories DROP CONSTRAINT IF EXISTS product_categories_family_id_fkey;
ALTER TABLE IF EXISTS public.products DROP CONSTRAINT IF EXISTS products_family_id_fkey;
ALTER TABLE IF EXISTS public.product_categories DROP COLUMN IF EXISTS family_id;
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS family_id;
DROP TABLE IF EXISTS public.product_families CASCADE;

-- 3) Drop unused columns from core tables
-- customers: remove columns not referenced by the application
ALTER TABLE IF EXISTS public.customers
  DROP COLUMN IF EXISTS lifecycle,
  DROP COLUMN IF EXISTS total_spent;

-- deals: remove legacy fields not used in UI/workflows
ALTER TABLE IF EXISTS public.deals
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS assigned_to,
  DROP COLUMN IF EXISTS actual_close_date;

-- products: keep 'active' and core fields only
ALTER TABLE IF EXISTS public.products
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS name_en,
  DROP COLUMN IF EXISTS name_es,
  DROP COLUMN IF EXISTS name_fr,
  DROP COLUMN IF EXISTS description_en,
  DROP COLUMN IF EXISTS description_es,
  DROP COLUMN IF EXISTS description_fr,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS stock_quantity,
  DROP COLUMN IF EXISTS attributes,
  DROP COLUMN IF EXISTS updated_at;

-- leads: remove unused explanation field
ALTER TABLE IF EXISTS public.leads
  DROP COLUMN IF EXISTS score_reasoning;

-- NOTE: activities."to" and activities."from" are intentionally kept.
-- They are used by inbound email webhooks to record recipients/sender.

COMMIT;

-- How to run:
-- 1) Open Supabase SQL Editor (or psql) against your database
-- 2) Paste this script and execute, or upload the file and run it
-- 3) Verify the app runs and no missing-column errors occur


