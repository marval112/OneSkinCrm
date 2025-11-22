-- Add 'source' column to leads if missing (e.g., Website, Referral, Cold Call...)
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS source TEXT;

-- Optional: backfill nulls with a generic value to avoid blanks in UI
UPDATE public.leads SET source = COALESCE(source, 'Website');


