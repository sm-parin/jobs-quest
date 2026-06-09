'use client';

import { useRouter } from 'next/navigation';
import {
  BellIcon,
  BellRingIcon,
  MoreVerticalIcon,
  PencilIcon,
  ArchiveIcon,
  Trash2Icon,
  HistoryIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import { StatusPopover } from '@/components/app/StatusPopover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Job, Status, Reminder } from '@/lib/types';

interface JobCardProps {
  job: Job;
  statuses: Status[];
  reminder?: Reminder;
  onEdit: (job: Job) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  low: 'var(--color-text-muted)',
  medium: 'var(--color-brand-500)',
  high: 'var(--color-destructive)',
};

// stage_date and stage_date_label removed from UI

export function JobCard({ job, statuses, reminder, onEdit }: JobCardProps) {
  const router = useRouter();
  const { removeJobOptimistic, updateJobOptimistic, jobs, setJobs } = useJobStore();
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = reminder && !reminder.is_done && reminder.remind_at < today;

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    updateJobOptimistic(job.id, { is_archived: true });
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: true }),
    });
    if (!res.ok) {
      updateJobOptimistic(job.id, { is_archived: false });
      toast.error('Failed to archive job');
    } else {
      toast.success('Job archived');
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${job.company} — ${job.role}"? This cannot be undone.`)) return;
    removeJobOptimistic(job.id);
    const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete job');
      setJobs([job, ...jobs]);
    } else {
      toast.success('Job deleted');
    }
  }

  function navigate(e: React.MouseEvent) {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], a, [data-state]')) return;
    router.push(`/dashboard/jobs/${job.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/dashboard/jobs/${job.id}`);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View ${job.company} — ${job.role}`}
      onClick={navigate}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative rounded-lg border border-border-app bg-surface p-4 mb-3 cursor-pointer',
        'hover:bg-surface-muted transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
      )}
    >
      {/* Top row: priority + company + menu */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_COLOR[job.priority] }}
            aria-label={`${job.priority} priority`}
          />
          <span className="text-sm font-semibold text-text-primary truncate">{job.company}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 -mt-1 -mr-1">
          {reminder && (
            <span
              title={isOverdue ? 'Overdue reminder' : 'Reminder set'}
              aria-label={isOverdue ? 'Overdue reminder' : 'Reminder set'}
              className={cn(
                'inline-flex items-center',
                isOverdue ? 'text-destructive' : 'text-brand-500',
              )}
            >
              {isOverdue
                ? <BellRingIcon className={cn('h-4 w-4', isOverdue && 'animate-pulse')} aria-hidden="true" />
                : <BellIcon className="h-4 w-4" aria-hidden="true" />}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label="Job options"
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
            >
              <MoreVerticalIcon className="h-4 w-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(job); }}>
                <PencilIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/jobs/${job.id}#activity`); }}>
                <HistoryIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                View Activity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchive}>
                <ArchiveIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Role */}
      <p className="text-sm text-text-muted truncate mb-2">{job.role}</p>

      {/* Status + Platform */}
      <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
        <StatusPopover jobId={job.id} currentStatusId={job.status_id} statuses={statuses} />
        {job.platform && (
          <span className="inline-flex items-center rounded-full border border-border-app bg-surface-muted px-2 py-0.5 text-xs text-text-muted">
            {job.platform.name}
          </span>
        )}
      </div>

      {/* Bottom: salary */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>—</span>
        {job.salary && (
          <span className="truncate max-w-[120px] text-right">{job.salary}</span>
        )}
      </div>
    </div>
  );
}
