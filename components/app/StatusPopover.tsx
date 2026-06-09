'use client';

import { useState, useRef } from 'react';
import { CheckIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import type { Status } from '@/lib/types';

interface StatusPopoverProps {
  jobId: string;
  currentStatusId: string | null;
  statuses: Status[];
}

export function StatusPopover({ jobId, currentStatusId, statuses }: StatusPopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { jobs, updateJobOptimistic } = useJobStore();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentStatus = statuses.find((s) => s.id === currentStatusId);

  async function handleSelect(status: Status) {
    if (status.id === currentStatusId) {
      setOpen(false);
      return;
    }
    setOpen(false);

    const job = jobs.find((j) => j.id === jobId);

    updateJobOptimistic(jobId, {
      status_id: status.id,
      status: { id: status.id, label: status.label, color: status.color },
    });

    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: status.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Failed to update status');
        if (job) {
          updateJobOptimistic(jobId, {
            status_id: job.status_id,
            status: job.status,
          });
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
          'cursor-pointer ring-offset-background transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          !currentStatus && 'bg-muted text-muted-foreground',
        )}
        style={
          currentStatus
            ? { backgroundColor: `${currentStatus.color}20`, color: currentStatus.color }
            : undefined
        }
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          currentStatus && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: currentStatus.color }}
            />
          )
        )}
        {currentStatus?.label ?? 'No status'}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="listbox"
            aria-label="Select status"
            className={cn(
              'absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border-app bg-popover shadow-md',
              'overflow-hidden py-1',
            )}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          >
            {statuses.map((s) => (
              <button
                key={s.id}
                role="option"
                aria-selected={s.id === currentStatusId}
                type="button"
                onClick={() => handleSelect(s)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-surface-muted transition-colors"
              >
                <span
                  className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1">{s.label}</span>
                {s.id === currentStatusId && (
                  <CheckIcon className="h-3.5 w-3.5 text-brand-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
