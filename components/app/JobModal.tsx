'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLinkIcon, Loader2, Loader2Icon, PlusIcon, Trash2Icon, WandIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ExtractedFieldsPreview, type ExtractResult } from '@/components/app/ExtractedFieldsPreview';
import { ResumeSection } from '@/components/app/ResumeSection';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

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

  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [descOpen, setDescOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [removeResume, setRemoveResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job-description extraction state
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showExtract, setShowExtract] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    getValues,
    reset,
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
      stage_date: '',
      stage_date_label: '',
      source_platform_id: null,
      source: '',
      salary: '',
      notes: '',
      resume: null,
      is_archived: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (job) {
      reset({
        company: job.company,
        role: job.role,
        location: job.location ?? '',
        url: job.url ?? '',
        job_description: job.job_description ?? '',
        status_id: job.status_id ?? null,
        priority: job.priority ?? 'medium',
        stage_date: job.stage_date ?? '',
        stage_date_label: job.stage_date_label ?? '',
        source_platform_id: job.source_platform_id ?? null,
        source: job.source ?? '',
        salary: job.salary ?? '',
        notes: job.notes ?? '',
        resume: null,
        is_archived: job.is_archived,
      });
    } else {
      reset({
        company: '',
        role: '',
        location: '',
        url: '',
        job_description: '',
        status_id: null,
        priority: 'medium',
        stage_date: '',
        stage_date_label: '',
        source_platform_id: null,
        source: '',
        salary: '',
        notes: '',
        resume: null,
        is_archived: false,
      });
    }
    setResumeFile(null);
    setRemoveResume(false);
    setDescOpen(false);
    setExtractUrl('');
    setExtractResult(null);
    setExtractError(null);
    setShowExtract(false);
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

  function addContact() {
    setContacts((prev) => [...prev, { name: '', designation: '', email: '', phone: '', isNew: true }]);
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
        stage_date: values.stage_date || null,
        stage_date_label: values.stage_date_label || null,
        source_platform_id: values.source_platform_id || null,
        source: values.source || null,
        salary: values.salary || null,
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

  const watchUrl = useWatch({ control, name: 'url' });
  const watchPriority = useWatch({ control, name: 'priority' });
  const watchPlatformId = useWatch({ control, name: 'source_platform_id' });
  const watchJobDescription = useWatch({ control, name: 'job_description' });

  async function runExtraction(payload: { text?: string; url?: string }) {
    setExtracting(true);
    setExtractResult(null);
    setExtractError(null);
    setShowExtract(true);
    try {
      const res = await fetch('/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExtractError(body.error ?? 'Extraction failed');
      } else {
        setExtractResult(body.data as ExtractResult);
      }
    } catch {
      setExtractError('Extraction failed. Please try again.');
    } finally {
      setExtracting(false);
    }
  }

  function handleApplyField(field: 'company' | 'role' | 'location' | 'salary', value: string) {
    setValue(field, value);
  }

  function handleApplyAll() {
    if (!extractResult) return;
    let count = 0;
    if (extractResult.company) { setValue('company', extractResult.company); count++; }
    if (extractResult.role) { setValue('role', extractResult.role); count++; }
    if (extractResult.location) { setValue('location', extractResult.location); count++; }
    if (extractResult.salary) { setValue('salary', extractResult.salary); count++; }
    toast.success(`${count} field${count !== 1 ? 's' : ''} filled in`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? 'Edit Job' : 'Add Job'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Core Details ── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-text-primary mb-3">Core Details</legend>

            <div className="space-y-1.5">
              <Label htmlFor="j-company">Company <span aria-hidden>*</span></Label>
              <Input id="j-company" placeholder="e.g. Acme Corp" {...register('company')} aria-describedby={errors.company ? 'j-company-err' : undefined} />
              {errors.company && <p id="j-company-err" role="alert" className="text-sm text-destructive">{errors.company.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="j-role">Role <span aria-hidden>*</span></Label>
              <Input id="j-role" placeholder="e.g. Frontend Engineer" {...register('role')} aria-describedby={errors.role ? 'j-role-err' : undefined} />
              {errors.role && <p id="j-role-err" role="alert" className="text-sm text-destructive">{errors.role.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="j-location">Location</Label>
              <Input id="j-location" placeholder="e.g. Remote, New York, NY" {...register('location')} />
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
              {errors.url && <p role="alert" className="text-sm text-destructive">{errors.url.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <button type="button" onClick={() => setDescOpen(prev => !prev)} className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-primary">
                {descOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                Job description
              </button>
              {descOpen && (
                <div className="space-y-2">
                  {/* Import from URL */}
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="Paste job posting URL..."
                      value={extractUrl}
                      onChange={(e) => setExtractUrl(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!extractUrl.trim() || extracting}
                      onClick={() => runExtraction({ url: extractUrl.trim() })}
                      className="h-8 shrink-0 gap-1.5 text-xs"
                    >
                      {extracting && !watchJobDescription
                        ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                        : null}
                      Fetch
                    </Button>
                  </div>

                  {/* Job description textarea + Extract button */}
                  <div className="relative">
                    <Textarea id="j-desc" rows={6} placeholder="Paste the job description here…" {...register('job_description')} />
                    {watchJobDescription && watchJobDescription.length > 50 && (
                      <button
                        type="button"
                        aria-label="Extract job details from description"
                        onClick={() => runExtraction({ text: watchJobDescription })}
                        disabled={extracting}
                        className="absolute right-2 top-2 flex items-center gap-1 rounded bg-surface px-2 py-1 text-xs font-medium text-brand-500 shadow-sm border border-border-app hover:bg-surface-muted transition-colors disabled:opacity-50"
                      >
                        {extracting && watchJobDescription
                          ? <Loader2Icon className="h-3 w-3 animate-spin" />
                          : <WandIcon className="h-3 w-3" />}
                        Extract details
                      </button>
                    )}
                  </div>

                  {/* Extraction preview */}
                  {showExtract && (
                    <ExtractedFieldsPreview
                      result={extractResult ?? { company: null, role: null, location: null, salary: null, confidence: { company: null, role: null, location: null, salary: null } }}
                      loading={extracting}
                      error={extractError}
                      currentValues={{
                        company: getValues('company') ?? '',
                        role: getValues('role') ?? '',
                        location: getValues('location') ?? '',
                        salary: getValues('salary') ?? '',
                      }}
                      onApply={handleApplyField}
                      onApplyAll={handleApplyAll}
                      onDismiss={() => setShowExtract(false)}
                      onRetry={() => {
                        if (extractUrl.trim()) runExtraction({ url: extractUrl.trim() });
                        else if (watchJobDescription) runExtraction({ text: watchJobDescription });
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </fieldset>

          {/* ── Status & Priority ── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-text-primary mb-3">Status &amp; Priority</legend>

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

            <div className="space-y-1.5">
              <Label htmlFor="j-source">Source (manual)</Label>
              <Input id="j-source" placeholder="e.g. LinkedIn, Referral" {...register('source')} />
            </div>
          </fieldset>

          {/* ── Compensation ── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-text-primary mb-3">Compensation</legend>
            <div className="space-y-1.5">
              <Label htmlFor="j-salary">Salary / Range</Label>
              <Input id="j-salary" placeholder="e.g. $90k–$120k" {...register('salary')} />
            </div>
          </fieldset>

          {/* ── Resume ── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-text-primary mb-3">Resume</legend>
            {isEdit && job ? (
              <ResumeSection jobId={job.id} initialResumePath={job.resume_path ?? null} />
            ) : (
              <p className="text-xs text-text-muted">
                You can upload a resume after saving this job.
              </p>
            )}
          </fieldset>

          {/* ── Notes ── */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-text-primary mb-3">Notes</legend>
            <Textarea id="j-notes" rows={3} placeholder="Private notes…" {...register('notes')} />
          </fieldset>

          {/* ── Contacts ── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-text-primary">Points of Contact</legend>
            {contacts.map((c, idx) => (
              <div key={idx} className="rounded-md border border-border-app bg-surface-muted p-3 space-y-2">
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
            <Button type="button" variant="outline" size="sm" onClick={addContact}>
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />Add contact
            </Button>
          </fieldset>

          {/* ── Submit ── */}
          <div className="flex gap-2 pt-2 border-t border-border-app">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add job'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
