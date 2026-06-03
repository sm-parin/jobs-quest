'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn, relativeTime } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import type { ActivityLog, Job } from '@/lib/types';

interface ActivityPeekPopoverProps {
  job: Job;
  coords: { top: number; left: number };
  onClose: () => void;
}

function MiniSkeletonRow() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-surface-muted" />
      <div className="h-3 flex-1 animate-pulse rounded bg-surface-muted" />
      <div className="h-3 w-16 flex-shrink-0 animate-pulse rounded bg-surface-muted" />
    </div>
  );
}

export function ActivityPeekPopover({ job, coords, onClose }: ActivityPeekPopoverProps) {
  const { statuses, lastMutatedAt } = useJobStore();
  const [entries, setEntries] = useState<ActivityLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(0);

  function getDotColor(label: string): string {
    const status = statuses.find((s) => s.label.toLowerCase() === label.toLowerCase());
    return status?.color ?? 'var(--color-border-app)';
  }

  // Fetch on open and whenever the store is mutated
  useEffect(() => {
    if (entries !== null && lastMutatedAt <= lastFetchedAt) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/activity-log?job_id=${encodeURIComponent(job.id)}&limit=3`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) {
          setEntries(body.data ?? []);
          setLastFetchedAt(Date.now());
        }
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, lastMutatedAt]);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Clamp the popover so it doesn't overflow the bottom of the viewport
  const clampedTop = Math.min(coords.top, Math.max(0, window.innerHeight - 420));
  const clampedLeft = Math.max(8, coords.left);

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover panel */}
      <div
        role="dialog"
        aria-label={`Recent activity for ${job.company} — ${job.role}`}
        className={cn(
          'fixed z-50 w-80 max-h-[400px] overflow-y-auto',
          'rounded-lg border border-border-app bg-surface shadow-lg',
        )}
        style={{ top: clampedTop, left: clampedLeft }}
      >
        {/* Header */}
        <div className="border-b border-border-app px-3 py-2.5">
          <p className="truncate text-sm font-medium text-text-primary">
            {job.company} · {job.role}
          </p>
          <p className="text-xs text-text-muted">Recent activity</p>
        </div>

        {/* Content */}
        <div className="px-3 py-2">
          {loading || entries === null ? (
            <div className="space-y-0.5">
              <MiniSkeletonRow />
              <MiniSkeletonRow />
              <MiniSkeletonRow />
            </div>
          ) : entries.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">No activity yet</p>
          ) : (
            <div className="space-y-0.5">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 py-1.5">
                  <div
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: getDotColor(entry.new_status_label) }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-xs font-medium text-text-primary">
                    {entry.new_status_label}
                  </span>
                  <span className="flex-shrink-0 text-xs text-text-muted">
                    {relativeTime(entry.changed_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-app px-3 py-2">
          <Link
            href={`/dashboard/jobs/${job.id}#activity`}
            onClick={onClose}
            className="text-xs text-brand-500 hover:text-brand-600 hover:underline"
          >
            View full history →
          </Link>
        </div>
      </div>
    </>
  );
}
