'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PencilIcon,
  ArchiveIcon,
  ExternalLinkIcon,
  PlusIcon,
  Trash2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import { createClient } from '@/lib/supabase/client';
import { StatusPopover } from '@/components/app/StatusPopover';
import { JobModal } from '@/components/app/JobModal';
import { ReminderSection } from '@/components/app/ReminderSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Job, Contact, ActivityLog, Reminder } from '@/lib/types';

interface JobDetailClientProps {
  job: Job;
  contacts: Contact[];
  activityLog: ActivityLog[];
  reminder: Reminder | null;
  userId: string;
  backHref: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  low: 'var(--color-text-muted)',
  medium: 'var(--color-brand-500)',
  high: 'var(--color-destructive)',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ContactFormState {
  name: string;
  designation: string;
  email: string;
  phone: string;
}

function AddContactForm({ jobId, onAdded }: { jobId: string; onAdded: (c: Contact) => void }) {
  const [form, setForm] = useState<ContactFormState>({ name: '', designation: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ job_id: jobId, name: form.name, designation: form.designation || null, email: form.email || null, phone: form.phone || null }]),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? 'Failed to add contact'); return; }
      onAdded(body.data[0]);
      setForm({ name: '', designation: '', email: '', phone: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-border-app bg-surface-muted p-3 space-y-2 mt-3">
      <p className="text-xs font-medium text-text-muted">New contact</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Name *</Label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" className="h-8 text-sm" required />
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} placeholder="Hiring Manager" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="jane@co.com" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 0100" className="h-8 text-sm" />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Add contact'}</Button>
    </form>
  );
}

export function JobDetailClient({ job: initialJob, contacts: initialContacts, activityLog, reminder: initialReminder, userId, backHref }: JobDetailClientProps) {
  const router = useRouter();
  const { statuses, updateJobOptimistic } = useJobStore();
  const supabase = createClient();

  const [job, setJob] = useState(initialJob);
  const [contacts, setContacts] = useState(initialContacts);
  const [editOpen, setEditOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);

  const [notes, setNotes] = useState(job.notes ?? '');
  const [notesSaveState, setNotesSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [resumePath, setResumePath] = useState(job.resume_path);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingStageDate, setEditingStageDate] = useState(false);
  const [stageDateValue, setStageDateValue] = useState(job.stage_date ?? '');

  async function saveNotes(value: string) {
    setNotesSaveState('saving');
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: value }),
    });
    if (res.ok) {
      setNotesSaveState('saved');
      setTimeout(() => setNotesSaveState('idle'), 2000);
    } else {
      setNotesSaveState('idle');
      toast.error('Failed to save notes');
    }
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    setNotesSaveState('idle');
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(() => saveNotes(value), 1000);
  }

  async function handleSaveStageDate() {
    setEditingStageDate(false);
    if (stageDateValue === job.stage_date) return;
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage_date: stageDateValue || null }),
    });
    if (res.ok) {
      setJob((j) => ({ ...j, stage_date: stageDateValue || null }));
      updateJobOptimistic(job.id, { stage_date: stageDateValue || null });
    } else {
      toast.error('Failed to update stage date');
    }
  }

  async function handleArchive() {
    if (!confirm('Archive this job? You can unarchive it from settings.')) return;
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: true }),
    });
    if (res.ok) {
      updateJobOptimistic(job.id, { is_archived: true });
      router.push('/dashboard');
    } else {
      toast.error('Failed to archive job');
    }
  }

  async function handleRemoveContact(contactId: string) {
    const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } else {
      toast.error('Failed to remove contact');
    }
  }

  async function handleResumeUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return; }
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed'); return; }
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_path: path }),
    });
    if (res.ok) {
      setResumePath(path);
      updateJobOptimistic(job.id, { resume_path: path });
      toast.success('Resume uploaded');
    }
  }

  async function handleRemoveResume() {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_path: null }),
    });
    if (res.ok) {
      setResumePath(null);
      updateJobOptimistic(job.id, { resume_path: null });
    }
  }

  const displayedActivity = showAllActivity ? activityLog : activityLog.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
          Jobs
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleArchive}>
            <ArchiveIcon className="mr-1.5 h-3.5 w-3.5" />Archive
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <PencilIcon className="mr-1.5 h-3.5 w-3.5" />Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border-app bg-surface p-6 space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{job.company}</h1>
              <p className="text-lg text-text-muted">{job.role}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPopover jobId={job.id} currentStatusId={job.status_id} statuses={statuses.length > 0 ? statuses : []} />
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${PRIORITY_COLOR[job.priority]}20`, color: PRIORITY_COLOR[job.priority] }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[job.priority] }} />
                {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} priority
              </span>
              {job.platform && (
                <span className="inline-flex items-center rounded-full border border-border-app bg-surface-muted px-2.5 py-0.5 text-xs text-text-muted">
                  {job.platform.name}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border-app bg-surface p-6 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Stage &amp; Dates</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-text-muted mb-0.5">{job.stage_date_label ?? 'Stage date'}</p>
                {editingStageDate ? (
                  <div className="flex items-center gap-2">
                    <Input type="date" value={stageDateValue} onChange={(e) => setStageDateValue(e.target.value)} onBlur={handleSaveStageDate} className="h-8 w-40 text-sm" autoFocus />
                    <button type="button" onClick={handleSaveStageDate} className="text-brand-500 hover:text-brand-600">
                      <CheckIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setEditingStageDate(true)} className="flex items-center gap-1.5 text-sm text-text-primary hover:text-brand-500 group">
                    {job.stage_date ? formatDate(job.stage_date) : 'No date set'}
                    <PencilIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border-app bg-surface p-6 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {job.location && (<><dt className="text-text-muted">Location</dt><dd className="text-text-primary">{job.location}</dd></>)}
              {job.salary && (<><dt className="text-text-muted">Salary</dt><dd className="text-text-primary">{job.salary}</dd></>)}
              {job.source && (<><dt className="text-text-muted">Source</dt><dd className="text-text-primary">{job.source}</dd></>)}
              {job.url && (
                <><dt className="text-text-muted">Job URL</dt>
                <dd><a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-500 hover:underline">Open posting <ExternalLinkIcon className="h-3 w-3" /></a></dd></>
              )}
            </dl>
          </div>

          {job.job_description && (
            <div className="rounded-xl border border-border-app bg-surface p-6">
              <button type="button" onClick={() => setDescOpen((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary">
                {descOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                {descOpen ? 'Hide' : 'View'} job description
              </button>
              {descOpen && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-md bg-surface-muted p-3 text-sm text-text-primary whitespace-pre-wrap">
                  {job.job_description}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border-app bg-surface p-6 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Notes</h2>
              {notesSaveState === 'saving' && <span className="text-xs text-text-muted">Saving…</span>}
              {notesSaveState === 'saved' && <span className="text-xs text-brand-500">Saved</span>}
            </div>
            <Textarea rows={4} placeholder="Private notes…" value={notes} onChange={(e) => handleNotesChange(e.target.value)} className="text-sm resize-none" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border-app bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Points of Contact</h2>
              <button type="button" onClick={() => setAddContactOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600">
                <PlusIcon className="h-3 w-3" />Add
              </button>
            </div>
            {contacts.length === 0 && !addContactOpen && <p className="text-xs text-text-muted">No contacts yet</p>}
            {contacts.map((c) => (
              <div key={c.id} className="group relative rounded-md border border-border-app bg-surface-muted p-2.5 text-sm">
                <button type="button" onClick={() => handleRemoveContact(c.id)} title="Remove contact" className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-destructive transition">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
                <p className="font-medium text-text-primary">{c.name}</p>
                {c.designation && <p className="text-xs text-text-muted">{c.designation}</p>}
                {c.email && <a href={`mailto:${c.email}`} className="text-xs text-brand-500 hover:underline block">{c.email}</a>}
                {c.phone && <a href={`tel:${c.phone}`} className="text-xs text-text-muted hover:underline block">{c.phone}</a>}
              </div>
            ))}
            {addContactOpen && <AddContactForm jobId={job.id} onAdded={(c) => { setContacts((prev) => [...prev, c]); setAddContactOpen(false); }} />}
          </div>

          <div className="rounded-xl border border-border-app bg-surface p-4 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Resume</h2>
            {resumePath ? (
              <div className="flex items-center justify-between rounded-md border border-border-app bg-surface-muted px-3 py-2 text-sm">
                <span className="truncate text-text-muted text-xs max-w-[180px]" title={resumePath}>{resumePath.split('/').pop()}</span>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <a href={supabase.storage.from('resumes').getPublicUrl(resumePath).data.publicUrl} download target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-600 text-xs" title="Download resume">Download</a>
                  <button type="button" onClick={handleRemoveResume} className="text-destructive hover:text-destructive/80" title="Remove resume"><Trash2Icon className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleResumeUpload(file); e.target.value = ''; }} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Upload Resume</Button>
                <p className="text-xs text-text-muted">.pdf, .doc, .docx — max 5 MB</p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-border-app bg-surface p-4 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Follow-up Reminder</h2>
            <ReminderSection jobId={job.id} initialReminder={initialReminder} />
          </div>

          <div className="rounded-xl border border-border-app bg-surface p-4 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Activity</h2>
            {activityLog.length === 0 ? (
              <p className="text-xs text-text-muted">No activity recorded yet</p>
            ) : (
              <ol className="space-y-2">
                {displayedActivity.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2 text-xs text-text-muted">
                    <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-brand-300" />
                    <span>Moved to <strong className="text-text-primary">{entry.new_status_label}</strong>{' · '}{formatDate(entry.changed_at)}</span>
                  </li>
                ))}
              </ol>
            )}
            {activityLog.length > 5 && (
              <button type="button" onClick={() => setShowAllActivity((v) => !v)} className="text-xs text-brand-500 hover:text-brand-600">
                {showAllActivity ? 'Show less' : `Show all (${activityLog.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-3 border-t border-border-app bg-surface px-4 py-3 shadow-lg lg:hidden">
        <Button variant="outline" className="flex-1" onClick={handleArchive}>
          <ArchiveIcon className="mr-1.5 h-4 w-4" />Archive
        </Button>
        <Button className="flex-1" onClick={() => setEditOpen(true)}>
          <PencilIcon className="mr-1.5 h-4 w-4" />Edit
        </Button>
      </div>

      <JobModal open={editOpen} onOpenChange={setEditOpen} job={job} userId={userId} />
    </div>
  );
}
