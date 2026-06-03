'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2Icon, CheckIcon, ExternalLinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReminderWithJob } from '@/lib/types';

interface OverdueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminders: ReminderWithJob[];
  onMarkDone: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function OverdueSheet({ open, onOpenChange, reminders, onMarkDone }: OverdueSheetProps) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);
  const [fading, setFading] = useState<Set<string>>(new Set());

  async function handleMarkDone(id: string) {
    setMarking(id);
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_done: true }),
      });
      if (!res.ok) { toast.error('Failed to mark done'); return; }

      // Fade out then remove
      setFading((prev) => new Set(prev).add(id));
      setTimeout(() => {
        onMarkDone(id);
        setFading((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }, 300);
    } finally {
      setMarking(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Overdue Follow-ups</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto space-y-3">
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <CheckCircle2Icon className="h-10 w-10 text-brand-500" />
              <p className="text-sm font-medium text-text-primary">All caught up!</p>
            </div>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className={cn(
                  'rounded-lg border border-destructive/20 bg-[hsl(0_86%_97%)] dark:bg-[hsl(0_40%_15%)] p-3 transition-opacity duration-300',
                  fading.has(r.id) && 'opacity-0',
                )}
              >
                <p className="font-semibold text-sm text-text-primary">
                  {r.job?.company ?? '—'}
                </p>
                <p className="text-xs text-text-muted mb-0.5">{r.job?.role ?? '—'}</p>
                <p className="text-xs text-destructive">Was due {formatDate(r.remind_at)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkDone(r.id)}
                    disabled={marking === r.id}
                    className="h-7 text-xs"
                  >
                    <CheckIcon className="mr-1 h-3.5 w-3.5" />
                    {marking === r.id ? 'Saving…' : 'Mark Done'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/dashboard/jobs/${r.job_id}`);
                    }}
                    className="h-7 text-xs"
                  >
                    <ExternalLinkIcon className="mr-1 h-3.5 w-3.5" />
                    Go to Job
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
