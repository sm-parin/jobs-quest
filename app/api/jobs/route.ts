import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jobSchema } from '@/lib/schemas';

const JOB_SELECT = `
  id, user_id, company, role, location, url, source, source_platform_id,
  status_id, priority, work_type, salary, contact_email,
  notes,
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

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resume, ...rest } = body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = (jobSchema as any).omit({ resume: true }).safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { status_id, resume_path, ...jobFields } = parsed.data;

  // Determine status label for activity log if status provided
  let statusLabel: string | null = null;
  if (status_id) {
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
      resume_path: (body.resume_path as string | undefined) ?? null,
    })
    .select(JOB_SELECT)
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  if (statusLabel) {
    await supabase.from('activity_log').insert({
      job_id: job.id,
      user_id: user.id,
      old_status_label: null,
      new_status_label: statusLabel,
    });
  }

  // ── Auto-inherit platform resume when no explicit resume was provided ────────
  if (job.source_platform_id && !job.resume_path) {
    const { data: sourcePlatform } = await supabase
      .from('platforms')
      .select('resume_path')
      .eq('id', job.source_platform_id)
      .eq('user_id', user.id)
      .single();

    if (sourcePlatform?.resume_path) {
      const filename = sourcePlatform.resume_path.split('/').pop() ?? 'resume';
      const jobResumePath = `${user.id}/${job.id}/${filename}`;

      const { data: fileBlob } = await supabase.storage
        .from('resumes')
        .download(sourcePlatform.resume_path);

      if (fileBlob) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const { error: uploadErr } = await supabase.storage
          .from('resumes')
          .upload(jobResumePath, arrayBuffer, { upsert: true });

        if (!uploadErr) {
          await supabase
            .from('jobs')
            .update({ resume_path: jobResumePath })
            .eq('id', job.id)
            .eq('user_id', user.id);
          // Reflect the inherited path in the response
          (job as typeof job & { resume_path: string | null }).resume_path = jobResumePath;
        }
      }
    }
  }

  return NextResponse.json({ data: job }, { status: 201 });
}
