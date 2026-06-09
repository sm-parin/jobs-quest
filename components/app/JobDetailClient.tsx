'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PencilIcon,
  ArchiveIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import { StatusPopover } from '@/components/app/StatusPopover';
import { JobModal } from '@/components/app/JobModal';
import { ReminderSection } from '@/components/app/ReminderSection';
import { ContactPanel } from '@/components/app/ContactPanel';
import { ActivityLogTimeline } from '@/components/app/ActivityLogTimeline';
import { ResumeSection } from '@/components/app/ResumeSection';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Job, Contact, ActivityLog, Reminder } from '@/lib/types';

interface JobDetailClientProps {
  job: Job;
  contacts: Contact[];
  activityLog: ActivityLog[];
  activityTotal: number;
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

export function JobDetailClient({ job: initialJob, contacts: initialContacts, activityLog, activityTotal, reminder: initialReminder, userId, backHref }: JobDetailClientProps) {
  const router = useRouter();
  const { statuses, updateJobOptimistic } = useJobStore();

  const [job, setJob] = useState(initialJob);
  const [editOpen, setEditOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [notes, setNotes] = useState(job.notes ?? '');
  const [notesSaveState, setNotesSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // stage_date removed from UI

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

  // stage_date removed from UI

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

          {/* Stage & Dates removed per UX change */}

          <div className="rounded-xl border border-border-app bg-surface p-6 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {job.location && (<><dt className="text-text-muted">Location</dt><dd className="text-text-primary">{job.location}</dd></>)}
              {job.work_type && (<><dt className="text-text-muted">Type</dt><dd className="text-text-primary capitalize">{job.work_type}</dd></>)}
              {job.salary && (<><dt className="text-text-muted">Salary</dt><dd className="text-text-primary">{job.salary}</dd></>)}
              {job.contact_email && (<><dt className="text-text-muted">Your email</dt><dd className="text-text-primary">{job.contact_email}</dd></>)}
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
                <div className="mt-3 rounded-md bg-surface-muted p-3 text-sm text-text-primary whitespace-pre-wrap">
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
            <ContactPanel jobId={job.id} initialContacts={initialContacts} />
          </div>

          <div className="rounded-xl border border-border-app bg-surface p-4 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Resume</h2>
            <ErrorBoundary>
              <ResumeSection jobId={job.id} initialResumePath={job.resume_path} />
            </ErrorBoundary>
          </div>

          <div className="rounded-xl border border-border-app bg-surface p-4 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Follow-up Reminder</h2>
            <ReminderSection jobId={job.id} initialReminder={initialReminder} />
          </div>

          <div id="activity" className="rounded-xl border border-border-app bg-surface p-4">
            <ActivityLogTimeline
              jobId={job.id}
              initialEntries={activityLog}
              initialTotal={activityTotal}
              jobCreatedAt={job.created_at}
            />
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
