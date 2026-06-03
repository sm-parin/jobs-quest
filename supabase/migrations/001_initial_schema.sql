-- =============================================================================
-- 001_initial_schema.sql
-- Jobs Quest — full initial schema
--
-- MANUAL STEP: Paste this entire file into Supabase Dashboard → SQL Editor
-- and click Run. Run it once on a fresh project.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. updated_at trigger function (reused by all tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. statuses
-- ---------------------------------------------------------------------------
CREATE TABLE public.statuses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  color       TEXT        NOT NULL,
  "order"     INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "statuses: select own"  ON public.statuses FOR SELECT  USING       (user_id = auth.uid());
CREATE POLICY "statuses: insert own"  ON public.statuses FOR INSERT  WITH CHECK   (user_id = auth.uid());
CREATE POLICY "statuses: update own"  ON public.statuses FOR UPDATE  USING        (user_id = auth.uid());
CREATE POLICY "statuses: delete own"  ON public.statuses FOR DELETE  USING        (user_id = auth.uid());

CREATE TRIGGER statuses_updated_at
  BEFORE UPDATE ON public.statuses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 3. jobs
-- ---------------------------------------------------------------------------
CREATE TABLE public.jobs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company           TEXT        NOT NULL,
  role              TEXT        NOT NULL,
  location          TEXT,
  url               TEXT,
  source            TEXT,
  status_id         UUID        REFERENCES public.statuses(id) ON DELETE SET NULL,
  priority          TEXT        NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low', 'medium', 'high')),
  salary            TEXT,
  stage_date        DATE,
  stage_date_label  TEXT,
  notes             TEXT,
  resume_path       TEXT,
  job_description   TEXT,
  is_archived       BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs: select own"  ON public.jobs FOR SELECT  USING       (user_id = auth.uid());
CREATE POLICY "jobs: insert own"  ON public.jobs FOR INSERT  WITH CHECK   (user_id = auth.uid());
CREATE POLICY "jobs: update own"  ON public.jobs FOR UPDATE  USING        (user_id = auth.uid());
CREATE POLICY "jobs: delete own"  ON public.jobs FOR DELETE  USING        (user_id = auth.uid());

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. contacts (point of contact per job)
-- ---------------------------------------------------------------------------
CREATE TABLE public.contacts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  designation  TEXT,
  email        TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts: select own"  ON public.contacts FOR SELECT  USING       (user_id = auth.uid());
CREATE POLICY "contacts: insert own"  ON public.contacts FOR INSERT  WITH CHECK   (user_id = auth.uid());
CREATE POLICY "contacts: update own"  ON public.contacts FOR UPDATE  USING        (user_id = auth.uid());
CREATE POLICY "contacts: delete own"  ON public.contacts FOR DELETE  USING        (user_id = auth.uid());

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 5. reminders
-- ---------------------------------------------------------------------------
CREATE TABLE public.reminders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remind_at   DATE        NOT NULL,
  is_done     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders: select own"  ON public.reminders FOR SELECT  USING       (user_id = auth.uid());
CREATE POLICY "reminders: insert own"  ON public.reminders FOR INSERT  WITH CHECK   (user_id = auth.uid());
CREATE POLICY "reminders: update own"  ON public.reminders FOR UPDATE  USING        (user_id = auth.uid());
CREATE POLICY "reminders: delete own"  ON public.reminders FOR DELETE  USING        (user_id = auth.uid());

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 6. activity_log (append-only; no updated_at)
-- ---------------------------------------------------------------------------
CREATE TABLE public.activity_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_status_label  TEXT,
  new_status_label  TEXT        NOT NULL,
  stage_date        DATE,
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log: select own"  ON public.activity_log FOR SELECT  USING       (user_id = auth.uid());
CREATE POLICY "activity_log: insert own"  ON public.activity_log FOR INSERT  WITH CHECK   (user_id = auth.uid());
CREATE POLICY "activity_log: update own"  ON public.activity_log FOR UPDATE  USING        (user_id = auth.uid());
CREATE POLICY "activity_log: delete own"  ON public.activity_log FOR DELETE  USING        (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. Seed default statuses when a new user signs up
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_statuses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.statuses (user_id, label, color, "order") VALUES
    (NEW.id, 'Saved',     '#94a3b8', 1),
    (NEW.id, 'Applied',   '#60a5fa', 2),
    (NEW.id, 'Screening', '#a78bfa', 3),
    (NEW.id, 'Interview', '#f59e0b', 4),
    (NEW.id, 'Offer',     '#22c55e', 5),
    (NEW.id, 'Rejected',  '#ef4444', 6),
    (NEW.id, 'Ghosted',   '#6b7280', 7);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_statuses();
