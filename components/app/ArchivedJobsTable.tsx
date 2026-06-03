'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcwIcon, Trash2Icon, ArchiveIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import { WarningDialog } from '@/components/ui/WarningDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/input';
import type { Job } from '@/lib/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ArchivedSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border-app bg-surface">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border-app px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-[110px] shrink-0 rounded-full" />
          <Skeleton className="h-4 w-[90px] shrink-0" />
          <Skeleton className="h-4 w-[110px] shrink-0" />
          <div className="shrink-0 flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ArchivedJobsTable() {
  const router = useRouter();
  const { addJobOptimistic } = useJobStore();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch('/api/jobs/archived')
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) {
          setJobs((body.data ?? []) as Job[]);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  async function handleRestore(job: Job, e: React.MouseEvent) {
    e.stopPropagation();
    setJobs((prev) => prev.filter((j) => j.id !== job.id));

    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: false }),
    });

    if (!res.ok) {
      setJobs((prev) => [job, ...prev]);
      toast.error('Failed to restore job');
    } else {
      addJobOptimistic({ ...job, is_archived: false });
      toast.success(`${job.company} — ${job.role} restored to active jobs`);
    }
  }

  async function handlePermanentDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const job = deleteTarget;

    const res = await fetch(`/api/jobs/${job.id}/permanent`, { method: 'DELETE' });
    setDeleting(false);
    setDeleteTarget(null);

    if (!res.ok && res.status !== 204) {
      toast.error('Failed to permanently delete job');
    } else {
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      toast.success('Job permanently deleted');
    }
  }

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.company.toLowerCase().includes(q) || j.role.toLowerCase().includes(q);
  });

  if (loading) return <ArchivedSkeleton />;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-muted">
          <ArchiveIcon className="h-10 w-10 text-text-muted" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">No archived jobs</h2>
        <p className="text-sm text-text-muted">Jobs you archive will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search archived jobs…"
          className="h-8 text-sm"
          aria-label="Search archived jobs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">No archived jobs match your search</p>
      ) : (
        <div className="w-full overflow-auto rounded-lg border border-border-app bg-surface">
          <table className="w-full border-collapse text-sm" aria-label="Archived jobs">
            <thead className="sticky top-0 z-10 bg-surface-muted border-b border-border-app">
              <tr>
                <th scope="col" className="min-w-[180px] px-3 py-2.5 text-left text-xs font-medium text-text-muted">Company</th>
                <th scope="col" className="min-w-[200px] px-3 py-2.5 text-left text-xs font-medium text-text-muted">Role</th>
                <th scope="col" className="w-[140px] px-3 py-2.5 text-left text-xs font-medium text-text-muted">Status</th>
                <th scope="col" className="w-[120px] px-3 py-2.5 text-left text-xs font-medium text-text-muted">Platform</th>
                <th scope="col" className="w-[140px] px-3 py-2.5 text-left text-xs font-medium text-text-muted">Archived</th>
                <th scope="col" className="w-24 px-3 py-2.5 text-xs font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                  className={cn(
                    'cursor-pointer border-b border-border-app last:border-0',
                    'hover:bg-surface-muted transition-colors',
                  )}
                >
                  <td className="px-3 py-3">
                    <span className="font-medium text-sm text-text-primary">{job.company}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="block truncate text-sm text-text-primary" title={job.role}>{job.role}</span>
                  </td>
                  <td className="px-3 py-3">
                    {job.status ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${job.status.color}20`, color: job.status.color }}
                      >
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: job.status.color }} />
                        {job.status.label}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-text-muted">{job.platform?.name ?? '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-text-muted">{formatDate(job.updated_at)}</span>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Restore ${job.company} - ${job.role}`}
                        title="Restore to active"
                        onClick={(e) => handleRestore(job, e)}
                        className="p-1 rounded text-text-muted hover:text-brand-500 hover:bg-surface-muted transition-colors"
                      >
                        <RotateCcwIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Permanently delete ${job.company} - ${job.role}`}
                        title="Permanently delete"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(job); }}
                        className="p-1 rounded text-text-muted hover:text-destructive hover:bg-surface-muted transition-colors"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <WarningDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Permanently delete this job?"
        description={
          deleteTarget
            ? `This will delete ${deleteTarget.company} — ${deleteTarget.role} and all associated contacts, reminders, and activity history. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete permanently"
        onConfirm={handlePermanentDelete}
        isLoading={deleting}
      />
    </div>
  );
}
