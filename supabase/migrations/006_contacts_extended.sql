-- Migration 006: Extend contacts with role, platform, and flexible contact_methods
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS contact_methods JSONB DEFAULT '[]'::jsonb;
