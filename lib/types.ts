// ---------------------------------------------------------------------------
// Database table shapes — match supabase/migrations/001_initial_schema.sql exactly.
// All queries must select specific columns; never use select('*').
// ---------------------------------------------------------------------------

export type Priority = 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// statuses
// ---------------------------------------------------------------------------
export interface Status {
  id: string;             // uuid
  user_id: string;        // uuid — auth.uid()
  label: string;
  color: string;          // hex string e.g. "#60a5fa"
  order: number;
  created_at: string;     // ISO 8601
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
  status_id: string | null;        // FK → statuses.id
  priority: Priority;
  salary: string | null;
  stage_date: string | null;       // ISO date
  stage_date_label: string | null; // e.g. "Applied"
  notes: string | null;
  resume_path: string | null;      // Supabase Storage path
  job_description: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// contacts (point of contact per job)
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
  remind_at: string;   // ISO date
  is_done: boolean;
  created_at: string;
  updated_at: string;
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
  stage_date: string | null;  // ISO date
  changed_at: string;         // ISO 8601 timestamptz
}

// ---------------------------------------------------------------------------
// Supabase Database helper type (used with createClient<Database>)
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      statuses: {
        Row: Status;
        Insert: Omit<Status, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Status, 'id' | 'user_id' | 'created_at'>>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Job, 'id' | 'user_id' | 'created_at'>>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Contact, 'id' | 'job_id' | 'user_id' | 'created_at'>>;
      };
      reminders: {
        Row: Reminder;
        Insert: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Reminder, 'id' | 'job_id' | 'user_id' | 'created_at'>>;
      };
      activity_log: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'changed_at'>;
        Update: Partial<Omit<ActivityLog, 'id' | 'job_id' | 'user_id' | 'changed_at'>>;
      };
    };
  };
}
