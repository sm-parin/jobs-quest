-- 007_add_reminder_text.sql
-- Add a reminder_text column to reminders for storing free-text reminder notes
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS reminder_text TEXT;

-- Allow RLS policies already in place to handle this column implicitly.
