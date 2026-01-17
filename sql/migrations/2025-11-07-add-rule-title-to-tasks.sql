-- Adds column to store the Automation Rule title that created a task
ALTER TABLE IF EXISTS public.tasks
  ADD COLUMN IF NOT EXISTS rule_title TEXT NULL;


