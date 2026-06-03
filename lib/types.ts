// ---------------------------------------------------------------------------
// Database table shapes — match migrations/001 + migrations/002 exactly.
// All queries must select specific columns; never use select('*').
// ---------------------------------------------------------------------------

export type Priority = 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// platform_status_options
// ---------------------------------------------------------------------------
export interface PlatformStatusOption {
  id: string;
  user_id: string;
  label: string;
  order: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// platforms
// ---------------------------------------------------------------------------
export interface Platform {
  id: string;
  user_id: string;
  name: string;
  url: string | null;
  profile_status_id: string | null;     // FK → platform_status_options.id
  subscription_type: string | null;
  login_email: string | null;
  last_application_date: string | null; // ISO date — managed by DB trigger
  personal_rating: number | null;       // 1-5
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (not DB columns)
  profile_status?: PlatformStatusOption;
  // Derived from query (not a DB column)
  jobs_tracked?: number;
}

// ---------------------------------------------------------------------------
// statuses
// ---------------------------------------------------------------------------
export interface Status {
  id: string;
  user_id: string;
  label: string;
  color: string;
  order: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// jobs
// ---------------------------------------------------------------------------
export interface Job {
  id: string;
  user_id: string;
  company: string;
  role: string;
  location: string | null;
  url: string | null;
  source: string | null;
  source_platform_id: string | null;
  status_id: string | null;
  priority: Priority;
  salary: string | null;
  stage_date: string | null;
  stage_date_label: string | null;
  notes: string | null;
  resume_path: string | null;
  job_description: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations (not DB columns)
  status?: Pick<Status, 'id' | 'label' | 'color'>;
  platform?: Pick<Platform, 'id' | 'name'>;
  contacts?: Contact[];
}

// ---------------------------------------------------------------------------
// contacts
// ---------------------------------------------------------------------------
export interface Contact {
  id: string;
  job_id: string;
  user_id: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// reminders
// ---------------------------------------------------------------------------
export interface Reminder {
  id: string;
  job_id: string;
  user_id: string;
  remind_at: string;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderWithJob extends Reminder {
  job?: {
    company: string;
    role: string;
    status?: { label: string; color: string } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------
export interface StatsResponse {
  total_applied: number;
  in_progress: number;
  offers: number;
  response_rate: number | null;
  applied_this_week: number;
  total_active_reminders: number;
  overdue_reminders: number;
  archived_count: number;
}

// ---------------------------------------------------------------------------
// activity_log
// ---------------------------------------------------------------------------
export interface ActivityLog {
  id: string;
  job_id: string;
  user_id: string;
  old_status_label: string | null;
  new_status_label: string;
  stage_date: string | null;
  changed_at: string;
}

// ---------------------------------------------------------------------------
// Supabase Database helper type
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      platform_status_options: {
        Row: { id: string; user_id: string; label: string; order: number; created_at: string; updated_at: string };
        Insert: { user_id: string; label: string; order: number };
        Update: { label?: string; order?: number; updated_at?: string };
      };
      platforms: {
        Row: { id: string; user_id: string; name: string; url: string | null; profile_status_id: string | null; subscription_type: string | null; login_email: string | null; last_application_date: string | null; personal_rating: number | null; notes: string | null; created_at: string; updated_at: string };
        Insert: { user_id: string; name: string; url?: string | null; profile_status_id?: string | null; subscription_type?: string | null; login_email?: string | null; personal_rating?: number | null; notes?: string | null };
        Update: { name?: string; url?: string | null; profile_status_id?: string | null; subscription_type?: string | null; login_email?: string | null; personal_rating?: number | null; notes?: string | null; updated_at?: string };
      };
      statuses: {
        Row: { id: string; user_id: string; label: string; color: string; order: number; created_at: string; updated_at: string };
        Insert: { user_id: string; label: string; color: string; order: number };
        Update: { label?: string; color?: string; order?: number; updated_at?: string };
      };
      jobs: {
        Row: { id: string; user_id: string; company: string; role: string; location: string | null; url: string | null; source: string | null; source_platform_id: string | null; status_id: string | null; priority: Priority; salary: string | null; stage_date: string | null; stage_date_label: string | null; notes: string | null; resume_path: string | null; job_description: string | null; is_archived: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; company: string; role: string; location?: string | null; url?: string | null; source?: string | null; source_platform_id?: string | null; status_id?: string | null; priority?: Priority; salary?: string | null; stage_date?: string | null; stage_date_label?: string | null; notes?: string | null; resume_path?: string | null; job_description?: string | null; is_archived?: boolean };
        Update: { company?: string; role?: string; location?: string | null; url?: string | null; source?: string | null; source_platform_id?: string | null; status_id?: string | null; priority?: Priority; salary?: string | null; stage_date?: string | null; stage_date_label?: string | null; notes?: string | null; resume_path?: string | null; job_description?: string | null; is_archived?: boolean; updated_at?: string };
      };
      contacts: {
        Row: { id: string; job_id: string; user_id: string; name: string; designation: string | null; email: string | null; phone: string | null; created_at: string; updated_at: string };
        Insert: { job_id: string; user_id: string; name: string; designation?: string | null; email?: string | null; phone?: string | null };
        Update: { name?: string; designation?: string | null; email?: string | null; phone?: string | null; updated_at?: string };
      };
      reminders: {
        Row: { id: string; job_id: string; user_id: string; remind_at: string; is_done: boolean; created_at: string; updated_at: string };
        Insert: { job_id: string; user_id: string; remind_at: string; is_done?: boolean };
        Update: { remind_at?: string; is_done?: boolean; updated_at?: string };
      };
      activity_log: {
        Row: { id: string; job_id: string; user_id: string; old_status_label: string | null; new_status_label: string; stage_date: string | null; changed_at: string };
        Insert: { job_id: string; user_id: string; old_status_label?: string | null; new_status_label: string; stage_date?: string | null };
        Update: Record<string, never>;
      };
    };
  };
}
