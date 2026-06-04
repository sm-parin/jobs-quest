-- Migration 005: Add work_type and contact_email to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS work_type TEXT CHECK (work_type IN ('on-site', 'remote', 'hybrid'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS contact_email TEXT;
