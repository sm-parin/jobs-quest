'use client';

import { useState } from 'react';
import { CalendarIcon, HistoryIcon, Loader2Icon } from 'lucide-react';
import { useJobStore } from '@/store/jobStore';
import type { ActivityLog } from '@/lib/types';

interface ActivityLogTimelineProps {
  jobId: string;
  initialEntries: ActivityLog[];
  initialTotal: number;
  jobCreatedAt: string;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ActivityLogTimeline({
  jobId,
  initialEntries,
  initialTotal,
  jobCreatedAt,
}: ActivityLogTimelineProps) {
  const { statuses } = useJobStore();
  const [entries, setEntries] = useState<ActivityLog[]>(initialEntries);
  const [total] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(initialEntries.length >= initialTotal);

  function getDotColor(label: string): string {
    const status = statuses.find((s) => s.label.toLowerCase() === label.toLowerCase());
    return status?.color ?? 'var(--color-border-app)';
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/activity-log?job_id=${encodeURIComponent(jobId)}`);
      if (res.ok) {
        const body = await res.json();
        setEntries(body.data ?? []);
        setAllLoaded(true);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const remaining = total - entries.length;

  return (
    <div>
      <h2
        id="activity-log-heading"
        className="flex items-center gap-1.5 text-sm font-semibold text-text-primary"
      >
        <HistoryIcon className="h-4 w-4 text-text-muted" aria-hidden="true" />
        Activity
      </h2>

      {total === 0 ? (
        <p className="mt-2 text-xs text-text-muted">No status changes recorded yet</p>
      ) : (
        <ol aria-labelledby="activity-log-heading" className="mt-3 space-y-0">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              {/* Timeline spine + dot */}
              <div className="flex flex-col items-center">
                <div
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-surface"
                  style={{ backgroundColor: getDotColor(entry.new_status_label) }}
                  aria-hidden="true"
                />
                <div className="mt-1 w-px flex-1 bg-border-app" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-4">
                <p className="text-sm font-medium text-text-primary">
                  {entry.old_status_label && (
                    <span className="font-normal text-text-muted">
                      {entry.old_status_label} →{' '}
                    </span>
                  )}
                  {entry.new_status_label}
                </p>
                <time dateTime={entry.changed_at} className="text-xs text-text-muted">
                  {formatDateTime(entry.changed_at)}
                </time>
                {/* stage_date removed from activity entries */}
              </div>
            </li>
          ))}

          {/* Load more button */}
          {!allLoaded && remaining > 0 && (
            <li className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border border-border-app bg-surface" aria-hidden="true" />
              </div>
              <div className="pb-4">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 disabled:opacity-50"
                >
                  {loadingMore && <Loader2Icon className="h-3 w-3 animate-spin" aria-hidden="true" />}
                  {loadingMore
                    ? 'Loading…'
                    : `Show ${remaining} more ${remaining === 1 ? 'entry' : 'entries'}`}
                </button>
              </div>
            </li>
          )}

          {/* Application created — always last in the timeline */}
          <li className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-brand-500 ring-2 ring-surface"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm font-medium text-text-primary">Application created</p>
              <time dateTime={jobCreatedAt} className="text-xs text-text-muted">
                {formatDateTime(jobCreatedAt)}
              </time>
            </div>
          </li>
        </ol>
      )}
    </div>
  );
}
