'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PencilIcon,
  ArchiveIcon,
  Trash2Icon,
  BellIcon,
  BellRingIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import { usePlatformStore } from '@/store/platformStore';
import { useJobFilters } from '@/hooks/useJobFilters';
import { useJobSort, type SortKey } from '@/hooks/useJobSort';
import { StatusPopover } from '@/components/app/StatusPopover';
import { JobTableEmpty } from '@/components/app/JobTableEmpty';
import { FilterBar } from '@/components/app/FilterBar';
import { JobModal } from '@/components/app/JobModal';
import type { Job, Status, Platform, Reminder } from '@/lib/types';

interface JobTableProps {
  initialJobs: Job[];
  initialStatuses: Status[];
  initialPlatforms: Platform[];
  initialReminders: Reminder[];
  userId: string;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  low: 'var(--color-text-muted)',
  medium: 'var(--color-brand-500)',
  high: 'var(--color-destructive)',
};

function formatStageDate(date: string | null, label: string | null): string {
  if (!date) return '—';
  const d = new Date(date + 'T00:00:00');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const dateStr = `${month} ${day}`;
  return label ? `${label} · ${dateStr}` : dateStr;
}

function SortIcon({ columnKey, currentSort }: { columnKey: SortKey; currentSort: { key: SortKey | null; dir: string } }) {
  if (currentSort.key !== columnKey) {
    return <ArrowUpDownIcon className="ml-1 h-3 w-3 opacity-0 group-hover/th:opacity-40 transition-opacity" />;
  }
  return currentSort.dir === 'asc'
    ? <ArrowUpIcon className="ml-1 h-3 w-3 text-brand-500" />
    : <ArrowDownIcon className="ml-1 h-3 w-3 text-brand-500" />;
}

export function JobTable({
  initialJobs,
  initialStatuses,
  initialPlatforms,
  initialReminders,
  userId,
  addOpen,
  onAddOpenChange,
}: JobTableProps) {
  const router = useRouter();
  const { jobs, statuses, setJobs, setStatuses, removeJobOptimistic, updateJobOptimistic } = useJobStore();
  const { platforms } = usePlatformStore();

  const [editJob, setEditJob] = useState<Job | null>(null);

  useEffect(() => {
    setJobs(initialJobs);
    setStatuses(initialStatuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build a map of job_id → reminder for the bell column
  const today = new Date().toISOString().slice(0, 10);
  const remindersMap = useMemo(() => {
    const m = new Map<string, Reminder>();
    for (const r of initialReminders) {
      if (!r.is_done) m.set(r.job_id, r);
    }
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { filters, filteredJobs, hasActiveFilters, setFilter, clearFilters } = useJobFilters(jobs);
  const { sortedJobs, currentSort, setSort } = useJobSort(filteredJobs);

  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = sortedJobs.length > 50;

  const rowVirtualizer = useVirtualizer({
    count: sortedJobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    enabled: shouldVirtualize,
    overscan: 5,
  });

  async function handleArchive(job: Job, e: React.MouseEvent) {
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

  async function handleDelete(job: Job, e: React.MouseEvent) {
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

  function handleRowClick(job: Job) {
    router.push(`/dashboard/jobs/${job.id}`);
  }

  function handleRowKeyDown(e: React.KeyboardEvent, job: Job) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/dashboard/jobs/${job.id}`);
    }
  }

  const sortableHeader = (key: SortKey, label: string, className?: string) => (
    <th
      scope="col"
      tabIndex={0}
      role="button"
      aria-sort={
        currentSort.key === key
          ? currentSort.dir === 'asc' ? 'ascending' : 'descending'
          : 'none'
      }
      onClick={() => setSort(key)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSort(key); }}
      className={cn(
        'group/th select-none cursor-pointer whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-text-muted hover:text-text-primary transition-colors',
        className,
      )}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon columnKey={key} currentSort={currentSort} />
      </span>
    </th>
  );

  const renderRow = (job: Job) => (
    <tr
      key={job.id}
      onClick={() => handleRowClick(job)}
      onKeyDown={(e) => handleRowKeyDown(e, job)}
      tabIndex={0}
      role="button"
      aria-label={`View ${job.company} — ${job.role}`}
      className={cn(
        'group cursor-pointer border-b border-border-app last:border-0',
        'hover:bg-surface-muted focus-visible:bg-surface-muted transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
      )}
    >
      <td className="w-10 px-3 py-3 text-center">
        <span
          title={`${job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} priority`}
          aria-label={`${job.priority} priority`}
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: PRIORITY_COLOR[job.priority] }}
        />
      </td>
      <td className="min-w-[180px] px-3 py-3">
        <span className="font-medium text-sm text-text-primary">{job.company}</span>
      </td>
      <td className="min-w-[200px] flex-1 px-3 py-3 max-w-[300px]">
        <span className="block truncate text-sm text-text-primary" title={job.role}>{job.role}</span>
      </td>
      <td className="w-[140px] px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <StatusPopover jobId={job.id} currentStatusId={job.status_id} statuses={statuses} />
      </td>
      <td className="w-[120px] px-3 py-3">
        <span className="text-sm text-text-muted">{job.platform?.name ?? '—'}</span>
      </td>
      <td className="w-[140px] px-3 py-3">
        <span className="text-xs text-text-muted truncate block">
          {formatStageDate(job.stage_date, job.stage_date_label)}
        </span>
      </td>
      <td className="w-[120px] px-3 py-3">
        <span className="text-sm text-text-muted truncate block" title={job.salary ?? ''}>{job.salary || '—'}</span>
      </td>
      <td className="w-12 px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        {(() => {
          const r = remindersMap.get(job.id);
          if (!r) {
            return (
              <span title="No reminder set" aria-label="No reminder set">
                <BellIcon className="inline-block h-4 w-4 text-text-muted opacity-30" />
              </span>
            );
          }
          const overdue = r.remind_at < today;
          return (
            <span
              title={overdue ? `Overdue since ${r.remind_at}` : `Follow up by ${r.remind_at}`}
              aria-label={overdue ? `Overdue reminder since ${r.remind_at}` : `Reminder: follow up by ${r.remind_at}`}
            >
              <BellRingIcon
                className={cn(
                  'inline-block h-4 w-4',
                  overdue ? 'text-destructive animate-pulse' : 'text-brand-500',
                )}
              />
            </span>
          );
        })()}
      </td>
      <td className="w-24 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`Edit ${job.company} - ${job.role}`} title="Edit job"
            onClick={(e) => { e.stopPropagation(); setEditJob(job); }}
            className="p-1 rounded text-text-muted hover:text-brand-500 hover:bg-surface-muted transition-colors">
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={`Archive ${job.company} - ${job.role}`} title="Archive job"
            onClick={(e) => handleArchive(job, e)}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
            <ArchiveIcon className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={`Delete ${job.company} - ${job.role}`} title="Delete job"
            onClick={(e) => handleDelete(job, e)}
            className="p-1 rounded text-text-muted hover:text-destructive hover:bg-surface-muted transition-colors">
            <Trash2Icon className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );

  const effectivePlatforms = platforms.length > 0 ? platforms : initialPlatforms;

  return (
    <section aria-label="Active jobs" className="space-y-4">
      <FilterBar
        filters={filters}
        statuses={statuses.length > 0 ? statuses : initialStatuses}
        platforms={effectivePlatforms}
        hasActiveFilters={hasActiveFilters}
        onSetFilter={setFilter}
        onClearFilters={clearFilters}
      />

      {sortedJobs.length === 0 ? (
        <JobTableEmpty hasFilters={hasActiveFilters} onAddJob={() => onAddOpenChange(true)} onClearFilters={clearFilters} />
      ) : (
        <div
          ref={parentRef}
          className="w-full overflow-auto rounded-lg border border-border-app bg-surface"
          style={shouldVirtualize ? { height: '600px' } : undefined}
        >
          <table className="w-full border-collapse text-sm" aria-label="Jobs table">
            <thead className="sticky top-0 z-10 bg-surface-muted border-b border-border-app">
              <tr>
                <th scope="col" className="w-10 px-3 py-2.5 text-center text-xs font-medium text-text-muted">
                  <span className="sr-only">Priority</span>
                </th>
                {sortableHeader('company', 'Company', 'min-w-[180px]')}
                {sortableHeader('role', 'Role', 'min-w-[200px]')}
                <th scope="col" className="w-[140px] px-3 py-2.5 text-left text-xs font-medium text-text-muted">Status</th>
                {sortableHeader('platform', 'Platform', 'w-[120px]')}
                {sortableHeader('stage_date', 'Stage Date', 'w-[140px]')}
                {sortableHeader('salary', 'Salary', 'w-[120px]')}
                <th scope="col" className="w-12 px-2 py-2.5 text-center text-xs font-medium text-text-muted">
                  <span className="sr-only">Reminder</span>
                  <BellIcon className="inline-block h-3.5 w-3.5" />
                </th>
                <th scope="col" className="w-24 px-3 py-2.5 text-xs font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shouldVirtualize ? (
                <tr style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  <td colSpan={9} className="p-0">
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const job = sortedJobs[virtualRow.index];
                      return (
                        <div key={job.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                          <table className="w-full border-collapse"><tbody>{renderRow(job)}</tbody></table>
                        </div>
                      );
                    })}
                  </td>
                </tr>
              ) : (
                sortedJobs.map((job) => renderRow(job))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal — add modal lives in DashboardTabs */}
      <JobModal open={!!editJob} onOpenChange={(v) => { if (!v) setEditJob(null); }} job={editJob ?? undefined} userId={userId} />
    </section>
  );
}
