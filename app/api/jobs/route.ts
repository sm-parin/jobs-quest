import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jobSchema } from '@/lib/schemas';

const JOB_SELECT = `
  id, user_id, company, role, location, url, source, source_platform_id,
  status_id, priority, salary, stage_date, stage_date_label, notes,
  resume_path, job_description, is_archived, created_at, updated_at,
  status:statuses(id, label, color),
  platform:platforms(id, name),
  contacts(id, job_id, user_id, name, designation, email, phone, created_at, updated_at)
`;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resume, ...rest } = body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = (jobSchema as any).omit({ resume: true }).safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const { stage_date, status_id, stage_date_label, resume_path, ...jobFields } = parsed.data;

  let statusLabel = stage_date_label ?? null;
  if (status_id && !statusLabel) {
    const { data: s } = await supabase
      .from('statuses')
      .select('label')
      .eq('id', status_id)
      .single();
    statusLabel = s?.label ?? null;
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      ...jobFields,
      status_id: status_id ?? null,
      stage_date: stage_date || today,
      stage_date_label: statusLabel,
      resume_path: (body.resume_path as string | undefined) ?? null,
    })
    .select(JOB_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (statusLabel) {
    await supabase.from('activity_log').insert({
      job_id: job.id,
      user_id: user.id,
      old_status_label: null,
      new_status_label: statusLabel,
      stage_date: job.stage_date ?? null,
    });
  }

  return NextResponse.json({ data: job }, { status: 201 });
}
