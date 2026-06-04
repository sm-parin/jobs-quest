'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLinkIcon, Loader2, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { jobSchema, type JobValues } from '@/lib/schemas';
import { useJobStore } from '@/store/jobStore';
import { usePlatformStore } from '@/store/platformStore';
import { createClient } from '@/lib/supabase/client';
import type { Job } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ResumeSection } from '@/components/app/ResumeSection';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

const STEP_LABELS = ['Job Details', 'Status & Tracking', 'Notes & Contacts'] as const;

interface ContactDraft {
  id?: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  isNew?: boolean;
}

interface JobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job;
  userId: string;
}

export function JobModal({ open, onOpenChange, job, userId }: JobModalProps) {
  const isEdit = !!job;
  const { statuses, addJobOptimistic, updateJobOptimistic, fetchJobs } = useJobStore();
  const { platforms } = usePlatformStore();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [removeResume, setRemoveResume] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    getValues,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      company: '',
      role: '',
      location: '',
      url: '',
      job_description: '',
      status_id: null,
      priority: 'medium' as const,
      work_type: null,
      stage_date: '',
      stage_date_label: '',
      source_platform_id: null,
      source: '',
      salary: '',
      contact_email: '',
      notes: '',
      resume: null,
      is_archived: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    if (job) {
      reset({
        company: job.company,
        role: job.role,
        location: job.location ?? '',
        url: job.url ?? '',
        job_description: job.job_description ?? '',
        status_id: job.status_id ?? null,
        priority: job.priority ?? 'medium',
        work_type: job.work_type ?? null,
        stage_date: job.stage_date ?? '',
        stage_date_label: job.stage_date_label ?? '',
        source_platform_id: job.source_platform_id ?? null,
        source: job.source ?? '',
        salary: job.salary ?? '',
        contact_email: job.contact_email ?? '',
        notes: job.notes ?? '',
        resume: null,
        is_archived: job.is_archived,
      });
    } else {
      const savedEmail = typeof window !== 'undefined' ? (localStorage.getItem('jq_default_email') ?? '') : '';
      reset({
        company: '',
        role: '',
        location: '',
        url: '',
        job_description: '',
        status_id: null,
        priority: 'medium',
        work_type: null,
        stage_date: '',
        stage_date_label: '',
        source_platform_id: null,
        source: '',
        salary: '',
        contact_email: savedEmail,
        notes: '',
        resume: null,
        is_archived: false,
      });
    }
    setResumeFile(null);
    setRemoveResume(false);
    setContacts(
      job?.contacts
        ? job.contacts.map((c) => ({ id: c.id, name: c.name, designation: c.designation ?? '', email: c.email ?? '', phone: c.phone ?? '' }))
        : [],
    );
  }, [open, job, reset]);

  const watchStatusId = useWatch({ control, name: 'status_id' });

  // Auto-fill stage_date_label and stage_date when status changes
  useEffect(() => {
    if (!watchStatusId) return;
    const status = statuses.find((s) => s.id === watchStatusId);
    if (!status) return;
    if (!getValues('stage_date_label')) setValue('stage_date_label', status.label);
    if (!getValues('stage_date')) setValue('stage_date', new Date().toISOString().slice(0, 10));
  }, [watchStatusId, statuses, getValues, setValue]);

  const watchUrl = useWatch({ control, name: 'url' });
  const watchPriority = useWatch({ control, name: 'priority' });
  const watchPlatformId = useWatch({ control, name: 'source_platform_id' });
  const watchWorkType = useWatch({ control, name: 'work_type' });


  async function handleNext() {
    if (step === 1) {
      const valid = await trigger(['company', 'role']);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length));
  }

  function addContact() {    setContacts((prev) => [...prev, { name: '', designation: '', email: '', phone: '', isNew: true }]);
  }

  function removeContact(idx: number) {
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateContact(idx: number, field: keyof ContactDraft, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  async function onSubmit(values: JobValues) {
    try {
      let resumePath = job?.resume_path ?? null;

      // Handle resume upload / removal (legacy path — only used in add mode)
      if (removeResume) {
        resumePath = null;
      }
      if (resumeFile) {
        const ext = resumeFile.name.split('.').pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(path, resumeFile, { upsert: true });
        if (uploadError) {
          toast.error('Failed to upload resume');
          return;
        }
        resumePath = path;
      }

      const payload = {
        company: values.company,
        role: values.role,
        location: values.location || null,
        url: values.url || null,
        job_description: values.job_description || null,
        status_id: values.status_id || null,
        priority: values.priority,
        work_type: values.work_type || null,
        stage_date: values.stage_date || null,
        stage_date_label: values.stage_date_label || null,
        source_platform_id: values.source_platform_id || null,
        source: values.source || null,
        salary: values.salary || null,
        contact_email: values.contact_email || null,
        notes: values.notes || null,
        resume_path: resumePath,
        is_archived: values.is_archived ?? false,
      };

      if (isEdit && job) {
        const res = await fetch(`/api/jobs/${job.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body.error ?? 'Failed to update job');
          return;
        }
        const { data } = await res.json();
        updateJobOptimistic(job.id, data);
      } else {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body.error ?? 'Failed to add job');
          return;
        }
        const { data } = await res.json();
        addJobOptimistic(data);

        // Save contacts for new job
        const validContacts = contacts.filter((c) => c.name.trim());
        if (validContacts.length > 0) {
          await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validContacts.map((c) => ({ job_id: data.id, name: c.name, designation: c.designation || null, email: c.email || null, phone: c.phone || null }))),
          });
        }
      }

      // For edits, handle contact changes
      if (isEdit && job) {
        const validContacts = contacts.filter((c) => c.name.trim());
        const newContacts = validContacts.filter((c) => c.isNew);
        if (newContacts.length > 0) {
          await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newContacts.map((c) => ({ job_id: job.id, name: c.name, designation: c.designation || null, email: c.email || null, phone: c.phone || null }))),
          });
        }
        // Patch existing contacts
        for (const c of validContacts.filter((c) => c.id && !c.isNew)) {
          await fetch(`/api/contacts/${c.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: c.name, designation: c.designation || null, email: c.email || null, phone: c.phone || null }),
          });
        }
        // Refresh to get updated contacts
        fetchJobs();
      }

      toast.success(isEdit ? 'Job updated' : 'Job added');
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Job' : 'Add Job'}</DialogTitle>
        </DialogHeader>

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-1 py-1">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  isActive ? 'bg-brand-500 text-white' : isDone ? 'bg-brand-100 text-brand-600' : 'bg-surface-muted text-text-muted'
                )}>
                  {s}
                </div>
                <span className={cn(
                  'text-xs font-medium hidden sm:block truncate',
                  isActive ? 'text-text-primary' : 'text-text-muted'
                )}>
                  {label}
                </span>
                {s < STEP_LABELS.length && (
                  <div className={cn('flex-1 h-px mx-1 shrink-0 min-w-[8px]', isDone ? 'bg-brand-400' : 'bg-border-app')} />
                )}
              </div>
            );
          })}
        </div>

        <form className="space-y-4">

          {/* ── Step 1: Job Details ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-company">Company <span aria-hidden>*</span></Label>
                  <Input id="j-company" placeholder="e.g. Acme Corp" {...register('company')} aria-describedby={errors.company ? 'j-company-err' : undefined} />
                  {errors.company && <p id="j-company-err" role="alert" className="text-xs text-destructive">{errors.company.message as string}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-role">Role <span aria-hidden>*</span></Label>
                  <Input id="j-role" placeholder="e.g. Frontend Engineer" {...register('role')} aria-describedby={errors.role ? 'j-role-err' : undefined} />
                  {errors.role && <p id="j-role-err" role="alert" className="text-xs text-destructive">{errors.role.message as string}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-location">Location</Label>
                <Input id="j-location" placeholder="e.g. Remote, New York, NY" {...register('location')} />
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={watchWorkType ?? ''} onValueChange={(v) => setValue('work_type', (v || null) as 'on-site' | 'remote' | 'hybrid' | null)}>
                  <SelectTrigger><SelectValue placeholder="Select work type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    <SelectItem value="on-site">On-site</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-url">Job posting URL</Label>
                <div className="relative">
                  <Input id="j-url" type="url" placeholder="https://" {...register('url')} className="pr-9" />
                  {watchUrl && (
                    <a href={watchUrl} target="_blank" rel="noopener noreferrer" aria-label="Open job posting" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-500">
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {errors.url && <p role="alert" className="text-xs text-destructive">{errors.url.message as string}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-desc">Job Description</Label>
                <Textarea id="j-desc" rows={4} placeholder="Paste the job description here…" {...register('job_description')} />
              </div>
            </div>
          )}

          {/* ── Step 2: Status & Tracking ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="j-status">Status</Label>
                <Select value={watchStatusId ?? ''} onValueChange={(v) => setValue('status_id', v || null)}>
                  <SelectTrigger id="j-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <div className="flex rounded-md border border-border-app overflow-hidden" role="group" aria-label="Priority">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setValue('priority', opt.value)}
                      className={cn('flex-1 py-1.5 text-sm transition-colors', watchPriority === opt.value ? 'bg-brand-500 text-white font-medium' : 'bg-surface text-text-muted hover:bg-surface-muted')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-stage-label">Stage label</Label>
                  <Input id="j-stage-label" placeholder="e.g. Applied" {...register('stage_date_label')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-stage-date">Stage date</Label>
                  <Input id="j-stage-date" type="date" {...register('stage_date')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-platform">Source platform</Label>
                <Select value={watchPlatformId ?? ''} onValueChange={(v) => setValue('source_platform_id', v || null)}>
                  <SelectTrigger id="j-platform"><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {platforms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-source">Source (manual)</Label>
                  <Input id="j-source" placeholder="e.g. Referral" {...register('source')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-salary">Salary / Range</Label>
                  <Input id="j-salary" placeholder="e.g. $90k–$120k" {...register('salary')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-contact-email">Your email</Label>
                <Input id="j-contact-email" type="email" placeholder="you@example.com" {...register('contact_email')} />
                {errors.contact_email && <p role="alert" className="text-xs text-destructive">{errors.contact_email.message as string}</p>}
                <p className="text-xs text-text-muted">The email you used / plan to use for this application.</p>
              </div>
            </div>
          )}

          {/* ── Step 3: Notes & Contacts ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="j-notes">Notes</Label>
                <Textarea id="j-notes" rows={3} placeholder="Private notes…" {...register('notes')} />
              </div>

              {isEdit && job ? (
                <div className="space-y-1.5">
                  <Label>Resume</Label>
                  <ResumeSection jobId={job.id} initialResumePath={job.resume_path ?? null} />
                </div>
              ) : (() => {
                const selectedPlatform = platforms.find((p) => p.id === watchPlatformId);
                const platformHasResume = !!selectedPlatform?.resume_path;
                return (
                  <p className="text-xs text-text-muted">
                    {platformHasResume
                      ? `The resume from ${selectedPlatform!.name} will be auto-attached to this job.`
                      : 'You can upload a resume after saving this job.'}
                  </p>
                );
              })()}

              <div className="space-y-3">
                <Label>Points of Contact</Label>
                {contacts.map((c, idx) => (
                  <div key={idx} className="rounded-lg border border-border-app bg-surface-muted p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-muted">Contact {idx + 1}</span>
                      <button type="button" onClick={() => removeContact(idx)} aria-label="Remove contact" className="text-destructive hover:text-destructive/80">
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`c-name-${idx}`} className="text-xs">Name *</Label>
                        <Input id={`c-name-${idx}`} value={c.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} placeholder="Jane Smith" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label htmlFor={`c-title-${idx}`} className="text-xs">Title</Label>
                        <Input id={`c-title-${idx}`} value={c.designation} onChange={(e) => updateContact(idx, 'designation', e.target.value)} placeholder="Hiring Manager" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label htmlFor={`c-email-${idx}`} className="text-xs">Email</Label>
                        <Input id={`c-email-${idx}`} type="email" value={c.email} onChange={(e) => updateContact(idx, 'email', e.target.value)} placeholder="jane@co.com" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label htmlFor={`c-phone-${idx}`} className="text-xs">Phone</Label>
                        <Input id={`c-phone-${idx}`} value={c.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} placeholder="+1 555 0100" className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addContact} className="gap-1.5">
                  <PlusIcon className="h-3.5 w-3.5" />Add contact
                </Button>
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center gap-2 pt-3 border-t border-border-app">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="ghost" size="sm" className="text-text-muted" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < STEP_LABELS.length ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => { void handleSubmit(onSubmit)(); }}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Add job'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
