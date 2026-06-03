import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { StatsResponse } from '@/lib/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Start of current week — Monday 00:00:00 UTC
  const dow = now.getUTCDay(); // 0=Sun
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - daysToMonday);
  startOfWeek.setUTCHours(0, 0, 0, 0);
  const startOfWeekISO = startOfWeek.toISOString();

  const [jobsResult, remindersResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, is_archived, created_at, status:statuses(label)')
      .eq('user_id', user.id),
    supabase
      .from('reminders')
      .select('id, remind_at, is_done')
      .eq('user_id', user.id),
  ]);

  const allJobs = (jobsResult.data ?? []) as Array<{
    id: string;
    is_archived: boolean;
    created_at: string;
    status: { label: string } | { label: string }[] | null;
  }>;

  function getLabel(j: (typeof allJobs)[number]): string {
    if (!j.status) return '';
    return Array.isArray(j.status) ? (j.status[0]?.label ?? '') : j.status.label;
  }

  const activeJobs = allJobs.filter((j) => !j.is_archived);

  const total_applied = activeJobs.filter((j) => getLabel(j) !== 'Saved').length;
  const in_progress = activeJobs.filter((j) =>
    ['Screening', 'Interview'].includes(getLabel(j)),
  ).length;
  const offers = activeJobs.filter((j) => getLabel(j) === 'Offer').length;
  const ghosted_count = activeJobs.filter((j) => getLabel(j) === 'Ghosted').length;
  const response_rate =
    total_applied === 0
      ? null
      : Math.round(((total_applied - ghosted_count) / total_applied) * 1000) / 10;
  const applied_this_week = activeJobs.filter(
    (j) => getLabel(j) !== 'Saved' && j.created_at >= startOfWeekISO,
  ).length;
  const archived_count = allJobs.filter((j) => j.is_archived).length;

  const allReminders = (remindersResult.data ?? []) as Array<{
    id: string;
    remind_at: string;
    is_done: boolean;
  }>;
  const total_active_reminders = allReminders.filter(
    (r) => !r.is_done && r.remind_at >= today,
  ).length;
  const overdue_reminders = allReminders.filter(
    (r) => !r.is_done && r.remind_at < today,
  ).length;

  const stats: StatsResponse = {
    total_applied,
    in_progress,
    offers,
    response_rate,
    applied_this_week,
    total_active_reminders,
    overdue_reminders,
    archived_count,
  };

  return NextResponse.json({ data: stats });
}
