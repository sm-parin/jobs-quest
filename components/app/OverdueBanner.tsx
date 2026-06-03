'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRingIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReminderWithJob } from '@/lib/types';
import { OverdueSheet } from '@/components/app/OverdueSheet';

const SESSION_KEY = 'overdue-banner-dismissed';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function OverdueBanner() {
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderWithJob[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1') {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;

    fetch('/api/reminders?overdue=true')
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setReminders(body.data ?? []);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [dismissed]);

  function dismiss() {
    setDismissed(true);
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  function handleMarkDone(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  if (dismissed || reminders.length === 0) return null;

  const shown = reminders.slice(0, 3);
  const extra = reminders.length - 3;

  return (
    <>
      <div
        role="alert"
        className={cn(
          'relative flex flex-col gap-2 rounded-md border-l-4 p-4',
          'bg-[hsl(0_86%_97%)] border-l-destructive dark:bg-[hsl(0_40%_15%)]',
        )}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss overdue banner"
          className="absolute right-3 top-3 text-text-muted hover:text-text-primary"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <BellRingIcon className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm font-semibold text-destructive">
            {reminders.length} overdue follow-up{reminders.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {shown.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => router.push(`/dashboard/jobs/${r.job_id}`)}
              className="rounded-full border border-destructive/30 bg-white px-2.5 py-0.5 text-xs text-destructive hover:bg-destructive/10 transition-colors dark:bg-transparent"
            >
              {r.job?.company ?? '—'} · {r.job?.role ?? '—'}
              <span className="ml-1 text-[10px] opacity-60">({formatDate(r.remind_at)})</span>
            </button>
          ))}
          {extra > 0 && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="text-xs text-destructive underline underline-offset-2 hover:opacity-80"
            >
              + {extra} more
            </button>
          )}
        </div>
      </div>

      <OverdueSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        reminders={reminders}
        onMarkDone={handleMarkDone}
      />
    </>
  );
}
