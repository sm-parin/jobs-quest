-- ============================================================
-- Migration 004: platform resume + system status flag
-- Paste and run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Add resume storage path to platforms
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS resume_path TEXT;

-- 2. Add is_system flag to statuses (protects the seeded "Applied" entry)
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- 3. Mark existing "Applied" statuses created by the signup trigger as system.
--    Best-effort: matches rows seeded at order=0 with label='Applied'.
UPDATE public.statuses
SET is_system = true
WHERE label = 'Applied' AND "order" = 0;

-- 4. Update the signup trigger function so new users get Applied with is_system = true
CREATE OR REPLACE FUNCTION public.handle_new_user_statuses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.statuses (user_id, label, color, "order", is_system) VALUES
    (NEW.id, 'Applied',      '#60a5fa', 0, true),
    (NEW.id, 'Interviewing', '#a78bfa', 1, false),
    (NEW.id, 'Offer',        '#22c55e', 2, false),
    (NEW.id, 'Rejected',     '#ef4444', 3, false);

  INSERT INTO public.platform_status_options (user_id, label, "order") VALUES
    (NEW.id, 'Profile Pending', 0),
    (NEW.id, 'Profile Created', 1),
    (NEW.id, 'Active',          2);

  RETURN NEW;
END;
$$;
