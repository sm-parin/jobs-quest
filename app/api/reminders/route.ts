import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const REMINDER_SELECT =
  'id, job_id, user_id, remind_at, reminder_text, is_done, created_at, updated_at, job:jobs(company, role, status:statuses(label, color))';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const overdue = searchParams.get('overdue') === 'true';
  const upcoming = searchParams.get('upcoming') === 'true';
  const jobId = searchParams.get('job_id');

  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from('reminders')
    .select(REMINDER_SELECT)
    .eq('user_id', user.id)
    .order('remind_at', { ascending: true });

  if (overdue) {
    query = query.eq('is_done', false).lt('remind_at', today);
  } else if (upcoming) {
    query = query.eq('is_done', false).gte('remind_at', today);
  }

  if (jobId) {
    query = query.eq('job_id', jobId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }
  const body = await req.json().catch(() => ({}));
  const { job_id, remind_at, reminder_text } = body;

  if (!job_id || !remind_at) {
    return NextResponse.json(
      { error: 'job_id and remind_at are required' },
      { status: 400 },
    );
  }

  // Validate remind_at is a valid date string
  if (!/^\d{4}-\d{2}-\d{2}$/.test(remind_at) || isNaN(Date.parse(remind_at))) {
    return NextResponse.json(
      { error: 'remind_at must be a valid date (YYYY-MM-DD)' },
      { status: 400 },
    );
  }

  // Validate the job belongs to this user
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', job_id)
    .eq('user_id', user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Enforce one active reminder per job
  const { data: existing } = await supabase
    .from('reminders')
    .select('id')
    .eq('job_id', job_id)
    .eq('user_id', user.id)
    .eq('is_done', false)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error:
          'An active reminder already exists for this job. Mark it done or remove it first.',
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from('reminders')
    .insert({ job_id, remind_at, reminder_text: reminder_text ?? null, user_id: user.id, is_done: false })
    .select(REMINDER_SELECT)
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
