import { z } from 'zod';
import type { Priority } from '@/lib/types';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const PRIORITIES = ['low', 'medium', 'high'] as const satisfies readonly Priority[];

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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignUpValues = z.infer<typeof signUpSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

// ---------------------------------------------------------------------------
// Job schemas
// ---------------------------------------------------------------------------

export const jobSchema = z.object({
  company: z.string().min(1, 'Company is required').max(200),
  role: z.string().min(1, 'Role is required').max(200),
  status_id: z.string().uuid().nullable().optional(),
  priority: z.enum(PRIORITIES).default('medium'),
  location: z.string().max(200).nullable().optional(),
  url: z.string().url('Enter a valid URL').or(z.literal('')).nullable().optional(),
  source: z.string().max(200).nullable().optional(),
  salary: z.string().max(100).nullable().optional(),
  stage_date: z.string().nullable().optional(),      // ISO date string
  stage_date_label: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  job_description: z.string().nullable().optional(),
  is_archived: z.boolean().default(false),
});
export type JobValues = z.infer<typeof jobSchema>;

// ---------------------------------------------------------------------------
// Profile schemas
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(120),
  avatar_url: z.string().url('Enter a valid URL').nullable().optional(),
});
export type ProfileValues = z.infer<typeof profileSchema>;
