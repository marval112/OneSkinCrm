-- Migration: Add closed_at to deals table to allow manual editing of closure dates
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMPTZ DEFAULT NULL;

-- Backfill from updated_at for already closed deals if closed_at is null
UPDATE public.deals 
SET "closed_at" = updated_at 
WHERE status IN ('Closed Won', 'Closed Lost') AND "closed_at" IS NULL;
