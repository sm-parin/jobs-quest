// ---------------------------------------------------------------------------
// Database table shapes — derived from Supabase Postgres schema.
// All queries must select specific columns; never use select('*').
// ---------------------------------------------------------------------------

export type JobStatus =
  | 'saved'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'ghosted';

export interface Profile {
  id: string;           // uuid — matches auth.uid()
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;   // ISO 8601
  updated_at: string;
}

export interface Job {
  id: string;           // uuid
  user_id: string;      // uuid — FK -> profiles.id (RLS: user_id = auth.uid())
  company: string;
  role: string;
  status: JobStatus;
  location: string | null;
  url: string | null;
  salary_min: number | null;
  salary_max: number | null;
  notes: string | null;
  applied_at: string | null;  // ISO 8601 date
  created_at: string;
  updated_at: string;
}

export interface JobDocument {
  id: string;           // uuid
  job_id: string;       // uuid — FK -> jobs.id
  user_id: string;      // uuid — RLS anchor
  name: string;
  storage_path: string; // Supabase Storage path
  created_at: string;
}

// ---------------------------------------------------------------------------
// Supabase Database helper type (used with createClient generics)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Job, 'id' | 'user_id' | 'created_at'>>;
      };
      job_documents: {
        Row: JobDocument;
        Insert: Omit<JobDocument, 'id' | 'created_at'>;
        Update: Partial<Omit<JobDocument, 'id' | 'job_id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}
