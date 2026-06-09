'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PencilIcon,
  ArchiveIcon,
  Trash2Icon,
  BellIcon,
  BellRingIcon,
  HistoryIcon,
  PaperclipIcon,
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
import { ActivityPeekPopover } from '@/components/app/ActivityPeekPopover';
import { ColumnFilter, type FilterOption } from '@/components/ui/ColumnFilter';
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

const WORK_TYPE_OPTIONS: FilterOption[] = [
  { value: 'on-site', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

const PRIORITY_OPTIONS: FilterOption[] = [
  { value: 'high', label: 'High', color: 'var(--color-destructive)' },
  { value: 'medium', label: 'Medium', color: 'var(--color-brand-500)' },
  { value: 'low', label: 'Low', color: 'var(--color-text-muted)' },
];

// stage_date and stage_date_label removed from UI

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
  const [editJobReminder, setEditJobReminder] = useState<Reminder | null>(null);
  const [peekJob, setPeekJob] = useState<Job | null>(null);
  const [peekCoords, setPeekCoords] = useState({ top: 0, left: 0 });

  function openPeek(job: Job, btn: HTMLButtonElement) {
    const rect = btn.getBoundingClientRect();
    setPeekCoords({ top: rect.bottom + 4, left: rect.right - 320 });
    setPeekJob(job);
  }

  useEffect(() => {
    setJobs(initialJobs);
    setStatuses(initialStatuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const remindersMap = useMemo(() => {
    const m = new Map<string, Reminder>();
    for (const r of initialReminders) {
      if (!r.is_done) m.set(r.job_id, r);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return m;
  }, []);

  const { filters, filteredJobs, hasActiveFilters, setFilter, clearFilters } = useJobFilters(jobs, initialReminders);
  const { sortedJobs, currentSort, setSort } = useJobSort(filteredJobs, initialReminders);

  const effectivePlatforms = platforms.length > 0 ? platforms : initialPlatforms;
  const effectiveStatuses = statuses.length > 0 ? statuses : initialStatuses;

  const statusOptions: FilterOption[] = effectiveStatuses.map((s) => ({ value: s.id, label: s.label, color: s.color }));
  const platformOptions: FilterOption[] = effectivePlatforms.map((p) => ({ value: p.id, label: p.name }));

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

  // Helper to build filter+sort column header
  const filterHeader = (
    key: SortKey,
    label: string,
    className: string,
    filterOptions?: FilterOption[],
    filterParam?: string,
    selectedFilterValues?: string[],
    onFilterChange?: (values: string[]) => void,
  ) => (
    <th
      scope="col"
      className={cn(
        'group/th select-none whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-muted',
        className,
      )}
    >
      <span className="inline-flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setSort(key)}
          className="hover:text-text-primary transition-colors"
        >
          {label}
        </button>
        <ColumnFilter
          label={label}
          sortDir={currentSort.key === key ? currentSort.dir : null}
          onSortAsc={() => setSort(key, 'asc')}
          onSortDesc={() => setSort(key, 'desc')}
          options={filterOptions}
          selectedValues={selectedFilterValues}
          onFilterChange={onFilterChange}
          isActive={(selectedFilterValues?.length ?? 0) > 0 || currentSort.key === key}
        />
      </span>
    </th>
  );

  const renderRow = (job: Job) => {
    const reminder = remindersMap.get(job.id);
    const isOverdue = reminder && reminder.remind_at < today;

    return (
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
        {/* Company + Role stacked */}
        <td className="min-w-[240px] px-3 py-3 max-w-[320px]">
          <div className="flex flex-col">
            <span className="font-medium text-sm text-text-primary truncate">{job.company}</span>
            <span className="text-sm text-text-muted truncate" title={job.role}>{job.role ?? '—'}</span>
          </div>
        </td>

        {/* Status + timestamp */}
        <td className="w-[160px] px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col">
            <div className="whitespace-nowrap">
              <StatusPopover jobId={job.id} currentStatusId={job.status_id} statuses={effectiveStatuses} />
            </div>
            <div className="text-xs text-text-muted mt-1">
              {(() => {
                const logs = (job as any).activity_log as { changed_at: string }[] | undefined;
                if (!logs || logs.length === 0) return '—';
                const latest = logs.reduce((a, b) => (a.changed_at > b.changed_at ? a : b));
                return new Date(latest.changed_at).toLocaleDateString();
              })()}
            </div>
          </div>
        </td>

        {/* Platform */}
        <td className="w-[110px] px-3 py-3">
          {job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-text-muted truncate block hover:text-brand-500"
            >
              {job.platform?.name ?? '—'}
            </a>
          ) : (
            <span className="text-sm text-text-muted truncate block">{job.platform?.name ?? '—'}</span>
          )}
        </td>

        {/* Type */}
        <td className="w-[90px] px-3 py-3">
          {job.work_type ? (
            <span className="inline-flex items-center rounded-full border border-border-app px-2 py-0.5 text-xs text-text-muted capitalize">
              {job.work_type}
            </span>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </td>

        {/* Reminder text + date */}
        <td className="w-[200px] px-3 py-3">
          {reminder ? (
            <div className="flex flex-col">
              <span className="text-sm text-text-primary truncate">{reminder.reminder_text ?? 'Reminder'}</span>
              <span className="text-xs text-text-muted">{reminder.remind_at}</span>
            </div>
          ) : (
            <div className="text-xs text-text-muted">—</div>
          )}
        </td>

        {/* Resume */}
        <td className="w-12 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          {job.resume_path ? (
            <button
              type="button"
              title="View resume"
              aria-label={`View resume for ${job.company}`}
              onClick={async (e) => {
                e.stopPropagation();
                const res = await fetch(`/api/jobs/${job.id}/resume`);
                if (res.ok) {
                  const body = await res.json() as { data: { url: string } };
                  window.open(body.data.url, '_blank');
                } else {
                  toast.error('Failed to load resume');
                }
              }}
              className="text-text-muted hover:text-brand-500 transition-colors"
            >
              <PaperclipIcon className="h-3.5 w-3.5 mx-auto" />
            </button>
          ) : (
            <span className="text-text-muted opacity-20">
              <PaperclipIcon className="h-3.5 w-3.5 mx-auto" />
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="w-28 px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={`Edit ${job.company}`} title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                setEditJob(job);
                setEditJobReminder(remindersMap.get(job.id) ?? null);
              }}
              className="p-1 rounded text-text-muted hover:text-brand-500 hover:bg-surface-muted transition-colors">
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={`Activity for ${job.company}`} title="Activity"
              onClick={(e) => { e.stopPropagation(); openPeek(job, e.currentTarget); }}
              className="hidden p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors sm:block">
              <HistoryIcon className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={`Archive ${job.company}`} title="Archive"
              onClick={(e) => handleArchive(job, e)}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
              <ArchiveIcon className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={`Delete ${job.company}`} title="Delete"
              onClick={(e) => handleDelete(job, e)}
              className="p-1 rounded text-text-muted hover:text-destructive hover:bg-surface-muted transition-colors">
              <Trash2Icon className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <section aria-label="Active jobs" className="space-y-4">
      <FilterBar
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onSetFilter={setFilter}
        onClearFilters={clearFilters}
      />

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {hasActiveFilters ? `${sortedJobs.length} job${sortedJobs.length !== 1 ? 's' : ''} found` : ''}
      </p>

      {sortedJobs.length === 0 ? (
        <JobTableEmpty hasFilters={hasActiveFilters} onAddJob={() => onAddOpenChange(true)} onClearFilters={clearFilters} />
      ) : (
        <div
          ref={parentRef}
          className="w-full overflow-auto rounded-lg border border-border-app bg-surface"
          style={shouldVirtualize ? { height: '600px' } : undefined}
        >
          <table className="w-full border-collapse text-sm" aria-label="Jobs table">
            <caption className="sr-only">Job applications</caption>
            <thead className="sticky top-0 z-10 bg-surface-muted border-b border-border-app">
              <tr>
                {filterHeader('company', 'Company', 'min-w-[240px]')}
                {filterHeader(
                  'status', 'Status', 'w-[160px]',
                  statusOptions, 'status',
                  filters.statusIds,
                  (vals) => setFilter('status', vals.join(',') || null),
                )}
                {filterHeader(
                  'platform', 'Platform', 'w-[110px]',
                  platformOptions, 'platform',
                  filters.platformIds,
                  (vals) => setFilter('platform', vals.join(',') || null),
                )}
                {filterHeader(
                  'work_type', 'Type', 'w-[90px]',
                  WORK_TYPE_OPTIONS, 'type',
                  filters.workTypes,
                  (vals) => setFilter('type', vals.join(',') || null),
                )}
                {filterHeader(
                  'reminder', 'Reminder', 'w-[200px]',
                  [{ value: 'today', label: 'Today' }], 'reminder',
                  filters.reminder ? [filters.reminder] : [],
                  (vals) => setFilter('reminder', vals.join(',') || null),
                )}
                <th scope="col" className="w-12 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-widest text-text-muted">Resume</th>
                <th scope="col" className="w-28 px-3 py-2.5 text-xs font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shouldVirtualize ? (
                <tr style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  <td colSpan={8} className="p-0">
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

      <JobModal
        open={!!editJob}
        onOpenChange={(v) => { if (!v) { setEditJob(null); setEditJobReminder(null); } }}
        job={editJob ?? undefined}
        initialReminder={editJobReminder}
        userId={userId}
      />

      {peekJob && (
        <ActivityPeekPopover
          job={peekJob}
          coords={peekCoords}
          onClose={() => setPeekJob(null)}
        />
      )}
    </section>
  );
}
