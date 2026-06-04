import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jobSchema } from '@/lib/schemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const JOB_SELECT = `
  id, user_id, company, role, location, url, source, source_platform_id,
  status_id, priority, salary, stage_date, stage_date_label, notes,
  resume_path, job_description, is_archived, created_at, updated_at,
  status:statuses(id, label, color),
  platform:platforms(id, name),
  contacts(id, job_id, user_id, name, designation, email, phone, created_at, updated_at)
`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: current } = await supabase
    .from('jobs')
    .select('status_id, stage_date, stage_date_label, status:statuses(label)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resume, resume_path, ...rest } = body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = (jobSchema as any).omit({ resume: true }).partial().safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = { ...parsed.data };
  if (resume_path !== undefined) patch.resume_path = resume_path;

  const today = new Date().toISOString().split('T')[0];
  const statusChanged = 'status_id' in patch && patch.status_id !== current.status_id;

  if (statusChanged) {
    if (!patch.stage_date && !current.stage_date) {
      patch.stage_date = today;
    }

    let newStatusLabel = (patch.stage_date_label as string | undefined) ?? null;
    if (patch.status_id && !newStatusLabel) {
      const { data: s } = await supabase
        .from('statuses')
        .select('label')
        .eq('id', patch.status_id as string)
        .single();
      newStatusLabel = s?.label ?? null;
    }
    patch.stage_date_label = newStatusLabel;

    const currentLabel = Array.isArray(current.status)
      ? (current.status as { label: string }[])[0]?.label ?? null
      : (current.status as { label: string } | null)?.label ?? null;

    if (newStatusLabel) {
      await supabase.from('activity_log').insert({
        job_id: id,
        user_id: user.id,
        old_status_label: currentLabel,
        new_status_label: newStatusLabel,
        stage_date: (patch.stage_date as string | undefined) ?? current.stage_date ?? null,
      });
    }
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(JOB_SELECT)
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('jobs')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
