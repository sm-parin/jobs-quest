'use client';

import { useState, useRef } from 'react';
import {
  BellRingIcon,
  CalendarIcon,
  CheckIcon,
  CheckCircle2Icon,
  Loader2Icon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useJobStore } from '@/store/jobStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Reminder } from '@/lib/types';

interface ReminderSectionProps {
  jobId: string;
  initialReminder: Reminder | null;
}

type ReminderState = 'no_reminder' | 'has_reminder_future' | 'has_reminder_overdue' | 'reminder_done';

function getState(reminder: Reminder | null, today: string): ReminderState {
  if (!reminder) return 'no_reminder';
  if (reminder.is_done) return 'reminder_done';
  return reminder.remind_at >= today ? 'has_reminder_future' : 'has_reminder_overdue';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ReminderSection({ jobId, initialReminder }: ReminderSectionProps) {
  const { markMutated } = useJobStore();
  const today = new Date().toISOString().slice(0, 10);

  const [reminder, setReminder] = useState<Reminder | null>(initialReminder);
  const [dateInput, setDateInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);

  const state = getState(reminder, today);

  function announce(msg: string) {
    if (liveRef.current) liveRef.current.textContent = msg;
  }

  async function handleCreate() {
    if (!dateInput) return;
    setInFlight(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, remind_at: dateInput }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? 'Failed to set reminder'); return; }
      setReminder(body.data as Reminder);
      setShowDatePicker(false);
      setDateInput('');
      markMutated();
      announce('Reminder set');
    } finally {
      setInFlight(false);
    }
  }

  async function handleChangeDate() {
    if (!reminder || !dateInput) return;
    setInFlight(true);
    const prev = reminder;
    setReminder({ ...reminder, remind_at: dateInput });
    setShowDatePicker(false);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remind_at: dateInput }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReminder(prev);
        toast.error(body.error ?? 'Failed to update reminder');
      } else {
        setReminder(body.data as Reminder);
        markMutated();
        announce('Reminder updated');
      }
    } finally {
      setInFlight(false);
      setDateInput('');
    }
  }

  async function handleMarkDone() {
    if (!reminder) return;
    setInFlight(true);
    const prev = reminder;
    setReminder({ ...reminder, is_done: true });
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_done: true }),
      });
      if (!res.ok) {
        setReminder(prev);
        toast.error('Failed to mark done');
      } else {
        markMutated();
        announce('Reminder marked as done');
      }
    } finally {
      setInFlight(false);
    }
  }

  async function handleRemove() {
    if (!reminder) return;
    setInFlight(true);
    const prev = reminder;
    setReminder(null);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        setReminder(prev);
        toast.error('Failed to remove reminder');
      } else {
        markMutated();
        announce('Reminder removed');
      }
    } finally {
      setInFlight(false);
    }
  }

  const DatePickerInline = ({ onSubmit }: { onSubmit: () => void }) => (
    <div className="flex items-center gap-2 mt-2">
      <Input
        type="date"
        value={dateInput}
        onChange={(e) => setDateInput(e.target.value)}
        min={today}
        className="h-8 w-36 text-xs"
        aria-label="Select reminder date"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') setShowDatePicker(false); }}
      />
      <Button size="sm" variant="outline" onClick={onSubmit} disabled={!dateInput || inFlight} className="h-8">
        {inFlight ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
      </Button>
      <button type="button" onClick={() => setShowDatePicker(false)} className="text-text-muted hover:text-text-primary">
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div>
      <p ref={liveRef} className="sr-only" aria-live="polite" />

      {state === 'no_reminder' && (
        <div>
          {!showDatePicker ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(true)}
              aria-label="Set a follow-up reminder for this job"
              className="gap-1.5"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Set a follow-up reminder
            </Button>
          ) : (
            <DatePickerInline onSubmit={handleCreate} />
          )}
        </div>
      )}

      {(state === 'has_reminder_future' || state === 'has_reminder_overdue') && reminder && (
        <div
          className={cn(
            'space-y-2 rounded-md p-3',
            state === 'has_reminder_overdue' &&
              'border border-destructive/30 bg-[hsl(0_86%_97%)] dark:bg-[hsl(0_40%_15%)]',
          )}
        >
          {state === 'has_reminder_overdue' && (
            <p className="text-xs font-medium text-destructive">
              This follow-up was due on {formatDate(reminder.remind_at)}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-sm">
            <BellRingIcon
              className={cn(
                'h-4 w-4 flex-shrink-0',
                state === 'has_reminder_overdue'
                  ? 'text-destructive animate-pulse'
                  : 'text-brand-500',
              )}
              aria-hidden
            />
            <span className={state === 'has_reminder_overdue' ? 'text-destructive font-medium' : 'text-text-primary'}>
              {state === 'has_reminder_overdue'
                ? `Overdue · was due ${formatDate(reminder.remind_at)}`
                : `Follow up on ${formatDate(reminder.remind_at)}`}
            </span>
          </div>

          {showDatePicker ? (
            <DatePickerInline onSubmit={handleChangeDate} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkDone}
                disabled={inFlight}
                aria-label="Mark this reminder as done"
                className="h-7 text-xs"
              >
                {inFlight ? <Loader2Icon className="mr-1 h-3 w-3 animate-spin" /> : <CheckIcon className="mr-1 h-3 w-3" />}
                Mark Done
              </Button>
              <button
                type="button"
                onClick={() => { setDateInput(reminder.remind_at); setShowDatePicker(true); }}
                className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2"
                aria-label="Change the reminder date"
              >
                Change date
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={inFlight}
                className="text-xs text-destructive hover:text-destructive/80 underline underline-offset-2"
                aria-label="Remove this reminder"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {state === 'reminder_done' && reminder && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <CheckCircle2Icon className="h-4 w-4 text-brand-500 flex-shrink-0" aria-hidden />
            <span>Done · followed up on {formatDate(reminder.remind_at)}</span>
          </div>
          <button
            type="button"
            onClick={() => { setReminder(null); setShowDatePicker(false); }}
            className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2"
            aria-label="Set a new reminder for this job"
          >
            Set new reminder
          </button>
        </div>
      )}
    </div>
  );
}
