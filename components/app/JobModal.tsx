'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ExternalLinkIcon,
  FileTextIcon,
  Loader2,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { jobSchema, type JobValues } from '@/lib/schemas';
import { useJobStore } from '@/store/jobStore';
import { usePlatformStore } from '@/store/platformStore';
import { createClient } from '@/lib/supabase/client';
import type { Job, Reminder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

const STEP_LABELS = ['Job Details', 'Contacts', 'Stage & Priority'] as const;

interface ContactMethod {
  type: string;
  value: string;
}

interface ContactDraft {
  id?: string;
  name: string;
  designation: string;
  role: string;
  platform: string;
  methods: ContactMethod[];
  isNew?: boolean;
}

interface JobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job;
  initialReminder?: Reminder | null;
  userId: string;
}

export function JobModal({ open, onOpenChange, job, initialReminder, userId }: JobModalProps) {
  const isEdit = !!job;
  const { statuses, addJobOptimistic, updateJobOptimistic, fetchJobs } = useJobStore();
  const { platforms } = usePlatformStore();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [removeResume, setRemoveResume] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const resumeInputRef = useRef<HTMLInputElement>(null);

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
    setResumeFile(null);
    setRemoveResume(false);
    setReminderDate(
      initialReminder && !initialReminder.is_done ? initialReminder.remind_at : '',
    );

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
        contact_email: '',
        notes: job.notes ?? '',
        resume: null,
        is_archived: job.is_archived,
      });
      setContacts(
        job.contacts
          ? job.contacts.map((c) => ({
              id: c.id,
              name: c.name,
              designation: c.designation ?? '',
              role: c.role ?? '',
              platform: c.platform ?? '',
              methods: Array.isArray(c.contact_methods) ? c.contact_methods : [],
            }))
          : [],
      );
    } else {
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
        contact_email: '',
        notes: '',
        resume: null,
        is_archived: false,
      });
      setContacts([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job]);

  const watchStatusId = useWatch({ control, name: 'status_id' });
  const watchUrl = useWatch({ control, name: 'url' });
  const watchPriority = useWatch({ control, name: 'priority' });
  const watchPlatformId = useWatch({ control, name: 'source_platform_id' });
  const watchWorkType = useWatch({ control, name: 'work_type' });

  // Auto-fill stage fields when status changes
  useEffect(() => {
    if (!watchStatusId) return;
    const status = statuses.find((s) => s.id === watchStatusId);
    if (!status) return;
    if (!getValues('stage_date_label')) setValue('stage_date_label', status.label);
    if (!getValues('stage_date')) setValue('stage_date', new Date().toISOString().slice(0, 10));
  }, [watchStatusId, statuses, getValues, setValue]);

  async function handleNext() {
    if (step === 1) {
      const valid = await trigger(['company', 'role']);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length));
  }

  // ── Contact helpers ──────────────────────────────────────────────────────
  function addContact() {
    setContacts((prev) => [
      ...prev,
      { name: '', designation: '', role: '', platform: '', methods: [], isNew: true },
    ]);
  }

  function removeContact(idx: number) {
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateContactField(
    idx: number,
    field: 'name' | 'designation' | 'role' | 'platform',
    value: string,
  ) {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  function addMethod(contactIdx: number) {
    setContacts((prev) =>
      prev.map((c, i) =>
        i === contactIdx ? { ...c, methods: [...c.methods, { type: '', value: '' }] } : c,
      ),
    );
  }

  function removeMethod(contactIdx: number, methodIdx: number) {
    setContacts((prev) =>
      prev.map((c, i) =>
        i === contactIdx
          ? { ...c, methods: c.methods.filter((_, mi) => mi !== methodIdx) }
          : c,
      ),
    );
  }

  function updateMethod(
    contactIdx: number,
    methodIdx: number,
    field: 'type' | 'value',
    val: string,
  ) {
    setContacts((prev) =>
      prev.map((c, i) =>
        i === contactIdx
          ? {
              ...c,
              methods: c.methods.map((m, mi) =>
                mi === methodIdx ? { ...m, [field]: val } : m,
              ),
            }
          : c,
      ),
    );
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function onSubmit(values: JobValues) {
    try {
      let resumePath = job?.resume_path ?? null;
      if (removeResume) resumePath = null;
      if (resumeFile) {
        const ext = resumeFile.name.split('.').pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(path, resumeFile, { upsert: true });
        if (uploadError) { toast.error('Failed to upload resume'); return; }
        resumePath = path;
      }

      const payload = {
        company: values.company,
        role: values.role,
        location: values.location || null,
        url: values.url || null,
        job_description: null,
        status_id: values.status_id || null,
        priority: values.priority,
        work_type: values.work_type || null,
        stage_date: values.stage_date || null,
        stage_date_label: values.stage_date_label || null,
        source_platform_id: values.source_platform_id || null,
        source: null,
        salary: null,
        contact_email: null,
        notes: values.notes || null,
        resume_path: resumePath,
        is_archived: values.is_archived ?? false,
      };

      const validContacts = contacts.filter((c) => c.name.trim());

      const buildContactPayload = (c: ContactDraft) => ({
        name: c.name,
        designation: c.designation || undefined,
        role: c.role || undefined,
        platform: c.platform || undefined,
        contact_methods: c.methods.filter((m) => m.type.trim() || m.value.trim()),
      });

      if (isEdit && job) {
        const res = await fetch(`/api/jobs/${job.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error((body as { error?: string }).error ?? 'Failed to update job');
          return;
        }
        const { data } = await res.json();
        updateJobOptimistic(job.id, data);

        const newContacts = validContacts.filter((c) => c.isNew);
        if (newContacts.length > 0) {
          await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: job.id, contacts: newContacts.map(buildContactPayload) }),
          });
        }
        for (const c of validContacts.filter((c) => c.id && !c.isNew)) {
          await fetch(`/api/contacts/${c.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildContactPayload(c)),
          });
        }

        await saveReminder(job.id, initialReminder ?? null);
        fetchJobs();
      } else {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error((body as { error?: string }).error ?? 'Failed to add job');
          return;
        }
        const { data } = await res.json();
        addJobOptimistic(data);

        if (validContacts.length > 0) {
          await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: data.id, contacts: validContacts.map(buildContactPayload) }),
          });
        }

        await saveReminder(data.id, null);
      }

      toast.success(isEdit ? 'Job updated' : 'Job added');
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function saveReminder(jobId: string, existing: Reminder | null) {
    if (!reminderDate && !existing) return;
    if (reminderDate && existing && !existing.is_done && existing.remind_at === reminderDate) return;

    if (reminderDate) {
      if (existing && !existing.is_done) {
        await fetch(`/api/reminders/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remind_at: reminderDate }),
        });
      } else {
        await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId, remind_at: reminderDate }),
        });
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Job' : 'Add Job'}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 py-1">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  isActive ? 'bg-brand-500 text-white' : isDone ? 'bg-brand-100 text-brand-600' : 'bg-surface-muted text-text-muted',
                )}>
                  {s}
                </div>
                <span className={cn('text-xs font-medium hidden sm:block truncate', isActive ? 'text-text-primary' : 'text-text-muted')}>
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

          {/* ── Step 1: Job Details ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-company">Company <span aria-hidden>*</span></Label>
                  <Input id="j-company" placeholder="Acme Corp" {...register('company')} />
                  {errors.company && (
                    <p role="alert" className="text-xs text-destructive">{errors.company.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-role">Role <span aria-hidden>*</span></Label>
                  <Input id="j-role" placeholder="Frontend Engineer" {...register('role')} />
                  {errors.role && (
                    <p role="alert" className="text-xs text-destructive">{errors.role.message as string}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-location">Location</Label>
                  <Input id="j-location" placeholder="Remote, New York…" {...register('location')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={watchWorkType ?? ''}
                    onValueChange={(v) =>
                      setValue('work_type', (v || null) as 'on-site' | 'remote' | 'hybrid' | null)
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Work type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not specified</SelectItem>
                      <SelectItem value="on-site">On-site</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="j-status">Status</Label>
                  <Select value={watchStatusId ?? ''} onValueChange={(v) => setValue('status_id', v || null)}>
                    <SelectTrigger id="j-status">
                      <span className="flex items-center gap-2 truncate">
                        {watchStatusId ? (
                          <>
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: statuses.find((x) => x.id === watchStatusId)?.color }} />
                            <span className="truncate">{statuses.find((x) => x.id === watchStatusId)?.label}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Select status</span>
                        )}
                      </span>
                      <SelectValue className="sr-only">{statuses.find((x) => x.id === watchStatusId)?.label ?? ''}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="j-platform">Platform</Label>
                  <Combobox
                    options={platforms.map((p) => ({ value: p.id, label: p.name }))}
                    value={watchPlatformId ?? getValues('source') ?? ''}
                    onValueChange={(v: string | null) => {
                      if (v) {
                        // Check if it's an existing platform ID
                        if (platforms.some((p) => p.id === v)) {
                          setValue('source_platform_id', v);
                          setValue('source', null);
                        } else {
                          // It's custom text entered by user
                          setValue('source_platform_id', null);
                          setValue('source', v);
                        }
                      } else {
                        // Cleared
                        setValue('source_platform_id', null);
                        setValue('source', null);
                      }
                    }}
                    placeholder="Select or type platform..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-url">Job posting URL</Label>
                <div className="relative">
                  <Input id="j-url" type="url" placeholder="https://" {...register('url')} className="pr-9" />
                  {watchUrl && (
                    <a href={watchUrl} target="_blank" rel="noopener noreferrer" aria-label="Open posting"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-500">
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {errors.url && <p role="alert" className="text-xs text-destructive">{errors.url.message as string}</p>}
              </div>

              {/* Resume upload */}
              <div className="space-y-1.5">
                <Label>Resume</Label>
                {isEdit && job?.resume_path && !removeResume && !resumeFile ? (
                  <div className="flex items-center gap-2 rounded-md border border-border-app bg-surface-muted px-3 py-2">
                    <FileTextIcon className="h-4 w-4 text-text-muted shrink-0" />
                    <span className="flex-1 truncate text-sm text-text-primary">Current resume</span>
                    <button type="button" onClick={() => setRemoveResume(true)}
                      className="text-text-muted hover:text-destructive transition-colors">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : resumeFile ? (
                  <div className="flex items-center gap-2 rounded-md border border-brand-500/40 bg-brand-500/5 px-3 py-2">
                    <FileTextIcon className="h-4 w-4 text-brand-500 shrink-0" />
                    <span className="flex-1 truncate text-sm text-text-primary">{resumeFile.name}</span>
                    <button type="button"
                      onClick={() => { setResumeFile(null); if (resumeInputRef.current) resumeInputRef.current.value = ''; }}
                      className="text-text-muted hover:text-destructive transition-colors">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {!resumeFile && (
                  <>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      id="j-resume"
                      accept=".pdf,.doc,.docx"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 5 * 1024 * 1024) { toast.error('File exceeds 5 MB'); return; }
                        setResumeFile(f);
                        setRemoveResume(false);
                      }}
                    />
                    <label htmlFor="j-resume"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border-app px-3 py-2 text-sm text-text-muted hover:border-brand-500 hover:text-brand-500 transition-colors">
                      <UploadIcon className="h-3.5 w-3.5" />
                      {isEdit && job?.resume_path && !removeResume ? 'Replace resume' : 'Upload resume'}
                    </label>
                    <p className="text-xs text-text-muted mt-0.5">PDF, DOC or DOCX · max 5 MB</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Contacts ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              {contacts.length === 0 && (
                <p className="text-sm text-text-muted py-2">
                  No contacts yet. Add someone to follow up with.
                </p>
              )}

              {contacts.map((c, idx) => (
                <div key={idx} className="rounded-lg border border-border-app bg-surface-muted p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Contact {idx + 1}
                    </span>
                    <button type="button" onClick={() => removeContact(idx)}
                      aria-label="Remove contact"
                      className="text-text-muted hover:text-destructive transition-colors">
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Info fields */}
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { field: 'name' as const, label: 'Name', placeholder: 'Jane Smith' },
                        { field: 'designation' as const, label: 'Designation', placeholder: 'Hiring Manager' },
                        { field: 'role' as const, label: 'Role', placeholder: 'Recruiter' },
                        { field: 'platform' as const, label: 'Platform', placeholder: 'LinkedIn' },
                      ] as const
                    ).map(({ field, label, placeholder }) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={c[field]}
                          onChange={(e) => updateContactField(idx, field, e.target.value)}
                          placeholder={placeholder}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Contact methods */}
                  {c.methods.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-text-muted">Contact methods</Label>
                      <div className="space-y-1.5">
                        {c.methods.map((m, mi) => (
                          <div key={mi} className="flex items-center gap-1.5">
                            <Input
                              value={m.type}
                              onChange={(e) => updateMethod(idx, mi, 'type', e.target.value)}
                              placeholder="type (email, linkedin…)"
                              className="h-7 text-xs w-36 shrink-0"
                            />
                            <Input
                              value={m.value}
                              onChange={(e) => updateMethod(idx, mi, 'value', e.target.value)}
                              placeholder="value"
                              className="h-7 text-xs flex-1"
                            />
                            <button type="button" onClick={() => removeMethod(idx, mi)}
                              className="shrink-0 text-text-muted hover:text-destructive transition-colors">
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={() => addMethod(idx)}
                    className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors">
                    <PlusIcon className="h-3 w-3" /> Add method
                  </button>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addContact} className="gap-1.5 w-full">
                <PlusIcon className="h-3.5 w-3.5" /> Add contact
              </Button>
            </div>
          )}

          {/* ── Step 3: Stage & Priority ────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
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
                <Label htmlFor="j-reminder">Follow-up reminder</Label>
                <Input
                  id="j-reminder"
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                />
                <p className="text-xs text-text-muted">
                  You&apos;ll be reminded to follow up on this date.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <div className="flex rounded-md border border-border-app overflow-hidden" role="group" aria-label="Priority">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setValue('priority', opt.value)}
                      className={cn(
                        'flex-1 py-1.5 text-sm transition-colors',
                        watchPriority === opt.value
                          ? 'bg-brand-500 text-white font-medium'
                          : 'bg-surface text-text-muted hover:bg-surface-muted',
                      )}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="j-notes">Notes</Label>
                <Textarea id="j-notes" rows={3} placeholder="Private notes…" {...register('notes')} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2 pt-3 border-t border-border-app">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="ghost" size="sm" className="text-text-muted"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < STEP_LABELS.length ? (
              <Button type="button" onClick={handleNext}>Next</Button>
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
