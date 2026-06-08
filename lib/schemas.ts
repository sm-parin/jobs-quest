import { z } from 'zod';
import type { Priority } from '@/lib/types';

const PRIORITIES = ['low', 'medium', 'high'] as const satisfies readonly Priority[];

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

export const jobSchema = z.object({
  company: z.string().min(1, 'Company is required').max(200),
  role: z.string().min(1, 'Role is required').max(200),
  status_id: z.string().uuid().nullable().optional(),
  priority: z.enum(PRIORITIES).default('medium'),
  work_type: z.enum(['on-site', 'remote', 'hybrid']).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  url: z.string().url('Enter a valid URL').or(z.literal('')).nullable().optional(),
  source: z.string().max(200).nullable().optional(),
  source_platform_id: z.string().uuid().nullable().optional(),
  salary: z.string().max(100).nullable().optional(),
  contact_email: z.string().email('Enter a valid email').or(z.literal('')).nullable().optional(),
  stage_date: z.string().nullable().optional(),
  stage_date_label: z.string().max(50).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  job_description: z.string().max(10000).nullable().optional(),
  is_archived: z.boolean().default(false),
  resume: z.any().optional().nullable(),
});
export type JobValues = z.infer<typeof jobSchema>;

export const platformStatusOptionSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  order: z.number().int().min(0),
});
export type PlatformStatusOptionValues = z.infer<typeof platformStatusOptionSchema>;

export const platformSchema = z.object({
  name: z.string().min(1, 'Platform name is required').max(100),
  url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  profile_status_id: z.string().uuid().optional().nullable(),
  subscription_type: z.string().max(50).optional(),
  login_email: z.string().email('Must be a valid email').or(z.literal('')).optional(),
  personal_rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().max(1000).optional(),
});
export type PlatformValues = z.infer<typeof platformSchema>;

export const contactInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  designation: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  platform: z.string().max(100).optional(),
  contact_methods: z.array(z.object({
    type: z.string().max(50),
    value: z.string().max(200),
  })).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
});
export type ContactInputValues = z.infer<typeof contactInputSchema>;

export const contactBatchSchema = z.object({
  job_id: z.string().uuid('job_id must be a valid UUID'),
  contacts: z.array(contactInputSchema).min(1, 'At least one contact is required').max(20),
});
export type ContactBatchValues = z.infer<typeof contactBatchSchema>;

export const activityLogSchema = z.object({
  job_id: z.string().uuid('job_id must be a valid UUID'),
  old_status_label: z.string().nullable().optional(),
  new_status_label: z.string().min(1, 'new_status_label is required'),
  stage_date: z.string().optional().nullable(),
});
export type ActivityLogValues = z.infer<typeof activityLogSchema>;
