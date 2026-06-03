import { z } from 'zod';
import type { JobStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const JOB_STATUSES = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'ghosted',
] as const satisfies readonly JobStatus[];

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    full_name: z.string().min(1, 'Name is required').max(120),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignUpValues = z.infer<typeof signUpSchema>;

// ---------------------------------------------------------------------------
// Job schemas
// ---------------------------------------------------------------------------

export const jobSchema = z.object({
  company: z.string().min(1, 'Company is required').max(200),
  role: z.string().min(1, 'Role is required').max(200),
  status: z.enum(JOB_STATUSES),
  location: z.string().max(200).nullable().optional(),
  url: z.string().url('Enter a valid URL').nullable().optional(),
  salary_min: z.number().int().positive().nullable().optional(),
  salary_max: z.number().int().positive().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  applied_at: z.string().nullable().optional(), // ISO date string
});
export type JobValues = z.infer<typeof jobSchema>;

export const jobUpdateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(JOB_STATUSES),
});
export type JobUpdateStatusValues = z.infer<typeof jobUpdateStatusSchema>;

// ---------------------------------------------------------------------------
// Profile schemas
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(120),
  avatar_url: z.string().url('Enter a valid URL').nullable().optional(),
});
export type ProfileValues = z.infer<typeof profileSchema>;
